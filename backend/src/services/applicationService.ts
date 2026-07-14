import { Application, IApplication, ApplicationStatus, ApplicationPriority } from '../models/Application';
import { ApplicationHistory } from '../models/ApplicationHistory';
import { Platform } from '../models/Platform';
import mongoose from 'mongoose';

export interface FilterOptions {
  search?: string;
  status?: string;
  platformId?: string;
  priority?: string;
  sortBy?: 'newest' | 'oldest' | 'company';
}

export class ApplicationService {
  /**
   * Create a new job application
   */
  static async createApplication(data: Partial<IApplication>, userId: string): Promise<IApplication> {
    const application = new Application({ ...data, userId });
    await application.save();
    return await application.populate('platformId');
  }

  /**
   * List all applications based on search queries, filters, and sorting parameters
   */
  static async getApplications(options: FilterOptions, userId: string): Promise<IApplication[]> {
    const { search, status, platformId, priority, sortBy } = options;
    const query: any = { userId };

    // Search query: Case-insensitive regex match on company name, role, or platform name
    if (search) {
      const matchingPlatforms = await Platform.find({
        userId,
        name: { $regex: search, $options: 'i' }
      });
      const matchingPlatformIds = matchingPlatforms.map(p => p._id);

      query.$or = [
        { company: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } }
      ];

      if (matchingPlatformIds.length > 0) {
        query.$or.push({ platformId: { $in: matchingPlatformIds } });
      }
    }

    // Exact status match
    if (status) {
      query.status = status;
    }

    // Exact platform ID match
    if (platformId) {
      query.platformId = platformId;
    }

    // Exact priority match
    if (priority) {
      query.priority = priority;
    }

    // Determine sort ordering (pinned applications always appear first)
    let sortOption: any = { isPinned: -1, createdAt: -1 }; // default is newest
    if (sortBy === 'oldest') {
      sortOption = { isPinned: -1, createdAt: 1 };
    } else if (sortBy === 'company') {
      sortOption = { isPinned: -1, company: 1 };
    }

    return await Application.find(query).sort(sortOption).populate('platformId');
  }

  /**
   * Retrieve a single job application by ID
   */
  static async getApplicationById(id: string, userId: string): Promise<IApplication> {
    const application = await Application.findOne({ _id: id, userId }).populate('platformId');
    if (!application) {
      const error = new Error('Application not found');
      (error as any).statusCode = 404;
      throw error;
    }
    return application;
  }

  /**
   * Update all details of an application.
   * Feeds fields individually and runs save() to trigger Mongoose hooks.
   */
  static async updateApplication(id: string, data: Partial<IApplication>, userId: string): Promise<IApplication> {
    const application = await Application.findOne({ _id: id, userId });
    if (!application) {
      const error = new Error('Application not found');
      (error as any).statusCode = 404;
      throw error;
    }

    // Update fields (excluding timestamps/id)
    const editableFields: Array<keyof Partial<IApplication>> = [
      'company',
      'role',
      'platformId',
      'jobUrl',
      'status',
      'appliedDate',
      'followUpDate',
      'priority',
      'notes',
      'isPinned',
      'companyWebsite',
      'applicationMethod',
      'recruiterName',
      'recruiterEmail',
      'recruiterLinkedIn'
    ];

    editableFields.forEach((field) => {
      if (data[field] !== undefined) {
        (application as any)[field] = data[field];
      }
    });

    await application.save();
    return await application.populate('platformId');
  }

  /**
   * Delete an application and clean up all associated history records
   */
  static async deleteApplication(id: string, userId: string): Promise<IApplication> {
    const application = await Application.findOne({ _id: id, userId }).populate('platformId');
    if (!application) {
      const error = new Error('Application not found');
      (error as any).statusCode = 404;
      throw error;
    }

    await Application.deleteOne({ _id: id, userId });
    await ApplicationHistory.deleteMany({ applicationId: id, userId });

    return application;
  }

  /**
   * Patch only the status of an application
   */
  static async updateStatus(id: string, status: ApplicationStatus, userId: string): Promise<IApplication> {
    const application = await Application.findOne({ _id: id, userId });
    if (!application) {
      const error = new Error('Application not found');
      (error as any).statusCode = 404;
      throw error;
    }

    application.status = status;
    await application.save();
    return await application.populate('platformId');
  }

  /**
   * Fetch all status transition history records for a single application
   */
  static async getHistory(applicationId: string, userId: string) {
    // Verify that the application exists first
    await this.getApplicationById(applicationId, userId);
    
    return await ApplicationHistory.find({ applicationId, userId }).sort({ createdAt: -1 });
  }

  /**
   * Duplicate an existing application
   */
  static async duplicateApplication(id: string, userId: string): Promise<IApplication> {
    const original = await this.getApplicationById(id, userId);
    
    const duplicateData = {
      userId,
      company: original.company,
      role: original.role,
      platformId: original.platformId,
      jobUrl: original.jobUrl,
      priority: original.priority,
      notes: original.notes,
      isPinned: original.isPinned,
      companyWebsite: original.companyWebsite,
      applicationMethod: original.applicationMethod,
      recruiterName: original.recruiterName,
      recruiterEmail: original.recruiterEmail,
      recruiterLinkedIn: original.recruiterLinkedIn,
      status: 'Applied' as ApplicationStatus,
      appliedDate: new Date()
    };

    const duplicate = new Application(duplicateData);
    await duplicate.save();
    return await duplicate.populate('platformId');
  }

  /**
   * Import multiple applications in bulk
   */
  static async importApplicationsBatch(applicationsList: any[], userId: string): Promise<IApplication[]> {
    const userPlatforms = await Platform.find({ userId });
    const defaultPlatform = userPlatforms.find(p => p.isDefault) || userPlatforms[0];

    const docs = [];
    for (const app of applicationsList) {
      let platformId = app.platformId;

      if (!platformId && app.source) {
        let plat = userPlatforms.find(p => p.name.toLowerCase() === app.source.toLowerCase());
        if (!plat) {
          plat = await Platform.create({
            userId: new mongoose.Types.ObjectId(userId) as any,
            name: app.source,
            isDefault: false
          });
          userPlatforms.push(plat);
        }
        platformId = plat._id;
      }

      if (!platformId) {
        platformId = defaultPlatform?._id;
      }

      docs.push({
        userId,
        company: app.company || 'Unknown Company',
        role: app.role || 'Unknown Role',
        platformId,
        jobUrl: app.jobUrl,
        status: app.status || 'Applied',
        appliedDate: app.appliedDate ? new Date(app.appliedDate) : new Date(),
        followUpDate: app.followUpDate ? new Date(app.followUpDate) : undefined,
        priority: app.priority || 'Medium',
        notes: app.notes,
        isPinned: app.isPinned || false,
        companyWebsite: app.companyWebsite,
        applicationMethod: app.applicationMethod || 'Website',
        recruiterName: app.recruiterName,
        recruiterEmail: app.recruiterEmail,
        recruiterLinkedIn: app.recruiterLinkedIn
      });
    }

    const inserted = await Application.insertMany(docs) as unknown as IApplication[];
    
    // Create history logs
    const historyRecords = inserted.map(doc => ({
      applicationId: doc._id,
      userId: doc.userId,
      status: doc.status,
      note: 'Application imported'
    }));
    await ApplicationHistory.insertMany(historyRecords);

    // Fetch the inserted populated list
    return await Application.find({ _id: { $in: inserted.map(i => i._id) } }).populate('platformId');
  }
}
