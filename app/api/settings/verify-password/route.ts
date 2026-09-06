import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession, comparePassword } from '@/lib/auth';
import Settings from '@/models/Settings';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const type = body.type || body.protectionType;
    const { password } = body;

    if (!['delete', 'hide', 'payment', 'supplier'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification type' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const businessOwnerId = session.role === 'worker' && session.adminId ? session.adminId : session.userId;
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);

    const settings = await Settings.findOne({ userId: userObjectId }).lean();
    if (!settings) {
      return NextResponse.json(
        {
          success: false,
          notConfigured: true,
          error: 'Protection password not configured. Please set it in Settings first.',
        },
        { status: 400 }
      );
    }

    const hash =
      type === 'delete'
        ? settings.deletePasswordHash
        : type === 'hide'
          ? settings.hidePasswordHash
          : type === 'payment'
            ? settings.paymentPasswordHash
            : settings.supplierPasswordHash;

    if (!hash) {
      return NextResponse.json(
        {
          success: false,
          notConfigured: true,
          error: `No password configured for ${type.toUpperCase()} protection. Please set it in Settings first.`,
        },
        { status: 400 }
      );
    }

    const isValid = await comparePassword(password, hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Incorrect security password. Please try again.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Access granted',
    });
  } catch (error) {
    console.error('Password verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during verification' },
      { status: 500 }
    );
  }
}
