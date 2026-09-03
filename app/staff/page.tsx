'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Trash2,
  Lock,
  Mail,
  User,
  RefreshCw,
  AlertCircle,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

interface StaffWorker {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export default function StaffPage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<StaffWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'worker'>('admin');

  // Add Worker Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      // Check session role first
      const sessRes = await fetch('/api/auth/session');
      const sessData = await sessRes.json();
      if (sessData.authenticated && sessData.user) {
        setCurrentUserRole(sessData.user.role);
        if (sessData.user.role !== 'admin') {
          toast.error('Access denied. Admin role required.');
          router.replace('/dashboard');
          return;
        }
      }

      const res = await fetch('/api/staff');
      const json = await res.json();
      if (json.success) {
        setWorkers(json.data);
      } else {
        toast.error('Could not load staff list', { description: json.error });
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Could not create worker', { description: json.error });
        setSubmitting(false);
        return;
      }

      toast.success(json.message);
      setIsOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      fetchStaff();
    } catch {
      toast.error('Failed to create worker account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWorker = async (worker: StaffWorker) => {
    if (!confirm(`Are you sure you want to delete worker account for ${worker.name}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/staff/${worker._id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Could not remove worker', { description: json.error });
        return;
      }

      toast.success(json.message);
      fetchStaff();
    } catch {
      toast.error('Failed to delete worker');
    }
  };

  return (
    <AppShell title="Staff & Workers">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
            Staff &amp; Worker Accounts
          </h1>
          <p className="text-xs md:text-sm text-ink-muted">
            Manage worker credentials and role permissions for Umar Usman Interior
          </p>
        </div>

        <Button
          variant="teal"
          size="sm"
          onClick={() => setIsOpen(true)}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Add New Worker
        </Button>
      </div>

      {/* Role Permissions Information Banner */}
      <div className="mb-6 p-4 rounded-xl bg-teal-subtle/50 border border-teal/20 text-xs text-ink space-y-2">
        <div className="flex items-center gap-2 font-bold text-teal text-sm">
          <ShieldCheck className="w-4 h-4" />
          <span>Role-Based Access Control (RBAC) Rules</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-ink-muted">
          <div>
            <span className="font-semibold text-ink">Admin Authority: </span>
            Full access to Master Catalog, Warehouses, Staff Management, Settings, financial reports, and the exclusive right to edit/delete invoices.
          </div>
          <div>
            <span className="font-semibold text-ink">Worker Permissions: </span>
            Can create invoices with advance payment, register customers, and check stock. Workers <strong className="text-status-danger">cannot</strong> edit or delete saved invoices, nor alter system configurations.
          </div>
        </div>
      </div>

      {/* Workers Table Card */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-xs text-ink-muted flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-teal mr-2" />
              Loading staff accounts...
            </div>
          ) : workers.length === 0 ? (
            <div className="py-16 text-center text-ink-muted space-y-3">
              <Users className="w-12 h-12 mx-auto text-ink-muted/40" />
              <div className="text-base font-semibold text-ink">No workers registered yet</div>
              <p className="text-xs max-w-sm mx-auto">
                Create worker accounts so your shop employees can bill clients and record advance payments on laptops or phones.
              </p>
              <Button
                variant="teal"
                size="sm"
                onClick={() => setIsOpen(true)}
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                Add First Worker
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Worker Name</th>
                    <th className="py-3 px-4">Email Login</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Registered Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-borderLight">
                  {workers.map((w) => (
                    <tr key={w._id} className="hover:bg-paper transition-colors">
                      <td className="py-3 px-4 font-bold text-ink flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-teal-subtle text-teal font-bold flex items-center justify-center text-xs">
                          {w.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{w.name}</span>
                      </td>
                      <td className="py-3 px-4 text-ink-muted font-mono">{w.email}</td>
                      <td className="py-3 px-4">
                        <Badge variant="teal" size="sm">Worker Staff</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="success" size="sm">Active</Badge>
                      </td>
                      <td className="py-3 px-4 text-ink-muted">{formatDate(w.createdAt)}</td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-status-danger hover:bg-status-dangerLight"
                          onClick={() => handleDeleteWorker(w)}
                          title="Remove worker account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Worker Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Add Shop Worker Account"
        description="Worker accounts allow employees to create invoices and check stock without having permission to delete or modify records."
      >
        <form onSubmit={handleCreateWorker} className="space-y-4">
          <Input
            label="Worker Full Name *"
            type="text"
            required
            placeholder="e.g. Muhammad Bilal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon={<User className="w-4 h-4" />}
          />

          <Input
            label="Worker Login Email *"
            type="email"
            required
            placeholder="bilal@umarusman.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="Worker Login Password (min 4 chars) *"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
          />

          <div className="p-3 bg-paper rounded-lg border border-warm-border text-xs text-ink-muted">
            <span className="font-semibold text-ink">Assigned Role: </span>
            <Badge variant="teal" size="sm" className="ml-1">Worker</Badge>
            <p className="text-[11px] mt-1">
              Workers log in at <code>/login</code> with this email and password.
            </p>
          </div>

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
              Create Account
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
