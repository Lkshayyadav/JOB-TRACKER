import { Platform, IPlatform } from '../models/Platform';
import { Application } from '../models/Application';
import { SavedJob } from '../models/SavedJob';

export class PlatformService {
  static async createPlatform(userId: string, data: Partial<IPlatform>): Promise<IPlatform> {
    if (data.isDefault) {
      await Platform.updateMany({ userId }, { isDefault: false });
    }
    const count = await Platform.countDocuments({ userId });
    if (count === 0) {
      data.isDefault = true;
    }
    return await Platform.create({ ...data, userId });
  }

  static async getPlatforms(userId: string): Promise<IPlatform[]> {
    return await Platform.find({ userId }).sort({ name: 1 });
  }

  static async getPlatform(userId: string, platformId: string): Promise<IPlatform | null> {
    return await Platform.findOne({ _id: platformId, userId });
  }

  static async updatePlatform(userId: string, platformId: string, data: Partial<IPlatform>): Promise<IPlatform | null> {
    if (data.isDefault) {
      await Platform.updateMany({ userId, _id: { $ne: platformId } }, { isDefault: false });
    }
    return await Platform.findOneAndUpdate(
      { _id: platformId, userId },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  static async deletePlatform(userId: string, platformId: string, moveToPlatformId?: string): Promise<{ success: boolean }> {
    const appCount = await Application.countDocuments({ userId, platformId });
    const savedJobCount = await SavedJob.countDocuments({ userId, platformId });

    if (appCount > 0 || savedJobCount > 0) {
      if (!moveToPlatformId) {
        throw new Error(
          `Platform is currently used. Applications : ${appCount} Saved Jobs : ${savedJobCount} Select another platform before deleting.`
        );
      }
      await Application.updateMany({ userId, platformId }, { platformId: moveToPlatformId });
      await SavedJob.updateMany({ userId, platformId }, { platformId: moveToPlatformId });
    }

    const platform = await Platform.findOne({ _id: platformId, userId });
    if (!platform) {
      throw new Error('Platform not found');
    }

    const wasDefault = platform.isDefault;
    await Platform.deleteOne({ _id: platformId, userId });

    if (wasDefault) {
      const another = await Platform.findOne({ userId });
      if (another) {
        another.isDefault = true;
        await another.save();
      }
    }

    return { success: true };
  }

  static async setDefaultPlatform(userId: string, platformId: string): Promise<IPlatform | null> {
    await Platform.updateMany({ userId }, { isDefault: false });
    return await Platform.findOneAndUpdate(
      { _id: platformId, userId },
      { $set: { isDefault: true } },
      { new: true }
    );
  }

  static async getPlatformStats(userId: string): Promise<any[]> {
    const platforms = await Platform.find({ userId }).sort({ name: 1 });
    const stats = [];
    for (const plat of platforms) {
      const appCount = await Application.countDocuments({ userId, platformId: plat._id });
      const savedJobCount = await SavedJob.countDocuments({ userId, platformId: plat._id });
      stats.push({
        _id: plat._id,
        name: plat.name,
        website: plat.website,
        color: plat.color,
        logo: plat.logo,
        description: plat.description,
        isDefault: plat.isDefault,
        applicationsCount: appCount,
        savedJobsCount: savedJobCount
      });
    }
    return stats;
  }
}
