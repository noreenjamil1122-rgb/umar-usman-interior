import { round2 } from './invoiceReturnCalculator';

export interface InvoiceFinancials {
  total?: number;
  total_amount?: number;
  paid?: number;
  paid_amount?: number;
  remaining?: number;
  balance_due?: number;
}

export type PaymentAdjustmentType = 'refund' | 'balance_reduction' | 'partial';

export interface PaymentAdjustmentResult {
  type: PaymentAdjustmentType;
  newTotalAmount: number;
  newBalanceDue: number;
  refundDue: number;
  creditApplied: number;
}

/**
 * Computes payment adjustment for Cases A, B, and C as specified.
 * @param invoice - object containing total, paid, and remaining (or total_amount, paid_amount, balance_due)
 * @param returnAmount - gross return amount
 */
export function computePaymentAdjustment(
  invoice: InvoiceFinancials,
  returnAmount: number
): PaymentAdjustmentResult {
  const totalAmount = Number(invoice.total_amount ?? invoice.total ?? 0);
  const paidAmount = Number(invoice.paid_amount ?? invoice.paid ?? 0);
  const balanceDue = Number(invoice.balance_due ?? invoice.remaining ?? round2(totalAmount - paidAmount));

  const newTotalAmount = round2(Math.max(0, totalAmount - returnAmount));

  // Case A: fully paid -> full refund owed
  if (paidAmount >= totalAmount && totalAmount > 0) {
    const refundDue = round2(Math.min(returnAmount, paidAmount));
    return {
      type: 'refund',
      newTotalAmount,
      newBalanceDue: 0,
      refundDue,
      creditApplied: 0,
    };
  }

  // Case B: nothing paid yet -> just reduce balance
  if (paidAmount === 0) {
    const newBalanceDue = round2(Math.max(newTotalAmount, 0));
    return {
      type: 'balance_reduction',
      newTotalAmount,
      newBalanceDue,
      refundDue: 0,
      creditApplied: 0,
    };
  }

  // Case C: partially paid -> reduce balance first; only refund the excess
  // if the return amount is larger than what's still owed.
  if (returnAmount <= balanceDue) {
    const newBalanceDue = round2(balanceDue - returnAmount);
    return {
      type: 'balance_reduction',
      newTotalAmount,
      newBalanceDue,
      refundDue: 0,
      creditApplied: 0,
    };
  } else {
    const excess = round2(returnAmount - balanceDue);
    return {
      type: 'partial', // balance cleared to 0 + refund owed for the excess already paid
      newTotalAmount,
      newBalanceDue: 0,
      refundDue: excess,
      creditApplied: 0,
    };
  }
}
