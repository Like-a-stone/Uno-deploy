import scoreHistoryService from '../services/scoreHistoryService';
import { ScoreHistoryModel } from '../models/scoreHistory';
import { PlayerModel } from '../models/player';
import { PlayerGameModel } from '../models/playerGame';
import { NotFoundError } from '../utils/customError';
import { CardModel } from '../models/card';

jest.mock('../models/scoreHistory');
jest.mock('../models/player');
jest.mock('../models/playerGame');
jest.mock('../models/game');
jest.mock('../models/card');

describe('Score History Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getFormattedScores', () => {
        it('should return formatted scores for a game', async () => {
            const mockScores = [
                { playerName: 'Player1', score: 10 },
                { playerName: 'Player2', score: 20 }
            ];
            ScoreHistoryModel.getGameScores = jest.fn().mockResolvedValue(mockScores);
            const result = await scoreHistoryService.getFormattedScores(1);
            expect(result).toEqual({
                'Player1': 10,
                'Player2': 20
            });
            expect(ScoreHistoryModel.getGameScores).toHaveBeenCalledWith(1);
        });

    });
    
    describe('createScoreService', () => {
        const validScoreData = {
            playerId: 1,
            gameId: 1,
            score: 0
        };
    });

    describe('getScoreService', () => {
        const mockScore = {
            id: 1,
            playerId: 1,
            gameId: 1,
            score: 10
        };

        it('should return correct data for existing score', async () => {
            ScoreHistoryModel.getScoreById = jest.fn().mockResolvedValue(mockScore);

            const result = await scoreHistoryService.getScoreService(1);
            expect(result).toEqual(mockScore);
        });

        it('should throw NotFoundError for non-existing score', async () => {
            ScoreHistoryModel.getScoreById = jest.fn().mockResolvedValue(null);

            await expect(scoreHistoryService.getScoreService(999))
                .rejects
                .toThrow(NotFoundError);
        });

        it('should call database to get score', async () => {
            ScoreHistoryModel.getScoreById = jest.fn().mockResolvedValue(mockScore);

            await scoreHistoryService.getScoreService(1);
            expect(ScoreHistoryModel.getScoreById).toHaveBeenCalledWith(1);
        });
    });

    describe('updateScoreService', () => {
        const updateData = {
            score: 20
        };

        it('should validate score exists before update', async () => {
            ScoreHistoryModel.updateScore = jest.fn().mockResolvedValue(null);

            await expect(scoreHistoryService.updateScoreService(999, updateData))
                .rejects
                .toThrow(NotFoundError);
        });

        it('should call database to update score', async () => {
            const updatedScore = { id: 1, ...updateData };
            ScoreHistoryModel.updateScore = jest.fn().mockResolvedValue(updatedScore);

            await scoreHistoryService.updateScoreService(1, updateData);
            expect(ScoreHistoryModel.updateScore).toHaveBeenCalledWith(1, updateData);
        });

        it('should return updated score data', async () => {
            const updatedScore = { id: 1, ...updateData };
            ScoreHistoryModel.updateScore = jest.fn().mockResolvedValue(updatedScore);

            const result = await scoreHistoryService.updateScoreService(1, updateData);
            expect(result).toEqual(updatedScore);
        });
    });

    describe('deleteScoreService', () => {
        it('should call database to delete score', async () => {
            ScoreHistoryModel.deleteScore = jest.fn().mockResolvedValue(true);

            await scoreHistoryService.deleteScoreService(1);
            expect(ScoreHistoryModel.deleteScore).toHaveBeenCalledWith(1);
        });

        it('should return success message on deletion', async () => {
            ScoreHistoryModel.deleteScore = jest.fn().mockResolvedValue(true);

            const result = await scoreHistoryService.deleteScoreService(1);
            expect(result).toEqual({ message: "Score deleted successfully" });
        });

        it('should throw NotFoundError when deleting non-existing score', async () => {
            ScoreHistoryModel.deleteScore = jest.fn().mockResolvedValue(null);

            await expect(scoreHistoryService.deleteScoreService(999))
                .rejects
                .toThrow(NotFoundError);
        });
    });

    describe('initializeScore', () => {
        it('should initialize score correctly', async () => {
            const mockInitialScore = { id: 1, playerId: 1, gameId: 1, score: 0 };
            const mockUpdatedScore = { id: 1, playerId: 1, gameId: 1, score: 70 };
            
            ScoreHistoryModel.createScore.mockResolvedValue(mockInitialScore);
            ScoreHistoryModel.updateScore.mockResolvedValue(mockUpdatedScore);
            CardModel.getCardsByPlayerAndGame.mockResolvedValue([]);
    
            const result = await scoreHistoryService.initializeScore(1, 1);
            
            expect(result).toEqual(mockUpdatedScore);
            expect(ScoreHistoryModel.createScore).toHaveBeenCalledWith(1, 1, 0);
            expect(ScoreHistoryModel.updateScore).toHaveBeenCalledWith(1, 1, 70);
        });
    });

    describe('updateScoreOnCardPlay', () => {
        it('should update score when a card is played', async () => {
            const mockPlayerCards = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }]; // 6 cards
            const mockUpdatedScore = { id: 1, playerId: 1, gameId: 1, score: 10 }; // 7 - 6 = 1, 1 * 10 = 10
            
            CardModel.getCardsByPlayerAndGame.mockResolvedValue(mockPlayerCards);
            ScoreHistoryModel.updateScore.mockResolvedValue(mockUpdatedScore);
    
            const result = await scoreHistoryService.updateScoreOnCardPlay(1, 1);
            
            expect(result).toEqual(mockUpdatedScore);
            expect(CardModel.getCardsByPlayerAndGame).toHaveBeenCalledWith(1, 1);
            expect(ScoreHistoryModel.updateScore).toHaveBeenCalledWith(1, 1, 10);
        });
    });

    describe('updateScoreOnCardDraw', () => {
        it('should update score when a card is drawn', async () => {
            const mockPlayerCards = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 }]; // 8 cards
            const mockUpdatedScore = { id: 1, playerId: 1, gameId: 1, score: 0 };
            
            CardModel.getCardsByPlayerAndGame.mockResolvedValue(mockPlayerCards);
            ScoreHistoryModel.updateScore.mockResolvedValue(mockUpdatedScore);
    
            const result = await scoreHistoryService.updateScoreOnCardDraw(1, 1);
            
            expect(result).toEqual(mockUpdatedScore);
            expect(CardModel.getCardsByPlayerAndGame).toHaveBeenCalledWith(1, 1);
            expect(ScoreHistoryModel.updateScore).toHaveBeenCalledWith(1, 1, 0);
        });
    });

    describe('getPlayerScore', () => {
        it('should return player score when it exists', async () => {
          const mockScore = { id: 1, playerId: 1, gameId: 1, score: 10 };
          ScoreHistoryModel.getScoreById.mockResolvedValue(mockScore);
    
          const result = await scoreHistoryService.getPlayerScore(1, 1);
          expect(result).toEqual(mockScore);
          expect(ScoreHistoryModel.getScoreById).toHaveBeenCalledWith(1, 1);
        });
    
        it('should throw NotFoundError when player score does not exist', async () => {
          ScoreHistoryModel.getScoreById.mockResolvedValue(null);
    
          await expect(scoreHistoryService.getPlayerScore(1, 1)).rejects.toThrow(NotFoundError);
        });
    });


    describe('updateScoreOnCardPlay', () => {
        it('should update score when a card is played', async () => {
            const mockPlayerId = 1;
            const mockGameId = 1;
            const mockCards = [{ id: 1 }, { id: 2 }, { id: 3 }]; // 3 cards left
            CardModel.getCardsByPlayerAndGame = jest.fn().mockResolvedValue(mockCards);
            ScoreHistoryModel.updateScore = jest.fn().mockResolvedValue({ score: 40 });

            const result = await scoreHistoryService.updateScoreOnCardPlay(mockPlayerId, mockGameId);

            expect(CardModel.getCardsByPlayerAndGame).toHaveBeenCalledWith(mockPlayerId, mockGameId);
            expect(ScoreHistoryModel.updateScore).toHaveBeenCalledWith(mockPlayerId, mockGameId, 40);
            expect(result).toEqual({ score: 40 });
        });
    });

    describe('updateScoreOnCardDraw', () => {
        it('should update score when a card is drawn', async () => {
            const mockPlayerId = 1;
            const mockGameId = 1;
            const mockCards = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]; // 5 cards
            CardModel.getCardsByPlayerAndGame = jest.fn().mockResolvedValue(mockCards);
            ScoreHistoryModel.updateScore = jest.fn().mockResolvedValue({ score: 20 });

            const result = await scoreHistoryService.updateScoreOnCardDraw(mockPlayerId, mockGameId);

            expect(CardModel.getCardsByPlayerAndGame).toHaveBeenCalledWith(mockPlayerId, mockGameId);
            expect(ScoreHistoryModel.updateScore).toHaveBeenCalledWith(mockPlayerId, mockGameId, 20);
            expect(result).toEqual({ score: 20 });
        });
    });

    describe('getPlayerScore', () => {
        it('should return player score', async () => {
            const mockPlayerId = 1;
            const mockGameId = 1;
            const mockScore = { score: 30 };
            ScoreHistoryModel.getScoreById = jest.fn().mockResolvedValue(mockScore);

            const result = await scoreHistoryService.getPlayerScore(mockPlayerId, mockGameId);

            expect(ScoreHistoryModel.getScoreById).toHaveBeenCalledWith(mockPlayerId, mockGameId);
            expect(result).toEqual(mockScore);
        });

        it('should throw NotFoundError when score is not found', async () => {
            const mockPlayerId = 1;
            const mockGameId = 1;
            ScoreHistoryModel.getScoreById = jest.fn().mockResolvedValue(null);

            await expect(scoreHistoryService.getPlayerScore(mockPlayerId, mockGameId))
                .rejects.toThrow(NotFoundError);
        });
    });

    describe('updateScoresOnGameEnd', () => {
        it('should update scores for all players when game ends', async () => {
            const mockGameId = 1;
            const mockPlayers = [{ playerId: 1 }, { playerId: 2 }];
            PlayerGameModel.getPlayersGameId = jest.fn().mockResolvedValue(mockPlayers);
            CardModel.getCardsByPlayerAndGame = jest.fn()
                .mockResolvedValueOnce([{ id: 1 }, { id: 2 }]) // 2 cards for player 1
                .mockResolvedValueOnce([{ id: 3 }]); // 1 card for player 2
            ScoreHistoryModel.updateScore = jest.fn();
            PlayerModel.getById = jest.fn()
                .mockResolvedValueOnce({ score: 100 })
                .mockResolvedValueOnce({ score: 50 });
            PlayerModel.update = jest.fn();

            await scoreHistoryService.updateScoresOnGameEnd(mockGameId);

            expect(PlayerGameModel.getPlayersGameId).toHaveBeenCalledWith(mockGameId);
            expect(CardModel.getCardsByPlayerAndGame).toHaveBeenCalledTimes(2);
            expect(ScoreHistoryModel.updateScore).toHaveBeenCalledTimes(2);
            expect(PlayerModel.getById).toHaveBeenCalledTimes(2);
            expect(PlayerModel.update).toHaveBeenCalledTimes(2);
            expect(PlayerModel.update).toHaveBeenCalledWith(1, { score: 150 }); // 100 + 50
            expect(PlayerModel.update).toHaveBeenCalledWith(2, { score: 110 }); // 50 + 60
        });

        it('should throw NotFoundError when no players are found', async () => {
            const mockGameId = 1;
            PlayerGameModel.getPlayersGameId = jest.fn().mockResolvedValue([]);

            await expect(scoreHistoryService.updateScoresOnGameEnd(mockGameId))
                .rejects.toThrow(NotFoundError);
        });
    });
});