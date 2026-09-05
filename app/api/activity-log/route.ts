import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import ActivityLog from '@/models/ActivityLog';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(session.userId);

    const logs = await ActivityLog.find({ userId: userObjectId })
      .sort({ dateTime: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Activity log GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}
