import express from 'express';
import statsController from '../controllers/statsController.js';

const router = express.Router();

router.get('/requests', statsController.getRequestStats);
router.get('/response-times', statsController.getResponseTimeStats);
router.get('/status-codes', statsController.getStatusCodeStats);
router.get('/popular-endpoints', statsController.getPopularEndpoints);


export default router;