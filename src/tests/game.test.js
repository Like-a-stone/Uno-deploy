import gameService from '../services/gameService';
import { GameModel } from '../models/game';
import { PlayerModel } from '../models/player';
import { CardModel } from '../models/card';
import { PlayerGameModel } from '../models/playerGame';
import { validateAccessToken } from '../utils/tokenValidator';
import { NotFoundError, AuthError, GameStateError, BusinessError, ValidationError } from '../utils/customError';
import gameValidationService from '../services/gameValidationService'; 
import deckService from '../services/deckService';
import scoreHistoryService from '../services/scoreHistoryService';
import { GameLogModel } from '../models/gameLog';
import cardService from '../services/cardService';

jest.mock('../models/gameLog');
jest.mock('../models/game');
jest.mock('../services/scoreHistoryService', () => ({
    getFormattedScores: jest.fn(),
    createScoreHistory: jest.fn(),
    initializeScore: jest.fn(),
    updateScoreOnCardPlay: jest.fn(),
    updateScoresOnGameEnd: jest.fn(),
}));
jest.mock('../models/player');
jest.mock('../models/playerGame');
jest.mock('../models/scoreHistory');
jest.mock('../models/card', () => ({
    CardModel: {
        getCardsByPlayerAndGame: jest.fn(),
        getTopDiscardCard: jest.fn(),
        updateCard: jest.fn(),
        getDeckCardCount: jest.fn(),
        
    }
}));
jest.mock('../utils/tokenValidator');
jest.mock('../services/gameValidationService', () => ({
    validateTitle: jest.fn(),
    validateMinimumPlayers: jest.fn(),
    validateGameStatus: jest.fn(),
    validatePlayerInGame: jest.fn(),
    checkAllPlayersReady: jest.fn(),
    validateMaxPlayers: jest.fn(),
}));

jest.mock('../services/deckService', () => ({
initializeDeck: jest.fn(),
dealInitialCards: jest.fn(),
initializeGameWithCard: jest.fn(),
takeCardFromDeck : jest.fn(),
drawCards: jest.fn(),
}));

jest.mock('../services/cardService', () => ({
    getPlayersCardsInGame: jest.fn()
}));

