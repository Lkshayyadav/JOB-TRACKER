import { Schema, model, Document } from 'mongoose';

export interface IApplicationHistory extends Document {
  applicationId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  status: string;
  note: string;
  createdAt: Date;
}

const ApplicationHistorySchema = new Schema<IApplicationHistory>({
  applicationId: {
    type: Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    required: true
  },
  note: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const ApplicationHistory = model<IApplicationHistory>('ApplicationHistory', ApplicationHistorySchema);

