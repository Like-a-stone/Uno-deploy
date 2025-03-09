import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import {Functor} from "../utils/Functor.js";
import {DatabaseError} from "../utils/customError.js";

const Game = sequelize.define('Game', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING(30),
        allowNull: false
      },
    status: {
        type: DataTypes.ENUM('waiting', 'in_progress', 'finished'),
        defaultValue: 'waiting',
        allowNull: false,
      },
    rules: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    numPlayers: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    creatorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Player',
            key: 'id'
        }
    },
    currentColor: {
        type: DataTypes.ENUM('red', 'blue', 'green', 'yellow', 'wild'),
        defaultValue: 'wild'
    },
    currentDirection: {
        type: DataTypes.ENUM('clockwise', 'counter-clockwise'),
        defaultValue: 'clockwise'
    },
    currentPlayerIndex: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
},
{
    timestamps: true,
    tableName: 'Game'
    });

const formatGameResponse = (game) => ({
    id: game.id,
    title: game.title,
    status: game.status,
    rules: game.rules,
    numPlayers: game.numPlayers,
    creatorId: game.creatorId,
    currentColor: game.currentColor,
    currentDirection: game.currentDirection,
    currentPlayerIndex: game.currentPlayerIndex
});

export class GameModel {
    static async createGame(title, playerId, validatedMaxPlayers) {
        try {
            return new Functor(await Game.create({
                title: title,
                creatorId: playerId,
                numPlayers: validatedMaxPlayers,
                status: 'waiting',
                numPlayers: 1
            }))
                .map(formatGameResponse)
                .getValue();
        } catch (error) {
            throw new DatabaseError(`Error creating game: ${error.message}`);
        }
    }

    static async updateGame(gameId, gameData) {
        try {
            return new Functor(await Game.findByPk(gameId))
                .map(async game => {
                    if (!game) {
                        throw new NotFoundError(`Game with id ${gameId} not found`);
                    }
                    await game.update(gameData);
                    return game;
                })
                .getValue();
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new DatabaseError(`Error updating game: ${error.message}`);
        }
    }

    static async getGameById(gameId) {
        try {
            const game = await Game.findByPk(gameId);
            return game;
        } catch (error) {
            throw new DatabaseError(`Error fetching game: ${error.message}`);
        }
    }

    static async deleteGame(gameId) {
        try {
            return new Functor(await Game.findByPk(gameId))
                .map(async game => {
                    if (!game) {
                        throw new NotFoundError(`Game with id ${gameId} not found`);
                    }
                    await game.destroy();
                    return true;
                })
                .getValue();
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new DatabaseError(`Error deleting game: ${error.message}`);
        }
    }

    static async startGame(gameId, initialColor) {
        try {
            return new Functor(await Game.findByPk(gameId))
                .map(async game => {
                    if (!game) {
                        throw new NotFoundError(`Game with id ${gameId} not found`);
                    }
                    if (game.status !== 'waiting') {
                        throw new ValidationError(`Game ${gameId} is not in 'waiting' status`);
                    }
                    game.status = 'in_progress';
                    game.currentPlayerIndex = 0;
                    game.currentColor = initialColor;
                    await game.save();
                    return game;
                })
                .getValue();
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof ValidationError) {
                throw error;
            }
            throw new DatabaseError(`Error starting game: ${error.message}`);
        }
    }
    static async updateCurrentPlayer(gameId, playerIndex) {
        try {
            const game = await Game.findByPk(gameId);
            game.currentPlayerIndex = playerIndex;
            await game.save();
            return game;
        
        } catch (error) {
            if (error) {
                throw error;
            }
            throw new DatabaseError(`Error updating current player: ${error.message}`);
        }
    }
}

export default Game;