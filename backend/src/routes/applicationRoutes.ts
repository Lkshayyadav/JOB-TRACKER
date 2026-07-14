import { Router } from 'express';
import { ApplicationController } from '../controllers/applicationController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Protect all routes
router.use(protect);

// Create application
router.post('/', ApplicationController.create);

// List applications (with search, filter, and sort options)
router.get('/', ApplicationController.list);

// Get application by ID
router.get('/:id', ApplicationController.get);

// Update application by ID
router.put('/:id', ApplicationController.update);

// Delete application by ID
router.delete('/:id', ApplicationController.delete);

// Patch application status
router.patch('/:id/status', ApplicationController.updateStatus);

// Get application status history
router.get('/:id/history', ApplicationController.getHistory);

// Duplicate application
router.post('/:id/duplicate', ApplicationController.duplicate);

// Batch import applications
router.post('/import-batch', ApplicationController.importBatch);

export default router;
