/**
 * Unit tests for exchangeRateService.js
 *
 * Tests all 5 exported functions:
 * - fetchCurrentRate: API fetching with primary/fallback and validation
 * - getStoredRate: Database retrieval
 * - updateRate: Database storage with validation
 * - getExchangeRate: Full fallback chain (API -> DB -> env -> default)
 * - isRateStale: TTL validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import {
  mockExchangeRateAPI,
  mockExchangeRateFallback,
  mockExchangeRateError
} from '../../helpers/mocks/exchangeRate.js';

// Import the service (CommonJS module)
const exchangeRateService = require('../../../services/exchangeRateService');
const { Settings } = require('../../../models');

// Store original env var for restoration
let originalEnvRate;

beforeEach(() => {
  // Save original env variable
  originalEnvRate = process.env.USD_ILS_RATE;
});

afterEach(() => {
  // Restore original env variable
  if (originalEnvRate !== undefined) {
    process.env.USD_ILS_RATE = originalEnvRate;
  } else {
    delete process.env.USD_ILS_RATE;
  }
});

describe('DEFAULT_EXCHANGE_RATE constant', () => {
  it('should equal 3.3', () => {
    expect(exchangeRateService.DEFAULT_EXCHANGE_RATE).toBe(3.3);
  });
});

describe('fetchCurrentRate()', () => {
  it('should return rate from primary API (exchangerate-api.com)', async () => {
    mockExchangeRateAPI(3.75);

    const result = await exchangeRateService.fetchCurrentRate();

    expect(result).toEqual({
      rate: 3.75,
      source: 'exchangerate-api.com'
    });
  });

  it('should fallback to secondary API when primary fails', async () => {
    // Mock primary to fail
    nock('https://api.exchangerate-api.com')
      .get('/v4/latest/USD')
      .reply(500, { error: 'Service unavailable' });

    // Mock fallback to succeed with result format (this is how the service identifies exchangerate.host)
    nock('https://api.exchangerate.host')
      .get('/latest')
      .query({ base: 'USD', symbols: 'ILS' })
      .reply(200, {
        result: 3.70
      });

    const result = await exchangeRateService.fetchCurrentRate();

    expect(result.rate).toBe(3.70);
    expect(result.source).toBe('exchangerate.host');
  });

  it('should handle result response format from fallback API', async () => {
    // Mock primary to fail
    nock('https://api.exchangerate-api.com')
      .get('/v4/latest/USD')
      .reply(500, { error: 'Service unavailable' });

    // Mock fallback with "result" format instead of "rates"
    nock('https://api.exchangerate.host')
      .get('/latest')
      .query({ base: 'USD', symbols: 'ILS' })
      .reply(200, {
        result: 3.65
      });

    const result = await exchangeRateService.fetchCurrentRate();

    expect(result.rate).toBe(3.65);
    expect(result.source).toBe('exchangerate.host');
  });

  it('should reject negative rate', async () => {
    // Mock primary with negative rate
    nock('https://api.exchangerate-api.com')
      .get('/v4/latest/USD')
      .reply(200, {
        rates: { ILS: -3.75 }
      });

    // Mock fallback with negative rate too
    nock('https://api.exchangerate.host')
      .get('/latest')
      .query({ base: 'USD', symbols: 'ILS' })
      .reply(200, {
        rates: { ILS: -3.70 }
      });

    await expect(exchangeRateService.fetchCurrentRate()).rejects.toThrow('All exchange rate APIs failed');
  });

  it('should reject zero rate', async () => {
    // Mock primary with zero
    nock('https://api.exchangerate-api.com')
      .get('/v4/latest/USD')
      .reply(200, {
        rates: { ILS: 0 }
      });

    // Mock fallback with zero
    nock('https://api.exchangerate.host')
      .get('/latest')
      .query({ base: 'USD', symbols: 'ILS' })
      .reply(200, {
        rates: { ILS: 0 }
      });

    await expect(exchangeRateService.fetchCurrentRate()).rejects.toThrow('All exchange rate APIs failed');
  });

  it('should reject missing ILS in response', async () => {
    // Mock primary with no ILS
    nock('https://api.exchangerate-api.com')
      .get('/v4/latest/USD')
      .reply(200, {
        rates: { EUR: 0.92, GBP: 0.79 }
      });

    // Mock fallback with no ILS
    nock('https://api.exchangerate.host')
      .get('/latest')
      .query({ base: 'USD', symbols: 'ILS' })
      .reply(200, {
        rates: { EUR: 0.92 }
      });

    await expect(exchangeRateService.fetchCurrentRate()).rejects.toThrow('All exchange rate APIs failed');
  });

  it('should reject malformed response (200 OK but invalid structure)', async () => {
    // Mock primary with invalid structure
    nock('https://api.exchangerate-api.com')
      .get('/v4/latest/USD')
      .reply(200, {
        foo: 'bar'
      });

    // Mock fallback with invalid structure
    nock('https://api.exchangerate.host')
      .get('/latest')
      .query({ base: 'USD', symbols: 'ILS' })
      .reply(200, {
        invalid: 'structure'
      });

    await expect(exchangeRateService.fetchCurrentRate()).rejects.toThrow('All exchange rate APIs failed');
  });

  it('should throw when all APIs fail with 500 errors', async () => {
    mockExchangeRateError();

    await expect(exchangeRateService.fetchCurrentRate()).rejects.toThrow('All exchange rate APIs failed');
  });
});

describe('getStoredRate()', () => {
  it('should return stored rate when Settings has usd_ils_rate', async () => {
    // Create settings with a rate
    const settings = await Settings.getSettings();
    settings.usd_ils_rate = 3.70;
    await settings.save();

    const rate = await exchangeRateService.getStoredRate();

    expect(rate).toBe(3.70);
  });

  it('should return null when Settings has no usd_ils_rate', async () => {
    // Fresh settings document (no rate set)
    await Settings.getSettings();

    const rate = await exchangeRateService.getStoredRate();

    expect(rate).toBeNull();
  });

  it('should return null when usd_ils_rate is 0 (falsy value)', async () => {
    const settings = await Settings.getSettings();
    settings.usd_ils_rate = 0;
    await settings.save();

    const rate = await exchangeRateService.getStoredRate();

    expect(rate).toBeNull();
  });
});

describe('updateRate()', () => {
  it('should store rate, source, and timestamp in Settings', async () => {
    const beforeUpdate = Date.now();

    await exchangeRateService.updateRate(3.80, 'test-source');

    const settings = await Settings.getSettings();
    expect(settings.usd_ils_rate).toBe(3.80);
    expect(settings.exchange_rate_source).toBe('test-source');
    expect(settings.exchange_rate_last_updated).toBeInstanceOf(Date);
    expect(settings.exchange_rate_last_updated.getTime()).toBeGreaterThanOrEqual(beforeUpdate);
    expect(settings.exchange_rate_last_updated.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should reject negative rate', async () => {
    await expect(exchangeRateService.updateRate(-1, 'test')).rejects.toThrow('Invalid rate value');
  });

  it('should reject zero rate', async () => {
    await expect(exchangeRateService.updateRate(0, 'test')).rejects.toThrow('Invalid rate value');
  });

  it('should reject NaN', async () => {
    await expect(exchangeRateService.updateRate(NaN, 'test')).rejects.toThrow('Invalid rate value');
  });

  it('should reject Infinity', async () => {
    await expect(exchangeRateService.updateRate(Infinity, 'test')).rejects.toThrow('Invalid rate value');
  });
});

describe('getExchangeRate()', () => {
  it('should return stored rate when DB has valid rate (no API call)', async () => {
    // Seed database with a rate
    await exchangeRateService.updateRate(3.70, 'seed');

    // No mocks needed - should NOT make HTTP request
    const rate = await exchangeRateService.getExchangeRate(false);

    expect(rate).toBe(3.70);

    // Verify no pending mocks (no HTTP requests were made)
    expect(nock.pendingMocks()).toHaveLength(0);
  });

  it('should fetch from API and update DB when forceRefresh=true', async () => {
    mockExchangeRateAPI(3.85);

    const rate = await exchangeRateService.getExchangeRate(true);

    expect(rate).toBe(3.85);

    // Verify it was stored in DB
    const settings = await Settings.getSettings();
    expect(settings.usd_ils_rate).toBe(3.85);
    expect(settings.exchange_rate_source).toBe('exchangerate-api.com');
  });

  it('should fallback to stored rate when forceRefresh=true but API fails', async () => {
    // Seed database with a rate
    await exchangeRateService.updateRate(3.70, 'seed');

    // Mock both APIs to fail
    mockExchangeRateError();

    const rate = await exchangeRateService.getExchangeRate(true);

    // Should return stored rate as fallback
    expect(rate).toBe(3.70);
  });

  it('should fallback to process.env.USD_ILS_RATE when DB has no rate', async () => {
    // Ensure no stored rate exists
    const settings = await Settings.getSettings();
    settings.usd_ils_rate = null;
    await settings.save();

    // Set env variable
    process.env.USD_ILS_RATE = '3.50';

    const rate = await exchangeRateService.getExchangeRate(false);

    expect(rate).toBe(3.50);
  });

  it('should fallback to DEFAULT_EXCHANGE_RATE (3.3) when DB and env both missing', async () => {
    // Ensure no stored rate
    const settings = await Settings.getSettings();
    settings.usd_ils_rate = null;
    await settings.save();

    // Ensure no env variable
    delete process.env.USD_ILS_RATE;

    const rate = await exchangeRateService.getExchangeRate(false);

    expect(rate).toBe(3.3);
  });

  it('should store env variable rate in DB for future use', async () => {
    // No stored rate
    const settings = await Settings.getSettings();
    settings.usd_ils_rate = null;
    await settings.save();

    // Set env variable
    process.env.USD_ILS_RATE = '3.50';

    await exchangeRateService.getExchangeRate(false);

    // Verify it was stored
    const updatedSettings = await Settings.getSettings();
    expect(updatedSettings.usd_ils_rate).toBe(3.50);
    expect(updatedSettings.exchange_rate_source).toBe('environment_variable');
  });

  it('should handle very large rate without overflow', async () => {
    mockExchangeRateAPI(999999.99);

    const rate = await exchangeRateService.getExchangeRate(true);

    expect(rate).toBe(999999.99);
  });
});

describe('isRateStale()', () => {
  it('should return false when rate was updated within maxAgeHours', async () => {
    // Set a fresh rate
    await exchangeRateService.updateRate(3.70, 'test');

    const isStale = await exchangeRateService.isRateStale(24);

    expect(isStale).toBe(false);
  });

  it('should return true when rate is older than maxAgeHours', async () => {
    // Create settings with old timestamp
    const settings = await Settings.getSettings();
    settings.usd_ils_rate = 3.70;
    // 25 hours ago
    settings.exchange_rate_last_updated = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await settings.save();

    const isStale = await exchangeRateService.isRateStale(24);

    expect(isStale).toBe(true);
  });

  it('should return true when no rate exists (fresh Settings)', async () => {
    // Fresh settings with no rate
    await Settings.getSettings();

    const isStale = await exchangeRateService.isRateStale();

    expect(isStale).toBe(true);
  });

  it('should return true when no timestamp exists', async () => {
    // Rate exists but no timestamp
    const settings = await Settings.getSettings();
    settings.usd_ils_rate = 3.70;
    settings.exchange_rate_last_updated = null;
    await settings.save();

    const isStale = await exchangeRateService.isRateStale();

    expect(isStale).toBe(true);
  });

  it('should respect custom maxAgeHours parameter', async () => {
    const settings = await Settings.getSettings();
    settings.usd_ils_rate = 3.70;
    // 2 hours ago
    settings.exchange_rate_last_updated = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await settings.save();

    // With 1-hour max, should be stale
    const staleWith1Hour = await exchangeRateService.isRateStale(1);
    expect(staleWith1Hour).toBe(true);

    // With 3-hour max, should be fresh
    const freshWith3Hours = await exchangeRateService.isRateStale(3);
    expect(freshWith3Hours).toBe(false);
  });
});
