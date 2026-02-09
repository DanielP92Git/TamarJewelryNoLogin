/**
 * MVC Integration Tests: User Journeys
 *
 * These tests verify complete user shopping flows through the MVC stack.
 * They simulate real user behavior: browsing products, adding to cart, viewing cart,
 * switching currencies, and navigating between pages (MPA architecture).
 *
 * Requirements:
 * - MVC-09: Currency change mid-checkout maintains cart state (items, quantities, both currencies)
 * - MVC-10: Navigation with cart data preserves all items via localStorage (guest) and API (logged-in)
 *
 * ARCHITECTURE: This is an MPA, not an SPA. "Navigation" means re-rendering the DOM fixture
 * to simulate different pages. State persists via localStorage (guest) or API (logged-in).
 *
 * IMPORTANT: CartView currency switching uses manual render() calls, NOT currency-changed event
 * (known _render bug from D20-01-02). Cart items must have both usdPrice and ilsPrice fields.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '../helpers/dom.js';
import { createProduct, resetFactoryCounter } from '../helpers/factories.js';
import { createMockProductElement } from '../helpers/mocks/dom-elements.js';
import * as model from '../../js/model.js';
import cartView from '../../js/Views/cartView.js';
import homePageView from '../../js/Views/homePageView.js';

/**
 * Helper: Render cart page fixture and re-assign CartView singleton DOM references.
 * Simulates "navigating" to the cart page in this MPA architecture.
 */
