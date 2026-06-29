const crypto = require('crypto');

let RazorpaySDK;
try {
  RazorpaySDK = require('razorpay');
} catch (e) {
  RazorpaySDK = null;
}

class MockRazorpayOrders {
  async create(options) {
    console.log(`🎫 [Mock Razorpay API] Creating Order for amount: ${options.amount} ${options.currency}`);
    const orderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    return {
      id: orderId,
      entity: 'order',
      amount: options.amount,
      amount_paid: 0,
      amount_due: options.amount,
      currency: options.currency,
      receipt: options.receipt,
      status: 'created',
      attempts: 0,
      created_at: Math.floor(Date.now() / 1000)
    };
  }
}

class MockRazorpay {
  constructor(config) {
    this.key_id = config.key_id;
    this.key_secret = config.key_secret;
    this.orders = new MockRazorpayOrders();
    console.log('⚡ [Mock Razorpay Sandbox initialized] Fallback active.');
  }
}

// Instantiate Razorpay client (use mock fallback if keys are missing or set to placeholder/default values)
const isConfigured = 
  process.env.RAZORPAY_KEY_ID && 
  process.env.RAZORPAY_KEY_SECRET && 
  process.env.RAZORPAY_KEY_ID !== 'rzp_test_placeholder';

let razorpayClient;

if (isConfigured && RazorpaySDK) {
  try {
    razorpayClient = new RazorpaySDK({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('💳 [Razorpay Client initialized] Real sandbox active.');
  } catch (error) {
    console.warn('⚠️  [Razorpay Init Error] Falling back to mock client:', error.message);
    razorpayClient = new MockRazorpay({ key_id: 'mock', key_secret: 'mock' });
  }
} else {
  razorpayClient = new MockRazorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'mock',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock'
  });
}

module.exports = razorpayClient;
