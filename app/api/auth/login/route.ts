import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { LoginSchema } from '@/lib/validations';
import { comparePassword, signJwt, setAuthCookie } from '@/lib/auth';
import { verifyCsrf, csrfErrorResponse } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return csrfErrorResponse();
  }

  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const body = await request.json();
    const validation = LoginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Rate limit failed attempts: max 5 per 15 minutes per IP/Email combo
    const rateLimitKey = `login_${ip}_${email}`;
    const rateCheck = checkRateLimit(rateLimitKey, { limit: 5, windowMs: 15 * 60 * 1000 });
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
        },
        { status: 429 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const sessionData = {
      userId: user._id.toString(),
      email: user.email,
      businessName: user.businessName,
      role: (user.role || 'admin') as 'admin' | 'worker',
      adminId: user.adminId ? user.adminId.toString() : user._id.toString(),
      name: user.name || user.businessName,
    };

    const token = signJwt(sessionData);

    const response = NextResponse.json({
      success: true,
      message: 'Login successful!',
      user: sessionData,
    });

    setAuthCookie(response, token);

    return response;
  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected server error occurred during login' },
      { status: 500 }
    );
  }
}
