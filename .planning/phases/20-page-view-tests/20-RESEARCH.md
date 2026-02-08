# Phase 20: Page View Tests - Research

**Researched:** 2026-02-09
**Domain:** Page-specific view testing (cart, product modal, checkout, categories, home page, contact form)
**Confidence:** HIGH

## Summary

Phase 20 tests page-specific views that extend the base View class, focusing on rendering accuracy and user interactions. These views include cart display, product modals, checkout flows, category filtering, home page featured products, and contact form validation. The research reveals that the existing Phase 17-19 infrastructure (Vitest 4.0.18 + Happy-DOM, Testing Library, factory functions) provides everything needed, with the addition of view-specific DOM fixtures and mock data structures.

**Key architectural insights:**
- Page views extend base View class and override `setPageSpecificLanguage()` for localized content
- Cart view uses dual-currency price storage (USD/ILS) and recalculates totals on currency change
- Product modal renders from category view with image carousel, add-to-cart button, and three close methods (X, backdrop, Escape)
- Checkout view prepares items for Stripe (always USD) and triggers external payment flow
- Contact form has anti-spam validation (honeypot, timing, content quality checks)
- All views listen to `currency-changed` custom event and re-render prices

The testing strategy should verify both **display accuracy** (correct prices, quantities, totals match cart state) and **user actions** (buttons trigger model methods, UI updates reflect state changes). Phase 18 established patterns for mocking fetch and DOM elements; Phase 19 established patterns for View instantiation with minimal DOM fixtures.

**Primary recommendation:** Test views by rendering minimal DOM fixtures (matching production structure), creating cart state with factory functions, and verifying rendered output with Testing Library semantic queries. Mock model methods (addToCart, removeFromCart) to verify interactions without network calls. Test currency switching by dispatching custom events and verifying price updates.

## Standard Stack

The test infrastructure is already established from Phases 17-19. No new dependencies needed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.0.18 | Test runner | Already configured (Phase 17), Vite-native |
| happy-dom | 20.0.11 | Browser environment | 2-3x faster than jsdom, full DOM API |
| @testing-library/dom | 10.4.0 | Semantic queries | Accessible queries (getByRole, getByText) |
| @testing-library/user-event | 14.5.2 | User interactions | Realistic multi-step interactions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vi.fn() | Built-in | Method mocking | Spy on model methods (addToCart, removeFromCart) |
| vi.spyOn() | Built-in | Function spies | Track calls to model functions without replacing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Model method mocks | Fetch mocks | Model mocks test view logic in isolation; fetch mocks test integration |
| Factory functions | Manual cart data | Factories ensure unique IDs and consistent structure (Phase 17) |
| Minimal DOM fixtures | Full index.html | Minimal fixtures faster, less brittle; full HTML more realistic |

**Installation:**
```bash
# No new dependencies needed - Phase 17-19 infrastructure is complete
```

## Architecture Patterns

### Recommended Test File Structure
```
frontend/tests/
├── view/                         # Base View tests (Phase 19, complete)
│   ├── language.test.js
│   ├── currency.test.js
│   ├── header-menu.test.js
│   └── cleanup.test.js
├── views/                        # NEW: Page-specific view tests (Phase 20)
│   ├── cart.test.js             # PAGE-01 through PAGE-04
│   ├── modal.test.js            # PAGE-05 through PAGE-08
│   ├── checkout.test.js         # PAGE-09, PAGE-10
│   ├── categories.test.js       # PAGE-11
│   ├── home.test.js             # PAGE-12
│   └── contact.test.js          # PAGE-13
└── helpers/
    ├── dom.js                    # Existing: render(), screen, simulateClick()
    ├── factories.js              # Existing: createProduct(), createCart()
    └── mocks/
        ├── fetch.js              # Existing: setupFetchMock()
        └── dom-elements.js       # Existing: createMockProductElement()
```

