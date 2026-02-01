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
  sku: {
    type: String,
    uppercase: true,        // Auto-transform to uppercase (handles abc123 -> ABC123)
    trim: true,             // Auto-trim whitespace
    sparse: true,           // Allow multiple documents without SKU (for existing products)
    unique: true,           // Prevent duplicates when SKU is present
    minLength: [2, 'SKU must be at least 2 characters'],
    maxLength: [7, 'SKU must be at most 7 characters'],
    validate: {
      validator: function(v) {
        // Allow empty/null for existing products (backwards compatibility)
        if (!v) return true;
        // Only alphanumeric after uppercase transform
        return /^[A-Z0-9]+$/.test(v);
      },
      message: 'SKU must contain only letters and numbers (A-Z, 0-9)'
    }
  }
});

// Add explicit sparse unique index for SKU
ProductSchema.index({ sku: 1 }, { unique: true, sparse: true });

module.exports =
  mongoose.models.Product || mongoose.model('Product', ProductSchema);


