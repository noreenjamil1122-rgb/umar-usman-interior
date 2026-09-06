import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession, comparePassword } from '@/lib/auth';
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

import { logActivity } from '@/lib/activity';

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
    const invoiceId = new mongoose.Types.ObjectId(params.id);

    const invoice = await Invoice.findOne({ _id: invoiceId, userId: userObjectId });
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      customerId,
      date,
      sellerName,
      sellerContact,
      reference,
      terms,
      notes,
      jobStatus,
      additionalPayment,
    } = body;

    // Update header fields
    if (customerId) invoice.customerId = new mongoose.Types.ObjectId(customerId);
    if (date) invoice.date = new Date(date);
    if (sellerName) invoice.sellerName = sellerName;
    if (sellerContact) invoice.sellerContact = sellerContact;
    if (reference !== undefined) invoice.reference = reference;
    if (terms !== undefined) invoice.terms = terms;
    if (notes !== undefined) invoice.notes = notes;
    if (jobStatus !== undefined) invoice.jobStatus = jobStatus;

    // Handle additional payment entry if provided
    if (additionalPayment && typeof additionalPayment.amount === 'number' && additionalPayment.amount > 0) {
      const settings = await Settings.findOne({ userId: userObjectId }).lean();
      if (settings?.paymentPasswordHash && session.role === 'worker') {
        const password = body.paymentPassword || additionalPayment.password;
        if (!password) {
          return NextResponse.json(
            { success: false, error: 'Payment lock is active. Admin password is required to record additional payments.' },
            { status: 403 }
          );
        }
        const isValid = await comparePassword(password, settings.paymentPasswordHash);
        if (!isValid) {
          return NextResponse.json(
            { success: false, error: 'Incorrect payment security password. Access denied.' },
            { status: 403 }
          );
        }
      }

      const paymentAmount = roundMoney(additionalPayment.amount);
      const paymentDate = additionalPayment.date ? new Date(additionalPayment.date) : new Date();
      const paymentMethod = additionalPayment.method || 'Cash';
      const paymentRef = additionalPayment.reference || `Payment for Invoice ${invoice.number}`;

      await Payment.create({
        userId: userObjectId,
        date: paymentDate,
        customerId: invoice.customerId,
        invoiceId: invoice._id,
        amount: paymentAmount,
        method: paymentMethod,
        reference: paymentRef,
      });

      invoice.paid = roundMoney((invoice.paid || 0) + paymentAmount);
      invoice.remaining = roundMoney(invoice.total - invoice.paid);

      if (invoice.remaining <= 0) {
        invoice.jobStatus = 'Fully Paid';
      }
    }

    await invoice.save();

    return NextResponse.json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice,
    });
  } catch (error) {
    console.error('Invoice PUT error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update invoice' }, { status: 500 });
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
    const userObjectId = new mongoose.Types.ObjectId(session.userId);
    const invoiceId = new mongoose.Types.ObjectId(params.id);

    const invoice = await Invoice.findOne({ _id: invoiceId, userId: userObjectId });
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    // Restore stock for all sold items on this invoice
    for (const item of invoice.items) {
      if (!item.productId) continue;
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

    // Log Activity
    await logActivity({
      userId: userObjectId,
      type: 'Invoice Deleted',
      detail: `Deleted invoice ${invoice.number} (Total: Rs. ${invoice.total}) - inventory restored`,
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted and inventory restored successfully',
    });
  } catch (error) {
    console.error('Invoice DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete invoice' }, { status: 500 });
  }
}
