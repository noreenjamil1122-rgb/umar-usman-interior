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
import { PasswordPromptModal } from '@/components/ui/PasswordPromptModal';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  User,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Plus,
  Printer,
  ArrowLeft,
  RefreshCw,
  Edit2,
  Calendar,
  AlertTriangle,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';

interface CustomerDetail {
  _id: string;
  code: string;
  name: string;
  type: 'customer' | 'supplier';
  mobile: string;
  whatsapp?: string;
  alt?: string;
  address?: string;
  city?: string;
  notes?: string;
  dateAdded: string;
}

interface InvoiceItem {
  _id: string;
  number: string;
  date: string;
  total: number;
  paid: number;
  remaining: number;
  method: string;
  jobStatus?: string;
}

interface PaymentItem {
  _id: string;
  date: string;
  amount: number;
  method: string;
  reference?: string;
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [stats, setStats] = useState({
    totalInvoiced: 0,
    totalPaid: 0,
    outstandingBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  // Edit Customer Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'customer' as 'customer' | 'supplier',
    mobile: '',
    whatsapp: '',
    alt: '',
    address: '',
    city: 'Lahore',
    notes: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  // Add Payment Modal with Admin Protection
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${params.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setCustomer(json.data.customer);
        setInvoices(json.data.invoices || []);
        setPayments(json.data.payments || []);
        setStats(json.data.stats || { totalInvoiced: 0, totalPaid: 0, outstandingBalance: 0 });
      } else {
        toast.error('Customer not found');
        router.push('/customers');
      }
    } catch {
      toast.error('Failed to load customer profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [params.id]);

  const handleOpenEdit = () => {
    if (!customer) return;
    setEditForm({
      name: customer.name,
      type: customer.type || 'customer',
      mobile: customer.mobile,
      whatsapp: customer.whatsapp || '',
      alt: customer.alt || '',
      address: customer.address || '',
      city: customer.city || 'Lahore',
      notes: customer.notes || '',
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const res = await fetch(`/api/customers/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Failed to update details', { description: json.error });
        setEditLoading(false);
        return;
      }

      toast.success('Party profile updated');
      setIsEditOpen(false);
      fetchCustomer();
    } catch {
      toast.error('Network error');
    } finally {
      setEditLoading(false);
    }
  };

  // Trigger Add Payment flow (protected)
  const handleOpenPaymentPrompt = () => {
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = () => {
    setIsPaymentOpen(true);
    setPaymentAmount(stats.outstandingBalance > 0 ? stats.outstandingBalance : 0);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }

    setPaymentLoading(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: params.id,
          amount: paymentAmount,
          method: paymentMethod,
          reference: paymentRef,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Payment failed', { description: json.error });
        setPaymentLoading(false);
        return;
      }

      toast.success('Payment recorded successfully');
      setIsPaymentOpen(false);
      fetchCustomer();
    } catch {
      toast.error('Network error while recording payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const printStatementInNewTab = () => {
    if (!customer) return;

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Statement - ${customer.name} (${customer.code})</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 28px; color: #1c1917; }
            h1 { font-size: 22px; margin-bottom: 2px; }
            .subtitle { color: #57534e; font-size: 13px; margin-bottom: 20px; }
            .meta-box { border: 1px solid #e7e5e4; padding: 14px; border-radius: 8px; margin-bottom: 24px; background: #fafaf9; }
            .stats-row { display: flex; gap: 20px; margin-bottom: 24px; }
            .stat-card { border: 1px solid #e7e5e4; padding: 12px; border-radius: 6px; flex: 1; text-align: center; }
            .stat-title { font-size: 11px; text-transform: uppercase; color: #78716c; font-weight: bold; }
            .stat-val { font-size: 18px; font-weight: bold; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th { background: #f5f5f4; text-align: left; padding: 8px; border-bottom: 2px solid #e7e5e4; text-transform: uppercase; font-size: 10px; }
            td { padding: 8px; border-bottom: 1px solid #f5f5f4; }
            .text-right { text-align: right; }
            .red { color: #dc2626; font-weight: bold; }
            .green { color: #16a34a; font-weight: bold; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Umar Usman Interior — Customer Statement</h1>
          <div class="subtitle">College road near five star naan shop, Lahore • +92 303 4333227</div>
          <div class="meta-box">
            <strong>Party:</strong> ${customer.name} (${customer.code}) [${customer.type === 'supplier' ? 'Supplier' : 'Customer'}]<br>
            <strong>Phone:</strong> ${customer.mobile} ${customer.city ? `• City: ${customer.city}` : ''}<br>
            <strong>Address:</strong> ${customer.address || 'N/A'}<br>
            <strong>Statement Date:</strong> ${new Date().toLocaleDateString('en-GB')}
          </div>
          <div class="stats-row">
            <div class="stat-card">
              <div class="stat-title">Total Invoiced</div>
              <div class="stat-val">PKR ${stats.totalInvoiced.toLocaleString()}</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">Total Paid</div>
              <div class="stat-val green">PKR ${stats.totalPaid.toLocaleString()}</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">Outstanding (Udhar)</div>
              <div class="stat-val ${stats.outstandingBalance > 0 ? 'red' : 'green'}">
                PKR ${stats.outstandingBalance.toLocaleString()}
              </div>
            </div>
          </div>
          <h3>Invoice History</h3>
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th class="text-right">Total</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Remaining</th>
              </tr>
            </thead>
            <tbody>
              ${invoices
                .map(
                  (inv) => `
                <tr>
                  <td><strong>${inv.number}</strong></td>
                  <td>${new Date(inv.date).toLocaleDateString('en-GB')}</td>
                  <td class="text-right">PKR ${inv.total.toLocaleString()}</td>
                  <td class="text-right green">PKR ${inv.paid.toLocaleString()}</td>
                  <td class="text-right ${inv.remaining > 0 ? 'red' : ''}">PKR ${inv.remaining.toLocaleString()}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <br><br>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
    } else {
      toast.error('Popup was blocked. Please allow popups to print.');
    }
  };

  return (
    <AppShell title={customer ? `${customer.name} Profile` : 'Party Details'}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/customers')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            All Parties
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
                {customer?.name || 'Party'}
              </h1>
              {customer?.type === 'supplier' ? (
                <Badge variant="brass" size="sm">Supplier</Badge>
              ) : (
                <Badge variant="success" size="sm">Customer</Badge>
              )}
              <span className="font-mono text-xs font-bold text-ink-muted">
                {customer?.code}
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Contact records, historical orders, receipts, and Udhar ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={printStatementInNewTab}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print Statement
          </Button>

          <Button
            variant="brass"
            size="sm"
            onClick={handleOpenPaymentPrompt}
            leftIcon={<CreditCard className="w-4 h-4" />}
          >
            Add Payment
          </Button>

          <Link href={`/invoices/new?customerId=${params.id}`}>
            <Button variant="teal" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              New Invoice
            </Button>
          </Link>

          <Button variant="outline" size="sm" onClick={handleOpenEdit} leftIcon={<Edit2 className="w-4 h-4" />}>
            Edit
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-ink-muted flex items-center justify-center">
          <RefreshCw className="w-5 h-5 animate-spin text-teal mr-2" />
          Loading party profile...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 border-l-4 border-l-teal">
              <div className="text-xs font-semibold text-ink-muted uppercase">Total Purchase</div>
              <div className="text-xl font-bold text-ink mt-1">
                {formatCurrency(stats.totalInvoiced)}
              </div>
              <div className="text-[11px] text-ink-muted mt-0.5">
                {invoices.length} billing invoice(s)
              </div>
            </Card>

            <Card className="p-4 border-l-4 border-l-emerald-600">
              <div className="text-xs font-semibold text-ink-muted uppercase">Total Paid</div>
              <div className="text-xl font-bold text-emerald-700 mt-1">
                {formatCurrency(stats.totalPaid)}
              </div>
              <div className="text-[11px] text-ink-muted mt-0.5">
                {payments.length} payment voucher(s)
              </div>
            </Card>

            <Card className={`p-4 border-l-4 ${stats.outstandingBalance > 0 ? 'border-l-rose-500' : 'border-l-emerald-500'}`}>
              <div className="text-xs font-semibold text-ink-muted uppercase">Remaining Balance</div>
              <div className={`text-xl font-bold mt-1 ${stats.outstandingBalance > 0 ? 'text-status-danger' : 'text-status-success'}`}>
                {stats.outstandingBalance > 0
                  ? formatCurrency(stats.outstandingBalance)
                  : stats.outstandingBalance < 0
                    ? `Advance ${formatCurrency(Math.abs(stats.outstandingBalance))}`
                    : 'Clear (0)'}
              </div>
              <div className="text-[11px] text-ink-muted mt-0.5">
                {stats.outstandingBalance > 0 ? 'Udhar recovery pending' : 'No balance due'}
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-xs font-semibold text-ink-muted uppercase">Contact &amp; City</div>
              <div className="text-sm font-bold text-ink mt-1 truncate">
                {customer?.mobile}
              </div>
              <div className="text-[11px] text-ink-muted truncate">
                {customer?.city || 'Lahore'} {customer?.address ? `• ${customer.address}` : ''}
              </div>
            </Card>
          </div>

          {/* Contact Details & Notes Card */}
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-ink-muted block font-medium">Party Type:</span>
                <span className="font-bold text-ink capitalize">{customer?.type}</span>
              </div>
              <div>
                <span className="text-ink-muted block font-medium">WhatsApp:</span>
                <span className="font-bold text-ink">{customer?.whatsapp || '-'}</span>
              </div>
              <div>
                <span className="text-ink-muted block font-medium">Alt Contact:</span>
                <span className="font-bold text-ink">{customer?.alt || '-'}</span>
              </div>
              <div>
                <span className="text-ink-muted block font-medium">Internal Notes:</span>
                <span className="text-ink italic">{customer?.notes || 'No remarks recorded'}</span>
              </div>
            </div>
          </Card>

          {/* Invoices Table */}
          <Card>
            <CardHeader className="pb-3 border-b border-warm-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal" />
                  <span>Invoice Sales History</span>
                </CardTitle>
                <Link href={`/invoices/new?customerId=${params.id}`}>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-teal">
                    + New Bill
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {invoices.length === 0 ? (
                <div className="py-8 text-center text-xs text-ink-muted">
                  No invoices generated for this client yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">Invoice #</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Total</th>
                        <th className="py-2.5 px-4">Paid</th>
                        <th className="py-2.5 px-4">Remaining</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-borderLight">
                      {invoices.map((inv) => {
                        // Inverted Status colors requested: Paid=Yellow, Processing=Green, Udhar=Red
                        const isFullyPaid = inv.remaining <= 0;
                        const isPartial = inv.remaining > 0 && inv.paid > 0;
                        const isUnpaid = inv.remaining > 0 && inv.paid === 0;

                        return (
                          <tr key={inv._id} className="hover:bg-paper transition-colors">
                            <td className="py-2.5 px-4 font-mono font-bold text-teal">
                              <Link href={`/invoices/${inv._id}`} className="hover:underline">
                                {inv.number}
                              </Link>
                            </td>
                            <td className="py-2.5 px-4 text-ink-muted">{formatDate(inv.date)}</td>
                            <td className="py-2.5 px-4 font-bold text-ink">{formatCurrency(inv.total)}</td>
                            <td className="py-2.5 px-4 font-medium text-emerald-700">{formatCurrency(inv.paid)}</td>
                            <td className={`py-2.5 px-4 font-bold ${inv.remaining > 0 ? 'text-status-danger' : 'text-emerald-700'}`}>
                              {inv.remaining > 0 ? formatCurrency(inv.remaining) : '-'}
                            </td>
                            <td className="py-2.5 px-4">
                              {isFullyPaid ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900">
                                  Payment Complete
                                </span>
                              ) : isPartial ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-900">
                                  Processing
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-900">
                                  Udhar
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <Link href={`/invoices/${inv._id}`}>
                                <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-teal">
                                  View
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payments Table */}
          <Card>
            <CardHeader className="pb-3 border-b border-warm-border">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <span>Payment Vouchers Received</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <div className="py-8 text-center text-xs text-ink-muted">
                  No payment vouchers registered for this party.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Amount</th>
                        <th className="py-2.5 px-4">Method</th>
                        <th className="py-2.5 px-4">Reference Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-borderLight">
                      {payments.map((pm) => (
                        <tr key={pm._id} className="hover:bg-paper transition-colors">
                          <td className="py-2.5 px-4 text-ink-muted">{formatDate(pm.date)}</td>
                          <td className="py-2.5 px-4 font-bold text-emerald-700 font-mono">
                            {formatCurrency(pm.amount)}
                          </td>
                          <td className="py-2.5 px-4">
                            <Badge variant="neutral" size="sm">{pm.method}</Badge>
                          </td>
                          <td className="py-2.5 px-4 text-ink-muted">{pm.reference || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Customer Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Details — ${customer?.name}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name*"
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
                Party Type*
              </label>
              <select
                value={editForm.type}
                onChange={(e) =>
                  setEditForm({ ...editForm, type: e.target.value as 'customer' | 'supplier' })
                }
                className="w-full rounded-lg border border-warm-border bg-paper-light px-3 py-2 text-xs text-ink focus:border-teal focus:outline-none"
              >
                <option value="customer">Customer</option>
                <option value="supplier">Supplier</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Mobile*"
              type="text"
              required
              value={editForm.mobile}
              onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
            />
            <Input
              label="WhatsApp"
              type="text"
              value={editForm.whatsapp}
              onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
            />
            <Input
              label="Alt Number"
              type="text"
              value={editForm.alt}
              onChange={(e) => setEditForm({ ...editForm, alt: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="City"
              type="text"
              value={editForm.city}
              onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
            />
            <Input
              label="Address"
              type="text"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            />
          </div>

          <Input
            label="Internal Notes"
            type="text"
            value={editForm.notes}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-borderLight">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="teal" isLoading={editLoading}>
              Save Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* Payment Password Prompt */}
      {isAuthOpen && (
        <PasswordPromptModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={handleAuthSuccess}
          type="payment"
          title="Payment Authorization Required"
          description="Enter the Payment Update Protection password to record a payment voucher."
        />
      )}

      {/* Add Payment Modal */}
      <Modal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title={`Record Payment for ${customer?.name}`}
        size="sm"
      >
        <form onSubmit={handleSubmitPayment} className="space-y-4">
          <Input
            label="Payment Amount (PKR)*"
            type="number"
            min="1"
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
              className="w-full rounded-lg border border-warm-border bg-paper-light px-3 py-2 text-xs text-ink focus:border-teal focus:outline-none"
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="JazzCash">JazzCash</option>
              <option value="Easypaisa">Easypaisa</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <Input
            label="Reference / Cheque / Bank Note"
            type="text"
            placeholder="e.g. Online transfer slip or cheque number"
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-warm-borderLight">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsPaymentOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="teal" size="sm" isLoading={paymentLoading}>
              Confirm Payment
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
