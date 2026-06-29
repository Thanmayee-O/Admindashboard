const fs = require('fs');
const path = require('path');
const stripe = require('../config/stripe');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Seller = require('../models/Seller');
const SellerLedger = require('../models/SellerLedger');
const PayoutLog = require('../models/PayoutLog');

// Ensure log directories exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Log transaction info to file
 */
const logTransaction = (message) => {
  const logFilePath = path.join(logsDir, 'transaction.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`);
};

/**
 * Generate email notification draft file on payment failure
 */
const generateEmailDraft = (order, payment, reason) => {
  const draftFilePath = path.join(logsDir, `email_draft_order_${order._id}.txt`);
  const draftContent = `
To: customer@example.com
Subject: Action Required: Payment Failed for Order #${order._id}

Dear Customer,

We are writing to inform you that your payment of $${(payment.amount / 100).toFixed(2)} for Order #${order._id} could not be completed.

Reason for failure: ${reason}

We have automatically released the reserved inventory for your items. If you still wish to complete this purchase, please visit the checkout page again or contact support.

Best regards,
Enterprise E-Commerce Billing Team
`;

  fs.writeFileSync(draftFilePath, draftContent.trim());
  console.log(`📧 [Email Draft Generated] Saved to ${draftFilePath}`);
};

/**
 * POST /api/v1/payments/checkout
 * Create Order, reserve stock, and initialize Stripe PaymentIntent
 */
const checkout = async (req, res) => {
  const { cartItems, userId = 'guest_user_123' } = req.body;
  const idempotencyKey = req.headers['idempotency-key'];

  try {
    // 1. Idempotency Key check
    if (idempotencyKey) {
      const existingPayment = await Payment.findOne({ idempotencyKey });
      if (existingPayment) {
        console.log(`🔄 [Idempotency] Request retried with key: ${idempotencyKey}. Returning previous response.`);
        logTransaction(`Idempotency hit for key: ${idempotencyKey}, Order ID: ${existingPayment.orderId}`);
        return res.status(200).json({
          success: true,
          clientSecret: existingPayment.clientSecret,
          orderId: existingPayment.orderId,
          isDuplicate: true,
        });
      }
    }

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items are required and must be an array.' });
    }

    // 2. Validate products & check stock & deduct stock in database (concurrency-safe)
    const itemsToOrder = [];
    let totalAmount = 0;
    const deductedItems = [];
    let orderSellerId = null;

    try {
      for (const item of cartItems) {
        if (!item.productId || !item.quantity || item.quantity <= 0) {
          throw new Error('Invalid cart item structure.');
        }

        // Deduct inventory atomically
        const product = await Product.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true }
        );

        if (!product) {
          throw new Error(`Insufficient stock or product not found for ID: ${item.productId}`);
        }

        if (!orderSellerId) {
          orderSellerId = product.sellerId;
        }

        deductedItems.push({ productId: item.productId, quantity: item.quantity });

        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        itemsToOrder.push({
          productId: product._id,
          name: product.name,
          quantity: item.quantity,
          price: product.price, // Database price
        });
      }
    } catch (validationError) {
      // Rollback already deducted stock
      for (const rollback of deductedItems) {
        await Product.findByIdAndUpdate(rollback.productId, {
          $inc: { stock: rollback.quantity }
        });
      }
      return res.status(400).json({ success: false, message: validationError.message });
    }

    // 3. Create Stripe PaymentIntent
    console.log(`💳 [Payment initiated] Initiating payment for user: ${userId}, Amount: $${(totalAmount / 100).toFixed(2)}`);
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'usd',
        metadata: {
          userId,
          idempotencyKey: idempotencyKey || 'none',
        },
      });
    } catch (stripeError) {
      // Rollback deducted stock
      for (const rollback of deductedItems) {
        await Product.findByIdAndUpdate(rollback.productId, {
          $inc: { stock: rollback.quantity }
        });
      }
      console.error('❌ [Payment initiation failed] Stripe error:', stripeError.message);
      return res.status(500).json({ success: false, message: `Stripe PaymentIntent creation failed: ${stripeError.message}` });
    }

    // 4. Create Order
    const order = await Order.create({
      userId,
      items: itemsToOrder,
      totalAmount,
      paymentIntentId: paymentIntent.id,
      paymentStatus: 'Pending',
      orderStatus: 'Pending',
      sellerId: orderSellerId,
      payoutStatus: 'Pending',
    });

    // 5. Create Payment Log
    const payment = await Payment.create({
      orderId: order._id,
      stripePaymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount,
      currency: 'usd',
      status: 'Pending',
      idempotencyKey: idempotencyKey || null,
    });

    logTransaction(`Payment Initiated: Order ID: ${order._id}, PaymentIntent ID: ${paymentIntent.id}, Amount: $${(totalAmount / 100).toFixed(2)}`);

    return res.status(201).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      orderId: order._id,
    });

  } catch (error) {
    console.error('❌ [Checkout Error] Internal server error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during checkout.' });
  }
};

