import mongoose from 'mongoose';
import { Application } from '../models/Application';
import { ApplicationHistory } from '../models/ApplicationHistory';

export interface DashboardStats {
  totalApplications: number;
  statusCounts: {
    Applied: number;
    OA: number;
    Assignment: number;
    Interview: number;
    'HR Round': number;
    Offer: number;
    Rejected: number;
    Withdrawn: number;
  };
  recentApplications: any[];
  followUpsDueToday: any[];
  applicationsThisWeek: number;
  applicationsThisMonth: number;
  activeApplications: number;
  successRate: number;
  recentActivity: any[];
  applicationsByPlatform: Array<{
    _id: string;
    name: string;
    color: string;
    count: number;
  }>;
}

export class DashboardService {
  static async getDashboardStats(userId: string): Promise<DashboardStats> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 1. Total applications count for user
    const totalApplications = await Application.countDocuments({ userId });

    // 2. Status counts using aggregation pipeline (single database trip, filtered by userId)
    const rawStatusCounts = await Application.aggregate([
      {
        $match: { userId: userObjectId }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusCounts = {
      Applied: 0,
      OA: 0,
      Assignment: 0,
      Interview: 0,
      'HR Round': 0,
      Offer: 0,
      Rejected: 0,
      Withdrawn: 0
    };

    rawStatusCounts.forEach((item) => {
      if (item._id in statusCounts) {
        statusCounts[item._id as keyof typeof statusCounts] = item.count;
      }
    });

    // 3. Recent 5 applications
    const recentApplications = await Application.find({ userId })
      .populate('platformId')
      .sort({ createdAt: -1 })
      .limit(5);

    // 4. Follow-ups due today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const followUpsDueToday = await Application.find({
      userId,
      followUpDate: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    }).populate('platformId').sort({ followUpDate: 1 });

    // 5. Applications this week (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const applicationsThisWeek = await Application.countDocuments({
      userId,
      createdAt: { $gte: sevenDaysAgo }
    });

    // 6. Applications this month (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const applicationsThisMonth = await Application.countDocuments({
      userId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // 7. Active applications count
    const activeApplications = await Application.countDocuments({
      userId,
      status: { $in: ['Applied', 'OA', 'Assignment', 'Interview', 'HR Round'] }
    });

    // 8. Success rate percentage
    const offersCount = statusCounts.Offer;
    const successRate = totalApplications > 0 
      ? Math.round((offersCount / totalApplications) * 100 * 10) / 10 
      : 0;

    // 9. Recent Activity Log (10 latest history events, filtered by user)
    const rawRecentActivity = await ApplicationHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('applicationId', 'company');

    const recentActivity = rawRecentActivity.map((hist: any) => ({
      _id: hist._id,
      applicationId: hist.applicationId?._id || '',
      company: hist.applicationId?.company || 'Deleted Company',
      status: hist.status,
      note: hist.note,
      createdAt: hist.createdAt
    }));

    // 10. Applications by Platform Aggregation
    const applicationsByPlatform = await Application.aggregate([
      {
        $match: { userId: userObjectId }
      },
      {
        $group: {
          _id: '$platformId',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'platforms',
          localField: '_id',
          foreignField: '_id',
          as: 'platform'
        }
      },
      {
        $unwind: {
          path: '$platform',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          name: { $ifNull: ['$platform.name', 'Unknown'] },
          color: { $ifNull: ['$platform.color', '#6B7280'] }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    return {
      totalApplications,
      statusCounts,
      recentApplications,
      followUpsDueToday,
      applicationsThisWeek,
      applicationsThisMonth,
      activeApplications,
      successRate,
      recentActivity,
      applicationsByPlatform
    };
  }
}
