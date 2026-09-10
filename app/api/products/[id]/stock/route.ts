import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession, getEffectiveUserId } from '@/lib/auth';
import Product from '@/models/Product';
import StockHistory from '@/models/StockHistory';
import { StockAdjustmentSchema } from '@/lib/validations';
import { verifyCsrf, csrfErrorResponse } from '@/lib/csrf';

interface RouteContext {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  if (!verifyCsrf(request)) {
    return csrfErrorResponse();
  }

  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = StockAdjustmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid adjustment parameters' },
        { status: 400 }
      );
    }

    const { qty, reason, reference } = validation.data;

    if (qty === 0) {
      return NextResponse.json(
        { success: false, error: 'Adjustment quantity cannot be zero' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const businessOwnerId = getEffectiveUserId(session);
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    const productId = new mongoose.Types.ObjectId(params.id);

    // Fetch current product to check stock boundaries
    const currentProduct = await Product.findOne({ _id: productId, userId: userObjectId });
    if (!currentProduct) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const prevStock = currentProduct.stock;
    const newStock = prevStock + qty;

    if (newStock < 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Stock cannot drop below 0. Current available stock is ${prevStock} rolls.`,
        },
        { status: 400 }
      );
    }

    // Atomic stock increment / decrement
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: productId, userId: userObjectId },
      { $inc: { stock: qty } },
      { new: true }
    );

    // Create immutable audit entry in StockHistory
    const historyEntry = await StockHistory.create({
      userId: userObjectId,
      date: new Date(),
      productId: productId,
      wp: currentProduct.wp,
      type: reason,
      qty,
      prevStock,
      newStock,
      reference: reference || `Manual adjustment: ${reason}`,
    });

    // Log Activity
    const { logActivity } = await import('@/lib/activity');
    if (qty < 0) {
      await logActivity({
        userId: userObjectId,
        type: 'Stock Minus',
        detail: `Stock reduced for WP ${currentProduct.wp} (${currentProduct.design}): ${qty} rolls. (${reason})`,
        qty: Math.abs(qty),
      });
    } else if (reason.toLowerCase().includes('return')) {
      await logActivity({
        userId: userObjectId,
        type: 'Stock Minus',
        detail: `Stock returned for WP ${currentProduct.wp} (${currentProduct.design}): +${qty} rolls.`,
        qty,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Stock update ho gaya',
      data: {
        product: updatedProduct,
        history: historyEntry,
      },
    });
  } catch (error) {
    console.error('Stock adjustment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to adjust stock' },
      { status: 500 }
    );
  }
}
