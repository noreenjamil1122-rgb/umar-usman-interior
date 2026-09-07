'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime } from '@/lib/utils';
import {
  Building2,
  FileText,
  Shield,
  Database,
  Save,
  Lock,
  Sparkles,
  Trash2,
  RefreshCw,
  Clock,
  Download,
  Mail,
  User,
  Key,
} from 'lucide-react';
import { toast } from 'sonner';

interface ActivityLogItem {
  _id: string;
  action?: string;
  type?: string;
  detail: string;
  qty?: number;
  userRole?: string;
  userName?: string;
  createdAt?: string;
  dateTime?: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<
    'business' | 'invoice' | 'security' | 'activity' | 'backup' | 'account'
  >('business');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    businessName: 'Umar Usman Interior',
    logo: '',
    address: 'College road near five star naan shop, Lahore Punjab Pakistan',
    phone: '0300-4131532',
    whatsapp: '0307-4333227',
    email: 'info@umarusmanwallpaper.com',
    ntn: '',
    strn: '',
    invoicePrefix: 'INV',
    defaultDiscount: 0,
    taxOn: false,
    taxRate: 0,
    footer: 'Thank you for choosing Umar Usman Interior. Premium Wallpapers & Interior Solutions.',
    sellerName: 'Umar Nawaz',
    sellerContact: '0300-4131532',
    terms: 'Custom',
    invoiceInstructions: `1. Payment terms 100% advance in cash.
2. All items are imported, hence won't be reserved for anyone.
3. 10% handling shall be charged on returns.
4. We do not accept returns of by order products.
5. Wall preparation is mandatory for wall paper installation.
6. Site should be clear and clean before installation.
7. All complaints will be charged after installation.
8. Client is responsible to provide ladder, scaffolding or any necessary item for installation.`,
    emailjsServiceId: '',
    emailjsTemplateId: '',
    emailjsPublicKey: '',
    emailjsToEmail: '',
    hasDeletePassword: false,
    hasHidePassword: false,
    hasPaymentPassword: false,
    hasSupplierPassword: false,
  });

  // User session info
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('admin');

  // Security password fields
  const [pwdType, setPwdType] = useState<'delete' | 'hide' | 'payment' | 'supplier'>('delete');
  const [newPassword, setNewPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  // Activity logs
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Change account password state
  const [currentAccountPwd, setCurrentAccountPwd] = useState('');
  const [newAccountPwd, setNewAccountPwd] = useState('');
  const [confirmAccountPwd, setConfirmAccountPwd] = useState('');
  const [acctPwdLoading, setAcctPwdLoading] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [sRes, aRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/auth/session'),
      ]);

      const [sData, aData] = await Promise.all([sRes.json(), aRes.json()]);

      if (sData.success && sData.data) {
        setSettings((prev) => ({ ...prev, ...sData.data }));
      }
      if (aData.authenticated && aData.user) {
        setUserEmail(aData.user.email || '');
        setUserRole(aData.user.role || 'admin');
      }
    } catch {
      toast.error('Could not load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/activity-log');
      const json = await res.json();
      if (json.success) {
        setActivityLogs(json.data || []);
      }
    } catch {
      toast.error('Could not load activity log');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'activity') {
      fetchActivityLogs();
    }
  }, [activeTab]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Failed to save settings', { description: json.error });
        setSaving(false);
        return;
      }

      toast.success('Settings update ho gayi hain');
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: pwdType, newPassword }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Password update failed', { description: json.error });
        setPwdLoading(false);
        return;
      }

      toast.success(`${pwdType.toUpperCase()} password set successfully`);
      setNewPassword('');
      fetchSettings();
    } catch {
      toast.error('Failed to update password');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleRemovePassword = async (type: 'delete' | 'hide' | 'payment' | 'supplier') => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, newPassword: '' }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`${type.toUpperCase()} protection removed`);
        fetchSettings();
      }
    } catch {
      toast.error('Failed to remove password protection');
    }
  };

  const handleChangeAccountPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAccountPwd !== confirmAccountPwd) {
      toast.error('New passwords do not match');
      return;
    }

    setAcctPwdLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentAccountPwd,
          newPassword: newAccountPwd,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Password change failed', { description: json.error });
        setAcctPwdLoading(false);
        return;
      }

      toast.success('Account password updated successfully');
      setCurrentAccountPwd('');
      setNewAccountPwd('');
      setConfirmAccountPwd('');
    } catch {
      toast.error('Network error during password update');
    } finally {
      setAcctPwdLoading(false);
    }
  };

  const exportActivityLogCsv = () => {
    if (activityLogs.length === 0) {
      toast.info('No activity logs to export');
      return;
    }

    const headers = ['Date & Time', 'Action', 'Quantity', 'Detail', 'Role', 'User'];
    const rows = activityLogs.map((log) => {
      const actionText = log.type || log.action || 'Activity';
      const dateVal = log.dateTime || log.createdAt ? new Date(log.dateTime || log.createdAt || '').toLocaleString() : '';
      const detailVal = (log.detail || '').replace(/"/g, '""');
      return [
        `"${dateVal}"`,
        `"${actionText.replace(/"/g, '""')}"`,
        log.qty !== undefined && log.qty !== null ? log.qty : '',
        `"${detailVal}"`,
        `"${(log.userRole || 'admin').replace(/"/g, '""')}"`,
        `"${(log.userName || 'Admin').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Activity_Log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell title="Settings">
      {/* Top Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
          Settings &amp; Administration
        </h1>
        <p className="text-xs md:text-sm text-ink-muted">
          Manage business identity, security passwords, audit trail, and backups
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-warm-border">
        {[
          { id: 'business', label: 'Business Profile', icon: Building2 },
          { id: 'invoice', label: 'Invoice & Terms', icon: FileText },
          { id: 'security', label: 'Security Passwords', icon: Shield },
          { id: 'activity', label: 'Activity Audit Log', icon: Clock },
          { id: 'backup', label: 'Backup & Export', icon: Download },
          { id: 'account', label: 'Account & Login', icon: User },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-teal text-white shadow-warm'
                  : 'text-ink-muted hover:text-ink hover:bg-paper'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-24 text-center text-xs text-ink-muted flex items-center justify-center">
          <RefreshCw className="w-5 h-5 animate-spin text-teal mr-2" />
          Loading configuration...
        </div>
      ) : (
        <div className="max-w-4xl">
          {/* TAB 1: BUSINESS PROFILE */}
          {activeTab === 'business' && (
            <Card>
              <CardHeader>
                <CardTitle>Business Profile</CardTitle>
                <CardDescription>Primary trading name and contact info displayed on printouts</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <Input
                    label="Business Name"
                    type="text"
                    required
                    value={settings.businessName}
                    onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Seller / Owner Name"
                      type="text"
                      required
                      placeholder="e.g. Umar Nawaz"
                      value={settings.sellerName}
                      onChange={(e) => setSettings({ ...settings, sellerName: e.target.value })}
                    />
                    <Input
                      label="Seller Contact"
                      type="text"
                      required
                      placeholder="0300-4131532"
                      value={settings.sellerContact}
                      onChange={(e) => setSettings({ ...settings, sellerContact: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Phone"
                      type="text"
                      placeholder="0300-4131532"
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    />
                    <Input
                      label="WhatsApp"
                      type="text"
                      placeholder="0307-4333227"
                      value={settings.whatsapp}
                      onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                    />
                  </div>

                  <Input
                    label="Email"
                    type="email"
                    placeholder="info@umarusmanwallpaper.com"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  />

                  <Input
                    label="Shop / Warehouse Address"
                    type="text"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="NTN (Tax Number)"
                      type="text"
                      value={settings.ntn}
                      onChange={(e) => setSettings({ ...settings, ntn: e.target.value })}
                    />
                    <Input
                      label="STRN (Sales Tax Number)"
                      type="text"
                      value={settings.strn}
                      onChange={(e) => setSettings({ ...settings, strn: e.target.value })}
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" variant="teal" isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
                      Save Business Info
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: INVOICE & TERMS */}
          {activeTab === 'invoice' && (
            <Card>
              <CardHeader>
                <CardTitle>Invoice Template &amp; Golden Rules</CardTitle>
                <CardDescription>Default terms, tax rates, and printable instructions</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="Invoice Prefix"
                      type="text"
                      value={settings.invoicePrefix}
                      onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                    />
                    <Input
                      label="Default Discount (%)"
                      type="number"
                      min="0"
                      max="100"
                      value={settings.defaultDiscount}
                      onChange={(e) =>
                        setSettings({ ...settings, defaultDiscount: Number(e.target.value) })
                      }
                    />
                    <Input
                      label="Tax Rate (%)"
                      type="number"
                      min="0"
                      value={settings.taxRate}
                      onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                      Quotation Notes &amp; 8 Instructions
                    </label>
                    <textarea
                      rows={9}
                      value={settings.invoiceInstructions}
                      onChange={(e) => setSettings({ ...settings, invoiceInstructions: e.target.value })}
                      className="w-full rounded-lg border border-warm-border bg-paper p-3 text-xs text-ink font-mono focus:border-teal focus:outline-none"
                    />
                  </div>

                  <Input
                    label="Footer Disclaimer"
                    type="text"
                    value={settings.footer}
                    onChange={(e) => setSettings({ ...settings, footer: e.target.value })}
                  />

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" variant="teal" isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
                      Save Invoice Settings
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: SECURITY PASSWORDS (4 PROTECTIONS) */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Admin Password Protections</CardTitle>
                <CardDescription>
                  Configure separate passwords to restrict workers from deleting data, unmasking sales figures, updating payments, or viewing supplier invoices.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 4 Protections Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                  {/* 1. Delete */}
                  <div className="p-3 bg-paper rounded-xl border border-warm-border space-y-1.5">
                    <div className="font-semibold text-ink">Delete Protection</div>
                    <div>
                      {settings.hasDeletePassword ? (
                        <Badge variant="success" size="sm">Active</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Not Set</Badge>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPwdType('delete')}
                      className="text-[10px] text-teal hover:underline font-semibold block mx-auto pt-0.5"
                    >
                      {settings.hasDeletePassword ? 'Change Password' : 'Set Password'}
                    </button>
                    {settings.hasDeletePassword && (
                      <button
                        type="button"
                        onClick={() => handleRemovePassword('delete')}
                        className="text-[10px] text-status-danger hover:underline block mx-auto"
                      >
                        Remove Protection
                      </button>
                    )}
                  </div>

                  {/* 2. Hide */}
                  <div className="p-3 bg-paper rounded-xl border border-warm-border space-y-1.5">
                    <div className="font-semibold text-ink">Hide Figures</div>
                    <div>
                      {settings.hasHidePassword ? (
                        <Badge variant="success" size="sm">Active</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Not Set</Badge>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPwdType('hide')}
                      className="text-[10px] text-teal hover:underline font-semibold block mx-auto pt-0.5"
                    >
                      {settings.hasHidePassword ? 'Change Password' : 'Set Password'}
                    </button>
                    {settings.hasHidePassword && (
                      <button
                        type="button"
                        onClick={() => handleRemovePassword('hide')}
                        className="text-[10px] text-status-danger hover:underline block mx-auto"
                      >
                        Remove Protection
                      </button>
                    )}
                  </div>

                  {/* 3. Payment Section & Edit Lock */}
                  <div className="p-3 bg-paper rounded-xl border border-warm-border space-y-1.5">
                    <div className="font-semibold text-ink">Payment Section Lock</div>
                    <div>
                      {settings.hasPaymentPassword ? (
                        <Badge variant="success" size="sm">Active</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Not Set</Badge>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPwdType('payment')}
                      className="text-[10px] text-teal hover:underline font-semibold block mx-auto pt-0.5"
                    >
                      {settings.hasPaymentPassword ? 'Change Password' : 'Set Password'}
                    </button>
                    {settings.hasPaymentPassword && (
                      <button
                        type="button"
                        onClick={() => handleRemovePassword('payment')}
                        className="text-[10px] text-status-danger hover:underline block mx-auto"
                      >
                        Remove Protection
                      </button>
                    )}
                  </div>

                  {/* 4. Supplier Lock */}
                  <div className="p-3 bg-paper rounded-xl border border-warm-border space-y-1.5">
                    <div className="font-semibold text-ink">Supplier Lock</div>
                    <div>
                      {settings.hasSupplierPassword ? (
                        <Badge variant="success" size="sm">Active</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Not Set</Badge>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPwdType('supplier')}
                      className="text-[10px] text-teal hover:underline font-semibold block mx-auto pt-0.5"
                    >
                      {settings.hasSupplierPassword ? 'Change Password' : 'Set Password'}
                    </button>
                    {settings.hasSupplierPassword && (
                      <button
                        type="button"
                        onClick={() => handleRemovePassword('supplier')}
                        className="text-[10px] text-status-danger hover:underline block mx-auto"
                      >
                        Remove Protection
                      </button>
                    )}
                  </div>
                </div>

                {/* Password Setting Form */}
                <form onSubmit={handleUpdatePassword} className="space-y-4 pt-4 border-t border-warm-borderLight">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
                      Choose Protection to Set / Change
                    </label>
                    <select
                      value={pwdType}
                      onChange={(e) =>
                        setPwdType(e.target.value as 'delete' | 'hide' | 'payment' | 'supplier')
                      }
                      className="w-full rounded-lg border border-warm-border bg-paper px-3 py-2 text-sm text-ink font-semibold focus:border-teal focus:outline-none"
                    >
                      <option value="delete">1. Delete Protection (Deletions of books, wallpapers, customers, invoices)</option>
                      <option value="hide">2. Hide Figures Protection (Unmask daily sales and payment collections)</option>
                      <option value="payment">3. Payment Section & Edit Lock (Restricts editing, altering or deleting invoice payments)</option>
                      <option value="supplier">4. Supplier Invoices Lock (Gate vendor billing view)</option>
                    </select>
                  </div>

                  <Input
                    label="New Password (min 4 characters)"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                  />

                  <div className="flex justify-end">
                    <Button type="submit" variant="teal" isLoading={pwdLoading}>
                      Save Security Password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: ACTIVITY AUDIT LOG */}
          {activeTab === 'activity' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Activity Audit Trail</CardTitle>
                    <CardDescription>
                      Immutable record of stock reductions, deletions, and administrative actions
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportActivityLogCsv}
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Export Log (CSV)
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {logsLoading ? (
                  <div className="py-16 text-center text-xs text-ink-muted flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 animate-spin text-teal mr-2" />
                    Loading activity records...
                  </div>
                ) : activityLogs.length === 0 ? (
                  <div className="py-16 text-center text-xs text-ink-muted">
                    No activity logs recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">Date &amp; Time</th>
                          <th className="py-2.5 px-4">Action</th>
                          <th className="py-2.5 px-4">Description</th>
                          <th className="py-2.5 px-4 text-center">Qty</th>
                          <th className="py-2.5 px-4 text-right">User / Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-warm-borderLight">
                        {activityLogs.map((log) => {
                          const actionText = log.type || log.action || 'Activity';
                          const lowerAction = actionText.toLowerCase();
                          const isDelete = lowerAction.includes('delete');
                          const isMinus = lowerAction.includes('minus');

                          return (
                            <tr key={log._id} className="hover:bg-paper transition-colors">
                              <td className="py-2.5 px-4 text-ink-muted whitespace-nowrap">
                                {formatDateTime(log.dateTime || log.createdAt || '')}
                              </td>
                              <td className="py-2.5 px-4">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    isDelete
                                      ? 'bg-red-100 text-status-danger'
                                      : isMinus
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-teal-subtle text-teal'
                                  }`}
                                >
                                  {actionText.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-ink font-medium max-w-xs truncate">
                                {log.detail}
                              </td>
                              <td className="py-2.5 px-4 text-center font-bold">
                                {log.qty !== undefined && log.qty !== null ? log.qty : '-'}
                              </td>
                              <td className="py-2.5 px-4 text-right text-ink-muted">
                                <span className="font-semibold text-ink">{log.userName || 'Admin'}</span>
                                <span className="text-[10px] ml-1">({log.userRole || 'admin'})</span>
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
          )}

          {/* TAB 5: BACKUP & EXPORT */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>CSV Data Exports</CardTitle>
                  <CardDescription>
                    Download individual spreadsheets of all records for offline bookkeeping
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a
                      href="/api/export/customers"
                      download
                      className="p-4 rounded-xl border border-warm-border bg-paper hover:bg-paper-light flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="font-bold text-xs text-ink">Customers &amp; Suppliers</div>
                        <div className="text-[11px] text-ink-muted">Names, mobile, address, udhar balances</div>
                      </div>
                      <Download className="w-4 h-4 text-teal shrink-0" />
                    </a>

                    <a
                      href="/api/export/products"
                      download
                      className="p-4 rounded-xl border border-warm-border bg-paper hover:bg-paper-light flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="font-bold text-xs text-ink">Wallpaper Inventory</div>
                        <div className="text-[11px] text-ink-muted">WP#, book, prices, stock roll counts</div>
                      </div>
                      <Download className="w-4 h-4 text-teal shrink-0" />
                    </a>

                    <a
                      href="/api/export/invoices"
                      download
                      className="p-4 rounded-xl border border-warm-border bg-paper hover:bg-paper-light flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="font-bold text-xs text-ink">Invoices &amp; Bills</div>
                        <div className="text-[11px] text-ink-muted">Quotation numbers, totals, paid, remaining</div>
                      </div>
                      <Download className="w-4 h-4 text-teal shrink-0" />
                    </a>

                    <a
                      href="/api/export/payments"
                      download
                      className="p-4 rounded-xl border border-warm-border bg-paper hover:bg-paper-light flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="font-bold text-xs text-ink">Payment Records</div>
                        <div className="text-[11px] text-ink-muted">Dates, amounts, methods, references</div>
                      </div>
                      <Download className="w-4 h-4 text-teal shrink-0" />
                    </a>

                    <a
                      href="/api/export/stock-history"
                      download
                      className="p-4 rounded-xl border border-warm-border bg-paper hover:bg-paper-light flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="font-bold text-xs text-ink">Stock Audit History</div>
                        <div className="text-[11px] text-ink-muted">Every sold, returned, and adjusted roll event</div>
                      </div>
                      <Download className="w-4 h-4 text-teal shrink-0" />
                    </a>

                    <a
                      href="/api/export/activity-log"
                      download
                      className="p-4 rounded-xl border border-warm-border bg-paper hover:bg-paper-light flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="font-bold text-xs text-ink">Activity Log CSV</div>
                        <div className="text-[11px] text-ink-muted">Administrative audit entries and reductions</div>
                      </div>
                      <Download className="w-4 h-4 text-teal shrink-0" />
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* EmailJS Integration Card */}
              <Card>
                <CardHeader>
                  <CardTitle>EmailJS Automated Summaries</CardTitle>
                  <CardDescription>
                    Configure email notifications for daily summaries and system alerts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveSettings} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="EmailJS Service ID"
                        type="text"
                        placeholder="service_xxxxx"
                        value={settings.emailjsServiceId}
                        onChange={(e) => setSettings({ ...settings, emailjsServiceId: e.target.value })}
                      />
                      <Input
                        label="EmailJS Template ID"
                        type="text"
                        placeholder="template_xxxxx"
                        value={settings.emailjsTemplateId}
                        onChange={(e) => setSettings({ ...settings, emailjsTemplateId: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="EmailJS Public Key"
                        type="text"
                        placeholder="user_xxxxxxx"
                        value={settings.emailjsPublicKey}
                        onChange={(e) => setSettings({ ...settings, emailjsPublicKey: e.target.value })}
                      />
                      <Input
                        label="Recipient Email Address"
                        type="email"
                        placeholder="owner@umarusman.com"
                        value={settings.emailjsToEmail}
                        onChange={(e) => setSettings({ ...settings, emailjsToEmail: e.target.value })}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" variant="teal" isLoading={saving}>
                        Save EmailJS Config
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 6: ACCOUNT & LOGIN */}
          {activeTab === 'account' && (
            <Card>
              <CardHeader>
                <CardTitle>Account Credentials</CardTitle>
                <CardDescription>Your logged-in identity and password updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-paper rounded-xl border border-warm-border text-xs space-y-1">
                  <div className="text-ink-muted uppercase font-semibold">Current Login Email</div>
                  <div className="text-sm font-bold text-ink">{userEmail || 'admin@umarusman.com'}</div>
                  <div className="text-[11px] text-teal font-semibold capitalize mt-0.5">
                    Role: {userRole}
                  </div>
                </div>

                <form onSubmit={handleChangeAccountPassword} className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                    Change Account Password
                  </h4>

                  <Input
                    label="Current Password"
                    type="password"
                    required
                    value={currentAccountPwd}
                    onChange={(e) => setCurrentAccountPwd(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="New Password (min 6 characters)"
                      type="password"
                      required
                      value={newAccountPwd}
                      onChange={(e) => setNewAccountPwd(e.target.value)}
                      leftIcon={<Key className="w-4 h-4" />}
                    />
                    <Input
                      label="Confirm New Password"
                      type="password"
                      required
                      value={confirmAccountPwd}
                      onChange={(e) => setConfirmAccountPwd(e.target.value)}
                      leftIcon={<Key className="w-4 h-4" />}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" variant="teal" isLoading={acctPwdLoading}>
                      Update Account Password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}
