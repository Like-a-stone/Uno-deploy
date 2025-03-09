import cardService from '../services/cardService';
import { NotFoundError, AuthError, GameStateError, BusinessError, ValidationError, DeckError } from '../utils/customError';
import { validateAccessToken } from '../utils/tokenValidator';
import { GameModel } from '../models/game';
import { PlayerGameModel } from '../models/playerGame';
import { CardModel } from '../models/card';
import { PlayerModel } from '../models/player';
import deckService from '../services/deckService';
import scoreHistoryService from '../services/scoreHistoryService';
import { GameLogModel } from '../models/gameLog';
import gameService from '../services/gameService';
jest.mock('../models/card');
jest.mock('../models/game');
jest.mock('../models/playerGame');
jest.mock('../models/player');
jest.mock('../utils/tokenValidator');
jest.mock('../services/gameService');
jest.mock('../models/gameLog');
jest.mock('../services/deckService', () => ({
    initializeDeck: jest.fn(),
    dealInitialCards: jest.fn(),
    takeCardFromDeck: jest.fn()
}));

jest.mock('../services/scoreHistoryService', () => ({
    initializeScore: jest.fn(),
    updateScoreOnCardPlay: jest.fn()
}));


describe('Card Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createCardService', () => {
        const validCardData = {
            color: 'red',
            value: '5',
            gameId: 1
        };

        it('should validate game exists before creating card', async () => {
            GameModel.getGameById.mockResolvedValue(null);
            
            await expect(cardService.createCardService(validCardData))
                .rejects
                .toThrow(NotFoundError);
        });

        it('should call database to create card', async () => {
            GameModel.getGameById.mockResolvedValue({ id: 1 });
            CardModel.createCard.mockResolvedValue(validCardData);

            await cardService.createCardService(validCardData);
            expect(CardModel.createCard).toHaveBeenCalledWith(validCardData);
        });

        it('should return correct data on successful creation', async () => {
            GameModel.getGameById.mockResolvedValue({ id: 1 });
            CardModel.createCard.mockResolvedValue(validCardData);

            const result = await cardService.createCardService(validCardData);
            expect(result).toEqual(validCardData);
        });

        it('should throw error on invalid data', async () => {
            const invalidData = {
                color: 'invalid',
                value: '5',
                gameId: 1
            };
            
            CardModel.createCard.mockRejectedValue(new Error('Invalid card data'));

            await expect(cardService.createCardService(invalidData))
                .rejects
                .toThrow();
        });

        it('should handle null response from database', async () => {
            CardModel.createCard.mockResolvedValue(null);

            await expect(cardService.createCardService({}))
                .rejects
                .toThrow(NotFoundError);
        });
    });

    describe('getCardService', () => {
        const mockCard = {
            id: 1,
            color: 'red',
            value: '5'
        };

        it('should return correct data for existing card', async () => {
            CardModel.getCardById.mockResolvedValue(mockCard);

            const result = await cardService.getCardService(1);
            expect(result).toEqual(mockCard);
        });

        it('should throw NotFoundError for non-existing card', async () => {
            CardModel.getCardById.mockResolvedValue(null);

            await expect(cardService.getCardService(999))
                .rejects
                .toThrow(NotFoundError);
        });

        it('should call database to get card', async () => {
            CardModel.getCardById.mockResolvedValue(mockCard);

            await cardService.getCardService(1);
            expect(CardModel.getCardById).toHaveBeenCalledWith(1);
        });
        
        it('should return player cards when access token is valid', async () => {
            const mockPlayerId = 1;
            const mockGameId = 1;
            const mockCards = [
              { color: 'red', value: '7' },
              { color: 'blue', value: '4' }
            ];
        
            validateAccessToken.mockResolvedValue(mockPlayerId);
            PlayerGameModel.getPlayerGameById.mockResolvedValue({ playerId: mockPlayerId, gameId: mockGameId });
            CardModel.getCardsByPlayerAndGame.mockResolvedValue(mockCards);
        
            const result = await cardService.getPlayerCards({ game_id: mockGameId, access_token: 'valid_token' });
        
            expect(result).toEqual(mockCards);
            expect(validateAccessToken).toHaveBeenCalledWith('valid_token');
            expect(PlayerGameModel.getPlayerGameById).toHaveBeenCalledWith(mockPlayerId, mockGameId);
            expect(CardModel.getCardsByPlayerAndGame).toHaveBeenCalledWith(mockPlayerId, mockGameId);
        });

        it('should throw AuthError when player is not in the game', async () => {
            const mockPlayerId = 1;
            validateAccessToken.mockResolvedValue(mockPlayerId);
            PlayerGameModel.getPlayerGameById.mockResolvedValue(null);
        
            await expect(cardService.getPlayerCards({ game_id: 1, access_token: 'valid_token' }))
              .rejects.toThrow(AuthError);
          });

    });

    describe('updateCardService', () => {
        const updateData = {
            color: 'blue',
            value: '7'
        };

        it('should validate data before update', async () => {
            const invalidData = {
                color: 'invalid'
            };

            await expect(cardService.updateCardService(1, invalidData))
                .rejects
                .toThrow();
        });

        it('should call database to update card', async () => {
            CardModel.updateCard.mockResolvedValue(updateData);

            await cardService.updateCardService(1, updateData);
            expect(CardModel.updateCard).toHaveBeenCalledWith(1, updateData);
        });

        it('should return updated card data', async () => {
            CardModel.updateCard.mockResolvedValue(updateData);

            const result = await cardService.updateCardService(1, updateData);
            expect(result).toEqual(updateData);
        });

        it('should throw NotFoundError when updating non-existing card', async () => {
            CardModel.updateCard.mockResolvedValue(null);

            await expect(cardService.updateCardService(999, updateData))
                .rejects
                .toThrow(NotFoundError);
        });
    });

    describe('deleteCardService', () => {
        it('should call database to delete card', async () => {
            CardModel.deleteCard.mockResolvedValue(true);

            await cardService.deleteCardService(1);
            expect(CardModel.deleteCard).toHaveBeenCalledWith(1);
        });

        it('should return success message on deletion', async () => {
            CardModel.deleteCard.mockResolvedValue(true);

            const result = await cardService.deleteCardService(1);
            expect(result).toEqual({ message: "Card deleted successfully" });
        });

        it('should throw NotFoundError when deleting non-existing card', async () => {
            CardModel.deleteCard.mockResolvedValue(null);

            await expect(cardService.deleteCardService(999))
                .rejects
                .toThrow(NotFoundError);
        });
    });

    describe('initializeDeck', () => {
        it('should create a complete deck with correct number of cards', async () => {
            const mockDeck = [
                ...Array(100).fill({ color: 'red', value: '5', location: 'deck' }),
                ...Array(8).fill({ color: 'wild', value: 'wild', location: 'deck' })
            ];
            CardModel.bulkCreateCards.mockResolvedValue(mockDeck);
            deckService.initializeDeck.mockResolvedValue(mockDeck);

            const result = await deckService.initializeDeck(1);

            expect(result.length).toBe(108); 
            expect(result.filter(c => c.color === 'wild').length).toBe(8);
        });
    });

    describe('validateCardInPlayerHand', () => {
        it('should return card id when card is in player hand', () => {
          const cardToPlay = { color: 'red', value: '7' };
          const playerCards = [
            { id: 1, color: 'blue', value: '4' },
            { id: 2, color: 'red', value: '7' },
            { id: 3, color: 'yellow', value: '2' }
          ];
      
          const result = cardService.validateCardInPlayerHand(cardToPlay, playerCards);
      
          expect(result).toBe(2);
        });
      
        it('should return null when card is not in player hand', () => {
          const cardToPlay = { color: 'green', value: '5' };
          const playerCards = [
            { id: 1, color: 'blue', value: '4' },
            { id: 2, color: 'red', value: '7' },
            { id: 3, color: 'yellow', value: '2' }
          ];
      
          const result = cardService.validateCardInPlayerHand(cardToPlay, playerCards);
      
          expect(result).toBeNull();
        });
      
        it('should return null when player has no cards', () => {
          const cardToPlay = { color: 'red', value: '7' };
          const playerCards = [];
      
          const result = cardService.validateCardInPlayerHand(cardToPlay, playerCards);
      
          expect(result).toBeNull();
        });
    });

    describe('checkWinnerRecursively', () => {
        it('should return winner id when a player has no cards', async () => {
          const mockGameId = 1;
          const mockPlayers = [
            { playerId: 1 },
            { playerId: 2 },
            { playerId: 3 }
          ];
      
          CardModel.getCardsByPlayerAndGame
            .mockResolvedValueOnce([{ id: 1, color: 'red', value: '7' }])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ id: 2, color: 'blue', value: '4' }]);
      
          const result = await cardService.checkWinnerRecursively(mockGameId, mockPlayers);
      
          expect(result).toBe(2);
        });
      
        it('should return null when all players have cards', async () => {
          const mockGameId = 1;
          const mockPlayers = [
            { playerId: 1 },
            { playerId: 2 }
          ];
      
          CardModel.getCardsByPlayerAndGame
            .mockResolvedValueOnce([{ id: 1, color: 'red', value: '7' }])
            .mockResolvedValueOnce([{ id: 2, color: 'blue', value: '4' }]);
      
          const result = await cardService.checkWinnerRecursively(mockGameId, mockPlayers);
      
          expect(result).toBeNull();
        });
    });

    describe('playCard', () => {
        const mockGameId = 1;
        const mockPlayerId = 1;
        const mockAccessToken = 'valid_token';
      
        beforeEach(() => {
          validateAccessToken.mockResolvedValue(mockPlayerId);
          PlayerGameModel.getPlayerGameById.mockResolvedValue({ playerId: mockPlayerId, gameId: mockGameId });
          gameService.getCurrentPlayer.mockResolvedValue({ player_id: mockPlayerId });
          GameModel.getGameById.mockResolvedValue({ 
            id: mockGameId, 
            currentColor: 'red', 
            status: 'in_progress' 
          });
          
          CardModel.getCardsByPlayerAndGame.mockResolvedValue([
            { id: 1, color: 'red', value: '7', location: 'hand' },
            { id: 2, color: 'blue', value: '4', location: 'hand' },
            { id: 3, color: 'wild', value: 'wild', location: 'hand' }
          ]);
          CardModel.getTopDiscardCard.mockResolvedValue({ color: 'red', value: '5', location: 'discard' });
          GameLogModel.createLog.mockResolvedValue({});
          scoreHistoryService.updateScoreOnCardPlay.mockResolvedValue({});
        });
      
      
        it('should throw AuthError when it is not player\'s turn', async () => {
          gameService.getCurrentPlayer.mockResolvedValue({ player_id: 2 });
      
          await expect(cardService.playCard(mockGameId, { 
            access_token: mockAccessToken, 
            cardPlayed: 'red 7' 
          })).rejects.toThrow(AuthError);
        });
      
        it('should throw AuthError when played card is not in player\'s hand', async () => {
          await expect(cardService.playCard(mockGameId, { 
            access_token: mockAccessToken, 
            cardPlayed: 'green 3' 
          })).rejects.toThrow(AuthError);
        });
      
        it('should throw DeckError when played card does not match top discard card', async () => {
          await expect(cardService.playCard(mockGameId, { 
            access_token: mockAccessToken, 
            cardPlayed: 'blue 4' 
          })).rejects.toThrow(DeckError);
        });

        it('should successfully play a valid card that matches by color', async () => {
            // Setup for successful card play
            CardModel.updateCard.mockResolvedValue({ id: 1, color: 'red', value: '7', location: 'discard' });
            
            // Mock for winner check
            PlayerGameModel.getPlayersGameId.mockResolvedValue([{ playerId: mockPlayerId }]);
            CardModel.getCardsByPlayerAndGame
                .mockResolvedValueOnce([
                    { id: 1, color: 'red', value: '7', location: 'hand' },
                    { id: 2, color: 'blue', value: '4', location: 'hand' }
                ])
                .mockResolvedValueOnce([{ id: 2, color: 'blue', value: '4', location: 'hand' }]); // Player still has cards
            
            const result = await cardService.playCard(mockGameId, {
                access_token: mockAccessToken,
                cardPlayed: 'red 7'
            });
          
            expect(CardModel.updateCard).toHaveBeenCalledWith(1, { location: 'discard' });
            expect(scoreHistoryService.updateScoreOnCardPlay).toHaveBeenCalledWith(mockPlayerId, mockGameId);
            expect(GameLogModel.createLog).toHaveBeenCalled();
            expect(result).toHaveProperty('message', 'Card red 7 played successfully');
        });

        it('should successfully play a valid card that matches by value', async () => {
            CardModel.getTopDiscardCard.mockResolvedValue({ color: 'green', value: '4', location: 'discard' });
            CardModel.updateCard.mockResolvedValue({ id: 2, color: 'blue', value: '4', location: 'discard' });
            
            // Mock for winner check
            PlayerGameModel.getPlayersGameId.mockResolvedValue([{ playerId: mockPlayerId }]);
            CardModel.getCardsByPlayerAndGame
                .mockResolvedValueOnce([
                    { id: 1, color: 'red', value: '7', location: 'hand' },
                    { id: 2, color: 'blue', value: '4', location: 'hand' }
                ])
                .mockResolvedValueOnce([{ id: 1, color: 'red', value: '7', location: 'hand' }]);
            
            const result = await cardService.playCard(mockGameId, {
                access_token: mockAccessToken,
                cardPlayed: 'blue 4'
            });
          
            expect(CardModel.updateCard).toHaveBeenCalledWith(2, { location: 'discard' });
            expect(result).toHaveProperty('message', 'Card blue 4 played successfully');
        });

        it('should allow ending game when player has no cards left', async () => {
            CardModel.updateCard.mockResolvedValue({ id: 1, color: 'red', value: '7', location: 'discard' });
            
            // Setup player cards - first call for validation, second call for winner check
            CardModel.getCardsByPlayerAndGame
                .mockResolvedValueOnce([{ id: 1, color: 'red', value: '7', location: 'hand' }]) // Only one card in hand
                .mockResolvedValueOnce([]); // No cards left after playing
            
            // Setup for winner check
            PlayerGameModel.getPlayersGameId.mockResolvedValue([{ playerId: mockPlayerId }]);
            
            gameService.endGame.mockResolvedValue({
                message: 'Player 1 has won the game!',
                winner: 'Player 1',
                gameState: 'finished'
            });
            
            const playResult = await cardService.playCard(mockGameId, {
                access_token: mockAccessToken,
                cardPlayed: 'red 7'
            });
            
            const endGameResult = await gameService.endGame({
                game_id: mockGameId,
                access_token: mockAccessToken
            });
            
            expect(endGameResult).toHaveProperty('winner', 'Player 1');
            expect(endGameResult).toHaveProperty('gameState', 'finished');
        });
        
        it('should throw AuthError if player is not in the game', async () => {
            PlayerGameModel.getPlayerGameById.mockResolvedValue(null);
            
            await expect(cardService.playCard(mockGameId, {
                access_token: mockAccessToken,
                cardPlayed: 'red 7'
            })).rejects.toThrow(AuthError);
        });

        it('should throw DeckError if no top discard card found', async () => {
            CardModel.getTopDiscardCard.mockResolvedValue(null);
            
            await expect(cardService.playCard(mockGameId, {
                access_token: mockAccessToken,
                cardPlayed: 'red 7'
            })).rejects.toThrow(DeckError);
        });
    });

    describe('getPlayersCardsInGame', () => {
        const mockGameId = 1;
        beforeEach(() => {
            jest.clearAllMocks();
          });
      
        it('should return cards for all players in the game with player IDs', async () => {
            PlayerGameModel.getPlayersGameId.mockResolvedValue([
              { playerId: 1 },
              { playerId: 2 }
            ]);
      
            CardModel.getCardsByPlayerAndGame.mockImplementation((playerId, gameId) => {
              if (playerId === 1) return Promise.resolve([]);
              if (playerId === 2) return Promise.resolve([{ id: 1 }]);
              return Promise.resolve([]);
            });
      
            PlayerModel.getById.mockImplementation((playerId) => {
              if (playerId === 1) return Promise.resolve({ id: 1, name: 'Player 1' });
              if (playerId === 2) return Promise.resolve({ id: 2, name: 'Player 2' });
              return Promise.resolve(null);
            });
      
            const result = await cardService.getPlayersCardsInGame(mockGameId);
      
            expect(result).toEqual([
              {
                player: 'Player 1',
                cardCount: 1,
                playerId: 1
              },
              {
                player: 'Player 2',
                cardCount: 0,
                playerId: 2
              }
            ]);
      
            expect(PlayerGameModel.getPlayersGameId).toHaveBeenCalledWith(mockGameId);
            expect(CardModel.getCardsByPlayerAndGame).toHaveBeenCalledTimes(2);
            expect(PlayerModel.getById).toHaveBeenCalledTimes(2);
        });
      
        it('should throw NotFoundError when no players are found in the game', async () => {
          PlayerGameModel.getPlayersGameId.mockResolvedValue([]);
      
          await expect(cardService.getPlayersCardsInGame(mockGameId))
            .rejects.toThrow(NotFoundError);
        });
      });

    describe('processSpecialCardAction', () => {
        const mockGameId = 1;
        
        beforeEach(() => {
            jest.clearAllMocks();
            
            // Setup mocks for all special card actions
            gameService.handleSkipCard.mockResolvedValue({ 
                skippedPlayer: { name: 'Player 2' },
                nextPlayer: { name: 'Player 3' }
            });
            
            gameService.reverseGameDirection.mockResolvedValue({ 
                newDirection: 'counter-clockwise',
                message: 'Reversed the game direction'
            });
            
            gameService.handleDraw2Card.mockResolvedValue({ 
                affectedPlayer: { name: 'Player 2' },
                message: 'Player 2 drew 2 cards and was skipped'
            });
            
            gameService.handleWildCard.mockResolvedValue({
                newColor: 'blue',
                nextPlayer: { name: 'Player 2' }
            });
            
            gameService.handleWildDraw4Card.mockResolvedValue({
                newColor: 'green',
                affectedPlayer: { name: 'Player 2' },
                nextPlayer: { name: 'Player 3' }
            });
            
            gameService.updateCurrentPlayerMoviment.mockResolvedValue({
                nextPlayer: { name: 'Player 2' }
            });
        });
        
        it('should handle skip card action', async () => {
            const playedCard = { value: 'skip' };
            const result = await cardService.processSpecialCardAction(playedCard, mockGameId);
            
            expect(gameService.handleSkipCard).toHaveBeenCalledWith(mockGameId, playedCard);
        });
        
        it('should handle reverse card action', async () => {
            const playedCard = { value: 'reverse' };
            const result = await cardService.processSpecialCardAction(playedCard, mockGameId);
        
            expect(gameService.reverseGameDirection).toHaveBeenCalledWith(mockGameId, playedCard);
            expect(result).toEqual(expect.any(Object));
        });
        
        it('should handle draw two card action', async () => {
            const playedCard = { value: 'draw_two' };
            const result = await cardService.processSpecialCardAction(playedCard, mockGameId);
            
            expect(gameService.handleDraw2Card).toHaveBeenCalledWith(mockGameId, playedCard);
            expect(result).toHaveProperty('affectedPlayer');
            expect(result.message).toContain('drew 2 cards');
        });
        
        it('should handle wild card action with color selection', async () => {
            const newColor = 'blue';
            const playedCard = { value: 'wild' };
            const result = await cardService.processSpecialCardAction(playedCard, mockGameId, newColor);
            
            expect(gameService.handleWildCard).toHaveBeenCalledWith(mockGameId, newColor);
            expect(result).toHaveProperty('newColor', 'blue');
        });
        
        it('should handle wild draw four card action with color selection', async () => {
            const newColor = 'green';
            const playedCard = { value: 'wild_draw_four' };
            const result = await cardService.processSpecialCardAction(playedCard, mockGameId, newColor);
            
            expect(gameService.handleWildDraw4Card).toHaveBeenCalledWith(mockGameId, newColor);
            expect(result).toHaveProperty('newColor', 'green');
            expect(result).toHaveProperty('affectedPlayer');
        });
        
        it('should handle regular number card by just advancing turn', async () => {
            const playedCard = { value: '5' };
            const result = await cardService.processSpecialCardAction(playedCard, mockGameId);
            
            expect(gameService.handleNormalTurn).toHaveBeenCalledWith(mockGameId, playedCard);
            expect(result).toEqual({});
        });
        
        it('should be case-insensitive when processing card values', async () => {
            const playedCard = { value: 'SKIP' };
            const result = await cardService.processSpecialCardAction(playedCard, mockGameId);
            
            expect(gameService.handleSkipCard).toHaveBeenCalledWith(mockGameId, playedCard);
            expect(result).toHaveProperty('skippedPlayer');
        });
    });
});