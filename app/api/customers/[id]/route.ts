import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession, getEffectiveUserId } from '@/lib/auth';
import Customer from '@/models/Customer';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import { CustomerSchema } from '@/lib/validations';
import { verifyCsrf, csrfErrorResponse } from '@/lib/csrf';
import { logActivity } from '@/lib/activity';
import { maskPartyForUser, isAdmin } from '@/lib/partyAccess';

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
    const businessOwnerId = getEffectiveUserId(session);
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    const customerId = new mongoose.Types.ObjectId(params.id);

    const customer = await Customer.findOne({
      _id: customerId,
      userId: userObjectId,
    }).lean();

    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    const isSupplier = customer.type === 'supplier';
    const isSupplierUnlocked =
      isAdmin(session) ||
      request.headers.get('x-supplier-unlocked') === 'true';
    const locked = isSupplier && !isSupplierUnlocked;

    // Invoices and Payments for this customer (skip querying or hide if locked)
    let invoices: unknown[] = [];
    let payments: unknown[] = [];
    let stats: Record<string, unknown> = {
      totalInvoiced: null,
      totalPaid: null,
      outstandingBalance: null,
      locked: true,
    };

    if (!locked) {
      const [fetchedInvoices, fetchedPayments] = await Promise.all([
        Invoice.find({ userId: userObjectId, customerId }).sort({ date: -1 }).lean(),
        Payment.find({ userId: userObjectId, customerId }).sort({ date: -1 }).lean(),
      ]);

      const totalRemaining = fetchedInvoices.reduce((acc, inv) => acc + (inv.remaining || 0), 0);
      const totalInvoiced = fetchedInvoices.reduce((acc, inv) => acc + (inv.total || 0), 0);
      const totalPaid = fetchedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

      invoices = fetchedInvoices;
      payments = fetchedPayments;
      stats = {
        totalInvoiced,
        totalPaid,
        outstandingBalance: totalRemaining,
        locked: false,
      };
    }

    const effectiveUser = isSupplierUnlocked ? { ...session, role: 'admin' as const } : session;
    const maskedCustomer = maskPartyForUser(customer, effectiveUser);

    return NextResponse.json({
      success: true,
      data: {
        customer: maskedCustomer,
        invoices,
        payments,
        stats,
        locked,
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

    await connectToDatabase();
    const businessOwnerId = getEffectiveUserId(session);
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    const customerId = new mongoose.Types.ObjectId(params.id);

    const existingCustomer = await Customer.findOne({
      _id: customerId,
      userId: userObjectId,
    });

    if (!existingCustomer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    const isSupplierUnlocked =
      isAdmin(session) ||
      request.headers.get('x-supplier-unlocked') === 'true';

    // Block supplier updates for non-admins / locked sessions
    if ((existingCustomer.type === 'supplier' || body.type === 'supplier') && !isSupplierUnlocked) {
      return NextResponse.json(
        { success: false, error: 'Supplier information is admin-only.' },
        { status: 403 }
      );
    }

    const validation = CustomerSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: customerId, userId: userObjectId },
      { $set: validation.data },
      { new: true }
    );

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
    const businessOwnerId = getEffectiveUserId(session);
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    const customerId = new mongoose.Types.ObjectId(params.id);

    const existingCustomer = await Customer.findOne({
      _id: customerId,
      userId: userObjectId,
    });

    if (!existingCustomer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    const isSupplierUnlocked =
      isAdmin(session) ||
      request.headers.get('x-supplier-unlocked') === 'true';

    // Block supplier deletion for non-admins / locked sessions
    if (existingCustomer.type === 'supplier' && !isSupplierUnlocked) {
      return NextResponse.json(
        { success: false, error: 'Supplier information is admin-only.' },
        { status: 403 }
      );
    }

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
