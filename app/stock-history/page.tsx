'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/utils';
import { History, Search, RefreshCw, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { toast } from 'sonner';

interface StockHistoryEntry {
  _id: string;
  date: string;
  wp: string;
  type: string;
  qty: number;
  prevStock: number;
  newStock: number;
  reference?: string;
  productId?: { design: string; brand: string; category: string };
}

export default function StockHistoryPage() {
  const [history, setHistory] = useState<StockHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [wpSearch, setWpSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (wpSearch.trim()) params.set('wp', wpSearch.trim());
      if (typeFilter) params.set('type', typeFilter);

      const res = await fetch(`/api/stock-history?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setHistory(json.data);
      } else {
        toast.error('Could not load stock audit logs');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [wpSearch, typeFilter]);

  return (
    <AppShell title="Stock Audit Trail">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
            Inventory Stock Audit Log
          </h1>
          <p className="text-xs md:text-sm text-ink-muted">
            Immutable audit record of every wallpaper stock addition, sale, return, and adjustment
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="mb-6 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-ink-muted" />
            <input
              type="text"
              placeholder="Filter by WP number (e.g. WP-101)..."
              value={wpSearch}
              onChange={(e) => setWpSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs md:text-sm bg-paper border border-warm-border rounded-lg text-ink focus:outline-none focus:border-teal"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs md:text-sm bg-paper border border-warm-border rounded-lg text-ink focus:outline-none focus:border-teal"
            >
              <option value="">All Movement Types</option>
              <option value="Sold">Sold (Invoice)</option>
              <option value="Restock">Restock</option>
              <option value="Opening Stock">Opening Stock</option>
              <option value="Adjustment">Adjustment</option>
              <option value="Damage">Damage</option>
              <option value="Return">Return</option>
              <option value="Correction">Correction</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Audit History Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-xs text-ink-muted flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-teal mr-2" />
              Loading stock audit history...
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center text-ink-muted space-y-3">
              <History className="w-12 h-12 mx-auto text-ink-muted/40" />
              <div className="text-base font-semibold text-ink">No audit entries found</div>
              <p className="text-xs max-w-sm mx-auto">
                Stock changes from invoices, adjustments, and shipments will be recorded here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4">WP# &amp; Design</th>
                    <th className="py-3 px-4">Change Type</th>
                    <th className="py-3 px-4 text-center">Change Qty</th>
                    <th className="py-3 px-4 text-center">Prev Stock</th>
                    <th className="py-3 px-4 text-center">New Stock</th>
                    <th className="py-3 px-4">Reference Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-borderLight">
                  {history.map((h) => {
                    const isPositive = h.qty > 0;
                    return (
                      <tr key={h._id} className="hover:bg-paper transition-colors">
                        <td className="py-3 px-4 text-ink-muted">{formatDateTime(h.date)}</td>
                        <td className="py-3 px-4 font-bold text-ink">
                          <span className="font-mono text-teal mr-1.5">{h.wp}</span>
                          <span>{h.productId?.design || ''}</span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              h.type === 'Sold'
                                ? 'danger'
                                : h.type === 'Restock' || h.type === 'Opening Stock'
                                ? 'success'
                                : h.type === 'Return'
                                ? 'teal'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {h.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          <span
                            className={`inline-flex items-center gap-0.5 ${
                              isPositive ? 'text-status-success' : 'text-status-danger'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            )}
                            {isPositive ? `+${h.qty}` : h.qty} Rolls
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-ink-muted">{h.prevStock}</td>
                        <td className="py-3 px-4 text-center font-bold text-ink">{h.newStock}</td>
                        <td className="py-3 px-4 text-ink-muted">{h.reference || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
