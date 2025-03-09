import playerValidationService from '../services/playerValidationService';
import { ValidationError } from '../utils/customError';
import { PlayerModel } from '../models/player';

// Mock the PlayerModel
jest.mock('../models/player');

describe('playerValidationService', () => {
  describe('validatePlayerData', () => {
    it('should validate correct player data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        password: 'Password123'
      };

      expect(() => playerValidationService.validatePlayerData(validData)).not.toThrow();
    });

    it('should throw ValidationError for invalid name', () => {
      const invalidData = {
        name: 'Jo',
        email: 'john@example.com',
        age: 25,
        password: 'Password123'
      };

      expect(() => playerValidationService.validatePlayerData(invalidData)).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid email', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
        age: 25,
        password: 'Password123'
      };

      expect(() => playerValidationService.validatePlayerData(invalidData)).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid age', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 10,
        password: 'Password123'
      };

      expect(() => playerValidationService.validatePlayerData(invalidData)).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid password', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        password: 'weak'
      };

      expect(() => playerValidationService.validatePlayerData(invalidData)).toThrow(ValidationError);
    });
  });

  describe('validateUniqueEmail', () => {
    it('should return email if it is unique', async () => {
      PlayerModel.getByEmail.mockResolvedValue(null);

      const email = 'unique@example.com';
      await expect(playerValidationService.validateUniqueEmail(email)).resolves.toBe(email);
    });

    it('should throw ValidationError if email already exists', async () => {
      PlayerModel.getByEmail.mockResolvedValue({ id: 1, email: 'existing@example.com' });

      const email = 'existing@example.com';
      await expect(playerValidationService.validateUniqueEmail(email)).rejects.toThrow(ValidationError);
    });
  });
});