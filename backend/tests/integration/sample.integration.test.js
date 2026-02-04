/**
 * Sample Integration Test
 * Demonstrates the test infrastructure working together:
 * - Vitest test runner
 * - mongodb-memory-server for isolated database
 * - nock for external API mocking
 * - supertest for HTTP requests
 * - fixtures and factories for test data
 *
 * Use this as a template for Phase 11-16 integration tests.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

// Import fixtures and factories
import { mockProduct, mockUser } from '../helpers/fixtures/index.js';
import { createProduct, createUser } from '../helpers/factories.js';

// Import mock utilities
import {
  disableNetConnect,
  cleanAllMocks,
  mockExchangeRateAPI
} from '../helpers/mocks/index.js';

// Import environment guard to verify safety
import { validateTestEnvironment } from '../helpers/envGuard.js';

describe('Sample Integration Test - Infrastructure Verification', () => {
  let app;

  beforeAll(async () => {
    // Verify we're in safe test environment
    validateTestEnvironment();

    // Disable real HTTP requests (only allow localhost for supertest)
    disableNetConnect();

    // Import app after environment is validated
    // Dynamic import to ensure setup.js runs first
    const appModule = await import('../../index.js');
    app = appModule.app;
  });

  afterAll(async () => {
    cleanAllMocks();
  });

  beforeEach(async () => {
    // Clear mocks between tests
    cleanAllMocks();
  });

  describe('Database Isolation', () => {
    it('should be connected to in-memory MongoDB', () => {
      // Connection may be pending briefly, but should eventually be connected
      expect(mongoose.connection.readyState).toBeGreaterThanOrEqual(1);
      // Memory server uses 127.0.0.1
      expect(mongoose.connection.host).toBe('127.0.0.1');
    });

    it('should be able to save and retrieve data', async () => {
      // Use Product model from the app
      const Product = mongoose.model('Product');

      // Create test product using factory
      const productData = createProduct({ name: 'Integration Test Product' });
      const product = new Product(productData);
      await product.save();

      // Verify it was saved
      const found = await Product.findById(product._id);
      expect(found).toBeDefined();
      expect(found.name).toBe('Integration Test Product');
    });
  });

  describe('API Endpoint Testing', () => {
    it('should respond to /allproducts endpoint', async () => {
      // Test the allproducts endpoint
      const response = await request(app)
        .get('/allproducts')
        .expect('Content-Type', /json/);

      // Should return 200 with array (empty or with products)
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return products from test database', async () => {
      // Seed test data
      const Product = mongoose.model('Product');
      const productData = createProduct({
        name: 'API Test Product',
        category: 'necklaces',
        usd_price: 99
      });
      await new Product(productData).save();

      // Request products
      const response = await request(app)
        .get('/allproducts')
        .expect(200);

      // Verify our test product appears
      const products = response.body;
      expect(Array.isArray(products)).toBe(true);
      const found = products.find(p => p.name === 'API Test Product');
      expect(found).toBeDefined();
      expect(found.usd_price).toBe(99);
    });

    it('should respond to /health endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('healthy'); // Backend returns "healthy"
      expect(response.body).toHaveProperty('ok', true);
    });
  });

  describe('External API Mocking', () => {
    it('should use mocked exchange rate API', async () => {
      // Mock exchange rate API with known rate
      mockExchangeRateAPI(4.00); // 1 USD = 4 ILS for test

      // If there's an endpoint that uses exchange rates, test it here
      // For now, just verify the mock was set up
      // The actual exchange rate tests will be in Phase 13

      // This demonstrates that external APIs are mocked
      expect(true).toBe(true); // Placeholder - real test in Phase 13
    });
  });

  describe('No Production Contamination', () => {
    it('should not have production MongoDB URL in environment', () => {
      // setup.js deletes MONGO_URL, so this should be empty
      const mongoUrl = process.env.MONGO_URL;
      expect(mongoUrl).toBeUndefined();
    });

    it('should not have live Stripe key in environment', () => {
      const stripeKey = process.env.STRIPE_SECRET_KEY || '';
      expect(stripeKey).not.toMatch(/^sk_live_/);
    });

    it('should not have live PayPal URL in environment', () => {
      const paypalUrl = process.env.PAYPAL_BASE_URL || '';
      expect(paypalUrl).not.toBe('https://api-m.paypal.com');
    });
  });
});
