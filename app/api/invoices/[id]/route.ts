import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import Invoice from '@/models/Invoice';
import Product from '@/models/Product';
import StockHistory from '@/models/StockHistory';
import Payment from '@/models/Payment';
import Settings from '@/models/Settings';
import { roundMoney } from '@/lib/utils';
import { verifyCsrf, csrfErrorResponse } from '@/lib/csrf';

interface RouteContext {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(session.userId);
    const invoiceId = new mongoose.Types.ObjectId(params.id);

    const invoice = await Invoice.findOne({ _id: invoiceId, userId: userObjectId })
      .populate('customerId', 'name mobile whatsapp address city code')
      .lean();

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    // Also fetch business settings and payment history for this invoice
    const [settings, payments] = await Promise.all([
      Settings.findOne({ userId: userObjectId }).lean(),
      Payment.find({ userId: userObjectId, invoiceId }).sort({ date: -1 }).lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        invoice,
        settings,
        payments,
      },
    });
  } catch (error) {
    console.error('Invoice Detail GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invoice' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!verifyCsrf(request)) {
    return csrfErrorResponse();
  }

  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Restrict invoice deletion to Admin only
    if (session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Workers cannot delete invoices. Only Admin is authorized.' },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const businessOwnerId = session.role === 'worker' && session.adminId ? session.adminId : session.userId;
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    const invoiceId = new mongoose.Types.ObjectId(params.id);

    const invoice = await Invoice.findOne({ _id: invoiceId, userId: userObjectId });
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    // Restore stock for all sold items on this invoice
    for (const item of invoice.items) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: item.productId, userId: userObjectId },
        { $inc: { stock: item.qty } }
      );

      const prevStock = updatedProduct ? updatedProduct.stock : 0;
      await StockHistory.create({
        userId: userObjectId,
        date: new Date(),
        productId: item.productId,
        wp: item.wp,
        type: 'Return',
        qty: item.qty,
        prevStock,
        newStock: prevStock + item.qty,
        reference: `Invoice ${invoice.number} Deleted - Stock Restored`,
      });
    }

    // Delete associated payments
    await Payment.deleteMany({ userId: userObjectId, invoiceId });

    // Delete invoice
    await Invoice.deleteOne({ _id: invoiceId, userId: userObjectId });

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted and inventory restored successfully',
    });
  } catch (error) {
    console.error('Invoice DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete invoice' }, { status: 500 });
  }
}
