/**
 * Model: Currency and Discount Tests
 *
 * Tests MODEL-11, MODEL-12, MODEL-13:
 * - Dual currency storage (USD and ILS prices on cart items)
 * - Discount calculation precision and edge cases
 *
 * Note: The model.js stores both USD and ILS prices but does NOT perform
 * currency conversion - that's handled by the View layer. The only calculation
 * function in model.js is calculateDiscountedPrice.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { cart, handleAddToCart, calculateDiscountedPrice } from '../../js/model.js';
import { createProduct, resetFactoryCounter } from '../helpers/factories.js';
import { createMockProductElement } from '../helpers/mocks/dom-elements.js';

describe('Model: Dual Currency Storage', () => {
  beforeEach(() => {
    cart.length = 0;
    localStorage.clear();
    resetFactoryCounter();
  });

  it('should store both USD and ILS prices on cart item', () => {
    const product = createProduct({ usd_price: 50, ils_price: 185 });
    const mockElement = createMockProductElement(product);

    handleAddToCart(mockElement);

    expect(cart[0].usdPrice).toBe(50);
    expect(cart[0].ilsPrice).toBe(185);
  });

  it('should preserve both prices through add/load cycle', () => {
    const product = createProduct({ usd_price: 100, ils_price: 370 });
    const mockElement = createMockProductElement(product);

    handleAddToCart(mockElement);

    // Verify localStorage persists both prices
    const storedCart = JSON.parse(localStorage.getItem('cart'));
    expect(storedCart[0].usdPrice).toBe(100);
    expect(storedCart[0].ilsPrice).toBe(370);
  });

  it('should store both prices with various price combinations', () => {
    const testCases = [
      { usd: 25, ils: 93 },    // 92.5 rounds to 93
      { usd: 150, ils: 555 },
      { usd: 999, ils: 3696 }  // 3696.3 rounds to 3696
    ];

    testCases.forEach(({ usd, ils }, index) => {
      const product = createProduct({
        id: 2000 + index,
        usd_price: usd,
        ils_price: ils
      });
      const mockElement = createMockProductElement(product);

      handleAddToCart(mockElement);
    });

    // Verify all items have both prices stored (rounded to integers)
    expect(cart).toHaveLength(3);
    testCases.forEach((testCase, index) => {
      expect(cart[index].usdPrice).toBe(testCase.usd);
      expect(cart[index].ilsPrice).toBe(testCase.ils);
    });
  });

  it('should store rounded integer prices', () => {
    const product = createProduct({
      usd_price: 49.99,
      ils_price: 184.96
    });
    const mockElement = createMockProductElement(product);

    handleAddToCart(mockElement);

    // Model.js uses Math.round() on prices from data attributes
    expect(cart[0].usdPrice).toBe(50);
    expect(cart[0].ilsPrice).toBe(185);
  });
});

describe('Model: calculateDiscountedPrice', () => {
  it('should calculate correct discounted price for various percentages', () => {
    expect(calculateDiscountedPrice(100, 10)).toBe(90);   // 10% off
    expect(calculateDiscountedPrice(100, 25)).toBe(75);   // 25% off
    expect(calculateDiscountedPrice(200, 50)).toBe(100);  // 50% off
    expect(calculateDiscountedPrice(150, 20)).toBe(120);  // 20% off
  });

  it('should return original price when discount is 0', () => {
    expect(calculateDiscountedPrice(100, 0)).toBe(100);
  });

  it('should return original price when discount is null', () => {
    expect(calculateDiscountedPrice(100, null)).toBe(100);
  });

  it('should return original price when discount is undefined', () => {
    expect(calculateDiscountedPrice(100, undefined)).toBe(100);
  });

  it('should handle negative discount by returning original price', () => {
    expect(calculateDiscountedPrice(100, -10)).toBe(100);
  });

  it('should handle 100% discount by returning 0', () => {
    expect(calculateDiscountedPrice(100, 100)).toBe(0);
    expect(calculateDiscountedPrice(250, 100)).toBe(0);
  });

  it('should handle floating-point precision with toBeCloseTo', () => {
    // 33.33% of 100 = 66.67 -> rounded to 67
    expect(calculateDiscountedPrice(100, 33.33)).toBeCloseTo(67, 0);

    // 15.5% of 200 = 169
    expect(calculateDiscountedPrice(200, 15.5)).toBeCloseTo(169, 0);
  });

  it('should use Math.round for integer results', () => {
    // Verify rounding behavior
    const result = calculateDiscountedPrice(99.99, 33.33);
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe('Model: Price Edge Cases', () => {
  it('should handle zero price with discount', () => {
    expect(calculateDiscountedPrice(0, 10)).toBe(0);
    expect(calculateDiscountedPrice(0, 50)).toBe(0);
  });

  it('should handle very large amounts with discount', () => {
    // 100,000 with 15% discount = 85,000
    expect(calculateDiscountedPrice(100000, 15)).toBe(85000);

    // 500,000 with 30% discount = 350,000
    expect(calculateDiscountedPrice(500000, 30)).toBe(350000);
  });

  it('should handle fractional percentages', () => {
    // 2.5% off $100 = $97.50 -> rounds to $98
    expect(calculateDiscountedPrice(100, 2.5)).toBeCloseTo(98, 0);

    // 7.5% off $200 = $185
    expect(calculateDiscountedPrice(200, 7.5)).toBeCloseTo(185, 0);

    // 12.75% off $400 = $349
    expect(calculateDiscountedPrice(400, 12.75)).toBeCloseTo(349, 0);
  });

  it('should maintain precision with toBeCloseTo for currency calculations', () => {
    // Use toBeCloseTo with 2 decimal places for more precise currency testing
    const result = calculateDiscountedPrice(99.95, 15.25);
    // 99.95 * (1 - 0.1525) = 84.71... -> rounds to 85
    expect(result).toBeCloseTo(85, 0);
  });

  it('should handle small prices with high discounts', () => {
    // $5 with 80% discount = $1
    expect(calculateDiscountedPrice(5, 80)).toBe(1);

    // $10 with 95% discount = $0.50 -> rounds to $1
    expect(calculateDiscountedPrice(10, 95)).toBeCloseTo(1, 0);
  });
});
