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

    // Attach product counts per book
    const counts = await Product.aggregate([
      { $match: { userId: userObjectId, bookId: { $ne: null } } },
      { $group: { _id: '$bookId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    counts.forEach((c) => countMap.set(c._id.toString(), c.count));

    const booksWithCounts = books.map((b) => ({
      ...b,
      productCount: countMap.get(b._id.toString()) || 0,
    }));

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
