import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import Customer from '@/models/Customer';
import Invoice from '@/models/Invoice';
import { CustomerSchema } from '@/lib/validations';
import { generateFormattedCode } from '@/lib/counters';
import { verifyCsrf, csrfErrorResponse } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(session.userId);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);

    const query: Record<string, unknown> = { userId: userObjectId };

    if (search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { mobile: { $regex: search.trim(), $options: 'i' } },
        { code: { $regex: search.trim(), $options: 'i' } },
        { city: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Attach outstanding balances for each customer via aggregation
    const customerIds = customers.map((c) => c._id);
    const balances = await Invoice.aggregate([
      {
        $match: {
          userId: userObjectId,
          customerId: { $in: customerIds },
          remaining: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: '$customerId',
          totalRemaining: { $sum: '$remaining' },
        },
      },
    ]);

    const balanceMap = new Map<string, number>();
    balances.forEach((b) => balanceMap.set(b._id.toString(), b.totalRemaining));

    const customersWithBalances = customers.map((c) => ({
      ...c,
      outstandingBalance: balanceMap.get(c._id.toString()) || 0,
    }));

    return NextResponse.json({
      success: true,
      data: customersWithBalances,
    });
  } catch (error) {
    console.error('Customer GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customers' },
      { status: 500 }
    );
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

    const body = await request.json();
    const validation = CustomerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(session.userId);

    // Generate atomic sequential code CUS-00001
    const code = await generateFormattedCode(userObjectId, 'customer');

    const customer = await Customer.create({
      ...validation.data,
      userId: userObjectId,
      code,
      dateAdded: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Customer add ho gaya',
        data: customer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Customer POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}
