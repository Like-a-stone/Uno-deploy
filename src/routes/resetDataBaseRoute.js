import express from 'express';
import sequelize from '../config/database.js';
import logger from '../config/logger.js';

const router = express.Router();

const ADMIN_TOKEN = process.env.ADMIN_RESET_TOKEN || 'Xn9LZIzHJWU3ZN1YUhx+ATVrVpUXDEDjng7/8WdmKGFax4OdSUQQI4YIwc3fCQkR';

const checkAdminToken = (req, res, next) => {
  const token = req.headers['admin-token'];

  if (token === ADMIN_TOKEN) {
      next();
  } else {
      res.status(403).json({ error: 'Access denied. Invalid admin token.' });
  }
};

router.post('', checkAdminToken, async (req, res, next) => {
  try {
      await sequelize.sync({ force: true });
      logger.info('Database reset successfully');
      res.status(200).json({ message: 'Database reset successfully' });
  } catch (error) {
      logger.error('Error resetting database:', error);
      res.status(500).json({ error: 'Failed to reset database' });
  }
});

export default router;