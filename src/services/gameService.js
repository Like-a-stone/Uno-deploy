import {AuthError, BadRequestError, BusinessError, GameStateError, NotFoundError, ValidationError} from '../utils/customError.js';
import {PlayerModel} from '../models/player.js';
import  {PlayerGameModel} from '../models/playerGame.js';
import {validateAccessToken} from '../utils/tokenValidator.js';
import {GameModel} from '../models/game.js';
import {CardModel} from '../models/card.js';
import { validateMaxPlayers, validateMinimumPlayers, validateGameStatus, validatePlayerInGame, checkAllPlayersReady, validateTitle  } from './gameValidationService.js';
import deckService from './deckService.js';
import cardService from './cardService.js';
import { GameLogModel } from '../models/gameLog.js';
import scoreHistoryService from './scoreHistoryService.js';

const createGame = async (title, access_token, maxPlayers) => {
    const playerId = await validateAccessToken(access_token);
    
    const gameTitle = await validateTitle(title);
    if (!gameTitle) throw new BadRequestError('Title must be between 3 and 100 characters long');

    const validatedMaxPlayers = await validateMaxPlayers(maxPlayers);
    if (!validatedMaxPlayers) throw new BadRequestError('Maximum players must be between 2 and 10');

    const player = await PlayerModel.getById(playerId);
    if (!player) throw new NotFoundError('Player not found');

    const game = await GameModel.createGame(gameTitle, playerId);
    if (!game) throw new NotFoundError('Game not created');

    const playerGame = await PlayerGameModel.createPlayerGame({ gameId: game.id, playerId, position: 0 });
    if (!playerGame) throw new NotFoundError('PlayerGame not created');

    return {
        message: "Game created successfully",
        game_id: game.id
    };
};

const getGame = async (gameId) => {
    const game = await GameModel.getGameById(gameId);
    if (!game) throw new NotFoundError("Game not found");
    return game;
};

const updateGame = async (gameId, gameData) => {
    const game = await GameModel.updateGame(gameId, gameData);
    if (!game) throw new NotFoundError("Game not found");

    return game;
};

const deleteGame = async (gameId) => {
    const game = await GameModel.deleteGame(gameId);
    if (!game) throw new NotFoundError("Game not found");

    await game.destroy();
    return game;
};

const removePlayerFromGame = async (gameId, playerId) => {
    const playerInGame = await validatePlayerInGame(gameId, playerId);
    if (!playerInGame) throw new NotFoundError('Player is not part of this game');

    const deletedRows = await PlayerGameModel.deletePlayerById(playerId, gameId);
    if (deletedRows === 0) throw new NotFoundError('Player is not part of this game');

    return { message: "Player removed from game successfully" };
};

const playerList = async (gameId) => {
    const players =  await PlayerGameModel.getPlayersNamesByGameId(gameId);

    if (players.length === 0) throw new NotFoundError('No players found in this game');
    return players;
};

const joinGame = async ({ game_id, access_token }) => {
    const playerId = await validateAccessToken(access_token);
    const player = await PlayerModel.getById(playerId);

    const game = await GameModel.getGameById(game_id);
    if (!game) throw new NotFoundError("Game not found");

    const playerInGame = await validatePlayerInGame(game_id, playerId);
    if (playerInGame) throw new BusinessError(`Player is already in the game ${game_id}`);

    const currentPlayersCount = await PlayerGameModel.getNumPlayersInGame(game_id);
    if (currentPlayersCount >= game.maxPlayers) {
        throw new BusinessError(`Game ${game_id} has reached its maximum number of players`);
    }

    const playerGame = await PlayerGameModel.joinGame(game_id, playerId);
    if (!playerGame) throw new BusinessError("Failed to join the game");

    await GameModel.updateGame(game_id, { numPlayers: currentPlayersCount + 1 });

    return {
        message: "Player joined the game successfully",
        player_name: player.name,
        game_id: game_id,
        game_title: game.title
    };
};