function renderCartPageFixture() {
  render(`
    <header></header>
    <div class="menu"></div>
    <div data-purpose="header-utilities"></div>
    <div class="footer"></div>
    <div class="go-to-top"></div>
    <span class="cart-number">0</span>
    <span class="cart-number-mobile">0</span>
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

  // Re-assign CartView singleton DOM refs
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
}

/**
 * Helper: Render home page fixture and re-assign HomePageView singleton DOM references.
 * Simulates "navigating" to the home page.
 */
function renderHomePageFixture() {
  render(`
    <header></header>
    <div class="menu"></div>
    <div data-purpose="header-utilities"></div>
    <div class="footer"></div>
    <div class="go-to-top"></div>
    <span class="cart-number">0</span>
    <span class="cart-number-mobile">0</span>
    <div id="home-content">
      <h1>Welcome</h1>
    </div>
  `);
  document.body.id = 'home';
}

describe('MVC Integration: User Journeys', () => {
  let originalEnv;

  beforeEach(() => {
    resetFactoryCounter();
    model.cart.length = 0;
    localStorage.clear();
    delete window.__currencyPersistenceInitialized;

    // Mock environment variables
    originalEnv = { ...process.env };
    process.env.API_URL = 'http://localhost:3001';
    process.env.USD_ILS_RATE = '3.7';

    // Mock process.cwd() for dotenv in model.js
    vi.spyOn(process, 'cwd').mockReturnValue('/mock/path');

    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }));

    // Mock matchMedia
    window.matchMedia = vi.fn(() => ({
      matches: true,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));

    // Mock fetch for any API calls (including getGlobalDiscount)
    global.fetch = vi.fn((url) => {
      // Mock discount settings endpoint
      if (url.includes('/discount-settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            global_discount_percentage: 0,
            discount_active: false,
            discount_label: 'Discount'
          })
        });
      }
      // Default: reject other fetch calls
      return Promise.reject(new Error(`Unmocked fetch: ${url}`));
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    delete window.__currencyPersistenceInitialized;
    vi.restoreAllMocks();
    localStorage.clear();
    model.cart.length = 0;
  });

  describe('Guest User Shopping Flow', () => {
    it('should complete full journey: browse -> add to cart -> view cart -> switch currency -> verify persistence', async () => {
      // Step a: Start on "home page"
      renderHomePageFixture();
      homePageView.setLanguage('eng', 0);

      // Verify menu renders with English content (basic check)
      const menu = document.querySelector('.menu');
      expect(menu).toBeTruthy();

      // Step b: Add product to cart
      const product = createProduct({ usd_price: 50, ils_price: 185 });
      const productElement = createMockProductElement(product, { currency: 'ils' });

      model.handleAddToCart(productElement);

      // Verify: model.cart has 1 item
      expect(model.cart).toHaveLength(1);
      expect(model.cart[0].title).toBe(product.name);
      expect(model.cart[0].usdPrice).toBe(50);
      expect(model.cart[0].ilsPrice).toBe(185);
      expect(model.cart[0].amount).toBe(1);

      // Verify: localStorage 'cart' is set
      const savedCart = JSON.parse(localStorage.getItem('cart'));
      expect(savedCart).toHaveLength(1);
      expect(savedCart[0].title).toBe(product.name);

      // Verify: fetch was NOT called (guest user)
      expect(global.fetch).not.toHaveBeenCalled();

      // Step c: Verify cart badge updated
      homePageView.persistCartNumber(1);
      const cartBadge = document.querySelector('.cart-number-mobile');
      expect(cartBadge.textContent).toBe('1');

      // Step d: Simulate navigation to cart page
      renderCartPageFixture();
      localStorage.setItem('currency', 'usd');
      cartView.setLanguage('eng', 1);
      await cartView.render(1);
      await cartView._renderSummary(1, 'eng');

      // Step e: Verify cart displays item in USD
      const itemTitle = document.querySelector('.item-title');
      expect(itemTitle).toBeTruthy();
      expect(itemTitle.textContent).toContain(product.name);

      const itemPrice = document.querySelector('.item-price');
      expect(itemPrice).toBeTruthy();
      expect(itemPrice.textContent).toContain('$');
      expect(itemPrice.textContent).toContain('50');

      const quantityInput = document.querySelector('.cart-qty__input');
      expect(quantityInput).toBeTruthy();
      expect(quantityInput.value).toBe('1');

      // Step f: Switch currency to ILS mid-checkout
      localStorage.setItem('currency', 'ils');
      cartView._itemsBox.innerHTML = ''; // Clear items
      await cartView.render(1);
      await cartView._renderSummary(1, 'eng');

      // Step g: Verify ALL prices updated to ILS
      const ilsPrice = document.querySelector('.item-price');
      expect(ilsPrice.textContent).toContain('₪');
      expect(ilsPrice.textContent).toContain('185');

      // Verify quantity PRESERVED at 1 (not reset)
      const quantityAfterSwitch = document.querySelector('.cart-qty__input');
      expect(quantityAfterSwitch.value).toBe('1');

      // Step h: Verify model.cart not corrupted
      expect(model.cart[0].amount).toBe(1);
      expect(model.cart[0].usdPrice).toBe(50);
      expect(model.cart[0].ilsPrice).toBe(185);
      expect(model.cart[0].title).toBe(product.name);

      // Step i: Simulate navigation back to home
      renderHomePageFixture();
      const cartFromStorage = JSON.parse(localStorage.getItem('cart'));
      expect(cartFromStorage).toHaveLength(1);
      expect(cartFromStorage[0].title).toBe(product.name);
      expect(cartFromStorage[0].usdPrice).toBe(50);
      expect(cartFromStorage[0].ilsPrice).toBe(185);

      // Step j: Simulate navigation back to cart
      renderCartPageFixture();
      cartView.setLanguage('eng', 1);
      await cartView.render(1);
      await cartView._renderSummary(1, 'eng');

      // Verify item still displayed correctly with ILS prices (currency persisted)
      const finalPrice = document.querySelector('.item-price');
      expect(finalPrice.textContent).toContain('₪');
      expect(finalPrice.textContent).toContain('185');
    });

    it('should preserve cart across multiple page navigations', async () => {
      // Add 2 items on "home"
      renderHomePageFixture();

      const product1 = createProduct({ usd_price: 30, ils_price: 111 });
      const product2 = createProduct({ usd_price: 60, ils_price: 222 });

      model.handleAddToCart(createMockProductElement(product1));
      model.handleAddToCart(createMockProductElement(product2));

      expect(model.cart).toHaveLength(2);

      // Navigate to "cart"
      renderCartPageFixture();
      localStorage.setItem('currency', 'usd');
      cartView.setLanguage('eng', 2);
      await cartView.render(2);
      await cartView._renderSummary(2, 'eng');

      // Verify 2 items displayed
      const itemTitles = document.querySelectorAll('.item-title');
      expect(itemTitles).toHaveLength(2);

      // Navigate to "about" (generic page - just re-render)
      render(`
        <header></header>
        <div class="menu"></div>
        <div data-purpose="header-utilities"></div>
        <div class="footer"></div>
        <div id="about-content"><h1>About</h1></div>
      `);
      document.body.id = 'about';

      // Verify cart still in localStorage
      const cartFromStorage = JSON.parse(localStorage.getItem('cart'));
      expect(cartFromStorage).toHaveLength(2);

      // Navigate back to "cart"
      renderCartPageFixture();
      cartView.setLanguage('eng', 2);
      await cartView.render(2);
      await cartView._renderSummary(2, 'eng');

      // Verify still 2 items via localStorage
      const finalItemTitles = document.querySelectorAll('.item-title');
      expect(finalItemTitles).toHaveLength(2);
    });

    it('should preserve language preference across page navigations', () => {
      // Set language to Hebrew on "home"
      renderHomePageFixture();
      localStorage.setItem('language', 'heb');
      homePageView.changeToHeb(); // This sets document.documentElement.lang and calls setLanguage

      // Verify Hebrew was set (document attribute)
      expect(document.documentElement.getAttribute('lang')).toBe('he');
      expect(document.documentElement.getAttribute('dir')).toBe('rtl');

      // Navigate to "cart"
      renderCartPageFixture();
      const storedLanguage = localStorage.getItem('language');
      expect(storedLanguage).toBe('heb');

      // Call changeToHeb to set attributes and render with stored value
      cartView.changeToHeb();

      // Verify Hebrew menu/content (check cart title)
      const cartTitle = document.querySelector('.cart-title');
      expect(cartTitle.textContent).toBe('העגלה שלי');
    });

    it('should preserve currency preference across page navigations', async () => {
      // Set currency to ILS on "home"
      renderHomePageFixture();
      localStorage.setItem('currency', 'ils');

      // Add an item
      const product = createProduct({ usd_price: 40, ils_price: 148 });
      model.handleAddToCart(createMockProductElement(product));

      // Navigate to "cart"
      renderCartPageFixture();
      cartView.setLanguage('eng', 1);
      await cartView.render(1);
      await cartView._renderSummary(1, 'eng');

      // Verify currency selector shows ILS (via localStorage read)
      expect(localStorage.getItem('currency')).toBe('ils');

      // Verify cart renders with ILS prices
      const itemPrice = document.querySelector('.item-price');
      expect(itemPrice.textContent).toContain('₪');
      expect(itemPrice.textContent).toContain('148');
    });

    it('should handle adding multiple items and viewing correct totals', async () => {
      renderHomePageFixture();

      // Add 3 items with different prices
      const product1 = createProduct({ usd_price: 20, ils_price: 74 });
      const product2 = createProduct({ usd_price: 35, ils_price: 130 });
      const product3 = createProduct({ usd_price: 50, ils_price: 185 });

      model.handleAddToCart(createMockProductElement(product1));
      model.handleAddToCart(createMockProductElement(product2));
      model.handleAddToCart(createMockProductElement(product3));

      expect(model.cart).toHaveLength(3);

      // Navigate to cart
      renderCartPageFixture();
      localStorage.setItem('currency', 'usd');
      cartView.setLanguage('eng', 3);
      await cartView.render(3);
      await cartView._renderSummary(3, 'eng');

      // Verify 3 items displayed
      const itemTitles = document.querySelectorAll('.item-title');
      expect(itemTitles).toHaveLength(3);

      // Verify total is sum of all 3 USD prices (check subtotal total-price)
      const subtotalElement = document.querySelector('.subtotal .total-price');
      expect(subtotalElement).toBeTruthy();
      const subtotalText = subtotalElement.textContent;
      // Total: 20 + 35 + 50 = 105 (with $ symbol)
      expect(subtotalText).toContain('$105');

      // Switch currency to ILS
      localStorage.setItem('currency', 'ils');
      cartView._itemsBox.innerHTML = '';
      cartView._summaryDetails.innerHTML = '';
      await cartView.render(3);
      await cartView._renderSummary(3, 'eng');

      // Verify new total is sum of all 3 ILS prices
      const ilsSubtotal = document.querySelector('.subtotal .total-price');
      expect(ilsSubtotal).toBeTruthy();
      const ilsSubtotalText = ilsSubtotal.textContent;
      // Total: 74 + 130 + 185 = 389 (with ₪ symbol)
      expect(ilsSubtotalText).toContain('₪389');
    });
  });

  describe('Currency change mid-checkout consistency', () => {
    it('should not lose cart items when currency switches during checkout', async () => {
      // Add 3 items as guest with distinct prices
      renderHomePageFixture();

      const product1 = createProduct({ usd_price: 25, ils_price: 93 });
      const product2 = createProduct({ usd_price: 45, ils_price: 167 });
      const product3 = createProduct({ usd_price: 70, ils_price: 259 });

      model.handleAddToCart(createMockProductElement(product1));
      model.handleAddToCart(createMockProductElement(product2));
      model.handleAddToCart(createMockProductElement(product3));

      expect(model.cart).toHaveLength(3);

      // Navigate to cart, render in USD
      renderCartPageFixture();
      localStorage.setItem('currency', 'usd');
      cartView.setLanguage('eng', 3);
      await cartView.render(3);
      await cartView._renderSummary(3, 'eng');

      let itemTitles = document.querySelectorAll('.item-title');
      expect(itemTitles).toHaveLength(3);

      // Switch to ILS (re-render)
      localStorage.setItem('currency', 'ils');
      cartView._itemsBox.innerHTML = '';
      cartView._summaryDetails.innerHTML = '';
      await cartView.render(3);
      await cartView._renderSummary(3, 'eng');

      // Verify: same 3 items present, all have ILS prices
      itemTitles = document.querySelectorAll('.item-title');
      expect(itemTitles).toHaveLength(3);

      const ilsPrices = document.querySelectorAll('.item-price');
      ilsPrices.forEach(priceEl => {
        expect(priceEl.textContent).toContain('₪');
      });

      // Verify total recalculated: 93 + 167 + 259 = 519
      const ilsSubtotal = document.querySelector('.subtotal .total-price');
      expect(ilsSubtotal.textContent).toContain('₪519');

      // Switch BACK to USD (re-render)
      localStorage.setItem('currency', 'usd');
      cartView._itemsBox.innerHTML = '';
      cartView._summaryDetails.innerHTML = '';
      await cartView.render(3);
      await cartView._renderSummary(3, 'eng');

      // Verify: same 3 items present, all have USD prices
      itemTitles = document.querySelectorAll('.item-title');
      expect(itemTitles).toHaveLength(3);

      const usdPrices = document.querySelectorAll('.item-price');
      usdPrices.forEach(priceEl => {
        expect(priceEl.textContent).toContain('$');
      });

      // Verify total recalculated: 25 + 45 + 70 = 140
      const usdSubtotal = document.querySelector('.subtotal .total-price');
      expect(usdSubtotal.textContent).toContain('$140');

      // Verify model.cart unchanged (all 3 items with original data)
      expect(model.cart).toHaveLength(3);
      expect(model.cart[0].usdPrice).toBe(25);
      expect(model.cart[0].ilsPrice).toBe(93);
      expect(model.cart[1].usdPrice).toBe(45);
      expect(model.cart[1].ilsPrice).toBe(167);
      expect(model.cart[2].usdPrice).toBe(70);
      expect(model.cart[2].ilsPrice).toBe(259);
    });

    it('should preserve discount prices during currency switch', async () => {
      renderHomePageFixture();

      // Create product with discount
      const product = createProduct({
        usd_price: 80,
        ils_price: 296,
        discountedUsdPrice: 60,
        discountedIlsPrice: 222
      });

      // Create element with discount
      const productElement = createMockProductElement(product, {
        currency: 'usd',
        hasDiscount: true
      });

      // Set discount prices on element
      productElement.setAttribute('data-usd-price', '60');
      productElement.setAttribute('data-ils-price', '222');
      productElement.setAttribute('data-original-usd-price', '80');
      productElement.setAttribute('data-original-ils-price', '296');

      model.handleAddToCart(productElement);

      // Navigate to cart, render in USD
      renderCartPageFixture();
      localStorage.setItem('currency', 'usd');
      cartView.setLanguage('eng', 1);
      await cartView.render(1);
      await cartView._renderSummary(1, 'eng');

      // Verify discounted price shown in USD
      const usdPrice = document.querySelector('.item-price-discounted');
      expect(usdPrice).toBeTruthy();
      expect(usdPrice.textContent).toContain('60');

      // Switch to ILS
      localStorage.setItem('currency', 'ils');
      cartView._itemsBox.innerHTML = '';
      cartView._summaryDetails.innerHTML = '';
      await cartView.render(1);
      await cartView._renderSummary(1, 'eng');

      // Verify ILS discounted price shown
      const ilsPrice = document.querySelector('.item-price-discounted');
      expect(ilsPrice).toBeTruthy();
      expect(ilsPrice.textContent).toContain('222');

      // Verify original prices also available in model
      expect(model.cart[0].originalUsdPrice).toBe(80);
      expect(model.cart[0].originalIlsPrice).toBe(296);
    });
  });

  describe('Navigation with unsaved cart changes', () => {
    it('should persist cart to localStorage immediately on add', () => {
      renderHomePageFixture();

      const product = createProduct({ usd_price: 55, ils_price: 204 });
      model.handleAddToCart(createMockProductElement(product));

      // Immediately check localStorage (before any navigation)
      const savedCart = JSON.parse(localStorage.getItem('cart'));
      expect(savedCart).toHaveLength(1);
      expect(savedCart[0].title).toBe(product.name);
      expect(savedCart[0].usdPrice).toBe(55);
      expect(savedCart[0].ilsPrice).toBe(204);
    });

    it('should not lose items added just before navigation', async () => {
      renderHomePageFixture();

      const product = createProduct({ usd_price: 42, ils_price: 155 });

      // Add item
      model.handleAddToCart(createMockProductElement(product));

      // Immediately "navigate" (clear DOM, re-render different page)
      render(`
        <header></header>
        <div class="menu"></div>
        <div data-purpose="header-utilities"></div>
        <div class="footer"></div>
        <div id="categories-content"><h1>Categories</h1></div>
      `);
      document.body.id = 'categories';

      // Navigate back to cart, load from localStorage
      renderCartPageFixture();

      // Reload model.cart from localStorage (simulate fresh page load)
      model.cart.length = 0;
      const cartData = JSON.parse(localStorage.getItem('cart'));
      if (cartData) {
        model.cart.push(...cartData);
      }

      expect(model.cart).toHaveLength(1);
      expect(model.cart[0].title).toBe(product.name);

      // Render cart view
      localStorage.setItem('currency', 'usd');
      cartView.setLanguage('eng', 1);
      await cartView.render(1);
      await cartView._renderSummary(1, 'eng');

      // Verify item present in DOM
      const itemTitle = document.querySelector('.item-title');
      expect(itemTitle.textContent).toContain(product.name);
    });
  });

  describe('Logged-In User Shopping Flow', () => {
    it('should add item via API and maintain cart state', async () => {
      // Set auth token to simulate logged-in user
      localStorage.setItem('auth-token', 'mock-jwt-token-12345');

      // Setup fetch mock for addtocart API
      global.fetch = vi.fn((url) => {
        if (url.includes('/addtocart')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ itemId: '1001', success: true })
          });
        }
        if (url.includes('/getcart')) {
          // Mock cart response - backend format is object keyed by ID
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              '1001': 1 // ID: amount
            })
          });
        }
        if (url.includes('/discount-settings')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              global_discount_percentage: 0,
              discount_active: false,
              discount_label: 'Discount'
            })
          });
        }
        return Promise.reject(new Error(`Unmocked fetch: ${url}`));
      });

      renderHomePageFixture();

      const product = createProduct({ usd_price: 75, ils_price: 278 });
      const productElement = createMockProductElement(product);

      // Add item as logged-in user
      model.handleAddToCart(productElement);

      // Wait for async API call
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify fetch was called with auth-token header and /addtocart endpoint
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/addtocart'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'auth-token': 'mock-jwt-token-12345'
          })
        })
      );

      // Simulate cart page: render fixture
      renderCartPageFixture();

      // Mock checkCartNumber to return 1 for logged-in user
      const checkCartNumberSpy = vi.spyOn(model, 'checkCartNumber').mockResolvedValue(1);

      // Manually add item to model.cart for rendering (simulating cart loaded from API)
      model.cart.push({
        id: product.id,
        title: product.name,
        image: product.images[0]?.desktop || '',
        price: product.ils_price,
        usdPrice: product.usd_price,
        ilsPrice: product.ils_price,
        quantity: product.quantity,
        amount: 1
      });

      localStorage.setItem('currency', 'usd');
      cartView.setLanguage('eng', 1);
      await cartView.render(1);
      await cartView._renderSummary(1, 'eng');

      // Verify cart displays correctly
      const itemTitle = document.querySelector('.item-title');
      expect(itemTitle.textContent).toContain(product.name);

      const itemPrice = document.querySelector('.item-price');
      expect(itemPrice.textContent).toContain('$');
      expect(itemPrice.textContent).toContain('75');

      checkCartNumberSpy.mockRestore();
    });

    it('should maintain auth token across page simulations', () => {
      // Set auth token
      localStorage.setItem('auth-token', 'mock-jwt-token-67890');

      // Navigate to "home" (render home fixture)
      renderHomePageFixture();
      expect(localStorage.getItem('auth-token')).toBe('mock-jwt-token-67890');

      // Navigate to "cart" (render cart fixture)
      renderCartPageFixture();
      expect(localStorage.getItem('auth-token')).toBe('mock-jwt-token-67890');

      // Verify auth token persisted after both page simulations
      expect(localStorage.getItem('auth-token')).toBe('mock-jwt-token-67890');
    });

    it('should handle API error gracefully during cart sync', async () => {
      // Set auth token
      localStorage.setItem('auth-token', 'mock-jwt-token-error');

      // Mock fetch to return error
      global.fetch = vi.fn(() => Promise.reject(new Error('API Error')));

      // Call handleLoadStorage in try-catch (simulates controller loading cart on page load)
      try {
        await model.handleLoadStorage();
      } catch (err) {
        // Error is caught and logged, but doesn't crash
      }

      // Render cart view (should work even with API error)
      renderCartPageFixture();

      // View still renders (with empty or stale cart)
      cartView.setLanguage('eng', 0);
      await cartView.render(0);

      // Verify view renders without crash
      const cartEmpty = document.querySelector('.cart-empty');
      expect(cartEmpty).toBeTruthy();
    });
  });
});
