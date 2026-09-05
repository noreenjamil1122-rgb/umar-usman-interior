'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Eye,
  RefreshCw,
  Lock,
  Unlock,
} from 'lucide-react';
import { toast } from 'sonner';
import { PasswordPromptModal } from '@/components/ui/PasswordPromptModal';

interface Invoice {
  _id: string;
  number: string;
  date: string;
  customerId?: { _id: string; name: string; mobile: string; code: string; type?: string };
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
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');
  const [supplierUnlocked, setSupplierUnlocked] = useState(false);
  const [isSupplierAuthOpen, setIsSupplierAuthOpen] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'worker'>('admin');

  // Delete invoice with password
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  useEffect(() => {
    // Check if supplier was previously unlocked in this session
    if (typeof window !== 'undefined' && sessionStorage.getItem('supplier_unlocked') === 'true') {
      setSupplierUnlocked(true);
    }

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
      params.set('partyType', activeTab);

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
  }, [search, statusFilter, activeTab]);

  const handleTabChange = (tab: 'customer' | 'supplier') => {
    if (tab === 'supplier' && !supplierUnlocked) {
      setIsSupplierAuthOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleSupplierAuthorized = () => {
    setSupplierUnlocked(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('supplier_unlocked', 'true');
    }
    setIsSupplierAuthOpen(false);
    setActiveTab('supplier');
    toast.success('Supplier Invoices Unlocked');
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    try {
      const res = await fetch(`/api/invoices/${invoiceToDelete._id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Cannot delete invoice', { description: json.error });
        return;
      }
      toast.success('Invoice deleted and stock restored');
      setInvoiceToDelete(null);
      fetchInvoices();
    } catch {
      toast.error('Failed to delete invoice');
    }
  };

  // Inverted color scheme helper:
  // Payment Complete (fully paid) = Yellow
  // Processing (partial payment) = Green
  // Udhar (fully unpaid) = Red
  const renderStatusBadge = (inv: Invoice) => {
    if (inv.remaining <= 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          Payment Complete
        </span>
      );
    }
    if (inv.paid > 0 && inv.remaining > 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          Processing
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
        Udhar
      </span>
    );
  };

  return (
    <AppShell title="Invoices">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
            Invoices &amp; Billing
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

      {/* Tabs: Customer vs Supplier */}
      <div className="flex items-center gap-2 mb-4 border-b border-warm-border pb-2">
        <button
          onClick={() => handleTabChange('customer')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'customer'
              ? 'bg-teal text-white shadow-warm'
              : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
          }`}
        >
          Customer Invoices
        </button>
        <button
          onClick={() => handleTabChange('supplier')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'supplier'
              ? 'bg-brass-dark text-white shadow-warm'
              : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
          }`}
        >
          {supplierUnlocked ? (
            <Unlock className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-brass-dark" />
          )}
          <span>Supplier Invoices</span>
          {!supplierUnlocked && (
            <span className="text-[10px] px-1 py-0.2 bg-warm-border rounded text-ink-muted">Locked</span>
          )}
        </button>
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === ''
                  ? 'bg-ink text-white'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('unpaid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'unpaid'
                  ? 'bg-red-600 text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              Udhar (Unpaid)
            </button>
            <button
              onClick={() => setStatusFilter('partial')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'partial'
                  ? 'bg-emerald-600 text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              Processing (Partial)
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'paid'
                  ? 'bg-amber-500 text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              Payment Complete (Paid)
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
              Loading {activeTab === 'supplier' ? 'supplier' : 'customer'} invoices...
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
                    <th className="py-3 px-4">Party</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-right">Paid (Advance)</th>
                    <th className="py-3 px-4 text-right">Remaining (Udhar)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-borderLight">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-paper transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-teal">
                        <Link href={`/invoices/${inv._id}`} className="hover:underline">
                          {inv.number}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-ink font-semibold">
                        <div>{inv.customerId?.name || 'Walk-in'}</div>
                        <div className="text-[10px] text-ink-muted font-normal">
                          {inv.customerId?.code} • {inv.customerId?.mobile}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-ink-muted">{formatDate(inv.date)}</td>
                      <td className="py-3 px-4 text-right font-bold text-ink">{formatCurrency(inv.total)}</td>
                      <td className="py-3 px-4 text-right font-medium text-status-success">{formatCurrency(inv.paid)}</td>
                      <td className="py-3 px-4 text-right font-bold">
                        {inv.remaining > 0 ? (
                          <span className="text-status-danger">{formatCurrency(inv.remaining)}</span>
                        ) : inv.remaining < 0 ? (
                          <span className="text-status-success font-medium">Adv: {formatCurrency(Math.abs(inv.remaining))}</span>
                        ) : (
                          <span className="text-ink-muted font-normal">Rs. 0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {renderStatusBadge(inv)}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <Link href={`/invoices/${inv._id}`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-teal" title="View / Print">
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            <span>View</span>
                          </Button>
                        </Link>
                        {userRole === 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-status-danger hover:bg-status-dangerLight"
                            onClick={() => setInvoiceToDelete(inv)}
                            title="Delete Invoice and Restore Stock"
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

      {/* Supplier Unlock Password Modal */}
      <PasswordPromptModal
        isOpen={isSupplierAuthOpen}
        onClose={() => setIsSupplierAuthOpen(false)}
        title="Unlock Supplier Invoices"
        actionDescription="Enter the Supplier Lock password to view vendor invoices and billing history for this session."
        protectionType="supplier"
        onAuthorized={handleSupplierAuthorized}
      />

      {/* Delete Password Modal */}
      <PasswordPromptModal
        isOpen={Boolean(invoiceToDelete)}
        onClose={() => setInvoiceToDelete(null)}
        title={`Authorize Deletion: Invoice ${invoiceToDelete?.number}`}
        actionDescription={`Permanently delete invoice ${invoiceToDelete?.number}. All wallpaper rolls sold will be automatically restored to stock.`}
        protectionType="delete"
        onAuthorized={confirmDeleteInvoice}
      />
    </AppShell>
  );
}
