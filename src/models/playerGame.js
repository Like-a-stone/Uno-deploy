import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import {PlayerModel} from "./player.js";
import {Functor} from "../utils/Functor.js";
import {DatabaseError, NotFoundError} from "../utils/customError.js";

const PlayerGame = sequelize.define('PlayerGame', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    playerId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    gameId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    isReady: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        validate: {
            isBoolean: {
                msg: 'isReady must be a boolean'
            }
        }
    },
    position: { /// the position in the game turn
        type: DataTypes.INTEGER,
        allowNull: true
    },
    saidUno: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        validate: {
            isBoolean: {
                msg: 'saidUno must be a boolean'
            }
        }
    }
}, {
    timestamps: false,
    tableName: 'PlayerGame'
});

export class PlayerGameModel {
    static async createPlayerGame(playerGameData) {
        try {
            return new Functor(await PlayerGame.create(playerGameData))
                .map(playerGame => playerGame || null)
                .getValue();
        } catch (error) {
            throw new DatabaseError(`Error creating player game: ${error.message}`);
        }
    }

    static async getPlayerGameById(playerId, gameId) {
        try {
            const playerGame = await PlayerGame.findOne({where: {gameId, playerId}});
            return playerGame; 
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            throw new DatabaseError(`Error fetching player game: ${error.message}`);
        }
    }

    static async getPlayersGameId(gameId) {
        try {
            return new Functor(await PlayerGame.findAll({where: {gameId}}))
                .map(players => {
                    if (players.length === 0) throw new NotFoundError(`No players found for game ${gameId}`);
                    return players;
                })
                .getValue();
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            throw new DatabaseError(`Error fetching players for game: ${error.message}`);
        }
    }

    static async getPlayersNamesByGameId(gameId) {
        try {
            const associations = await PlayerGame.findAll({ where: { gameId } });
            if (associations.length === 0) throw new NotFoundError(`No players found for game ${gameId}`);

            const players = await Promise.all(
                associations.map(async (association) => {
                    return await PlayerModel.getById(association.playerId);
                })
            );
            return players.map(player => player);
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            throw new DatabaseError(`Error fetching player names: ${error.message}`);
        }
    }

    static async getSortedPlayersByGameId(gameId) {
        try {
            return new Functor(await PlayerGame.findAll({
                where: { gameId },
                order: [['position', 'ASC']]
            }))
                .map(players => {
                    if (players.length === 0) throw new NotFoundError(`No players found for game ${gameId}`);
                    return players;
                })
                .getValue();
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            throw new DatabaseError(`Error fetching sorted players: ${error.message}`);
        }
    }

    static async deletePlayerById(playerId, gameId) {
        try {
            const result = await PlayerGame.destroy({ where: { gameId, playerId } });
            if (result === 0) throw new NotFoundError(`Player ${playerId} not found in game ${gameId}`);
            return true;
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            throw new DatabaseError(`Error deleting player: ${error.message}`);
        }
    }

    static async setPlayerReady(playerId, gameId) {
        try {
            return new Functor(await PlayerGame.findOne({where: {gameId, playerId}}))
                .map(async playerGame => {
                    if (!playerGame) throw new NotFoundError(`PlayerGame not found for player ${playerId} in game ${gameId}`);
                    playerGame.isReady = true;
                    await playerGame.save();
                    return playerGame;
                })
                .getValue();
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            throw new DatabaseError(`Error setting player ready: ${error.message}`);
        }
    }

    static async updatePlayerPositions(players) {
        try {
            for (let i = 0; i < players.length; i++) {
                const player = await PlayerGame.findByPk(players[i].id);
                if (player) {
                    await player.update({ position: i });
                }
            }
        } catch (error) {
            throw new DatabaseError(`Error updating player positions: ${error.message}`);
        }
    }

    static async getNumPlayersInGame(gameId) {
        try {
            return await PlayerGame.count({ where: { gameId } });
        } catch (error) {
            throw new DatabaseError(`Error counting players in game: ${error.message}`);
        }
    }

    static async joinGame(gameId, playerId) {
        try {
            const numPlayers = await this.getNumPlayersInGame(gameId);
            const position = numPlayers;
            return new Functor(await PlayerGame.create({ gameId, playerId, position }))
                .map(playerGame => playerGame || null)
                .getValue();
        } catch (error) {
            throw new DatabaseError(`Error joining game: ${error.message}`);
        }
    }

    static async isPlayerInGame(gameId, playerId) {
        try {
            const playerGame = await this.getPlayerGameById(playerId, gameId);
            return playerGame;
        } catch (error) {
            throw new DatabaseError(`Error checking if player is in game: ${error.message}`);
        }
    }

    static async setSaidUno(playerId, gameId, saidUno) {
        try {
            const playerGame = await this.getPlayerGameById(playerId, gameId);
            if (!playerGame) return null;
            playerGame.saidUno = saidUno;
            await playerGame.save();
            return playerGame;
        } catch (error) {
            throw new DatabaseError(`Error setting saidUno status: ${error.message}`);
        }
    }
}
export default PlayerGame;
