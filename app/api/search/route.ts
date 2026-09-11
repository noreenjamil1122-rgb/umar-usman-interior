import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession, getEffectiveUserId } from '@/lib/auth';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import Invoice from '@/models/Invoice';
import {
  buildPhoneRegex,
  buildNameRegex,
  buildInvoiceNumberRegex,
  buildWpNumberRegex,
  escapeRegex,
} from '@/lib/searchUtils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q) {
      return NextResponse.json({
        success: true,
        data: { customers: [], products: [], invoices: [] },
      });
    }

    await connectToDatabase();
    const businessOwnerId = getEffectiveUserId(session);
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    const phoneRegex = buildPhoneRegex(q);
    const nameRegex = buildNameRegex(q);
    const invNumRegex = buildInvoiceNumberRegex(q);
    const wpRegex = buildWpNumberRegex(q);
    const textRegex = { $regex: escapeRegex(q), $options: 'i' };

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

    // Parallel searches with limits
    const [customers, products] = await Promise.all([
      Customer.find({
        userId: userObjectId,
        $or: customerConditions,
      })
        .limit(5)
        .select('name code mobile city')
        .lean(),

      Product.find({
        userId: userObjectId,
        $or: [{ wp: wpRegex }, { design: textRegex }, { brand: textRegex }],
      })
        .limit(5)
        .select('wp design brand salePrice stock')
        .lean(),
    ]);

    const matchedCustomerIds = customers.map((c) => c._id);
    const invoiceOrConditions: Record<string, unknown>[] = [
      { number: invNumRegex },
      { 'items.wp': wpRegex },
      { 'items.design': textRegex },
    ];
    if (matchedCustomerIds.length > 0) {
      invoiceOrConditions.push({ customerId: { $in: matchedCustomerIds } });
    }

    const invoices = await Invoice.find({
      userId: userObjectId,
      $or: invoiceOrConditions,
    })
      .limit(5)
      .populate('customerId', 'name mobile')
      .select('number total remaining date customerId')
      .lean();

    return NextResponse.json({
      success: true,
      data: { customers, products, invoices },
    });
  } catch (error) {
    console.error('Global search error:', error);
    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 });
  }
}
