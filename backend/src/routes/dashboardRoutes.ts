import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

// Retrieve dashboard overview statistics
router.get('/', DashboardController.getStats);

export default router;
