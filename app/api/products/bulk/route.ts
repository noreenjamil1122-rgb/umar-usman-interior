import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession, getEffectiveUserId } from '@/lib/auth';
import Product from '@/models/Product';
import StockHistory from '@/models/StockHistory';
import { generateFormattedCode } from '@/lib/counters';
import { verifyCsrf, csrfErrorResponse } from '@/lib/csrf';

interface BulkItem {
  code: string; // WP number
  qty: number;
  size?: string;
  price?: number;
  warehouseId?: string;
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
    const { bookId, warehouseId, items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items provided for bulk import' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const businessOwnerId = getEffectiveUserId(session);
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    const bookObjectId = bookId ? new mongoose.Types.ObjectId(bookId) : undefined;
    const defaultWarehouseId = warehouseId ? new mongoose.Types.ObjectId(warehouseId) : undefined;

    let addedCount = 0;
    let updatedCount = 0;

    for (const item of items as BulkItem[]) {
      const wpTrimmed = String(item.code || '').trim();
      if (!wpTrimmed) continue;

      const qtyNum = Number(item.qty) || 0;
      const priceNum = Number(item.price) || 0;

      // Check if product with this WP exists in this book or overall
      const query: Record<string, unknown> = { userId: userObjectId, wp: wpTrimmed };
      if (bookObjectId) query.bookId = bookObjectId;

      const existing = await Product.findOne(query);

      if (existing) {
        // Increase existing stock
        const prevStock = existing.stock || 0;
        const newStock = prevStock + qtyNum;

        existing.stock = newStock;
        if (priceNum > 0 && (!existing.salePrice || existing.salePrice === 0)) {
          existing.salePrice = priceNum;
        }
        if (item.size && (!existing.size || existing.size === '0.53m x 10m')) {
          existing.size = item.size;
        }
        if (defaultWarehouseId && !existing.warehouseId) {
          existing.warehouseId = defaultWarehouseId;
        }
        await existing.save();

        if (qtyNum > 0) {
          await StockHistory.create({
            userId: userObjectId,
            date: new Date(),
            productId: existing._id,
            wp: existing.wp,
            type: 'Purchased',
            qty: qtyNum,
            prevStock,
            newStock,
            reference: 'Bulk Sheet Import',
          });
        }
        updatedCount++;
      } else {
        // Create new Product
        const productCode = await generateFormattedCode(userObjectId, 'product');
        const newProduct = await Product.create({
          userId: userObjectId,
          code: productCode,
          wp: wpTrimmed,
          design: wpTrimmed,
          bookId: bookObjectId,
          warehouseId: item.warehouseId ? new mongoose.Types.ObjectId(item.warehouseId) : defaultWarehouseId,
          size: item.size || '0.53m x 10m',
          unit: 'Roll',
          salePrice: priceNum || 0,
          purchasePrice: 0,
          stock: qtyNum,
          minStock: 5,
        });

        if (qtyNum > 0) {
          await StockHistory.create({
            userId: userObjectId,
            date: new Date(),
            productId: newProduct._id,
            wp: newProduct.wp,
            type: 'Opening Stock',
            qty: qtyNum,
            prevStock: 0,
            newStock: qtyNum,
            reference: 'Bulk Sheet Import (New)',
          });
        }
        addedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk import completed: ${addedCount} new wallpapers created, ${updatedCount} existing stocks updated.`,
      addedCount,
      updatedCount,
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete bulk import' },
      { status: 500 }
    );
  }
}
