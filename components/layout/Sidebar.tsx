'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Layers,
  BookOpen,
  Warehouse,
  FileText,
  CreditCard,
  History,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  UserCheck,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const allNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Products', href: '/products', icon: Layers },
  { label: 'Books', href: '/books', icon: BookOpen },
  { label: 'Warehouses', href: '/warehouses', icon: Warehouse },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Payments', href: '/payments', icon: CreditCard },
  { label: 'Stock History', href: '/stock-history', icon: History },
  { label: 'Staff & Workers', href: '/staff', icon: Briefcase, adminOnly: true },
  { label: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [userSession, setUserSession] = useState<{
    role: 'admin' | 'worker';
    name?: string;
    businessName?: string;
  }>({
    role: 'admin',
    name: 'Admin',
  });

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUserSession({
            role: data.user.role || 'admin',
            name: data.user.name || data.user.email,
            businessName: data.user.businessName,
          });
        }
      })
      .catch(() => {});
  }, []);

  const visibleNavItems = allNavItems.filter((item) => {
    if (item.adminOnly && userSession.role !== 'admin') {
      return false;
    }
    return true;
  });

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-warm-border bg-paper-light transition-all duration-300 z-30 h-screen sticky top-0',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-warm-borderLight h-16">
        {!collapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-white p-1 border border-warm-border flex items-center justify-center shrink-0 shadow-warm">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="truncate">
              <h1 className="text-sm font-bold tracking-tight text-ink truncate leading-tight">
                {userSession.businessName || 'Umar Usman Interior'}
              </h1>
              <p className="text-[11px] font-medium text-ink-muted truncate">
                Wallpaper Manager
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors ml-auto"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-teal text-white shadow-warm font-semibold'
                  : 'text-ink hover:bg-paper-dark hover:text-teal',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  'w-5 h-5 shrink-0 transition-colors',
                  isActive ? 'text-white' : 'text-ink-muted group-hover:text-teal'
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brass-light" />
              )}
            </Link>
          );
        })}
      </div>

      {/* User Role Badge & Footer */}
      <div className="p-3 border-t border-warm-borderLight space-y-2">
        {!collapsed && (
          <div className="p-2.5 bg-paper rounded-xl border border-warm-border flex items-center justify-between">
            <div className="truncate mr-2">
              <div className="text-xs font-bold text-ink truncate">{userSession.name}</div>
              <div className="text-[10px] text-ink-muted">Signed In</div>
            </div>
            {userSession.role === 'admin' ? (
              <Badge variant="brass" size="sm">Admin</Badge>
            ) : (
              <Badge variant="teal" size="sm">Worker</Badge>
            )}
          </div>
        )}

        <button
          onClick={async () => {
            try {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            } catch {
              window.location.href = '/login';
            }
          }}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-status-danger hover:bg-status-dangerLight transition-colors',
            collapsed && 'justify-center px-0'
          )}
          title="Logout"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
