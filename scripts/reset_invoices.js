const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Read MongoDB URI from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const match = env.match(/MONGODB_URI=(.*)/);
const uri = match ? match[1].trim() : '';

if (!uri) {
  console.error('Error: MONGODB_URI not found in .env.local');
  process.exit(1);
}

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log('\n--- 1. FETCHING CURRENT INVOICE DATA FOR BACKUP ---');
  const invoices = await db.collection('invoices').find({}).toArray();
  const invoiceReturns = await db.collection('invoicereturns').find({}).toArray();
  const payments = await db.collection('payments').find({}).toArray();
  const soldStockHistories = await db.collection('stockhistories').find({
    $or: [
      { type: 'Sold' },
      { reference: { $regex: /Invoice/i } }
    ]
  }).toArray();
  const invoiceCounters = await db.collection('counters').find({
    type: { $in: ['invoice', 'return'] }
  }).toArray();

  console.log(`Found:
  - ${invoices.length} Invoices
  - ${invoiceReturns.length} Invoice Returns
  - ${payments.length} Payments
  - ${soldStockHistories.length} Invoice Stock History Records
  - ${invoiceCounters.length} Counters`);

  // Create timestamped backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'scratch');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupFilePath = path.join(backupDir, `backup_invoices_${timestamp}.json`);
  const backupData = {
    createdAt: new Date().toISOString(),
    invoicesCount: invoices.length,
    invoiceReturnsCount: invoiceReturns.length,
    paymentsCount: payments.length,
    stockHistoriesCount: soldStockHistories.length,
    counters: invoiceCounters,
    invoices,
    invoiceReturns,
    payments,
    soldStockHistories
  };

  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`\n[SUCCESS] Full backup saved to: ${backupFilePath}`);

  console.log('\n--- 2. RESTORING PRODUCT STOCK DEDUCTED BY INVOICES ---');
  let restoredItemsCount = 0;
  let totalQuantityRestored = 0;
  const productStockRestores = {};

  for (const inv of invoices) {
    if (Array.isArray(inv.items)) {
      for (const item of inv.items) {
        if (item.productId && typeof item.qty === 'number' && item.qty > 0) {
          const prodIdStr = item.productId.toString();
          productStockRestores[prodIdStr] = (productStockRestores[prodIdStr] || 0) + item.qty;
          restoredItemsCount++;
          totalQuantityRestored += item.qty;
        }
      }
    }
  }

  for (const [prodIdStr, qty] of Object.entries(productStockRestores)) {
    const prodObjectId = new mongoose.Types.ObjectId(prodIdStr);
    const updated = await db.collection('products').findOneAndUpdate(
      { _id: prodObjectId },
      { $inc: { stock: qty } },
      { returnDocument: 'after' }
    );
    if (updated) {
      console.log(`  Restored +${qty} rolls to Product WP# ${updated.wp} (${updated.design || ''}). New Stock: ${updated.stock}`);
    }
  }
  console.log(`Total restored: ${totalQuantityRestored} rolls across ${Object.keys(productStockRestores).length} distinct products.`);

  console.log('\n--- 3. REMOVING SOLD STOCK HISTORIES LINKED TO INVOICES ---');
  const deleteStockHistResult = await db.collection('stockhistories').deleteMany({
    $or: [
      { type: 'Sold' },
      { reference: { $regex: /Invoice/i } }
    ]
  });
  console.log(`Deleted ${deleteStockHistResult.deletedCount} stock history records.`);

  console.log('\n--- 4. DELETING ALL INVOICES ---');
  const deleteInvoicesResult = await db.collection('invoices').deleteMany({});
  console.log(`Deleted ${deleteInvoicesResult.deletedCount} invoices.`);

  console.log('\n--- 5. DELETING ALL INVOICE RETURNS ---');
  const deleteReturnsResult = await db.collection('invoicereturns').deleteMany({});
  console.log(`Deleted ${deleteReturnsResult.deletedCount} invoice returns.`);

  console.log('\n--- 6. DELETING PAYMENTS ---');
  const deletePaymentsResult = await db.collection('payments').deleteMany({});
  console.log(`Deleted ${deletePaymentsResult.deletedCount} payments.`);

  console.log('\n--- 7. RESETTING INVOICE AND RETURN COUNTERS TO 0 ---');
  const resetInvoiceCounter = await db.collection('counters').updateMany(
    { type: 'invoice' },
    { $set: { seq: 0 } }
  );
  const resetReturnCounter = await db.collection('counters').updateMany(
    { type: 'return' },
    { $set: { seq: 0 } }
  );
  console.log(`Reset invoice counter: matched ${resetInvoiceCounter.matchedCount}, modified ${resetInvoiceCounter.modifiedCount}`);
  console.log(`Reset return counter: matched ${resetReturnCounter.matchedCount}, modified ${resetReturnCounter.modifiedCount}`);

  console.log('\n--- 8. RECORDING ACTIVITY LOG ---');
  const adminUser = await db.collection('users').findOne({ role: 'admin' });
  if (adminUser) {
    await db.collection('activitylogs').insertOne({
      userId: adminUser._id,
      type: 'Invoice Reset',
      detail: `Reset all previous invoices (${invoices.length}), returns (${invoiceReturns.length}), payments (${payments.length}), restored ${totalQuantityRestored} rolls of stock, and reset invoice counter to 0 for fresh start.`,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Activity log saved.');
  }

  console.log('\n--- 9. VERIFICATION OF RESET DATABASE ---');
  const finalInvoicesCount = await db.collection('invoices').countDocuments();
  const finalReturnsCount = await db.collection('invoicereturns').countDocuments();
  const finalPaymentsCount = await db.collection('payments').countDocuments();
  const remainingCounters = await db.collection('counters').find({ type: { $in: ['invoice', 'return'] } }).toArray();

  console.log(`Final Database State:
  - Invoices Count: ${finalInvoicesCount} (Expected: 0)
  - Returns Count: ${finalReturnsCount} (Expected: 0)
  - Payments Count: ${finalPaymentsCount} (Expected: 0)
  - Counters: ${JSON.stringify(remainingCounters)}`);

  console.log('\n[ALL OPERATIONS COMPLETED SUCCESSFULLY]');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error during reset:', err);
  process.exit(1);
});
