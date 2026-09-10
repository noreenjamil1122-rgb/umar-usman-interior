import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession, getEffectiveUserId } from '@/lib/auth';
import Warehouse from '@/models/Warehouse';
import Product from '@/models/Product';
import { WarehouseSchema } from '@/lib/validations';
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

    const warehouses = await Warehouse.find({ userId: userObjectId })
      .sort({ code: 1 })
      .lean();

    // Attach product counts and low stock counts per warehouse
    const counts = await Product.aggregate([
      { $match: { userId: userObjectId, warehouseId: { $ne: null } } },
      {
        $group: {
          _id: '$warehouseId',
          count: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          lowCount: {
            $sum: {
              $cond: [{ $lte: ['$stock', '$minStock'] }, 1, 0],
            },
          },
        },
      },
    ]);

    const countMap = new Map<string, { count: number; totalStock: number; lowCount: number }>();
    counts.forEach((c) =>
      countMap.set(c._id.toString(), {
        count: c.count,
        totalStock: c.totalStock,
        lowCount: c.lowCount || 0,
      })
    );

    const warehousesWithCounts = warehouses.map((w) => {
      const stat = countMap.get(w._id.toString()) || { count: 0, totalStock: 0, lowCount: 0 };
      return {
        ...w,
        productCount: stat.count,
        totalStock: stat.totalStock,
        lowCount: stat.lowCount,
      };
    });

    return NextResponse.json({
      success: true,
      data: warehousesWithCounts,
    });
  } catch (error) {
    console.error('Warehouses GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch warehouses' }, { status: 500 });
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
    const validation = WarehouseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid warehouse name' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const businessOwnerId = getEffectiveUserId(session);
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);

    const code = await generateFormattedCode(userObjectId, 'warehouse');

    const warehouse = await Warehouse.create({
      userId: userObjectId,
      code,
      name: validation.data.name,
      dateAdded: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Warehouse add ho gaya',
        data: { ...warehouse.toObject(), productCount: 0, totalStock: 0 },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Warehouse POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create warehouse' }, { status: 500 });
  }
}
