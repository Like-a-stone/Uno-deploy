import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import {TokenError} from "../utils/customError.js";
import crypto from 'crypto';
import { Functor } from "../utils/Functor.js"; 

const RevokedAccessToken = sequelize.define('RevokedAccessToken', {
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
RevokedAccessToken.revokeToken = async (token) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        return new Functor(hashedToken)
            .map(async hash => await RevokedAccessToken.create({ token_hash: hash }))
            .getValue();
    } catch (error) {
        throw new TokenError(`Error revoking access token: ${error.message}`);
    }
};

RevokedAccessToken.isTokenRevoked = async (token) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const revokedToken = await RevokedAccessToken.findOne({ where: { token_hash: hashedToken } });
        return !!revokedToken;
    } catch (error) {
        console.error('Error checking token revocation:', error);
        throw new TokenError(`Error checking access token revocation: ${error.message}`);
    }
};

export default RevokedAccessToken;