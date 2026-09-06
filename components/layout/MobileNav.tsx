'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Warehouse,
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  CreditCard,
  Package,
  BookMarked,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const quickNav = [
  { label: 'Warehouses', href: '/warehouses', icon: Warehouse },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Stock', href: '/stock', icon: Package },
  { label: 'Customers', href: '/customers', icon: Users },
];

interface MobileNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const allNavItems: MobileNavItem[] = [
  { label: 'Warehouses', href: '/warehouses', icon: Warehouse },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Wallpaper Books', href: '/books', icon: BookOpen },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Payments', href: '/payments', icon: CreditCard, adminOnly: true },
  { label: 'Stock', href: '/stock', icon: Package },
  { label: 'Customer Ledger', href: '/ledger', icon: BookMarked },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
];

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const [userRole, setUserRole] = React.useState<'admin' | 'worker'>('admin');

  React.useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user) {
          setUserRole(d.user.role || 'admin');
        }
      })
      .catch(() => {});
  }, []);

  const visibleNavItems = allNavItems.filter((item) => {
    if (item.adminOnly && userRole !== 'admin') {
      return false;
    }
    return true;
  });

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Menu */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 w-72 bg-paper-light border-r border-warm-border p-4 flex flex-col justify-between transform transition-transform duration-250 ease-in-out md:hidden shadow-warm-lg',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div>
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-4 border-b border-warm-borderLight">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center text-white font-bold shadow-warm">
                <Sparkles className="w-4 h-4 text-brass-light" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink leading-tight">
                  Umar Usman Interior
                </h3>
                <p className="text-[11px] text-ink-muted">Wallpaper Manager</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-paper-dark"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="mt-4 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-teal text-white shadow-warm'
                      : 'text-ink-muted hover:text-ink hover:bg-paper-dark/60'
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="pt-4 border-t border-warm-borderLight">
          <button
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login';
              } catch {
                window.location.href = '/login';
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-status-danger hover:bg-status-dangerLight transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex md:hidden items-center justify-around h-16 bg-paper-light/95 backdrop-blur-md border-t border-warm-border px-2 no-print">
        {quickNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-md text-[11px] font-medium transition-colors',
                isActive ? 'text-teal font-semibold' : 'text-ink-muted hover:text-ink'
              )}
            >
              <Icon className={cn('w-5 h-5 mb-0.5', isActive && 'stroke-[2.5]')} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        {/* Menu drawer button */}
        <button
          onClick={() => onClose()}
          className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-md text-[11px] font-medium text-ink-muted hover:text-ink"
          aria-label="More menu items"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
