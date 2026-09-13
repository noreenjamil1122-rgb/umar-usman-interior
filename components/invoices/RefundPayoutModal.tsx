'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AmountInput } from '@/components/ui/AmountInput';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { DollarSign, CheckCircle2 } from 'lucide-react';

interface RefundPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRef: string;
  defaultAmount: number;
  onSuccess: () => void;
}

export function RefundPayoutModal({
  isOpen,
  onClose,
  returnRef,
  defaultAmount,
  onSuccess,
}: RefundPayoutModalProps) {
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [method, setMethod] = useState<'Cash' | 'Bank' | 'credit_note'>('Cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sync default amount when modal opens or prop changes
  React.useEffect(() => {
    if (defaultAmount > 0) {
      setAmount(defaultAmount);
    }
  }, [defaultAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnRef) return;

    if (amount <= 0) {
      toast.error('Refund amount must be greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/returns/${returnRef}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          method,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record refund payout');
      }

      toast.success(data.message || 'Refund payout recorded successfully');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error recording refund payout';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Refund Payout"
      description={`Confirm actual payout to customer for Return ${returnRef}. This writes an official negative payment entry to the invoice ledger.`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
            Refund Amount (PKR) <span className="text-status-danger">*</span>
          </label>
          <AmountInput
            min={0.01}
            value={amount}
            onChange={(val) => setAmount(val)}
            required
          />
          <span className="text-[11px] text-ink-muted mt-1 block">
            Max pending refund due: {formatCurrency(defaultAmount)}
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
            Payout Method <span className="text-status-danger">*</span>
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as 'Cash' | 'Bank' | 'credit_note')}
            className="w-full h-11 px-3 py-2 rounded-xl bg-paper border border-warm-border text-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
          >
            <option value="Cash">Cash Payout</option>
            <option value="Bank">Bank Transfer</option>
            <option value="credit_note">Credit Note (Customer Credit)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
            Notes / Reference
          </label>
          <input
            type="text"
            placeholder="e.g. Paid in cash at showroom, Bank Ref #12345"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-11 px-3 py-2 rounded-xl bg-paper border border-warm-border text-ink text-sm placeholder:text-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
          />
        </div>

        <div className="pt-3 border-t border-warm-borderLight flex items-center justify-end gap-3">
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="teal"
            size="md"
            disabled={submitting}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            {submitting ? 'Recording...' : 'Confirm Payout'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
