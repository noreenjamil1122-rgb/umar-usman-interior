import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession, getEffectiveUserId } from '@/lib/auth';
import Warehouse from '@/models/Warehouse';
import Product from '@/models/Product';
import { WarehouseSchema } from '@/lib/validations';
import { verifyCsrf, csrfErrorResponse } from '@/lib/csrf';

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

    await connectToDatabase();
    const businessOwnerId = getEffectiveUserId(session);
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    const warehouseId = new mongoose.Types.ObjectId(params.id);

    const warehouse = await Warehouse.findOne({ _id: warehouseId, userId: userObjectId }).lean();
    if (!warehouse) {
      return NextResponse.json({ success: false, error: 'Warehouse not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: warehouse,
    });
  } catch (error) {
    console.error('Warehouse GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch warehouse' }, { status: 500 });
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
    const validation = WarehouseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const businessOwnerId = getEffectiveUserId(session);
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    const warehouseId = new mongoose.Types.ObjectId(params.id);

    const updated = await Warehouse.findOneAndUpdate(
      { _id: warehouseId, userId: userObjectId },
      { $set: validation.data },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Warehouse not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Warehouse updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Warehouse PUT error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update warehouse' }, { status: 500 });
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
    const businessOwnerId = getEffectiveUserId(session);
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    const warehouseId = new mongoose.Types.ObjectId(params.id);

    // Prevent deleting Warehouse if products are stored in it
    const attachedCount = await Product.countDocuments({ userId: userObjectId, warehouseId });
    if (attachedCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete warehouse. ${attachedCount} products are assigned to this warehouse. Please move products first.`,
        },
        { status: 400 }
      );
    }

    const deleted = await Warehouse.findOneAndDelete({ _id: warehouseId, userId: userObjectId });
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Warehouse not found' }, { status: 404 });
    }

    await logActivity({
      userId: userObjectId,
      type: 'Warehouse Deleted',
      detail: `Warehouse deleted: ${deleted.name} (${deleted.code})`,
    });

    return NextResponse.json({
      success: true,
      message: 'Warehouse deleted successfully',
    });
  } catch (error) {
    console.error('Warehouse DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete warehouse' }, { status: 500 });
  }
}
