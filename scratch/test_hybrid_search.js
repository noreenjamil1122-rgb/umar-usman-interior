const assert = require('assert');

// Mock data matching the real database format
const sampleProducts = [
  { _id: '1', wp: 'WP-TEST-7668', design: 'Gold Foil Damask', salePrice: 3500, stock: 44, brand: 'Exclusive', code: 'PRD-00014' },
  { _id: '2', wp: 'WP-TEST-261', design: 'Modern Geometric Gray', salePrice: 2800, stock: 12, brand: 'Exclusive', code: 'PRD-00013' },
  { _id: '3', wp: 'WP-TEST-1261', design: 'Floral Blossom Cream', salePrice: 3100, stock: 8, brand: 'Exclusive', code: 'PRD-00012' },
  { _id: '4', wp: 'WP-TEST-2610', design: 'Textured Linen Ivory', salePrice: 2900, stock: 20, brand: 'Exclusive', code: 'PRD-00011' },
  { _id: '5', wp: 'WP-TEST-788', design: 'Royal Velvet Damask Gold', salePrice: 4800, stock: 30, brand: 'Umar Usman', code: 'PRD-00010' },
  { _id: '6', wp: 'WP-TEST-876', design: 'Victorian Classic Red', salePrice: 4200, stock: 15, brand: 'Umar Usman', code: 'PRD-00009' },
  { _id: '7', wp: 'WP-TEST-427', design: 'Vintage Damask Blue', salePrice: 3900, stock: 18, brand: 'Umar Usman', code: 'PRD-00008' },
  { _id: '8', wp: 'WP-TEST-734', design: 'Imperial Gold Stripe', salePrice: 4500, stock: 23, brand: 'Umar Usman', code: 'PRD-00007' },
  { _id: '9', wp: 'WP-TEST-140', design: 'Minimalist Sand', salePrice: 2600, stock: 0, brand: 'Umar Usman', code: 'PRD-00006' },
  { _id: '10', wp: 'WL-112135', design: 'WL-112135', salePrice: 1800, stock: 1800, brand: 'Umar Usman', code: 'PRD-00020' },
  { _id: '11', wp: '202043', design: '202043', salePrice: 700, stock: 700, brand: 'Umar Usman', code: 'PRD-00048' },
];

function prepareCatalog(products) {
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
      designLower: (p.design || '').toLowerCase(),
      brandLower: (p.brand || '').toLowerCase(),
      codeLower: (p.code || '').toLowerCase(),
    };
  });
}

function searchWallpaperCatalog(preparedList, query) {
  const trimmed = query.trim();
  if (!trimmed) {
    return { hasDigit: false, matches: [] };
  }

  const cleanQuery = trimmed.toLowerCase();
  const stripped = cleanQuery.replace(/[\s-_]/g, '');
  const hasDigit = /\d/.test(trimmed);

  // Bare generic prefixes without numbers return empty
  const isBareGeneric = /^(w|p|wp|test|abc|xyz)$/i.test(stripped);
  if (isBareGeneric && !hasDigit) {
    return { hasDigit: false, matches: [] };
  }

  const queryDigits = trimmed.replace(/\D/g, '');
  const queryNorm = stripped;
  const queryInt = queryDigits ? parseInt(queryDigits, 10) : null;

  const exactMatches = [];
  const startsWithMatches = [];
  const containsMatches = [];
  const designMatches = [];

  for (let i = 0; i < preparedList.length; i++) {
    const item = preparedList[i];
    const { numericWp, tokens, intWp, normWp, designLower, brandLower, codeLower, product } = item;

    if (hasDigit) {
      if (!numericWp) continue;

      // 1. Exact match priority:
      const isExact =
        numericWp === queryDigits ||
        (intWp !== null && queryInt !== null && intWp === queryInt) ||
        normWp === queryNorm ||
        tokens.includes(queryDigits);

      if (isExact) {
        exactMatches.push(product);
        continue;
      }

      // 2. Starts with query digits
      const isStartsWith =
        numericWp.startsWith(queryDigits) ||
        tokens.some((t) => t.startsWith(queryDigits));

      if (isStartsWith) {
        startsWithMatches.push(product);
        continue;
      }

      // 3. Contains query digits or normalized string or code/design
      const isContains =
        numericWp.includes(queryDigits) ||
        tokens.some((t) => t.includes(queryDigits)) ||
        (queryNorm.length >= 3 && normWp.includes(queryNorm)) ||
        (codeLower && codeLower.includes(cleanQuery)) ||
        (designLower && designLower.includes(cleanQuery));

      if (isContains) {
        containsMatches.push(product);
        continue;
      }
    } else {
      // Text-only search: matches design, brand, or code!
      if (
        (designLower && designLower.includes(cleanQuery)) ||
        (brandLower && brandLower.includes(cleanQuery)) ||
        (codeLower && codeLower.includes(cleanQuery)) ||
        normWp.includes(queryNorm)
      ) {
        designMatches.push(product);
      }
    }
  }

  startsWithMatches.sort((a, b) => {
    const aNum = (a.wp || '').replace(/\D/g, '');
    const bNum = (b.wp || '').replace(/\D/g, '');
    if (aNum.length !== bNum.length) return aNum.length - bNum.length;
    return (a.wp || '').localeCompare(b.wp || '');
  });

  containsMatches.sort((a, b) => {
    const aNum = (a.wp || '').replace(/\D/g, '');
    const bNum = (b.wp || '').replace(/\D/g, '');
    const aIdx = aNum.indexOf(queryDigits);
    const bIdx = bNum.indexOf(queryDigits);
    if (aIdx !== bIdx && aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aNum.length !== bNum.length) return aNum.length - bNum.length;
    return (a.wp || '').localeCompare(b.wp || '');
  });

  const combined = hasDigit
    ? [...exactMatches, ...startsWithMatches, ...containsMatches]
    : designMatches;

  return {
    hasDigit,
    matches: combined.slice(0, 20),
  };
}