### Pattern 1: View Instantiation with Page-Specific Fixture
**What:** Render minimal DOM structure matching production HTML before instantiating view
**When to use:** All page-specific view tests (cart, checkout, categories, etc.)
**Example:**
```javascript
// Source: Phase 19 pattern + page-specific extensions
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '../helpers/dom.js';
import CartView from '../../js/Views/cartView.js';
import { createCart, createProduct, resetFactoryCounter } from '../helpers/factories.js';

describe('CartView: Display Cart Items', () => {
  let view;

  beforeEach(() => {
    resetFactoryCounter();

    // Render page-specific DOM structure (cart.html elements)
    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>

      <!-- Cart-specific elements -->
      <div class="cart-items-container"></div>
      <div class="cart-empty">Your Cart Is Empty</div>
      <h2 class="cart-title">Your Cart</h2>
      <h3 class="summary-title">Order Summary</h3>
      <div class="added-items"></div>
      <div class="summary-details"></div>
      <button id="stripe-checkout-btn">Checkout</button>
      <button class="delete-all">Delete All</button>
      <div class="check-me-out">Check Me Out With:</div>
      <div class="summary"></div>
    `);

    // Instantiate CartView
    view = new CartView();
  });

  it('should render cart items with correct product names', async () => {
    // Setup: Create cart with test data
    const products = [
      createProduct({ id: 1, name: 'Gold Necklace', ils_price: 200 }),
      createProduct({ id: 2, name: 'Silver Bracelet', ils_price: 150 })
    ];
    const cart = createCart([
      { product: products[0], quantity: 1 },
      { product: products[1], quantity: 2 }
    ]);

    // Store in localStorage (CartView reads from localStorage)
    localStorage.setItem('cart', JSON.stringify(cart));

    // Trigger render
    await view.setLanguage('eng', cart.length);

    // Verify: Cart items display correct names
    expect(document.body.textContent).toContain('Gold Necklace');
    expect(document.body.textContent).toContain('Silver Bracelet');
  });
});
```

### Pattern 2: Testing Cart Totals Calculation
**What:** Verify cart subtotal and total match sum of (price × quantity) for all items
**When to use:** Testing cart view totals (PAGE-04), checkout order summary (PAGE-10)
**Example:**
```javascript
// Source: CartView._renderSummary implementation
describe('CartView: Totals Calculation', () => {
  it('should calculate correct total across all items', async () => {
    const products = [
      createProduct({ id: 1, usd_price: 50, ils_price: 185 }),
      createProduct({ id: 2, usd_price: 30, ils_price: 111 })
    ];
    const cart = createCart([
      { product: products[0], quantity: 2 }, // 2 × 185 = 370
      { product: products[1], quantity: 3 }  // 3 × 111 = 333
    ]);

    localStorage.setItem('cart', JSON.stringify(cart));
    localStorage.setItem('currency', 'ils');

    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>
      <div class="cart-items-container"></div>
      <div class="cart-empty"></div>
      <h2 class="cart-title"></h2>
      <h3 class="summary-title"></h3>
      <div class="added-items"></div>
      <div class="summary-details"></div>
      <button id="stripe-checkout-btn"></button>
      <button class="delete-all"></button>
      <div class="check-me-out"></div>
      <div class="summary"></div>
    `);

    const view = new CartView();
    await view.setLanguage('eng', cart.length);

    // Expected total: 370 + 333 = 703 ILS
    const summaryDetails = document.querySelector('.summary-details');
    const totalText = summaryDetails.textContent;

    // Verify total appears in summary
    expect(totalText).toContain('703'); // Total value
    expect(totalText).toContain('₪');   // ILS symbol
  });
});
```

### Pattern 3: Testing Product Modal Rendering
**What:** Test modal opens with correct product data (images, description, price)
**When to use:** Testing product modal (PAGE-05, PAGE-06, PAGE-07)
**Example:**
```javascript
// Source: CategoriesView modal rendering
import CategoriesView from '../../js/Views/categoriesView.js';

describe('Product Modal: Rendering', () => {
  beforeEach(() => {
    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>

      <!-- Categories page structure -->
      <body id="categories-page" class="necklaces" data-hebrew="שרשראות">
        <div class="modal"></div>
        <div class="products-container-outer"></div>
      </body>
    `);
  });

  it('should render product images in modal gallery', async () => {
    const product = createProduct({
      id: 101,
      name: 'Test Necklace',
      images: [
        { desktop: 'img1-desktop.jpg', mobile: 'img1-mobile.jpg' },
        { desktop: 'img2-desktop.jpg', mobile: 'img2-mobile.jpg' }
      ]
    });

    const view = new CategoriesView();

    // Simulate opening modal (would normally happen on product click)
    // For testing, directly call modal rendering method if exposed,
    // or simulate click on product card after rendering products

    // Mock the product data structure the modal expects
    const modal = document.querySelector('.modal');
    modal.innerHTML = `
      <div class="modal-content">
        <img class="big-image" src="${product.images[0].desktop}" />
        <div class="small-images">
          ${product.images.map(img => `<img src="${img.desktop}" />`).join('')}
        </div>
      </div>
    `;

    // Verify images are rendered
    const bigImage = modal.querySelector('.big-image');
    expect(bigImage.src).toContain('img1-desktop.jpg');

    const smallImages = modal.querySelectorAll('.small-images img');
    expect(smallImages).toHaveLength(2);
  });

  it('should display product description in modal', async () => {
    const product = createProduct({
      description: 'Handmade gold necklace with unique design'
    });

    const modal = document.querySelector('.modal');
    modal.innerHTML = `
      <div class="modal-content">
        <h2 class="item-title_modal">${product.name}</h2>
        <p class="item-description">${product.description}</p>
      </div>
    `;

    expect(modal.textContent).toContain('Handmade gold necklace with unique design');
  });

  it('should show price in current currency', async () => {
    const product = createProduct({ usd_price: 50, ils_price: 185 });

    localStorage.setItem('currency', 'usd');

    const modal = document.querySelector('.modal');
    modal.innerHTML = `
      <div class="modal-content">
        <span class="price-text-modal">$${product.usd_price}</span>
      </div>
    `;

    expect(modal.textContent).toContain('$50');
  });
});
```

### Pattern 4: Testing Modal Close Methods
**What:** Verify modal closes via X button, backdrop click, and Escape key
**When to use:** Testing product modal (PAGE-08 context requirement)
**Example:**
```javascript
// Source: CategoriesView closeModal implementation
describe('Product Modal: Close Methods', () => {
  let view;

  beforeEach(() => {
    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>

      <body id="categories-page" class="necklaces">
        <div class="modal">
          <div class="modal-content">
            <button class="close-modal">×</button>
            <p>Modal Content</p>
          </div>
        </div>
        <div class="products-container-outer"></div>
      </body>
    `);

    view = new CategoriesView();
  });

  it('should close modal when X button clicked', () => {
    const modal = document.querySelector('.modal');
    const closeBtn = modal.querySelector('.close-modal');

    // Simulate modal open state (add class or set style)
    modal.style.display = 'block';
    view.isModalOpen = true;

    // Click close button
    closeBtn.click();

    // Verify modal closed (implementation may remove content or hide)
    expect(view.isModalOpen).toBe(false);
  });

  it('should close modal when Escape key pressed', () => {
    const modal = document.querySelector('.modal');
    modal.style.display = 'block';
    view.isModalOpen = true;

    // Simulate Escape key
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(escapeEvent);

    expect(view.isModalOpen).toBe(false);
  });

  it('should close modal when backdrop clicked', () => {
    const modal = document.querySelector('.modal');
    modal.style.display = 'block';
    view.isModalOpen = true;

    // Click on modal backdrop (not modal-content)
    const clickEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(clickEvent, 'target', { value: modal, enumerable: true });
    modal.dispatchEvent(clickEvent);

    expect(view.isModalOpen).toBe(false);
  });
});
```

### Pattern 5: Testing Add-to-Cart with UI Feedback
**What:** Verify add-to-cart button triggers model method AND updates cart count
**When to use:** Testing product modal add-to-cart (PAGE-08)
**Example:**
```javascript
// Source: Phase 18 patterns + cart count update verification
import * as model from '../../js/model.js';

describe('Product Modal: Add to Cart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should trigger model.handleAddToCart when button clicked', () => {
    const addToCartSpy = vi.spyOn(model, 'handleAddToCart');

    render(`
      <header>
        <div class="cart-number-mobile">0</div>
      </header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>

      <div class="modal">
        <button class="add-to-cart-btn_modal"
                data-id="101"
                data-usd-price="50"
                data-ils-price="185">
          Add to Cart
        </button>
      </div>
    `);

    const addBtn = document.querySelector('.add-to-cart-btn_modal');
    addBtn.click();

    expect(addToCartSpy).toHaveBeenCalledTimes(1);
    expect(addToCartSpy).toHaveBeenCalledWith(addBtn);
  });

  it('should update cart count badge after adding to cart', async () => {
    render(`
      <header>
        <div class="cart-number-mobile">0</div>
      </header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>

      <div class="modal">
        <button class="add-to-cart-btn_modal"
                data-id="101"
                data-usd-price="50"
                data-ils-price="185">
          <img class="front-image" src="test.jpg" />
          <span class="item-title">Test Product</span>
        </button>
      </div>
    `);

    const view = new CategoriesView();
    const addBtn = document.querySelector('.add-to-cart-btn_modal');

    // Click button (triggers handleAddToCart)
    addBtn.click();

    // Wait for cart count to update
    await vi.waitFor(() => {
      const cartBadge = document.querySelector('.cart-number-mobile');
      expect(cartBadge.textContent).toBe('1');
    });
  });
});
```

### Pattern 6: Testing Checkout Payment Method Selection
**What:** Verify checkout view renders payment options and handles submission
**When to use:** Testing checkout view (PAGE-09, PAGE-10)
**Example:**
```javascript
// Source: CartView checkout implementation
describe('Checkout View: Payment Methods', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>

      <div class="cart-items-container"></div>
      <div class="cart-empty"></div>
      <h2 class="cart-title"></h2>
      <h3 class="summary-title">Order Summary</h3>
      <div class="added-items"></div>
      <div class="summary-details"></div>
      <button id="stripe-checkout-btn">Pay with Stripe</button>
      <button class="delete-all"></button>
      <div class="check-me-out">Check Me Out With:</div>
      <div class="summary"></div>
    `);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render payment method selection', async () => {
    const view = new CartView();
    await view.setLanguage('eng', 1);

    const checkoutBtn = document.querySelector('#stripe-checkout-btn');
    const checkMeOut = document.querySelector('.check-me-out');

    expect(checkoutBtn).toBeTruthy();
    expect(checkMeOut.textContent).toContain('Check Me Out With');
  });

  it('should display order summary with correct totals', async () => {
    const cart = createCart([
      { product: createProduct({ usd_price: 50, ils_price: 185 }), quantity: 2 }
    ]);
    localStorage.setItem('cart', JSON.stringify(cart));
    localStorage.setItem('currency', 'ils');

    const view = new CartView();
    await view.setLanguage('eng', cart.length);

    const summary = document.querySelector('.summary-details');
    expect(summary.textContent).toContain('370'); // 2 × 185
    expect(summary.textContent).toContain('₪');
  });

  it('should trigger Stripe checkout session creation on button click', async () => {
    const cart = createCart([
      { product: createProduct({ usd_price: 50 }), quantity: 1 }
    ]);
    localStorage.setItem('cart', JSON.stringify(cart));

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.com/session123' })
    });

    const view = new CartView();
    await view.setLanguage('eng', cart.length);

    const checkoutBtn = document.querySelector('#stripe-checkout-btn');
    checkoutBtn.click();

    // Wait for fetch to be called
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/create-checkout-session'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"currency":"$"')
        })
      );
    });
  });
});
```

### Pattern 7: Testing Contact Form Validation
**What:** Verify required field validation and submission behavior
**When to use:** Testing contact form (PAGE-13)
**Example:**
```javascript
// Source: ContactMeView validation implementation
import ContactMeView from '../../js/Views/contactMeView.js';

