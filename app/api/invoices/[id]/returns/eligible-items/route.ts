import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import Invoice from '@/models/Invoice';
import { round2 } from '@/lib/invoiceReturnCalculator';

interface RouteContext {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: 'Invalid invoice ID' }, { status: 400 });
    }

    await connectToDatabase();
    const businessOwnerId = session.role === 'worker' && session.adminId ? session.adminId : session.userId;
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    const invoiceId = new mongoose.Types.ObjectId(params.id);

    const invoice = await Invoice.findOne({ _id: invoiceId, userId: userObjectId }).lean();
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    const items = (invoice.items || [])
      .map((item, idx) => {
        const returnedQty = Number(item.returned_quantity) || 0;
        const totalQty = Number(item.qty) || 0;
        const remainingQty = round2(totalQty - returnedQty);
        const isFullyReturned = Boolean(item.is_fully_returned || remainingQty <= 0);

        const itemId = item._id ? item._id.toString() : String(idx);

        return {
          id: itemId,
          invoiceItemId: itemId,
          productId: item.productId ? item.productId.toString() : null,
          product_name: `WP ${item.wp}${item.design ? ' (' + item.design + ')' : ''}`,
          wp: item.wp,
          design: item.design,
          quantity: totalQty,
          returned_quantity: returnedQty,
          remaining_quantity: remainingQty,
          unit_price: Number(item.rate) || 0,
          is_fully_returned: isFullyReturned,
        };
      })
      .filter((item) => !item.is_fully_returned && item.remaining_quantity > 0);

    return NextResponse.json({
      success: true,
      items,
    });
  } catch (error) {
    console.error('Eligible Items GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch eligible return items' },
      { status: 500 }
    );
  }
}
