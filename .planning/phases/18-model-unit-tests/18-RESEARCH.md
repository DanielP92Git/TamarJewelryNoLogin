# Phase 18: Model Unit Tests - Research

**Researched:** 2026-02-08
**Domain:** Frontend model layer (model.js) unit testing - cart operations, localStorage persistence, API mocking
**Confidence:** HIGH

## Summary

Phase 18 focuses on testing the frontend model layer (model.js) in isolation. The model.js file contains cart state management, localStorage persistence, and API calls to the backend. The research reveals that the existing Phase 17 infrastructure (Vitest 4.0.18 + Happy-DOM 20.0.11, Testing Library, factory functions) provides everything needed for comprehensive model testing.

The model.js exports a `cart` array and functions for cart operations (`handleAddToCart`, `addToLocalStorage`, `addToUserStorage`, `removeFromUserCart`, `deleteAll`) plus localStorage loading (`handleLoadStorage`), cart counting (`checkCartNumber`), and discount utilities (`getGlobalDiscount`, `calculateDiscountedPrice`). The cart format is an array of objects with properties like `{ id, title, image, price, quantity, amount, currency, usdPrice, ilsPrice }`. Testing requires mocking `fetch` for API calls, using Happy-DOM's built-in localStorage (no additional mocking needed), and handling the dual-path logic for logged-in vs guest users.

Key finding: The model.js has separate code paths for logged-in users (uses auth-token and API calls) versus guest users (uses localStorage only). Tests must cover both paths. Currency conversion is handled at the View layer, not the model layer - the model stores both USD and ILS prices but does not perform conversions. The `calculateDiscountedPrice` function in model.js is the one exception that performs price calculations.

**Primary recommendation:** Use vi.fn() to mock global.fetch for API calls, leverage Happy-DOM's native localStorage for persistence tests, test both guest and logged-in code paths, and focus on the cart array state mutations and localStorage persistence rather than currency conversion (which is a View concern).

## Standard Stack

The established libraries/tools for model testing are already installed from Phase 17:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.0.18 | Test runner | Already configured (Phase 17), Vite-native, fast execution |
| happy-dom | 20.0.11 | Browser environment | Built-in localStorage, no mocking needed, 2-3x faster than jsdom |
| vi.fn() | (vitest built-in) | Fetch mocking | Simple, sufficient for API call testing, no additional deps |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/dom | 10.4.0 | DOM queries | Not needed for pure model tests (no DOM), but available |
| @testing-library/jest-dom | 6.6.3 | Custom matchers | toBeCloseTo for currency precision |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vi.fn() for fetch | vitest-fetch-mock | vitest-fetch-mock adds extra dependency; vi.fn() sufficient for model tests |
| vi.fn() for fetch | MSW | MSW is more powerful but overkill for simple API mocking in unit tests |
| Happy-DOM localStorage | vitest-localstorage-mock | Happy-DOM already provides working localStorage; extra package unnecessary |

**Installation:**
```bash
# No new dependencies needed - Phase 17 infrastructure is complete
```

## Architecture Patterns

### Recommended Test File Structure
```
frontend/tests/
├── model/
│   ├── cart.test.js           # Cart operations (add, remove, update, clear)
│   ├── localStorage.test.js   # Persistence and corruption handling
│   └── api.test.js            # API call mocking and error handling
└── helpers/
    ├── dom.js                 # Already exists (Phase 17)
    ├── factories.js           # Already exists (Phase 17)
    └── mocks/
        └── fetch.js           # NEW: Fetch mock utilities
```

### Pattern 1: Fetch Mocking Setup
**What:** Mock global.fetch with vi.fn() for API call testing
**When to use:** Any test that involves model functions calling the backend
**Example:**
```javascript
// Source: https://stevekinney.com/courses/testing/mocking-fetch-and-network-requests
// tests/helpers/mocks/fetch.js
import { vi, beforeEach, afterEach } from 'vitest';

let originalFetch;

export function setupFetchMock() {
  originalFetch = global.fetch;
  global.fetch = vi.fn();
}

export function teardownFetchMock() {
  global.fetch = originalFetch;
}

export function mockFetchSuccess(data) {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => data
  });
}

export function mockFetchError(statusCode, message = 'Error') {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status: statusCode,
    json: async () => ({ error: message })
  });
}

export function mockFetchNetworkError() {
  global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
}

// Usage in test:
// setupFetchMock();
// mockFetchSuccess({ id: 1, name: 'Product' });
// await model.fetchProducts();
// expect(fetch).toHaveBeenCalledWith('/api/products');
// teardownFetchMock();
```

