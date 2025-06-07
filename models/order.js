const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  sourceCode: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'SourceCode'
  },
  orderType: { // 'buy' or 'rent'
    type: String,
    required: true,
    enum: ['buy', 'rent']
  },
  rentalDurationDays: { // Only if orderType is 'rent'
    type: Number
  },
  rentalEndDate: { // Only if orderType is 'rent'
    type: Date
  },
  amount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  transactionId: {
    type: String
  },
  downloadLink: {
      type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;