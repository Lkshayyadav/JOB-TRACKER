import mongoose, { Schema, model, Document } from 'mongoose';

export interface ISavedJob extends Document {
  userId: Schema.Types.ObjectId;
  company: string;
  role: string;
  platformId: Schema.Types.ObjectId;
  jobUrl?: string;
  notes?: string;
  savedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SavedJobSchema = new Schema<ISavedJob>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true
    },
    role: {
      type: String,
      required: [true, 'Role/position is required'],
      trim: true
    },
    platformId: {
      type: Schema.Types.ObjectId,
      ref: 'Platform',
      required: [true, 'Platform ID is required']
    },
    jobUrl: {
      type: String,
      trim: true
    },
    notes: {
      type: String
    },
    savedDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

export const SavedJob = model<ISavedJob>('SavedJob', SavedJobSchema);
