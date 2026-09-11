'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
  FileText,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

import Link from 'next/link';
import { PasswordPromptModal } from '@/components/ui/PasswordPromptModal';

interface Customer {
  _id: string;
  code: string;
  name: string;
  type?: 'customer' | 'supplier';
  mobile: string;
  whatsapp?: string;
  alt?: string;
  address?: string;
  city?: string;
  notes?: string;
  dateAdded: string;
  totalPurchase?: number;
  totalPaid?: number;
  outstandingBalance?: number;
}

function CustomersContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('filter');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [partyTypeTab, setPartyTypeTab] = useState<'all' | 'customer' | 'supplier'>('all');
  const [filterDebtOnly, setFilterDebtOnly] = useState(initialFilter === 'debt');

  // Add/Edit modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'customer' as 'customer' | 'supplier',
    mobile: '',
    whatsapp: '',
    alt: '',
    address: '',
    city: 'Lahore',
    notes: '',
  });

  // Delete Password Modal
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

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
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (partyTypeTab !== 'all') params.set('type', partyTypeTab);

      const res = await fetch(`/api/customers?${params.toString()}`);
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
  }, [search, partyTypeTab]);

  // Open Edit modal
  const handleEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      type: c.type || 'customer',
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mobile.trim()) {
      toast.error('Name and Mobile number are required');
      return;
    }

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
        toast.error('Failed to save party record', { description: json.error });
        setFormLoading(false);
        return;
      }

      toast.success(editingCustomer ? 'Party updated successfully' : 'Party registered successfully');
      setIsAddOpen(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch {
      toast.error('Network Error');
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      const res = await fetch(`/api/customers/${customerToDelete._id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Cannot delete party', { description: json.error });
        return;
      }
      toast.success(`${customerToDelete.type === 'supplier' ? 'Supplier' : 'Customer'} deleted successfully`);
      setCustomerToDelete(null);
      fetchCustomers();
    } catch {
      toast.error('Failed to delete party');
    }
  };

  const displayedCustomers = filterDebtOnly
    ? customers.filter((c) => (c.outstandingBalance || 0) > 0)
    : customers;

  return (
    <AppShell title="Party Directory">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            Customers &amp; Suppliers Directory
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
            Manage clients, vendor accounts, contact details, and Udhar balances
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="teal"
            size="lg"
            onClick={() => {
              setEditingCustomer(null);
              setFormData({
                name: '',
                type: partyTypeTab === 'supplier' ? 'supplier' : 'customer',
                mobile: '',
                whatsapp: '',
                alt: '',
                address: '',
                city: 'Lahore',
                notes: '',
              });
              setIsAddOpen(true);
            }}
            leftIcon={<Plus className="w-5 h-5" />}
            className="shadow-warm"
          >
            Add Party
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="mb-6 sm:mb-8 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setPartyTypeTab('all')}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                partyTypeTab === 'all'
                  ? 'bg-ink text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              All Parties
            </button>
            <button
              onClick={() => setPartyTypeTab('customer')}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                partyTypeTab === 'customer'
                  ? 'bg-teal text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              Customers Only
            </button>
            <button
              onClick={() => setPartyTypeTab('supplier')}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                partyTypeTab === 'supplier'
                  ? 'bg-brass-dark text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              Suppliers Only
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-ink-muted" />
              <input
                type="text"
                placeholder="Search name, phone, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-h-[44px] pl-10 pr-3.5 py-2 text-sm bg-paper border border-warm-border rounded-xl text-ink font-semibold focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
            </div>

            <button
              onClick={() => setFilterDebtOnly(!filterDebtOnly)}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                filterDebtOnly
                  ? 'bg-status-danger text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Udhar Only</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Customer List Table (Desktop) & Cards (Mobile) */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 flex justify-center items-center text-sm text-ink-muted">
              <RefreshCw className="w-5 h-5 animate-spin text-teal mr-2" />
              Loading directory...
            </div>
          ) : displayedCustomers.length === 0 ? (
            <div className="py-20 text-center text-ink-muted space-y-3">
              <Users className="w-12 h-12 mx-auto text-ink-muted/40" />
              <div className="text-base font-bold text-ink">No parties found</div>
              <p className="text-xs sm:text-sm max-w-sm mx-auto">
                {filterDebtOnly
                  ? 'No accounts with outstanding balances.'
                  : 'Add your first customer or supplier to begin recording transactions.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-bold text-xs">
                    <tr>
                      <th className="py-3.5 px-4">Code</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Name</th>
                      <th className="py-3.5 px-4">Contact</th>
                      <th className="py-3.5 px-4">City / Address</th>
                      <th className="py-3.5 px-4 text-right">Total Purchases</th>
                      <th className="py-3.5 px-4 text-right">Outstanding (Udhar)</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-borderLight">
                    {displayedCustomers.map((c) => (
                      <tr key={c._id} className="hover:bg-paper transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-teal">
                          <Link href={`/customers/${c._id}`} className="hover:underline">
                            {c.code}
                          </Link>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                              c.type === 'supplier'
                                ? 'bg-brass-light text-brass-dark'
                                : 'bg-teal-subtle text-teal-dark'
                            }`}
                          >
                            {c.type === 'supplier' ? 'Supplier' : 'Customer'}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-ink">
                          <Link
                            href={`/customers/${c._id}`}
                            className="hover:text-teal hover:underline text-left block"
                          >
                            {c.name}
                          </Link>
                        </td>
                        <td className="py-4 px-4 space-y-1">
                          <div className="flex items-center gap-1.5 text-ink font-semibold">
                            <Phone className="w-3.5 h-3.5 text-ink-muted" />
                            <span>{c.mobile}</span>
                          </div>
                          {c.whatsapp && (
                            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>{c.whatsapp}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-ink-muted">
                          <div className="text-ink font-semibold">{c.city || 'Lahore'}</div>
                          <div className="text-xs truncate max-w-xs">{c.address || '-'}</div>
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-ink">
                          {formatCurrency(c.totalPurchase || 0)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {(c.outstandingBalance || 0) > 0 ? (
                            <span className="inline-block px-3 py-1 rounded-lg bg-red-50 text-status-danger font-bold text-xs border border-red-200">
                              {formatCurrency(c.outstandingBalance!)}
                            </span>
                          ) : (c.outstandingBalance || 0) < 0 ? (
                            <span className="inline-block px-3 py-1 rounded-lg bg-green-50 text-status-success font-bold text-xs border border-green-200">
                              Advance: {formatCurrency(Math.abs(c.outstandingBalance!))}
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-surface text-ink-muted font-medium text-xs">
                              Cleared (Rs. 0)
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <Link href={`/customers/${c._id}`}>
                            <Button variant="ghost" size="sm" className="min-h-[34px] px-2.5 text-xs text-teal font-semibold">
                              Profile
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewLedger(c)}
                            className="min-h-[34px] px-2.5 text-xs text-ink-muted"
                          >
                            Quick View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(c)}
                            className="w-8 h-8 p-0 rounded-lg text-ink-muted hover:text-ink"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCustomerToDelete(c)}
                            className="w-8 h-8 p-0 rounded-lg text-status-danger hover:bg-status-dangerLight"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-warm-borderLight p-4 space-y-4">
                {displayedCustomers.map((c) => (
                  <div key={c._id} className="pt-4 first:pt-0 space-y-3 bg-paper p-4 rounded-2xl border border-warm-border shadow-warm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-teal bg-teal-subtle px-2 py-0.5 rounded-lg">
                            {c.code}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              c.type === 'supplier'
                                ? 'bg-brass-light text-brass-dark'
                                : 'bg-teal-subtle text-teal-dark'
                            }`}
                          >
                            {c.type === 'supplier' ? 'Supplier' : 'Customer'}
                          </span>
                        </div>
                        <Link href={`/customers/${c._id}`}>
                          <h4 className="text-base font-bold text-ink mt-1.5 hover:text-teal">{c.name}</h4>
                        </Link>
                      </div>
                      {(c.outstandingBalance || 0) > 0 ? (
                        <span className="px-2.5 py-1 rounded-lg bg-red-50 text-status-danger font-bold text-xs border border-red-200 shrink-0">
                          {formatCurrency(c.outstandingBalance!)}
                        </span>
                      ) : (c.outstandingBalance || 0) < 0 ? (
                        <span className="px-2.5 py-1 rounded-lg bg-green-50 text-status-success font-bold text-xs border border-green-200 shrink-0">
                          Adv {formatCurrency(Math.abs(c.outstandingBalance!))}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-muted shrink-0">Cleared</span>
                      )}
                    </div>

                    <div className="text-sm text-ink-muted space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-teal shrink-0" />
                        <a href={`tel:${c.mobile}`} className="text-ink font-semibold">
                          {c.mobile}
                        </a>
                      </div>
                      {c.address && (
                        <div className="flex items-center gap-2 text-xs">
                          <MapPin className="w-4 h-4 text-ink-muted shrink-0" />
                          <span>{c.address}, {c.city || 'Lahore'}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-warm-borderLight flex items-center justify-between gap-2">
                      <Link href={`/customers/${c._id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full min-h-[38px] text-xs font-semibold">
                          Profile &amp; Ledger
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(c)}
                        className="w-9 h-9 p-0 rounded-xl text-ink-muted hover:text-ink"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCustomerToDelete(c)}
                        className="w-9 h-9 p-0 rounded-xl text-status-danger hover:bg-status-dangerLight"
                      >
                        <Trash2 className="w-4 h-4" />
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
        title={editingCustomer ? `Edit Party (${editingCustomer.code})` : 'Add New Party'}
        description="Enter contact and categorization details."
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Party Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'customer' })}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                  formData.type === 'customer'
                    ? 'border-teal bg-teal-subtle text-teal-dark font-bold'
                    : 'border-warm-border bg-paper text-ink-muted'
                }`}
              >
                Customer (Grahak)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'supplier' })}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                  formData.type === 'supplier'
                    ? 'border-brass bg-brass-light text-brass-dark font-bold'
                    : 'border-warm-border bg-paper text-ink-muted'
                }`}
              >
                Supplier (Vendor)
              </button>
            </div>
          </div>

          <Input
            label="Party / Business Name"
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
              {editingCustomer ? 'Update Party' : 'Save Party'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Password Modal */}
      <PasswordPromptModal
        isOpen={Boolean(customerToDelete)}
        onClose={() => setCustomerToDelete(null)}
        title={`Authorize Deletion: ${customerToDelete?.name}`}
        actionDescription={`Permanently delete ${customerToDelete?.type === 'supplier' ? 'supplier' : 'customer'} ${customerToDelete?.code}. This will log an activity event.`}
        protectionType="delete"
        onAuthorized={confirmDeleteCustomer}
      />

      {/* Customer Ledger Quick View Modal */}
      <Modal
        isOpen={Boolean(viewingCustomer)}
        onClose={() => setViewingCustomer(null)}
        title={`Ledger Quick View — ${viewingCustomer?.name}`}
        description={`${viewingCustomer?.code} • ${viewingCustomer?.mobile} • ${viewingCustomer?.city || 'Lahore'}`}
        maxWidth="xl"
      >
        {detailsLoading ? (
          <div className="py-8 text-center text-xs text-ink-muted">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal" />
            Loading financial records...
          </div>
        ) : (
          <div className="space-y-6">
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
                <span>Recent Invoices</span>
              </h4>
              {(!customerDetails?.invoices || customerDetails.invoices.length === 0) ? (
                <p className="text-xs text-ink-muted">No invoices found for this party.</p>
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
                          <td className="py-2 px-3 font-semibold text-teal">
                            <Link href={`/invoices/${inv._id}`} className="hover:underline">
                              {inv.number}
                            </Link>
                          </td>
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

            <div className="flex justify-between items-center pt-4 border-t border-warm-borderLight">
              {viewingCustomer && (
                <Link href={`/customers/${viewingCustomer._id}`}>
                  <Button variant="teal" size="sm">
                    Open Full Profile &amp; Statement
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingCustomer(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}

export default function CustomersPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-xs text-ink-muted">
          Loading party directory...
        </div>
      }
    >
      <CustomersContent />
    </React.Suspense>
  );
}
