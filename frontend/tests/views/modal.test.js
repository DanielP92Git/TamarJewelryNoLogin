/**
 * Product Modal Tests (PAGE-05 through PAGE-08)
 *
 * Tests the CategoriesView product modal functionality including:
 * - Product modal image rendering with gallery (PAGE-05)
 * - Product modal description display (PAGE-06)
 * - Product modal price display in selected currency (PAGE-07)
 * - Add-to-cart button and modal close methods (PAGE-08)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '../helpers/dom.js';
import { createProduct } from '../helpers/factories.js';
import * as model from '../../js/model.js';

describe('Product Modal Rendering and Interactions', () => {
  let categoriesView;
  let mockProduct;

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

    // Mock process.env.NODE_ENV to prevent debug setup
    vi.stubGlobal('process', { env: { NODE_ENV: 'test' } });

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

    // Create mock product
    mockProduct = createProduct({
      id: 101,
      name: 'Test Necklace',
      description: 'A beautiful handmade necklace with intricate details.',
      usd_price: 50,
      ils_price: 185,
      quantity: 10,
      images: [
        {
          desktop: 'https://example.com/main-desktop.jpg',
          mobile: 'https://example.com/main-mobile.jpg',
          publicDesktop: 'https://example.com/main-desktop.jpg',
          publicMobile: 'https://example.com/main-mobile.jpg'
        },
        {
          desktop: 'https://example.com/img2-desktop.jpg',
          mobile: 'https://example.com/img2-mobile.jpg',
          publicDesktop: 'https://example.com/img2-desktop.jpg',
          publicMobile: 'https://example.com/img2-mobile.jpg'
        },
        {
          desktop: 'https://example.com/img3-desktop.jpg',
          mobile: 'https://example.com/img3-mobile.jpg',
          publicDesktop: 'https://example.com/img3-desktop.jpg',
          publicMobile: 'https://example.com/img3-mobile.jpg'
        }
      ]
    });

    // Set products array and necessary properties
    categoriesView.products = [mockProduct];
    categoriesView.lang = 'eng';
    categoriesView.selectedCurrency = 'usd';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete window.__currencyPersistenceInitialized;
  });

  describe('Modal Image Rendering (PAGE-05)', () => {
    it('should render main big image from product data', () => {
      // Create mock clicked item element
      const mockItem = document.createElement('div');
      mockItem.classList.add('item-container');
      mockItem.dataset.id = '101';
      mockItem.dataset.quant = '10';
      mockItem.dataset.currency = '$';
      mockItem.innerHTML = `
        <img class="front-image" src="https://example.com/main-desktop.jpg" />
        <div class="item-title">Test Necklace</div>
        <div class="item-price">$50</div>
      `;

      // Generate preview (modal)
      categoriesView.generatePreview(mockItem, '', true);

      // Verify big image is rendered
      const bigImage = document.querySelector('.big-image');
      expect(bigImage).toBeTruthy();
      expect(bigImage.src).toContain('main-desktop.jpg');
    });

    it('should render thumbnail sidebar with all product images', () => {
      const mockItem = document.createElement('div');
      mockItem.classList.add('item-container');
      mockItem.dataset.id = '101';
      mockItem.dataset.quant = '10';
      mockItem.dataset.currency = '$';
      mockItem.innerHTML = `
        <img class="front-image" src="https://example.com/main-desktop.jpg" />
        <div class="item-title">Test Necklace</div>
        <div class="item-price">$50</div>
      `;

      categoriesView.generatePreview(mockItem, '', true);

      // Verify thumbnail sidebar exists
      const thumbnails = document.querySelectorAll('.small-image-thumb');
      expect(thumbnails.length).toBeGreaterThan(0);

      // Should have 3 thumbnails (all images including main)
      expect(thumbnails.length).toBe(3);
    });

    it('should update big image when thumbnail clicked', () => {
      const mockItem = document.createElement('div');
      mockItem.classList.add('item-container');
      mockItem.dataset.id = '101';
      mockItem.dataset.quant = '10';
      mockItem.dataset.currency = '$';
      mockItem.innerHTML = `
        <img class="front-image" src="https://example.com/main-desktop.jpg" />
        <div class="item-title">Test Necklace</div>
        <div class="item-price">$50</div>
      `;

      categoriesView.generatePreview(mockItem, '', true);

      const bigImage = document.querySelector('.big-image');
      const thumbnails = document.querySelectorAll('.small-image-thumb');

      // Verify initial state
      expect(bigImage.src).toContain('main-desktop.jpg');

      // Click second thumbnail
      const secondThumbnail = thumbnails[1];
      const thumbnailImg = secondThumbnail.querySelector('img');

      // Mock Image constructor to trigger onload immediately
      const originalImage = window.Image;
      window.Image = function() {
        const img = new originalImage();
        // Override the src setter to trigger onload synchronously
        Object.defineProperty(img, 'src', {
          set: function(value) {
            Object.defineProperty(this, 'src', { value, writable: true });
            // Trigger onload synchronously
            if (this.onload) {
              this.onload();
            }
          },
          get: function() {
            return Object.getOwnPropertyDescriptor(this, 'src')?.value;
          },
          configurable: true
        });
        return img;
      };

      secondThumbnail.click();

      // Restore original Image
      window.Image = originalImage;

      // Verify big image src changed to second image
      expect(bigImage.src).toContain('img2-desktop.jpg');
    });

    it('should mark clicked thumbnail as active', () => {
      const mockItem = document.createElement('div');
      mockItem.classList.add('item-container');
      mockItem.dataset.id = '101';
      mockItem.dataset.quant = '10';
      mockItem.dataset.currency = '$';
      mockItem.innerHTML = `
        <img class="front-image" src="https://example.com/main-desktop.jpg" />
        <div class="item-title">Test Necklace</div>
        <div class="item-price">$50</div>
      `;

      categoriesView.generatePreview(mockItem, '', true);

      const thumbnails = document.querySelectorAll('.small-image-thumb');

      // First thumbnail should be active initially
      expect(thumbnails[0].classList.contains('active')).toBe(true);

      // Click second thumbnail
      thumbnails[1].click();

      // Second thumbnail should now be active
      expect(thumbnails[1].classList.contains('active')).toBe(true);
      expect(thumbnails[0].classList.contains('active')).toBe(false);
    });
  });

  describe('Modal Description Display (PAGE-06)', () => {
    it('should display product description in modal', () => {
      const mockItem = document.createElement('div');
      mockItem.classList.add('item-container');
      mockItem.dataset.id = '101';
      mockItem.dataset.quant = '10';
      mockItem.dataset.currency = '$';
      mockItem.innerHTML = `
        <img class="front-image" src="https://example.com/main-desktop.jpg" />
        <div class="item-title">Test Necklace</div>
        <div class="item-price">$50</div>
      `;

      categoriesView.generatePreview(mockItem, '', true);

      const description = document.querySelector('.item-description_modal');
      expect(description).toBeTruthy();
      expect(description.innerHTML).toContain(mockProduct.description);
    });

    it('should display product title in modal', () => {
      const mockItem = document.createElement('div');
      mockItem.classList.add('item-container');
      mockItem.dataset.id = '101';
      mockItem.dataset.quant = '10';
      mockItem.dataset.currency = '$';
      mockItem.innerHTML = `
        <img class="front-image" src="https://example.com/main-desktop.jpg" />
        <div class="item-title">Test Necklace</div>
        <div class="item-price">$50</div>
      `;

      categoriesView.generatePreview(mockItem, '', true);

      const title = document.querySelector('.item-title_modal');
      expect(title).toBeTruthy();
      expect(title.textContent).toBe('Test Necklace');
    });

    it('should handle products without description gracefully', () => {
      const productWithoutDesc = createProduct({
        id: 102,
        name: 'No Description Product',
        description: null,
        usd_price: 30,
        ils_price: 111,
        quantity: 5
      });

      categoriesView.products.push(productWithoutDesc);

      const mockItem = document.createElement('div');
      mockItem.classList.add('item-container');
      mockItem.dataset.id = '102';
      mockItem.dataset.quant = '5';
      mockItem.dataset.currency = '$';
      mockItem.innerHTML = `
        <img class="front-image" src="https://example.com/main-desktop.jpg" />
        <div class="item-title">No Description Product</div>
        <div class="item-price">$30</div>
      `;

      categoriesView.generatePreview(mockItem, '', true);

      // Modal should still render without errors
      const modal = document.querySelector('.modal');
      expect(modal.innerHTML).toBeTruthy();

      // Description element may not exist or be empty
      const description = document.querySelector('.item-description_modal');
      if (description) {
        expect(description.innerHTML.trim()).toBe('');
      }
    });
  });

  describe('Modal Price Display (PAGE-07)', () => {
    it('should show price with current currency symbol in modal', () => {
      const mockItem = document.createElement('div');
      mockItem.classList.add('item-container');
      mockItem.dataset.id = '101';
      mockItem.dataset.quant = '10';
      mockItem.dataset.currency = '$';
      mockItem.innerHTML = `
        <img class="front-image" src="https://example.com/main-desktop.jpg" />
        <div class="item-title">Test Necklace</div>
        <div class="item-price">$50</div>
      `;

      categoriesView.selectedCurrency = 'usd';
      categoriesView.generatePreview(mockItem, '', true);

      const priceText = document.querySelector('.price-text-modal');
      expect(priceText).toBeTruthy();
      expect(priceText.textContent).toContain('$');
      expect(priceText.textContent).toContain('50');
    });

    it('should show USD price when currency is USD', () => {
      const mockItem = document.createElement('div');
      mockItem.classList.add('item-container');
      mockItem.dataset.id = '101';
      mockItem.dataset.quant = '10';
      mockItem.dataset.currency = '$';
      mockItem.innerHTML = `
        <img class="front-image" src="https://example.com/main-desktop.jpg" />
        <div class="item-title">Test Necklace</div>
        <div class="item-price">$50</div>
      `;

      categoriesView.selectedCurrency = 'usd';
      categoriesView.generatePreview(mockItem, '', true);

      const priceText = document.querySelector('.price-text-modal');
      expect(priceText.textContent).toContain('$');
      expect(priceText.textContent).not.toContain('₪');
    });

    it('should show ILS price when currency is ILS', () => {
      const mockItem = document.createElement('div');
      mockItem.classList.add('item-container');
      mockItem.dataset.id = '101';
      mockItem.dataset.quant = '10';
      mockItem.dataset.currency = '₪';
      mockItem.innerHTML = `
        <img class="front-image" src="https://example.com/main-desktop.jpg" />
        <div class="item-title">Test Necklace</div>
        <div class="item-price">₪185</div>
      `;

      categoriesView.selectedCurrency = 'ils';
      categoriesView.generatePreview(mockItem, '', true);

      const priceText = document.querySelector('.price-text-modal');
      expect(priceText.textContent).toContain('₪');
      expect(priceText.textContent).not.toContain('$');
    });
  });

  describe('Modal Add to Cart (PAGE-08)', () => {
    it('should call model.handleAddToCart when add-to-cart button clicked', () => {
      const handleAddToCartSpy = vi.spyOn(model, 'handleAddToCart');

      const mockItem = document.createElement('div');
      mockItem.classList.add('item-container');
      mockItem.dataset.id = '101';
      mockItem.dataset.quant = '10';
      mockItem.dataset.currency = '$';
      mockItem.innerHTML = `
        <img class="front-image" src="https://example.com/main-desktop.jpg" />
        <div class="item-title">Test Necklace</div>
        <div class="item-price">$50</div>
      `;

      categoriesView.generatePreview(mockItem, '', true);

      const addToCartBtn = document.querySelector('.add-to-cart-btn_modal');
      expect(addToCartBtn).toBeTruthy();

      addToCartBtn.click();

      expect(handleAddToCartSpy).toHaveBeenCalled();
    });

    it('should show "Added to Cart!" feedback after click', () => {
      vi.spyOn(model, 'handleAddToCart');

      const mockItem = document.createElement('div');
      mockItem.classList.add('item-container');
      mockItem.dataset.id = '101';
      mockItem.dataset.quant = '10';
      mockItem.dataset.currency = '$';
      mockItem.innerHTML = `
        <img class="front-image" src="https://example.com/main-desktop.jpg" />
        <div class="item-title">Test Necklace</div>
        <div class="item-price">$50</div>
      `;

      // Add cart number elements to DOM
      render(`
        <header>
          <div class="cart-number-mobile">0</div>
        </header>
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

      categoriesView.generatePreview(mockItem, '', true);

      const addToCartBtn = document.querySelector('.add-to-cart-btn_modal');
      addToCartBtn.click();

      // Check button text changed
      expect(addToCartBtn.textContent).toContain('Added to Cart!');
    });

    it('should increment cart number after adding to cart', () => {
      vi.spyOn(model, 'handleAddToCart');

      // Add cart number elements to DOM
      const headerWithCart = `
        <header>
          <div class="cart-number-mobile">0</div>
        </header>
        <div class="menu"></div>
        <div data-purpose="header-utilities"></div>
        <div class="footer"></div>
        <div class="modal"></div>
        <div class="outer-products-container">
          <div class="inner-products-container"></div>
          <div class="loader spinner-hidden"></div>
        </div>
        <div class="category-title">NECKLACES</div>
      `;

      render(headerWithCart);

      const mockItem = document.createElement('div');
      mockItem.classList.add('item-container');
      mockItem.dataset.id = '101';
      mockItem.dataset.quant = '10';
      mockItem.dataset.currency = '$';
      mockItem.innerHTML = `
        <img class="front-image" src="https://example.com/main-desktop.jpg" />
        <div class="item-title">Test Necklace</div>
        <div class="item-price">$50</div>
      `;

      categoriesView.generatePreview(mockItem, '', true);

      const cartNumber = document.querySelector('.cart-number-mobile');
      const initialCount = parseInt(cartNumber.textContent);

      const addToCartBtn = document.querySelector('.add-to-cart-btn_modal');
      addToCartBtn.click();

      const newCount = parseInt(cartNumber.textContent);
      expect(newCount).toBe(initialCount + 1);
    });
  });

  describe('Modal Close Methods', () => {
    it('should close modal when X button clicked', () => {
      const mockItem = document.createElement('div');
      mockItem.classList.add('item-container');
      mockItem.dataset.id = '101';
      mockItem.dataset.quant = '10';
      mockItem.dataset.currency = '$';
      mockItem.innerHTML = `
        <img class="front-image" src="https://example.com/main-desktop.jpg" />
        <div class="item-title">Test Necklace</div>
        <div class="item-price">$50</div>
      `;

      categoriesView.generatePreview(mockItem, '', true);

      const modal = document.querySelector('.modal');
      expect(modal.innerHTML).not.toBe('');
      expect(categoriesView.isModalOpen).toBe(true);

      const closeBtn = document.querySelector('.close-modal-btn');
      expect(closeBtn).toBeTruthy();

      closeBtn.click();

      expect(modal.innerHTML).toBe('');
      expect(categoriesView.isModalOpen).toBe(false);
    });

    it('should close modal when overlay background clicked', () => {
      const mockItem = document.createElement('div');
      mockItem.classList.add('item-container');
      mockItem.dataset.id = '101';
      mockItem.dataset.quant = '10';
      mockItem.dataset.currency = '$';
      mockItem.innerHTML = `
        <img class="front-image" src="https://example.com/main-desktop.jpg" />
        <div class="item-title">Test Necklace</div>
        <div class="item-price">$50</div>
      `;

      categoriesView.generatePreview(mockItem, '', true);

      const modal = document.querySelector('.modal');
      expect(modal.innerHTML).not.toBe('');

      const overlay = document.querySelector('.item-overlay');
      expect(overlay).toBeTruthy();

      // Click directly on overlay (not on modal-content)
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      Object.defineProperty(clickEvent, 'target', { value: overlay, enumerable: true });

      overlay.dispatchEvent(clickEvent);

      expect(modal.innerHTML).toBe('');
      expect(categoriesView.isModalOpen).toBe(false);
    });

    it('should restore body scrolling when modal closes', () => {
      const mockItem = document.createElement('div');
      mockItem.classList.add('item-container');
      mockItem.dataset.id = '101';
      mockItem.dataset.quant = '10';
      mockItem.dataset.currency = '$';
      mockItem.innerHTML = `
        <img class="front-image" src="https://example.com/main-desktop.jpg" />
        <div class="item-title">Test Necklace</div>
        <div class="item-price">$50</div>
      `;

      categoriesView.generatePreview(mockItem, '', true);

      // Modal open should disable scroll
      expect(document.body.style.overflow).toBe('hidden');

      const closeBtn = document.querySelector('.close-modal-btn');
      closeBtn.click();

      // Modal close should restore scroll
      expect(document.body.style.overflow).toBe('');
    });
  });
});
