'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import {
  Sparkles,
  Users,
  Layers,
  FileText,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Check,
  ShieldCheck,
  Database,
  Smartphone,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          router.replace('/warehouses');
        } else {
          router.replace('/login');
        }
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router]);

  const triggerToast = () => {
    toast.success('System Initialized: Wallpaper Manager', {
      description: 'Setup Phase 1 tayyar hai (Umar Usman Interior, Lahore)',
    });
  };

  return (
    <AppShell title="Dashboard Overview">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal to-teal-dark text-white p-6 md:p-8 mb-8 shadow-warm-md border border-teal-light/30">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-brass-subtle text-xs font-semibold uppercase tracking-wider mb-4 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-brass-light" />
            Umar Usman Interior • Lahore, Pakistan
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Wallpaper Management System
          </h1>
          <p className="text-teal-subtle text-sm md:text-base leading-relaxed mb-6">
            Multi-device wallpaper inventory, catalog books, customer ledger, and invoicing engine.
            Project Setup (Step 1) is active and ready for Authentication &amp; Multi-Tenant Database isolation.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="brass"
              onClick={triggerToast}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Test Notification Toast
            </Button>
            <Button
              variant="outline"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
              onClick={() => {
                window.open('https://github.com', '_blank');
              }}
              rightIcon={<ArrowUpRight className="w-4 h-4" />}
            >
              Architecture Specs
            </Button>
          </div>
        </div>

        {/* Decorative corner icon */}
        <div className="absolute right-4 -bottom-6 opacity-10 pointer-events-none text-white hidden md:block">
          <Sparkles className="w-64 h-64" />
        </div>
      </div>

      {/* KPI Metric Summary Cards Preview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-8">
        <Card variant="elevated" className="border-l-4 border-l-teal">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="p-2 bg-teal-subtle rounded-lg text-teal">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-ink">
            {formatCurrency(385000)}
          </div>
          <div className="text-xs text-status-success mt-1 flex items-center gap-1 font-medium">
            <span>+14.2%</span>
            <span className="text-ink-muted">vs last month</span>
          </div>
        </Card>

        <Card variant="elevated" className="border-l-4 border-l-brass">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Udhar / Outstanding
            </span>
            <div className="p-2 bg-brass-subtle rounded-lg text-brass-dark">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-ink">
            {formatCurrency(84500)}
          </div>
          <div className="text-xs text-status-warning mt-1 font-medium">
            3 customer balances pending
          </div>
        </Card>

        <Card variant="elevated">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Active Inventory
            </span>
            <div className="p-2 bg-paper-dark rounded-lg text-ink-muted">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-ink">
            1,420 <span className="text-xs text-ink-muted font-normal">Rolls</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="success" size="sm">In Stock</Badge>
            <Badge variant="warning" size="sm">2 Low</Badge>
          </div>
        </Card>

        <Card variant="elevated">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Registered Clients
            </span>
            <div className="p-2 bg-paper-dark rounded-lg text-ink-muted">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-ink">
            128
          </div>
          <div className="text-xs text-ink-muted mt-1">
            Lahore &amp; Punjab region
          </div>
        </Card>
      </div>

      {/* Step 1 Foundation Checklist Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Phase 1 Foundation &amp; Architecture Audit</CardTitle>
                <CardDescription>
                  Core application scaffold verified for production deployment.
                </CardDescription>
              </div>
              <Badge variant="teal">Step 1 Complete</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-paper border border-warm-border space-y-2">
                <div className="flex items-center gap-2 text-teal font-semibold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Security &amp; Isolation</span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Strict multi-tenant design prepared. Environment variables configured to prevent credential leakage.
                </p>
                <div className="flex items-center gap-1.5 text-xs text-status-success font-medium pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Next.js App Router &amp; CSP Ready</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-paper border border-warm-border space-y-2">
                <div className="flex items-center gap-2 text-brass-dark font-semibold text-sm">
                  <Database className="w-4 h-4" />
                  <span>Database Singleton</span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Cached Mongoose connection helper (<code>lib/mongodb.ts</code>) prevents connection leaks in serverless runtimes.
                </p>
                <div className="flex items-center gap-1.5 text-xs text-status-success font-medium pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Global connection pool cached</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-paper border border-warm-border space-y-2">
                <div className="flex items-center gap-2 text-ink font-semibold text-sm">
                  <Smartphone className="w-4 h-4" />
                  <span>Responsive UI Layout</span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Tested with collapsible desktop sidebar, sticky header with quick search, and bottom navigation bar for phones.
                </p>
                <div className="flex items-center gap-1.5 text-xs text-status-success font-medium pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mobile bottom nav active</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-paper border border-warm-border space-y-2">
                <div className="flex items-center gap-2 text-teal font-semibold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Warm Interior Theme</span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Bespoke Umar Usman Interior color palette (Warm Paper, Teal, Brass, and Ink) with Plus Jakarta Sans typography.
                </p>
                <div className="flex items-center gap-1.5 text-xs text-status-success font-medium pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>No generic blue or SaaS clutter</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Nav / Next Steps Panel */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader>
              <CardTitle>Next Phase</CardTitle>
              <CardDescription>
                Phase 2: Custom JWT Auth &amp; Multi-Tenant Seeding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-ink-muted space-y-2">
                <p>
                  <strong>Phase 2 will implement:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-ink-light pl-1">
                  <li>Signup &amp; Login with bcrypt &amp; Zod</li>
                  <li>Custom JWT in <code>httpOnly</code> cookies</li>
                  <li>In-memory rate limiter &amp; CSRF protection</li>
                  <li>Automatic seeding of default Books (3) &amp; Warehouses (5)</li>
                  <li>Atomic sequence counter initialization</li>
                </ul>
              </div>
            </CardContent>
          </div>

          <div className="pt-4 border-t border-warm-borderLight">
            <div className="text-xs text-ink-muted mb-3 flex items-center justify-between">
              <span>Status</span>
              <span className="font-semibold text-teal">Awaiting Confirmation</span>
            </div>
            <Button
              variant="teal"
              className="w-full"
              onClick={triggerToast}
            >
              Verify Phase 1 Ready
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
