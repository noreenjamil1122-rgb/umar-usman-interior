import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import ActivityLog from '@/models/ActivityLog';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const businessOwnerId = session.role === 'worker' && session.adminId ? session.adminId : session.userId;
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);

    const rawLogs = await ActivityLog.find({ userId: userObjectId })
      .sort({ dateTime: -1 })
      .limit(200)
      .lean();

    const logs = rawLogs.map((log) => ({
      _id: String(log._id),
      type: log.type,
      action: log.type,
      detail: log.detail || '',
      qty: log.qty,
      dateTime: log.dateTime ? new Date(log.dateTime).toISOString() : new Date().toISOString(),
      createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : (log.dateTime ? new Date(log.dateTime).toISOString() : new Date().toISOString()),
      userName: session.businessName || 'Admin',
      userRole: session.role || 'admin',
    }));

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