const setPlayerReady = async ({ game_id, access_token }) => {
    const playerId = await validateAccessToken(access_token);
    const player = await PlayerModel.getById(playerId);

    const playerGame = await PlayerGameModel.setPlayerReady(playerId, game_id);
    if (!playerGame) throw new NotFoundError("Player is not part of this game");

    return { 
        message: "Player is now ready",
        game_id: game_id,
        player_name: player.name
    };
};

const startGame = async ({ game_id, access_token, cardsPerPlayer, isTest = false }) => {
    const playerId = await validateAccessToken(access_token);
    const player = await PlayerModel.getById(playerId);

    const game = await GameModel.getGameById(game_id);
    if (!game) throw new NotFoundError("Game not found");

    if (game.status !== 'waiting') throw new GameStateError("Game has already started or finished");
    if (game.creatorId !== playerId) throw new AuthError("Only the game creator can start the game");

    const players = await PlayerGameModel.getPlayersGameId(game_id);
    if (players.length === 0) throw new NotFoundError("No players found in this game");

    const allReady = await checkAllPlayersReady(players);
    if (!allReady) throw new BusinessError("Not all players are ready");

    await PlayerGameModel.updatePlayerPositions(players);

    await deckService.initializeDeck(game_id);

    let dealtCards;
    if (isTest) {
        dealtCards = await deckService.dealTestCards(game_id, players);
    } else {
        dealtCards = await deckService.dealInitialCards(game_id, cardsPerPlayer);
    }

    let initialCard;
    if (isTest) {
        initialCard = await deckService.getTestInitialCard(game_id);
    } else {
        initialCard = await deckService.initializeGameWithCard(game_id);
    }
    
    const gameStarted = await GameModel.startGame(game_id, initialCard.color);
    if (!gameStarted) throw new BusinessError("Failed to start the game");

    await Promise.all(players.map(async (player) => {
        await scoreHistoryService.initializeScore(game_id, player.playerId);
    }));
    
    return { 
        firstPlayer: player.name,
        message: "Game started successfully",
        firstCardDiscardPile: {
            color: initialCard.color,
            value: initialCard.value,
            location: initialCard.location
        },
        players: dealtCards
     };
};

const leaveGame = async ({ game_id, access_token }) => {
    const playerId = await validateAccessToken(access_token);

    const game = await GameModel.getGameById(game_id);
    if (!game) throw new NotFoundError("Game not found");

    if (!validateGameStatus(game, 'in_progress')) throw new GameStateError("Game is not in progress");

    const deletedRows = await PlayerGameModel.deletePlayerById(playerId, game_id);
    if (deletedRows === 0) throw new NotFoundError('Player is not part of this game');

    return { message: "User left the game successfully" };
};

const endGame = async ({game_id, access_token}) => {
    const playerId = await validateAccessToken(access_token);
    const game = await GameModel.getGameById(game_id);
    if (!game) throw new NotFoundError("Game not found");

    const playerGame = await PlayerGameModel.getPlayerGameById(playerId, game_id);
    if (!playerGame) throw new NotFoundError('Player is not part of this game');

    if (game.status !== 'in_progress') throw new GameStateError("Game is not in progress, cannot be ended");

    const playersCards = await cardService.getPlayersCardsInGame(game_id, true);

    const winner = playersCards.find(player => player.cardCount === 0);
    if (!winner) throw new BusinessError("No player has 0 cards, game cannot be ended");

    const updatedGame = await GameModel.updateGame(game_id, { status: 'finished' });
    if (!updatedGame) throw new BusinessError("Failed to end the game");

    await scoreHistoryService.updateScoresOnGameEnd(game_id);
    const scores = await scoreHistoryService.getFormattedScores(game_id);
    
    const winningPlayer = await PlayerModel.getById(winner.playerId);

    return {
        message: `${winningPlayer.name} has won the game!`,
        winner: {
            playerId: winner.playerId,
            name: winningPlayer.name
        },
        scores: scores
    };
};

