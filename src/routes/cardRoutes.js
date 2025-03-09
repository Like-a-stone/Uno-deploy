import { Router } from 'express';
import cardController from '../controllers/cardController.js';

const router = Router();

router.post('/', cardController.createCard);
router.get('/:id', cardController.getCard);
router.put('/:id', cardController.updateCard);
router.delete('/:id', cardController.deleteCard);
router.post('/take', cardController.takeCard);
router.post('/player-cards', cardController.getPlayerCards);
router.put('/play/:id', cardController.playCard);

export default router;