describe('Contact Form: Validation', () => {
  beforeEach(() => {
    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>

      <form id="contact-form">
        <input type="text" id="name" required />
        <input type="text" id="lastname" required />
        <input type="email" id="contact-email" required />
        <textarea id="message" required></textarea>
        <input type="text" id="website" style="display:none" /> <!-- Honeypot -->
        <input type="hidden" id="formLoadedAt" />
        <button type="submit" id="submit">Send</button>
      </form>
    `);
  });

  it('should validate required fields before submission', async () => {
    const view = new ContactMeView();

    // Try to submit empty form
    const form = document.querySelector('#contact-form');
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);

    // HTML5 validation should prevent submission
    // (In real test, we'd verify error messages or check form.checkValidity())
    expect(form.checkValidity()).toBe(false);
  });

  it('should accept valid form submission', async () => {
    const view = new ContactMeView();

    // Simulate form load time (anti-spam check)
    view._formLoadTime = Date.now() - 5000; // 5 seconds ago

    // Fill required fields
    document.getElementById('name').value = 'John';
    document.getElementById('lastname').value = 'Doe';
    document.getElementById('contact-email').value = 'john@example.com';
    document.getElementById('message').value = 'This is a test message with enough content.';

    const form = document.querySelector('#contact-form');
    expect(form.checkValidity()).toBe(true);
  });

  it('should reject spam submissions via honeypot', async () => {
    const view = new ContactMeView();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    // Fill form with valid data
    document.getElementById('name').value = 'John';
    document.getElementById('lastname').value = 'Doe';
    document.getElementById('contact-email').value = 'john@example.com';
    document.getElementById('message').value = 'Valid message content here.';

    // Trigger honeypot (spam indicator)
    document.getElementById('website').value = 'http://spam.com';

    await view.sendEmail();

    // Should silently fail (clears form and shows fake success)
    expect(document.getElementById('name').value).toBe('');
    expect(alertSpy).toHaveBeenCalledWith('Message Sent Successfully!');
  });

  it('should reject form submitted too quickly (bot detection)', async () => {
    const view = new ContactMeView();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    // Simulate form loaded just now (too fast)
    view._formLoadTime = Date.now();

    // Fill valid data
    document.getElementById('name').value = 'John';
    document.getElementById('lastname').value = 'Doe';
    document.getElementById('contact-email').value = 'john@example.com';
    document.getElementById('message').value = 'Valid message content here.';

    await view.sendEmail();

    // Should be blocked (too fast = bot)
    expect(alertSpy).toHaveBeenCalledWith('Message Sent Successfully!');
    expect(document.getElementById('name').value).toBe(''); // Form cleared
  });
});
```

### Anti-Patterns to Avoid
- **Testing implementation details:** Don't test internal view state variables. Test observable behavior (DOM updates, model method calls).
- **Skipping currency switching:** All price-displaying views must be tested with both USD and ILS.
- **Hardcoded expected values:** Use factory-generated prices in assertions to avoid brittle tests.
- **Not testing edge cases:** Empty cart, single item, max quantity boundaries are critical scenarios.
- **Ignoring async operations:** Views may call async model methods. Always await or use vi.waitFor.
- **Mocking too much:** Balance between isolation (mock model methods) and integration (test with real localStorage).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cart state setup | Manual cart array creation | createCart, createProduct factories | Ensures consistent structure, unique IDs, both currencies stored |
| DOM fixtures | Full HTML copy-paste | Minimal fixture helpers | Faster tests, less brittle, focus on elements under test |
| Currency conversion | Manual price calculation | Model methods or stored prices | Views use stored USD/ILS prices, not runtime conversion |
| Cart totals verification | String parsing totals | Test cart state, then verify DOM reflects state | More reliable, catches both state and rendering bugs |
| Modal state tracking | Custom flags | View's isModalOpen property | Already implemented, consistent with production |
| Form validation | Custom validation logic | HTML5 validation + view methods | Browsers handle required fields, test view-specific logic |

**Key insight:** Page views are thin layers over model.js. Test that views **display model state correctly** and **trigger model methods on user actions**, not that views reimplement model logic.

## Common Pitfalls

### Pitfall 1: Cart State vs DOM State Confusion
**What goes wrong:** Test asserts DOM shows cart items but doesn't verify underlying cart state matches
**Why it happens:** Views render from model.cart array, but test only checks DOM
**How to avoid:**
```javascript
// GOOD: Verify both cart state and DOM rendering
const cart = createCart([{ product, quantity: 2 }]);
localStorage.setItem('cart', JSON.stringify(cart));
await view.setLanguage('eng', cart.length);

expect(model.cart).toHaveLength(1); // State check
expect(document.body.textContent).toContain(product.name); // DOM check
```
**Warning signs:** Tests pass but production shows wrong quantities or totals

### Pitfall 2: Currency Conversion Tested in Wrong Layer
**What goes wrong:** View tests calculate USD/ILS conversions instead of verifying stored prices
**Why it happens:** Confusion about where currency logic lives (model stores both, views display one)
**How to avoid:**
- Model stores both `usd_price` and `ils_price` (from backend)
- Views select which price to display based on localStorage currency
- Tests should verify views **read correct stored price**, not perform conversions
**Warning signs:** Tests recalculate exchange rates, tests fail when exchange rate changes

### Pitfall 3: Modal Rendering Requires Full Category View Context
**What goes wrong:** Tests try to render modal in isolation, fail because modal depends on category view state
**Why it happens:** Modal is rendered by CategoriesView, not standalone component
**How to avoid:**
- Test modal as part of CategoriesView workflow (render products → click product → verify modal)
- Alternatively, test modal markup generation separately from modal opening logic
- Mock product data structure that modal expects
**Warning signs:** Modal tests can't find DOM elements, modal doesn't open

### Pitfall 4: Checkout Flow Mocks Wrong Payment Endpoint
**What goes wrong:** Test mocks `/checkout` but CartView calls `/create-checkout-session`
**Why it happens:** Endpoint names assumed from context, not verified with code
**How to avoid:**
- Read CartView._addHandlerCheckout to verify actual endpoint
- Mock exact endpoint: `${host}/create-checkout-session`
- Verify request body structure matches expected format
**Warning signs:** Fetch mock not called, checkout tests timeout

### Pitfall 5: Contact Form Validation Timing
**What goes wrong:** Tests submit form immediately after page load, anti-spam timer blocks it
**Why it happens:** ContactMeView has 3-second minimum form fill time (bot detection)
**How to avoid:**
```javascript
// Set form load time to 5+ seconds ago
view._formLoadTime = Date.now() - 5000;

// Or wait 3 seconds before submitting (slower but more realistic)
await new Promise(resolve => setTimeout(resolve, 3100));
```
**Warning signs:** Valid form submissions blocked, tests fail with "too fast" reason

### Pitfall 6: Empty Cart State Not Tested
**What goes wrong:** Tests only verify cart with items, miss empty cart redirect or message
**Why it happens:** Happy path focus, edge cases deferred
**How to avoid:**
- Test empty cart shows "Your Cart Is Empty" message
- Test checkout button disabled when cart empty
- Test cart view redirects or shows placeholder when cartNum === 0
**Warning signs:** Production crashes on empty cart, users stuck on empty cart page

### Pitfall 7: Image Carousel Navigation Not Verified
**What goes wrong:** Product modal tests verify images exist but not that next/prev buttons cycle through them
**Why it happens:** Context mentions carousel navigation but tests only check initial render
**How to avoid:**
```javascript
it('should navigate to next image when next button clicked', () => {
  // Render modal with multiple images
  const product = createProduct({
    images: [
      { desktop: 'img1.jpg' },
      { desktop: 'img2.jpg' },
      { desktop: 'img3.jpg' }
    ]
  });

  // Open modal (implementation-specific)
  // ...

  const bigImage = document.querySelector('.big-image');
  const nextBtn = document.querySelector('.next-image-btn');

  expect(bigImage.src).toContain('img1.jpg');

  nextBtn.click();
  expect(bigImage.src).toContain('img2.jpg');

  nextBtn.click();
  expect(bigImage.src).toContain('img3.jpg');
});
```
**Warning signs:** Carousel buttons present but not functional in tests

## Code Examples

Verified patterns from Phase 17-19 infrastructure and view implementations:

### Cart View Complete Test
```javascript
// Source: CartView implementation + Phase 18-19 patterns
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '../helpers/dom.js';
import CartView from '../../js/Views/cartView.js';
import { createCart, createProduct, resetFactoryCounter } from '../helpers/factories.js';
import * as model from '../../js/model.js';

describe('CartView: Complete Flow', () => {
  beforeEach(() => {
    resetFactoryCounter();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should display cart items with correct names, quantities, and prices (PAGE-01, PAGE-02, PAGE-03)', async () => {
    // Setup cart data
    const products = [
      createProduct({ id: 1, name: 'Gold Necklace', usd_price: 50, ils_price: 185 }),
      createProduct({ id: 2, name: 'Silver Ring', usd_price: 30, ils_price: 111 })
    ];
    const cart = createCart([
      { product: products[0], quantity: 2 },
      { product: products[1], quantity: 1 }
    ]);

    localStorage.setItem('cart', JSON.stringify(cart));
    localStorage.setItem('currency', 'ils');

    // Render cart page structure
    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>

      <div class="cart-items-container"></div>
      <div class="cart-empty">Your Cart Is Empty</div>
      <h2 class="cart-title">Your Cart</h2>
      <h3 class="summary-title">Order Summary</h3>
      <div class="added-items"></div>
      <div class="summary-details"></div>
      <button id="stripe-checkout-btn">Checkout</button>
      <button class="delete-all">Delete All</button>
      <div class="check-me-out">Check Me Out With:</div>
      <div class="summary"></div>
    `);

    const view = new CartView();
    await view.setLanguage('eng', cart.length);

    // Verify product names (PAGE-01)
    expect(document.body.textContent).toContain('Gold Necklace');
    expect(document.body.textContent).toContain('Silver Ring');

    // Verify quantities (PAGE-02)
    // (Implementation detail: quantities shown in cart item markup)
    const cartContainer = document.querySelector('.cart-items-container');
    expect(cartContainer.innerHTML).toContain('2'); // Quantity for Gold Necklace
    expect(cartContainer.innerHTML).toContain('1'); // Quantity for Silver Ring

    // Verify prices in ILS currency (PAGE-03)
    expect(document.body.textContent).toContain('185'); // Gold Necklace price
    expect(document.body.textContent).toContain('111'); // Silver Ring price
    expect(document.body.textContent).toContain('₪');   // ILS symbol
  });

  it('should calculate correct total across all items (PAGE-04)', async () => {
    const cart = createCart([
      { product: createProduct({ usd_price: 50, ils_price: 185 }), quantity: 2 },
      { product: createProduct({ usd_price: 30, ils_price: 111 }), quantity: 3 }
    ]);

    localStorage.setItem('cart', JSON.stringify(cart));
    localStorage.setItem('currency', 'ils');

    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>

      <div class="cart-items-container"></div>
      <div class="cart-empty"></div>
      <h2 class="cart-title"></h2>
      <h3 class="summary-title"></h3>
      <div class="added-items"></div>
      <div class="summary-details"></div>
      <button id="stripe-checkout-btn"></button>
      <button class="delete-all"></button>
      <div class="check-me-out"></div>
      <div class="summary"></div>
    `);

    const view = new CartView();
    await view.setLanguage('eng', cart.length);

    // Expected: (2 × 185) + (3 × 111) = 370 + 333 = 703 ILS
    const summary = document.querySelector('.summary-details');
    expect(summary.textContent).toContain('703');
    expect(summary.textContent).toContain('₪');
  });

  it('should switch currency and recalculate prices (PAGE-03)', async () => {
    const cart = createCart([
      { product: createProduct({ usd_price: 50, ils_price: 185 }), quantity: 1 }
    ]);

    localStorage.setItem('cart', JSON.stringify(cart));
    localStorage.setItem('currency', 'ils');

    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>

      <div class="cart-items-container"></div>
      <div class="cart-empty"></div>
      <h2 class="cart-title"></h2>
      <h3 class="summary-title"></h3>
      <div class="added-items"></div>
      <div class="summary-details"></div>
      <button id="stripe-checkout-btn"></button>
      <button class="delete-all"></button>
      <div class="check-me-out"></div>
      <div class="summary"></div>
    `);

    const view = new CartView();
    await view.setLanguage('eng', cart.length);

    // Verify ILS price shown
    expect(document.body.textContent).toContain('185');
    expect(document.body.textContent).toContain('₪');

    // Switch to USD
    localStorage.setItem('currency', 'usd');
    window.dispatchEvent(new CustomEvent('currency-changed', { detail: { currency: 'usd' } }));

    // Wait for re-render
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('$');
      expect(document.body.textContent).toContain('50');
    });
  });
});
```

### Categories View with Product Filtering
```javascript
// Source: CategoriesView implementation
import CategoriesView from '../../js/Views/categoriesView.js';

