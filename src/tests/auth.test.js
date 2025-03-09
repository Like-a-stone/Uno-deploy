import authService from '../services/authService.js';
import { PlayerModel } from '../models/player.js';
import RevokedAccessToken from '../models/revokedAccessToken.js';
import RevokedRefreshToken from '../models/revokedRefreshToken.js';
import { AuthError, TokenError } from '../utils/customError.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwtConfig.js';

jest.mock('../models/player.js', () => ({
    PlayerModel: {
        getByEmailWithPassword: jest.fn()
    }
}));

jest.mock('../models/revokedAccessToken.js', () => ({
    revokeToken: jest.fn(),
    isTokenRevoked: jest.fn()
}));

jest.mock('../models/revokedRefreshToken.js', () => ({
    revokeToken: jest.fn(),
    isTokenRevoked: jest.fn()
}));

jest.mock('bcryptjs', () => ({
    compareSync: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(),
    verify: jest.fn()
}));

describe('Auth Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword123'
    };

    describe('login', () => {
        it('should authenticate user with valid credentials', async () => {
            PlayerModel.getByEmailWithPassword.mockResolvedValue(mockUser);
            bcrypt.compareSync.mockReturnValue(true);

            const credentials = {
                email: 'test@example.com',
                password: 'correctPassword'
            };

            const result = await authService.authenticateUser(credentials);
            
            expect(PlayerModel.getByEmailWithPassword).toHaveBeenCalledWith(credentials.email);
            expect(bcrypt.compareSync).toHaveBeenCalledWith(credentials.password, mockUser.password);
            expect(result).toEqual(mockUser);
        });

        it('should throw AuthError if password is incorrect', async () => {
            PlayerModel.getByEmailWithPassword.mockResolvedValue(mockUser);
            bcrypt.compareSync.mockReturnValue(false);

            const credentials = {
                email: 'test@example.com',
                password: 'wrongPassword'
            };

            await expect(authService.authenticateUser(credentials))
                .rejects
                .toThrow(AuthError);
        });

        it('should throw AuthError if user does not exist', async () => {
            PlayerModel.getByEmailWithPassword.mockResolvedValue(null);

            const credentials = {
                email: 'nonexistent@example.com',
                password: 'anyPassword'
            };

            await expect(authService.authenticateUser(credentials))
                .rejects
                .toThrow(AuthError);
        });
    });

    describe('logout', () => {
        const mockToken = 'valid.access.token';

        it('should successfully revoke access token', async () => {
            RevokedAccessToken.revokeToken.mockResolvedValue(true);
            
            await authService.revokeAccessToken(mockToken);
            
            expect(RevokedAccessToken.revokeToken).toHaveBeenCalledWith(mockToken);
        });

        it('should throw TokenError if token is missing', async () => {
            await expect(authService.revokeAccessToken(null))
                .rejects
                .toThrow(TokenError);
        });

        it('should return true if token is already revoked', async () => {
            RevokedAccessToken.isTokenRevoked.mockResolvedValue(true);

            const isRevoked = await RevokedAccessToken.isTokenRevoked(mockToken);
            expect(isRevoked).toBe(true);
        });
    });

    describe('token generation', () => {
        it('should generate access token', () => {
            const mockToken = 'mocked.access.token';
            jwt.sign.mockReturnValue(mockToken);

            const token = authService.generateAccessToken(mockUser);

            expect(jwt.sign).toHaveBeenCalledWith(
                { id: mockUser.id, email: mockUser.email },
                jwtConfig.accessTokenSecret,
                { expiresIn: jwtConfig.accessTokenExpiresIn }
            );
            expect(token).toBe(mockToken);
        });

        it('should generate refresh token', () => {
            const mockToken = 'mocked.refresh.token';
            jwt.sign.mockReturnValue(mockToken);

            const token = authService.generateRefreshToken(mockUser);

            expect(jwt.sign).toHaveBeenCalledWith(
                { id: mockUser.id, email: mockUser.email },
                jwtConfig.refreshTokenSecret,
                { expiresIn: jwtConfig.refreshTokenExpiresIn }
            );
            expect(token).toBe(mockToken);
        });
    });

    describe('token revocation', () => {
        const mockToken = 'valid.token';

        it('should successfully revoke refresh token', async () => {
            RevokedRefreshToken.revokeToken.mockResolvedValue(true);
            
            await authService.revokeRefreshToken(mockToken);
            
            expect(RevokedRefreshToken.revokeToken).toHaveBeenCalledWith(mockToken);
        });

        it('should check if refresh token is revoked', async () => {
            RevokedRefreshToken.isTokenRevoked.mockResolvedValue(true);

            const result = await authService.isRefreshTokenRevoked(mockToken);
            expect(result).toBe(true);
        });
    });

    describe('token decoding', () => {
        const mockToken = 'valid.access.token';
        const mockDecodedToken = { id: 1, email: 'test@example.com' };

        it('should successfully decode valid access token', () => {
            jwt.verify.mockReturnValue(mockDecodedToken);

            const result = authService.decodeAccessToken(mockToken);
            
            expect(jwt.verify).toHaveBeenCalledWith(mockToken, jwtConfig.accessTokenSecret);
            expect(result).toEqual(mockDecodedToken);
        });

        it('should throw TokenError for invalid token', () => {
            expect(() => {
                authService.decodeAccessToken(null);
            }).toThrow(TokenError);

            expect(() => {
                authService.decodeAccessToken(123);
            }).toThrow(TokenError);
        });

        it('should throw TokenError when token verification fails', () => {
            jwt.verify.mockImplementation(() => {
              throw new TokenError('Token verification failed');
            });

            expect(() => {
                authService.decodeAccessToken(mockToken);
            }).toThrow(TokenError);
        });
    });

    describe('error handling', () => {
        it('should handle database errors in authentication', async () => {
            PlayerModel.getByEmailWithPassword.mockRejectedValue(new Error('Database error'));

            await expect(authService.authenticateUser({
                email: 'test@example.com',
                password: 'password'
            })).rejects.toThrow();
        });

        it('should handle token revocation errors', async () => {
            RevokedAccessToken.revokeToken.mockRejectedValue(new Error('Database error'));

            await expect(authService.revokeAccessToken('valid.token'))
                .rejects.toThrow();
        });
    });

    describe('refreshAccessToken', () => {

        it('should throw TokenError when refresh token is missing', async () => {
            await expect(authService.refreshAccessToken()).rejects.toThrow(TokenError);
        });
    
        it('should throw TokenError if jwt.verify throws an error', async () => {
            jest.spyOn(authService, 'isRefreshTokenRevoked').mockResolvedValue(false);
            jwt.verify.mockImplementation(() => {
              throw new TokenError();
            });
      
            await expect(authService.refreshAccessToken('invalidToken')).rejects.toThrow(TokenError);
          });
    });

    describe('refreshAccessToken', () => {
        it('should return a new access token when refresh token is valid', async () => {
          const mockPayload = { id: 1, email: 'test@example.com' };
          jest.spyOn(authService, 'isRefreshTokenRevoked').mockResolvedValue(false);
          jwt.verify.mockReturnValue(mockPayload);
          jwt.sign.mockReturnValue('newAccessToken');
    
          const result = await authService.refreshAccessToken('validRefreshToken');
    
          expect(result).toBe('newAccessToken');
        });
    
        it('should throw TokenError when refresh token is missing', async () => {
          await expect(authService.refreshAccessToken()).rejects.toThrow(TokenError);
        });
    
        it('should throw TokenError when refresh token is revoked', async () => {
          jest.spyOn(authService, 'isRefreshTokenRevoked').mockResolvedValue(true);
          jwt.verify.mockReturnValue({ id: 1, email: 'test@example.com' }); // Reset any previous mock
          jwt.sign.mockImplementation(() => { throw new TokenError('Token is revoked'); });
    
          await expect(authService.refreshAccessToken('revokedToken')).rejects.toThrow(TokenError);
        });
    });

    describe('isAccessTokenRevoked', () => {
        it('should return false when token is not revoked', async () => {
          RevokedAccessToken.isTokenRevoked.mockResolvedValue(false);
    
          const result = await authService.isAccessTokenRevoked('validToken');
    
          expect(result).toBe(false);
        });
    
        it('should throw TokenError when token is revoked', async () => {
          RevokedAccessToken.isTokenRevoked.mockResolvedValue(true);
    
          await expect(authService.isAccessTokenRevoked('revokedToken')).rejects.toThrow(TokenError);
        });
    });
});