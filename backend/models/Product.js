const mongoose = require('mongoose');
const slugify = require('slugify');

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
  // Unified images array (Phase 7 migration)
  // First image = main/featured image
  // Old fields (mainImage, smallImages, smallImagesLocal) kept for backwards compatibility
  // TODO: Remove old fields after frontend fully migrated
  images: [
    {
      desktop: { type: String },
      mobile: { type: String },
      desktopLocal: { type: String },
      mobileLocal: { type: String },
      publicDesktop: { type: String },
      publicMobile: { type: String },
    },
  ],
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
  },
  displayOrder: {
    type: Number,
    index: true,  // For efficient sorting (compound index handles category-scoped queries)
    default: null,  // Will be set by pre-save hook for new products
    min: [1, 'displayOrder must be positive']
  },
  slug: {
    type: String,
    trim: true,
    sparse: true,
    unique: true,
    lowercase: true,
    maxLength: [120, 'Slug must be at most 120 characters'],
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);
      },
      message: 'Slug must contain only lowercase letters, numbers, and hyphens'
    }
  }
});

// Add explicit sparse unique index for SKU
ProductSchema.index({ sku: 1 }, { unique: true, sparse: true });

// Add explicit sparse unique index for slug
ProductSchema.index({ slug: 1 }, { unique: true, sparse: true, name: 'product_slug_unique_idx' });

// Compound index for category-scoped product ordering (ESR: Equality-Sort-Range)
// Declared here in addition to migration to ensure persistence across schema changes
ProductSchema.index(
  { category: 1, displayOrder: 1, available: 1 },
  { name: 'category_displayOrder_available_idx' }
);

// Pre-save hook: Auto-assign displayOrder for new products
ProductSchema.pre('save', async function(next) {
  // Only assign displayOrder for new documents without one
  if (this.isNew && this.displayOrder == null && this.category) {
    try {
      const Product = this.constructor;
      // Find highest displayOrder in the same category
      const maxProduct = await Product.findOne({ category: this.category })
        .sort({ displayOrder: -1 })
        .select('displayOrder')
        .lean();

      // Assign next gap-based value (10 higher than max, or 10 if first)
      this.displayOrder = maxProduct?.displayOrder
        ? maxProduct.displayOrder + 10
        : 10;
    } catch (err) {
      console.error('Error assigning displayOrder:', err);
      // Continue without displayOrder if there's an error
    }
  }
  next();
});

// Pre-save hook: Auto-generate slug for new products
ProductSchema.pre('save', async function(next) {
  // Only generate slug for new documents without one
  if (this.isNew && !this.slug && this.name) {
    const Product = this.constructor;
    const baseSlug = slugify(this.name, { lower: true, strict: true });

    // Check for collisions and use counter-based approach
    let finalSlug = baseSlug;
    let counter = 1;
    while (await Product.findOne({ slug: finalSlug })) {
      counter++;
      finalSlug = `${baseSlug}-${counter}`;
    }
    this.slug = finalSlug;
  }
  next();
});

module.exports =
  mongoose.models.Product || mongoose.model('Product', ProductSchema);


