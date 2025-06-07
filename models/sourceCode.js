const mongoose = require('mongoose');

const rentalOptionSchema = new mongoose.Schema({
  duration: {
    type: String,
    required: true
  },
  durationDays: { 
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  }
});

const sourceCodeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please enter a title for the source code'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide a description']
  },
  category: {
    type: String,
    required: [true, 'Please select a category']
  },
  tags: [String],
  price_buy: {
    type: Number,
    required: function() { return !this.is_for_rent_only; } 
  },
  rental_options: [rentalOptionSchema],
  is_for_rent_only: { 
    type: Boolean,
    default: false
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  filePath: { 
    type: String,
  },
  screenshots: [String],
  demoUrl: {
    type: String,
    trim: true
  },
  techStack: [String], 
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected', 'delisted'],
    default: 'pending_approval'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

sourceCodeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const SourceCode = mongoose.model('SourceCode', sourceCodeSchema);
module.exports = SourceCode;