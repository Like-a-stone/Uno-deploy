import express from 'express';
import { createServer } from 'http';
import { initializeSocket, getIO } from './services/socketService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/database.js';
import playerRoutes from './routes/playerRoutes.js';
import gameRoutes from './routes/gameRoutes.js';
import cardRoutes from './routes/cardRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import scoreHistoryRoutes from './routes/scoreHistoryRoutes.js';
import defineAssociations from './models/associations.js';
import cookieParser from 'cookie-parser';
import errorHandler from './middleware/errorHandler.js';
import logger from './config/logger.js';
import { trackingMiddleware } from './middleware/trackingMiddleware.js';
import resetDataBaseRoute from './routes/resetDataBaseRoute.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

initializeSocket(server);

const connectedSockets = new Map();
const port = process.env.PORT || 3000;
const clientUrls = [process.env.CLIENT_URL, 'http://127.0.0.1:5500', 'http://localhost:5500'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || clientUrls.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}));

app.use((req, res, next) => {
  req.io = getIO;
  req.connectedSockets = connectedSockets;
  next();
});

app.use(express.json());
app.use(cookieParser());

app.use(trackingMiddleware);
app.use('/api/players', playerRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/scores', scoreHistoryRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/resetDB', resetDataBaseRoute);

app.use(errorHandler);
defineAssociations();

const startServer = async () => {
  try {
    await sequelize.sync({ alter: true });
    server.listen(port, () => {
      logger.info(`Servidor rodando em http://localhost:${port}`);
      logger.info(`Cliente permitido: ${clientUrls}`);
    });
  } catch (err) {
    logger.error('Erro ao conectar ao banco de dados:', err);
  }
};

startServer();

export default app;