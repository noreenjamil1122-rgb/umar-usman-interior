import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import Invoice from '@/models/Invoice';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q) {
      return NextResponse.json({
        success: true,
        data: { customers: [], products: [], invoices: [] },
      });
    }

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(session.userId);
    const regex = { $regex: q, $options: 'i' };

    // Parallel searches with limits
    const [customers, products, invoices] = await Promise.all([
      Customer.find({
        userId: userObjectId,
        $or: [{ name: regex }, { mobile: regex }, { code: regex }],
      })
        .limit(5)
        .select('name code mobile city')
        .lean(),

      Product.find({
        userId: userObjectId,
        $or: [{ wp: regex }, { design: regex }, { brand: regex }],
      })
        .limit(5)
        .select('wp design brand salePrice stock')
        .lean(),

      Invoice.find({
        userId: userObjectId,
        number: regex,
      })
        .limit(5)
        .populate('customerId', 'name')
        .select('number total remaining date customerId')
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: { customers, products, invoices },
    });
  } catch (error) {
    console.error('Global search error:', error);
    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 });
  }
}
