'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatDate, formatDateTime, roundMoney } from '@/lib/utils';
import {
  FileText,
  Printer,
  ArrowLeft,
  CreditCard,
  RefreshCw,
  Calendar,
  Share2,
  Edit,
  Trash2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { PasswordPromptModal } from '@/components/ui/PasswordPromptModal';

interface InvoiceDetail {
  _id: string;
  number: string;
  date: string;
  sellerName?: string;
  sellerContact?: string;
  reference?: string;
  terms?: string;
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

  // Payment Action (Edit / Delete) State & Password Gate
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [pendingPaymentAction, setPendingPaymentAction] = useState<'edit' | 'delete' | null>(null);
  const [isPaymentAuthOpen, setIsPaymentAuthOpen] = useState(false);
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
  const [isDeletePaymentConfirmOpen, setIsDeletePaymentConfirmOpen] = useState(false);
  const [editPaymentFormData, setEditPaymentFormData] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    method: 'Cash',
    reference: '',
  });
  const [paymentActionLoading, setPaymentActionLoading] = useState(false);

  // Edit Invoice Modal & Password Gate
  const [isEditAuthOpen, setIsEditAuthOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    date: '',
    sellerName: '',
    sellerContact: '',
    reference: '',
    terms: '',
    notes: '',
    jobStatus: '',
    addPaymentAmount: 0,
    addPaymentDate: new Date().toISOString().split('T')[0],
    addPaymentMethod: 'Cash',
    addPaymentRef: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete Password Modal
  const [isDeleteAuthOpen, setIsDeleteAuthOpen] = useState(false);

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

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${params.id}`);
      const json = await res.json();
      if (json.success) {
        setInvoice(json.data.invoice);
        setPayments(json.data.payments || []);
        setPaymentAmount(json.data.invoice.remaining || 0);
        setEditFormData({
          date: json.data.invoice.date ? json.data.invoice.date.split('T')[0] : '',
          sellerName: json.data.invoice.sellerName || 'Umar Nawaz',
          sellerContact: json.data.invoice.sellerContact || '0300-4131532',
          reference: json.data.invoice.reference || '0',
          terms: json.data.invoice.terms || 'Custom',
          notes: json.data.invoice.notes || '',
          jobStatus: json.data.invoice.jobStatus || 'Advance Received',
          addPaymentAmount: 0,
          addPaymentDate: new Date().toISOString().split('T')[0],
          addPaymentMethod: 'Cash',
          addPaymentRef: '',
        });
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

  const confirmDeleteInvoice = async () => {
    if (!invoice) return;

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

  const printInNewTab = () => {
    if (!invoice) return;
    window.open(`/invoices/${invoice._id}/print`, '_blank');
  };

  const handleWhatsAppShare = () => {
    if (!invoice) return;
    const text = `*UMAR USMAN INTERIOR*
Quotation / Invoice: ${invoice.number}
Date: ${formatDate(invoice.date)}
Customer: ${invoice.customerId?.name} (${invoice.customerId?.mobile})
Total: Rs. ${invoice.total.toLocaleString()}
Paid: Rs. ${invoice.paid.toLocaleString()}
Balance Due: Rs. ${invoice.remaining.toLocaleString()}
Job Status: ${invoice.jobStatus || '-'}
Reference: ${invoice.reference || '-'}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleOpenEdit = () => {
    setIsEditAuthOpen(true);
  };

  const handleEditAuthorized = () => {
    setIsEditAuthOpen(false);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setEditSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        date: editFormData.date,
        sellerName: editFormData.sellerName,
        sellerContact: editFormData.sellerContact,
        reference: editFormData.reference,
        terms: editFormData.terms,
        notes: editFormData.notes,
        jobStatus: editFormData.jobStatus,
      };

      if (editFormData.addPaymentAmount > 0) {
        payload.additionalPayment = {
          amount: editFormData.addPaymentAmount,
          date: editFormData.addPaymentDate,
          method: editFormData.addPaymentMethod,
          reference: editFormData.addPaymentRef,
        };
      }

      const res = await fetch(`/api/invoices/${invoice._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Failed to update invoice', { description: json.error });
        setEditSubmitting(false);
        return;
      }

      toast.success('Invoice updated successfully');
      setIsEditModalOpen(false);
      fetchInvoice();
    } catch {
      toast.error('Network error during invoice update');
    } finally {
      setEditSubmitting(false);
    }
  };

  const renderStatusPill = () => {
    if (!invoice) return null;
    if (invoice.remaining <= 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-sm">
          Payment Complete
        </span>
      );
    }
    if (invoice.paid > 0 && invoice.remaining > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm">
          Processing
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-300 shadow-sm">
        Udhar
      </span>
    );
  };

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

  const handleInitiateEditPayment = (p: PaymentRecord) => {
    setSelectedPayment(p);
    setEditPaymentFormData({
      amount: p.amount,
      date: p.date ? p.date.split('T')[0] : new Date().toISOString().split('T')[0],
      method: p.method || 'Cash',
      reference: p.reference || '',
    });
    setPendingPaymentAction('edit');
    setIsPaymentAuthOpen(true);
  };

  const handleInitiateDeletePayment = (p: PaymentRecord) => {
    setSelectedPayment(p);
    setPendingPaymentAction('delete');
    setIsPaymentAuthOpen(true);
  };

  const handlePaymentAuthAuthorized = () => {
    setIsPaymentAuthOpen(false);
    if (pendingPaymentAction === 'edit') {
      setIsEditPaymentModalOpen(true);
    } else if (pendingPaymentAction === 'delete') {
      setIsDeletePaymentConfirmOpen(true);
    }
  };

  const handleSavePaymentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setPaymentActionLoading(true);
    try {
      const res = await fetch(`/api/payments/${selectedPayment._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPaymentFormData),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Failed to update payment');
        return;
      }
      toast.success('Payment updated successfully');
      setIsEditPaymentModalOpen(false);
      setSelectedPayment(null);
      fetchInvoice();
    } catch {
      toast.error('Network error while updating payment');
    } finally {
      setPaymentActionLoading(false);
    }
  };

  const handleConfirmDeletePayment = async () => {
    if (!selectedPayment) return;
    setPaymentActionLoading(true);
    try {
      const res = await fetch(`/api/payments/${selectedPayment._id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Failed to delete payment');
        return;
      }
      toast.success('Payment deleted and balances updated');
      setIsDeletePaymentConfirmOpen(false);
      setSelectedPayment(null);
      fetchInvoice();
    } catch {
      toast.error('Network error while deleting payment');
    } finally {
      setPaymentActionLoading(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="outline"
            size="md"
            className="min-h-[42px]"
            onClick={() => router.push('/invoices')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Invoices
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight font-mono">
                {invoice.number}
              </h1>
              {renderStatusPill()}

              <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold ${
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
            <p className="text-xs sm:text-sm text-ink-muted flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Issued on {formatDate(invoice.date)}</span>
              </span>
              {invoice.createdByName && (
                <span className="text-xs text-ink-muted">
                  • Created by {invoice.createdByName} ({invoice.createdByRole || 'Staff'})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {!isPaid && (
            <Button
              variant="teal"
              size="md"
              className="min-h-[42px] sm:min-h-[44px]"
              onClick={() => setIsPaymentOpen(true)}
              leftIcon={<CreditCard className="w-4 h-4" />}
            >
              Record Payment
            </Button>
          )}

          <Button
            variant="outline"
            size="md"
            className="min-h-[42px] text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            onClick={handleWhatsAppShare}
            leftIcon={<Share2 className="w-4 h-4" />}
          >
            WhatsApp
          </Button>

          <Button
            variant="brass"
            size="md"
            className="min-h-[42px]"
            onClick={printInNewTab}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print (A4)
          </Button>

          {userRole === 'admin' && (
            <>
              <Button
                variant="outline"
                size="md"
                className="min-h-[42px]"
                onClick={handleOpenEdit}
                leftIcon={<Edit className="w-4 h-4" />}
              >
                Edit Invoice
              </Button>
              <Button
                variant="danger"
                size="md"
                className="min-h-[42px]"
                onClick={() => setIsDeleteAuthOpen(true)}
                title="Delete Invoice & Restore Stock"
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Persistent Udhar Reminder Alert for Outstanding Bills */}
      {!isPaid && (
        <div className="mb-6 sm:mb-8 p-5 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-warm">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 font-extrabold text-base">
              !
            </div>
            <div>
              <div className="font-bold text-amber-950 text-sm sm:text-base">
                Outstanding Balance Reminder: {formatCurrency(invoice.remaining)} Due
              </div>
              <p className="text-xs sm:text-sm text-amber-900 mt-0.5">
                Job stage: <strong className="uppercase">{invoice.jobStatus || 'Advance Received'}</strong>. Automatic reminder active until this customer account is 100% cleared.
              </p>
            </div>
          </div>
          <Button
            variant="teal"
            size="md"
            className="min-h-[40px]"
            onClick={() => setIsPaymentOpen(true)}
            leftIcon={<CreditCard className="w-4 h-4" />}
          >
            Clear Balance
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left 2 Cols: Customer and Line Items */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          {/* Customer Profile Box */}
          <Card className="p-5 sm:p-6 rounded-2xl shadow-warm">
            <CardHeader className="p-0 pb-4">
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                <div>
                  <div className="text-ink-muted uppercase font-bold text-xs tracking-wider">Name</div>
                  <div className="text-base font-bold text-ink mt-1">{invoice.customerId?.name}</div>
                  <div className="text-teal font-mono text-xs font-bold mt-0.5">
                    {invoice.customerId?.code}
                  </div>
                </div>

                <div>
                  <div className="text-ink-muted uppercase font-bold text-xs tracking-wider">Phone</div>
                  <div className="font-bold text-ink mt-1 text-sm sm:text-base">{invoice.customerId?.mobile}</div>
                  {invoice.customerId?.whatsapp && (
                    <div className="text-emerald-700 text-xs font-semibold mt-0.5">
                      WA: {invoice.customerId.whatsapp}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-ink-muted uppercase font-bold text-xs tracking-wider">Address / City</div>
                  <div className="text-ink font-medium mt-1">
                    {invoice.customerId?.address || 'Lahore'}
                  </div>
                  <div className="text-ink-muted text-xs mt-0.5">{invoice.customerId?.city || 'Lahore'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items Table */}
          <Card className="rounded-2xl shadow-warm">
            <CardHeader className="pb-4">
              <CardTitle>Itemized Wallpaper Rolls</CardTitle>
              <CardDescription>Verified inventory quantities &amp; bill rates</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold text-xs">
                  <tr>
                    <th className="py-3.5 px-4">WP#</th>
                    <th className="py-3.5 px-4">Design</th>
                    <th className="py-3.5 px-4 text-center">Quantity</th>
                    <th className="py-3.5 px-4 text-right">Rate (PKR)</th>
                    <th className="py-3.5 px-4 text-right">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-borderLight">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-paper/50 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-teal text-sm sm:text-base">WP {item.wp}</td>
                      <td className="py-4 px-4 font-semibold text-ink">{item.design}</td>
                      <td className="py-4 px-4 text-center font-bold">{item.qty} Rolls</td>
                      <td className="py-4 px-4 text-right font-medium text-ink">
                        {formatCurrency(item.rate)}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-ink">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          {/* Payment Receipts History */}
          <Card className="rounded-2xl shadow-warm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>Invoice Payments</CardTitle>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      <Lock className="w-3 h-3 text-amber-600" />
                      Admin Locked
                    </span>
                  </div>
                  <CardDescription>Ledger records allocated to this bill (Admin password protected)</CardDescription>
                </div>
                {!isPaid && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[34px] text-xs font-semibold px-3"
                    onClick={() => setIsPaymentOpen(true)}
                  >
                    + Add Payment
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <div className="p-6 text-center text-sm text-ink-muted">
                  No payments recorded for this invoice yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold text-xs">
                      <tr>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Amount</th>
                        <th className="py-3.5 px-4">Method</th>
                        <th className="py-3.5 px-4">Reference</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-borderLight">
                      {payments.map((p) => (
                        <tr key={p._id} className="hover:bg-paper/50 transition-colors">
                          <td className="py-4 px-4 text-ink-muted whitespace-nowrap">{formatDateTime(p.date)}</td>
                          <td className="py-4 px-4 font-bold text-status-success text-sm sm:text-base">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="py-4 px-4 text-ink font-medium">{p.method}</td>
                          <td className="py-4 px-4 text-ink-muted">{p.reference || '-'}</td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleInitiateEditPayment(p)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-teal hover:bg-teal/10 transition-colors"
                                title="Edit Payment (Admin Password Required)"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit</span>
                                <Lock className="w-3 h-3 text-amber-600" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleInitiateDeletePayment(p)}
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-status-danger hover:bg-red-50 transition-colors"
                                title="Delete Payment (Admin Password Required)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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

        {/* Right 1 Col: Financial Summary */}
        <div className="space-y-6 sm:space-y-8">
          <Card variant="elevated" className="p-5 sm:p-6 rounded-2xl shadow-warm">
            <CardHeader className="p-0 pb-4">
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-2 space-y-3.5 text-xs sm:text-sm">
              <div className="flex justify-between pb-2.5 border-b border-warm-borderLight">
                <span className="text-ink-muted">Subtotal:</span>
                <span className="font-semibold text-ink">{formatCurrency(invoice.subtotal)}</span>
              </div>

              {invoice.discount > 0 && (
                <div className="flex justify-between pb-2.5 border-b border-warm-borderLight text-status-danger font-medium">
                  <span>
                    Discount {invoice.discount <= 100 && roundMoney(invoice.subtotal - (invoice.subtotal * invoice.discount) / 100) === invoice.total ? `(${invoice.discount}%)` : '(Rs.)'}:
                  </span>
                  <span>
                    - {formatCurrency(
                      invoice.discount <= 100 && roundMoney(invoice.subtotal - (invoice.subtotal * invoice.discount) / 100) === invoice.total
                        ? (invoice.subtotal * invoice.discount) / 100
                        : invoice.discount
                    )}
                  </span>
                </div>
              )}

              {invoice.tax > 0 && (
                <div className="flex justify-between pb-2.5 border-b border-warm-borderLight">
                  <span className="text-ink-muted">Tax ({invoice.tax}%):</span>
                  <span className="font-semibold text-ink">
                    + {formatCurrency((Math.max(0, invoice.subtotal - (invoice.discount <= 100 && roundMoney(invoice.subtotal - (invoice.subtotal * invoice.discount) / 100) === invoice.total ? (invoice.subtotal * invoice.discount) / 100 : invoice.discount)) * invoice.tax) / 100)}
                  </span>
                </div>
              )}

              <div className="p-4 bg-paper rounded-2xl border border-warm-border flex justify-between items-center shadow-warm">
                <span className="font-extrabold text-ink uppercase text-xs sm:text-sm tracking-wider">Grand Total:</span>
                <span className="text-lg sm:text-xl font-extrabold text-teal">{formatCurrency(invoice.total)}</span>
              </div>

              <div className="flex justify-between pb-2.5 border-b border-warm-borderLight text-status-success">
                <span className="font-bold">Total Paid:</span>
                <span className="font-extrabold">{formatCurrency(invoice.paid)}</span>
              </div>

              {invoice.remaining < 0 ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center shadow-warm">
                  <span className="font-bold text-emerald-900 text-xs sm:text-sm">Advance / Credit:</span>
                  <span className="text-base sm:text-lg font-extrabold text-emerald-950">
                    {formatCurrency(Math.abs(invoice.remaining))}
                  </span>
                </div>
              ) : invoice.remaining === 0 ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center shadow-warm">
                  <span className="font-bold text-emerald-900 text-xs sm:text-sm">Balance Status:</span>
                  <span className="text-sm font-bold text-emerald-950">Cleared (Rs. 0)</span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex justify-between items-center shadow-warm">
                  <span className="font-bold text-amber-900 text-xs sm:text-sm">Remaining Udhar:</span>
                  <span className="text-base sm:text-lg font-extrabold text-amber-950">
                    {formatCurrency(invoice.remaining)}
                  </span>
                </div>
              )}

              {invoice.notes && (
                <div className="pt-2 text-ink-muted text-xs sm:text-sm">
                  <span className="font-bold text-ink">Notes: </span>
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
        description={`Current balance: ${formatCurrency(invoice.remaining)}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <Input
            label="Payment Amount (PKR)"
            type="number"
            min="0.01"
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

      {/* Edit Invoice Authorization Gate */}
      <PasswordPromptModal
        isOpen={isEditAuthOpen}
        onClose={() => setIsEditAuthOpen(false)}
        title={`Authorize Edit: Invoice ${invoice.number}`}
        actionDescription="Enter the admin password to edit quotation headers, dates, or append dated payments."
        protectionType="payment"
        onAuthorized={handleEditAuthorized}
      />

      {/* Edit Invoice Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Invoice — ${invoice.number}`}
        description="Update header fields and record additional payments."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Invoice Date"
              type="date"
              value={editFormData.date}
              onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
            />
            <Input
              label="Reference"
              type="text"
              placeholder="e.g. Room / Wall"
              value={editFormData.reference}
              onChange={(e) => setEditFormData({ ...editFormData, reference: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Seller Name"
              type="text"
              value={editFormData.sellerName}
              onChange={(e) => setEditFormData({ ...editFormData, sellerName: e.target.value })}
            />
            <Input
              label="Seller Contact"
              type="text"
              value={editFormData.sellerContact}
              onChange={(e) => setEditFormData({ ...editFormData, sellerContact: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-ink">Terms</label>
              <select
                value={editFormData.terms}
                onChange={(e) => setEditFormData({ ...editFormData, terms: e.target.value })}
                className="w-full rounded-lg border border-warm-border bg-paper px-3 py-2 text-xs text-ink focus:border-teal focus:outline-none"
              >
                <option value="Custom">Custom</option>
                <option value="100% advance in cash">100% advance in cash</option>
                <option value="50% Advance & 50% After Fitting">50% Advance &amp; 50% After Fitting</option>
                <option value="Cash on Delivery">Cash on Delivery</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-ink">Job Status</label>
              <select
                value={editFormData.jobStatus}
                onChange={(e) => setEditFormData({ ...editFormData, jobStatus: e.target.value })}
                className="w-full rounded-lg border border-warm-border bg-paper px-3 py-2 text-xs text-ink focus:border-teal focus:outline-none"
              >
                <option value="Advance Received">Advance Received</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Fully Paid">Fully Paid</option>
              </select>
            </div>
          </div>

          <Input
            label="Notes"
            type="text"
            value={editFormData.notes}
            onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
          />

          {/* Optional Additional Payment Entry */}
          <div className="p-3 bg-paper rounded-xl border border-warm-border space-y-3">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
              + Add Dated Payment (Optional)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Amount (PKR)"
                type="number"
                min="0"
                value={editFormData.addPaymentAmount || ''}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, addPaymentAmount: Number(e.target.value) })
                }
              />
              <Input
                label="Payment Date"
                type="date"
                value={editFormData.addPaymentDate}
                onChange={(e) => setEditFormData({ ...editFormData, addPaymentDate: e.target.value })}
              />
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink">Method</label>
                <select
                  value={editFormData.addPaymentMethod}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, addPaymentMethod: e.target.value })
                  }
                  className="w-full rounded-lg border border-warm-border bg-paper-light px-3 py-2 text-xs text-ink focus:border-teal focus:outline-none"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>
            <Input
              label="Payment Reference"
              type="text"
              placeholder="e.g. Receipt # or online slip"
              value={editFormData.addPaymentRef}
              onChange={(e) => setEditFormData({ ...editFormData, addPaymentRef: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-borderLight">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="teal"
              isLoading={editSubmitting}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <PasswordPromptModal
        isOpen={isDeleteAuthOpen}
        onClose={() => setIsDeleteAuthOpen(false)}
        title={`Authorize Deletion: Invoice ${invoice.number}`}
        actionDescription={`Permanently delete invoice ${invoice.number}. All wallpaper rolls sold will be automatically returned to stock.`}
        protectionType="delete"
        onAuthorized={confirmDeleteInvoice}
      />

      {/* Payment Action Password Gate */}
      <PasswordPromptModal
        isOpen={isPaymentAuthOpen}
        onClose={() => {
          setIsPaymentAuthOpen(false);
          setSelectedPayment(null);
          setPendingPaymentAction(null);
        }}
        title={`Authorize Payment ${pendingPaymentAction === 'edit' ? 'Edit' : 'Deletion'}`}
        actionDescription={`Enter the admin password to ${pendingPaymentAction === 'edit' ? 'edit' : 'permanently delete'} this payment of Rs. ${selectedPayment?.amount.toLocaleString() || ''}.`}
        protectionType="payment"
        onAuthorized={handlePaymentAuthAuthorized}
      />

      {/* Edit Payment Modal */}
      {selectedPayment && (
        <Modal
          isOpen={isEditPaymentModalOpen}
          onClose={() => {
            setIsEditPaymentModalOpen(false);
            setSelectedPayment(null);
          }}
          title="Edit Invoice Payment"
          description="Update recorded payment details. Invoice balance will be recalculated automatically."
        >
          <form onSubmit={handleSavePaymentEdit} className="space-y-4">
            <Input
              label="Payment Amount (PKR)"
              type="number"
              min="0.01"
              required
              value={editPaymentFormData.amount || ''}
              onChange={(e) =>
                setEditPaymentFormData({ ...editPaymentFormData, amount: Number(e.target.value) })
              }
            />

            <Input
              label="Payment Date"
              type="date"
              required
              value={editPaymentFormData.date}
              onChange={(e) =>
                setEditPaymentFormData({ ...editPaymentFormData, date: e.target.value })
              }
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
                Payment Method
              </label>
              <select
                value={editPaymentFormData.method}
                onChange={(e) =>
                  setEditPaymentFormData({ ...editPaymentFormData, method: e.target.value })
                }
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
              value={editPaymentFormData.reference}
              onChange={(e) =>
                setEditPaymentFormData({ ...editPaymentFormData, reference: e.target.value })
              }
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-borderLight">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditPaymentModalOpen(false);
                  setSelectedPayment(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="teal"
                isLoading={paymentActionLoading}
              >
                Save Payment Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Payment Confirmation Modal */}
      {selectedPayment && (
        <Modal
          isOpen={isDeletePaymentConfirmOpen}
          onClose={() => {
            setIsDeletePaymentConfirmOpen(false);
            setSelectedPayment(null);
          }}
          title="Delete Invoice Payment"
          description="Are you sure you want to delete this payment record?"
        >
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              <p className="font-semibold">Warning:</p>
              <p>
                Deleting this payment of <strong>PKR {selectedPayment.amount.toLocaleString()}</strong> will increase the invoice outstanding balance (Udhar) by the same amount.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-borderLight">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeletePaymentConfirmOpen(false);
                  setSelectedPayment(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                isLoading={paymentActionLoading}
                onClick={handleConfirmDeletePayment}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
