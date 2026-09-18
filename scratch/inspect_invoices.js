const fs = require('fs');
const mongoose = require('mongoose');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/MONGODB_URI=(.*)/);
const uri = match ? match[1].trim() : '';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({}).toArray();
  console.log('Users found:', users.map(u => ({ id: u._id, username: u.username, role: u.role, name: u.name })));

  const invoicesCount = await db.collection('invoices').countDocuments();
  console.log('Total invoices count:', invoicesCount);

  const invoices = await db.collection('invoices').find({}).toArray();
  console.log('Invoices sample (up to 10):', invoices.slice(0, 10).map(i => ({
    _id: i._id,
    number: i.number,
    date: i.date,
    total: i.total,
    paid: i.paid,
    remaining: i.remaining,
    itemsCount: i.items?.length
  })));

  const returnsCount = await db.collection('invoicereturns').countDocuments();
  console.log('Total invoicereturns count:', returnsCount);

  const paymentsCount = await db.collection('payments').countDocuments();
  const invoicePaymentsCount = await db.collection('payments').countDocuments({ invoiceId: { $exists: true, $ne: null } });
  console.log('Total payments count:', paymentsCount, '| Payments linked to invoice:', invoicePaymentsCount);

  const counters = await db.collection('counters').find({}).toArray();
  console.log('Counters:', counters.map(c => ({ type: c.type, year: c.year, seq: c.seq, userId: c.userId })));

  const stockHistoriesCount = await db.collection('stockhistories').countDocuments();
  console.log('Total stock histories:', stockHistoriesCount);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