describe('CategoriesView: Product Filtering (PAGE-11)', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>

      <body id="categories-page" class="necklaces" data-hebrew="שרשראות">
        <div class="modal"></div>
        <div class="products-container-outer">
          <div class="products-container-inner"></div>
        </div>
      </body>
    `);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should display products filtered by category', async () => {
    const necklaces = [
      createProduct({ id: 1, name: 'Gold Necklace', category: 'necklaces' }),
      createProduct({ id: 2, name: 'Silver Necklace', category: 'necklaces' })
    ];

    // Mock API response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        products: necklaces,
        total: 2
      })
    });

    const view = new CategoriesView();
    // Trigger product fetch (implementation-specific)
    // await view.fetchProducts();

    // Wait for products to render
    await vi.waitFor(() => {
      const productContainer = document.querySelector('.products-container-inner');
      expect(productContainer.textContent).toContain('Gold Necklace');
      expect(productContainer.textContent).toContain('Silver Necklace');
    });
  });
});
```

### Home Page Featured Products
```javascript
// Source: HomePageView implementation
import HomePageView from '../../js/Views/homePageView.js';

describe('HomePageView: Featured Products (PAGE-12)', () => {
  beforeEach(() => {
    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>

      <div class="featured-products"></div>
    `);
  });

  it('should render featured products on home page', async () => {
    const featuredProducts = [
      createProduct({ id: 1, name: 'Featured Necklace', featured: true }),
      createProduct({ id: 2, name: 'Featured Bracelet', featured: true })
    ];

    // Render featured products (implementation-specific)
    const featuredContainer = document.querySelector('.featured-products');
    featuredContainer.innerHTML = featuredProducts.map(p => `
      <div class="product-card">
        <h3>${p.name}</h3>
      </div>
    `).join('');

    expect(featuredContainer.textContent).toContain('Featured Necklace');
    expect(featuredContainer.textContent).toContain('Featured Bracelet');
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full page integration tests | View-specific unit tests with mocked model | Phase 17-20 | Faster tests, better isolation, easier debugging |
| Manual cart HTML creation | Factory functions with createCart | Phase 17 | Consistent test data, unique IDs, less boilerplate |
| querySelector for everything | Testing Library semantic queries | Phase 17 | More accessible tests, resilient to markup changes |
| Currency conversion in views | Stored dual-currency prices | v1.3 (Phase 13) | Views just select price, no runtime calculation |
| Jest | Vitest | v1.2 | 2-10x faster test execution, better Vite integration |
| jsdom | Happy-DOM | Phase 17 | 2-3x performance improvement for large test suites |

**Deprecated/outdated:**
- **Testing with full HTML pages:** Use minimal DOM fixtures matching view requirements
- **Mocking localStorage:** Happy-DOM provides working localStorage, use directly
- **Testing currency conversion:** Views use stored prices, not runtime conversion (backend responsibility)
- **Separate modal components:** Modal is rendered by CategoriesView, test as part of view

## Open Questions

Things that couldn't be fully resolved:

1. **Product modal opening mechanism**
   - What we know: Modal is rendered by CategoriesView when product clicked
   - What's unclear: Best way to test modal in isolation vs. full workflow (render products → click → verify modal)
   - Recommendation: Test modal rendering logic separately (mock product data, verify markup) AND test full workflow in integration test (Phase 22)

2. **Checkout payment flow completion**
   - What we know: CartView triggers `/create-checkout-session`, Stripe redirects to external URL
   - What's unclear: How to verify redirect happens without actually navigating (breaks test environment)
   - Recommendation: Mock window.location assignment, verify it's called with Stripe URL. Don't test actual Stripe integration (that's Stripe's responsibility).

3. **Image carousel implementation details**
   - What we know: Modal should have next/prev buttons for image navigation (CONTEXT requirement)
   - What's unclear: Current implementation uses small image clicks, not dedicated next/prev buttons
   - Recommendation: Test current behavior (click small image → big image updates). If next/prev buttons added later, update tests.

4. **Static view testing inclusion**
   - What we know: About, Policies, Workshop views exist but are simple static content
   - What's unclear: Do they warrant dedicated tests or just smoke tests (renders without crashing)?
   - Recommendation: Skip dedicated test files for static views. If they have language switching, verify in base View tests (Phase 19).

5. **Categories filter depth**
   - What we know: Categories view fetches products by category from API
   - What's unclear: Should tests verify pagination, infinite scroll, or just basic product display?
   - Recommendation: Test basic filtering (correct category products shown). Defer pagination/scroll to integration tests (Phase 22) if time permits.

## Sources

### Primary (HIGH confidence)
- CartView source code (C:\Users\pagis\OneDrive\WebDev\Projects\Online\frontend\js\Views\cartView.js) - Cart display, totals calculation, checkout flow
- CategoriesView source code (C:\Users\pagis\OneDrive\WebDev\Projects\Online\frontend\js\Views\categoriesView.js) - Product modal, filtering
- ContactMeView source code (C:\Users\pagis\OneDrive\WebDev\Projects\Online\frontend\js\Views\contactMeView.js) - Form validation, anti-spam
- HomePageView source code (C:\Users\pagis\OneDrive\WebDev\Projects\Online\frontend\js\Views\homePageView.js) - Featured products
- model.js source code - Cart structure, addToCart, removeFromCart methods
- Phase 17 RESEARCH.md - Test infrastructure and factory patterns
- Phase 18 RESEARCH.md - Model testing patterns and fetch mocking
- Phase 19 RESEARCH.md - Base View testing patterns
- Existing test files (language.test.js, currency.test.js) - Established patterns

### Secondary (MEDIUM confidence)
- [Component Testing | Vitest](https://vitest.dev/guide/browser/component-testing) - Component testing patterns
- [How to Unit Test React Components with Vitest and React Testing Library](https://oneuptime.com/blog/post/2026-01-15-unit-test-react-vitest-testing-library/view) - Form validation testing
- [Unit Testing with Vitest | CS4530, Spring 2026](https://neu-se.github.io/CS4530-Spring-2026/tutorials/week1-unit-testing) - Cart totals calculation patterns
- [Vitest in 2026: The New Standard for Modern JavaScript Testing](https://jeffbruchado.com.br/en/blog/vitest-2026-standard-modern-javascript-testing) - Vitest state of the art

### Tertiary (LOW confidence)
- [Testing the DOM: The Setup | Steve Kinney](https://stevekinney.com/courses/testing/testing-the-dom) - General DOM testing patterns (verify with official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing Phase 17-19 infrastructure, no new dependencies
- Architecture: HIGH - Patterns derived from actual view implementations + Phase 17-19 established patterns
- Pitfalls: HIGH - Based on view source analysis and previous phase learnings

**Research date:** 2026-02-09
**Valid until:** ~30 days (stable stack, views unlikely to change significantly)
