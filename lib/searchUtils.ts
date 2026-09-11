/**
 * Utility functions for robust, case-insensitive, whitespace-tolerant,
 * and format-agnostic search across Invoices, Customers, and Products.
 */

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strips all non-digit characters from a phone string.
 */
export function extractDigits(s: string): string {
  return s.replace(/\D/g, '');
}

/**
 * Builds a regex that matches formatted or unformatted phone numbers,
 * handling variations like +92 / 92 / 0 prefixes, dashes, spaces, and parentheses.
 */
export function buildPhoneRegex(query: string): RegExp | null {
  const digits = extractDigits(query);
  if (!digits || digits.length < 2) return null;

  let coreDigits = digits;
  let prefixPattern = '';

  // If query starts with Pakistan country code (92...)
  if (digits.startsWith('92') && digits.length >= 4) {
    coreDigits = digits.slice(2);
    // Can match local 0 prefix, or international +92 / 92 prefix, or raw digits
    prefixPattern = '(?:0|\\+?92[\\s\\-\\.]*)';
  } else if (digits.startsWith('0') && digits.length >= 3) {
    coreDigits = digits.slice(1);
    // Can match local 0 prefix, or international +92 / 92 prefix, or raw digits
    prefixPattern = '(?:0|\\+?92[\\s\\-\\.]*)';
  }

  const digitParts = coreDigits.split('').map((d) => escapeRegex(d)).join('[\\s\\-\\.\\(\\)]*');
  const pattern = prefixPattern ? prefixPattern + digitParts : digitParts;

  try {
    return new RegExp(pattern, 'i');
  } catch {
    return null;
  }
}

/**
 * Normalizes phone numbers to standard Pakistani formats for in-memory comparisons.
 * Returns both local (03XXXXXXXXX) and raw cleaned digits.
 */
export function normalizePhoneForComparison(phone: string): { raw: string; local: string; intl: string } {
  const digits = extractDigits(phone);
  let local = digits;
  let intl = digits;

  if (digits.startsWith('92') && digits.length >= 10) {
    local = '0' + digits.slice(2);
    intl = digits;
  } else if (digits.startsWith('0') && digits.length >= 10) {
    local = digits;
    intl = '92' + digits.slice(1);
  }

  return { raw: digits, local, intl };
}

/**
 * Builds a flexible regex for customer names that ignores extra whitespace
 * and matches multi-word names in any order or tokenized.
 */
export function buildNameRegex(query: string): RegExp {
  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => escapeRegex(w));

  if (words.length === 0) return /(?:)/i;

  // Words with any whitespace between them
  const pattern = words.join('\\s+');
  return new RegExp(pattern, 'i');
}

/**
 * Builds a regex to match invoice numbers even if the user omits dashes
 * (e.g. "INV001" or "001" or "INV-2026-00040" or "00040" or "40").
 */
export function buildInvoiceNumberRegex(query: string): RegExp {
  const trimmed = query.trim();
  const escaped = escapeRegex(trimmed);

  // If user typed INV without dash, allow optional dash
  const dashFlexible = escaped.replace(/INV[-_]?/i, 'INV[-_]?');

  // If user entered only digits (e.g. 40 or 00040), match at the end or surrounded by non-digits
  const digits = extractDigits(trimmed);
  if (digits && digits === trimmed) {
    return new RegExp('(?:^|[^0-9])0*' + digits + '(?:$|[^0-9])|' + escaped, 'i');
  }

  return new RegExp(dashFlexible, 'i');
}

/**
 * Builds a regex for Wallpaper WP numbers (e.g. "7668", "WP-TEST-7668", "WP7668").
 */
export function buildWpNumberRegex(query: string): RegExp {
  const trimmed = query.trim();
  const escaped = escapeRegex(trimmed);

  // Allow optional dashes between WP and code
  const flexible = escaped.replace(/WP[-_]?/i, 'WP[-_]?');
  return new RegExp(flexible, 'i');
}

