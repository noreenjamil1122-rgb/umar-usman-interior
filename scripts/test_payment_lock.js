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

async function runPaymentLockTest() {
  console.log('===========================================================');
  console.log('🔒 TESTING PAYMENT SECTION LOCK & ADMIN PROTECTION');
  console.log('===========================================================\n');

  // STEP 1: Admin Login
  console.log('--- STEP 1: Admin Login ---');
  const adminLogin = await api('POST', '/api/auth/login', {
    email: 'admin@umarusman.com',
    password: 'adminpassword123',
  });
  assert(adminLogin.status === 200, 'Admin login HTTP 200');
  const adminCookie = adminLogin.headers['set-cookie'][0].split(';')[0];

  // STEP 2: Configure Payment Lock Password in Settings
  console.log('\n--- STEP 2: Configure Payment Lock Password in Settings ---');
  const setPassRes = await api('POST', '/api/settings', {
    type: 'payment',
    newPassword: 'adminPaymentSecure123',
  }, adminCookie);
  assert(setPassRes.status === 200, 'Payment Lock password set in Settings (HTTP 200)');

  // Verify settings hasPaymentPassword is true
  const getSettings = await api('GET', '/api/settings', null, adminCookie);
  assert(getSettings.status === 200, 'Settings fetched');
  assert(getSettings.data.data.hasPaymentPassword === true, 'hasPaymentPassword is true in Settings');

  // STEP 3: Create Customer and Invoice with Initial Payment
  console.log('\n--- STEP 3: Create Customer & Invoice with Payment ---');
  const custRes = await api('POST', '/api/customers', {
    name: `Payment Test Customer ${Date.now()}`,
    mobile: '0300-7776655',
  }, adminCookie);
  assert(custRes.status === 201, 'Customer created');
  const customerId = custRes.data.data._id;

  const invoiceRes = await api('POST', '/api/invoices', {
    customerId,
    reference: 'Payment Lock Test Room',
    items: [
      {
        wp: 'WP-TEST-ROLL',
        design: 'Embossed Pattern',
        qty: 10,
        rate: 2000,
        amount: 20000,
      }
    ],
    paid: 5000, // PKR 5,000 paid at invoice creation
  }, adminCookie);

  assert(invoiceRes.status === 201, 'Invoice created (HTTP 201)');
  const invoiceId = invoiceRes.data.data._id;
  assert(invoiceRes.data.data.paid === 5000, 'Invoice initial paid is 5,000');
  assert(invoiceRes.data.data.remaining === 15000, 'Invoice initial remaining is 15,000');

  // Get the payment ID created for this invoice
  const paymentsRes = await api('GET', `/api/payments?invoiceId=${invoiceId}`, null, adminCookie);
  assert(paymentsRes.status === 200, 'Fetched invoice payments');
  assert(paymentsRes.data.data.length >= 1, 'Payment record found for invoice');
  const paymentRecord = paymentsRes.data.data[0];
  const paymentId = paymentRecord._id;
  assert(paymentRecord.amount === 5000, 'Payment record amount is 5,000');

  // STEP 4: Create Worker & Verify Worker Restriction
  console.log('\n--- STEP 4: RBAC Worker Restriction Checks ---');
  const workerEmail = `pay_worker_${Date.now()}@umarusman.com`;
  const workerCreate = await api('POST', '/api/staff', {
    name: 'Worker Khalid',
    email: workerEmail,
    password: 'workerpass123',
  }, adminCookie);
  assert(workerCreate.status === 201, 'Worker account created');

  const workerLogin = await api('POST', '/api/auth/login', {
    email: workerEmail,
    password: 'workerpass123',
  });
  assert(workerLogin.status === 200, 'Worker logged in');
  const workerCookie = workerLogin.headers['set-cookie'][0].split(';')[0];

  // 4a. Worker attempts to edit payment without password -> MUST FAIL (403)
  const workerEditNoPass = await api('PUT', `/api/payments/${paymentId}`, {
    amount: 12000,
  }, workerCookie);
  assert(workerEditNoPass.status === 403, `Worker blocked from editing payment without password (HTTP 403)`);

  // 4b. Worker attempts to edit payment with wrong password -> MUST FAIL (403)
  const workerEditWrongPass = await api('PUT', `/api/payments/${paymentId}`, {
    amount: 12000,
    password: 'wrong_password_999',
  }, workerCookie);
  assert(workerEditWrongPass.status === 403, `Worker blocked with wrong password (HTTP 403)`);

  // 4c. Worker edits payment with CORRECT Admin Payment Password -> SUCCEEDS (200)
  const workerEditCorrectPass = await api('PUT', `/api/payments/${paymentId}`, {
    amount: 12000,
    method: 'Bank Transfer',
    reference: 'Slip #44901',
    password: 'adminPaymentSecure123',
  }, workerCookie);
  assert(workerEditCorrectPass.status === 200, `Worker successfully edited payment with correct password (HTTP 200)`);

  // Verify Invoice Paid & Remaining were automatically recalculated!
  const checkInvoiceAfterEdit = await api('GET', `/api/invoices/${invoiceId}`, null, adminCookie);
  assert(checkInvoiceAfterEdit.status === 200, 'Invoice fetched after payment edit');
  const updatedInv = checkInvoiceAfterEdit.data.data.invoice;
  assert(updatedInv.paid === 12000, `Invoice paid automatically updated from 5,000 to 12,000 (Got ${updatedInv.paid})`);
  assert(updatedInv.remaining === 8000, `Invoice remaining automatically updated from 15,000 to 8,000 (Got ${updatedInv.remaining})`);

  // STEP 5: Payment Deletion Lock & Balance Recalculation
  console.log('\n--- STEP 5: Payment Deletion Protection & Balance Reversal ---');
  // 5a. Worker attempts to delete without password -> MUST FAIL (403)
  const workerDeleteNoPass = await api('DELETE', `/api/payments/${paymentId}`, null, workerCookie);
  assert(workerDeleteNoPass.status === 403, `Worker blocked from deleting payment without password (HTTP 403)`);

  // 5b. Worker attempts to delete with wrong password -> MUST FAIL (403)
  const workerDeleteWrongPass = await api('DELETE', `/api/payments/${paymentId}`, { password: 'wrong' }, workerCookie);
  assert(workerDeleteWrongPass.status === 403, `Worker blocked from deleting payment with wrong password (HTTP 403)`);

  // 5c. Worker deletes payment with correct password (or Admin deletes)
  const deleteWithPass = await api('DELETE', `/api/payments/${paymentId}`, {
    password: 'adminPaymentSecure123',
  }, workerCookie);
  assert(deleteWithPass.status === 200, `Payment deleted with authorized password (HTTP 200)`);

  // Verify Invoice balance after deletion: paid = 0, remaining = 20,000
  const checkInvoiceAfterDelete = await api('GET', `/api/invoices/${invoiceId}`, null, adminCookie);
  const deletedInv = checkInvoiceAfterDelete.data.data.invoice;
  assert(deletedInv.paid === 0, `Invoice paid reversed to 0 (Got ${deletedInv.paid})`);
  assert(deletedInv.remaining === 20000, `Invoice remaining reversed to full 20,000 (Got ${deletedInv.remaining})`);

  // STEP 6: Guard Additional Payment in Invoice Edit
  console.log('\n--- STEP 6: Guard Additional Payment in Invoice PUT ---');
  // Worker attempts to add payment via PUT /api/invoices without password -> MUST FAIL (403)
  const workerAddPaymentNoPass = await api('PUT', `/api/invoices/${invoiceId}`, {
    additionalPayment: { amount: 7000 },
  }, workerCookie);
  assert(workerAddPaymentNoPass.status === 403, `Worker blocked from adding payment to invoice without password (HTTP 403)`);

  // Worker provides correct password in invoice PUT -> SUCCEEDS (200)
  const workerAddPaymentWithPass = await api('PUT', `/api/invoices/${invoiceId}`, {
    additionalPayment: { amount: 7000, method: 'Cash' },
    paymentPassword: 'adminPaymentSecure123',
  }, workerCookie);
  assert(workerAddPaymentWithPass.status === 200, `Worker added payment with valid password (HTTP 200)`);

  // Verify invoice updated with 7,000 paid
  const finalInvCheck = await api('GET', `/api/invoices/${invoiceId}`, null, adminCookie);
  assert(finalInvCheck.data.data.invoice.paid === 7000, `Invoice paid is now 7,000 (Got ${finalInvCheck.data.data.invoice.paid})`);
  assert(finalInvCheck.data.data.invoice.remaining === 13000, `Invoice remaining is now 13,000 (Got ${finalInvCheck.data.data.invoice.remaining})`);

  console.log('\n===========================================================');
  console.log('🎉 ALL PAYMENT LOCK & EDIT SECURITY TESTS PASSED 100%!');
  console.log('===========================================================');
  process.exit(0);
}

runPaymentLockTest().catch(err => {
  console.error('Fatal Payment Lock Test Error:', err);
  process.exit(1);
});
