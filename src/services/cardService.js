import { CardModel } from '../models/card.js';
import { PlayerGameModel } from "../models/playerGame.js";
import { PlayerModel } from "../models/player.js";
import { NotFoundError, AuthError, DeckError } from "../utils/customError.js";
import { validateAccessToken } from '../utils/tokenValidator.js';
import { Functor } from "../utils/Functor.js";
import gameService from './gameService.js';
import { GameLogModel } from '../models/gameLog.js';
import scoreHistoryService from './scoreHistoryService.js';
import { GameModel } from '../models/game.js';

const createCardService = async (cardData) => {
    const card = await CardModel.createCard(cardData);
    return new Functor(card)
        .map(c => {
            if (!c) throw new NotFoundError('Card not found');
            return c;
        })
        .getValue();
};

const getCardService = async (cardId) => {
    return new Functor(await CardModel.getCardById(cardId))
        .map(card => {
            if (!card) throw new NotFoundError('Card not found');
            return card;
        })
        .getValue();
};

const updateCardService = async (cardId, cardData) => {
    const card = await CardModel.updateCard(cardId, cardData);
    return new Functor(card)
        .map(c => {
            if (!c) throw new NotFoundError('Card not found');
            return c;
        })
        .getValue();
};

const deleteCardService = async (cardId) => {
    const deletedCard = await CardModel.deleteCard(cardId);
    return new Functor(deletedCard)
        .map(c => {
            if (!c) throw new NotFoundError('Card not found');
            return { message: "Card deleted successfully" };
        })
        .getValue();
};

const getPlayerCards = async ({ game_id, access_token }) => {
    const playerId = await validateAccessToken(access_token);

    if (!playerId) throw new AuthError("Invalid access token");

    const result = await new Functor(playerId)
        .map(async (playerId) => {
            const playerGame = await PlayerGameModel.getPlayerGameById(playerId, game_id);
            if (!playerGame) throw new AuthError("Player not in game");
            return playerId;
        })
        .getValue();

    const cards = await CardModel.getCardsByPlayerAndGame(result, game_id);
    return cards.map(card => ({
        color: card.color,
        value: card.value
    }));
}

/**
 * Valida se uma carta específica está na mão do jogador.
 *
 * @function validateCardInPlayerHand
 * @param {Object} cardToPlay - A carta que o jogador deseja jogar.
 * @param {string} cardToPlay.color - A cor da carta a ser jogada.
 * @param {string} cardToPlay.value - O valor da carta a ser jogada.
 * @param {Array<Object>} playerCards - Array de cartas na mão do jogador.
 * @returns {number|null} O ID da carta se encontrada, ou null se não encontrada.
 *
 * @description
 * Esta função verifica recursivamente se a carta que o jogador deseja jogar está presente
 * em sua mão. A comparação é feita de forma case-insensitive para cor e valor.
 */
const validateCardInPlayerHand = (cardToPlay, playerCards) => {
    if (playerCards.length === 0) return null;

    const [firstCard, ...restCards] = playerCards;
    if (firstCard.color.toLowerCase() === cardToPlay.color.toLowerCase() && 
        firstCard.value.toLowerCase() === cardToPlay.value.toLowerCase()) {
        return firstCard.id;
    }

    return validateCardInPlayerHand(cardToPlay, restCards);
};

/**
 * Verifica recursivamente se há um vencedor no jogo.
 *
 * @async
 * @function checkWinnerRecursively
 * @param {string} gameId - O ID do jogo a ser verificado.
 * @param {Array<Object>} players - Array de objetos representando os jogadores no jogo.
 * @returns {Promise<string|null>} O ID do jogador vencedor, ou null se não houver vencedor.
 *
 * @description
 * Esta função verifica recursivamente se algum jogador no jogo não tem mais cartas,
 * indicando que ele é o vencedor. A função percorre a lista de jogadores da seguinte forma:
 * 
 */
const checkWinnerRecursively = async (gameId, players) => {
    if (players.length === 0) {
        return null;
    }

    const [currentPlayer, ...restPlayers] = players;
    const cards = await CardModel.getCardsByPlayerAndGame(currentPlayer.playerId, gameId);

    if (cards.length === 0) {
        return currentPlayer.playerId;
    }

    return checkWinnerRecursively(gameId, restPlayers);
};

