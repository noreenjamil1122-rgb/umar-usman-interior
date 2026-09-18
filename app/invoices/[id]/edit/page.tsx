'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AmountInput } from '@/components/ui/AmountInput';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, roundMoney } from '@/lib/utils';
import {
  Plus,
  Trash2,
  Search,
  Layers,
  ArrowLeft,
  Save,
  Package,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface CustomerOption {
  _id: string;
  name: string;
  mobile: string;
  code: string;
  city: string;
  type?: 'customer' | 'supplier';
}

interface ProductOption {
  _id: string;
  wp: string;
  design: string;
  brand: string;
  color?: string;
  code?: string;
  salePrice: number;
  stock: number;
}

interface WallpaperLineItem {
  id: string;
  _id?: string;
  productId?: string;
  wp: string;
  design: string;
  availableStock?: number;
  qty: number;
  rate: number;
  amount: number;
  searchQuery: string;
  showDropdown?: boolean;
}

interface OtherLineItem {
  id: string;
  _id?: string;
  title: string;
  qty: number;
  rate: number;
  amount: number;
}

interface PreparedProduct {
  product: ProductOption;
  rawWp: string;
  normWp: string;
  numericWp: string;
  tokens: string[];
  intWp: number | null;
  designLower: string;
  brandLower: string;
  codeLower: string;
}

interface WallpaperSearchResult {
  hasDigit: boolean;
  matches: ProductOption[];
}

function searchWallpaperCatalog(
  preparedList: PreparedProduct[],
  query: string
): WallpaperSearchResult {
  const trimmed = query.trim();
  if (!trimmed) {
    return { hasDigit: false, matches: [] };
  }

  const cleanQuery = trimmed.toLowerCase();
  const stripped = cleanQuery.replace(/[\s-_]/g, '');
  const hasDigit = /\d/.test(trimmed);

  const isBareGeneric = /^(w|p|wp|test|abc|xyz)$/i.test(stripped);
  if (isBareGeneric && !hasDigit) {
    return { hasDigit: false, matches: [] };
  }

  const queryDigits = trimmed.replace(/\D/g, '');
  const queryNorm = stripped;
  const queryInt = queryDigits ? parseInt(queryDigits, 10) : null;

  const exactMatches: ProductOption[] = [];
  const startsWithMatches: ProductOption[] = [];
  const containsMatches: ProductOption[] = [];
  const textMatches: ProductOption[] = [];

  for (let i = 0; i < preparedList.length; i++) {
    const item = preparedList[i];
    const { numericWp, tokens, intWp, normWp, designLower, brandLower, codeLower, product } = item;

    if (hasDigit) {
      if (!numericWp) continue;

      const isExact =
        numericWp === queryDigits ||
        (intWp !== null && queryInt !== null && intWp === queryInt) ||
        normWp === queryNorm ||
        tokens.includes(queryDigits);

      if (isExact) {
        exactMatches.push(product);
        continue;
      }

      const isStartsWith =
        numericWp.startsWith(queryDigits) ||
        tokens.some((t) => t.startsWith(queryDigits));

      if (isStartsWith) {
        startsWithMatches.push(product);
        continue;
      }

      const isContains =
        numericWp.includes(queryDigits) ||
        tokens.some((t) => t.includes(queryDigits)) ||
        (queryNorm.length >= 3 && normWp.includes(queryNorm)) ||
        (codeLower && codeLower.includes(cleanQuery)) ||
        (designLower && designLower.includes(cleanQuery));

      if (isContains) {
        containsMatches.push(product);
      }
    } else {
      if (
        (designLower && designLower.includes(cleanQuery)) ||
        (brandLower && brandLower.includes(cleanQuery)) ||
        (codeLower && codeLower.includes(cleanQuery)) ||
        normWp.includes(queryNorm)
      ) {
        textMatches.push(product);
      }
    }
  }

  startsWithMatches.sort((a, b) => {
    const aNum = (a.wp || '').replace(/\D/g, '');
    const bNum = (b.wp || '').replace(/\D/g, '');
    if (aNum.length !== bNum.length) return aNum.length - bNum.length;
    return (a.wp || '').localeCompare(b.wp || '');
  });

  containsMatches.sort((a, b) => {
    const aNum = (a.wp || '').replace(/\D/g, '');
    const bNum = (b.wp || '').replace(/\D/g, '');
    const aIdx = aNum.indexOf(queryDigits);
    const bIdx = bNum.indexOf(queryDigits);
    if (aIdx !== bIdx && aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aNum.length !== bNum.length) return aNum.length - bNum.length;
    return (a.wp || '').localeCompare(b.wp || '');
  });

  const combined = hasDigit
    ? [...exactMatches, ...startsWithMatches, ...containsMatches]
    : textMatches;

  return {
    hasDigit,
    matches: combined.slice(0, 20),
  };
}

export default function EditInvoicePage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [sellerName, setSellerName] = useState('Umar Nawaz');
  const [sellerContact, setSellerContact] = useState('0300-4131532');
  const [reference, setReference] = useState('0');
  const [terms, setTerms] = useState('Custom');
  const [notes, setNotes] = useState('');
  const [jobStatus, setJobStatus] = useState('Advance Received');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [editReason, setEditReason] = useState('');

  // Line items
  const [wallpaperItems, setWallpaperItems] = useState<WallpaperLineItem[]>([]);
  const [otherItems, setOtherItems] = useState<OtherLineItem[]>([]);

  // Financials
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Load Invoice, Customers, Products
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [custRes, prodRes, invRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/products?limit=1000'),
          fetch(`/api/invoices/${params.id}`),
        ]);

        const [custJson, prodJson, invJson] = await Promise.all([
          custRes.json(),
          prodRes.json(),
          invRes.json(),
        ]);

        if (custJson.success) setCustomers(custJson.data || []);
        if (prodJson.success) {
          setProducts(prodJson.data || []);
          setIsProductsLoading(false);
        }

        if (invJson.success && invJson.data?.invoice) {
          const inv = invJson.data.invoice;
          setInvoiceNumber(inv.number);
          setSelectedCustomerId(inv.customerId?._id || inv.customerId || '');
          setInvoiceDate(inv.date ? inv.date.split('T')[0] : new Date().toISOString().split('T')[0]);
          setSellerName(inv.sellerName || 'Umar Nawaz');
          setSellerContact(inv.sellerContact || '0300-4131532');
          setReference(inv.reference || '0');
          setTerms(inv.terms || 'Custom');
          setNotes(inv.notes || '');
          setJobStatus(inv.jobStatus || 'Advance Received');
          setPaymentMethod(inv.method || 'Cash');
          setDiscount(inv.discount || 0);
          setTax(inv.tax || 0);
          setPaidAmount(inv.paid || 0);

          // Separate items into Wallpaper items vs Other service items
          const wpItems: WallpaperLineItem[] = [];
          const othItems: OtherLineItem[] = [];

          if (Array.isArray(inv.items)) {
            inv.items.forEach((it: {
              _id?: string;
              productId?: string;
              wp: string;
              design: string;
              qty: number;
              rate: number;
              amount: number;
              isCustom?: boolean;
            }, idx: number) => {
              if (it.productId) {
                wpItems.push({
                  id: it._id || `item-${idx}`,
                  _id: it._id,
                  productId: it.productId,
                  wp: it.wp,
                  design: it.design || '',
                  qty: it.qty,
                  rate: it.rate,
                  amount: it.amount,
                  searchQuery: it.wp,
                  showDropdown: false,
                });
              } else {
                othItems.push({
                  id: it._id || `other-${idx}`,
                  _id: it._id,
                  title: it.design || it.wp || 'Service Charge',
                  qty: it.qty,
                  rate: it.rate,
                  amount: it.amount,
                });
              }
            });
          }

          if (wpItems.length === 0) {
            wpItems.push({
              id: 'wp-initial-1',
              wp: '',
              design: '',
              qty: 1,
              rate: 0,
              amount: 0,
              searchQuery: '',
            });
          }

          setWallpaperItems(wpItems);
          setOtherItems(othItems);
        } else {
          toast.error('Could not load invoice data');
        }
      } catch (err) {
        console.error('Error loading edit invoice data:', err);
        toast.error('Failed to load invoice details');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.id]);

  // Index catalog for fast search
  const preparedCatalog = useMemo(() => {
    return products.map((prod) => {
      const rawWp = String(prod.wp || '').trim();
      const normWp = rawWp.toLowerCase().replace(/[\s-_]/g, '');
      const numericWp = rawWp.replace(/\D/g, '');
      const tokens = rawWp
        .split(/[^a-zA-Z0-9]/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      const intWp = numericWp ? parseInt(numericWp, 10) : null;

      return {
        product: prod,
        rawWp,
        normWp,
        numericWp,
        tokens,
        intWp,
        designLower: String(prod.design || '').toLowerCase(),
        brandLower: String(prod.brand || '').toLowerCase(),
        codeLower: String(prod.code || '').toLowerCase(),
      };
    });
  }, [products]);

  // Financial calculations
  const wallpaperSubtotal = useMemo(() => {
    return wallpaperItems.reduce((acc, it) => acc + (it.amount || 0), 0);
  }, [wallpaperItems]);

  const otherSubtotal = useMemo(() => {
    return otherItems.reduce((acc, it) => acc + (it.amount || 0), 0);
  }, [otherItems]);

  const subtotal = roundMoney(wallpaperSubtotal + otherSubtotal);
  const discountAmount = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const taxableAmount = roundMoney(Math.max(0, subtotal - discountAmount));
  const taxAmount = roundMoney((taxableAmount * Math.max(Number(tax) || 0, 0)) / 100);
  const total = roundMoney(taxableAmount + taxAmount);
  const remaining = roundMoney(total - (Number(paidAmount) || 0));

  // Wallpaper row handlers
  const handleAddWallpaperRow = () => {
    setWallpaperItems((prev) => [
      ...prev,
      {
        id: `wp-${Date.now()}-${Math.random()}`,
        wp: '',
        design: '',
        qty: 1,
        rate: 0,
        amount: 0,
        searchQuery: '',
        showDropdown: false,
      },
    ]);
  };

  const handleRemoveWallpaperRow = (id: string) => {
    if (wallpaperItems.length === 1 && otherItems.length === 0) {
      toast.error('Invoice must contain at least one item');
      return;
    }
    setWallpaperItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleSelectProduct = (rowId: string, prod: ProductOption) => {
    setWallpaperItems((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const rate = prod.salePrice || row.rate || 0;
        const qty = row.qty || 1;
        return {
          ...row,
          productId: prod._id,
          wp: prod.wp,
          design: prod.design || '',
          availableStock: prod.stock,
          rate,
          amount: roundMoney(qty * rate),
          searchQuery: prod.wp,
          showDropdown: false,
        };
      })
    );
  };

  const handleWallpaperQtyChange = (rowId: string, qty: number) => {
    const safeQty = Math.max(1, qty);
    setWallpaperItems((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          qty: safeQty,
          amount: roundMoney(safeQty * (row.rate || 0)),
        };
      })
    );
  };

  const handleWallpaperRateChange = (rowId: string, rate: number) => {
    const safeRate = Math.max(0, rate);
    setWallpaperItems((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          rate: safeRate,
          amount: roundMoney((row.qty || 1) * safeRate),
        };
      })
    );
  };

  // Other items handlers
  const handleAddOtherRow = () => {
    setOtherItems((prev) => [
      ...prev,
      {
        id: `oth-${Date.now()}-${Math.random()}`,
        title: 'Installation / Glue Charges',
        qty: 1,
        rate: 0,
        amount: 0,
      },
    ]);
  };

  const handleRemoveOtherRow = (id: string) => {
    setOtherItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleOtherChange = (id: string, field: keyof OtherLineItem, value: unknown) => {
    setOtherItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: value };
        const qty = typeof updated.qty === 'number' ? updated.qty : Number(updated.qty) || 1;
        const rate = typeof updated.rate === 'number' ? updated.rate : Number(updated.rate) || 0;
        updated.amount = roundMoney(qty * rate);
        return updated;
      })
    );
  };

  // Submit full invoice update
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      toast.error('Please select a customer.');
      return;
    }

    // Combine verified items
    const finalItems = [];

    for (const it of wallpaperItems) {
      if (!it.wp.trim()) continue;
      finalItems.push({
        _id: it._id,
        productId: it.productId,
        wp: it.wp.trim(),
        design: it.design || '',
        qty: Math.max(1, Number(it.qty) || 1),
        rate: Math.max(0, Number(it.rate) || 0),
        amount: it.amount,
        isCustom: !it.productId,
      });
    }

    for (const it of otherItems) {
      if (!it.title.trim()) continue;
      finalItems.push({
        _id: it._id,
        wp: 'Service',
        design: it.title.trim(),
        qty: Math.max(1, Number(it.qty) || 1),
        rate: Math.max(0, Number(it.rate) || 0),
        amount: it.amount,
        isCustom: true,
      });
    }

    if (finalItems.length === 0) {
      toast.error('Invoice must contain at least one valid line item.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        customerId: selectedCustomerId,
        date: invoiceDate,
        sellerName,
        sellerContact,
        reference,
        terms,
        notes,
        jobStatus: remaining <= 0 ? 'Fully Paid' : jobStatus,
        method: paymentMethod,
        items: finalItems,
        discount: discountAmount,
        tax: Math.max(0, Number(tax) || 0),
        paid: Math.max(0, Number(paidAmount) || 0),
        editReason: editReason.trim() || undefined,
      };

      const res = await fetch(`/api/invoices/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error('Failed to update invoice', { description: json.error });
        setSubmitting(false);
        return;
      }

      toast.success('Invoice edited and stock adjusted successfully!');
      router.push(`/invoices/${params.id}`);
    } catch (err) {
      console.error('Invoice PUT error:', err);
      toast.error('Network error while saving invoice edits.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Edit Invoice">
        <div className="py-24 text-center text-sm text-ink-muted flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-teal mr-2" />
          Loading invoice data for editing...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Edit Invoice ${invoiceNumber}`}>
      <form onSubmit={handleSubmitEdit} className="space-y-6 max-w-6xl mx-auto pb-16">
        {/* Header with Back Button and Notice */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-warm-border pb-4">
          <div className="flex items-center gap-3">
            <Link href={`/invoices/${params.id}`}>
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back to Invoice
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-ink tracking-tight font-mono">
                  Edit Invoice {invoiceNumber}
                </h1>
                <Badge variant="warning" className="font-bold">
                  Editing Saved Invoice
                </Badge>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Add/modify wallpaper rolls, update quantities, other charges, or payment. Stock will synchronize automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/invoices/${params.id}`}>
              <Button type="button" variant="outline" size="md">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="teal"
              size="md"
              isLoading={submitting}
              leftIcon={<Save className="w-4 h-4" />}
              className="font-bold shadow-sm"
            >
              Save Changes
            </Button>
          </div>
        </div>

        {/* Audit / Reason Note Banner for Owner */}
        <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-3.5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="w-full text-xs">
            <div className="font-bold text-amber-900">
              Owner Audit Notice
            </div>
            <div className="text-amber-800 mt-0.5">
              This invoice will be marked as <strong>Edited</strong> in the software and recorded in activity logs. Customer printed bills will remain clean without any watermark.
            </div>
            <div className="mt-2">
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Optional: Reason for editing (e.g. Added 2 extra rolls of bedroom wallpaper)"
                className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Customer & Invoice Meta Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Invoice Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink">
                  Customer / Party <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full rounded-lg border border-warm-border bg-paper px-3 py-2 text-xs font-semibold text-ink focus:border-teal focus:outline-none"
                  required
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.code} • {c.mobile})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Invoice Date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
              />

              <Input
                label="Reference / Room"
                type="text"
                placeholder="e.g. Drawing Room / Wall 2"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Input
                label="Seller / Sales Rep"
                type="text"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
              />
              <Input
                label="Seller Contact"
                type="text"
                value={sellerContact}
                onChange={(e) => setSellerContact(e.target.value)}
              />
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink">Payment Terms</label>
                <select
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full rounded-lg border border-warm-border bg-paper px-3 py-2 text-xs text-ink focus:border-teal focus:outline-none"
                >
                  <option value="Custom">Custom</option>
                  <option value="100% advance in cash">100% advance in cash</option>
                  <option value="50% Advance & 50% After Fitting">50% Advance &amp; 50% After Fitting</option>
                  <option value="Cash on Delivery">Cash on Delivery</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink">Job Status</label>
                <select
                  value={jobStatus}
                  onChange={(e) => setJobStatus(e.target.value)}
                  className="w-full rounded-lg border border-warm-border bg-paper px-3 py-2 text-xs text-ink focus:border-teal focus:outline-none"
                >
                  <option value="Advance Received">Advance Received</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Fully Paid">Fully Paid</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallpaper Rolls Table (Add, Edit, Delete, Catalog Search) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal" />
                Wallpaper Rolls (Items)
              </CardTitle>
              <CardDescription className="text-xs">
                Search wallpaper by WP# or name. Add more rolls, change quantities or rates.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="teal"
              size="sm"
              onClick={handleAddWallpaperRow}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Roll
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-visible">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-warm-border text-ink-muted font-bold uppercase text-[11px]">
                    <th className="py-2.5 px-2 w-8 text-center">#</th>
                    <th className="py-2.5 px-2 w-64">WP# / Search Catalog</th>
                    <th className="py-2.5 px-2">Design / Description</th>
                    <th className="py-2.5 px-2 w-24 text-center">Qty (Rolls)</th>
                    <th className="py-2.5 px-2 w-32 text-right">Rate (PKR)</th>
                    <th className="py-2.5 px-2 w-32 text-right">Amount (PKR)</th>
                    <th className="py-2.5 px-2 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-borderLight">
                  {wallpaperItems.map((item, idx) => {
                    const searchRes = searchWallpaperCatalog(preparedCatalog, item.searchQuery || '');
                    return (
                      <tr key={item.id} className="relative">
                        <td className="py-3 px-2 text-center font-semibold text-ink-muted">
                          {idx + 1}
                        </td>

                        {/* WP Search Cell */}
                        <td className="py-3 px-2 relative">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Type WP# (e.g. 2143)..."
                              value={item.searchQuery}
                              onChange={(e) => {
                                const val = e.target.value;
                                setWallpaperItems((prev) =>
                                  prev.map((r) =>
                                    r.id === item.id
                                      ? { ...r, searchQuery: val, wp: val, showDropdown: true }
                                      : r
                                  )
                                );
                              }}
                              onFocus={() => {
                                setWallpaperItems((prev) =>
                                  prev.map((r) =>
                                    r.id === item.id ? { ...r, showDropdown: true } : r
                                  )
                                );
                              }}
                              className="w-full bg-paper border border-warm-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-ink focus:outline-none focus:border-teal font-mono"
                            />

                            {/* Dropdown for catalog matches */}
                            {item.showDropdown && searchRes.matches.length > 0 && (
                              <div className="absolute top-full left-0 mt-1 w-80 bg-paper border border-warm-border rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-warm-borderLight">
                                {searchRes.matches.map((match) => (
                                  <div
                                    key={match._id}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleSelectProduct(item.id, match);
                                    }}
                                    className="p-2 hover:bg-teal/10 cursor-pointer flex items-center justify-between text-xs transition-colors"
                                  >
                                    <div>
                                      <div className="font-bold text-ink font-mono">
                                        WP# {match.wp}
                                      </div>
                                      <div className="text-[11px] text-ink-muted truncate max-w-[180px]">
                                        {match.design || match.brand || 'Standard Wallpaper'}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-teal font-mono">
                                        Rs. {match.salePrice?.toLocaleString()}
                                      </div>
                                      <div className="text-[10px] text-ink-muted">
                                        Stock: <strong>{match.stock}</strong> rolls
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Design / Description */}
                        <td className="py-3 px-2">
                          <input
                            type="text"
                            placeholder="Design / Name"
                            value={item.design}
                            onChange={(e) => {
                              const val = e.target.value;
                              setWallpaperItems((prev) =>
                                prev.map((r) => (r.id === item.id ? { ...r, design: val } : r))
                              );
                            }}
                            className="w-full bg-paper border border-warm-border rounded-lg px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-teal"
                          />
                        </td>

                        {/* Qty */}
                        <td className="py-3 px-2 text-center">
                          <input
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={(e) =>
                              handleWallpaperQtyChange(item.id, parseInt(e.target.value, 10) || 1)
                            }
                            className="w-20 mx-auto text-center bg-paper border border-warm-border rounded-lg px-2 py-1.5 text-xs font-bold text-ink focus:outline-none focus:border-teal font-mono"
                          />
                        </td>

                        {/* Rate */}
                        <td className="py-3 px-2 text-right">
                          <input
                            type="number"
                            min={0}
                            value={item.rate}
                            onChange={(e) =>
                              handleWallpaperRateChange(item.id, parseFloat(e.target.value) || 0)
                            }
                            className="w-28 ml-auto text-right bg-paper border border-warm-border rounded-lg px-2 py-1.5 text-xs font-semibold text-ink focus:outline-none focus:border-teal font-mono"
                          />
                        </td>

                        {/* Line Amount */}
                        <td className="py-3 px-2 text-right font-bold text-ink font-mono">
                          PKR {item.amount?.toLocaleString()}
                        </td>

                        {/* Remove */}
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveWallpaperRow(item.id)}
                            className="p-1 text-ink-muted hover:text-status-danger rounded transition-colors"
                            title="Remove line item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Auxiliary / Other Charges (Glue, Installation, Labor) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-teal" />
                Other Charges &amp; Services
              </CardTitle>
              <CardDescription className="text-xs">
                Add glue, labor, scaffolding, or installation service charges.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddOtherRow}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Service
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {otherItems.length === 0 ? (
              <div className="py-4 text-center text-xs text-ink-muted italic border border-dashed border-warm-border rounded-lg">
                No additional service or installation charges added.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-warm-border text-ink-muted font-bold uppercase text-[11px]">
                    <th className="py-2.5 px-2">Service Description</th>
                    <th className="py-2.5 px-2 w-24 text-center">Qty</th>
                    <th className="py-2.5 px-2 w-32 text-right">Rate</th>
                    <th className="py-2.5 px-2 w-32 text-right">Amount</th>
                    <th className="py-2.5 px-2 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-borderLight">
                  {otherItems.map((oth) => (
                    <tr key={oth.id}>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={oth.title}
                          onChange={(e) => handleOtherChange(oth.id, 'title', e.target.value)}
                          placeholder="e.g. Glue Charges / Installation"
                          className="w-full bg-paper border border-warm-border rounded-lg px-2.5 py-1 text-xs text-ink focus:outline-none focus:border-teal"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          min={1}
                          value={oth.qty}
                          onChange={(e) =>
                            handleOtherChange(oth.id, 'qty', parseInt(e.target.value, 10) || 1)
                          }
                          className="w-16 mx-auto text-center bg-paper border border-warm-border rounded-lg px-2 py-1 text-xs text-ink focus:outline-none focus:border-teal font-mono"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min={0}
                          value={oth.rate}
                          onChange={(e) =>
                            handleOtherChange(oth.id, 'rate', parseFloat(e.target.value) || 0)
                          }
                          className="w-24 ml-auto text-right bg-paper border border-warm-border rounded-lg px-2 py-1 text-xs text-ink focus:outline-none focus:border-teal font-mono"
                        />
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-ink font-mono">
                        PKR {oth.amount?.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveOtherRow(oth.id)}
                          className="p-1 text-ink-muted hover:text-status-danger rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Financial Summary & Payment Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notes & Instructions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Invoice Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional instructions or notes for this invoice..."
                className="w-full rounded-lg border border-warm-border bg-paper p-2.5 text-xs text-ink focus:border-teal focus:outline-none"
              />
            </CardContent>
          </Card>

          {/* Totals & Payments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Financials &amp; Payments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-ink-muted font-semibold">Subtotal:</span>
                <span className="font-mono font-bold text-ink">PKR {subtotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-ink-muted font-semibold">Discount (PKR):</span>
                <input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-28 text-right bg-paper border border-warm-border rounded-lg px-2 py-1 text-xs font-mono font-bold text-ink focus:outline-none focus:border-teal"
                />
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-ink-muted font-semibold">Tax (%):</span>
                <input
                  type="number"
                  min={0}
                  value={tax}
                  onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                  className="w-28 text-right bg-paper border border-warm-border rounded-lg px-2 py-1 text-xs font-mono font-bold text-ink focus:outline-none focus:border-teal"
                />
              </div>

              <div className="flex justify-between items-center py-2 border-t border-b border-warm-border bg-paper-light px-2 rounded-lg">
                <span className="text-sm font-black text-ink">Total Bill:</span>
                <span className="text-base font-black font-mono text-teal">
                  PKR {total.toLocaleString()}
                </span>
              </div>

              {/* Paid Amount */}
              <div className="flex justify-between items-center py-1 pt-2">
                <div>
                  <span className="font-bold text-emerald-900">Paid Amount (PKR):</span>
                  <div className="text-[10px] text-ink-muted">Initial / advance payment</div>
                </div>
                <input
                  type="number"
                  min={0}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="w-32 text-right bg-paper border border-warm-border rounded-lg px-2 py-1 text-xs font-mono font-black text-emerald-800 focus:outline-none focus:border-teal"
                />
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-ink-muted font-semibold">Payment Method:</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-32 text-xs rounded-lg border border-warm-border bg-paper px-2 py-1 font-semibold text-ink focus:border-teal focus:outline-none"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              {/* Remaining Due */}
              <div className="flex justify-between items-center py-2.5 px-3 bg-paper-dark rounded-xl border border-warm-border mt-2">
                <span className="font-black text-ink uppercase text-xs">Remaining Due:</span>
                <span
                  className={`font-black font-mono text-base ${
                    remaining > 0 ? 'text-status-danger' : 'text-emerald-700'
                  }`}
                >
                  PKR {remaining.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-border">
          <Link href={`/invoices/${params.id}`}>
            <Button type="button" variant="outline" size="md">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="teal"
            size="md"
            isLoading={submitting}
            leftIcon={<Save className="w-4 h-4" />}
            className="font-bold px-8 shadow-sm"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
