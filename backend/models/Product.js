const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  id: { type: Number, required: true, index: true },
  name: { type: String, required: true },
  // Legacy image field
  image: { type: String },
  // Main image with responsive versions
  mainImage: {
    desktop: { type: String },
    mobile: { type: String },
    desktopLocal: { type: String },
    mobileLocal: { type: String },
    publicDesktop: { type: String },
    publicMobile: { type: String },
  },
  // Small images array with responsive versions
  smallImages: [
    {
      desktop: { type: String },
      mobile: { type: String },
      desktopLocal: { type: String },
      mobileLocal: { type: String },
    },
  ],
  // Legacy small images field (older products stored gallery URLs here)
  smallImagesLocal: [{ type: String }],
  // Additional image URLs for better accessibility
  imageLocal: { type: String },
  publicImage: { type: String },
  directImageUrl: { type: String },
  // Product details
  category: { type: String, required: true, index: true },
  description: { type: String },
  quantity: { type: Number, default: 0 },
  ils_price: { type: Number },
  usd_price: { type: Number },
  original_ils_price: { type: Number },
  original_usd_price: { type: Number },
  discount_percentage: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
  available: { type: Boolean, default: true },
  security_margin: { type: Number },
  // Featured products
  featured: { type: Boolean, default: false, index: true },
  bestseller: { type: Boolean, default: false },
  featuredOrder: { type: Number, default: 0 },
  salesCount: { type: Number, default: 0 },
});

module.exports =
  mongoose.models.Product || mongoose.model('Product', ProductSchema);