/**
 * Handle async Stripe Webhook events
 */
const handleWebhookEvent = async (event) => {
  const eventData = event.data.object;

  switch (event.type) {
    case 'payment_intent.succeeded': {
      console.log(`✅ [Payment succeeded] PaymentIntent succeeded: ${eventData.id}`);
      
      const payment = await Payment.findOneAndUpdate(
        { stripePaymentIntentId: eventData.id },
        { status: 'Succeeded' },
        { new: true }
      );

      if (payment) {
        const order = await Order.findByIdAndUpdate(
          payment.orderId,
          { paymentStatus: 'Paid', orderStatus: 'Paid' },
          { new: true }
        );

        logTransaction(`Payment Succeeded: PaymentIntent: ${eventData.id}, Order ID: ${payment.orderId}`);
        console.log(`📦 [Order updated] Order #${payment.orderId} status set to Paid.`);

        // Trigger seller allocation and escrow logic
        const { allocateEscrow } = require('../services/payoutService');
        await allocateEscrow(order);

        // Trigger shipment booking automatically
        const { bookShipment } = require('../services/logisticsService');
        await bookShipment(order);
      } else {
        console.warn(`⚠️  [Webhook warning] No payment record found for Stripe ID: ${eventData.id}`);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const failureMessage = eventData.last_payment_error ? eventData.last_payment_error.message : 'Unknown payment error';
      console.log(`❌ [Payment failed] PaymentIntent failed: ${eventData.id}. Reason: ${failureMessage}`);

      const payment = await Payment.findOneAndUpdate(
        { stripePaymentIntentId: eventData.id },
        { status: 'Failed', failureReason: failureMessage },
        { new: true }
      );

      if (payment) {
        const order = await Order.findByIdAndUpdate(
          payment.orderId,
          { paymentStatus: 'Failed', orderStatus: 'Cancelled' },
          { new: true }
        );

        if (order) {
          logTransaction(`Payment Failed: PaymentIntent: ${eventData.id}, Order ID: ${payment.orderId}, Reason: ${failureMessage}`);
          console.log(`📦 [Order updated] Order #${payment.orderId} status set to Cancelled.`);

          // Restore inventory stock levels
          for (const item of order.items) {
            await Product.findByIdAndUpdate(item.productId, {
              $inc: { stock: item.quantity }
            });
            console.log(`🔄 [Inventory restored] Restored ${item.quantity} units of product "${item.name}" (ID: ${item.productId})`);
            logTransaction(`Inventory Restored: Product ID: ${item.productId}, Restored Qty: ${item.quantity}`);
          }

          // Generate customer notification draft email
          generateEmailDraft(order, payment, failureMessage);
        }
      } else {
        console.warn(`⚠️  [Webhook warning] No payment record found for Stripe ID: ${eventData.id}`);
      }
      break;
    }

    default:
      console.log(`ℹ️  [Webhook ignored] Unhandled event type: ${event.type}`);
  }
};

/**
 * POST /api/v1/payments/webhook
 * Unauthenticated webhook handler with signature verification
 */
const webhook = (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log(`📥 [Webhook received] Webhook endpoint triggered`);
  console.log(`🔍 [Debug Webhook] Secret: "${webhookSecret}", Signature: "${sig}", Body Type: ${typeof req.body}, IsBuffer: ${Buffer.isBuffer(req.body)}`);

  let event;
  try {
    // Construct the event from raw body and signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`❌ [Webhook signature verification failed] Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Acknowledge receipt to Stripe immediately
  res.status(200).json({ received: true });

  // Process processing asynchronously
  (async () => {
    try {
      await handleWebhookEvent(event);
    } catch (err) {
      console.error(`❌ [Webhook process error] Error handling event ${event.type}:`, err);
    }
  })();
};

/**
 * GET /api/v1/payments/products
 * Fetch all seeded products for the frontend catalog
 */
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.error('❌ [Get Products Error] Failed to fetch products:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};

/**
 * GET /api/v1/payments/sellers
 * Fetch all registered mock sellers
 */
const getSellers = async (req, res) => {
  try {
    const sellers = await Seller.find({});
    return res.status(200).json({ success: true, sellers });
  } catch (error) {
    console.error('❌ [Get Sellers Error] Failed to fetch sellers:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch sellers' });
  }
};

/**
 * GET /api/v1/payments/sellers/:id/dashboard
 * Fetch balances, ledger, and payout logs for a specific seller
 */
const getSellerDashboard = async (req, res) => {
  const { id } = req.params;
  try {
    const seller = await Seller.findById(id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    const ledgers = await SellerLedger.find({ sellerId: id }).populate('orderId').sort({ createdAt: -1 });
    const payoutLogs = await PayoutLog.find({ sellerId: id }).populate('orderId').sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      seller,
      ledgers,
      payoutLogs,
    });
  } catch (error) {
    console.error('❌ [Get Seller Dashboard Error] Failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch seller dashboard data' });
  }
};

