const mongoose = require('mongoose');

const sellerLedgerSchema = new mongoose.Schema({
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
  grossSales: {
    type: Number,
    required: true,
    min: 0,
  },
  platformCommission: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentGatewayFees: {
    type: Number,
    required: true,
    min: 0,
  },
  logisticsCost: {
    type: Number,
    required: true,
    default: 0,
  },
  taxes: {
    type: Number,
    required: true,
    default: 0,
  },
  adjustmentsReserve: {
    type: Number,
    required: true,
    default: 0,
  },
  netPayout: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Released', 'Failed'],
    default: 'Pending',
  },
  releaseDate: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('SellerLedger', sellerLedgerSchema);
