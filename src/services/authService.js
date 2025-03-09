import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { jwtConfig } from '../config/jwtConfig.js';
import {PlayerModel} from '../models/player.js';
import RevokedAccessToken from '../models/revokedAccessToken.js';
import RevokedRefreshToken from '../models/revokedRefreshToken.js';
import {AuthError, TokenError} from "../utils/customError.js";
import {Functor} from "../utils/Functor.js";

/**
 * Gera um token de acesso (AccessToken) para o jogador fornecido.
 *
 * @param {Object} player - Objeto do jogador com informações básicas (id e email).
 * @returns {string} - Token de acesso JWT assinado.
 */

const generateAccessToken = (player) => {
    return new Functor(player)
        .map(player => ({
            id: player.id,
            email: player.email
        }))
        .map(payload => jwt.sign(payload, jwtConfig.accessTokenSecret, {
            expiresIn: jwtConfig.accessTokenExpiresIn,
        }))
        .getValue();
};

/**
 * Gera um token de atualização (RefreshToken) para o jogador fornecido.
 *
 * @param {Object} player - Objeto do jogador com informações básicas (id e email).
 * @returns {string} - Token de atualização JWT assinado.
 */
const generateRefreshToken = (player) => {
    return new Functor(player)
        .map(player => ({
            id: player.id,
            email: player.email
        }))
        .map(payload => jwt.sign(payload, jwtConfig.refreshTokenSecret, {
            expiresIn: jwtConfig.refreshTokenExpiresIn,
        }))
        .getValue();
};

/**
 * Autentica o jogador usando o email e senha providos.
 *
 * @param {string} email - Email do jogador para login.
 * @param {string} password - Senha do jogador para login.
 * @returns {Object|null} - Retorna o jogador autenticado ou null se as credenciais forem inválidas.
 * @throws {Error} - Lança erros em caso de falha (credenciais inválidas, jogador não encontrado, senha incorreta).
 */
const authenticateUser = async ({ email, password }) => {
    const player = await PlayerModel.getByEmailWithPassword(email);

    if (!player) {
        throw new AuthError('User not found');
    }

    return new Functor({ player, password })
        .map(({ player, password }) => {
            const isValidPassword = bcrypt.compareSync(password, player.password);
            if (!isValidPassword) throw new AuthError('Invalid Password');
            return player;
        })
        .getValue();
};

const revokeAccessToken = async (token) => {
    return new Functor(token)
        .map(token => {
            if (!token) throw new TokenError("Access Token is missing");
            return token;
        })
        .map(async token => await RevokedAccessToken.revokeToken(token))
        .getValue();
};

export const isAccessTokenRevoked = async (token) => {
    return new Functor(token)
    .map(async (token) => {
        const isRevoked = await RevokedAccessToken.isTokenRevoked(token);
        if (isRevoked) {
            throw new TokenError("Access token has been revoked");
        }
        return false;
    })
    .getValue();
};

const revokeRefreshToken = async (token) => {
    return new Functor(token)
        .map(async token => await RevokedRefreshToken.revokeToken(token))
        .getValue();
};

const isRefreshTokenRevoked = async (token) => {
    return new Functor(token)
        .map(async token => await RevokedRefreshToken.isTokenRevoked(token))
        .getValue();
};

const decodeAccessToken = (token) => {
    return new Functor(token)
        .map(token => {
            if (!token || typeof token !== 'string') {
                throw new TokenError("Invalid or missing token");
            }
            try {
                return jwt.verify(token, jwtConfig.accessTokenSecret);
            } catch (error) {
                throw new TokenError("Token verification failed");
            }
        })
        .getValue();
};

const loginPlayer = async ({ email, password }) => {
    const player = await authenticateUser({ email, password });
    const accessToken = generateAccessToken(player);
    const refreshToken = generateRefreshToken(player);
    return { player, accessToken, refreshToken };
};

const refreshAccessToken = async (refreshToken) => {
    if (!refreshToken) throw new TokenError("Refresh Token is required");

    await isRefreshTokenRevoked(refreshToken);

    const payload = jwt.verify(refreshToken, jwtConfig.refreshTokenSecret);
    if (!payload || !payload.id) throw new TokenError("Invalid or expired token");

    return generateAccessToken({ id: payload.id, email: payload.email });
};

const logoutPlayer = async (refreshToken, accessToken) => {
    if (!refreshToken) throw new TokenError("Refresh Token is missing");
    if (!accessToken) throw new TokenError("Access Token is missing");

    await revokeRefreshToken(refreshToken);
    await revokeAccessToken(accessToken);
};

export default {
    revokeAccessToken,
    revokeRefreshToken,
    isRefreshTokenRevoked,
    generateAccessToken,
    authenticateUser,
    decodeAccessToken,
    generateRefreshToken,
    isAccessTokenRevoked,
    loginPlayer,
    refreshAccessToken,
    logoutPlayer,
};