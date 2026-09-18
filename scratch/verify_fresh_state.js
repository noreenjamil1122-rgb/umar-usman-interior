const fs = require('fs');
const mongoose = require('mongoose');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/MONGODB_URI=(.*)/);
const uri = match ? match[1].trim() : '';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const invCount = await db.collection('invoices').countDocuments();
  const retCount = await db.collection('invoicereturns').countDocuments();
  const payCount = await db.collection('payments').countDocuments();
  const invCounter = await db.collection('counters').findOne({ type: 'invoice' });
  const retCounter = await db.collection('counters').findOne({ type: 'return' });

  console.log('--- VERIFICATION REPORT ---');
  console.log('Invoices count:', invCount);
  console.log('Invoice Returns count:', retCount);
  console.log('Payments count:', payCount);
  console.log('Invoice Counter seq:', invCounter.seq, '(Next code should be: INV-2026-' + String(invCounter.seq + 1).padStart(5, '0') + ')');
  console.log('Return Counter seq:', retCounter.seq, '(Next code should be: RET-2026-' + String(retCounter.seq + 1).padStart(6, '0') + ')');

  // Verify that products and customers are intact
  const custCount = await db.collection('customers').countDocuments();
  const prodCount = await db.collection('products').countDocuments();
  console.log('Preserved Customers count:', custCount);
  console.log('Preserved Products count:', prodCount);

  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
