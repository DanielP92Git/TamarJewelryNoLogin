/**
 * Payment Validation Integration Tests
 *
 * Tests input validation for both PayPal (/orders) and Stripe (/create-checkout-session) endpoints.
 * Covers requirements PAY-11, PAY-12, PAY-13:
 * - PAY-11: Required field validation (cart items, product IDs, names, quantities)
 * - PAY-12: Amount validation (negative, zero, non-numeric, excessive amounts)
 * - PAY-13: Currency code validation (invalid codes, missing codes, mixed currencies)
 *
 * Note: Backend validation is done inside createOrder function (line 1359-1398).
 * Some invalid inputs pass through to PayPal API and are rejected there.
 * Tests verify the backend handles invalid inputs gracefully and returns appropriate errors.
 */
import { describe, it, expect, beforeAll, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import nock from 'nock';
import { validateTestEnvironment } from '../helpers/envGuard.js';
import {
  disableNetConnect,
  cleanAllMocks,
  mockPayPalAuth,
  mockPayPalCreateOrder,
  mockExchangeRateAPI
} from '../helpers/mocks/index.js';
import { createProduct } from '../helpers/factories.js';

// Validate test environment
validateTestEnvironment();

const PAYPAL_SANDBOX_URL = 'https://api-m.sandbox.paypal.com';

describe('Payment Validation Tests - PayPal & Stripe', () => {
  let app;
  let Product;

  beforeAll(async () => {
    // Import app and models
    const appModule = await import('../../index.js');
    app = appModule.app;
    Product = mongoose.model('Product');

    // Disable external network calls
    disableNetConnect();
  });

  beforeEach(() => {
    // Mock exchange rate API for all tests (Stripe endpoint calls it)
    mockExchangeRateAPI();
  });

  afterEach(() => {
    // Clean up HTTP mocks between tests
    cleanAllMocks();
  });

  // ============================================================
  // PayPal /orders - Amount Validation (PAY-11, PAY-12)
  // ============================================================
  describe('POST /orders - Amount Validation (PAY-12)', () => {
    it('should return error for negative unit_amount.value (passes validation, PayPal rejects)', async () => {
      const cartWithNegativeAmount = [{
        name: 'Test Product',
        unit_amount: { value: '-50.00', currency_code: 'USD' },
        quantity: '1'
      }];

      // Backend validation doesn't catch negative amounts - PayPal will reject
      mockPayPalAuth('test-token');

      const response = await request(app)
        .post('/orders')
        .send({ cart: cartWithNegativeAmount });

      // Backend passes through, PayPal rejects with various error codes
      expect([400, 404, 500, 502]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for zero unit_amount.value (passes validation, fails on PayPal)', async () => {
      const cartWithZeroAmount = [{
        name: 'Test Product',
        unit_amount: { value: '0.00', currency_code: 'USD' },
        quantity: '1'
      }];

      // Backend validation doesn't catch zero amounts either
      mockPayPalAuth('test-token');

      const response = await request(app)
        .post('/orders')
        .send({ cart: cartWithZeroAmount });

      // PayPal may reject with various error codes
      expect([400, 404, 500, 502]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 500 for non-numeric unit_amount.value (caught in createOrder)', async () => {
      const cartWithInvalidAmount = [{
        name: 'Test Product',
        unit_amount: { value: 'invalid', currency_code: 'USD' },
        quantity: '1'
      }];

      const response = await request(app)
        .post('/orders')
        .send({ cart: cartWithInvalidAmount });

      // Backend catches this in createOrder validation (line 1373-1375)
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/failed to create order/i);
    });

    it('should return error for extremely large amount (passes to PayPal)', async () => {
      const cartWithHugeAmount = [{
        name: 'Test Product',
        unit_amount: { value: '9999999999.99', currency_code: 'USD' },
        quantity: '1'
      }];

      // Backend doesn't validate max amounts - PayPal will handle it
      mockPayPalAuth('test-token');

      const response = await request(app)
        .post('/orders')
        .send({ cart: cartWithHugeAmount });

      // PayPal may reject with various error codes
      expect([400, 404, 500, 502]).toContain(response.status);
    });

    it('should return 500 for missing unit_amount.value', async () => {
      const cartWithMissingValue = [{
        name: 'Test Product',
        unit_amount: { currency_code: 'USD' }, // Missing value field
        quantity: '1'
      }];

      const response = await request(app)
        .post('/orders')
        .send({ cart: cartWithMissingValue });

      // Backend catches this in validation (Number(item?.unit_amount?.value) is NaN)
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 500 for negative quantity', async () => {
      const cartWithNegativeQuantity = [{
        name: 'Test Product',
        unit_amount: { value: '50.00', currency_code: 'USD' },
        quantity: '-1'
      }];

      const response = await request(app)
        .post('/orders')
        .send({ cart: cartWithNegativeQuantity });

      // Backend validates qty <= 0 in line 1373
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 500 for zero quantity', async () => {
      const cartWithZeroQuantity = [{
        name: 'Test Product',
        unit_amount: { value: '50.00', currency_code: 'USD' },
        quantity: '0'
      }];

      const response = await request(app)
        .post('/orders')
        .send({ cart: cartWithZeroQuantity });

      // Backend validates qty <= 0
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should accept non-integer quantity (parseInt truncates to 1)', async () => {
      const cartWithDecimalQuantity = [{
        name: 'Test Product',
        unit_amount: { value: '50.00', currency_code: 'USD' },
        quantity: '1.5'
      }];

      // Mock PayPal success - parseInt('1.5', 10) = 1, so validation passes
      mockPayPalAuth('test-token');
      mockPayPalCreateOrder('ORDER-123', 'CREATED');

      const response = await request(app)
        .post('/orders')
        .send({ cart: cartWithDecimalQuantity });

      // Backend uses parseInt which truncates 1.5 to 1, so this passes
      expect(response.status).toBe(201);
    });
  });

  // ============================================================
  // PayPal /orders - Currency Validation (PAY-13)
  // ============================================================
  describe('POST /orders - Currency Validation (PAY-13)', () => {
    it('should return error for invalid currency code (PayPal rejects)', async () => {
      const cartWithInvalidCurrency = [{
        name: 'Test Product',
        unit_amount: { value: '50.00', currency_code: 'INVALID' },
        quantity: '1'
      }];

      // Backend doesn't validate currency codes - PayPal will reject
      mockPayPalAuth('test-token');

      const response = await request(app)
        .post('/orders')
        .send({ cart: cartWithInvalidCurrency });

      // PayPal will reject invalid currency with various error codes
      expect([400, 404, 500, 502]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for missing currency_code', async () => {
      const cartWithMissingCurrency = [{
        name: 'Test Product',
        unit_amount: { value: '50.00' }, // Missing currency_code
        quantity: '1'
      }];

      const response = await request(app)
        .post('/orders')
        .send({ cart: cartWithMissingCurrency });

      // Backend reads currency_code from cart[0].unit_amount.currency_code (line 1380)
      // If undefined, will cause various error codes
      expect([400, 404, 500, 502]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for mixed currencies in cart', async () => {
      const cartWithMixedCurrency = [
        { name: 'Product 1', unit_amount: { value: '50.00', currency_code: 'USD' }, quantity: '1' },
        { name: 'Product 2', unit_amount: { value: '150.00', currency_code: 'ILS' }, quantity: '1' }
      ];

      const response = await request(app)
        .post('/orders')
        .send({ cart: cartWithMixedCurrency });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      expect(response.body.code).toBe('MIXED_CURRENCY_CART');
      // Error message may not include "mixed" in production mode
    });

    it('should accept valid USD currency', async () => {
      const cartWithUSD = [{
        name: 'Test Product',
        unit_amount: { value: '50.00', currency_code: 'USD' },
        quantity: '1'
      }];

      // Mock successful PayPal flow
      mockPayPalAuth('test-token-usd');
      mockPayPalCreateOrder('ORDER-USD-123', 'CREATED');

      const response = await request(app)
        .post('/orders')
        .send({ cart: cartWithUSD });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });

    it('should accept valid ILS currency', async () => {
      const cartWithILS = [{
        name: 'Test Product',
        unit_amount: { value: '180.00', currency_code: 'ILS' },
        quantity: '1'
      }];

      // Mock successful PayPal flow
      mockPayPalAuth('test-token-ils');
      mockPayPalCreateOrder('ORDER-ILS-123', 'CREATED');

      const response = await request(app)
        .post('/orders')
        .send({ cart: cartWithILS });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });
  });

  // ============================================================
  // PayPal /orders - Required Fields (PAY-11)
  // ============================================================
  describe('POST /orders - Required Fields (PAY-11)', () => {
    it('should accept cart item missing name (PayPal will handle)', async () => {
      const cartWithoutName = [{
        // name field missing
        unit_amount: { value: '50.00', currency_code: 'USD' },
        quantity: '1'
      }];

      // Backend doesn't validate item.name before sending to PayPal
      mockPayPalAuth('test-token');

      const response = await request(app)
        .post('/orders')
        .send({ cart: cartWithoutName });

      // Backend sends to PayPal, which may reject with various error codes
      expect([400, 404, 500, 502]).toContain(response.status);
    });

    it('should accept cart item with empty name (PayPal may reject)', async () => {
      const cartWithEmptyName = [{
        name: '',
        unit_amount: { value: '50.00', currency_code: 'USD' },
        quantity: '1'
      }];

      // Backend doesn't validate empty names
      mockPayPalAuth('test-token');

      const response = await request(app)
        .post('/orders')
        .send({ cart: cartWithEmptyName });

      // PayPal requires non-empty name, may reject with various codes
      expect([400, 404, 500, 502]).toContain(response.status);
    });

    it('should return 500 for cart item missing quantity', async () => {
      const cartWithoutQuantity = [{
        name: 'Test Product',
        unit_amount: { value: '50.00', currency_code: 'USD' }
        // quantity field missing
      }];

      const response = await request(app)
        .post('/orders')
        .send({ cart: cartWithoutQuantity });

      // Backend validates quantity in line 1373 (parseInt returns NaN)
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 500 for malformed cart item', async () => {
      const malformedCart = [
        { invalid: 'structure' } // Wrong structure entirely
      ];

      const response = await request(app)
        .post('/orders')
        .send({ cart: malformedCart });

      // Backend validation catches missing required fields
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  // ============================================================
  // Stripe /create-checkout-session - Amount Validation (PAY-11, PAY-12)
  // ============================================================
  describe('POST /create-checkout-session - Amount Validation (PAY-12)', () => {
    it('should return 400/500 for product with zero usd_price', async () => {
      // Create product in DB with zero price
      const productData = createProduct({ usd_price: 0 });
      await Product.create(productData);

      const response = await request(app)
        .post('/create-checkout-session')
        .send({
          items: [{ id: productData.id, title: productData.name, amount: 1 }],
          currency: 'USD'
        });

      // Backend validates price > 0 in line 3387-3393
      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400/500 for product with negative usd_price', async () => {
      // Create product in DB with negative price
      const productData = createProduct({ usd_price: -50 });
      await Product.create(productData);

      const response = await request(app)
        .post('/create-checkout-session')
        .send({
          items: [{ id: productData.id, title: productData.name, amount: 1 }],
          currency: 'USD'
        });

      // Backend validates price > 0
      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 500 for product with invalid usd_price (null)', async () => {
      // Create product in DB with null price (NaN causes Mongoose error)
      const productData = createProduct({ usd_price: null });
      await Product.create(productData);

      const response = await request(app)
        .post('/create-checkout-session')
        .send({
          items: [{ id: productData.id, title: productData.name, amount: 1 }],
          currency: 'USD'
        });

      // Backend validates Number.isFinite(itemPriceUSD)
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400/500 for product with excessive price', async () => {
      // Create product in DB with price over limit (> 1000000)
      const productData = createProduct({ usd_price: 10000000 });
      await Product.create(productData);

      const response = await request(app)
        .post('/create-checkout-session')
        .send({
          items: [{ id: productData.id, title: productData.name, amount: 1 }],
          currency: 'USD'
        });

      // Backend validates price <= 1000000
      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });
  });

  // ============================================================
  // Stripe /create-checkout-session - Item Validation (PAY-11)
  // ============================================================
  describe('POST /create-checkout-session - Item Validation (PAY-11)', () => {
    // Note: Full Stripe item tests (empty items, invalid ID) are already covered
    // in stripe.checkout.test.js. These tests focus on validation edge cases.

    it('should return 400 for item with missing id', async () => {
      const response = await request(app)
        .post('/create-checkout-session')
        .send({
          items: [{ title: 'Test Product', amount: 1 }], // Missing id
          currency: 'USD'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid product id/i);
    });

    it('should return 400 for item with non-numeric id', async () => {
      const response = await request(app)
        .post('/create-checkout-session')
        .send({
          items: [{ id: 'invalid', title: 'Test Product', amount: 1 }],
          currency: 'USD'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid product id/i);
    });
  });
});
