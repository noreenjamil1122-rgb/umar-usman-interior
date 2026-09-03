'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Users,
  Search,
  Plus,
  Phone,
  MessageCircle,
  MapPin,
  Edit2,
  Trash2,
  CreditCard,
  FileText,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface Customer {
  _id: string;
  code: string;
  name: string;
  mobile: string;
  whatsapp?: string;
  alt?: string;
  address?: string;
  city?: string;
  notes?: string;
  dateAdded: string;
  outstandingBalance?: number;
}

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('filter');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDebtOnly, setFilterDebtOnly] = useState(initialFilter === 'debt');

  // Add/Edit modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    whatsapp: '',
    alt: '',
    address: '',
    city: 'Lahore',
    notes: '',
  });

  // Customer Ledger inspection modal
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [customerDetails, setCustomerDetails] = useState<{
    invoices: Array<{ _id: string; number: string; date: string; total: number; remaining: number }>;
    payments: Array<{ _id: string; date: string; amount: number; method: string; reference?: string }>;
    stats: { totalInvoiced: number; totalPaid: number; outstandingBalance: number };
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const url = search.trim()
        ? `/api/customers?q=${encodeURIComponent(search.trim())}`
        : '/api/customers';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data);
      } else {
        toast.error('Could not load customers', { description: json.error });
      }
    } catch {
      toast.error('Network Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  // Open Edit modal
  const handleEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      mobile: c.mobile,
      whatsapp: c.whatsapp || '',
      alt: c.alt || '',
      address: c.address || '',
      city: c.city || 'Lahore',
      notes: c.notes || '',
    });
    setIsAddOpen(true);
  };

  // Open Ledger details
  const handleViewLedger = async (c: Customer) => {
    setViewingCustomer(c);
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/customers/${c._id}`);
      const json = await res.json();
      if (json.success) {
        setCustomerDetails(json.data);
      }
    } catch {
      toast.error('Failed to load ledger history');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Save Customer (Add or Edit)
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const method = editingCustomer ? 'PUT' : 'POST';
      const url = editingCustomer ? `/api/customers/${editingCustomer._id}` : '/api/customers';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error('Error saving customer', { description: json.error });
        setFormLoading(false);
        return;
      }

      toast.success(editingCustomer ? 'Customer updated' : 'Customer add ho gaya');
      setIsAddOpen(false);
      setEditingCustomer(null);
      setFormData({
        name: '',
        mobile: '',
        whatsapp: '',
        alt: '',
        address: '',
        city: 'Lahore',
        notes: '',
      });
      fetchCustomers();
    } catch {
      toast.error('Network error while saving customer');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Customer
  const handleDelete = async (c: Customer) => {
    if (!confirm(`Are you sure you want to delete customer "${c.name}"?`)) return;

    try {
      const res = await fetch(`/api/customers/${c._id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Cannot delete customer', { description: json.error });
        return;
      }
      toast.success('Customer deleted successfully');
      fetchCustomers();
    } catch {
      toast.error('Failed to delete customer');
    }
  };

  const displayedCustomers = filterDebtOnly
    ? customers.filter((c) => (c.outstandingBalance || 0) > 0)
    : customers;

  return (
    <AppShell title="Customers Management">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
            Customer Directory &amp; Ledger
          </h1>
          <p className="text-xs md:text-sm text-ink-muted">
            Manage client accounts, contact details, and Udhar balances
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="teal"
            size="sm"
            onClick={() => {
              setEditingCustomer(null);
              setFormData({
                name: '',
                mobile: '',
                whatsapp: '',
                alt: '',
                address: '',
                city: 'Lahore',
                notes: '',
              });
              setIsAddOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Customer
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="mb-6 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-ink-muted" />
            <input
              type="text"
              placeholder="Search by name, mobile, code (CUS-XXXXX)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs md:text-sm bg-paper border border-warm-border rounded-lg text-ink focus:outline-none focus:border-teal"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterDebtOnly(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                !filterDebtOnly
                  ? 'bg-teal text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              All ({customers.length})
            </button>
            <button
              onClick={() => setFilterDebtOnly(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                filterDebtOnly
                  ? 'bg-brass text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>With Udhar / Debt Only</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Customer List Table (Desktop) & Cards (Mobile) */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex justify-center items-center text-xs text-ink-muted">
              <RefreshCw className="w-5 h-5 animate-spin text-teal mr-2" />
              Loading customer directory...
            </div>
          ) : displayedCustomers.length === 0 ? (
            <div className="py-12 text-center text-ink-muted space-y-2">
              <Users className="w-10 h-10 mx-auto text-ink-muted/40" />
              <div className="text-sm font-semibold text-ink">No customers found</div>
              <p className="text-xs">
                {filterDebtOnly
                  ? 'No clients with outstanding balances.'
                  : 'Add your first customer to begin issuing wallpaper invoices.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">City / Address</th>
                      <th className="py-3 px-4">Outstanding (Udhar)</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-borderLight">
                    {displayedCustomers.map((c) => (
                      <tr key={c._id} className="hover:bg-paper transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-teal">{c.code}</td>
                        <td className="py-3 px-4 font-bold text-ink">
                          <button
                            onClick={() => handleViewLedger(c)}
                            className="hover:underline text-left"
                          >
                            {c.name}
                          </button>
                        </td>
                        <td className="py-3 px-4 space-y-0.5">
                          <div className="flex items-center gap-1.5 text-ink">
                            <Phone className="w-3 h-3 text-ink-muted" />
                            <span>{c.mobile}</span>
                          </div>
                          {c.whatsapp && (
                            <div className="flex items-center gap-1.5 text-emerald-700">
                              <MessageCircle className="w-3 h-3" />
                              <span>{c.whatsapp}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-ink-muted">
                          <div className="text-ink font-medium">{c.city || 'Lahore'}</div>
                          <div className="text-[11px] truncate max-w-xs">{c.address || '-'}</div>
                        </td>
                        <td className="py-3 px-4">
                          {(c.outstandingBalance || 0) > 0 ? (
                            <Badge variant="warning">
                              {formatCurrency(c.outstandingBalance!)}
                            </Badge>
                          ) : (
                            <Badge variant="success">Cleared (Rs. 0)</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewLedger(c)}
                            className="h-7 px-2 text-xs text-teal"
                          >
                            Ledger
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(c)}
                            className="h-7 px-2 text-xs text-ink-muted"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(c)}
                            className="h-7 px-2 text-xs text-status-danger hover:bg-status-dangerLight"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-warm-borderLight p-3 space-y-3">
                {displayedCustomers.map((c) => (
                  <div key={c._id} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-teal bg-teal-subtle px-1.5 py-0.5 rounded">
                          {c.code}
                        </span>
                        <h4 className="text-sm font-bold text-ink mt-1">{c.name}</h4>
                      </div>
                      {(c.outstandingBalance || 0) > 0 ? (
                        <Badge variant="warning" size="sm">
                          {formatCurrency(c.outstandingBalance!)}
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">Cleared</Badge>
                      )}
                    </div>

                    <div className="text-xs text-ink-muted space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-teal" />
                        <a href={`tel:${c.mobile}`} className="text-ink font-medium">
                          {c.mobile}
                        </a>
                      </div>
                      {c.address && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{c.address}, {c.city || 'Lahore'}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-warm-borderLight">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleViewLedger(c)}
                      >
                        Ledger
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleEdit(c)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={editingCustomer ? `Edit Customer (${editingCustomer.code})` : 'Add New Customer'}
        description="Enter client contact information for invoices and ledger records."
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          <Input
            label="Customer / Business Name"
            type="text"
            required
            placeholder="e.g. Mian Tariq Decorators"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Primary Mobile"
              type="text"
              required
              placeholder="0300-1234567"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            />
            <Input
              label="WhatsApp Number"
              type="text"
              placeholder="0300-1234567"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="City"
              type="text"
              placeholder="Lahore"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="Alternate Contact"
              type="text"
              placeholder="Landline or PTCL"
              value={formData.alt}
              onChange={(e) => setFormData({ ...formData, alt: e.target.value })}
            />
          </div>

          <Input
            label="Shop / Project Address"
            type="text"
            placeholder="Main Boulevard, Gulberg III"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <Input
            label="Internal Notes"
            type="text"
            placeholder="Credit limit or special discount arrangements"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-borderLight">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="teal"
              isLoading={formLoading}
            >
              {editingCustomer ? 'Update Customer' : 'Save Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Customer Ledger Drawer / Inspection Modal */}
      <Modal
        isOpen={Boolean(viewingCustomer)}
        onClose={() => setViewingCustomer(null)}
        title={`Customer Ledger — ${viewingCustomer?.name}`}
        description={`${viewingCustomer?.code} • ${viewingCustomer?.mobile} • ${viewingCustomer?.city || 'Lahore'}`}
        maxWidth="xl"
      >
        {detailsLoading ? (
          <div className="py-8 text-center text-xs text-ink-muted">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal" />
            Loading customer financial records...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-paper border border-warm-border text-center">
              <div>
                <div className="text-[11px] text-ink-muted uppercase font-semibold">Total Invoiced</div>
                <div className="text-sm md:text-base font-bold text-ink mt-0.5">
                  {formatCurrency(customerDetails?.stats.totalInvoiced || 0)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-ink-muted uppercase font-semibold">Total Paid</div>
                <div className="text-sm md:text-base font-bold text-status-success mt-0.5">
                  {formatCurrency(customerDetails?.stats.totalPaid || 0)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-ink-muted uppercase font-semibold">Outstanding (Udhar)</div>
                <div className="text-sm md:text-base font-bold text-status-warning mt-0.5">
                  {formatCurrency(customerDetails?.stats.outstandingBalance || 0)}
                </div>
              </div>
            </div>

            {/* Invoices History */}
            <div>
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal" />
                <span>Invoice History</span>
              </h4>
              {(!customerDetails?.invoices || customerDetails.invoices.length === 0) ? (
                <p className="text-xs text-ink-muted">No invoices found for this customer.</p>
              ) : (
                <div className="border border-warm-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-paper border-b border-warm-border text-ink-muted font-semibold">
                      <tr>
                        <th className="py-2 px-3">Invoice #</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Total</th>
                        <th className="py-2 px-3">Remaining</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-borderLight">
                      {customerDetails.invoices.map((inv) => (
                        <tr key={inv._id}>
                          <td className="py-2 px-3 font-semibold text-teal">{inv.number}</td>
                          <td className="py-2 px-3 text-ink-muted">{formatDate(inv.date)}</td>
                          <td className="py-2 px-3 font-medium text-ink">{formatCurrency(inv.total)}</td>
                          <td className="py-2 px-3 font-medium text-status-warning">
                            {formatCurrency(inv.remaining)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payment History */}
            <div>
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-brass-dark" />
                <span>Payment Records</span>
              </h4>
              {(!customerDetails?.payments || customerDetails.payments.length === 0) ? (
                <p className="text-xs text-ink-muted">No payments recorded yet.</p>
              ) : (
                <div className="border border-warm-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-paper border-b border-warm-border text-ink-muted font-semibold">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Amount</th>
                        <th className="py-2 px-3">Method</th>
                        <th className="py-2 px-3">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-borderLight">
                      {customerDetails.payments.map((p) => (
                        <tr key={p._id}>
                          <td className="py-2 px-3 text-ink-muted">{formatDate(p.date)}</td>
                          <td className="py-2 px-3 font-bold text-status-success">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="py-2 px-3 text-ink">{p.method}</td>
                          <td className="py-2 px-3 text-ink-muted">{p.reference || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-warm-borderLight">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingCustomer(null)}
              >
                Close Ledger
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
