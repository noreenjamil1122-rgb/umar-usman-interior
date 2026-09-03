'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Users, Layers, FileText, Loader2, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function GlobalSearchModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    customers: Array<{ _id: string; name: string; code: string; mobile: string; city: string }>;
    products: Array<{ _id: string; wp: string; design: string; brand: string; salePrice: number; stock: number }>;
    invoices: Array<{ _id: string; number: string; total: number; remaining: number; customerId: { name: string } }>;
  }>({ customers: [], products: [], invoices: [] });

  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ customers: [], products: [], invoices: [] });
    }
  }, [isOpen]);

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setResults({ customers: [], products: [], invoices: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success) {
          setResults(data.data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const hasResults =
    results.customers.length > 0 || results.products.length > 0 || results.invoices.length > 0;

  if (!isOpen) {
    return (
      <button
        id="global-search-trigger"
        onClick={() => setIsOpen(true)}
        className="hidden"
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-paper-light rounded-2xl border border-warm-border shadow-warm-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-warm-borderLight">
          <Search className="w-5 h-5 text-ink-muted mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers (name/phone), wallpaper (WP#), or invoices..."
            className="w-full bg-transparent text-sm md:text-base text-ink placeholder:text-ink-muted/70 focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-teal mr-2" />}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-paper-dark"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!query.trim() && (
            <div className="py-8 text-center text-xs text-ink-muted">
              Type to instantly search across Wallpaper Inventory, Customers, and Invoices.
            </div>
          )}

          {query.trim() && !loading && !hasResults && (
            <div className="py-8 text-center text-xs text-ink-muted">
              No matching records found for &ldquo;{query}&rdquo;.
            </div>
          )}

          {/* Customers Group */}
          {results.customers.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-ink-muted uppercase tracking-wider mb-2 px-2">
                <Users className="w-3.5 h-3.5 text-teal" />
                <span>Customers</span>
              </div>
              <div className="space-y-1">
                {results.customers.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => {
                      setIsOpen(false);
                      router.push(`/customers?id=${c._id}`);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-paper cursor-pointer border border-transparent hover:border-warm-border transition-colors group"
                  >
                    <div>
                      <div className="text-sm font-semibold text-ink group-hover:text-teal transition-colors">
                        {c.name}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {c.code} • {c.mobile} {c.city && `• ${c.city}`}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-teal group-hover:translate-x-0.5 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products Group */}
          {results.products.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-ink-muted uppercase tracking-wider mb-2 px-2">
                <Layers className="w-3.5 h-3.5 text-brass-dark" />
                <span>Wallpaper Products</span>
              </div>
              <div className="space-y-1">
                {results.products.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => {
                      setIsOpen(false);
                      router.push(`/products?wp=${encodeURIComponent(p.wp)}`);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-paper cursor-pointer border border-transparent hover:border-warm-border transition-colors group"
                  >
                    <div>
                      <div className="text-sm font-semibold text-ink group-hover:text-teal transition-colors">
                        {p.wp} — {p.design}
                      </div>
                      <div className="text-xs text-ink-muted">
                        Brand: {p.brand} • Rate: {formatCurrency(p.salePrice)} • Stock: {p.stock} rolls
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-teal group-hover:translate-x-0.5 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoices Group */}
          {results.invoices.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-ink-muted uppercase tracking-wider mb-2 px-2">
                <FileText className="w-3.5 h-3.5 text-teal-dark" />
                <span>Invoices</span>
              </div>
              <div className="space-y-1">
                {results.invoices.map((inv) => (
                  <div
                    key={inv._id}
                    onClick={() => {
                      setIsOpen(false);
                      router.push(`/invoices/${inv._id}`);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-paper cursor-pointer border border-transparent hover:border-warm-border transition-colors group"
                  >
                    <div>
                      <div className="text-sm font-semibold text-ink group-hover:text-teal transition-colors">
                        {inv.number}
                      </div>
                      <div className="text-xs text-ink-muted">
                        Customer: {inv.customerId?.name || 'Walk-in'} • Total: {formatCurrency(inv.total)}{' '}
                        {inv.remaining > 0 && (
                          <span className="text-status-warning font-medium">
                            (Udhar: {formatCurrency(inv.remaining)})
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-teal group-hover:translate-x-0.5 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-paper border-t border-warm-borderLight flex items-center justify-between text-[11px] text-ink-muted">
          <span>Press ESC to close</span>
          <span>Navigation: Click item to view</span>
        </div>
      </div>
    </div>
  );
}
