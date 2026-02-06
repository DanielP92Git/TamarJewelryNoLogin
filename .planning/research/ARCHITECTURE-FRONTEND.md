# Architecture Research: Frontend Testing for Vanilla JS MVC

**Domain:** Frontend testing for e-commerce MVC application
**Researched:** 2026-02-06
**Confidence:** HIGH

## Standard Architecture

### Testing Pyramid for Vanilla JS MVC

```
┌─────────────────────────────────────────────────────────────┐
│                         E2E Tests                            │
│                    (Optional - Few Tests)                    │
│          Browser automation for critical flows               │
├─────────────────────────────────────────────────────────────┤
│                    Integration Tests                         │
│                   (Model + View + DOM)                       │
│    ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│    │Cart Flow │  │Language  │  │Currency  │                 │
│    │  Tests   │  │ Switcher │  │ Switcher │                 │
│    └──────────┘  └──────────┘  └──────────┘                 │
├─────────────────────────────────────────────────────────────┤
│                       Unit Tests                             │
│                   (Isolated Components)                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  Model  │  │  View   │  │Page View│  │Controller│        │
│  │  Logic  │  │  Base   │  │ Classes │  │  Router  │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
├─────────────────────────────────────────────────────────────┤
│                    Test Utilities Layer                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Mocks: localStorage, fetch, DOM fixtures           │    │
│  │  Factories: cart items, products, user data         │    │
│  │  Helpers: DOM setup, event simulation, assertions   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Testing Approach |
|-----------|----------------|------------------|
| Model.js | localStorage operations, API calls, state management | Unit tests with mocked localStorage and fetch |
| View.js (base) | DOM manipulation, language/currency selectors, shared UI | Unit tests with Happy-DOM for base functionality |
| Views/* (pages) | Page-specific rendering, event handling | Integration tests with base View + Model |
| controller.js | Route management, view instantiation | Integration tests verifying routing behavior |
| locale.js | Language/currency persistence and sync | Unit tests for persistence logic |

## Recommended Test Structure

```
frontend/
├── tests/                    # All frontend tests (mirrors backend pattern)
│   ├── setup.js             # Global test setup (Happy-DOM, mocks)
│   ├── helpers/             # Test utilities
│   │   ├── dom.js          # DOM setup/teardown utilities
│   │   ├── factories.js    # Test data factories (products, cart items)
│   │   ├── mocks/          # Mock implementations
│   │   │   ├── localStorage.js
│   │   │   ├── fetch.js    # API mocking (integration with nock)
│   │   │   └── index.js    # Centralized mock cleanup
│   │   └── fixtures/       # Static test data (product lists, etc.)
│   ├── unit/               # Isolated component tests
│   │   ├── model.test.js
│   │   ├── View.test.js    # Base View class
│   │   ├── locale.test.js
│   │   └── Views/          # Page-specific view tests
│   │       ├── homePageView.test.js
│   │       ├── cartView.test.js
│   │       └── categoriesView.test.js
│   └── integration/        # Multi-component tests
│       ├── cart-flow.test.js        # Add to cart → View cart → Update
│       ├── language-switch.test.js  # Language changes across views
│       ├── currency-switch.test.js  # Currency changes with cart
│       └── routing.test.js          # Controller routing with views
├── js/                      # Application code (existing structure)
│   ├── model.js
│   ├── View.js
│   ├── controller.js
│   └── Views/
└── vitest.config.js         # Frontend test configuration
```

### Structure Rationale

- **tests/ at frontend level:** Mirrors backend structure for consistency
- **setup.js:** Global Happy-DOM configuration, shared mock initialization
- **helpers/mocks/:** Centralized mocks prevent duplication across test files
- **unit/ vs integration/:** Clear separation based on dependency isolation
- **Views/ subdirectory in unit/:** Matches application structure for discoverability
- **Factories over fixtures for dynamic data:** Products/cart items with varying states
- **Fixtures for static data:** Product catalogs, translation strings

## Architectural Patterns

### Pattern 1: localStorage Mock Pattern

**What:** Spy on Storage.prototype methods instead of creating full localStorage mock

**When to use:** When testing Model.js cart operations or any localStorage interaction

**Trade-offs:**
- **Pros:** Works reliably with Happy-DOM, simple setup, easy assertions
- **Cons:** Requires cleanup between tests to prevent state leakage

**Example:**
```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as model from '../js/model.js';

