import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, renderHTML, clearDOM, waitForDOM, simulateClick, simulateInput, screen } from './helpers/dom.js';
import { createProduct, createProducts, createCartItem, createCart, resetFactoryCounter } from './helpers/factories.js';
import userEvent from '@testing-library/user-event';

describe('Frontend Test Infrastructure', () => {
  beforeEach(() => {
    clearDOM();
  });

  describe('Happy-DOM Environment', () => {
    it('should have access to document and window', () => {
      expect(document).toBeDefined();
      expect(window).toBeDefined();
      expect(document.body).toBeDefined();
    });

    it('should have localStorage available and functional', () => {
      localStorage.setItem('test-key', 'test-value');
      expect(localStorage.getItem('test-key')).toBe('test-value');
      localStorage.setItem('test-key', 'updated-value');
      expect(localStorage.getItem('test-key')).toBe('updated-value');
      localStorage.removeItem('test-key');
      expect(localStorage.getItem('test-key')).toBeNull();
    });

    it('should clean up localStorage between tests', () => {
      // Previous test removed 'test-key', this test should not see it
      // (setup.js afterEach clears localStorage)
      expect(localStorage.getItem('test-key')).toBeNull();
      expect(localStorage.length).toBe(0);
    });

    it('should clear DOM between tests', () => {
      // Previous tests rendered HTML, this test should start with clean DOM
      // (beforeEach calls clearDOM)
      expect(document.body.innerHTML).toBe('');
      expect(document.body.children.length).toBe(0);
    });
  });

  describe('Testing Library Integration', () => {
    it('should query by role', () => {
      const { getByRole } = render(`
        <button>Add to Cart</button>
        <h1>Test Heading</h1>
        <input type="text" />
      `);

      const button = getByRole('button', { name: /add to cart/i });
      expect(button).toBeDefined();
      expect(button.tagName).toBe('BUTTON');

      const heading = getByRole('heading', { level: 1 });
      expect(heading.textContent).toBe('Test Heading');

      const input = getByRole('textbox');
      expect(input.tagName).toBe('INPUT');
    });

    it('should query by text', () => {
      const { getByText } = render(`
        <div>Welcome to the store</div>
        <p>Browse our collection</p>
      `);

      const welcomeDiv = getByText(/welcome to the store/i);
      expect(welcomeDiv.textContent).toBe('Welcome to the store');

      const browsePara = getByText(/browse our collection/i);
      expect(browsePara.tagName).toBe('P');
    });

    it('should query by label text', () => {
      const { getByLabelText } = render(`
        <label for="username">Username:</label>
        <input id="username" type="text" />

        <label for="email">Email:</label>
        <input id="email" type="email" />
      `);

      const usernameInput = getByLabelText(/username/i);
      expect(usernameInput.id).toBe('username');

      const emailInput = getByLabelText(/email/i);
      expect(emailInput.type).toBe('email');
    });

    it('should throw when element not found', () => {
      const { getByRole, queryByRole } = render('<div>No button here</div>');

      // queryBy returns null when not found (doesn't throw)
      const button = queryByRole('button');
      expect(button).toBeNull();

      // getBy throws when not found
      expect(() => {
        getByRole('button');
      }).toThrow();
    });

    it('should use screen for global queries', () => {
      render(`
        <h1>Product Page</h1>
        <button>Add to Cart</button>
        <p>Product description here</p>
      `);

      // screen queries the entire document
      expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
      expect(screen.getByRole('button', { name: /add to cart/i })).toBeDefined();
      expect(screen.getByText(/product description/i)).toBeDefined();
    });
  });

  describe('Factory Functions', () => {
    beforeEach(() => {
      resetFactoryCounter();
    });

    it('should create unique products with sequential IDs', () => {
      const p1 = createProduct();
      const p2 = createProduct();
      const p3 = createProduct();

      // IDs should be sequential starting from 1001
      expect(p1.id).toBe(1001);
      expect(p2.id).toBe(1002);
      expect(p3.id).toBe(1003);

      // Each product should have unique properties
      expect(p1.name).not.toBe(p2.name);
      expect(p1.sku).not.toBe(p2.sku);
      expect(p2.name).not.toBe(p3.name);
    });

    it('should reset counter for predictable sequences', () => {
      const p1 = createProduct();
      expect(p1.id).toBe(1001);

      resetFactoryCounter();

      const p2 = createProduct();
      expect(p2.id).toBe(1001); // Resets back to 1001
      expect(p2.name).toBe('Test Product 1');
    });

    it('should apply overrides to products', () => {
      const product = createProduct({
        name: 'Custom Gold Necklace',
        category: 'necklaces',
        usd_price: 250,
        available: false
      });

      expect(product.name).toBe('Custom Gold Necklace');
      expect(product.category).toBe('necklaces');
      expect(product.usd_price).toBe(250);
      expect(product.available).toBe(false);

      // Other properties should still have defaults
      expect(product.id).toBe(1001);
      expect(product.sku).toBe('T001');
    });

    it('should create cart items from products', () => {
      const product = createProduct({
        name: 'Silver Ring',
        ils_price: 370,
        category: 'rings'
      });
      const cartItem = createCartItem(product, 2);

      expect(cartItem.id).toBe(product.id);
      expect(cartItem.title).toBe('Silver Ring');
      expect(cartItem.quantity).toBe(2);
      expect(cartItem.price).toBe(370);
      expect(cartItem.category).toBe('rings');
      expect(cartItem.sku).toBe(product.sku);
    });

    it('should batch create multiple products', () => {
      const products = createProducts(5, { category: 'earrings' });

      expect(products).toHaveLength(5);

      // All should have the common override
      products.forEach(p => {
        expect(p.category).toBe('earrings');
      });

      // But each should have unique IDs
      const ids = products.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    it('should create full cart with multiple items', () => {
      const p1 = createProduct({ name: 'Product A' });
      const p2 = createProduct({ name: 'Product B' });
      const p3 = createProduct({ name: 'Product C' });

      const cart = createCart([
        { product: p1, quantity: 1 },
        { product: p2, quantity: 3 },
        { product: p3, quantity: 2 }
      ]);

      expect(cart).toHaveLength(3);
      expect(cart[0].title).toBe('Product A');
      expect(cart[0].quantity).toBe(1);
      expect(cart[1].title).toBe('Product B');
      expect(cart[1].quantity).toBe(3);
      expect(cart[2].title).toBe('Product C');
      expect(cart[2].quantity).toBe(2);
    });
  });

  describe('User Interaction Simulation', () => {
    it('should simulate click events', () => {
      let clicked = false;
      renderHTML('<button id="test-btn">Click Me</button>');
      const btn = document.getElementById('test-btn');

      btn.addEventListener('click', () => { clicked = true; });
      simulateClick(btn);

      expect(clicked).toBe(true);
    });

    it('should simulate input events', () => {
      renderHTML('<input type="text" id="test-input" />');
      const input = document.getElementById('test-input');

      let inputValue = '';
      input.addEventListener('input', (e) => { inputValue = e.target.value; });

      simulateInput(input, 'test value');

      expect(input.value).toBe('test value');
      expect(inputValue).toBe('test value');
    });

    it('should use user-event for realistic interactions', async () => {
      render(`
        <button id="click-btn">Click Count: 0</button>
        <input type="text" id="type-input" />
      `);

      const button = document.getElementById('click-btn');
      let clickCount = 0;
      button.addEventListener('click', () => {
        clickCount++;
        button.textContent = `Click Count: ${clickCount}`;
      });

      const user = userEvent.setup();

      // User-event provides realistic click behavior
      await user.click(button);
      expect(clickCount).toBe(1);
      expect(button.textContent).toBe('Click Count: 1');

      await user.click(button);
      expect(clickCount).toBe(2);

      // User-event provides realistic typing behavior
      const input = document.getElementById('type-input');
      await user.type(input, 'Hello World');
      expect(input.value).toBe('Hello World');
    });
  });

  describe('Async DOM Utilities', () => {
    it('should wait for element to appear with waitForDOM', async () => {
      renderHTML('<div id="container"></div>');
      const container = document.getElementById('container');

      // Simulate async element addition
      setTimeout(() => {
        container.innerHTML = '<p class="delayed-element">I appeared!</p>';
      }, 100);

      const element = await waitForDOM('.delayed-element');
      expect(element).toBeDefined();
      expect(element.textContent).toBe('I appeared!');
    });

    it('should reject when element not found within timeout', async () => {
      renderHTML('<div id="container"></div>');

      // Don't add the element, so waitForDOM should timeout
      await expect(
        waitForDOM('.non-existent-element', 500)
      ).rejects.toThrow(/not found within 500ms/);
    });
  });
});
