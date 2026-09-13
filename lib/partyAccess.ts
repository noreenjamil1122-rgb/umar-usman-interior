import { UserSession } from '@/types';

export const SUPPLIER_LOCKED_FIELDS = [
  'contact',
  'phone',
  'mobile',
  'whatsapp',
  'alt',
  'address',
  'city',
  'outstanding_balance',
  'outstandingBalance',
  'total_purchases',
  'totalPurchase',
  'totalRemaining',
  'totalInvoiced',
  'totalPaid',
  'ledger',
  'notes',
  'payment_terms',
] as const;

export function isAdmin(user: UserSession | null | undefined): boolean {
  return Boolean(user && user.role === 'admin');
}

export function isSupplierParty(party: Record<string, unknown> | null | undefined): boolean {
  if (!party) return false;
  const typeStr = String(party.type || '').toLowerCase();
  return typeStr === 'supplier' || party.is_supplier === true || party.isSupplier === true;
}

/**
 * Returns a version of the party object safe to send to this user.
 * Non-admins get locked fields stripped and replaced with null and locked: true,
 * for ANY party whose type is SUPPLIER — even when returned inside a
 * "Customers Only" or "All Parties" list or search.
 */
export function maskPartyForUser<T extends Record<string, unknown>>(
  party: T,
  user: UserSession | null | undefined
): T & { locked?: boolean } {
  if (!isSupplierParty(party) || isAdmin(user)) {
    return { ...party, locked: false };
  }

  const masked: Record<string, unknown> = { ...party, locked: true };

  for (const field of SUPPLIER_LOCKED_FIELDS) {
    if (field in masked) {
      masked[field] = null;
    }
  }

  return masked as T & { locked: boolean };
}

export function maskPartyListForUser<T extends Record<string, unknown>>(
  parties: T[],
  user: UserSession | null | undefined
): Array<T & { locked?: boolean }> {
  return parties.map((p) => maskPartyForUser(p, user));
}
