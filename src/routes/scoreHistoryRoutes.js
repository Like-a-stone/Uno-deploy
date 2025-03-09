import express from 'express';
import ScoreController from '../controllers/scoreHistoryController.js';

const router = express.Router();

router.post('/', ScoreController.createScore);
router.get('/:id', ScoreController.getScoreById);
router.put('/:id', ScoreController.updateScore);
router.delete('/:id', ScoreController.deleteScore);
router.post('/gamescores', ScoreController.getGameScores);

export default router;