describe('Model - Cart Operations', () => {
  let getItemSpy, setItemSpy;

  beforeEach(() => {
    // Spy on Storage.prototype (Happy-DOM compatible)
    getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    // Set up initial state
    getItemSpy.mockReturnValue(JSON.stringify([]));
  });

  afterEach(() => {
    // Restore original implementations
    vi.restoreAllMocks();
  });

  it('should save cart to localStorage when adding item', async () => {
    const mockElement = {
      getAttribute: vi.fn((attr) => {
        if (attr === 'data-id') return '123';
        if (attr === 'data-quant') return '5';
        return null;
      }),
      querySelector: vi.fn().mockReturnValue({ src: 'test.jpg', textContent: 'Test Item' }),
      dataset: { currency: 'usd', usdPrice: '100', ilsPrice: '350' }
    };

    await model.addToLocalStorage(mockElement);

    expect(setItemSpy).toHaveBeenCalledWith(
      'cart',
      expect.stringContaining('"id":123')
    );
  });
});
```

### Pattern 2: View Isolation Pattern

**What:** Test View.js base class in isolation by mocking DOM elements without full page

**When to use:** Unit testing View.js methods (language switching, cart number updates, etc.)

**Trade-offs:**
- **Pros:** Fast tests, no page dependencies, tests base behavior
- **Cons:** Doesn't test DOM integration, requires manual element creation

**Example:**
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import View from '../js/View.js';

describe('View - Cart Number Management', () => {
  let view;

  beforeEach(() => {
    // Setup minimal DOM structure
    document.body.innerHTML = `
      <header>
        <div data-purpose="header-utilities"></div>
        <div class="menu"></div>
      </header>
      <footer class="footer"></footer>
    `;
    view = new View();
  });

  it('should update cart number in all cart elements', () => {
    // Add cart number elements to DOM
    document.body.innerHTML += `
      <span class="cart-number-mobile">0</span>
      <span class="cart-number-mobile">0</span>
    `;

    view.persistCartNumber(5);

    const cartNumbers = document.querySelectorAll('.cart-number-mobile');
    cartNumbers.forEach(el => {
      expect(el.textContent).toBe('5');
    });
  });
});
```

### Pattern 3: Page View Integration Pattern

**What:** Test page-specific views (homePageView, cartView) with base View + Model

**When to use:** Integration testing for complete page behavior (rendering, events, state)

**Trade-offs:**
- **Pros:** Tests realistic scenarios, catches integration bugs
- **Cons:** Slower than unit tests, more complex setup

**Example:**
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as model from '../../js/model.js';
import CartView from '../../js/Views/cartView.js';

