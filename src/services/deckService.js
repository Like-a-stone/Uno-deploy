import { CardModel } from '../models/card.js';
import { PlayerGameModel } from "../models/playerGame.js";
import { NotFoundError, AuthError, DeckError, GameStateError } from "../utils/customError.js";
import { Functor } from "../utils/Functor.js"; 
import { validateAccessToken } from '../utils/tokenValidator.js';
import gameService from './gameService.js';
import { GameLogModel } from '../models/gameLog.js';
import scoreHistoryService from './scoreHistoryService.js';
import cardService from './cardService.js';

const DEFAULT_CARDS_PER_PLAYER = 7;

const initializeDeck = async (gameId) => {
    const colors = ['red', 'blue', 'green', 'yellow'];
    const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'reverse', 'skip', 'draw_two'];
    const wildCards = ['wild', 'wild_draw_four'];

    let cards = [];
    colors.forEach(color => {
        values.forEach(value => {
            cards.push({ color, value, gameId, location: 'deck' });
            if (value !== '0') cards.push({ color, value, gameId, location: 'deck' });
        });
    });
    cards = cards.concat(
        Array(4).fill().flatMap(() =>
            wildCards.map(value => ({ color: 'wild', value, gameId, location: 'deck' }))
        )
    );

    const shuffledCards = shuffleArray(cards);
    return await CardModel.bulkCreateCards(shuffledCards);
};

const shuffleArray = (array) =>
    new Functor([...array])
        .map(arr => {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        })
        .getValue();

const dealInitialCards = async (gameId, cardsPerPlayer = DEFAULT_CARDS_PER_PLAYER) => {
    const players = await PlayerGameModel.getSortedPlayersByGameId(gameId);
    if (!players || players.length === 0) throw new NotFoundError("No players found for the game");

    await dealCardsRecursively(gameId, players, cardsPerPlayer);

    const playerCard = await cardService.getPlayersCardsInGame(gameId, false);
    return playerCard;
};

const dealCardsRecursively = async (gameId, players, cardsPerPlayer, currentRound = 0, dealtCards = {}) => {
    if (currentRound >= cardsPerPlayer) {
        return dealtCards;
    }

    for (const player of players) {
        const card = await CardModel.takeCardFromDeck(gameId);
        if (!card) {
            throw new DeckError("Not enough cards in the deck");
        }

        await CardModel.updateCard(card.id, { playerId: player.playerId, location: 'hand' });

        if (!dealtCards[player.playerId]) {
            dealtCards[player.playerId] = [];
        }
        dealtCards[player.playerId].push({ color: card.color, value: card.value });
    }

    return dealCardsRecursively(gameId, players, cardsPerPlayer, currentRound + 1, dealtCards);
};

const initializeGameWithCard = async (gameId) => {
    const initialCard = await CardModel.selectInitialCard(gameId);
    if (!initialCard) {
        throw new NotFoundError(`No suitable initial card found for game ${gameId}`);
    }
    return initialCard;
};

const drawCards = async (gameId, playerId, numberOfCards) => {
    const playerGame = await PlayerGameModel.getPlayerGameById(playerId, gameId);
    if (!playerGame) throw new AuthError("Player not in game");

    const playerCards = await CardModel.getCardsByPlayerAndGame(playerId, gameId);
    if (playerCards.length === 1) {
        if (playerGame.saidUno) {
            await PlayerGameModel.setSaidUno(playerId, gameId, false);
        } 
    }
    const drawnCards = [];
    for (let i = 0; i < numberOfCards; i++) {
        const card = await CardModel.takeCardFromDeck(gameId);
        if (!card) {
            if (i === 0) {
                throw new DeckError('No cards left in the deck');
            } else {
                throw new DeckError(`Not enough cards in the deck. Drew ${i} cards out of ${numberOfCards}`);
            }
        }
        const updated = await CardModel.updateCard(card.id, {
            playerId,
            location: 'hand'
        });
        if (!updated) {
            throw new DeckError('Failed to update card');
        }
        drawnCards.push(`${updated.color} ${updated.value}`);
    }
    return drawnCards;
};

const takeCardFromDeck = async ({ game_id, access_token } ) => {
    const playerId = await validateAccessToken(access_token);

    const currentPlayer = await gameService.getCurrentPlayer({ game_id });
    if (currentPlayer.player_id !== playerId) {
        throw new GameStateError("It's not your turn to draw a card");
    }

    const drawnCards = await drawCards(game_id, playerId, 1);
    const cardDrawn = drawnCards[0];
    const nextPlayer = await gameService.updateCurrentPlayerMoviment(game_id);

    await scoreHistoryService.updateScoreOnCardDraw(playerId, game_id);

    await GameLogModel.createLog({
        gameId: game_id,
        playerId: playerId,
        action: `drew a card from the deck`
    });

    return {
        message: `${currentPlayer.player_name} drew a card from the deck.`,
        cardDrawn: cardDrawn,
        nextPlayer: nextPlayer.current_player
    };
};

const initializeTestDeck = async (gameId) => {
    const testCards = [
        { color: 'red', value: '7', gameId, location: 'deck' },
        { color: 'blue', value: '5', gameId, location: 'deck' },
        { color: 'green', value: 'skip', gameId, location: 'deck' },
        { color: 'yellow', value: 'reverse', gameId, location: 'deck' },
        { color: 'wild', value: 'wild', gameId, location: 'deck' },
        { color: 'wild', value: 'wild_draw_four', gameId, location: 'deck' },
    ];
    return await CardModel.bulkCreateCards(testCards);
};

const dealTestCards = async (gameId, players) => {
    const dealtCards = {};
    const testCards = [
        { color: 'red', value: '7' },
        { color: 'blue', value: '7' },
    ];

    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const card = testCards[i];
        await CardModel.createCard({
            ...card,
            gameId,
            playerId: player.playerId,
            location: 'hand'
        });
        dealtCards[player.playerId] = [card];
    }
    const playerCard = await cardService.getPlayersCardsInGame(gameId, false);
    return playerCard;
};

const getTestInitialCard = async (gameId) => {
    const testInitialCard = { color: 'red', value: '5', gameId, location: 'discard' };
    return await CardModel.createCard(testInitialCard);
};

export default {
    initializeDeck,
    dealInitialCards,
    initializeGameWithCard,
    takeCardFromDeck,
    drawCards,
    shuffleArray,
    dealCardsRecursively,
    initializeTestDeck,
    getTestInitialCard,
    dealTestCards
};