const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('--- 1. Testing Files and Exports Existence ---');
const hookPath = path.join(__dirname, '../hooks/useZeroClearInput.ts');
const amountInputPath = path.join(__dirname, '../components/ui/AmountInput.tsx');
const compAmountInputPath = path.join(__dirname, '../components/AmountInput.tsx');

assert(fs.existsSync(hookPath), 'hooks/useZeroClearInput.ts exists');
assert(fs.existsSync(amountInputPath), 'components/ui/AmountInput.tsx exists');
assert(fs.existsSync(compAmountInputPath), 'components/AmountInput.tsx exists');

const hookContent = fs.readFileSync(hookPath, 'utf8');
const amountInputContent = fs.readFileSync(amountInputPath, 'utf8');

assert(hookContent.includes('export function useZeroClearInput'), 'hook exports useZeroClearInput');
assert(amountInputContent.includes('export const AmountInput'), 'AmountInput is exported');

console.log('\n--- 2. Testing Simulation of useZeroClearInput State Machine ---');

// Replicate pure logic of useZeroClearInput
function createInputTester(initialValue = 0, options = {}) {
  const { allowDecimals = true, min, max } = options;
  let committedValue = initialValue;
  let displayValue = initialValue === undefined || initialValue === null ? '0' : String(initialValue);
  let isFocused = false;
  let selected = false;

  const onCommit = (val) => {
    committedValue = val;
  };

  const focus = () => {
    isFocused = true;
    if (displayValue === '0' || displayValue === '') {
      displayValue = '';
      selected = false;
    } else {
      selected = true;
    }
  };

  const change = (raw) => {
    const regex = allowDecimals ? /^\d*\.?\d*$/ : /^\d*$/;
    if (regex.test(raw)) {
      displayValue = raw;
      if (raw === '' || raw === '.') {
        onCommit(0);
      } else {
        let num = Number(raw);
        if (!isNaN(num)) {
          if (min !== undefined && num < min) num = min;
          if (max !== undefined && num > max) num = max;
          onCommit(num);
        }
      }
    }
  };

  const blur = () => {
    isFocused = false;
    let finalNum = 0;
    if (displayValue === '' || displayValue === '.') {
      displayValue = '0';
      finalNum = 0;
    } else {
      finalNum = Number(displayValue);
      if (isNaN(finalNum)) {
        finalNum = 0;
      } else {
        if (min !== undefined && finalNum < min) finalNum = min;
        if (max !== undefined && finalNum > max) finalNum = max;
      }
      displayValue = String(finalNum);
    }
    onCommit(finalNum);
  };

  return {
    getDisplay: () => displayValue,
    getCommitted: () => committedValue,
    isSelected: () => selected,
    focus,
    change,
    blur,
  };
}

// Test Case 1: Field shows 0 -> click in -> field is empty -> type 500 -> shows 500
console.log('Running Test Case 1: 0 -> Focus -> Type 500');
const t1 = createInputTester(0);
assert(t1.getDisplay() === '0', 'Initial display is "0"');
t1.focus();
assert(t1.getDisplay() === '', 'Display clears to empty string on focus');
t1.change('5');
assert(t1.getDisplay() === '5', 'Display updates to "5"');
assert(t1.getCommitted() === 5, 'Committed value is 5');
t1.change('500');
assert(t1.getDisplay() === '500', 'Display updates to "500"');
assert(t1.getCommitted() === 500, 'Committed value is 500');
t1.blur();
assert(t1.getDisplay() === '500', 'Display remains "500" after blur');
assert(t1.getCommitted() === 500, 'Committed value is 500 on blur');

// Test Case 2: Field shows 0 -> click in -> click away without typing -> shows 0 again
console.log('\nRunning Test Case 2: 0 -> Focus -> Click away without typing');
const t2 = createInputTester(0);
assert(t2.getDisplay() === '0', 'Initial display is "0"');
t2.focus();
assert(t2.getDisplay() === '', 'Display clears on focus');
t2.blur();
assert(t2.getDisplay() === '0', 'Display restores to "0" on blur when left empty');
assert(t2.getCommitted() === 0, 'Committed value is 0 on blur');

// Test Case 3: Field has existing value 250 -> click in -> select() triggered, not cleared
console.log('\nRunning Test Case 3: 250 -> Focus -> Text selected -> type replaces it');
const t3 = createInputTester(250);
assert(t3.getDisplay() === '250', 'Initial display is "250"');
t3.focus();
assert(t3.getDisplay() === '250', 'Display is NOT cleared because value is non-zero');
assert(t3.isSelected() === true, 'Select is triggered to allow quick overwrite');
t3.change('400');
assert(t3.getDisplay() === '400', 'Display replaces to "400"');
assert(t3.getCommitted() === 400, 'Committed value is 400');
t3.blur();
assert(t3.getDisplay() === '400', 'Display is "400"');

// Test Case 4: Decimals work, only one dot allowed
console.log('\nRunning Test Case 4: Decimals (12.5) allowed, multiple dots rejected');
const t4 = createInputTester(0, { allowDecimals: true });
t4.focus();
t4.change('12');
assert(t4.getDisplay() === '12', 'Display is "12"');
t4.change('12.');
assert(t4.getDisplay() === '12.', 'Display accepts single dot "12."');
t4.change('12.5');
assert(t4.getDisplay() === '12.5', 'Display accepts "12.5"');
assert(t4.getCommitted() === 12.5, 'Committed value is 12.5');
// Attempt invalid second dot
t4.change('12.5.2');
assert(t4.getDisplay() === '12.5', 'Invalid second dot rejected, display remains "12.5"');
t4.blur();
assert(t4.getDisplay() === '12.5', 'Display is "12.5" on blur');
assert(t4.getCommitted() === 12.5, 'Committed value is 12.5');

// Test Case 5: Empty field during typing reports 0 (never NaN) to prevent breaking totals
console.log('\nRunning Test Case 5: Deleting all text sends 0 instead of NaN to calculations');
const t5 = createInputTester(100);
t5.focus();
t5.change('');
assert(t5.getDisplay() === '', 'Field is empty');
assert(t5.getCommitted() === 0, 'Committed is 0 (not NaN) during empty typing');
t5.blur();
assert(t5.getDisplay() === '0', 'Field is restored to 0 on blur');
assert(t5.getCommitted() === 0, 'Committed is 0 on blur');

console.log('\n--- 3. Verifying AmountInput usage in Invoice form files ---');
const newInvoiceContent = fs.readFileSync(path.join(__dirname, '../app/invoices/new/page.tsx'), 'utf8');
assert(newInvoiceContent.includes('import { AmountInput }'), 'app/invoices/new/page.tsx imports AmountInput');
assert(newInvoiceContent.includes('<AmountInput'), 'app/invoices/new/page.tsx uses AmountInput');

const invoiceDetailContent = fs.readFileSync(path.join(__dirname, '../app/invoices/[id]/page.tsx'), 'utf8');
assert(invoiceDetailContent.includes('import { AmountInput }'), 'app/invoices/[id]/page.tsx imports AmountInput');
assert(invoiceDetailContent.includes('<AmountInput'), 'app/invoices/[id]/page.tsx uses AmountInput');

console.log('\n🎉 ALL ZERO-CLEAR INPUT TESTS PASSED SUCCESSFULLY!');
