'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Settings as SettingsIcon,
  Building2,
  FileText,
  Mail,
  Shield,
  Database,
  Save,
  Lock,
  Sparkles,
  Trash2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'business' | 'invoice' | 'emailjs' | 'security' | 'demo'>('business');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    businessName: 'Umar Usman Interior',
    logo: '',
    address: 'Main Market, Lahore, Pakistan',
    phone: '',
    whatsapp: '',
    email: '',
    ntn: '',
    strn: '',
    invoicePrefix: 'INV',
    defaultDiscount: 0,
    taxOn: false,
    taxRate: 0,
    footer: 'Thank you for choosing Umar Usman Interior. Premium Wallpapers & Interior Solutions.',
    sellerName: 'Umar Usman',
    invoiceInstructions: 'Goods once cut or installed will not be exchanged or returned. Claims valid within 7 days.',
    emailjsServiceId: '',
    emailjsTemplateId: '',
    emailjsPublicKey: '',
    emailjsToEmail: '',
    hasDeletePassword: false,
    hasHidePassword: false,
    hasPaymentPassword: false,
  });

  // Password fields
  const [pwdType, setPwdType] = useState<'delete' | 'hide' | 'payment'>('payment');
  const [newPassword, setNewPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  // Demo state
  const [demoLoading, setDemoLoading] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (json.success && json.data) {
        setSettings((prev) => ({ ...prev, ...json.data }));
      }
    } catch {
      toast.error('Could not load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

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

  const handleSeedDemo = async () => {
    setDemoLoading(true);
    try {
      const res = await fetch('/api/settings/demo', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Could not seed demo data', { description: json.error });
        return;
      }
      toast.success(json.message);
    } catch {
      toast.error('Failed to seed demo');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleClearDemo = async () => {
    if (!confirm('Are you sure you want to remove demo records? Real business data will be safely kept.')) {
      return;
    }
    setDemoLoading(true);
    try {
      const res = await fetch('/api/settings/demo', { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Could not clear demo data', { description: json.error });
        return;
      }
      toast.success(json.message);
    } catch {
      toast.error('Failed to clear demo');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <AppShell title="Business Settings">
      {/* Top Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
          System Configuration &amp; Business Profile
        </h1>
        <p className="text-xs md:text-sm text-ink-muted">
          Customize invoice templates, EmailJS notifications, security passwords, and demo data
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-warm-border">
        <button
          onClick={() => setActiveTab('business')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'business'
              ? 'bg-teal text-white shadow-warm'
              : 'text-ink-muted hover:text-ink hover:bg-paper-dark/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Business Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('invoice')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'invoice'
              ? 'bg-teal text-white shadow-warm'
              : 'text-ink-muted hover:text-ink hover:bg-paper-dark/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Invoice &amp; Tax</span>
        </button>

        <button
          onClick={() => setActiveTab('emailjs')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'emailjs'
              ? 'bg-teal text-white shadow-warm'
              : 'text-ink-muted hover:text-ink hover:bg-paper-dark/60'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>EmailJS Setup</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'security'
              ? 'bg-teal text-white shadow-warm'
              : 'text-ink-muted hover:text-ink hover:bg-paper-dark/60'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Security Passwords</span>
        </button>

        <button
          onClick={() => setActiveTab('demo')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'demo'
              ? 'bg-teal text-white shadow-warm'
              : 'text-ink-muted hover:text-ink hover:bg-paper-dark/60'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Demo Data</span>
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-xs text-ink-muted flex items-center justify-center">
          <RefreshCw className="w-5 h-5 animate-spin text-teal mr-2" />
          Loading settings...
        </div>
      ) : (
        <div className="max-w-3xl">
          {/* Business Profile Tab */}
          {activeTab === 'business' && (
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Displayed on customer invoices and reports</CardDescription>
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
                      label="Phone"
                      type="text"
                      placeholder="0300-1234567"
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    />
                    <Input
                      label="WhatsApp"
                      type="text"
                      placeholder="0300-1234567"
                      value={settings.whatsapp}
                      onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Email"
                      type="email"
                      placeholder="info@umarusman.com"
                      value={settings.email}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    />
                    <Input
                      label="Address"
                      type="text"
                      placeholder="Main Market, Lahore, Pakistan"
                      value={settings.address}
                      onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="NTN (Tax Number)"
                      type="text"
                      placeholder="National Tax Number"
                      value={settings.ntn}
                      onChange={(e) => setSettings({ ...settings, ntn: e.target.value })}
                    />
                    <Input
                      label="STRN (Sales Tax Number)"
                      type="text"
                      placeholder="Sales Tax Registration Number"
                      value={settings.strn}
                      onChange={(e) => setSettings({ ...settings, strn: e.target.value })}
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" variant="teal" isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
                      Save Profile
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Invoice & Tax Tab */}
          {activeTab === 'invoice' && (
            <Card>
              <CardHeader>
                <CardTitle>Invoice Configuration</CardTitle>
                <CardDescription>Default numbering, discounts, and print terms</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="Invoice Prefix"
                      type="text"
                      required
                      value={settings.invoicePrefix}
                      onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                    />
                    <Input
                      label="Default Discount (%)"
                      type="number"
                      min="0"
                      max="100"
                      value={settings.defaultDiscount}
                      onChange={(e) => setSettings({ ...settings, defaultDiscount: Number(e.target.value) })}
                    />
                    <Input
                      label="Seller / Signee Name"
                      type="text"
                      value={settings.sellerName}
                      onChange={(e) => setSettings({ ...settings, sellerName: e.target.value })}
                    />
                  </div>

                  <div className="p-4 bg-paper rounded-xl border border-warm-border space-y-3">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-ink">
                      <input
                        type="checkbox"
                        checked={settings.taxOn}
                        onChange={(e) => setSettings({ ...settings, taxOn: e.target.checked })}
                        className="rounded text-teal focus:ring-teal"
                      />
                      <span>Enable Tax by Default on New Invoices</span>
                    </label>

                    {settings.taxOn && (
                      <div className="max-w-xs">
                        <Input
                          label="Default Tax Rate (%)"
                          type="number"
                          min="0"
                          value={settings.taxRate}
                          onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })}
                        />
                      </div>
                    )}
                  </div>

                  <Input
                    label="Footer Brand Message"
                    type="text"
                    value={settings.footer}
                    onChange={(e) => setSettings({ ...settings, footer: e.target.value })}
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
                      Invoice Instructions / Return Terms
                    </label>
                    <textarea
                      rows={3}
                      value={settings.invoiceInstructions}
                      onChange={(e) => setSettings({ ...settings, invoiceInstructions: e.target.value })}
                      className="w-full rounded-lg border border-warm-border bg-paper-light px-3 py-2 text-xs text-ink focus:border-teal focus:outline-none"
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" variant="teal" isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
                      Save Invoice Settings
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* EmailJS Tab */}
          {activeTab === 'emailjs' && (
            <Card>
              <CardHeader>
                <CardTitle>EmailJS Integration</CardTitle>
                <CardDescription>
                  Configure browser email delivery for daily summaries and CSV modules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSettings} className="space-y-4">
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

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" variant="teal" isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
                      Save EmailJS Configuration
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Security Passwords Tab */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Sensitive Action Passwords</CardTitle>
                <CardDescription>
                  Require separate bcrypt-verified password confirmation for high-stakes actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-3 bg-paper rounded-xl border border-warm-border">
                    <div className="text-ink-muted">Payment Password</div>
                    <div className="font-bold text-ink mt-1">
                      {settings.hasPaymentPassword ? (
                        <Badge variant="success" size="sm">Configured</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Not Set</Badge>
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-paper rounded-xl border border-warm-border">
                    <div className="text-ink-muted">Delete Data Password</div>
                    <div className="font-bold text-ink mt-1">
                      {settings.hasDeletePassword ? (
                        <Badge variant="success" size="sm">Configured</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Not Set</Badge>
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-paper rounded-xl border border-warm-border">
                    <div className="text-ink-muted">Hide Data Password</div>
                    <div className="font-bold text-ink mt-1">
                      {settings.hasHidePassword ? (
                        <Badge variant="success" size="sm">Configured</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Not Set</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4 pt-4 border-t border-warm-borderLight">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
                      Action to Protect
                    </label>
                    <select
                      value={pwdType}
                      onChange={(e) => setPwdType(e.target.value as 'delete' | 'hide' | 'payment')}
                      className="w-full rounded-lg border border-warm-border bg-paper-light px-3 py-2 text-sm text-ink focus:border-teal focus:outline-none"
                    >
                      <option value="payment">Payment Confirmation Password</option>
                      <option value="delete">Delete Data Password</option>
                      <option value="hide">Hide Data Password</option>
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
                      Update Security Password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Demo Data Tab */}
          {activeTab === 'demo' && (
            <Card>
              <CardHeader>
                <CardTitle>Demo &amp; Testing Data</CardTitle>
                <CardDescription>
                  Seed sample wallpaper stock, test customers, and mock invoices without touching real records
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-paper rounded-xl border border-warm-border text-xs text-ink-muted space-y-2">
                  <div className="font-bold text-ink text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-brass-light" />
                    <span>Safe Multi-Tenant Demo Isolation</span>
                  </div>
                  <p>
                    Demo records are tagged with <code>isDemo: true</code>. When removing demo data, only demo records are deleted. Real business invoices and inventory will remain intact.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Button
                    variant="brass"
                    onClick={handleSeedDemo}
                    isLoading={demoLoading}
                    leftIcon={<Sparkles className="w-4 h-4" />}
                  >
                    Seed Demo Records
                  </Button>

                  <Button
                    variant="danger"
                    onClick={handleClearDemo}
                    isLoading={demoLoading}
                    leftIcon={<Trash2 className="w-4 h-4" />}
                  >
                    Remove Demo Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}
