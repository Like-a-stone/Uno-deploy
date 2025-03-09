import gameValidationService from '../services/gameValidationService';
import { PlayerGameModel } from '../models/playerGame';

jest.mock('../models/playerGame', () => ({
  PlayerGameModel: {
    getPlayerGameById: jest.fn(),
  },
}));

describe('gameValidationService', () => {
  describe('validateTitle', () => {
    it('should return null for titles shorter than 3 characters', () => {
      expect(gameValidationService.validateTitle('ab')).toBeNull();
    });

    it('should return null for titles longer than 100 characters', () => {
      const longTitle = 'a'.repeat(101);
      expect(gameValidationService.validateTitle(longTitle)).toBeNull();
    });

    it('should return trimmed and lowercase title for valid titles', () => {
      expect(gameValidationService.validateTitle('  Valid Title  ')).toBe('valid title');
    });
  });

  describe('validateGameStatus', () => {
    it('should return false if game is null', () => {
      expect(gameValidationService.validateGameStatus(null, 'in_progress')).toBe(false);
    });

    it('should return false if game status does not match expected status', () => {
      const game = { status: 'waiting' };
      expect(gameValidationService.validateGameStatus(game, 'in_progress')).toBe(false);
    });

    it('should return true if game status matches expected status', () => {
      const game = { status: 'in_progress' };
      expect(gameValidationService.validateGameStatus(game, 'in_progress')).toBe(true);
    });
  });

  describe('validatePlayerInGame', () => {
    it('should return the result of PlayerGameModel.getPlayerGameById', async () => {
      const mockPlayerGame = { playerId: 1, gameId: 1 };
      PlayerGameModel.getPlayerGameById.mockResolvedValue(mockPlayerGame);

      const result = await gameValidationService.validatePlayerInGame(1, 1);
      expect(result).toEqual(mockPlayerGame);
      expect(PlayerGameModel.getPlayerGameById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('checkAllPlayersReady', () => {
    it('should return true if all players are ready', () => {
      const players = [{ isReady: true }, { isReady: true }];
      expect(gameValidationService.checkAllPlayersReady(players)).toBe(true);
    });

    it('should return false if any player is not ready', () => {
      const players = [{ isReady: true }, { isReady: false }];
      expect(gameValidationService.checkAllPlayersReady(players)).toBe(false);
    });
  });

  describe('validateMinimumPlayers', () => {
    it('should return true if number of players meets or exceeds minimum', () => {
      const players = [{}, {}, {}];
      expect(gameValidationService.validateMinimumPlayers(players, 2)).toBe(true);
    });

    it('should return false if number of players is less than minimum', () => {
      const players = [{}];
      expect(gameValidationService.validateMinimumPlayers(players, 2)).toBe(false);
    });

    it('should use default minimum of 2 if not specified', () => {
      const players = [{}, {}];
      expect(gameValidationService.validateMinimumPlayers(players)).toBe(true);
    });
  });

  describe('validateMaxPlayers', () => {
    it('should return null for values less than 2', () => {
      expect(gameValidationService.validateMaxPlayers(1)).toBeNull();
      expect(gameValidationService.validateMaxPlayers(0)).toBeNull();
      expect(gameValidationService.validateMaxPlayers(-1)).toBeNull();
    });
  
    it('should return null for values greater than 10', () => {
      expect(gameValidationService.validateMaxPlayers(11)).toBeNull();
      expect(gameValidationService.validateMaxPlayers(100)).toBeNull();
    });
  
    it('should return the parsed integer for valid values between 2 and 10', () => {
      expect(gameValidationService.validateMaxPlayers(2)).toBe(2);
      expect(gameValidationService.validateMaxPlayers(5)).toBe(5);
      expect(gameValidationService.validateMaxPlayers(10)).toBe(10);
    });
  
    it('should handle string inputs correctly', () => {
      expect(gameValidationService.validateMaxPlayers('2')).toBe(2);
      expect(gameValidationService.validateMaxPlayers('10')).toBe(10);
      expect(gameValidationService.validateMaxPlayers('5')).toBe(5);
    });
  
    it('should return null for non-numeric strings', () => {
      expect(gameValidationService.validateMaxPlayers('abc')).toBeNull();
      expect(gameValidationService.validateMaxPlayers('5players')).toBeNull();
    });
  
    it('should return null for decimal numbers', () => {
      expect(gameValidationService.validateMaxPlayers(2.5)).toBeNull();
      expect(gameValidationService.validateMaxPlayers('7.8')).toBeNull();
    });
  });
});