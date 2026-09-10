import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthSession, getEffectiveUserId } from '@/lib/auth';
import Book from '@/models/Book';
import Product from '@/models/Product';
import { BookSchema } from '@/lib/validations';
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
    const bookId = new mongoose.Types.ObjectId(params.id);

    const book = await Book.findOne({ _id: bookId, userId: userObjectId }).lean();
    if (!book) {
      return NextResponse.json({ success: false, error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: book,
    });
  } catch (error) {
    console.error('Book GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch book' }, { status: 500 });
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
    const validation = BookSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const businessOwnerId = getEffectiveUserId(session);
    const userObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    const bookId = new mongoose.Types.ObjectId(params.id);

    const updated = await Book.findOneAndUpdate(
      { _id: bookId, userId: userObjectId },
      { $set: validation.data },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Book updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Book PUT error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update book' }, { status: 500 });
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
    const bookId = new mongoose.Types.ObjectId(params.id);

    // Prevent deleting Book if products depend on it
    const attachedCount = await Product.countDocuments({ userId: userObjectId, bookId });
    if (attachedCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete book. ${attachedCount} products are currently assigned to this book. Please reassign products first.`,
        },
        { status: 400 }
      );
    }

    const deleted = await Book.findOneAndDelete({ _id: bookId, userId: userObjectId });
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Book not found' }, { status: 404 });
    }

    await logActivity({
      userId: userObjectId,
      type: 'Book Deleted',
      detail: `Wallpaper Book deleted: ${deleted.name} (${deleted.code})`,
    });

    return NextResponse.json({
      success: true,
      message: 'Book deleted successfully',
    });
  } catch (error) {
    console.error('Book DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete book' }, { status: 500 });
  }
}
