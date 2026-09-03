import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import User from '@/models/User';
import { verifyCsrf, csrfErrorResponse } from '@/lib/csrf';

interface RouteContext {
  params: { id: string };
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!verifyCsrf(request)) {
    return csrfErrorResponse();
  }

  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Access denied. Admin only.' }, { status: 403 });
    }

    await connectToDatabase();
    const adminObjectId = new mongoose.Types.ObjectId(session.userId);
    const workerId = new mongoose.Types.ObjectId(params.id);

    const deleted = await User.findOneAndDelete({
      _id: workerId,
      adminId: adminObjectId,
      role: 'worker',
    });

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Worker not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Worker account deleted successfully',
    });
  } catch (error) {
    console.error('Staff DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete worker' }, { status: 500 });
  }
}
