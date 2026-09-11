import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import Invoice from '@/models/Invoice';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import StockHistory from '@/models/StockHistory';
import Payment from '@/models/Payment';
import { InvoiceSchema } from '@/lib/validations';
import { generateFormattedCode } from '@/lib/counters';
import { roundMoney } from '@/lib/utils';
import { verifyCsrf, csrfErrorResponse } from '@/lib/csrf';

import {
  buildPhoneRegex,
  buildNameRegex,
  buildInvoiceNumberRegex,
  buildWpNumberRegex,
  escapeRegex,
  scoreInvoiceMatch,
  SearchableInvoice,
} from '@/lib/searchUtils';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const businessOwnerId = session.role === 'worker' && session.adminId ? session.adminId : session.userId;
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status'); // 'paid', 'partial', 'unpaid'
    const partyType = searchParams.get('partyType'); // 'customer' | 'supplier'
    const limit = Math.min(Number(searchParams.get('limit')) || (search.trim() ? 100 : 50), 200);

    const andConditions: Record<string, unknown>[] = [{ userId: userObjectId }];
    const trimmedSearch = search.trim();

    // 1. Search matching customer IDs if search query is present
    let matchingCustomerIds: mongoose.Types.ObjectId[] = [];
    if (trimmedSearch) {
      const phoneRegex = buildPhoneRegex(trimmedSearch);
      const nameRegex = buildNameRegex(trimmedSearch);
      const textRegex = { $regex: escapeRegex(trimmedSearch), $options: 'i' };

      const customerConditions: Record<string, unknown>[] = [
        { name: nameRegex },
        { code: textRegex },
        { city: textRegex },
      ];

      if (phoneRegex) {
        customerConditions.push({ mobile: phoneRegex });
        customerConditions.push({ whatsapp: phoneRegex });
      } else {
        customerConditions.push({ mobile: textRegex });
      }

      const custQuery: Record<string, unknown> = {
        userId: userObjectId,
        $or: customerConditions,
      };

      if (partyType === 'supplier') {
        custQuery.type = 'supplier';
      } else if (partyType === 'customer') {
        custQuery.type = { $ne: 'supplier' };
      }

      const matchedCustomers = await Customer.find(custQuery).select('_id').lean();
      matchingCustomerIds = matchedCustomers.map((c) => c._id as mongoose.Types.ObjectId);
    }

    // 2. Filter by customerId or partyType
    if (customerId) {
      andConditions.push({ customerId: new mongoose.Types.ObjectId(customerId) });
    } else if (partyType) {
      const supplierCustomers = await Customer.find({ userId: userObjectId, type: 'supplier' }).select('_id').lean();
      const supplierIds = supplierCustomers.map((c) => c._id);
      if (partyType === 'supplier') {
        andConditions.push({ customerId: { $in: supplierIds } });
      } else {
        andConditions.push({ customerId: { $nin: supplierIds } });
      }
    }

    // 3. Status filter
    if (status === 'paid') {
      andConditions.push({ remaining: { $lte: 0 } });
    } else if (status === 'unpaid') {
      andConditions.push({ $expr: { $eq: ['$paid', 0] } });
    } else if (status === 'partial') {
      andConditions.push({ paid: { $gt: 0 }, remaining: { $gt: 0 } });
    }

    // 4. Combined Search query across invoice number, customer IDs, and wallpaper WP items
    if (trimmedSearch) {
      const invNumRegex = buildInvoiceNumberRegex(trimmedSearch);
      const wpRegex = buildWpNumberRegex(trimmedSearch);
      const textRegex = { $regex: escapeRegex(trimmedSearch), $options: 'i' };

      const searchOrConditions: Record<string, unknown>[] = [
        { number: invNumRegex },
        { 'items.wp': wpRegex },
        { 'items.design': textRegex },
      ];

      if (matchingCustomerIds.length > 0) {
        searchOrConditions.push({ customerId: { $in: matchingCustomerIds } });
      }

      andConditions.push({ $or: searchOrConditions });
    }

    const query = andConditions.length === 1 ? andConditions[0] : { $and: andConditions };

    const invoices = await Invoice.find(query)
      .populate('customerId', 'name mobile code city type')
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    // 5. Rank by exact/strongest match relevance if search query was provided
    if (trimmedSearch && invoices.length > 1) {
      (invoices as unknown as SearchableInvoice[]).sort((a, b) => {
        const scoreA = scoreInvoiceMatch(a, trimmedSearch);
        const scoreB = scoreInvoiceMatch(b, trimmedSearch);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        // Fallback to date descending
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateB - dateA;
      });
    }

    return NextResponse.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error('Invoices GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 });
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
    const validation = InvoiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid invoice data' },
        { status: 400 }
      );
    }

    const businessOwnerId = session.role === 'worker' && session.adminId ? session.adminId : session.userId;
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);

    const { customerId, items, discount = 0, tax = 0, paid = 0, method = 'Cash', notes } =
      validation.data;
    const requestedJobStatus = body.jobStatus as string | undefined;

    // Verify Customer ownership
    const customer = await Customer.findOne({
      _id: new mongoose.Types.ObjectId(customerId),
      userId: userObjectId,
    });
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    // Server-side recalculation of line items and stock availability check
    let subtotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const rate = roundMoney(item.rate);
      const lineAmount = roundMoney(item.qty * rate);
      subtotal = roundMoney(subtotal + lineAmount);

      if (item.productId) {
        const prodId = new mongoose.Types.ObjectId(item.productId);
        const product = await Product.findOne({ _id: prodId, userId: userObjectId });

        if (!product) {
          return NextResponse.json(
            { success: false, error: `Product WP# ${item.wp} not found` },
            { status: 404 }
          );
        }

        if (product.stock < item.qty) {
          return NextResponse.json(
            {
              success: false,
              error: `Insufficient stock for WP# ${product.wp} (${product.design}). Available: ${product.stock} rolls, Requested: ${item.qty} rolls.`,
            },
            { status: 400 }
          );
        }

        verifiedItems.push({
          productId: prodId,
          wp: product.wp,
          design: product.design,
          qty: item.qty,
          rate,
          amount: lineAmount,
        });
      } else {
        // Service / Auxiliary charge (e.g. Gum charges, Installation charges)
        verifiedItems.push({
          wp: item.wp,
          design: item.design || 'Service Charge',
          qty: item.qty,
          rate,
          amount: lineAmount,
        });
      }
    }

    // Financial calculations
    const rawDiscount = Math.max(Number(discount) || 0, 0);
    const discountAmount = Math.min(rawDiscount, subtotal);
    const taxableAmount = roundMoney(Math.max(0, subtotal - discountAmount));
    const taxRate = Math.max(tax, 0);
    const taxAmount = roundMoney((taxableAmount * taxRate) / 100);
    const total = roundMoney(taxableAmount + taxAmount);
    const safePaid = Math.max(paid, 0);
    const remaining = roundMoney(total - safePaid);

    // Determine Job Status: if remaining <= 0 -> 'Fully Paid', otherwise use requested status or 'Advance Received'
    const finalJobStatus =
      remaining <= 0
        ? 'Fully Paid'
        : requestedJobStatus || 'Advance Received';

    // Generate atomic sequential invoice number (e.g. INV-2026-00001)
    const invoiceNumber = await generateFormattedCode(userObjectId, 'invoice');

    // Create Invoice
    const invoice = await Invoice.create({
      userId: userObjectId,
      number: invoiceNumber,
      customerId: customer._id,
      date: validation.data.date ? new Date(validation.data.date) : new Date(),
      sellerName: validation.data.sellerName || 'Umar Nawaz',
      sellerContact: validation.data.sellerContact || '0300-4131532',
      items: verifiedItems,
      subtotal,
      discount: discountAmount,
      tax: taxRate,
      total,
      paid: safePaid,
      remaining,
      method,
      jobStatus: finalJobStatus,
      reference: validation.data.reference || '0',
      terms: validation.data.terms || 'Custom',
      createdByRole: session.role || 'admin',
      createdByName: session.name || session.email,
      notes,
    });

    // Atomically decrement stock and record StockHistory only for items with a productId
    for (const item of verifiedItems) {
      if (!item.productId) continue; // Skip service charges

      const updatedProd = await Product.findOneAndUpdate(
        { _id: item.productId, userId: userObjectId },
        { $inc: { stock: -item.qty } }
      );

      const prevStock = updatedProd ? updatedProd.stock : 0;
      await StockHistory.create({
        userId: userObjectId,
        date: new Date(),
        productId: item.productId,
        wp: item.wp,
        type: 'Sold',
        qty: -item.qty,
        prevStock,
        newStock: prevStock - item.qty,
        reference: `Invoice ${invoiceNumber} (${customer.name})`,
      });
    }

    // If initial payment was made during invoice creation, record in Payment ledger
    if (safePaid > 0) {
      await Payment.create({
        userId: userObjectId,
        date: invoice.date,
        customerId: customer._id,
        invoiceId: invoice._id,
        amount: safePaid,
        method,
        reference: `Initial payment for ${invoiceNumber}`,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Invoice save ho gaya',
        data: invoice,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Invoice POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create invoice' }, { status: 500 });
  }
}
