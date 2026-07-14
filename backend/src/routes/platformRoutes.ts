import { Router } from 'express';
import { PlatformController } from '../controllers/platformController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Protect all platform routes
router.use(protect);

router.get('/', PlatformController.getPlatforms);
router.get('/stats', PlatformController.getPlatformStats);
router.post('/', PlatformController.createPlatform);
router.put('/:id', PlatformController.updatePlatform);
router.delete('/:id', PlatformController.deletePlatform);
router.patch('/:id/default', PlatformController.setDefaultPlatform);

export default router;
