import { describe, it, expect, beforeEach } from 'vitest';
import { renderHTML, clearDOM, render, screen } from './helpers/dom.js';
import { createProduct, createCartItem, createCart, resetFactoryCounter } from './helpers/factories.js';

describe('Frontend Test Infrastructure', () => {
  beforeEach(() => {
    clearDOM();
  });

  it('should have access to document and window', () => {
    expect(document).toBeDefined();
    expect(window).toBeDefined();
  });

  it('should be able to render and query DOM', () => {
    renderHTML('<div id="test-element">Hello</div>');
    const element = document.getElementById('test-element');
    expect(element).toBeDefined();
    expect(element.textContent).toBe('Hello');
  });

  it('should have localStorage available', () => {
    localStorage.setItem('test-key', 'test-value');
    expect(localStorage.getItem('test-key')).toBe('test-value');
  });

  it('should clean up localStorage between tests', () => {
    // Previous test set 'test-key', this test should not see it
    // (setup.js afterEach clears localStorage)
    expect(localStorage.getItem('test-key')).toBeNull();
  });

  it('should be able to add event listeners', () => {
    let clicked = false;
    renderHTML('<button id="test-btn">Click me</button>');
    const btn = document.getElementById('test-btn');
    btn.addEventListener('click', () => { clicked = true; });
    btn.click();
    expect(clicked).toBe(true);
  });

  describe('Testing Library integration', () => {
    it('should use semantic queries with render()', () => {
      const { getByRole, getByText } = render('<button>Add to Cart</button>');
      const button = getByRole('button', { name: /add to cart/i });
      expect(button).toBeDefined();
      expect(getByText(/add to cart/i)).toBe(button);
    });

    it('should use screen for global queries', () => {
      render('<h1>Test Page</h1><p>Content here</p>');
      expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
      expect(screen.getByText(/content here/i)).toBeDefined();
    });
  });

  describe('Test data factories', () => {
    beforeEach(() => {
      resetFactoryCounter();
    });

    it('should create unique products', () => {
      const p1 = createProduct();
      const p2 = createProduct();
      expect(p1.id).not.toBe(p2.id);
      expect(p1.name).not.toBe(p2.name);
      expect(p1.sku).not.toBe(p2.sku);
    });

    it('should apply overrides to products', () => {
      const product = createProduct({ name: 'Custom Product', category: 'rings' });
      expect(product.name).toBe('Custom Product');
      expect(product.category).toBe('rings');
    });

    it('should create cart items from products', () => {
      const product = createProduct();
      const cartItem = createCartItem(product, 2);
      expect(cartItem.id).toBe(product.id);
      expect(cartItem.title).toBe(product.name);
      expect(cartItem.quantity).toBe(2);
      expect(cartItem.price).toBe(product.ils_price);
    });

    it('should create full cart with multiple items', () => {
      const p1 = createProduct();
      const p2 = createProduct();
      const cart = createCart([
        { product: p1, quantity: 1 },
        { product: p2, quantity: 3 }
      ]);
      expect(cart).toHaveLength(2);
      expect(cart[0].quantity).toBe(1);
      expect(cart[1].quantity).toBe(3);
    });
  });
});
