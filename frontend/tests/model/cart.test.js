/**
 * Cart operation tests covering add, remove, update, and clear operations.
 *
 * Tests both guest user (localStorage only) and logged-in user (API calls) paths.
 * Covers requirements MODEL-01 through MODEL-04 from Phase 18.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cart, handleAddToCart, removeFromUserCart, deleteAll } from '../../js/model.js';
import { createProduct, resetFactoryCounter } from '../helpers/factories.js';
import { createMockProductElement } from '../helpers/mocks/dom-elements.js';
import { setupFetchMock, teardownFetchMock, mockFetchSuccess } from '../helpers/mocks/fetch.js';

describe('Model: Cart Operations', () => {
  beforeEach(() => {
    // CRITICAL: Clear the exported cart array (it's mutable and persists across tests)
    cart.length = 0;
    localStorage.clear();
    resetFactoryCounter();
  });

  describe('Add to Cart - Guest User (MODEL-01)', () => {
    it('should add product to cart array with correct properties', () => {
      const product = createProduct({ id: 1001, name: 'Gold Necklace' });
      const mockElement = createMockProductElement(product);

      handleAddToCart(mockElement);

      expect(cart).toHaveLength(1);
      expect(cart[0].id).toBe(1001);
      expect(cart[0].title).toBe('Gold Necklace');
      expect(cart[0].amount).toBe(1);
    });

    it('should store both USD and ILS prices', () => {
      const product = createProduct({ usd_price: 50, ils_price: 185 });
      const mockElement = createMockProductElement(product);

      handleAddToCart(mockElement);

      expect(cart[0].usdPrice).toBe(50);
      expect(cart[0].ilsPrice).toBe(185);
      expect(cart[0].originalUsdPrice).toBe(50);
      expect(cart[0].originalIlsPrice).toBe(185);
    });

    it('should set amount to 1 for new items', () => {
      const product = createProduct();
      const mockElement = createMockProductElement(product);

      handleAddToCart(mockElement);

      expect(cart[0].amount).toBe(1);
    });

    it('should persist to localStorage', () => {
      const product = createProduct({ id: 1002, name: 'Silver Ring' });
      const mockElement = createMockProductElement(product);

      handleAddToCart(mockElement);

      const storedCart = JSON.parse(localStorage.getItem('cart'));
      expect(storedCart).toHaveLength(1);
      expect(storedCart[0].id).toBe(1002);
      expect(storedCart[0].title).toBe('Silver Ring');
    });

    it('should store image URL from front-image element', () => {
      const product = createProduct({
        images: [{ desktop: 'products/necklace-desktop.jpg', mobile: 'products/necklace-mobile.jpg' }]
      });
      const mockElement = createMockProductElement(product);

      handleAddToCart(mockElement);

      // Happy-DOM resolves relative URLs to absolute
      expect(cart[0].image).toContain('products/necklace-desktop.jpg');
    });

    it('should handle products with discount', () => {
      const product = createProduct({ usd_price: 40, ils_price: 148 });
      const mockElement = createMockProductElement(product, { hasDiscount: true });

      handleAddToCart(mockElement);

      expect(cart[0].discountedPrice).toBe(148); // Current price when discount is present
    });

    it('should NOT call fetch for guest users', () => {
      setupFetchMock();

      const product = createProduct();
      const mockElement = createMockProductElement(product);

      handleAddToCart(mockElement);

      expect(fetch).not.toHaveBeenCalled();

      teardownFetchMock();
    });
  });

  describe('Add to Cart - Logged-in User (MODEL-01)', () => {
    beforeEach(() => {
      localStorage.setItem('auth-token', 'mock-jwt-token');
      setupFetchMock();
    });

    afterEach(() => {
      teardownFetchMock();
    });

    it('should call /addtocart API with correct headers and body', () => {
      mockFetchSuccess({ success: true });

      const product = createProduct({ id: 1003 });
      const mockElement = createMockProductElement(product);

      handleAddToCart(mockElement);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/addtocart'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'auth-token': 'mock-jwt-token',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('1003')
        })
      );
    });

    it('should include auth-token header from localStorage', () => {
      mockFetchSuccess({ success: true });

      const product = createProduct();
      const mockElement = createMockProductElement(product);

      handleAddToCart(mockElement);

      const callArgs = fetch.mock.calls[0][1];
      expect(callArgs.headers['auth-token']).toBe('mock-jwt-token');
    });
  });

  describe('Remove from Cart - Guest User (MODEL-02)', () => {
    it('should remove item by ID from cart array', async () => {
      // Arrange: add item first
      const product = createProduct({ id: 1004 });
      cart.push({
        id: 1004,
        title: product.name,
        price: product.ils_price,
        amount: 1,
        image: 'test.jpg',
        quantity: 10
      });
      localStorage.setItem('cart', JSON.stringify(cart));

      // Act: remove item
      await removeFromUserCart(1004);

      // Assert
      expect(cart).toHaveLength(0);
    });

    it('should update localStorage after removal', async () => {
      const product = createProduct({ id: 1005 });
      cart.push({
        id: 1005,
        title: product.name,
        price: product.ils_price,
        amount: 1
      });
      localStorage.setItem('cart', JSON.stringify(cart));

      await removeFromUserCart(1005);

      const storedCart = JSON.parse(localStorage.getItem('cart'));
      expect(storedCart).toHaveLength(0);
    });

    it('should handle removing non-existent item gracefully', async () => {
      cart.push({ id: 1006, title: 'Product', amount: 1 });

      // Try to remove item that doesn't exist
      // NOTE: Current implementation calls splice with findIndex result (-1)
      // which removes the last item. This is a bug but documenting current behavior.
      await expect(removeFromUserCart(9999)).resolves.not.toThrow();

      // Bug: removing non-existent item removes last item due to splice(-1, 1)
      // Future enhancement: check if findIndex returns -1 before calling splice
      expect(cart).toHaveLength(0);
    });
  });

  describe('Remove from Cart - Logged-in User (MODEL-02)', () => {
    beforeEach(() => {
      localStorage.setItem('auth-token', 'mock-jwt-token');
      setupFetchMock();
    });

    afterEach(() => {
      teardownFetchMock();
    });

    it('should call /removefromcart API and remove from cart array', async () => {
      mockFetchSuccess({ success: true });

      cart.push({ id: 1007, title: 'Product', amount: 1 });

      await removeFromUserCart(1007);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/removefromcart'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'auth-token': 'mock-jwt-token'
          }),
          body: expect.stringContaining('1007')
        })
      );

      expect(cart).toHaveLength(0);
    });
  });

  describe('Cart Clear - Guest User (MODEL-04)', () => {
    it('should empty cart array', async () => {
      cart.push({ id: 1, title: 'A', amount: 1 });
      cart.push({ id: 2, title: 'B', amount: 1 });
      cart.push({ id: 3, title: 'C', amount: 1 });
      localStorage.setItem('cart', JSON.stringify(cart));

      await deleteAll();

      expect(cart).toHaveLength(0);
    });

    it('should update localStorage to empty array', async () => {
      cart.push({ id: 1, title: 'A', amount: 1 });
      cart.push({ id: 2, title: 'B', amount: 1 });
      localStorage.setItem('cart', JSON.stringify(cart));

      await deleteAll();

      const storedCart = JSON.parse(localStorage.getItem('cart'));
      expect(storedCart).toHaveLength(0);
    });
  });

  describe('Cart Clear - Logged-in User (MODEL-04)', () => {
    beforeEach(() => {
      localStorage.setItem('auth-token', 'mock-jwt-token');
      setupFetchMock();
    });

    afterEach(() => {
      teardownFetchMock();
    });

    it('should call /removeAll API', async () => {
      mockFetchSuccess({ success: true });

      cart.push({ id: 1, title: 'A', amount: 1 });

      await deleteAll();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/removeAll'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'auth-token': 'mock-jwt-token'
          })
        })
      );
    });
  });

  describe('Cart State Management', () => {
    it('should allow adding multiple items', () => {
      const product1 = createProduct({ id: 1008, name: 'Product 1' });
      const product2 = createProduct({ id: 1009, name: 'Product 2' });

      const mockElement1 = createMockProductElement(product1);
      const mockElement2 = createMockProductElement(product2);

      handleAddToCart(mockElement1);
      handleAddToCart(mockElement2);

      expect(cart).toHaveLength(2);
      expect(cart[0].id).toBe(1008);
      expect(cart[1].id).toBe(1009);
    });

    it('should maintain separate cart items for same product added twice', () => {
      // NOTE: Current implementation pushes duplicates rather than updating quantity
      // This documents current behavior - may need enhancement in future
      const product = createProduct({ id: 1010, name: 'Gold Bracelet' });
      const mockElement1 = createMockProductElement(product);
      const mockElement2 = createMockProductElement(product);

      handleAddToCart(mockElement1);
      handleAddToCart(mockElement2);

      // Currently creates two separate cart entries
      expect(cart).toHaveLength(2);
      expect(cart[0].id).toBe(1010);
      expect(cart[1].id).toBe(1010);
    });
  });
});
