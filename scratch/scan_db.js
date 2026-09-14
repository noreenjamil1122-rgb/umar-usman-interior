const fs = require('fs');
const mongoose = require('mongoose');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/MONGODB_URI=(.*)/);
const uri = match ? match[1].trim() : '';

mongoose.connect(uri).then(async () => {
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections in database:', collections.map(c => c.name));

  for (const c of collections) {
    const col = mongoose.connection.db.collection(c.name);
    const regexDocs = await col.find({
      $or: [
        { wp: /2143/i },
        { name: /2143/i },
        { design: /2143/i },
        { code: /2143/i },
        { number: /2143/i },
        { title: /2143/i },
        { description: /2143/i },
        { notes: /2143/i }
      ]
    }).toArray();

    if (regexDocs.length > 0) {
      console.log(`Found ${regexDocs.length} matches in collection ${c.name}:`, regexDocs.map(d => ({
        _id: d._id,
        wp: d.wp,
        name: d.name,
        code: d.code,
        design: d.design,
        number: d.number
      })));
    }
  }

  // Also check similar numbers like 202043, 214, 2143x, etc.
  const prodCol = mongoose.connection.db.collection('products');
  const prodsWith21 = await prodCol.find({ wp: /21/ }).toArray();
  console.log('Products with "21" in WP:', prodsWith21.map(p => ({ wp: p.wp, design: p.design })));

  const prodsWith43 = await prodCol.find({ wp: /43/ }).toArray();
  console.log('Products with "43" in WP:', prodsWith43.map(p => ({ wp: p.wp, design: p.design })));

  console.log('Done.');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
