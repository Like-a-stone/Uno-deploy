class CustomError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

export class NotFoundError extends CustomError {
    constructor(message = "Resource not found") {
        super(404, message); // Código de status 404 para "Not Found"
    }
}

export class AuthError extends CustomError {
    constructor(message = "Authentication failed") {
        super(401, message);
    }
}

export class TokenError extends CustomError {  // Erro relacionado a tokens
    constructor(message = "Token related issue") {
        super(403, message);
    }
}

export class BusinessError extends CustomError { // Erro relacionado regra de negocios
    constructor(message = "Business rule violated") {
        super(400, message);
    }
}

export class DeckError extends CustomError {  // Novo erro especializado para o baralho
    constructor(message = "Deck related issue") {
        super(400, message);
    }
}
export class GameStateError extends CustomError {  // Novo erro especializado para o estado do jogo
    constructor(message = "Invalid game state") {
        super(400, message);
    }

}

export class ValidationError extends CustomError {
    constructor(message) {
        super(400, message);
    }
}

export class BadRequestError extends CustomError {
    constructor(message = "Invalid request") {
        super(400, message);
    }
}

export class DatabaseError extends CustomError {  
    constructor(message = "Database error occurred") {
        super(500, message); 
    }
}


export default CustomError;
