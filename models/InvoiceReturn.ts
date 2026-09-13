import mongoose, { Schema, Document, Model } from 'mongoose';

export type ReturnCondition = 'accepted_to_stock' | 'damaged' | 'rejected';
export type RefundStatus = 'pending' | 'refunded' | 'credited' | 'not_applicable';
export type PaymentAdjustmentType = 'refund' | 'balance_reduction' | 'partial';

export interface IInvoiceReturn extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  returnRef: string;
  invoiceId: mongoose.Types.ObjectId;
  invoiceItemId: mongoose.Types.ObjectId | string;
  customerId: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;
  originalQuantity: number;
  returnedQuantity: number;
  remainingQuantity: number;
  unitPrice: number;
  returnAmount: number;
  condition: ReturnCondition;
  refundStatus: RefundStatus;
  paymentAdjustmentType: PaymentAdjustmentType;
  paymentAdjustmentAmount: number;
  returnReason?: string;
  processedBy: mongoose.Types.ObjectId;
  returnDate: Date;
  isDemo?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceReturnSchema = new Schema<IInvoiceReturn>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    returnRef: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    invoiceItemId: {
      type: Schema.Types.Mixed,
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: false,
    },
    originalQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    returnedQuantity: {
      type: Number,
      required: true,
      min: 0.01,
    },
    remainingQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    returnAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    condition: {
      type: String,
      enum: ['accepted_to_stock', 'damaged', 'rejected'],
      default: 'accepted_to_stock',
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'refunded', 'credited', 'not_applicable'],
      default: 'pending',
    },
    paymentAdjustmentType: {
      type: String,
      enum: ['refund', 'balance_reduction', 'partial'],
      required: true,
    },
    paymentAdjustmentAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    returnReason: {
      type: String,
      trim: true,
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    returnDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Helpful indexes
InvoiceReturnSchema.index({ userId: 1, invoiceId: 1, returnDate: -1 });
InvoiceReturnSchema.index({ userId: 1, returnRef: 1 });

// Allow snake_case virtual getters for SQL/API parity
InvoiceReturnSchema.virtual('return_ref').get(function () {
  return this.returnRef;
});
InvoiceReturnSchema.virtual('invoice_id').get(function () {
  return this.invoiceId;
});
InvoiceReturnSchema.virtual('invoice_item_id').get(function () {
  return this.invoiceItemId;
});
InvoiceReturnSchema.virtual('customer_id').get(function () {
  return this.customerId;
});
InvoiceReturnSchema.virtual('product_id').get(function () {
  return this.productId;
});
InvoiceReturnSchema.virtual('original_quantity').get(function () {
  return this.originalQuantity;
});
InvoiceReturnSchema.virtual('returned_quantity').get(function () {
  return this.returnedQuantity;
});
InvoiceReturnSchema.virtual('remaining_quantity').get(function () {
  return this.remainingQuantity;
});
InvoiceReturnSchema.virtual('unit_price').get(function () {
  return this.unitPrice;
});
InvoiceReturnSchema.virtual('return_amount').get(function () {
  return this.returnAmount;
});
InvoiceReturnSchema.virtual('refund_status').get(function () {
  return this.refundStatus;
});
InvoiceReturnSchema.virtual('payment_adjustment_type').get(function () {
  return this.paymentAdjustmentType;
});
InvoiceReturnSchema.virtual('payment_adjustment_amount').get(function () {
  return this.paymentAdjustmentAmount;
});
InvoiceReturnSchema.virtual('return_reason').get(function () {
  return this.returnReason;
});
InvoiceReturnSchema.virtual('processed_by').get(function () {
  return this.processedBy;
});
InvoiceReturnSchema.virtual('return_date').get(function () {
  return this.returnDate;
});

if (process.env.NODE_ENV !== 'production' && mongoose.models.InvoiceReturn) {
  delete (mongoose.models as Record<string, unknown>).InvoiceReturn;
}

const InvoiceReturn: Model<IInvoiceReturn> =
  mongoose.models.InvoiceReturn ||
  mongoose.model<IInvoiceReturn>('InvoiceReturn', InvoiceReturnSchema);

export default InvoiceReturn;
