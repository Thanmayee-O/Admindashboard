const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let uri = process.env.MONGO_URI;

    // Check if the URI is using the default placeholder and alert the user
    if (!uri || uri.includes('<db_password>')) {
      console.warn('\n⚠️  WARNING: MONGO_URI contains default placeholder "<db_password>" or is not set.');
      console.warn('Falling back to local MongoDB: mongodb://127.0.0.1:27017/ecommerce');
      uri = 'mongodb://127.0.0.1:27017/ecommerce';
    }

    const conn = await mongoose.connect(uri);

    console.log(`📡 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
