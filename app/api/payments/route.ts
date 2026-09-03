import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession, comparePassword } from '@/lib/auth';
import Payment from '@/models/Payment';
import Invoice from '@/models/Invoice';
import Customer from '@/models/Customer';
import Settings from '@/models/Settings';
import { PaymentSchema } from '@/lib/validations';
import { roundMoney } from '@/lib/utils';
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
    const customerId = searchParams.get('customerId');
    const invoiceId = searchParams.get('invoiceId');
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);

    const query: Record<string, unknown> = { userId: userObjectId };
    if (customerId) query.customerId = new mongoose.Types.ObjectId(customerId);
    if (invoiceId) query.invoiceId = new mongoose.Types.ObjectId(invoiceId);

    const payments = await Payment.find(query)
      .populate('customerId', 'name mobile code')
      .populate('invoiceId', 'number total remaining')
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error('Payments GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch payments' }, { status: 500 });
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
    const validation = PaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid payment parameters' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(session.userId);

    const { customerId, invoiceId, amount, method, reference, password } = validation.data;

    // Check if user has payment password configured
    const settings = await Settings.findOne({ userId: userObjectId });
    if (settings?.paymentPasswordHash) {
      if (!password) {
        return NextResponse.json(
          { success: false, error: 'Payment confirmation password is required.' },
          { status: 403 }
        );
      }
      const isPasswordValid = await comparePassword(password, settings.paymentPasswordHash);
      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, error: 'Incorrect payment confirmation password.' },
          { status: 403 }
        );
      }
    }

    // Verify Customer ownership
    const customer = await Customer.findOne({
      _id: new mongoose.Types.ObjectId(customerId),
      userId: userObjectId,
    });
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    const paymentAmount = roundMoney(amount);

    let invoice = null;
    if (invoiceId) {
      const invId = new mongoose.Types.ObjectId(invoiceId);
      invoice = await Invoice.findOne({ _id: invId, userId: userObjectId });

      if (!invoice) {
        return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
      }

      // Update invoice paid & remaining
      const newPaid = roundMoney(invoice.paid + paymentAmount);
      const newRemaining = roundMoney(Math.max(invoice.total - newPaid, 0));
      const newJobStatus = newRemaining === 0 ? 'Fully Paid' : (invoice.jobStatus || 'Advance Received');

      await Invoice.updateOne(
        { _id: invId, userId: userObjectId },
        { $set: { paid: newPaid, remaining: newRemaining, jobStatus: newJobStatus } }
      );
    }

    // Record Payment
    const payment = await Payment.create({
      userId: userObjectId,
      date: new Date(),
      customerId: customer._id,
      invoiceId: invoice ? invoice._id : undefined,
      amount: paymentAmount,
      method,
      reference: reference || (invoice ? `Payment for ${invoice.number}` : 'Customer balance payment'),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Payment wasool ho gaya (Payment recorded)',
        data: payment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Payment POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to record payment' }, { status: 500 });
  }
}
