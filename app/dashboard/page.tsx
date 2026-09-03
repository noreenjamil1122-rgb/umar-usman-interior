'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  FileText,
  Layers,
  Users,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  Plus,
  RefreshCw,
  TrendingUp,
  PackageX,
  BellRing,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardData {
  metrics: {
    totalCustomers: number;
    totalProducts: number;
    totalStockRolls: number;
    outOfStockCount: number;
    lowStockCount: number;
    totalRevenue: number;
    totalCollected: number;
    totalOutstanding: number;
    totalInvoices: number;
  };
  recentInvoices: Array<{
    _id: string;
    number: string;
    date: string;
    total: number;
    paid: number;
    remaining: number;
    method: string;
    customerId?: { name: string; mobile: string; code: string };
  }>;
  stockAttention: Array<{
    _id: string;
    wp: string;
    design: string;
    brand: string;
    stock: number;
    minStock: number;
    salePrice: number;
  }>;
  debtCustomers: Array<{
    customerId: string;
    customerName: string;
    customerMobile: string;
    customerCode: string;
    totalDebt: number;
    oldestInvoiceDate: string;
    invoiceCount: number;
  }>;
  businessName: string;
  reminderAckDate?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acked, setAcked] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error('Dashboard Error', { description: json.error });
      }
    } catch {
      toast.error('Connection Error', { description: 'Could not fetch dashboard metrics' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleAcknowledgeReminder = async () => {
    setAcked(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderAckDate: new Date().toISOString() }),
      });
      toast.success('Reminder acknowledged', {
        description: 'Udhar alerts have been dismissed for today.',
      });
    } catch {
      toast.error('Could not save acknowledgement');
    }
  };

  const metrics = data?.metrics || {
    totalCustomers: 0,
    totalProducts: 0,
    totalStockRolls: 0,
    outOfStockCount: 0,
    lowStockCount: 0,
    totalRevenue: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    totalInvoices: 0,
  };

  const showUdharBanner =
    !acked && (data?.debtCustomers?.length || 0) > 0 && metrics.totalOutstanding > 0;

  return (
    <AppShell title="Business Dashboard">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
            {data?.businessName || 'Umar Usman Interior'}
          </h1>
          <p className="text-xs md:text-sm text-ink-muted">
            Wallpaper Inventory &amp; Financial Overview • Lahore
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboard}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          <Link href="/invoices/new">
            <Button variant="teal" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              New Invoice
            </Button>
          </Link>

          <Link href="/products">
            <Button variant="brass" size="sm" leftIcon={<Layers className="w-4 h-4" />}>
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Udhar Debt Notification Banner */}
      {showUdharBanner && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 shadow-warm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0 mt-0.5">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-bold text-amber-900">
                Udhar Reminder: {formatCurrency(metrics.totalOutstanding)} Outstanding
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                {data?.debtCustomers?.length} client(s) currently have pending unpaid invoice balances.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-auto">
            <Link href="/customers?filter=debt">
              <Button variant="outline" size="sm" className="bg-white text-xs border-amber-300">
                View Debt Ledger
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAcknowledgeReminder}
              className="text-amber-900 text-xs"
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Acknowledge
            </Button>
          </div>
        </div>
      )}

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-8">
        {/* Total Revenue */}
        <Card variant="elevated" className="border-l-4 border-l-teal">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="p-2 bg-teal-subtle rounded-lg text-teal">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-ink">
            {formatCurrency(metrics.totalRevenue)}
          </div>
          <div className="text-xs text-ink-muted mt-1">
            Collected: <span className="font-semibold text-status-success">{formatCurrency(metrics.totalCollected)}</span>
          </div>
        </Card>

        {/* Total Outstanding (Udhar) */}
        <Card variant="elevated" className="border-l-4 border-l-brass">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Total Outstanding
            </span>
            <div className="p-2 bg-brass-subtle rounded-lg text-brass-dark">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-ink">
            {formatCurrency(metrics.totalOutstanding)}
          </div>
          <div className="text-xs text-status-warning mt-1 font-medium">
            Pending client recovery
          </div>
        </Card>

        {/* Active Inventory */}
        <Card variant="elevated">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Wallpaper Stock
            </span>
            <div className="p-2 bg-paper-dark rounded-lg text-ink-muted">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-ink">
            {metrics.totalStockRolls.toLocaleString()} <span className="text-xs text-ink-muted font-normal">Rolls</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {metrics.outOfStockCount > 0 ? (
              <Badge variant="danger" size="sm">
                {metrics.outOfStockCount} Out
              </Badge>
            ) : null}
            {metrics.lowStockCount > 0 ? (
              <Badge variant="warning" size="sm">
                {metrics.lowStockCount} Low
              </Badge>
            ) : null}
            {metrics.outOfStockCount === 0 && metrics.lowStockCount === 0 && (
              <Badge variant="success" size="sm">
                Healthy Stock
              </Badge>
            )}
          </div>
        </Card>

        {/* Customers */}
        <Card variant="elevated">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Customers
            </span>
            <div className="p-2 bg-paper-dark rounded-lg text-ink-muted">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-ink">
            {metrics.totalCustomers}
          </div>
          <div className="text-xs text-ink-muted mt-1">
            Total Invoices: <span className="font-semibold text-ink">{metrics.totalInvoices}</span>
          </div>
        </Card>
      </div>

      {/* Main Grid: Recent Invoices & Stock Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Invoices Table (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>Latest customer billing transactions</CardDescription>
              </div>
              <Link href="/invoices">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {(!data?.recentInvoices || data.recentInvoices.length === 0) ? (
              <div className="py-8 text-center text-xs text-ink-muted">
                No invoices created yet.{' '}
                <Link href="/invoices/new" className="text-teal font-semibold underline">
                  Create your first invoice
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-warm-border text-ink-muted uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-borderLight">
                    {data.recentInvoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-paper transition-colors">
                        <td className="py-3 px-3 font-semibold text-ink">{inv.number}</td>
                        <td className="py-3 px-3 text-ink">
                          <div>{inv.customerId?.name || 'Walk-in'}</div>
                          <div className="text-[10px] text-ink-muted">{inv.customerId?.mobile || ''}</div>
                        </td>
                        <td className="py-3 px-3 text-ink-muted">{formatDate(inv.date)}</td>
                        <td className="py-3 px-3 font-medium text-ink">{formatCurrency(inv.total)}</td>
                        <td className="py-3 px-3">
                          {inv.remaining <= 0 ? (
                            <Badge variant="success" size="sm">Paid</Badge>
                          ) : inv.paid > 0 ? (
                            <Badge variant="warning" size="sm">Partial</Badge>
                          ) : (
                            <Badge variant="danger" size="sm">Unpaid</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link href={`/invoices/${inv._id}`}>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-teal">
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Attention Widget (1 col) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Stock Attention</CardTitle>
                <CardDescription>Rolls requiring replenishment</CardDescription>
              </div>
              <Link href="/products">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Catalog
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {(!data?.stockAttention || data.stockAttention.length === 0) ? (
              <div className="py-8 text-center text-xs text-ink-muted">
                All wallpaper products are adequately stocked.
              </div>
            ) : (
              <div className="space-y-3">
                {data.stockAttention.map((prod) => (
                  <div
                    key={prod._id}
                    className="p-3 rounded-lg border border-warm-border bg-paper flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-ink">
                        {prod.wp} — {prod.design}
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        Brand: {prod.brand} • Min: {prod.minStock} rolls
                      </div>
                    </div>
                    <div className="text-right">
                      {prod.stock <= 0 ? (
                        <Badge variant="danger" size="sm">Out of Stock</Badge>
                      ) : (
                        <Badge variant="warning" size="sm">{prod.stock} rolls left</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CSV Export & Quick Utility Toolbar */}
      <Card variant="sunken" className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-ink-muted">
            <Download className="w-4 h-4 text-teal" />
            <span className="font-semibold text-ink">Export Business Data (CSV):</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href="/api/export/customers" download className="px-2.5 py-1 bg-paper-light border border-warm-border rounded-md hover:bg-paper font-medium text-ink transition-colors">
              Customers.csv
            </a>
            <a href="/api/export/products" download className="px-2.5 py-1 bg-paper-light border border-warm-border rounded-md hover:bg-paper font-medium text-ink transition-colors">
              Inventory.csv
            </a>
            <a href="/api/export/invoices" download className="px-2.5 py-1 bg-paper-light border border-warm-border rounded-md hover:bg-paper font-medium text-ink transition-colors">
              Invoices.csv
            </a>
            <a href="/api/export/payments" download className="px-2.5 py-1 bg-paper-light border border-warm-border rounded-md hover:bg-paper font-medium text-ink transition-colors">
              Payments.csv
            </a>
            <a href="/api/export/stock-history" download className="px-2.5 py-1 bg-paper-light border border-warm-border rounded-md hover:bg-paper font-medium text-ink transition-colors">
              StockAudit.csv
            </a>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
