import mongoose, { Schema, Document, Model } from 'mongoose';

export type ActivityType =
  | 'Stock Minus'
  | 'Customer Deleted'
  | 'Warehouse Deleted'
  | 'Book Deleted'
  | 'Wallpaper Deleted'
  | 'Invoice Edited'
  | 'Invoice Deleted'
  | 'Payment Recorded';

export interface IActivityLog extends Document {
  userId: mongoose.Types.ObjectId;
  dateTime: Date;
  type: ActivityType;
  detail: string;
  qty?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dateTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'Stock Minus',
        'Customer Deleted',
        'Warehouse Deleted',
        'Book Deleted',
        'Wallpaper Deleted',
        'Invoice Edited',
        'Invoice Deleted',
        'Payment Recorded',
      ],
      index: true,
    },
    detail: {
      type: String,
      required: true,
      trim: true,
    },
    qty: {
      type: Number,
    },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ userId: 1, dateTime: -1 });

const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

export default ActivityLog;
