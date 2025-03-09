import {DataTypes} from 'sequelize';
import sequelize from '../config/database.js';
import bcrypt from 'bcryptjs';
import {NotFoundError} from "../utils/customError.js";
import {Functor} from "../utils/Functor.js";
import {DatabaseError} from "../utils/customError.js";

const Player = sequelize.define('Player', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true  // Validação Autonoma para garantir que é um e-mail válido
    }
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    set(value) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(value, salt)
      this.setDataValue('password', hash);
    }
  }
}, {
  timestamps: true,
  tableName: 'Player',
  defaultScope: {
    attributes: {exclude: ['password', 'id']}  // Consulta padrão não incluirá senha.
  },
  scopes: {
    withPassword: {
      attributes: {include: ['password']}, // Consulta 'withPassword' incluir senha.
      where: {}
    },
    withID: {
      attributes: {include: ['id']} // inclui ID .
    }
  }
});

const formatPlayerResponse = (player) => ({
  id: player.id,
  name: player.name,
  age: player.age,
  email: player.email,
  score: player.score
});

export class PlayerModel {
  static async create(newPlayer) {
    try {
      return new Functor(await Player.create(newPlayer))
          .map(formatPlayerResponse)
          .getValue();
    } catch (error) {
      throw new DatabaseError(`Error creating player: ${error.message}`);
    }
  }

  static async getById(playerId) {
    try {
      return new Functor(await Player.scope('withID').findByPk(playerId))
          .map(player => {
            if (!player) throw new NotFoundError(`Player with id ${playerId} not found`);
            return player;
          })
          .getValue();
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Error fetching player: ${error.message}`);
    }
  }

  static async update(playerId, playerData) {
    try {
      return new Functor(await Player.scope('withPassword').findByPk(playerId))
          .map(async player => {
            if (!player) throw new NotFoundError(`Player with id ${playerId} not found`);
            if (playerData.password) {
              player.password = playerData.password;
              await player.save();
              delete playerData.password;
            }
            await player.update(playerData);
            return player;
          })
          .getValue();
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Error updating player: ${error.message}`);
    }
  }

  static async delete(playerId) {
    try {
      return new Functor(await Player.scope("withID").findByPk(playerId))
          .map(async player => {
            if (!player) throw new NotFoundError(`Player with id ${playerId} not found`);
            await player.destroy();
            return true;
          })
          .getValue();
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Error deleting player: ${error.message}`);
    }
  }

  static async getByEmailWithPassword(email) {
    try {
      return new Functor(await Player.scope('withPassword').findOne({ where: { email } }))
          .map(player => {
            if (!player) throw new NotFoundError(`Player with email ${email} not found`);
            return player;
          })
          .getValue();
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Error fetching player by email: ${error.message}`);
    }
  }

  static async getByEmail(email) {
    try {
      return new Functor(await Player.findOne({ where: { email } }))
          .map(player => {
            if (!player) return null;
            return player;
          })
          .getValue();
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Error fetching player by email: ${error.message}`);
    }
  }
}

export default Player;
