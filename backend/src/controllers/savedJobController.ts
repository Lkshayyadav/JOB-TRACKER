import { Request, Response, NextFunction } from 'express';
import { SavedJobService } from '../services/savedJobService';
import mongoose from 'mongoose';

export class SavedJobController {
  /**
   * Create saved job bookmark
   */
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { company, role, platformId } = req.body;
      const userId = (req as any).user.id;

      if (!company || !role) {
        res.status(400).json({ success: false, message: 'Company and Role fields are required' });
        return;
      }

      if (!platformId) {
        res.status(400).json({ success: false, message: 'Platform ID is required' });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(platformId)) {
        res.status(400).json({ success: false, message: 'Invalid Platform ID format' });
        return;
      }

      const savedJob = await SavedJobService.createSavedJob(req.body, userId);
      res.status(201).json({ success: true, data: savedJob });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all saved jobs
   */
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const savedJobs = await SavedJobService.getSavedJobs(userId);
      res.status(200).json({ success: true, count: savedJobs.length, data: savedJobs });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete saved job bookmark
   */
  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid saved job ID format' });
        return;
      }

      const savedJob = await SavedJobService.deleteSavedJob(id, userId);
      res.status(200).json({ success: true, message: 'Saved job deleted', data: savedJob });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Convert saved job into application
   */
  static async apply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid saved job ID format' });
        return;
      }

      const application = await SavedJobService.applySavedJob(id, userId);
      res.status(201).json({ success: true, message: 'Converted bookmark to active application', data: application });
    } catch (error) {
      next(error);
    }
  }
}