### Pattern 2: Testing Cart State Mutations
**What:** Import cart array directly and verify mutations after operations
**When to use:** All cart operation tests
**Example:**
```javascript
// Source: model.js analysis
import { cart, handleAddToCart, removeFromUserCart, deleteAll } from '../../js/model.js';
import { createProduct, createCartItem, resetFactoryCounter } from '../helpers/factories.js';

describe('Cart Operations', () => {
  beforeEach(() => {
    // Reset cart array (model.js exports it as mutable)
    cart.length = 0;
    localStorage.clear();
    resetFactoryCounter();
  });

  it('should add item to cart array', () => {
    const product = createProduct({ id: 1001, name: 'Gold Necklace' });
    // Create mock DOM element that handleAddToCart expects
    const mockElement = createMockAddToCartElement(product);

    handleAddToCart(mockElement);

    expect(cart).toHaveLength(1);
    expect(cart[0].id).toBe(1001);
    expect(cart[0].title).toBe('Gold Necklace');
  });
});
```

### Pattern 3: DOM Element Mocking for addToLocalStorage
**What:** Create mock DOM elements that mimic product cards for testing
**When to use:** Testing addToLocalStorage which reads from data attributes
**Example:**
```javascript
// Source: model.js addToLocalStorage function analysis
// tests/helpers/mocks/dom-elements.js
export function createMockProductElement(product, options = {}) {
  const element = document.createElement('div');
  element.setAttribute('data-id', product.id);
  element.setAttribute('data-quant', product.quantity || 10);
  element.setAttribute('data-currency', options.currency || 'ils');
  element.setAttribute('data-usd-price', product.usd_price || 50);
  element.setAttribute('data-ils-price', product.ils_price || 185);
  element.setAttribute('data-original-usd-price', product.usd_price || 50);
  element.setAttribute('data-original-ils-price', product.ils_price || 185);

  // Add required child elements
  element.innerHTML = `
    <img class="front-image" src="${product.images?.[0]?.desktop || 'test.jpg'}" />
    <span class="item-title">${product.name}</span>
    <span class="item-price">${options.currency === 'usd' ? '$' : ''}${product.ils_price}</span>
  `;

  return element;
}
```

### Pattern 4: Auth-Token Path Testing
**What:** Test both logged-in (auth-token present) and guest (no token) paths
**When to use:** Functions that branch on localStorage.getItem('auth-token')
**Example:**
```javascript
// Source: model.js conditional logic analysis
describe('Cart Operations - Auth Paths', () => {
  beforeEach(() => {
    cart.length = 0;
    localStorage.clear();
    setupFetchMock();
  });

  afterEach(() => {
    teardownFetchMock();
  });

  describe('Guest User (no auth-token)', () => {
    it('should persist cart to localStorage', () => {
      // No auth-token = guest path
      expect(localStorage.getItem('auth-token')).toBeNull();

      const mockElement = createMockProductElement(createProduct());
      handleAddToCart(mockElement);

      const storedCart = JSON.parse(localStorage.getItem('cart'));
      expect(storedCart).toHaveLength(1);
      expect(fetch).not.toHaveBeenCalled(); // Guest path doesn't call API
    });
  });

  describe('Logged-in User (with auth-token)', () => {
    beforeEach(() => {
      localStorage.setItem('auth-token', 'mock-jwt-token');
    });

    it('should call addtocart API', async () => {
      mockFetchSuccess({ success: true });

      const mockElement = createMockProductElement(createProduct({ id: 1001 }));
      handleAddToCart(mockElement);

      // Logged-in path calls API
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/addtocart'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'auth-token': 'mock-jwt-token'
          })
        })
      );
    });
  });
});
```

