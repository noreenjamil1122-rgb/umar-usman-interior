const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('--- Testing Supplier Lock & Customer Open State in Customers Page ---');

const customersPagePath = path.join(__dirname, '../app/customers/page.tsx');
const customersPageContent = fs.readFileSync(customersPagePath, 'utf8');

// 1. PasswordPromptModal with protectionType="supplier" must be in customers/page.tsx
assert(
  customersPageContent.includes('protectionType="supplier"') || customersPageContent.includes('type="supplier"'),
  'app/customers/page.tsx uses Supplier protection type for PasswordPromptModal'
);

// 2. sessionStorage item 'supplier_unlocked' should be checked/used (shared with /invoices)
assert(
  customersPageContent.includes("'supplier_unlocked'"),
  'app/customers/page.tsx checks and updates sessionStorage supplier_unlocked'
);

// 3. Suppliers Only tab handles PIN lock
assert(
  customersPageContent.includes('handleTabChange') && customersPageContent.includes('supplierUnlocked'),
  'app/customers/page.tsx checks supplierUnlocked when clicking Suppliers Only tab'
);

// 4. Customer party tab is NOT locked
assert(
  !customersPageContent.includes("typeTab === 'customer' && !supplierUnlocked"),
  'Customer tab has no supplier lock applied to it'
);

// 5. Header / lock button allows re-locking suppliers
assert(
  customersPageContent.includes('handleLockSupplier'),
  'app/customers/page.tsx provides handleLockSupplier to re-lock'
);

console.log('\n--- Testing Customer Details Profile Page ---');
const customerIdPagePath = path.join(__dirname, '../app/customers/[id]/page.tsx');
const customerIdPageContent = fs.readFileSync(customerIdPagePath, 'utf8');

// 6. Lock applies strictly to supplier and not customer
assert(
  customerIdPageContent.includes("customer?.type === 'supplier' && !supplierUnlocked"),
  'isLocked is strictly defined for supplier type only when not unlocked'
);

// 7. PasswordPromptModal is present in details page
assert(
  customerIdPageContent.includes('PasswordPromptModal') && customerIdPageContent.includes('isSupplierAuthOpen'),
  'Customer profile page includes PasswordPromptModal for supplier unlock'
);

console.log('\n--- Testing Backend API Route Support for Supplier Unlock ---');
const customerApiRoutePath = path.join(__dirname, '../app/api/customers/route.ts');
const customerApiRouteContent = fs.readFileSync(customerApiRoutePath, 'utf8');

assert(
  customerApiRouteContent.includes('x-supplier-unlocked'),
  'app/api/customers/route.ts checks x-supplier-unlocked header'
);

const customerIdApiRoutePath = path.join(__dirname, '../app/api/customers/[id]/route.ts');
const customerIdApiRouteContent = fs.readFileSync(customerIdApiRoutePath, 'utf8');

assert(
  customerIdApiRouteContent.includes('x-supplier-unlocked'),
  'app/api/customers/[id]/route.ts checks x-supplier-unlocked header'
);

console.log('\n🎉 ALL PIN LOCK & CUSTOMER UNLOCKED CHECKS PASSED!');