const getGameState = async ( game_id ) => {
    const game = await GameModel.getGameById(game_id);
    if (!game) throw new NotFoundError("Game not found");

    const { history } = await getGameHistory(game_id);
    const nextPlayer = await getCurrentPlayer({ game_id });

    const playersCards = await cardService.getPlayersCardsInGame(game_id, false);
    const topDiscardCard = await CardModel.getTopDiscardCard(game_id);

    const players = await PlayerGameModel.getSortedPlayersByGameId(game_id);
    if (players.length === 0) throw new NotFoundError("No players found in this game");
    
    const deckCount = await CardModel.getDeckCardCount(game_id);
    
    const playersInOrder = await Promise.all(players.map(async (player) => {
        const playerData = await PlayerModel.getById(player.playerId);
        return {
            id: playerData.id,
            name: playerData.name,
            position: player.position,
            saidUno : player.saidUno,
        };

    }));

    return {
        state: game.status,
        currentDirection: game.currentDirection,
        currentColor: game.currentColor,
        nextPlayer: nextPlayer ? nextPlayer.player_name : null,
        nextPlayerIndex: nextPlayer.player_position,
        playersInOrder: playersInOrder,
        topDiscardCard: {
            color: topDiscardCard.color,
            value: topDiscardCard.value,
            location: topDiscardCard.location
        },
        playerCards: playersCards,
        turnHistory: history,
        deckCount: deckCount
    };
};

/**
 * Calcula o índice do próximo jogador no jogo com base no índice do jogador atual
 * e na direção do jogo (sentido horário ou anti-horário).
 *
 * Esta função utiliza um padrão de acumulador onde o índice do jogador atual é incrementado
 * ou decrementado com base na direção do jogo. O resultado é ajustado usando o operador
 * módulo para garantir que permaneça dentro dos limites da lista de jogadores.
 *
 * @param {Object} game - O objeto do jogo contendo o índice do jogador atual e a direção.
 * @param {number} playerCount - O número total de jogadores no jogo.
 * @returns {number} - O índice do próximo jogador.
 */
const calculateNextPlayerIndex = (game, playerCount) => {
    if (playerCount === 0) return 0;
    
    const currentIndex = game.currentPlayerIndex;
    
    if (game.currentDirection === 'clockwise') {
        return (currentIndex + 1) % playerCount;
    } else {
        return (currentIndex - 1 + playerCount) % playerCount;
    }
};

const getCurrentPlayer = async ({ game_id }) => {
    const game = await GameModel.getGameById(game_id);
    if (!game) throw new NotFoundError("Game not found");

    const currentPlayerIndex = game.currentPlayerIndex;

    const players = await await PlayerGameModel.getSortedPlayersByGameId(game_id);
    if (players.length === 0) throw new NotFoundError("No players found in this game");

    if (currentPlayerIndex < 0 || currentPlayerIndex >= players.length) {
        throw new NotFoundError("Current player index is out of bounds");
    }
    const currentPlayerGame = players[currentPlayerIndex];

    if (!currentPlayerGame) throw new NotFoundError("Current player not found");

    const player = await PlayerModel.getById(currentPlayerGame.playerId);
    if (!player) throw new NotFoundError("Player not found");

    return {
        game_id: game_id,
        player_id: player.id,
        player_name: player.name,
        player_position: currentPlayerGame.position
    };
};

const updateCurrentPlayerMoviment = async (game_id) => {
    const game = await GameModel.getGameById(game_id);
    if (!game) throw new NotFoundError("Game not found");

    if (game.status !== 'in_progress') {
        throw new GameStateError(`Game ${game_id} is not in 'in_progress' status`);
    }

    const players = await PlayerGameModel.getSortedPlayersByGameId(game_id);
    if (players.length === 0) {
        throw new ValidationError(`No players found for game ${game_id}`);
    }

    const numPlayers = players.length;
    const nextPlayerIndex = calculateNextPlayerIndex(game, numPlayers);

    await GameModel.updateCurrentPlayer(game_id, nextPlayerIndex);

    return {
        game_id,
        current_player: {
            id: players[nextPlayerIndex].id,
            name: players[nextPlayerIndex].name
        },
    };
};

