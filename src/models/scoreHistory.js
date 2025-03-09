import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Player from './player.js';
import Game from './game.js';
import {Functor} from "../utils/Functor.js";
import {DatabaseError, NotFoundError} from "../utils/customError.js";

const ScoreHistory = sequelize.define('ScoreHistory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    playerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Player,
            key: 'id'
        },
        onDelete: 'CASCADE' // Sugestao: O score de um Jogo deletado tmb será apagado
    },
    gameId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Game,
            key: 'id'
        },
        onDelete: 'CASCADE' // Sugestao: O score de um Player deletado tmb será apagado
    }
}, {
    timestamps: false,
    tableName: 'ScoreHistory'
});

export class ScoreHistoryModel {
    static async createScore(playerId, gameId, initialScore) {
        try {
            return new Functor(await ScoreHistory.create({
                playerId,
                gameId,
                score: initialScore,
            }))
                .map(score => score || null)
                .getValue();
        } catch (error) {
            throw new DatabaseError(`Error creating score: ${error.message}`);
        }
    }

    static async getScoreById(scoreId) {
        try {
            return new Functor(await ScoreHistory.findByPk(scoreId))
                .map(score => {
                    if (!score) throw new NotFoundError(`Score with id ${scoreId} not found`);
                    return score;
                })
                .getValue();
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            throw new DatabaseError(`Error fetching score: ${error.message}`);
        }
    }

    static async updateScore(playerId, gameId, scoreChange) {
        try {
            const score = await ScoreHistory.findOne({ where: { playerId, gameId } });
            if (!score) return null;
            score.score = scoreChange;
            await score.save();
            return score;
        } catch (error) {
            throw new DatabaseError(`Error updating score: ${error.message}`);
        }
    }

    static async deleteScore(scoreId) {
        try {
            return new Functor(await ScoreHistory.findByPk(scoreId))
                .mapAsync(async score => {
                    if (!score) throw new NotFoundError(`Score with id ${scoreId} not found`);
                    await score.destroy();
                    return true;
                })
                .getValue();
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            throw new DatabaseError(`Error deleting score: ${error.message}`);
        }
    }

    static async getGameScores(gameId) {
        try {
            return new Functor(await ScoreHistory.findAll({
                where: { gameId },
                include: [{ model: Player, attributes: ['name'] }],
                order: [['score', 'DESC']]
            }))
                .map(scores => {
                    if (scores.length === 0) throw new NotFoundError(`No scores found for game with id ${gameId}`);
                    return scores.map(score => ({
                        playerName: score.Player.name,
                        score: score.score
                    }));
                })
                .getValue();
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            throw new DatabaseError(`Error fetching game scores: ${error.message}`);
        }
    }
}

export default ScoreHistory;