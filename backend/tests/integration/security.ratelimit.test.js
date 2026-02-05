/**
 * Rate Limiting Middleware Integration Tests
 *
 * Tests rate limiting protection on critical endpoints:
 * - Auth endpoints: /login, /signup (SEC-04, SEC-06, SEC-07)
 * - Payment endpoints: /orders (SEC-05)
 * - Rate limit headers: draft-7 standard compliance
 *
 * Threat Model:
 * - SEC-04: Credential stuffing attacks on /login and /signup
 * - SEC-05: Payment fraud attempts on /orders
 * - SEC-06: Requests within limits allowed through
 * - SEC-07: Requests exceeding limits receive 429 Too Many Requests
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

// Import factories and fixtures
import { createUser } from '../helpers/factories.js';

// Import environment guard and mocks
import { validateTestEnvironment } from '../helpers/envGuard.js';
import {
  disableNetConnect,
  cleanAllMocks,
  mockExchangeRateAPI,
  mockPayPalAuth,
  mockPayPalOrderCreation
} from '../helpers/mocks/index.js';

describe('Rate Limiting - Auth Endpoints (/login)', () => {
  let app;
  let User;
  let ipCounter = 0;

  // Generate unique IP per test to isolate rate limit state
  const uniqueIP = () => `10.0.${Math.floor(ipCounter / 255)}.${++ipCounter % 255}`;

  beforeAll(async () => {
    // Verify safe test environment
    validateTestEnvironment();

    // Disable real HTTP requests
    disableNetConnect();

    // Set lower rate limit for faster testing
    process.env.RATE_LIMIT_AUTH_MAX = '5';

    // Import app dynamically after environment validation
    const appModule = await import('../../index.js');
    app = appModule.app;

    // Get User model
    User = mongoose.model('Users');
  });

  afterAll(async () => {
    cleanAllMocks();
    // Restore default rate limit
    delete process.env.RATE_LIMIT_AUTH_MAX;
  });

  beforeEach(async () => {
    cleanAllMocks();
  });

  /**
   * SEC-06: Requests within rate limit
   * Threat: N/A - validates legitimate traffic is not blocked
   * Protection: Rate limiter allows requests under threshold
   */
  describe('Requests Within Limit', () => {
    it('should allow requests within rate limit', async () => {
      const ip = uniqueIP();
      const limit = 5;

      // Send requests under the limit (3 out of 5)
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/login')
          .set('X-Forwarded-For', ip)
          .send({ email: 'test@example.com', password: 'wrong' });

        // Should NOT be rate limited
        expect(response.status).not.toBe(429);
      }
    });

    it('should allow exactly limit number of requests', async () => {
      const ip = uniqueIP();
      const limit = 5;

      // Send exactly the limit
      for (let i = 0; i < limit; i++) {
        const response = await request(app)
          .post('/login')
          .set('X-Forwarded-For', ip)
          .send({ email: 'test@example.com', password: 'wrong' });

        // All should succeed (not 429)
        expect(response.status).not.toBe(429);
      }
    });
  });

  /**
   * SEC-07: Requests exceeding rate limit
   * Threat: Brute force attacks attempting thousands of login attempts
   * Protection: 429 Too Many Requests after exceeding limit
   */
  describe('Requests Exceeding Limit', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const ip = uniqueIP();
      const limit = 5;

      // Exhaust the limit
      for (let i = 0; i < limit; i++) {
        await request(app)
          .post('/login')
          .set('X-Forwarded-For', ip)
          .send({ email: 'test@example.com', password: 'wrong' });
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'test@example.com', password: 'wrong' });

      expect(response.status).toBe(429);
    });

    it('should return proper error message on 429', async () => {
      const ip = uniqueIP();
      const limit = 5;

      // Exhaust limit
      for (let i = 0; i < limit; i++) {
        await request(app)
          .post('/login')
          .set('X-Forwarded-For', ip)
          .send({ email: 'test@example.com', password: 'wrong' });
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'test@example.com', password: 'wrong' });

      expect(response.status).toBe(429);
      expect(response.body).toEqual({
        success: false,
        error: 'Too many requests, please try again later.'
      });
    });
  });

  /**
   * SEC-04: Rate limit headers
   * Threat: N/A - provides rate limit transparency to clients
   * Protection: Clients can see when they can retry
   *
   * Note: express-rate-limit v7 with draft-7 standard configured in backend
   * Headers may not appear in test environment due to supertest limitations
   * Core functionality (429 blocking) verified above
   */
  describe('Retry-After Header', () => {
    it('should include Retry-After header on 429 response', async () => {
      const ip = uniqueIP();
      const limit = 5;

      // Exhaust limit
      for (let i = 0; i < limit; i++) {
        await request(app)
          .post('/login')
          .set('X-Forwarded-For', ip)
          .send({ email: 'test@example.com', password: 'wrong' });
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'test@example.com', password: 'wrong' });

      expect(response.status).toBe(429);
      expect(response.headers['retry-after']).toBeDefined();

      // Retry-After should be a positive number (seconds)
      const retryAfter = parseInt(response.headers['retry-after'], 10);
      expect(retryAfter).toBeGreaterThan(0);
    });
  });

  /**
   * SEC-04: Per-IP rate limiting isolation
   * Threat: Single IP attacks should not block other IPs
   * Protection: Each IP has independent rate limit counter
   */
  describe('IP Isolation', () => {
    it('should track rate limit per IP address', async () => {
      const ip1 = uniqueIP();
      const ip2 = uniqueIP();
      const limit = 5;

      // IP1 exhausts its limit
      for (let i = 0; i < limit; i++) {
        await request(app)
          .post('/login')
          .set('X-Forwarded-For', ip1)
          .send({ email: 'test@example.com', password: 'wrong' });
      }

      // IP1 should be blocked
      const response1 = await request(app)
        .post('/login')
        .set('X-Forwarded-For', ip1)
        .send({ email: 'test@example.com', password: 'wrong' });
      expect(response1.status).toBe(429);

      // IP2 should still be able to make requests
      const response2 = await request(app)
        .post('/login')
        .set('X-Forwarded-For', ip2)
        .send({ email: 'test@example.com', password: 'wrong' });
      expect(response2.status).not.toBe(429);
    });
  });

  /**
   * SEC-04: Rate limit counts invalid credentials
   * Threat: Attackers try invalid passwords - all attempts should count
   * Protection: Failed auth attempts count against rate limit
   */
  describe('Failed Auth Attempts Count', () => {
    it('should count invalid password attempts against rate limit', async () => {
      // Create user
      const userData = createUser({ email: 'ratelimit@example.com' });
      await new User(userData).save();

      const ip = uniqueIP();
      const limit = 5;

      // Try limit number of invalid passwords
      for (let i = 0; i < limit; i++) {
        const response = await request(app)
          .post('/login')
          .set('X-Forwarded-For', ip)
          .send({ email: 'ratelimit@example.com', password: 'WrongPassword' });

        // Should get 401 (wrong password), not 429
        expect(response.status).toBe(401);
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'ratelimit@example.com', password: 'WrongPassword' });

      expect(response.status).toBe(429);
    });

    it('should count non-existent email attempts against rate limit', async () => {
      const ip = uniqueIP();
      const limit = 5;

      // Try limit number of non-existent emails
      for (let i = 0; i < limit; i++) {
        const response = await request(app)
          .post('/login')
          .set('X-Forwarded-For', ip)
          .send({ email: `nonexistent${i}@example.com`, password: 'Password' });

        // Should get 404 (not found), not 429
        expect(response.status).toBe(404);
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'nonexistent@example.com', password: 'Password' });

      expect(response.status).toBe(429);
    });
  });
});

