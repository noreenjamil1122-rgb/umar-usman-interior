import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomer extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  code: string;
  name: string;
  mobile: string;
  whatsapp?: string;
  alt?: string;
  address?: string;
  city?: string;
  notes?: string;
  dateAdded: Date;
  isDemo?: boolean;
}

const CustomerSchema = new Schema<ICustomer>(
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
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    whatsapp: {
      type: String,
      trim: true,
    },
    alt: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      default: 'Lahore',
      trim: true,
    },
    notes: {
      type: String,
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

CustomerSchema.index({ userId: 1, code: 1 }, { unique: true });
CustomerSchema.index({ userId: 1, mobile: 1 });
CustomerSchema.index({ userId: 1, name: 1 });

const Customer: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);

export default Customer;