console.log('--- TESTING ENHANCED WALLPAPER SEARCH ---');
const prepared = prepareCatalog(sampleProducts);

// 1. EMPTY
const resEmpty = searchWallpaperCatalog(prepared, '');
assert.strictEqual(resEmpty.matches.length, 0);
assert.strictEqual(resEmpty.hasDigit, false);
console.log('✓ Empty string returns 0 matches');

// 2. BARE PREFIX
for (const bare of ['W', 'P', 'WP', 'wp', 'ABC', 'TEST']) {
  const res = searchWallpaperCatalog(prepared, bare);
  assert.strictEqual(res.matches.length, 0, `Failed for ${bare}`);
  assert.strictEqual(res.hasDigit, false);
  console.log(`✓ Bare prefix "${bare}" returns 0 matches and hasDigit: false`);
}

// 3. NUMERIC
const res7 = searchWallpaperCatalog(prepared, '7');
assert(res7.matches.length >= 4);
console.log(`✓ Numeric "7" returned ${res7.matches.length} items`);

const res7668 = searchWallpaperCatalog(prepared, '7668');
assert.strictEqual(res7668.matches.length, 1);
assert.strictEqual(res7668.matches[0].wp, 'WP-TEST-7668');
console.log(`✓ Numeric "7668" returned exact match ${res7668.matches[0].wp}`);

// 4. PREFIX NUMERIC
const resPref = searchWallpaperCatalog(prepared, 'WP-7668');
assert.strictEqual(resPref.matches[0].wp, 'WP-TEST-7668');
console.log(`✓ Prefix "WP-7668" found ${resPref.matches[0].wp}`);

// 5. DESIGN TEXT SEARCH (NEW!)
const resDamask = searchWallpaperCatalog(prepared, 'Damask');
assert(resDamask.matches.length >= 3);
console.log(`✓ Text "Damask" found ${resDamask.matches.length} items (First: ${resDamask.matches[0].design})`);

const resFloral = searchWallpaperCatalog(prepared, 'Floral');
assert.strictEqual(resFloral.matches.length, 1);
assert.strictEqual(resFloral.matches[0].design, 'Floral Blossom Cream');
console.log(`✓ Text "Floral" found ${resFloral.matches[0].design}`);

// 6. PREFIX + DIGITS SEARCH
const resWL = searchWallpaperCatalog(prepared, 'WL-112135');
assert.strictEqual(resWL.matches.length, 1);
assert.strictEqual(resWL.matches[0].wp, 'WL-112135');
console.log(`✓ "WL-112135" found ${resWL.matches[0].wp}`);

// 7. PRODUCT CODE SEARCH
const resCode = searchWallpaperCatalog(prepared, 'PRD-00020');
assert.strictEqual(resCode.matches.length, 1);
assert.strictEqual(resCode.matches[0].wp, 'WL-112135');
console.log(`✓ Product code "PRD-00020" found ${resCode.matches[0].wp}`);

console.log('🎉 ALL TESTS PASSED!');
