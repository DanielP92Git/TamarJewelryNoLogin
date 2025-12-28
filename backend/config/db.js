const mongoose = require('mongoose');

async function connectDb() {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl || typeof mongoUrl !== 'string') {
    const err = new Error('MONGO_URL is not set');
    err.code = 'MONGO_URL_MISSING';
    err.statusCode = 500;
    throw err;
  }

  return mongoose.connect(mongoUrl);
}

module.exports = { connectDb };


