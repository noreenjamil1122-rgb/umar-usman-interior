import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettings extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  businessName: string;
  logo?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  ntn?: string;
  strn?: string;

  invoicePrefix: string;
  defaultDiscount: number;
  taxOn: boolean;
  taxRate: number;
  footer?: string;
  sellerName?: string;
  invoiceInstructions?: string;

  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
  emailjsToEmail?: string;

  deletePasswordHash?: string;
  hidePasswordHash?: string;
  paymentPasswordHash?: string;

  reminderAckDate?: Date;
  isDemo?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    businessName: {
      type: String,
      required: true,
      default: 'Umar Usman Interior',
      trim: true,
    },
    logo: { type: String, default: '' },
    address: { type: String, default: 'Lahore, Pakistan', trim: true },
    phone: { type: String, default: '', trim: true },
    whatsapp: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true },
    ntn: { type: String, default: '', trim: true },
    strn: { type: String, default: '', trim: true },

    invoicePrefix: { type: String, default: 'INV', trim: true },
    defaultDiscount: { type: Number, default: 0, min: 0, max: 100 },
    taxOn: { type: Boolean, default: false },
    taxRate: { type: Number, default: 0, min: 0 },
    footer: {
      type: String,
      default: 'Thank you for choosing Umar Usman Interior. High Quality Wallpapers & Interior Solutions.',
    },
    sellerName: { type: String, default: 'Umar Usman', trim: true },
    invoiceInstructions: {
      type: String,
      default: 'Goods once sold will not be returned or exchanged after 7 days. Installed rolls cannot be refunded.',
    },

    emailjsServiceId: { type: String, default: '' },
    emailjsTemplateId: { type: String, default: '' },
    emailjsPublicKey: { type: String, default: '' },
    emailjsToEmail: { type: String, default: '' },

    deletePasswordHash: { type: String },
    hidePasswordHash: { type: String },
    paymentPasswordHash: { type: String },

    reminderAckDate: { type: Date },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);

export default Settings;
