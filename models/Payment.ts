import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayment extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  customerId: mongoose.Types.ObjectId;
  invoiceId?: mongoose.Types.ObjectId;
  amount: number;
  type?: 'payment' | 'refund' | 'adjustment';
  method: string;
  reference?: string;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  isDemo?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
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
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => typeof v === 'number' && !isNaN(v) && v !== 0,
        message: 'Amount must be a non-zero number',
      },
    },
    type: {
      type: String,
      enum: ['payment', 'refund', 'adjustment'],
      default: 'payment',
    },
    method: {
      type: String,
      default: 'Cash',
      trim: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

PaymentSchema.index({ userId: 1, date: -1 });
PaymentSchema.index({ userId: 1, customerId: 1, date: -1 });
PaymentSchema.index({ userId: 1, invoiceId: 1 });

if (process.env.NODE_ENV !== 'production' && mongoose.models.Payment) {
  delete (mongoose.models as Record<string, unknown>).Payment;
}

const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;

