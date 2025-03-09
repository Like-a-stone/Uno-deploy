import {
    NotFoundError,
    AuthError,
    TokenError,
    BusinessError,
    DeckError,
    GameStateError,
    ValidationError,
    BadRequestError,
    DatabaseError,
} from '../../utils/customError';

describe('Custom Errors', () => {
    describe('NotFoundError', () => {
        it('should use default message', () => {
            const error = new NotFoundError();
            expect(error.message).toBe('Resource not found');
            expect(error.statusCode).toBe(404);
        });

        it('should use custom message', () => {
            const error = new NotFoundError('Custom not found');
            expect(error.message).toBe('Custom not found');
        });
    });

    describe('AuthError', () => {
        it('should use default message', () => {
            const error = new AuthError();
            expect(error.message).toBe('Authentication failed');
            expect(error.statusCode).toBe(401);
        });

        it('should use custom message', () => {
            const error = new AuthError('Custom auth error');
            expect(error.message).toBe('Custom auth error');
        });
    });

    describe('TokenError', () => {
        it('should use default message', () => {
            const error = new TokenError();
            expect(error.message).toBe('Token related issue');
            expect(error.statusCode).toBe(403);
        });

        it('should use custom message', () => {
            const error = new TokenError('Custom token error');
            expect(error.message).toBe('Custom token error');
        });
    });

    describe('BusinessError', () => {
        it('should use default message', () => {
            const error = new BusinessError();
            expect(error.message).toBe('Business rule violated');
            expect(error.statusCode).toBe(400);
        });

        it('should use custom message', () => {
            const error = new BusinessError('Custom business error');
            expect(error.message).toBe('Custom business error');
        });
    });

    describe('DeckError', () => {
        it('should use default message', () => {
            const error = new DeckError();
            expect(error.message).toBe('Deck related issue');
            expect(error.statusCode).toBe(400);
        });

        it('should use custom message', () => {
            const error = new DeckError('Custom deck error');
            expect(error.message).toBe('Custom deck error');
        });
    });

    describe('GameStateError', () => {
        it('should use default message', () => {
            const error = new GameStateError();
            expect(error.message).toBe('Invalid game state');
            expect(error.statusCode).toBe(400);
        });

        it('should use custom message', () => {
            const error = new GameStateError('Custom game state error');
            expect(error.message).toBe('Custom game state error');
        });
    });

    describe('ValidationError', () => {
        it('should set message and status code', () => {
            const error = new ValidationError('Validation failed');
            expect(error.message).toBe('Validation failed');
            expect(error.statusCode).toBe(400);
        });
    });

    describe('BadRequestError', () => {
        it('should use default message', () => {
            const error = new BadRequestError();
            expect(error.message).toBe('Invalid request');
            expect(error.statusCode).toBe(400);
        });

        it('should use custom message', () => {
            const error = new BadRequestError('Custom bad request');
            expect(error.message).toBe('Custom bad request');
        });
    });

    describe('Error inheritance', () => {
        it('should be instance of Error', () => {
            const error = new NotFoundError();
            expect(error).toBeInstanceOf(Error);
        });

        it('should have stack trace', () => {
            const error = new NotFoundError();
            expect(error.stack).toBeDefined();
        });
    });

    describe('DatabaseError', () => {
        it('should use default message', () => {
            const error = new DatabaseError();
            expect(error.message).toBe('Database error occurred');
            expect(error.statusCode).toBe(500);
        });
    
        it('should use custom message', () => {
            const error = new DatabaseError('Custom database error');
            expect(error.message).toBe('Custom database error');
        });
    });
});