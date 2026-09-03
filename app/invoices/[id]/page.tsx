'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
  FileText,
  Printer,
  ArrowLeft,
  User,
  Phone,
  MapPin,
  CreditCard,
  Plus,
  RefreshCw,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

interface InvoiceDetail {
  _id: string;
  number: string;
  date: string;
  customerId: {
    _id: string;
    name: string;
    mobile: string;
    whatsapp?: string;
    address?: string;
    city?: string;
    code: string;
  };
  items: Array<{
    productId: string;
    wp: string;
    design: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  remaining: number;
  method: string;
  jobStatus?: string;
  createdByRole?: string;
  createdByName?: string;
  notes?: string;
}

interface PaymentRecord {
  _id: string;
  date: string;
  amount: number;
  method: string;
  reference?: string;
}

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'worker'>('admin');

  // Add Payment Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentPassword, setPaymentPassword] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

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

  const handleDeleteInvoice = async () => {
    if (!invoice) return;
    if (
      !confirm(
        `Are you sure you want to delete Invoice ${invoice.number}? This will restore all wallpaper rolls back to inventory stock.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/invoices/${invoice._id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Cannot delete invoice', { description: json.error });
        return;
      }

      toast.success('Invoice deleted and stock restored');
      router.push('/invoices');
    } catch {
      toast.error('Failed to delete invoice');
    }
  };

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${params.id}`);
      const json = await res.json();
      if (json.success) {
        setInvoice(json.data.invoice);
        setPayments(json.data.payments || []);
        setPaymentAmount(json.data.invoice.remaining || 0);
      } else {
        toast.error('Could not load invoice', { description: json.error });
      }
    } catch {
      toast.error('Network Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [params.id]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || paymentAmount <= 0) return;

    setPaymentLoading(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: invoice.customerId._id,
          invoiceId: invoice._id,
          amount: paymentAmount,
          method: paymentMethod,
          reference: paymentRef,
          password: paymentPassword || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Payment failed', { description: json.error });
        setPaymentLoading(false);
        return;
      }

      toast.success('Payment wasool ho gaya');
      setIsPaymentOpen(false);
      setPaymentPassword('');
      fetchInvoice();
    } catch {
      toast.error('Failed to submit payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Invoice Details">
        <div className="py-24 text-center text-xs text-ink-muted flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-teal mr-2" />
          Loading invoice details...
        </div>
      </AppShell>
    );
  }

  if (!invoice) {
    return (
      <AppShell title="Invoice Not Found">
        <Card className="py-16 text-center text-ink-muted">
          <FileText className="w-12 h-12 mx-auto text-ink-muted/40 mb-3" />
          <h2 className="text-lg font-bold text-ink">Invoice Not Found</h2>
          <Link href="/invoices" className="text-xs text-teal underline font-semibold mt-2 inline-block">
            Return to Invoices List
          </Link>
        </Card>
      </AppShell>
    );
  }

  const isPaid = invoice.remaining <= 0;

  return (
    <AppShell title={`Invoice ${invoice.number}`}>
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/invoices')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Invoices
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight font-mono">
                {invoice.number}
              </h1>
              {isPaid ? (
                <Badge variant="success">Fully Paid</Badge>
              ) : invoice.paid > 0 ? (
                <Badge variant="warning">Partial Payment</Badge>
              ) : (
                <Badge variant="danger">Unpaid</Badge>
              )}

              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                invoice.jobStatus === 'Fully Paid'
                  ? 'bg-emerald-100 text-emerald-800'
                  : invoice.jobStatus === 'In Progress'
                  ? 'bg-blue-100 text-blue-800'
                  : invoice.jobStatus === 'Completed'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-teal-subtle text-teal'
              }`}>
                {invoice.jobStatus || (isPaid ? 'Fully Paid' : 'Advance Received')}
              </span>
            </div>
            <p className="text-xs text-ink-muted flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Issued on {formatDate(invoice.date)}</span>
              </span>
              {invoice.createdByName && (
                <span className="text-[11px] text-ink-muted">
                  • Created by {invoice.createdByName} ({invoice.createdByRole || 'Staff'})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPaid && (
            <Button
              variant="teal"
              size="sm"
              onClick={() => setIsPaymentOpen(true)}
              leftIcon={<CreditCard className="w-4 h-4" />}
            >
              Record Payment
            </Button>
          )}

          <Link href={`/invoices/${invoice._id}/print`}>
            <Button variant="brass" size="sm" leftIcon={<Printer className="w-4 h-4" />}>
              Print Invoice (A4)
            </Button>
          </Link>

          {userRole === 'admin' && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteInvoice}
              title="Delete Invoice & Restore Stock (Admin Only)"
            >
              Delete Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Persistent Udhar Reminder Alert for Outstanding Bills */}
      {!isPaid && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-warm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 font-bold">
              !
            </div>
            <div>
              <div className="font-bold text-amber-950 text-sm">
                Outstanding Balance Reminder: {formatCurrency(invoice.remaining)} Due
              </div>
              <p className="text-xs text-amber-900">
                Job stage: <strong className="uppercase">{invoice.jobStatus || 'Advance Received'}</strong>. Automatic reminder active until this customer account is 100% cleared.
              </p>
            </div>
          </div>
          <Button
            variant="teal"
            size="sm"
            onClick={() => setIsPaymentOpen(true)}
            leftIcon={<CreditCard className="w-4 h-4" />}
          >
            Clear Balance
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Customer and Line Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Profile Box */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-ink-muted uppercase font-semibold">Name</div>
                  <div className="text-sm font-bold text-ink mt-0.5">{invoice.customerId?.name}</div>
                  <div className="text-teal font-mono text-[11px] font-bold mt-0.5">
                    {invoice.customerId?.code}
                  </div>
                </div>

                <div>
                  <div className="text-ink-muted uppercase font-semibold">Phone</div>
                  <div className="font-semibold text-ink mt-0.5">{invoice.customerId?.mobile}</div>
                  {invoice.customerId?.whatsapp && (
                    <div className="text-emerald-700 text-[11px]">
                      WA: {invoice.customerId.whatsapp}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-ink-muted uppercase font-semibold">Address / City</div>
                  <div className="text-ink font-medium mt-0.5">
                    {invoice.customerId?.address || 'Lahore'}
                  </div>
                  <div className="text-ink-muted text-[11px]">{invoice.customerId?.city || 'Lahore'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Itemized Wallpaper Rolls</CardTitle>
              <CardDescription>Verified inventory quantities &amp; bill rates</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">WP#</th>
                    <th className="py-2.5 px-4">Design</th>
                    <th className="py-2.5 px-4 text-center">Quantity</th>
                    <th className="py-2.5 px-4 text-right">Rate (PKR)</th>
                    <th className="py-2.5 px-4 text-right">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-borderLight">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-paper/50">
                      <td className="py-3 px-4 font-mono font-bold text-teal">{item.wp}</td>
                      <td className="py-3 px-4 font-semibold text-ink">{item.design}</td>
                      <td className="py-3 px-4 text-center font-bold">{item.qty} Rolls</td>
                      <td className="py-3 px-4 text-right font-medium text-ink">
                        {formatCurrency(item.rate)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-ink">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Payment Receipts History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invoice Payments</CardTitle>
                  <CardDescription>Ledger records allocated to this bill</CardDescription>
                </div>
                {!isPaid && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setIsPaymentOpen(true)}
                  >
                    + Add Payment
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <div className="p-4 text-center text-xs text-ink-muted">
                  No payments recorded for this invoice yet.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold">
                    <tr>
                      <th className="py-2 px-4">Date</th>
                      <th className="py-2 px-4">Amount</th>
                      <th className="py-2 px-4">Method</th>
                      <th className="py-2 px-4">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-borderLight">
                    {payments.map((p) => (
                      <tr key={p._id}>
                        <td className="py-2.5 px-4 text-ink-muted">{formatDateTime(p.date)}</td>
                        <td className="py-2.5 px-4 font-bold text-status-success">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-2.5 px-4 text-ink">{p.method}</td>
                        <td className="py-2.5 px-4 text-ink-muted">{p.reference || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Financial Summary */}
        <div className="space-y-6">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between pb-2 border-b border-warm-borderLight">
                <span className="text-ink-muted">Subtotal:</span>
                <span className="font-semibold text-ink">{formatCurrency(invoice.subtotal)}</span>
              </div>

              {invoice.discount > 0 && (
                <div className="flex justify-between pb-2 border-b border-warm-borderLight text-status-danger">
                  <span>Discount ({invoice.discount}%):</span>
                  <span>
                    - {formatCurrency((invoice.subtotal * invoice.discount) / 100)}
                  </span>
                </div>
              )}

              {invoice.tax > 0 && (
                <div className="flex justify-between pb-2 border-b border-warm-borderLight">
                  <span className="text-ink-muted">Tax ({invoice.tax}%):</span>
                  <span className="font-semibold text-ink">
                    + {formatCurrency(((invoice.subtotal - (invoice.subtotal * invoice.discount) / 100) * invoice.tax) / 100)}
                  </span>
                </div>
              )}

              <div className="p-3 bg-paper rounded-xl border border-warm-border flex justify-between items-center">
                <span className="font-bold text-ink uppercase">Grand Total:</span>
                <span className="text-base font-extrabold text-teal">{formatCurrency(invoice.total)}</span>
              </div>

              <div className="flex justify-between pb-2 border-b border-warm-borderLight text-status-success">
                <span className="font-semibold">Total Paid:</span>
                <span className="font-bold">{formatCurrency(invoice.paid)}</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex justify-between items-center">
                <span className="font-bold text-amber-900">Remaining Udhar:</span>
                <span className="text-base font-extrabold text-amber-950">
                  {formatCurrency(invoice.remaining)}
                </span>
              </div>

              {invoice.notes && (
                <div className="pt-2 text-ink-muted">
                  <span className="font-semibold text-ink">Notes: </span>
                  <span>{invoice.notes}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title={`Record Payment — ${invoice.number}`}
        description={`Remaining balance: ${formatCurrency(invoice.remaining)}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <Input
            label="Payment Amount (PKR)"
            type="number"
            min="0.01"
            max={invoice.remaining}
            required
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(Number(e.target.value))}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
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
            label="Reference / Transaction Note"
            type="text"
            placeholder="e.g. Online transfer slip #7821"
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
          />

          <Input
            label="Security Password (if configured)"
            type="password"
            placeholder="Required only if payment confirmation password is set"
            value={paymentPassword}
            onChange={(e) => setPaymentPassword(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-borderLight">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPaymentOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="teal"
              isLoading={paymentLoading}
            >
              Confirm Payment
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
