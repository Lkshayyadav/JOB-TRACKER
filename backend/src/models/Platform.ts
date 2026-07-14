import { Schema, model, Document } from 'mongoose';

export interface IPlatform extends Document {
  userId: Schema.Types.ObjectId;
  name: string;
  website?: string;
  logo?: string;
  color?: string;
  description?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformSchema = new Schema<IPlatform>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Platform name is required'],
      trim: true
    },
    website: {
      type: String,
      trim: true
    },
    logo: {
      type: String,
      trim: true
    },
    color: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Create compound index for userId + name to ensure uniqueness of platform names per user
PlatformSchema.index({ userId: 1, name: 1 }, { unique: true });

export const Platform = model<IPlatform>('Platform', PlatformSchema);
