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

async function runTestSuite() {
  console.log('===========================================================');
  console.log('🚀 RUNNING COMPLETE CRM AUTOMATED TEST SUITE (WALLPAPER MANAGER)');
  console.log('===========================================================\n');

  // TEST 1: Admin Login
  console.log('--- TEST 1: Admin Authentication ---');
  const adminLogin = await api('POST', '/api/auth/login', {
    email: 'admin@umarusman.com',
    password: 'adminpassword123',
  });
  assert(adminLogin.status === 200, `Admin Login HTTP 200 (Got ${adminLogin.status})`);
  assert(adminLogin.data.user.role === 'admin', `Admin role verified as 'admin'`);
  const adminCookie = adminLogin.headers['set-cookie'][0].split(';')[0];

  // TEST 2: RBAC - Create Worker & Verify Restrictions
  console.log('\n--- TEST 2: RBAC (Worker Creation & Access Guard) ---');
  const testWorkerEmail = `worker_${Date.now()}@umarusman.com`;
  const workerCreate = await api('POST', '/api/staff', {
    name: 'Asim Worker',
    email: testWorkerEmail,
    password: 'workerpassword123',
  }, adminCookie);
  assert(workerCreate.status === 201, `Worker account created successfully`);

  const workerLogin = await api('POST', '/api/auth/login', {
    email: testWorkerEmail,
    password: 'workerpassword123',
  });
  assert(workerLogin.status === 200, `Worker Login HTTP 200`);
  assert(workerLogin.data.user.role === 'worker', `Worker role verified as 'worker'`);
  const workerCookie = workerLogin.headers['set-cookie'][0].split(';')[0];

  // Verify Worker cannot access Admin settings
  const workerSettingsAttempt = await api('PUT', '/api/settings', { businessName: 'Hacked' }, workerCookie);
  assert(workerSettingsAttempt.status === 403, `Worker blocked from Settings (HTTP 403 Forbidden)`);

  // TEST 3: Customer Management
  console.log('\n--- TEST 3: Customer Creation & Auto Sequence ---');
  const customerRes = await api('POST', '/api/customers', {
    name: 'Tariq Mehmood (DHA Phase 6)',
    mobile: '0321-9988776',
    city: 'Lahore',
    address: 'Sector C, Phase 6, DHA Lahore',
  }, adminCookie);
  assert(customerRes.status === 201, `Customer created (HTTP 201)`);
  const customerId = customerRes.data.data._id;
  const customerCode = customerRes.data.data.code;
  assert(customerCode && customerCode.startsWith('CUS-'), `Atomic Customer Code generated: ${customerCode}`);

  // TEST 4: Product Catalog & Opening Stock
  console.log('\n--- TEST 4: Product Creation & Automatic Stock Audit ---');
  const wpCode = `WP-TEST-${Math.floor(Math.random() * 900 + 100)}`;
  const productRes = await api('POST', '/api/products', {
    wp: wpCode,
    design: 'Royal Velvet Damask Gold',
    brand: 'Umar Usman Exclusive',
    category: 'Wallpaper',
    purchasePrice: 2800,
    salePrice: 4800,
    stock: 20,
    minStock: 5,
  }, adminCookie);
  assert(productRes.status === 201, `Product created with 20 rolls opening stock`);
  const productId = productRes.data.data._id;

  // Verify Stock Adjustment (+10 rolls)
  const adjustRes = await api('POST', `/api/products/${productId}/stock`, {
    qty: 10,
    reason: 'Restock',
    reference: 'Shipment Container A-12',
  }, adminCookie);
  if (adjustRes.status !== 200) {
    console.log('adjustRes error:', adjustRes.status, adjustRes.data);
  }
  assert(adjustRes.status === 200, `Stock adjusted +10 rolls`);
  const currentStock = adjustRes.data.data.product ? adjustRes.data.data.product.stock : adjustRes.data.data.stock;
  assert(currentStock === 30, `New inventory stock is 30 rolls (20 + 10)`);

  // TEST 5: Invoice Creation with Wallmaster Quotation & Advance Payment
  console.log('\n--- TEST 5: Wallmaster Invoice Creation & Stock Deduction ---');
  const invoiceRes = await api('POST', '/api/invoices', {
    customerId,
    reference: 'Drawing room wall (12 X 12)',
    terms: '100% advance in cash',
    jobStatus: 'Advance Received',
    items: [
      {
        productId,
        wp: wpCode,
        design: 'Royal Velvet Damask Gold',
        qty: 5,
        rate: 4800,
        amount: 24000,
      },
      {
        wp: 'GUM CHARGES',
        design: 'Wallpaper Adhesive Chemical',
        qty: 1,
        rate: 1850,
        amount: 1850,
      },
      {
        wp: 'Installation charges',
        design: 'Wallpaper Fitting Services',
        qty: 1,
        rate: 3000,
        amount: 3000,
      },
    ],
    paid: 10000, // 10,000 Advance
    method: 'Bank Transfer (Online)',
    notes: 'Please ensure wall preparation before team arrives.',
  }, adminCookie);

  if (invoiceRes.status !== 201) {
    console.log('Invoice Error Response:', invoiceRes.status, invoiceRes.data);
  }
  assert(invoiceRes.status === 201, `Wallmaster Invoice issued (HTTP 201)`);
  const invoiceId = invoiceRes.data.data._id;
  const invoiceNumber = invoiceRes.data.data.number;
  const invoiceTotal = invoiceRes.data.data.total;
  const invoiceRemaining = invoiceRes.data.data.remaining;

  assert(invoiceTotal === 28850, `Subtotal & Total accurately computed: PKR 28,850 (24,000 + 1,850 + 3,000)`);
  assert(invoiceRemaining === 18850, `Remaining Udhar accurately computed: PKR 18,850 (28,850 - 10,000)`);
  assert(invoiceRes.data.data.jobStatus === 'Advance Received', `Job Status set to 'Advance Received'`);

  // Verify Wallpaper Stock Auto-Deduction (30 - 5 = 25 rolls)
  const verifyProd = await api('GET', `/api/products/${productId}`, null, adminCookie);
  const prodStock = verifyProd.data.data.product ? verifyProd.data.data.product.stock : verifyProd.data.data.stock;
  assert(prodStock === 25, `Wallpaper inventory atomically decremented from 30 to 25 rolls`);

  // Verify Worker cannot delete this invoice
  const workerDeleteAttempt = await api('DELETE', `/api/invoices/${invoiceId}`, null, workerCookie);
  assert(workerDeleteAttempt.status === 403, `Worker blocked from deleting invoice (HTTP 403 Forbidden)`);

  // TEST 6: Real-Time Notification Bell
  console.log('\n--- TEST 6: Real-Time Notification Bell & Udhar Alert ---');
  const notifRes = await api('GET', '/api/notifications', null, adminCookie);
  assert(notifRes.status === 200, `Notifications API responded (HTTP 200)`);
  const hasDebtAlert = notifRes.data.data.notifications.some(
    n => n.type === 'debt' && n.title.includes('18,850')
  );
  assert(hasDebtAlert, `Notification bell triggered real-time Udhar alert for PKR 18,850`);

  // TEST 7: Payment Clearance & Automated Completion
  console.log('\n--- TEST 7: Balance Clearance & Automatic Completion ---');
  const payRes = await api('POST', '/api/payments', {
    customerId,
    invoiceId,
    amount: 18850, // Pay full remaining balance
    method: 'Cash',
    reference: 'Final fitting clearance cash payment',
  }, adminCookie);
  assert(payRes.status === 201, `Final payment recorded (HTTP 201)`);

  // Verify invoice status updated to 'Fully Paid' and remaining = 0
  const checkInvoice = await api('GET', `/api/invoices/${invoiceId}`, null, adminCookie);
  if (!checkInvoice.data) {
    console.log('checkInvoice error status:', checkInvoice.status, 'body:', checkInvoice.raw);
  }
  assert(checkInvoice.status === 200, `Invoice details fetched (HTTP 200)`);
  assert(checkInvoice.data.data.invoice.remaining === 0, `Invoice Udhar balance is now 0 (Fully Cleared)`);
  assert(checkInvoice.data.data.invoice.jobStatus === 'Fully Paid', `Job Status automatically updated to 'Fully Paid'`);

  // TEST 8: CSV Export Verification
  console.log('\n--- TEST 8: Financial CSV Export Engine ---');
  const exportRes = await api('GET', '/api/export/invoices', null, adminCookie);
  assert(exportRes.status === 200, `CSV Export generated HTTP 200`);
  assert(exportRes.headers['content-type'].includes('text/csv'), `Correct Content-Type: text/csv`);
  assert(exportRes.raw.includes(invoiceNumber), `Generated CSV contains invoice ${invoiceNumber}`);

  console.log('\n===========================================================');
  console.log('🎉 ALL 8 MODULE TESTS PASSED 100% WITH ZERO ERRORS!');
  console.log('===========================================================');
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