describe('Rate Limiting - Auth Endpoints (/signup)', () => {
  let app;
  let ipCounter = 1000; // Separate counter from login tests

  const uniqueIP = () => `10.1.${Math.floor(ipCounter / 255)}.${++ipCounter % 255}`;

  beforeAll(async () => {
    validateTestEnvironment();
    disableNetConnect();

    // Set lower rate limit for faster testing
    process.env.RATE_LIMIT_AUTH_MAX = '5';

    const appModule = await import('../../index.js');
    app = appModule.app;
  });

  afterAll(async () => {
    cleanAllMocks();
    delete process.env.RATE_LIMIT_AUTH_MAX;
  });

  beforeEach(async () => {
    cleanAllMocks();
  });

  /**
   * SEC-04: Signup endpoint rate limiting
   * Threat: Account creation abuse (spam, resource exhaustion)
   * Protection: Limit signup attempts per IP
   */
  describe('Signup Rate Limiting', () => {
    it('should enforce rate limit on signup endpoint', async () => {
      const ip = uniqueIP();
      const limit = 5;

      // Exhaust limit with signup attempts
      for (let i = 0; i < limit; i++) {
        await request(app)
          .post('/signup')
          .set('X-Forwarded-For', ip)
          .send({
            email: `user${i}@example.com`,
            password: 'Password123',
            name: 'Test User'
          });
      }

      // Next signup should be rate limited
      const response = await request(app)
        .post('/signup')
        .set('X-Forwarded-For', ip)
        .send({
          email: 'blocked@example.com',
          password: 'Password123',
          name: 'Blocked User'
        });

      expect(response.status).toBe(429);
    });

    it('should share rate limit between login and signup', async () => {
      const ip = uniqueIP();
      const limit = 5;

      // Make some login attempts (3 out of 5)
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/login')
          .set('X-Forwarded-For', ip)
          .send({ email: 'test@example.com', password: 'wrong' });
      }

      // Make some signup attempts (2 out of remaining 2)
      for (let i = 0; i < 2; i++) {
        await request(app)
          .post('/signup')
          .set('X-Forwarded-For', ip)
          .send({
            email: `user${i}@example.com`,
            password: 'Password123',
            name: 'Test User'
          });
      }

      // Next request (login or signup) should be rate limited
      const response = await request(app)
        .post('/signup')
        .set('X-Forwarded-For', ip)
        .send({
          email: 'blocked@example.com',
          password: 'Password123',
          name: 'Blocked User'
        });

      expect(response.status).toBe(429);
    });
  });
});

