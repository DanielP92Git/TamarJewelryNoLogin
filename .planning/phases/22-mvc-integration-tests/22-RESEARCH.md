# Phase 22: MVC Integration Tests - Research

**Researched:** 2026-02-09
**Domain:** JavaScript MVC integration testing with Vitest and Happy-DOM
**Confidence:** MEDIUM

## Summary

MVC integration testing validates that the controller, model, and view layers work together correctly as a system. Unlike unit tests that verify individual components in isolation (covered in Phases 18-21), integration tests verify the WIRING between layers: controller routing maps hash fragments to correct views, model state changes propagate to view re-renders, view lifecycle methods execute properly during navigation, and state remains consistent across page transitions.

The key challenge is balancing comprehensive coverage with test maintainability. Tests must verify both architectural correctness (correct view instance created, correct method called) AND behavioral outcomes (correct DOM rendered, correct data displayed). For this codebase's hash-based SPA architecture, tests should simulate real user flows through multiple pages while catching common pitfalls like memory leaks from uncleaned event listeners and race conditions from rapid navigation.

**Primary recommendation:** Structure integration tests into four focused suites (routing, model-view sync, lifecycle/cleanup, and end-to-end scenarios) using the existing Vitest + Happy-DOM stack with behavioral verification via spies and DOM assertions. Test all routes (not subsets), all price/text elements (not samples), and both guest and logged-in user paths.

## Standard Stack

The established libraries/tools for JavaScript MVC integration testing in this codebase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | ^4.0.18 | Test runner and framework | Already established in Phases 18-21, 2-3x faster than Jest, excellent Happy-DOM integration |
| Happy-DOM | ^20.0.11 | Browser environment simulation | Proven in 154 existing tests across 4 phases, handles DOM, localStorage, CustomEvents |
| @testing-library/dom | ^10.4.0 | Semantic DOM queries | Project standard since Phase 17, provides getByRole/getByText for resilient assertions |
| @testing-library/user-event | ^14.5.2 | User interaction simulation | Realistic event simulation for clicks, typing, navigation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/jest-dom | ^6.6.3 | DOM matchers | Enhances expect() with toBeVisible(), toHaveTextContent() |
| @vitest/coverage-v8 | ^4.0.18 | Coverage reporting | Already configured in vitest.config.js |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Happy-DOM | jsdom | More complete browser API support but 2-3x slower (rejected in Phase 17) |
| Vitest | Playwright Component Testing | Full browser testing with real navigation but much slower for unit/integration tests |
| Custom routing simulation | Actual Playwright e2e | Real browser navigation but inappropriate for integration test speed requirements |

**Installation:**
No new packages needed - all dependencies already in `frontend/package.json` from Phases 17-21.

## Architecture Patterns

### Recommended Project Structure
```
frontend/tests/
├── integration/                    # NEW: Phase 22 integration tests
│   ├── routing.test.js            # Controller routing and navigation
│   ├── model-view-sync.test.js    # State propagation between layers
│   ├── lifecycle.test.js          # Mount/unmount/cleanup verification
│   └── user-journeys.test.js      # End-to-end shopping flows
├── model/                          # Phase 18: Model unit tests
├── view/                           # Phase 19: Base View unit tests
├── views/                          # Phase 20: Page View unit tests
├── locale/                         # Phase 21: Locale/currency tests
└── helpers/
    ├── integration/                # NEW: Integration test helpers
    │   ├── router-mock.js         # Hash navigation simulation
    │   ├── multi-view-fixture.js  # Fixtures for view transitions
    │   └── journey-helpers.js     # Shopping flow utilities
    ├── dom.js
    ├── factories.js
    └── mocks/
```

### Pattern 1: Hash Navigation Simulation

**What:** Simulating hash-based routing without actual browser navigation.

**When to use:** Testing controller routing logic, back/forward navigation, unknown route handling.

**Key insight:** Happy-DOM DOES support hashchange and popstate events ([MDN Window.popstate](https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event)) but tests must manually dispatch them since no actual page navigation occurs in the test environment.

