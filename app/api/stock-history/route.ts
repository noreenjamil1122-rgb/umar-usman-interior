import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import StockHistory from '@/models/StockHistory';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(session.userId);

    const { searchParams } = new URL(request.url);
    const wp = searchParams.get('wp');
    const type = searchParams.get('type');
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);

    const query: Record<string, unknown> = { userId: userObjectId };
    if (wp) query.wp = { $regex: wp.trim(), $options: 'i' };
    if (type) query.type = type;

    const history = await StockHistory.find(query)
      .populate('productId', 'design brand category')
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Stock History GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock history' },
      { status: 500 }
    );
  }
}
