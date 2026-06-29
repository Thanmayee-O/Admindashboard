const mongoose = require('mongoose');
const Order = require('../server/models/Order');
const Payment = require('../server/models/Payment');
const Product = require('../server/models/Product');

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ecommerce');
  console.log('📡 Connected to MongoDB');

  try {
    const cartItems = [{ productId: '000000000000000000000001', quantity: 1 }];
    const shippingAddress = {
      fullName: 'Jane Smith',
      phone: '9876543211',
      email: 'client2@example.com',
      address: '456 Commerce Avenue',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pincode: '400001'
    };

    let totalInPaise = 999 + 850;
    const order = await Order.create({
      userId: 'client2@example.com',
      items: [{
        productId: '000000000000000000000001',
        name: 'Essence Mascara Lash Princess',
        quantity: 1,
        price: 999
      }],
      totalAmount: totalInPaise,
      paymentStatus: 'Pending',
      orderStatus: 'Pending',
      sellerId: '6a3ff82e0dd077eed98b540e',
      shippingStatus: 'Pending',
      shippingAddress,
    });

    console.log('✅ Order created in DB:', order._id);

    const payment = await Payment.create({
      orderId: order._id,
      razorpayOrderId: 'order_test_123',
      amount: totalInPaise,
      currency: 'INR',
      status: 'Pending',
      idempotencyKey: 'rzp_test_key_2',
    });

    console.log('✅ Payment created in DB:', payment._id);

  } catch (error) {
    console.error('❌ Error executing DB test:', error);
  } finally {
    await mongoose.connection.close();
  }
}

test();
