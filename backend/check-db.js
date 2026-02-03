const mongoose = require('mongoose');
const Product = require('./models/Product');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jewelry');
    const p = await Product.findOne({ id: 106 }).lean();
    console.log('=== Database images[0] ===');
    console.log(JSON.stringify(p.images?.[0], null, 2));
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

check();
