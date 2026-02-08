/**
 * Cart View Tests (PAGE-01 through PAGE-04)
 *
 * Tests CartView rendering accuracy for core e-commerce requirements:
 * - PAGE-01: Cart items display correct product names
 * - PAGE-02: Cart items show correct quantities
 * - PAGE-03: Cart displays prices in current currency (USD/ILS)
 * - PAGE-04: Cart total calculates correctly as sum of (price x amount)
 * - Empty cart state handling
 * - Currency switching re-renders prices
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '../helpers/dom.js';
import * as model from '../../js/model.js';
import cartView from '../../js/Views/cartView.js';

describe('Cart View Display and Totals', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };

    // Mock environment variables
    process.env.API_URL = 'http://localhost:3001';
    process.env.USD_ILS_RATE = '3.7';

    // Render DOM fixture required by CartView
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
  });

  describe('Cart Item Display (PAGE-01, PAGE-02, PAGE-03)', () => {
    it('should display cart items with correct product names', () => {
      // Populate cart with 2 items
      model.cart.push(
        {
          id: 'product-123',
          title: 'Gold Necklace',
          image: 'https://example.com/gold-necklace.jpg',
          price: 185,
          usdPrice: 50,
          ilsPrice: 185,
          originalPrice: 185,
          originalUsdPrice: 50,
          originalIlsPrice: 185,
          discountedPrice: null,
          amount: 1,
          quantity: 10,
          currency: '₪'
        },
        {
          id: 'product-456',
          title: 'Silver Bracelet',
          image: 'https://example.com/silver-bracelet.jpg',
          price: 150,
          usdPrice: 40,
          ilsPrice: 150,
          originalPrice: 150,
          originalUsdPrice: 40,
          originalIlsPrice: 150,
          discountedPrice: null,
          amount: 1,
          quantity: 5,
          currency: '₪'
        }
      );

      localStorage.setItem('currency', 'ils');
      cartView.render(2);

      // Verify product titles appear in DOM
      const itemTitles = document.querySelectorAll('.item-title');
      expect(itemTitles).toHaveLength(2);
      expect(itemTitles[0].textContent).toBe('Gold Necklace');
      expect(itemTitles[1].textContent).toBe('Silver Bracelet');
    });

    it('should show correct quantity for each item', () => {
      model.cart.push(
        {
          id: 'product-789',
          title: 'Ring',
          image: 'https://example.com/ring.jpg',
          price: 100,
          usdPrice: 27,
          ilsPrice: 100,
          originalPrice: 100,
          originalUsdPrice: 27,
          originalIlsPrice: 100,
          discountedPrice: null,
          amount: 2,  // Quantity is 2
          quantity: 10,
          currency: '₪'
        }
      );

      localStorage.setItem('currency', 'ils');
      cartView.render(1);

      // Verify quantity input shows correct value
      const quantityInput = document.querySelector('.cart-qty__input');
      expect(quantityInput).toBeTruthy();
      expect(quantityInput.value).toBe('2');
    });

    it('should display prices in USD when USD currency selected', () => {
      model.cart.push({
        id: 'product-101',
        title: 'Earrings',
        image: 'https://example.com/earrings.jpg',
        price: 50,
        usdPrice: 50,
        ilsPrice: 185,
        originalPrice: 50,
        originalUsdPrice: 50,
        originalIlsPrice: 185,
        discountedPrice: null,
        amount: 1,
        quantity: 10,
        currency: '$'
      });

      localStorage.setItem('currency', 'usd');
      cartView.render(1);

      // Verify $ symbol appears
      const itemPrice = document.querySelector('.item-price');
      expect(itemPrice).toBeTruthy();
      expect(itemPrice.textContent).toContain('$');
      expect(itemPrice.textContent).toContain('50');
    });

    it('should display prices in ILS when ILS currency selected', () => {
      model.cart.push({
        id: 'product-202',
        title: 'Pendant',
        image: 'https://example.com/pendant.jpg',
        price: 185,
        usdPrice: 50,
        ilsPrice: 185,
        originalPrice: 185,
        originalUsdPrice: 50,
        originalIlsPrice: 185,
        discountedPrice: null,
        amount: 1,
        quantity: 10,
        currency: '₪'
      });

      localStorage.setItem('currency', 'ils');
      cartView.render(1);

      // Verify ₪ symbol appears
      const itemPrice = document.querySelector('.item-price');
      expect(itemPrice).toBeTruthy();
      expect(itemPrice.textContent).toContain('₪');
      expect(itemPrice.textContent).toContain('185');
    });

    it('should display both USD and ILS price fields from stored dual-currency data', () => {
      model.cart.push({
        id: 'product-303',
        title: 'Bracelet',
        image: 'https://example.com/bracelet.jpg',
        price: 185,
        usdPrice: 50,
        ilsPrice: 185,
        originalPrice: 185,
        originalUsdPrice: 50,
        originalIlsPrice: 185,
        discountedPrice: null,
        amount: 1,
        quantity: 10,
        currency: '₪'
      });

      // Test with ILS
      localStorage.setItem('currency', 'ils');
      cartView.render(1);
      let itemPrice = document.querySelector('.item-price');
      expect(itemPrice.textContent).toContain('₪185');

      // Clear and test with USD
      document.querySelector('.added-items').innerHTML = '';
      localStorage.setItem('currency', 'usd');
      cartView.render(1);
      itemPrice = document.querySelector('.item-price');
      expect(itemPrice.textContent).toContain('$50');
    });
  });

  describe('Cart Total Calculation (PAGE-04)', () => {
    it('should calculate correct total for single item', async () => {
      model.cart.push({
        id: 'product-401',
        title: 'Ring',
        image: 'https://example.com/ring.jpg',
        price: 100,
        usdPrice: 27,
        ilsPrice: 100,
        originalPrice: 100,
        originalUsdPrice: 27,
        originalIlsPrice: 100,
        discountedPrice: null,
        amount: 1,
        quantity: 10,
        currency: '₪'
      });

      localStorage.setItem('currency', 'ils');
      localStorage.setItem('language', 'eng');
      cartView.render(1);
      await cartView._renderSummary(1, 'eng');

      // Verify total shows in summary
      const totalPrice = document.querySelector('.total-price');
      expect(totalPrice).toBeTruthy();
      expect(totalPrice.textContent).toContain('100');
    });

    it('should calculate correct total across multiple items', async () => {
      model.cart.push(
        {
          id: 'product-501',
          title: 'Item 1',
          image: 'https://example.com/item1.jpg',
          price: 150,
          usdPrice: 40,
          ilsPrice: 150,
          originalPrice: 150,
          originalUsdPrice: 40,
          originalIlsPrice: 150,
          discountedPrice: null,
          amount: 1,
          quantity: 10,
          currency: '₪'
        },
        {
          id: 'product-502',
          title: 'Item 2',
          image: 'https://example.com/item2.jpg',
          price: 200,
          usdPrice: 54,
          ilsPrice: 200,
          originalPrice: 200,
          originalUsdPrice: 54,
          originalIlsPrice: 200,
          discountedPrice: null,
          amount: 1,
          quantity: 10,
          currency: '₪'
        }
      );

      localStorage.setItem('currency', 'ils');
      localStorage.setItem('language', 'eng');
      cartView.render(2);
      await cartView._renderSummary(2, 'eng');

      // Verify total is sum (150 + 200 = 350)
      const totalPrice = document.querySelector('.total-price');
      expect(totalPrice).toBeTruthy();
      expect(totalPrice.textContent).toContain('350');
    });

    it('should calculate total with discounted prices when discount active', async () => {
      // Mock global discount as active
      model.getGlobalDiscount.mockResolvedValue({ active: true, percentage: 20 });

      model.cart.push({
        id: 'product-601',
        title: 'Discounted Item',
        image: 'https://example.com/item.jpg',
        price: 80,  // Discounted from 100
        usdPrice: 22,
        ilsPrice: 80,
        originalPrice: 100,
        originalUsdPrice: 27,
        originalIlsPrice: 100,
        discountedPrice: 80,
        amount: 1,
        quantity: 10,
        currency: '₪'
      });

      localStorage.setItem('currency', 'ils');
      localStorage.setItem('language', 'eng');
      cartView.render(1);
      await cartView._renderSummary(1, 'eng');

      // Verify total uses discounted amount (80)
      const discountedPrice = document.querySelector('.discounted-price');
      expect(discountedPrice).toBeTruthy();
      expect(discountedPrice.textContent).toContain('80');
    });

    it('should show zero/empty when cart is empty', async () => {
      // Empty cart (cartNum = 0)
      localStorage.setItem('currency', 'ils');
      localStorage.setItem('language', 'eng');
      cartView.render(0);
      await cartView._renderSummary(0, 'eng');

      // Verify summary is empty or hidden
      const summaryDetails = document.querySelector('.summary-details');
      expect(summaryDetails.innerHTML).toBe('');
    });
  });

  describe('Empty Cart State', () => {
    it('should show empty cart message when cart has no items', () => {
      cartView.render(0);

      const cartEmpty = document.querySelector('.cart-empty');
      expect(cartEmpty).toBeTruthy();
      expect(cartEmpty.classList.contains('remove')).toBe(false);
    });

    it('should hide items box when cart is empty', () => {
      cartView.render(0);

      const itemsBox = document.querySelector('.added-items');
      expect(itemsBox).toBeTruthy();
      expect(itemsBox.classList.contains('remove')).toBe(true);
    });

    it('should hide delete all button when cart is empty', () => {
      cartView.render(0);

      const deleteAllBtn = document.querySelector('.delete-all');
      expect(deleteAllBtn).toBeTruthy();
      expect(deleteAllBtn.classList.contains('remove')).toBe(true);
      expect(deleteAllBtn.classList.contains('delete-all-active')).toBe(false);
    });

    it('should hide order summary when cart is empty', () => {
      cartView.render(0);

      const summary = document.querySelector('.summary');
      expect(summary).toBeTruthy();
      expect(summary.classList.contains('remove')).toBe(true);
    });
  });

  describe('Currency Switching', () => {
    it('should re-render with ILS prices after currency-changed event', () => {
      // Start with USD
      model.cart.push({
        id: 'product-701',
        title: 'Test Product',
        image: 'https://example.com/test.jpg',
        price: 50,
        usdPrice: 50,
        ilsPrice: 185,
        originalPrice: 50,
        originalUsdPrice: 50,
        originalIlsPrice: 185,
        discountedPrice: null,
        amount: 1,
        quantity: 10,
        currency: '$'
      });

      localStorage.setItem('currency', 'usd');
      cartView.render(1);

      // Verify USD price initially
      let itemPrice = document.querySelector('.item-price');
      expect(itemPrice.textContent).toContain('$50');

      // Switch currency and re-render (simulating what currency selector does)
      localStorage.setItem('currency', 'ils');
      document.querySelector('.added-items').innerHTML = ''; // Clear previous
      cartView.render(1);

      // Verify ILS price after re-render
      itemPrice = document.querySelector('.item-price');
      expect(itemPrice.textContent).toContain('₪185');
    });

    it('should re-render with USD prices after currency-changed event', () => {
      // Start with ILS
      model.cart.push({
        id: 'product-801',
        title: 'Test Product 2',
        image: 'https://example.com/test2.jpg',
        price: 185,
        usdPrice: 50,
        ilsPrice: 185,
        originalPrice: 185,
        originalUsdPrice: 50,
        originalIlsPrice: 185,
        discountedPrice: null,
        amount: 1,
        quantity: 10,
        currency: '₪'
      });

      localStorage.setItem('currency', 'ils');
      cartView.render(1);

      // Verify ILS price initially
      let itemPrice = document.querySelector('.item-price');
      expect(itemPrice.textContent).toContain('₪185');

      // Switch currency and re-render (simulating what currency selector does)
      localStorage.setItem('currency', 'usd');
      document.querySelector('.added-items').innerHTML = ''; // Clear previous
      cartView.render(1);

      // Verify USD price after re-render
      itemPrice = document.querySelector('.item-price');
      expect(itemPrice.textContent).toContain('$50');
    });
  });
});
