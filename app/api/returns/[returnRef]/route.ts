import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import InvoiceReturn from '@/models/InvoiceReturn';

interface RouteContext {
  params: { returnRef: string };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const businessOwnerId = session.role === 'worker' && session.adminId ? session.adminId : session.userId;
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);

    const invoiceReturn = await InvoiceReturn.findOne({
      returnRef: params.returnRef,
      userId: userObjectId,
    })
      .populate('invoiceId', 'number date total paid remaining')
      .populate('customerId', 'name mobile code city')
      .populate('productId', 'wp design brand category unit')
      .populate('processedBy', 'name email role')
      .lean();

    if (!invoiceReturn) {
      return NextResponse.json({ success: false, error: 'Return not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: invoiceReturn,
      returnRecord: invoiceReturn,
    });
  } catch (error) {
    console.error('Return Detail GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch return record' }, { status: 500 });
  }
}
