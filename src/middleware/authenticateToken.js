import jwt from 'jsonwebtoken';
import {jwtConfig} from '../config/jwtConfig.js';
import {isAccessTokenRevoked} from '../services/authService.js';
import {TokenError} from "../utils/customError.js";

/**
 * Middleware para autenticação de requests utilizando um Access Token.
 * Verifica se um token válido foi enviado no cabeçalho da requisição e
 * adiciona o payload do token à requisição (`req.player`).
 *
 * @param {Object} req - Objeto da requisição HTTP. Deve conter o cabeçalho "Authorization" com o token.
 * @param {Object} res - Objeto da resposta HTTP. Utilizado para retornar erros de autenticação, quando necessário.
 * @param {Function} next - Função para passar o controle ao próximo middleware/código.
 * @returns {void}
 */

export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        // Verificar se o token está revogado
        const isRevoked = await isAccessTokenRevoked(token);
        if (isRevoked) {
            throw new TokenError('Token revoked');
        }

        // Verificar a validade do token
        req.player = await new Promise((resolve, reject) => {
            jwt.verify(token, jwtConfig.accessTokenSecret, (err, decoded) => {
                if (err) reject(err);
                else resolve(decoded);
            });
        });
        
        next();
    } catch (err) {
        console.error('Authentication error:', err);
        if (err.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Token expired' });
        } else if (err.name === 'JsonWebTokenError') {
            return res.status(403).json({ error: 'Invalid token' });
        } else {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
};