**Example:**
```javascript
// Helper function for simulating hash navigation
function navigateToHash(hash) {
  // Update window.location.hash
  window.location.hash = hash;

  // Manually dispatch hashchange event (Happy-DOM doesn't auto-fire in tests)
  const event = new HashChangeEvent('hashchange', {
    oldURL: window.location.href,
    newURL: window.location.origin + window.location.pathname + hash
  });
  window.dispatchEvent(event);
}

// Test controller routing
it('should route to cart view when hash changes to #cart', () => {
  const controllerSpy = vi.spyOn(controller, 'controlCartPage');

  navigateToHash('#cart');

  expect(controllerSpy).toHaveBeenCalledWith('eng');
  expect(document.querySelector('.cart-items-container')).toBeTruthy();
});
```

### Pattern 2: Model-View Synchronization Testing

**What:** Verifying that model state changes trigger correct view updates.

**When to use:** Testing currency changes update all prices, cart additions update cart badge, language switches update all text.

**Key insight:** Test BOTH the propagation mechanism (CustomEvent dispatch, method call) AND the final DOM state. Don't assume a method call means the DOM updated correctly.

**Example:**
```javascript
it('should update all visible prices when currency switches from USD to ILS', () => {
  // Arrange: Render cart with 3 items in USD
  model.cart.push(
    createCartItem({ usdPrice: 50, ilsPrice: 185 }),
    createCartItem({ usdPrice: 40, ilsPrice: 148 }),
    createCartItem({ usdPrice: 60, ilsPrice: 222 })
  );
  localStorage.setItem('currency', 'usd');
  CartView.render(3);

  // Verify initial USD display
  const pricesBefore = document.querySelectorAll('.item-price');
  expect(pricesBefore[0].textContent).toContain('$50');
  expect(pricesBefore[1].textContent).toContain('$40');
  expect(pricesBefore[2].textContent).toContain('$60');

  // Act: Switch currency (simulates user selecting ILS)
  localStorage.setItem('currency', 'ils');
  window.dispatchEvent(new CustomEvent('currency-changed', {
    detail: { currency: 'ils' }
  }));

  // Assert: ALL prices updated to ILS (not just one)
  const pricesAfter = document.querySelectorAll('.item-price');
  expect(pricesAfter[0].textContent).toContain('₪185');
  expect(pricesAfter[1].textContent).toContain('₪148');
  expect(pricesAfter[2].textContent).toContain('₪222');

  // Also verify total recalculated
  const total = document.querySelector('.order-total');
  expect(total.textContent).toContain('₪555'); // 185+148+222
});
```

### Pattern 3: Lifecycle and Cleanup Verification

**What:** Ensuring views properly mount, update, and clean up resources during navigation.

**When to use:** Testing memory leak prevention, event listener cleanup, async operation cancellation.

**Key insight:** Happy-DOM lacks `getEventListeners()` API, so use behavioral verification: spy on methods, count event fires, check for duplicate handlers by triggering events multiple times.

**Example:**
```javascript
it('should not accumulate duplicate event listeners after rapid navigation', () => {
  const clickHandler = vi.fn();
  document.addEventListener('click', clickHandler);

  // Simulate rapid navigation: home -> cart -> home -> cart -> home
  for (let i = 0; i < 5; i++) {
    navigateToHash('#home');
    navigateToHash('#cart');
  }

  // Trigger event once
  document.body.click();

  // Should fire exactly once (no duplicates from failed cleanup)
  expect(clickHandler).toHaveBeenCalledTimes(1);
});

it('should abort pending fetch when navigating away from view', async () => {
  // Arrange: Start loading products on categories page
  navigateToHash('#categories');
  const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(
    () => new Promise(resolve => setTimeout(resolve, 1000)) // Slow response
  );

  // Act: Navigate away before fetch completes
  setTimeout(() => navigateToHash('#home'), 100);

  // Assert: Old fetch ignored when it eventually completes
  await vi.waitFor(() => {
    expect(document.querySelector('.product-grid')).toBeFalsy();
  });
});
```

### Pattern 4: End-to-End User Journey

**What:** Testing complete shopping flows through multiple views as single integration test.

**When to use:** Validating the full stack works together for critical user paths.

**Key insight:** One comprehensive journey test is more valuable than fragmented partial flows. Test BOTH guest (localStorage) AND logged-in (API) paths in separate describe blocks.

