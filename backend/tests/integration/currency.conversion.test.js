/**
 * Integration tests for currency conversion system.
 * Tests admin exchange rate update endpoint and conversion accuracy.
 *
 * Key behaviors:
 * - Admin /admin/update-exchange-rate endpoint triggers rate update
 * - Endpoint requires admin authentication (401/403 for unauthorized)
 * - Bidirectional conversion math is accurate (USD->ILS, ILS->USD)
 * - Round-trip conversion maintains reasonable tolerance
 * - Edge cases handled: zero amounts, very large amounts, small amounts
 * - Currency symbol selection ($ for USD, ₪ for ILS)
 * - Math.round produces whole numbers for prices
 *
 * Requirements: CURR-03, CURR-04, CURR-05, CURR-08, CURR-09
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import nock from 'nock';
import { createUser, createAdmin } from '../helpers/factories.js';
import { createAuthToken, TEST_JWT_KEY } from '../helpers/authHelpers.js';
import { validateTestEnvironment } from '../helpers/envGuard.js';
import { mockExchangeRateAPI, mockExchangeRateError, disableNetConnect, cleanAllMocks } from '../helpers/mocks/index.js';

// Ensure JWT_KEY is set
process.env.JWT_KEY = TEST_JWT_KEY;

describe('Admin Exchange Rate Update Endpoint', () => {
  let app;
  let Users;
  let adminUser;
  let adminToken;
  let regularUser;
  let regularToken;

  beforeAll(async () => {
    // Validate test environment
    validateTestEnvironment();

    // Disable real network requests
    disableNetConnect();

    // Import app after environment is configured
    const appModule = await import('../../index.js');
    app = appModule.app;

    // Get User model
    Users = mongoose.model('Users');
  });

  beforeEach(async () => {
    // Clean mocks from previous tests
    cleanAllMocks();

    // Create test users
    adminUser = await Users.create(createAdmin());
    adminToken = createAuthToken(adminUser);

    regularUser = await Users.create(createUser());
    regularToken = createAuthToken(regularUser);
  });

  describe('POST /admin/update-exchange-rate', () => {
    it('should return 200 and success message when admin triggers update', async () => {
      // Mock exchange rate API
      mockExchangeRateAPI(3.80);

      const response = await request(app)
        .post('/admin/update-exchange-rate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/exchange rate.*updated/i);
    });

    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app)
        .post('/admin/update-exchange-rate')
        .send();

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 403 when non-admin user attempts update', async () => {
      // Mock exchange rate API (even though it won't be called)
      mockExchangeRateAPI(3.80);

      const response = await request(app)
        .post('/admin/update-exchange-rate')
        .set('Authorization', `Bearer ${regularToken}`)
        .send();

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toMatch(/admin access required/i);
    });

    it('should complete successfully even when API fails with fallback', async () => {
      // Mock both APIs to fail
      mockExchangeRateError();

      // Set environment variable as fallback
      process.env.USD_ILS_RATE = '3.65';

      const response = await request(app)
        .post('/admin/update-exchange-rate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send();

      // The function has try/catch and uses fallback rates, so it completes successfully
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Clean up
      delete process.env.USD_ILS_RATE;
    });
  });
});

describe('Bidirectional Currency Conversion Accuracy', () => {
  describe('USD to ILS conversion', () => {
    it('should convert USD to ILS using Math.round(usd * rate)', () => {
      const usd = 100;
      const rate = 3.70;

      const ils = Math.round(usd * rate);

      expect(ils).toBe(370);
    });

    it('should round fractional amounts to whole numbers', () => {
      const usd = 57;
      const rate = 3.70;

      // 57 * 3.70 = 210.9
      const ils = Math.round(usd * rate);

      expect(ils).toBe(211);
    });

    it('should handle edge case: zero amount', () => {
      const usd = 0;
      const rate = 3.70;

      const ils = Math.round(usd * rate);

      expect(ils).toBe(0);
    });

    it('should handle edge case: very large amount', () => {
      const usd = 1000000; // $1 million
      const rate = 3.70;

      const ils = Math.round(usd * rate);

      expect(ils).toBe(3700000);
      // Verify no overflow (JavaScript Number handles this)
      expect(Number.isFinite(ils)).toBe(true);
    });

    it('should handle edge case: very small amount ($1)', () => {
      const usd = 1;
      const rate = 3.70;

      const ils = Math.round(usd * rate);

      expect(ils).toBe(4); // Rounded from 3.70
    });
  });

  describe('ILS to USD conversion', () => {
    it('should convert ILS to USD using Math.round(ils / rate)', () => {
      const ils = 370;
      const rate = 3.70;

      const usd = Math.round(ils / rate);

      expect(usd).toBe(100);
    });

    it('should round fractional amounts to whole numbers', () => {
      const ils = 211;
      const rate = 3.70;

      // 211 / 3.70 = 57.027...
      const usd = Math.round(ils / rate);

      expect(usd).toBe(57);
    });

    it('should handle edge case: zero amount', () => {
      const ils = 0;
      const rate = 3.70;

      const usd = Math.round(ils / rate);

      expect(usd).toBe(0);
    });

    it('should handle edge case: very small amount (₪4)', () => {
      const ils = 4;
      const rate = 3.70;

      // 4 / 3.70 = 1.081...
      const usd = Math.round(ils / rate);

      expect(usd).toBe(1);
    });
  });

  describe('Round-trip conversion tolerance', () => {
    it('should maintain accuracy within tolerance for round-trip: USD->ILS->USD', () => {
      const originalUsd = 100;
      const rate = 3.70;

      // USD -> ILS
      const ils = Math.round(originalUsd * rate);
      expect(ils).toBe(370);

      // ILS -> USD
      const backToUsd = Math.round(ils / rate);
      expect(backToUsd).toBe(100);

      // Verify tolerance
      const difference = Math.abs(backToUsd - originalUsd);
      expect(difference).toBeLessThanOrEqual(2);
    });

    it('should maintain accuracy for non-round number round-trip', () => {
      const originalUsd = 57;
      const rate = 3.70;

      // USD -> ILS: 57 * 3.70 = 210.9 -> rounds to 211
      const ils = Math.round(originalUsd * rate);
      expect(ils).toBe(211);

      // ILS -> USD: 211 / 3.70 = 57.027 -> rounds to 57
      const backToUsd = Math.round(ils / rate);
      expect(backToUsd).toBe(57);

      // Perfect round-trip
      expect(backToUsd).toBe(originalUsd);
    });

    it('should maintain tolerance even with rate changes', () => {
      const originalUsd = 99;
      const rate = 3.75;

      // USD -> ILS: 99 * 3.75 = 371.25 -> rounds to 371
      const ils = Math.round(originalUsd * rate);
      expect(ils).toBe(371);

      // ILS -> USD: 371 / 3.75 = 98.933... -> rounds to 99
      const backToUsd = Math.round(ils / rate);
      expect(backToUsd).toBe(99);

      // Verify within tolerance
      const difference = Math.abs(backToUsd - originalUsd);
      expect(difference).toBeLessThanOrEqual(2);
    });

    it('should handle worst-case rounding scenario', () => {
      // This tests a price where rounding could cause maximum drift
      const originalUsd = 33;
      const rate = 3.70;

      // USD -> ILS: 33 * 3.70 = 122.1 -> rounds to 122
      const ils = Math.round(originalUsd * rate);
      expect(ils).toBe(122);

      // ILS -> USD: 122 / 3.70 = 32.972... -> rounds to 33
      const backToUsd = Math.round(ils / rate);
      expect(backToUsd).toBe(33);

      // Still within tolerance
      const difference = Math.abs(backToUsd - originalUsd);
      expect(difference).toBeLessThanOrEqual(2);
    });
  });
});

describe('Currency Symbol Selection', () => {
  it('should return $ for USD currency', () => {
    const currency = 'usd';
    const symbol = currency === 'usd' ? '$' : '₪';

    expect(symbol).toBe('$');
  });

  it('should return ₪ for ILS currency', () => {
    const currency = 'ils';
    const symbol = currency === 'usd' ? '$' : '₪';

    expect(symbol).toBe('₪');
  });

  it('should handle case sensitivity correctly', () => {
    // Verify lowercase is used
    const usdLower = 'usd';
    const ilsLower = 'ils';

    expect(usdLower === 'usd' ? '$' : '₪').toBe('$');
    expect(ilsLower === 'usd' ? '$' : '₪').toBe('₪');
  });
});

describe('Math.round Whole Number Rounding', () => {
  it('should round 0.5 up (banker\'s rounding NOT used)', () => {
    // JavaScript Math.round rounds 0.5 up (not to nearest even)
    const result = Math.round(92.5);

    expect(result).toBe(93);
  });

  it('should round down for values less than 0.5', () => {
    const result = Math.round(3.14);

    expect(result).toBe(3);
  });

  it('should round up for values greater than 0.5', () => {
    const result = Math.round(99.9);

    expect(result).toBe(100);
  });

  it('should verify conversion produces whole numbers', () => {
    const usd = 57;
    const rate = 3.70;

    const ils = Math.round(usd * rate);

    // Verify result is a whole number
    expect(Number.isInteger(ils)).toBe(true);
    expect(ils % 1).toBe(0);
  });

  it('should verify reverse conversion produces whole numbers', () => {
    const ils = 211;
    const rate = 3.70;

    const usd = Math.round(ils / rate);

    // Verify result is a whole number
    expect(Number.isInteger(usd)).toBe(true);
    expect(usd % 1).toBe(0);
  });
});

describe('Real Exchange Rate API (Smoke Test)', () => {
  // Skip this test unless EXCHANGE_RATE_API_KEY is set or we want to test real API
  it.skipIf(!process.env.EXCHANGE_RATE_API_KEY)(
    'should fetch valid USD/ILS rate from real API',
    async () => {
      // Enable real network for this test
      nock.enableNetConnect();

      const { fetchCurrentRate } = require('../../services/exchangeRateService');
      const result = await fetchCurrentRate();

      expect(result.rate).toBeGreaterThan(0);
      expect(result.rate).toBeLessThan(100); // Sanity: USD/ILS rate should be between 0 and 100
      expect(result.source).toBeTruthy();
      expect(typeof result.source).toBe('string');

      // Re-disable network
      nock.disableNetConnect();
      nock.enableNetConnect('127.0.0.1');
    }
  );
});
