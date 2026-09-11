// Comprehensive test script for Wallpaper Search system
const assert = require('assert');

// Mock data matching the real database format
const sampleProducts = [
  { _id: '1', wp: 'WP-TEST-7668', design: 'Gold Foil Damask', salePrice: 3500, stock: 44, brand: 'Exclusive' },
  { _id: '2', wp: 'WP-TEST-261', design: 'Modern Geometric Gray', salePrice: 2800, stock: 12, brand: 'Exclusive' },
  { _id: '3', wp: 'WP-TEST-1261', design: 'Floral Blossom Cream', salePrice: 3100, stock: 8, brand: 'Exclusive' },
  { _id: '4', wp: 'WP-TEST-2610', design: 'Textured Linen Ivory', salePrice: 2900, stock: 20, brand: 'Exclusive' },
  { _id: '5', wp: 'WP-TEST-788', design: 'Royal Velvet Damask Gold', salePrice: 4800, stock: 30, brand: 'Umar Usman' },
  { _id: '6', wp: 'WP-TEST-876', design: 'Victorian Classic Red', salePrice: 4200, stock: 15, brand: 'Umar Usman' },
  { _id: '7', wp: 'WP-TEST-427', design: 'Vintage Damask Blue', salePrice: 3900, stock: 18, brand: 'Umar Usman' },
  { _id: '8', wp: 'WP-TEST-734', design: 'Imperial Gold Stripe', salePrice: 4500, stock: 23, brand: 'Umar Usman' },
  { _id: '9', wp: 'WP-TEST-140', design: 'Minimalist Sand', salePrice: 2600, stock: 0, brand: 'Umar Usman' },
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

    // 1. Exact match priority
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

    // 3. Contains query digits
    const isContains =
      numericWp.includes(queryDigits) ||
      tokens.some((t) => t.includes(queryDigits)) ||
      (queryNorm.length >= 3 && normWp.includes(queryNorm));

    if (isContains) {
      containsMatches.push(product);
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

  const combined = [...exactMatches, ...startsWithMatches, ...containsMatches];

  return {
    hasDigit: true,
    matches: combined.slice(0, 15),
  };
}

console.log('--- STARTING WALLPAPER SEARCH TESTS ---');
const prepared = prepareCatalog(sampleProducts);

// 1. EMPTY TEST
{
  const res = searchWallpaperCatalog(prepared, '');
  assert.strictEqual(res.hasDigit, false);
  assert.strictEqual(res.matches.length, 0);
  console.log('✓ EMPTY "" returns 0 matches and hasDigit: false');
}

// 2. LETTERS TESTS (Must NOT return results)
{
  for (const letterInput of ['W', 'P', 'WP', 'wp', 'ABC', 'TEST']) {
    const res = searchWallpaperCatalog(prepared, letterInput);
    assert.strictEqual(res.hasDigit, false, `Failed hasDigit for ${letterInput}`);
    assert.strictEqual(res.matches.length, 0, `Failed 0 matches for ${letterInput}`);
    console.log(`✓ LETTER-ONLY "${letterInput}" returns 0 matches and hasDigit: false`);
  }
}

// 3. PROGRESSIVE NUMERIC SEARCH (7 -> 76 -> 766 -> 7668)
{
  const res7 = searchWallpaperCatalog(prepared, '7');
  assert.strictEqual(res7.hasDigit, true);
  // Items with 7: 7668, 788, 876, 427, 734
  assert(res7.matches.length >= 4, `Expected at least 4 items with '7', got ${res7.matches.length}`);
  console.log(`✓ NUMERIC "7" returned ${res7.matches.length} items`);

  const res76 = searchWallpaperCatalog(prepared, '76');
  assert.strictEqual(res76.hasDigit, true);
  // Items matching 76: 7668 (starts with 76), 876 (contains 76)
  assert(res76.matches.some((p) => p.wp === 'WP-TEST-7668'));
  assert(res76.matches.some((p) => p.wp === 'WP-TEST-876'));
  assert(res76.matches.length < res7.matches.length, 'Results should progressively narrow');
  console.log(`✓ NUMERIC "76" narrowed results to ${res76.matches.length} items`);

  const res766 = searchWallpaperCatalog(prepared, '766');
  assert.strictEqual(res766.hasDigit, true);
  assert.strictEqual(res766.matches.length, 1);
  assert.strictEqual(res766.matches[0].wp, 'WP-TEST-7668');
  console.log(`✓ NUMERIC "766" narrowed results to 1 item: ${res766.matches[0].wp}`);

  const res7668 = searchWallpaperCatalog(prepared, '7668');
  assert.strictEqual(res7668.hasDigit, true);
  assert.strictEqual(res7668.matches.length, 1);
  assert.strictEqual(res7668.matches[0].wp, 'WP-TEST-7668');
  assert.strictEqual(res7668.matches[0].design, 'Gold Foil Damask');
  assert.strictEqual(res7668.matches[0].salePrice, 3500);
  assert.strictEqual(res7668.matches[0].stock, 44);
  console.log(`✓ NUMERIC "7668" returned exact match: ${res7668.matches[0].wp} (Gold Foil Damask, Rs. 3,500, 44 rolls)`);
}

// 4. PREFIX TESTS ("WP-7668", "WP7668")
{
  for (const prefixInput of ['WP-7668', 'WP7668', 'wp-7668', 'wp7668']) {
    const res = searchWallpaperCatalog(prepared, prefixInput);
    assert.strictEqual(res.hasDigit, true);
    assert.strictEqual(res.matches.length, 1);
    assert.strictEqual(res.matches[0].wp, 'WP-TEST-7668');
    console.log(`✓ PREFIX "${prefixInput}" normalized and found: ${res.matches[0].wp}`);
  }
}

// 5. INVALID NUMBER TEST ("999999999" and "123")
{
  const res999 = searchWallpaperCatalog(prepared, '999999999');
  assert.strictEqual(res999.hasDigit, true);
  assert.strictEqual(res999.matches.length, 0);
  console.log('✓ INVALID "999999999" returned 0 matches with hasDigit: true');

  const res123 = searchWallpaperCatalog(prepared, '123');
  assert.strictEqual(res123.hasDigit, true);
  assert.strictEqual(res123.matches.length, 0);
  console.log('✓ INVALID "123" returned 0 matches with hasDigit: true');
}

// 6. EXACT MATCH PRIORITY TEST (261 vs 1261 vs 2610)
{
  const res261 = searchWallpaperCatalog(prepared, '261');
  assert.strictEqual(res261.hasDigit, true);
  assert(res261.matches.length >= 3, `Expected at least 3 matches for 261, got ${res261.matches.length}`);
  assert.strictEqual(res261.matches[0].wp, 'WP-TEST-261', `First result MUST be exact match WP-TEST-261, got ${res261.matches[0].wp}`);
  console.log(`✓ EXACT MATCH PRIORITY: "261" prioritized ${res261.matches[0].wp} ahead of partial matches [${res261.matches.map(m => m.wp).join(', ')}]`);
}

// 7. PERFORMANCE BENCHMARK
{
  const start = performance.now();
  for (let i = 0; i < 10000; i++) {
    searchWallpaperCatalog(prepared, '76');
  }
  const end = performance.now();
  const timePerSearch = (end - start) / 10000;
  console.log(`✓ PERFORMANCE: 10,000 live search queries executed in ${(end - start).toFixed(2)}ms (${(timePerSearch * 1000).toFixed(2)} microseconds per search)`);
  assert(timePerSearch < 1, 'Search took longer than 1ms');
}

// 8. LIVE DATABASE TESTS (If MONGODB_URI exists)
async function runLiveDbTests() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('\n--- ALL IN-MEMORY TESTS PASSED! (No live DB URI provided) ---');
    return;
  }

  const mongoose = require('mongoose');
  console.log('\n--- TESTING AGAINST LIVE MONGODB CATALOG ---');
  try {
    await mongoose.connect(uri);
    const dbProducts = await mongoose.connection.collection('products').find({}).toArray();
    console.log(`Loaded ${dbProducts.length} live products from database.`);

    const dbPrepared = prepareCatalog(dbProducts);

    // Pick a real product
    const realProd = dbProducts.find((p) => p.wp && /\d+/.test(p.wp));
    if (realProd) {
      const realDigits = realProd.wp.replace(/\D/g, '');
      console.log(`Selected live sample: ${realProd.wp} (numeric: ${realDigits})`);

      // Test searching by digits
      const digitRes = searchWallpaperCatalog(dbPrepared, realDigits);
      assert(digitRes.matches.length > 0, `Failed to find live product ${realProd.wp} by digits ${realDigits}`);
      assert.strictEqual(digitRes.matches[0].wp, realProd.wp, `Top match should be exact match ${realProd.wp}, got ${digitRes.matches[0].wp}`);
      console.log(`✓ Live exact numeric search "${realDigits}" correctly returned top match: ${digitRes.matches[0].wp}`);

      // Test searching with WP prefix
      const prefixRes = searchWallpaperCatalog(dbPrepared, 'WP-' + realDigits);
      assert(prefixRes.matches.length > 0, `Failed to find live product by prefix WP-${realDigits}`);
      assert.strictEqual(prefixRes.matches[0].wp, realProd.wp, `Top match on prefix should be ${realProd.wp}`);
      console.log(`✓ Live prefix search "WP-${realDigits}" correctly returned top match: ${prefixRes.matches[0].wp}`);
    }

    // Verify letter-only inputs return 0 results on live catalog
    for (const letterInput of ['W', 'P', 'WP', 'ABC', 'TEST']) {
      const liveLetterRes = searchWallpaperCatalog(dbPrepared, letterInput);
      assert.strictEqual(liveLetterRes.hasDigit, false);
      assert.strictEqual(liveLetterRes.matches.length, 0);
      console.log(`✓ Live catalog: letter-only "${letterInput}" returned 0 matches`);
    }

    console.log('\n--- ALL TESTS (IN-MEMORY & LIVE DB) PASSED SUCCESSFULLY! ---');
  } catch (err) {
    console.error('Live DB test error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runLiveDbTests();