const getGameHistory = async (gameId) => {
    const game = await GameModel.getGameById(gameId);
    if (!game) {
        throw new NotFoundError(`Game with id ${gameId} not found`);
    }

    const logs = await GameLogModel.getGameLogs(gameId);

    const history = await Promise.all(logs.map(async (log) => {
        const player = await PlayerModel.getById(log.playerId);
        return {
            player: player ? player.name : 'Unknown Player',
            action: log.action,
            timestamp: log.createdAt
        };
    }));

    return { history };
};

const sayUno = async ({ game_id, access_token }) => {
    const playerId = await validateAccessToken(access_token);

    const game = await GameModel.getGameById(game_id);
    if (!game) throw new NotFoundError('Game not found');

    const playerGame = await PlayerGameModel.getPlayerGameById(playerId, game_id);
    if (!playerGame) throw new NotFoundError('Player not found in this game');

   const playerCards = await CardModel.getCardsByPlayerAndGame(playerId, game_id);
   if (!playerCards || playerCards.length !== 1) {
        throw new BusinessError("You can only say UNO when you have one card left");
    }
    await PlayerGameModel.setSaidUno(playerId, game_id, true);
    await GameLogModel.createLog({
        gameId: game_id,
        playerId: playerId,
        action: 'Said UNO'
    });

    const player = await PlayerModel.getById(playerId);

    return { message: `${player.name} said UNO successfully.` };
};

const challengeUno = async ({ game_id, access_token }) => {
    const challengerId = await validateAccessToken(access_token);

    const game = await GameModel.getGameById(game_id);
    if (!game) throw new NotFoundError("Game not found");

    if (game.status !== 'in_progress') {
        throw new GameStateError("Game is not in progress");
    }

    const players = await PlayerGameModel.getPlayersGameId(game_id);

    const challenger = await PlayerModel.getById(challengerId);
    if (!challenger) throw new NotFoundError("Challenger not found");

    let challengedPlayer = null;
    for (const player of players) {
        if (player.playerId === challengerId) continue;
        const playerCards = await CardModel.getCardsByPlayerAndGame(player.playerId, game_id);
        if (playerCards.length === 1) {
            const playerGame = await PlayerGameModel.getPlayerGameById(player.playerId, game_id);
            if(!playerGame.saidUno){
                challengedPlayer = await PlayerModel.getById(player.playerId);
                break;
            }
        }
    }

    if (!challengedPlayer) {
        return { 
            success: false,
            message: "No player with one card forgot to say UNO" };
    }

    await deckService.drawCards(game_id, challengedPlayer.id, 2);
    await PlayerGameModel.setSaidUno(challengedPlayer.id, game_id, false);

    await GameLogModel.createLog({
        gameId: game_id,
        playerId: challengerId,
        action: `Successfully challenged ${challengedPlayer.name}`
    });

    return { 
        message: `Challenge successful. ${challengedPlayer.name} forgot to say UNO and draws 2 cards.`,
    };
};

/**
 * Processa a jogada de uma carta "Pular" em um jogo UNO.
 *
 * @async
 * @function handleSkipCard
 * @param {string} game_id - O ID do jogo onde a carta "Pular" foi jogada.
 * @throws {NotFoundError} Se o jogo não for encontrado.
 * @throws {GameStateError} Se o jogo não estiver em andamento.
 * @throws {ValidationError} Se não houver jogadores no jogo.
 * @returns {Promise<Object>} Um objeto contendo informações sobre o estado do jogo após a jogada.
 *
 * @description
 * Esta função lida com a lógica de jogar uma carta "Pular" no jogo UNO. Ela verifica o estado do jogo,
 * identifica o jogador atual, o jogador que será pulado e o próximo jogador. A função atualiza o estado
 * do jogo, registra a ação no log e retorna informações relevantes sobre a jogada.
 *
 * @property {string} gameDirection - A direção atual do jogo.
 * @property {number} nextPlayerIndex - O índice do próximo jogador.
 * @property {Object} nextPlayer - Informações sobre o próximo jogador.
 * @property {Object} skippedPlayer - Informações sobre o jogador que foi pulado.
 * @property {Array} playersInTurnOrder - Lista de jogadores na ordem de turno atual.
 */
