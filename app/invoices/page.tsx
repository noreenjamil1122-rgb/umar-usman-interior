'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  X,
  Phone,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { PasswordPromptModal } from '@/components/ui/PasswordPromptModal';
import {
  matchesInvoiceQuery,
  scoreInvoiceMatch,
  SearchableInvoice,
} from '@/lib/searchUtils';

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
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // 'paid' | 'partial' | 'unpaid'
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');
  const [supplierUnlocked, setSupplierUnlocked] = useState(false);
  const [isSupplierAuthOpen, setIsSupplierAuthOpen] = useState(false);
  const [hasSupplierPassword, setHasSupplierPassword] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'worker'>('admin');

  // Delete invoice with password
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  const searchSeqRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

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

    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setHasSupplierPassword(Boolean(d.data.hasSupplierPassword));
        }
      })
      .catch(() => {});
  }, []);

  const fetchInvoices = useCallback(
    async (tab: 'customer' | 'supplier', status: string, queryText: string, isInitial = false) => {
      // Abort previous in-flight search
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const currentSeq = ++searchSeqRef.current;

      if (isInitial) {
        setLoading(true);
      } else {
        setIsSearching(true);
      }

      try {
        const params = new URLSearchParams();
        if (queryText.trim()) params.set('q', queryText.trim());
        if (status) params.set('status', status);
        params.set('partyType', tab);
        params.set('limit', queryText.trim() ? '100' : '50');

        const res = await fetch(`/api/invoices?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = await res.json();

        // Ignore if a newer search request has already been made
        if (currentSeq !== searchSeqRef.current) return;

        if (json.success) {
          setInvoices(json.data);
        } else {
          toast.error('Failed to load invoices');
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
        if (currentSeq === searchSeqRef.current) {
          toast.error('Network error loading invoices');
        }
      } finally {
        if (currentSeq === searchSeqRef.current) {
          setLoading(false);
          setIsSearching(false);
        }
      }
    },
    []
  );

  // Fetch when tab or status filter changes
  useEffect(() => {
    fetchInvoices(activeTab, statusFilter, search, true);
  }, [activeTab, statusFilter, fetchInvoices]);

  // Live debounced search effect (150ms)
  useEffect(() => {
    if (search.trim()) {
      setIsSearching(true);
    }
    const timer = setTimeout(() => {
      fetchInvoices(activeTab, statusFilter, search, false);
    }, 150);

    return () => clearTimeout(timer);
  }, [search, activeTab, statusFilter, fetchInvoices]);

  // Instant in-memory search calculation with exact-match prioritization
  const displayInvoices = useMemo(() => {
    const q = search.trim();
    if (!q) return invoices;

    // Filter in-memory loaded invoices
    const matched = invoices.filter((inv) =>
      matchesInvoiceQuery(inv as unknown as SearchableInvoice, q)
    );

    // If local matches exist, rank by match strength score
    if (matched.length > 0) {
      return matched.slice().sort((a, b) => {
        const scoreA = scoreInvoiceMatch(a as unknown as SearchableInvoice, q);
        const scoreB = scoreInvoiceMatch(b as unknown as SearchableInvoice, q);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      });
    }

    // While backend query is in flight, retain previous invoices until response arrives
    return isSearching ? invoices : [];
  }, [invoices, search, isSearching]);

  const handleTabChange = (tab: 'customer' | 'supplier') => {
    if (tab === 'supplier') {
      if (supplierUnlocked) {
        setActiveTab('supplier');
        return;
      }
      if (hasSupplierPassword === false) {
        toast.error('Pehle Settings mein password set karein');
        router.push('/settings');
        return;
      }
      setIsSupplierAuthOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleLockSupplier = () => {
    setSupplierUnlocked(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('supplier_unlocked');
    }
    setActiveTab('customer');
    toast.info('Supplier Invoices locked');
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
      fetchInvoices(activeTab, statusFilter, search, false);
    } catch {
      toast.error('Failed to delete invoice');
    }
  };

  // Status badge helper:
  // Payment Complete (fully paid) = Yellow
  // Processing (partial payment) = Green
  // Udhar (fully unpaid) = Red
  const renderStatusBadge = (inv: Invoice) => {
    if (inv.remaining <= 0) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
          Payment Complete
        </span>
      );
    }
    if (inv.paid > 0 && inv.remaining > 0) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
          Processing
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-900 border border-red-300">
        Udhar
      </span>
    );
  };

  return (
    <AppShell title="Invoices">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            Invoices &amp; Billing
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
            Track sales, print itemized receipts, and monitor Udhar balances
          </p>
        </div>

        <Link href="/invoices/new">
          <Button variant="teal" size="lg" leftIcon={<Plus className="w-5 h-5" />} className="shadow-warm">
            Create New Invoice
          </Button>
        </Link>
      </div>

      {/* Tabs: Customer vs Supplier */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-warm-border pb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleTabChange('customer')}
            className={`min-h-[42px] px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'customer'
                ? 'bg-teal text-white shadow-warm'
                : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Customer Invoices</span>
          </button>
          <button
            onClick={() => handleTabChange('supplier')}
            className={`min-h-[42px] px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'supplier'
                ? 'bg-brass-dark text-white shadow-warm'
                : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
            }`}
          >
            {supplierUnlocked ? (
              <Unlock className="w-4 h-4 text-emerald-600" />
            ) : (
              <Lock className="w-4 h-4 text-brass-dark" />
            )}
            <span>Supplier Invoices</span>
            {!supplierUnlocked && (
              <span className="text-[11px] px-2 py-0.5 bg-warm-border rounded-md text-ink-muted font-bold">Locked</span>
            )}
          </button>
        </div>

        {activeTab === 'supplier' && supplierUnlocked && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLockSupplier}
            className="h-9 px-3 text-xs text-status-danger border-status-danger/30 hover:bg-status-dangerLight flex items-center gap-1.5"
            title="Lock Supplier Invoices"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock</span>
          </Button>
        )}
      </div>

      {/* Filter and Search Card */}
      <Card className="mb-6 sm:mb-8 p-4 sm:p-5 shadow-warm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-ink-muted" />
            <input
              type="text"
              placeholder="Search by customer name, phone (0342...), invoice #, or WP#..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-paper border border-warm-border rounded-xl text-ink font-semibold placeholder:text-ink-muted/70 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-3 p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-paper-dark transition-colors"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter('')}
              className={`min-h-[40px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                statusFilter === ''
                  ? 'bg-ink text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('unpaid')}
              className={`min-h-[40px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                statusFilter === 'unpaid'
                  ? 'bg-red-600 text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              Udhar (Unpaid)
            </button>
            <button
              onClick={() => setStatusFilter('partial')}
              className={`min-h-[40px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                statusFilter === 'partial'
                  ? 'bg-emerald-600 text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              Processing (Partial)
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`min-h-[40px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                statusFilter === 'paid'
                  ? 'bg-amber-500 text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              Payment Complete (Paid)
            </button>
          </div>
        </div>

        {/* Live Search Active Feedback Indicator */}
        {search.trim() && (
          <div className="mt-3 pt-3 border-t border-warm-borderLight flex items-center justify-between text-xs text-ink-muted flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                Searching for: <strong className="text-ink">&ldquo;{search.trim()}&rdquo;</strong>
              </span>
              {isSearching && (
                <span className="inline-flex items-center text-teal font-semibold gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Updating...
                </span>
              )}
            </div>
            <span>
              Found <strong className="text-ink">{displayInvoices.length}</strong> invoice{displayInvoices.length === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </Card>

      {/* Invoices List Display */}
      <Card className="shadow-warm">
        <CardContent className="p-0">
          {loading || (isSearching && displayInvoices.length === 0) ? (
            <div className="py-20 text-center text-sm text-ink-muted flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-teal mr-2" />
              {isSearching ? 'Searching invoices...' : `Loading ${activeTab === 'supplier' ? 'supplier' : 'customer'} invoices...`}
            </div>
          ) : displayInvoices.length === 0 ? (
            <div className="py-20 text-center text-ink-muted space-y-3">
              <FileText className="w-12 h-12 mx-auto text-ink-muted/40" />
              <div className="text-base font-bold text-ink">
                {search.trim()
                  ? `No invoices found for "${search.trim()}"`
                  : activeTab === 'supplier'
                  ? 'No supplier invoices yet.'
                  : 'No invoices found'}
              </div>
              <p className="text-xs sm:text-sm max-w-sm mx-auto text-ink-muted">
                {search.trim()
                  ? 'Try searching with a different customer name, phone number (e.g. 0342...), invoice number, or wallpaper WP#.'
                  : activeTab === 'supplier'
                  ? 'No vendor invoices have been recorded yet.'
                  : 'No billing records match your query. Click \u201cCreate New Invoice\u201d to issue a bill.'}
              </p>
              {search.trim() && (
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                    Clear Search Query
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View (visible on md screens and up) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-bold text-xs">
                    <tr>
                      <th className="py-3.5 px-4">Invoice #</th>
                      <th className="py-3.5 px-4">{activeTab === 'supplier' ? 'Supplier' : 'Customer'}</th>
                      <th className="py-3.5 px-4">Wallpapers / Items</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4 text-right">Total Amount</th>
                      <th className="py-3.5 px-4 text-right">Paid</th>
                      <th className="py-3.5 px-4 text-right">Remaining</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-borderLight">
                    {displayInvoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-paper transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-teal">
                          <Link href={`/invoices/${inv._id}`} className="hover:underline">
                            {inv.number}
                          </Link>
                        </td>
                        <td className="py-4 px-4 text-ink font-semibold">
                          <div>{inv.customerId?.name || 'Walk-in'}</div>
                          <div className="text-xs text-ink-muted font-normal mt-0.5">
                            {inv.customerId?.code ? `${inv.customerId?.code} • ` : ''}
                            {inv.customerId?.mobile || 'No phone'}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {inv.items && inv.items.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {inv.items.slice(0, 2).map((item, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-teal/10 text-teal text-xs font-semibold"
                                  title={`${item.wp}: ${item.qty} rolls @ Rs. ${item.rate}`}
                                >
                                  {item.wp} ({item.qty}r)
                                </span>
                              ))}
                              {inv.items.length > 2 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-paper-dark text-ink-muted text-[11px] font-medium">
                                  +{inv.items.length - 2} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-ink-muted italic">No items</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-ink-muted">{formatDate(inv.date)}</td>
                        <td className="py-4 px-4 text-right font-bold text-ink">{formatCurrency(inv.total)}</td>
                        <td className="py-4 px-4 text-right font-medium text-status-success">{formatCurrency(inv.paid)}</td>
                        <td className="py-4 px-4 text-right font-bold">
                          {inv.remaining > 0 ? (
                            <span className="text-status-danger">{formatCurrency(inv.remaining)}</span>
                          ) : inv.remaining < 0 ? (
                            <span className="text-status-success font-medium">Adv: {formatCurrency(Math.abs(inv.remaining))}</span>
                          ) : (
                            <span className="text-ink-muted font-normal">Rs. 0</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {renderStatusBadge(inv)}
                        </td>
                        <td className="py-4 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <Link href={`/invoices/${inv._id}`}>
                            <Button variant="ghost" size="sm" className="min-h-[34px] px-2.5 text-xs text-teal font-semibold" title="View / Print">
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              <span>View</span>
                            </Button>
                          </Link>
                          {userRole === 'admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="min-h-[34px] px-2.5 text-xs text-status-danger hover:bg-status-dangerLight"
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

              {/* Mobile Card View (visible on small screens for comfortable touch ergonomics) */}
              <div className="md:hidden divide-y divide-warm-borderLight">
                {displayInvoices.map((inv) => (
                  <div key={inv._id} className="p-4 sm:p-5 space-y-3 hover:bg-paper/50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/invoices/${inv._id}`}
                        className="font-mono font-bold text-teal text-base hover:underline"
                      >
                        {inv.number}
                      </Link>
                      <div>{renderStatusBadge(inv)}</div>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-ink">
                          {inv.customerId?.name || 'Walk-in Customer'}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-ink-muted mt-0.5">
                          {inv.customerId?.mobile && (
                            <a
                              href={`tel:${inv.customerId.mobile}`}
                              className="hover:text-teal flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3 text-ink-muted" />
                              <span>{inv.customerId.mobile}</span>
                            </a>
                          )}
                          {inv.customerId?.code && (
                            <span>• {inv.customerId.code}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs text-ink-muted font-medium">
                        {formatDate(inv.date)}
                      </div>
                    </div>

                    {/* Wallpaper Items List */}
                    {inv.items && inv.items.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <Layers className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                        {inv.items.map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-teal/10 text-teal text-xs font-semibold"
                          >
                            {item.wp} ({item.qty}r)
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Financial Summary */}
                    <div className="grid grid-cols-3 gap-2 bg-paper-light border border-warm-borderLight rounded-xl p-2.5 text-center">
                      <div>
                        <div className="text-[10px] text-ink-muted uppercase font-bold">Total</div>
                        <div className="text-xs font-bold text-ink">{formatCurrency(inv.total)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-ink-muted uppercase font-bold">Paid</div>
                        <div className="text-xs font-semibold text-status-success">{formatCurrency(inv.paid)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-ink-muted uppercase font-bold">Udhar</div>
                        <div className="text-xs font-bold text-status-danger">
                          {inv.remaining > 0 ? formatCurrency(inv.remaining) : 'Rs. 0'}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Link href={`/invoices/${inv._id}`} className="flex-1 sm:flex-initial">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto min-h-[40px] text-xs text-teal border-teal/30 hover:bg-teal/10"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          <span>View Invoice</span>
                        </Button>
                      </Link>
                      {userRole === 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-[40px] px-3 text-xs text-status-danger hover:bg-status-dangerLight"
                          onClick={() => setInvoiceToDelete(inv)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
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
