const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
  },
  trackingNumber: {
    type: String,
    required: true,
    unique: true,
  },
  awbNumber: {
    type: String,
    required: true,
    unique: true,
  },
  carrierName: {
    type: String,
    required: true,
  },
  shippingRate: {
    type: Number,
    required: true, // Stored in cents
    min: 0,
  },
  shippingLabelUrl: {
    type: String,
    required: true,
  },
  originZipCode: {
    type: String,
    required: true,
  },
  destinationZipCode: {
    type: String,
    required: true,
  },
  parcelWeight: {
    type: Number,
    required: true,
    min: 0,
  },
  parcelLength: {
    type: Number,
    required: true,
    min: 0,
  },
  parcelWidth: {
    type: Number,
    required: true,
    min: 0,
  },
  parcelHeight: {
    type: Number,
    required: true,
    min: 0,
  },
  shipmentStatus: {
    type: String,
    enum: ['PENDING', 'BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'],
    default: 'PENDING',
  },
  providerResponse: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Shipment', shipmentSchema);