describe('CartView - Integration', () => {
  beforeEach(() => {
    // Setup full cart page DOM structure
    document.body.innerHTML = `
      <header>
        <div data-purpose="header-utilities"></div>
        <div class="menu"></div>
      </header>
      <div class="cart-items-container"></div>
      <div class="cart-empty"></div>
      <div class="summary"></div>
      <footer class="footer"></footer>
    `;

    // Mock cart data
    model.cart.length = 0;
    model.cart.push({
      id: 1,
      title: 'Test Product',
      usdPrice: 100,
      ilsPrice: 350,
      amount: 1
    });
  });

  it('should render cart items with correct currency', async () => {
    localStorage.setItem('currency', 'usd');

    await CartView.render(1);

    const container = document.querySelector('.cart-items-container');
    expect(container.innerHTML).toContain('Test Product');
    expect(container.innerHTML).toContain('$100');
  });
});
```

### Pattern 4: Fetch Mocking Pattern

**What:** Use vitest-fetch-mock or vi.fn() to mock API calls in Model

**When to use:** Testing Model methods that fetch from backend (fetchProducts, createOrder, etc.)

**Trade-offs:**
- **Pros:** Fast, no network dependency, controlled responses
- **Cons:** Must maintain mock data schemas matching backend

**Example:**
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Model - API Integration', () => {
  beforeEach(() => {
    // Mock global fetch
    global.fetch = vi.fn();
  });

  it('should fetch discount settings from API', async () => {
    // Setup mock response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        global_discount_percentage: 20,
        discount_active: true,
        discount_label: 'Sale'
      })
    });

    const result = await model.getGlobalDiscount();

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/discount-settings')
    );
    expect(result.percentage).toBe(20);
    expect(result.active).toBe(true);
  });
});
```

### Pattern 5: Event Delegation Testing Pattern

**What:** Test event handlers attached via delegation (click, change, etc.)

**When to use:** Testing View methods that add event listeners (language switch, cart actions)

**Trade-offs:**
- **Pros:** Tests real browser behavior, catches delegation bugs
- **Cons:** Requires proper DOM structure, can be timing-sensitive

**Example:**
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import View from '../js/View.js';

describe('View - Language Switching', () => {
  let view;

  beforeEach(() => {
    document.body.innerHTML = `
      <header>
        <div data-purpose="header-utilities"></div>
        <div class="menu">
          <div class="mobile-lang-selector">
            <div class="flag-icon flag-eng" data-lang="eng"></div>
            <div class="flag-icon flag-heb" data-lang="heb"></div>
          </div>
        </div>
      </header>
      <footer class="footer"></footer>
    `;

    view = new View();
  });

  it('should call changeToHeb when Hebrew flag clicked', async () => {
    const spy = vi.spyOn(view, 'changeToHeb');

    // Render language selector
    await view.setLanguage('eng', 0);

    // Simulate click on Hebrew flag
    const hebFlag = document.querySelector('.flag-heb');
    hebFlag.click();

    expect(spy).toHaveBeenCalled();
    expect(localStorage.getItem('language')).toBe('heb');
  });
});
```

## Data Flow

### Testing Cart Add Flow

```
User Action (click "Add to Cart")
    ↓
[Controller] → handleAddToCart(element)
    ↓
[Model] → addToLocalStorage(element)
    ↓ (parse element data)
[Model] → addToLocalCart(itemData)
    ↓ (update cart array)
[Model] → createLocalStorage()
    ↓ (persist to localStorage)
[View] → increaseCartNumber()
    ↓
DOM Updated (cart count badge)

Test Strategy:
1. Unit: Test addToLocalStorage with mock element → verify cart array
2. Unit: Test createLocalStorage → verify localStorage.setItem called
3. Integration: Test full flow → verify DOM update + storage
```

### Testing Language Switch Flow

```
User Action (click language flag)
    ↓
[View] → changeToHeb() / changeToEng()
    ↓ (update localStorage)
[View] → setLanguage(lng, cartNum)
    ↓ (re-render menu, footer, utilities)
[View] → setPageSpecificLanguage(lng)
    ↓ (page-specific content updates)
DOM Updated (menu, footer, content in new language)

Test Strategy:
1. Unit: Test changeToHeb/Eng → verify localStorage update
2. Unit: Test handleMenuLanguage(lng) → verify correct markup
3. Integration: Test setLanguage → verify full DOM transformation
```

### Testing Currency Switch Flow

```
User Action (select currency from dropdown)
    ↓
[Currency Event Listener] → normalizeCurrency(value)
    ↓ (validate 'usd' or 'ils')
