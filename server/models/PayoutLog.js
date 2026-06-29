const mongoose = require('mongoose');

const payoutLogSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  payoutStatus: {
    type: String,
    enum: ['Initiated', 'Success', 'Failed'],
    required: true,
  },
  failureReason: {
    type: String,
    default: null,
  },
  transactionReference: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('PayoutLog', payoutLogSchema);
