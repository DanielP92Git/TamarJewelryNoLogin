import { describe, it, expect } from 'vitest';
import {
  isProductionMongoUrl,
  isProductionPayPal,
  isProductionStripe,
  validateTestEnvironment
} from './envGuard.js';

describe('Environment Guard', () => {
  describe('isProductionMongoUrl', () => {
    it('should detect MongoDB Atlas URLs', () => {
      expect(isProductionMongoUrl('mongodb+srv://user:pass@cluster.mongodb.net/db')).toBe(true);
    });

    it('should detect cloud.mongodb.com URLs', () => {
      expect(isProductionMongoUrl('mongodb://cloud.mongodb.com/db')).toBe(true);
    });

    it('should detect mongodb.net domain', () => {
      expect(isProductionMongoUrl('mongodb://cluster.mongodb.net:27017/db')).toBe(true);
    });

    it('should allow localhost URLs', () => {
      expect(isProductionMongoUrl('mongodb://localhost:27017/test')).toBe(false);
    });

    it('should allow 127.0.0.1 URLs (memory server)', () => {
      expect(isProductionMongoUrl('mongodb://127.0.0.1:52345/test')).toBe(false);
    });

    it('should allow undefined/empty URLs', () => {
      expect(isProductionMongoUrl(undefined)).toBe(false);
      expect(isProductionMongoUrl('')).toBe(false);
      expect(isProductionMongoUrl('   ')).toBe(false);
    });

    it('should detect remote server URLs', () => {
      expect(isProductionMongoUrl('mongodb://prod.example.com:27017/db')).toBe(true);
    });
  });

  describe('isProductionPayPal', () => {
    it('should detect live PayPal API URL', () => {
      expect(isProductionPayPal('ABC123', 'https://api-m.paypal.com')).toBe(true);
    });

    it('should allow sandbox PayPal URL', () => {
      expect(isProductionPayPal('ABC123', 'https://api-m.sandbox.paypal.com')).toBe(false);
    });

    it('should allow empty credentials (mocking)', () => {
      expect(isProductionPayPal(undefined, 'https://api-m.paypal.com')).toBe(false);
      expect(isProductionPayPal('', 'https://api-m.paypal.com')).toBe(false);
      expect(isProductionPayPal('   ', 'https://api-m.paypal.com')).toBe(false);
    });

    it('should allow empty base URL', () => {
      expect(isProductionPayPal('ABC123', undefined)).toBe(false);
      expect(isProductionPayPal('ABC123', '')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isProductionPayPal('ABC123', 'HTTPS://API-M.PAYPAL.COM')).toBe(true);
      expect(isProductionPayPal('ABC123', 'HTTPS://API-M.SANDBOX.PAYPAL.COM')).toBe(false);
    });
  });

  describe('isProductionStripe', () => {
    it('should detect live Stripe key', () => {
      expect(isProductionStripe('sk_live_abc123xyz')).toBe(true);
      expect(isProductionStripe('sk_live_1234567890abcdef')).toBe(true);
    });

    it('should allow test Stripe key', () => {
      expect(isProductionStripe('sk_test_abc123xyz')).toBe(false);
      expect(isProductionStripe('sk_test_1234567890abcdef')).toBe(false);
    });

    it('should allow empty/undefined key (mocking)', () => {
      expect(isProductionStripe(undefined)).toBe(false);
      expect(isProductionStripe('')).toBe(false);
      expect(isProductionStripe('   ')).toBe(false);
    });

    it('should handle other key types as safe', () => {
      expect(isProductionStripe('pk_live_abc123')).toBe(false); // Publishable keys are client-side
      expect(isProductionStripe('rk_live_abc123')).toBe(false); // Restricted keys
    });
  });

  describe('validateTestEnvironment', () => {
    it('should not throw when no production credentials present', () => {
      // In test environment with memory server, should pass
      // (setup.js already cleared payment env vars)
      expect(() => validateTestEnvironment()).not.toThrow();
    });

    // Note: We don't test the throw cases directly here because setting
    // production env vars would affect other tests. The integration is
    // tested manually with:
    // MONGO_URL="mongodb+srv://..." npm test
  });
});
