const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Seller = require('./models/Seller');
const Order = require('./models/Order');

async function run() {
  await connectDB();
  try {
    const orders = await Order.find({}).populate('sellerId');
    console.log("=== DB Orders count:", orders.length);
    orders.forEach(o => {
      console.log(`Order ID: ${o._id}`);
      console.log(`- Seller ID: ${o.sellerId ? o.sellerId._id : 'null'}`);
      console.log(`- Seller Name: ${o.sellerId ? o.sellerId.name : 'null'}`);
      console.log(`- Payment Status: ${o.paymentStatus}`);
      console.log(`- Order Status: ${o.orderStatus}`);
      console.log(`- Shipping Status: ${o.shippingStatus}`);
      console.log(`- Razorpay Order ID: ${o.razorpayOrderId}`);
      console.log(`- Items:`, o.items.map(i => `${i.name} (Qty: ${i.quantity}, Price: ${i.price})`));
    });
  } catch (err) {
    console.error("Error:", err);
  } finally {
    mongoose.connection.close();
  }
}

run();
