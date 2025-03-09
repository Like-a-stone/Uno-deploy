import { Server } from 'socket.io';
import gameService from './gameService.js';
import logger from '../config/logger.js';
import cardService from './cardService.js';
import deckService from './deckService.js';
import scoreHistoryService from './scoreHistoryService.js';
import playerService from './playerService.js';

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [process.env.CLIENT_URL, "http://localhost:5500", "http://127.0.0.1:5500"],
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    logger.info(`New socket connection: ${socket.id}`);

    const joinSocketToRoom = (game_id) => {
      socket.join(game_id);
      logger.info(`Socket ${socket.id} joined room ${game_id}`);
    };

    const emitGameStateUpdate = async (game_id) => {
      try {
        const gameState = await gameService.getGameState(game_id);
        logger.info(`Updating game state for game`);
        io.in(game_id).emit('game_state_updated', { gameState });
      } catch (error) {
        logger.error(`Error updating game state: ${error.message}`);
      }
    };   
     
    const emitScoreUpdate = async (game_id) => {
      try {
        const scores = await scoreHistoryService.getFormattedScores(game_id);
        logger.info(`Updating scores for game ${game_id}`);
        io.in(game_id).emit('score_updated', { scores });
      } catch (error) {
        logger.error(`Error updating scores: ${error.message}`);
      }
    };

    socket.on('get_player_profile', async (data) => {
      try {
        const { access_token } = data;
        const player = await playerService.getPlayerByToken(access_token);
        
        if (!player) {
          throw new Error('Player not found');
        }
  
        logger.info(`Player profile retrieved successfully. ID: ${player.id}`);
        socket.emit('player_profile', player);
      } catch (error) {
        logger.error(`Error fetching player profile: ${error.message}`);
        socket.emit('error', { message: error.message });
      }
    });
    
    socket.on('create_game', async (data) => {
      try {
        const { title, access_token, maxPlayers } = data;
        const result = await gameService.createGame(title , access_token, maxPlayers);
        logger.info(`Game created: ${JSON.stringify(result)}`);
        joinSocketToRoom(result.game_id.toString());
        logger.info(`Socket ${socket.id} joined room ${result.game_id}`);
        socket.emit('game_created', { 
          game_id: result.game_id,
          title: result.title
        });
      } catch (error) {
        logger.error(`Error creating game: ${error.message}`);
        socket.emit('error', { message: error.message });
      }
    });
  

    socket.on('join_game', async (data) => {
      try {
        const { game_id, access_token, player_name } = data;
        
        const result = await gameService.joinGame({ game_id, access_token });
        joinSocketToRoom(game_id);        
        io.in(game_id).emit('player_joined', { 
          player_name: player_name, 
          game_id: result.game_id,
          game_title: result.game_title
        });
    
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('join_socket', (data) => {
      try {
          const { game_id } = data;
          joinSocketToRoom(game_id);
          socket.emit('socket_joined', { game_id });
      } catch (error) {
          logger.error(`Error joining socket to room: ${error.message}`);
          socket.emit('error', { message: error.message });
      }
    });

    socket.on('player_ready', async (data) => {
      try {
        const { game_id, access_token } = data;
        const result = await gameService.setPlayerReady({ game_id, access_token });
        io.in(game_id).emit('player_ready', result);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('start_game', async (data) => {
      try {
        const { game_id, access_token, cardsPerPlayer } = data;
        const result = await gameService.startGame({ game_id, access_token, cardsPerPlayer });
        io.in(game_id).emit('game_started', result);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('get_player_list', async (data) => {
      try {
        const { game_id } = data;
        const players = await gameService.playerList(game_id);
        socket.emit('player_list_updated', { players });
      } catch (error) {
        logger.error(`Error fetching player list: ${error.message}`);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('get_player_cards', async (data) => {
      try {
        const { game_id, access_token } = data;
        const playerCards = await cardService.getPlayerCards({ game_id, access_token });
        socket.emit('player_cards', { playerCards });
      } catch (error) {
        logger.error(`Error fetching player list: ${error.message}`);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('play_card', async (data) => {
      try {
        const { game_id, cardPlayed, access_token, newColor } = data;
        logger.info(`Player attempting to play card: ${cardPlayed} in game: ${game_id}`);
        
        await cardService.playCard(game_id, { access_token, cardPlayed, newColor });
        await emitGameStateUpdate(game_id);
        await emitScoreUpdate(game_id);
        
      } catch (error) {
        logger.error(`Error playing card: ${error.message}`);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('request_game_state', async (data) => {
      try {
        const { game_id } = data;
        await emitGameStateUpdate(game_id);
      } catch (error) {
        logger.error(`Error requesting game state: ${error.message}`);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('take_card_from_deck', async (data) => {
      try {
        await deckService.takeCardFromDeck(data);
        await emitGameStateUpdate(data.game_id);
        await emitScoreUpdate(data.game_id);
      } catch (error) {
        logger.error(`Error requesting take card from deck: ${error.message}`);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('get_current_card', async (data) => {
      try {
        const { game_id } = data;
        const gameState = await gameService.getGameState(game_id);
        if (gameState && gameState.topDiscardCard) {
          socket.emit('current_card', { currentCard: gameState.topDiscardCard });
        } else {
          throw new Error('Current card not found');
        }
      } catch (error) {
        logger.error(`Error fetching current card: ${error.message}`);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('call_uno', async ({ game_id, access_token }) => {
      try {
          const result = await gameService.sayUno({ game_id, access_token });
          
          io.in(game_id).emit('uno_called', { success: true, message: result.message });
          await emitGameStateUpdate(game_id);
    
      } catch (error) {
          io.in(game_id).emit('uno_called', { 
              success: false, 
              message: error.message 
          });
      }
    });

    socket.on('challengeUno', async ({ game_id, access_token }) => {
      try {
          const result = await gameService.challengeUno({ game_id, access_token });
          io.in(game_id).emit('unoChallenge', result);
          await emitGameStateUpdate(game_id);
    
      } catch (error) {
          console.error('Error in challengeUno:', error);
          io.in(game_id).emit('unoChallenge', {
              success: false,
              error: error.message
          });
      }
    });

    socket.on('end_game', async (data) => {
      try {
        const { game_id, access_token } = data;
        const result = await gameService.endGame({ game_id, access_token });
        
        io.in(game_id).emit('game_ended', result);
    
      } catch (error) {
        console.error('Error ending game:', error);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('chat_message', (data) => {
      const { game_id, message, player_name } = data;
      io.in(game_id).emit('chat_message', { player_name, message });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });   

  });

  return io; 
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

export default { initializeSocket, getIO };