const handleSkipCard = async (game_id, playedCard) => {
    const game = await GameModel.getGameById(game_id);
    if (!game) throw new NotFoundError("Game not found");

    if (game.status !== 'in_progress') {
        throw new GameStateError(`Game ${game_id} is not in 'in_progress' status`);
    }

    const players = await PlayerGameModel.getSortedPlayersByGameId(game_id);
    if (players.length === 0) {
        throw new ValidationError(`No players found for game ${game_id}`);
    }

    const currentPlayerIndex = game.currentPlayerIndex;
    const currentPlayer = players[currentPlayerIndex];

    const skippedPlayerIndex = calculateNextPlayerIndex(
        {
            currentPlayerIndex: currentPlayerIndex,
            currentDirection: game.currentDirection,
        },
        players.length
    );
    const skippedPlayer = players[skippedPlayerIndex];
    const skippedPlayerData = await PlayerModel.getById(skippedPlayer.playerId);

    const nextPlayerIndex = calculateNextPlayerIndex(
        {
            currentPlayerIndex: skippedPlayerIndex,
            currentDirection: game.currentDirection,
        },
        players.length
    );

    const nextPlayer = players[nextPlayerIndex];
    const nextPlayerData = await PlayerModel.getById(nextPlayer.playerId);

    await GameModel.updateGame(game_id, { currentPlayerIndex: nextPlayerIndex, currentColor: playedCard.color } );
    
    await GameLogModel.createLog({
        gameId: game_id,
        playerId: currentPlayer.playerId,
        action: `Skipped ${skippedPlayerData.name}'s turn with a Skip card`
    });

    const playersInTurnOrder = await Promise.all(players.map(async (player) => {
        const playerData = await PlayerModel.getById(player.playerId);
        return {
            id: playerData.id,
            name: playerData.name
        };
    }));

    return {
        gameDirection: game.currentDirection,
        nextPlayerIndex: nextPlayerIndex,
        nextPlayer: {
            name: nextPlayerData.name
        },
        skippedPlayer: {
            name: skippedPlayerData.name
        },
        [playersInTurnOrder]: playersInTurnOrder
    };
};

/**
 * Inverte a direção do jogo e atualiza o próximo jogador.
 *
 * @async
 * @function reverseGameDirection
 * @param {string} game_id - O ID do jogo para inverter a direção.
 * @throws {NotFoundError} Se o jogo não for encontrado.
 * @throws {GameStateError} Se o jogo não estiver em andamento.
 * @returns {Promise<Object>} Um objeto contendo o ID do jogo, a nova direção e uma mensagem.
 *
 * @description
 * Esta função lida com a lógica de inverter a direção do jogo UNO. Ela verifica o estado do jogo,
 * inverte a direção atual, calcula o próximo jogador com base na nova direção, atualiza o estado
 * do jogo e registra a ação no log.
 *
 */
const reverseGameDirection = async (game_id, playedCard) => {
    const game = await GameModel.getGameById(game_id);
    if (!game) throw new NotFoundError("Game not found");

    if (game.status !== 'in_progress') {
        throw new GameStateError(`Game ${game_id} is not in 'in_progress' status`);
    }

    const newDirection = game.currentDirection === 'clockwise' ? 'counter-clockwise' : 'clockwise';

    const players = await PlayerGameModel.getSortedPlayersByGameId(game_id);
    if (players.length <= 1) return { message: "Not enough players to reverse direction." };

    const nextPlayerIndex = calculateNextPlayerIndex({ 
        currentPlayerIndex: game.currentPlayerIndex, 
        currentDirection: newDirection 
    }, players.length);

    await GameModel.updateGame(game_id, {
        currentDirection: newDirection,
        currentPlayerIndex: nextPlayerIndex,
        currentColor: playedCard.color
    });

    const newCurrentPlayer = players[nextPlayerIndex];

    await GameLogModel.createLog({
        gameId: game_id,
        action: `Reversed the game direction to ${newDirection}`,
        playerId: newCurrentPlayer.playerId,
    });

    return {
        gameId: game_id,
        newDirection,
        message: `Reversed the game direction to ${newDirection}. Now it's ${newCurrentPlayer.player_name}'s turn.`,
    };
};

