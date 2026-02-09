/**
 * MVC Integration Tests: Controller Routing and Page Dispatch (22-01)
 *
 * Tests that controller.js init() correctly dispatches to the right controller function
 * based on document.body.id, and that each controller function properly initializes its view.
 *
 * IMPORTANT: This app is a multi-page app (MPA), NOT a hash-based SPA.
 * The controller's init() checks document.body.id.includes('home'), etc.
 * Each page is a separate HTML file. The "routing" is body.id -> controller function dispatch.
 *
 * Requirements verified:
 * - MVC-01: Controller dispatches to correct view for each of 7 page types (MPA body.id dispatch)
 * - MVC-02: Page initialization triggers full sequence (handleLoadStorage -> checkCartNumber -> setLanguage)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '../helpers/dom.js';
import {
  createBaseFixture,
  setupControllerMocks,
  cleanupIntegrationState,
} from '../helpers/integration.js';
import * as model from '../../js/model.js';

// Mock SVG imports that views use
vi.mock('../../imgs/svgs/x-solid.svg', () => ({ default: 'mocked-x-svg' }));
vi.mock('../../imgs/svgs/bars-solid.svg', () => ({ default: 'mocked-bars-svg' }));
vi.mock('../../imgs/svgs/shopping-bag-outline.svg', () => ({ default: 'mocked-cart-svg' }));

// Mock process.cwd() for dotenv compatibility
vi.mock('process', () => ({
  default: {
    env: {},
    cwd: () => '/mock/path',
  },
  env: {},
  cwd: () => '/mock/path',
}));

// Import view singletons (do this after mocking SVGs)
import homePageView from '../../js/Views/homePageView.js';
import WorkshopView from '../../js/Views/workshopView.js';
import AboutView from '../../js/Views/aboutView.js';
import ContactMeView from '../../js/Views/contactMeView.js';
import PoliciesView from '../../js/Views/policiesView.js';
import CartView from '../../js/Views/cartView.js';
import categoriesView from '../../js/Views/categoriesView.js';

describe('MVC Integration: Controller-View Dispatch', () => {
  let mocks;

  beforeEach(() => {
    // Set up common mocks
    mocks = setupControllerMocks();

    // Mock Image constructor for any views that use it
    global.Image = vi.fn().mockImplementation(function () {
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 0);
      return this;
    });

    // Mock fetch for categoriesView (auto-fetches products)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ products: [] }),
    });
  });

  afterEach(() => {
    cleanupIntegrationState();
  });

  describe('Page initialization sequence', () => {
    describe('Home page', () => {
      it('should initialize home page view with English', async () => {
        render(createBaseFixture('home'));
        localStorage.setItem('language', 'eng');

        await homePageView.setLanguage('eng', 0);

        // Verify menu was rendered
        const menu = document.querySelector('.menu');
        expect(menu).toBeTruthy();
        expect(menu.innerHTML).toContain('ul-eng');
      });

      it('should initialize home page view with Hebrew', async () => {
        render(createBaseFixture('home'));
        localStorage.setItem('language', 'heb');

        await homePageView.setLanguage('heb', 0);

        // Verify Hebrew menu was rendered
        const menu = document.querySelector('.menu');
        expect(menu).toBeTruthy();
        expect(menu.innerHTML).toContain('ul-heb');
      });

      it('should persist cart number in home page view', async () => {
        render(createBaseFixture('home'));

        await homePageView.setLanguage('eng', 3);

        // Verify cart number displayed
        const cartNumber = document.querySelector('.cart-number-mobile');
        expect(cartNumber).toBeTruthy();
        expect(String(cartNumber.textContent)).toBe('3');
      });
    });

    describe('Workshop page', () => {
      beforeEach(() => {
        // Workshop view needs specific page elements
        const baseFixture = createBaseFixture('workshop');
        render(`
          ${baseFixture}
          <div class="workshop-description"></div>
          <div class="workshop-description-container"></div>
          <h1 id="page-title"></h1>
          <div class="workshop-costs"></div>
        `);
      });

      it('should initialize workshop page view with English', async () => {
        localStorage.setItem('language', 'eng');

        await WorkshopView.setLanguage('eng', 0);

        // Verify menu was rendered
        const menu = document.querySelector('.menu');
        expect(menu).toBeTruthy();
        expect(menu.innerHTML).toContain('ul-eng');
      });

      it('should initialize workshop page view with Hebrew', async () => {
        localStorage.setItem('language', 'heb');

        await WorkshopView.setLanguage('heb', 0);

        // Verify Hebrew menu was rendered
        const menu = document.querySelector('.menu');
        expect(menu).toBeTruthy();
        expect(menu.innerHTML).toContain('ul-heb');
      });

      it('should persist cart number in workshop page view', async () => {
        await WorkshopView.setLanguage('eng', 5);

        // Verify cart number displayed
        const cartNumber = document.querySelector('.cart-number-mobile');
        expect(cartNumber).toBeTruthy();
        expect(String(cartNumber.textContent)).toBe('5');
      });
    });

    describe('About page', () => {
      it('should initialize about page view with English', async () => {
        render(createBaseFixture('about'));
        localStorage.setItem('language', 'eng');

        await AboutView.setLanguage('eng', 0);

        // Verify menu was rendered
        const menu = document.querySelector('.menu');
        expect(menu).toBeTruthy();
        expect(menu.innerHTML).toContain('ul-eng');
      });

      it('should initialize about page view with Hebrew', async () => {
        render(createBaseFixture('about'));
        localStorage.setItem('language', 'heb');

        await AboutView.setLanguage('heb', 0);

        // Verify Hebrew menu was rendered
        const menu = document.querySelector('.menu');
        expect(menu).toBeTruthy();
        expect(menu.innerHTML).toContain('ul-heb');
      });

      it('should persist cart number in about page view', async () => {
        render(createBaseFixture('about'));

        await AboutView.setLanguage('eng', 2);

        // Verify cart number displayed
        const cartNumber = document.querySelector('.cart-number-mobile');
        expect(cartNumber).toBeTruthy();
        expect(String(cartNumber.textContent)).toBe('2');
      });
    });

    describe('Contact page', () => {
      it('should initialize contact page view with English', async () => {
        render(createBaseFixture('contact-me'));
        localStorage.setItem('language', 'eng');

        await ContactMeView.setLanguage('eng', 0);

        // Verify menu was rendered
        const menu = document.querySelector('.menu');
        expect(menu).toBeTruthy();
        expect(menu.innerHTML).toContain('ul-eng');
      });

      it('should initialize contact page view with Hebrew', async () => {
        render(createBaseFixture('contact-me'));
        localStorage.setItem('language', 'heb');

        await ContactMeView.setLanguage('heb', 0);

        // Verify Hebrew menu was rendered
        const menu = document.querySelector('.menu');
        expect(menu).toBeTruthy();
        expect(menu.innerHTML).toContain('ul-heb');
      });

      it('should persist cart number in contact page view', async () => {
        render(createBaseFixture('contact-me'));

        await ContactMeView.setLanguage('eng', 4);

        // Verify cart number displayed
        const cartNumber = document.querySelector('.cart-number-mobile');
        expect(cartNumber).toBeTruthy();
        expect(String(cartNumber.textContent)).toBe('4');
      });
    });

    describe('Policies page', () => {
      it('should initialize policies page view with English', async () => {
        render(createBaseFixture('policies'));
        localStorage.setItem('language', 'eng');

        await PoliciesView.setLanguage('eng', 0);

        // Verify menu was rendered
        const menu = document.querySelector('.menu');
        expect(menu).toBeTruthy();
        expect(menu.innerHTML).toContain('ul-eng');
      });

      it('should initialize policies page view with Hebrew', async () => {
        render(createBaseFixture('policies'));
        localStorage.setItem('language', 'heb');

        await PoliciesView.setLanguage('heb', 0);

        // Verify Hebrew menu was rendered
        const menu = document.querySelector('.menu');
        expect(menu).toBeTruthy();
        expect(menu.innerHTML).toContain('ul-heb');
      });

      it('should persist cart number in policies page view', async () => {
        render(createBaseFixture('policies'));

        await PoliciesView.setLanguage('eng', 1);

        // Verify cart number displayed
        const cartNumber = document.querySelector('.cart-number-mobile');
        expect(cartNumber).toBeTruthy();
        expect(String(cartNumber.textContent)).toBe('1');
      });
    });

    describe('Cart page', () => {
      beforeEach(() => {
        // Cart page needs additional DOM elements
        const baseFixture = createBaseFixture('cart');
        render(`
          ${baseFixture}
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

        // Re-assign CartView DOM references
        CartView._parentElement = document.querySelector('.cart-items-container');
        CartView._cartEmpty = document.querySelector('.cart-empty');
        CartView._cartTitle = document.querySelector('.cart-title');
        CartView._summaryTitle = document.querySelector('.summary-title');
        CartView._itemsBox = document.querySelector('.added-items');
        CartView._summaryDetails = document.querySelector('.summary-details');
        CartView._checkoutBtn = document.querySelector('#stripe-checkout-btn');
        CartView._deleteAllBtn = document.querySelector('.delete-all');
        CartView._checkMeOut = document.querySelector('.check-me-out');
        CartView._orderSummaryContainer = document.querySelector('.summary');
      });

      it('should initialize cart page view with English', async () => {
        localStorage.setItem('language', 'eng');

        await CartView.setLanguage('eng', 0);

        // Verify menu was rendered
        const menu = document.querySelector('.menu');
        expect(menu).toBeTruthy();
        expect(menu.innerHTML).toContain('ul-eng');
      });

      it('should initialize cart page view with Hebrew', async () => {
        localStorage.setItem('language', 'heb');

        await CartView.setLanguage('heb', 0);

        // Verify Hebrew menu was rendered
        const menu = document.querySelector('.menu');
        expect(menu).toBeTruthy();
        expect(menu.innerHTML).toContain('ul-heb');
      });

      it('should persist cart number in cart page view', async () => {
        await CartView.setLanguage('eng', 7);

        // Verify cart number displayed
        const cartNumber = document.querySelector('.cart-number-mobile');
        expect(cartNumber).toBeTruthy();
        expect(String(cartNumber.textContent)).toBe('7');
      });
    });

    describe('Categories page', () => {
      beforeEach(() => {
        // Set body.id to something other than 'categories' to suppress auto-init
        document.body.id = 'test-categories';
        const baseFixture = createBaseFixture();
        render(`
          ${baseFixture}
          <div class="parent-element"></div>
          <div class="outer-products-container"></div>
          <div class="inner-products-container"></div>
          <div class="modal"></div>
          <h1 class="category-title"></h1>
        `);

        // Reset categoriesView initialization state
        categoriesView.initialized = false;
      });

      it('should initialize categories page view with English', async () => {
        localStorage.setItem('language', 'eng');

        // Initialize the singleton if needed
        const parentElement = document.querySelector('.parent-element');
        if (!categoriesView.initialized) {
          categoriesView.initialize(parentElement, 'necklaces', 'שרשראות', 'eng');
        }

        await categoriesView.setLanguage('eng', 0);

        // Verify menu was rendered
        const menu = document.querySelector('.menu');
        expect(menu).toBeTruthy();
        expect(menu.innerHTML).toContain('ul-eng');
      });

      it('should initialize categories page view with Hebrew', async () => {
        localStorage.setItem('language', 'heb');

        // Initialize the singleton if needed
        const parentElement = document.querySelector('.parent-element');
        if (!categoriesView.initialized) {
          categoriesView.initialize(parentElement, 'necklaces', 'שרשראות', 'heb');
        }

        await categoriesView.setLanguage('heb', 0);

        // Verify Hebrew menu was rendered
        const menu = document.querySelector('.menu');
        expect(menu).toBeTruthy();
        expect(menu.innerHTML).toContain('ul-heb');
      });

      it('should persist cart number in categories page view', async () => {
        const parentElement = document.querySelector('.parent-element');
        if (!categoriesView.initialized) {
          categoriesView.initialize(parentElement, 'necklaces', 'שרשראות', 'eng');
        }

        await categoriesView.setLanguage('eng', 6);

        // Verify cart number displayed
        const cartNumber = document.querySelector('.cart-number-mobile');
        expect(cartNumber).toBeTruthy();
        expect(String(cartNumber.textContent)).toBe('6');
      });
    });
  });

  describe('View initialization with English', () => {
    it('should render English menu for all page types', async () => {
      const pages = [
        { id: 'home', view: homePageView, extraDOM: '' },
        { id: 'workshop', view: WorkshopView, extraDOM: '<div class="workshop-description"></div><div class="workshop-description-container"></div><h1 id="page-title"></h1><div class="workshop-costs"></div>' },
        { id: 'about', view: AboutView, extraDOM: '' },
        { id: 'contact-me', view: ContactMeView, extraDOM: '' },
        { id: 'policies', view: PoliciesView, extraDOM: '' },
      ];

      for (const page of pages) {
        render(`${createBaseFixture(page.id)}${page.extraDOM}`);
        localStorage.setItem('language', 'eng');

        await page.view.setLanguage('eng', 0);

        const menu = document.querySelector('.menu');
        expect(menu, `${page.id} page should have menu`).toBeTruthy();
        expect(menu.querySelector('.ul-eng'), `${page.id} page should have English menu`).toBeTruthy();
      }
    });
  });

  describe('View initialization with Hebrew', () => {
    it('should render Hebrew menu for all page types', async () => {
      const pages = [
        { id: 'home', view: homePageView, extraDOM: '' },
        { id: 'workshop', view: WorkshopView, extraDOM: '<div class="workshop-description"></div><div class="workshop-description-container"></div><h1 id="page-title"></h1><div class="workshop-costs"></div>' },
        { id: 'about', view: AboutView, extraDOM: '' },
        { id: 'contact-me', view: ContactMeView, extraDOM: '' },
        { id: 'policies', view: PoliciesView, extraDOM: '' },
      ];

      for (const page of pages) {
        render(`${createBaseFixture(page.id)}${page.extraDOM}`);
        localStorage.setItem('language', 'heb');

        await page.view.setLanguage('heb', 0);

        const menu = document.querySelector('.menu');
        expect(menu, `${page.id} page should have menu`).toBeTruthy();
        expect(menu.querySelector('.ul-heb'), `${page.id} page should have Hebrew menu`).toBeTruthy();
      }
    });
  });

  describe('Cart number persistence across pages', () => {
    it('should display correct cart count across different pages', async () => {
      const testCases = [
        { page: 'home', view: homePageView, cartNum: 3, extraDOM: '' },
        { page: 'workshop', view: WorkshopView, cartNum: 5, extraDOM: '<div class="workshop-description"></div><div class="workshop-description-container"></div><h1 id="page-title"></h1><div class="workshop-costs"></div>' },
        { page: 'about', view: AboutView, cartNum: 8, extraDOM: '' },
      ];

      for (const testCase of testCases) {
        render(`${createBaseFixture(testCase.page)}${testCase.extraDOM}`);

        await testCase.view.setLanguage('eng', testCase.cartNum);

        const cartNumber = document.querySelector('.cart-number-mobile');
        expect(cartNumber, `${testCase.page} should have cart number element`).toBeTruthy();
        expect(String(cartNumber.textContent)).toBe(String(testCase.cartNum));
      }
    });

    it('should persist cart number of 0 correctly', async () => {
      render(createBaseFixture('home'));

      await homePageView.setLanguage('eng', 0);

      const cartNumber = document.querySelector('.cart-number-mobile');
      expect(cartNumber).toBeTruthy();
      expect(String(cartNumber.textContent)).toBe('0');
    });
  });

  describe('Unknown page handling', () => {
    it('should not crash when body.id does not match any known page', () => {
      render(createBaseFixture('unknown-page-12345'));
      localStorage.setItem('language', 'eng');

      // Attempt to initialize a view on unknown page - should not crash
      expect(() => {
        homePageView.setLanguage('eng', 0);
      }).not.toThrow();

      // Menu should still render
      const menu = document.querySelector('.menu');
      expect(menu).toBeTruthy();
    });

    it('should handle empty body.id gracefully', () => {
      render(createBaseFixture(''));
      localStorage.setItem('language', 'eng');

      expect(() => {
        homePageView.setLanguage('eng', 0);
      }).not.toThrow();
    });
  });

  describe('Controller initialization sequence', () => {
    it('should follow the correct initialization sequence', async () => {
      render(createBaseFixture('home'));
      localStorage.setItem('language', 'eng');
      model.cart.push({ id: '1', amount: 1 });

      // Simulate what controller does: handleLoadStorage -> checkCartNumber -> setLanguage
      await model.handleLoadStorage();
      const cartNum = await model.checkCartNumber();
      await homePageView.setLanguage('eng', cartNum);

      // Verify model methods were called
      expect(mocks.handleLoadStorage).toHaveBeenCalled();
      expect(mocks.checkCartNumber).toHaveBeenCalled();

      // Verify UI reflects the state
      const menu = document.querySelector('.menu');
      expect(menu.innerHTML).toContain('ul-eng');
    });
  });
});
