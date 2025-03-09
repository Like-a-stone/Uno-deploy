import playerService from '../services/playerService.js';
import { PlayerModel } from '../models/player.js';
import { ValidationError, NotFoundError, AuthError, TokenError } from '../utils/customError.js';

jest.mock('../models/player.js', () => ({
    PlayerModel: {
        getByEmail: jest.fn(),
        create: jest.fn(),
        getById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
    }
}));

describe('Player/User Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const validPlayerData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        password: 'Password123'
    };

    const mockCreatedPlayer = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        score: 0
    };

    describe('createPlayer/User', () => {
        it('should create player with valid data', async () => {
            PlayerModel.getByEmail.mockResolvedValue(null);
            PlayerModel.create.mockResolvedValue(mockCreatedPlayer);

            const result = await playerService.createPlayer(validPlayerData);
            expect(result).toEqual({message: 'User registered successfully'});
            expect(PlayerModel.create).toHaveBeenCalledWith(validPlayerData);
        });

        it('should throw ValidationError for invalid name', async () => {
            const invalidData = { ...validPlayerData, name: 'Jo' };
            await expect(playerService.createPlayer(invalidData))
                .rejects
                .toThrow(ValidationError);
        });

        it('should throw ValidationError for duplicate email', async () => {
            PlayerModel.getByEmail.mockResolvedValue(mockCreatedPlayer);
            await expect(playerService.createPlayer(validPlayerData))
                .rejects
                .toThrow(ValidationError);
        });
    });

    describe('getPlayer/User', () => {
        it('should return player data when found', async () => {
            PlayerModel.getById.mockResolvedValue(mockCreatedPlayer);
            const result = await playerService.getPlayer(1);
            expect(result).toEqual(mockCreatedPlayer);
        });

        it('should throw NotFoundError when player does not exist', async () => {
            PlayerModel.getById.mockResolvedValue(null);
            await expect(playerService.getPlayer(999))
                .rejects
                .toThrow(NotFoundError);
        });
    });

    describe('updatePlayer', () => {
        it('should update player with valid data', async () => {
            const updateData = { ...validPlayerData, name: 'Jane Doe' };
            PlayerModel.update.mockResolvedValue({ ...mockCreatedPlayer, name: 'Jane Doe' });

            const result = await playerService.updatePlayer(1, updateData);
            expect(result.name).toBe('Jane Doe');
            expect(PlayerModel.update).toHaveBeenCalledWith(1, updateData);
        });

        it('should throw ValidationError for invalid update data', async () => {
            const invalidData = { ...validPlayerData, age: 10 };
            await expect(playerService.updatePlayer(1, invalidData))
                .rejects
                .toThrow(ValidationError);
        });
    });

    describe('deletePlayer', () => {
        it('should successfully delete player', async () => {
            PlayerModel.delete.mockResolvedValue(true);
            const result = await playerService.deletePlayer(1);
            expect(result).toBeTruthy();
            expect(PlayerModel.delete).toHaveBeenCalledWith(1);
        });

        it('should throw NotFoundError when deleting non-existent player', async () => {
            PlayerModel.delete.mockResolvedValue(false);
            await expect(playerService.deletePlayer(999))
                .rejects
                .toThrow(NotFoundError);
        });
    });
});