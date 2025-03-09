import statsService from '../services/statsService.js';
import logger from '../config/logger.js';
import { DatabaseError } from "../utils/customError.js";

/**
 * Obtém estatísticas de requisições
 * @param {Object} req - Objeto de requisição Express
 * @param {Object} res - Objeto de resposta Express
 */
const getRequestStats = async (req, res) => {
    try {
        const result = await statsService.getRequestStats();
        res.json(result);
    } catch (error) {
        logger.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getResponseTimeStats = async (req, res) => {
    try {
        const result = await statsService.getResponseTimeStats();
        res.json(result);
    } catch (error) {
        logger.error('Error fetching response time stats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getStatusCodeStats = async (req, res) => {
    try {
        const result = await statsService.getStatusCodeStats();
        res.json(result);
    } catch (error) {
        logger.error('Error fetching status code stats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getPopularEndpoints = async (req, res) => {
    try {
        const result = await statsService.getPopularEndpoints();
        res.json(result);
    } catch (error) {
        logger.error('Error fetching popular endpoints:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export default {
    getRequestStats,
    getResponseTimeStats,
    getStatusCodeStats,
    getPopularEndpoints
};