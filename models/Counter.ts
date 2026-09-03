import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICounter extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  year: number;
  seq: number;
}

const CounterSchema = new Schema<ICounter>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['customer', 'product', 'invoice', 'payment', 'book', 'warehouse'],
    },
    year: {
      type: Number,
      default: 0,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

CounterSchema.index({ userId: 1, type: 1, year: 1 }, { unique: true });

const Counter: Model<ICounter> =
  mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);

export default Counter;