/**
 * GET /api/v1/payments/orders
 * Fetch all orders from the database
 */
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('sellerId', 'name email accountStatus')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('❌ [Get Orders Error] Failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

/**
 * POST /api/v1/payments/razorpay/create-order
 * Create a Razorpay Order from the backend after validating cart details, stock levels, and applying idempotency
 */
const createRazorpayOrder = async (req, res) => {
  const { cartItems, userId, shippingAddress } = req.body;
  const idempotencyKey = req.headers['idempotency-key'];

  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({ success: false, message: 'Your shopping cart is empty.' });
  }

  if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.email || !shippingAddress.address || !shippingAddress.city || !shippingAddress.state || !shippingAddress.country || !shippingAddress.pincode) {
    return res.status(400).json({ success: false, message: 'Invalid or incomplete shipping address details.' });
  }

  try {
    // 1. Idempotency Check
    if (idempotencyKey) {
      console.log(`ℹ️ [Payment Initiated] Checkout session started. Idempotency Key: ${idempotencyKey}`);
      const existingPayment = await Payment.findOne({ idempotencyKey });
      if (existingPayment) {
        console.log(`⚠️ [Duplicate Payment Request Detected] Idempotency Key: ${idempotencyKey}`);
        if (existingPayment.status === 'Succeeded') {
          console.log(`🔄 [Existing Payment Returned] Returning existing succeeded payment for Idempotency Key: ${idempotencyKey}`);
          return res.status(200).json({
            success: true,
            orderId: existingPayment.orderId,
            isDuplicate: true,
            paymentStatus: 'Paid'
          });
        } else if (existingPayment.status === 'Pending') {
          console.log(`🔄 [Existing Payment Returned] Returning existing pending payment for Idempotency Key: ${idempotencyKey}`);
          return res.status(200).json({
            success: true,
            keyId: process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_API || 'rzp_test_placeholder',
            amount: existingPayment.amount,
            currency: existingPayment.currency,
            razorpayOrderId: existingPayment.razorpayOrderId,
            orderId: existingPayment.orderId,
            isDuplicate: true
          });
        }
      }
    } else {
      console.log(`ℹ️ [Payment Initiated] Checkout session started without idempotency key.`);
    }

    // 2. Validate products, stock, and calculate amount in paise (Rupees cents)
    let totalInPaise = 0;
    let sellerId = null;

    for (const item of cartItems) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Catalog item not found for ID: ${item.productId}` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for product: ${product.name}` });
      }

      totalInPaise += product.price * item.quantity;
      sellerId = product.sellerId; // Associate order with merchant
    }

    // Include standard shipping rate of ₹8.50 (850 paise)
    totalInPaise += 850;

    // 3. Generate a pre-allocated orderId
    const mongoose = require('mongoose');
    const crypto = require('crypto');
    const preAllocatedOrderId = new mongoose.Types.ObjectId();

    // 4. Create real Razorpay order
    const razorpay = require('../config/razorpay');
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_API;

    if (!keyId) {
      return res.status(500).json({ success: false, message: 'Razorpay is not configured. Please set RAZORPAY_KEY_ID in server/.env' });
    }

    let razorpayOrderId;
    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: totalInPaise,
        currency: 'INR',
        receipt: `receipt_${preAllocatedOrderId}`,
      });
      razorpayOrderId = razorpayOrder.id;
      console.log(`💳 [Razorpay Order Created] ${razorpayOrderId} | Local Order: ${preAllocatedOrderId} | Amount: ₹${(totalInPaise / 100).toFixed(2)}`);
    } catch (err) {
      console.error('❌ [Razorpay API Error]', err.message);
      return res.status(502).json({ success: false, message: `Razorpay API error: ${err.error?.description || err.message}` });
    }

    // 5. Record transaction state in Payment database (Order is NOT created yet — created only after payment verification)
    await Payment.create({
      orderId: preAllocatedOrderId,
      razorpayOrderId,
      amount: totalInPaise,
      currency: 'INR',
      status: 'Pending',
      idempotencyKey,
    });

    return res.status(200).json({
      success: true,
      keyId,
      amount: totalInPaise,
      currency: 'INR',
      razorpayOrderId,
      orderId: preAllocatedOrderId,
    });

  } catch (error) {
    console.error('❌ [Create Razorpay Order Error] Failed:', error);
    return res.status(500).json({ success: false, message: 'Internal server error creating payment gateway order.' });
  }
};

