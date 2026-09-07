'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  Menu,
  Layers,
  CreditCard,
  CheckCircle2,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';

interface NotificationItem {
  id: string;
  type: 'debt' | 'stock' | 'payment';
  severity: 'high' | 'medium' | 'info';
  title: string;
  message: string;
  link: string;
  date: string;
  unread: boolean;
}

interface HeaderProps {
  onMobileMenuOpen?: () => void;
  title?: string;
}

export function Header({ onMobileMenuOpen, title }: HeaderProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [hasUnackedUdhar, setHasUnackedUdhar] = useState<boolean>(false);
  const [unpaidInvoicesList, setUnpaidInvoicesList] = useState<any[]>([]);
  const [isUdharModalOpen, setIsUdharModalOpen] = useState<boolean>(false);
  const [ackLoading, setAckLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'debt' | 'stock'>('all');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const json = await res.json();
      if (json.success && json.data) {
        setNotifications(json.data.notifications || []);
        setHasUnackedUdhar(Boolean(json.data.hasUnackedUdhar));
        setUnpaidInvoicesList(json.data.unpaidInvoices || []);
        // Calculate unread excluding local reads
        const unread = (json.data.notifications || []).filter(
          (n: NotificationItem) => !readIds.has(n.id)
        ).length;
        setUnreadCount(unread);
      }
    } catch {
      // Silently catch background poll error
    }
  };

  const handleAcknowledgeUdhar = async () => {
    setAckLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderAckDate: new Date().toISOString() }),
      });
      setHasUnackedUdhar(false);
      setIsUdharModalOpen(false);
      const { toast } = await import('sonner');
      toast.success('Udhar check acknowledge ho gaya', {
        description: 'Alert has been dismissed for today.',
      });
    } catch {
      const { toast } = await import('sonner');
      toast.error('Failed to acknowledge reminder');
    } finally {
      setAckLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAllAsRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
    setUnreadCount(0);
  };

  const handleNotificationClick = (item: NotificationItem) => {
    setReadIds((prev) => new Set([...Array.from(prev), item.id]));
    setUnreadCount((prev) => Math.max(prev - 1, 0));
    setIsOpen(false);
    router.push(item.link);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'debt') return n.type === 'debt';
    if (filter === 'stock') return n.type === 'stock';
    return true;
  });

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 md:px-6 bg-paper-light/95 backdrop-blur-sm border-b border-warm-border">
      {/* Left: Mobile hamburger & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuOpen}
          className="p-2 -ml-2 rounded-lg text-ink-muted hover:text-ink hover:bg-paper-dark md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white p-1 border border-warm-border flex items-center justify-center shrink-0 shadow-warm md:hidden">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-base md:text-lg font-bold text-ink tracking-tight">
            {title || 'Umar Usman Interior'}
          </h2>
        </div>
      </div>

      {/* Center/Search Quick Trigger */}
      <div className="hidden sm:flex items-center flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-ink-muted" />
          <input
            type="text"
            readOnly
            placeholder="Search customers, products (WP#), invoices..."
            onClick={() => {
              const searchInput = document.getElementById('global-search-trigger');
              if (searchInput) searchInput.click();
            }}
            className="w-full pl-9 pr-12 py-1.5 text-xs md:text-sm bg-paper border border-warm-border rounded-lg text-ink placeholder:text-ink-muted/70 focus:outline-none focus:border-teal cursor-pointer hover:bg-paper-light transition-colors"
          />
          <kbd className="absolute right-2.5 top-2 px-1.5 py-0.5 text-[10px] font-mono text-ink-muted bg-paper-dark/60 rounded border border-warm-border">
            Ctrl+K
          </kbd>
        </div>
      </div>

      {/* Right: Real-time Notifications Bell & Brand Profile */}
      <div className="flex items-center gap-3 relative" ref={dropdownRef}>
        {/* Live Notification Bell Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          title="Real-time Alerts &amp; Udhar Notifications"
          aria-label="Real-time Notifications"
          className={`relative p-2 rounded-xl transition-all duration-150 ${
            isOpen
              ? 'bg-teal text-white shadow-warm'
              : 'text-ink-muted hover:text-ink hover:bg-paper-dark'
          }`}
        >
          <Bell className="w-5 h-5" />

          {/* Daily Udhar Blinking Dot (Only if unacknowledged today) */}
          {hasUnackedUdhar && (
            <>
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-status-danger rounded-full animate-ping" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-status-danger rounded-full ring-2 ring-paper-light" />
            </>
          )}

          {/* Unread Count Badge */}
          {unreadCount > 0 && !hasUnackedUdhar && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-status-danger text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-paper-light animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Real-Time Notifications Dropdown Popover */}
        {isOpen && (
          <div className="absolute right-0 top-12 w-80 sm:w-96 bg-paper-light border border-warm-border rounded-2xl shadow-warm-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Popover Header */}
            <div className="p-3.5 bg-paper border-b border-warm-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-ink">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-status-danger text-white">
                    {unreadCount} New
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-teal font-semibold hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Daily Udhar Reminder Banner */}
            {hasUnackedUdhar && (
              <div className="p-3 bg-red-50 border-b border-red-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-status-danger animate-ping shrink-0" />
                  <span className="text-xs font-bold text-red-900">Rozana Udhar Reminder</span>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsUdharModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-status-danger text-white rounded-md text-[11px] font-bold hover:bg-red-700 shadow-sm transition-colors"
                >
                  Review ({unpaidInvoicesList.length})
                </button>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-2 bg-paper/50 border-b border-warm-borderLight text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-teal text-white shadow-sm'
                    : 'text-ink-muted hover:text-ink hover:bg-paper'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('debt')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filter === 'debt'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-ink-muted hover:text-ink hover:bg-paper'
                }`}
              >
                Udhar ({notifications.filter((n) => n.type === 'debt').length})
              </button>
              <button
                onClick={() => setFilter('stock')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filter === 'stock'
                    ? 'bg-status-danger text-white shadow-sm'
                    : 'text-ink-muted hover:text-ink hover:bg-paper'
                }`}
              >
                Stock ({notifications.filter((n) => n.type === 'stock').length})
              </button>
            </div>

            {/* Notification Items List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-warm-borderLight">
              {filteredNotifications.length === 0 ? (
                <div className="py-12 text-center text-xs text-ink-muted space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600/50" />
                  <div className="font-semibold text-ink">All caught up!</div>
                  <p className="text-[11px]">No active alerts for this category.</p>
                </div>
              ) : (
                filteredNotifications.map((item) => {
                  const isRead = readIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3.5 hover:bg-paper transition-colors cursor-pointer flex items-start gap-3 ${
                        !isRead ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div className="shrink-0 mt-0.5">
                        {item.type === 'debt' ? (
                          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs">
                            Rs.
                          </div>
                        ) : item.type === 'stock' ? (
                          <div className="w-8 h-8 rounded-lg bg-rose-100 text-status-danger flex items-center justify-center">
                            <Layers className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-status-success flex items-center justify-center">
                            <CreditCard className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs font-bold truncate ${
                              item.type === 'debt'
                                ? 'text-amber-950'
                                : item.type === 'stock'
                                ? 'text-status-danger'
                                : 'text-status-success'
                            }`}
                          >
                            {item.title}
                          </span>
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-status-danger shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-ink-muted mt-0.5 line-clamp-2 leading-relaxed">
                          {item.message}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-ink-muted/80 mt-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(item.date)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Popover Footer */}
            <div className="p-2.5 bg-paper border-t border-warm-border text-center text-xs">
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="text-teal font-bold hover:underline inline-flex items-center gap-1"
              >
                <span>View Full Financial Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* Business Profile Avatar */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-warm-borderLight">
          <div className="w-8 h-8 rounded-full bg-white border border-warm-border flex items-center justify-center p-0.5 shadow-sm overflow-hidden">
            <img src="/logo.png" alt="Umar Usman" className="w-full h-full object-contain" />
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-ink leading-tight">
              Umar Usman
            </div>
            <div className="text-[10px] text-ink-muted leading-tight">
              Lahore Branch
            </div>
          </div>
        </div>
      </div>

      {/* Daily Udhar Reminder Modal */}
      <Modal
        isOpen={isUdharModalOpen}
        onClose={() => setIsUdharModalOpen(false)}
        title="Rozana Udhar Reminder"
        description="Daily overview of customer accounts with pending debt balances."
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="max-h-72 overflow-y-auto divide-y divide-warm-borderLight border border-warm-border rounded-xl">
            {unpaidInvoicesList.length === 0 ? (
              <div className="p-4 text-center text-xs text-ink-muted">
                No active outstanding invoices found.
              </div>
            ) : (
              unpaidInvoicesList.map((inv) => (
                <div key={inv._id} className="p-3 flex items-center justify-between text-xs hover:bg-paper transition-colors">
                  <div>
                    <div className="font-bold text-ink">{inv.customerName}</div>
                    <div className="text-[11px] text-ink-muted">
                      {inv.customerMobile || '-'} • Invoice: {inv.number}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-status-danger">{formatCurrency(inv.remaining)}</div>
                    <Link
                      href={`/invoices/${inv._id}`}
                      onClick={() => setIsUdharModalOpen(false)}
                      className="text-[10px] text-teal hover:underline font-semibold"
                    >
                      View Bill
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-warm-borderLight">
            <Link href="/customers?filter=debt" onClick={() => setIsUdharModalOpen(false)}>
              <Button variant="outline" size="sm">
                Open Debt Ledger
              </Button>
            </Link>

            <Button
              variant="teal"
              size="sm"
              onClick={handleAcknowledgeUdhar}
              isLoading={ackLoading}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              OK, Sab Dekh Liya
            </Button>
          </div>
        </div>
      </Modal>
    </header>
  );
}
