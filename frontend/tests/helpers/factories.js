/**
 * Factory functions for creating unique frontend test data.
 * Use factories when you need fresh, unique data for each test.
 *
 * These factories generate data matching frontend model.js structures.
 */

// Counter for generating unique values
let counter = 0;

/**
 * Reset counter for predictable sequences.
 * Call in beforeEach for tests that depend on specific IDs.
 */
export function resetFactoryCounter() {
  counter = 0;
}

/**
 * Create a unique product matching frontend Product shape.
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Product data matching backend API format
 */
export function createProduct(overrides = {}) {
  counter++;
  return {
    id: 1000 + counter,
    name: `Test Product ${counter}`,
    description: `Description for test product ${counter}`,
    usd_price: 50 + counter,
    ils_price: (50 + counter) * 3.7,
    category: 'necklaces',
    images: [
      {
        desktop: `products/test-product-${counter}-desktop.jpg`,
        mobile: `products/test-product-${counter}-mobile.jpg`
      }
    ],
    quantity: 10,
    sku: `T${counter.toString().padStart(3, '0')}`,
    displayOrder: counter * 10,
    available: true,
    ...overrides
  };
}

/**
 * Create multiple products in batch.
 * @param {number} count - Number of products to create
 * @param {Object} commonOverrides - Overrides applied to all products
 * @returns {Array<Object>} Array of product objects
 */
export function createProducts(count, commonOverrides = {}) {
  return Array.from({ length: count }, () => createProduct(commonOverrides));
}

/**
 * Create a cart item for localStorage cart format.
 * Frontend cart format (from model.js): Array of objects with:
 * { title, image, price, originalPrice, discountedPrice, quantity, id }
 *
 * @param {Object} product - Product object
 * @param {number} quantity - Quantity in cart
 * @returns {Object} Cart item object
 */
export function createCartItem(product, quantity = 1) {
  return {
    id: product.id,
    title: product.name,
    description: product.description,
    image: product.images[0]?.desktop || '',
    price: product.ils_price, // Frontend cart uses ILS by default
    originalPrice: null,
    discountedPrice: null,
    quantity,
    category: product.category,
    sku: product.sku
  };
}

/**
 * Create a full cart with multiple items.
 * Frontend cart is an array of cart items.
 *
 * @param {Array<{product: Object, quantity: number}>} items
 * @returns {Array} Cart array for localStorage
 */
export function createCart(items) {
  return items.map(({ product, quantity }) => createCartItem(product, quantity));
}

/**
 * Create mock exchange rate settings matching backend API response.
 * @param {number} rate - USD to ILS exchange rate
 * @returns {Object} Settings object
 */
export function createExchangeRate(rate = 3.70) {
  return {
    exchangeRate: rate,
    exchangeRateUpdatedAt: new Date().toISOString()
  };
}

/**
 * Create a mock user object for authentication testing.
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} User data
 */
export function createUser(overrides = {}) {
  counter++;
  return {
    id: counter,
    email: `testuser${counter}@example.com`,
    name: `Test User ${counter}`,
    userType: 'user',
    ...overrides
  };
}

/**
 * Create an admin user.
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
 * Create a mock JWT token for auth testing.
 * NOT a real JWT - just a mock string for localStorage.
 * @param {string} userId - User ID to embed in mock token
 * @returns {string} Mock JWT token
 */
export function createMockToken(userId = '123') {
  return `mock.jwt.token-${userId}-${Date.now()}`;
}