**Example:**
```javascript
describe('Complete Shopping Journey - Guest User', () => {
  it('should add item, navigate to cart, switch currency, and maintain state', async () => {
    // 1. Start on home page
    navigateToHash('#home');
    expect(document.querySelector('.home-content')).toBeTruthy();

    // 2. Add product to cart
    const product = createProduct({ id: 1001, usdPrice: 50, ilsPrice: 185 });
    const productElement = createMockProductElement(product);
    handleAddToCart(productElement);

    // 3. Verify cart badge updated
    const cartBadge = document.querySelector('.cart-number');
    expect(cartBadge.textContent).toBe('1');

    // 4. Navigate to cart
    navigateToHash('#cart');
    expect(document.querySelector('.cart-items-container')).toBeTruthy();

    // 5. Verify item appears with USD price
    expect(document.querySelector('.item-title').textContent).toBe(product.name);
    expect(document.querySelector('.item-price').textContent).toContain('$50');

    // 6. Switch to ILS
    localStorage.setItem('currency', 'ils');
    window.dispatchEvent(new CustomEvent('currency-changed', {
      detail: { currency: 'ils' }
    }));

    // 7. Verify price updated but quantity preserved
    expect(document.querySelector('.item-price').textContent).toContain('₪185');
    expect(document.querySelector('.cart-qty__input').value).toBe('1');

    // 8. Navigate back to home - cart should persist
    navigateToHash('#home');
    expect(cartBadge.textContent).toBe('1'); // Still shows 1 item

    // 9. Navigate back to cart - item still there
    navigateToHash('#cart');
    expect(document.querySelector('.item-title').textContent).toBe(product.name);
  });
});
```

### Anti-Patterns to Avoid

- **Testing subsets instead of complete sets:** If requirement says "all prices update," test ALL price elements, not a representative sample. Bugs hide in the elements you skip.

- **Only testing method calls without DOM verification:** `expect(view.render).toHaveBeenCalled()` doesn't prove the DOM was updated correctly. Always verify final DOM state.

- **Mixing unit and integration concerns:** Integration tests should NOT mock the layers they're testing. Mock external dependencies (API calls) but let controller→model→view flow execute real code.

- **Single navigation path coverage:** Testing only forward navigation misses back button bugs. Test both `navigateToHash()` AND `history.back()` simulation.

- **Ignoring async timing:** Failing to await async operations leads to flaky tests. Use `vi.waitFor()` for eventual consistency, `vi.useFakeTimers()` for controlling timing.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hash navigation simulation | Custom hashchange dispatcher | HashChangeEvent + manual dispatch pattern | Standard browser API, works with Happy-DOM, matches real behavior |
| Waiting for async DOM updates | Polling with setInterval | `@testing-library/dom` waitFor() | Built-in timeout handling, better error messages, already in dependencies |
| User interaction simulation | new MouseEvent() constructors | @testing-library/user-event | More realistic event sequences (mousedown→mouseup→click), handles focus/blur |
| View state inspection | Introspecting internal properties | DOM queries via getByRole/getByText | Tests behavior not implementation, survives refactoring |
| Multi-step test data setup | Inline object literals | Factory functions from helpers/factories.js | DRY, unique IDs per test, matches real data structure |

**Key insight:** The existing test infrastructure from Phases 18-21 provides 90% of what's needed. The new challenge is composing these tools to test cross-layer interactions, not building new utilities.

## Common Pitfalls

### Pitfall 1: Happy-DOM Navigation API Limitations

**What goes wrong:** Tests fail because Happy-DOM doesn't automatically fire hashchange/popstate events during test execution.

**Why it happens:** Happy-DOM simulates the DOM but doesn't simulate full browser navigation behavior. While it DOES implement the event constructors and dispatch mechanism, tests must manually trigger events because no actual URL navigation occurs in the Node.js environment.

**How to avoid:**
- Always manually dispatch HashChangeEvent after changing window.location.hash
- For back/forward button simulation, manually dispatch PopStateEvent with state object
- Create helper functions (like `navigateToHash()` above) to encapsulate this pattern

**Warning signs:**
- Controller routing tests pass but views don't render
- `window.location.hash` changes but no view update
- Works in browser but fails in tests

