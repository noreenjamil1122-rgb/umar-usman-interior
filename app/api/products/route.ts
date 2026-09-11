import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession, getEffectiveUserId } from '@/lib/auth';
import Product from '@/models/Product';
import StockHistory from '@/models/StockHistory';
import { ProductSchema } from '@/lib/validations';
import { generateFormattedCode } from '@/lib/counters';
import { verifyCsrf, csrfErrorResponse } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const businessOwnerId = getEffectiveUserId(session);
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const bookId = searchParams.get('bookId');
    const warehouseId = searchParams.get('warehouseId');
    const category = searchParams.get('category');
    const status = searchParams.get('status'); // 'in_stock', 'low_stock', 'out_of_stock'

    const query: Record<string, unknown> = { userId: userObjectId };

    if (search.trim()) {
      const cleanSearch = search.trim();
      const strippedSearch = cleanSearch.replace(/[\s-]/g, '');
      const hasDigit = /\d/.test(cleanSearch);
      const isPurePrefix = /^(wp|w|p)$/i.test(strippedSearch);

      const orConditions: Record<string, unknown>[] = [
        { design: { $regex: cleanSearch, $options: 'i' } },
        { brand: { $regex: cleanSearch, $options: 'i' } },
        { color: { $regex: cleanSearch, $options: 'i' } },
        { code: { $regex: cleanSearch, $options: 'i' } },
      ];

      // Only search WP code if the search is not a bare prefix (W, P, WP)
      if (!isPurePrefix) {
        if (hasDigit) {
          const numericPart = cleanSearch.replace(/\D/g, '');
          orConditions.unshift(
            { wp: { $regex: cleanSearch, $options: 'i' } },
            { wp: { $regex: strippedSearch, $options: 'i' } },
            { wp: { $regex: numericPart, $options: 'i' } }
          );
        } else {
          orConditions.unshift(
            { wp: { $regex: cleanSearch, $options: 'i' } }
          );
        }
      }

      query.$or = orConditions;
    }

    if (bookId) query.bookId = new mongoose.Types.ObjectId(bookId);
    if (warehouseId) query.warehouseId = new mongoose.Types.ObjectId(warehouseId);
    if (category) query.category = category;

    if (status === 'out_of_stock') {
      query.stock = { $lte: 0 };
    } else if (status === 'low_stock') {
      query.$and = [
        { stock: { $gt: 0 } },
        { $expr: { $lte: ['$stock', '$minStock'] } },
      ];
    } else if (status === 'in_stock') {
      query.$expr = { $gt: ['$stock', '$minStock'] };
    }

    const products = await Product.find(query)
      .populate('bookId', 'name code color')
      .populate('warehouseId', 'name code')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
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
    const validation = ProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid product input' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const businessOwnerId = getEffectiveUserId(session);
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);

    const data = validation.data;
    const initialStock = data.stock || 0;
    const code = await generateFormattedCode(userObjectId, 'product');
    const design = data.design?.trim() || data.wp.trim();

    const product = await Product.create({
      ...data,
      code,
      wp: data.wp.trim(),
      design,
      userId: userObjectId,
      bookId: data.bookId ? new mongoose.Types.ObjectId(data.bookId) : undefined,
      warehouseId: data.warehouseId ? new mongoose.Types.ObjectId(data.warehouseId) : undefined,
      stock: initialStock,
    });

    // Create Opening Stock history record if initial stock is provided
    if (initialStock > 0) {
      await StockHistory.create({
        userId: userObjectId,
        date: new Date(),
        productId: product._id,
        wp: product.wp,
        type: 'Opening Stock',
        qty: initialStock,
        prevStock: 0,
        newStock: initialStock,
        reference: 'Initial Product Creation',
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Product add ho gaya',
        data: product,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Products POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
