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

function sanitizeNumber(val: unknown, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : Math.max(0, val);
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? fallback : Math.max(0, n);
  }
  return fallback;
}

function toValidObjectId(id?: string | null): mongoose.Types.ObjectId | undefined {
  if (!id || typeof id !== 'string') return undefined;
  const trimmed = id.trim();
  return mongoose.Types.ObjectId.isValid(trimmed) ? new mongoose.Types.ObjectId(trimmed) : undefined;
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

    console.log(`📦 [Bulk Import API] Incoming request: ${Array.isArray(items) ? items.length : 0} items. BookId: ${bookId || 'none'}, WarehouseId: ${warehouseId || 'none'}`);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items provided for bulk import' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const businessOwnerId = getEffectiveUserId(session);
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    const bookObjectId = toValidObjectId(bookId);
    const defaultWarehouseId = toValidObjectId(warehouseId);

    let addedCount = 0;
    let updatedCount = 0;
    const failedRows: Array<{ row: number; code: string; error: string }> = [];

    for (let i = 0; i < items.length; i++) {
      const item: BulkItem = items[i];
      const rowNum = i + 1;
      const wpTrimmed = String(item.code || '').trim();

      if (!wpTrimmed) {
        failedRows.push({ row: rowNum, code: 'EMPTY', error: 'Wallpaper number (WP code) is required' });
        continue;
      }

      try {
        const qtyNum = sanitizeNumber(item.qty, 0);
        const priceNum = sanitizeNumber(item.price, 0);
        const rowWarehouseId = toValidObjectId(item.warehouseId) || defaultWarehouseId;

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
          if (rowWarehouseId && !existing.warehouseId) {
            existing.warehouseId = rowWarehouseId;
          }
          await existing.save();

          if (qtyNum > 0) {
            await StockHistory.create({
              userId: userObjectId,
              date: new Date(),
              productId: existing._id,
              wp: existing.wp,
              type: 'Restock',
              qty: qtyNum,
              prevStock,
              newStock,
              reference: 'Bulk Sheet Import (Restock)',
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
            warehouseId: rowWarehouseId,
            size: item.size || '0.53m x 10m',
            unit: 'Roll',
            salePrice: priceNum,
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
      } catch (rowErr: unknown) {
        const errMsg = rowErr instanceof Error ? rowErr.message : String(rowErr);
        console.error(`❌ [Bulk Import API] Row ${rowNum} (${wpTrimmed}) error:`, errMsg);
        failedRows.push({ row: rowNum, code: wpTrimmed, error: errMsg });
      }
    }

    const totalProcessed = addedCount + updatedCount;
    console.log(`✅ [Bulk Import API] Completed: ${addedCount} added, ${updatedCount} updated, ${failedRows.length} failed.`);

    if (totalProcessed === 0 && failedRows.length > 0) {
      const detailMsg = failedRows
        .slice(0, 5)
        .map((f) => `Row ${f.row} (${f.code}): ${f.error}`)
        .join('; ');
      return NextResponse.json(
        {
          success: false,
          error: `Bulk import failed: ${detailMsg}${failedRows.length > 5 ? ` (+${failedRows.length - 5} more rows)` : ''}`,
          failedRows,
          failedCount: failedRows.length,
        },
        { status: 400 }
      );
    }

    let message = `Bulk import completed: ${addedCount} new wallpapers created, ${updatedCount} existing stocks updated.`;
    if (failedRows.length > 0) {
      message += ` (${failedRows.length} row${failedRows.length > 1 ? 's' : ''} had errors and were skipped)`;
    }

    return NextResponse.json({
      success: true,
      message,
      addedCount,
      updatedCount,
      failedRows,
      failedCount: failedRows.length,
    });
  } catch (error) {
    console.error('Bulk import fatal error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to complete bulk import';
    return NextResponse.json(
      { success: false, error: `Failed to complete bulk import: ${msg}` },
      { status: 500 }
    );
  }
}
