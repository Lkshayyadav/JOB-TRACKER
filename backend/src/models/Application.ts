import mongoose, { Schema, model, Document } from 'mongoose';

export type ApplicationStatus = 'Applied' | 'OA' | 'Assignment' | 'Interview' | 'HR Round' | 'Offer' | 'Rejected' | 'Withdrawn';
export type ApplicationPriority = 'High' | 'Medium' | 'Low';
export type ApplicationMethod = 'Website' | 'LinkedIn Easy Apply' | 'Referral' | 'Email' | 'Recruiter' | 'Other';

export const STATUS_ENUM: ApplicationStatus[] = ['Applied', 'OA', 'Assignment', 'Interview', 'HR Round', 'Offer', 'Rejected', 'Withdrawn'];
export const PRIORITY_ENUM: ApplicationPriority[] = ['High', 'Medium', 'Low'];
export const METHOD_ENUM: ApplicationMethod[] = ['Website', 'LinkedIn Easy Apply', 'Referral', 'Email', 'Recruiter', 'Other'];

export interface IApplication extends Document {
  userId: Schema.Types.ObjectId;
  company: string;
  role: string;
  platformId: Schema.Types.ObjectId;
  jobUrl?: string;
  status: ApplicationStatus;
  appliedDate: Date;
  followUpDate?: Date;
  priority: ApplicationPriority;
  notes?: string;
  isPinned?: boolean;
  companyWebsite?: string;
  applicationMethod?: ApplicationMethod;
  recruiterName?: string;
  recruiterEmail?: string;
  recruiterLinkedIn?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
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
    status: {
      type: String,
      enum: {
        values: STATUS_ENUM,
        message: 'Invalid application status: {VALUE}'
      },
      default: 'Applied'
    },
    appliedDate: {
      type: Date,
      default: Date.now
    },
    followUpDate: {
      type: Date
    },
    priority: {
      type: String,
      enum: {
        values: PRIORITY_ENUM,
        message: 'Invalid priority level: {VALUE}'
      },
      default: 'Medium'
    },
    notes: {
      type: String
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    companyWebsite: {
      type: String,
      trim: true
    },
    applicationMethod: {
      type: String,
      enum: {
        values: METHOD_ENUM,
        message: 'Invalid application method: {VALUE}'
      },
      default: 'Website'
    },
    recruiterName: {
      type: String,
      trim: true
    },
    recruiterEmail: {
      type: String,
      trim: true
    },
    recruiterLinkedIn: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Mongoose Pre-save Hook: Track if the document is new or status changed
ApplicationSchema.pre('save', function (next) {
  const doc = this as any;
  doc._wasNew = doc.isNew;
  doc._statusChanged = doc.isModified('status') || doc.isNew;
  next();
});

// Mongoose Post-save Hook: Auto-insert history record on status change
ApplicationSchema.post('save', async function (doc) {
  const self = this as any;
  if (self._statusChanged) {
    try {
      await mongoose.model('ApplicationHistory').create({
        applicationId: doc._id,
        userId: doc.userId,
        status: doc.status,
        note: self._wasNew ? 'Application created' : `Status changed to ${doc.status}`
      });
    } catch (error) {
      console.error('Failed to auto-insert status history log:', error);
    }
  }
});

export const Application = model<IApplication>('Application', ApplicationSchema);
