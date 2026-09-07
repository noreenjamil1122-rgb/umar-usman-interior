'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Printer,
  FileText,
  CreditCard,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { toast } from 'sonner';

interface CustomerOption {
  _id: string;
  name: string;
  code: string;
  mobile: string;
  type?: string;
  city?: string;
  address?: string;
  outstandingBalance?: number;
}

interface LedgerEntry {
  _id: string;
  date: string;
  type: 'invoice' | 'payment';
  numberOrRef: string;
  debit: number; // Invoice amount added to debt
  credit: number; // Payment made reducing debt
  balanceAfter: number;
  note?: string;
}

export default function LedgerPage() {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Ledger records
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [stats, setStats] = useState({
    totalInvoiced: 0,
    totalPaid: 0,
    currentBalance: 0,
  });

  useEffect(() => {
    fetch('/api/customers')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setCustomers(json.data);
          if (json.data.length > 0) {
            setSelectedCustomerId(json.data[0]._id);
          }
        }
      })
      .catch(() => toast.error('Failed to load parties list'))
      .finally(() => setLoadingCustomers(false));
  }, []);

  const loadLedger = async (cid: string) => {
    if (!cid) return;
    setLedgerLoading(true);
    try {
      const res = await fetch(`/api/customers/${cid}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Failed to load party statement');
        return;
      }

      setSelectedCustomer(json.data.customer);

      const invoices = json.data.invoices || [];
      const payments = json.data.payments || [];

      // Merge and sort chronologically
      type RawEvent = {
        _id: string;
        date: string;
        type: 'invoice' | 'payment';
        numberOrRef: string;
        debit: number;
        credit: number;
        note?: string;
      };

      const events: RawEvent[] = [];

      invoices.forEach((inv: { _id: string; date: string; number: string; total: number; notes?: string }) => {
        events.push({
          _id: inv._id,
          date: inv.date,
          type: 'invoice',
          numberOrRef: inv.number,
          debit: inv.total || 0,
          credit: 0,
          note: inv.notes,
        });
      });

      payments.forEach((p: { _id: string; date: string; amount: number; method: string; reference?: string }) => {
        events.push({
          _id: p._id,
          date: p.date,
          type: 'payment',
          numberOrRef: p.reference || `${p.method} Payment`,
          debit: 0,
          credit: p.amount || 0,
          note: p.reference,
        });
      });

      // Sort ascending by date for running balance
      events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let running = 0;
      let totalInv = 0;
      let totalP = 0;

      const calculated: LedgerEntry[] = events.map((e) => {
        running += e.debit - e.credit;
        totalInv += e.debit;
        totalP += e.credit;
        return {
          ...e,
          balanceAfter: running,
        };
      });

      setLedgerEntries(calculated);
      setStats({
        totalInvoiced: totalInv,
        totalPaid: totalP,
        currentBalance: running,
      });
    } catch {
      toast.error('Error fetching ledger details');
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      loadLedger(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const printStatementInNewTab = () => {
    if (!selectedCustomer) return;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      toast.error('Popup blocked by browser. Please allow popups.');
      return;
    }

    const rowsHtml = ledgerEntries
      .map(
        (entry, idx) => `
        <tr style="border-bottom: 1px solid #e5e7eb; font-size: 11px;">
          <td style="padding: 8px 10px; text-align: center; color: #6b7280;">${idx + 1}</td>
          <td style="padding: 8px 10px;">${formatDate(entry.date)}</td>
          <td style="padding: 8px 10px; font-weight: 600; color: ${
            entry.type === 'invoice' ? '#0d9488' : '#059669'
          }">
            ${entry.type === 'invoice' ? 'Invoice Bill' : 'Payment Received'}
          </td>
          <td style="padding: 8px 10px; font-family: monospace;">${entry.numberOrRef}</td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 600;">
            ${entry.debit > 0 ? 'PKR ' + entry.debit.toLocaleString() : '-'}
          </td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #059669;">
            ${entry.credit > 0 ? 'PKR ' + entry.credit.toLocaleString() : '-'}
          </td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: ${
            entry.balanceAfter > 0 ? '#b91c1c' : entry.balanceAfter < 0 ? '#047857' : '#374151'
          };">
            PKR ${entry.balanceAfter.toLocaleString()}
          </td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Statement — ${selectedCustomer.name} (${selectedCustomer.code})</title>
          <meta charset="utf-8">
          <style>
            @media print {
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; }
              .no-print { display: none; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #111827; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #4b5563; }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 20px;">
            <div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">UMAR USMAN INTERIOR</h1>
              <div style="font-size: 11px; color: #4b5563; margin-top: 4px;">Wallpaper Trading &amp; Installation Services • Lahore, Pakistan</div>
              <div style="font-size: 11px; color: #4b5563;">Contact: 0300-4131532 / 0307-4333227</div>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0d9488;">Customer Statement</h2>
              <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Statement Date: ${new Date().toLocaleDateString(
                'en-US',
                { dateStyle: 'medium' }
              )}</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f9fafb; padding: 12px 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
            <div>
              <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #6b7280;">Account Holder:</div>
              <div style="font-size: 14px; font-weight: 800; color: #111827; margin-top: 2px;">${
                selectedCustomer.name
              } (${selectedCustomer.code})</div>
              <div style="font-size: 11px; color: #4b5563; margin-top: 2px;">Phone: ${
                selectedCustomer.mobile
              }</div>
              <div style="font-size: 11px; color: #4b5563;">City/Address: ${
                selectedCustomer.address || selectedCustomer.city || 'Lahore'
              }</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #6b7280;">Net Outstanding (Udhar):</div>
              <div style="font-size: 20px; font-weight: 900; color: ${
                stats.currentBalance > 0 ? '#b91c1c' : '#047857'
              }; margin-top: 2px;">
                PKR ${stats.currentBalance.toLocaleString()}
              </div>
              <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
                Total Billed: PKR ${stats.totalInvoiced.toLocaleString()} | Paid: PKR ${stats.totalPaid.toLocaleString()}
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: center; width: 40px;">#</th>
                <th>Date</th>
                <th>Type</th>
                <th>Reference / Invoice</th>
                <th style="text-align: right;">Debit (Billed)</th>
                <th style="text-align: right;">Credit (Paid)</th>
                <th style="text-align: right;">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="7" style="text-align:center; padding: 20px;">No entries recorded</td></tr>'}
            </tbody>
          </table>

          <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #4b5563; border-top: 1px solid #e5e7eb; padding-top: 16px;">
            <div>Generated from Umar Usman Interior Management System</div>
            <div>Authorized Signature: _________________________</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <AppShell title="Party Ledger">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
            Customer &amp; Supplier Ledger
          </h1>
          <p className="text-xs md:text-sm text-ink-muted">
            Track running debit, credit, invoice charges, and payment histories
          </p>
        </div>

        {selectedCustomer && (
          <Button
            variant="brass"
            size="sm"
            onClick={printStatementInNewTab}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print Statement
          </Button>
        )}
      </div>

      {/* Account Selector Card */}
      <Card className="mb-6 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-xl">
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
              Select Account
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-paper border border-warm-border rounded-lg text-ink font-semibold focus:outline-none focus:border-teal"
              disabled={loadingCustomers}
            >
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.code} • {c.mobile}) {c.type === 'supplier' ? '— Supplier' : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedCustomer && (
            <div className="flex items-center gap-3 self-end md:self-center">
              <Link href={`/customers/${selectedCustomer._id}`}>
                <Button variant="outline" size="sm">
                  View Full Profile
                </Button>
              </Link>
            </div>
          )}
        </div>
      </Card>

      {/* Financial Summary Cards */}
      {selectedCustomer && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-paper border border-warm-border">
            <div className="text-[11px] font-semibold uppercase text-ink-muted flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-teal" />
              <span>Total Billed (Debit)</span>
            </div>
            <div className="text-xl font-bold text-ink mt-1">
              {formatCurrency(stats.totalInvoiced)}
            </div>
          </Card>

          <Card className="p-4 bg-paper border border-warm-border">
            <div className="text-[11px] font-semibold uppercase text-ink-muted flex items-center gap-1.5">
              <ArrowDownLeft className="w-3.5 h-3.5 text-status-success" />
              <span>Total Paid (Credit)</span>
            </div>
            <div className="text-xl font-bold text-status-success mt-1">
              {formatCurrency(stats.totalPaid)}
            </div>
          </Card>

          <Card
            className={`p-4 border ${
              stats.currentBalance > 0
                ? 'bg-red-50/50 border-red-200'
                : stats.currentBalance < 0
                ? 'bg-green-50/50 border-green-200'
                : 'bg-paper border-warm-border'
            }`}
          >
            <div className="text-[11px] font-semibold uppercase text-ink-muted">
              {stats.currentBalance > 0
                ? 'Outstanding Balance (Udhar)'
                : stats.currentBalance < 0
                ? 'Advance Credit'
                : 'Account Status'}
            </div>
            <div
              className={`text-xl font-black mt-1 ${
                stats.currentBalance > 0
                  ? 'text-status-danger'
                  : stats.currentBalance < 0
                  ? 'text-status-success'
                  : 'text-ink'
              }`}
            >
              {stats.currentBalance === 0
                ? 'Cleared (Rs. 0)'
                : formatCurrency(Math.abs(stats.currentBalance))}
            </div>
          </Card>
        </div>
      )}

      {/* Chronological Statement Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Account Statement</CardTitle>
              <CardDescription>Chronological debit, credit, and running balance</CardDescription>
            </div>
            <div className="text-xs font-mono font-bold text-ink-muted">
              {ledgerEntries.length} Transactions
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {ledgerLoading ? (
            <div className="py-16 text-center text-xs text-ink-muted flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-teal mr-2" />
              Loading statement entries...
            </div>
          ) : ledgerEntries.length === 0 ? (
            <div className="py-16 text-center text-ink-muted space-y-2">
              <FileText className="w-10 h-10 mx-auto text-ink-muted/40" />
              <div className="text-sm font-semibold text-ink">No transactions found</div>
              <p className="text-xs">No invoices or payments recorded for this party yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Reference / Invoice #</th>
                    <th className="py-3 px-4 text-right">Debit (Billed)</th>
                    <th className="py-3 px-4 text-right">Credit (Paid)</th>
                    <th className="py-3 px-4 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-borderLight">
                  {ledgerEntries.map((entry) => (
                    <tr key={entry._id} className="hover:bg-paper transition-colors">
                      <td className="py-3 px-4 text-ink-muted whitespace-nowrap">
                        {formatDate(entry.date)}
                      </td>
                      <td className="py-3 px-4">
                        {entry.type === 'invoice' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-subtle text-teal">
                            <FileText className="w-3 h-3" />
                            <span>Invoice</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-status-success border border-green-200">
                            <CreditCard className="w-3 h-3" />
                            <span>Payment</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-ink">
                        {entry.type === 'invoice' ? (
                          <Link href={`/invoices/${entry._id}`} className="text-teal hover:underline">
                            {entry.numberOrRef}
                          </Link>
                        ) : (
                          entry.numberOrRef
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-ink">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-status-success">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        {entry.balanceAfter > 0 ? (
                          <span className="text-status-danger">{formatCurrency(entry.balanceAfter)}</span>
                        ) : entry.balanceAfter < 0 ? (
                          <span className="text-status-success">
                            Adv: {formatCurrency(Math.abs(entry.balanceAfter))}
                          </span>
                        ) : (
                          <span className="text-ink-muted font-medium">Rs. 0</span>
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
