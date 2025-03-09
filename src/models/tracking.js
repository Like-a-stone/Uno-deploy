import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { DatabaseError } from "../utils/customError.js";
import {Functor} from "../utils/Functor.js";

const Tracking = sequelize.define('Tracking', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  responseTime: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  endpointAccess: {
    type: DataTypes.STRING,
    allowNull: false
  },
  requestMethod: {
    type: DataTypes.STRING,
    allowNull: false
  },
  statusCode: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

export class TrackingModel {
    static async getAllTracking() {
        try {
            const results = await Tracking.findAll({
                attributes: ['endpointAccess', 'requestMethod', 'responseTime', 'statusCode'],
                raw: true
            });
            return results;
        } catch (error) {
            throw new DatabaseError(`Error getting all tracking data: ${error.message}`);
        }
    }

    static async addTracking(trackingData) {
        try {
            return new Functor(await Tracking.create(trackingData)).getValue();
        } catch (error) {
            throw new DatabaseError(`Error adding tracking: ${error.message}`);
        }
    }
}

export default TrackingModel;