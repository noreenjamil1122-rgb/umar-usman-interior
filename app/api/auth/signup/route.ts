import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Settings from '@/models/Settings';
import Book from '@/models/Book';
import Warehouse from '@/models/Warehouse';
import Counter from '@/models/Counter';
import { SignupSchema } from '@/lib/validations';
import { hashPassword, signJwt, setAuthCookie } from '@/lib/auth';
import { verifyCsrf, csrfErrorResponse } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return csrfErrorResponse();
  }

  try {
    const body = await request.json();
    const validation = SignupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, password, businessName } = validation.data;

    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password server-side
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await User.create({
      email,
      passwordHash,
      businessName,
    });

    const userId = user._id;

    // Seed default Settings, Books, Warehouses, and Counters in parallel
    await Promise.all([
      Settings.create({
        userId,
        businessName,
        sellerName: 'Umar Nawaz',
        phone: '+92 303 4333227',
        whatsapp: '+92 303 4333227',
        email: 'info@umarusmanwallpaper.com',
        address: 'College road near five star naan shop, Lahore Punjab Pakistan',
        invoicePrefix: 'INV',
        defaultDiscount: 0,
        taxOn: false,
        taxRate: 0,
      }),
      Book.insertMany([
        { userId, code: 'BK-001', name: 'Rainbow8', color: '#1E6F6C' },
        { userId, code: 'BK-002', name: 'Ayzah', color: '#B8872B' },
        { userId, code: 'BK-003', name: 'Spanish', color: '#8F671E' },
      ]),
      Warehouse.insertMany([
        { userId, code: 'WH-001', name: 'Warehouse 1' },
        { userId, code: 'WH-002', name: 'Warehouse 2' },
        { userId, code: 'WH-003', name: 'Warehouse 3' },
        { userId, code: 'WH-004', name: 'Warehouse 4' },
        { userId, code: 'WH-005', name: 'Warehouse 5' },
      ]),
      Counter.insertMany([
        { userId, type: 'customer', year: 0, seq: 0 },
        { userId, type: 'book', year: 0, seq: 3 },
        { userId, type: 'warehouse', year: 0, seq: 5 },
        { userId, type: 'product', year: 0, seq: 0 },
        { userId, type: 'invoice', year: new Date().getFullYear(), seq: 0 },
        { userId, type: 'payment', year: 0, seq: 0 },
      ]),
    ]);

    // Issue JWT
    const sessionData = {
      userId: userId.toString(),
      email: user.email,
      businessName: user.businessName,
      role: 'admin' as const,
      adminId: userId.toString(),
      name: user.businessName,
    };

    const token = signJwt(sessionData);

    const response = NextResponse.json(
      {
        success: true,
        message: 'Account created successfully! Default catalog & warehouses initialized.',
        user: sessionData,
      },
      { status: 201 }
    );

    // Set secure httpOnly cookie
    setAuthCookie(response, token);

    return response;
  } catch (error: unknown) {
    console.error('Signup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Server error occurred during signup';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
