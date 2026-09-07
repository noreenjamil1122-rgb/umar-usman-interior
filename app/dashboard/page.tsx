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
  Layers,
  AlertTriangle,
  ArrowRight,
  Plus,
  RefreshCw,
  BellRing,
  CheckCircle2,
  Calendar,
  Eye,
  EyeOff,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { PasswordPromptModal } from '@/components/ui/PasswordPromptModal';

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
    salesThisDay?: number;
    paymentsThisDay?: number;
  };
  selectedDate?: string;
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
  recentPayments: Array<{
    _id: string;
    date: string;
    amount: number;
    method: string;
    reference?: string;
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

  // Date Filter (defaults to today)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Masking Protection for Daily Sales & Collections
  const [isMasked, setIsMasked] = useState(true);
  const [isHideAuthOpen, setIsHideAuthOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('hide_unlocked') === 'true') {
      setIsMasked(false);
    }
  }, []);

  const fetchDashboard = async (dateStr = selectedDate) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?date=${dateStr}`);
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
    fetchDashboard(selectedDate);
  }, [selectedDate]);

  const handleToggleMask = () => {
    if (isMasked) {
      setIsHideAuthOpen(true);
    } else {
      setIsMasked(true);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('hide_unlocked');
      }
      toast.info('Figures masked');
    }
  };

  const handleHideAuthorized = () => {
    setIsMasked(false);
    setIsHideAuthOpen(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('hide_unlocked', 'true');
    }
    toast.success('Figures unmasked');
  };

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
    salesThisDay: 0,
    paymentsThisDay: 0,
  };

  const showUdharBanner =
    !acked && (data?.debtCustomers?.length || 0) > 0 && metrics.totalOutstanding > 0;

  // Inverted status colors:
  // Paid = Yellow
  // Processing = Green
  // Udhar = Red
  const renderStatusBadge = (inv: { paid: number; remaining: number }) => {
    if (inv.remaining <= 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          Payment Complete
        </span>
      );
    }
    if (inv.paid > 0 && inv.remaining > 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          Processing
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
        Udhar
      </span>
    );
  };

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
            onClick={() => fetchDashboard(selectedDate)}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          <Link href="/invoices/new">
            <Button variant="teal" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              New Invoice
            </Button>
          </Link>

          <Link href="/books">
            <Button variant="brass" size="sm" leftIcon={<BookOpen className="w-4 h-4" />}>
              Wallpaper Books
            </Button>
          </Link>
        </div>
      </div>

      {/* Date Filter Toolbar */}
      <Card className="mb-6 p-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal" />
            <span className="text-xs font-bold text-ink uppercase tracking-wider">
              Viewing Date:
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 text-xs bg-paper border border-warm-border rounded-lg text-ink font-semibold focus:outline-none focus:border-teal"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setSelectedDate(today);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedDate === new Date().toISOString().split('T')[0]
                  ? 'bg-teal text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                const yest = new Date();
                yest.setDate(yest.getDate() - 1);
                setSelectedDate(yest.toISOString().split('T')[0]);
              }}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-paper text-ink-muted hover:text-ink border border-warm-border"
            >
              Yesterday
            </button>
          </div>
        </div>
      </Card>

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

      {/* Primary KPI Metric Cards (With Masked Daily Figures) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-8">
        {/* Sales This Day (Masked by default) */}
        <Card variant="elevated" className="border-l-4 border-l-teal">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Sales This Day
            </span>
            <button
              onClick={handleToggleMask}
              className="p-1 rounded text-ink-muted hover:text-teal transition-colors"
              title={isMasked ? 'Reveal sales figure' : 'Mask figure'}
            >
              {isMasked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-xl md:text-2xl font-bold text-ink">
            {isMasked ? (
              <span className="font-mono tracking-widest text-ink-muted select-none">••••••••</span>
            ) : (
              formatCurrency(metrics.salesThisDay || 0)
            )}
          </div>
          <div className="text-[11px] text-ink-muted mt-1">
            Total Revenue: {isMasked ? '••••••' : formatCurrency(metrics.totalRevenue)}
          </div>
        </Card>

        {/* Payments Received This Day (Masked by default) */}
        <Card variant="elevated" className="border-l-4 border-l-status-success">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Payments Received
            </span>
            <button
              onClick={handleToggleMask}
              className="p-1 rounded text-ink-muted hover:text-status-success transition-colors"
              title={isMasked ? 'Reveal payment collections' : 'Mask figure'}
            >
              {isMasked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-xl md:text-2xl font-bold text-status-success">
            {isMasked ? (
              <span className="font-mono tracking-widest text-ink-muted select-none">••••••••</span>
            ) : (
              formatCurrency(metrics.paymentsThisDay || 0)
            )}
          </div>
          <div className="text-[11px] text-ink-muted mt-1">
            Total Collected: {isMasked ? '••••••' : formatCurrency(metrics.totalCollected)}
          </div>
        </Card>

        {/* Total Outstanding (Udhar) */}
        <Card variant="elevated" className="border-l-4 border-l-brass">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Total Outstanding
            </span>
            <div className="p-1.5 bg-brass-subtle rounded-lg text-brass-dark">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-status-danger">
            {formatCurrency(metrics.totalOutstanding)}
          </div>
          <div className="text-[11px] text-ink-muted mt-1">
            Active debt across clients
          </div>
        </Card>

        {/* Wallpaper Stock */}
        <Card variant="elevated">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Wallpaper Stock
            </span>
            <div className="p-1.5 bg-paper-dark rounded-lg text-ink-muted">
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
      </div>

      {/* Main Grid: Recent Invoices & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Invoices Table */}
        <Card>
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
          <CardContent className="p-0">
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
                      <th className="py-2.5 px-3">Party</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-borderLight">
                    {data.recentInvoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-paper transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-teal">
                          <Link href={`/invoices/${inv._id}`} className="hover:underline">
                            {inv.number}
                          </Link>
                        </td>
                        <td className="py-3 px-3 text-ink">
                          <div className="font-semibold">{inv.customerId?.name || 'Walk-in'}</div>
                          <div className="text-[10px] text-ink-muted">{formatDate(inv.date)}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-ink">
                          {formatCurrency(inv.total)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {renderStatusBadge(inv)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Latest collections recorded</CardDescription>
              </div>
              <Link href="/payments">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {(!data?.recentPayments || data.recentPayments.length === 0) ? (
              <div className="py-8 text-center text-xs text-ink-muted">
                No payment collections recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-warm-border text-ink-muted uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Party</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-borderLight">
                    {data.recentPayments.map((p) => (
                      <tr key={p._id} className="hover:bg-paper transition-colors">
                        <td className="py-3 px-3 text-ink-muted">{formatDate(p.date)}</td>
                        <td className="py-3 px-3 text-ink font-semibold">
                          {p.customerId?.name || 'Customer'}
                        </td>
                        <td className="py-3 px-3 text-ink font-medium">{p.method}</td>
                        <td className="py-3 px-3 text-right font-bold text-status-success">
                          {formatCurrency(p.amount)}
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

      {/* Stock Attention Widget */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Stock Attention Alert</CardTitle>
              <CardDescription>Rolls requiring replenishment or reorder</CardDescription>
            </div>
            <Link href="/stock">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Stock Manager
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {(!data?.stockAttention || data.stockAttention.length === 0) ? (
            <div className="py-6 text-center text-xs text-ink-muted">
              All wallpaper products are adequately stocked.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                      Brand: {prod.brand || '-'}
                    </div>
                  </div>
                  <div className="text-right">
                    {prod.stock <= 0 ? (
                      <Badge variant="danger" size="sm">0 Out</Badge>
                    ) : (
                      <Badge variant="warning" size="sm">{prod.stock} rolls</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hide Password Authorization Modal */}
      <PasswordPromptModal
        isOpen={isHideAuthOpen}
        onClose={() => setIsHideAuthOpen(false)}
        title="Authorize Figure Display"
        actionDescription="Enter the Hide password to reveal daily sales figures and payment collection metrics."
        protectionType="hide"
        onAuthorized={handleHideAuthorized}
      />
    </AppShell>
  );
}
