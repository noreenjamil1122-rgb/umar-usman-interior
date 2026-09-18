const fs = require('fs');
const mongoose = require('mongoose');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/MONGODB_URI=(.*)/);
const uri = match ? match[1].trim() : '';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const payments = await db.collection('payments').find({}).toArray();
  console.log('All payments:');
  payments.forEach(p => {
    console.log(`- Amount: ${p.amount}, Date: ${p.date}, InvId: ${p.invoiceId}, CustomerId: ${p.customerId}, Ref: ${p.reference}`);
  });

  const returns = await db.collection('invoicereturns').find({}).toArray();
  console.log('All returns:', returns.map(r => ({ returnNumber: r.returnNumber, invoiceId: r.invoiceId, totalRefund: r.totalRefundAmount })));

  const soldStockHistory = await db.collection('stockhistories').find({ type: 'Sold' }).toArray();
  console.log('Total Sold stock history records:', soldStockHistory.length);

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
