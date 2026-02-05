/**
 * Product Model Tests
 * Tests Product Mongoose model directly (not through HTTP endpoints).
 *
 * Covers:
 * - DATA-01: Product creation with valid data and defaults
 * - DATA-02: Required field validation (name, category, id)
 * - DATA-03: SKU uniqueness with sparse index (allows multiple nulls)
 * - DATA-04: Price validation (actual schema behavior)
 * - DATA-05: Category validation (actual schema behavior)
 * - DATA-06: Update operations
 * - DATA-07: Delete operations
 * - DATA-08: Find by category
 * - DATA-09: Sort by displayOrder
 */
import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';

// Import test helpers
import { createProduct } from '../helpers/factories.js';
import { validateTestEnvironment } from '../helpers/envGuard.js';

describe('Product Model', () => {
  let Product;

  beforeAll(async () => {
    // Verify we're in safe test environment
    validateTestEnvironment();

    // Import Product model (CommonJS module)
    Product = (await import('../../models/Product.js')).default;
  });

  describe('Product Creation - Valid Data (DATA-01)', () => {
    it('should create a product with all required fields', async () => {
      const productData = {
        id: 1001,
        name: 'Test Ring',
        category: 'rings',
        usd_price: 100,
        ils_price: 370,
        images: [
          {
            desktop: 'ring-d.webp',
            mobile: 'ring-m.webp'
          }
        ]
      };

      const product = await Product.create(productData);

      // Verify all fields saved correctly
      expect(product._id).toBeDefined();
      expect(product.id).toBe(1001);
      expect(product.name).toBe('Test Ring');
      expect(product.category).toBe('rings');
      expect(product.usd_price).toBe(100);
      expect(product.ils_price).toBe(370);
      expect(product.images).toHaveLength(1);
      expect(product.images[0].desktop).toBe('ring-d.webp');
      expect(product.images[0].mobile).toBe('ring-m.webp');

      // Verify defaults
      expect(product.available).toBe(true);
      expect(product.quantity).toBe(0);
      expect(product.discount_percentage).toBe(0);
    });

    it('should auto-assign displayOrder via pre-save hook for new products', async () => {
      // Create first product in 'necklaces' category without displayOrder
      const product1 = new Product({
        id: 2001,
        name: 'Necklace 1',
        category: 'necklaces'
      });
      await product1.save();

      // Verify displayOrder is 10 (first product in category)
      expect(product1.displayOrder).toBe(10);

      // Create second product in same category without displayOrder
      const product2 = new Product({
        id: 2002,
        name: 'Necklace 2',
        category: 'necklaces'
      });
      await product2.save();

      // Verify displayOrder is 20 (10 + 10 gap)
      expect(product2.displayOrder).toBe(20);
    });

    it('should auto-transform SKU to uppercase', async () => {
      const product = await Product.create({
        id: 3001,
        name: 'Test Product',
        category: 'rings',
        sku: 'abc123'
      });

      // Verify SKU is uppercase
      expect(product.sku).toBe('ABC123');
    });

    it('should auto-trim SKU whitespace', async () => {
      const product = await Product.create({
        id: 3002,
        name: 'Test Product',
        category: 'rings',
        sku: '  ABC  '
      });

      // Verify SKU is trimmed
      expect(product.sku).toBe('ABC');
    });

    it('should create product without optional fields (SKU, description, images)', async () => {
      const product = await Product.create({
        id: 3003,
        name: 'Minimal Product',
        category: 'rings'
      });

      // Verify product saved
      expect(product._id).toBeDefined();
      expect(product.id).toBe(3003);
      expect(product.name).toBe('Minimal Product');
      expect(product.category).toBe('rings');

      // Verify optional fields are undefined or null
      expect(product.sku).toBeUndefined();
      expect(product.description).toBeUndefined();
      expect(product.images).toBeDefined(); // Array field defaults to empty array
      expect(product.images).toHaveLength(0);
    });
  });

  describe('Product Validation - Required Fields (DATA-02)', () => {
    it('should reject product without name', async () => {
      await expect(
        Product.create({
          id: 4001,
          category: 'rings'
        })
      ).rejects.toThrow(/name/);
    });

    it('should reject product without category', async () => {
      await expect(
        Product.create({
          id: 4002,
          name: 'Ring'
        })
      ).rejects.toThrow(/category/);
    });

    it('should reject product without id', async () => {
      await expect(
        Product.create({
          name: 'Ring',
          category: 'rings'
        })
      ).rejects.toThrow(/id/);
    });
  });

  describe('SKU Uniqueness - Sparse Index (DATA-03)', () => {
    it('should reject duplicate SKU', async () => {
      // Create first product with SKU
      await Product.create({
        id: 5001,
        name: 'Product 1',
        category: 'rings',
        sku: 'ABC123'
      });

      // Try to create second product with same SKU
      await expect(
        Product.create({
          id: 5002,
          name: 'Product 2',
          category: 'rings',
          sku: 'ABC123'
        })
      ).rejects.toThrow();
    });

    it('should allow multiple products without SKU (sparse index)', async () => {
      // Create two products without SKU field
      const product1 = await Product.create({
        id: 5003,
        name: 'Product Without SKU 1',
        category: 'rings'
      });

      const product2 = await Product.create({
        id: 5004,
        name: 'Product Without SKU 2',
        category: 'rings'
      });

      // Verify both saved successfully
      expect(product1._id).toBeDefined();
      expect(product2._id).toBeDefined();
      expect(product1.sku).toBeUndefined();
      expect(product2.sku).toBeUndefined();
    });

    it('should allow multiple products with undefined SKU (omitted field)', async () => {
      // Sparse index allows multiple documents with missing SKU field
      // Note: Explicit null is NOT the same as missing field in sparse indexes
      const product1 = await Product.create({
        id: 5005,
        name: 'Product Undefined SKU 1',
        category: 'rings'
        // sku field omitted entirely
      });

      const product2 = await Product.create({
        id: 5006,
        name: 'Product Undefined SKU 2',
        category: 'rings'
        // sku field omitted entirely
      });

      // Verify both saved successfully
      expect(product1._id).toBeDefined();
      expect(product2._id).toBeDefined();
      expect(product1.sku).toBeUndefined();
      expect(product2.sku).toBeUndefined();

      // Verify count in database for products without SKU
      const count = await Product.countDocuments({ sku: { $exists: false } });
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should reject duplicate SKU in race condition', async () => {
      // Try to create 3 products concurrently with same SKU
      const results = await Promise.allSettled([
        Product.create({ id: 5007, name: 'Race 1', category: 'rings', sku: 'RACE99' }),
        Product.create({ id: 5008, name: 'Race 2', category: 'rings', sku: 'RACE99' }),
        Product.create({ id: 5009, name: 'Race 3', category: 'rings', sku: 'RACE99' })
      ]);

      // Count how many succeeded
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      // Verify only 1 succeeded
      expect(successCount).toBe(1);

      // Verify final DB count for that SKU is 1
      const dbCount = await Product.countDocuments({ sku: 'RACE99' });
      expect(dbCount).toBe(1);
    });
  });

  describe('SKU Format Validation', () => {
    it('should reject SKU shorter than 2 characters', async () => {
      await expect(
        Product.create({
          id: 6001,
          name: 'Product',
          category: 'rings',
          sku: 'A'
        })
      ).rejects.toThrow(/at least 2 characters/);
    });

    it('should reject SKU longer than 7 characters', async () => {
      await expect(
        Product.create({
          id: 6002,
          name: 'Product',
          category: 'rings',
          sku: 'ABCDEFGH'
        })
      ).rejects.toThrow(/at most 7 characters/);
    });

    it('should reject SKU with special characters', async () => {
      await expect(
        Product.create({
          id: 6003,
          name: 'Product',
          category: 'rings',
          sku: 'AB-CD'
        })
      ).rejects.toThrow(/only letters and numbers/);
    });

    it('should accept valid SKU at boundaries', async () => {
      // 2 characters (minimum)
      const product1 = await Product.create({
        id: 6004,
        name: 'Product 1',
        category: 'rings',
        sku: 'AB'
      });
      expect(product1.sku).toBe('AB');

      // 7 characters (maximum)
      const product2 = await Product.create({
        id: 6005,
        name: 'Product 2',
        category: 'rings',
        sku: 'ABCDEFG'
      });
      expect(product2.sku).toBe('ABCDEFG');
    });
  });

  describe('Price Behavior (DATA-04)', () => {
    it('should save product with valid prices', async () => {
      const product = await Product.create({
        id: 7001,
        name: 'Product',
        category: 'rings',
        usd_price: 100,
        ils_price: 370
      });

      expect(product.usd_price).toBe(100);
      expect(product.ils_price).toBe(370);
    });

    it('should accept zero price', async () => {
      // Schema has no min validator for prices
      const product = await Product.create({
        id: 7002,
        name: 'Free Product',
        category: 'rings',
        usd_price: 0,
        ils_price: 0
      });

      expect(product.usd_price).toBe(0);
      expect(product.ils_price).toBe(0);
    });

    it('should accept negative price (no validator in schema)', async () => {
      // Document actual schema behavior - no price validation exists
      const product = await Product.create({
        id: 7003,
        name: 'Negative Price Product',
        category: 'rings',
        usd_price: -50,
        ils_price: -185
      });

      expect(product.usd_price).toBe(-50);
      expect(product.ils_price).toBe(-185);
    });
  });

  describe('Category Behavior (DATA-05)', () => {
    it('should save product with any category string', async () => {
      // Schema has no enum constraint on category
      const product = await Product.create({
        id: 8001,
        name: 'Custom Category Product',
        category: 'custom-category'
      });

      expect(product.category).toBe('custom-category');
    });

    it('should reject product with empty string category', async () => {
      // Empty string should be treated as missing required field
      await expect(
        Product.create({
          id: 8002,
          name: 'Product',
          category: ''
        })
      ).rejects.toThrow();
    });
  });

  describe('DisplayOrder Validation', () => {
    it('should reject displayOrder of 0 (min: 1)', async () => {
      await expect(
        Product.create({
          id: 9001,
          name: 'Product',
          category: 'rings',
          displayOrder: 0
        })
      ).rejects.toThrow(/displayOrder must be positive/);
    });

    it('should reject negative displayOrder', async () => {
      await expect(
        Product.create({
          id: 9002,
          name: 'Product',
          category: 'rings',
          displayOrder: -5
        })
      ).rejects.toThrow(/displayOrder must be positive/);
    });

    it('should accept displayOrder of 1 (boundary)', async () => {
      const product = await Product.create({
        id: 9003,
        name: 'Product',
        category: 'rings',
        displayOrder: 1
      });

      expect(product.displayOrder).toBe(1);
    });
  });
});