[Currency Module] → setSavedCurrency(currency)
    ↓ (persist to localStorage)
[Currency Module] → dispatchEvent('currency-changed')
    ↓
[CartView] → listen for currency-changed event
    ↓
[CartView] → _render(cartNum, lng) with new currency
    ↓
DOM Updated (prices in new currency)

Test Strategy:
1. Unit: Test normalizeCurrency → verify validation
2. Unit: Test setSavedCurrency → verify localStorage
3. Integration: Test currency change → verify cart re-render
```

## Scaling Considerations

| Scale | Testing Approach |
|-------|------------------|
| Current (MVP) | Focus on unit tests for Model and base View, minimal integration tests for critical paths (cart, checkout) |
| Growing (more features) | Add page-specific integration tests, introduce visual regression testing for CSS changes |
| Large (complex state) | Consider state management library (Redux/Zustand) with dedicated state tests, add E2E with Playwright for critical flows |

### Testing Priorities

1. **First bottleneck:** localStorage cart operations (most critical for e-commerce)
   - **Fix:** Comprehensive unit tests for addToLocalStorage, removeFromUserCart, cart synchronization
   - **Coverage target:** 90%+ for model.js cart methods

2. **Second bottleneck:** Language/currency switching across pages
   - **Fix:** Integration tests verifying language persists across navigation, currency converts correctly
   - **Coverage target:** 80%+ for locale.js and View.js language methods

3. **Third bottleneck:** API integration (fetch failures, network errors)
   - **Fix:** Error boundary tests, retry logic tests, fallback behavior tests
   - **Coverage target:** All error paths tested with mock API failures

## Anti-Patterns

### Anti-Pattern 1: Testing Implementation Details

**What people do:** Test that View.js calls specific internal methods instead of testing behavior
```javascript
// BAD: Testing implementation
it('should call _generateCategoriesListMarkup when rendering', () => {
  const spy = vi.spyOn(view, '_generateCategoriesListMarkup');
  view.setLanguage('eng');
  expect(spy).toHaveBeenCalled();
});
```

**Why it's wrong:** Tests break when refactoring internal methods, doesn't verify user-facing behavior

**Do this instead:** Test the observable outcome
```javascript
// GOOD: Testing behavior
it('should display categories in English when language is eng', () => {
  view.setLanguage('eng');
  const categories = document.querySelector('.categories-list');
  expect(categories.textContent).toContain('Necklaces');
  expect(categories.textContent).not.toContain('שרשראות');
});
```

### Anti-Pattern 2: Over-Mocking in Integration Tests

**What people do:** Mock every dependency in integration tests
```javascript
// BAD: Over-mocking defeats purpose of integration test
it('should render cart with items', () => {
  vi.mock('../js/model.js'); // Mocking the model in an integration test
  vi.mock('../js/View.js');  // Mocking the base view
  // ... test that proves nothing
});
```

**Why it's wrong:** Integration tests should verify components work together; over-mocking turns them into slow unit tests

**Do this instead:** Only mock external boundaries (fetch, localStorage)
```javascript
// GOOD: Integration test with minimal mocking
it('should render cart with items from model', () => {
  // Mock only external dependencies
  localStorage.setItem('cart', JSON.stringify([{ id: 1, title: 'Item' }]));
  global.fetch = vi.fn(); // Mock API calls

  // Test real integration
  model.handleLoadStorage();
  CartView.render();

  expect(document.querySelector('.cart-item')).toBeTruthy();
});
```

### Anti-Pattern 3: Shared State Between Tests

**What people do:** Forget to clean up DOM or localStorage between tests
```javascript
// BAD: No cleanup, state leaks between tests
describe('Cart tests', () => {
  it('test 1', () => {
    model.cart.push({ id: 1 });
    // ... test code
  });

  it('test 2', () => {
    // Expects empty cart but has item from test 1!
    expect(model.cart.length).toBe(0); // FAILS
  });
});
```

**Why it's wrong:** Tests become order-dependent, fail intermittently, hard to debug

**Do this instead:** Use beforeEach/afterEach for cleanup
```javascript
// GOOD: Clean slate for each test
describe('Cart tests', () => {
  beforeEach(() => {
    model.cart.length = 0; // Clear cart array
    localStorage.clear();   // Clear storage
    document.body.innerHTML = ''; // Clear DOM
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Restore all spies/mocks
  });

  it('test 1', () => {
    model.cart.push({ id: 1 });
    expect(model.cart.length).toBe(1);
  });

  it('test 2', () => {
    expect(model.cart.length).toBe(0); // PASSES
  });
});
```

### Anti-Pattern 4: Testing Private Methods Directly

**What people do:** Export private/internal methods just to test them
```javascript
// BAD: Exposing internals for testing
// In View.js
export const _privateHelper = function() { /* ... */ }; // Should be private!

