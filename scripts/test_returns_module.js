const fs = require('fs');
const mongoose = require('mongoose');

// Read MONGODB_URI from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const line = envContent.split('\n').find(l => l.startsWith('MONGODB_URI='));
const uri = line ? line.substring(line.indexOf('=') + 1).trim() : null;

if (!uri) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
}

// --- PURE CALCULATION LOGIC ---
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function calculateReturn(item, requestedReturnQty) {
  const alreadyReturned = Number(item.returned_quantity) || 0;
  const totalQty = Number(item.quantity) || 0;
  const availableToReturn = round2(totalQty - alreadyReturned);

  if (!Number.isFinite(requestedReturnQty) || requestedReturnQty <= 0) {
    throw new ValidationError('Returned quantity must be greater than zero.');
  }

  if (requestedReturnQty > availableToReturn) {
    throw new ValidationError(
      `Cannot return ${requestedReturnQty}. Only ${availableToReturn} unit(s) remain eligible for return.`
    );
  }

  const unitPrice = Number(item.unit_price ?? item.rate ?? 0);
  const returnAmount = round2(requestedReturnQty * unitPrice);
  const newReturnedQty = round2(alreadyReturned + requestedReturnQty);
  const remainingQty = round2(totalQty - newReturnedQty);

  return {
    returnAmount,
    newReturnedQty,
    remainingQty,
    isFullyReturned: remainingQty <= 0,
  };
}

function computePaymentAdjustment(invoice, returnAmount) {
  const totalAmount = Number(invoice.total_amount ?? invoice.total ?? 0);
  const paidAmount = Number(invoice.paid_amount ?? invoice.paid ?? 0);
  const balanceDue = Number(invoice.balance_due ?? invoice.remaining ?? round2(totalAmount - paidAmount));

  const newTotalAmount = round2(Math.max(0, totalAmount - returnAmount));

  // Case A: fully paid -> full refund owed
  if (paidAmount >= totalAmount && totalAmount > 0) {
    const refundDue = round2(Math.min(returnAmount, paidAmount));
    return {
      type: 'refund',
      newTotalAmount,
      newBalanceDue: 0,
      refundDue,
      creditApplied: 0,
    };
  }

  // Case B: nothing paid yet -> just reduce balance
  if (paidAmount === 0) {
    const newBalanceDue = round2(Math.max(newTotalAmount, 0));
    return {
      type: 'balance_reduction',
      newTotalAmount,
      newBalanceDue,
      refundDue: 0,
      creditApplied: 0,
    };
  }

  // Case C: partially paid -> reduce balance first; only refund the excess
  // if the return amount is larger than what's still owed.
  if (returnAmount <= balanceDue) {
    const newBalanceDue = round2(balanceDue - returnAmount);
    return {
      type: 'balance_reduction',
      newTotalAmount,
      newBalanceDue,
      refundDue: 0,
      creditApplied: 0,
    };
  } else {
    const excess = round2(returnAmount - balanceDue);
    return {
      type: 'partial',
      newTotalAmount,
      newBalanceDue: 0,
      refundDue: excess,
      creditApplied: 0,
    };
  }
}

// --- MONGOOSE SCHEMAS FOR TEST SUITE ---
const Schema = mongoose.Schema;

const CounterSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  type: { type: String, required: true },
  year: { type: Number, default: 0 },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

async function getNextSequence(userId, type, year = 0, session) {
  const filter = { userId: new mongoose.Types.ObjectId(userId), type, year };
  const update = { $inc: { seq: 1 } };
  const options = { new: true, upsert: true, setDefaultsOnInsert: true };
  if (session) options.session = session;
  const counter = await Counter.findOneAndUpdate(filter, update, options);
  return counter ? counter.seq : 1;
}

