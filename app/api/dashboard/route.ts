import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import Settings from '@/models/Settings';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(session.userId);

    const { searchParams } = new URL(request.url);
    const dateQuery = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const dayStart = new Date(`${dateQuery}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateQuery}T23:59:59.999Z`);

    // Parallel aggregation queries for speed
    const [
      customerCount,
      productStats,
      invoiceStats,
      recentInvoices,
      stockAttention,
      settings,
      debtCustomers,
      daySalesStats,
      dayPaymentStats,
      recentPayments,
    ] = await Promise.all([
      // 1. Total Customers
      Customer.countDocuments({ userId: userObjectId }),

      // 2. Product Stats (Total rolls, low stock count, out of stock count)
      Product.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalStock: { $sum: '$stock' },
            outOfStock: {
              $sum: { $cond: [{ $lte: ['$stock', 0] }, 1, 0] },
            },
            lowStock: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ['$stock', 0] },
                      { $lte: ['$stock', '$minStock'] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),

      // 3. Invoice Financials (Revenue, Collected, Outstanding)
      Invoice.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalCollected: { $sum: '$paid' },
            totalOutstanding: { $sum: '$remaining' },
            invoiceCount: { $sum: 1 },
          },
        },
      ]),

      // 4. Recent Invoices
      Invoice.find({ userId: userObjectId })
        .sort({ date: -1 })
        .limit(5)
        .populate('customerId', 'name mobile code')
        .lean(),

      // 5. Stock Attention (Out of stock & low stock items)
      Product.find({
        userId: userObjectId,
        $or: [{ stock: { $lte: 0 } }, { $expr: { $lte: ['$stock', '$minStock'] } }],
      })
        .limit(8)
        .lean(),

      // 6. Settings (Business profile & Ack date)
      Settings.findOne({ userId: userObjectId }).lean(),

      // 7. Customers with outstanding balances
      Invoice.aggregate([
        { $match: { userId: userObjectId, remaining: { $gt: 0 } } },
        {
          $group: {
            _id: '$customerId',
            totalDebt: { $sum: '$remaining' },
            oldestInvoiceDate: { $min: '$date' },
            invoiceCount: { $sum: 1 },
          },
        },
        { $sort: { totalDebt: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'customers',
            localField: '_id',
            foreignField: '_id',
            as: 'customer',
          },
        },
        { $unwind: '$customer' },
        {
          $project: {
            customerId: '$_id',
            customerName: '$customer.name',
            customerMobile: '$customer.mobile',
            customerCode: '$customer.code',
            totalDebt: 1,
            oldestInvoiceDate: 1,
            invoiceCount: 1,
          },
        },
      ]),

      // 8. Day Sales
      Invoice.aggregate([
        { $match: { userId: userObjectId, date: { $gte: dayStart, $lte: dayEnd } } },
        { $group: { _id: null, totalSales: { $sum: '$total' }, invoiceCount: { $sum: 1 } } },
      ]),

      // 9. Day Payments
      Payment.aggregate([
        { $match: { userId: userObjectId, date: { $gte: dayStart, $lte: dayEnd } } },
        { $group: { _id: null, totalPayments: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),

      // 10. Recent Payments
      Payment.find({ userId: userObjectId })
        .sort({ date: -1, createdAt: -1 })
        .limit(6)
        .populate('customerId', 'name mobile code')
        .lean(),
    ]);

    const pStat = productStats[0] || {
      totalProducts: 0,
      totalStock: 0,
      outOfStock: 0,
      lowStock: 0,
    };

    const iStat = invoiceStats[0] || {
      totalRevenue: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      invoiceCount: 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalCustomers: customerCount,
          totalProducts: pStat.totalProducts,
          totalStockRolls: pStat.totalStock,
          outOfStockCount: pStat.outOfStock,
          lowStockCount: pStat.lowStock,
          totalRevenue: iStat.totalRevenue,
          totalCollected: iStat.totalCollected,
          totalOutstanding: iStat.totalOutstanding,
          totalInvoices: iStat.invoiceCount,
          salesThisDay: daySalesStats[0]?.totalSales || 0,
          paymentsThisDay: dayPaymentStats[0]?.totalPayments || 0,
        },
        selectedDate: dateQuery,
        recentInvoices,
        recentPayments: recentPayments || [],
        stockAttention,
        debtCustomers,
        businessName: settings?.businessName || session.businessName,
        reminderAckDate: settings?.reminderAckDate,
      },
    });
  } catch (error: unknown) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}