// In test
import { _privateHelper } from '../js/View.js';
it('should do internal thing', () => {
  expect(_privateHelper()).toBe(something);
});
```

**Why it's wrong:** Breaks encapsulation, creates brittle tests tied to implementation

**Do this instead:** Test through public API
```javascript
// GOOD: Test behavior, not implementation
it('should update menu language when switching to Hebrew', () => {
  view.setLanguage('heb', 0);
  const menu = document.querySelector('.menu');
  expect(menu.textContent).toContain('בית'); // "Home" in Hebrew
  // Private method _generateMenu() tested indirectly
});
```

### Anti-Pattern 5: Not Testing Edge Cases

**What people do:** Only test happy path scenarios
```javascript
// BAD: Only tests normal case
it('should add item to cart', () => {
  const element = createMockElement({ id: 1, price: 100 });
  model.addToLocalStorage(element);
  expect(model.cart.length).toBe(1);
});
```

**Why it's wrong:** Production bugs happen in edge cases (null values, missing data, etc.)

**Do this instead:** Test edge cases and error conditions
```javascript
// GOOD: Tests edge cases
describe('addToLocalStorage edge cases', () => {
  it('should handle missing price data gracefully', () => {
    const element = createMockElement({ id: 1, price: null });
    expect(() => model.addToLocalStorage(element)).not.toThrow();
    expect(model.cart[0].price).toBe(0); // Default value
  });

  it('should handle missing image element', () => {
    const element = {
      querySelector: vi.fn().mockReturnValue(null), // No image found
      getAttribute: vi.fn(),
      dataset: {}
    };
    model.addToLocalStorage(element);
    expect(model.cart[0].image).toBe(''); // Fallback
  });
});
```

## Integration Points

### External Services

| Service | Integration Pattern | Testing Notes |
|---------|---------------------|---------------|
| Backend API | fetch() calls in model.js | Mock with vi.fn(), verify request format and error handling |
| localStorage | Native Web Storage API | Spy on Storage.prototype, verify persistence and retrieval |
| PayPal SDK | Script loaded in checkout | Mock window.paypal object, test button rendering |
| Stripe API | Script loaded in checkout | Mock Stripe global, test checkout flow |

### Internal Boundaries

| Boundary | Communication | Testing Considerations |
|----------|---------------|------------------------|
| Model ↔ View | Model exports functions, View imports and calls | Test Model exports work correctly, test View calls with correct parameters |
| View ↔ DOM | Direct DOM manipulation via querySelector/innerHTML | Use Happy-DOM for fast tests, verify element structure and content |
| Controller ↔ View | Controller instantiates View classes and calls methods | Integration test verifying correct view initialized for route |
| View Base ↔ Page Views | Inheritance via extends keyword | Test base methods work in child class context, verify super() calls |

## Testing Utilities Design

### Helper: DOM Setup

```javascript
// tests/helpers/dom.js

/**
 * Create a minimal page structure for View tests
 */
