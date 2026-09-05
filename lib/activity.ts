import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import ActivityLog, { ActivityType } from '@/models/ActivityLog';

export async function logActivity({
  userId,
  type,
  detail,
  qty,
}: {
  userId: string | mongoose.Types.ObjectId;
  type: ActivityType;
  detail: string;
  qty?: number;
}) {
  try {
    await connectToDatabase();
    await ActivityLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      dateTime: new Date(),
      type,
      detail,
      qty,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
