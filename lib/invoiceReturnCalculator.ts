export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface ReturnItemInput {
  quantity: number;
  rate?: number;
  unit_price?: number;
  returned_quantity?: number;
}

export interface ReturnCalculationResult {
  returnAmount: number;
  newReturnedQty: number;
  remainingQty: number;
  isFullyReturned: boolean;
}

/**
 * Pure function — no DB access — unit-testable.
 * @param item - the original line item { quantity, rate/unit_price, returned_quantity }
 * @param requestedReturnQty - number of units requested to return
 */
export function calculateReturn(
  item: ReturnItemInput,
  requestedReturnQty: number
): ReturnCalculationResult {
  const alreadyReturned = Number(item.returned_quantity) || 0;
  const totalQty = Number(item.quantity) || 0;
  const availableToReturn = round2(totalQty - alreadyReturned);

  if (!Number.isFinite(requestedReturnQty) || requestedReturnQty <= 0) {
    throw new ValidationError('Returned quantity must be greater than zero.');
  }

  if (requestedReturnQty > availableToReturn) {
    throw new ValidationError(
      `Cannot return ${requestedReturnQty}. Only ${availableToReturn} unit(s) remain eligible for return.`
    );
  }

  const unitPrice = Number(item.unit_price ?? item.rate ?? 0);
  const returnAmount = round2(requestedReturnQty * unitPrice);
  const newReturnedQty = round2(alreadyReturned + requestedReturnQty);
  const remainingQty = round2(totalQty - newReturnedQty);

  return {
    returnAmount,
    newReturnedQty,
    remainingQty,
    isFullyReturned: remainingQty <= 0,
  };
}
