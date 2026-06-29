const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  price: {
    type: Number,
    required: true, // Price in cents at checkout
    min: [0, 'Price cannot be negative'],
  },
});

const orderSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, 'User ID is required'],
  },
  items: {
    type: [orderItemSchema],
    validate: [val => val.length > 0, 'Order must contain at least one item'],
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative'],
  },
  paymentIntentId: {
    type: String,
    unique: true,
    sparse: true, // Allow multiple nulls if payment is not initiated yet
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed'],
    default: 'Pending',
  },
  orderStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Pending Seller Confirmation', 'Confirmed', 'Rejected', 'Cancelled', 'Shipped', 'Out for Delivery', 'Out For Delivery', 'Completed', 'Delivery Failed'],
    default: 'Pending',
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: [true, 'Seller ID is required'],
  },
  payoutStatus: {
    type: String,
    enum: ['Pending', 'Released', 'Failed', 'None'],
    default: 'Pending',
  },
  shipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment',
    default: null,
  },
  shippingStatus: {
    type: String,
    enum: ['Pending', 'Waiting for Seller Confirmation', 'Confirmed', 'Preparing Shipment', 'Shipment Created', 'Picked Up', 'In Transit', 'Out for Delivery', 'Out For Delivery', 'Delivered', 'Delivery Failed', 'Rejected', 'Not Shipped'],
    default: 'Pending',
  },
  shippingAddress: {
    fullName: { type: String, required: true },
    phone: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^\d{10}$/.test(v);
        },
        message: props => `${props.value} is not a valid 10-digit phone number!`
      }
    },
    email: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^\S+@\S+\.\S+/.test(v);
        },
        message: props => `${props.value} is not a valid email address!`
      }
    },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  razorpayOrderId: {
    type: String,
    default: null,
    unique: true,
    sparse: true,
  },
  razorpayPaymentId: {
    type: String,
    default: null,
    unique: true,
    sparse: true,
  },
  razorpaySignature: {
    type: String,
    default: null,
  },
  refundStatus: {
    type: String,
    enum: ['None', 'Pending', 'Initiated', 'Refunded'],
    default: 'None',
  },
  trackingNumber: {
    type: String,
    default: null,
  },
  awbNumber: {
    type: String,
    default: null,
  },
  shippingLabelUrl: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Order', orderSchema);
