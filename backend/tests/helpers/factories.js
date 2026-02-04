/**
 * Factory functions for creating unique test data.
 * Use factories when you need fresh, unique data for each test.
 * Use fixtures when you need consistent, predictable data.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// Counter for generating unique values
let counter = 0;

/**
 * Reset counter (call in beforeEach for predictable sequences).
 */
export function resetFactoryCounter() {
  counter = 0;
}

/**
 * Create a unique product with optional overrides.
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Product data (not saved to DB)
 */
export function createProduct(overrides = {}) {
  counter++;
  return {
    _id: new mongoose.Types.ObjectId(),
    id: 1000 + counter,
    name: `Test Product ${counter}`,
    description: `Description for test product ${counter}`,
    usd_price: 50 + counter,
    ils_price: (50 + counter) * 3.7,
    category: 'necklaces',
    images: [
      {
        desktop: `products/test-product-${counter}-desktop.jpg`,
        mobile: `products/test-product-${counter}-mobile.jpg`,
        desktopLocal: `products/test-product-${counter}-desktop.jpg`,
        mobileLocal: `products/test-product-${counter}-mobile.jpg`
      }
    ],
    quantity: 10,
    sku: `TEST${counter.toString().padStart(4, '0')}`,
    displayOrder: counter * 10,
    available: true,
    date: new Date(),
    ...overrides
  };
}

/**
 * Create a unique user with optional overrides.
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} User data (not saved to DB)
 */
export function createUser(overrides = {}) {
  counter++;
  return {
    _id: new mongoose.Types.ObjectId(),
    email: `testuser${counter}@example.com`,
    password: bcrypt.hashSync('TestPassword123', 10),
    userType: 'user',
    name: `Test User ${counter}`,
    cartData: {},
    Date: new Date(),
    ...overrides
  };
}

/**
 * Create an admin user with optional overrides.
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Admin user data
 */
export function createAdmin(overrides = {}) {
  return createUser({
    userType: 'admin',
    name: `Admin User ${counter}`,
    email: `admin${counter}@example.com`,
    ...overrides
  });
}

/**
 * Create a cart item for a product.
 * @param {string} productId - Product ObjectId as string
 * @param {number} quantity - Quantity in cart
 * @param {number} price - Price at time of adding
 */
export function createCartItem(productId, quantity = 1, price = 50) {
  return {
    [productId]: {
      quantity,
      price
    }
  };
}

/**
 * Create multiple products in batch.
 * @param {number} count - Number of products to create
 * @param {Object} commonOverrides - Overrides applied to all products
 */
export function createProducts(count, commonOverrides = {}) {
  return Array.from({ length: count }, () => createProduct(commonOverrides));
}

/**
 * Create a settings document for exchange rate testing.
 * @param {number} rate - USD to ILS exchange rate
 */
export function createSettings(rate = 3.70) {
  return {
    _id: new mongoose.Types.ObjectId(),
    exchangeRate: rate,
    exchangeRateUpdatedAt: new Date(),
    siteName: 'Test Store'
  };
}

/**
 * Create a mock order object.
 * @param {Object} options - Order options
 */
export function createOrder({
  userId,
  products = [],
  totalUsd = 100,
  totalIls = 370,
  status = 'pending',
  paymentMethod = 'paypal'
} = {}) {
  counter++;
  return {
    _id: new mongoose.Types.ObjectId(),
    orderId: `ORDER-${counter.toString().padStart(6, '0')}`,
    userId: userId || new mongoose.Types.ObjectId(),
    products,
    totalUsd,
    totalIls,
    status,
    paymentMethod,
    createdAt: new Date()
  };
}
