import dotenv from 'dotenv';
dotenv.config();

/**
 * Configurações para JWT (JSON Web Token), incluindo segredos e tempos de expiração.
 * Utiliza variáveis de ambiente para maior segurança e configura valores padrão caso as variáveis não sejam definidas.
 */
export const jwtConfig = {
    accessTokenSecret : process.env.ACESS_TOKEN_SECRET || 'AnyTokenSecret',
    refreshTokenSecret : process.env.REFRESH_TOKEN_SECRET || 'AnyREFRESHTokenSecret',
    accessTokenExpiresIn: '120m',
    refreshTokenExpiresIn: '7d'
};