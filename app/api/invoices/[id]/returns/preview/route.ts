import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import Invoice from '@/models/Invoice';
import Customer from '@/models/Customer';
import { calculateReturn, ValidationError } from '@/lib/invoiceReturnCalculator';
import { computePaymentAdjustment } from '@/lib/paymentAdjustment';

interface RouteContext {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: 'Invalid invoice ID' }, { status: 400 });
    }

    const body = await request.json();
    const { invoiceItemId, returnQuantity, reason } = body;

    if (!invoiceItemId) {
      return NextResponse.json({ success: false, error: 'invoiceItemId is required.' }, { status: 400 });
    }

    const qty = Number(returnQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json(
        { success: false, error: 'returnQuantity must be a positive number.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const businessOwnerId = session.role === 'worker' && session.adminId ? session.adminId : session.userId;
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    const invoiceId = new mongoose.Types.ObjectId(params.id);

    const invoice = await Invoice.findOne({ _id: invoiceId, userId: userObjectId });
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found.' }, { status: 404 });
    }

    const itemIndex = invoice.items.findIndex(
      (it, idx) =>
        (it._id && it._id.toString() === invoiceItemId.toString()) ||
        String(idx) === String(invoiceItemId) ||
        (it.productId && it.productId.toString() === invoiceItemId.toString())
    );

    if (itemIndex === -1) {
      return NextResponse.json({ success: false, error: 'Invoice item not found.' }, { status: 404 });
    }

    const item = invoice.items[itemIndex];
    if (item.is_fully_returned) {
      return NextResponse.json(
        { success: false, error: 'This item has already been fully returned.' },
        { status: 400 }
      );
    }

    const { returnAmount, newReturnedQty, remainingQty } = calculateReturn(
      {
        quantity: item.qty,
        rate: item.rate,
        returned_quantity: item.returned_quantity,
      },
      qty
    );

    const adjustment = computePaymentAdjustment(
      {
        total: invoice.total,
        paid: invoice.paid,
        remaining: invoice.remaining,
      },
      returnAmount
    );

    let customerName = 'Customer';
    if (invoice.customerId) {
      const customer = await Customer.findById(invoice.customerId).select('name').lean();
      if (customer) customerName = customer.name;
    }

    return NextResponse.json({
      success: true,
      invoiceNumber: invoice.number,
      customerName,
      product: `WP ${item.wp}${item.design ? ' (' + item.design + ')' : ''}`,
      originalQuantity: item.qty,
      returnedQuantity: qty,
      remainingQuantity: remainingQty,
      unitPrice: item.rate,
      returnAmount,
      updatedInvoiceTotal: adjustment.newTotalAmount,
      paymentAdjustment: adjustment,
      reason: reason || null,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Return Preview POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to compute return preview' }, { status: 500 });
  }
}
