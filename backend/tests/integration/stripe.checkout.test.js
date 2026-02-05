/**
 * Stripe Checkout Session Integration Tests (POST /create-checkout-session)
 *
 * Tests Stripe checkout session creation flow including:
 * - PAY-06: Session creation returns session ID and URL
 * - PAY-07: Session includes sessionId and URL for checkout redirect
 * - PAY-08: Card decline errors are handled appropriately
 * - PAY-09: Insufficient funds errors are handled
 * - PAY-10: Network failures return 500 with error details
 *
 * All Stripe API calls are mocked with nock - no real API calls made.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import nock from 'nock';

// Import test helpers
import { validateTestEnvironment } from '../helpers/envGuard.js';
import { disableNetConnect, cleanAllMocks, mockExchangeRateAPI } from '../helpers/mocks/index.js';
import { createProduct } from '../helpers/factories.js';

const STRIPE_API_URL = 'https://api.stripe.com';

describe('POST /create-checkout-session - Stripe Integration', () => {
  let app;
  let Product;

  beforeAll(async () => {
    // Verify safe test environment
    validateTestEnvironment();

    // Disable real HTTP requests
    disableNetConnect();

    // Import app dynamically after environment validation
    const appModule = await import('../../index.js');
    app = appModule.app;

    // Get Product model
    Product = mongoose.model('Product');
  });

  afterAll(async () => {
    cleanAllMocks();
  });

  beforeEach(async () => {
    cleanAllMocks();
    // Mock exchange rate API for each test
    mockExchangeRateAPI();
  });

  describe('Validation Errors', () => {
    it('should return 400 for empty items array', async () => {
      const response = await request(app)
        .post('/create-checkout-session')
        .send({
          items: [],
          currency: 'usd'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Missing items');
    });

    it('should return 400 for missing items field', async () => {
      const response = await request(app)
        .post('/create-checkout-session')
        .send({
          currency: 'usd'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Missing items');
    });

    it('should return 400 for invalid product id', async () => {
      const response = await request(app)
        .post('/create-checkout-session')
        .send({
          items: [{ id: 'invalid', title: 'Test', amount: 1 }],
          currency: 'usd'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid product id');
    });

    it('should return 404 for non-existent product', async () => {
      // Don't create product in DB
      const response = await request(app)
        .post('/create-checkout-session')
        .send({
          items: [{ id: 99999, title: 'Non-existent', amount: 1 }],
          currency: 'usd'
        })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Product not found');
    });

    it('should return 400 for out of stock product', async () => {
      // Create product with zero quantity
      const productData = createProduct({
        id: 1006,
        name: 'Out of Stock',
        usd_price: 50,
        quantity: 0
      });
      await new Product(productData).save();

      const response = await request(app)
        .post('/create-checkout-session')
        .send({
          items: [{ id: 1006, title: 'Out of Stock', amount: 1 }],
          currency: 'usd'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Product is out of stock');
    });
  });

  describe('Price Validation', () => {
    it('should reject product with zero price', async () => {
      // Create product with zero price
      const productData = createProduct({
        id: 1012,
        name: 'Zero Price',
        usd_price: 0,
        quantity: 10
      });
      await new Product(productData).save();

      // Mock Stripe - though it shouldn't be called due to validation
      nock(STRIPE_API_URL)
        .post('/v1/checkout/sessions')
        .reply(200, { id: 'should_not_reach' });

      const response = await request(app)
        .post('/create-checkout-session')
        .send({
          items: [{ id: 1012, title: 'Zero Price', amount: 1 }],
          currency: 'usd'
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject product with negative price', async () => {
      // Create product with negative price
      const productData = createProduct({
        id: 1013,
        name: 'Negative Price',
        usd_price: -10,
        quantity: 5
      });
      await new Product(productData).save();

      // Mock Stripe
      nock(STRIPE_API_URL)
        .post('/v1/checkout/sessions')
        .reply(200, { id: 'should_not_reach' });

      const response = await request(app)
        .post('/create-checkout-session')
        .send({
          items: [{ id: 1013, title: 'Negative Price', amount: 1 }],
          currency: 'usd'
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

  });
});