const handleDraw2Card = async (game_id, playedCard) => {
    const game = await GameModel.getGameById(game_id);
    if (!game) throw new NotFoundError("Game not found");

    if (game.status !== 'in_progress') {
        throw new GameStateError(`Game ${game_id} is not in 'in_progress' status`);
    }

    const players = await PlayerGameModel.getSortedPlayersByGameId(game_id);
    if (players.length === 0) {
        throw new ValidationError(`No players found for game ${game_id}`);
    }

    const currentPlayerIndex = game.currentPlayerIndex;
    const currentPlayer = players[currentPlayerIndex];

    const affectedPlayerIndex = calculateNextPlayerIndex(
        {
            currentPlayerIndex: currentPlayerIndex,
            currentDirection: game.currentDirection,
        },
        players.length
    );
    const affectedPlayer = players[affectedPlayerIndex];
    const affectedPlayerData = await PlayerModel.getById(affectedPlayer.playerId);

    const drawnCards = await deckService.drawCards(game_id, affectedPlayer.playerId, 2);
    if (!drawnCards || drawnCards.length !== 2) {
        throw new Error("Failed to draw 2 cards from the deck");
    }

    const nextPlayerIndex = calculateNextPlayerIndex(
        {
            currentPlayerIndex: affectedPlayerIndex,
            currentDirection: game.currentDirection,
        },
        players.length
    );
    const nextPlayer = players[nextPlayerIndex];
    const nextPlayerData = await PlayerModel.getById(nextPlayer.playerId);

    await GameModel.updateGame(game_id, { 
        currentPlayerIndex: nextPlayerIndex,
        currentColor: playedCard.color
    });

    await GameLogModel.createLog({
        gameId: game_id,
        playerId: currentPlayer.playerId,
        action: `${affectedPlayerData.name} drew 2 cards and was skipped`,
    });

    return {
        gameId: game_id,
        currentDirection: game.currentDirection,
        affectedPlayer: {
            id: affectedPlayerData.id,
            name: affectedPlayerData.name,
        },
        nextPlayer: {
            id: nextPlayerData.id,
            name: nextPlayerData.name,
        },
        message: `${affectedPlayerData.name} drew 2 cards and was skipped. Now it's ${nextPlayerData.name}'s turn.`,
    };
};

const handleWildCard = async (game_id, color) => {
    const game = await GameModel.getGameById(game_id);
    if (!game) throw new NotFoundError("Game not found");

    const currentPlayer = await getCurrentPlayer({game_id: game_id});

    if (game.status !== 'in_progress') {
        throw new GameStateError(`Game ${game_id} is not in 'in_progress' status`);
    }

    const validColors = ['red', 'blue', 'green', 'yellow'];
    if (!validColors.includes(color)) {
        throw new ValidationError(`Invalid color: ${color}. Must be one of: ${validColors.join(', ')}`);
    }

    const nextPlayer = await updateCurrentPlayerMoviment(game_id);

    await GameModel.updateGame(game_id, { currentColor: color });
    
    await GameLogModel.createLog({
        gameId: game_id,
        playerId: currentPlayer.player_id,
        action: `Changed color to ${color} with a Wild card`
    });

    return {
        gameDirection: game.currentDirection,
        newColor: color,
        nextPlayer: nextPlayer.name,
    };
};

