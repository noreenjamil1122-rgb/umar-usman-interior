const fs = require('fs');
const mongoose = require('mongoose');

// Read DB URI from .env.local
const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/MONGODB_URI=(.+)/);
if (!match) {
  console.error('No MONGODB_URI found in .env.local');
  process.exit(1);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractDigits(s) {
  return s.replace(/\D/g, '');
}

function buildPhoneRegex(query) {
  const digits = extractDigits(query);
  if (!digits || digits.length < 2) return null;

  let coreDigits = digits;
  let prefixPattern = '';

  if (digits.startsWith('92') && digits.length >= 4) {
    coreDigits = digits.slice(2);
    prefixPattern = '(?:0|\\+?92[\\s\\-\\.]*)';
  } else if (digits.startsWith('0') && digits.length >= 3) {
    coreDigits = digits.slice(1);
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

function buildNameRegex(query) {
  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => escapeRegex(w));

  if (words.length === 0) return /(?:)/i;
  return new RegExp(words.join('\\s+'), 'i');
}

function buildInvoiceNumberRegex(query) {
  const trimmed = query.trim();
  const escaped = escapeRegex(trimmed);
  const dashFlexible = escaped.replace(/INV[-_]?/i, 'INV[-_]?');
  const digits = extractDigits(trimmed);
  if (digits && digits === trimmed) {
    return new RegExp('(?:^|[^0-9])0*' + digits + '(?:$|[^0-9])|' + escaped, 'i');
  }
  return new RegExp(dashFlexible, 'i');
}

function buildWpNumberRegex(query) {
  const trimmed = query.trim();
  const escaped = escapeRegex(trimmed);
  return new RegExp(escaped.replace(/WP[-_]?/i, 'WP[-_]?'), 'i');
}

function normalizePhoneForComparison(phone) {
  const digits = extractDigits(phone || '');
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

function scoreInvoiceMatch(inv, query) {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const qDigits = extractDigits(q);
  const invNum = (inv.number || '').toLowerCase();
  const custName = (inv.customerId?.name || '').toLowerCase();
  const custPhone = inv.customerId?.mobile || '';
  const custCode = (inv.customerId?.code || '').toLowerCase();
  const phoneNorm = normalizePhoneForComparison(custPhone);

  let score = 0;

  // 1. Invoice Number
  if (invNum === q) return 1000;
  if (invNum.startsWith(q)) score = Math.max(score, 900);
  else if (invNum.includes(q)) score = Math.max(score, 750);

  const invDigits = extractDigits(invNum);
  if (qDigits && invDigits.endsWith(qDigits)) {
    score = Math.max(score, 800);
  }

  // 2. Customer Name
  if (custName) {
    if (custName === q) return Math.max(score, 950);
    if (custName.startsWith(q)) score = Math.max(score, 850);
    else {
      const words = custName.split(/\s+/);
      if (words.some((w) => w === q)) score = Math.max(score, 820);
      else if (words.some((w) => w.startsWith(q))) score = Math.max(score, 780);
      else if (custName.includes(q)) score = Math.max(score, 700);
    }
  }

  // 3. Customer Phone
  if (qDigits && qDigits.length >= 2) {
    if (phoneNorm.raw === qDigits || phoneNorm.local === qDigits || phoneNorm.intl === qDigits) {
      score = Math.max(score, 920);
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

  // 5. Line items / WP
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

function matchesInvoiceQuery(inv, query) {
  if (!query || !query.trim()) return true;
  return scoreInvoiceMatch(inv, query) > 0;
}

async function runTests() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(match[1].trim());

  const Customer = mongoose.model('Customer', new mongoose.Schema({
    name: String,
    mobile: String,
    code: String,
    type: String,
  }, { strict: false }));

  const Invoice = mongoose.model('Invoice', new mongoose.Schema({
    number: String,
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    items: Array,
    total: Number,
    paid: Number,
    remaining: Number,
  }, { strict: false }));

  async function executeSearch(q, status = '') {
    const trimmedSearch = q.trim();
    let matchingCustomerIds = [];

    if (trimmedSearch) {
      const phoneRegex = buildPhoneRegex(trimmedSearch);
      const nameRegex = buildNameRegex(trimmedSearch);
      const textRegex = { $regex: escapeRegex(trimmedSearch), $options: 'i' };

      const customerConditions = [
        { name: nameRegex },
        { code: textRegex },
      ];

      if (phoneRegex) {
        customerConditions.push({ mobile: phoneRegex });
      } else {
        customerConditions.push({ mobile: textRegex });
      }

      const matchedCustomers = await Customer.find({ $or: customerConditions }).select('_id').lean();
      matchingCustomerIds = matchedCustomers.map((c) => c._id);
    }

    const andConditions = [];

    if (status === 'paid') {
      andConditions.push({ remaining: { $lte: 0 } });
    } else if (status === 'unpaid') {
      andConditions.push({ $expr: { $eq: ['$paid', 0] } });
    } else if (status === 'partial') {
      andConditions.push({ paid: { $gt: 0 }, remaining: { $gt: 0 } });
    }

    if (trimmedSearch) {
      const invNumRegex = buildInvoiceNumberRegex(trimmedSearch);
      const wpRegex = buildWpNumberRegex(trimmedSearch);
      const textRegex = { $regex: escapeRegex(trimmedSearch), $options: 'i' };

      const searchOrConditions = [
        { number: invNumRegex },
        { 'items.wp': wpRegex },
        { 'items.design': textRegex },
      ];

      if (matchingCustomerIds.length > 0) {
        searchOrConditions.push({ customerId: { $in: matchingCustomerIds } });
      }

      andConditions.push({ $or: searchOrConditions });
    }

    const query = andConditions.length > 0 ? (andConditions.length === 1 ? andConditions[0] : { $and: andConditions }) : {};

    const invoices = await Invoice.find(query)
      .populate({ path: 'customerId', model: Customer, select: 'name mobile code' })
      .lean();

    if (trimmedSearch && invoices.length > 1) {
      invoices.sort((a, b) => scoreInvoiceMatch(b, trimmedSearch) - scoreInvoiceMatch(a, trimmedSearch));
    }

    return invoices;
  }

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  console.log('\n--- Test Suite 1: Customer Name Search ---');
  const rSaman1 = await executeSearch('Saman');
  assert(rSaman1.some(i => i.customerId?.name?.includes('Saman')), 'Search "Saman" finds Saman invoice');

  const rSaman2 = await executeSearch('saman');
  assert(rSaman2.some(i => i.customerId?.name?.includes('Saman')), 'Search "saman" (lowercase) finds Saman invoice');

  const rSaman3 = await executeSearch('SAMAN');
  assert(rSaman3.some(i => i.customerId?.name?.includes('Saman')), 'Search "SAMAN" (uppercase) finds Saman invoice');

  const rSaman4 = await executeSearch('sama');
  assert(rSaman4.some(i => i.customerId?.name?.includes('Saman')), 'Search "sama" (prefix) finds Saman invoice');

  const rHafeez1 = await executeSearch('Abdul hafeez');
  assert(rHafeez1.some(i => i.customerId?.name?.includes('hafeez')), 'Search "Abdul hafeez" finds Hafeez invoice');

  const rHafeez2 = await executeSearch('hafeez');
  assert(rHafeez2.some(i => i.customerId?.name?.includes('hafeez')), 'Search "hafeez" (last name) finds Hafeez invoice');

  console.log('\n--- Test Suite 2: Phone Number Search ---');
  const rPhone1 = await executeSearch('0342');
  assert(rPhone1.some(i => i.customerId?.mobile === '03428344913'), 'Search "0342" (partial) finds Abdul hafeez (03428344913)');

  const rPhone2 = await executeSearch('03428344913');
  assert(rPhone2.some(i => i.customerId?.mobile === '03428344913'), 'Search "03428344913" (full) finds Abdul hafeez');

  const rPhone3 = await executeSearch('+92300');
  assert(rPhone3.some(i => i.customerId?.name?.includes('Saman')), 'Search "+92300" finds Saman (+92 300 8080922)');

  const rPhone4 = await executeSearch('0300');
  assert(rPhone4.some(i => i.customerId?.name?.includes('Saman')), 'Search "0300" (local prefix) finds Saman (+92 300 8080922)');

  const rPhone5 = await executeSearch('0321-9988776');
  assert(rPhone5.length > 0 && rPhone5.some(i => i.customerId?.mobile === '0321-9988776'), 'Search "0321-9988776" (formatted with dash) finds Tariq Mehmood');

  const rPhone6 = await executeSearch('03219988776');
  assert(rPhone6.length > 0 && rPhone6.some(i => i.customerId?.mobile === '0321-9988776'), 'Search "03219988776" (unformatted digits matching dashed phone) finds Tariq Mehmood');

  const rPhone7 = await executeSearch('03001234567');
  assert(rPhone7.length > 0 && rPhone7.some(i => i.customerId?.name?.includes('Mian Tariq')), 'Search "03001234567" (unformatted digits) finds Mian Tariq (0300-1234567)');

  console.log('\n--- Test Suite 3: Invoice Number Search ---');
  const rInv1 = await executeSearch('INV-2026-00040');
  assert(rInv1.some(i => i.number === 'INV-2026-00040'), 'Search "INV-2026-00040" finds exact invoice');

  const rInv2 = await executeSearch('00040');
  assert(rInv2.some(i => i.number === 'INV-2026-00040'), 'Search "00040" finds invoice INV-2026-00040');

  const rInv3 = await executeSearch('40');
  assert(rInv3.some(i => i.number === 'INV-2026-00040'), 'Search "40" finds invoice INV-2026-00040');

  const rInv4 = await executeSearch('INV-2026-00001');
  assert(rInv4.some(i => i.number === 'INV-2026-00001'), 'Search "INV-2026-00001" finds invoice');

  console.log('\n--- Test Suite 4: Wallpaper WP / Product Number Search ---');
  const rWp1 = await executeSearch('WP-101');
  assert(rWp1.some(i => i.items?.some(it => it.wp?.includes('101'))), 'Search "WP-101" finds invoice containing WP-101');

  const rWp2 = await executeSearch('101');
  assert(rWp2.some(i => i.items?.some(it => it.wp?.includes('101'))), 'Search "101" finds invoice containing WP-101');

  const rWp3 = await executeSearch('Spanish wallpaper');
  assert(rWp3.some(i => i.items?.some(it => it.wp?.includes('Spanish'))), 'Search "Spanish wallpaper" finds matching invoice');

  console.log('\n--- Test Suite 5: Invalid Search & Empty States ---');
  const rInvalid = await executeSearch('999999999999');
  assert(rInvalid.length === 0, 'Search "999999999999" returns 0 results');

  console.log('\n--- Test Suite 6: Status Filters + Search ---');
  const rFilter1 = await executeSearch('Saman', 'unpaid');
  assert(rFilter1.length > 0 && rFilter1.every(i => i.paid === 0), 'Search "Saman" + unpaid returns only unpaid invoices');

  const rFilter2 = await executeSearch('0342', 'paid');
  assert(rFilter2.length > 0 && rFilter2.every(i => i.remaining <= 0), 'Search "0342" + paid returns only completed invoices');

  console.log('\n--- Test Suite 7: Client-Side Instant Match Function ---');
  const testInv = {
    number: 'INV-2026-00040',
    customerId: { name: 'Saman dogar', mobile: '+92 300 8080922', code: 'CUS-00043' },
    items: [{ wp: 'Jute', qty: 20 }]
  };
  assert(matchesInvoiceQuery(testInv, 'saman'), 'Client matchesInvoiceQuery with "saman" returns true');
  assert(matchesInvoiceQuery(testInv, '0300'), 'Client matchesInvoiceQuery with "0300" returns true');
  assert(matchesInvoiceQuery(testInv, '923008080922'), 'Client matchesInvoiceQuery with "923008080922" returns true');
  assert(matchesInvoiceQuery(testInv, '40'), 'Client matchesInvoiceQuery with "40" returns true');
  assert(matchesInvoiceQuery(testInv, 'Jute'), 'Client matchesInvoiceQuery with "Jute" returns true');
  assert(!matchesInvoiceQuery(testInv, 'NonexistentXYZ'), 'Client matchesInvoiceQuery with "NonexistentXYZ" returns false');

  console.log(`\n========================================`);
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
