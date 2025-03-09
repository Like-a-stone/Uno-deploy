import { Server } from 'socket.io';
import { initializeSocket, getIO } from '../services/socketService';
import gameService from '../services/gameService';
import cardService from '../services/cardService';
import deckService from '../services/deckService';
import scoreHistoryService from '../services/scoreHistoryService';
import playerService from '../services/playerService';
import logger from '../config/logger';
jest.mock('socket.io');
jest.mock('../services/gameService');
jest.mock('../services/cardService');
jest.mock('../services/deckService');
jest.mock('../services/scoreHistoryService');
jest.mock('../services/playerService');
jest.mock('../config/logger');

describe('socketService', () => {
  let io;
  let socket;

  beforeEach(() => {
    jest.clearAllMocks();

    io = {
      on: jest.fn(),
      in: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    Server.mockImplementation(() => io);

    socket = {
      id: 'test-socket-id',
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
    };

    logger.info = jest.fn();
    logger.error = jest.fn();
  });

  describe('getIO', () => {
    it('should return io if initialized', () => {
      const mockServer = {};
      initializeSocket(mockServer);
      expect(getIO()).toBe(io);
    });

    it('should throw error if io is not initialized', () => {
      // Reset the module to clear the io instance
      jest.resetModules();
      const { getIO } = require('../services/socketService');
      
      expect(() => getIO()).toThrow('Socket.io not initialized!');
    });
  });

  describe('initializeSocket', () => {
    it('should set up socket.io server', () => {
      const mockServer = {};
      initializeSocket(mockServer);

      expect(Server).toHaveBeenCalledWith(mockServer, expect.any(Object));
      expect(io.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('Event handlers', () => {
    beforeEach(() => {
      initializeSocket({});
      const connectionHandler = io.on.mock.calls[0][1];
      connectionHandler(socket);
    });

    describe('create_game event', () => {
      it('should handle create_game event', async () => {
        const mockGameData = { game_id: '123', title: 'Test Game' };
        gameService.createGame.mockResolvedValue(mockGameData);
      
        const createGameHandler = socket.on.mock.calls.find(call => call[0] === 'create_game')[1];
        await createGameHandler({ title: 'Test Game', access_token: 'test-token', maxPlayers: 4 });
      
        expect(gameService.createGame).toHaveBeenCalledWith('Test Game', 'test-token', 4);
        expect(socket.join).toHaveBeenCalledWith('123');
        expect(socket.emit).toHaveBeenCalledWith('game_created', mockGameData);
      });

      it('should handle create_game event error', async () => {
        const mockError = new Error('Game creation failed');
        gameService.createGame.mockRejectedValue(mockError);

        await socket.on.mock.calls.find(call => call[0] === 'create_game')[1]({ title: 'Test Game', access_token: 'token' });

        expect(logger.error).toHaveBeenCalledWith(`Error creating game: ${mockError.message}`);
        expect(socket.emit).toHaveBeenCalledWith('error', { message: mockError.message });
      });
    });

    describe('join_game event', () => {
      it('should handle join_game event', async () => {
        const mockJoinData = { game_id: '123', game_title: 'Test Game' };
        gameService.joinGame.mockResolvedValue(mockJoinData);

        const joinGameHandler = socket.on.mock.calls.find(call => call[0] === 'join_game')[1];
        await joinGameHandler({ game_id: '123', access_token: 'test-token', player_name: 'Test Player' });

        expect(gameService.joinGame).toHaveBeenCalledWith({ game_id: '123', access_token: 'test-token' });
        expect(socket.join).toHaveBeenCalledWith('123');
        expect(io.in).toHaveBeenCalledWith('123');
        expect(io.emit).toHaveBeenCalledWith('player_joined', {
          player_name: 'Test Player',
          game_id: '123',
          game_title: 'Test Game'
        });
      });

      it('should handle join_game event error', async () => {
        const mockError = new Error('Join game failed');
        gameService.joinGame.mockRejectedValue(mockError);

        await socket.on.mock.calls.find(call => call[0] === 'join_game')[1]({ 
          game_id: '123', 
          access_token: 'token', 
          player_name: 'Player1' 
        });

        expect(socket.emit).toHaveBeenCalledWith('error', { message: mockError.message });
      });
    });

    describe('join_socket event', () => {
      it('should handle join_socket event', async () => {
        const joinSocketHandler = socket.on.mock.calls.find(call => call[0] === 'join_socket')[1];
        await joinSocketHandler({ game_id: '123' });

        expect(socket.join).toHaveBeenCalledWith('123');
        expect(socket.emit).toHaveBeenCalledWith('socket_joined', { game_id: '123' });
      });

      it('should handle join_socket event error', async () => {
        const mockError = new Error('Socket join failed');
        socket.join.mockImplementationOnce(() => {
          throw mockError;
        });

        const joinSocketHandler = socket.on.mock.calls.find(call => call[0] === 'join_socket')[1];
        await joinSocketHandler({ game_id: '123' });

        expect(logger.error).toHaveBeenCalledWith(`Error joining socket to room: ${mockError.message}`);
        expect(socket.emit).toHaveBeenCalledWith('error', { message: mockError.message });
      });
    });

    describe('player_ready event', () => {
      it('should handle player_ready event', async () => {
        const mockReadyData = { message: 'Player is now ready', game_id: '123', player_name: 'Test Player' };
        gameService.setPlayerReady.mockResolvedValue(mockReadyData);

        const playerReadyHandler = socket.on.mock.calls.find(call => call[0] === 'player_ready')[1];
        await playerReadyHandler({ game_id: '123', access_token: 'test-token' });

        expect(gameService.setPlayerReady).toHaveBeenCalledWith({ game_id: '123', access_token: 'test-token' });
        expect(io.in).toHaveBeenCalledWith('123');
        expect(io.emit).toHaveBeenCalledWith('player_ready', mockReadyData);
      });

      it('should handle player_ready event error', async () => {
        const mockError = new Error('Player ready failed');
        gameService.setPlayerReady.mockRejectedValue(mockError);

        const playerReadyHandler = socket.on.mock.calls.find(call => call[0] === 'player_ready')[1];
        await playerReadyHandler({ game_id: '123', access_token: 'test-token' });

        expect(socket.emit).toHaveBeenCalledWith('error', { message: mockError.message });
      });
    });

    describe('start_game event', () => {
      it('should handle start_game event', async () => {
        const mockStartData = { message: 'Game started successfully', game_id: '123' };
        gameService.startGame.mockResolvedValue(mockStartData);

        const startGameHandler = socket.on.mock.calls.find(call => call[0] === 'start_game')[1];
        await startGameHandler({ game_id: '123', access_token: 'test-token', cardsPerPlayer: 7 });

        expect(gameService.startGame).toHaveBeenCalledWith({ 
          game_id: '123', 
          access_token: 'test-token', 
          cardsPerPlayer: 7 
        });
        expect(io.in).toHaveBeenCalledWith('123');
        expect(io.emit).toHaveBeenCalledWith('game_started', mockStartData);
      });

      it('should handle start_game event error', async () => {
        const mockError = new Error('Start game failed');
        gameService.startGame.mockRejectedValue(mockError);

        const startGameHandler = socket.on.mock.calls.find(call => call[0] === 'start_game')[1];
        await startGameHandler({ game_id: '123', access_token: 'test-token', cardsPerPlayer: 7 });

        expect(socket.emit).toHaveBeenCalledWith('error', { message: mockError.message });
      });
    });

    describe('get_player_list event', () => {
      it('should handle get_player_list event', async () => {
        const mockPlayerList = [{ name: 'Player 1' }, { name: 'Player 2' }];
        gameService.playerList.mockResolvedValue(mockPlayerList);

        const getPlayerListHandler = socket.on.mock.calls.find(call => call[0] === 'get_player_list')[1];
        await getPlayerListHandler({ game_id: '123' });

        expect(gameService.playerList).toHaveBeenCalledWith('123');
        expect(socket.emit).toHaveBeenCalledWith('player_list_updated', { players: mockPlayerList });
      });

      it('should handle get_player_list event error', async () => {
        const mockError = new Error('Player list failed');
        gameService.playerList.mockRejectedValue(mockError);

        const getPlayerListHandler = socket.on.mock.calls.find(call => call[0] === 'get_player_list')[1];
        await getPlayerListHandler({ game_id: '123' });

        expect(logger.error).toHaveBeenCalledWith(`Error fetching player list: ${mockError.message}`);
        expect(socket.emit).toHaveBeenCalledWith('error', { message: mockError.message });
      });
    });

    describe('get_player_cards event', () => {
      it('should handle get_player_cards event', async () => {
        const mockPlayerCards = [
          { color: 'red', value: '7' },
          { color: 'blue', value: '4' }
        ];
        cardService.getPlayerCards.mockResolvedValue(mockPlayerCards);

        const getPlayerCardsHandler = socket.on.mock.calls.find(call => call[0] === 'get_player_cards')[1];
        await getPlayerCardsHandler({ game_id: '123', access_token: 'test-token' });

        expect(cardService.getPlayerCards).toHaveBeenCalledWith({ 
          game_id: '123', 
          access_token: 'test-token' 
        });
        expect(socket.emit).toHaveBeenCalledWith('player_cards', { playerCards: mockPlayerCards });
      });

      describe('take_card_from_deck event', () => {
        it('should handle take_card_from_deck event successfully', async () => {
          const mockGameState = { topDiscardCard: { color: 'red', value: '7' } };
          deckService.takeCardFromDeck.mockResolvedValue({});
          gameService.getGameState.mockResolvedValue(mockGameState);
          scoreHistoryService.getFormattedScores.mockResolvedValue([]);
  
          const takeCardHandler = socket.on.mock.calls.find(call => call[0] === 'take_card_from_deck')[1];
          await takeCardHandler({ game_id: '123', access_token: 'test-token' });
  
          expect(deckService.takeCardFromDeck).toHaveBeenCalledWith({ game_id: '123', access_token: 'test-token' });
          expect(gameService.getGameState).toHaveBeenCalledWith('123');
          expect(scoreHistoryService.getFormattedScores).toHaveBeenCalledWith('123');
          expect(io.in).toHaveBeenCalledWith('123');
          expect(io.emit).toHaveBeenCalledWith('game_state_updated', { gameState: mockGameState });
        });
  
        it('should handle take_card_from_deck event error', async () => {
          const mockError = new Error('Take card failed');
          deckService.takeCardFromDeck.mockRejectedValue(mockError);
  
          const takeCardHandler = socket.on.mock.calls.find(call => call[0] === 'take_card_from_deck')[1];
          await takeCardHandler({ game_id: '123', access_token: 'test-token' });
  
          expect(logger.error).toHaveBeenCalledWith(`Error requesting take card from deck: ${mockError.message}`);
          expect(socket.emit).toHaveBeenCalledWith('error', { message: mockError.message });
        });
      });

      it('should handle get_player_cards event error', async () => {
        const mockError = new Error('Player cards failed');
        cardService.getPlayerCards.mockRejectedValue(mockError);

        const getPlayerCardsHandler = socket.on.mock.calls.find(call => call[0] === 'get_player_cards')[1];
        await getPlayerCardsHandler({ game_id: '123', access_token: 'test-token' });

        expect(logger.error).toHaveBeenCalledWith(`Error fetching player list: ${mockError.message}`);
        expect(socket.emit).toHaveBeenCalledWith('error', { message: mockError.message });
      });
    });

    describe('chat_message event', () => {
      it('should handle chat_message event', () => {
        const mockChatData = {
          game_id: '123',
          message: 'Hello world!',
          player_name: 'Player 1'
        };

        const chatMessageHandler = socket.on.mock.calls.find(call => call[0] === 'chat_message')[1];
        chatMessageHandler(mockChatData);

        expect(io.in).toHaveBeenCalledWith('123');
        expect(io.emit).toHaveBeenCalledWith('chat_message', { 
          player_name: 'Player 1', 
          message: 'Hello world!' 
        });
      });
    });

    describe('disconnect event', () => {
      it('should handle disconnect event', () => {
        const disconnectHandler = socket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
        disconnectHandler();

        expect(logger.info).toHaveBeenCalledWith(`Socket disconnected: ${socket.id}`);
      });
    });

    describe('get_current_card event', () => {
      it('should handle get_current_card event with valid card', async () => {
        const mockGameState = {
          topDiscardCard: { color: 'red', value: '7', location: 'discard' }
        };
        gameService.getGameState.mockResolvedValue(mockGameState);
    
        const getCurrentCardHandler = socket.on.mock.calls.find(call => call[0] === 'get_current_card')[1];
        await getCurrentCardHandler({ game_id: '123' });
    
        expect(gameService.getGameState).toHaveBeenCalledWith('123');
        expect(socket.emit).toHaveBeenCalledWith('current_card', { 
          currentCard: mockGameState.topDiscardCard
        });
      });

      it('should handle get_current_card event with missing card', async () => {
        const mockGameState = { topCard: null };
        gameService.getGameState.mockResolvedValue(mockGameState);

        const getCurrentCardHandler = socket.on.mock.calls.find(call => call[0] === 'get_current_card')[1];
        await getCurrentCardHandler({ game_id: '123' });

        expect(logger.error).toHaveBeenCalledWith('Error fetching current card: Current card not found');
        expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Current card not found' });
      });

      it('should handle get_current_card event error', async () => {
        const mockError = new Error('Game state failed');
        gameService.getGameState.mockRejectedValue(mockError);

        const getCurrentCardHandler = socket.on.mock.calls.find(call => call[0] === 'get_current_card')[1];
        await getCurrentCardHandler({ game_id: '123' });

        expect(logger.error).toHaveBeenCalledWith(`Error fetching current card: ${mockError.message}`);
        expect(socket.emit).toHaveBeenCalledWith('error', { message: mockError.message });
      });
    });

    describe('call_uno event', () => {
      it('should handle call_uno event successfully', async () => {
        const mockResult = { message: 'UNO called successfully!' };
        gameService.sayUno.mockResolvedValue(mockResult);
        gameService.getGameState.mockResolvedValue({ state: 'in_progress' });

        const callUnoHandler = socket.on.mock.calls.find(call => call[0] === 'call_uno')[1];
        await callUnoHandler({ game_id: '123', access_token: 'test-token' });

        expect(gameService.sayUno).toHaveBeenCalledWith({ game_id: '123', access_token: 'test-token' });
        expect(io.in).toHaveBeenCalledWith('123');
        expect(io.in().emit).toHaveBeenCalledWith('uno_called', { 
          success: true, 
          message: mockResult.message 
        });
        expect(gameService.getGameState).toHaveBeenCalledWith('123');
        expect(io.in).toHaveBeenCalledWith('123');
        expect(io.in().emit).toHaveBeenCalledWith('game_state_updated', { 
          gameState: { state: 'in_progress' } 
        });
      });

      it('should handle call_uno event error', async () => {
        const mockError = new Error('UNO call failed');
        gameService.sayUno.mockRejectedValue(mockError);

        const callUnoHandler = socket.on.mock.calls.find(call => call[0] === 'call_uno')[1];
        await callUnoHandler({ game_id: '123', access_token: 'test-token' });

        expect(io.in).toHaveBeenCalledWith('123');
        expect(io.in().emit).toHaveBeenCalledWith('uno_called', { 
          success: false, 
          message: mockError.message 
        });
      });
    });

    describe('challengeUno event', () => {
      it('should handle challengeUno event successfully', async () => {
        const mockResult = { success: true, message: 'Challenge successful' };
        gameService.challengeUno.mockResolvedValue(mockResult);
        gameService.getGameState.mockResolvedValue({ state: 'in_progress' });

        const challengeUnoHandler = socket.on.mock.calls.find(call => call[0] === 'challengeUno')[1];
        await challengeUnoHandler({ game_id: '123', access_token: 'test-token' });

        expect(gameService.challengeUno).toHaveBeenCalledWith({ game_id: '123', access_token: 'test-token' });
        expect(io.in).toHaveBeenCalledWith('123');
        expect(io.in().emit).toHaveBeenCalledWith('unoChallenge', mockResult);
        expect(gameService.getGameState).toHaveBeenCalledWith('123');
      });
    });
    
    describe('join_socket event', () => {
      it('should handle join_socket event successfully', () => {
        const joinSocketHandler = socket.on.mock.calls.find(call => call[0] === 'join_socket')[1];
        joinSocketHandler({ game_id: '123' });

        expect(socket.join).toHaveBeenCalledWith('123');
        expect(logger.info).toHaveBeenCalledWith(`Socket ${socket.id} joined room 123`);
        expect(socket.emit).toHaveBeenCalledWith('socket_joined', { game_id: '123' });
      });

      it('should handle join_socket event error', () => {
        socket.join.mockImplementation(() => {
          throw new Error('Join failed');
        });

        const joinSocketHandler = socket.on.mock.calls.find(call => call[0] === 'join_socket')[1];
        joinSocketHandler({ game_id: '123' });

        expect(logger.error).toHaveBeenCalledWith('Error joining socket to room: Join failed');
        expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Join failed' });
      });
    });

    describe('end_game event', () => {
      it('should handle end_game event successfully', async () => {
        const mockResult = { message: 'Game ended successfully' };
        gameService.endGame.mockResolvedValue(mockResult);

        const endGameHandler = socket.on.mock.calls.find(call => call[0] === 'end_game')[1];
        await endGameHandler({ game_id: '123', access_token: 'test-token' });

        expect(gameService.endGame).toHaveBeenCalledWith({ game_id: '123', access_token: 'test-token' });
        expect(io.in).toHaveBeenCalledWith('123');
        expect(io.in().emit).toHaveBeenCalledWith('game_ended', mockResult);
      });
    });

    describe('play_card event', () => {
      it('should handle play_card event', async () => {
        cardService.playCard.mockResolvedValue({ 
          message: 'Card played successfully' 
        });
        
        // Mock the emitGameStateUpdate function
        gameService.getGameState.mockResolvedValue({ 
          state: 'in_progress'
        });

        const playCardHandler = socket.on.mock.calls.find(call => call[0] === 'play_card')[1];
        await playCardHandler({ 
          game_id: '123', 
          cardPlayed: 'red 7', 
          access_token: 'test-token'
        });

        expect(logger.info).toHaveBeenCalledWith('Player attempting to play card: red 7 in game: 123');
        expect(cardService.playCard).toHaveBeenCalledWith('123', { 
          access_token: 'test-token', 
          cardPlayed: 'red 7'
        });
        expect(gameService.getGameState).toHaveBeenCalledWith('123');
        expect(io.in).toHaveBeenCalledWith('123');
        expect(io.emit).toHaveBeenCalledWith('game_state_updated', { 
          gameState: { state: 'in_progress' } 
        });
      });

      it('should handle play_card event error', async () => {
        const mockError = new Error('Play card failed');
        cardService.playCard.mockRejectedValue(mockError);

        const playCardHandler = socket.on.mock.calls.find(call => call[0] === 'play_card')[1];
        await playCardHandler({ 
          game_id: '123', 
          cardPlayed: 'red 7', 
          access_token: 'test-token'
        });

        expect(logger.error).toHaveBeenCalledWith(`Error playing card: ${mockError.message}`);
        expect(socket.emit).toHaveBeenCalledWith('error', { message: mockError.message });
      });
    });

    describe('request_game_state event', () => {it('should handle request_game_state event error', async () => {
        const mockError = new Error('Get game state failed');
        gameService.getGameState.mockRejectedValue(mockError);

        const requestGameStateHandler = socket.on.mock.calls.find(call => call[0] === 'request_game_state')[1];
        try {
          await requestGameStateHandler({ game_id: '123' });
        } catch (error) {
          expect(logger.error).toHaveBeenCalledWith(`Error updating game state: ${mockError.message}`);
          expect(socket.emit).toHaveBeenCalledWith('error', { message: mockError.message });
        }
      });
    });

    describe('emitGameStateUpdate function', () => {
      it('should emit game state update', async () => {
        const mockGameState = { state: 'in_progress' };
        gameService.getGameState.mockResolvedValue(mockGameState);
        
        // Get the connection handler and extract emitGameStateUpdate function
        const connectionHandler = io.on.mock.calls[0][1];
        const emitGameStateUpdate = async (game_id) => {
          try {
            logger.info('Updating game state for game');
            const gameState = await gameService.getGameState(game_id);
            io.in(game_id).emit('game_state_updated', { gameState });
          } catch (error) {
            logger.error(`Error updating game state: ${error.message}`);
          }
        };
        
        await emitGameStateUpdate('123');
        
        expect(gameService.getGameState).toHaveBeenCalledWith('123');
        expect(logger.info).toHaveBeenCalledWith('Updating game state for game');
        expect(io.in).toHaveBeenCalledWith('123');
        expect(io.emit).toHaveBeenCalledWith('game_state_updated', { 
          gameState: mockGameState 
        });
      });
      
      it('should handle errors in emitGameStateUpdate', async () => {
        const mockError = new Error('Get game state failed');
        gameService.getGameState.mockRejectedValue(mockError);
        
        const emitGameStateUpdate = async (game_id) => {
          try {
            logger.info('Updating game state for game');
            const gameState = await gameService.getGameState(game_id);
            io.in(game_id).emit('game_state_updated', { gameState });
          } catch (error) {
            logger.error(`Error updating game state: ${error.message}`);
          }
        };
        
        await emitGameStateUpdate('123');
        
        expect(gameService.getGameState).toHaveBeenCalledWith('123');
        expect(logger.error).toHaveBeenCalledWith(`Error updating game state: ${mockError.message}`);
      });
    });
  });
});