import gameService from '../services/gameService.js';
import logger from '../config/logger.js'; 
import { getIO } from '../services/socketService.js';

const createGame = async (req, res, next) => {
    try {
        logger.info(`Criando novo jogo.`);
        const {title, access_token, maxPlayers} = req.body;
        const game = await gameService.createGame(title, access_token, maxPlayers);
        logger.info(`Jogo criado com sucesso. ID do jogo: ${game.id}`);
        res.status(201).json(game);
    } catch (error) {
        logger.error(`Erro ao criar jogo: ${error.message}`);
        next(error);
    }
};

const getGame = async (req, res, next) => {
    try {
        logger.info(`Buscando jogo. ID do jogo: ${req.params.id}`);
        const game = await gameService.getGame(req.params.id);
        logger.info(`Jogo recuperado com sucesso. ID do jogo: ${req.params.id}`);
        res.status(200).json(game);
    } catch (error) {
        logger.error(`Erro ao buscar jogo: ${error.message}`);
        next(error);
    }
};

const updateGame = async (req, res, next) => {
    try {
        logger.info(`Atualizando jogo. ID do jogo: ${req.params.id}`);
        const updatedGame = await gameService.updateGame(req.params.id, req.body);
        logger.info(`Jogo atualizado com sucesso. ID do jogo: ${req.params.id}`);
        res.status(200).json(updatedGame);
    } catch (error) {
        logger.error(`Erro ao atualizar jogo: ${error.message}`);
        next(error);
    }
};

const deleteGame = async (req, res, next) => {
    try {
        logger.info(`Deletando jogo. ID do jogo: ${req.params.id}`);
        await gameService.deleteGame(req.params.id);
        logger.info(`Jogo deletado com sucesso. ID do jogo: ${req.params.id}`);
        res.status(204).send();
    } catch (error) {
        logger.error(`Erro ao deletar jogo: ${error.message}`);
        next(error);
    }
};

const playerList = async (req, res, next) => {
    try {
        logger.info(`Buscando lista de jogadores. ID do jogo: ${req.params.id}`);
        const game = await gameService.playerList(req.params.id);
        logger.info(`Lista de jogadores recuperada com sucesso. ID do jogo: ${req.params.id}`);
        res.status(200).json(game);
    } catch (error) {
        logger.error(`Erro ao buscar lista de jogadores: ${error.message}`);
        next(error);
    }
};

const joinGame = async (req, res, next) => {
    try {
        logger.info(`Jogador entrando no jogo. ID do jogo: ${req.body.game_id}, ID do jogador: ${req.body.player_id}`);
        const result = await gameService.joinGame(req.body);
        
        const io = getIO();
        io.to(result.game_id).emit('player_joined', { 
            player_name: result.players,
            game_id: result.game_id 
        });
        logger.info(`Jogador entrou no jogo com sucesso. ID do jogo: ${result.game_id}, ID do jogador: ${result.player_id}`);
        res.status(200).json(result);
    } catch (error) {
        logger.error(`Erro ao entrar no jogo: ${error.message}`);
        next(error);
    }
};

const setPlayerReady = async (req, res, next) => {
    try {
        const result = await gameService.setPlayerReady(req.body);
        logger.info(`Jogador definido como pronto com sucesso. ID do jogo: ${result.game_id}, do jogador: ${result.player_name}`);
        res.status(200).json(result);
    } catch (error) {
        logger.error(`Erro ao definir jogador como pronto: ${error.message}`);
        next(error);
    }
};

const startGame = async (req, res, next) => {
    try {
        logger.info(`Iniciando jogo. ID do jogo: ${req.body.game_id}`);
        const result = await gameService.startGame(req.body);
        logger.info(`Jogo iniciado com sucesso. ID do jogo: ${req.body.game_id}`);
        res.status(200).json(result);
    } catch (error) {
        logger.error(`Erro ao iniciar jogo: ${error.message}`);
        next(error);
    }
};

const leaveGame = async (req, res, next) => {
    try {
        logger.info(`Jogador saindo do jogo. ID do jogo: ${req.body.game_id}, ID do jogador: ${req.body.player_id}`);
        const result = await gameService.leaveGame(req.body);
        logger.info(`Jogador saiu do jogo com sucesso. ID do jogo: ${req.body.game_id}, ID do jogador: ${req.body.player_id}`);
        res.status(200).json(result);
    } catch (error) {
        logger.error(`Erro ao sair do jogo: ${error.message}`);
        next(error);
    }
};

const endGame = async (req, res, next) => {
    try {
        const result = await gameService.endGame(req.body);
        logger.info(`Jogo finalizado com sucesso. ID do jogo: ${req.body.game_id}`);
        return res.status(200).json(result);
    } catch (error) {
        logger.error(`Erro ao finalizar jogo: ${error.message}`);
        next(error);
    }
};

export const getGameState = async (req, res, next) => {
    try {
        logger.info(`Buscando estado do jogo. ID do jogo: ${req.params.id}`);
        const result = await gameService.getGameState(req.params.id);
        logger.info(`Estado do jogo recuperado com sucesso. ID do jogo: ${req.params.id}`);
        return res.status(200).json(result);
    } catch (error) {
        logger.error(`Erro ao buscar estado do jogo: ${error.message}`);
        next(error);
    }
};

const getCurrentPlayer = async (req, res, next) => {
    try {
        logger.info(`Buscando jogador atual. ID do jogo: ${req.body.game_id}`);
        const result = await gameService.getCurrentPlayer(req.body);
        logger.info(`Jogador atual recuperado com sucesso. ID do jogo: ${req.body.game_id}`);
        return res.status(200).json(result);
    } catch (error) {
        logger.error(`Erro ao buscar jogador atual: ${error.message}`);
        next(error);
    }
};

export const getGameHistory = async (req, res, next) => {
    try {
        logger.info(`Fetching game history. Game ID: ${req.params.id}`);
        const result = await gameService.getGameHistory(req.params.id);
        logger.info(`Game history retrieved successfully. Game ID: ${req.params.id}`);
        return res.status(200).json(result);
    } catch (error) {
        logger.error(`Erro ao buscar ao buscar historico do game: ${error.message}`);
        next(error);
    }
};

const sayUno = async (req, res, next) => {
    try {
        const result = await gameService.sayUno(req.body);
        logger.info(`UNO said successfully`);
        res.status(200).json(result);
    } catch (error) {
        logger.error(`Error saying UNO: ${error.message}`);
        next(error);
    }
};

const challengeUno = async (req, res, next) => {
    try {
        const result = await gameService.challengeUno(req.body);
        logger.info(`UNO challenge processed.`);
        res.status(200).json(result);
    } catch (error) {
        logger.error(`Error challenging UNO: ${error.message}`);
        next(error);
    }
};

export default {
    createGame,
    getGame,
    updateGame,
    deleteGame,
    playerList,
    joinGame,
    setPlayerReady,
    startGame,
    leaveGame,
    endGame,
    getGameState,
    getCurrentPlayer,
    getGameHistory,
    sayUno,
    challengeUno
};