/**
 * POST /api/v1/payments/razorpay/verify-payment
 * Verify Razorpay payment signatures on the backend utilizing HMAC SHA256 and create Order document
 */
const verifyRazorpayPayment = async (req, res) => {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature, cartItems, userId, shippingAddress } = req.body;

  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !cartItems || !userId || !shippingAddress) {
    return res.status(400).json({ success: false, message: 'Missing payment verification or checkout parameters.' });
  }

  try {
    // 1. Check whether the razorpay_payment_id already exists in the database.
    const existingPaymentRecord = await Payment.findOne({ razorpayPaymentId: razorpay_payment_id });
    const existingOrderRecord = await Order.findOne({ razorpayPaymentId: razorpay_payment_id });

    if (existingPaymentRecord || existingOrderRecord) {
      console.log(`🚫 [Duplicate Payment Blocked] Payment ID: ${razorpay_payment_id} has already been processed.`);
      return res.status(200).json({
        success: true,
        message: 'Payment has already been processed.',
        orderId: existingOrderRecord ? existingOrderRecord._id : (existingPaymentRecord ? existingPaymentRecord.orderId : orderId)
      });
    }

    const crypto = require('crypto');
    const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORSECRET_API || 'rzp_test_secret_placeholder';

    // 2. Verify payment signature
    const text = razorpay_order_id + '|' + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_API || 'rzp_test_placeholder';
    const isMock = !keyId || keyId === 'rzp_test_placeholder' || keyId === 'mock' || razorpay_order_id.startsWith('order_mock_');
    const isSignatureValid = generated_signature === razorpay_signature || (isMock && razorpay_signature.startsWith('sig_mock_'));

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });

    if (!isSignatureValid) {
      console.error(`❌ [Payment Verification Failed] Signature Mismatch for Razorpay Order: ${razorpay_order_id}`);
      if (payment) {
        payment.status = 'Failed';
        payment.failureReason = 'Payment signature verification failed.';
        await payment.save();
      }
      return res.status(400).json({ success: false, message: 'Secure payment verification failed.' });
    }

    console.log(`✅ [Payment Verified] Signature valid for Razorpay Order: ${razorpay_order_id}`);

    // 3. Signature is VALID - Verify stock and create order in MongoDB
    let order = await Order.findById(orderId);
    if (order) {
      console.log(`ℹ️  [Verify Payment] Order #${orderId} already exists. Returning success.`);
      return res.status(200).json({
        success: true,
        message: 'Payment verified and order already confirmed.'
      });
    }

    // Validate products, stock, and calculate amount in paise
    let totalInPaise = 0;
    const itemsDetailList = [];
    let sellerId = null;

    for (const item of cartItems) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Catalog item not found for ID: ${item.productId}` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for product: ${product.name}` });
      }

      totalInPaise += product.price * item.quantity;
      sellerId = product.sellerId;

      itemsDetailList.push({
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price
      });
    }

    // Include standard shipping rate of ₹8.50 (850 paise)
    totalInPaise += 850;

    // Atomically deduct inventory stock
    const reservedItems = [];
    try {
      for (const item of cartItems) {
        const product = await Product.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true }
        );
        if (!product) {
          throw new Error(`Out of stock during checkout verification: ${item.productId}`);
        }
        reservedItems.push({ productId: item.productId, quantity: item.quantity });
      }
    } catch (stockError) {
      // Revert already reserved stocks
      for (const resItem of reservedItems) {
        await Product.findByIdAndUpdate(resItem.productId, { $inc: { stock: resItem.quantity } });
      }
      return res.status(400).json({ success: false, message: stockError.message });
    }

    // Create the Order document in MongoDB
    order = await Order.create({
      _id: orderId,
      userId,
      items: itemsDetailList,
      totalAmount: totalInPaise,
      paymentStatus: 'Paid',
      orderStatus: 'Pending Seller Confirmation',
      shippingStatus: 'Waiting for Seller Confirmation',
      sellerId,
      shippingAddress,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature
    });

    console.log(`🎉 [Order Created Successfully] Order ID: ${orderId} created for customer.`);

    // Update payment record status
    if (payment) {
      payment.status = 'Succeeded';
      payment.razorpayPaymentId = razorpay_payment_id;
      await payment.save();
    }

    // Trigger seller allocation split payout escrow creation
    const { allocateEscrow } = require('../services/payoutService');
    await allocateEscrow(order);

    console.log(`✅ [Payment Signature Verified & Order Created] Order #${orderId} marked Paid. Pending Seller Confirmation.`);

    return res.status(200).json({
      success: true,
      message: 'Payment verified and order submitted for seller confirmation.'
    });

  } catch (error) {
    console.error('❌ [Verify Payment Error] Failed:', error);
    return res.status(500).json({ success: false, message: 'Internal server error verifying payment.' });
  }
};

