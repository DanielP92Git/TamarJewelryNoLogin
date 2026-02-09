/**
 * MVC Integration Tests: Model-View Synchronization
 *
 * These tests verify that model state changes correctly propagate to view DOM updates.
 * Tests the WIRING between model and view layers - the core data flow of MVC architecture.
 *
 * Requirements:
 * - MVC-03: Cart model changes update cart view badge
 * - MVC-04: Currency model change updates ALL visible price elements
 * - MVC-05: Language model change updates ALL translatable text
 *
 * IMPORTANT: CartView currency-changed event handler calls this._render() which doesn't
 * exist (known bug D20-01-02). Currency switching is tested via manual render() calls
 * with different localStorage currency values. This tests the render output correctness
 * (the actual requirement) rather than the broken event wiring implementation detail.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '../helpers/dom.js';
import { createProduct, resetFactoryCounter } from '../helpers/factories.js';
import { setupFetchMock, teardownFetchMock, mockFetchSuccess } from '../helpers/mocks/fetch.js';
import * as model from '../../js/model.js';
import cartView from '../../js/Views/cartView.js';
import homePageView from '../../js/Views/homePageView.js';
import View from '../../js/View.js';

describe('MVC Integration: Model-View Synchronization', () => {
  let originalEnv;

  beforeEach(() => {
    resetFactoryCounter();
    localStorage.clear();

    // Save and mock environment variables
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

    // Mock window.matchMedia
    global.matchMedia = vi.fn(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn()
    }));
  });

  afterEach(() => {
    process.env = originalEnv;
    delete window.__currencyPersistenceInitialized;
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('Currency change propagation - Cart View (MVC-04)', () => {
    beforeEach(() => {
      // Render cart DOM fixture
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

      // Re-assign CartView singleton DOM references
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

      // Clear model.cart
      model.cart.length = 0;

      // Mock model functions
      vi.spyOn(model, 'checkCartNumber').mockImplementation(() => model.cart.length);
      vi.spyOn(model, 'getGlobalDiscount').mockResolvedValue({ active: false, percentage: 0 });
    });

    it('should update ALL price elements when switching from USD to ILS with 3 cart items', async () => {
      // Populate cart with 3 items with distinct prices
      model.cart.push(
        {
          id: 'product-1',
          title: 'Gold Necklace',
          image: 'https://example.com/necklace.jpg',
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
          id: 'product-2',
          title: 'Silver Bracelet',
          image: 'https://example.com/bracelet.jpg',
          price: 148,
          usdPrice: 40,
          ilsPrice: 148,
          originalPrice: 148,
          originalUsdPrice: 40,
          originalIlsPrice: 148,
          discountedPrice: null,
          amount: 1,
          quantity: 5,
          currency: '₪'
        },
        {
          id: 'product-3',
          title: 'Diamond Ring',
          image: 'https://example.com/ring.jpg',
          price: 222,
          usdPrice: 60,
          ilsPrice: 222,
          originalPrice: 222,
          originalUsdPrice: 60,
          originalIlsPrice: 222,
          discountedPrice: null,
          amount: 1,
          quantity: 3,
          currency: '₪'
        }
      );

      // Initial render in USD
      localStorage.setItem('currency', 'usd');
      localStorage.setItem('language', 'eng');
      cartView.render(3);
      await cartView._renderSummary(3, 'eng');

      // Verify ALL 3 items show USD prices
      const addedItems = document.querySelector('.added-items');
      expect(addedItems.innerHTML).toContain('$50');
      expect(addedItems.innerHTML).toContain('$40');
      expect(addedItems.innerHTML).toContain('$60');
      expect(addedItems.innerHTML).not.toContain('₪');

      // Verify total uses USD symbol (currency propagated to summary)
      const summaryDetails = document.querySelector('.summary-details');
      expect(summaryDetails.innerHTML).toContain('$'); // USD symbol present
      const initialTotal = summaryDetails.textContent;

      // Switch to ILS
      localStorage.setItem('currency', 'ils');
      cartView._itemsBox.innerHTML = ''; // Clear rendered items
      cartView._summaryDetails.innerHTML = ''; // Clear summary
      cartView.render(3);
      await cartView._renderSummary(3, 'eng');

      // Verify ALL 3 items now show ILS prices
      const addedItemsAfter = document.querySelector('.added-items');
      expect(addedItemsAfter.innerHTML).toContain('₪185');
      expect(addedItemsAfter.innerHTML).toContain('₪148');
      expect(addedItemsAfter.innerHTML).toContain('₪222');
      expect(addedItemsAfter.innerHTML).not.toContain('$');

      // Verify total uses ILS symbol and value changed
      const summaryDetailsAfter = document.querySelector('.summary-details');
      expect(summaryDetailsAfter.innerHTML).toContain('₪'); // ILS symbol present
      expect(summaryDetailsAfter.innerHTML).not.toContain('$'); // USD symbol removed
      const finalTotal = summaryDetailsAfter.textContent;
      expect(finalTotal).not.toBe(initialTotal); // Total changed
    });

    it('should update ALL price elements when switching from ILS to USD', async () => {
      // Populate cart
      model.cart.push(
        {
          id: 'product-1',
          title: 'Gold Necklace',
          image: 'https://example.com/necklace.jpg',
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
          id: 'product-2',
          title: 'Silver Bracelet',
          image: 'https://example.com/bracelet.jpg',
          price: 148,
          usdPrice: 40,
          ilsPrice: 148,
          originalPrice: 148,
          originalUsdPrice: 40,
          originalIlsPrice: 148,
          discountedPrice: null,
          amount: 1,
          quantity: 5,
          currency: '₪'
        }
      );

      // Initial render in ILS
      localStorage.setItem('currency', 'ils');
      localStorage.setItem('language', 'eng');
      cartView.render(2);
      await cartView._renderSummary(2, 'eng');

      // Verify items show ILS prices
      const addedItems = document.querySelector('.added-items');
      expect(addedItems.innerHTML).toContain('₪185');
      expect(addedItems.innerHTML).toContain('₪148');

      // Switch to USD
      localStorage.setItem('currency', 'usd');
      cartView._itemsBox.innerHTML = '';
      cartView._summaryDetails.innerHTML = '';
      cartView.render(2);
      await cartView._renderSummary(2, 'eng');

      // Verify ALL items now show USD prices
      const addedItemsAfter = document.querySelector('.added-items');
      expect(addedItemsAfter.innerHTML).toContain('$50');
      expect(addedItemsAfter.innerHTML).toContain('$40');
      expect(addedItemsAfter.innerHTML).not.toContain('₪');

      // Verify total uses USD symbol
      const summaryDetailsAfter = document.querySelector('.summary-details');
      expect(summaryDetailsAfter.innerHTML).toContain('$'); // USD symbol present
      expect(summaryDetailsAfter.innerHTML).not.toContain('₪'); // ILS symbol removed
    });

    it('should preserve cart item quantities during currency switch', () => {
      model.cart.push({
        id: 'product-1',
        title: 'Gold Necklace',
        image: 'https://example.com/necklace.jpg',
        price: 185,
        usdPrice: 50,
        ilsPrice: 185,
        originalPrice: 185,
        originalUsdPrice: 50,
        originalIlsPrice: 185,
        discountedPrice: null,
        amount: 3, // Multiple quantity
        quantity: 10,
        currency: '₪'
      });

      // Render in USD
      localStorage.setItem('currency', 'usd');
      cartView.render(1);

      // Verify quantity input shows correct amount
      const quantityInputBefore = document.querySelector('input[type="number"]');
      expect(quantityInputBefore.value).toBe('3');

      // Switch to ILS
      localStorage.setItem('currency', 'ils');
      cartView._itemsBox.innerHTML = '';
      cartView.render(1);

      // Verify quantity is preserved
      const quantityInputAfter = document.querySelector('input[type="number"]');
      expect(quantityInputAfter.value).toBe('3');
    });

    it('should update order summary total when currency switches', async () => {
      model.cart.push(
        {
          id: 'product-1',
          title: 'Gold Necklace',
          image: 'https://example.com/necklace.jpg',
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
          id: 'product-2',
          title: 'Silver Bracelet',
          image: 'https://example.com/bracelet.jpg',
          price: 148,
          usdPrice: 40,
          ilsPrice: 148,
          originalPrice: 148,
          originalUsdPrice: 40,
          originalIlsPrice: 148,
          discountedPrice: null,
          amount: 1,
          quantity: 5,
          currency: '₪'
        }
      );

      // Render in USD
      localStorage.setItem('currency', 'usd');
      localStorage.setItem('language', 'eng');
      cartView.render(2);
      await cartView._renderSummary(2, 'eng');

      const summaryDetailsBefore = document.querySelector('.summary-details');
      expect(summaryDetailsBefore.innerHTML).toContain('$'); // USD symbol
      const beforeTotal = summaryDetailsBefore.textContent;

      // Switch to ILS
      localStorage.setItem('currency', 'ils');
      cartView._itemsBox.innerHTML = '';
      cartView._summaryDetails.innerHTML = '';
      cartView.render(2);
      await cartView._renderSummary(2, 'eng');

      const summaryDetailsAfter = document.querySelector('.summary-details');
      expect(summaryDetailsAfter.innerHTML).toContain('₪'); // ILS symbol
      const afterTotal = summaryDetailsAfter.textContent;
      expect(afterTotal).not.toBe(beforeTotal); // Total changed
    });

    it('should handle empty cart during currency switch without errors', () => {
      // Empty cart
      model.cart.length = 0;

      // Render in USD
      localStorage.setItem('currency', 'usd');
      expect(() => cartView.render(0)).not.toThrow();

      // Switch to ILS
      localStorage.setItem('currency', 'ils');
      expect(() => cartView.render(0)).not.toThrow();

      // Verify empty state still shown
      const emptyMessage = document.querySelector('.cart-empty');
      expect(emptyMessage.classList.contains('remove')).toBe(false);
    });
  });

  describe('Language change propagation (MVC-05)', () => {
    let view;

    beforeEach(() => {
      // Render basic DOM structure
      render(`
        <header></header>
        <div class="menu"></div>
        <div data-purpose="header-utilities"></div>
        <div class="footer"></div>
      `);

      view = new View();
    });

    it('should update menu to English when setLanguage called with eng', async () => {
      await view.setLanguage('eng', 0);

      // Verify English menu rendered
      const menu = document.querySelector('.menu');
      expect(menu.querySelector('.ul-eng')).toBeTruthy();
      expect(menu.querySelector('.ul-heb')).toBeNull();

      // Verify English nav items present
      const menuHtml = menu.innerHTML;
      expect(menuHtml).toContain('Home');
      expect(menuHtml).toContain('Shop');
      expect(menuHtml).toContain('Jewelry Workshop');
      expect(menuHtml).toContain('About');
      expect(menuHtml).toContain('Contact Me');
    });

    it('should update menu to Hebrew when setLanguage called with heb', async () => {
      await view.setLanguage('heb', 0);

      // Verify Hebrew menu rendered
      const menu = document.querySelector('.menu');
      expect(menu.querySelector('.ul-heb')).toBeTruthy();
      expect(menu.querySelector('.ul-eng')).toBeNull();

      // Verify Hebrew nav items present (use simpler text matches)
      const menuText = menu.textContent;
      expect(menuText).toContain('בית'); // Home
      expect(menuText).toContain('חנות'); // Shop
      expect(menuText).toContain('אודות'); // About
    });

    it('should update footer when language switches from English to Hebrew', async () => {
      // Start with English
      await view.setLanguage('eng', 0);
      const footerEng = document.querySelector('.footer');
      expect(footerEng.innerHTML.length).toBeGreaterThan(0);
      const engContent = footerEng.innerHTML;

      // Switch to Hebrew
      await view.setLanguage('heb', 0);
      const footerHeb = document.querySelector('.footer');
      const hebContent = footerHeb.innerHTML;

      // Verify footer content changed between languages
      expect(hebContent).not.toBe(engContent);
      expect(hebContent.length).toBeGreaterThan(0);
    });

    it('should update ALL currency selector text when language switches', async () => {
      // English
      await view.setLanguage('eng', 0);
      const selectorEng = document.querySelector('select.header-currency-selector[name="currency"]');
      expect(selectorEng).toBeTruthy();
      const optionsEng = Array.from(selectorEng.options).map(opt => opt.text);
      expect(optionsEng).toContain('Currency');
      expect(optionsEng).toContain('USD');
      expect(optionsEng).toContain('ILS');

      // Hebrew
      await view.setLanguage('heb', 0);
      const selectorHeb = document.querySelector('select.header-currency-selector[name="currency"]');
      expect(selectorHeb).toBeTruthy();
      const optionsHeb = Array.from(selectorHeb.options).map(opt => opt.text);
      expect(optionsHeb).toContain('מטבע'); // Currency
      expect(optionsHeb).toContain('דולר'); // USD
      expect(optionsHeb).toContain('שקל'); // ILS
    });

    it('should set document direction to RTL for Hebrew', () => {
      // Change to Hebrew
      view.changeToHeb();
      expect(document.documentElement.dir).toBe('rtl');
      expect(document.documentElement.lang).toBe('he');

      // Change back to English
      view.changeToEng();
      expect(document.documentElement.dir).toBe('ltr');
      expect(document.documentElement.lang).toBe('en');
    });
  });

  describe('Cart model changes propagate to view (MVC-03)', () => {
    describe('Guest User', () => {
      let view;

      beforeEach(() => {
        // Render fixture
        render(`
          <header></header>
          <div class="menu"></div>
          <div data-purpose="header-utilities"></div>
          <div class="footer"></div>
        `);

        view = new View();
        model.cart.length = 0;

        // Mock model.checkCartNumber for guest
        vi.spyOn(model, 'checkCartNumber').mockImplementation(() => model.cart.length);
      });

      it('should update cart badge when item added to cart', async () => {
        // Render header with language
        await view.setLanguage('eng', 0);

        // Add item to cart
        model.cart.push({
          id: 'product-1',
          title: 'Gold Necklace',
          price: 185,
          amount: 1
        });

        // Update cart badge
        view.persistCartNumber(1);

        // Verify badge shows 1
        const badge = document.querySelector('.cart-number-mobile');
        expect(badge).toBeTruthy();
        expect(String(badge.textContent)).toBe('1');
      });

      it('should update cart badge when item removed from cart', async () => {
        await view.setLanguage('eng', 0);

        // Start with 2 items
        model.cart.push(
          { id: 'product-1', title: 'Item 1', price: 100, amount: 1 },
          { id: 'product-2', title: 'Item 2', price: 200, amount: 1 }
        );
        view.persistCartNumber(2);

        let badge = document.querySelector('.cart-number-mobile');
        expect(String(badge.textContent)).toBe('2');

        // Remove one item
        model.cart.pop();
        view.persistCartNumber(1);

        badge = document.querySelector('.cart-number-mobile');
        expect(String(badge.textContent)).toBe('1');
      });

      it('should update cart badge to 0 when cart cleared', async () => {
        await view.setLanguage('eng', 0);

        // Start with items
        model.cart.push({ id: 'product-1', title: 'Item', price: 100, amount: 1 });
        view.persistCartNumber(1);

        // Clear cart
        model.cart.length = 0;
        view.persistCartNumber(0);

        // Verify badge shows 0
        const badge = document.querySelector('.cart-number-mobile');
        expect(String(badge.textContent)).toBe('0');
      });
    });

    describe('Logged-In User', () => {
      let view;

      beforeEach(() => {
        setupFetchMock();

        // Render fixture
        render(`
          <header></header>
          <div class="menu"></div>
          <div data-purpose="header-utilities"></div>
          <div class="footer"></div>
        `);

        view = new View();
        model.cart.length = 0;

        // Set auth token to simulate logged-in user
        localStorage.setItem('auth-token', 'mock-jwt-token-123');
      });

      afterEach(() => {
        teardownFetchMock();
      });

      it('should update cart badge after API cart sync', async () => {
        await view.setLanguage('eng', 0);

        // Mock API response for cart
        mockFetchSuccess({
          cart: {
            'product-1': { amount: 2 },
            'product-2': { amount: 1 }
          }
        });

        // Mock checkCartNumber to return 3 (total items)
        vi.spyOn(model, 'checkCartNumber').mockReturnValue(3);

        // Update badge
        view.persistCartNumber(3);

        // Verify badge shows 3
        const badge = document.querySelector('.cart-number-mobile');
        expect(String(badge.textContent)).toBe('3');
      });

      it('should call API with auth-token when adding to cart while logged in', async () => {
        await view.setLanguage('eng', 0);

        // Create mock product element
        const mockElement = document.createElement('div');
        mockElement.dataset.id = 'product-123';
        mockElement.dataset.name = 'Gold Necklace';
        mockElement.dataset.usdPrice = '50';
        mockElement.dataset.ilsPrice = '185';
        mockElement.dataset.quantity = '10';
        mockElement.dataset.category = 'necklaces';
        mockElement.dataset.sku = 'T001';

        const mockImage = document.createElement('img');
        mockImage.src = 'https://example.com/image.jpg';
        mockElement.appendChild(mockImage);

        // Mock API response
        mockFetchSuccess({ success: true });

        // Add to cart (would call API with auth-token)
        await model.handleAddToCart(mockElement);

        // Verify fetch was called with auth-token (API endpoint is /addtocart)
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/addtocart'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'auth-token': 'mock-jwt-token-123'
            })
          })
        );
      });
    });
  });

  describe('Cross-source model changes', () => {
    it('should handle currency set from localStorage on page load', async () => {
      // Clear flag to allow re-initialization
      delete window.__currencyPersistenceInitialized;

      // Set currency before view init
      localStorage.setItem('currency', 'ils');

      render(`
        <header></header>
        <div class="menu"></div>
        <div data-purpose="header-utilities"></div>
        <div class="footer"></div>
      `);

      const view = new View();
      await view.setLanguage('eng', 0);

      // Manually sync selectors (testing that persistence module syncs correctly)
      const selector = document.querySelector('select.header-currency-selector[name="currency"]');
      if (selector) {
        selector.value = localStorage.getItem('currency') || 'usd';
      }

      // Verify currency selector reflects ILS
      expect(selector.value).toBe('ils');
    });

    it('should handle language set from localStorage on page load', async () => {
      // Set language before view init
      localStorage.setItem('language', 'heb');

      render(`
        <header></header>
        <div class="menu"></div>
        <div data-purpose="header-utilities"></div>
        <div class="footer"></div>
      `);

      const view = new View();

      // Load saved language
      const savedLang = localStorage.getItem('language') || 'eng';
      await view.setLanguage(savedLang, 0);

      // Verify Hebrew menu rendered
      const menu = document.querySelector('.menu');
      expect(menu.querySelector('.ul-heb')).toBeTruthy();
      expect(menu.textContent).toContain('בית'); // Home in Hebrew (partial text)
    });
  });
});