export interface SearchableInvoice {
  _id: string;
  number: string;
  date?: string | Date;
  customerId?: {
    _id?: string;
    name?: string;
    mobile?: string;
    code?: string;
    type?: string;
  } | null;
  items?: Array<{
    wp?: string;
    design?: string;
    qty?: number;
    rate?: number;
    amount?: number;
  }>;
  total?: number;
  paid?: number;
  remaining?: number;
}

/**
 * Computes relevance score for an invoice against a query string.
 * Higher score means a stronger match (to be displayed first).
 */
export function scoreInvoiceMatch(inv: SearchableInvoice, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const qDigits = extractDigits(q);
  const invNum = (inv.number || '').toLowerCase();
  const custName = (inv.customerId?.name || '').toLowerCase();
  const custPhone = inv.customerId?.mobile || '';
  const custCode = (inv.customerId?.code || '').toLowerCase();
  const phoneNorm = normalizePhoneForComparison(custPhone);

  let score = 0;

  // 1. Exact Invoice Number (highest priority)
  if (invNum === q) return 1000;
  if (invNum.startsWith(q)) score = Math.max(score, 900);
  else if (invNum.includes(q)) score = Math.max(score, 750);

  // Digits of invoice number
  const invDigits = extractDigits(invNum);
  if (qDigits && invDigits.endsWith(qDigits)) {
    score = Math.max(score, 800);
  }

  // 2. Customer Name
  if (custName) {
    if (custName === q) return Math.max(score, 950); // Exact name match
    if (custName.startsWith(q)) score = Math.max(score, 850);
    else {
      // Check if any word starts with query
      const words = custName.split(/\s+/);
      if (words.some((w) => w === q)) score = Math.max(score, 820);
      else if (words.some((w) => w.startsWith(q))) score = Math.max(score, 780);
      else if (custName.includes(q)) score = Math.max(score, 700);
    }
  }

  // 3. Customer Phone
  if (qDigits && qDigits.length >= 2) {
    if (phoneNorm.raw === qDigits || phoneNorm.local === qDigits || phoneNorm.intl === qDigits) {
      score = Math.max(score, 920); // Exact phone
    } else if (
      phoneNorm.local.startsWith(qDigits) ||
      phoneNorm.intl.startsWith(qDigits) ||
      phoneNorm.raw.startsWith(qDigits)
    ) {
      score = Math.max(score, 840);
    } else if (
      phoneNorm.local.includes(qDigits) ||
      phoneNorm.intl.includes(qDigits) ||
      phoneNorm.raw.includes(qDigits)
    ) {
      score = Math.max(score, 720);
    }
  }

  // 4. Customer Code
  if (custCode) {
    if (custCode === q) score = Math.max(score, 850);
    else if (custCode.includes(q)) score = Math.max(score, 680);
  }

  // 5. Line items / WP number
  if (inv.items && Array.isArray(inv.items)) {
    for (const item of inv.items) {
      const wp = (item.wp || '').toLowerCase();
      const design = (item.design || '').toLowerCase();
      const wpDigits = extractDigits(wp);

      if (wp === q) {
        score = Math.max(score, 860);
      } else if (qDigits && wpDigits && wpDigits === qDigits) {
        score = Math.max(score, 840);
      } else if (wp.includes(q)) {
        score = Math.max(score, 710);
      } else if (qDigits && wpDigits && wpDigits.includes(qDigits)) {
        score = Math.max(score, 670);
      } else if (design && design.includes(q)) {
        score = Math.max(score, 600);
      }
    }
  }

  return score;
}

/**
 * Checks whether an invoice matches a query in-memory for instant client-side filtering.
 */
export function matchesInvoiceQuery(inv: SearchableInvoice, query: string): boolean {
  if (!query || !query.trim()) return true;
  return scoreInvoiceMatch(inv, query) > 0;
}
