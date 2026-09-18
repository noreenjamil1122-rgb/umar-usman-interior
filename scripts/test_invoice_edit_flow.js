const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('--- Testing Invoice Editing, Inventory Sync & Clean Print Protection ---');

// 1. Check Print Page: No "Edited" statement in print template
const printPagePath = path.join(__dirname, '../app/invoices/[id]/print/page.tsx');
const printContent = fs.readFileSync(printPagePath, 'utf8');

assert(!printContent.includes('isEdited'), 'Print page does not render isEdited flag');
assert(!printContent.toLowerCase().includes('invoice was edited'), 'Print page does not contain "invoice was edited" statement');
assert(!printContent.includes('Edit History'), 'Print page does not display Edit History');

// 2. Check Software UI: Details page and List page display Edited indicator
const detailsPagePath = path.join(__dirname, '../app/invoices/[id]/page.tsx');
const detailsContent = fs.readFileSync(detailsPagePath, 'utf8');

assert(detailsContent.includes('invoice.isEdited'), 'Invoice details page checks invoice.isEdited');
assert(detailsContent.includes('Invoice Modification History'), 'Invoice details page displays Invoice Modification History for Owner');
assert(detailsContent.includes('/invoices/${invoice._id}/edit'), 'Invoice details page routes to dedicated /edit page');

const listPagePath = path.join(__dirname, '../app/invoices/page.tsx');
const listContent = fs.readFileSync(listPagePath, 'utf8');
assert(listContent.includes('inv.isEdited'), 'Invoices list page checks inv.isEdited to display badge');

// 3. Check Dedicated Edit Page
const editPagePath = path.join(__dirname, '../app/invoices/[id]/edit/page.tsx');
assert(fs.existsSync(editPagePath), 'Dedicated edit page app/invoices/[id]/edit/page.tsx exists');
const editContent = fs.readFileSync(editPagePath, 'utf8');
assert(editContent.includes('searchWallpaperCatalog'), 'Edit page includes live wallpaper catalog search');
assert(editContent.includes('handleAddWallpaperRow'), 'Edit page allows adding wallpaper roll rows');
assert(editContent.includes('handleAddOtherRow'), 'Edit page allows adding other service rows');

// 4. Check Backend PUT Endpoint: stock reconciliation and audit logging
const routePath = path.join(__dirname, '../app/api/invoices/[id]/route.ts');
const routeContent = fs.readFileSync(routePath, 'utf8');
assert(routeContent.includes('StockHistory.create'), 'PUT endpoint records stock history on item edits');
assert(routeContent.includes('isEdited = true'), 'PUT endpoint sets isEdited = true on invoice update');
assert(routeContent.includes('editHistory.push'), 'PUT endpoint appends to editHistory on invoice update');

console.log('\n🎉 ALL INVOICE EDITING & PRINT CLEANLINESS ASSERTIONS PASSED!');
