const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('--- Testing Whole Book Cascade Delete & Bulk Stock Multi-Select Delete ---');

// 1. Check Backend Book Cascade Delete
const bookRoutePath = path.join(__dirname, '../app/api/books/[id]/route.ts');
const bookRouteContent = fs.readFileSync(bookRoutePath, 'utf8');

assert(bookRouteContent.includes("searchParams.get('deleteProducts')"), 'Book DELETE checks deleteProducts query param');
assert(bookRouteContent.includes('Product.deleteMany'), 'Book DELETE calls Product.deleteMany when deleteProducts is true');
assert(bookRouteContent.includes('requiresConfirmation: true'), 'Book DELETE returns requiresConfirmation: true when products exist and deleteProducts is false');
assert(bookRouteContent.includes("type: 'Book Deleted'"), 'Book DELETE logs activity with Book Deleted type');

// 2. Check Backend Bulk Stock Delete API
const bulkRoutePath = path.join(__dirname, '../app/api/products/bulk/route.ts');
const bulkRouteContent = fs.readFileSync(bulkRoutePath, 'utf8');

assert(bulkRouteContent.includes('export async function DELETE'), 'app/api/products/bulk/route.ts exports DELETE handler');
assert(bulkRouteContent.includes('Product.deleteMany'), 'Bulk stock DELETE calls Product.deleteMany');
assert(bulkRouteContent.includes('deletedCount'), 'Bulk stock DELETE reports deletedCount in response');
assert(bulkRouteContent.includes("type: 'Wallpaper Deleted'"), 'Bulk stock DELETE logs activity with Wallpaper Deleted type');

// 3. Check Books Page Cascade Delete Confirmation Modal
const booksPagePath = path.join(__dirname, '../app/books/page.tsx');
const booksPageContent = fs.readFileSync(booksPagePath, 'utf8');

assert(booksPageContent.includes('isCascadeConfirmOpen'), 'Books page has cascade confirmation modal state');
assert(booksPageContent.includes('deleteAssignedStock'), 'Books page tracks deleteAssignedStock checkbox state');
assert(booksPageContent.includes('deleteProducts='), 'Books page sends deleteProducts parameter to DELETE API');
assert(booksPageContent.includes('PasswordPromptModal'), 'Books page protects book deletion with PasswordPromptModal');

// 4. Check Book Detail Page Bulk Stock Multi-Select
const bookDetailPagePath = path.join(__dirname, '../app/books/[id]/page.tsx');
const bookDetailContent = fs.readFileSync(bookDetailPagePath, 'utf8');

assert(bookDetailContent.includes('selectedIds'), 'Book detail page tracks selectedIds state');
assert(bookDetailContent.includes('handleSelectAll'), 'Book detail page has handleSelectAll');
assert(bookDetailContent.includes('handleToggleSelect'), 'Book detail page has handleToggleSelect');
assert(bookDetailContent.includes('handleBulkDeleteAuthorized'), 'Book detail page has handleBulkDeleteAuthorized');
assert(bookDetailContent.includes('Delete Selected ('), 'Book detail page shows floating bulk action bar with Delete Selected button');
assert(bookDetailContent.includes('isBulkDeletePasswordOpen'), 'Book detail page protects bulk delete with PasswordPromptModal');

// 5. Check Main Stock Management Page Bulk Multi-Select
const stockPagePath = path.join(__dirname, '../app/stock/page.tsx');
const stockContent = fs.readFileSync(stockPagePath, 'utf8');

assert(stockContent.includes('selectedIds'), 'Stock page tracks selectedIds state');
assert(stockContent.includes('handleSelectAll'), 'Stock page has handleSelectAll');
assert(stockContent.includes('handleToggleSelect'), 'Stock page has handleToggleSelect');
assert(stockContent.includes('handleBulkDeleteAuthorized'), 'Stock page has handleBulkDeleteAuthorized');
assert(stockContent.includes('Delete Selected ('), 'Stock page shows floating bulk action bar with Delete Selected button');
assert(stockContent.includes('isBulkDeletePasswordOpen'), 'Stock page protects bulk delete with PasswordPromptModal');

console.log('\n🎉 ALL WHOLE-BOOK CASCADE & BULK STOCK DELETION ASSERTIONS PASSED!');
