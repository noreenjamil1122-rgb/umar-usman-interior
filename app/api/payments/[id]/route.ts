import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession, comparePassword } from '@/lib/auth';
import Payment from '@/models/Payment';
import Invoice from '@/models/Invoice';
import Settings from '@/models/Settings';
import { roundMoney } from '@/lib/utils';
import { verifyCsrf, csrfErrorResponse } from '@/lib/csrf';
import { logActivity } from '@/lib/activity';

interface RouteContext {
  params: { id: string };
}

// Helper to verify payment lock password if configured
async function verifyPaymentAuthorization(
  session: { role: string; userId: string; adminId?: string },
  userObjectId: mongoose.Types.ObjectId,
  password?: string
): Promise<{ authorized: boolean; error?: string; status?: number }> {
  const settings = await Settings.findOne({ userId: userObjectId }).lean();
  
  if (!settings?.paymentPasswordHash) {
    // No password configured: Admin has access, workers have access if no lock is set
    return { authorized: true };
  }

  // If password is provided, verify it
  if (password) {
    const isValid = await comparePassword(password, settings.paymentPasswordHash);
    if (!isValid) {
      return { authorized: false, error: 'Incorrect payment security password. Access denied.', status: 403 };
    }
    return { authorized: true };
  }

  // If no password is provided:
  // If user is Admin, allow (or require password if strict)
  if (session.role === 'admin') {
    return { authorized: true };
  }

  // Worker without password
  return { authorized: false, error: 'Payment lock is active. Admin password is required to modify payments.', status: 403 };
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
    const paymentId = new mongoose.Types.ObjectId(params.id);

    const payment = await Payment.findOne({ _id: paymentId, userId: userObjectId })
      .populate('customerId', 'name mobile code')
      .populate('invoiceId', 'number total remaining')
      .lean();

    if (!payment) {
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: payment });
  } catch (error) {
    console.error('Payment GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch payment' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  if (!verifyCsrf(request)) {
    return csrfErrorResponse();
  }

  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const businessOwnerId = session.role === 'worker' && session.adminId ? session.adminId : session.userId;
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    const paymentId = new mongoose.Types.ObjectId(params.id);

    const body = await request.json();
    const { amount, date, method, reference, password } = body;

    // Check payment lock authorization
    const authCheck = await verifyPaymentAuthorization(session, userObjectId, password);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status || 403 }
      );
    }

    const payment = await Payment.findOne({ _id: paymentId, userId: userObjectId });
    if (!payment) {
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }

    if (amount !== undefined) {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ success: false, error: 'Payment amount must be greater than 0' }, { status: 400 });
      }
      payment.amount = roundMoney(numAmount);
    }

    if (date) payment.date = new Date(date);
    if (method) payment.method = method;
    if (reference !== undefined) payment.reference = reference;

    await payment.save();

    // Recalculate associated invoice if linked
    let updatedInvoice = null;
    if (payment.invoiceId) {
      const invoice = await Invoice.findOne({ _id: payment.invoiceId, userId: userObjectId });
      if (invoice) {
        const allPayments = await Payment.find({ invoiceId: payment.invoiceId, userId: userObjectId });
        const totalPaid = roundMoney(allPayments.reduce((sum, p) => sum + (p.amount || 0), 0));
        invoice.paid = totalPaid;
        invoice.remaining = roundMoney(invoice.total - totalPaid);

        if (invoice.remaining <= 0) {
          invoice.jobStatus = 'Fully Paid';
        } else if (invoice.paid > 0 && invoice.jobStatus === 'Fully Paid') {
          invoice.jobStatus = 'Advance Received';
        }
        await invoice.save();
        updatedInvoice = invoice;

        await logActivity({
          userId: userObjectId,
          type: 'Payment Edited',
          detail: `Payment updated: PKR ${payment.amount.toLocaleString()} for Invoice ${invoice.number}`,
          qty: payment.amount,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment updated successfully',
      data: {
        payment,
        invoice: updatedInvoice,
      },
    });
  } catch (error) {
    console.error('Payment PUT error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update payment' }, { status: 500 });
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

    await connectToDatabase();
    const businessOwnerId = session.role === 'worker' && session.adminId ? session.adminId : session.userId;
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    const paymentId = new mongoose.Types.ObjectId(params.id);

    let password = request.nextUrl.searchParams.get('password') || undefined;
    if (!password) {
      try {
        const body = await request.json();
        password = body.password;
      } catch {
        // No json body
      }
    }

    // Check payment lock authorization
    const authCheck = await verifyPaymentAuthorization(session, userObjectId, password);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status || 403 }
      );
    }

    const payment = await Payment.findOne({ _id: paymentId, userId: userObjectId });
    if (!payment) {
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }

    const invoiceId = payment.invoiceId;
    const deletedAmount = payment.amount;

    await Payment.deleteOne({ _id: paymentId, userId: userObjectId });

    // Recalculate associated invoice
    let updatedInvoice = null;
    if (invoiceId) {
      const invoice = await Invoice.findOne({ _id: invoiceId, userId: userObjectId });
      if (invoice) {
        const remainingPayments = await Payment.find({ invoiceId, userId: userObjectId });
        const totalPaid = roundMoney(remainingPayments.reduce((sum, p) => sum + (p.amount || 0), 0));
        invoice.paid = totalPaid;
        invoice.remaining = roundMoney(invoice.total - totalPaid);

        if (invoice.remaining <= 0) {
          invoice.jobStatus = 'Fully Paid';
        } else if (invoice.jobStatus === 'Fully Paid') {
          invoice.jobStatus = invoice.paid > 0 ? 'Advance Received' : 'In Progress';
        }
        await invoice.save();
        updatedInvoice = invoice;

        await logActivity({
          userId: userObjectId,
          type: 'Payment Deleted',
          detail: `Payment deleted: PKR ${deletedAmount.toLocaleString()} from Invoice ${invoice.number}`,
          qty: deletedAmount,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment deleted and invoice balances updated successfully',
      data: {
        invoice: updatedInvoice,
      },
    });
  } catch (error) {
    console.error('Payment DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete payment' }, { status: 500 });
  }
}
