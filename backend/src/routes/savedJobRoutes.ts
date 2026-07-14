import { Router } from 'express';
import { SavedJobController } from '../controllers/savedJobController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.post('/', SavedJobController.create);
router.get('/', SavedJobController.list);
router.delete('/:id', SavedJobController.delete);
router.post('/:id/apply', SavedJobController.apply);

export default router;
