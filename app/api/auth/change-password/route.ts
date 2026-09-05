import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession, hashPassword, comparePassword } from '@/lib/auth';
import User from '@/models/User';
import { verifyCsrf, csrfErrorResponse } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return csrfErrorResponse();
  }

  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const user = await User.findById(new mongoose.Types.ObjectId(session.userId));
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: 'Current password does not match' },
        { status: 400 }
      );
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Account password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update account password' },
      { status: 500 }
    );
  }
}
