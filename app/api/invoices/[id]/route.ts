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

import Customer from '@/models/Customer';

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
    const previousTotal = invoice.total;
    const previousPaid = invoice.paid || 0;

    // Check worker payment security lock if worker tries to edit payments
    if (body.paid !== undefined && body.paid !== invoice.paid && session.role === 'worker') {
      const settings = await Settings.findOne({ userId: userObjectId }).lean();
      if (settings?.paymentPasswordHash) {
        const password = body.paymentPassword;
        if (!password) {
          return NextResponse.json(
            { success: false, error: 'Payment lock is active. Admin password is required to modify payment.' },
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
    }

    // 1. Line Items and Stock Reconciliation (if items provided)
    if (Array.isArray(body.items)) {
      if (body.items.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Invoice must have at least one line item.' },
          { status: 400 }
        );
      }

      const originalItems = invoice.items || [];
      const oldProductQtyMap = new Map<string, number>();
      for (const it of originalItems) {
        if (it.productId) {
          const pId = it.productId.toString();
          oldProductQtyMap.set(pId, (oldProductQtyMap.get(pId) || 0) + it.qty);
        }
      }

      const newVerifiedItems: Array<{
        _id?: mongoose.Types.ObjectId;
        productId?: mongoose.Types.ObjectId;
        wp: string;
        design: string;
        qty: number;
        rate: number;
        amount: number;
        isCustom?: boolean;
        returned_quantity?: number;
        is_fully_returned?: boolean;
      }> = [];

      const newProductQtyMap = new Map<string, number>();

      for (const item of body.items) {
        const rate = roundMoney(Number(item.rate) || 0);
        const qty = Math.max(1, Number(item.qty) || 1);
        const lineAmount = roundMoney(qty * rate);

        if (item.productId) {
          const prodId = new mongoose.Types.ObjectId(item.productId);
          const product = await Product.findOne({ _id: prodId, userId: userObjectId });
          if (!product) {
            return NextResponse.json(
              { success: false, error: `Product WP# ${item.wp} not found.` },
              { status: 404 }
            );
          }

          const pIdStr = prodId.toString();
          newProductQtyMap.set(pIdStr, (newProductQtyMap.get(pIdStr) || 0) + qty);

          // Preserve returned_quantity if this item previously had returns
          const existingItem = originalItems.find(
            (orig) => orig._id && item._id && orig._id.toString() === item._id.toString()
          );

          if (existingItem && existingItem.returned_quantity && qty < existingItem.returned_quantity) {
            return NextResponse.json(
              {
                success: false,
                error: `Cannot reduce WP# ${item.wp} quantity below ${existingItem.returned_quantity} because items were already returned.`,
              },
              { status: 400 }
            );
          }

          newVerifiedItems.push({
            _id: item._id ? new mongoose.Types.ObjectId(item._id) : new mongoose.Types.ObjectId(),
            productId: prodId,
            wp: product.wp,
            design: item.design || product.design || '',
            qty,
            rate,
            amount: lineAmount,
            isCustom: Boolean(item.isCustom),
            returned_quantity: existingItem ? existingItem.returned_quantity || 0 : 0,
            is_fully_returned: existingItem ? existingItem.is_fully_returned || false : false,
          });
        } else {
          // Custom charge / installation / glue
          newVerifiedItems.push({
            _id: item._id ? new mongoose.Types.ObjectId(item._id) : new mongoose.Types.ObjectId(),
            wp: item.wp || 'Service',
            design: item.design || 'Service Charge',
            qty,
            rate,
            amount: lineAmount,
            isCustom: true,
          });
        }
      }

      // Check stock availability for increases across all products
      const allProductIds = new Set([...oldProductQtyMap.keys(), ...newProductQtyMap.keys()]);
      for (const prodIdStr of allProductIds) {
        const oldQty = oldProductQtyMap.get(prodIdStr) || 0;
        const newQty = newProductQtyMap.get(prodIdStr) || 0;
        const diff = newQty - oldQty;

        if (diff > 0) {
          const prodObjId = new mongoose.Types.ObjectId(prodIdStr);
          const product = await Product.findOne({ _id: prodObjId, userId: userObjectId });
          if (!product || product.stock < diff) {
            return NextResponse.json(
              {
                success: false,
                error: `Insufficient stock for WP# ${product?.wp || prodIdStr}. Available: ${product?.stock || 0} rolls, additional needed: ${diff} rolls.`,
              },
              { status: 400 }
            );
          }
        }
      }

      // Apply inventory changes atomically
      for (const prodIdStr of allProductIds) {
        const oldQty = oldProductQtyMap.get(prodIdStr) || 0;
        const newQty = newProductQtyMap.get(prodIdStr) || 0;
        const diff = newQty - oldQty;

        if (diff !== 0) {
          const prodObjId = new mongoose.Types.ObjectId(prodIdStr);
          const updatedProduct = await Product.findOneAndUpdate(
            { _id: prodObjId, userId: userObjectId },
            { $inc: { stock: -diff } },
            { returnDocument: 'after' }
          );

          if (updatedProduct) {
            if (diff > 0) {
              await StockHistory.create({
                userId: userObjectId,
                date: new Date(),
                productId: prodObjId,
                wp: updatedProduct.wp,
                type: 'Sold',
                qty: -diff,
                prevStock: updatedProduct.stock + diff,
                newStock: updatedProduct.stock,
                reference: `Invoice ${invoice.number} Edited (+${diff} rolls added)`,
              });
            } else {
              const returnedRolls = Math.abs(diff);
              await StockHistory.create({
                userId: userObjectId,
                date: new Date(),
                productId: prodObjId,
                wp: updatedProduct.wp,
                type: 'Return',
                qty: returnedRolls,
                prevStock: updatedProduct.stock - returnedRolls,
                newStock: updatedProduct.stock,
                reference: `Invoice ${invoice.number} Edited (-${returnedRolls} rolls reduced)`,
              });
            }
          }
        }
      }

      // Update invoice items
      invoice.items = newVerifiedItems as unknown as typeof invoice.items;

      // Recalculate Subtotal
      let newSubtotal = 0;
      for (const it of newVerifiedItems) {
        newSubtotal = roundMoney(newSubtotal + it.amount);
      }
      invoice.subtotal = newSubtotal;
    }

    // 2. Financial Calculations (Discounts, Tax, Paid)
    const discountVal = body.discount !== undefined ? Math.max(0, Number(body.discount) || 0) : invoice.discount;
    const discountAmount = Math.min(discountVal, invoice.subtotal);
    invoice.discount = discountAmount;

    const taxVal = body.tax !== undefined ? Math.max(0, Number(body.tax) || 0) : invoice.tax;
    invoice.tax = taxVal;

    const taxableAmount = roundMoney(Math.max(0, invoice.subtotal - discountAmount));
    const taxAmount = roundMoney((taxableAmount * taxVal) / 100);
    invoice.total = roundMoney(taxableAmount + taxAmount);

    // Update paid amount if supplied
    if (body.paid !== undefined) {
      const newPaid = Math.max(0, roundMoney(Number(body.paid) || 0));
      invoice.paid = newPaid;

      // Synchronize Payment record
      const invoicePayments = await Payment.find({ userId: userObjectId, invoiceId: invoice._id }).sort({ date: 1 });
      if (invoicePayments.length > 0) {
        const firstPayment = invoicePayments[0];
        if (newPaid > 0) {
          firstPayment.amount = newPaid;
          await firstPayment.save();
        } else {
          await Payment.deleteOne({ _id: firstPayment._id });
        }
      } else if (newPaid > 0) {
        await Payment.create({
          userId: userObjectId,
          date: invoice.date || new Date(),
          customerId: invoice.customerId,
          invoiceId: invoice._id,
          amount: newPaid,
          method: invoice.method || 'Cash',
          reference: `Initial payment for ${invoice.number}`,
        });
      }
    }

    // Update Remaining & Job Status
    invoice.remaining = roundMoney(invoice.total - (invoice.paid || 0));
    if (invoice.remaining <= 0) {
      invoice.jobStatus = 'Fully Paid';
    } else if (body.jobStatus) {
      invoice.jobStatus = body.jobStatus;
    }

    // 3. Header Fields
    if (body.customerId) invoice.customerId = new mongoose.Types.ObjectId(body.customerId);
    if (body.date) invoice.date = new Date(body.date);
    if (body.sellerName !== undefined) invoice.sellerName = body.sellerName;
    if (body.sellerContact !== undefined) invoice.sellerContact = body.sellerContact;
    if (body.reference !== undefined) invoice.reference = body.reference;
    if (body.terms !== undefined) invoice.terms = body.terms;
    if (body.notes !== undefined) invoice.notes = body.notes;
    if (body.method !== undefined) invoice.method = body.method;

    // Handle additional payment entry if provided
    if (body.additionalPayment && typeof body.additionalPayment.amount === 'number' && body.additionalPayment.amount > 0) {
      const paymentAmount = roundMoney(body.additionalPayment.amount);
      const paymentDate = body.additionalPayment.date ? new Date(body.additionalPayment.date) : new Date();
      const paymentMethod = body.additionalPayment.method || 'Cash';
      const paymentRef = body.additionalPayment.reference || `Payment for Invoice ${invoice.number}`;

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

    // 4. Mark Edited and Record Edit History for Software / Owner View
    const editorName = session.name || session.email || 'Admin';
    const editorRole = session.role || 'admin';
    invoice.isEdited = true;
    invoice.lastEditedAt = new Date();
    invoice.lastEditedByName = editorName;

    if (!invoice.editHistory) {
      invoice.editHistory = [];
    }

    const editSummary =
      body.editReason ||
      `Edited invoice items / details. Total: PKR ${previousTotal} -> PKR ${invoice.total}. Paid: PKR ${previousPaid} -> PKR ${invoice.paid}.`;

    invoice.editHistory.push({
      editedAt: new Date(),
      editedBy: editorName,
      editedByRole: editorRole,
      previousTotal,
      newTotal: invoice.total,
      summary: editSummary,
    });

    await invoice.save();

    // Log in global Activity Logs
    await logActivity({
      userId: userObjectId,
      type: 'Invoice Edited',
      detail: `Invoice ${invoice.number} was edited by ${editorName} (${editorRole}). New Total: PKR ${invoice.total}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice updated and stock reconciled successfully',
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
