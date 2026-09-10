import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession, getEffectiveUserId } from '@/lib/auth';
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
    const businessOwnerId = getEffectiveUserId(session);
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const typeFilter = searchParams.get('type'); // 'customer' | 'supplier'
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);

    const query: Record<string, unknown> = { userId: userObjectId };

    if (typeFilter && ['customer', 'supplier'].includes(typeFilter)) {
      query.type = typeFilter;
    }

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

    // Attach purchase, paid, and outstanding balances for each party via aggregation
    const customerIds = customers.map((c) => c._id);
    const balances = await Invoice.aggregate([
      {
        $match: {
          userId: userObjectId,
          customerId: { $in: customerIds },
        },
      },
      {
        $group: {
          _id: '$customerId',
          totalPurchase: { $sum: '$total' },
          totalPaid: { $sum: '$paid' },
          totalRemaining: { $sum: '$remaining' },
          invoiceCount: { $sum: 1 },
        },
      },
    ]);

    const balanceMap = new Map<
      string,
      { totalPurchase: number; totalPaid: number; totalRemaining: number; invoiceCount: number }
    >();
    balances.forEach((b) =>
      balanceMap.set(b._id.toString(), {
        totalPurchase: b.totalPurchase || 0,
        totalPaid: b.totalPaid || 0,
        totalRemaining: b.totalRemaining || 0,
        invoiceCount: b.invoiceCount || 0,
      })
    );

    const customersWithBalances = customers.map((c) => {
      const stats = balanceMap.get(c._id.toString()) || {
        totalPurchase: 0,
        totalPaid: 0,
        totalRemaining: 0,
        invoiceCount: 0,
      };
      return {
        ...c,
        totalPurchase: stats.totalPurchase,
        totalPaid: stats.totalPaid,
        outstandingBalance: stats.totalRemaining,
        invoiceCount: stats.invoiceCount,
      };
    });

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
    const businessOwnerId = getEffectiveUserId(session);
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);

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
