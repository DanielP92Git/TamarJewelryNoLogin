const mongoose = require('mongoose');

const NewsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  subscribedAt: {
    type: Date,
    default: Date.now,
  },
  language: {
    type: String,
    enum: ['eng', 'heb'],
    default: 'eng',
  },
  discountCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  discountCodeUsed: {
    type: Boolean,
    default: false,
  },
  active: {
    type: Boolean,
    default: true,
  },
  ipAddress: {
    type: String,
  },
});

module.exports =
  mongoose.models.Newsletter || mongoose.model('Newsletter', NewsletterSchema);
