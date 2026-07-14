import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ApplicationService } from '../services/applicationService';
import { STATUS_ENUM, PRIORITY_ENUM, ApplicationStatus } from '../models/Application';

// Helper to validate Mongoose ObjectIds
const validateObjectId = (id: string): void => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid Application ID format');
    (error as any).statusCode = 400;
    throw error;
  }
};

export class ApplicationController {
  /**
   * POST /api/applications
   */
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        company, 
        role, 
        platformId, 
        status, 
        priority, 
        jobUrl, 
        appliedDate, 
        followUpDate, 
        notes,
        companyWebsite,
        applicationMethod,
        recruiterName,
        recruiterEmail,
        recruiterLinkedIn
      } = req.body;

      const userId = (req as any).user.id;

      // 1. Required fields validation
      if (!company || typeof company !== 'string' || !company.trim()) {
        const error = new Error('Company name is required');
        (error as any).statusCode = 400;
        throw error;
      }
      if (!role || typeof role !== 'string' || !role.trim()) {
        const error = new Error('Role/position is required');
        (error as any).statusCode = 400;
        throw error;
      }
      if (!platformId) {
        const error = new Error('Platform ID is required');
        (error as any).statusCode = 400;
        throw error;
      }

      if (!mongoose.Types.ObjectId.isValid(platformId)) {
        const error = new Error('Invalid Platform ID format');
        (error as any).statusCode = 400;
        throw error;
      }

      if (status && !STATUS_ENUM.includes(status)) {
        const error = new Error(`Invalid status value. Must be one of: ${STATUS_ENUM.join(', ')}`);
        (error as any).statusCode = 400;
        throw error;
      }

      if (priority && !PRIORITY_ENUM.includes(priority)) {
        const error = new Error(`Invalid priority value. Must be one of: ${PRIORITY_ENUM.join(', ')}`);
        (error as any).statusCode = 400;
        throw error;
      }

      // Create new application
      const newApp = await ApplicationService.createApplication({
        company,
        role,
        platformId,
        status,
        priority,
        jobUrl,
        appliedDate,
        followUpDate,
        notes,
        companyWebsite,
        applicationMethod,
        recruiterName,
        recruiterEmail,
        recruiterLinkedIn
      }, userId);

      res.status(201).json({
        success: true,
        data: newApp
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/applications
   */
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, status, platformId, priority, sortBy } = req.query;
      const userId = (req as any).user.id;

      // Validate filter enums if provided
      if (status && !STATUS_ENUM.includes(status as any)) {
        const error = new Error(`Invalid status query filter`);
        (error as any).statusCode = 400;
        throw error;
      }
      if (platformId && !mongoose.Types.ObjectId.isValid(platformId as string)) {
        const error = new Error(`Invalid platformId query filter`);
        (error as any).statusCode = 400;
        throw error;
      }
      if (priority && !PRIORITY_ENUM.includes(priority as any)) {
        const error = new Error(`Invalid priority query filter`);
        (error as any).statusCode = 400;
        throw error;
      }
      if (sortBy && !['newest', 'oldest', 'company'].includes(sortBy as string)) {
        const error = new Error(`Invalid sortBy query. Must be one of: newest, oldest, company`);
        (error as any).statusCode = 400;
        throw error;
      }

      const apps = await ApplicationService.getApplications({
        search: search as string,
        status: status as string,
        platformId: platformId as string,
        priority: priority as string,
        sortBy: sortBy as any
      }, userId);

      res.status(200).json({
        success: true,
        count: apps.length,
        data: apps
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/applications/:id
   */
  static async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      validateObjectId(id);

      const app = await ApplicationService.getApplicationById(id, userId);

      res.status(200).json({
        success: true,
        data: app
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/applications/:id
   */
  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      validateObjectId(id);

      const { platformId, status, priority } = req.body;

      // Enum and ObjectId validation on update values if provided
      if (platformId && !mongoose.Types.ObjectId.isValid(platformId)) {
        const error = new Error(`Invalid platformId format`);
        (error as any).statusCode = 400;
        throw error;
      }
      if (status && !STATUS_ENUM.includes(status)) {
        const error = new Error(`Invalid status value. Must be one of: ${STATUS_ENUM.join(', ')}`);
        (error as any).statusCode = 400;
        throw error;
      }
      if (priority && !PRIORITY_ENUM.includes(priority)) {
        const error = new Error(`Invalid priority value. Must be one of: ${PRIORITY_ENUM.join(', ')}`);
        (error as any).statusCode = 400;
        throw error;
      }

      const updatedApp = await ApplicationService.updateApplication(id, req.body, userId);

      res.status(200).json({
        success: true,
        data: updatedApp
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/applications/:id
   */
  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      validateObjectId(id);

      await ApplicationService.deleteApplication(id, userId);

      res.status(200).json({
        success: true,
        message: 'Application and associated history logs successfully deleted'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/applications/:id/status
   */
  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      validateObjectId(id);

      const { status } = req.body;
      if (!status) {
        const error = new Error('Status field is required');
        (error as any).statusCode = 400;
        throw error;
      }

      if (!STATUS_ENUM.includes(status)) {
        const error = new Error(`Invalid status value. Must be one of: ${STATUS_ENUM.join(', ')}`);
        (error as any).statusCode = 400;
        throw error;
      }

      const updatedApp = await ApplicationService.updateStatus(id, status as ApplicationStatus, userId);

      res.status(200).json({
        success: true,
        data: updatedApp
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/applications/:id/history
   */
  static async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      validateObjectId(id); // id corresponds to applicationId here

      const history = await ApplicationService.getHistory(id, userId);

      res.status(200).json({
        success: true,
        count: history.length,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/applications/:id/duplicate
   */
  static async duplicate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      validateObjectId(id);

      const duplicatedApp = await ApplicationService.duplicateApplication(id, userId);

      res.status(201).json({
        success: true,
        data: duplicatedApp
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/applications/import-batch
   */
  static async importBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { applications } = req.body;
      const userId = (req as any).user.id;

      if (!applications || !Array.isArray(applications)) {
        res.status(400).json({ success: false, message: 'applications list array is required in body' });
        return;
      }

      const imported = await ApplicationService.importApplicationsBatch(applications, userId);

      res.status(201).json({
        success: true,
        count: imported.length,
        data: imported
      });
    } catch (error) {
      next(error);
    }
  }
}
