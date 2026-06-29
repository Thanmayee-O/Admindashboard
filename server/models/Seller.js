const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Seller name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Seller email is required'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  bankName: {
    type: String,
    required: [true, 'Bank name is required'],
  },
  bankAccountNumber: {
    type: String,
    required: [true, 'Bank account number is required'],
  },
  accountStatus: {
    type: String,
    enum: ['Active', 'Restricted', 'Locked'],
    default: 'Active',
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    default: 'seller123',
  },
  pendingBalance: {
    type: Number,
    required: true,
    default: 0, // Stored in cents
  },
  availableBalance: {
    type: Number,
    required: true,
    default: 0, // Stored in cents
  },
  totalEarnings: {
    type: Number,
    required: true,
    default: 0, // Stored in cents
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Seller', sellerSchema);
