import { Platform } from '../models/Platform';
import mongoose from 'mongoose';

export async function runPlatformMigration() {
  const db = mongoose.connection.db;
  if (!db) return;

  const applicationsCol = db.collection('applications');
  const savedJobsCol    = db.collection('savedjobs');

  const apps      = await applicationsCol.find({}).toArray();
  const savedJobs = await savedJobsCol.find({}).toArray();

  // Collect all known userIds
  const userIds = new Set<string>();
  apps.forEach((a) => { if (a.userId) userIds.add(a.userId.toString()); });
  savedJobs.forEach((s) => { if (s.userId) userIds.add(s.userId.toString()); });
  const usersCol = db.collection('users');
  const users    = await usersCol.find({}).toArray();
  users.forEach((u) => userIds.add(u._id.toString()));

  // Seed default platforms for any user who has none yet
  for (const userIdStr of userIds) {
    const userIdObj = new mongoose.Types.ObjectId(userIdStr);
    const platCount = await Platform.countDocuments({ userId: userIdObj });
    if (platCount === 0) {
      const defaults = [
        { name: 'LinkedIn',        website: 'https://linkedin.com',   color: '#0077B5', isDefault: true  },
        { name: 'Wellfound',       website: 'https://wellfound.com',  color: '#000000', isDefault: false },
        { name: 'Internshala',     website: 'https://internshala.com',color: '#008BD2', isDefault: false },
        { name: 'Unstop',          website: 'https://unstop.com',     color: '#1C4980', isDefault: false },
        { name: 'Company Careers', website: '',                       color: '#4F46E5', isDefault: false },
        { name: 'Referral',        website: '',                       color: '#10B981', isDefault: false },
        { name: 'Other',           website: '',                       color: '#6B7280', isDefault: false },
      ];
      await Platform.insertMany(defaults.map(d => ({ ...d, userId: userIdObj })));
    }
  }

  // Migrate legacy `source` string → platformId ObjectId on Applications
  const appsToMigrate = await applicationsCol.find({
    $or: [{ source: { $exists: true, $ne: null } }, { platformId: { $exists: false } }]
  }).toArray();

  for (const app of appsToMigrate) {
    const userId    = app.userId;
    const sourceStr = app.source || 'LinkedIn';
    let platform    = await Platform.findOne({ userId, name: sourceStr });
    if (!platform)  platform = await Platform.findOne({ userId, name: 'LinkedIn' }) || await Platform.findOne({ userId });
    if (platform) {
      await applicationsCol.updateOne(
        { _id: app._id },
        { $set: { platformId: platform._id }, $unset: { source: '' } }
      );
    }
  }

  // Migrate legacy `source` string → platformId ObjectId on SavedJobs
  const savedJobsToMigrate = await savedJobsCol.find({
    $or: [{ source: { $exists: true, $ne: null } }, { platformId: { $exists: false } }]
  }).toArray();

  for (const job of savedJobsToMigrate) {
    const userId    = job.userId;
    const sourceStr = job.source || 'LinkedIn';
    let platform    = await Platform.findOne({ userId, name: sourceStr });
    if (!platform)  platform = await Platform.findOne({ userId, name: 'LinkedIn' }) || await Platform.findOne({ userId });
    if (platform) {
      await savedJobsCol.updateOne(
        { _id: job._id },
        { $set: { platformId: platform._id }, $unset: { source: '' } }
      );
    }
  }
}
