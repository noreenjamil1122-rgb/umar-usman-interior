const http = require('http');

function api(method, path, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      'host': 'localhost:3000',
      'origin': 'http://localhost:3000',
    };
    if (data) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    if (cookie) headers['Cookie'] = cookie;

    const req = http.request('http://localhost:3000' + path, { method, headers }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(resBody); } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          raw: resBody,
        });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runNewFeaturesTest() {
  console.log('===========================================================');
  console.log('🧪 TESTING NEW FEATURES: TABS, DYNAMIC INVOICES & TWO-SECTION ITEMS');
  console.log('===========================================================\n');

  // 1. Admin Authentication
  console.log('--- STEP 1: Admin Authentication ---');
  const loginRes = await api('POST', '/api/auth/login', {
    email: 'admin@umarusman.com',
    password: 'adminpassword123',
  });
  assert(loginRes.status === 200, 'Admin login successful');
  const adminCookie = loginRes.headers['set-cookie'][0].split(';')[0];

  // 2. Create Parties: One Customer and One Supplier
  console.log('\n--- STEP 2: Party Types (Customer & Supplier Creation) ---');
  const custRes = await api('POST', '/api/customers', {
    name: `Client Alpha ${Date.now()}`,
    mobile: '0300-1111222',
    type: 'customer',
  }, adminCookie);
  assert(custRes.status === 201, 'Customer created');
  const custId = custRes.data.data._id;
  assert(custRes.data.data.type === 'customer', 'Customer party type confirmed as customer');

  const suppRes = await api('POST', '/api/customers', {
    name: `Vendor Mills ${Date.now()}`,
    mobile: '0300-9999888',
    type: 'supplier',
  }, adminCookie);
  assert(suppRes.status === 201, 'Supplier created');
  const suppId = suppRes.data.data._id;
  assert(suppRes.data.data.type === 'supplier', 'Supplier party type confirmed as supplier');

  // 3. Product creation for stock verification
  console.log('\n--- STEP 3: Catalog Product with Opening Stock ---');
  const wpCode = `WP-TEST-${Math.floor(Math.random() * 8999 + 1000)}`;
  const prodRes = await api('POST', '/api/products', {
    wp: wpCode,
    design: 'Gold Foil Damask',
    category: 'Wallpaper',
    purchasePrice: 2000,
    salePrice: 3500,
    stock: 50,
    minStock: 10,
  }, adminCookie);
  assert(prodRes.status === 201, 'Product created with 50 rolls');
  const prodId = prodRes.data.data._id;

  // 4. Two-Section Line Items Invoice & Stock Deduction (Customer Invoice)
  console.log('\n--- STEP 4: Two-Section Line Items Invoice (Customer) ---');
  // Section 1: Wallpaper (productId present, qty: 6, rate: 3500 => 21,000)
  // Section 2: Other items (Gum: 1500, Labour: 2500 => 4,000)
  // Subtotal = 25,000
  // Flat PKR Discount = 2,000
  // Total = 23,000
  // Paid = 10,000 => Remaining = 13,000
  const custInvRes = await api('POST', '/api/invoices', {
    customerId: custId,
    reference: 'Living Room Remodel',
    items: [
      {
        productId: prodId,
        wp: wpCode,
        design: 'Gold Foil Damask',
        qty: 6,
        rate: 3500,
        amount: 21000,
      },
      {
        wp: 'WALLPAPER GUM',
        design: 'Special Adhesive Chemical',
        qty: 1,
        rate: 1500,
        amount: 1500,
      },
      {
        wp: 'INSTALLATION LABOUR',
        design: 'Master Wallpaper Pasting Work',
        qty: 1,
        rate: 2500,
        amount: 2500,
      }
    ],
    discount: 2000, // Flat PKR 2,000 discount
    paid: 10000,
  }, adminCookie);

  if (custInvRes.status !== 201) {
    console.error('Customer Invoice Error:', custInvRes.status, custInvRes.data);
  }
  assert(custInvRes.status === 201, `Customer invoice created (HTTP 201)`);
  const custInv = custInvRes.data.data;
  assert(custInv.subtotal === 25000, `Subtotal correct: PKR 25,000 (Got ${custInv.subtotal})`);
  assert(custInv.discount === 2000, `Flat PKR Discount stored: PKR 2,000 (Got ${custInv.discount})`);
  assert(custInv.total === 23000, `Total correct after flat discount: PKR 23,000 (Got ${custInv.total})`);
  assert(custInv.remaining === 13000, `Remaining balance correct: PKR 13,000 (Got ${custInv.remaining})`);

  // Verify stock deduction: only wallpaper roll (6 rolls deducted), other items zero stock-cut
  const prodCheck = await api('GET', `/api/products/${prodId}`, null, adminCookie);
  const currentStock = prodCheck.data.data.product ? prodCheck.data.data.product.stock : prodCheck.data.data.stock;
  assert(currentStock === 44, `Product stock deducted by exactly 6 rolls (50 - 6 = 44, Got ${currentStock})`);

  // 5. Create Supplier Invoice
  console.log('\n--- STEP 5: Create Supplier Invoice ---');
  const suppInvRes = await api('POST', '/api/invoices', {
    customerId: suppId,
    reference: 'Factory Batch Inward',
    items: [
      {
        wp: 'SUPPLIER RAW ROLLS',
        design: 'Bulk Import 100 Rolls Material',
        qty: 100,
        rate: 1500,
        amount: 150000,
      }
    ],
    discount: 5000, // PKR 5,000 Flat supplier discount
    paid: 50000,
  }, adminCookie);

  if (suppInvRes.status !== 201) {
    console.error('Supplier Invoice Error:', suppInvRes.status, suppInvRes.data);
  }
  assert(suppInvRes.status === 201, 'Supplier invoice created (HTTP 201)');
  const suppInv = suppInvRes.data.data;
  assert(suppInv.total === 145000, `Supplier invoice total: PKR 145,000 (Got ${suppInv.total})`);

  // 6. Test Invoices API Tab Filtering
  console.log('\n--- STEP 6: Invoices Tab Filtering (/api/invoices?partyType=...) ---');
  const custTabRes = await api('GET', '/api/invoices?partyType=customer', null, adminCookie);
  assert(custTabRes.status === 200, 'Customer tab invoices fetched');
  const custInvoices = custTabRes.data.data;
  const hasCustInvInCustTab = custInvoices.some(i => i._id === custInv._id);
  const hasSuppInvInCustTab = custInvoices.some(i => i._id === suppInv._id);
  assert(hasCustInvInCustTab === true, 'Customer invoice appears in Customer Invoices tab');
  assert(hasSuppInvInCustTab === false, 'Supplier invoice is EXCLUDED from Customer Invoices tab');

  const suppTabRes = await api('GET', '/api/invoices?partyType=supplier', null, adminCookie);
  assert(suppTabRes.status === 200, 'Supplier tab invoices fetched');
  const suppInvoices = suppTabRes.data.data;
  const hasCustInvInSuppTab = suppInvoices.some(i => i._id === custInv._id);
  const hasSuppInvInSuppTab = suppInvoices.some(i => i._id === suppInv._id);
  assert(hasSuppInvInSuppTab === true, 'Supplier invoice appears in Supplier Invoices tab');
  assert(hasCustInvInSuppTab === false, 'Customer invoice is EXCLUDED from Supplier Invoices tab');

  // 7. Dynamic Re-assignment: Change Customer type to 'supplier'
  console.log('\n--- STEP 7: Dynamic Re-assignment (Customer switched to Supplier) ---');
  const updateCustRes = await api('PUT', `/api/customers/${custId}`, {
    type: 'supplier',
  }, adminCookie);
  assert(updateCustRes.status === 200, 'Customer switched to supplier type');

  // Re-fetch customer tab: the original customer invoice should now be gone from customer tab!
  const recheckCustTab = await api('GET', '/api/invoices?partyType=customer', null, adminCookie);
  const nowInCustTab = recheckCustTab.data.data.some(i => i._id === custInv._id);
  assert(nowInCustTab === false, 'Dynamic move: Customer invoice is NO LONGER in Customer tab');

  // Re-fetch supplier tab: the original customer invoice should now appear in supplier tab!
  const recheckSuppTab = await api('GET', '/api/invoices?partyType=supplier', null, adminCookie);
  const nowInSuppTab = recheckSuppTab.data.data.some(i => i._id === custInv._id);
  assert(nowInSuppTab === true, 'Dynamic move: Invoice automatically moved to Supplier tab without DB modification!');

  // 8. Admin Settings & Supplier Password Verification Endpoint
  console.log('\n--- STEP 8: Supplier Password Protection Verification ---');
  // First, verify wrong password returns 403 or 401
  const wrongPassRes = await api('POST', '/api/settings/verify-password', {
    password: 'wrong_password_xyz',
    type: 'supplier',
  }, adminCookie);
  assert(wrongPassRes.status === 403 || wrongPassRes.status === 401 || wrongPassRes.status === 400, `Rejected unauthorized password (Got HTTP ${wrongPassRes.status})`);

  // Set supplier password via POST /api/settings
  const setPassRes = await api('POST', '/api/settings', {
    type: 'supplier',
    newPassword: 'secureAdminSupplierPass123',
  }, adminCookie);
  assert(setPassRes.status === 200, 'Supplier password set successfully in Settings');

  // Now verify correct password
  const correctPassRes = await api('POST', '/api/settings/verify-password', {
    password: 'secureAdminSupplierPass123',
    type: 'supplier',
  }, adminCookie);
  if (correctPassRes.status !== 200) {
    console.error('verify-password response:', correctPassRes.status, correctPassRes.data);
  }
  assert(correctPassRes.status === 200, 'Supplier password verified successfully (HTTP 200)');
  assert(correctPassRes.data.success === true, 'Password verification returned success: true');

  console.log('\n===========================================================');
  console.log('🎉 ALL NEW FEATURE TESTS PASSED 100% WITH ZERO ERRORS!');
  console.log('===========================================================');
  process.exit(0);
}

runNewFeaturesTest().catch(err => {
  console.error('Fatal New Features Test Error:', err);
  process.exit(1);
});
