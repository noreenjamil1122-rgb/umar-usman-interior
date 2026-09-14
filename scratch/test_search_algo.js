const fs = require('fs');
const mongoose = require('mongoose');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/MONGODB_URI=(.*)/);
const uri = match ? match[1].trim() : '';

// The exact searchWallpaperCatalog implementation currently in app/invoices/new/page.tsx:
function prepareProducts(products) {
  return products.map((p) => {
    const rawWp = p.wp || '';
    const normWp = rawWp.toLowerCase().replace(/[\s-_]/g, '');
    const numericWp = rawWp.replace(/\D/g, '');
    const tokens = rawWp.match(/\d+/g) || [];
    const intWp = numericWp ? parseInt(numericWp, 10) : null;
    return {
      product: p,
      rawWp,
      normWp,
      numericWp,
      tokens,
      intWp,
    };
  });
}

function searchWallpaperCatalog(preparedList, query) {
  const trimmed = query.trim();
  if (!trimmed) {
    return { hasDigit: false, matches: [] };
  }

  // Requirement 2: Letter-only input must NOT return results
  if (!/\d/.test(trimmed)) {
    return { hasDigit: false, matches: [] };
  }

  const queryDigits = trimmed.replace(/\D/g, '');
  const queryNorm = trimmed.toLowerCase().replace(/[\s-_]/g, '');
  const queryInt = queryDigits ? parseInt(queryDigits, 10) : null;

  const exactMatches = [];
  const startsWithMatches = [];
  const containsMatches = [];

  for (let i = 0; i < preparedList.length; i++) {
    const item = preparedList[i];
    const { numericWp, tokens, intWp, normWp, product } = item;

    if (!numericWp) continue;

    const isExact =
      numericWp === queryDigits ||
      (intWp !== null && queryInt !== null && intWp === queryInt) ||
      normWp === queryNorm ||
      tokens.includes(queryDigits);

    if (isExact) {
      exactMatches.push(product);
      continue;
    }

    const isStartsWith =
      numericWp.startsWith(queryDigits) ||
      tokens.some((t) => t.startsWith(queryDigits));

    if (isStartsWith) {
      startsWithMatches.push(product);
      continue;
    }

    const isContains =
      numericWp.includes(queryDigits) ||
      tokens.some((t) => t.includes(queryDigits)) ||
      (queryNorm.length >= 3 && normWp.includes(queryNorm));

    if (isContains) {
      containsMatches.push(product);
    }
  }

  const combined = [...exactMatches, ...startsWithMatches, ...containsMatches];
  return { hasDigit: true, matches: combined };
}

mongoose.connect(uri).then(async () => {
  const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  const allProds = await Product.find().lean();
  console.log('Loaded', allProds.length, 'products from DB.');

  const prepared = prepareProducts(allProds);

  const testQueries = [
    'WL',
    'DF',
    'Royal',
    'Gold',
    'Damask',
    '112135',
    'WL-112135',
    'WL112135',
    '112',
    '89113',
    'DF-89113',
    '202043',
    '2020',
    '43',
    '150-2054',
    '2054',
    '150',
    '7668',
    'WP-TEST-7668',
    'WP7668',
    'PRD-00015',
    'PRD',
  ];

  for (const q of testQueries) {
    const res = searchWallpaperCatalog(prepared, q);
    console.log(`Query: "${q}" -> hasDigit: ${res.hasDigit}, Matches: ${res.matches.length} ${res.matches.length ? `(First: ${res.matches[0].wp} - ${res.matches[0].design})` : 'NONE'}`);
  }

  process.exit(0);
});
