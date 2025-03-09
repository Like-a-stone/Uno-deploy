import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import {TokenError} from "../utils/customError.js";
import crypto from 'crypto';
import { Functor } from "../utils/Functor.js"; 

const RevokedRefreshToken = sequelize.define('RevokedRefreshToken', {
    token_hash: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    revoked_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

RevokedRefreshToken.revokeToken = async (token) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        return new Functor(hashedToken)
            .map(async hash => await RevokedRefreshToken.create({ token_hash: hash }))
            .getValue();
    } catch (error) {
        throw new TokenError(`Error revoking refresh token: ${error.message}`);
    }
};

RevokedRefreshToken.isTokenRevoked = async (token) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const revokedToken = await RevokedRefreshToken.findOne({ where: { token_hash: hashedToken } });
        return !!revokedToken;
    } catch (error) {
        console.error('Error checking refresh token revocation:', error);
        throw new TokenError(`Error checking refresh token revocation: ${error.message}`);
    }
};

export default RevokedRefreshToken;