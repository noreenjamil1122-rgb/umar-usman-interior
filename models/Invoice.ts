import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInvoiceItem {
  productId: mongoose.Types.ObjectId;
  wp: string;
  design: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface IInvoice extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  number: string;
  customerId: mongoose.Types.ObjectId;
  date: Date;
  items: IInvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  remaining: number;
  method: string;
  jobStatus: string;
  reference?: string;
  terms?: string;
  createdByRole?: string;
  createdByName?: string;
  notes?: string;
  isDemo?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: false,
    },
    wp: { type: String, required: true, trim: true },
    design: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1 },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    number: {
      type: String,
      required: true,
      trim: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    items: {
      type: [InvoiceItemSchema],
      required: true,
      validate: [(val: IInvoiceItem[]) => val.length > 0, 'At least one line item is required'],
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    paid: {
      type: Number,
      default: 0,
      min: 0,
    },
    remaining: {
      type: Number,
      required: true,
      default: 0,
    },
    method: {
      type: String,
      default: 'Cash',
      trim: true,
    },
    jobStatus: {
      type: String,
      enum: ['Advance Received', 'In Progress', 'Completed', 'Fully Paid'],
      default: 'Advance Received',
    },
    reference: {
      type: String,
      trim: true,
      default: '0',
    },
    terms: {
      type: String,
      trim: true,
      default: 'Custom',
    },
    createdByRole: {
      type: String,
      default: 'admin',
    },
    createdByName: {
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

InvoiceSchema.index({ userId: 1, number: 1 }, { unique: true });
InvoiceSchema.index({ userId: 1, customerId: 1, date: -1 });
InvoiceSchema.index({ userId: 1, date: -1 });

// Delete cached model in dev mode to apply schema edits
if (process.env.NODE_ENV !== 'production' && mongoose.models.Invoice) {
  delete (mongoose.models as Record<string, unknown>).Invoice;
}

const Invoice: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);

export default Invoice;