export function setupBasePage() {
  document.body.innerHTML = `
    <header>
      <div data-purpose="header-utilities"></div>
      <div class="menu"></div>
    </header>
    <main></main>
    <footer class="footer"></footer>
    <div class="go-to-top"></div>
  `;
}

/**
 * Create cart page structure
 */
export function setupCartPage() {
  setupBasePage();
  document.querySelector('main').innerHTML = `
    <div class="cart-items-container"></div>
    <div class="cart-empty" style="display:none;"></div>
    <div class="summary">
      <div class="summary-details"></div>
    </div>
  `;
}

/**
 * Simulate a click event on an element
 */
export function clickElement(selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);
  const event = new Event('click', { bubbles: true });
  element.dispatchEvent(event);
}
```

### Helper: Factories

```javascript
// tests/helpers/factories.js

let productIdCounter = 1;

/**
 * Create a mock product object
 */
export function createProduct(overrides = {}) {
  return {
    id: productIdCounter++,
    name: 'Test Product',
    usdPrice: 100,
    ilsPrice: 350,
    originalUsdPrice: 120,
    originalIlsPrice: 420,
    image: 'test-product.jpg',
    quantity: 10,
    category: 'necklaces',
    ...overrides
  };
}

/**
 * Create a mock cart item
 */
export function createCartItem(overrides = {}) {
  const product = createProduct(overrides);
  return {
    ...product,
    amount: 1,
    title: product.name,
    price: product.usdPrice,
    ...overrides
  };
}

/**
 * Create a mock DOM element for "Add to Cart" button
 */
export function createAddToCartElement(productData = {}) {
  const product = createProduct(productData);
  const element = document.createElement('div');
  element.className = 'product-card';
  element.dataset.id = product.id;
  element.dataset.quant = product.quantity;
  element.dataset.currency = 'usd';
  element.dataset.usdPrice = product.usdPrice;
  element.dataset.ilsPrice = product.ilsPrice;

  element.innerHTML = `
    <img class="front-image" src="${product.image}" />
    <div class="item-title">${product.name}</div>
  `;

  return element;
}

/**
 * Reset factory counters (call in afterEach)
 */
export function resetFactories() {
  productIdCounter = 1;
}
```

### Mock: localStorage

```javascript
// tests/helpers/mocks/localStorage.js
import { vi } from 'vitest';

/**
 * Setup localStorage spy for cart operations
 * Returns { getItemSpy, setItemSpy, removeItemSpy }
 */
export function mockLocalStorage(initialCart = []) {
  const storage = {};

  const getItemSpy = vi.spyOn(Storage.prototype, 'getItem')
    .mockImplementation((key) => storage[key] || null);

  const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    .mockImplementation((key, value) => { storage[key] = value; });

  const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem')
    .mockImplementation((key) => { delete storage[key]; });

  const clearSpy = vi.spyOn(Storage.prototype, 'clear')
    .mockImplementation(() => { Object.keys(storage).forEach(k => delete storage[k]); });

  // Initialize cart if provided
  if (initialCart.length > 0) {
    storage.cart = JSON.stringify(initialCart);
  }

  return { getItemSpy, setItemSpy, removeItemSpy, clearSpy, storage };
}
```

### Mock: Fetch API

```javascript
// tests/helpers/mocks/fetch.js
import { vi } from 'vitest';

/**
 * Mock successful fetch response
 */
export function mockFetchSuccess(data) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data)
  });
  return global.fetch;
}

/**
 * Mock fetch error response
 */
export function mockFetchError(status = 500, message = 'Server Error') {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: message,
    json: async () => ({ error: message })
  });
  return global.fetch;
}

/**
 * Mock fetch network failure
 */
