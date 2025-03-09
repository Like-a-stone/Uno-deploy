import { PlayerModel } from '../models/player.js';
import { NotFoundError, ValidationError } from '../utils/customError.js';
import { Functor } from "../utils/Functor.js";
import playerValidationService from './playerValidationService.js';

const createPlayer = async (playerData) => {
    const validatedData = playerValidationService.validatePlayerData(playerData);
    await playerValidationService.validateUniqueEmail(validatedData.email);

    return new Functor(await PlayerModel.create(validatedData))
        .map(player => {
            if (!player) throw new ValidationError('Failed to create player');
            return { message: "User registered successfully" };
        })
        .getValue();
};

const getPlayer = async (playerId) => {
    return new Functor(await PlayerModel.getById(playerId))
        .map(player => {
            if (!player) throw new NotFoundError('Player not found');
            return player;
        })
        .getValue();
};

const updatePlayer = async (playerId, playerData) => {
    const validatedData = playerValidationService.validatePlayerData(playerData);

    return new Functor(await PlayerModel.update(playerId, validatedData))
        .map(player => {
            if (!player) throw new NotFoundError('Player not found');
            return player;
        })
        .getValue();
};

const deletePlayer = async (playerId) => {
    return new Functor(await PlayerModel.delete(playerId))
        .map(response => {
            if (!response) throw new NotFoundError('Player not found');
            return { message: "User deleted successfully" };
        })
        .getValue();
};

export default {
    createPlayer,
    getPlayer,
    updatePlayer,
    deletePlayer,
};
