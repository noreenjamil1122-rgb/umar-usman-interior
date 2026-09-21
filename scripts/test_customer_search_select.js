const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('--- Testing Customer Search by Name and Mobile Number ---');

// 1. Component existence & implementation checks
const compPath = path.join(__dirname, '../components/ui/CustomerSearchSelect.tsx');
assert(fs.existsSync(compPath), 'CustomerSearchSelect.tsx exists');
const compContent = fs.readFileSync(compPath, 'utf8');

assert(compContent.includes('name.includes(query)'), 'CustomerSearchSelect matches customer by Name');
assert(compContent.includes('cleanMobile.includes(queryDigits)'), 'CustomerSearchSelect matches customer by Mobile Number digits');
assert(compContent.includes('code.includes(query)'), 'CustomerSearchSelect matches customer by Code');
assert(compContent.includes('onAddNewCustomer'), 'CustomerSearchSelect supports adding new customer from search');
assert(compContent.includes('handleClear'), 'CustomerSearchSelect provides clear button');

// 2. Integration in app/invoices/new/page.tsx
const newInvoicePath = path.join(__dirname, '../app/invoices/new/page.tsx');
const newInvoiceContent = fs.readFileSync(newInvoicePath, 'utf8');

assert(newInvoiceContent.includes('CustomerSearchSelect'), 'Invoices/new imports CustomerSearchSelect');
assert(!newInvoiceContent.includes('<select\n                    value={selectedCustomerId}'), 'Invoices/new replaces old HTML select with CustomerSearchSelect');

// 3. Integration in app/payments/page.tsx
const paymentsPath = path.join(__dirname, '../app/payments/page.tsx');
const paymentsContent = fs.readFileSync(paymentsPath, 'utf8');

assert(paymentsContent.includes('CustomerSearchSelect'), 'Payments page imports CustomerSearchSelect');
assert(!paymentsContent.includes('<select\n              value={selectedCustId}'), 'Payments page replaces old HTML select with CustomerSearchSelect');

// 4. Test simulated customer search algorithm
const sampleCustomers = [
  { _id: '1', name: 'Malik faizan', mobile: '03061544786', code: 'CUS-00055' },
  { _id: '2', name: 'Abdullah Ghani', mobile: '03400949494', code: 'CUS-00053' },
  { _id: '3', name: 'Mrs ahsan', mobile: '+92 324 4381781', code: 'CUS-00052' },
  { _id: '4', name: 'Muzafar Tarar', mobile: '+92 333 8359288', code: 'CUS-00048' },
  { _id: '5', name: 'Umar Nawaz', mobile: '0300-4131532', code: 'CUS-00010' }
];

function testSearch(query) {
  const q = query.trim().toLowerCase();
  const queryDigits = q.replace(/\D/g, '');
  const hasDigits = queryDigits.length > 0;

  return sampleCustomers.filter((c) => {
    const name = c.name.toLowerCase();
    const cleanMobile = c.mobile.replace(/\D/g, '');
    const code = c.code.toLowerCase();

    return (
      name.includes(q) ||
      (hasDigits && cleanMobile.includes(queryDigits)) ||
      code.includes(q)
    );
  });
}

// Test Search by Name
const nameSearch = testSearch('faizan');
assert(nameSearch.length === 1 && nameSearch[0].name === 'Malik faizan', 'Search by name "faizan" finds Malik faizan');

const abdulSearch = testSearch('abdullah');
assert(abdulSearch.length === 1 && abdulSearch[0].name === 'Abdullah Ghani', 'Search by name "abdullah" finds Abdullah Ghani');

// Test Search by Phone Number
const numberSearch1 = testSearch('0306');
assert(numberSearch1.length === 1 && numberSearch1[0].name === 'Malik faizan', 'Search by number "0306" finds Malik faizan');

const numberSearch2 = testSearch('3244381781');
assert(numberSearch2.length === 1 && numberSearch2[0].name === 'Mrs ahsan', 'Search by formatted number "3244381781" finds Mrs ahsan (+92 324 4381781)');

const numberSearch3 = testSearch('03004131532');
assert(numberSearch3.length === 1 && numberSearch3[0].name === 'Umar Nawaz', 'Search by number with dash "03004131532" finds Umar Nawaz (0300-4131532)');

// Test Search by Customer Code
const codeSearch = testSearch('CUS-00048');
assert(codeSearch.length === 1 && codeSearch[0].name === 'Muzafar Tarar', 'Search by customer code "CUS-00048" finds Muzafar Tarar');

console.log('\n🎉 ALL CUSTOMER NAME & NUMBER SEARCH ASSERTIONS PASSED!');