describe('Game Service', () => {
    const mockGame = {
        id: 1,
        status: 'waiting',
        creatorId: 1,
        currentDirection: 'clockwise',
        currentPlayerIndex: 0,
        currentColor: 'red'
    };
    const mockAccessToken = 'valid-token';
    const mockPlayerId = 1;

    beforeEach(() => {
        jest.clearAllMocks();
        validateAccessToken.mockResolvedValue(mockPlayerId);
    });

    describe('Basic Game Operations', () => {
        describe('createGame', () => {
            beforeEach(() => {
                PlayerModel.getById.mockResolvedValue({ id: mockPlayerId });
                GameModel.createGame.mockResolvedValue({ id: 1, creatorId: mockPlayerId });
                PlayerGameModel.createPlayerGame.mockResolvedValue({ gameId: 1, mockPlayerId, position: 0 });
            });

            it('creates game with valid data', async () => {
                gameValidationService.validateTitle.mockReturnValue('game1');
                gameValidationService.validateMaxPlayers.mockReturnValue(4); // Mock the validateMaxPlayers function
                const result = await gameService.createGame({ title: 'game1', maxPlayers: 4 }, mockPlayerId);
                expect(result).toEqual({ message: "Game created successfully", game_id: 1 });
            });

            it('validates title constraints', async () => {
                gameValidationService.validateTitle.mockReturnValue(null);
                await expect(gameService.createGame('a', mockPlayerId))
                    .rejects.toThrow('Title must be between 3 and 100 characters long');
            });
        });

        describe('getGame', () => {
            it('retrieves existing game', async () => {
                GameModel.getGameById.mockResolvedValue(mockGame);
                const result = await gameService.getGame(1);
                expect(result).toEqual(mockGame);
            });

            it('handles non-existing game', async () => {
                GameModel.getGameById.mockResolvedValue(null);
                await expect(gameService.getGame(1)).rejects.toThrow(NotFoundError);
            });
        });

        describe('updateGame', () => {
            it('should update game successfully', async () => {
                GameModel.updateGame.mockResolvedValue({ ...mockGame, status: 'finished' });
                const result = await gameService.updateGame(1, { status: 'finished' });
                expect(result).toBeDefined();
                expect(GameModel.updateGame).toHaveBeenCalledWith(1, { status: 'finished' });
            });

            it('should throw error when game not found', async () => {
                GameModel.updateGame.mockResolvedValue(null);
                await expect(gameService.updateGame(1, {}))
                    .rejects.toThrow(NotFoundError);
            });
        });

        describe('deleteGame', () => {
            it('should delete game successfully', async () => {
                const mockGameWithDestroy = {
                    ...mockGame,
                    destroy: jest.fn().mockResolvedValue(true)
                };
                GameModel.deleteGame.mockResolvedValue(mockGameWithDestroy);
                
                await gameService.deleteGame(1);
                expect(GameModel.deleteGame).toHaveBeenCalledWith(1);
                expect(mockGameWithDestroy.destroy).toHaveBeenCalled();
            });

            it('should throw error when game not found for deletion', async () => {
                GameModel.deleteGame.mockResolvedValue(null);
                await expect(gameService.deleteGame(1))
                    .rejects.toThrow(NotFoundError);
            });
        });
    });

    describe('Game State Management', () => {
        describe('startGame and endGame', () => {
            beforeEach(() => {
                GameModel.getGameById.mockResolvedValue({ id: 1, status: 'waiting', creatorId: mockPlayerId });
                PlayerGameModel.getPlayersGameId.mockResolvedValue([
                  { playerId: 1, isReady: true },
                  { playerId: 2, isReady: true }
                ]);
                PlayerGameModel.updatePlayerPositions.mockResolvedValue();
                GameModel.startGame.mockResolvedValue(true);
                deckService.initializeDeck.mockResolvedValue();
                deckService.dealInitialCards.mockResolvedValue();
                gameValidationService.checkAllPlayersReady.mockReturnValue(true);
                gameValidationService.validateGameStatus.mockResolvedValue(true);
            });

            it('handles valid state transitions', async () => {
                const mockPlayerId = 'player1';
                const mockPlayerName = 'Player 1';
            
                // Mock para validateAccessToken
                validateAccessToken.mockResolvedValue(mockPlayerId);
            
                GameModel.getGameById.mockResolvedValueOnce({ 
                    id: 1, 
                    status: 'waiting', 
                    creatorId: mockPlayerId, 
                    numPlayers: 2 
                });
                
                PlayerGameModel.getPlayersGameId.mockResolvedValue([
                    { playerId: mockPlayerId, isReady: true },
                    { playerId: 'player2', isReady: true }
                ]);
                PlayerGameModel.updatePlayerPositions.mockResolvedValue();
                
                GameModel.startGame.mockResolvedValue({ id: 1, status: 'in_progress' });
                
                deckService.initializeDeck.mockResolvedValue();
                deckService.dealInitialCards.mockResolvedValue();
                deckService.initializeGameWithCard.mockResolvedValue({
                    color: 'red',
                    value: '7',
                    location: 'discard'
                });
            
                PlayerModel.getById.mockResolvedValue({ id: mockPlayerId, name: mockPlayerName });
            
                scoreHistoryService.initializeScore.mockResolvedValue();
            
                const startGameResult = await gameService.startGame({ game_id: 1, access_token: 'valid_token', cardsPerPlayer: 7 });
                
                expect(startGameResult).toEqual({
                    message: "Game started successfully",
                    firstPlayer: mockPlayerName,
                    firstCardDiscardPile: {
                        color: 'red',
                        value: '7',
                        location: 'discard', 
                    },
                    players: undefined, 
                });
            
                expect(validateAccessToken).toHaveBeenCalledWith('valid_token');
                expect(GameModel.getGameById).toHaveBeenCalledWith(1);
                expect(PlayerGameModel.getPlayersGameId).toHaveBeenCalledWith(1);
                expect(GameModel.startGame).toHaveBeenCalled();
                expect(deckService.initializeDeck).toHaveBeenCalled();
                expect(deckService.dealInitialCards).toHaveBeenCalled();
                expect(deckService.initializeGameWithCard).toHaveBeenCalled();
                expect(PlayerModel.getById).toHaveBeenCalledWith(mockPlayerId);
                expect(scoreHistoryService.initializeScore).toHaveBeenCalled();
            });

            it('prevents invalid transitions', async () => {
                GameModel.getGameById.mockResolvedValue({ ...mockGame, status: 'finished' });
                await expect(gameService.startGame({ game_id: 1, access_token: mockAccessToken }))
                    .rejects.toThrow(GameStateError);
            });

            it('throws error when game not found', async () => {
                GameModel.getGameById.mockResolvedValue(null);
                await expect(gameService.startGame({ game_id: 1, access_token: 'token', cardsPerPlayer: 7 }))
                    .rejects.toThrow("Game not found");
            });

            it('should end the game successfully', async () => {
                const mockGameId = 1;
                const mockAccessToken = 'valid_token';
                const mockPlayerId = 'player1';
                const mockWinningPlayerId = 'player2';
                const mockWinningPlayerName = 'Winner';
                const mockScores = {
                    'Winner': 0,
                    'Loser': 10
                };
            
                // Mock das funções necessárias
                validateAccessToken.mockResolvedValue(mockPlayerId);
                GameModel.getGameById.mockResolvedValue({ id: mockGameId, status: 'in_progress' });
                PlayerGameModel.getPlayerGameById.mockResolvedValue({ playerId: mockPlayerId, gameId: mockGameId });
                cardService.getPlayersCardsInGame.mockResolvedValue([
                    { playerId: mockWinningPlayerId, cardCount: 0 },
                    { playerId: 'player3', cardCount: 3 }
                ]);
                GameModel.updateGame.mockResolvedValue(true);
                scoreHistoryService.updateScoresOnGameEnd.mockResolvedValue();
                scoreHistoryService.getFormattedScores.mockResolvedValue(mockScores);
                PlayerModel.getById.mockResolvedValue({ id: mockWinningPlayerId, name: mockWinningPlayerName });
            
                const endGameResult = await gameService.endGame({ game_id: mockGameId, access_token: mockAccessToken });
            
                expect(endGameResult).toEqual({
                    message: `${mockWinningPlayerName} has won the game!`,
                    winner: {
                        playerId: mockWinningPlayerId,
                        name: mockWinningPlayerName
                    },
                    scores: mockScores
                });
            
                expect(validateAccessToken).toHaveBeenCalledWith(mockAccessToken);
                expect(GameModel.getGameById).toHaveBeenCalledWith(mockGameId);
                expect(PlayerGameModel.getPlayerGameById).toHaveBeenCalledWith(mockPlayerId, mockGameId);
                expect(cardService.getPlayersCardsInGame).toHaveBeenCalledWith(mockGameId, true);
                expect(GameModel.updateGame).toHaveBeenCalledWith(mockGameId, { status: 'finished' });
                expect(scoreHistoryService.updateScoresOnGameEnd).toHaveBeenCalledWith(mockGameId);
                expect(scoreHistoryService.getFormattedScores).toHaveBeenCalledWith(mockGameId);
                expect(PlayerModel.getById).toHaveBeenCalledWith(mockWinningPlayerId);
            });
    
            it('should throw an error if game is not found', async () => {
                GameModel.getGameById.mockResolvedValue(null);
    
                await expect(gameService.endGame(1, 2)).rejects.toThrow('Game not found');
            });

            it('should throw an error if game is not in progress', async () => {
                const mockGameId = 1;
                const mockAccessToken = 'valid_token';
                const mockPlayerId = 'player1';
            
                // Mock das funções necessárias
                validateAccessToken.mockResolvedValue(mockPlayerId);
                GameModel.getGameById.mockResolvedValue({ id: mockGameId, status: 'waiting' });
                PlayerGameModel.getPlayerGameById.mockResolvedValue({ playerId: mockPlayerId, gameId: mockGameId });
            
                await expect(gameService.endGame({ game_id: mockGameId, access_token: mockAccessToken }))
                    .rejects.toThrow(GameStateError);
                await expect(gameService.endGame({ game_id: mockGameId, access_token: mockAccessToken }))
                    .rejects.toThrow('Game is not in progress, cannot be ended');
            
                expect(validateAccessToken).toHaveBeenCalledWith(mockAccessToken);
                expect(GameModel.getGameById).toHaveBeenCalledWith(mockGameId);
                expect(PlayerGameModel.getPlayerGameById).toHaveBeenCalledWith(mockPlayerId, mockGameId);
            });

            it('should throw an error if getting winning player fails', async () => {
                const mockGameId = 1;
                const mockAccessToken = 'valid_token';
                const mockPlayerId = 'player1';
                const mockWinningPlayerId = 'player2';
            
                // Mock das funções necessárias
                validateAccessToken.mockResolvedValue(mockPlayerId);
                GameModel.getGameById.mockResolvedValue({ id: mockGameId, status: 'in_progress' });
                PlayerGameModel.getPlayerGameById.mockResolvedValue({ playerId: mockPlayerId, gameId: mockGameId });
                cardService.getPlayersCardsInGame.mockResolvedValue([
                    { playerId: mockWinningPlayerId, cardCount: 0 },
                    { playerId: 'player3', cardCount: 3 }
                ]);
                GameModel.updateGame.mockResolvedValue(true);
                scoreHistoryService.updateScoresOnGameEnd.mockResolvedValue();
                scoreHistoryService.getFormattedScores.mockResolvedValue([]);
                PlayerModel.getById.mockRejectedValue(new Error('Player not found'));
            
                await expect(gameService.endGame({ game_id: mockGameId, access_token: mockAccessToken }))
                    .rejects.toThrow('Player not found');
            
                expect(validateAccessToken).toHaveBeenCalledWith(mockAccessToken);
                expect(GameModel.getGameById).toHaveBeenCalledWith(mockGameId);
                expect(PlayerGameModel.getPlayerGameById).toHaveBeenCalledWith(mockPlayerId, mockGameId);
                expect(cardService.getPlayersCardsInGame).toHaveBeenCalledWith(mockGameId, true);
                expect(GameModel.updateGame).toHaveBeenCalledWith(mockGameId, { status: 'finished' });
                expect(scoreHistoryService.updateScoresOnGameEnd).toHaveBeenCalledWith(mockGameId);
                expect(scoreHistoryService.getFormattedScores).toHaveBeenCalledWith(mockGameId);
                expect(PlayerModel.getById).toHaveBeenCalledWith(mockWinningPlayerId);
            });
    
            it('should throw an error if ending the game fails', async () => {
                // Mock the necessary functions
                validateAccessToken.mockResolvedValue(1);
                GameModel.getGameById.mockResolvedValue({ id: 1, status: 'in_progress' });
                PlayerGameModel.getPlayerGameById.mockResolvedValue({ playerId: 1, gameId: 1 });
                cardService.getPlayersCardsInGame.mockResolvedValue([{ playerId: 1, cardCount: 0 }]);
                GameModel.updateGame.mockResolvedValue(null); // Simulate failure to update game
                PlayerModel.getById.mockResolvedValue({ id: 1, name: 'Player 1' });
        
                await expect(gameService.endGame({ game_id: 1, access_token: 'token' }))
                  .rejects.toThrow('Failed to end the game');
        
                expect(GameModel.updateGame).toHaveBeenCalledWith(1, { status: 'finished' });
            });

            it('throws error if game not found', async () => {
                GameModel.getGameById.mockResolvedValue(null);
                await expect(gameService.endGame(1, 2))
                .rejects.toThrow("Game not found");
                
            });
            
        });

        describe('getGameState Error Branch', () => {
            it('throws error when game not found', async () => {
                GameModel.getGameById.mockResolvedValue(null);
                await expect(gameService.getGameState(1)).rejects.toThrow("Game not found");
            
            });
            
        });

        describe('getCurrentPlayer Error Branches', () => {
            it('throws error when game not found', async () => {
                GameModel.getGameById.mockResolvedValue(null);
                await expect(gameService.getCurrentPlayer({ game_id: 1 })).rejects.toThrow("Game not found");
            
            });

            it('throws error when no players found', async () => {
                GameModel.getGameById.mockResolvedValue({ id: 1, currentPlayerIndex: 0 }); 
                PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue([]);
                await expect(gameService.getCurrentPlayer({ game_id: 1 })).rejects.toThrow("No players found in this game");
                
            });

            it('throws error when current player not found', async () => {
                GameModel.getGameById.mockResolvedValue({ id: 1, currentPlayerIndex: 0 });
                PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue([null]);
                await expect(gameService.getCurrentPlayer({ game_id: 1 })).rejects.toThrow("Current player not found");
        
            });

            it('throws error when player retrieval fails', async () => {
                GameModel.getGameById.mockResolvedValue({ id: 1, currentPlayerIndex: 0 });
                PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue([{ playerId: 1 }]);
                PlayerModel.getById.mockResolvedValue(null);
                await expect(gameService.getCurrentPlayer({ game_id: 1 })).rejects.toThrow("Player not found");
                
            }); 
        }); 

        describe('getGameState', () => {
            beforeEach(() => {
                GameModel.getGameById.mockResolvedValue(mockGame);
                GameLogModel.getGameLogs.mockResolvedValue([
                    { playerId: 1, action: 'played a card', createdAt: new Date() }
                ]);
                PlayerModel.getById.mockResolvedValue({ id: 1, name: 'Player 1' });
                CardModel.getTopDiscardCard.mockResolvedValue({ color: 'red', value: '7', location: 'discard' });
                PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue([
                    { playerId: 1, position: 0 },
                    { playerId: 2, position: 1 }
                ]);
                gameService.getCurrentPlayer = jest.fn().mockResolvedValue({
                    player_id: 1,
                    player_name: 'Player 1',
                    player_position: 0
                });
                cardService.getPlayersCardsInGame = jest.fn().mockResolvedValue([
                    { player: 'Player 1', cardCount: 3 },
                    { player: 'Player 2', cardCount: 5 }
                ]);
            });

            it('should return the game state correctly', async () => {
                const result = await gameService.getGameState(1);

                expect(result).toEqual({
                    state: 'waiting',
                    currentDirection: 'clockwise',
                    currentColor: 'red',
                    nextPlayer: 'Player 1',
                    nextPlayerIndex: 0,
                    playersInOrder: [
                        { id: 1, name: 'Player 1', position: 0 },
                        { id: 1, name: 'Player 1', position: 1 }
                    ],
                    topDiscardCard: {
                        color: 'red',
                        value: '7',
                        location: 'discard'
                    },
                    playerCards: [
                        { player: 'Player 1', cardCount: 3 },
                        { player: 'Player 2', cardCount: 5 }
                    ],
                    turnHistory: [
                        { player: 'Player 1', action: 'played a card', timestamp: expect.any(Date) }
                    ]
                });

                expect(GameModel.getGameById).toHaveBeenCalledWith(1);
                expect(GameLogModel.getGameLogs).toHaveBeenCalledWith(1);
                expect(PlayerModel.getById).toHaveBeenCalledWith(1);
            });

            it('should throw NotFoundError when game not found', async () => {
                GameModel.getGameById.mockResolvedValue(null);
                await expect(gameService.getGameState(1)).rejects.toThrow(NotFoundError);
            });
        });

        describe('updateCurrentPlayerMoviment', () => {
            it('should update the current player index correctly for clockwise direction', async () => {
                const mockGameData = {
                    id: 1,
                    status: 'in_progress',
                    currentPlayerIndex: 0,
                    currentDirection: 'clockwise'
                };
                GameModel.getGameById.mockResolvedValue(mockGameData);
                PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue([
                    { id: 1, playerId: 1, name: 'Player 1', position: 0 },
                    { id: 2, playerId: 2, name: 'Player 2', position: 1 },
                    { id: 3, playerId: 3, name: 'Player 3', position: 2 }
                ]);
                GameModel.updateCurrentPlayer.mockResolvedValue(true);

                const result = await gameService.updateCurrentPlayerMoviment(1);

                expect(result).toEqual({
                    game_id: 1,
                    current_player: {
                        id: 2,
                        name: 'Player 2'
                    }
                });
                expect(GameModel.updateCurrentPlayer).toHaveBeenCalledWith(1, 1); // Next index should be 1
            });

            it('should update the current player index correctly for counter-clockwise direction', async () => {
                const mockGameData = {
                    id: 1,
                    status: 'in_progress',
                    currentPlayerIndex: 1,
                    currentDirection: 'counter-clockwise'
                };
                GameModel.getGameById.mockResolvedValue(mockGameData);
                PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue([
                    { id: 1, playerId: 1, name: 'Player 1', position: 0 },
                    { id: 2, playerId: 2, name: 'Player 2', position: 1 },
                    { id: 3, playerId: 3, name: 'Player 3', position: 2 }
                ]);
                GameModel.updateCurrentPlayer.mockResolvedValue(true);

                const result = await gameService.updateCurrentPlayerMoviment(1);

                expect(result).toEqual({
                    game_id: 1,
                    current_player: {
                        id: 1,
                        name: 'Player 1'
                    }
                });
                expect(GameModel.updateCurrentPlayer).toHaveBeenCalledWith(1, 0); // Should go back to index 0
            });

            it('should throw NotFoundError when game not found', async () => {
                GameModel.getGameById.mockResolvedValue(null);
                await expect(gameService.updateCurrentPlayerMoviment(1)).rejects.toThrow(NotFoundError);
            });

            it('should throw GameStateError when game is not in progress', async () => {
                GameModel.getGameById.mockResolvedValue({
                    id: 1,
                    status: 'waiting',
                    currentPlayerIndex: 0
                });
                await expect(gameService.updateCurrentPlayerMoviment(1)).rejects.toThrow(GameStateError);
            });

            it('should throw ValidationError when no players found', async () => {
                GameModel.getGameById.mockResolvedValue({
                    id: 1,
                    status: 'in_progress',
                    currentPlayerIndex: 0
                });
                PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue([]);
                await expect(gameService.updateCurrentPlayerMoviment(1)).rejects.toThrow(ValidationError);
            });
        });

        describe('getGameHistory', () => {
            beforeEach(() => {
                GameModel.getGameById.mockResolvedValue({ id: 1 });
                GameLogModel.getGameLogs.mockResolvedValue([
                    { playerId: 1, action: 'played red 7', createdAt: new Date() },
                    { playerId: 2, action: 'played blue 4', createdAt: new Date() }
                ]);
                PlayerModel.getById.mockResolvedValueOnce({ id: 1, name: 'Player 1' })
                    .mockResolvedValueOnce({ id: 2, name: 'Player 2' });
            });

            it('should return game history correctly', async () => {
                const result = await gameService.getGameHistory(1);

                expect(result).toHaveProperty('history');
                expect(result.history).toHaveLength(2);
                expect(result.history[0]).toEqual({
                    player: 'Player 1',
                    action: 'played red 7',
                    timestamp: expect.any(Date)
                });
                expect(result.history[1]).toEqual({
                    player: 'Player 2',
                    action: 'played blue 4',
                    timestamp: expect.any(Date)
                });
            });

            it('should handle unknown player gracefully', async () => {
                GameModel.getGameById.mockResolvedValue({ id: 1 });
                GameLogModel.getGameLogs.mockResolvedValue([
                    { playerId: 999, action: 'unknown action', createdAt: new Date() }
                ]);
                PlayerModel.getById = jest.fn().mockImplementation((id) => {
                    return Promise.resolve(id === 999 ? null : { id: id, name: `Player ${id}` });
                });

                const result = await gameService.getGameHistory(1);

                expect(result.history[0]).toEqual({
                    player: 'Unknown Player',
                    action: 'unknown action',
                    timestamp: expect.any(Date)
                });
            });

            it('should throw NotFoundError when game not found', async () => {
                GameModel.getGameById.mockResolvedValue(null);
                await expect(gameService.getGameHistory(1)).rejects.toThrow(NotFoundError);
            });
        });
    });

    describe('Player Management', () => {
        describe("joinGame and leaveGame", () => {
            it("handles player joining", async () => {
                const mockGame = { id: 1, title: "Test Game" };
                const mockPlayerId = 1;
                const mockAccessToken = "mockToken";

                validateAccessToken.mockResolvedValue(mockPlayerId);
                PlayerModel.getById.mockResolvedValue({
                    id: mockPlayerId,
                    name: "Test Player",
                });
                GameModel.getGameById.mockResolvedValue(mockGame);
                PlayerGameModel.isPlayerInGame = jest
                    .fn()
                    .mockResolvedValue(false);
                PlayerGameModel.joinGame.mockResolvedValue({ id: 1 });

                const result = await gameService.joinGame({
                    game_id: 1,
                    access_token: mockAccessToken,
                });

                expect(result).toEqual({
                    message: "Player joined the game successfully",
                    player_name: "Player 1",
                    game_id: 1,
                    game_title: mockGame.title,
                });

                expect(PlayerModel.getById).toHaveBeenCalledWith(mockPlayerId);
                expect(GameModel.getGameById).toHaveBeenCalledWith(1);
                expect(PlayerGameModel.joinGame).toHaveBeenCalledWith(
                    1,
                    mockPlayerId
                );
            });

            it("handles player leaving", async () => {
                GameModel.getGameById.mockResolvedValue({
                    ...mockGame,
                    status: "in_progress",
                });
                PlayerGameModel.getPlayerGameById.mockResolvedValue({
                    playerId: mockPlayerId,
                    gameId: 1,
                });
                PlayerGameModel.deletePlayerById.mockResolvedValue(
                    mockPlayerId
                );
                gameValidationService.validateGameStatus.mockResolvedValue(
                    true
                );
                const result = await gameService.leaveGame({
                    game_id: 1,
                    access_token: mockAccessToken,
                });
                expect(result).toEqual({
                    message: "User left the game successfully",
                });
            });

        });  

        describe('Player Ready State', () => {
            it('manages player ready state', async () => {
                const mockGame = { id: 1, title: 'Test Game' };
                const mockPlayerId = 1;
                const mockAccessToken = 'mockToken';
    
                validateAccessToken.mockResolvedValue(mockPlayerId);
                PlayerModel.getById.mockResolvedValue({ id: mockPlayerId, name: 'Test Player' });
                GameModel.getGameById.mockResolvedValue(mockGame);
                PlayerGameModel.getPlayerGameById.mockResolvedValue({ id: 1, playerId: mockPlayerId });
                PlayerGameModel.setPlayerReady.mockResolvedValue({ isReady: true });
    
                const result = await gameService.setPlayerReady({ 
                    game_id: 1, 
                    access_token: mockAccessToken,
                    ready: true 
                });
    
                expect(result).toEqual({ 
                    message: "Player is now ready",
                    game_id: 1,                         
                    player_name: 'Player 2'        
                });
            });

            it('throws error when player is not part of game', async () => {
                PlayerGameModel.setPlayerReady.mockResolvedValue(null);
                await expect(gameService.setPlayerReady({ game_id: 1, access_token: 'token', ready: true }))
                    .rejects.toThrow("Player is not part of this game");
            });
        });

        describe('removePlayerFromGame', () => {
            it('should remove player successfully', async () => {
                GameModel.getGameById.mockResolvedValue(mockGame);
                PlayerGameModel.getPlayerGameById.mockResolvedValue({ playerId: mockPlayerId });
                PlayerGameModel.deletePlayerById.mockResolvedValue(mockPlayerId);
                gameValidationService.validatePlayerInGame.mockResolvedValue(true);

                const result = await gameService.removePlayerFromGame(1, mockPlayerId);
                expect(result).toEqual({ message: "Player removed from game successfully" });
            });

            it('should throw error when player not in game', async () => {
                PlayerGameModel.getPlayerGameById.mockResolvedValue(null);
                gameValidationService.validatePlayerInGame.mockResolvedValue(false);
                await expect(gameService.removePlayerFromGame(1, mockPlayerId))
                    .rejects.toThrow(NotFoundError);
            });

            it('should throw error when delete operation fails', async () => {
                PlayerGameModel.getPlayerGameById.mockResolvedValue({ playerId: mockPlayerId });
                PlayerGameModel.deletePlayerById.mockResolvedValue(0);
                await expect(gameService.removePlayerFromGame(1, mockPlayerId))
                    .rejects.toThrow(NotFoundError);
            });
        });

        describe('playerList edge cases', () => {
            it('should throw error when no players found', async () => {
                PlayerGameModel.getPlayersNamesByGameId.mockResolvedValue([]);
                await expect(gameService.playerList(1))
                    .rejects.toThrow(NotFoundError);
            });
        });

        describe('Error Handling', () => {
    
            it('handles concurrent modifications', async () => {
                GameModel.updateGame.mockRejectedValue(new Error('Concurrent modification error'));
    
                await expect(gameService.updateGame(1, {})).rejects.toThrow(Error);
            });
        });

        describe('Game State Validations', () => {
            describe('startGame Additional Validations', () => {
                it('throws error when not creator tries to start', async () => {
                    const mockGame = { id: 1, status: 'waiting', creatorId: 2 };
                    GameModel.getGameById.mockResolvedValue(mockGame);
    
                    await expect(gameService.startGame({ game_id: 1, access_token: 'token', cardsPerPlayer: 7 }))
                        .rejects.toThrow(AuthError);
                });
    
                it('throws error when no players in game', async () => {
                    const mockGame = { id: 1, status: 'waiting', creatorId: 1 };
                    GameModel.getGameById.mockResolvedValue(mockGame);
                    PlayerGameModel.getPlayersGameId.mockResolvedValue([]);
    
                    await expect(gameService.startGame({ game_id: 1, access_token: 'token', cardsPerPlayer: 7 }))
                        .rejects.toThrow(NotFoundError);
                });
    
                it('throws error when start operation fails', async () => {
                    const mockGame = { id: 1, status: 'waiting', creatorId: 1 };
                    const mockPlayers = [{ playerId: 1 }];
                    GameModel.getGameById.mockResolvedValue(mockGame);
                    PlayerGameModel.getPlayersGameId.mockResolvedValue(mockPlayers);
                    gameService.checkAllPlayersReady = jest.fn().mockResolvedValue(true);
                    GameModel.startGame.mockResolvedValue(false);
    
                    await expect(gameService.startGame({ game_id: 1, access_token: 'token', cardsPerPlayer: 7 }))
                        .rejects.toThrow(BusinessError);
                });
            });

            describe('challengeUno Error Branches', () => {  
     
            }); 

            describe('joinGame Additional Validations', () => {
                it('throws error when join operation fails', async () => {
                    const mockGame = { id: 1 };
                    GameModel.getGameById.mockResolvedValue(mockGame);
                    PlayerGameModel.joinGame.mockResolvedValue(null);
    
                    await expect(gameService.joinGame({ game_id: 1, access_token: 'token' }))
                        .rejects.toThrow(BusinessError);
                });
    

                it('throws error when game not found', async () => {
                    GameModel.getGameById.mockResolvedValue(null);
                    await expect(gameService.joinGame({ game_id: 1, access_token: 'token' }))
                        .rejects.toThrow('Game not found');
                });


                it('throws error when player is already in game', async () => {
                    const mockGame = { id: 1 };
                    GameModel.getGameById.mockResolvedValue(mockGame);
                    gameValidationService.validatePlayerInGame.mockResolvedValue(true);
                    await expect(gameService.joinGame({ game_id: 1, access_token: 'token' }))
                        .rejects.toThrow(/already in the game/);
                });
            });
        });
    });

    describe('sayUno and Challenge', () => {

        describe('sayUno', () => {
            const mockGameId = 1;
            const mockAccessToken = 'validToken';
            const mockPlayerId = 10;
            const mockPlayer = { id: mockPlayerId, name: 'TestPlayer' };
        
            beforeEach(() => {
                jest.clearAllMocks();
            });
        
            it('should throw AuthError when access token is invalid', async () => {
                validateAccessToken.mockRejectedValue(new AuthError("Invalid access token"));
        
                await expect(gameService.sayUno({ game_id: mockGameId, access_token: 'invalid-token' }))
                    .rejects.toThrow("Invalid access token");
            });
        
            it('should throw NotFoundError when game does not exist', async () => {
                validateAccessToken.mockResolvedValue(mockPlayerId);
                GameModel.getGameById.mockResolvedValue(null);
        
                await expect(gameService.sayUno({ game_id: mockGameId, access_token: mockAccessToken }))
                    .rejects.toThrow("Game not found");
            });
            
            it('should throw BusinessError when player does not have exactly one card', async () => {
                validateAccessToken.mockResolvedValue(mockPlayerId);
                GameModel.getGameById.mockResolvedValue({ id: mockGameId, status: 'in_progress', currentPlayerIndex: 0 });
                PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue([{ playerId: mockPlayerId }]);
                PlayerModel.getById.mockResolvedValue(mockPlayer);
                PlayerGameModel.getPlayersGameId.mockResolvedValue([{ playerId: mockPlayerId }]);
                CardModel.getCardsByPlayerAndGame.mockResolvedValue([{ id: 100 }, { id: 101 }]);
        
                await expect(gameService.sayUno({ game_id: mockGameId, access_token: mockAccessToken }))
                    .rejects.toThrow("You can only say UNO when you have one card left");
            });
        
            it('should execute successfully when conditions are met', async () => {
                validateAccessToken.mockResolvedValue(mockPlayerId);
                GameModel.getGameById.mockResolvedValue({ id: mockGameId, status: 'in_progress', currentPlayerIndex: 0 });
                PlayerGameModel.getPlayersGameId.mockResolvedValue([{ playerId: mockPlayerId }]);
                PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue([{ playerId: mockPlayerId }]);
                PlayerModel.getById.mockResolvedValue(mockPlayer);
                CardModel.getCardsByPlayerAndGame.mockResolvedValue([{ id: 100 }]);
                PlayerGameModel.setSaidUno.mockResolvedValue({ saidUno: true });
                GameLogModel.createLog.mockResolvedValue(true);
        
                const result = await gameService.sayUno({ game_id: mockGameId, access_token: mockAccessToken });
                expect(result).toEqual({ message: `${mockPlayer.name} said UNO successfully.` });
            });
        });
    });

    describe('Special Card Actions', () => {
        describe('handleSkipCard', () => {
            const mockGameData = {
                id: 1,
                status: 'in_progress',
                currentPlayerIndex: 0,
                currentDirection: 'clockwise'
            };

            beforeEach(() => {
                GameModel.getGameById.mockResolvedValue(mockGameData);
                PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue([
                    { playerId: 1, position: 0 },
                    { playerId: 2, position: 1 },
                    { playerId: 3, position: 2 }
                ]);
                PlayerModel.getById
                    .mockImplementation((id) => {
                        const players = {
                            1: { id: 1, name: 'Player 1' },
                            2: { id: 2, name: 'Player 2' },
                            3: { id: 3, name: 'Player 3' }
                        };
                        return Promise.resolve(players[id]);
                    });
                GameModel.updateGame.mockResolvedValue({ ...mockGameData, currentPlayerIndex: 2 });
                GameLogModel.createLog.mockResolvedValue({});
            });

            it('should skip the next player and update game state', async () => {
                const playedCard = { color: 'red', value: 'skip' };
                const result = await gameService.handleSkipCard(1, playedCard);
            
                expect(result).toHaveProperty('skippedPlayer');
                expect(result.skippedPlayer.name).toBe('Player 2');
                expect(result.nextPlayer.name).toBe('Player 3');
                expect(GameModel.updateGame).toHaveBeenCalledWith(1, { currentPlayerIndex: 2, currentColor: 'red' });
                expect(GameLogModel.createLog).toHaveBeenCalled();
            });

            it('should throw NotFoundError when game not found', async () => {
                GameModel.getGameById.mockResolvedValue(null);
                await expect(gameService.handleSkipCard(1)).rejects.toThrow(NotFoundError);
            });

            it('should throw GameStateError when game is not in progress', async () => {
                GameModel.getGameById.mockResolvedValue({
                    id: 1,
                    status: 'waiting',
                    currentPlayerIndex: 0
                });
                await expect(gameService.handleSkipCard(1)).rejects.toThrow(GameStateError);
            });

            it('should throw ValidationError when no players found', async () => {
                PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue([]);
                await expect(gameService.handleSkipCard(1)).rejects.toThrow(ValidationError);
            });
        });

        describe('reverseGameDirection', () => {
            const mockGameData = {
                id: 1,
                status: 'in_progress',
                currentPlayerIndex: 0,
                currentDirection: 'clockwise'
            };

            beforeEach(() => {
                GameModel.getGameById.mockResolvedValue(mockGameData);
                PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue([
                    { playerId: 1, position: 0, player_name: 'Player 1' },
                    { playerId: 2, position: 1, player_name: 'Player 2' }
                ]);
                GameModel.updateGame.mockResolvedValue({
                    ...mockGameData,
                    currentDirection: 'counter-clockwise'
                });
                GameLogModel.createLog.mockResolvedValue({});
            });

            it('should reverse game direction and update game state', async () => {
                const playedCard = { color: 'blue', value: 'reverse' };
                const result = await gameService.reverseGameDirection(1, playedCard);
            
                expect(result).toHaveProperty('newDirection', 'counter-clockwise');
                expect(result.message).toContain('Reversed the game direction');
                expect(GameModel.updateGame).toHaveBeenCalledWith(1, {
                    currentDirection: 'counter-clockwise',
                    currentPlayerIndex: expect.any(Number),
                    currentColor: 'blue'
                });
                expect(GameLogModel.createLog).toHaveBeenCalled();
            });

            it('should handle case with insufficient players', async () => {
                PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue([
                    { playerId: 1, position: 0 }
                ]);

                const result = await gameService.reverseGameDirection(1);

                expect(result.message).toBe("Not enough players to reverse direction.");
            });

            it('should throw NotFoundError when game not found', async () => {
                GameModel.getGameById.mockResolvedValue(null);
                await expect(gameService.reverseGameDirection(1)).rejects.toThrow(NotFoundError);
            });

            it('should throw GameStateError when game is not in progress', async () => {
                GameModel.getGameById.mockResolvedValue({
                    id: 1,
                    status: 'waiting',
                    currentPlayerIndex: 0
                });
                await expect(gameService.reverseGameDirection(1)).rejects.toThrow(GameStateError);
            });
        });

        describe('handleDraw2Card', () => {
            const mockGameData = {
                id: 1,
                status: 'in_progress',
                currentPlayerIndex: 0,
                currentDirection: 'clockwise'
            };

            beforeEach(() => {
                GameModel.getGameById.mockResolvedValue(mockGameData);
                PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue([
                    { playerId: 1, position: 0 },
                    { playerId: 2, position: 1 },
                    { playerId: 3, position: 2 }
                ]);
                PlayerModel.getById.mockImplementation((id) => {
                    const players = {
                        1: { id: 1, name: 'Player 1' },
                        2: { id: 2, name: 'Player 2' },
                        3: { id: 3, name: 'Player 3' }
                    };
                    return Promise.resolve(players[id]);
                });
                deckService.drawCards.mockResolvedValue([{}, {}]); // 2 cards
                GameModel.updateGame.mockResolvedValue({ ...mockGameData, currentPlayerIndex: 2 });
                GameLogModel.createLog.mockResolvedValue({});
            });

            it('should make next player draw 2 cards and skip them', async () => {
                const playedCard = { color: 'red', value: 'draw_two' };
                const result = await gameService.handleDraw2Card(1, playedCard);
            
                expect(result).toHaveProperty('affectedPlayer');
                expect(result.affectedPlayer.name).toBe('Player 2');
                expect(result.nextPlayer.name).toBe('Player 3');
                expect(deckService.drawCards).toHaveBeenCalledWith(1, 2, 2);
                expect(GameModel.updateGame).toHaveBeenCalledWith(1, { 
                    currentPlayerIndex: 2,
                    currentColor: 'red'
                });
                expect(GameLogModel.createLog).toHaveBeenCalled();
            });

            it('should throw error when draw operation fails', async () => {
                deckService.drawCards.mockResolvedValue([{}]); // Only 1 card returned
                await expect(gameService.handleDraw2Card(1)).rejects.toThrow("Failed to draw 2 cards from the deck");
            });

            it('should throw NotFoundError when game not found', async () => {
                GameModel.getGameById.mockResolvedValue(null);
                await expect(gameService.handleDraw2Card(1)).rejects.toThrow(NotFoundError);
            });

            it('should throw GameStateError when game is not in progress', async () => {
                GameModel.getGameById.mockResolvedValue({
                    id: 1,
                    status: 'waiting',
                    currentPlayerIndex: 0
                });
                await expect(gameService.handleDraw2Card(1)).rejects.toThrow(GameStateError);
            });

            it('should throw ValidationError when no players found', async () => {
                PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue([]);
                await expect(gameService.handleDraw2Card(1)).rejects.toThrow(ValidationError);
            });
        });

        describe('handleWildCard', () => {
            const mockGameData = {
                id: 1,
                status: 'in_progress',
                currentPlayerIndex: 0,
                currentDirection: 'clockwise'
            };

            beforeEach(() => {
                GameModel.getGameById.mockResolvedValue(mockGameData);
                PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue([
                    { playerId: 1, position: 0 },
                    { playerId: 2, position: 1 }
                ]);
                PlayerModel.getById
                    .mockResolvedValueOnce({ id: 1, name: 'Player 1' })
                    .mockResolvedValueOnce({ id: 2, name: 'Player 2' });
                gameService.updateCurrentPlayerMoviment = jest.fn().mockResolvedValue({
                    current_player: { id: 2, name: 'Player 2' }
                });
                GameModel.updateGame.mockResolvedValue({ ...mockGameData, currentColor: 'blue' });
                GameLogModel.createLog.mockResolvedValue({});
                gameService.getCurrentPlayer = jest.fn().mockResolvedValue({ 
                    player_id: 1, 
                    player_name: 'Player 1' 
                });
            });


            it('should throw ValidationError for invalid color', async () => {
                await expect(gameService.handleWildCard(1, 'purple')).rejects.toThrow(ValidationError);
                expect(GameModel.updateGame).not.toHaveBeenCalled();
            });

            it('should throw NotFoundError when game not found', async () => {
                GameModel.getGameById.mockResolvedValue(null);
                await expect(gameService.handleWildCard(1, 'blue')).rejects.toThrow(NotFoundError);
            });

            it('should throw GameStateError when game is not in progress', async () => {
                GameModel.getGameById.mockResolvedValue({
                    id: 1,
                    status: 'waiting',
                    currentPlayerIndex: 0
                });
                await expect(gameService.handleWildCard(1, 'blue')).rejects.toThrow(GameStateError);
            });
        });

        describe('handleWildDraw4Card', () => {
            const mockGameData = {
                id: 1,
                status: 'in_progress',
                currentPlayerIndex: 0,
                currentDirection: 'clockwise'
            };

            beforeEach(() => {
                GameModel.getGameById.mockResolvedValue(mockGameData);
                PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue([
                    { playerId: 1, position: 0 },
                    { playerId: 2, position: 1 },
                    { playerId: 3, position: 2 }
                ]);
                PlayerModel.getById.mockImplementation((id) => {
                    const players = {
                        1: { id: 1, name: 'Player 1' },
                        2: { id: 2, name: 'Player 2' },
                        3: { id: 3, name: 'Player 3' }
                    };
                    return Promise.resolve(players[id]);
                });
                deckService.drawCards.mockResolvedValue([{}, {}, {}, {}]); // 4 cards
                GameModel.updateGame.mockResolvedValue({ ...mockGameData, currentColor: 'green', currentPlayerIndex: 2 });
                GameLogModel.createLog.mockResolvedValue({});
            });

            it('should change color, make next player draw 4 cards, and skip them', async () => {
                gameService.getCurrentPlayer = jest.fn()
                    .mockResolvedValueOnce({ player_id: 3, player_name: 'Player 3' });
                
                const result = await gameService.handleWildDraw4Card(1, 'green');

                expect(result).toHaveProperty('newColor', 'green');
                expect(result.affectedPlayer.name).toBe('Player 2');
                expect(deckService.drawCards).toHaveBeenCalledWith(1, 2, 4);
                expect(GameModel.updateGame).toHaveBeenCalledWith(1, { currentColor: 'green' });
                expect(GameModel.updateGame).toHaveBeenCalledWith(1, { currentPlayerIndex: 2 });
                expect(GameLogModel.createLog).toHaveBeenCalled();
            });

            it('should throw error when draw operation fails', async () => {
                deckService.drawCards.mockResolvedValue([{}, {}]); // Only 2 cards returned
                await expect(gameService.handleWildDraw4Card(1, 'green')).rejects.toThrow("Failed to draw 4 cards from the deck");
            });

            it('should throw ValidationError for invalid color', async () => {
                await expect(gameService.handleWildDraw4Card(1, 'purple')).rejects.toThrow(ValidationError);
            });


            it('should throw GameStateError when game is not in progress', async () => {
                GameModel.getGameById.mockResolvedValue({
                    id: 1,
                    status: 'waiting',
                    currentPlayerIndex: 0
                });
                await expect(gameService.handleWildDraw4Card(1, 'green')).rejects.toThrow(GameStateError);
            });

            it('should throw ValidationError when no players found', async () => {
                PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue([]);
                await expect(gameService.handleWildDraw4Card(1, 'green')).rejects.toThrow(ValidationError);
            });
        });
    });
});

