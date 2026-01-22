const mongoose = require('mongoose');

const PromoBannerSchema = new mongoose.Schema({
  active: {
    type: Boolean,
    default: false,
  },
  badgeEng: {
    type: String,
    default: 'LIMITED EDITION',
  },
  badgeHeb: {
    type: String,
    default: 'מהדורה מוגבלת',
  },
  titleEng: {
    type: String,
    required: true,
  },
  titleHeb: {
    type: String,
    required: true,
  },
  descriptionEng: {
    type: String,
  },
  descriptionHeb: {
    type: String,
  },
  ctaEng: {
    type: String,
    default: 'Shop the Collection',
  },
  ctaHeb: {
    type: String,
    default: 'לקולקציה',
  },
  ctaLink: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
  },
  expiresAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports =
  mongoose.models.PromoBanner || mongoose.model('PromoBanner', PromoBannerSchema);
