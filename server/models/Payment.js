const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
  },
  stripePaymentIntentId: {
    type: String,
    unique: true,
    sparse: true,
  },
  razorpayOrderId: {
    type: String,
    unique: true,
    sparse: true,
  },
  razorpayPaymentId: {
    type: String,
    unique: true,
    sparse: true,
  },
  clientSecret: {
    type: String,
    default: null,
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Amount cannot be negative'],
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'INR',
  },
  status: {
    type: String,
    required: [true, 'Payment status is required'],
    default: 'Pending',
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true, // Allow empty/null values if not provided
  },
  failureReason: {
    type: String,
    default: null,
  },
}, {
  timestamps: true, // Automatically provides createdAt and updatedAt fields
});

// Ensure idempotency key search is indexed for performance
paymentSchema.index({ idempotencyKey: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