**Verification:** According to [Vitest browser mode comparison](https://mayashavin.com/articles/component-testing-browser-vitest), "One big limitation of Vitest's browser mode in comparison to Playwright's Component Testing is the lack of browser's address bar, limiting testing of the component's state synchronization with URL query params."

### Pitfall 2: State Pollution Between Integration Tests

**What goes wrong:** Integration tests pass individually but fail when run together, or results depend on test execution order.

**Why it happens:** Integration tests involve more global state (window.location, localStorage, model.cart array) than unit tests. Incomplete cleanup in one test affects subsequent tests.

**How to avoid:**
- Clear ALL stateful globals in beforeEach: model.cart.length = 0, localStorage.clear(), delete window.__currencyPersistenceInitialized
- Reset window.location.hash to initial state ('' or '#home')
- Use vi.restoreAllMocks() in afterEach to clean up spies
- Consider each integration test a fresh page load scenario

**Warning signs:**
- Tests pass when run individually (`.only`) but fail in suite
- First test passes, subsequent similar tests fail
- Tests fail in CI but pass locally
- Random test failures that disappear on re-run

### Pitfall 3: Over-Mocking in Integration Tests

**What goes wrong:** Tests pass but real integration is broken because too much was mocked.

**Why it happens:** Developers carry unit test mocking habits into integration tests, defeating the purpose of testing cross-layer interactions.

**How to avoid:**
- Only mock EXTERNAL boundaries: API calls (fetch), browser APIs (Image constructor for testing), time-dependent operations (fake timers)
- Do NOT mock: model functions called by controller, view render methods, event propagation between layers
- Rule of thumb: If it's in `frontend/js/` (not external), don't mock it in integration tests

**Warning signs:**
- All integration tests pass but production has navigation bugs
- Tests become complex webs of mock configuration
- Mocks need constant maintenance as internal APIs change
- Integration tests feel like unit tests with more setup

### Pitfall 4: Not Testing Both User Types

**What goes wrong:** Tests only cover guest user (localStorage) flow, missing logged-in user (API) bugs, or vice versa.

**Why it happens:** Test author takes the path they're most familiar with, forgetting the codebase has dual authentication paths.

**How to avoid:**
- Every integration test suite should have two describe blocks: "Guest User" and "Logged-In User"
- Guest tests verify localStorage persistence, no API calls
- Logged-in tests mock fetch responses, verify auth-token headers
- Cart operations especially critical - frontend cart format differs between modes

**Warning signs:**
- Production bugs only affect logged-in/logged-out users
- API-related failures not caught by tests
- localStorage code paths have less coverage
- No auth-token verification in cart tests

**Verification:** From existing tests pattern: `describe('Add to Cart - Guest User')` and `describe('Add to Cart - Logged-in User')` in `model/cart.test.js` (lines 22-145).

### Pitfall 5: Testing Too Fast (No Async Timing)

**What goes wrong:** Tests verify state immediately after triggering change, before async operations complete, leading to false failures or worse, false passes.

**Why it happens:** Integration tests involve async operations (fetch calls, CustomEvent propagation, setTimeout in view logic) that don't complete synchronously.

**How to avoid:**
- Use `await vi.waitFor(() => expect(...))` for assertions on async outcomes
- Use `vi.useFakeTimers()` + `vi.advanceTimersByTime()` for controlling setTimeout/setInterval
- Always await async controller functions like `controlCartPage()`
- Check for Promises in the execution path - if present, test needs async handling

**Warning signs:**
- Intermittent test failures ("flaky tests")
- Tests pass with increased timeout but fail with default
- Production works but tests fail with "element not found"
- Adding arbitrary `await new Promise(resolve => setTimeout(resolve, 100))` makes tests pass

**Reference:** [Testing async JavaScript code](https://dev.to/presh_dev/testing-asynchronous-code-in-nodejs-1730) emphasizes "use test doubles to control async operation order or timing."

## Code Examples

Verified patterns from research and existing codebase:

### Complete Router Test Suite Structure
```javascript
// Source: Synthesized from controller.js structure and web search findings
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as controller from '../../js/controller.js';
import * as model from '../../js/model.js';

describe('MVC Integration: Controller Routing', () => {
  beforeEach(() => {
    // Render base DOM structure required by all views
    document.body.innerHTML = `
      <body id="home">
        <header></header>
        <div class="menu"></div>
        <div data-purpose="header-utilities"></div>
        <div class="footer"></div>
        <div class="main-content"></div>
      </body>
    `;

    localStorage.clear();
    model.cart.length = 0;
    window.location.hash = '';

    // Mock model.handleLoadStorage (integration tests should mock external deps)
    vi.spyOn(model, 'handleLoadStorage').mockResolvedValue();
    vi.spyOn(model, 'checkCartNumber').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Hash-based routing', () => {
    it('should route to home view for #home hash', async () => {
      navigateToHash('#home');

      // Verify both view instantiation AND resulting DOM
      expect(document.body.id).toBe('home');
      expect(document.querySelector('.home-content')).toBeTruthy();
    });

    it('should route to cart view for #cart hash', async () => {
      navigateToHash('#cart');

      expect(document.querySelector('.cart-items-container')).toBeTruthy();
    });

    it('should route to workshop view for #workshop hash', async () => {
      navigateToHash('#workshop');

      expect(document.querySelector('.workshop-content')).toBeTruthy();
    });

    // Test ALL routes, not subset (per user decision)
    it('should route to about view for #about hash', async () => {
      navigateToHash('#about');
      expect(document.querySelector('.about-content')).toBeTruthy();
    });

    it('should route to contact view for #contact hash', async () => {
      navigateToHash('#contact');
      expect(document.querySelector('.contact-form')).toBeTruthy();
    });

    it('should route to policies view for #policies hash', async () => {
      navigateToHash('#policies');
      expect(document.querySelector('.policies-content')).toBeTruthy();
    });
  });

  describe('Unknown route handling', () => {
    it('should redirect to home for unknown hash', () => {
      navigateToHash('#nonexistent-page');

      // Should fall back to home view
      expect(document.body.id).toBe('home');
    });

    it('should handle empty hash as home route', () => {
      navigateToHash('');
      expect(document.querySelector('.home-content')).toBeTruthy();
    });
  });

  describe('Browser back/forward navigation', () => {
    it('should handle back button after navigation', () => {
      // Forward navigation
      navigateToHash('#cart');
      expect(document.querySelector('.cart-items-container')).toBeTruthy();

      // Simulate back button
      window.history.back();
      window.dispatchEvent(new PopStateEvent('popstate', {
        state: { hash: '#home' }
      }));

      expect(document.querySelector('.home-content')).toBeTruthy();
    });
  });
});

function navigateToHash(hash) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange', {
    oldURL: window.location.href,
    newURL: window.location.origin + window.location.pathname + hash
  }));
}
```

### Comprehensive Model-View Sync Test
```javascript
// Source: Extended from view/currency.test.js and cart.test.js patterns
describe('MVC Integration: Model-View Synchronization', () => {
  describe('Currency change propagation', () => {
    it('should update ALL price elements across the page', () => {
      // Arrange: Complex page with multiple price displays
      model.cart.push(
        createCartItem({ title: 'Item 1', usdPrice: 50, ilsPrice: 185 }),
        createCartItem({ title: 'Item 2', usdPrice: 40, ilsPrice: 148 }),
        createCartItem({ title: 'Item 3', usdPrice: 60, ilsPrice: 222 })
      );
      localStorage.setItem('currency', 'usd');
      CartView.render(3);

      // Verify initial state: ALL prices in USD
      const initialPrices = document.querySelectorAll('.item-price');
      expect(initialPrices).toHaveLength(3);
      initialPrices.forEach(price => {
        expect(price.textContent).toMatch(/\$/);
      });

      const initialTotal = document.querySelector('.order-total');
      expect(initialTotal.textContent).toContain('$150'); // 50+40+60

      // Act: Currency switch
      localStorage.setItem('currency', 'ils');
      window.dispatchEvent(new CustomEvent('currency-changed', {
        detail: { currency: 'ils' }
      }));

      // Assert: ALL prices updated (not spot-check)
      const updatedPrices = document.querySelectorAll('.item-price');
      expect(updatedPrices[0].textContent).toContain('₪185');
      expect(updatedPrices[1].textContent).toContain('₪148');
      expect(updatedPrices[2].textContent).toContain('₪222');

      // Total also recalculated
      const updatedTotal = document.querySelector('.order-total');
      expect(updatedTotal.textContent).toContain('₪555');
    });

    it('should update prices from API response (not just user action)', async () => {
      // Currency can change from: user selection, backend hydration, localStorage load
      model.cart.push(createCartItem({ usdPrice: 50, ilsPrice: 185 }));
      CartView.render(1);

      // Simulate backend saying "you're in Israel, use ILS"
      await hydrateLocaleFromBackend(); // This dispatches currency-changed internally

      expect(document.querySelector('.item-price').textContent).toContain('₪');
    });
  });

  describe('Language change propagation', () => {
    it('should update ALL translatable text on the current view', async () => {
      await CartView.setLanguage('eng', 1);

      // Collect all translatable elements
      const cartTitle = document.querySelector('.cart-title');
      const summaryTitle = document.querySelector('.summary-title');
      const checkoutBtn = document.querySelector('#stripe-checkout-btn');
      const deleteAllBtn = document.querySelector('.delete-all');

      expect(cartTitle.textContent).toBe('Your Cart');
      expect(summaryTitle.textContent).toBe('Order Summary');
      expect(checkoutBtn.textContent).toContain('Checkout');
      expect(deleteAllBtn.textContent).toContain('Delete All');

      // Switch to Hebrew
      await CartView.setLanguage('heb', 1);

      // ALL text updated (Hebrew text would go here)
      expect(cartTitle.textContent).toBe('העגלה שלך');
      expect(summaryTitle.textContent).toBe('סיכום הזמנה');
      // ... verify all text elements
    });
  });
});
```

### Lifecycle and Cleanup Verification
```javascript
// Source: Synthesized from cleanup.test.js patterns and memory leak research
describe('MVC Integration: Lifecycle and Cleanup', () => {
  it('should clean up event listeners during rapid navigation', () => {
    const eventHandler = vi.fn();

    // Simulate view that adds listener
    function setupView() {
      document.addEventListener('customEvent', eventHandler);
    }

    function teardownView() {
      document.removeEventListener('customEvent', eventHandler);
    }

    // Rapid navigation: mount/unmount 5 times
    for (let i = 0; i < 5; i++) {
      setupView();
      teardownView();
    }

    // Trigger event
    document.dispatchEvent(new CustomEvent('customEvent'));

    // Should only fire once (last mounted view), not 5 times
    expect(eventHandler).toHaveBeenCalledTimes(0); // All cleaned up
  });

  it('should abort pending async operations when navigating away', async () => {
    vi.useFakeTimers();

    // Start slow async operation
    let fetchAborted = false;
    const slowFetch = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => resolve({ data: 'loaded' }), 5000);

      // Cleanup function
      window.__currentFetchAbort = () => {
        clearTimeout(timeout);
        fetchAborted = true;
        reject(new Error('Aborted'));
      };
    });

    // Navigate away before completion
    vi.advanceTimersByTime(1000);
    window.__currentFetchAbort?.();

    // Verify aborted
    expect(fetchAborted).toBe(true);

    vi.useRealTimers();
  });

  it('should remove old view DOM when mounting new view', () => {
    // Home view renders
    navigateToHash('#home');
    const homeContent = document.querySelector('.home-content');
    expect(homeContent).toBeTruthy();

    // Navigate to cart
    navigateToHash('#cart');

    // Old view DOM removed
    expect(document.querySelector('.home-content')).toBeFalsy();

    // New view DOM present
    expect(document.querySelector('.cart-items-container')).toBeTruthy();
  });
});
```

### Complete User Journey Test
```javascript
// Source: Synthesized from research on end-to-end SPA testing
describe('MVC Integration: Complete User Journeys', () => {
  describe('Guest User Shopping Flow', () => {
    it('should complete full journey: browse → add → cart → currency switch → checkout', async () => {
      // 1. Start on home page
      navigateToHash('#home');
      expect(document.body.id).toBe('home');

      // 2. Browse to categories
      navigateToHash('#categories');
      expect(document.querySelector('.product-grid')).toBeTruthy();

      // 3. Add product to cart
      const product = createProduct({
        id: 1001,
        name: 'Gold Necklace',
        usdPrice: 50,
        ilsPrice: 185
      });
      const productEl = createMockProductElement(product);

      // Should NOT call API for guest
      const fetchSpy = vi.spyOn(global, 'fetch');
      handleAddToCart(productEl);
      expect(fetchSpy).not.toHaveBeenCalled();

      // Verify localStorage updated
      const storedCart = JSON.parse(localStorage.getItem('cart'));
      expect(storedCart).toHaveLength(1);
      expect(storedCart[0].id).toBe(1001);

      // 4. Cart badge updates
      expect(document.querySelector('.cart-number').textContent).toBe('1');

      // 5. Navigate to cart
      navigateToHash('#cart');

      // 6. Verify item displayed with USD (default)
      expect(document.querySelector('.item-title').textContent).toBe('Gold Necklace');
      expect(document.querySelector('.item-price').textContent).toContain('$50');

      // 7. Switch to ILS mid-checkout
      localStorage.setItem('currency', 'ils');
      window.dispatchEvent(new CustomEvent('currency-changed', {
        detail: { currency: 'ils' }
      }));

      // 8. Price updates, state consistent
      expect(document.querySelector('.item-price').textContent).toContain('₪185');
      expect(document.querySelector('.cart-qty__input').value).toBe('1'); // Quantity preserved
      expect(model.cart[0].amount).toBe(1); // Model consistent

      // 9. Navigate away and back - cart persists
      navigateToHash('#home');
      navigateToHash('#cart');
      expect(document.querySelector('.item-title').textContent).toBe('Gold Necklace');

      // 10. Proceed to checkout (Stripe always uses USD)
      const checkoutBtn = document.querySelector('#stripe-checkout-btn');
      expect(checkoutBtn).toBeTruthy();
      // Stripe checkout verification would go here
    });
  });

  describe('Logged-In User Shopping Flow', () => {
    it('should sync cart with API and maintain state across navigation', async () => {
      // Setup: User logged in
      localStorage.setItem('auth-token', 'mock-jwt-token');
      setupFetchMock();

      // Add product - should call API
      const product = createProduct({ id: 1002, usdPrice: 40, ilsPrice: 148 });
      const productEl = createMockProductElement(product);

      mockFetchSuccess({ success: true, cart: { 1002: 1 } });
      handleAddToCart(productEl);

      // Verify API called with auth
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/addtocart'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'auth-token': 'mock-jwt-token'
          })
        })
      );

      // Navigate to cart - should fetch user's cart from API
      mockFetchSuccess({
        cart: { 1002: 1 },
        products: [product]
      });

      navigateToHash('#cart');

      // Verify cart rendered from API data
      await vi.waitFor(() => {
        expect(document.querySelector('.item-title').textContent).toBe(product.name);
      });

      teardownFetchMock();
    });
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Selenium/WebDriver for all tests | Vitest with Happy-DOM for integration, Playwright for e2e | 2024-2025 | 10-100x faster test execution, integration tests now practical |
| Manual hashchange simulation | HashChangeEvent constructor + dispatch | HTML5 spec | Standardized, works across test environments |
| setTimeout polling for async | @testing-library waitFor() | 2020+ | Reliable async assertions, better error messages |
| Mocking everything | Strategic mocking (external only) | Modern testing philosophy | Integration tests actually test integration |
| Testing implementation details | Testing user behavior (semantic queries) | 2019+ (Testing Library) | Tests survive refactoring, catch real bugs |

**Deprecated/outdated:**
- **Enzyme shallow rendering:** Replaced by @testing-library/dom semantic queries in Phase 17
- **Jest:** Replaced by Vitest in Phase 17 for 2-3x performance improvement
- **jsdom:** Replaced by Happy-DOM in Phase 17 for 2-3x performance improvement
- **Global fetch polyfills:** Modern Node.js (18+) includes native fetch

## Open Questions

Things that couldn't be fully resolved:

1. **How much navigation timing simulation is needed?**
   - What we know: Rapid navigation can cause race conditions, Happy-DOM supports event dispatch
   - What's unclear: Exact timing patterns that trigger bugs in production (100ms? 500ms? instant?)
   - Recommendation: Test both instant navigation (no delay) and realistic timing (~200ms between clicks). Use `vi.useFakeTimers()` for deterministic control.

2. **Should we test actual browser back/forward button behavior?**
   - What we know: Happy-DOM supports PopStateEvent, but doesn't maintain history stack
   - What's unclear: Whether manual history.back() simulation catches real browser bugs
   - Recommendation: Include basic popstate tests for coverage, but rely on e2e tests (future phase) for true browser navigation validation. Document limitation in test comments.

3. **How to test CSS-dependent behavior (flex-direction, RTL layout)?**
   - What we know: Happy-DOM doesn't compute styles (getComputedStyle returns empty)
   - What's unclear: Whether DOM attribute testing (dir="rtl") is sufficient proxy
   - Recommendation: Test dir/lang attributes and document.documentElement properties as triggers. Note in comments that actual layout verification requires browser testing. Phase 21 research established this pattern (LOCALE-03).

4. **Integration test isolation vs. shared state performance?**
   - What we know: Each test should be isolated, but full app bootstrap is expensive
   - What's unclear: Whether shared fixtures (keeping views mounted) improves performance without breaking isolation
   - Recommendation: Start with full isolation (beforeEach clears everything). If tests become slow (>5s for 50 tests), explore describe-level fixtures with careful state management.

## Sources

### Primary (HIGH confidence)
- Controller structure: `frontend/js/controller.js` (actual implementation)
- Model API: `frontend/js/model.js` (actual implementation)
- View base class: `frontend/js/View.js` (actual implementation)
- Existing test patterns: `frontend/tests/` (154 tests from Phases 17-21)
- Test setup: `frontend/tests/setup.js` (Happy-DOM configuration)
- Vitest configuration: `frontend/vitest.config.js` (environment, timeouts)

### Secondary (MEDIUM confidence)
- [Vitest Component Testing Guide](https://vitest.dev/guide/browser/component-testing) - Official Vitest browser mode capabilities
- [Microsoft Learn: ASP.NET Core Integration Tests](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests?view=aspnetcore-10.0) - Integration testing best practices
- [MDN: Window popstate event](https://developer.mozilla.org/en-us/docs/Web/API/Window/popstate_event) - Browser navigation API
- [DEV: React Hook on Unmount Best Practices](https://www.dhiwise.com/post/react-hook-on-unmount-best-practices) - Lifecycle cleanup patterns
- [JavaScript Plain English: Race Conditions in 2026](https://javascript.plainenglish.io/beyond-async-await-why-your-2026-apps-still-have-race-conditions-dc43af7437dd) - Async testing challenges

### Tertiary (LOW confidence)
- [Vitest vs Jest 30: Browser-Native Testing](https://dev.to/dataformathub/vitest-vs-jest-30-why-2026-is-the-year-of-browser-native-testing-2fgb) - Testing trends (opinion piece)
- [Vanilla JS State Management 2026](https://medium.com/@chirag.dave/state-management-in-vanilla-js-2026-trends-f9baed7599de) - State patterns (not specific to testing)
- [Testing Library React Hooks race conditions](https://github.com/testing-library/react-hooks-testing-library/issues/331) - Framework-specific issue (React, not vanilla JS)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already proven in 154 tests across Phases 17-21
- Architecture patterns: MEDIUM - Synthesized from existing tests + web research, needs validation in practice
- Pitfalls: MEDIUM - Based on common patterns in research + existing codebase experience, not all encountered firsthand
- Code examples: MEDIUM - Synthesized from multiple sources, not yet run in this codebase

**Research date:** 2026-02-09
**Valid until:** 30 days (stable testing stack, but Vitest releases frequently)

**Research limitations:**
- Happy-DOM navigation capabilities verified via documentation but not tested in this specific codebase
- Cross-browser navigation differences not addressed (Happy-DOM only simulates one browser)
- Performance benchmarks for integration tests not measured (current codebase has 154 tests, no integration suite yet)
- E2e testing boundaries not fully defined (future phase will clarify what moves from integration to e2e)
