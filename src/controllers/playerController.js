import playerService from '../services/playerService.js';
import authService from '../services/authService.js';
import logger from '../config/logger.js';

const createPlayer = async (req, res, next) => {
    try {
      logger.info(`Criando novo jogador`);
      const playerResponse = await playerService.createPlayer(req.body);
      logger.info(`Jogador criado com sucesso. ID: ${playerResponse.id}`);
      res.status(201).json(playerResponse);
    } catch (error) {
      logger.error(`Erro ao criar jogador: ${error.message}`);
      next(error);
    }
  };

const getPlayer = async (req, res, next) => {
    try {
        logger.info(`Buscando jogador. ID: ${req.player.id}`);
        const player = await playerService.getPlayer(req.player.id);
        logger.info(`Jogador recuperado com sucesso. ID: ${req.player.id}`);
        res.status(200).json(player);
    } catch (error){
        logger.error(`Erro ao buscar jogador: ${error.message}`);
        next(error);
    }
};

const updatePlayer = async (req, res, next) => {
    try {
        logger.info(`Atualizando jogador. ID: ${req.player.id}`);
        const updatedPlayer = await playerService.updatePlayer(req.player.id, req.body);
        logger.info(`Jogador atualizado com sucesso. ID: ${req.player.id}`);
        res.status(200).json(updatedPlayer);
    } catch (error) {
        logger.error(`Erro ao atualizar jogador: ${error.message}`);
        next(error);
    }
};

const deletePlayer = async (req, res, next) => {
    try {
        logger.info(`Deletando jogador. ID: ${req.player.id}`);
        const result = await playerService.deletePlayer(req.player.id);
        logger.info(`Jogador deletado com sucesso. ID: ${req.player.id}`);
        res.status(204).send(result);
    } catch (error) {
        logger.error(`Erro ao deletar jogador: ${error.message}`);
        next(error);
    }
};

/**
 * Controlador para o login do jogador (Player).
 * Este método autentica o jogador com email e senha, gera tokens de acesso (JWT),
 * define um Refresh Token no cookie e retorna o Access Token na resposta.
 *
 * @param {Object} req - Objeto da requisição HTTP. Deve conter `email` e `password` em `req.body`.
 * @param {Object} res - Objeto da resposta HTTP, usado para enviar os tokens e mensagens para o cliente.
 * @param next Função de callback para passar o controle para o próximo middleware.
 * @returns {void}
 */
const loginPlayer = async (req, res, next) => {
    try {
        logger.info(`Tentativa de login. Email: ${req.body.email}`);
        const { player, accessToken, refreshToken } = await authService.loginPlayer(req.body);
        logger.info(`Login bem-sucedido. ID do jogador: ${player.id}`);

        res.cookie('jwt', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.cookie('access', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 15 * 60 * 1000,
        });

        return res.json({ 
            message: 'Login successful',
            accessToken,
            player: player.name });
    } catch (error) {
        logger.error(`Erro no login: ${error.message}`);
        next(error);
    }
};

/**
 * Controlador para renovação do Access Token utilizando um Refresh Token.
 * Este método valida o Refresh Token armazenado no cookie e, se for válido, gera um novo Access Token
 * para o cliente, permitindo que o usuário continue autenticado sem precisar fazer login novamente.
 *
 * @param {Object} req - Objeto da requisição HTTP. Deve conter o Cookie com o Refresh Token (`req.cookies.jwt`).
 * @param {Object} res - Objeto da resposta HTTP, usado para retornar o novo Access Token ou códigos de erro.
 * @param next Função de callback para passar o controle para o próximo middleware.
 * @returns {void}
 */
const refreshToken = async (req, res, next) => {
    try {
        logger.info(`Tentativa de renovação de token`);
        const refreshToken = req.cookies.jwt;
        const newAccessToken = await authService.refreshAccessToken(refreshToken);
        logger.info(`Token renovado com sucesso`);
        return res.json({ accessToken: newAccessToken });
    } catch (error) {
        logger.error(`Erro na renovação de token: ${error.message}`);
        next(error);
    }
};
/**
 * Controlador para logout do jogador (Player).
 * Remove o Refresh Token armazenado no cookie, encerrando a sessão do usuário no cliente.
 *
 * @param {Object} req - Objeto da requisição HTTP. Não utilizado diretamente neste método.
 * @param {Object} res - Objeto da resposta HTTP, usado para limpar o cookie e responder ao cliente.
 * @param next Função de callback para passar o controle para o próximo middleware.
 * @returns {void}
 */
const logout = async (req, res, next) => {
    try {
        logger.info(`Tentativa de logout`);
        const refreshToken = req.cookies.jwt;
        const accessToken = req.headers.authorization?.split(' ')[1];
        
        await authService.logoutPlayer(refreshToken, accessToken);

        res.clearCookie('jwt', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict'
        });
        res.clearCookie('access', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict'
        });

        logger.info(`Logout realizado com sucesso`);
        res.status(200).json({ message: "Logout realizado com sucesso" });
    } catch (error) {
        logger.error(`Erro no logout: ${error.message}`);
        next(error);
    }
};

export default {
    createPlayer,
    getPlayer,
    refreshToken,
    logout,
    loginPlayer,
    updatePlayer,
    deletePlayer,
};