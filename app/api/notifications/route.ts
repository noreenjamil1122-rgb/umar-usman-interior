import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import Invoice from '@/models/Invoice';
import Product from '@/models/Product';
import Payment from '@/models/Payment';
import Customer from '@/models/Customer';
import { formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    // Ensure all referenced models are evaluated for populate
    void Customer;
    void Product;
    void Payment;
    void Invoice;

    const businessOwnerId =
      session.role === 'worker' && session.adminId ? session.adminId : session.userId;
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);

    // 1. Fetch Outstanding Balance (Udhar) Alerts (top 10 highest remaining)
    const unpaidInvoices = await Invoice.find({
      userId: userObjectId,
      remaining: { $gt: 0 },
    })
      .populate('customerId', 'name mobile code')
      .sort({ remaining: -1 })
      .limit(8)
      .lean();

    // 2. Fetch Low Stock & Out of Stock Alerts
    const lowStockProducts = await Product.find({
      userId: userObjectId,
      $expr: { $lte: ['$stock', '$minStock'] },
    })
      .select('wp design stock minStock')
      .sort({ stock: 1 })
      .limit(6)
      .lean();

    // 3. Fetch Recent Payments Received (last 5)
    const recentPayments = await Payment.find({ userId: userObjectId })
      .populate('customerId', 'name')
      .populate('invoiceId', 'number')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const notifications = [];

    // Compile Udhar alerts
    for (const inv of unpaidInvoices) {
      const customer = inv.customerId as { name?: string; code?: string } | null;
      notifications.push({
        id: `debt-${inv._id}`,
        type: 'debt',
        severity: inv.remaining > 50000 ? 'high' : 'medium',
        title: `Pending Udhar: ${formatCurrency(inv.remaining)}`,
        message: `${customer?.name || 'Customer'} (${customer?.code || ''}) has pending balance on Invoice ${inv.number}`,
        link: `/invoices/${inv._id}`,
        date: inv.createdAt || inv.date,
        unread: true,
      });
    }

    // Compile Stock alerts
    for (const prod of lowStockProducts) {
      const isOut = prod.stock <= 0;
      notifications.push({
        id: `stock-${prod._id}`,
        type: 'stock',
        severity: isOut ? 'high' : 'medium',
        title: isOut ? `OUT OF STOCK: ${prod.wp}` : `Low Stock: ${prod.wp} (${prod.stock} left)`,
        message: `${prod.design} requires restocking. Minimum threshold is ${prod.minStock} rolls.`,
        link: `/products?search=${encodeURIComponent(prod.wp)}`,
        date: new Date(),
        unread: true,
      });
    }

    // Compile Payment receipt alerts
    for (const p of recentPayments) {
      const customer = p.customerId as { name?: string } | null;
      const inv = p.invoiceId as { number?: string } | null;
      notifications.push({
        id: `payment-${p._id}`,
        type: 'payment',
        severity: 'info',
        title: `Payment Received: ${formatCurrency(p.amount)}`,
        message: `Received via ${p.method} from ${customer?.name || 'Client'}${inv?.number ? ` for ${inv.number}` : ''}`,
        link: `/payments`,
        date: p.date || p.createdAt,
        unread: false,
      });
    }

    // 4. Check Settings for reminder acknowledgement
    const Settings = (await import('@/models/Settings')).default;
    const settings = await Settings.findOne({ userId: userObjectId }).select('reminderAckDate').lean();
    const todayStr = new Date().toISOString().split('T')[0];
    const ackDateStr = settings?.reminderAckDate ? new Date(settings.reminderAckDate).toISOString().split('T')[0] : '';
    const hasUnackedUdhar = unpaidInvoices.length > 0 && ackDateStr !== todayStr;

    // Sort by date descending
    notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      data: {
        hasUnackedUdhar,
        totalUnread: notifications.filter((n) => n.severity === 'high' || n.type === 'debt' || n.type === 'stock').length,
        notifications: notifications.slice(0, 15),
        unpaidInvoices: unpaidInvoices.map((inv) => ({
          _id: inv._id,
          number: inv.number,
          remaining: inv.remaining,
          customerName: (inv.customerId as any)?.name || 'Customer',
          customerMobile: (inv.customerId as any)?.mobile || '',
        })),
      },
    });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
