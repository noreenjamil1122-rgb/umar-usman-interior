import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession } from '@/lib/auth';
import Book from '@/models/Book';
import Product from '@/models/Product';
import { BookSchema } from '@/lib/validations';
import { generateFormattedCode } from '@/lib/counters';
import { verifyCsrf, csrfErrorResponse } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(session.userId);

    const books = await Book.find({ userId: userObjectId }).sort({ code: 1 }).lean();

    // Attach product counts, total stock, and low stock warnings per book
    const counts = await Product.aggregate([
      { $match: { userId: userObjectId, bookId: { $ne: null } } },
      {
        $group: {
          _id: '$bookId',
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

    const booksWithCounts = books.map((b) => {
      const stat = countMap.get(b._id.toString()) || { count: 0, totalStock: 0, lowCount: 0 };
      return {
        ...b,
        productCount: stat.count,
        totalStock: stat.totalStock,
        lowCount: stat.lowCount,
      };
    });

    return NextResponse.json({
      success: true,
      data: booksWithCounts,
    });
  } catch (error) {
    console.error('Books GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch books' }, { status: 500 });
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
    const validation = BookSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid book name' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(session.userId);

    const code = await generateFormattedCode(userObjectId, 'book');

    const book = await Book.create({
      userId: userObjectId,
      code,
      name: validation.data.name,
      color: validation.data.color || '#1E6F6C',
      dateAdded: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Book add ho gaya',
        data: { ...book.toObject(), productCount: 0 },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Book POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create book' }, { status: 500 });
  }
}