### Pattern 5: localStorage Persistence Testing
**What:** Verify cart survives "browser restart" by clearing and reloading model state
**When to use:** Testing localStorage persistence requirements (MODEL-05, MODEL-06, MODEL-07)
**Example:**
```javascript
// Source: Phase 18 CONTEXT.md - browser restart simulation
describe('localStorage Persistence', () => {
  it('should survive browser restart (clear cart, reload from localStorage)', async () => {
    // 1. Add item to cart
    const mockElement = createMockProductElement(createProduct({ id: 1001 }));
    handleAddToCart(mockElement);
    expect(cart).toHaveLength(1);

    // 2. Simulate browser restart: clear cart array, keep localStorage
    cart.length = 0;
    expect(cart).toHaveLength(0);

    // 3. Reload from localStorage (like page refresh)
    await handleLoadStorage();

    // 4. Verify cart restored
    expect(cart).toHaveLength(1);
    expect(cart[0].id).toBe(1001);
  });
});
```

### Anti-Patterns to Avoid
- **Mocking localStorage when unnecessary:** Happy-DOM provides working localStorage - use it directly
- **Testing implementation details:** Don't test internal variable names, test observable behavior (cart state, localStorage values)
- **Skipping auth paths:** Both guest and logged-in paths MUST be tested
- **Not clearing cart array:** Cart is a module-level mutable array - must be cleared in beforeEach
- **Testing currency conversion in model:** Currency display logic is in Views, not model.js

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| localStorage mocking | Custom mock object | Happy-DOM native localStorage | Already works, supports get/set/clear/length |
| Fetch mocking | Custom XMLHttpRequest wrapper | vi.fn() with mockResolvedValueOnce | Battle-tested, captures call history |
| Test data | Manual object creation | createProduct, createCartItem factories | Unique IDs, predictable sequences, supports overrides |
| Floating-point comparison | Manual Math.abs checks | toBeCloseTo(value, 2) | Built-in Vitest matcher, handles precision correctly |
| DOM element creation | innerHTML strings | Helper function (createMockProductElement) | Consistent attributes, less error-prone |

**Key insight:** The Phase 17 infrastructure provides most utilities. Focus on extending factories with DOM element mocks specific to model.js testing, not rebuilding existing patterns.

## Common Pitfalls

### Pitfall 1: Cart Array Not Cleared Between Tests
**What goes wrong:** Test A adds item to cart, Test B starts with item already in cart, causing false positives or unexpected counts
**Why it happens:** Cart is a module-level exported array that persists across tests
**How to avoid:**
```javascript
import { cart } from '../../js/model.js';

beforeEach(() => {
  cart.length = 0;  // Clear the exported cart array
  localStorage.clear();
});
```
**Warning signs:** "Expected cart length 1, received 3", tests pass individually but fail together

### Pitfall 2: Missing Auth-Token Path Coverage
**What goes wrong:** Only testing guest path or only testing logged-in path
**Why it happens:** Most cart functions have `if (!localStorage.getItem('auth-token'))` branching
**How to avoid:**
- Write separate `describe` blocks for guest vs logged-in scenarios
- Check `fetch` call count to verify correct path taken (guest = no calls, logged-in = API call)
**Warning signs:** High coverage but production bugs in logged-in flow

### Pitfall 3: Floating-Point Comparison Failures
**What goes wrong:** `expect(totalPrice).toBe(185.50)` fails due to floating-point precision
**Why it happens:** JavaScript floating-point arithmetic (0.1 + 0.2 !== 0.3)
**How to avoid:**
```javascript
// Source: https://vitest.dev/api/expect.html
expect(totalPrice).toBeCloseTo(185.50, 2);  // 2 decimal places for currency
```
**Warning signs:** Tests fail with "Expected: 185.5, Received: 185.49999999999997"

