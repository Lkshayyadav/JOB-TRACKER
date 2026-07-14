import { SavedJob, ISavedJob } from '../models/SavedJob';
import { Application } from '../models/Application';
import { ApplicationStatus, ApplicationPriority } from '../models/Application';

export class SavedJobService {
  /**
   * Bookmark a job
   */
  static async createSavedJob(data: Partial<ISavedJob>, userId: string): Promise<ISavedJob> {
    const savedJob = new SavedJob({ ...data, userId });
    await savedJob.save();
    return await savedJob.populate('platformId');
  }

  /**
   * Get all bookmarked jobs
   */
  static async getSavedJobs(userId: string): Promise<ISavedJob[]> {
    return await SavedJob.find({ userId }).sort({ savedDate: -1 }).populate('platformId');
  }

  /**
   * Delete a bookmarked job
   */
  static async deleteSavedJob(id: string, userId: string): Promise<ISavedJob> {
    const savedJob = await SavedJob.findOne({ _id: id, userId }).populate('platformId');
    if (!savedJob) {
      const error = new Error('Bookmarked job not found');
      (error as any).statusCode = 404;
      throw error;
    }
    await SavedJob.deleteOne({ _id: id, userId });
    return savedJob;
  }

  /**
   * Convert a bookmarked job into an active application
   */
  static async applySavedJob(id: string, userId: string): Promise<any> {
    const savedJob = await SavedJob.findOne({ _id: id, userId });
    if (!savedJob) {
      const error = new Error('Bookmarked job not found');
      (error as any).statusCode = 404;
      throw error;
    }

    // Create active application
    const application = new Application({
      userId,
      company: savedJob.company,
      role: savedJob.role,
      platformId: savedJob.platformId,
      jobUrl: savedJob.jobUrl,
      notes: savedJob.notes,
      status: 'Applied' as ApplicationStatus,
      priority: 'Medium' as ApplicationPriority,
      appliedDate: new Date(),
      applicationMethod: 'Website'
    });

    const createdApp = await application.save();

    // Delete bookmark
    await SavedJob.deleteOne({ _id: id, userId });

    return await createdApp.populate('platformId');
  }
}