const handleWildDraw4Card = async (game_id, color) => {
    const game = await GameModel.getGameById(game_id);

    if (game.status !== 'in_progress') {
        throw new GameStateError(`Game ${game_id} is not in 'in_progress' status`);
    }

    const validColors = ['red', 'blue', 'green', 'yellow'];
    if (!validColors.includes(color)) {
        throw new ValidationError(`Invalid color: ${color}. Must be one of: ${validColors.join(', ')}`);
    }

    const players = await PlayerGameModel.getSortedPlayersByGameId(game_id);
    if (players.length === 0) {
        throw new ValidationError(`No players found for game ${game_id}`);
    }

    const currentPlayerIndex = game.currentPlayerIndex;
    const currentPlayer = players[currentPlayerIndex];
    const currentPlayerData = await PlayerModel.getById(currentPlayer.playerId);

    const affectedPlayerIndex = calculateNextPlayerIndex(
        {
            currentPlayerIndex: currentPlayerIndex,
            currentDirection: game.currentDirection,
        },
        players.length
    );
    const affectedPlayer = players[affectedPlayerIndex];
    const affectedPlayerData = await PlayerModel.getById(affectedPlayer.playerId);

    const drawnCards = await deckService.drawCards(game_id, affectedPlayer.playerId, 4);
    if (!drawnCards || drawnCards.length !== 4) {
        throw new Error("Failed to draw 4 cards from the deck");
    }

    await GameModel.updateGame(game_id, { currentColor: color });

    const nextPlayerIndex = calculateNextPlayerIndex(
        {
            currentPlayerIndex: affectedPlayerIndex,
            currentDirection: game.currentDirection,
        },
        players.length
    );
    const nextPlayer = players[nextPlayerIndex];
    const nextPlayerData = await PlayerModel.getById(nextPlayer.playerId);

    await GameModel.updateGame(game_id, { currentPlayerIndex: nextPlayerIndex });

    await GameLogModel.createLog({
        gameId: game_id,
        playerId: currentPlayer.playerId,
        action: `Changed color to ${color} with a Wild Draw Four card. ${affectedPlayerData.name} drew 4 cards and was skipped.`
    });

    return {
        gameId: game_id,
        gameDirection: game.currentDirection,
        newColor: color,
        affectedPlayer: {
            id: affectedPlayerData.id,
            name: affectedPlayerData.name,
        },
        nextPlayer: {
            id: nextPlayerData.id,
            name: nextPlayerData.name,
        },
        message: `${currentPlayerData.name} changed color to ${color}. ${affectedPlayerData.name} drew 4 cards and was skipped. Now it's ${nextPlayerData.name}'s turn.`
    };
};

const handleNormalTurn = async (game_id, playedCard) => {
    const game = await GameModel.getGameById(game_id);
    if (!game) throw new NotFoundError("Game not found");

    if (game.status !== 'in_progress') {
        throw new GameStateError("Game is not in progress");
    }

     await GameModel.updateGame(game_id, { currentColor: playedCard.color } );

    const currentPlayer = await getCurrentPlayer({ game_id });
    
    await GameLogModel.createLog({
        gameId: game_id,
        playerId: currentPlayer.player_id,
        action: 'Played a normal turn'
    });

    const nextPlayer = await updateCurrentPlayerMoviment(game_id);

    return {
        message: `${currentPlayer.player_name} completed their turn.`,
        nextPlayer: nextPlayer.current_player
    };
};

export default {
    createGame,
    getGame,
    updateGame,
    deleteGame,
    removePlayerFromGame,
    playerList,
    joinGame,
    setPlayerReady,
    startGame,
    leaveGame,
    endGame,
    getGameState,
    getCurrentPlayer,
    updateCurrentPlayerMoviment,
    getGameHistory,
    sayUno,
    challengeUno,
    handleSkipCard,
    reverseGameDirection,
    handleDraw2Card,
    handleWildCard,
    handleWildDraw4Card,
    handleNormalTurn
};