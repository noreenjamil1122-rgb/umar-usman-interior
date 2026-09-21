import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession, hashPassword, comparePassword } from '@/lib/auth';
import User from '@/models/User';
import Settings from '@/models/Settings';
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
    const { currentPassword, newPassword, adminAuthorized, adminPassword } = body;

    if (!newPassword || newPassword.length < 6) {
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

    let isAuthorized = false;

    // Option A: Admin protection password verification
    if (adminPassword) {
      const businessOwnerId =
        session.role === 'worker' && session.adminId ? session.adminId : session.userId;
      const settings = await Settings.findOne({
        userId: new mongoose.Types.ObjectId(businessOwnerId),
      }).lean();
      if (settings && settings.deletePasswordHash) {
        isAuthorized = await comparePassword(adminPassword, settings.deletePasswordHash);
      }
    }

    // Option B: Current password match
    if (!isAuthorized && currentPassword) {
      isAuthorized = await comparePassword(currentPassword, user.passwordHash);
    }

    // Option C: adminAuthorized flag confirmed via client PasswordPromptModal
    if (!isAuthorized && adminAuthorized) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Current password or Admin security verification failed' },
        { status: 400 }
      );
    }

    user.passwordHash = await hashPassword(newPassword);
    user.displayPassword = newPassword;
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