describe('Rate Limiting - Payment Endpoints (/orders)', () => {
  let app;
  let ipCounter = 2000; // Separate counter for payment tests

  const uniqueIP = () => `10.2.${Math.floor(ipCounter / 255)}.${++ipCounter % 255}`;

  beforeAll(async () => {
    validateTestEnvironment();
    disableNetConnect();

    // Set lower rate limit for faster testing
    process.env.RATE_LIMIT_PAYMENT_MAX = '5';

    const appModule = await import('../../index.js');
    app = appModule.app;
  });

  afterAll(async () => {
    cleanAllMocks();
    delete process.env.RATE_LIMIT_PAYMENT_MAX;
  });

  beforeEach(async () => {
    cleanAllMocks();
  });

  /**
   * SEC-05: Payment endpoint rate limiting
   * Threat: Payment fraud attempts (testing stolen cards, transaction abuse)
   * Protection: Limit payment attempts per IP to slow down automated attacks
   *
   * Note: Testing rate limiting only - not testing PayPal integration
   * Rate limiter runs before endpoint logic, so validation errors still count
   */
  describe('Payment Rate Limiting', () => {
    it('should allow requests within payment rate limit', async () => {
      const ip = uniqueIP();
      const limit = 5;

      // Send requests under the limit (3 out of 5)
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/orders')
          .set('X-Forwarded-For', ip)
          .send({}); // Empty body - will fail validation but rate limit still counts

        // Should NOT be rate limited (will get validation error instead)
        expect(response.status).not.toBe(429);
      }
    });

    it('should use separate rate limit from auth endpoints', async () => {
      const ip = uniqueIP();
      const authLimit = 5;

      // This test verifies that auth and payment endpoints have independent counters
      // Even if we set them to same value, they should track separately

      // Exhaust auth limit
      for (let i = 0; i < authLimit; i++) {
        await request(app)
          .post('/login')
          .set('X-Forwarded-For', ip)
          .send({ email: 'test@example.com', password: 'wrong' });
      }

      // Auth should be blocked
      const authResponse = await request(app)
        .post('/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'test@example.com', password: 'wrong' });
      expect(authResponse.status).toBe(429);

      // Payment endpoint should still work (separate limit)
      const paymentResponse = await request(app)
        .post('/orders')
        .set('X-Forwarded-For', ip)
        .send({});

      // Should NOT be rate limited (will get validation error instead)
      expect(paymentResponse.status).not.toBe(429);
    });
  });
});
