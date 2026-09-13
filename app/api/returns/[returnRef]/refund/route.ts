import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import InvoiceReturn from '@/models/InvoiceReturn';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import { roundMoney } from '@/lib/utils';
import { logActivity } from '@/lib/activity';

interface RouteContext {
  params: { returnRef: string };
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { method = 'Cash', amount, notes } = body;

    const refundAmount = Number(amount);
    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'A positive refund payout amount is required.' },
        { status: 400 }
      );
    }

    const mongooseConn = await connectToDatabase();
    const businessOwnerId = session.role === 'worker' && session.adminId ? session.adminId : session.userId;
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    const processedByUserId = new mongoose.Types.ObjectId(session.userId);

    const dbSession = await mongooseConn.startSession();
    try {
      let updatedStatus = 'refunded';

      await dbSession.withTransaction(async () => {
        const ret = await InvoiceReturn.findOne({
          returnRef: params.returnRef,
          userId: userObjectId,
        }).session(dbSession);

        if (!ret) {
          throw new Error('NOT_FOUND:Return not found.');
        }

        if (ret.refundStatus !== 'pending') {
          throw new Error('VALIDATION:This return has no pending refund.');
        }

        const isCreditNote = String(method).toLowerCase() === 'credit_note' || String(method).toLowerCase() === 'credit note';
        updatedStatus = isCreditNote ? 'credited' : 'refunded';

        ret.refundStatus = updatedStatus as 'credited' | 'refunded';
        await ret.save({ session: dbSession });

        // Insert refund ledger row (negative amount)
        const payoutAmount = roundMoney(refundAmount);
        await Payment.create(
          [
            {
              userId: userObjectId,
              date: new Date(),
              customerId: ret.customerId,
              invoiceId: ret.invoiceId,
              amount: -Math.abs(payoutAmount),
              type: 'refund',
              method: method || 'Cash',
              notes: notes || `Refund payout for return ${params.returnRef}`,
              reference: `Refund for ${params.returnRef}`,
              createdBy: processedByUserId,
            },
          ],
          { session: dbSession }
        );

        // Update invoice paid amount
        const invoice = await Invoice.findOne({ _id: ret.invoiceId, userId: userObjectId }).session(dbSession);
        if (invoice) {
          invoice.paid = roundMoney(Math.max(0, (invoice.paid || 0) - Math.abs(payoutAmount)));
          invoice.remaining = roundMoney(Math.max(0, invoice.total - invoice.paid));
          if (invoice.remaining <= 0) {
            invoice.jobStatus = 'Fully Paid';
          } else if (invoice.paid > 0) {
            invoice.jobStatus = 'Advance Received';
          }
          await invoice.save({ session: dbSession });
        }

        await logActivity({
          userId: userObjectId,
          type: 'Refund Payout Recorded',
          detail: `Recorded ${updatedStatus} payout of PKR ${payoutAmount.toLocaleString()} for Return ${params.returnRef}`,
        });
      });

      return NextResponse.json({
        success: true,
        message: `Refund recorded as ${updatedStatus}.`,
        refundStatus: updatedStatus,
      });
    } finally {
      await dbSession.endSession();
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.startsWith('NOT_FOUND:')) {
      return NextResponse.json({ success: false, error: errMsg.replace('NOT_FOUND:', '') }, { status: 404 });
    }
    if (errMsg.startsWith('VALIDATION:')) {
      return NextResponse.json({ success: false, error: errMsg.replace('VALIDATION:', '') }, { status: 400 });
    }
    console.error('Refund Payout POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to record refund payout' }, { status: 500 });
  }
}
