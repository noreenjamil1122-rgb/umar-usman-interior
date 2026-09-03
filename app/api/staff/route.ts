import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession, hashPassword } from '@/lib/auth';
import User from '@/models/User';
import { verifyCsrf, csrfErrorResponse } from '@/lib/csrf';

export async function GET(request: NextRequest) {
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

    const staff = await User.find({ adminId: adminObjectId, role: 'worker' })
      .select('name email role status createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error('Staff GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch staff' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return csrfErrorResponse();
  }

  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only Admin can register staff workers' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password || password.length < 4) {
      return NextResponse.json(
        { success: false, error: 'Name, valid email, and password (min 4 chars) are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const normalizedEmail = email.toLowerCase().trim();

    // Check duplicate
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const worker = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      businessName: session.businessName,
      role: 'worker',
      adminId: new mongoose.Types.ObjectId(session.userId),
      status: 'active',
    });

    return NextResponse.json(
      {
        success: true,
        message: `Worker account for ${worker.name} created successfully!`,
        data: {
          _id: worker._id,
          name: worker.name,
          email: worker.email,
          role: worker.role,
          createdAt: worker.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Staff POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create worker' }, { status: 500 });
  }
}
