import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWarehouse extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  code: string;
  name: string;
  dateAdded: Date;
  isDemo?: boolean;
}

const WarehouseSchema = new Schema<IWarehouse>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dateAdded: {
      type: Date,
      default: Date.now,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

WarehouseSchema.index({ userId: 1, code: 1 }, { unique: true });
WarehouseSchema.index({ userId: 1, name: 1 });

const Warehouse: Model<IWarehouse> =
  mongoose.models.Warehouse || mongoose.model<IWarehouse>('Warehouse', WarehouseSchema);

export default Warehouse;
