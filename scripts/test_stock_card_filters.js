const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Testing Stock Page Low Stock & Out of Stock Card Accessibility & Filtering ---');

const stockPagePath = path.join(__dirname, '../app/stock/page.tsx');
const content = fs.readFileSync(stockPagePath, 'utf8');

// 1. Check stockFilterMode state
assert(content.includes('stockFilterMode'), 'Stock page must have stockFilterMode state');
assert(content.includes("'all' | 'low_stock' | 'out_of_stock'"), 'stockFilterMode must support all, low_stock, and out_of_stock');

// 2. Check Low Stock card is clickable
assert(content.includes("onClick={() => setStockFilterMode((prev) => (prev === 'low_stock' ? 'all' : 'low_stock'))}"), 'Low stock card must toggle low_stock filter');
assert(content.includes('Low Stock Warnings'), 'Stock page has Low Stock Warnings card');

// 3. Check Out of Stock card is clickable
assert(content.includes("onClick={() => setStockFilterMode((prev) => (prev === 'out_of_stock' ? 'all' : 'out_of_stock'))}"), 'Out of stock card must toggle out_of_stock filter');
assert(content.includes('Out of Stock'), 'Stock page has Out of Stock card');

// 4. Check Total Wallpapers card is clickable to reset
assert(content.includes("onClick={() => setStockFilterMode('all')}"), 'Total Wallpapers card must reset filter to all');

// 5. Check Filter Toolbar button group
assert(content.includes('Filter Toggle Buttons Group'), 'Toolbar has filter toggle buttons group');
assert(content.includes('Filter Out of Stock (0 rolls)'), 'Toolbar has Out of Stock button');
assert(content.includes('Filter Low Stock (≤ 3 rolls)'), 'Toolbar has Low Stock button');

// 6. Check Active Filter Banner
assert(content.includes('Active Filter Banner'), 'Stock page shows Active Filter Banner when filtered');
assert(content.includes('Show All Wallpapers'), 'Active Filter Banner includes Show All Wallpapers reset button');

console.log('✅ ALL STOCK PAGE CARD ACCESSIBILITY & FILTERING ASSERTIONS PASSED!');
