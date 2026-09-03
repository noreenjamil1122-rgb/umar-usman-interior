import mongoose from 'mongoose';
import Counter from '@/models/Counter';

export type CounterType = 'customer' | 'product' | 'invoice' | 'payment' | 'book' | 'warehouse';

/**
 * Atomically increments and returns the next sequence number for a given tenant, type, and year.
 * Prevents race condition duplicates across concurrent requests.
 */
export async function getNextSequence(
  userId: string | mongoose.Types.ObjectId,
  type: CounterType,
  year: number = 0
): Promise<number> {
  const filter = {
    userId: new mongoose.Types.ObjectId(userId),
    type,
    year,
  };

  const update = {
    $inc: { seq: 1 },
  };

  const options = {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  };

  const counter = await Counter.findOneAndUpdate(filter, update, options);
  return counter ? counter.seq : 1;
}

/**
 * Generates formatted code strings based on sequence number.
 */
export async function generateFormattedCode(
  userId: string | mongoose.Types.ObjectId,
  type: CounterType,
  prefixOverride?: string
): Promise<string> {
  if (type === 'invoice') {
    const currentYear = new Date().getFullYear();
    const seq = await getNextSequence(userId, 'invoice', currentYear);
    const prefix = prefixOverride || 'INV';
    return `${prefix}-${currentYear}-${String(seq).padStart(5, '0')}`;
  }

  if (type === 'customer') {
    const seq = await getNextSequence(userId, 'customer', 0);
    return `CUS-${String(seq).padStart(5, '0')}`;
  }

  if (type === 'book') {
    const seq = await getNextSequence(userId, 'book', 0);
    return `BK-${String(seq).padStart(3, '0')}`;
  }

  if (type === 'warehouse') {
    const seq = await getNextSequence(userId, 'warehouse', 0);
    return `WH-${String(seq).padStart(3, '0')}`;
  }

  if (type === 'product') {
    const seq = await getNextSequence(userId, 'product', 0);
    return `WP-${String(seq).padStart(3, '0')}`;
  }

  const seq = await getNextSequence(userId, type, 0);
  return `${type.toUpperCase()}-${seq}`;
}