export function mockFetchNetworkError() {
  global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
  return global.fetch;
}
```

## Build Order Recommendations

### Phase 1: Test Infrastructure (Week 1)

**Goal:** Setup test environment and utilities before writing tests

**Tasks:**
1. Create `frontend/vitest.config.js` with Happy-DOM environment
2. Create `frontend/tests/setup.js` with global mocks initialization
3. Build test helpers (dom.js, factories.js, mocks/)
4. Verify setup with one smoke test

**Success Criteria:**
- `npm run test:frontend` runs successfully
- Happy-DOM loads DOM correctly
- localStorage and fetch mocks work

### Phase 2: Model Unit Tests (Week 2)

**Goal:** Test data layer in isolation (highest ROI for e-commerce)

**Tasks:**
1. Test cart operations (addToLocalStorage, removeFromUserCart, deleteAll)
2. Test cart number calculation (checkCartNumber)
3. Test discount calculations (getGlobalDiscount, calculateDiscountedPrice)
4. Test API methods with fetch mocks

**Success Criteria:**
- 90%+ coverage for model.js cart operations
- All edge cases tested (null values, missing data)
- localStorage persistence verified

### Phase 3: View Base Class Tests (Week 3)

**Goal:** Test shared View functionality

**Tasks:**
1. Test language switching (changeToHeb, changeToEng, setLanguage)
2. Test cart number updates (persistCartNumber, increaseCartNumber)
3. Test menu rendering (handleMenuLanguage, svgHandler)
4. Test footer rendering (setFooterLng, handleFooterMarkup)

**Success Criteria:**
- 80%+ coverage for View.js
- Language persistence works correctly
- DOM manipulation verified with Happy-DOM

### Phase 4: Page View Tests (Week 4)

**Goal:** Test page-specific views extending base View

**Tasks:**
1. Test homePageView (image slider, modal handlers)
2. Test cartView (rendering, currency conversion, delete handlers)
3. Test categoriesView (product filtering, image flipper)
4. Test smaller views (aboutView, contactMeView, policiesView)

**Success Criteria:**
- Each page view has basic rendering test
- Event handlers verified (click, language switch)
- Inheritance from View.js works correctly

### Phase 5: Integration Tests (Week 5)

**Goal:** Test component interactions (Model + View + Controller)

**Tasks:**
1. Test cart flow (add → view → update → delete)
2. Test language switching across views
3. Test currency switching with cart re-render
4. Test routing (controller.js with view instantiation)

**Success Criteria:**
- Critical user flows tested end-to-end
- Multi-component integration verified
- Navigation and state persistence work

### Phase 6: Edge Cases & Polish (Week 6)

**Goal:** Achieve high confidence coverage

**Tasks:**
1. Add error handling tests (API failures, invalid data)
2. Test browser compatibility concerns (localStorage quota, fetch polyfill)
3. Add visual regression tests for critical pages (optional, Playwright)
4. Document testing patterns for future developers

**Success Criteria:**
- 85%+ overall frontend coverage
- All known edge cases covered
- CI/CD integration complete

## Configuration Example

```javascript
// frontend/vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use Happy-DOM for fast DOM testing
    environment: 'happy-dom',

    // Environment variables
    env: {
      NODE_ENV: 'test',
    },

    // Test file patterns
    include: ['tests/**/*.test.js'],

    // Global setup file
    setupFiles: ['./tests/setup.js'],

    // Make describe, it, expect available globally
    globals: true,

    // Timeout for async operations
    testTimeout: 10000,

    // Files to exclude
    exclude: ['**/node_modules/**', '**/dist/**'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'js/model.js',
        'js/View.js',
        'js/controller.js',
        'js/locale.js',
        'js/Views/**/*.js'
      ],
      exclude: [
        'node_modules/**',
        'tests/**',
        'coverage/**',
        'dist/**',
      ],
      thresholds: {
        lines: 80,
        functions: 75,
        branches: 70,
        statements: 80
      }
    },
  },
});
```

```javascript
// frontend/tests/setup.js
import { beforeEach, afterEach, vi } from 'vitest';

