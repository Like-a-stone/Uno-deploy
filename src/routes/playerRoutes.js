import { Router } from 'express';
import playerController from '../controllers/playerController.js';
import { authenticateToken } from '../middleware/authenticateToken.js';

const router = Router();

// Rotas Abertas
router.post('/', playerController.createPlayer);
router.get('/refresh/', playerController.refreshToken);
router.post('/login/', playerController.loginPlayer);

// Rotas Protegidas com Token
router.get('/profile/', authenticateToken, playerController.getPlayer); // Nota: alterado de ':id' para 'profile'
router.put('/', authenticateToken, playerController.updatePlayer);
router.delete('/', authenticateToken, playerController.deletePlayer);
router.post('/logout', authenticateToken, playerController.logout); // Protegido
// 2
export default router;