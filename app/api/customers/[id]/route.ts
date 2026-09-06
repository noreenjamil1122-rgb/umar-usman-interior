import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import Customer from '@/models/Customer';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import { CustomerSchema } from '@/lib/validations';
import { verifyCsrf, csrfErrorResponse } from '@/lib/csrf';
import { logActivity } from '@/lib/activity';

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
    const customerId = new mongoose.Types.ObjectId(params.id);

    const customer = await Customer.findOne({
      _id: customerId,
      userId: userObjectId,
    }).lean();

    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    // Invoices and Payments for this customer
    const [invoices, payments] = await Promise.all([
      Invoice.find({ userId: userObjectId, customerId }).sort({ date: -1 }).lean(),
      Payment.find({ userId: userObjectId, customerId }).sort({ date: -1 }).lean(),
    ]);

    const totalRemaining = invoices.reduce((acc, inv) => acc + (inv.remaining || 0), 0);
    const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.total || 0), 0);
    const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        customer,
        invoices,
        payments,
        stats: {
          totalInvoiced,
          totalPaid,
          outstandingBalance: totalRemaining,
        },
      },
    });
  } catch (error) {
    console.error('Customer Detail GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer details' },
      { status: 500 }
    );
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

    const body = await request.json();
    const validation = CustomerSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(session.userId);
    const customerId = new mongoose.Types.ObjectId(params.id);

    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: customerId, userId: userObjectId },
      { $set: validation.data },
      { new: true }
    );

    if (!updatedCustomer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Customer details updated',
      data: updatedCustomer,
    });
  } catch (error) {
    console.error('Customer PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update customer' },
      { status: 500 }
    );
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
    const userObjectId = new mongoose.Types.ObjectId(session.userId);
    const customerId = new mongoose.Types.ObjectId(params.id);

    // Check if customer has associated invoices
    const hasInvoices = await Invoice.exists({ userId: userObjectId, customerId });
    if (hasInvoices) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete customer with existing invoices. Please archive or remove invoices first.',
        },
        { status: 400 }
      );
    }

    const deleted = await Customer.findOneAndDelete({
      _id: customerId,
      userId: userObjectId,
    });

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    await logActivity({
      userId: userObjectId,
      type: 'Customer Deleted',
      detail: `${deleted.type === 'supplier' ? 'Supplier' : 'Customer'} deleted: ${deleted.name} (${deleted.code})`,
    });

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    console.error('Customer DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
