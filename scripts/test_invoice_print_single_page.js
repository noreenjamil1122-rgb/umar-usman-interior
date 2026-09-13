const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('--- Testing 1-Page Print Cover & Seller Details in app/invoices/[id]/print/page.tsx ---');

const printPagePath = path.join(__dirname, '../app/invoices/[id]/print/page.tsx');
const printContent = fs.readFileSync(printPagePath, 'utf8');

// 1. Check Seller Name extraction & display
assert(printContent.includes('sellerName'), 'Print page extracts and uses sellerName');
assert(printContent.includes('sellerContact'), 'Print page extracts and uses sellerContact');

// 2. Check Seller column in Metadata table
assert(
  printContent.includes('Seller / Sales Officer') || printContent.includes('Seller / Sales Rep'),
  'Print page has dedicated Seller / Sales Officer section in metadata'
);

// 3. Check Signatory has Seller Name & contact
assert(
  printContent.includes('{sellerName}') && printContent.includes('{sellerContact}'),
  'Print page footer signatory displays seller name and contact'
);

// 4. Check CSS print rules for strict 1-page A4
assert(
  printContent.includes('@page') && printContent.includes('size: A4 portrait'),
  'Print page includes @page { size: A4 portrait } CSS rule'
);
assert(
  printContent.includes('page-break-inside: avoid') || printContent.includes('avoid-break'),
  'Print page applies page-break avoidance to prevent overflowing to page 2'
);

// 5. Check 2-Column instructions layout to save vertical space
assert(
  printContent.includes('grid-cols-2'),
  'Print page renders instructions in a 2-column grid to guarantee 1-page fit'
);

console.log('\n--- Testing Invoice Details Page (app/invoices/[id]/page.tsx) ---');

const invoiceDetailPagePath = path.join(__dirname, '../app/invoices/[id]/page.tsx');
const detailContent = fs.readFileSync(invoiceDetailPagePath, 'utf8');

assert(
  detailContent.includes('Seller / Sales Officer'),
  'Invoice detail page displays Seller / Sales Officer box'
);
assert(
  detailContent.includes('invoice.sellerName'),
  'Invoice detail page uses invoice.sellerName'
);
assert(
  detailContent.includes('invoice.sellerContact'),
  'Invoice detail page uses invoice.sellerContact'
);
assert(
  detailContent.includes('Seller / Sales Officer: ${invoice.sellerName'),
  'WhatsApp share message includes seller name and contact'
);

console.log('\n🎉 ALL 1-PAGE PRINT & SELLER DETAILS TESTS PASSED!');
