/**
 * Checkout View Tests (PAGE-09, PAGE-10)
 *
 * Tests checkout payment flow and order summary rendering:
 * - PAGE-09: Checkout view renders payment method selection (Stripe checkout button)
 * - PAGE-10: Checkout view displays order summary with correct totals matching cart
 * - Stripe checkout session creation with correct request body
 * - USD prices always sent to Stripe regardless of display currency
 *
 * NOTE: Checkout is NOT a separate view - it's part of CartView.
 * The checkout button lives in the cart page and is managed by CartView._addHandlerCheckout()
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '../helpers/dom.js';
import * as model from '../../js/model.js';
import cartView from '../../js/Views/cartView.js';

describe('Checkout Payment and Order Summary', () => {
  let originalEnv;
  let fetchMock;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };

    // Mock environment variables
    process.env.API_URL = 'http://localhost:4000';
    process.env.USD_ILS_RATE = '3.7';

    // Mock fetch globally
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Render DOM fixture required by CartView BEFORE import
    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>
      <div class="cart-items-container">
        <div class="added-items"></div>
        <div class="cart-empty">Your Cart Is Empty</div>
        <h2 class="cart-title">Your Cart</h2>
        <h3 class="summary-title">Order Summary</h3>
        <div class="summary-details"></div>
        <button id="stripe-checkout-btn">Checkout</button>
        <button class="delete-all">Delete All</button>
        <div class="check-me-out">Check Me Out With:</div>
        <div class="summary"></div>
        <div id="paypal"></div>
      </div>
    `);

    // Re-assign CartView DOM element references to the new fixture
    cartView._parentElement = document.querySelector('.cart-items-container');
    cartView._cartEmpty = document.querySelector('.cart-empty');
    cartView._cartTitle = document.querySelector('.cart-title');
    cartView._summaryTitle = document.querySelector('.summary-title');
    cartView._itemsBox = document.querySelector('.added-items');
    cartView._summaryDetails = document.querySelector('.summary-details');
    cartView._checkoutBtn = document.querySelector('#stripe-checkout-btn');
    cartView._deleteAllBtn = document.querySelector('.delete-all');
    cartView._checkMeOut = document.querySelector('.check-me-out');
    cartView._orderSummaryContainer = document.querySelector('.summary');

    // Clear model.cart array
    model.cart.length = 0;

    // Mock model functions
    vi.spyOn(model, 'checkCartNumber').mockImplementation(() => model.cart.length);
    vi.spyOn(model, 'getGlobalDiscount').mockResolvedValue({ active: false, percentage: 0 });
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;

    // Reset currency persistence flag
    delete window.__currencyPersistenceInitialized;

    // Clear mocks
    vi.restoreAllMocks();
    delete global.fetch;
  });

  describe('Payment Method Selection (PAGE-09)', () => {
    it('should render Stripe checkout button', () => {
      const checkoutBtn = document.getElementById('stripe-checkout-btn');
      expect(checkoutBtn).toBeTruthy();
      expect(checkoutBtn.textContent).toBe('Checkout');
    });

    it('should show "Check Me Out With:" label', () => {
      const checkMeOut = document.querySelector('.check-me-out');
      expect(checkMeOut).toBeTruthy();
      expect(checkMeOut.textContent).toBe('Check Me Out With:');
    });

    it('should have checkout button visible when cart has items', async () => {
      // Add item to cart
      model.cart.push({
        id: 'product-123',
        title: 'Gold Necklace',
        usdPrice: 50,
        ilsPrice: 185,
        price: 185,
        amount: 1,
        currency: '₪'
      });

      // Render cart
      await cartView.render(1);
      await cartView._renderSummary(1, 'eng');

      const checkoutBtn = document.getElementById('stripe-checkout-btn');
      expect(checkoutBtn.classList.contains('remove')).toBe(false);
    });
  });

  describe('Order Summary with Totals (PAGE-10)', () => {
    it('should display subtotal matching sum of cart item prices', async () => {
      // Add 2 items to cart
      model.cart.push(
        {
          id: 'product-123',
          title: 'Gold Necklace',
          usdPrice: 50,
          ilsPrice: 185,
          price: 185,
          originalPrice: 185,
          originalUsdPrice: 50,
          originalIlsPrice: 185,
          amount: 1,
          currency: '₪'
        },
        {
          id: 'product-456',
          title: 'Silver Bracelet',
          usdPrice: 40,
          ilsPrice: 148,
          price: 148,
          originalPrice: 148,
          originalUsdPrice: 40,
          originalIlsPrice: 148,
          amount: 1,
          currency: '₪'
        }
      );

      // Set currency to ILS
      localStorage.setItem('currency', 'ils');

      // Render cart and summary
      await cartView.render(2);
      await cartView._renderSummary(2, 'eng');

      // Verify total price element exists and shows correct sum (185 + 148 = 333)
      const totalPrice = document.querySelector('.total-price');
      expect(totalPrice).toBeTruthy();
      expect(totalPrice.textContent).toContain('333');
      expect(totalPrice.textContent).toContain('₪');
    });

    it('should show "Calculated at checkout" for shipping', async () => {
      // Add item to cart
      model.cart.push({
        id: 'product-123',
        title: 'Gold Necklace',
        usdPrice: 50,
        ilsPrice: 185,
        price: 185,
        originalPrice: 185,
        originalUsdPrice: 50,
        originalIlsPrice: 185,
        amount: 1,
        currency: '₪'
      });

      // Render cart and summary
      await cartView.render(1);
      await cartView._renderSummary(1, 'eng');

      // Check for shipping line - look for the shipping text in the summary
      const summaryDetails = document.querySelector('.summary-details');
      expect(summaryDetails).toBeTruthy();

      const summaryHTML = summaryDetails.innerHTML;
      expect(summaryHTML).toContain('Shipping');
      expect(summaryHTML).toContain('Calculated at checkout');
    });

    it('should display discount line when global discount is active', async () => {
      // Mock active discount
      model.getGlobalDiscount.mockResolvedValue({ active: true, percentage: 10 });

      // Add item to cart with original price
      model.cart.push({
        id: 'product-123',
        title: 'Gold Necklace',
        usdPrice: 45, // Discounted
        ilsPrice: 167, // Discounted
        originalUsdPrice: 50,
        originalIlsPrice: 185,
        price: 167,
        originalPrice: 185,
        amount: 1,
        currency: '₪'
      });

      // Set currency to ILS
      localStorage.setItem('currency', 'ils');

      // Render cart and summary
      await cartView.render(1);
      await cartView._renderSummary(1, 'eng');

      // Check for discount indicators in the rendered summary
      const summaryDetails = document.querySelector('.summary-details');
      expect(summaryDetails).toBeTruthy();

      const summaryHTML = summaryDetails.innerHTML;
      // Verify discount line appears
      expect(summaryHTML).toContain('Discount');
      expect(summaryHTML).toContain('-10%');
      // Verify original price appears
      expect(summaryHTML).toContain('185');
      // Verify discounted price appears
      expect(summaryHTML).toContain('167');
    });

    it('should hide order summary when cart is empty', async () => {
      // Ensure cart is empty
      model.cart.length = 0;

      // Render empty cart
      await cartView.render(0);

      const summaryContainer = document.querySelector('.summary');
      expect(summaryContainer).toBeTruthy();
      expect(summaryContainer.classList.contains('remove')).toBe(true);
    });
  });

  describe('Stripe Checkout Trigger', () => {
    it('should POST to /create-checkout-session when checkout button clicked', async () => {
      // Add item to cart
      const cartItem = {
        id: 'product-123',
        title: 'Gold Necklace',
        usdPrice: 50,
        ilsPrice: 185,
        price: 185,
        originalPrice: 185,
        amount: 1,
        currency: '₪'
      };
      model.cart.push(cartItem);

      // Mock fetch response
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.stripe.com/test-session' })
      });

      // Mock window.location setter
      delete window.location;
      window.location = { href: '' };
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { href: '' }
      });

      // Attach checkout handler
      cartView._addHandlerCheckout(model.cart);

      // Click checkout button
      const checkoutBtn = document.getElementById('stripe-checkout-btn');
      checkoutBtn.click();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify fetch was called with correct URL and method
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/create-checkout-session',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
    });

    it('should send items with USD prices to Stripe regardless of display currency', async () => {
      // Add items to cart with ILS as display currency
      model.cart.push(
        {
          id: 'product-123',
          title: 'Gold Necklace',
          usdPrice: 50,
          ilsPrice: 185,
          price: 185, // Display price in ILS
          originalPrice: 185,
          originalUsdPrice: 50,
          originalIlsPrice: 185,
          amount: 1,
          currency: '₪' // Display currency is ILS
        },
        {
          id: 'product-456',
          title: 'Silver Bracelet',
          usdPrice: 40,
          ilsPrice: 148,
          price: 148,
          originalPrice: 148,
          originalUsdPrice: 40,
          originalIlsPrice: 148,
          amount: 1,
          currency: '₪'
        }
      );

      // Set display currency to ILS
      localStorage.setItem('currency', 'ils');

      // Mock fetch response
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.stripe.com/test-session' })
      });

      // Mock window.location
      delete window.location;
      window.location = { href: '' };

      // Attach checkout handler
      cartView._addHandlerCheckout(model.cart);

      // Click checkout button
      const checkoutBtn = document.getElementById('stripe-checkout-btn');
      checkoutBtn.click();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify request body contains USD prices and currency
      const fetchCall = fetchMock.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      // Check that currency is always '$' for Stripe
      expect(requestBody.currency).toBe('$');

      // Check that items have USD prices
      expect(requestBody.items).toHaveLength(2);
      expect(requestBody.items[0].price).toBe(50); // USD price
      expect(requestBody.items[0].currency).toBe('$');
      expect(requestBody.items[1].price).toBe(40); // USD price
      expect(requestBody.items[1].currency).toBe('$');
    });

    it('should redirect to Stripe URL on successful response', async () => {
      // Add item to cart
      model.cart.push({
        id: 'product-123',
        title: 'Gold Necklace',
        usdPrice: 50,
        ilsPrice: 185,
        price: 185,
        amount: 1,
        currency: '₪'
      });

      const testStripeUrl = 'https://checkout.stripe.com/test-session-xyz';

      // Mock fetch response with Stripe URL
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ url: testStripeUrl })
      });

      // Mock window.location
      const locationMock = { href: '' };
      delete window.location;
      Object.defineProperty(window, 'location', {
        writable: true,
        value: locationMock
      });

      // Attach checkout handler
      cartView._addHandlerCheckout(model.cart);

      // Click checkout button
      const checkoutBtn = document.getElementById('stripe-checkout-btn');
      checkoutBtn.click();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify window.location was set to Stripe URL
      expect(window.location).toBe(testStripeUrl);
    });
  });
});
