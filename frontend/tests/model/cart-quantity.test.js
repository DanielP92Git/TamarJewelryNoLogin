/**
 * Cart quantity mutator tests for increaseAmount / decreaseAmount (D-07 / D-08).
 *
 * Covers the shared model.cart mutations so the in-drawer quantity steppers and
 * the /cart page stay consistent (single source of truth, D-08).
 * Tests both guest (localStorage) and logged-in (server-sync) paths.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cart, increaseAmount, decreaseAmount } from '../../js/model.js';
import { setupFetchMock, teardownFetchMock, mockFetchSuccess } from '../helpers/mocks/fetch.js';

/** Helper: push a minimal cart line directly onto the shared array. */
function pushCartLine({ id = 1, amount = 1, quantity = 5 } = {}) {
  cart.push({
    id,
    title: `Product ${id}`,
    image: 'test.jpg',
    price: 100,
    originalPrice: 100,
    discountedPrice: null,
    usdPrice: 27,
    ilsPrice: 100,
    originalUsdPrice: 27,
    originalIlsPrice: 100,
    currency: '₪',
    quantity,
    amount,
    name_en: `Product ${id}`,
    name_he: `מוצר ${id}`,
  });
}

describe('Model: Cart Quantity Mutators (D-07/D-08)', () => {
  beforeEach(() => {
    cart.length = 0;
    localStorage.clear();
  });

  // ─── increaseAmount – Guest path ────────────────────────────────────────────

  describe('increaseAmount – Guest user', () => {
    it('increments amount by 1 and returns the new amount', async () => {
      pushCartLine({ id: 1, amount: 1, quantity: 5 });

      const result = await increaseAmount(1);

      expect(cart[0].amount).toBe(2);
      expect(result).toBe(2);
    });

    it('persists updated amount to localStorage', async () => {
      pushCartLine({ id: 2, amount: 1, quantity: 5 });

      await increaseAmount(2);

      const stored = JSON.parse(localStorage.getItem('cart'));
      expect(stored[0].amount).toBe(2);
    });

    it('does NOT exceed stock cap (amount stays at quantity)', async () => {
      pushCartLine({ id: 3, amount: 3, quantity: 3 });

      const result = await increaseAmount(3);

      expect(cart[0].amount).toBe(3);      // unchanged
      expect(result).toBe(3);             // returns current amount
    });

    it('returns undefined and leaves cart unchanged for unknown id', async () => {
      pushCartLine({ id: 4, amount: 1, quantity: 5 });

      const result = await increaseAmount(9999);

      expect(result).toBeUndefined();
      expect(cart[0].amount).toBe(1);
    });

    it('works with string id matching a numeric cart id (== coercion)', async () => {
      pushCartLine({ id: 10, amount: 1, quantity: 5 });

      const result = await increaseAmount('10');

      expect(cart[0].amount).toBe(2);
      expect(result).toBe(2);
    });
  });

  // ─── decreaseAmount – Guest path ────────────────────────────────────────────

  describe('decreaseAmount – Guest user', () => {
    it('decrements amount by 1 and returns the new amount', async () => {
      pushCartLine({ id: 5, amount: 3, quantity: 5 });

      const result = await decreaseAmount(5);

      expect(cart[0].amount).toBe(2);
      expect(result).toBe(2);
    });

    it('persists updated amount to localStorage', async () => {
      pushCartLine({ id: 6, amount: 2, quantity: 5 });

      await decreaseAmount(6);

      const stored = JSON.parse(localStorage.getItem('cart'));
      expect(stored[0].amount).toBe(1);
    });

    it('does NOT go below 1 (floor guard)', async () => {
      pushCartLine({ id: 7, amount: 1, quantity: 5 });

      const result = await decreaseAmount(7);

      expect(cart[0].amount).toBe(1);     // unchanged
      expect(result).toBe(1);            // returns current amount
    });

    it('returns undefined and leaves cart unchanged for unknown id', async () => {
      pushCartLine({ id: 8, amount: 2, quantity: 5 });

      const result = await decreaseAmount(9999);

      expect(result).toBeUndefined();
      expect(cart[0].amount).toBe(2);
    });

    it('works with string id matching a numeric cart id (== coercion)', async () => {
      pushCartLine({ id: 20, amount: 3, quantity: 5 });

      const result = await decreaseAmount('20');

      expect(cart[0].amount).toBe(2);
      expect(result).toBe(2);
    });
  });

  // ─── increaseAmount – Logged-in path ────────────────────────────────────────

  describe('increaseAmount – Logged-in user', () => {
    beforeEach(() => {
      localStorage.setItem('auth-token', 'mock-jwt-token');
      setupFetchMock();
    });

    afterEach(() => {
      localStorage.removeItem('auth-token');
      teardownFetchMock();
    });

    it('calls /addtocart with bare {itemId} for server sync', async () => {
      mockFetchSuccess('Added!');
      pushCartLine({ id: 11, amount: 1, quantity: 5 });

      await increaseAmount(11);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/addtocart'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'auth-token': 'mock-jwt-token',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('11'),
        })
      );
    });

    it('increments the local cart amount even when logged in', async () => {
      mockFetchSuccess('Added!');
      pushCartLine({ id: 12, amount: 2, quantity: 5 });

      await increaseAmount(12);

      expect(cart[0].amount).toBe(3);
    });

    it('does not crash when the server call fails (try/catch guard)', async () => {
      global.fetch.mockRejectedValueOnce(new TypeError('Network error'));
      pushCartLine({ id: 13, amount: 1, quantity: 5 });

      await expect(increaseAmount(13)).resolves.not.toThrow();

      // Local amount still incremented
      expect(cart[0].amount).toBe(2);
    });
  });

  // ─── decreaseAmount – Logged-in path (session-local only) ───────────────────

  describe('decreaseAmount – Logged-in user (session-local only)', () => {
    beforeEach(() => {
      localStorage.setItem('auth-token', 'mock-jwt-token');
      setupFetchMock();
    });

    afterEach(() => {
      localStorage.removeItem('auth-token');
      teardownFetchMock();
    });

    it('decrements local amount without a server call (disclosed limitation)', async () => {
      pushCartLine({ id: 14, amount: 3, quantity: 5 });

      await decreaseAmount(14);

      // Local decrement applied
      expect(cart[0].amount).toBe(2);
    });
  });

  // ─── Stock cap boundary ──────────────────────────────────────────────────────

  describe('Stock-cap and floor edge cases', () => {
    it('increaseAmount at exactly one below cap advances correctly', async () => {
      pushCartLine({ id: 15, amount: 4, quantity: 5 });

      const result = await increaseAmount(15);

      expect(cart[0].amount).toBe(5);
      expect(result).toBe(5);
    });

    it('increaseAmount at cap refuses a further increment', async () => {
      pushCartLine({ id: 16, amount: 5, quantity: 5 });

      const result = await increaseAmount(16);

      expect(cart[0].amount).toBe(5);    // unchanged
      expect(result).toBe(5);
    });

    it('decreaseAmount from 2 goes to 1', async () => {
      pushCartLine({ id: 17, amount: 2, quantity: 5 });

      const result = await decreaseAmount(17);

      expect(cart[0].amount).toBe(1);
      expect(result).toBe(1);
    });

    it('decreaseAmount from 1 stays at 1 (never auto-removes)', async () => {
      pushCartLine({ id: 18, amount: 1, quantity: 5 });
      const beforeLength = cart.length;

      const result = await decreaseAmount(18);

      expect(cart[0].amount).toBe(1);   // unchanged
      expect(result).toBe(1);
      expect(cart.length).toBe(beforeLength); // item not removed
    });
  });
});
