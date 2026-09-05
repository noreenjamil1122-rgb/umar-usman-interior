import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  code?: string;
  bookId?: mongoose.Types.ObjectId;
  warehouseId?: mongoose.Types.ObjectId;
  wp: string;
  design: string;
  brand?: string;
  category?: string;
  color?: string;
  size?: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  supplier?: string;
  notes?: string;
  isDemo?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    code: {
      type: String,
      trim: true,
    },
    bookId: {
      type: Schema.Types.ObjectId,
      ref: 'Book',
      index: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      index: true,
    },
    wp: {
      type: String,
      required: true,
      trim: true,
    },
    design: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      default: 'Umar Usman',
      trim: true,
    },
    category: {
      type: String,
      default: 'Wallpaper',
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    size: {
      type: String,
      default: '0.53m x 10m',
      trim: true,
    },
    unit: {
      type: String,
      default: 'Roll',
      trim: true,
    },
    purchasePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    salePrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    stock: {
      type: Number,
      default: 0,
    },
    minStock: {
      type: Number,
      default: 5,
      min: 0,
    },
    supplier: {
      type: String,
      trim: true,
    },
    notes: {
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

ProductSchema.index({ userId: 1, wp: 1 });
ProductSchema.index({ userId: 1, design: 1 });
ProductSchema.index({ userId: 1, bookId: 1 });
ProductSchema.index({ userId: 1, warehouseId: 1 });

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
