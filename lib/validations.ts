import { z } from 'zod';

export const SignupSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters').trim(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const CustomerSchema = z.object({
  name: z.string().min(2, 'Customer name is required').trim(),
  type: z.enum(['customer', 'supplier']).default('customer'),
  mobile: z.string().min(7, 'Valid mobile number is required').trim(),
  whatsapp: z.string().optional(),
  alt: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional().default('Lahore'),
  notes: z.string().optional(),
});

export const BookSchema = z.object({
  name: z.string().min(1, 'Book name is required').trim(),
  color: z.string().optional().default('#1E6F6C'),
});

export const WarehouseSchema = z.object({
  name: z.string().min(1, 'Warehouse name is required').trim(),
});

export const ProductSchema = z.object({
  code: z.string().optional(),
  wp: z.string().min(1, 'WP number is required').trim(),
  design: z.string().optional(),
  brand: z.string().optional().default('Umar Usman'),
  bookId: z.string().optional(),
  warehouseId: z.string().optional(),
  category: z.string().optional().default('Wallpaper'),
  color: z.string().optional(),
  size: z.string().optional().default('0.53m x 10m'),
  unit: z.string().optional().default('Roll'),
  purchasePrice: z.coerce.number().min(0).default(0),
  salePrice: z.coerce.number().min(0, 'Sale price cannot be negative'),
  stock: z.coerce.number().int().default(0),
  minStock: z.coerce.number().int().min(0).default(5),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

export const StockAdjustmentSchema = z.object({
  qty: z.coerce.number().int(),
  reason: z.enum([
    'Opening Stock',
    'Purchased',
    'Restock',
    'Adjustment',
    'Adjustment Add',
    'Adjustment Remove',
    'Damage',
    'Damaged',
    'Correction',
    'Sale',
    'Sold',
    'Return',
    'Returned',
    'Other',
  ]),
  reference: z.string().optional(),
});

export const InvoiceItemSchema = z.object({
  productId: z.string().optional(),
  wp: z.string().min(1),
  design: z.string().optional().default(''),
  qty: z.coerce.number().min(1, 'Quantity must be at least 1'),
  rate: z.coerce.number().min(0, 'Rate cannot be negative'),
  amount: z.coerce.number().min(0),
  isCustom: z.boolean().optional().default(false),
});

export const InvoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  date: z.string().optional(),
  items: z.array(InvoiceItemSchema).min(1, 'At least one line item is required'),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  paid: z.coerce.number().default(0),
  method: z.string().default('Cash'),
  jobStatus: z.string().optional(),
  reference: z.string().optional().default('0'),
  sellerName: z.string().optional(),
  sellerContact: z.string().optional(),
  terms: z.string().optional().default('Custom'),
  notes: z.string().optional(),
});

export const PaymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  invoiceId: z.string().optional().nullable(),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  method: z.string().default('Cash'),
  reference: z.string().optional(),
  password: z.string().optional(),
});

export const SettingsSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').trim(),
  logo: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  ntn: z.string().optional(),
  strn: z.string().optional(),
  invoicePrefix: z.string().min(1).default('INV'),
  defaultDiscount: z.coerce.number().min(0).max(100).default(0),
  taxOn: z.boolean().default(false),
  taxRate: z.coerce.number().min(0).default(0),
  footer: z.string().optional(),
  sellerName: z.string().optional(),
  invoiceInstructions: z.string().optional(),
  emailjsServiceId: z.string().optional(),
  emailjsTemplateId: z.string().optional(),
  emailjsPublicKey: z.string().optional(),
  emailjsToEmail: z.string().optional(),
});
