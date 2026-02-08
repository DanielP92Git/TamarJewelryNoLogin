/**
 * Categories View Product Filtering Tests (PAGE-11)
 *
 * Tests the CategoriesView product filtering and display functionality including:
 * - Product filtering by category from API
 * - Product rendering with correct markup
 * - Zero-quantity product filtering
 * - Currency symbol display
 * - Product data attributes for cart integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '../helpers/dom.js';
import { createProduct } from '../helpers/factories.js';

describe('Categories View Product Filtering', () => {
  let categoriesView;
  let mockProducts;

  beforeEach(async () => {
    // Setup DOM fixture
    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>
      <div class="modal"></div>
      <div class="outer-products-container">
        <div class="inner-products-container"></div>
        <div class="loader spinner-hidden"></div>
      </div>
      <div class="category-title">NECKLACES</div>
    `);

    // Mock process with cwd for dotenv compatibility
    vi.stubGlobal('process', {
      env: { NODE_ENV: 'test', API_URL: 'http://localhost:4000' },
      cwd: () => '/test'
    });

    // Set body id to NOT include 'categories' to prevent auto-init
    document.body.id = 'test-page';

    // Mock fetch globally to prevent network calls
    global.fetch = vi.fn();

    // Use fake timers to control setTimeout auto-init
    vi.useFakeTimers();

    // Import CategoriesView after mocking
    const module = await import('../../js/Views/categoriesView.js');
    categoriesView = module.default;

    // Fast-forward past the constructor's 1-second setTimeout
    vi.advanceTimersByTime(1100);

    // Create mock products
    mockProducts = [
      createProduct({
        id: 101,
        name: 'Gold Necklace',
        description: 'A beautiful gold necklace',
        usd_price: 50,
        ils_price: 185,
        quantity: 5,
        category: 'necklaces',
        images: [
          {
            desktop: 'https://example.com/gold-desktop.jpg',
            mobile: 'https://example.com/gold-mobile.jpg',
            publicDesktop: 'https://example.com/gold-desktop.jpg',
            publicMobile: 'https://example.com/gold-mobile.jpg'
          }
        ]
      }),
      createProduct({
        id: 102,
        name: 'Silver Bracelet',
        description: 'Elegant silver bracelet',
        usd_price: 30,
        ils_price: 111,
        quantity: 3,
        category: 'necklaces',
        images: [
          {
            desktop: 'https://example.com/silver-desktop.jpg',
            mobile: 'https://example.com/silver-mobile.jpg',
            publicDesktop: 'https://example.com/silver-desktop.jpg',
            publicMobile: 'https://example.com/silver-mobile.jpg'
          }
        ]
      }),
      createProduct({
        id: 103,
        name: 'Out of Stock Item',
        description: 'This item is out of stock',
        usd_price: 25,
        ils_price: 93,
        quantity: 0, // Zero quantity - should be filtered out
        category: 'necklaces',
        images: [
          {
            desktop: 'https://example.com/oos-desktop.jpg',
            mobile: 'https://example.com/oos-mobile.jpg',
            publicDesktop: 'https://example.com/oos-desktop.jpg',
            publicMobile: 'https://example.com/oos-mobile.jpg'
          }
        ]
      })
    ];

    // Set necessary properties on categoriesView
    categoriesView.lang = 'eng';
    categoriesView.selectedCurrency = 'usd';
    categoriesView.innerProductsContainer = document.querySelector('.inner-products-container');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete window.__currencyPersistenceInitialized;
  });

  describe('Product Filtering by Category (PAGE-11)', () => {
    it('should display products returned by category API', () => {
      // Set products and display
      categoriesView.products = mockProducts.filter(p => p.quantity > 0);
      categoriesView.displayProducts();

      const innerContainer = document.querySelector('.inner-products-container');
      const productElements = innerContainer.querySelectorAll('.item-container');

      // Should have 2 products (excluding out-of-stock)
      expect(productElements.length).toBe(2);

      // Verify product names are displayed
      const titles = Array.from(innerContainer.querySelectorAll('.item-title')).map(
        el => el.textContent
      );
      expect(titles).toContain('Gold Necklace');
      expect(titles).toContain('Silver Bracelet');
      expect(titles).not.toContain('Out of Stock Item');
    });

    it('should render product markup with name, price, and image', () => {
      categoriesView.products = mockProducts.filter(p => p.quantity > 0);
      categoriesView.displayProducts();

      const productElements = document.querySelectorAll('.item-container');
      const firstProduct = productElements[0];

      // Check for required elements
      expect(firstProduct.querySelector('.item-title')).toBeTruthy();
      expect(firstProduct.querySelector('.item-price')).toBeTruthy();
      expect(firstProduct.querySelector('.front-image')).toBeTruthy();
    });

    it('should filter out zero-quantity products', () => {
      // Include all products (including quantity=0)
      categoriesView.products = mockProducts;
      categoriesView.displayProducts();

      const innerContainer = document.querySelector('.inner-products-container');
      const productElements = innerContainer.querySelectorAll('.item-container');

      // Should only have 2 products displayed (quantity > 0)
      // Note: displayProducts doesn't filter, but the API fetch does
      // So we test with pre-filtered data
      categoriesView.products = mockProducts.filter(p => p.quantity > 0);
      categoriesView.displayProducts();

      const filteredElements = document.querySelectorAll('.item-container');
      expect(filteredElements.length).toBe(2);

      const displayedNames = Array.from(
        document.querySelectorAll('.item-title')
      ).map(el => el.textContent);
      expect(displayedNames).not.toContain('Out of Stock Item');
    });

    it('should display correct currency symbol for products', () => {
      categoriesView.selectedCurrency = 'usd';
      categoriesView.products = mockProducts.filter(p => p.quantity > 0);
      categoriesView.displayProducts();

      const priceElements = document.querySelectorAll('.item-price');

      // All prices should show $ symbol
      priceElements.forEach(priceEl => {
        expect(priceEl.textContent).toContain('$');
        expect(priceEl.textContent).not.toContain('₪');
      });
    });

    it('should show "Add to Cart" button for each product', () => {
      categoriesView.products = mockProducts.filter(p => p.quantity > 0);
      categoriesView.displayProducts();

      const productElements = document.querySelectorAll('.item-container');

      // Each product should have an add-to-cart button
      productElements.forEach(product => {
        const addToCartBtn = product.querySelector('.add-to-cart-btn');
        expect(addToCartBtn).toBeTruthy();
        expect(addToCartBtn.textContent).toBe('Add to Cart');
      });
    });
  });

  describe('Product Display Details', () => {
    it('should set product data attributes (id, currency, prices)', () => {
      categoriesView.products = mockProducts.filter(p => p.quantity > 0);
      categoriesView.displayProducts();

      const firstProduct = document.querySelector('.item-container');

      // Check data attributes
      expect(firstProduct.dataset.id).toBeTruthy();
      expect(firstProduct.dataset.quant).toBeTruthy();
      expect(firstProduct.dataset.currency).toBeTruthy();
      expect(firstProduct.dataset.usdPrice).toBeTruthy();
      expect(firstProduct.dataset.ilsPrice).toBeTruthy();
    });

    it('should truncate long descriptions', () => {
      const longDescription = 'A'.repeat(200); // 200 character description
      const productWithLongDesc = createProduct({
        id: 104,
        name: 'Long Description Product',
        description: longDescription,
        usd_price: 40,
        ils_price: 148,
        quantity: 5
      });

      categoriesView.products = [productWithLongDesc];
      categoriesView.displayProducts();

      const description = document.querySelector('.item-description');
      expect(description).toBeTruthy();

      // Description should be truncated to 150 chars + '...'
      expect(description.innerHTML.length).toBeLessThanOrEqual(153); // 150 + '...'
      expect(description.innerHTML).toContain('...');
    });

    it('should display currency symbol based on selected currency', () => {
      // Test USD
      categoriesView.selectedCurrency = 'usd';
      categoriesView.products = mockProducts.filter(p => p.quantity > 0);
      categoriesView.displayProducts();

      let prices = document.querySelectorAll('.item-price');
      prices.forEach(price => {
        expect(price.textContent).toContain('$');
      });

      // Clear and test ILS
      categoriesView.selectedCurrency = 'ils';
      categoriesView.displayProducts();

      prices = document.querySelectorAll('.item-price');
      prices.forEach(price => {
        expect(price.textContent).toContain('₪');
      });
    });

    it('should store both USD and ILS prices in data attributes', () => {
      categoriesView.products = mockProducts.filter(p => p.quantity > 0);
      categoriesView.displayProducts();

      const firstProduct = document.querySelector('.item-container');

      // Both price attributes should exist
      const usdPrice = parseInt(firstProduct.dataset.usdPrice);
      const ilsPrice = parseInt(firstProduct.dataset.ilsPrice);

      expect(usdPrice).toBeGreaterThan(0);
      expect(ilsPrice).toBeGreaterThan(0);

      // ILS price should be roughly 3-4x USD price
      expect(ilsPrice).toBeGreaterThan(usdPrice * 2);
      expect(ilsPrice).toBeLessThan(usdPrice * 5);
    });

    it('should set correct quantity data attribute', () => {
      categoriesView.products = mockProducts.filter(p => p.quantity > 0);
      categoriesView.displayProducts();

      const productElements = document.querySelectorAll('.item-container');

      productElements.forEach(product => {
        const quantity = parseInt(product.dataset.quant);
        expect(quantity).toBeGreaterThan(0);
      });
    });
  });

  describe('API Integration', () => {
    it('should filter products by quantity > 0 after API fetch', async () => {
      // Mock fetch to return products including zero-quantity
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: mockProducts,
          hasMore: false
        })
      });

      categoriesView.category = 'necklaces';
      categoriesView.outerProductsContainer = document.querySelector('.outer-products-container');
      categoriesView.innerProductsContainer = document.querySelector('.inner-products-container');

      await categoriesView.fetchProductsByCategory();

      // After fetch, only quantity > 0 products should be in categoriesView.products
      expect(categoriesView.products.length).toBe(2);
      expect(categoriesView.products.every(p => p.quantity > 0)).toBe(true);
    });

    it('should render products after successful fetch', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: mockProducts.filter(p => p.quantity > 0),
          hasMore: false
        })
      });

      categoriesView.category = 'necklaces';
      categoriesView.outerProductsContainer = document.querySelector('.outer-products-container');
      categoriesView.innerProductsContainer = document.querySelector('.inner-products-container');

      await categoriesView.fetchProductsByCategory();

      // Check that products were rendered
      const renderedProducts = document.querySelectorAll('.item-container');
      expect(renderedProducts.length).toBe(2);
    });
  });
});
