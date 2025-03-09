import { Functor } from "../utils/Functor.js";
import  {PlayerGameModel} from '../models/playerGame.js';

export const validateTitle = (title) =>
    new Functor(title)
        .map(t => t.trim())
        .map(t => t.toLowerCase())
        .map(t => (t.length >= 3 && t.length <= 100) ? t : null)
        .getValue();

export const validateGameStatus = (game, expectedStatus) => {
    if (!game || !game.status) return false;
    return game.status === expectedStatus;
};

export const validatePlayerInGame = async (gameId, playerId) => {
    const playerInGame = await PlayerGameModel.getPlayerGameById(playerId, gameId);
    return playerInGame;
};

export const checkAllPlayersReady = (players) =>
    new Functor(players)
        .map(pList => pList.every(p => p.isReady))
        .getValue();

export const validateMinimumPlayers = (players, minPlayers = 2) =>
    new Functor(players)
        .map(pList => pList.length >= minPlayers)
        .getValue();

export const validateMaxPlayers = (maxPlayers) =>
    new Functor(maxPlayers)
        .map(max => {
            const parsed = parseInt(max, 10);
            return isNaN(parsed) || parsed !== Number(max) ? null : parsed;
        })
        .map(max => (max >= 2 && max <= 10) ? max : null)
        .getValue();

export default {
    validateTitle,
    validateGameStatus,
    checkAllPlayersReady,  
    validatePlayerInGame,
    validateMinimumPlayers,
    validateMaxPlayers
};