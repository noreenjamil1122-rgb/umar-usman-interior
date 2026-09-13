import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import Invoice from '@/models/Invoice';
import InvoiceReturn from '@/models/InvoiceReturn';
import Product from '@/models/Product';
import StockHistory from '@/models/StockHistory';
import { calculateReturn, ValidationError, round2 } from '@/lib/invoiceReturnCalculator';
import { computePaymentAdjustment } from '@/lib/paymentAdjustment';
import { generateFormattedCode } from '@/lib/counters';
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

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: 'Invalid invoice ID' }, { status: 400 });
    }

    await connectToDatabase();
    const businessOwnerId = session.role === 'worker' && session.adminId ? session.adminId : session.userId;
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    const invoiceId = new mongoose.Types.ObjectId(params.id);

    const returns = await InvoiceReturn.find({ invoiceId, userId: userObjectId })
      .sort({ returnDate: -1 })
      .populate('processedBy', 'name email role')
      .populate('productId', 'wp design brand')
      .lean();

    return NextResponse.json({
      success: true,
      returns,
    });
  } catch (error) {
    console.error('Invoice Returns GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch returns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: 'Invalid invoice ID' }, { status: 400 });
    }

    const body = await request.json();
    const { invoiceItemId, returnQuantity, reason, condition = 'accepted_to_stock' } = body;

    if (!invoiceItemId) {
      return NextResponse.json({ success: false, error: 'invoiceItemId is required.' }, { status: 400 });
    }

    const qty = Number(returnQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json(
        { success: false, error: 'returnQuantity must be a positive number.' },
        { status: 400 }
      );
    }

    const allowedConditions = ['accepted_to_stock', 'damaged', 'rejected'];
    if (!allowedConditions.includes(condition)) {
      return NextResponse.json(
        { success: false, error: 'Invalid return condition.' },
        { status: 400 }
      );
    }

    const mongooseConn = await connectToDatabase();
    const businessOwnerId = session.role === 'worker' && session.adminId ? session.adminId : session.userId;
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    const invoiceId = new mongoose.Types.ObjectId(params.id);
    const processedByUserId = new mongoose.Types.ObjectId(session.userId);

    const dbSession = await mongooseConn.startSession();
    try {
      let resultPayload: Record<string, unknown> | null = null;

      await dbSession.withTransaction(async () => {
        // Find invoice within transaction
        const invoice = await Invoice.findOne({ _id: invoiceId, userId: userObjectId }).session(dbSession);
        if (!invoice) {
          throw new Error('NOT_FOUND:Invoice not found.');
        }

        // Find item within invoice
        const itemIndex = invoice.items.findIndex(
          (it, idx) =>
            (it._id && it._id.toString() === invoiceItemId.toString()) ||
            String(idx) === String(invoiceItemId) ||
            (it.productId && it.productId.toString() === invoiceItemId.toString())
        );

        if (itemIndex === -1) {
          throw new Error('NOT_FOUND:Invoice item not found.');
        }

        const item = invoice.items[itemIndex];
        if (item.is_fully_returned) {
          throw new ValidationError('This item has already been fully returned.');
        }

        // Perform calculation
        const { returnAmount, newReturnedQty, remainingQty, isFullyReturned } = calculateReturn(
          {
            quantity: item.qty,
            rate: item.rate,
            returned_quantity: item.returned_quantity,
          },
          qty
        );

        const adjustment = computePaymentAdjustment(
          {
            total: invoice.total,
            paid: invoice.paid,
            remaining: invoice.remaining,
          },
          returnAmount
        );

        // Generate atomic return reference (RET-YYYY-NNNNNN)
        const returnRef = await generateFormattedCode(userObjectId, 'return', undefined, dbSession);

        // 1. Insert return record
        const [newReturn] = await InvoiceReturn.create(
          [
            {
              userId: userObjectId,
              returnRef,
              invoiceId: invoice._id,
              invoiceItemId: item._id || invoiceItemId,
              customerId: invoice.customerId,
              productId: item.productId || null,
              originalQuantity: item.qty,
              returnedQuantity: qty,
              remainingQuantity: remainingQty,
              unitPrice: item.rate,
              returnAmount,
              condition,
              refundStatus: adjustment.refundDue > 0 ? 'pending' : 'not_applicable',
              paymentAdjustmentType: adjustment.type,
              paymentAdjustmentAmount: adjustment.refundDue > 0 ? adjustment.refundDue : adjustment.newBalanceDue,
              returnReason: reason || null,
              processedBy: processedByUserId,
              returnDate: new Date(),
            },
          ],
          { session: dbSession }
        );

        // 2. Update line item
        item.returned_quantity = newReturnedQty;
        item.is_fully_returned = isFullyReturned;
        invoice.markModified('items');

        // 3. Update invoice totals and balance
        invoice.total = adjustment.newTotalAmount;
        invoice.remaining = adjustment.newBalanceDue;
        invoice.returned_amount_total = round2((invoice.returned_amount_total || 0) + returnAmount);

        if (invoice.remaining <= 0) {
          invoice.jobStatus = 'Fully Paid';
        } else if (invoice.paid > 0) {
          invoice.jobStatus = 'Advance Received';
        }

        await invoice.save({ session: dbSession });

        // 4. Inventory sync: only if sellable (not damaged or rejected) AND item has productId
        if (item.productId && condition !== 'damaged' && condition !== 'rejected') {
          const updatedProduct = await Product.findOneAndUpdate(
            { _id: item.productId, userId: userObjectId },
            { $inc: { stock: qty } },
            { session: dbSession, new: false }
          );

          const prevStock = updatedProduct ? updatedProduct.stock : 0;
          await StockHistory.create(
            [
              {
                userId: userObjectId,
                date: new Date(),
                productId: item.productId,
                wp: item.wp,
                type: 'Return',
                qty: qty,
                prevStock,
                newStock: prevStock + qty,
                reference: `Return ${returnRef} on Invoice ${invoice.number}`,
              },
            ],
            { session: dbSession }
          );
        }

        // 5. Activity log
        await logActivity({
          userId: userObjectId,
          type: 'Invoice Return Processed',
          detail: `Processed return ${returnRef} on Invoice ${invoice.number} (Amount: PKR ${returnAmount.toLocaleString()})`,
        });

        resultPayload = {
          returnRef,
          returnId: newReturn._id,
          returnAmount,
          remainingQuantity: remainingQty,
          updatedInvoiceTotal: adjustment.newTotalAmount,
          updatedBalanceDue: adjustment.newBalanceDue,
          refundDue: adjustment.refundDue || 0,
          paymentAdjustment: adjustment,
        };
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Return processed successfully',
          data: resultPayload,
          ...(resultPayload || {}),
        },
        { status: 201 }
      );
    } finally {
      await dbSession.endSession();
    }
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.startsWith('NOT_FOUND:')) {
      return NextResponse.json({ success: false, error: errMsg.replace('NOT_FOUND:', '') }, { status: 404 });
    }
    console.error('Invoice Return POST error:', error);
    return NextResponse.json({ success: false, error: errMsg || 'Failed to process return' }, { status: 500 });
  }
}
