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
  FileText,
  User,
  Plus,
  Trash2,
  Search,
  Layers,
  ArrowLeft,
  Save,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

interface CustomerOption {
  _id: string;
  name: string;
  mobile: string;
  code: string;
  city: string;
}

interface ProductOption {
  _id: string;
  wp: string;
  design: string;
  brand: string;
  salePrice: number;
  stock: number;
}

interface LineItem {
  productId?: string;
  wp: string;
  design: string;
  availableStock?: number;
  qty: number;
  rate: number;
  amount: number;
}

export default function NewInvoicePage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('0');
  const [terms, setTerms] = useState('Custom');
  const [items, setItems] = useState<LineItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
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
  const [custLoading, setCustLoading] = useState(false);

  // Product Search / Selector State
  const [productSearch, setProductSearch] = useState('');

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
          setDiscountPercent(sData.data.defaultDiscount || 0);
          setTaxOn(Boolean(sData.data.taxOn));
          setTaxRate(sData.data.taxRate || 0);
        }
      } catch (err) {
        console.error('Invoice init error:', err);
      } finally {
        setLoading(false);
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
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Could not create customer', { description: json.error });
        setCustLoading(false);
        return;
      }

      toast.success('Customer added');
      setCustomers((prev) => [json.data, ...prev]);
      setSelectedCustomerId(json.data._id);
      setIsAddCustomerOpen(false);
      setNewCustName('');
      setNewCustMobile('');
    } catch {
      toast.error('Network error');
    } finally {
      setCustLoading(false);
    }
  };

  // Add Product to Invoice Lines
  const handleAddProduct = (prod: ProductOption) => {
    // Check if product already exists in line items
    const existingIndex = items.findIndex((i) => i.productId === prod._id);
    if (existingIndex > -1) {
      const updated = [...items];
      const newQty = updated[existingIndex].qty + 1;
      if (newQty > prod.stock) {
        toast.warning(`Only ${prod.stock} rolls in stock for WP# ${prod.wp}`);
        return;
      }
      updated[existingIndex].qty = newQty;
      updated[existingIndex].amount = roundMoney(newQty * updated[existingIndex].rate);
      setItems(updated);
    } else {
      if (prod.stock < 1) {
        toast.error(`WP# ${prod.wp} is currently OUT OF STOCK!`);
        return;
      }
      setItems((prev) => [
        ...prev,
        {
          productId: prod._id,
          wp: prod.wp,
          design: prod.design,
          availableStock: prod.stock,
          qty: 1,
          rate: prod.salePrice,
          amount: prod.salePrice,
        },
      ]);
    }
    setProductSearch('');
  };

  // Update line item quantity
  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const updated = [...items];
    const item = updated[index];
    if (item.availableStock !== undefined && newQty > item.availableStock) {
      toast.warning(`Maximum available stock is ${item.availableStock} rolls.`);
      return;
    }
    item.qty = newQty;
    item.amount = roundMoney(newQty * item.rate);
    setItems(updated);
  };

  // Update line item rate
  const handleUpdateRate = (index: number, newRate: number) => {
    if (newRate < 0) return;
    const updated = [...items];
    const item = updated[index];
    item.rate = newRate;
    item.amount = roundMoney(item.qty * newRate);
    setItems(updated);
  };

  // Remove line item
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddService = (wp: string, design: string, rate: number) => {
    setItems((prev) => [
      ...prev,
      {
        wp,
        design,
        qty: 1,
        rate,
        amount: rate,
      },
    ]);
    toast.success(`Added: ${wp}`);
  };

  // Financial Calculations
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
  const discountAmount = roundMoney((subtotal * Math.min(Math.max(discountPercent, 0), 100)) / 100);
  const taxableAmount = roundMoney(subtotal - discountAmount);
  const effectiveTaxRate = taxOn ? Math.max(taxRate, 0) : 0;
  const taxAmount = roundMoney((taxableAmount * effectiveTaxRate) / 100);
  const total = roundMoney(taxableAmount + taxAmount);
  const remaining = roundMoney(Math.max(total - paidAmount, 0));

  // Submit Invoice
  const handleSubmitInvoice = async () => {
    if (!selectedCustomerId) {
      toast.error('Please select or add a customer');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one line item (wallpaper or service)');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        customerId: selectedCustomerId,
        date: invoiceDate,
        reference,
        terms,
        items: items.map((i) => ({
          productId: i.productId || undefined,
          wp: i.wp,
          design: i.design,
          qty: i.qty,
          rate: i.rate,
          amount: i.amount,
        })),
        discount: discountPercent,
        tax: effectiveTaxRate,
        paid: paidAmount,
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

      router.push(`/invoices/${json.data._id}/print`);
    } catch {
      toast.error('Network error while creating invoice');
      setSubmitting(false);
    }
  };

  const filteredProducts = productSearch.trim()
    ? products.filter(
        (p) =>
          p.wp.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.design.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.brand.toLowerCase().includes(productSearch.toLowerCase())
      )
    : [];

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
                    <option value="">-- Choose Customer --</option>
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

          {/* Product Search & Line Items Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Wallpaper Line Items &amp; Charges</CardTitle>
                  <CardDescription>Add wallpaper rolls, gum, or installation fees</CardDescription>
                </div>
                <Badge variant="teal">{items.length} Lines Added</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Add Common Charges */}
              <div className="flex items-center gap-2 flex-wrap text-xs pb-2 border-b border-warm-borderLight">
                <span className="font-semibold text-ink-muted">Quick Charges:</span>
                <button
                  type="button"
                  onClick={() => handleAddService('GUM CHARGES', 'Wallpaper Adhesive Chemical', 1850)}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-bold hover:bg-amber-600 hover:text-white transition-colors"
                >
                  + GUM CHARGES (Rs. 1,850)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddService('Installation charges', 'Wallpaper Fitting Services', 3000)}
                  className="px-2.5 py-1 rounded-lg bg-teal-subtle text-teal border border-teal/30 font-bold hover:bg-teal hover:text-white transition-colors"
                >
                  + Installation charges (Rs. 3,000)
                </button>
              </div>

              {/* Product Live Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-ink-muted" />
                <input
                  type="text"
                  placeholder="Search wallpaper by WP# (e.g. WP-101) or design..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-paper border border-warm-border rounded-lg text-ink focus:outline-none focus:border-teal"
                />

                {/* Autocomplete Dropdown */}
                {productSearch.trim() && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-paper-light border border-warm-border rounded-xl shadow-warm-lg max-h-60 overflow-y-auto divide-y divide-warm-borderLight">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-center text-xs text-ink-muted">
                        No wallpaper products found matching &ldquo;{productSearch}&rdquo;.
                      </div>
                    ) : (
                      filteredProducts.map((p) => (
                        <div
                          key={p._id}
                          onClick={() => handleAddProduct(p)}
                          className="p-3 hover:bg-paper cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <span className="font-mono font-bold text-xs text-teal mr-2">
                              {p.wp}
                            </span>
                            <span className="text-sm font-semibold text-ink">{p.design}</span>
                            <span className="text-xs text-ink-muted ml-2">({p.brand})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-ink">
                              {formatCurrency(p.salePrice)}
                            </span>
                            {p.stock <= 0 ? (
                              <Badge variant="danger" size="sm">Out of Stock</Badge>
                            ) : (
                              <Badge variant="success" size="sm">{p.stock} rolls</Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Line Items Table */}
              {items.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-warm-border rounded-xl text-ink-muted space-y-2">
                  <Layers className="w-8 h-8 mx-auto text-ink-muted/40" />
                  <div className="text-xs font-semibold text-ink">No items on this invoice yet</div>
                  <p className="text-[11px]">
                    Use the search bar above to select wallpaper rolls.
                  </p>
                </div>
              ) : (
                <div className="border border-warm-border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">WP# &amp; Design</th>
                        <th className="py-2.5 px-3 w-28">Qty (Rolls)</th>
                        <th className="py-2.5 px-3 w-32">Rate (PKR)</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-borderLight">
                      {items.map((item, index) => (
                        <tr key={item.productId || `service-${index}`} className="hover:bg-paper/50">
                          <td className="py-2.5 px-3">
                            <div className="font-mono font-bold text-teal">{item.wp}</div>
                            <div className="font-semibold text-ink">{item.design}</div>
                            <div className="text-[10px] text-ink-muted">
                              {item.availableStock !== undefined
                                ? `In Godown: ${item.availableStock} rolls`
                                : 'Service / Labor Charge'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min="1"
                              max={item.availableStock !== undefined ? item.availableStock : 999}
                              value={item.qty}
                              onChange={(e) => handleUpdateQty(index, Number(e.target.value))}
                              className="w-20 px-2 py-1 bg-paper-light border border-warm-border rounded text-center text-xs font-bold text-ink"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min="0"
                              value={item.rate}
                              onChange={(e) => handleUpdateRate(index, Number(e.target.value))}
                              className="w-24 px-2 py-1 bg-paper-light border border-warm-border rounded text-right text-xs font-semibold text-ink"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-bold text-ink">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1 rounded text-status-danger hover:bg-status-dangerLight transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
              {/* Subtotal */}
              <div className="flex items-center justify-between text-xs pb-2 border-b border-warm-borderLight">
                <span className="text-ink-muted">Subtotal:</span>
                <span className="font-bold text-ink text-sm">{formatCurrency(subtotal)}</span>
              </div>

              {/* Discount */}
              <div className="space-y-1.5 pb-2 border-b border-warm-borderLight">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-muted">Discount (%):</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-16 px-2 py-0.5 bg-paper border border-warm-border rounded text-right text-xs font-semibold text-ink"
                  />
                </div>
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-status-danger">
                    <span>Discount Deducted:</span>
                    <span>- {formatCurrency(discountAmount)}</span>
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
                  max={total}
                  value={paidAmount || ''}
                  onChange={(e) => setPaidAmount(Math.min(total, Number(e.target.value)))}
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

                {/* Remaining Udhar Balance with Persistent Reminder Note */}
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-900">Remaining Udhar:</span>
                    <span className="font-bold text-amber-950 text-sm">
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                  {remaining > 0 && (
                    <div className="text-[11px] text-amber-800">
                      ⚡ Persistent Reminder: Client will remain flagged in Debt Alerts until fully cleared.
                    </div>
                  )}
                </div>

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
        title="Quick Add Customer"
        description="Add a new client without losing your invoice line items."
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <Input
            label="Customer Name"
            type="text"
            required
            placeholder="e.g. Aslam Khan"
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
              Create Customer
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
