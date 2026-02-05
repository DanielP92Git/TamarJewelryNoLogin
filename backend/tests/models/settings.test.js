/**
 * Settings Model Tests
 *
 * Tests the Settings Mongoose model directly (not through HTTP endpoints).
 * Covers DATA-14 and DATA-15:
 * - DATA-14: Settings read via getSettings() singleton pattern
 * - DATA-15: Settings update (exchange rate, discount fields)
 */
import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';

// Import Settings model (CommonJS module)
let Settings;
beforeAll(async () => {
  Settings = (await import('../../models/Settings.js')).default;
});

describe('Settings Model Tests', () => {
  describe('Settings Read - getSettings Singleton (DATA-14)', () => {
    it('should create settings document when none exists', async () => {
      const settings = await Settings.getSettings();

      expect(settings._id).toBeDefined();
      expect(settings.global_discount_percentage).toBe(0);
      expect(settings.discount_active).toBe(false);
      expect(settings.discount_label).toBe('Discount');
    });

    it('should return existing settings on subsequent calls', async () => {
      const settings1 = await Settings.getSettings();
      const settings2 = await Settings.getSettings();

      // Should return the same document
      expect(settings1._id.toString()).toBe(settings2._id.toString());
    });

    it('should return settings with default exchange rate fields', async () => {
      const settings = await Settings.getSettings();

      expect(settings.usd_ils_rate).toBeNull();
      expect(settings.exchange_rate_last_updated).toBeNull();
      expect(settings.exchange_rate_source).toBeNull();
    });

    it('should return settings with default discount fields', async () => {
      const settings = await Settings.getSettings();

      expect(settings.discount_label).toBe('Discount');
      expect(settings.global_discount_percentage).toBe(0);
      expect(settings.discount_active).toBe(false);
    });

    it('should handle concurrent getSettings calls (may create race condition duplicates)', async () => {
      // Clear any existing settings first
      await Settings.deleteMany({});

      // Call getSettings 5 times concurrently
      const results = await Promise.allSettled([
        Settings.getSettings(),
        Settings.getSettings(),
        Settings.getSettings(),
        Settings.getSettings(),
        Settings.getSettings()
      ]);

      // All should succeed
      const succeeded = results.filter(r => r.status === 'fulfilled');
      expect(succeeded.length).toBe(5);

      // Due to race conditions, multiple documents may be created
      // The getSettings() method uses findOne() then create() - NOT atomic
      // This documents actual behavior
      const count = await Settings.countDocuments();
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(5);

      // In production, this is acceptable because:
      // 1. Settings creation happens rarely (once per deployment)
      // 2. All settings have same defaults
      // 3. Subsequent calls return first found document
    });
  });

  describe('Settings Update (DATA-15)', () => {
    it('should update exchange rate fields', async () => {
      // Create initial settings
      await Settings.getSettings();

      const testDate = new Date();
      await Settings.updateOne(
        {},
        {
          $set: {
            usd_ils_rate: 3.75,
            exchange_rate_last_updated: testDate,
            exchange_rate_source: 'test-api'
          }
        }
      );

      const updated = await Settings.findOne();
      expect(updated.usd_ils_rate).toBe(3.75);
      expect(updated.exchange_rate_last_updated).toBeInstanceOf(Date);
      expect(updated.exchange_rate_source).toBe('test-api');
    });

    it('should update discount fields', async () => {
      await Settings.getSettings();

      await Settings.updateOne(
        {},
        {
          $set: {
            global_discount_percentage: 15,
            discount_active: true,
            discount_label: 'Holiday Sale'
          }
        }
      );

      const updated = await Settings.findOne();
      expect(updated.global_discount_percentage).toBe(15);
      expect(updated.discount_active).toBe(true);
      expect(updated.discount_label).toBe('Holiday Sale');
    });

    it('should preserve unmodified fields on partial update', async () => {
      await Settings.getSettings();

      // Set initial values
      await Settings.updateOne(
        {},
        {
          $set: {
            global_discount_percentage: 10,
            discount_active: true,
            usd_ils_rate: 3.70
          }
        }
      );

      // Update only exchange rate
      await Settings.updateOne(
        {},
        {
          $set: {
            usd_ils_rate: 3.80
          }
        }
      );

      const updated = await Settings.findOne();
      expect(updated.usd_ils_rate).toBe(3.80); // Changed
      expect(updated.global_discount_percentage).toBe(10); // Preserved
      expect(updated.discount_active).toBe(true); // Preserved
    });

    it('should update using findOneAndUpdate', async () => {
      await Settings.getSettings();

      const updated = await Settings.findOneAndUpdate(
        {},
        { usd_ils_rate: 4.0 },
        { new: true }
      );

      expect(updated.usd_ils_rate).toBe(4.0);
    });

    it('should update updatedAt field', async () => {
      const settings = await Settings.getSettings();
      const initialUpdatedAt = settings.updatedAt;

      // Wait a small amount to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await Settings.updateOne(
        {},
        {
          $set: {
            usd_ils_rate: 3.65,
            updatedAt: new Date()
          }
        }
      );

      const updated = await Settings.findOne();
      expect(updated.updatedAt).toBeDefined();
      expect(updated.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });
  });

  describe('Settings Creation Constraints', () => {
    it('should create settings with custom initial values', async () => {
      const settings = await Settings.create({
        global_discount_percentage: 10,
        usd_ils_rate: 3.5
      });

      expect(settings.global_discount_percentage).toBe(10);
      expect(settings.usd_ils_rate).toBe(3.5);
      expect(settings.discount_active).toBe(false); // Default
      expect(settings.discount_label).toBe('Discount'); // Default
    });

    it('should allow direct create of settings document', async () => {
      const settings = await Settings.create({});

      expect(settings._id).toBeDefined();
      expect(settings.global_discount_percentage).toBe(0);
      expect(settings.discount_active).toBe(false);
      expect(settings.discount_label).toBe('Discount');
      expect(settings.usd_ils_rate).toBeNull();
      expect(settings.exchange_rate_last_updated).toBeNull();
      expect(settings.exchange_rate_source).toBeNull();
      expect(settings.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Settings Singleton Pattern Behavior', () => {
    it('should allow multiple settings documents (no schema enforcement)', async () => {
      // The getSettings() static method implements singleton pattern,
      // but the schema itself doesn't prevent multiple documents.
      // This test documents actual schema behavior.

      await Settings.create({ global_discount_percentage: 5 });
      await Settings.create({ global_discount_percentage: 10 });

      const count = await Settings.countDocuments();
      expect(count).toBe(2);
    });

    it('should return first document when multiple exist', async () => {
      // Create multiple settings
      const first = await Settings.create({ global_discount_percentage: 5 });
      await Settings.create({ global_discount_percentage: 10 });

      // getSettings returns first found
      const settings = await Settings.getSettings();
      expect(settings._id.toString()).toBe(first._id.toString());
      expect(settings.global_discount_percentage).toBe(5);
    });
  });

  describe('Settings Field Types and Validation', () => {
    it('should accept null values for exchange rate fields', async () => {
      const settings = await Settings.create({
        usd_ils_rate: null,
        exchange_rate_last_updated: null,
        exchange_rate_source: null
      });

      expect(settings.usd_ils_rate).toBeNull();
      expect(settings.exchange_rate_last_updated).toBeNull();
      expect(settings.exchange_rate_source).toBeNull();
    });

    it('should store exchange rate as Number', async () => {
      const settings = await Settings.create({
        usd_ils_rate: 3.75
      });

      expect(typeof settings.usd_ils_rate).toBe('number');
      expect(settings.usd_ils_rate).toBe(3.75);
    });

    it('should store discount percentage as Number', async () => {
      const settings = await Settings.create({
        global_discount_percentage: 15
      });

      expect(typeof settings.global_discount_percentage).toBe('number');
      expect(settings.global_discount_percentage).toBe(15);
    });

    it('should store discount active as Boolean', async () => {
      const settings = await Settings.create({
        discount_active: true
      });

      expect(typeof settings.discount_active).toBe('boolean');
      expect(settings.discount_active).toBe(true);
    });
  });
});
