import ScoreHistoryService from '../services/scoreHistoryService.js';
import logger from '../config/logger.js';

const createScore = async (req, res, next) => {
    try {
        logger.info(`Criando novo registro de pontuação`);
        const score = await ScoreHistoryService.createScoreService(req.body);
        logger.info(`Registro de pontuação criado com sucesso. ID: ${score.id}`);
        res.status(201).json(score);
    } catch (error) {
        logger.error(`Erro ao criar registro de pontuação: ${error.message}`);
        next(error);
    }
};

const getScoreById = async (req, res, next) => {
    try {
        logger.info(`Buscando registro de pontuação. ID: ${req.params.id}`);
        const score = await ScoreHistoryService.getScoreService(req.params.id);
        logger.info(`Registro de pontuação recuperado com sucesso. ID: ${req.params.id}`);
        res.status(200).json(score);
    } catch (error) {
        logger.error(`Erro ao buscar registro de pontuação: ${error.message}`);
        next(error);
    }
};

const updateScore = async (req, res, next) => {
    try {
        logger.info(`Atualizando registro de pontuação. ID: ${req.params.id}`);
        const updatedScore = await ScoreHistoryService.updateScoreService(req.params.id, req.body);
        logger.info(`Registro de pontuação atualizado com sucesso. ID: ${req.params.id}`);
        res.status(200).json(updatedScore);
    } catch (error) {
        logger.error(`Erro ao atualizar registro de pontuação: ${error.message}`);
        next(error);
    }
};

const deleteScore = async (req, res, next) => {
    try {
        logger.info(`Deletando registro de pontuação. ID: ${req.params.id}`);
        const result = await ScoreHistoryService.deleteScoreService(req.params.id);
        logger.info(`Registro de pontuação deletado com sucesso. ID: ${req.params.id}`);
        res.status(204).send(result);
    } catch (error) {
        logger.error(`Erro ao deletar registro de pontuação: ${error.message}`);
        next(error);
    }
};

const getGameScores = async (req, res, next) => {
    try {
        logger.info(`Buscando pontuações do jogo`);
        const gameId = req.body.game_id;
        const result = await ScoreHistoryService.getFormattedScores(gameId);
        logger.info(`Pontuações do jogo recuperadas com sucesso`);
        res.status(200).send(result);
    } catch (error) {
        logger.error(`Erro ao buscar pontuações do jogo: ${error.message}`);
        next(error);
    }
};

export default {
    createScore,
    getScoreById,
    updateScore,
    deleteScore,
    getGameScores
};