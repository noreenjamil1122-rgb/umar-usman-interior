'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
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
  salePrice: number;
  stock: number;
}

interface WallpaperLineItem {
  id: string;
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
  title: string;
  qty: number;
  rate: number;
  amount: number;
}

export default function NewInvoicePage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [sellerName, setSellerName] = useState('Umar Nawaz');
  const [sellerContact, setSellerContact] = useState('0300-4131532');
  const [reference, setReference] = useState('0');
  const [terms, setTerms] = useState('Custom');
  
  // Two distinct item collections
  const [wallpaperItems, setWallpaperItems] = useState<WallpaperLineItem[]>([
    {
      id: 'wp-1',
      productId: '',
      wp: '',
      design: '',
      availableStock: undefined,
      qty: 1,
      rate: 0,
      amount: 0,
      searchQuery: '',
      showDropdown: false,
    },
  ]);
  const [otherItems, setOtherItems] = useState<OtherLineItem[]>([]);
  
  const [discountRs, setDiscountRs] = useState<number>(0);
  const [taxOn, setTaxOn] = useState<boolean>(false);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [jobStatus, setJobStatus] = useState('Advance Received');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');

  // Inline Add Customer Modal State
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustCity, setNewCustCity] = useState('Lahore');
  const [newCustType, setNewCustType] = useState<'customer' | 'supplier'>('customer');
  const [custLoading, setCustLoading] = useState(false);


  // Fetch initial customers, products, and settings
  useEffect(() => {
    const initData = async () => {
      try {
        const [cRes, pRes, sRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/products'),
          fetch('/api/settings'),
        ]);

        const [cData, pData, sData] = await Promise.all([
          cRes.json(),
          pRes.json(),
          sRes.json(),
        ]);

        if (cData.success) setCustomers(cData.data);
        if (pData.success) setProducts(pData.data);
        if (sData.success && sData.data) {
          setDiscountRs(sData.data.defaultDiscount || 0);
          setTaxOn(Boolean(sData.data.taxOn));
          setTaxRate(sData.data.taxRate || 0);
          if (sData.data.ownerName) setSellerName(sData.data.ownerName);
          if (sData.data.contact) setSellerContact(sData.data.contact);
        }
      } catch (err) {
        console.error('Invoice init error:', err);
      }
    };

    initData();
  }, []);

  // Quick Inline Add Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustMobile) return;

    setCustLoading(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustName,
          mobile: newCustMobile,
          city: newCustCity,
          type: newCustType,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Could not create customer', { description: json.error });
        setCustLoading(false);
        return;
      }

      toast.success(`${newCustType === 'supplier' ? 'Supplier' : 'Customer'} added`);
      setCustomers((prev) => [json.data, ...prev]);
      setSelectedCustomerId(json.data._id);
      setIsAddCustomerOpen(false);
      setNewCustName('');
      setNewCustMobile('');
      setNewCustType('customer');
    } catch {
      toast.error('Network error');
    } finally {
      setCustLoading(false);
    }
  };

  // Section 1: Wallpaper Items Handlers
  const handleAddWallpaperItem = () => {
    setWallpaperItems((prev) => [
      ...prev,
      {
        id: `wp-${Date.now()}-${Math.random()}`,
        productId: '',
        wp: '',
        design: '',
        availableStock: undefined,
        qty: 1,
        rate: 0,
        amount: 0,
        searchQuery: '',
        showDropdown: false,
      },
    ]);
  };

  const handleWallpaperSearchChange = (index: number, val: string) => {
    setWallpaperItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        searchQuery: val,
        showDropdown: Boolean(val.trim()),
      };
      return next;
    });
  };

  const handleSelectWallpaperProduct = (index: number, prod: ProductOption) => {
    setWallpaperItems((prev) => {
      const next = [...prev];
      const qty = Number(next[index].qty) || 1;
      const rate = Number(prod.salePrice) || 0;
      next[index] = {
        ...next[index],
        productId: prod._id,
        wp: prod.wp,
        design: prod.design,
        availableStock: prod.stock,
        searchQuery: prod.wp + (prod.design ? ` - ${prod.design}` : ''),
        qty,
        rate,
        amount: roundMoney(qty * rate),
        showDropdown: false,
      };
      return next;
    });
  };

  const handleUpdateWallpaperQty = (index: number, newQty: number) => {
    setWallpaperItems((prev) => {
      const next = [...prev];
      const qty = Number(newQty) || 0;
      next[index] = {
        ...next[index],
        qty,
        amount: roundMoney(qty * (Number(next[index].rate) || 0)),
      };
      return next;
    });
  };

  const handleUpdateWallpaperRate = (index: number, newRate: number) => {
    setWallpaperItems((prev) => {
      const next = [...prev];
      const rate = Number(newRate) || 0;
      next[index] = {
        ...next[index],
        rate,
        amount: roundMoney((Number(next[index].qty) || 0) * rate),
      };
      return next;
    });
  };

  const handleRemoveWallpaperItem = (index: number) => {
    setWallpaperItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Section 2: Other Items / Charges Handlers
  const handleAddOtherItem = () => {
    setOtherItems((prev) => [
      ...prev,
      {
        id: `other-${Date.now()}-${Math.random()}`,
        title: '',
        qty: 1,
        rate: 0,
        amount: 0,
      },
    ]);
  };

  const handleUpdateOtherTitle = (index: number, title: string) => {
    setOtherItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], title };
      return next;
    });
  };

  const handleUpdateOtherQty = (index: number, newQty: number) => {
    setOtherItems((prev) => {
      const next = [...prev];
      const qty = Number(newQty) || 0;
      next[index] = {
        ...next[index],
        qty,
        amount: roundMoney(qty * (Number(next[index].rate) || 0)),
      };
      return next;
    });
  };

  const handleUpdateOtherRate = (index: number, newRate: number) => {
    setOtherItems((prev) => {
      const next = [...prev];
      const rate = Number(newRate) || 0;
      next[index] = {
        ...next[index],
        rate,
        amount: roundMoney((Number(next[index].qty) || 0) * rate),
      };
      return next;
    });
  };

  const handleRemoveOtherItem = (index: number) => {
    setOtherItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Financial Calculations (Live across both sections)
  const wallpaperSubtotal = roundMoney(
    wallpaperItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  );
  const otherSubtotal = roundMoney(
    otherItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  );
  const subtotal = roundMoney(wallpaperSubtotal + otherSubtotal);
  const discountAmount = Math.max(0, Math.min(Number(discountRs) || 0, subtotal));
  const taxableAmount = Math.max(0, roundMoney(subtotal - discountAmount));
  const effectiveTaxRate = taxOn ? Math.max(taxRate, 0) : 0;
  const taxAmount = roundMoney((taxableAmount * effectiveTaxRate) / 100);
  const total = roundMoney(taxableAmount + taxAmount);
  const remaining = roundMoney(total - (Number(paidAmount) || 0));

  // Submit Invoice
  const handleSubmitInvoice = async () => {
    if (!selectedCustomerId) {
      toast.error('Please select or add a customer');
      return;
    }

    const validWallpaperItems = wallpaperItems
      .filter((w) => w.wp.trim() || w.productId)
      .map((w) => ({
        productId: w.productId || undefined,
        wp: w.wp.trim() || 'Wallpaper',
        design: w.design || '',
        qty: Number(w.qty) || 1,
        rate: Number(w.rate) || 0,
        amount: roundMoney((Number(w.qty) || 1) * (Number(w.rate) || 0)),
        isCustom: false,
      }));

    const validOtherItems = otherItems
      .filter((o) => o.title.trim())
      .map((o) => ({
        wp: o.title.trim(),
        design: 'Other Item / Charge',
        qty: Number(o.qty) || 1,
        rate: Number(o.rate) || 0,
        amount: roundMoney((Number(o.qty) || 1) * (Number(o.rate) || 0)),
        isCustom: true,
      }));

    const allItems = [...validWallpaperItems, ...validOtherItems];

    if (allItems.length === 0) {
      toast.error('Please add at least one item (Wallpaper or Other Item/Charge)');
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
        items: allItems,
        discount: discountAmount,
        tax: effectiveTaxRate,
        paid: Number(paidAmount) || 0,
        method: paymentMethod,
        jobStatus,
        notes,
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error('Invoice creation failed', { description: json.error });
        setSubmitting(false);
        return;
      }

      toast.success('Invoice save ho gaya!', {
        description: `Invoice ${json.data.number} created and inventory deducted.`,
      });

      router.push(`/invoices/${json.data._id}`);
    } catch {
      toast.error('Network error while creating invoice');
      setSubmitting(false);
    }
  };


  return (
    <AppShell title="Create Invoice">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
              New Customer Invoice
            </h1>
            <p className="text-xs text-ink-muted">
              Auto stock deduction • Real-time totals • Print ready
            </p>
          </div>
        </div>

        <Button
          variant="teal"
          size="md"
          onClick={handleSubmitInvoice}
          isLoading={submitting}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Save &amp; Print Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer & Line Items (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection Card */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
              <CardDescription>Select registered client or add new on the fly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
                      Select Customer *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddCustomerOpen(true)}
                      className="text-xs text-teal font-semibold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Customer</span>
                    </button>
                  </div>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full rounded-lg border border-warm-border bg-paper-light px-3 py-2 text-sm text-ink focus:border-teal focus:outline-none"
                    required
                  >
                    <option value="">-- Choose Customer / Party --</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.code} • {c.mobile}){c.type === 'supplier' ? ' [Supplier]' : ''}
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
                  label="Seller Name"
                  type="text"
                  placeholder="e.g. Umar Nawaz"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  required
                />

                <Input
                  label="Seller Contact"
                  type="text"
                  placeholder="e.g. 0300-4131532"
                  value={sellerContact}
                  onChange={(e) => setSellerContact(e.target.value)}
                  required
                />

                <Input
                  label="Reference (Wall / Room / Site)"
                  type="text"
                  placeholder="e.g. wall (12 X 12) or Drawing room"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
                    Quotation Terms
                  </label>
                  <select
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className="w-full rounded-lg border border-warm-border bg-paper-light px-3 py-2 text-sm text-ink focus:border-teal focus:outline-none"
                  >
                    <option value="Custom">Custom</option>
                    <option value="100% advance in cash">100% advance in cash</option>
                    <option value="50% Advance & 50% After Fitting">50% Advance &amp; 50% After Fitting</option>
                    <option value="Cash on Delivery">Cash on Delivery</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 1: WALLPAPER ITEMS (Catalog-Linked, Auto Stock-Cut) */}
          <Card className="border border-warm-border">
            <CardHeader className="pb-3 border-b border-warm-borderLight">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal" />
                    <span>Wallpaper Items</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Stock/catalog se wallpaper rolls — invoice save hone par inka stock auto-cut hoga
                  </CardDescription>
                </div>
                <Badge variant="teal">{wallpaperItems.filter((w) => w.wp || w.productId).length} Rolls</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {wallpaperItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-ink-muted border border-dashed border-warm-border rounded-xl">
                  No wallpaper items added yet. Click &ldquo;+ Add Wallpaper Item&rdquo; below.
                </div>
              ) : (
                <div className="space-y-3">
                  {wallpaperItems.map((item, index) => {
                    const filteredMatches = item.searchQuery.trim()
                      ? products.filter(
                          (p) =>
                            p.wp.toLowerCase().includes(item.searchQuery.toLowerCase()) ||
                            p.design.toLowerCase().includes(item.searchQuery.toLowerCase())
                        ).slice(0, 8)
                      : [];

                    return (
                      <div
                        key={item.id || index}
                        className="p-3 bg-paper rounded-xl border border-warm-border space-y-2 relative"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start">
                          {/* Search & Select Autocomplete Box (5 cols) */}
                          <div className="md:col-span-5 relative">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                              Search Wallpaper (WP# / Design)
                            </label>
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-ink-muted" />
                              <input
                                type="text"
                                placeholder="WP number ya design type karein..."
                                value={item.searchQuery}
                                onChange={(e) => handleWallpaperSearchChange(index, e.target.value)}
                                onFocus={() => {
                                  if (item.searchQuery.trim()) {
                                    setWallpaperItems((prev) => {
                                      const next = [...prev];
                                      if (next[index]) next[index].showDropdown = true;
                                      return next;
                                    });
                                  }
                                }}
                                onBlur={() => {
                                  setTimeout(() => {
                                    setWallpaperItems((prev) => {
                                      if (!prev[index]) return prev;
                                      const next = [...prev];
                                      next[index].showDropdown = false;
                                      return next;
                                    });
                                  }, 250);
                                }}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-paper-light border border-warm-border rounded-lg text-ink font-semibold focus:outline-none focus:border-teal"
                              />
                            </div>

                            {/* Dropdown with yellow highlight */}
                            {item.showDropdown && item.searchQuery.trim() && (
                              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-amber-50 border border-amber-300 rounded-xl shadow-warm-lg max-h-52 overflow-y-auto divide-y divide-amber-200 p-1">
                                {filteredMatches.length === 0 ? (
                                  <div className="p-2 text-center text-xs text-amber-900">
                                    No matching wallpapers found for &ldquo;{item.searchQuery}&rdquo;
                                  </div>
                                ) : (
                                  filteredMatches.map((p) => (
                                    <div
                                      key={p._id}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelectWallpaperProduct(index, p);
                                      }}
                                      className="p-2 bg-amber-100 hover:bg-amber-200 rounded-lg cursor-pointer flex items-center justify-between transition-colors my-0.5 border border-amber-200"
                                    >
                                      <div>
                                        <span className="font-mono font-bold text-xs bg-amber-300 text-amber-950 px-1.5 py-0.5 rounded mr-1.5 border border-amber-400">
                                          {p.wp}
                                        </span>
                                        <span className="text-xs font-semibold text-ink">{p.design}</span>
                                        {p.brand && (
                                          <span className="text-[10px] text-ink-muted ml-1">({p.brand})</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-ink">
                                          Rs. {p.salePrice.toLocaleString()}
                                        </span>
                                        {p.stock <= 0 ? (
                                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-red-100 text-red-800 rounded border border-red-200">
                                            Out
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                                            {p.stock} rolls
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}

                            {item.wp && (
                              <div className="text-[10px] text-ink-muted mt-1 flex items-center gap-2 font-mono">
                                <span className="font-bold text-teal">WP: {item.wp}</span>
                                {item.design && <span>• {item.design}</span>}
                                {item.availableStock !== undefined && (
                                  <span className="text-status-success font-sans font-semibold">
                                    (Stock: {item.availableStock} rolls)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Qty (2 cols) */}
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                              Qty (Rolls)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => handleUpdateWallpaperQty(index, Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 bg-paper-light border border-warm-border rounded-lg text-xs font-bold text-ink text-center focus:outline-none focus:border-teal"
                            />
                          </div>

                          {/* Price / Rate (2 cols) */}
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                              Price (Rs.)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={item.rate}
                              onChange={(e) => handleUpdateWallpaperRate(index, Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 bg-paper-light border border-warm-border rounded-lg text-xs font-semibold text-ink text-right focus:outline-none focus:border-teal"
                            />
                          </div>

                          {/* Amount (2 cols) */}
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                              Amount (Rs.)
                            </label>
                            <div className="px-2.5 py-1.5 bg-warm-border/30 border border-warm-border rounded-lg text-xs font-bold text-ink text-right font-mono">
                              {formatCurrency(item.amount)}
                            </div>
                          </div>

                          {/* Remove button (1 col) */}
                          <div className="md:col-span-1 flex items-center justify-center pt-5">
                            <button
                              type="button"
                              onClick={() => handleRemoveWallpaperItem(index)}
                              className="p-1.5 text-ink-muted hover:text-status-danger rounded-lg hover:bg-status-dangerLight transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Wallpaper Item Button & Row Total */}
              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddWallpaperItem}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  className="text-xs text-teal border-teal/40 hover:bg-teal-subtle"
                >
                  + Add Wallpaper Item
                </Button>
                <div className="text-xs font-semibold text-ink">
                  Wallpaper Total: <span className="font-bold text-teal font-mono">{formatCurrency(wallpaperSubtotal)}</span>
                </div>
              </div>

              {/* Section 1 Hint Text */}
              <p className="text-[11px] text-ink-muted leading-relaxed bg-paper-light p-2.5 rounded-lg border border-warm-borderLight">
                Wallpaper number ya design type karein — matching wallpaper neeche yellow mein highlight hoke dikhengay, click karke select karein. Price field mein aap hamesha apni marzi ka rate likh saktay hain (chahe stock mein price set ho ya na ho) — total khud ba khud calculate hota rahega.
              </p>
            </CardContent>
          </Card>

          {/* SECTION 2: OTHER ITEMS / CHARGES (Free-text, Zero Stock-Cut) */}
          <Card className="border border-warm-border">
            <CardHeader className="pb-3 border-b border-warm-borderLight">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-4 h-4 text-brass-dark" />
                    <span>Other Items / Charges</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    (panels, PU stone, gum, installation, delivery — kuch bhi)
                  </CardDescription>
                </div>
                <Badge variant="brass">{otherItems.length} Other Lines</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {otherItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-ink-muted border border-dashed border-warm-border rounded-xl">
                  No other items or charges added. Click &ldquo;+ Add Other Item&rdquo; below for panels, PU stone, gum, installation, etc.
                </div>
              ) : (
                <div className="space-y-3">
                  {otherItems.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="p-3 bg-paper rounded-xl border border-warm-border space-y-2"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start">
                        {/* Free-text Item / Charge Name (5 cols) */}
                        <div className="md:col-span-5">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                            Item / Charge Description
                          </label>
                          <input
                            type="text"
                            placeholder="Item ya charge ka naam (e.g. Gum charges, Installation, Panels)..."
                            value={item.title}
                            onChange={(e) => handleUpdateOtherTitle(index, e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-paper-light border border-warm-border rounded-lg text-ink font-semibold focus:outline-none focus:border-brass-dark"
                          />
                        </div>

                        {/* Qty (2 cols) */}
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                            Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => handleUpdateOtherQty(index, Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-paper-light border border-warm-border rounded-lg text-xs font-bold text-ink text-center focus:outline-none focus:border-brass-dark"
                          />
                        </div>

                        {/* Price (2 cols) */}
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                            Price (Rs.)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={item.rate}
                            onChange={(e) => handleUpdateOtherRate(index, Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-paper-light border border-warm-border rounded-lg text-xs font-semibold text-ink text-right focus:outline-none focus:border-brass-dark"
                          />
                        </div>

                        {/* Amount (2 cols) */}
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                            Amount (Rs.)
                          </label>
                          <div className="px-2.5 py-1.5 bg-warm-border/30 border border-warm-border rounded-lg text-xs font-bold text-ink text-right font-mono">
                            {formatCurrency(item.amount)}
                          </div>
                        </div>

                        {/* Remove button (1 col) */}
                        <div className="md:col-span-1 flex items-center justify-center pt-5">
                          <button
                            type="button"
                            onClick={() => handleRemoveOtherItem(index)}
                            className="p-1.5 text-ink-muted hover:text-status-danger rounded-lg hover:bg-status-dangerLight transition-colors"
                            title="Remove charge"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Other Item Button & Row Total */}
              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOtherItem}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  className="text-xs text-brass-dark border-brass-dark/40 hover:bg-amber-50"
                >
                  + Add Other Item
                </Button>
                <div className="text-xs font-semibold text-ink">
                  Other Charges Total: <span className="font-bold text-brass-dark font-mono">{formatCurrency(otherSubtotal)}</span>
                </div>
              </div>

              {/* Section 2 Hint Text */}
              <p className="text-[11px] text-ink-muted leading-relaxed bg-paper-light p-2.5 rounded-lg border border-warm-borderLight">
                Wallpaper ke ilawa jo bhi aur item ya charge bechna/add karna hai — panels, PU stone, gum charges, installation, ya koi bhi cheez — uska naam, quantity aur price yahan manually likh dein, ye bhi stock catalog ki tarah nahi balke aap khud type kar ke add karte hain, total mein khud shamil ho jayega.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Calculations & Payment Summary (1 col) */}
        <div className="space-y-6">
          <Card variant="elevated" className="border-t-4 border-t-teal">
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Wallpaper Subtotal */}
              <div className="flex items-center justify-between text-xs pb-1 text-ink-muted">
                <span>Wallpaper Items Total:</span>
                <span className="font-mono font-semibold text-ink">{formatCurrency(wallpaperSubtotal)}</span>
              </div>

              {/* Other Items Subtotal */}
              {otherSubtotal > 0 && (
                <div className="flex items-center justify-between text-xs pb-1 text-ink-muted">
                  <span>Other Charges Total:</span>
                  <span className="font-mono font-semibold text-ink">{formatCurrency(otherSubtotal)}</span>
                </div>
              )}

              {/* Total Subtotal */}
              <div className="flex items-center justify-between text-xs pb-2 border-b border-warm-borderLight">
                <span className="font-bold text-ink">Combined Subtotal:</span>
                <span className="font-bold text-teal text-sm font-mono">{formatCurrency(subtotal)}</span>
              </div>

              {/* Discount (Rs.) */}
              <div className="space-y-1.5 pb-2 border-b border-warm-borderLight">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-muted font-medium">Discount (Rs.):</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discountRs || ''}
                    onChange={(e) => setDiscountRs(Number(e.target.value))}
                    className="w-24 px-2 py-1 bg-paper border border-warm-border rounded text-right text-xs font-semibold text-ink focus:outline-none focus:border-teal font-mono"
                  />
                </div>
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-status-danger">
                    <span>Discount Deducted:</span>
                    <span className="font-mono">- {formatCurrency(discountAmount)}</span>
                  </div>
                )}
              </div>

              {/* Tax Toggle & Rate */}
              <div className="space-y-1.5 pb-2 border-b border-warm-borderLight">
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-ink-muted">
                    <input
                      type="checkbox"
                      checked={taxOn}
                      onChange={(e) => setTaxOn(e.target.checked)}
                      className="rounded text-teal focus:ring-teal"
                    />
                    <span>Apply Tax</span>
                  </label>
                  {taxOn && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                        className="w-14 px-2 py-0.5 bg-paper border border-warm-border rounded text-right text-xs font-semibold text-ink"
                      />
                      <span className="text-xs text-ink-muted">%</span>
                    </div>
                  )}
                </div>
                {taxOn && taxAmount > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-ink-muted">
                    <span>Tax Added:</span>
                    <span>+ {formatCurrency(taxAmount)}</span>
                  </div>
                )}
              </div>

              {/* Grand Total */}
              <div className="p-3 bg-paper rounded-xl border border-warm-border flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-ink">Grand Total:</span>
                <span className="text-lg font-extrabold text-teal">{formatCurrency(total)}</span>
              </div>

              {/* Advance Payment Quick Actions */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
                    Advance Payment (PKR)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPaidAmount(roundMoney(total / 2));
                        setJobStatus('Advance Received');
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-subtle text-teal hover:bg-teal hover:text-white transition-colors"
                    >
                      50% Advance
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaidAmount(total);
                        setJobStatus('Fully Paid');
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-600 hover:text-white transition-colors"
                    >
                      100% Full
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaidAmount(0);
                        setJobStatus('In Progress');
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 hover:bg-rose-600 hover:text-white transition-colors"
                    >
                      0% Udhar
                    </button>
                  </div>
                </div>

                <input
                  type="number"
                  min="0"
                  value={paidAmount || ''}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPaidAmount(val);
                    if (val >= total && total > 0) {
                      setJobStatus('Fully Paid');
                    }
                  }}
                  placeholder="Enter advance or cash amount"
                  className="w-full px-3 py-2 bg-paper-light border border-warm-border rounded-lg text-sm font-bold text-status-success focus:border-teal focus:outline-none"
                />

                {/* Job Stage / Order Progress */}
                <div className="space-y-1 pt-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
                    Job / Fitting Status
                  </label>
                  <select
                    value={jobStatus}
                    onChange={(e) => setJobStatus(e.target.value)}
                    className="w-full rounded-lg border border-warm-border bg-paper-light px-3 py-1.5 text-xs font-semibold text-ink focus:border-teal focus:outline-none"
                  >
                    <option value="Advance Received">Advance Received (Pending Fitting)</option>
                    <option value="In Progress">In Progress (Fitting on Site)</option>
                    <option value="Completed">Work Completed (Pending Balance)</option>
                    <option value="Fully Paid">Fully Paid</option>
                  </select>
                </div>

                {/* Remaining Udhar / Advance Credit Balance */}
                {remaining < 0 ? (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-900">Advance / Credit Balance:</span>
                      <span className="font-bold text-emerald-950 text-sm">
                        {formatCurrency(Math.abs(remaining))}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-800">
                      ✓ Customer has overpaid. Credit balance will be carried in client account.
                    </div>
                  </div>
                ) : remaining === 0 ? (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-900">Payment Balance:</span>
                      <span className="font-bold text-emerald-950 text-sm">Cleared (Rs. 0)</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-900">Remaining Udhar:</span>
                      <span className="font-bold text-amber-950 text-sm">
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-800">
                      ⚡ Persistent Reminder: Client will remain flagged in Debt Alerts until fully cleared.
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-lg border border-warm-border bg-paper-light px-3 py-2 text-xs text-ink focus:border-teal focus:outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer (Online)">Bank Transfer (Online)</option>
                    <option value="JazzCash">JazzCash</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                    <option value="Raast">Raast Instant</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <Input
                  label="Invoice Notes"
                  type="text"
                  placeholder="Terms, site address, delivery instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Button
                variant="teal"
                className="w-full mt-4"
                size="lg"
                onClick={handleSubmitInvoice}
                isLoading={submitting}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save &amp; Generate Bill
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inline Quick Add Customer Modal */}
      <Modal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        title="Quick Add Party (Customer / Supplier)"
        description="Add a new client or vendor without losing your invoice line items."
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
              Party Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewCustType('customer')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                  newCustType === 'customer'
                    ? 'bg-teal text-white border-teal shadow-warm'
                    : 'bg-paper text-ink-muted border-warm-border hover:text-ink'
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setNewCustType('supplier')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                  newCustType === 'supplier'
                    ? 'bg-brass-dark text-white border-brass-dark shadow-warm'
                    : 'bg-paper text-ink-muted border-warm-border hover:text-ink'
                }`}
              >
                Supplier (Vendor)
              </button>
            </div>
          </div>

          <Input
            label={newCustType === 'supplier' ? 'Supplier / Company Name' : 'Customer Name'}
            type="text"
            required
            placeholder={newCustType === 'supplier' ? 'e.g. Master Wallpapers Ltd' : 'e.g. Aslam Khan'}
            value={newCustName}
            onChange={(e) => setNewCustName(e.target.value)}
          />
          <Input
            label="Mobile Number"
            type="text"
            required
            placeholder="0300-1234567"
            value={newCustMobile}
            onChange={(e) => setNewCustMobile(e.target.value)}
          />
          <Input
            label="City"
            type="text"
            placeholder="Lahore"
            value={newCustCity}
            onChange={(e) => setNewCustCity(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-borderLight">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddCustomerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="teal"
              isLoading={custLoading}
            >
              Create {newCustType === 'supplier' ? 'Supplier' : 'Customer'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