// Global test setup runs before each test
beforeEach(() => {
  // Clear localStorage
  localStorage.clear();

  // Reset DOM to clean state
  document.body.innerHTML = '';

  // Reset fetch mock
  global.fetch = vi.fn();
});

// Global cleanup after each test
afterEach(() => {
  // Restore all mocks/spies
  vi.restoreAllMocks();

  // Clear any timers
  vi.clearAllTimers();
});

// Make localStorage and fetch available globally
global.localStorage = localStorage;
global.fetch = fetch;
```

## Sources

### Vanilla JavaScript MVC Testing
- [The MVC Design Pattern in Vanilla JavaScript — SitePoint](https://www.sitepoint.com/mvc-design-pattern-javascript/)
- [Classic Front End MVC with Vanilla Javascript | Medium](https://medium.com/@patrickackerman/classic-front-end-mvc-with-vanilla-javascript-7eee550bc702)
- [How to Build a Simple MVC App From Scratch in JavaScript | Tania Rascia](https://www.taniarascia.com/javascript-mvc-todo-app/)
- [Writing a Simple MVC App in Vanilla Javascript | HackerNoon](https://hackernoon.com/writing-a-simple-mvc-model-view-controller-app-in-vanilla-javascript-u65i34lx)

### Vitest and Happy-DOM
- [Testing the DOM: The Setup | Steve Kinney](https://stevekinney.com/courses/testing/testing-the-dom)
- [Setup as Test Environment · Happy-DOM Wiki](https://github.com/capricorn86/happy-dom/wiki/Setup-as-Test-Environment)
- [Test Environment | Guide | Vitest](https://vitest.dev/guide/environment)
- [DOM Testing with Happy DOM and Testing Library - JetBrains](https://www.jetbrains.com/guide/javascript/tutorials/eleventy-tsx/happy-dom/)
- [jsdom vs happy-dom · vitest-dev/vitest Discussion](https://github.com/vitest-dev/vitest/discussions/1607)

### localStorage Mocking
- [How to mock and spy on local storage in vitest](https://dylanbritz.dev/writing/mocking-local-storage-vitest/)
- [How to Test LocalStorage with Vitest – Run That Line](https://runthatline.com/vitest-mock-localstorage/)
- [Mocking and Spying on Local Storage | Steve Kinney](https://stevekinney.com/courses/testing/mock-spy-secret-input-example)
- [vitest-localstorage-mock - npm](https://www.npmjs.com/package/vitest-localstorage-mock)

### Fetch API Mocking
- [Mocking Fetch And Network Requests With Vitest | Steve Kinney](https://stevekinney.com/courses/testing/mocking-fetch-and-network-requests)
- [How to Mock Fetch API in Vitest](https://runthatline.com/how-to-mock-fetch-api-with-vitest/)
- [vitest-fetch-mock - npm](https://www.npmjs.com/package/vitest-fetch-mock)
- [Using Mock Service Worker with Vitest and fetch - Markus Oberlehner](https://markus.oberlehner.net/blog/using-mock-service-worker-with-vitest-and-fetch)

### Test Structure and Strategy
- [Unit and E2E Tests with Vitest & Playwright](https://strapi.io/blog/nextjs-testing-guide-unit-and-e2e-tests-with-vitest-and-playwright)
- [Testing in 2026: Jest, React Testing Library, and Full Stack Testing Strategies](https://www.nucamp.co/blog/testing-in-2026-jest-react-testing-library-and-full-stack-testing-strategies)
- [Example of Unit Test, Integration Test, E2E Test in Frontend Testing | Medium](https://leovoon.medium.com/example-of-unit-test-integration-test-e2e-test-and-in-frontend-testing-673c901b3ff9)
- [Test Projects | Guide | Vitest](https://vitest.dev/guide/projects)

---
*Architecture research for: Frontend Testing - Vanilla JS MVC E-commerce Application*
*Researched: 2026-02-06*
