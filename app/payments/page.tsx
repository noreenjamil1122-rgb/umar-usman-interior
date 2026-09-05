'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CreditCard,
  Plus,
  Search,
  User,
  FileText,
  Calendar,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

interface Payment {
  _id: string;
  date: string;
  amount: number;
  method: string;
  reference?: string;
  customerId?: { _id: string; name: string; code: string; mobile: string };
  invoiceId?: { _id: string; number: string; total: number; remaining: number };
}

interface CustomerOption {
  _id: string;
  name: string;
  code: string;
  mobile: string;
}

interface UnpaidInvoiceOption {
  _id: string;
  number: string;
  total: number;
  remaining: number;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Payment Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCustId, setSelectedCustId] = useState('');
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoiceOption[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments');
      const json = await res.json();
      if (json.success) {
        setPayments(json.data);
      }
    } catch {
      toast.error('Could not load payment ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetch('/api/customers')
      .then((r) => r.json())
      .then((d) => d.success && setCustomers(d.data));
  }, []);

  // When customer changes in modal, load their unpaid invoices
  useEffect(() => {
    if (!selectedCustId) {
      setUnpaidInvoices([]);
      setSelectedInvoiceId('');
      return;
    }

    fetch(`/api/invoices?customerId=${selectedCustId}&status=unpaid`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setUnpaidInvoices(d.data);
        }
      });
  }, [selectedCustId]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustId || amount <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustId,
          invoiceId: selectedInvoiceId || undefined,
          amount,
          method,
          reference,
          password: password || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Payment rejected', { description: json.error });
        setSubmitting(false);
        return;
      }

      toast.success('Payment wasool ho gaya');
      setIsOpen(false);
      setSelectedCustId('');
      setSelectedInvoiceId('');
      setAmount(0);
      setReference('');
      setPassword('');
      fetchPayments();
    } catch {
      toast.error('Network error while saving payment');
    } finally {
      setSubmitting(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const filteredPayments = payments.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const custName = p.customerId?.name?.toLowerCase() || '';
    const custCode = p.customerId?.code?.toLowerCase() || '';
    const custMobile = p.customerId?.mobile?.toLowerCase() || '';
    const invNum = p.invoiceId?.number?.toLowerCase() || '';
    const methodStr = p.method?.toLowerCase() || '';
    const refStr = p.reference?.toLowerCase() || '';
    return (
      custName.includes(q) ||
      custCode.includes(q) ||
      custMobile.includes(q) ||
      invNum.includes(q) ||
      methodStr.includes(q) ||
      refStr.includes(q)
    );
  });

  const totalReceived = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayReceived = payments
    .filter((p) => p.date && p.date.startsWith(todayStr))
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <AppShell title="Payment Ledger">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
            Customer Payments &amp; Cash Inflow
          </h1>
          <p className="text-xs md:text-sm text-ink-muted">
            Record installments, invoice clearances, and customer account deposits
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPayments}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            variant="teal"
            size="sm"
            onClick={() => {
              setSelectedCustId('');
              setSelectedInvoiceId('');
              setAmount(0);
              setReference('');
              setPassword('');
              setIsOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Record Payment
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-paper border-warm-border">
          <CardContent className="p-4">
            <span className="text-[11px] uppercase font-bold text-ink-muted">Total Collections</span>
            <div className="text-2xl font-extrabold text-teal mt-1">
              {formatCurrency(totalReceived)}
            </div>
            <p className="text-[11px] text-ink-muted mt-1">{payments.length} total transactions recorded</p>
          </CardContent>
        </Card>

        <Card className="bg-paper border-warm-border">
          <CardContent className="p-4">
            <span className="text-[11px] uppercase font-bold text-ink-muted">Today&apos;s Collection</span>
            <div className="text-2xl font-extrabold text-status-success mt-1">
              {formatCurrency(todayReceived)}
            </div>
            <p className="text-[11px] text-ink-muted mt-1">Cash received today</p>
          </CardContent>
        </Card>

        <Card className="bg-paper border-warm-border">
          <CardContent className="p-4">
            <span className="text-[11px] uppercase font-bold text-ink-muted">Active Customers</span>
            <div className="text-2xl font-extrabold text-ink mt-1">
              {customers.length}
            </div>
            <p className="text-[11px] text-ink-muted mt-1">Accounts registered</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Input Bar */}
      <div className="mb-4">
        <Input
          placeholder="Search by customer name, phone, code, invoice #, method or reference note..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          className="max-w-md bg-paper-light"
        />
      </div>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-xs text-ink-muted flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-teal mr-2" />
              Loading payments ledger...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-16 text-center text-ink-muted space-y-3">
              <CreditCard className="w-12 h-12 mx-auto text-ink-muted/40" />
              <div className="text-base font-semibold text-ink">No payments found</div>
              <p className="text-xs max-w-sm mx-auto">
                {searchQuery
                  ? 'No payment matching your search query. Try clearing the search box.'
                  : 'Payments recorded against customer accounts or invoices will appear in this ledger.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Allocated Invoice</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Reference Note</th>
                    <th className="py-3 px-4 text-right">Amount Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-borderLight">
                  {filteredPayments.map((p) => (
                    <tr key={p._id} className="hover:bg-paper transition-colors">
                      <td className="py-3 px-4 text-ink-muted">{formatDate(p.date)}</td>
                      <td className="py-3 px-4 font-bold text-ink">
                        <div>{p.customerId?.name || 'Walk-in Customer'}</div>
                        <div className="text-[10px] text-teal font-mono">
                          {p.customerId?.code} • {p.customerId?.mobile}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {p.invoiceId ? (
                          <a
                            href={`/invoices/${p.invoiceId._id}`}
                            className="font-mono font-bold text-teal bg-teal-subtle hover:bg-teal hover:text-white transition-colors px-2 py-0.5 rounded inline-block"
                          >
                            {p.invoiceId.number}
                          </a>
                        ) : (
                          <span className="text-ink-muted text-[11px]">General Ledger Credit</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded border border-warm-border bg-paper-light font-medium text-ink">
                          {p.method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-ink-muted">{p.reference || '-'}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-status-success text-sm">
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

      {/* Add Payment Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Record Customer Payment"
        description="Receive payment against an invoice or apply credit to customer balance."
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
              Select Customer *
            </label>
            <select
              value={selectedCustId}
              onChange={(e) => setSelectedCustId(e.target.value)}
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

          {unpaidInvoices.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
                Allocate to Specific Invoice (Optional)
              </label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => {
                  setSelectedInvoiceId(e.target.value);
                  const inv = unpaidInvoices.find((i) => i._id === e.target.value);
                  if (inv) setAmount(inv.remaining);
                }}
                className="w-full rounded-lg border border-warm-border bg-paper-light px-3 py-2 text-sm text-ink focus:border-teal focus:outline-none"
              >
                <option value="">Apply to General Balance</option>
                {unpaidInvoices.map((inv) => (
                  <option key={inv._id} value={inv._id}>
                    {inv.number} (Remaining: {formatCurrency(inv.remaining)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="Payment Amount (PKR) *"
            type="number"
            min="1"
            required
            placeholder="e.g. 15000"
            value={amount || ''}
            onChange={(e) => setAmount(Number(e.target.value))}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
              Payment Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-lg border border-warm-border bg-paper-light px-3 py-2 text-sm text-ink focus:border-teal focus:outline-none"
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="JazzCash">JazzCash</option>
              <option value="EasyPaisa">EasyPaisa</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <Input
            label="Reference Note / Bank Slip"
            type="text"
            placeholder="Cheque # or Online Transaction ID"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />

          <Input
            label="Payment Password (if required by business settings)"
            type="password"
            placeholder="Only needed if sensitive payment protection is configured"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-borderLight">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="teal"
              isLoading={submitting}
            >
              Confirm Payment
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
