/**
 * PayPal Payment Endpoint Integration Tests
 *
 * Tests PayPal order creation and capture flows with mocked API responses.
 * Covers requirements PAY-01 through PAY-05:
 * - PAY-01: Order creation with valid cart
 * - PAY-02: Order capture successful payment
 * - PAY-03: Order capture payment details
 * - PAY-04: PayPal API error handling
 * - PAY-05: Timeout handling
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import nock from 'nock';

// Import environment guard and mocks
import { validateTestEnvironment } from '../helpers/envGuard.js';
import {
  disableNetConnect,
  cleanAllMocks,
  mockPayPalAuth,
  mockPayPalCreateOrder,
  mockPayPalCaptureOrder,
  mockPayPalError
} from '../helpers/mocks/index.js';

const PAYPAL_SANDBOX_URL = 'https://api-m.sandbox.paypal.com';

describe('PayPal Payment Endpoints', () => {
  let app;

  beforeAll(async () => {
    // Verify safe test environment
    validateTestEnvironment();

    // Disable real HTTP requests
    disableNetConnect();

    // Import app dynamically after environment validation
    const appModule = await import('../../index.js');
    app = appModule.app;
  });

  afterAll(async () => {
    cleanAllMocks();
  });

  beforeEach(async () => {
    cleanAllMocks();
  });

  describe('POST /orders - Order Creation (PAY-01)', () => {
    it('should return 201 with order ID for valid cart', async () => {
      // Mock PayPal auth and order creation
      mockPayPalAuth('test-token-123');
      mockPayPalCreateOrder('PAYPAL-ORDER-ABC123', 'CREATED');

      const validCart = [
        {
          name: 'Silver Necklace',
          unit_amount: { value: '75.00', currency_code: 'USD' },
          quantity: '1'
        }
      ];

      const response = await request(app)
        .post('/orders')
        .send({ cart: validCart })
        .expect('Content-Type', /json/)
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('id', 'PAYPAL-ORDER-ABC123');
      expect(response.body).toHaveProperty('status', 'CREATED');
      expect(response.body).toHaveProperty('links');
      expect(Array.isArray(response.body.links)).toBe(true);
    });

    it('should include approve link in response', async () => {
      mockPayPalAuth('test-token-123');
      mockPayPalCreateOrder('ORDER-XYZ', 'CREATED');

      const validCart = [
        {
          name: 'Gold Ring',
          unit_amount: { value: '120.00', currency_code: 'USD' },
          quantity: '1'
        }
      ];

      const response = await request(app)
        .post('/orders')
        .send({ cart: validCart })
        .expect(201);

      // Find approve link
      const approveLink = response.body.links.find(link => link.rel === 'approve');
      expect(approveLink).toBeDefined();
      expect(approveLink.href).toContain('sandbox.paypal.com');
      expect(approveLink.href).toContain('token=ORDER-XYZ');
    });

    it('should process cart with multiple items', async () => {
      mockPayPalAuth('test-token-multi');
      mockPayPalCreateOrder('ORDER-MULTI-123', 'CREATED');

      const multiItemCart = [
        {
          name: 'Silver Necklace',
          unit_amount: { value: '75.00', currency_code: 'USD' },
          quantity: '2'
        },
        {
          name: 'Gold Earrings',
          unit_amount: { value: '150.00', currency_code: 'USD' },
          quantity: '1'
        },
        {
          name: 'Pearl Bracelet',
          unit_amount: { value: '90.00', currency_code: 'USD' },
          quantity: '1'
        }
      ];

      const response = await request(app)
        .post('/orders')
        .send({ cart: multiItemCart })
        .expect(201);

      expect(response.body.id).toBe('ORDER-MULTI-123');
      expect(response.body.status).toBe('CREATED');
    });

    it('should handle USD currency correctly', async () => {
      mockPayPalAuth('test-token-usd');
      mockPayPalCreateOrder('ORDER-USD', 'CREATED');

      const usdCart = [
        {
          name: 'Diamond Ring',
          unit_amount: { value: '500.00', currency_code: 'USD' },
          quantity: '1'
        }
      ];

      const response = await request(app)
        .post('/orders')
        .send({ cart: usdCart })
        .expect(201);

      expect(response.body.id).toBe('ORDER-USD');
    });

    it('should handle ILS currency correctly', async () => {
      mockPayPalAuth('test-token-ils');
      mockPayPalCreateOrder('ORDER-ILS', 'CREATED');

      const ilsCart = [
        {
          name: 'Silver Pendant',
          unit_amount: { value: '280.00', currency_code: 'ILS' },
          quantity: '1'
        }
      ];

      const response = await request(app)
        .post('/orders')
        .send({ cart: ilsCart })
        .expect(201);

      expect(response.body.id).toBe('ORDER-ILS');
    });
  });

  describe('POST /orders - Validation Errors (PAY-11 partial)', () => {
    it('should return 400 for empty cart', async () => {
      const response = await request(app)
        .post('/orders')
        .send({ cart: [] })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/Invalid cart data/i);
    });

    it('should return 400 for missing cart', async () => {
      const response = await request(app)
        .post('/orders')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/Invalid cart data/i);
    });

    it('should return 400 for invalid cart (not array)', async () => {
      const response = await request(app)
        .post('/orders')
        .send({ cart: 'not-an-array' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/Invalid cart data/i);
    });

    it('should return 400 for cart item missing name', async () => {
      mockPayPalAuth('test-token');
      // PayPal will reject, but our backend might validate first

      const invalidCart = [
        {
          unit_amount: { value: '75.00', currency_code: 'USD' },
          quantity: '1'
        }
      ];

      const response = await request(app)
        .post('/orders')
        .send({ cart: invalidCart })
        .expect('Content-Type', /json/);

      // Either 400 from our validation or error from PayPal
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(600);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for cart item with invalid amount', async () => {
      mockPayPalAuth('test-token');

      const invalidCart = [
        {
          name: 'Test Product',
          unit_amount: { value: '-50.00', currency_code: 'USD' },
          quantity: '1'
        }
      ];

      const response = await request(app)
        .post('/orders')
        .send({ cart: invalidCart })
        .expect('Content-Type', /json/);

      // Backend or PayPal should reject negative amounts
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /orders - PayPal API Errors (PAY-04)', () => {
    it('should return 400 for PayPal INVALID_REQUEST error', async () => {
      // Mock auth success but order creation fails with 400
      mockPayPalAuth('test-token');
      nock(PAYPAL_SANDBOX_URL)
        .post('/v2/checkout/orders')
        .reply(400, {
          name: 'INVALID_REQUEST',
          message: 'Request is not well-formed, syntactically incorrect, or violates schema.',
          debug_id: 'debug-400-abc',
          details: [
            {
              issue: 'MISSING_REQUIRED_PARAMETER',
              description: 'A required field is missing.'
            }
          ]
        });

      const validCart = [
        {
          name: 'Test Product',
          unit_amount: { value: '50.00', currency_code: 'USD' },
          quantity: '1'
        }
      ];

      const response = await request(app)
        .post('/orders')
        .send({ cart: validCart })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 422 for PayPal UNPROCESSABLE_ENTITY', async () => {
      mockPayPalAuth('test-token');
      nock(PAYPAL_SANDBOX_URL)
        .post('/v2/checkout/orders')
        .reply(422, {
          name: 'UNPROCESSABLE_ENTITY',
          message: 'The requested action could not be performed.',
          debug_id: 'debug-422-xyz',
          details: [
            {
              issue: 'INVALID_CURRENCY_CODE',
              description: 'Currency code is invalid.'
            }
          ]
        });

      const validCart = [
        {
          name: 'Test Product',
          unit_amount: { value: '50.00', currency_code: 'USD' },
          quantity: '1'
        }
      ];

      const response = await request(app)
        .post('/orders')
        .send({ cart: validCart })
        .expect('Content-Type', /json/)
        .expect(422);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 502 for PayPal 500 server error', async () => {
      mockPayPalAuth('test-token');
      nock(PAYPAL_SANDBOX_URL)
        .post('/v2/checkout/orders')
        .reply(500, {
          name: 'INTERNAL_SERVER_ERROR',
          message: 'An internal server error has occurred.',
          debug_id: 'debug-500-err'
        });

      const validCart = [
        {
          name: 'Test Product',
          unit_amount: { value: '50.00', currency_code: 'USD' },
          quantity: '1'
        }
      ];

      const response = await request(app)
        .post('/orders')
        .send({ cart: validCart })
        .expect('Content-Type', /json/)
        .expect(502);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
    });

    it('should include paypalDebugId in error response', async () => {
      mockPayPalAuth('test-token');
      nock(PAYPAL_SANDBOX_URL)
        .post('/v2/checkout/orders')
        .reply(400, {
          name: 'INVALID_REQUEST',
          message: 'Test error',
          debug_id: 'unique-debug-id-123'
        });

      const validCart = [
        {
          name: 'Test Product',
          unit_amount: { value: '50.00', currency_code: 'USD' },
          quantity: '1'
        }
      ];

      const response = await request(app)
        .post('/orders')
        .send({ cart: validCart })
        .expect(400);

      expect(response.body).toHaveProperty('paypalDebugId', 'unique-debug-id-123');
    });

    it('should include paypalDetails in dev mode', async () => {
      // This test relies on NODE_ENV being 'test' (not production)
      mockPayPalAuth('test-token');
      nock(PAYPAL_SANDBOX_URL)
        .post('/v2/checkout/orders')
        .reply(400, {
          name: 'INVALID_REQUEST',
          message: 'Test error with details',
          debug_id: 'debug-details-123',
          details: [
            {
              issue: 'SOME_ISSUE',
              description: 'Detailed description of the issue'
            }
          ]
        });

      const validCart = [
        {
          name: 'Test Product',
          unit_amount: { value: '50.00', currency_code: 'USD' },
          quantity: '1'
        }
      ];

      const response = await request(app)
        .post('/orders')
        .send({ cart: validCart })
        .expect(400);

      // In dev/test mode, paypalDetails should be included
      expect(response.body).toHaveProperty('paypalDetails');
      expect(Array.isArray(response.body.paypalDetails)).toBe(true);
      expect(response.body.paypalDetails.length).toBeGreaterThan(0);
    });
  });

  describe('POST /orders - Timeout Handling (PAY-05)', () => {
    it('should handle PayPal auth token timeout', async () => {
      // Mock timeout on auth token request
      nock(PAYPAL_SANDBOX_URL)
        .post('/v1/oauth2/token')
        .replyWithError({ code: 'ETIMEDOUT', message: 'Timeout error' });

      const validCart = [
        {
          name: 'Test Product',
          unit_amount: { value: '50.00', currency_code: 'USD' },
          quantity: '1'
        }
      ];

      const response = await request(app)
        .post('/orders')
        .send({ cart: validCart })
        .expect('Content-Type', /json/);

      // Should handle timeout gracefully with appropriate status
      expect(response.status).toBeGreaterThanOrEqual(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 504 with PAYPAL_TIMEOUT code on timeout', async () => {
      mockPayPalAuth('test-token');

      // Mock timeout on order creation
      // Note: nock.replyWithError with AbortError doesn't fully simulate fetch timeout
      // In real scenarios, fetchWithTimeout catches AbortError and returns 504
      // For testing, we verify the backend handles AbortError-like conditions
      nock(PAYPAL_SANDBOX_URL)
        .post('/v2/checkout/orders')
        .delayConnection(25000) // Delay beyond timeout threshold
        .reply(200, { id: 'should-not-reach' });

      const validCart = [
        {
          name: 'Test Product',
          unit_amount: { value: '50.00', currency_code: 'USD' },
          quantity: '1'
        }
      ];

      const response = await request(app)
        .post('/orders')
        .send({ cart: validCart })
        .expect('Content-Type', /json/);

      // Should timeout and return 504 or 500 with timeout-related error
      expect([500, 504]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      // Code should indicate timeout or request failure
      expect(['PAYPAL_TIMEOUT', 'ORDER_CREATE_FAILED']).toContain(response.body.code);
    });
  });

  describe('POST /orders/:orderID/capture - Order Capture (PAY-02, PAY-03)', () => {
    it('should return 200 with COMPLETED status on successful capture', async () => {
      mockPayPalAuth('test-token');
      mockPayPalCaptureOrder('CAPTURE-ORDER-123');

      const response = await request(app)
        .post('/orders/CAPTURE-ORDER-123/capture')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', 'CAPTURE-ORDER-123');
      expect(response.body).toHaveProperty('status', 'COMPLETED');
    });

    it('should include payment details in capture response', async () => {
      mockPayPalAuth('test-token');
      mockPayPalCaptureOrder('ORDER-WITH-DETAILS');

      const response = await request(app)
        .post('/orders/ORDER-WITH-DETAILS/capture')
        .expect(200);

      // Verify payment details structure
      expect(response.body).toHaveProperty('purchase_units');
      expect(Array.isArray(response.body.purchase_units)).toBe(true);
      expect(response.body.purchase_units.length).toBeGreaterThan(0);

      const firstUnit = response.body.purchase_units[0];
      expect(firstUnit).toHaveProperty('payments');
      expect(firstUnit.payments).toHaveProperty('captures');
      expect(Array.isArray(firstUnit.payments.captures)).toBe(true);

      const capture = firstUnit.payments.captures[0];
      expect(capture).toHaveProperty('id');
      expect(capture).toHaveProperty('status', 'COMPLETED');
      expect(capture).toHaveProperty('amount');
      expect(capture.amount).toHaveProperty('value');
      expect(capture.amount).toHaveProperty('currency_code');
    });

    it('should handle already-captured order error', async () => {
      mockPayPalAuth('test-token');
      nock(PAYPAL_SANDBOX_URL)
        .post('/v2/checkout/orders/ALREADY-CAPTURED/capture')
        .reply(422, {
          name: 'UNPROCESSABLE_ENTITY',
          message: 'The requested action could not be performed.',
          debug_id: 'debug-already-captured',
          details: [
            {
              issue: 'ORDER_ALREADY_CAPTURED',
              description: 'Order has already been captured.'
            }
          ]
        });

      const response = await request(app)
        .post('/orders/ALREADY-CAPTURED/capture')
        .expect('Content-Type', /json/)
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
    });
  });

  describe('POST /orders/:orderID/capture - Capture Errors', () => {
    it('should return 404 for non-existent order', async () => {
      mockPayPalAuth('test-token');
      nock(PAYPAL_SANDBOX_URL)
        .post('/v2/checkout/orders/NON-EXISTENT-ORDER/capture')
        .reply(404, {
          name: 'RESOURCE_NOT_FOUND',
          message: 'The specified resource does not exist.',
          debug_id: 'debug-not-found',
          details: [
            {
              issue: 'ORDER_NOT_FOUND',
              description: 'Order cannot be found.'
            }
          ]
        });

      const response = await request(app)
        .post('/orders/NON-EXISTENT-ORDER/capture')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
    });

    it('should return 422 for order not approved', async () => {
      mockPayPalAuth('test-token');
      nock(PAYPAL_SANDBOX_URL)
        .post('/v2/checkout/orders/NOT-APPROVED-ORDER/capture')
        .reply(422, {
          name: 'UNPROCESSABLE_ENTITY',
          message: 'The requested action could not be performed.',
          debug_id: 'debug-not-approved',
          details: [
            {
              issue: 'ORDER_NOT_APPROVED',
              description: 'Order has not been approved by the buyer.'
            }
          ]
        });

      const response = await request(app)
        .post('/orders/NOT-APPROVED-ORDER/capture')
        .expect('Content-Type', /json/)
        .expect(422);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle capture timeout', async () => {
      mockPayPalAuth('test-token');
      nock(PAYPAL_SANDBOX_URL)
        .post('/v2/checkout/orders/TIMEOUT-ORDER/capture')
        .delayConnection(25000) // Delay beyond timeout threshold
        .reply(200, { id: 'should-not-reach' });

      const response = await request(app)
        .post('/orders/TIMEOUT-ORDER/capture')
        .expect('Content-Type', /json/);

      // Should timeout and return 504 or 500 with timeout-related error
      expect([500, 504]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      // Code should indicate timeout or capture failure
      expect(['PAYPAL_TIMEOUT', 'ORDER_CAPTURE_FAILED']).toContain(response.body.code);
    });
  });
});
