import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { Functor } from "../utils/Functor.js";
import { DatabaseError } from "../utils/customError.js";

const GameLog = sequelize.define('GameLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    gameId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Game',
            key: 'id'
        }
    },
    playerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Player',
            key: 'id'
        }
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    timestamps: true,
    tableName: 'GameLog'
});

export class GameLogModel {
    static async createLog(logData) {
        try {
            return new Functor(await GameLog.create(logData))
                .getValue();
        } catch (error) {
            throw new DatabaseError(`Error creating game log: ${error.message}`);
        }
    }

    static async getGameLogs(gameId) {
        try {
            return new Functor(await GameLog.findAll({
                where: { gameId: gameId },
                order: [['createdAt', 'DESC']]
            }))
                .getValue();
        } catch (error) {
            throw new DatabaseError(`Error fetching game logs: ${error.message}`);
        }
    }
}

export default GameLog;