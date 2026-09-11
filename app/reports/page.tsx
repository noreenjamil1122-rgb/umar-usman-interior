'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Printer,
  Users,
  AlertTriangle,
  Package,
  CreditCard,
  FileText,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<
    'sales' | 'customers' | 'outstanding' | 'stock' | 'low_stock' | 'payments' | 'invoices'
  >('sales');

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(true);

  // Raw data collections
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [invRes, cusRes, prodRes, payRes] = await Promise.all([
        fetch('/api/invoices?limit=100'),
        fetch('/api/customers'),
        fetch('/api/products'),
        fetch('/api/payments?limit=100'),
      ]);

      const [invData, cusData, prodData, payData] = await Promise.all([
        invRes.json(),
        cusRes.json(),
        prodRes.json(),
        payRes.json(),
      ]);

      if (invData.success) setInvoices(invData.data || []);
      if (cusData.success) setCustomers(cusData.data || []);
      if (prodData.success) setProducts(prodData.data || []);
      if (payData.success) setPayments(payData.data || []);
    } catch {
      toast.error('Failed to load reporting data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Filter by date range
  const filteredInvoices = invoices.filter((inv) => {
    const d = inv.date.split('T')[0];
    return (!startDate || d >= startDate) && (!endDate || d <= endDate);
  });

  const filteredPayments = payments.filter((p) => {
    const d = p.date.split('T')[0];
    return (!startDate || d >= startDate) && (!endDate || d <= endDate);
  });

  // Sales calculations
  const totalSalesBilled = filteredInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
  const totalSalesPaid = filteredInvoices.reduce((sum, i) => sum + (i.paid || 0), 0);
  const totalSalesRemaining = filteredInvoices.reduce((sum, i) => sum + (i.remaining > 0 ? i.remaining : 0), 0);
  const totalRollsSold = filteredInvoices.reduce(
    (sum, i) => sum + (i.items?.reduce((s: number, item: any) => s + (item.qty || 0), 0) || 0),
    0
  );

  // Outstanding Debtors
  const outstandingDebtors = customers.filter((c) => (c.outstandingBalance || 0) > 0);
  const totalOutstandingUdhar = outstandingDebtors.reduce(
    (sum, c) => sum + (c.outstandingBalance || 0),
    0
  );

  // Stock inventory valuation
  const totalStockRolls = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalStockValuation = products.reduce(
    (sum, p) => sum + (p.stock || 0) * (p.purchasePrice || p.salePrice || 0),
    0
  );
  const lowStockProducts = products.filter((p) => p.stock <= (p.minStock || 3));

  const printCurrentReport = () => {
    window.print();
  };

  return (
    <AppShell title="Business Reports">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            Financial &amp; Stock Reports
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Auditing, sales performance, cash collections, and stock valuation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="brass"
            size="md"
            className="min-h-[42px]"
            onClick={printCurrentReport}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print Report
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card className="mb-6 sm:mb-8 p-5 rounded-2xl shadow-warm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-wrap text-xs sm:text-sm">
            <span className="font-bold text-ink-muted">Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm bg-paper border border-warm-border rounded-xl text-ink font-semibold focus:outline-none focus:border-teal min-h-[40px]"
            />
            <span className="text-ink-muted font-medium">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm bg-paper border border-warm-border rounded-xl text-ink font-semibold focus:outline-none focus:border-teal min-h-[40px]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
            <button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setStartDate(today);
                setEndDate(today);
              }}
              className="px-3.5 py-2 rounded-xl bg-paper border border-warm-border text-ink-muted hover:text-ink font-bold min-h-[38px] transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                setStartDate(d.toISOString().split('T')[0]);
                setEndDate(new Date().toISOString().split('T')[0]);
              }}
              className="px-3.5 py-2 rounded-xl bg-paper border border-warm-border text-ink-muted hover:text-ink font-bold min-h-[38px] transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                setStartDate(d.toISOString().split('T')[0]);
                setEndDate(new Date().toISOString().split('T')[0]);
              }}
              className="px-3.5 py-2 rounded-xl bg-paper border border-warm-border text-ink-muted hover:text-ink font-bold min-h-[38px] transition-colors"
            >
              Last 30 Days
            </button>
          </div>
        </div>
      </Card>

      {/* 7 Report Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2.5 mb-6 sm:mb-8 border-b border-warm-border">
        {[
          { id: 'sales', label: '1. Sales Summary', icon: TrendingUp },
          { id: 'customers', label: '2. Customer Accounts', icon: Users },
          { id: 'outstanding', label: '3. Outstanding Udhar', icon: AlertTriangle },
          { id: 'stock', label: '4. Stock Valuation', icon: Package },
          { id: 'low_stock', label: '5. Low Stock Alerts', icon: AlertTriangle },
          { id: 'payments', label: '6. Payment Collections', icon: CreditCard },
          { id: 'invoices', label: '7. Invoices Registry', icon: FileText },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 min-h-[42px] ${
                isActive
                  ? 'bg-teal text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-ink-muted flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-teal mr-2" />
          Aggregating reporting metrics...
        </div>
      ) : (
        <>
          {/* TAB 1: SALES REPORT */}
          {activeTab === 'sales' && (
            <div className="space-y-6 sm:space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                <Card className="p-5 sm:p-6 bg-paper border border-warm-border rounded-2xl shadow-warm">
                  <div className="text-xs font-bold uppercase text-ink-muted tracking-wider">Total Sales Invoiced</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-ink mt-1.5">{formatCurrency(totalSalesBilled)}</div>
                  <div className="text-xs text-ink-muted mt-1">{filteredInvoices.length} invoices</div>
                </Card>
                <Card className="p-5 sm:p-6 bg-paper border border-warm-border rounded-2xl shadow-warm">
                  <div className="text-xs font-bold uppercase text-ink-muted tracking-wider">Payments Received</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-status-success mt-1.5">{formatCurrency(totalSalesPaid)}</div>
                  <div className="text-xs text-ink-muted mt-1">Cash &amp; bank deposits</div>
                </Card>
                <Card className="p-5 sm:p-6 bg-paper border border-warm-border rounded-2xl shadow-warm">
                  <div className="text-xs font-bold uppercase text-ink-muted tracking-wider">Uncollected Udhar</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-status-danger mt-1.5">{formatCurrency(totalSalesRemaining)}</div>
                  <div className="text-xs text-ink-muted mt-1">Pending collection</div>
                </Card>
                <Card className="p-5 sm:p-6 bg-paper border border-warm-border rounded-2xl shadow-warm">
                  <div className="text-xs font-bold uppercase text-ink-muted tracking-wider">Rolls Dispatched</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-teal mt-1.5">{totalRollsSold.toLocaleString()} rolls</div>
                  <div className="text-xs text-ink-muted mt-1">Wallpaper volume</div>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Sales Invoices In Period</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold text-xs">
                      <tr>
                        <th className="py-3.5 px-4">Invoice #</th>
                        <th className="py-3.5 px-4">Customer</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4 text-right">Total</th>
                        <th className="py-3.5 px-4 text-right">Paid</th>
                        <th className="py-3.5 px-4 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-borderLight">
                      {filteredInvoices.map((inv) => (
                        <tr key={inv._id} className="hover:bg-paper transition-colors">
                          <td className="py-4 px-4 font-mono font-bold text-teal">
                            <Link href={`/invoices/${inv._id}`} className="hover:underline">
                              {inv.number}
                            </Link>
                          </td>
                          <td className="py-4 px-4 font-semibold text-ink">{inv.customerId?.name || 'Walk-in'}</td>
                          <td className="py-4 px-4 text-ink-muted">{formatDate(inv.date)}</td>
                          <td className="py-4 px-4 text-right font-bold text-ink">{formatCurrency(inv.total)}</td>
                          <td className="py-4 px-4 text-right text-status-success font-semibold">{formatCurrency(inv.paid)}</td>
                          <td className="py-4 px-4 text-right font-bold">
                            {inv.remaining > 0 ? (
                              <span className="text-status-danger">{formatCurrency(inv.remaining)}</span>
                            ) : (
                              <span className="text-ink-muted font-medium">Cleared</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: CUSTOMERS REPORT */}
          {activeTab === 'customers' && (
            <Card>
              <CardHeader>
                <CardTitle>Customer Accounts &amp; Lifetime Value</CardTitle>
                <CardDescription>All registered customers and business volume</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold text-xs">
                    <tr>
                      <th className="py-3.5 px-4">Code</th>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Contact</th>
                      <th className="py-3.5 px-4">City</th>
                      <th className="py-3.5 px-4 text-right">Total Purchased</th>
                      <th className="py-3.5 px-4 text-right">Current Udhar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-borderLight">
                    {customers.map((c) => (
                      <tr key={c._id} className="hover:bg-paper transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-teal">{c.code}</td>
                        <td className="py-4 px-4 font-semibold text-ink">
                          <Link href={`/customers/${c._id}`} className="hover:underline">
                            {c.name}
                          </Link>
                        </td>
                        <td className="py-4 px-4 text-ink-muted">{c.mobile}</td>
                        <td className="py-4 px-4 text-ink-muted">{c.city || 'Lahore'}</td>
                        <td className="py-4 px-4 text-right font-bold text-ink">{formatCurrency(c.totalPurchase || 0)}</td>
                        <td className="py-4 px-4 text-right font-bold">
                          {(c.outstandingBalance || 0) > 0 ? (
                            <span className="text-status-danger">{formatCurrency(c.outstandingBalance)}</span>
                          ) : (
                            <span className="text-status-success font-medium">Cleared</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: OUTSTANDING UDHAR REPORT */}
          {activeTab === 'outstanding' && (
            <div className="space-y-5 sm:space-y-6">
              <div className="p-5 sm:p-6 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between shadow-warm">
                <div>
                  <div className="text-xs uppercase font-bold text-red-900 tracking-wider">Total Unpaid Udhar Balance</div>
                  <div className="text-2xl sm:text-3xl font-black text-status-danger mt-1">
                    {formatCurrency(totalOutstandingUdhar)}
                  </div>
                </div>
                <div className="text-right text-xs sm:text-sm text-red-800 font-bold">
                  {outstandingDebtors.length} debtors with active debt
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold text-xs">
                      <tr>
                        <th className="py-3.5 px-4">Code</th>
                        <th className="py-3.5 px-4">Debtor Name</th>
                        <th className="py-3.5 px-4">Phone</th>
                        <th className="py-3.5 px-4">Address</th>
                        <th className="py-3.5 px-4 text-right">Outstanding (Udhar)</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-borderLight">
                      {outstandingDebtors.map((c) => (
                        <tr key={c._id} className="hover:bg-paper transition-colors">
                          <td className="py-4 px-4 font-mono font-bold text-teal">{c.code}</td>
                          <td className="py-4 px-4 font-bold text-ink">{c.name}</td>
                          <td className="py-4 px-4 text-ink-muted">{c.mobile}</td>
                          <td className="py-4 px-4 text-ink-muted">{c.address || c.city || 'Lahore'}</td>
                          <td className="py-4 px-4 text-right font-black text-status-danger text-sm sm:text-base">
                            {formatCurrency(c.outstandingBalance)}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <Link href={`/customers/${c._id}`}>
                              <Button variant="outline" size="sm" className="min-h-[34px] text-xs font-semibold px-3">
                                Ledger
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: STOCK VALUATION */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-paper border border-warm-border">
                  <div className="text-xs uppercase font-semibold text-ink-muted">Total Available Stock</div>
                  <div className="text-2xl font-black text-teal mt-1">{totalStockRolls.toLocaleString()} rolls</div>
                </Card>
                <Card className="p-4 bg-paper border border-warm-border">
                  <div className="text-xs uppercase font-semibold text-ink-muted">Estimated Inventory Valuation</div>
                  <div className="text-2xl font-black text-ink mt-1">{formatCurrency(totalStockValuation)}</div>
                </Card>
              </div>

              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold text-xs">
                      <tr>
                        <th className="py-3.5 px-4">WP#</th>
                        <th className="py-3.5 px-4">Design</th>
                        <th className="py-3.5 px-4">Book</th>
                        <th className="py-3.5 px-4 text-center">In Stock</th>
                        <th className="py-3.5 px-4 text-right">Unit Price</th>
                        <th className="py-3.5 px-4 text-right">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-borderLight">
                      {products.map((p) => (
                        <tr key={p._id} className="hover:bg-paper transition-colors">
                          <td className="py-4 px-4 font-mono font-bold text-teal">WP {p.wp}</td>
                          <td className="py-4 px-4 font-semibold text-ink">{p.design}</td>
                          <td className="py-4 px-4 text-ink-muted">{p.bookId?.name || '-'}</td>
                          <td className="py-4 px-4 text-center font-bold">{p.stock} rolls</td>
                          <td className="py-4 px-4 text-right font-medium text-ink">{formatCurrency(p.salePrice)}</td>
                          <td className="py-4 px-4 text-right font-bold text-ink">
                            {formatCurrency(p.stock * (p.purchasePrice || p.salePrice || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 5: LOW STOCK ALERTS */}
          {activeTab === 'low_stock' && (
            <Card>
              <CardHeader>
                <CardTitle>Low Stock &amp; Depleted Wallpapers (&le; 3 rolls)</CardTitle>
                <CardDescription>Wallpapers requiring supplier re-orders</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold text-xs">
                    <tr>
                      <th className="py-3.5 px-4">WP#</th>
                      <th className="py-3.5 px-4">Design</th>
                      <th className="py-3.5 px-4">Book</th>
                      <th className="py-3.5 px-4">Warehouse</th>
                      <th className="py-3.5 px-4 text-center">Remaining</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-borderLight">
                    {lowStockProducts.map((p) => (
                      <tr key={p._id} className="hover:bg-paper transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-teal">WP {p.wp}</td>
                        <td className="py-4 px-4 font-semibold text-ink">{p.design}</td>
                        <td className="py-4 px-4 text-ink-muted">{p.bookId?.name || '-'}</td>
                        <td className="py-4 px-4 text-ink-muted">{p.warehouseId?.name || '-'}</td>
                        <td className="py-4 px-4 text-center font-bold text-status-danger">{p.stock} rolls</td>
                        <td className="py-4 px-4 text-center">
                          {p.stock <= 0 ? (
                            <span className="px-2.5 py-1 rounded-lg bg-red-100 text-status-danger font-bold text-xs">
                              Depleted
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs">
                              Reorder Soon
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* TAB 6: PAYMENTS REPORT */}
          {activeTab === 'payments' && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Collections Ledger</CardTitle>
                <CardDescription>All incoming cash, bank, and online payments in period</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold text-xs">
                    <tr>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Party</th>
                      <th className="py-3.5 px-4">Method</th>
                      <th className="py-3.5 px-4">Reference</th>
                      <th className="py-3.5 px-4 text-right">Amount Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-borderLight">
                    {filteredPayments.map((p) => (
                      <tr key={p._id} className="hover:bg-paper transition-colors">
                        <td className="py-4 px-4 text-ink-muted">{formatDate(p.date)}</td>
                        <td className="py-4 px-4 font-semibold text-ink">{p.customerId?.name || '-'}</td>
                        <td className="py-4 px-4 font-medium text-ink">{p.method}</td>
                        <td className="py-4 px-4 text-ink-muted">{p.reference || '-'}</td>
                        <td className="py-4 px-4 text-right font-bold text-status-success text-sm sm:text-base">
                          {formatCurrency(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* TAB 7: INVOICES REGISTRY */}
          {activeTab === 'invoices' && (
            <Card>
              <CardHeader>
                <CardTitle>Complete Invoice Registry</CardTitle>
                <CardDescription>Billed invoices, payment status, and balance history</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold text-xs">
                    <tr>
                      <th className="py-3.5 px-4">Invoice #</th>
                      <th className="py-3.5 px-4">Party</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4 text-right">Total Amount</th>
                      <th className="py-3.5 px-4 text-right">Paid</th>
                      <th className="py-3.5 px-4 text-right">Remaining</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-borderLight">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-paper transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-teal">
                          <Link href={`/invoices/${inv._id}`} className="hover:underline">
                            {inv.number}
                          </Link>
                        </td>
                        <td className="py-4 px-4 font-semibold text-ink">{inv.customerId?.name || 'Walk-in'}</td>
                        <td className="py-4 px-4 text-ink-muted">{formatDate(inv.date)}</td>
                        <td className="py-4 px-4 text-right font-bold text-ink">{formatCurrency(inv.total)}</td>
                        <td className="py-4 px-4 text-right text-status-success font-semibold">{formatCurrency(inv.paid)}</td>
                        <td className="py-4 px-4 text-right font-bold">
                          {inv.remaining > 0 ? (
                            <span className="text-status-danger">{formatCurrency(inv.remaining)}</span>
                          ) : inv.remaining < 0 ? (
                            <span className="text-status-success font-semibold">Adv: {formatCurrency(Math.abs(inv.remaining))}</span>
                          ) : (
                            <span className="text-ink-muted font-medium">Rs. 0</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {inv.remaining <= 0 ? (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800">
                              Payment Complete
                            </span>
                          ) : inv.paid > 0 ? (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800">
                              Processing
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-800">
                              Udhar
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </AppShell>
  );
}
