import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import Product from '@/models/Product';
import StockHistory from '@/models/StockHistory';
import { ProductSchema } from '@/lib/validations';
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
    const productId = new mongoose.Types.ObjectId(params.id);

    const product = await Product.findOne({ _id: productId, userId: userObjectId })
      .populate('bookId', 'name code color')
      .populate('warehouseId', 'name code')
      .lean();

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Recent stock history for this product
    const history = await StockHistory.find({ userId: userObjectId, productId })
      .sort({ date: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      success: true,
      data: { product, history },
    });
  } catch (error) {
    console.error('Product Detail GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
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
    const productId = new mongoose.Types.ObjectId(params.id);

    const data = validation.data;

    // Notice: stock cannot be modified directly via general PUT; stock modifications must use the /stock endpoint or adjustments
    const updateData = {
      wp: data.wp,
      design: data.design,
      brand: data.brand,
      category: data.category,
      color: data.color,
      size: data.size,
      unit: data.unit,
      purchasePrice: data.purchasePrice,
      salePrice: data.salePrice,
      minStock: data.minStock,
      supplier: data.supplier,
      notes: data.notes,
      bookId: data.bookId ? new mongoose.Types.ObjectId(data.bookId) : undefined,
      warehouseId: data.warehouseId ? new mongoose.Types.ObjectId(data.warehouseId) : undefined,
    };

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: productId, userId: userObjectId },
      { $set: updateData },
      { new: true }
    );

    if (!updatedProduct) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    console.error('Product PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    );
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

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(session.userId);
    const productId = new mongoose.Types.ObjectId(params.id);

    const deleted = await Product.findOneAndDelete({ _id: productId, userId: userObjectId });

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Product DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
