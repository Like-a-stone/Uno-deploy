import Game from './game.js';
import Card from './card.js';
import Player from './player.js';
import ScoreHistory from './scoreHistory.js';
import PlayerGame from './playerGame.js';
import GameLog from './gameLog.js';

// Objetivo dessa função é define as associações entre os modelos
const defineAssociations = () => {

    // Um jogo (Game) pode ter muitas cartas (Card)
    Game.hasMany(Card, {foreignKey: 'gameId', onDelete: 'CASCADE'});

    // Cada carta (Card) pertence a um único jogo (Game)
    Card.belongsTo(Game, {foreignKey: 'gameId'});

    // Um jogador (Player) pode ter muitos registros de pontuação (ScoreHistory)
    Player.hasMany(ScoreHistory, {foreignKey: 'playerId'});

    // Um jogo (Game) pode ter muitos registros de pontuação (ScoreHistory)
    Game.hasMany(ScoreHistory, {foreignKey: 'gameId', onDelete: 'CASCADE'});

    // Cada registro de pontuação (ScoreHistory) pertence a um único jogador (Player)
    ScoreHistory.belongsTo(Player, {foreignKey: 'playerId'});

    // Cada registro de pontuação (ScoreHistory) pertence a um único jogo (Game)
    ScoreHistory.belongsTo(Game, {foreignKey: 'gameId'});

    // Um jogador (Player) pode participar de vários jogos (Game) e vice-versa
    Player.belongsToMany(Game, { through: PlayerGame, foreignKey: 'playerId' });
    Game.belongsToMany(Player, { through: PlayerGame, foreignKey: 'gameId', onDelete: 'CASCADE' });

    // Um jogador (Player) pode criar vários jogos
    Player.hasMany(Game, { foreignKey: 'creatorId', as: 'createdGames' });

    // Cada jogo pertence a um criador (Player)
    Game.belongsTo(Player, { foreignKey: 'creatorId', as: 'creator' });

    Game.hasMany(GameLog, { onDelete: 'CASCADE' });
    GameLog.belongsTo(Game);

    Player.hasMany(GameLog);
    GameLog.belongsTo(Player);
};
export default defineAssociations;