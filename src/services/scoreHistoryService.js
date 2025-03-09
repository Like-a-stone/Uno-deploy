import {ScoreHistoryModel} from '../models/scoreHistory.js';
import {NotFoundError} from "../utils/customError.js";
import {Functor} from "../utils/Functor.js";
import {CardModel} from '../models/card.js';
import {PlayerModel} from '../models/player.js';
import {PlayerGameModel} from '../models/playerGame.js';

const POINTS_PER_CARD = 10; 

const getScoreService = async (scoreId) => {
    return new Functor(await ScoreHistoryModel.getScoreById(scoreId))
        .map(score => {
            if (!score) throw new NotFoundError('Score not found');
            return score;
        })
        .getValue();
};

const updateScoreService = async (scoreId, scoreData) => {
    return new Functor(scoreData)
        .map(async validData => await ScoreHistoryModel.updateScore(scoreId, validData))
        .map(async score => {
            if (!await score) throw new NotFoundError('Score not found');
            return score;
        })
        .getValue();
};

const deleteScoreService = async (scoreId) => {
    return new Functor(await ScoreHistoryModel.deleteScore(scoreId))
        .map(result => {
            if (!result) throw new NotFoundError('Score not found');
            return {message: "Score deleted successfully"};
        })
        .getValue();
};

const getFormattedScores = async (gameId) => {
    const scores = await ScoreHistoryModel.getGameScores(gameId);
    return scores.reduce((obj, score) => {
        obj[score.playerName] = score.score;
        return obj;
    }, {});
};

const initializeScore = async (gameId, playerId) => {
    const initialScore = await ScoreHistoryModel.createScore(playerId, gameId, 0);

    const playerCards = await CardModel.getCardsByPlayerAndGame(playerId, gameId);
    const cardCount = playerCards.length;

    const score = Math.max(0, POINTS_PER_CARD * (7 - cardCount));

    const updatedScore = await ScoreHistoryModel.updateScore(playerId, gameId, score);

    return updatedScore;
};

const updateScoreOnCardPlay = async (playerId, gameId) => {
    const playerCards = await CardModel.getCardsByPlayerAndGame(playerId, gameId);
    const cardCount = playerCards.length;

    const score = Math.max(0, POINTS_PER_CARD * (7 - cardCount));

    const updatedScore = await ScoreHistoryModel.updateScore(playerId, gameId, score);
    return updatedScore;
};

const updateScoreOnCardDraw = async (playerId, gameId) => {
    const playerCards = await CardModel.getCardsByPlayerAndGame(playerId, gameId);
    const cardCount = playerCards.length;

    const score = Math.max(0, POINTS_PER_CARD * (7 - cardCount));

    const updatedScore = await ScoreHistoryModel.updateScore(playerId, gameId, score);
    return updatedScore;
};

const getPlayerScore = async (playerId, gameId) => {
    const score = await ScoreHistoryModel.getScoreById(playerId, gameId);
    if (!score) {
        throw new NotFoundError(`Score not found for player ${playerId} in game ${gameId}`);
    }
    return score;
};

const updateScoresOnGameEnd = async (gameId) => {
    const players = await PlayerGameModel.getPlayersGameId(gameId);
    if (players.length === 0) {
        throw new NotFoundError(`No players found for game ${gameId}`);
    }

    for (const player of players) {
        const playerCards = await CardModel.getCardsByPlayerAndGame(player.playerId, gameId);
        const cardCount = playerCards.length;

        const finalScore = Math.max(0, POINTS_PER_CARD * (7 - cardCount));
        await ScoreHistoryModel.updateScore(player.playerId, gameId, finalScore);

        const currentPlayer = await PlayerModel.getById(player.playerId);
        const updatedScore = (currentPlayer.score || 0) + finalScore;
        await PlayerModel.update(player.playerId, { score: updatedScore });
    }
};

export default {
    getScoreService,
    updateScoreService,
    deleteScoreService,
    initializeScore,
    updateScoreOnCardPlay,
    updateScoreOnCardDraw,
    getPlayerScore,
    getFormattedScores,
    updateScoresOnGameEnd,
};
