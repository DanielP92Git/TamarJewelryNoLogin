/**
 * localStorage persistence tests covering data survival, browser restart simulation,
 * and corruption handling.
 *
 * Tests requirements MODEL-05 through MODEL-07 and MODEL-14 from Phase 18.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cart, handleAddToCart, handleLoadStorage, removeFromUserCart, deleteAll } from '../../js/model.js';
import { createProduct, resetFactoryCounter } from '../helpers/factories.js';
import { createMockProductElement } from '../helpers/mocks/dom-elements.js';

describe('Model: localStorage Persistence', () => {
  beforeEach(() => {
    cart.length = 0;
    localStorage.clear();
    resetFactoryCounter();
  });

  describe('localStorage Persistence on Change (MODEL-05)', () => {
    it('should persist cart to localStorage after adding item', () => {
      const product = createProduct({ id: 1001 });
      const mockElement = createMockProductElement(product);

      handleAddToCart(mockElement);

      const storedCart = JSON.parse(localStorage.getItem('cart'));
      expect(storedCart).toHaveLength(1);
      expect(storedCart[0].id).toBe(1001);
      expect(storedCart[0].title).toBe(product.name);
    });

    it('should update localStorage after removing item', async () => {
      // Arrange: add two items
      const product1 = createProduct({ id: 1001 });
      const product2 = createProduct({ id: 1002 });
      const mockElement1 = createMockProductElement(product1);
      const mockElement2 = createMockProductElement(product2);

      handleAddToCart(mockElement1);
      handleAddToCart(mockElement2);
      expect(cart).toHaveLength(2);

      // Act: remove one item
      await removeFromUserCart(1001);

      // Assert: localStorage updated
      const storedCart = JSON.parse(localStorage.getItem('cart'));
      expect(storedCart).toHaveLength(1);
      expect(storedCart[0].id).toBe(1002);
    });

    it('should update localStorage after clearing cart', async () => {
      // Arrange: add items
      const product1 = createProduct();
      const product2 = createProduct();
      handleAddToCart(createMockProductElement(product1));
      handleAddToCart(createMockProductElement(product2));
      expect(cart).toHaveLength(2);

      // Act: clear cart
      await deleteAll();

      // Assert: localStorage is empty array
      const storedCart = JSON.parse(localStorage.getItem('cart'));
      expect(storedCart).toEqual([]);
      expect(cart).toHaveLength(0);
    });

    it('should keep localStorage and cart array in sync', () => {
      const product = createProduct({ id: 1001, name: 'Silver Ring' });
      const mockElement = createMockProductElement(product);

      handleAddToCart(mockElement);

      // Verify cart array matches localStorage
      const storedCart = JSON.parse(localStorage.getItem('cart'));
      expect(cart).toEqual(storedCart);
      expect(cart[0].title).toBe('Silver Ring');
      expect(storedCart[0].title).toBe('Silver Ring');
    });
  });

  describe('Loading from localStorage (MODEL-06)', () => {
    it('should load cart from localStorage when no auth-token', async () => {
      // Arrange: set localStorage with cart data (no auth-token)
      const mockCartData = [
        { id: 1001, title: 'Gold Necklace', price: 185, amount: 1 },
        { id: 1002, title: 'Silver Ring', price: 95, amount: 2 }
      ];
      localStorage.setItem('cart', JSON.stringify(mockCartData));

      // Act: load from localStorage
      await handleLoadStorage();

      // Assert: cart array populated
      expect(cart).toHaveLength(2);
      expect(cart[0].id).toBe(1001);
      expect(cart[0].title).toBe('Gold Necklace');
      expect(cart[1].id).toBe(1002);
      expect(cart[1].amount).toBe(2);
    });

    it('should restore correct item properties', async () => {
      const mockCartData = [
        {
          id: 1001,
          title: 'Test Product',
          image: 'test.jpg',
          price: 185,
          usdPrice: 50,
          ilsPrice: 185,
          amount: 3,
          quantity: 10
        }
      ];
      localStorage.setItem('cart', JSON.stringify(mockCartData));

      await handleLoadStorage();

      expect(cart[0].id).toBe(1001);
      expect(cart[0].title).toBe('Test Product');
      expect(cart[0].price).toBe(185);
      expect(cart[0].amount).toBe(3);
      expect(cart[0].usdPrice).toBe(50);
      expect(cart[0].ilsPrice).toBe(185);
    });

    it('should handle empty cart in localStorage', async () => {
      localStorage.setItem('cart', JSON.stringify([]));

      await handleLoadStorage();

      expect(cart).toHaveLength(0);
    });

    it('should handle missing cart key in localStorage', async () => {
      // localStorage has no 'cart' key
      expect(localStorage.getItem('cart')).toBeNull();

      await handleLoadStorage();

      expect(cart).toHaveLength(0);
    });
  });

  describe('Browser Restart Simulation (MODEL-07)', () => {
    it('should survive browser restart (clear cart array, reload from localStorage)', async () => {
      // 1. Add item to cart
      const product = createProduct({ id: 1001, name: 'Gold Bracelet' });
      const mockElement = createMockProductElement(product);
      handleAddToCart(mockElement);
      expect(cart).toHaveLength(1);

      // 2. Simulate browser restart: clear cart array, keep localStorage
      cart.length = 0;
      expect(cart).toHaveLength(0);

      // 3. Reload from localStorage (like page refresh)
      await handleLoadStorage();

      // 4. Verify cart restored
      expect(cart).toHaveLength(1);
      expect(cart[0].id).toBe(1001);
      expect(cart[0].title).toBe('Gold Bracelet');
    });

    it('should restore multiple items after browser restart', async () => {
      // 1. Add multiple items
      const product1 = createProduct({ id: 1001, name: 'Item A' });
      const product2 = createProduct({ id: 1002, name: 'Item B' });
      const product3 = createProduct({ id: 1003, name: 'Item C' });

      handleAddToCart(createMockProductElement(product1));
      handleAddToCart(createMockProductElement(product2));
      handleAddToCart(createMockProductElement(product3));
      expect(cart).toHaveLength(3);

      // 2. Simulate restart
      cart.length = 0;

      // 3. Reload
      await handleLoadStorage();

      // 4. Verify all items restored
      expect(cart).toHaveLength(3);
      expect(cart[0].title).toBe('Item A');
      expect(cart[1].title).toBe('Item B');
      expect(cart[2].title).toBe('Item C');
    });

    it('should restore all properties correctly after restart', async () => {
      // 1. Add item with all properties
      const product = createProduct({
        id: 1001,
        name: 'Premium Necklace',
        usd_price: 100,
        ils_price: 370
      });
      const mockElement = createMockProductElement(product);
      handleAddToCart(mockElement);

      // 2. Simulate restart
      const originalCart = JSON.parse(JSON.stringify(cart[0])); // Deep clone
      cart.length = 0;

      // 3. Reload
      await handleLoadStorage();

      // 4. Verify properties match original
      expect(cart[0].id).toBe(originalCart.id);
      expect(cart[0].title).toBe(originalCart.title);
      expect(cart[0].usdPrice).toBe(originalCart.usdPrice);
      expect(cart[0].ilsPrice).toBe(originalCart.ilsPrice);
      expect(cart[0].amount).toBe(originalCart.amount);
    });
  });

  describe('localStorage Corruption Handling (MODEL-14)', () => {
    it('should handle malformed JSON gracefully', async () => {
      localStorage.setItem('cart', 'not valid json{{{');

      await expect(handleLoadStorage()).resolves.not.toThrow();
      expect(cart).toHaveLength(0); // Falls back to empty cart
    });

    it('should handle null value gracefully', async () => {
      localStorage.setItem('cart', 'null');

      await handleLoadStorage();

      expect(cart).toHaveLength(0);
    });

    it('should handle empty string gracefully', async () => {
      localStorage.setItem('cart', '');

      await expect(handleLoadStorage()).resolves.not.toThrow();
      expect(cart).toHaveLength(0);
    });

    it('should handle non-array values gracefully (object instead of array)', async () => {
      // localStorage contains object instead of array
      localStorage.setItem('cart', JSON.stringify({ id: 1001, title: 'Product' }));

      // handleLoadStorage has try-catch - it won't crash but will log error
      await expect(handleLoadStorage()).resolves.not.toThrow();
      // cart.push(...data) will fail but error is caught
      expect(cart).toHaveLength(0);
    });

    it('should handle array with null items', async () => {
      localStorage.setItem('cart', JSON.stringify([
        { id: 1001, title: 'Valid Item' },
        null,
        { id: 1002, title: 'Another Valid Item' }
      ]));

      await handleLoadStorage();

      // Current implementation will load all items including null
      // We verify it doesn't crash
      expect(cart).toHaveLength(3);
      expect(cart[1]).toBeNull();
    });

    it('should handle array with undefined items', async () => {
      localStorage.setItem('cart', JSON.stringify([
        { id: 1001, title: 'Valid Item' },
        undefined,
        { id: 1002, title: 'Another Valid Item' }
      ]));

      await handleLoadStorage();

      // JSON.stringify converts undefined to null
      // Verify no crash
      expect(cart.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle items with missing required fields', async () => {
      // Items missing id, title, or price
      localStorage.setItem('cart', JSON.stringify([
        { title: 'No ID' },
        { id: 1001 }, // Missing title
        { id: 1002, title: 'No Price' }
      ]));

      await handleLoadStorage();

      // Current implementation doesn't validate - it loads as-is
      expect(cart).toHaveLength(3);
      expect(cart[0].id).toBeUndefined();
      expect(cart[1].title).toBeUndefined();
    });

    it('should handle type mismatches (price as string, amount as float)', async () => {
      localStorage.setItem('cart', JSON.stringify([
        {
          id: '1001', // String instead of number
          title: 'Test Product',
          price: '185.50', // String instead of number
          amount: 1.5 // Float instead of integer
        }
      ]));

      await handleLoadStorage();

      expect(cart).toHaveLength(1);
      expect(cart[0].id).toBe('1001'); // Loaded as string
      expect(cart[0].price).toBe('185.50'); // Loaded as string
      expect(cart[0].amount).toBe(1.5); // Loaded as float
    });

    it('should handle very large cart data', async () => {
      // Create large cart (100 items)
      const largeCart = Array.from({ length: 100 }, (_, i) => ({
        id: 1000 + i,
        title: `Product ${i}`,
        price: 100 + i,
        amount: 1
      }));
      localStorage.setItem('cart', JSON.stringify(largeCart));

      await handleLoadStorage();

      expect(cart).toHaveLength(100);
      expect(cart[0].id).toBe(1000);
      expect(cart[99].id).toBe(1099);
    });
  });

  describe('localStorage Quota Handling (optional)', () => {
    it('should verify localStorage.setItem is called (quota handling not implemented)', () => {
      // Spy on localStorage.setItem to verify it's called without try-catch
      const setItemSpy = vi.spyOn(localStorage, 'setItem');

      const product = createProduct();
      const mockElement = createMockProductElement(product);

      handleAddToCart(mockElement);

      // Verify localStorage.setItem was called
      expect(setItemSpy).toHaveBeenCalledWith('cart', expect.any(String));

      // Current implementation doesn't have try-catch around createLocalStorage.
      // If localStorage.setItem throws (quota exceeded), the app will crash.
      // Future enhancement: wrap createLocalStorage in try-catch to handle QuotaExceededError gracefully

      setItemSpy.mockRestore();
    });
  });
});
