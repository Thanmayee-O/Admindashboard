require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Seller = require('../models/Seller');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const SellerLedger = require('../models/SellerLedger');
const PayoutLog = require('../models/PayoutLog');
const Shipment = require('../models/Shipment');
const ShippingPartner = require('../models/ShippingPartner');
const connectDB = require('../config/db');

const seedDB = async () => {
  try {
    await connectDB();

    // 1. Clear existing database collections
    await Seller.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Payment.deleteMany({});
    await SellerLedger.deleteMany({});
    await PayoutLog.deleteMany({});
    await Shipment.deleteMany({});
    await ShippingPartner.deleteMany({});
    console.log('🗑️  Database cleared.');

    // Seed Mock Shipping Partner
    await ShippingPartner.create({
      name: 'Global Express Logistics',
      email: 'shipping@partner.com',
      password: 'shipping123'
    });
    console.log('🌱 Seeded 1 Shipping Partner: Global Express Logistics');

    // 2. Seed Mock Sellers
    const sellers = [
      {
        name: 'Acme Electronics',
        email: 'acme.payouts@example.com',
        bankName: 'Chase Bank',
        bankAccountNumber: 'Chase-123456789',
        accountStatus: 'Active',
        pendingBalance: 0,
        availableBalance: 0,
        totalEarnings: 0,
      },
      {
        name: 'Restricted Goods Corp',
        email: 'restricted.corp@example.com',
        bankName: 'Wells Fargo',
        bankAccountNumber: 'WF-987654321',
        accountStatus: 'Restricted',
        pendingBalance: 0,
        availableBalance: 0,
        totalEarnings: 0,
      },
    ];

    const [activeSeller, restrictedSeller] = await Seller.insertMany(sellers);
    console.log('🌱 Seeded 2 Sellers:');
    console.log(`- [${activeSeller.name}] ID: ${activeSeller._id} | Status: ${activeSeller.accountStatus}`);
    console.log(`- [${restrictedSeller.name}] ID: ${restrictedSeller._id} | Status: ${restrictedSeller.accountStatus}`);

    // 3. Fetch products from DummyJSON API
    console.log('📡 Fetching catalog products from https://dummyjson.com/products...');
    const response = await fetch('https://dummyjson.com/products?limit=30');
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }
    const data = await response.json();
    const dummyProducts = data.products;
    
    console.log(`✅ Retrieved ${dummyProducts.length} products. Inserting into database...`);

    // 4. Map dummy products to Mongoose Product Schema
    const mappedProducts = dummyProducts.map((p, idx) => {
      // Create a padded 24-character hex ObjectId from product ID (e.g. 1 -> 000000000000000000000001)
      const objectId = p.id.toString().padStart(24, '0');
      
      // Convert price from decimal to cents (e.g. 9.99 -> 999)
      const priceInCents = Math.round(p.price * 100);

      // Alternate seller assignments to test payout flows (even products -> active seller, odd -> restricted)
      const assignedSeller = idx % 2 === 0 ? activeSeller : restrictedSeller;

      return {
        _id: new mongoose.Types.ObjectId(objectId),
        name: p.title,
        price: priceInCents,
        stock: p.stock || 10,
        description: p.description,
        sellerId: assignedSeller._id,
      };
    });

    const createdProducts = await Product.insertMany(mappedProducts);
    console.log(`🌱 Seeded ${createdProducts.length} Products into MongoDB:`);
    createdProducts.slice(0, 5).forEach(product => {
      const sellerName = product.sellerId.toString() === activeSeller._id.toString() ? activeSeller.name : restrictedSeller.name;
      console.log(`- [${product.name}] ID: ${product._id} | Seller: ${sellerName} | Price: $${(product.price / 100).toFixed(2)}`);
    });
    console.log('... and more.');

    mongoose.connection.close();
    console.log('📡 Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDB();
