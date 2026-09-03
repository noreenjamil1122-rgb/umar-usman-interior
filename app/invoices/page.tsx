'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  FileText,
  Search,
  Plus,
  Printer,
  Trash2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface Invoice {
  _id: string;
  number: string;
  date: string;
  customerId?: { _id: string; name: string; mobile: string; code: string };
  items: Array<{ wp: string; design: string; qty: number; rate: number; amount: number }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  remaining: number;
  method: string;
  jobStatus?: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // 'paid' | 'partial' | 'unpaid'
  const [userRole, setUserRole] = useState<'admin' | 'worker'>('admin');

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user) {
          setUserRole(d.user.role || 'admin');
        }
      })
      .catch(() => {});
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/invoices?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setInvoices(json.data);
      } else {
        toast.error('Failed to load invoices');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter]);

  const handleDelete = async (inv: Invoice) => {
    if (
      !confirm(
        `Are you sure you want to delete Invoice ${inv.number}? This will automatically restore sold wallpaper rolls back into inventory.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/invoices/${inv._id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Cannot delete invoice', { description: json.error });
        return;
      }
      toast.success('Invoice deleted and stock restored');
      fetchInvoices();
    } catch {
      toast.error('Failed to delete invoice');
    }
  };

  return (
    <AppShell title="Invoices">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
            Customer Invoices &amp; Billing
          </h1>
          <p className="text-xs md:text-sm text-ink-muted">
            Track sales, print itemized receipts, and monitor Udhar balances
          </p>
        </div>

        <Link href="/invoices/new">
          <Button variant="teal" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            Create New Invoice
          </Button>
        </Link>
      </div>

      {/* Filter and Search Card */}
      <Card className="mb-6 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-ink-muted" />
            <input
              type="text"
              placeholder="Search by invoice number (INV-YYYY-XXXXX)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs md:text-sm bg-paper border border-warm-border rounded-lg text-ink focus:outline-none focus:border-teal"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === ''
                  ? 'bg-teal text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              All Invoices
            </button>
            <button
              onClick={() => setStatusFilter('unpaid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'unpaid'
                  ? 'bg-status-danger text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              Unpaid
            </button>
            <button
              onClick={() => setStatusFilter('partial')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'partial'
                  ? 'bg-brass text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              Partial
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'paid'
                  ? 'bg-status-success text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              Fully Paid
            </button>
          </div>
        </div>
      </Card>

      {/* Invoices List Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-xs text-ink-muted flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-teal mr-2" />
              Loading invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-16 text-center text-ink-muted space-y-3">
              <FileText className="w-12 h-12 mx-auto text-ink-muted/40" />
              <div className="text-base font-semibold text-ink">No invoices found</div>
              <p className="text-xs max-w-sm mx-auto">
                No billing records match your query. Click &ldquo;Create New Invoice&rdquo; to issue a bill.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Job / Fitting</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Paid (Advance)</th>
                    <th className="py-3 px-4">Remaining (Udhar)</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-borderLight">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-paper transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-teal">{inv.number}</td>
                      <td className="py-3 px-4 text-ink font-semibold">
                        <div>{inv.customerId?.name || 'Walk-in'}</div>
                        <div className="text-[10px] text-ink-muted font-normal">
                          {inv.customerId?.code} • {inv.customerId?.mobile}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-ink-muted">{formatDate(inv.date)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                          inv.jobStatus === 'Fully Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.jobStatus === 'In Progress'
                            ? 'bg-blue-100 text-blue-800'
                            : inv.jobStatus === 'Completed'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-teal-subtle text-teal'
                        }`}>
                          {inv.jobStatus || (inv.remaining === 0 ? 'Fully Paid' : 'Advance Received')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-ink">{formatCurrency(inv.total)}</td>
                      <td className="py-3 px-4 font-medium text-status-success">{formatCurrency(inv.paid)}</td>
                      <td className="py-3 px-4 font-bold text-status-warning">
                        {inv.remaining > 0 ? formatCurrency(inv.remaining) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {inv.remaining <= 0 ? (
                          <Badge variant="success" size="sm">Paid</Badge>
                        ) : inv.paid > 0 ? (
                          <Badge variant="warning" size="sm">Partial</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">Unpaid</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <Link href={`/invoices/${inv._id}`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-teal" title="View Details">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Link href={`/invoices/${inv._id}/print`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-brass-dark" title="Print Invoice">
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        {userRole === 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-status-danger hover:bg-status-dangerLight"
                            onClick={() => handleDelete(inv)}
                            title="Delete Invoice and Restore Stock (Admin Only)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
