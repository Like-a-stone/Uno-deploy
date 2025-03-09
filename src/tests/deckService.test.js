import deckService from '../services/deckService.js';
import { CardModel } from '../models/card.js';
import { PlayerGameModel } from '../models/playerGame.js';
import { DeckError,AuthError, NotFoundError, GameStateError } from '../utils/customError.js';
import cardService from '../services/cardService.js';
import scoreHistoryService from '../services/scoreHistoryService.js';
import { validateAccessToken } from '../utils/tokenValidator';
import gameService from '../services/gameService.js';
import { GameLogModel } from '../models/gameLog.js';

jest.mock('../../src/models/card.js');
jest.mock('../../src/models/playerGame.js');
jest.mock('../services/cardService.js');
jest.mock('../services/scoreHistoryService.js');
jest.mock('../utils/tokenValidator');
jest.mock('../services/gameService.js');
jest.mock('../models/gameLog', () => ({
    GameLogModel: {
      createLog: jest.fn().mockResolvedValue({}),
    },
  }));

describe('Deck Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initializeGameWithCard', () => {
        it('should throw NotFoundError when no initial card is found', async () => {
          CardModel.selectInitialCard.mockResolvedValue(null);
    
          await expect(deckService.initializeGameWithCard(1)).rejects.toThrow(NotFoundError);
        });
    
        it('should return the initial card when one is found', async () => {
          const mockCard = { id: 1, color: 'red', value: '7' };
          CardModel.selectInitialCard.mockResolvedValue(mockCard);
    
          const result = await deckService.initializeGameWithCard(1);
          expect(result).toEqual(mockCard);
        });
      });

    describe('shuffleArray', () => {
        it('should shuffle the array', () => {
        const originalArray = [1, 2, 3, 4, 5];
        const shuffledArray = deckService.shuffleArray(originalArray);

        expect(shuffledArray).not.toEqual(originalArray);
        expect(shuffledArray.sort()).toEqual(originalArray.sort());
        });
  });

    describe('initializeDeck', () => {
        it('should create a deck with correct number of cards', async () => {
            const gameId = 1;
            CardModel.bulkCreateCards.mockResolvedValue([]);

            await deckService.initializeDeck(gameId);

            // Standard UNO deck has 108 cards
            expect(CardModel.bulkCreateCards).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        gameId,
                        location: 'deck'
                    })
                ])
            );
            const cardsCreated = CardModel.bulkCreateCards.mock.calls[0][0];
            expect(cardsCreated.length).toBe(108);
        });
    });

    describe('dealInitialCards', () => {
        it('should throw error if no players found', async () => {
            PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue([]);

            await expect(deckService.dealInitialCards(1)).rejects.toThrow(NotFoundError);
        });

        it('should deal correct number of cards to each player', async () => {
            const gameId = 1;
            const players = [
                { playerId: 1 },
                { playerId: 2 }
            ];
            const mockCard = { id: 1, color: 'red', value: '5' };
            const cardsPerPlayer = 7;
            const mockCards = {
                1: Array(7).fill({ color: 'red', value: '5' }),
                2: Array(7).fill({ color: 'red', value: '5' })
            };

            PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue(players);
            CardModel.takeCardFromDeck.mockResolvedValue(mockCard);
            CardModel.updateCard.mockResolvedValue(mockCard);
            scoreHistoryService.initializeScore.mockResolvedValue();
            cardService.getPlayersCardsInGame.mockResolvedValue(mockCards);

            const result = await deckService.dealInitialCards(gameId, cardsPerPlayer);
            expect(result).toEqual(mockCards);

            expect(CardModel.takeCardFromDeck).toHaveBeenCalledTimes(14); 
            expect(CardModel.updateCard).toHaveBeenCalledTimes(14);
        });

        it('should use default cards per player when not specified', async () => {
            const mockPlayers = [{ playerId: 1 }, { playerId: 2 }];
            PlayerGameModel.getSortedPlayersByGameId.mockResolvedValue(mockPlayers);
            CardModel.takeCardFromDeck.mockResolvedValue({ id: 1 });
            CardModel.updateCard.mockResolvedValue({});
      
            await deckService.dealInitialCards(1);
      
            expect(CardModel.takeCardFromDeck).toHaveBeenCalledTimes(14); 
          });
    });

    describe('drawCards', () => {

      it('should throw error if not enough cards in deck', async () => {
        PlayerGameModel.getPlayerGameById.mockResolvedValue({ id: 1 });
        
        CardModel.getCardsByPlayerAndGame.mockResolvedValue([]);
        
        CardModel.takeCardFromDeck.mockResolvedValue(null);

        await expect(deckService.drawCards(1, 1, 1)).rejects.toThrow(DeckError);
        await expect(deckService.drawCards(1, 1, 1)).rejects.toThrow('No cards left in the deck');
    });

    it('should throw AuthError if player is not in game', async () => {
        PlayerGameModel.getPlayerGameById.mockResolvedValue(null);

        await expect(deckService.drawCards(1, 1, 1)).rejects.toThrow(AuthError);
        await expect(deckService.drawCards(1, 1, 1)).rejects.toThrow('Player not in game');
    });
});


    describe('takeCardFromDeck', () => {
        it('should throw AuthError for invalid access token', async () => {
          validateAccessToken.mockRejectedValue(new AuthError('Invalid token'));
    
          await expect(deckService.takeCardFromDeck({ game_id: 1, access_token: 'invalid' })).rejects.toThrow(AuthError);
        });
    
        it('should throw GameStateError when it is not the player\'s turn', async () => {
          validateAccessToken.mockResolvedValue(1);
          gameService.getCurrentPlayer.mockResolvedValue({ player_id: 2 });
    
          await expect(deckService.takeCardFromDeck({ game_id: 1, access_token: 'valid' })).rejects.toThrow(GameStateError);
        });
    
        it('should throw AuthError when player is not in the game', async () => {
          validateAccessToken.mockResolvedValue(1);
          gameService.getCurrentPlayer.mockResolvedValue({ player_id: 1 });
          PlayerGameModel.getPlayerGameById.mockResolvedValue(null);
    
          await expect(deckService.takeCardFromDeck({ game_id: 1, access_token: 'valid' })).rejects.toThrow(AuthError);
        });
    });
    
    describe('dealCardsRecursively', () => {
        it('should not deal any cards when cardsPerPlayer is 0', async () => {
          const players = [{ playerId: 1 }, { playerId: 2 }];
          const result = await deckService.dealCardsRecursively(1, players, 0);
    
          expect(result).toEqual({});
          expect(CardModel.takeCardFromDeck).not.toHaveBeenCalled();
        });
    });

    describe('takeCardFromDeck', () => {
        it('should successfully take a card from the deck', async () => {
          validateAccessToken.mockResolvedValue(1);
          gameService.getCurrentPlayer.mockResolvedValue({ player_id: 1 });
          PlayerGameModel.getPlayerGameById.mockResolvedValue({ playerId: 1 });
          CardModel.takeCardFromDeck.mockResolvedValue({ id: 1, color: 'red', value: '5' });
          CardModel.updateCard.mockResolvedValue({ id: 1, color: 'red', value: '5', playerId: 1, location: 'hand' });
          gameService.getCurrentPlayer.mockResolvedValue({ 
            player_id: 1, 
            player_name: 'Test Player' 
          });

          gameService.updateCurrentPlayerMoviment.mockResolvedValue({
            current_player: {
              id: 2,
              name: 'Next Player'
            }
          });
      
    
          const result = await deckService.takeCardFromDeck({ game_id: 1, access_token: 'valid' });
    
          expect(result).toEqual({
            message: 'Test Player drew a card from the deck.',
            cardDrawn: expect.any(String), // ou o valor específico que você espera
            nextPlayer: {
              id: 2,
              name: 'Next Player'
            }
          });
          expect(gameService.getCurrentPlayer).toHaveBeenCalledWith({ game_id: 1 });
          expect(gameService.updateCurrentPlayerMoviment).toHaveBeenCalledWith(1);
          expect(GameLogModel.createLog).toHaveBeenCalled();
        });
    
        it('should throw DeckError when no card is available in the deck', async () => {
          validateAccessToken.mockResolvedValue(1);
          gameService.getCurrentPlayer.mockResolvedValue({ player_id: 1 });
          PlayerGameModel.getPlayerGameById.mockResolvedValue({ playerId: 1 });
          CardModel.takeCardFromDeck.mockResolvedValue(null);
    
          await expect(deckService.takeCardFromDeck({ game_id: 1, access_token: 'valid' })).rejects.toThrow(DeckError);
        });
      });
    
      describe('dealCardsRecursively', () => {
        it('should deal cards to all players', async () => {
          const gameId = 1;
          const players = [{ playerId: 1 }, { playerId: 2 }];
          const cardsPerPlayer = 2;
          const mockCard = { id: 1, color: 'red', value: '5' };
    
          CardModel.takeCardFromDeck.mockResolvedValue(mockCard);
          CardModel.updateCard.mockResolvedValue(mockCard);
    
          const result = await deckService.dealCardsRecursively(gameId, players, cardsPerPlayer);
    
          expect(result).toEqual({
            1: [{ color: 'red', value: '5' }, { color: 'red', value: '5' }],
            2: [{ color: 'red', value: '5' }, { color: 'red', value: '5' }]
          });
          expect(CardModel.takeCardFromDeck).toHaveBeenCalledTimes(4);
          expect(CardModel.updateCard).toHaveBeenCalledTimes(4);
        });
      });
    
      describe('drawCards', () => {
        it('should draw multiple cards successfully', async () => {
          const gameId = 1;
          const playerId = 1;
          const numberOfCards = 2;
          const mockCard = { id: 1, color: 'red', value: '5' };
    
          CardModel.takeCardFromDeck.mockResolvedValue(mockCard);
          CardModel.updateCard.mockResolvedValue(mockCard);
    
          const result = await deckService.drawCards(gameId, playerId, numberOfCards);
    
          expect(CardModel.takeCardFromDeck).toHaveBeenCalledTimes(2);
          expect(CardModel.updateCard).toHaveBeenCalledTimes(2);
        });
      });
    
      describe('shuffleArray', () => {
        it('should return an array of the same length', () => {
          const originalArray = [1, 2, 3, 4, 5];
          const shuffledArray = deckService.shuffleArray(originalArray);
    
          expect(shuffledArray.length).toBe(originalArray.length);
        });
    
        it('should contain all the same elements', () => {
          const originalArray = [1, 2, 3, 4, 5];
          const shuffledArray = deckService.shuffleArray(originalArray);
    
          expect(shuffledArray.sort()).toEqual(originalArray.sort());
        });
    });
});