/**
 * POST /api/v1/payments/seller/login
 * Log in a registered merchant seller
 */
const sellerLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const seller = await Seller.findOne({ email: email.toLowerCase() });
    if (!seller) {
      return res.status(401).json({ success: false, message: 'Account not found for the specified email.' });
    }

    // Simple plain password verification for developer sandbox simplicity
    if (seller.password !== password) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    // Generate token
    const { generateToken } = require('../utils/token');
    const token = generateToken({
      sellerId: seller._id,
      email: seller.email,
      name: seller.name
    });

    // Set HttpOnly authentication cookie
    res.cookie('sellerToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60 * 1000 // 2 hours
    });

    console.log(`🏪 [Seller Logged In] ${seller.name}`);

    return res.status(200).json({
      success: true,
      token,
      seller: {
        _id: seller._id,
        name: seller.name,
        email: seller.email,
        accountStatus: seller.accountStatus
      }
    });

  } catch (error) {
    console.error('❌ [Seller Login Error] Failed:', error);
    return res.status(500).json({ success: false, message: 'Internal server error logging in.' });
  }
};

/**
 * GET /api/v1/payments/seller/orders
 * Fetch orders received by the logged-in seller
 */
const getSellerOrders = async (req, res) => {
  const sellerId = req.seller.sellerId;

  try {
    const orders = await Order.find({ sellerId })
      .populate('sellerId', 'name email accountStatus')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('❌ [Get Seller Orders Error] Failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
};

/**
 * POST /api/v1/payments/seller/orders/:id/accept
 * Accept a pending order, updating statuses and initiating shipment fulfillment bookings
 */
const acceptOrder = async (req, res) => {
  const { id } = req.params;
  const sellerId = req.seller.sellerId;

  try {
    const order = await Order.findOne({ _id: id, sellerId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.orderStatus !== 'Pending Seller Confirmation') {
      return res.status(400).json({ success: false, message: `Cannot accept order in current status: ${order.orderStatus}` });
    }

    order.orderStatus = 'Confirmed';
    order.shippingStatus = 'Preparing Shipment';
    await order.save();

    console.log(`👍 [Order Accepted] Order #${order._id} accepted by Seller.`);

    // Trigger Logistics Partner Shipping & AWB Generation
    const { bookShipment } = require('../services/logisticsService');
    await bookShipment(order);

    return res.status(200).json({
      success: true,
      message: 'Order accepted and shipping labels generation triggered.'
    });

  } catch (error) {
    console.error('❌ [Accept Order Error] Failed:', error);
    return res.status(500).json({ success: false, message: 'Internal server error accepting order.' });
  }
};

/**
 * POST /api/v1/payments/seller/orders/:id/reject
 * Reject a pending order, initiating customer refund sandboxing and restoring inventory stock levels
 */
const rejectOrder = async (req, res) => {
  const { id } = req.params;
  const sellerId = req.seller.sellerId;

  try {
    const order = await Order.findOne({ _id: id, sellerId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.orderStatus !== 'Pending Seller Confirmation') {
      return res.status(400).json({ success: false, message: `Cannot reject order in current status: ${order.orderStatus}` });
    }

    // 1. Update order and shipping status
    order.orderStatus = 'Rejected';
    order.shippingStatus = 'Not Shipped';
    order.refundStatus = 'Pending';
    await order.save();

    console.log(`👎 [Order Rejected] Order #${order._id} rejected by Seller. Refund Initiated.`);

    // 2. Revert seller balance ledger splits since the order was rejected
    const SellerLedger = require('../models/SellerLedger');
    const Seller = require('../models/Seller');
    
    const ledger = await SellerLedger.findOne({ orderId: order._id });
    if (ledger) {
      const seller = await Seller.findById(sellerId);
      if (seller) {
        seller.pendingBalance = Math.max(0, seller.pendingBalance - ledger.netPayout);
        await seller.save();
      }
      ledger.status = 'Failed'; // Set status to Failed to block cron releases
      await ledger.save();
    }

    // 3. Re-add inventory stock levels
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
    }

    return res.status(200).json({
      success: true,
      message: 'Order rejected. Stock levels restored and customer refund initiated.'
    });

  } catch (error) {
    console.error('❌ [Reject Order Error] Failed:', error);
    return res.status(500).json({ success: false, message: 'Internal server error rejecting order.' });
  }
};

/**
 * GET /api/v1/payments/seller/earnings
 * Retrieve ledger lists and payout released logs for the authenticated seller
 */
const getSellerEarnings = async (req, res) => {
  const sellerId = req.seller.sellerId;

  try {
    const ledgers = await SellerLedger.find({ sellerId }).populate('orderId').sort({ createdAt: -1 });
    const payoutLogs = await PayoutLog.find({ sellerId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      ledgers,
      payoutLogs
    });
  } catch (error) {
    console.error('❌ [Get Seller Earnings Error] Failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve earnings stats.' });
  }
};

/**
 * GET /api/v1/payments/orders/:id
 * Retrieve details for a specific order by ID (populates seller and shipment)
 */
const getOrderById = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await Order.findById(id).populate('sellerId').populate('shipmentId');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('❌ [Get Order By ID Error] Failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch order details.' });
  }
};

module.exports = {
  checkout,
  webhook,
  getProducts,
  getSellers,
  getSellerDashboard,
  getOrders,
  getOrderById,
  createRazorpayOrder,
  verifyRazorpayPayment,
  sellerLogin,
  getSellerOrders,
  acceptOrder,
  rejectOrder,
  getSellerEarnings,
};
