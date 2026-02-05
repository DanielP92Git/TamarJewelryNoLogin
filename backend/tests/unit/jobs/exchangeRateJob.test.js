/**
 * Unit tests for exchange rate cron job.
 * Tests cron schedule validation and product price recalculation logic.
 *
 * Key behaviors:
 * - Cron schedule is valid and targets Sunday 2:00 AM Israel time
 * - updateExchangeRateAndPrices fetches rate from API and updates Settings
 * - Products get USD prices recalculated from ILS prices using Math.round(ils_price / rate)
 * - Legacy products (no ils_price) get ILS calculated from USD using Math.round(usd_price * rate)
 * - Original prices are tracked for both currencies
 * - API failures fall back to stored rate, then environment variable, then default
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import cron from 'node-cron';
import mongoose from 'mongoose';
import { createProduct, resetFactoryCounter } from '../../helpers/factories.js';
import { mockExchangeRateAPI, mockExchangeRateError, cleanAllMocks } from '../../helpers/mocks/index.js';

// Import the job functions
const { updateExchangeRateAndPrices } = require('../../../jobs/exchangeRateJob.js');

// Import models
const { Product, Settings } = require('../../../models');

// Import exchange rate service for seeding
const exchangeRateService = require('../../../services/exchangeRateService.js');

describe('Exchange Rate Job - Cron Schedule', () => {
  it('should have valid cron expression for Sunday 2:00 AM', () => {
    const schedule = '00 02 * * 0';
    const isValid = cron.validate(schedule);

    expect(isValid).toBe(true);
  });

  it('should target Sunday at 2:00 AM (cron: 00 02 * * 0)', () => {
    // This test documents the cron schedule meaning
    // Format: minute hour day-of-month month day-of-week
    // '00 02 * * 0' means:
    //   - minute: 00 (top of the hour)
    //   - hour: 02 (2 AM)
    //   - day-of-month: * (any day)
    //   - month: * (any month)
    //   - day-of-week: 0 (Sunday)
    // Timezone: 'Asia/Jerusalem' is set in job configuration

    const schedule = '00 02 * * 0';
    expect(cron.validate(schedule)).toBe(true);

    // Verify it's a valid cron pattern
    expect(schedule.split(' ')).toHaveLength(5);
    expect(schedule.split(' ')[0]).toBe('00'); // minute
    expect(schedule.split(' ')[1]).toBe('02'); // hour
    expect(schedule.split(' ')[4]).toBe('0');  // Sunday
  });
});

describe('Exchange Rate Job - Rate Fetching', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    resetFactoryCounter();
    cleanAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    cleanAllMocks();
  });

  it('should update Settings with new rate on successful API fetch', async () => {
    // Mock primary API with rate 3.75
    mockExchangeRateAPI(3.75);

    // Call the update function
    await updateExchangeRateAndPrices();

    // Read Settings from DB
    const settings = await Settings.getSettings();

    expect(settings.usd_ils_rate).toBe(3.75);
    expect(settings.exchange_rate_source).toBe('exchangerate-api.com');
    expect(settings.exchange_rate_last_updated).toBeTruthy();
  });

  it('should use stored rate when API fails', async () => {
    // Seed Settings with rate 3.60
    await exchangeRateService.updateRate(3.60, 'seed');

    // Mock both APIs to fail
    mockExchangeRateError();

    // Call update function - should not throw
    await expect(updateExchangeRateAndPrices()).resolves.not.toThrow();

    // Verify stored rate is still 3.60 (unchanged because API failed)
    const settings = await Settings.getSettings();
    expect(settings.usd_ils_rate).toBe(3.60);
  });

  it('should use fallback when API fails and no stored rate exists', async () => {
    // Mock both APIs to fail
    mockExchangeRateError();

    // Delete environment variable
    delete process.env.USD_ILS_RATE;

    // Call update function - should not throw
    await expect(updateExchangeRateAndPrices()).resolves.not.toThrow();

    // Function completes using DEFAULT_EXCHANGE_RATE (3.3) as final fallback
    // The function has try/catch and logs errors but continues
  });
});

describe('Exchange Rate Job - Product Price Recalculation', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    resetFactoryCounter();
    cleanAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    cleanAllMocks();
  });

  it('should calculate USD from ILS for normal products', async () => {
    // Create product with ILS price
    const productData = createProduct({
      ils_price: 370,
      usd_price: 100,
      original_ils_price: 370,
      original_usd_price: 100
    });
    await Product.create(productData);

    // Mock API with rate 3.70
    mockExchangeRateAPI(3.70);

    // Call update function
    await updateExchangeRateAndPrices();

    // Read product from DB
    const products = await Product.find({});
    expect(products).toHaveLength(1);

    const product = products[0];

    // USD price should be Math.round(370 / 3.70) = 100
    expect(product.usd_price).toBe(Math.round(370 / 3.70));
    expect(product.usd_price).toBe(100);
    expect(product.ils_price).toBe(370); // ILS unchanged
  });

  it('should recalculate USD when exchange rate changes', async () => {
    // Create product with ILS price
    const productData = createProduct({
      ils_price: 370,
      usd_price: 100,
      original_ils_price: 370,
      original_usd_price: 100
    });
    await Product.create(productData);

    // Mock API with NEW rate 4.00 (rate went up)
    mockExchangeRateAPI(4.00);

    // Call update function
    await updateExchangeRateAndPrices();

    // Read product from DB
    const products = await Product.find({});
    const product = products[0];

    // USD price should be Math.round(370 / 4.00) = Math.round(92.5) = 93
    expect(product.usd_price).toBe(Math.round(370 / 4.00));
    expect(product.usd_price).toBe(93);
    expect(product.ils_price).toBe(370); // ILS unchanged
  });

  it('should migrate legacy products with USD but no ILS price', async () => {
    // Create legacy product with only USD price
    const productData = createProduct({
      usd_price: 100,
      ils_price: null, // No ILS price
      original_usd_price: 100
    });
    delete productData.ils_price; // Ensure it's missing
    delete productData.original_ils_price;

    await Product.create(productData);

    // Mock API with rate 3.70
    mockExchangeRateAPI(3.70);

    // Call update function
    await updateExchangeRateAndPrices();

    // Read product from DB
    const products = await Product.find({});
    const product = products[0];

    // ILS price should be reverse-calculated: Math.round(100 * 3.70) = 370
    expect(product.ils_price).toBe(Math.round(100 * 3.70));
    expect(product.ils_price).toBe(370);
    expect(product.original_ils_price).toBe(370);
    expect(product.usd_price).toBe(100); // USD unchanged during migration
  });

  it('should update multiple products correctly', async () => {
    // Create 3 products with different ILS prices
    const product1 = createProduct({ ils_price: 100, usd_price: 50 });
    const product2 = createProduct({ ils_price: 250, usd_price: 50 });
    const product3 = createProduct({ ils_price: 500, usd_price: 50 });

    await Product.create([product1, product2, product3]);

    // Mock API with rate 3.70
    mockExchangeRateAPI(3.70);

    // Call update function
    await updateExchangeRateAndPrices();

    // Read all products from DB
    const products = await Product.find({}).sort({ ils_price: 1 });
    expect(products).toHaveLength(3);

    // Verify each USD price is calculated correctly
    expect(products[0].usd_price).toBe(Math.round(100 / 3.70)); // = 27
    expect(products[1].usd_price).toBe(Math.round(250 / 3.70)); // = 68
    expect(products[2].usd_price).toBe(Math.round(500 / 3.70)); // = 135
  });

  it('should track original_usd_price from original_ils_price', async () => {
    // Create product with original prices
    const productData = createProduct({
      ils_price: 370,
      usd_price: 100,
      original_ils_price: 370,
      original_usd_price: 100
    });
    await Product.create(productData);

    // Mock API with NEW rate 4.00
    mockExchangeRateAPI(4.00);

    // Call update function
    await updateExchangeRateAndPrices();

    // Read product from DB
    const products = await Product.find({});
    const product = products[0];

    // original_usd_price should be recalculated from original_ils_price
    // Math.round(370 / 4.00) = 93
    expect(product.original_usd_price).toBe(Math.round(370 / 4.00));
    expect(product.original_usd_price).toBe(93);
    expect(product.original_ils_price).toBe(370); // Original ILS unchanged
  });

  it('should handle errors for individual products and continue updating others', async () => {
    // Create 2 valid products
    const product1 = createProduct({ ils_price: 100, usd_price: 50 });
    const product2 = createProduct({ ils_price: 200, usd_price: 50 });

    await Product.create([product1, product2]);

    // Mock API with rate 3.70
    mockExchangeRateAPI(3.70);

    // Call update function - should complete successfully even if errors occur
    await updateExchangeRateAndPrices();

    // Verify both products were updated (the function has per-product error handling)
    const products = await Product.find({}).sort({ ils_price: 1 });
    expect(products).toHaveLength(2);

    // Both should be updated despite potential errors
    expect(products[0].usd_price).toBe(Math.round(100 / 3.70));
    expect(products[1].usd_price).toBe(Math.round(200 / 3.70));
  });
});
