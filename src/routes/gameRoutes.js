import { Router } from 'express';
import gameController from '../controllers/gameController.js';

const router = Router();

router.post('/', gameController.createGame);
router.get('/:id', gameController.getGame);
router.put('/:id', gameController.updateGame);
router.delete('/:id', gameController.deleteGame);
router.get('/:id/players/', gameController.playerList);
router.post('/join', gameController.joinGame);
router.post('/ready', gameController.setPlayerReady);
router.post('/start', gameController.startGame);
router.post('/leavegame', gameController.leaveGame);
router.post('/endgame', gameController.endGame);
router.get("/:id/status", gameController.getGameState);
router.post('/currentplayer', gameController.getCurrentPlayer);
router.get('/:id/history', gameController.getGameHistory);
router.patch('/say-uno', gameController.sayUno);
router.post('/challenge-uno', gameController.challengeUno);

export default router;
