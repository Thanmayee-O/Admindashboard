const mongoose = require('mongoose');

const shippingPartnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Shipping Partner name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Shipping Partner email is required'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    default: 'shipping123',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('ShippingPartner', shippingPartnerSchema);
