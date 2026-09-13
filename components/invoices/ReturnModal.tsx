'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AmountInput } from '@/components/ui/AmountInput';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { RotateCcw, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

interface EligibleItem {
  id: string;
  invoiceItemId: string;
  productId: string | null;
  product_name: string;
  wp: string;
  design: string;
  quantity: number;
  returned_quantity: number;
  remaining_quantity: number;
  unit_price: number;
  is_fully_returned: boolean;
}

interface ReturnPreviewData {
  invoiceNumber: string;
  customerName: string;
  product: string;
  originalQuantity: number;
  returnedQuantity: number;
  remainingQuantity: number;
  unitPrice: number;
  returnAmount: number;
  updatedInvoiceTotal: number;
  paymentAdjustment: {
    type: 'refund' | 'balance_reduction' | 'partial';
    newTotalAmount: number;
    newBalanceDue: number;
    refundDue: number;
    creditApplied: number;
  };
  reason?: string;
}

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  onSuccess: () => void;
}

export function ReturnModal({ isOpen, onClose, invoiceId, onSuccess }: ReturnModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [eligibleItems, setEligibleItems] = useState<EligibleItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [returnQty, setReturnQty] = useState<number>(1);
  const [condition, setCondition] = useState<'accepted_to_stock' | 'damaged' | 'rejected'>('accepted_to_stock');
  const [reason, setReason] = useState<string>('');

  // Preview Data
  const [previewData, setPreviewData] = useState<ReturnPreviewData | null>(null);

  // Fetch eligible items when modal opens
  useEffect(() => {
    if (isOpen && invoiceId) {
      setStep(1);
      setPreviewData(null);
      setLoadingItems(true);
      fetch(`/api/invoices/${invoiceId}/returns/eligible-items`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setEligibleItems(data.items || []);
            if (data.items && data.items.length > 0) {
              setSelectedItemId(data.items[0].invoiceItemId || data.items[0].id);
              setReturnQty(1);
            } else {
              setSelectedItemId('');
            }
          } else {
            toast.error(data.error || 'Failed to load eligible items');
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error('Failed to load eligible items');
        })
        .finally(() => setLoadingItems(false));
    }
  }, [isOpen, invoiceId]);

  const selectedItem = eligibleItems.find(
    (it) => it.invoiceItemId === selectedItemId || it.id === selectedItemId
  );

  const handleFetchPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      toast.error('Please select an item to return');
      return;
    }

    if (returnQty <= 0) {
      toast.error('Return quantity must be greater than 0');
      return;
    }

    if (selectedItem && returnQty > selectedItem.remaining_quantity) {
      toast.error(`Cannot return more than available quantity (${selectedItem.remaining_quantity})`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/returns/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceItemId: selectedItemId,
          returnQuantity: returnQty,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to calculate preview');
      }

      setPreviewData(data);
      setStep(2);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error preparing preview';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!previewData || !selectedItemId) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceItemId: selectedItemId,
          returnQuantity: returnQty,
          condition,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to confirm return');
      }

      toast.success(`Return ${data.returnRef || ''} confirmed successfully!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to confirm return';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 1 ? 'Process Item Return' : 'Confirm Return Details'}
      description={
        step === 1
          ? 'Select the line item and quantity to return. Stock and balances will update automatically.'
          : 'Please review the return amounts and payment adjustment before finalizing.'
      }
      size="lg"
    >
      {loadingItems ? (
        <div className="py-12 text-center text-ink-muted flex flex-col items-center justify-center gap-3">
          <RotateCcw className="w-6 h-6 animate-spin text-teal" />
          <p className="text-sm font-medium">Checking eligible items...</p>
        </div>
      ) : eligibleItems.length === 0 ? (
        <div className="py-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-ink text-base">No Eligible Items for Return</h4>
            <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
              All line items on this invoice have already been fully returned or no refundable quantities exist.
            </p>
          </div>
          <div className="pt-2">
            <Button variant="outline" size="md" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : step === 1 ? (
        /* STEP 1: SELECT ITEM & QUANTITY */
        <form onSubmit={handleFetchPreview} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
              Select Line Item <span className="text-status-danger">*</span>
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => {
                setSelectedItemId(e.target.value);
                setReturnQty(1);
              }}
              className="w-full h-11 px-3 py-2 rounded-xl bg-paper border border-warm-border text-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              required
            >
              {eligibleItems.map((it) => (
                <option key={it.id} value={it.invoiceItemId || it.id}>
                  {it.product_name} — Rate: {formatCurrency(it.unit_price)} (Available:{' '}
                  {it.remaining_quantity} rolls)
                </option>
              ))}
            </select>
          </div>

          {selectedItem && (
            <div className="p-3.5 bg-paper/70 rounded-xl border border-warm-borderLight flex items-center justify-between text-xs sm:text-sm">
              <div>
                <span className="text-ink-muted block text-xs">Original Bill Rate:</span>
                <span className="font-bold text-ink">{formatCurrency(selectedItem.unit_price)}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-xs">Original Quantity:</span>
                <span className="font-semibold text-ink">{selectedItem.quantity} rolls</span>
              </div>
              <div>
                <span className="text-ink-muted block text-xs">Max Returnable:</span>
                <span className="font-bold text-teal">{selectedItem.remaining_quantity} rolls</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                Quantity to Return <span className="text-status-danger">*</span>
              </label>
              <AmountInput
                min={1}
                max={selectedItem?.remaining_quantity || 1}
                allowDecimals={false}
                value={returnQty}
                onChange={(val) => setReturnQty(Math.max(1, val))}
                required
              />
              <span className="text-[11px] text-ink-muted mt-1 block">
                Up to {selectedItem?.remaining_quantity || 1} rolls eligible
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                Item Condition <span className="text-status-danger">*</span>
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as 'accepted_to_stock' | 'damaged' | 'rejected')}
                className="w-full h-11 px-3 py-2 rounded-xl bg-paper border border-warm-border text-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              >
                <option value="accepted_to_stock">Accepted to Stock (Restock item)</option>
                <option value="damaged">Damaged (Do not restock)</option>
                <option value="rejected">Rejected / Defective (Do not restock)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
              Reason for Return (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Customer ordered extra rolls, changed mind on pattern"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {submitting ? 'Calculating...' : 'Preview Adjustment'}
            </Button>
          </div>
        </form>
      ) : (
        /* STEP 2: CONFIRMATION PREVIEW SCREEN */
        previewData && (
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-xl bg-teal/5 border border-teal/20 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-teal/10">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Invoice &amp; Customer
                </span>
                <span className="text-xs font-bold text-teal">{previewData.invoiceNumber}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-ink-muted text-xs block">Customer:</span>
                  <span className="font-bold text-ink">{previewData.customerName}</span>
                </div>
                <div>
                  <span className="text-ink-muted text-xs block">Product Item:</span>
                  <span className="font-bold text-ink">{previewData.product}</span>
                </div>
                <div>
                  <span className="text-ink-muted text-xs block">Returning Qty:</span>
                  <span className="font-bold text-teal">
                    {previewData.returnedQuantity} rolls (Remaining: {previewData.remainingQuantity})
                  </span>
                </div>
                <div>
                  <span className="text-ink-muted text-xs block">Unit Price:</span>
                  <span className="font-semibold text-ink">{formatCurrency(previewData.unitPrice)}</span>
                </div>
              </div>
            </div>

            {/* Financial Calculations Box */}
            <div className="p-4 rounded-xl bg-paper border border-warm-border space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center text-sm font-bold text-ink">
                <span>Gross Return Value:</span>
                <span className="text-status-danger text-base font-extrabold">
                  {formatCurrency(previewData.returnAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center text-ink-muted">
                <span>Updated Invoice Total:</span>
                <span className="font-semibold text-ink">{formatCurrency(previewData.updatedInvoiceTotal)}</span>
              </div>

              <div className="pt-2 border-t border-warm-borderLight">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">Payment Adjustment:</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                      previewData.paymentAdjustment.type === 'refund'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : previewData.paymentAdjustment.type === 'partial'
                        ? 'bg-purple-100 text-purple-900 border border-purple-300'
                        : 'bg-blue-100 text-blue-900 border border-blue-300'
                    }`}
                  >
                    {previewData.paymentAdjustment.type.replace('_', ' ')}
                  </span>
                </div>

                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-ink-muted">
                    <span>New Balance Due (Udhar):</span>
                    <span className="font-bold text-ink">
                      {formatCurrency(previewData.paymentAdjustment.newBalanceDue)}
                    </span>
                  </div>

                  {previewData.paymentAdjustment.refundDue > 0 ? (
                    <div className="flex justify-between font-bold text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1">
                      <span>Refund Due to Customer:</span>
                      <span>{formatCurrency(previewData.paymentAdjustment.refundDue)}</span>
                    </div>
                  ) : (
                    <div className="text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200 mt-1">
                      Outstanding balance reduced by full return amount. No cash refund owed.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-warm-borderLight flex items-center justify-between text-xs">
                <span className="text-ink-muted">Stock Action:</span>
                <span className="font-semibold text-ink">
                  {condition === 'accepted_to_stock'
                    ? `+${previewData.returnedQuantity} rolls returned to inventory`
                    : `Condition marked as ${condition} (inventory NOT increased)`}
                </span>
              </div>
            </div>

            {reason && (
              <div className="text-xs text-ink-muted bg-paper/50 p-2.5 rounded-lg border border-warm-borderLight">
                <strong className="text-ink">Reason:</strong> {reason}
              </div>
            )}

            <div className="pt-3 border-t border-warm-borderLight flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setStep(1)}
                disabled={submitting}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Edit
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="md" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="teal"
                  size="md"
                  onClick={handleConfirmReturn}
                  disabled={submitting}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  {submitting ? 'Confirming...' : 'Confirm Return'}
                </Button>
              </div>
            </div>
          </div>
        )
      )}
    </Modal>
  );
}