async function generateFormattedCode(userId, type, prefixOverride, session) {
  const currentYear = new Date().getFullYear();
  if (type === 'return') {
    const seq = await getNextSequence(userId, 'return', currentYear, session);
    const prefix = prefixOverride || 'RET';
    return `${prefix}-${currentYear}-${String(seq).padStart(6, '0')}`;
  }
  if (type === 'invoice') {
    const seq = await getNextSequence(userId, 'invoice', currentYear, session);
    const prefix = prefixOverride || 'INV';
    return `${prefix}-${currentYear}-${String(seq).padStart(5, '0')}`;
  }
  return `${type.toUpperCase()}-${Date.now()}`;
}

const UserSchema = new Schema({ email: String, role: String });
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const CustomerSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  mobile: String,
  city: String,
});
const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);

const ProductSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  wp: { type: String, required: true },
  design: String,
  salePrice: Number,
  stock: { type: Number, default: 0 },
});
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const InvoiceItemSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  wp: String,
  design: String,
  qty: Number,
  rate: Number,
  amount: Number,
  returned_quantity: { type: Number, default: 0 },
  is_fully_returned: { type: Boolean, default: false },
});

const InvoiceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  number: String,
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  items: [InvoiceItemSchema],
  subtotal: Number,
  total: Number,
  paid: Number,
  remaining: Number,
  returned_amount_total: { type: Number, default: 0 },
  jobStatus: String,
});
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);

const InvoiceReturnSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  returnRef: { type: String, required: true, unique: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
  invoiceItemId: { type: Schema.Types.Mixed, required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  originalQuantity: Number,
  returnedQuantity: Number,
  remainingQuantity: Number,
  unitPrice: Number,
  returnAmount: Number,
  condition: { type: String, default: 'accepted_to_stock' },
  refundStatus: { type: String, default: 'pending' },
  paymentAdjustmentType: String,
  paymentAdjustmentAmount: Number,
  returnReason: String,
  processedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  returnDate: { type: Date, default: Date.now },
});
const InvoiceReturn = mongoose.models.InvoiceReturn || mongoose.model('InvoiceReturn', InvoiceReturnSchema);

const PaymentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  date: { type: Date, default: Date.now },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  amount: Number,
  type: { type: String, default: 'payment' },
  method: String,
  reference: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
});
const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);

const StockHistorySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  date: { type: Date, default: Date.now },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  wp: String,
  type: String,
  qty: Number,
  prevStock: Number,
  newStock: Number,
  reference: String,
});
const StockHistory = mongoose.models.StockHistory || mongoose.model('StockHistory', StockHistorySchema);

