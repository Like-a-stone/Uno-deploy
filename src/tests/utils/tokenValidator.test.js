import { validateAccessToken } from '../../utils/tokenValidator';
import authService from '../../services/authService';
import { AuthError } from '../../utils/customError';

jest.mock('../../services/authService');

describe('Token Validator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should throw AuthError when token is missing', async () => {
        await expect(validateAccessToken(null))
            .rejects
            .toThrow(new AuthError("Access token is required"));

        await expect(validateAccessToken(undefined))
            .rejects
            .toThrow(new AuthError("Access token is required"));

        await expect(validateAccessToken(''))
            .rejects
            .toThrow(new AuthError("Access token is required"));
    });

    it('should throw AuthError when token is invalid', async () => {
        authService.decodeAccessToken.mockResolvedValue(null);

        await expect(validateAccessToken('invalid-token'))
            .rejects
            .toThrow(new AuthError("Invalid or expired token"));
    });

    it('should throw AuthError when decoded token has no id', async () => {
        authService.decodeAccessToken.mockResolvedValue({});

        await expect(validateAccessToken('token-without-id'))
            .rejects
            .toThrow(new AuthError("Invalid or expired token"));
    });

    it('should return player id from valid token', async () => {
        const mockPlayerId = 123;
        authService.decodeAccessToken.mockResolvedValue({ id: mockPlayerId });

        const result = await validateAccessToken('valid-token');
        expect(result).toBe(mockPlayerId);
    });

    it('should call authService.decodeAccessToken with correct token', async () => {
        const mockToken = 'test-token';
        authService.decodeAccessToken.mockResolvedValue({ id: 1 });

        await validateAccessToken(mockToken);
        expect(authService.decodeAccessToken).toHaveBeenCalledWith(mockToken);
    });

    it('should handle authService throwing errors', async () => {
        authService.decodeAccessToken.mockRejectedValue(new Error('Service error'));

        await expect(validateAccessToken('error-token'))
            .rejects
            .toThrow('Service error');
    });
});
