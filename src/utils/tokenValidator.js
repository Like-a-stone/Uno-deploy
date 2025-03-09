import { Functor } from "../utils/Functor.js";
import authService from '../services/authService.js';
import { AuthError } from './customError.js';

/**
 * Valida um token de acesso (Access Token) e retorna o ID do jogador.
 * Caso o token seja inv lido ou expirado, lan a um AuthError.
 * Este método será necessário em várias partes do código da aplicação, especialmente em rotas e endpoints
 *  * que exigem autenticação
 *
 * @param {string} access_token - O token de acesso a ser validado.
 * @returns {number} - O ID do jogador, obtido do token de acesso v lido.
 * @throws {AuthError} - Caso o token seja inv lido ou expirado.
 */
export const validateAccessToken = async (access_token) => {
    return new Functor(access_token)
        .map(token => {
            if (!token) {
                throw new AuthError("Access token is required");
            }
            return token;
        })
        .map(async (token) => {
            const decoded = await authService.decodeAccessToken(token);
            if (!decoded || !decoded.id) {
                throw new AuthError("Invalid or expired token");
            }
            return decoded.id;
        })
        .getValue();
};
