'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, User, Phone, MapPin, X, ChevronDown, Plus, Check } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export interface CustomerOption {
  _id: string;
  name: string;
  mobile: string;
  code: string;
  city?: string;
  type?: 'customer' | 'supplier';
}

interface CustomerSearchSelectProps {
  customers: CustomerOption[];
  value: string;
  onChange: (customerId: string, customer?: CustomerOption) => void;
  onAddNewCustomer?: () => void;
  required?: boolean;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function CustomerSearchSelect({
  customers,
  value,
  onChange,
  onAddNewCustomer,
  required = false,
  label = 'Select Customer *',
  placeholder = 'Type name or phone number (e.g. Malik or 0306...)...',
  className,
}: CustomerSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c._id === value);
  }, [customers, value]);

  // Filter customers by Name OR Phone Number OR Code OR City
  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      // Show first 25 customers if query is blank
      return customers.slice(0, 25);
    }

    const queryDigits = query.replace(/\D/g, '');
    const hasDigits = queryDigits.length > 0;

    const scored = customers
      .map((c) => {
        const name = (c.name || '').toLowerCase();
        const rawMobile = (c.mobile || '').toLowerCase();
        const cleanMobile = (c.mobile || '').replace(/\D/g, '');
        const code = (c.code || '').toLowerCase();
        const city = (c.city || '').toLowerCase();

        let score = -1;

        // 1. Phone number matching (exact or contains)
        if (hasDigits && cleanMobile.includes(queryDigits)) {
          score = cleanMobile.startsWith(queryDigits) ? 90 : 70;
        } else if (rawMobile.includes(query)) {
          score = 65;
        }

        // 2. Name matching (starts with or contains)
        if (name.startsWith(query)) {
          score = Math.max(score, 100);
        } else if (name.includes(query)) {
          score = Math.max(score, 80);
        }

        // 3. Customer Code matching (e.g. CUS-00055)
        if (code.includes(query)) {
          score = Math.max(score, 85);
        }

        // 4. City matching
        if (city.includes(query)) {
          score = Math.max(score, 50);
        }

        return { customer: c, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.customer);

    return scored.slice(0, 30);
  }, [customers, searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredCustomers.length, searchQuery]);

  const handleSelect = (customer: CustomerOption) => {
    onChange(customer._id, customer);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
    setIsOpen(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredCustomers.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredCustomers.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCustomers[highlightedIndex]) {
        handleSelect(filteredCustomers[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={cn('w-full space-y-1.5', className)} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-ink">
            {label}
          </label>
          {onAddNewCustomer && (
            <button
              type="button"
              onClick={onAddNewCustomer}
              className="text-xs sm:text-sm text-teal font-semibold hover:underline flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>New Customer</span>
            </button>
          )}
        </div>
      )}

      {/* Hidden input to ensure HTML form required validation works */}
      <input
        type="text"
        required={required}
        value={value}
        onChange={() => {}}
        tabIndex={-1}
        className="sr-only"
        aria-hidden="true"
      />

      <div className="relative">
        {selectedCustomer && !isOpen ? (
          /* Selected Customer Card View */
          <div
            onClick={() => {
              setIsOpen(true);
              setSearchQuery('');
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="w-full min-h-[44px] rounded-xl border border-warm-border bg-paper-light px-3.5 py-2 text-ink cursor-pointer hover:border-teal/60 transition-all flex items-center justify-between gap-2 shadow-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-teal-subtle text-teal flex items-center justify-center shrink-0 font-bold text-xs">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-bold text-ink text-sm sm:text-base truncate">
                  {selectedCustomer.name}
                </span>
                <span className="text-xs font-mono text-teal font-semibold">
                  📞 {selectedCustomer.mobile}
                </span>
                <span className="text-[11px] font-mono text-ink-muted bg-paper px-1.5 py-0.5 rounded border border-warm-border">
                  {selectedCustomer.code}
                </span>
                {selectedCustomer.city && (
                  <span className="text-[11px] text-ink-muted flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {selectedCustomer.city}
                  </span>
                )}
                {selectedCustomer.type === 'supplier' && (
                  <Badge variant="neutral" size="sm">
                    Supplier
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleClear}
                className="w-7 h-7 rounded-lg hover:bg-paper text-ink-muted hover:text-status-danger flex items-center justify-center transition-colors"
                title="Clear selected customer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-warm-border" />
              <div className="text-ink-muted">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        ) : (
          /* Search Input Box */
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-ink-muted pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              className="w-full min-h-[44px] pl-10 pr-10 py-2.5 text-sm sm:text-base bg-paper-light border border-warm-border rounded-xl text-ink font-semibold focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all placeholder:text-ink-muted/60"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-3.5 top-3.5 text-ink-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-ink-muted pointer-events-none" />
            )}
          </div>
        )}

        {/* Dropdown Results List */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-paper rounded-xl border border-warm-border shadow-2xl overflow-hidden max-h-72 flex flex-col">
            {/* Header hint */}
            <div className="px-3.5 py-2 bg-paper-light border-b border-warm-borderLight flex items-center justify-between text-[11px] font-semibold text-ink-muted">
              <span>Search results ({filteredCustomers.length})</span>
              <span className="text-[10px]">Type name or phone number</span>
            </div>

            <div className="overflow-y-auto divide-y divide-warm-borderLight">
              {filteredCustomers.length === 0 ? (
                <div className="p-4 text-center space-y-2">
                  <p className="text-xs sm:text-sm text-ink-muted">
                    No customer matches &ldquo;<span className="font-bold text-ink">{searchQuery}</span>&rdquo;
                  </p>
                  {onAddNewCustomer && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onAddNewCustomer();
                      }}
                      className="text-xs font-bold text-teal hover:underline inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add as New Customer</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredCustomers.map((c, index) => {
                  const isSelected = c._id === value;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <div
                      key={c._id}
                      onClick={() => handleSelect(c)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={cn(
                        'px-3.5 py-2.5 cursor-pointer flex items-center justify-between gap-3 transition-colors',
                        isHighlighted ? 'bg-teal-subtle/50' : 'hover:bg-paper-light',
                        isSelected && 'bg-teal-subtle/70'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-ink text-sm sm:text-base">
                            {c.name}
                          </span>
                          <span className="text-xs font-mono font-bold text-teal">
                            📞 {c.mobile}
                          </span>
                          <span className="text-[11px] font-mono text-ink-muted bg-paper px-1.5 py-0.5 rounded border border-warm-border">
                            {c.code}
                          </span>
                          {c.type === 'supplier' && (
                            <Badge variant="neutral" size="sm">
                              Supplier
                            </Badge>
                          )}
                        </div>
                        {c.city && (
                          <div className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-ink-muted" />
                            <span>{c.city}</span>
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-teal text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
