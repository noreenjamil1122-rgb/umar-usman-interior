import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Papa from 'papaparse';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import StockHistory from '@/models/StockHistory';
import ActivityLog from '@/models/ActivityLog';

interface RouteContext {
  params: { module: string };
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
    const { module } = params;

    let csvData: Record<string, unknown>[] = [];
    const todayStr = new Date().toISOString().split('T')[0];
    let fileName = `${module}-${todayStr}.csv`;

    switch (module) {
      case 'customers': {
        const customers = await Customer.find({ userId: userObjectId }).sort({ code: 1 }).lean();
        csvData = customers.map((c) => ({
          'Customer Code': c.code,
          Name: c.name,
          Mobile: c.mobile,
          WhatsApp: c.whatsapp || '',
          'Alt Phone': c.alt || '',
          Address: c.address || '',
          City: c.city || 'Lahore',
          Notes: c.notes || '',
          'Date Added': c.dateAdded ? new Date(c.dateAdded).toLocaleDateString('en-GB') : '',
        }));
        break;
      }

      case 'products': {
        const products = await Product.find({ userId: userObjectId })
          .populate('bookId', 'name')
          .populate('warehouseId', 'name')
          .sort({ wp: 1 })
          .lean();

        csvData = products.map((p) => ({
          'WP Number': p.wp,
          Design: p.design,
          Brand: p.brand || '',
          Category: p.category || '',
          Book: (p.bookId as { name?: string })?.name || '',
          Warehouse: (p.warehouseId as { name?: string })?.name || '',
          Color: p.color || '',
          Size: p.size || '',
          Unit: p.unit || 'Roll',
          'Purchase Price (PKR)': p.purchasePrice,
          'Sale Price (PKR)': p.salePrice,
          'Current Stock': p.stock,
          'Min Stock Threshold': p.minStock,
          Supplier: p.supplier || '',
        }));
        break;
      }

      case 'invoices': {
        const invoices = await Invoice.find({ userId: userObjectId })
          .populate('customerId', 'name mobile code')
          .sort({ date: -1 })
          .lean();

        csvData = invoices.map((inv) => ({
          'Invoice Number': inv.number,
          Date: inv.date ? new Date(inv.date).toLocaleDateString('en-GB') : '',
          'Customer Code': (inv.customerId as { code?: string })?.code || '',
          'Customer Name': (inv.customerId as { name?: string })?.name || '',
          'Subtotal (PKR)': inv.subtotal,
          'Discount (%)': inv.discount,
          'Tax (%)': inv.tax,
          'Total Amount (PKR)': inv.total,
          'Paid Amount (PKR)': inv.paid,
          'Remaining Balance (PKR)': inv.remaining,
          'Payment Method': inv.method,
          Notes: inv.notes || '',
        }));
        break;
      }

      case 'payments': {
        const payments = await Payment.find({ userId: userObjectId })
          .populate('customerId', 'name code')
          .populate('invoiceId', 'number')
          .sort({ date: -1 })
          .lean();

        csvData = payments.map((pay) => ({
          Date: pay.date ? new Date(pay.date).toLocaleDateString('en-GB') : '',
          'Customer Code': (pay.customerId as { code?: string })?.code || '',
          'Customer Name': (pay.customerId as { name?: string })?.name || '',
          'Invoice Number': (pay.invoiceId as { number?: string })?.number || 'Direct Payment',
          'Amount (PKR)': pay.amount,
          Method: pay.method,
          Reference: pay.reference || '',
        }));
        break;
      }

      case 'stock-history': {
        const history = await StockHistory.find({ userId: userObjectId }).sort({ date: -1 }).lean();
        csvData = history.map((h) => ({
          Date: h.date ? new Date(h.date).toLocaleDateString('en-GB') : '',
          'WP Number': h.wp,
          'Change Type': h.type,
          'Quantity Delta': h.qty,
          'Previous Stock': h.prevStock,
          'New Stock': h.newStock,
          Reference: h.reference || '',
        }));
        break;
      }

      case 'activity-log': {
        const logs = await ActivityLog.find({ userId: userObjectId }).sort({ dateTime: -1 }).lean();
        csvData = logs.map((l) => ({
          Date: l.dateTime ? new Date(l.dateTime).toLocaleString('en-GB') : '',
          Action: l.type,
          Quantity: l.qty !== undefined && l.qty !== null ? l.qty : '',
          Detail: l.detail || '',
        }));
        break;
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid export module' }, { status: 400 });
    }

    const csvString = Papa.unparse(csvData, { quotes: true });

    return new Response(csvString, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json({ success: false, error: 'Failed to export CSV' }, { status: 500 });
  }
}