async function runTests() {
  console.log('=================================================================');
  console.log('🧪 RUNNING RETURNS MODULE AUTOMATED TEST SUITE');
  console.log('=================================================================\n');

  // --- UNIT TESTS ---
  console.log('--- SECTION A: PURE FUNCTION UNIT TESTS ---');

  // Test calculateReturn
  const testItem = { quantity: 10, rate: 500, returned_quantity: 0 };
  const res1 = calculateReturn(testItem, 3);
  assert(res1.returnAmount === 1500, 'calculateReturn: 3 rolls @ 500 = 1500');
  assert(res1.newReturnedQty === 3, 'calculateReturn: newReturnedQty is 3');
  assert(res1.remainingQty === 7, 'calculateReturn: remainingQty is 7');
  assert(res1.isFullyReturned === false, 'calculateReturn: isFullyReturned is false');

  // Partial return of remaining
  const res2 = calculateReturn({ quantity: 10, rate: 500, returned_quantity: 3 }, 7);
  assert(res2.returnAmount === 3500, 'calculateReturn: remaining 7 rolls @ 500 = 3500');
  assert(res2.newReturnedQty === 10, 'calculateReturn: newReturnedQty is 10');
  assert(res2.remainingQty === 0, 'calculateReturn: remainingQty is 0');
  assert(res2.isFullyReturned === true, 'calculateReturn: isFullyReturned is true');

  // Exceeding quantity validation
  let caught = false;
  try {
    calculateReturn({ quantity: 10, rate: 500, returned_quantity: 8 }, 3);
  } catch (err) {
    caught = true;
    assert(err instanceof ValidationError, 'calculateReturn: throws ValidationError when returnQty > available');
  }
  assert(caught, 'Validation caught exceeding quantity');

  // Negative / 0 quantity validation
  caught = false;
  try {
    calculateReturn({ quantity: 10, rate: 500, returned_quantity: 0 }, 0);
  } catch (err) {
    caught = true;
    assert(err instanceof ValidationError, 'calculateReturn: throws ValidationError for 0 quantity');
  }
  assert(caught, 'Validation caught 0 quantity');

  // Test computePaymentAdjustment Cases
  console.log('\n--- PAYMENT ADJUSTMENT CASES ---');
  // Case A: Fully paid
  const adjA = computePaymentAdjustment({ total: 1000, paid: 1000, remaining: 0 }, 300);
  assert(adjA.type === 'refund', 'Case A: Type is refund');
  assert(adjA.refundDue === 300, 'Case A: Refund due is 300');
  assert(adjA.newBalanceDue === 0, 'Case A: New balance due is 0');
  assert(adjA.newTotalAmount === 700, 'Case A: New total is 700');

  // Case B: Unpaid (paid = 0)
  const adjB = computePaymentAdjustment({ total: 1000, paid: 0, remaining: 1000 }, 300);
  assert(adjB.type === 'balance_reduction', 'Case B: Type is balance_reduction');
  assert(adjB.refundDue === 0, 'Case B: Refund due is 0');
  assert(adjB.newBalanceDue === 700, 'Case B: New balance due is 700');
  assert(adjB.newTotalAmount === 700, 'Case B: New total is 700');

  // Case C1: Partially paid, return <= balanceDue
  const adjC1 = computePaymentAdjustment({ total: 1000, paid: 400, remaining: 600 }, 200);
  assert(adjC1.type === 'balance_reduction', 'Case C1: Type is balance_reduction');
  assert(adjC1.refundDue === 0, 'Case C1: Refund due is 0');
  assert(adjC1.newBalanceDue === 400, 'Case C1: New balance due is 400');
  assert(adjC1.newTotalAmount === 800, 'Case C1: New total is 800');

  // Case C2: Partially paid, return > balanceDue
  const adjC2 = computePaymentAdjustment({ total: 1000, paid: 400, remaining: 600 }, 700);
  assert(adjC2.type === 'partial', 'Case C2: Type is partial');
  assert(adjC2.refundDue === 100, 'Case C2: Refund due is 100');
  assert(adjC2.newBalanceDue === 0, 'Case C2: New balance due is 0');
  assert(adjC2.newTotalAmount === 300, 'Case C2: New total is 300');

  // --- SECTION B: TRANSACTIONAL DATABASE TESTS ---
  console.log('\n--- SECTION B: TRANSACTIONAL DATABASE INTEGRATION TESTS ---');
  await mongoose.connect(uri);
  console.log('Connected to MongoDB Atlas successfully');

  // Find or create a test admin user
  let user = await User.findOne({ email: 'admin@umarusman.com' });
  if (!user) {
    user = await User.findOne({});
  }
  if (!user) {
    user = await User.create({ email: 'admin@umarusman.com', role: 'admin' });
  }
  assert(user !== null, 'Test user exists in DB');
  const userId = user._id;

  // Create a dedicated test customer
  const testCustomer = await Customer.create({
    userId,
    name: `Returns Test Customer ${Date.now()}`,
    mobile: '0300-1122334',
    city: 'Lahore',
  });

  // Helper to create test product with known stock
  async function createTestProduct(initialStock = 50) {
    const wp = `WP-RET-${Math.floor(Math.random() * 9000 + 1000)}`;
    return await Product.create({
      userId,
      wp,
      design: 'Damask Return Test',
      salePrice: 1000,
      stock: initialStock,
    });
  }

  // Helper to execute return confirmation with real transaction
  async function processReturnTransaction({
    invoiceId,
    invoiceItemId,
    returnQuantity,
    condition = 'accepted_to_stock',
    reason = 'Test return',
  }) {
    const dbSession = await mongoose.startSession();
    try {
      let result = null;
      await dbSession.withTransaction(async () => {
        const invoice = await Invoice.findOne({ _id: invoiceId, userId }).session(dbSession);
        if (!invoice) throw new Error('Invoice not found');

        const itemIndex = invoice.items.findIndex(
          (it, idx) =>
            (it._id && it._id.toString() === invoiceItemId.toString()) ||
            String(idx) === String(invoiceItemId) ||
            (it.productId && it.productId.toString() === invoiceItemId.toString())
        );
        if (itemIndex === -1) throw new Error('Invoice item not found');

        const item = invoice.items[itemIndex];
        if (item.is_fully_returned) {
          throw new ValidationError('This item has already been fully returned.');
        }

        const calc = calculateReturn(
          { quantity: item.qty, rate: item.rate, returned_quantity: item.returned_quantity },
          returnQuantity
        );

        const adj = computePaymentAdjustment(
          { total: invoice.total, paid: invoice.paid, remaining: invoice.remaining },
          calc.returnAmount
        );

        const returnRef = await generateFormattedCode(userId, 'return', undefined, dbSession);

        const [createdReturn] = await InvoiceReturn.create(
          [
            {
              userId,
              returnRef,
              invoiceId: invoice._id,
              invoiceItemId: item._id || invoiceItemId,
              customerId: invoice.customerId,
              productId: item.productId || null,
              originalQuantity: item.qty,
              returnedQuantity: returnQuantity,
              remainingQuantity: calc.remainingQty,
              unitPrice: item.rate,
              returnAmount: calc.returnAmount,
              condition,
              refundStatus: adj.refundDue > 0 ? 'pending' : 'not_applicable',
              paymentAdjustmentType: adj.type,
              paymentAdjustmentAmount: adj.refundDue > 0 ? adj.refundDue : adj.newBalanceDue,
              returnReason: reason,
              processedBy: userId,
              returnDate: new Date(),
            },
          ],
          { session: dbSession }
        );

        item.returned_quantity = calc.newReturnedQty;
        item.is_fully_returned = calc.isFullyReturned;
        invoice.markModified('items');

        invoice.total = adj.newTotalAmount;
        invoice.remaining = adj.newBalanceDue;
        invoice.returned_amount_total = round2((invoice.returned_amount_total || 0) + calc.returnAmount);
        if (invoice.remaining <= 0) invoice.jobStatus = 'Fully Paid';
        await invoice.save({ session: dbSession });

        if (item.productId && condition !== 'damaged' && condition !== 'rejected') {
          const updatedProd = await Product.findOneAndUpdate(
            { _id: item.productId, userId },
            { $inc: { stock: returnQuantity } },
            { session: dbSession, new: false }
          );
          const prevStock = updatedProd ? updatedProd.stock : 0;
          await StockHistory.create(
            [
              {
                userId,
                date: new Date(),
                productId: item.productId,
                wp: item.wp,
                type: 'Return',
                qty: returnQuantity,
                prevStock,
                newStock: prevStock + returnQuantity,
                reference: `Return ${returnRef}`,
              },
            ],
            { session: dbSession }
          );
        }

        result = {
          returnRef,
          returnAmount: calc.returnAmount,
          remainingQty: calc.remainingQty,
          updatedInvoiceTotal: adj.newTotalAmount,
          updatedBalanceDue: adj.newBalanceDue,
          refundDue: adj.refundDue,
          createdReturn,
        };
      });
      return result;
    } finally {
      await dbSession.endSession();
    }
  }

  // SCENARIO 1: Full return, fully paid invoice
  console.log('\n--- SCENARIO 1: Full return, fully paid invoice ---');
  const prod1 = await createTestProduct(50);
  const invNumber1 = await generateFormattedCode(userId, 'invoice');
  const inv1 = await Invoice.create({
    userId,
    number: invNumber1,
    customerId: testCustomer._id,
    items: [{ productId: prod1._id, wp: prod1.wp, design: prod1.design, qty: 5, rate: 1000, amount: 5000 }],
    subtotal: 5000,
    total: 5000,
    paid: 5000,
    remaining: 0,
    jobStatus: 'Fully Paid',
  });
  const itemId1 = inv1.items[0]._id;

  const s1Result = await processReturnTransaction({
    invoiceId: inv1._id,
    invoiceItemId: itemId1,
    returnQuantity: 5,
  });
  assert(s1Result.refundDue === 5000, 'Scenario 1: refundDue is full amount (5000)');
  assert(s1Result.updatedBalanceDue === 0, 'Scenario 1: balance stays 0');
  assert(s1Result.updatedInvoiceTotal === 0, 'Scenario 1: invoice total updated to 0');
  assert(s1Result.createdReturn.refundStatus === 'pending', 'Scenario 1: refund_status is pending');

  const checkInv1 = await Invoice.findById(inv1._id);
  assert(checkInv1.returned_amount_total === 5000, 'Scenario 1 DB: returned_amount_total is 5000');
  assert(checkInv1.items[0].is_fully_returned === true, 'Scenario 1 DB: item is_fully_returned = true');

  // SCENARIO 2: Full return, unpaid invoice
  console.log('\n--- SCENARIO 2: Full return, unpaid invoice ---');
  const prod2 = await createTestProduct(50);
  const invNumber2 = await generateFormattedCode(userId, 'invoice');
  const inv2 = await Invoice.create({
    userId,
    number: invNumber2,
    customerId: testCustomer._id,
    items: [{ productId: prod2._id, wp: prod2.wp, design: prod2.design, qty: 4, rate: 1000, amount: 4000 }],
    subtotal: 4000,
    total: 4000,
    paid: 0,
    remaining: 4000,
    jobStatus: 'Advance Received',
  });
  const s2Result = await processReturnTransaction({
    invoiceId: inv2._id,
    invoiceItemId: inv2.items[0]._id,
    returnQuantity: 4,
  });
  assert(s2Result.refundDue === 0, 'Scenario 2: refundDue is 0');
  assert(s2Result.updatedBalanceDue === 0, 'Scenario 2: balance reduces to 0');
  assert(s2Result.createdReturn.refundStatus === 'not_applicable', 'Scenario 2: refundStatus is not_applicable');

  // SCENARIO 3: Partial return, partially paid, return < remaining balance
  console.log('\n--- SCENARIO 3: Partial return, return < remaining balance ---');
  const prod3 = await createTestProduct(50);
  const inv3 = await Invoice.create({
    userId,
    number: await generateFormattedCode(userId, 'invoice'),
    customerId: testCustomer._id,
    items: [{ productId: prod3._id, wp: prod3.wp, design: prod3.design, qty: 6, rate: 1000, amount: 6000 }],
    subtotal: 6000,
    total: 6000,
    paid: 2000,
    remaining: 4000,
    jobStatus: 'Advance Received',
  });
  const s3Result = await processReturnTransaction({
    invoiceId: inv3._id,
    invoiceItemId: inv3.items[0]._id,
    returnQuantity: 2,
  });
  assert(s3Result.returnAmount === 2000, 'Scenario 3: Return amount is 2000');
  assert(s3Result.updatedBalanceDue === 2000, 'Scenario 3: Balance reduced by 2000 (from 4000 to 2000)');
  assert(s3Result.refundDue === 0, 'Scenario 3: No refund due');
  assert(s3Result.remainingQty === 4, 'Scenario 3: 4 rolls remain on item');

  // SCENARIO 4: Partial return, partially paid, return > remaining balance
  console.log('\n--- SCENARIO 4: Partial return, return > remaining balance ---');
  const prod4 = await createTestProduct(50);
  const inv4 = await Invoice.create({
    userId,
    number: await generateFormattedCode(userId, 'invoice'),
    customerId: testCustomer._id,
    items: [{ productId: prod4._id, wp: prod4.wp, design: prod4.design, qty: 5, rate: 1000, amount: 5000 }],
    subtotal: 5000,
    total: 5000,
    paid: 3000,
    remaining: 2000,
    jobStatus: 'Advance Received',
  });
  const s4Result = await processReturnTransaction({
    invoiceId: inv4._id,
    invoiceItemId: inv4.items[0]._id,
    returnQuantity: 4,
  });
  assert(s4Result.returnAmount === 4000, 'Scenario 4: Return amount is 4000');
  assert(s4Result.updatedBalanceDue === 0, 'Scenario 4: Balance cleared to 0');
  assert(s4Result.refundDue === 2000, 'Scenario 4: Excess 2000 becomes refundDue');
  assert(s4Result.createdReturn.refundStatus === 'pending', 'Scenario 4: refundStatus is pending');

  // SCENARIO 5: Attempt to return more than remaining quantity
  console.log('\n--- SCENARIO 5: Attempt to return more than remaining quantity ---');
  let errS5 = null;
  try {
    await processReturnTransaction({
      invoiceId: inv4._id,
      invoiceItemId: inv4.items[0]._id,
      returnQuantity: 2, // only 1 remaining!
    });
  } catch (err) {
    errS5 = err;
  }
  assert(errS5 !== null && errS5 instanceof ValidationError, 'Scenario 5: Throws ValidationError for excess quantity');

  // SCENARIO 6: Attempt to return an already-fully-returned item
  console.log('\n--- SCENARIO 6: Attempt to return an already-fully-returned item ---');
  let errS6 = null;
  try {
    await processReturnTransaction({
      invoiceId: inv1._id,
      invoiceItemId: itemId1, // already fully returned in Scenario 1
      returnQuantity: 1,
    });
  } catch (err) {
    errS6 = err;
  }
  assert(errS6 !== null && errS6 instanceof ValidationError, 'Scenario 6: Throws ValidationError for fully returned item');

  // SCENARIO 7: Two returns processed on the same item back-to-back
  console.log('\n--- SCENARIO 7: Two back-to-back returns on same item ---');
  const prod7 = await createTestProduct(50);
  const inv7 = await Invoice.create({
    userId,
    number: await generateFormattedCode(userId, 'invoice'),
    customerId: testCustomer._id,
    items: [{ productId: prod7._id, wp: prod7.wp, design: prod7.design, qty: 10, rate: 1000, amount: 10000 }],
    subtotal: 10000,
    total: 10000,
    paid: 10000,
    remaining: 0,
    jobStatus: 'Fully Paid',
  });
  const item7Id = inv7.items[0]._id;

  const r7a = await processReturnTransaction({
    invoiceId: inv7._id,
    invoiceItemId: item7Id,
    returnQuantity: 4,
  });
  assert(r7a.remainingQty === 6, 'Scenario 7: 1st return leaves 6 rolls');

  const r7b = await processReturnTransaction({
    invoiceId: inv7._id,
    invoiceItemId: item7Id,
    returnQuantity: 6,
  });
  assert(r7b.remainingQty === 0, 'Scenario 7: 2nd return correctly leaves 0 rolls');

  const inv7Check = await Invoice.findById(inv7._id);
  assert(inv7Check.items[0].is_fully_returned === true, 'Scenario 7: Item now marked fully returned');
  assert(inv7Check.items[0].returned_quantity === 10, 'Scenario 7: Total returned_quantity is 10');

  // SCENARIO 8: Damaged / rejected condition
  console.log('\n--- SCENARIO 8: Damaged/rejected condition (No restock) ---');
  const initialStock = 50;
  const prod8 = await createTestProduct(initialStock);
  const inv8 = await Invoice.create({
    userId,
    number: await generateFormattedCode(userId, 'invoice'),
    customerId: testCustomer._id,
    items: [{ productId: prod8._id, wp: prod8.wp, design: prod8.design, qty: 5, rate: 1000, amount: 5000 }],
    subtotal: 5000,
    total: 5000,
    paid: 0,
    remaining: 5000,
    jobStatus: 'Advance Received',
  });

  const s8Result = await processReturnTransaction({
    invoiceId: inv8._id,
    invoiceItemId: inv8.items[0]._id,
    returnQuantity: 3,
    condition: 'damaged',
  });
  assert(s8Result.createdReturn.condition === 'damaged', 'Scenario 8: Condition recorded as damaged');
  assert(s8Result.updatedBalanceDue === 2000, 'Scenario 8: Balance due reduced to 2000');

  const prod8After = await Product.findById(prod8._id);
  assert(prod8After.stock === initialStock, 'Scenario 8: Product stock was NOT incremented for damaged item');

  // SCENARIO 9: Refund Payout Confirmation
  console.log('\n--- SCENARIO 9: Refund Payout Confirmation ---');
  const returnToRefund = s4Result.createdReturn;
  assert(returnToRefund.refundStatus === 'pending', 'Scenario 9: Return has pending refund');

  const payoutSession = await mongoose.startSession();
  await payoutSession.withTransaction(async () => {
    const rRec = await InvoiceReturn.findById(returnToRefund._id).session(payoutSession);
    rRec.refundStatus = 'refunded';
    await rRec.save({ session: payoutSession });

    await Payment.create(
      [
        {
          userId,
          date: new Date(),
          customerId: rRec.customerId,
          invoiceId: rRec.invoiceId,
          amount: -2000,
          type: 'refund',
          method: 'Cash',
          reference: `Refund for ${rRec.returnRef}`,
          createdBy: userId,
        },
      ],
      { session: payoutSession }
    );

    const invToAdjust = await Invoice.findById(rRec.invoiceId).session(payoutSession);
    invToAdjust.paid = round2(invToAdjust.paid - 2000);
    invToAdjust.remaining = round2(invToAdjust.total - invToAdjust.paid);
    await invToAdjust.save({ session: payoutSession });
  });
  await payoutSession.endSession();

  const refundedCheck = await InvoiceReturn.findById(returnToRefund._id);
  assert(refundedCheck.refundStatus === 'refunded', 'Scenario 9: Return refund_status is now refunded');

  const paymentLedgerCheck = await Payment.findOne({
    invoiceId: returnToRefund.invoiceId,
    amount: -2000,
    type: 'refund',
  });
  assert(paymentLedgerCheck !== null, 'Scenario 9: Negative payment row successfully inserted in Payment ledger');

  const inv4AfterPayout = await Invoice.findById(inv4._id);
  assert(inv4AfterPayout.paid === 1000, 'Scenario 9: Invoice paid reduced from 3000 to 1000');
  assert(inv4AfterPayout.remaining === 0, 'Scenario 9: Invoice remaining balance remains 0');

  // Clean up test customer & demo documents created during test
  await Customer.deleteOne({ _id: testCustomer._id });
  await Invoice.deleteMany({ customerId: testCustomer._id });
  await InvoiceReturn.deleteMany({ customerId: testCustomer._id });
  await Payment.deleteMany({ customerId: testCustomer._id });
  await Product.deleteMany({ _id: { $in: [prod1._id, prod2._id, prod3._id, prod4._id, prod7._id, prod8._id] } });

  console.log('\n=================================================================');
  console.log('🎉 ALL 9 TEST SCENARIOS PASSED WITH 100% SUCCESS!');
  console.log('=================================================================\n');

  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
