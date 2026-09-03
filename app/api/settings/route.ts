import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession, hashPassword } from '@/lib/auth';
import Settings from '@/models/Settings';
import { SettingsSchema } from '@/lib/validations';
import { verifyCsrf, csrfErrorResponse } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(session.userId);

    let settings = await Settings.findOne({ userId: userObjectId }).lean();

    if (!settings) {
      await Settings.create({
        userId: userObjectId,
        businessName: session.businessName,
        invoicePrefix: 'INV',
      });
      settings = await Settings.findOne({ userId: userObjectId }).lean();
    }

    if (!settings) {
      return NextResponse.json({ success: false, error: 'Could not load settings' }, { status: 500 });
    }

    // Never return password hashes
    const sanitizedSettings = {
      ...settings,
      deletePasswordHash: undefined,
      hidePasswordHash: undefined,
      paymentPasswordHash: undefined,
      hasDeletePassword: Boolean(settings.deletePasswordHash),
      hasHidePassword: Boolean(settings.hidePasswordHash),
      hasPaymentPassword: Boolean(settings.paymentPasswordHash),
    };

    return NextResponse.json({
      success: true,
      data: sanitizedSettings,
    });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return csrfErrorResponse();
  }

  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'worker') {
      return NextResponse.json(
        { success: false, error: 'Access denied: Only business admins can modify system settings.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = SettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid settings data' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(session.userId);

    const updated = await Settings.findOneAndUpdate(
      { userId: userObjectId },
      { $set: validation.data },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Settings update ho gayi hain',
      data: updated,
    });
  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}

// POST endpoint for updating sensitive action passwords
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
    const { type, newPassword } = body; // type: 'delete' | 'hide' | 'payment'

    if (!['delete', 'hide', 'payment'].includes(type) || !newPassword || newPassword.length < 4) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 4 characters' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(session.userId);

    const hashed = await hashPassword(newPassword);
    const updateField =
      type === 'delete'
        ? 'deletePasswordHash'
        : type === 'hide'
          ? 'hidePasswordHash'
          : 'paymentPasswordHash';

    await Settings.updateOne(
      { userId: userObjectId },
      { $set: { [updateField]: hashed } },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: `${type.toUpperCase()} password updated successfully`,
    });
  } catch (error) {
    console.error('Settings password update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update security password' },
      { status: 500 }
    );
  }
}
