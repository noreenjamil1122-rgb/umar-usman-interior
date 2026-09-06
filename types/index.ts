export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type StockChangeType =
  | 'Sold'
  | 'Opening Stock'
  | 'Adjustment'
  | 'Restock'
  | 'Damage'
  | 'Correction'
  | 'Return'
  | 'Other';

export interface UserSession {
  userId: string;
  email: string;
  businessName: string;
  role: 'admin' | 'worker';
  adminId?: string;
  name?: string;
}

export interface CustomerType {
  _id: string;
  userId: string;
  code: string;
  name: string;
  type: 'customer' | 'supplier';
  mobile: string;
  whatsapp?: string;
  alt?: string;
  address?: string;
  city?: string;
  notes?: string;
  dateAdded: string;
  outstandingBalance?: number;
}

export interface BookType {
  _id: string;
  userId: string;
  code: string;
  name: string;
  color?: string;
  dateAdded: string;
  productCount?: number;
}

export interface WarehouseType {
  _id: string;
  userId: string;
  code: string;
  name: string;
  dateAdded: string;
}

export interface ProductType {
  _id: string;
  userId: string;
  code?: string;
  bookId?: string | BookType;
  warehouseId?: string | WarehouseType;
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
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItemType {
  productId?: string;
  wp: string;
  design: string;
  qty: number;
  rate: number;
  amount: number;
  isCustom?: boolean;
}

export interface InvoiceType {
  _id: string;
  userId: string;
  number: string;
  customerId: string | CustomerType;
  date: string;
  items: InvoiceItemType[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  remaining: number;
  method: string;
  reference?: string;
  sellerName?: string;
  sellerContact?: string;
  terms?: string;
  jobStatus?: string;
  notes?: string;
  createdAt: string;
}

export interface PaymentType {
  _id: string;
  userId: string;
  date: string;
  customerId: string | CustomerType;
  invoiceId?: string | InvoiceType;
  amount: number;
  method: string;
  reference?: string;
  createdAt: string;
}

export interface StockHistoryType {
  _id: string;
  userId: string;
  date: string;
  productId: string | ProductType;
  wp: string;
  type: StockChangeType;
  qty: number;
  prevStock: number;
  newStock: number;
  reference?: string;
}

export interface ActivityLogType {
  _id: string;
  userId: string;
  dateTime: string;
  type:
    | 'Stock Minus'
    | 'Customer Deleted'
    | 'Warehouse Deleted'
    | 'Book Deleted'
    | 'Wallpaper Deleted'
    | 'Invoice Edited'
    | 'Invoice Deleted'
    | 'Payment Recorded'
    | 'Payment Edited'
    | 'Payment Deleted';
  detail: string;
  qty?: number;
}

export interface SettingsType {
  _id?: string;
  userId: string;
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
  hasDeletePassword?: boolean;
  hasHidePassword?: boolean;
  hasPaymentPassword?: boolean;
  hasSupplierPassword?: boolean;
  deletePasswordHash?: string;
  hidePasswordHash?: string;
  paymentPasswordHash?: string;
  supplierPasswordHash?: string;
  reminderAckDate?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

