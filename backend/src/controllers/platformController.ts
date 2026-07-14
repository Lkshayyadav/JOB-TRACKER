import { Request, Response } from 'express';
import { PlatformService } from '../services/platformService';

export class PlatformController {
  static async getPlatforms(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const platforms = await PlatformService.getPlatforms(userId);
      res.status(200).json(platforms);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch platforms' });
    }
  }

  static async getPlatformStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const stats = await PlatformService.getPlatformStats(userId);
      res.status(200).json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch platform stats' });
    }
  }

  static async createPlatform(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const platform = await PlatformService.createPlatform(userId, req.body);
      res.status(201).json(platform);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to create platform' });
    }
  }

  static async updatePlatform(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const platformId = req.params.id;
      const platform = await PlatformService.updatePlatform(userId, platformId, req.body);
      if (!platform) {
        res.status(404).json({ message: 'Platform not found' });
        return;
      }
      res.status(200).json(platform);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to update platform' });
    }
  }

  static async deletePlatform(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const platformId = req.params.id;
      const moveTo = req.query.moveTo as string | undefined;

      const result = await PlatformService.deletePlatform(userId, platformId, moveTo);
      res.status(200).json({ success: true, message: 'Platform deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to delete platform' });
    }
  }

  static async setDefaultPlatform(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const platformId = req.params.id;
      const platform = await PlatformService.setDefaultPlatform(userId, platformId);
      if (!platform) {
        res.status(404).json({ message: 'Platform not found' });
        return;
      }
      res.status(200).json(platform);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to set default platform' });
    }
  }
}
