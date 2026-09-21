import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession, comparePassword } from '@/lib/auth';
import User from '@/models/User';
import Settings from '@/models/Settings';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { adminPassword } = body;

    await connectToDatabase();

    const businessOwnerId =
      session.role === 'worker' && session.adminId ? session.adminId : session.userId;
    const ownerObjectId = new mongoose.Types.ObjectId(businessOwnerId);

    const settings = await Settings.findOne({ userId: ownerObjectId }).lean();

    // If Admin Delete Protection password is set, strictly verify it
    if (settings && settings.deletePasswordHash) {
      if (!adminPassword) {
        return NextResponse.json(
          {
            success: false,
            error: 'Admin Security Protection password is required to reveal credentials.',
          },
          { status: 400 }
        );
      }

      const isMatch = await comparePassword(adminPassword, settings.deletePasswordHash);
      if (!isMatch) {
        return NextResponse.json(
          {
            success: false,
            error: 'Incorrect Admin Security Password. Access denied.',
          },
          { status: 403 }
        );
      }
    }

    const userObjectId = new mongoose.Types.ObjectId(session.userId);
    const user = await User.findById(userObjectId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    let revealedPassword = user.displayPassword || '';

    // If displayPassword is not yet stored, check against the initial seed default
    if (!revealedPassword && user.passwordHash) {
      const isDefault = await comparePassword('adminpassword123', user.passwordHash);
      if (isDefault) {
        revealedPassword = 'adminpassword123';
        // Cache it for subsequent lookups
        user.displayPassword = 'adminpassword123';
        await user.save();
      }
    }

    return NextResponse.json({
      success: true,
      currentPassword: revealedPassword,
      hasStoredPassword: Boolean(revealedPassword),
      message: 'Admin authorization granted. Current password retrieved.',
    });
  } catch (error) {
    console.error('Reveal password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to authorize and retrieve password' },
      { status: 500 }
    );
  }
}
