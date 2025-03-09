import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/database.js';
import Game from './game.js';
import {NotFoundError} from "../utils/customError.js";
import {Functor} from "../utils/Functor.js";
import {DatabaseError} from "../utils/customError.js";

const Card = sequelize.define('Card', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    color: {
        type: DataTypes.ENUM('red', 'blue', 'green', 'yellow', 'wild'),
        allowNull: false
    },
    value: {
        type: DataTypes.STRING, // '0-9', 'reverse', 'skip', 'draw_two', 'wild', 'wild_draw_four'
        allowNull: false
    },
    gameId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Game,
            key: 'id'
        }
    },
    order: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    playerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Player',
            key: 'id'
        }
    },
    location: {
        type: DataTypes.STRING,
        defaultValue: 'deck'
    }
}, {
    timestamps: true,
    tableName: 'Card'
});

export class CardModel {
    static async createCard(cardData) {
        try {
            const card = await Card.create(cardData);
            return new Functor(card)
                .map(c => c ? c : null)
                .getValue();
        } catch (error) {
            throw new DatabaseError(`Error creating card: ${error.message}`);
        }
    }

    static async getCardById(cardId) {
        try {
            const card = await Card.findByPk(cardId);
            return new Functor(card)
                .map(c => {
                    if (!c) throw new NotFoundError(`Card with id ${cardId} not found`);
                    return c;
                })
                .getValue();
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            throw new DatabaseError(`Error fetching card: ${error.message}`);
        }
    }

    static async updateCard(cardId, cardData) {
        try {
            const card = await Card.findByPk(cardId);
            return new Functor(card)
                .map(async c => {
                    if (!c) throw new NotFoundError(`Card with id ${cardId} not found`);
                    await c.update(cardData);
                    return c;
                })
                .getValue();
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            throw new DatabaseError(`Error updating card: ${error.message}`);
        }
    }

    static async takeCardFromDeck(gameId) {
        try {
            return new Functor(await Card.findOne({
                where: { gameId, location: 'deck', playerId: null },
                order: sequelize.random()
            }))
                .map(card => {
                    if (!card) throw new NotFoundError(`No cards available in the deck for game ${gameId}`);
                    return card;
                })
                .getValue();
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            throw new DatabaseError(`Error taking card from deck: ${error.message}`);
        }
    }

    static async deleteCard(cardId) {
        try {
            const card = await Card.findByPk(cardId);
            return new Functor(card)
                .map(async c => {
                    if (!c) throw new NotFoundError(`Card with id ${cardId} not found`);
                    await c.destroy();
                    return true;
                })
                .getValue();
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            throw new DatabaseError(`Error deleting card: ${error.message}`);
        }
    }

    static async bulkCreateCards(cards) {
        try {
            return new Functor(cards)
                .map(cardList => cardList.map((card, index) => ({
                    ...card,
                    order: index
                })))
                .map(sortedCards => Card.bulkCreate(sortedCards))
                .getValue();
        } catch (error) {
            throw new DatabaseError(`Error bulk creating cards: ${error.message}`);
        }
    }

    static async getCardsByPlayerAndGame(playerId, gameId) {
        try {
            const cards = await Card.findAll({
                where: { 
                    playerId: playerId,
                    gameId: gameId,
                    location: 'hand'
                }
            });
            return new Functor(cards)
                .map(c => c || [])
                .getValue();
        } catch (error) {
            throw new DatabaseError(`Error fetching player cards: ${error.message}`);
        }
    }

    static async selectInitialCard(gameId) {
        try {
            const card = await Card.findOne({
                where: { 
                    gameId: gameId,
                    location: 'deck',
                    playerId: null,
                    value: {
                        [Op.notIn]: ['wild', 'wild_draw_four']
                    }
                },
                order: [['order', 'ASC']]
            });
    
            if (!card) return null;
    
            await card.update({ location: 'discard' });
    
            return card;
        } catch (error) {
            throw new DatabaseError(`Error selecting initial card: ${error.message}`);
        }
    }

    static async getTopDiscardCard(gameId) {
        try {
            const topDiscardCard = await Card.findOne({
                where: { gameId: gameId, location: 'discard' },
                order: [['updatedAt', 'DESC']]
            });
            return topDiscardCard;

        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            throw new DatabaseError(`Error fetching top discard card: ${error.message}`);
        }
    }

    static async getDeckCardCount(gameId) {
        try {
            const count = await Card.count({
                where: { 
                    gameId: gameId, 
                    location: 'deck',
                    playerId: null
                }
            });
            return count;
        } catch (error) {
            throw new DatabaseError(`Error counting deck cards: ${error.message}`);
        }
    }
}

export default Card;