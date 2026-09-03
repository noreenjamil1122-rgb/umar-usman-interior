import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStockHistory extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  productId: mongoose.Types.ObjectId;
  wp: string;
  type: string;
  qty: number;
  prevStock: number;
  newStock: number;
  reference?: string;
  isDemo?: boolean;
}

const StockHistorySchema = new Schema<IStockHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    wp: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'Sold',
        'Opening Stock',
        'Adjustment',
        'Restock',
        'Damage',
        'Correction',
        'Return',
        'Other',
      ],
    },
    qty: {
      type: Number,
      required: true,
    },
    prevStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

StockHistorySchema.index({ userId: 1, productId: 1, date: -1 });
StockHistorySchema.index({ userId: 1, wp: 1, date: -1 });

const StockHistory: Model<IStockHistory> =
  mongoose.models.StockHistory ||
  mongoose.model<IStockHistory>('StockHistory', StockHistorySchema);

export default StockHistory;
