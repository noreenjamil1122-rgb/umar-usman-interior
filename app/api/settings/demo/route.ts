import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import Book from '@/models/Book';
import Warehouse from '@/models/Warehouse';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import StockHistory from '@/models/StockHistory';
import { generateFormattedCode } from '@/lib/counters';
import { verifyCsrf, csrfErrorResponse } from '@/lib/csrf';

export async function POST(request: NextRequest) {
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

    // Get an existing Book and Warehouse
    const defaultBook = await Book.findOne({ userId: userObjectId });
    const defaultWarehouse = await Warehouse.findOne({ userId: userObjectId });

    // 1. Seed Demo Customers
    const c1Code = await generateFormattedCode(userObjectId, 'customer');
    const c2Code = await generateFormattedCode(userObjectId, 'customer');

    const [c1, c2] = await Promise.all([
      Customer.create({
        userId: userObjectId,
        code: c1Code,
        name: 'Mian Tariq Interior',
        mobile: '0300-1234567',
        whatsapp: '0300-1234567',
        address: 'Main Boulevard, Gulberg III',
        city: 'Lahore',
        isDemo: true,
      }),
      Customer.create({
        userId: userObjectId,
        code: c2Code,
        name: 'Haji Aslam & Sons Decorators',
        mobile: '0321-7654321',
        whatsapp: '0321-7654321',
        address: 'DHA Phase 5, Commercial',
        city: 'Lahore',
        isDemo: true,
      }),
    ]);

    // 2. Seed Demo Products
    const [p1, p2, p3] = await Promise.all([
      Product.create({
        userId: userObjectId,
        wp: 'WP-101',
        design: 'Royal Floral Gold',
        brand: 'Rainbow8',
        category: 'Textured Velvet',
        bookId: defaultBook?._id,
        warehouseId: defaultWarehouse?._id,
        purchasePrice: 2200,
        salePrice: 3800,
        stock: 35,
        minStock: 5,
        isDemo: true,
      }),
      Product.create({
        userId: userObjectId,
        wp: 'WP-102',
        design: 'Nordic Concrete Grey',
        brand: 'Ayzah',
        category: 'Non-Woven Vinyl',
        bookId: defaultBook?._id,
        warehouseId: defaultWarehouse?._id,
        purchasePrice: 1800,
        salePrice: 3100,
        stock: 3, // Low stock test
        minStock: 5,
        isDemo: true,
      }),
      Product.create({
        userId: userObjectId,
        wp: 'WP-103',
        design: 'Damask Vintage Beige',
        brand: 'Spanish',
        category: 'Embossed Silk',
        bookId: defaultBook?._id,
        warehouseId: defaultWarehouse?._id,
        purchasePrice: 2500,
        salePrice: 4200,
        stock: 0, // Out of stock test
        minStock: 5,
        isDemo: true,
      }),
    ]);

    // 3. Seed Opening Stock History for demo products
    await StockHistory.insertMany([
      {
        userId: userObjectId,
        date: new Date(),
        productId: p1._id,
        wp: p1.wp,
        type: 'Opening Stock',
        qty: 35,
        prevStock: 0,
        newStock: 35,
        reference: 'Demo Opening Stock',
        isDemo: true,
      },
      {
        userId: userObjectId,
        date: new Date(),
        productId: p2._id,
        wp: p2.wp,
        type: 'Opening Stock',
        qty: 3,
        prevStock: 0,
        newStock: 3,
        reference: 'Demo Opening Stock',
        isDemo: true,
      },
    ]);

    // 4. Seed Demo Invoice with unpaid Udhar balance
    const invNumber = await generateFormattedCode(userObjectId, 'invoice');
    const inv = await Invoice.create({
      userId: userObjectId,
      number: invNumber,
      customerId: c1._id,
      date: new Date(),
      items: [
        {
          productId: p1._id,
          wp: p1.wp,
          design: p1.design,
          qty: 5,
          rate: 3800,
          amount: 19000,
        },
      ],
      subtotal: 19000,
      discount: 0,
      tax: 0,
      total: 19000,
      paid: 5000,
      remaining: 14000,
      method: 'Cash',
      notes: 'Demo Invoice for testing Udhar alerts and reports',
      isDemo: true,
    });

    // 5. Seed Demo Payment for initial deposit
    await Payment.create({
      userId: userObjectId,
      date: new Date(),
      customerId: c1._id,
      invoiceId: inv._id,
      amount: 5000,
      method: 'Cash',
      reference: `Initial deposit for ${invNumber}`,
      isDemo: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Demo data seed ho gaya (Customers, Products, Invoices, Stock History)',
    });
  } catch (error) {
    console.error('Demo Seed error:', error);
    return NextResponse.json({ success: false, error: 'Failed to seed demo data' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    // Delete ONLY records flagged as isDemo: true
    await Promise.all([
      Customer.deleteMany({ userId: userObjectId, isDemo: true }),
      Product.deleteMany({ userId: userObjectId, isDemo: true }),
      Invoice.deleteMany({ userId: userObjectId, isDemo: true }),
      Payment.deleteMany({ userId: userObjectId, isDemo: true }),
      StockHistory.deleteMany({ userId: userObjectId, isDemo: true }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Demo data saaf kar diya gaya (All demo records removed safely)',
    });
  } catch (error) {
    console.error('Demo Cleanup error:', error);
    return NextResponse.json({ success: false, error: 'Failed to clean demo data' }, { status: 500 });
  }
}