### Pitfall 4: addToLocalStorage Requires DOM Structure
**What goes wrong:** Calling addToLocalStorage with wrong mock element fails silently or returns undefined
**Why it happens:** Function queries for `.front-image`, `.item-title`, and reads data-* attributes
**How to avoid:**
- Use createMockProductElement helper that matches expected DOM structure
- Verify element.querySelector returns expected elements before testing
**Warning signs:** Cart items have `title: ''`, `image: ''`, or undefined properties

### Pitfall 5: Async Test Timing
**What goes wrong:** Test completes before API call finishes, assertions fail
**Why it happens:** handleAddToCart with auth-token path calls fetch asynchronously
**How to avoid:**
```javascript
it('should call API', async () => {
  mockFetchSuccess({ success: true });
  handleAddToCart(mockElement);  // Note: this returns void, not a Promise

  // For addToUserStorage, fetch is called but not awaited
  // Use vi.waitFor or check mock was called
  await vi.waitFor(() => {
    expect(fetch).toHaveBeenCalled();
  });
});
```
**Warning signs:** Intermittent test failures, "fetch not called" when it should be

### Pitfall 6: Testing Currency Conversion in Model
**What goes wrong:** Writing tests for USD/ILS conversion in model tests
**Why it happens:** Model stores both prices but View handles display
**How to avoid:**
- Model tests verify both `usdPrice` and `ilsPrice` are stored correctly
- Currency conversion logic tests belong in View tests (Phase 20-21)
- Only test `calculateDiscountedPrice` function in model (it's the only calculation)
**Warning signs:** Model tests duplicating View test logic

### Pitfall 7: localStorage Quota Exceeded Not Handled
**What goes wrong:** App crashes when localStorage is full
**Why it happens:** No try-catch around localStorage.setItem in createLocalStorage
**How to avoid:**
```javascript
// Test that app handles quota errors gracefully
it('should not crash when localStorage quota exceeded', () => {
  // Mock localStorage.setItem to throw quota error
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = vi.fn(() => {
    const error = new DOMException('Quota exceeded', 'QuotaExceededError');
    error.code = 22;
    throw error;
  });

  expect(() => {
    handleAddToCart(mockElement);
  }).not.toThrow();

  localStorage.setItem = originalSetItem;
});
```
**Warning signs:** Uncaught DOMException in production when localStorage full

## Code Examples

Verified patterns from Phase 17 infrastructure and official sources:

### Complete Model Test File Structure
```javascript
// Source: Phase 17 patterns + model.js analysis
// tests/model/cart.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cart, handleAddToCart, removeFromUserCart, deleteAll, handleLoadStorage } from '../../js/model.js';
import { createProduct, resetFactoryCounter } from '../helpers/factories.js';
import { createMockProductElement } from '../helpers/mocks/dom-elements.js';

describe('Model: Cart Management', () => {
  beforeEach(() => {
    cart.length = 0;
    localStorage.clear();
    resetFactoryCounter();
  });

  describe('Add to Cart (Guest)', () => {
    it('should add product to cart array', () => {
      const product = createProduct({ id: 1001, name: 'Gold Necklace' });
      const mockElement = createMockProductElement(product);

      handleAddToCart(mockElement);

      expect(cart).toHaveLength(1);
      expect(cart[0].id).toBe(1001);
      expect(cart[0].title).toBe('Gold Necklace');
    });

    it('should persist to localStorage', () => {
      const product = createProduct();
      const mockElement = createMockProductElement(product);

      handleAddToCart(mockElement);

      const storedCart = JSON.parse(localStorage.getItem('cart'));
      expect(storedCart).toHaveLength(1);
      expect(storedCart[0].id).toBe(product.id);
    });

    it('should store both USD and ILS prices', () => {
      const product = createProduct({ usd_price: 50, ils_price: 185 });
      const mockElement = createMockProductElement(product);

      handleAddToCart(mockElement);

      expect(cart[0].usdPrice).toBe(50);
      expect(cart[0].ilsPrice).toBe(185);
    });
  });

  describe('Remove from Cart', () => {
    it('should remove item by ID', async () => {
      // Arrange: add item first
      const product = createProduct({ id: 1001 });
      cart.push({
        id: 1001,
        title: product.name,
        price: product.ils_price,
        amount: 1
      });
      localStorage.setItem('cart', JSON.stringify(cart));

      // Act
      await removeFromUserCart(1001);

      // Assert
      expect(cart).toHaveLength(0);
      const storedCart = JSON.parse(localStorage.getItem('cart'));
      expect(storedCart).toHaveLength(0);
    });
  });

  describe('Clear Cart', () => {
    it('should remove all items', async () => {
      // Arrange: add multiple items
      cart.push({ id: 1, title: 'A', amount: 1 });
      cart.push({ id: 2, title: 'B', amount: 1 });
      localStorage.setItem('cart', JSON.stringify(cart));

      // Act
      await deleteAll();

      // Assert
      expect(cart).toHaveLength(0);
      const storedCart = JSON.parse(localStorage.getItem('cart'));
      expect(storedCart).toHaveLength(0);
    });
  });
});
```

### localStorage Corruption Handling
```javascript
// Source: Phase 18 CONTEXT.md requirements
// tests/model/localStorage.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cart, handleLoadStorage } from '../../js/model.js';

describe('localStorage Corruption Handling', () => {
  beforeEach(() => {
    cart.length = 0;
    localStorage.clear();
  });

  it('should handle malformed JSON gracefully', async () => {
    localStorage.setItem('cart', 'not valid json{{{');

    await expect(handleLoadStorage()).resolves.not.toThrow();
    expect(cart).toHaveLength(0);  // Falls back to empty cart
  });

  it('should handle null cart value', async () => {
    localStorage.setItem('cart', 'null');

    await handleLoadStorage();
    expect(cart).toHaveLength(0);
  });

  it('should handle empty string cart value', async () => {
    localStorage.setItem('cart', '');

    await expect(handleLoadStorage()).resolves.not.toThrow();
    expect(cart).toHaveLength(0);
  });

  it('should handle array with invalid items', async () => {
    localStorage.setItem('cart', '[{"id": 1}, null, {"id": 2}]');

    await handleLoadStorage();
    // Should load valid items, skip invalid
    expect(cart.some(item => item === null)).toBe(false);
  });
});
```

### API Mocking for Logged-in Path
```javascript
// Source: https://stevekinney.com/courses/testing/mocking-fetch-and-network-requests
// tests/model/api.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cart, handleAddToCart, addToUserStorage, fetchUserCartAPI } from '../../js/model.js';
import { createProduct, resetFactoryCounter } from '../helpers/factories.js';
import { createMockProductElement } from '../helpers/mocks/dom-elements.js';

describe('Model: API Interactions', () => {
  let originalFetch;

  beforeEach(() => {
    cart.length = 0;
    localStorage.clear();
    resetFactoryCounter();

    // Save and mock fetch
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('Logged-in User API Calls', () => {
    beforeEach(() => {
      localStorage.setItem('auth-token', 'mock-jwt-token');
    });

    it('should call /addtocart with correct headers', () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const product = createProduct({ id: 1001 });
      const mockElement = createMockProductElement(product);
      handleAddToCart(mockElement);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/addtocart'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'auth-token': 'mock-jwt-token',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('1001')
        })
      );
    });

    it('should handle API network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const product = createProduct();
      const mockElement = createMockProductElement(product);

      // Should not throw, should log error
      expect(() => handleAddToCart(mockElement)).not.toThrow();
    });

    it('should handle 4xx API errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      });

      const product = createProduct();
      const mockElement = createMockProductElement(product);

      expect(() => handleAddToCart(mockElement)).not.toThrow();
    });
  });
});
```

### Discount Calculation Testing
```javascript
// Source: model.js calculateDiscountedPrice function
// tests/model/discount.test.js
import { describe, it, expect } from 'vitest';
import { calculateDiscountedPrice } from '../../js/model.js';

describe('Model: Discount Calculations', () => {
  it('should calculate correct discounted price', () => {
    expect(calculateDiscountedPrice(100, 10)).toBe(90);  // 10% off
    expect(calculateDiscountedPrice(100, 25)).toBe(75);  // 25% off
    expect(calculateDiscountedPrice(200, 50)).toBe(100); // 50% off
  });

  it('should return original price when no discount', () => {
    expect(calculateDiscountedPrice(100, 0)).toBe(100);
    expect(calculateDiscountedPrice(100, null)).toBe(100);
    expect(calculateDiscountedPrice(100, undefined)).toBe(100);
  });

  it('should handle floating-point precision', () => {
    // 33% of 99.99 = 66.6933 -> rounded to 67
    expect(calculateDiscountedPrice(100, 33.33)).toBeCloseTo(67, 0);
  });

  it('should handle edge cases', () => {
    expect(calculateDiscountedPrice(0, 10)).toBe(0);       // Zero price
    expect(calculateDiscountedPrice(100, -10)).toBe(100);  // Negative discount
    expect(calculateDiscountedPrice(100, 100)).toBe(0);    // 100% off
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jest-localstorage-mock | Happy-DOM native localStorage | 2025 | No extra packages needed, works out of the box |
| jest-fetch-mock | vi.fn() with mockResolvedValueOnce | 2024-2025 | Simpler API, built into Vitest |
| Manual test data | Factory functions with counter | Established | Predictable, unique IDs, supports overrides |
| toBe for numbers | toBeCloseTo for currency | Established | Handles floating-point precision correctly |

**Deprecated/outdated:**
- **jsdom for Happy-DOM projects:** Happy-DOM is already configured, provides working localStorage
- **jest-fetch-mock:** Use vi.fn() instead (native Vitest support)
- **Testing currency formatting in model:** Currency display is View concern, not model

## Open Questions

Things that couldn't be fully resolved:

1. **addToLocalStorage DOM dependency**
   - What we know: Function reads from DOM element data attributes and queries child elements
   - What's unclear: How tightly coupled is this to production DOM structure? Will refactoring break tests?
   - Recommendation: Create createMockProductElement helper that matches production structure; document required attributes

2. **handleLoadStorage try-catch coverage**
   - What we know: Has try-catch for JSON.parse errors
   - What's unclear: Does it handle all corruption scenarios (null, undefined, invalid array items)?
   - Recommendation: Test each corruption scenario; some may need error handling improvements in model.js

3. **Cart duplicate handling**
   - What we know: CONTEXT.md mentions "adding same product twice should update quantity"
   - What's unclear: Looking at addToLocalCart, it always pushes new item - no duplicate check
   - Recommendation: Test current behavior (pushes duplicates), document for potential future fix

4. **Quota exceeded error handling**
   - What we know: createLocalStorage calls localStorage.setItem without try-catch
   - What's unclear: Will app crash if localStorage is full?
   - Recommendation: Test that quota errors don't crash app; may require model.js improvement

## Sources

### Primary (HIGH confidence)
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking) - Official mocking patterns
- [Vitest expect API](https://vitest.dev/api/expect.html) - toBeCloseTo documentation
- [Steve Kinney: Mocking Fetch](https://stevekinney.com/courses/testing/mocking-fetch-and-network-requests) - Fetch mock patterns
- model.js source analysis - Actual implementation patterns
- Phase 17 RESEARCH.md - Established infrastructure patterns

### Secondary (MEDIUM confidence)
- [Run That Line: Mock LocalStorage](https://runthatline.com/vitest-mock-localstorage/) - LocalStorage testing patterns
- [Dylan Britz: Mocking localStorage](https://dylanbritz.dev/writing/mocking-local-storage-vitest/) - Spy patterns
- [Handling Floating-Point Precision](https://medium.com/@contactxanta/handling-floating-point-precision-in-javascript-tests-tobe-vs-tobecloseto-e84c0f277407) - Currency testing

### Tertiary (LOW confidence)
- [mock-local-storage npm](https://www.npmjs.com/package/mock-local-storage) - Quota exceeded simulation (not using, documented for reference)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing Phase 17 infrastructure, no new dependencies
- Architecture: HIGH - Patterns derived from model.js source analysis + established testing patterns
- Pitfalls: HIGH - Based on model.js implementation analysis and Phase 17 lessons

**Research date:** 2026-02-08
**Valid until:** ~30 days (stable stack, model.js unlikely to change significantly)
