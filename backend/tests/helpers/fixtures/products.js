/**
 * Product test data fixtures.
 * Static mock data for consistent test scenarios.
 */
import mongoose from 'mongoose';

/**
 * Basic product fixture matching Product schema.
 */
export const mockProduct = {
  _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
  id: 1,
  name: 'Test Silver Necklace',
  description: 'A beautiful handmade silver necklace for testing',
  usd_price: 75,
  ils_price: 277.50,
  category: 'necklaces',
  images: [
    {
      desktop: 'products/test-necklace-1-desktop.jpg',
      mobile: 'products/test-necklace-1-mobile.jpg',
      desktopLocal: 'products/test-necklace-1-desktop.jpg',
      mobileLocal: 'products/test-necklace-1-mobile.jpg'
    }
  ],
  quantity: 10,
  sku: 'TEST001',
  displayOrder: 10,
  available: true,
  date: new Date('2024-01-15T10:00:00Z')
};

/**
 * Product with multiple images (gallery).
 */
export const mockProductWithImages = {
  ...mockProduct,
  _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
  id: 2,
  name: 'Test Gold Bracelet',
  sku: 'TEST002',
  category: 'bracelets',
  usd_price: 120,
  ils_price: 444,
  displayOrder: 20,
  images: [
    {
      desktop: 'products/test-bracelet-1-desktop.jpg',
      mobile: 'products/test-bracelet-1-mobile.jpg',
      desktopLocal: 'products/test-bracelet-1-desktop.jpg',
      mobileLocal: 'products/test-bracelet-1-mobile.jpg'
    },
    {
      desktop: 'products/test-bracelet-2-desktop.jpg',
      mobile: 'products/test-bracelet-2-mobile.jpg',
      desktopLocal: 'products/test-bracelet-2-desktop.jpg',
      mobileLocal: 'products/test-bracelet-2-mobile.jpg'
    },
    {
      desktop: 'products/test-bracelet-3-desktop.jpg',
      mobile: 'products/test-bracelet-3-mobile.jpg',
      desktopLocal: 'products/test-bracelet-3-desktop.jpg',
      mobileLocal: 'products/test-bracelet-3-mobile.jpg'
    }
  ]
};

/**
 * Products grouped by category for testing category views.
 */
export const mockProductsByCategory = {
  necklaces: [mockProduct],
  bracelets: [mockProductWithImages],
  earrings: [{
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
    id: 3,
    name: 'Test Pearl Earrings',
    description: 'Elegant pearl earrings',
    usd_price: 45,
    ils_price: 166.50,
    category: 'earrings',
    images: [
      {
        desktop: 'products/test-earrings-1-desktop.jpg',
        mobile: 'products/test-earrings-1-mobile.jpg',
        desktopLocal: 'products/test-earrings-1-desktop.jpg',
        mobileLocal: 'products/test-earrings-1-mobile.jpg'
      }
    ],
    quantity: 5,
    sku: 'TEST003',
    displayOrder: 10,
    available: true
  }]
};

/**
 * Product without SKU (legacy data scenario).
 */
export const mockProductNoSku = {
  _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
  id: 4,
  name: 'Legacy Product',
  description: 'Product without SKU for backwards compatibility testing',
  usd_price: 50,
  ils_price: 185,
  category: 'rings',
  images: [
    {
      desktop: 'products/legacy-ring-desktop.jpg',
      mobile: 'products/legacy-ring-mobile.jpg',
      desktopLocal: 'products/legacy-ring-desktop.jpg',
      mobileLocal: 'products/legacy-ring-mobile.jpg'
    }
  ],
  quantity: 3,
  displayOrder: 10,
  available: true
};

/**
 * All product categories used in the application.
 */
export const productCategories = [
  'necklaces',
  'bracelets',
  'earrings',
  'rings',
  'anklets',
  'sets'
];