const playCard = async ( game_id, { access_token, cardPlayed, newColor }) => {
    const playerId = await validateAccessToken(access_token);
    const playerGame = await PlayerGameModel.getPlayerGameById(playerId, game_id);
    const game = await GameModel.getGameById(game_id);

    if (game.status === 'finished') throw new AuthError("Game is already finished");
    
    let result;
    
    if (!playerGame) throw new AuthError("Player is not part of this game");

    const currentPlayerInfo = await gameService.getCurrentPlayer({game_id: game_id});
    if (currentPlayerInfo.player_id !== playerId) throw new AuthError("It's not your turn to play");
    
    const [color, value] = cardPlayed.split(' ');
 
    const playerCards = await CardModel.getCardsByPlayerAndGame(playerId, game_id);

    const validCardId = validateCardInPlayerHand({ color, value }, playerCards);

    if (!validCardId) throw new AuthError("The played card does not belong to the player");

    const topDiscardCard = await CardModel.getTopDiscardCard(game_id);
    if (!topDiscardCard) throw new DeckError("No top discard card found");

    const playedCard = playerCards.find(card => card.id === validCardId);

    if (playedCard.color !== game.currentColor && playedCard.value !== topDiscardCard.value && playedCard.color !== 'wild') {
        throw new DeckError("Invalid card. Please play a card that matches the top card on the discard pile.");
    }

    await GameLogModel.createLog({
        gameId: game_id,
        playerId: playerId,
        action: `played ${color} ${value}`
    });

    const specialActionResult = await processSpecialCardAction(playedCard, game_id, newColor);
    

    if (Object.keys(specialActionResult).length > 0) {
        result = { ...result, ...specialActionResult };
    }
    
    await CardModel.updateCard(playedCard.id, { location: 'discard' });

    await scoreHistoryService.updateScoreOnCardPlay(playerId, game_id);

    const newTopDiscardCard = await CardModel.getTopDiscardCard(game_id);


    result = {
        message: `Card ${cardPlayed} played successfully`,
        topDiscardCard: {
            color: newTopDiscardCard.color,
            value: newTopDiscardCard.value,
            location: newTopDiscardCard.location
        }
    };

    return result;
};

/**
 * Processa ações especiais baseadas no valor da carta jogada no UNO.
 *
 * @async
 * @function processSpecialCardAction
 * @param {string} cardValue - O valor da carta jogada (ex: 'skip', 'reverse', 'draw_two', 'wild', 'wild_draw_four').
 * @param {string} gameId - O ID do jogo onde a ação está ocorrendo.
 * @param {string} playerId - O ID do jogador que jogou a carta.
 * @returns {Promise<Object>} Um objeto contendo o resultado da ação especial.
 *
 * @description
 * Esta função lida com as ações especiais das cartas no jogo UNO. Dependendo do valor da carta,
 * ela chama diferentes métodos do gameService para executar a ação apropriada.
 *
 * As ações especiais incluem:
 * - 'skip': Pula o próximo jogador.
 * - 'reverse': Inverte a direção do jogo.
 * - 'draw_two': Faz o próximo jogador comprar duas cartas.
 * - 'wild' e 'wild_draw_four': Atualmente não implementadas (placeholder para futura implementação).
 *
 * Se a carta não for especial (caso default), nenhuma ação adicional é tomada.
 *
 * @throws {Error} Pode lançar erros provenientes das funções do gameService chamadas.
 *
 * @example
 * const result = await processSpecialCardAction('skip', 'game123', 'player456');
 * console.log(result); // { skippedPlayer: 'Player2', nextPlayer: 'Player3' }
 */
const processSpecialCardAction = async (playedCard, gameId, newColor) => {
    let result = {};
    
    switch (playedCard.value.toLowerCase()) {
        case 'skip':
            const skipResult = await gameService.handleSkipCard(gameId, playedCard);
            result = skipResult;
            break;
            
        case 'reverse':
            const reverseResult = await gameService.reverseGameDirection(gameId, playedCard);
            result = reverseResult;
            break;
            
        case 'draw_two':
            result = await gameService.handleDraw2Card(gameId, playedCard);
            break;
            
        case 'wild':
            result = await gameService.handleWildCard(gameId, newColor);
            break;

        case 'wild_draw_four':
            result = await gameService.handleWildDraw4Card(gameId, newColor);
            break;
        default:
            await gameService.handleNormalTurn(gameId, playedCard);
            break;
    }
    return result;
};

const getPlayersCardsInGame = async (gameId, includeId = true) => {
    const players = await PlayerGameModel.getPlayersGameId(gameId);
    if (players.length === 0) {
        throw new NotFoundError('No players found in this game');
    }

    const playersCards = await Promise.all(players.map(async (player) => {
        const cards = await CardModel.getCardsByPlayerAndGame(player.playerId, gameId);
        const playerInfo = await PlayerModel.getById(player.playerId);

        const playerCardInfo = {
            player: playerInfo.name,
            cardCount: cards.length
        };

        if (includeId) {
            playerCardInfo.playerId = player.playerId;
        }

        return playerCardInfo;
    }));

    return playersCards;
};

export default {
    createCardService,
    getCardService,
    updateCardService,
    deleteCardService,
    getPlayerCards,
    playCard,
    validateCardInPlayerHand,
    getPlayersCardsInGame,
    checkWinnerRecursively,
    processSpecialCardAction
};