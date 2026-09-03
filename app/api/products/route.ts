import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import Product from '@/models/Product';
import StockHistory from '@/models/StockHistory';
import { ProductSchema } from '@/lib/validations';
import { verifyCsrf, csrfErrorResponse } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(session.userId);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const bookId = searchParams.get('bookId');
    const warehouseId = searchParams.get('warehouseId');
    const category = searchParams.get('category');
    const status = searchParams.get('status'); // 'in_stock', 'low_stock', 'out_of_stock'

    const query: Record<string, unknown> = { userId: userObjectId };

    if (search.trim()) {
      query.$or = [
        { wp: { $regex: search.trim(), $options: 'i' } },
        { design: { $regex: search.trim(), $options: 'i' } },
        { brand: { $regex: search.trim(), $options: 'i' } },
        { color: { $regex: search.trim(), $options: 'i' } },
      ];
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
    const userObjectId = new mongoose.Types.ObjectId(session.userId);

    const data = validation.data;
    const initialStock = data.stock || 0;

    const product = await Product.create({
      ...data,
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
