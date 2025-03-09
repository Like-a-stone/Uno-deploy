import cardService from '../services/cardService.js';
import deckService from '../services/deckService.js';
import logger from '../config/logger.js';

const createCard = async (req, res, next) => {
    try {
        logger.info(`Criando nova carta`);
        const card = await cardService.createCardService(req.body);
        logger.info(`Carta criada com sucesso. ID: ${card.id}`);
        res.status(201).json(card);
    } catch (error) {
        logger.error(`Erro ao criar carta: ${error.message}`);
        next(error);
    }
};

const getCard = async (req, res, next) => {
    try {
        logger.info(`Buscando carta. ID: ${req.params.id}`);
        const card = await cardService.getCardService(req.params.id);
        logger.info(`Carta recuperada com sucesso. ID: ${req.params.id}`);
        res.status(200).json(card);
    } catch (error) {
        logger.error(`Erro ao buscar carta: ${error.message}`);
        next(error);
    }
};

const updateCard = async (req, res, next) => {
    try {
        logger.info(`Atualizando carta. ID: ${req.params.id}`);
        const card = await cardService.updateCardService(req.params.id, req.body);
        logger.info(`Carta atualizada com sucesso. ID: ${req.params.id}`);
        res.status(200).json(card);
    } catch (error) {
        logger.error(`Erro ao atualizar carta: ${error.message}`);
        next(error);
    }
};

const deleteCard = async (req, res, next) => {
    try {
        logger.info(`Deletando carta. ID: ${req.params.id}`);
        await cardService.deleteCardService(req.params.id);
        logger.info(`Carta deletada com sucesso. ID: ${req.params.id}`);
        res.status(204).send();
    } catch (error) {
        logger.error(`Erro ao deletar carta: ${error.message}`);
        next(error);
    }
};

const takeCard = async (req, res, next) => {
    try {
        logger.info(`Jogador tentando pegar uma carta`);
        const card = await deckService.takeCardFromDeck(req.body);
        logger.info(`Carta retirada com sucesso`);
        return res.status(200).json(card);
    } catch (error) {
        logger.error(`Erro ao pegar carta: ${error.message}`);
        next(error);
    }
};

const getPlayerCards = async (req, res, next) => {
    try {
        const cards = await cardService.getPlayerCards(req.body);
        return res.status(200).json(cards);
    } catch (error) {
        logger.error(`Erro ao recuperar cartas do jogador: ${error.message}`);
        next(error);
    }
};

const playCard = async (req, res, next) => {
    try {
       // logger.info(`Jogador tentando jogar uma carta. Jogo ID: ${req.params.id}`);
        const result = await cardService.playCard(req.params.id, req.body);
        //logger.info(`Carta jogada com sucesso. Jogo ID: ${game_id}, Próximo jogador: ${result.nextPlayer}`);
        return res.status(200).json(result);
    } catch (error) {
        logger.error(`Erro ao jogar carta: ${error.message}`);
        next(error);
    }
};

export default {
    createCard,
    getCard,
    updateCard,
    deleteCard,
    takeCard,
    getPlayerCards,
    playCard
};