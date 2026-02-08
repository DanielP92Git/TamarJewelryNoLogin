# Phase 17: Test Infrastructure & Utilities - Research

**Researched:** 2026-02-08
**Domain:** Frontend testing infrastructure with Vitest + Happy-DOM for vanilla JavaScript MVC
**Confidence:** HIGH

## Summary

Phase 17 establishes the foundational testing infrastructure for the vanilla JavaScript MVC frontend, replacing jsdom with Happy-DOM for 2-3x performance improvements while maintaining comprehensive browser API support. The research reveals clear best practices for Vitest + Happy-DOM configuration, state cleanup patterns, and test utility organization that mirror the successful v1.2 backend testing approach.

The standard stack centers on **Vitest 4.0.18** (already installed) with **Happy-DOM 20.0.11** for browser environment emulation, **@testing-library/dom** for semantic queries (without the full React Testing Library), and **@testing-library/user-event** for realistic user interaction simulation. State cleanup follows a proven pattern: `afterEach(() => localStorage.clear())` combined with `beforeEach(() => document.body.innerHTML = '')` prevents test pollution while maintaining predictable test state.

Critical finding: Happy-DOM's 2-3x speed advantage over jsdom makes it ideal for large test suites, but version 20.0+ introduces breaking changes (JavaScript evaluation disabled by default for security). The project should use Happy-DOM 20.0.11+ to avoid CVE-2025-61927 (VM escape vulnerability), accepting the performance/compatibility tradeoff.

**Primary recommendation:** Use Happy-DOM 20.0.11 with Vitest 4.0.18, establish factory/fixture patterns matching backend tests, adopt @testing-library/dom semantic queries, and extend the existing GitHub Actions workflow to include frontend tests with coverage reporting.

## Standard Stack

The established libraries/tools for frontend testing with Vitest:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.0.18 | Test runner | Already used for backend (v1.2), Vite-native, fast HMR-based test execution |
| happy-dom | 20.0.11+ | Browser environment | 2-3x faster than jsdom, sufficient API coverage, security patches for CVE-2025-61927 |
| @testing-library/dom | 10.4.0 | Semantic DOM queries | Industry standard for accessible queries (getByRole, getByLabelText), framework-agnostic |
| @vitest/coverage-v8 | 4.0.18 | Code coverage | Already configured, V8-based (fastest), matches Vitest version |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/user-event | 14.5.2 | User interactions | Testing forms, clicks, typing - simulates full event sequences (not just fireEvent) |
| @testing-library/jest-dom | 6.6.3 | Custom matchers | Semantic assertions (toBeVisible, toHaveTextContent) - improves test readability |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Happy-DOM 20.0.11 | jsdom 28.0.0 | jsdom has more complete browser API coverage but 2-3x slower; happy-dom lacks some APIs (e.g., layout/CSS calculations) but sufficient for DOM testing |
| Happy-DOM 20.0.11 | Happy-DOM 15.7.4 | v15 avoids breaking changes but has CVE-2025-61927 VM escape vulnerability - security risk outweighs stability |
| Vitest globals | Explicit imports | `globals: true` in config reduces boilerplate; explicit imports better for tree-shaking but adds verbosity |
| MSW (Mock Service Worker) | vi.fn() mocking | MSW provides network-level interception (more realistic); vi.fn() sufficient for simple API mocks, faster setup |

**Installation:**
```bash
# Happy-DOM (replace jsdom)
npm uninstall jsdom
npm install --save-dev happy-dom@20.0.11

# Testing Library utilities (already partially installed)
npm install --save-dev @testing-library/dom@10.4.0
npm install --save-dev @testing-library/user-event@14.5.2
npm install --save-dev @testing-library/jest-dom@6.6.3
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/
├── tests/
│   ├── setup.js                    # Global test setup (cleanup hooks)
│   ├── helpers/
│   │   ├── dom.js                  # DOM utilities (render, query, interact)
│   │   ├── factories.js            # Data factories (createProduct, createCartItem)
│   │   ├── fixtures.js             # Static test data (sample products, users)
│   │   └── mocks/
│   │       ├── index.js            # Central export for all mocks
│   │       ├── fetch.js            # Mock fetch responses
│   │       └── localStorage.js     # Mock localStorage (if needed)
│   ├── model/                      # Model tests (phases 18-19)
│   ├── views/                      # View tests (phases 20-21)
│   └── integration/                # Integration tests (phase 22)
└── vitest.config.js                # Vitest configuration
```

### Pattern 1: Happy-DOM Environment Configuration
**What:** Configure Vitest to use Happy-DOM with globals enabled for browser APIs
**When to use:** vitest.config.js setup (required for all frontend tests)
**Example:**
```javascript
// Source: https://vitest.dev/guide/environment
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Switch from jsdom to happy-dom
    environment: 'happy-dom',

    // Enable globals (describe, it, expect, vi available without imports)
    globals: true,

    // Setup file runs before each test file
    setupFiles: ['./tests/setup.js'],

    // Test file patterns
    include: ['tests/**/*.test.js', 'js/**/*.test.js'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      include: ['js/**/*.js'],
      exclude: ['tests/**', 'dist/**', '*.config.js']
    }
  }
});
```

### Pattern 2: State Cleanup in setup.js
**What:** Global hooks that clean localStorage, DOM, and sessionStorage after each test
**When to use:** Always - prevents test pollution and ensures isolation
**Example:**
```javascript
// Source: Backend tests (backend/tests/setup.js) adapted for frontend
// tests/setup.js
import { beforeEach, afterEach } from 'vitest';

/**
 * Before each test: Clear DOM to prevent pollution
 */
beforeEach(() => {
  document.body.innerHTML = '';
  document.title = '';
});

/**
 * After each test: Clean up storage and global state
 */
afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();

  // Clear any global state (cart, user session, etc.)
  // This prevents state leakage between tests
});

// Mock window.scrollTo (no-op in tests)
window.scrollTo = vi.fn();

// Mock window.location methods to prevent navigation
delete window.location;
window.location = { assign: vi.fn(), reload: vi.fn(), replace: vi.fn() };
```

### Pattern 3: Factory Functions for Test Data
**What:** Functions that create unique, predictable test data with overrides
**When to use:** When tests need fresh data (products, cart items, users)
**Example:**
```javascript
// Source: Backend pattern (backend/tests/helpers/factories.js)
// tests/helpers/factories.js
let counter = 0;

export function resetFactoryCounter() {
  counter = 0;
}

export function createProduct(overrides = {}) {
  counter++;
  return {
    id: 1000 + counter,
    name: `Test Product ${counter}`,
    usd_price: 50 + counter,
    ils_price: (50 + counter) * 3.7,
    category: 'necklaces',
    images: [{
      desktop: `test-${counter}-desktop.jpg`,
      mobile: `test-${counter}-mobile.jpg`
    }],
    quantity: 10,
    sku: `T${counter.toString().padStart(3, '0')}`,
    available: true,
    ...overrides
  };
}

export function createCartItem(productId, quantity = 1, price = 50) {
  return { [productId]: { quantity, price } };
}

// Usage in tests:
// const product = createProduct({ name: 'Custom Name' });
// const cart = createCartItem(product.id, 2, product.usd_price);
```

### Pattern 4: Semantic DOM Queries
**What:** Use @testing-library/dom queries that match how users interact with the page
**When to use:** Always prefer semantic queries over querySelector/getElementById
**Example:**
```javascript
// Source: https://testing-library.com/docs/queries/about/
import { getByRole, getByLabelText, getByText } from '@testing-library/dom';

// GOOD: Semantic queries (accessible, resilient to markup changes)
const addToCartBtn = getByRole(document.body, 'button', { name: /add to cart/i });
const emailInput = getByLabelText(document.body, /email/i);
const heading = getByText(document.body, /product details/i);

// AVOID: Implementation-detail queries (brittle, not accessible)
const btn = document.querySelector('.add-to-cart-btn');
const input = document.getElementById('email-input');
```

**Query Priority (Testing Library recommendation):**
1. `getByRole` - Matches ARIA roles (button, link, heading, etc.)
2. `getByLabelText` - Form inputs with associated labels
3. `getByPlaceholderText` - Inputs with placeholder text
4. `getByText` - Visible text content
5. `getByTestId` - Last resort when above don't work

### Pattern 5: User Interaction Simulation
**What:** Use @testing-library/user-event for realistic user interactions
**When to use:** Testing forms, clicks, typing (not just fireEvent)
**Example:**
```javascript
// Source: https://testing-library.com/docs/user-event/intro/
import userEvent from '@testing-library/user-event';
import { getByRole, getByLabelText } from '@testing-library/dom';

it('should add product to cart when user clicks Add to Cart', async () => {
  const user = userEvent.setup();

  // Render product modal
  document.body.innerHTML = `
    <div role="dialog">
      <h2>Product Name</h2>
      <button>Add to Cart</button>
    </div>
  `;

  // User interaction (fires full event sequence: mousedown, focus, click, mouseup)
  const btn = getByRole(document.body, 'button', { name: /add to cart/i });
  await user.click(btn);

  // Assert cart was updated
  expect(localStorage.getItem('cart')).toContain('Product Name');
});

// AVOID: fireEvent (only dispatches single event, not realistic)
// fireEvent.click(btn); // Missing focus, mousedown, mouseup events
```

### Pattern 6: Fetch API Mocking
**What:** Mock fetch responses using vi.fn() for API calls
**When to use:** Testing model.js API calls without real network requests
**Example:**
```javascript
// Source: https://stevekinney.com/courses/testing/mocking-fetch-and-network-requests
import { vi, beforeEach, afterEach } from 'vitest';

let fetchMock;

beforeEach(() => {
  // Mock global fetch
  fetchMock = vi.fn();
  global.fetch = fetchMock;
});

afterEach(() => {
  vi.clearAllMocks();
});

it('should fetch products from API', async () => {
  // Setup mock response
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => [
      { id: 1, name: 'Necklace', usd_price: 50 }
    ]
  });

  // Call function that uses fetch
  const products = await model.fetchProducts();

  // Verify fetch was called correctly
  expect(fetchMock).toHaveBeenCalledWith('/api/products');
  expect(products).toHaveLength(1);
});
```

### Anti-Patterns to Avoid
- **Direct DOM manipulation in tests:** Don't manually set `document.body.innerHTML` for every test - use a `renderView()` helper that mimics production mount logic
- **Testing implementation details:** Don't assert on CSS classes, internal state variables, or DOM structure - test user-visible behavior
- **Sharing state between tests:** Don't rely on test execution order - each test must be independently runnable
- **Brittle selectors:** Don't use `querySelector('.class-name')` - use semantic queries that survive refactoring
- **Mixed cleanup timing:** Don't mix `beforeEach` and `afterEach` for same cleanup - choose one pattern consistently

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User interaction simulation | Custom `dispatchEvent` wrappers | @testing-library/user-event | Fires complete event sequences (focus, mousedown, click, mouseup), handles edge cases (disabled inputs, form validation), battle-tested across millions of projects |
| DOM queries | querySelector with data-testid | @testing-library/dom queries | Enforces accessibility (ARIA roles), survives markup refactoring, matches how users/screen readers find elements |
| Test data generation | Manual object creation in each test | Factory functions with counter | Prevents ID collisions, ensures uniqueness, supports overrides, predictable sequences when counter is reset |
| localStorage mocking | Custom mock implementation | Native localStorage.clear() | Happy-DOM provides fully functional localStorage, no mocking needed unless testing error conditions |
| Fetch mocking | Custom XMLHttpRequest wrapper | vi.fn() or MSW | vi.fn() covers 90% of cases, MSW for complex scenarios (request inspection, network-level errors), both mature and well-documented |
| Async helpers | Custom polling/waitFor | Already implemented waitForDOM | MutationObserver-based, timeout handling, better error messages than setInterval polling |

**Key insight:** Frontend testing has mature, well-tested utilities. The cost of custom solutions (maintenance, edge cases, documentation) outweighs the "not invented here" benefit. Use community standards.

## Common Pitfalls

### Pitfall 1: Happy-DOM Version Mismatch & Security
**What goes wrong:** Using Happy-DOM < 20.0 exposes CVE-2025-61927 (VM escape), but upgrading to 20.0+ breaks code that relies on JavaScript evaluation
**Why it happens:** Happy-DOM 20.0 disabled JavaScript evaluation by default for security, breaking libraries that use `eval()` or `new Function()`
**How to avoid:**
- Use Happy-DOM 20.0.11+ (security patched)
- Audit dependencies for eval usage (unlikely in vanilla JS MVC)
- If broken, enable evaluation with `happyDOM: { settings: { disableJavaScriptEvaluation: false } }` in vitest.config.js (only if necessary)
**Warning signs:** Tests fail with "JavaScript evaluation is disabled" after upgrading Happy-DOM

### Pitfall 2: localStorage Not Cleared Between Tests
**What goes wrong:** Test A sets `localStorage.setItem('cart', '[...]')`, Test B assumes empty cart but inherits Test A's data
**Why it happens:** Happy-DOM localStorage persists across tests in same file unless explicitly cleared
**How to avoid:**
- Use `afterEach(() => localStorage.clear())` in setup.js (global cleanup)
- Never rely on localStorage being empty - explicitly set state in beforeEach if needed
- Consider `beforeEach(() => localStorage.clear())` instead if tests verify cleanup behavior
**Warning signs:** Tests pass individually but fail when run together, "cart already contains X items" errors

### Pitfall 3: DOM Not Cleaned Between Tests
**What goes wrong:** Test A renders product modal, Test B queries `getByRole('dialog')` and finds Test A's modal instead
**Why it happens:** Happy-DOM doesn't auto-reset document.body between tests
**How to avoid:**
- Use `beforeEach(() => document.body.innerHTML = '')` in setup.js
- Alternative: create container `<div id="test-root"></div>`, mount views inside, remove in afterEach
- Don't rely on specific DOM state - always render what you need
**Warning signs:** "Multiple elements with role 'dialog' found", tests fail when order changes

### Pitfall 4: Event Listeners Not Cleaned Up
**What goes wrong:** Test A adds click listener to button, Test B re-renders same button, both listeners fire causing duplicate behavior
**Why it happens:** Event listeners survive DOM cleanup if references are held in closures
**How to avoid:**
- Design View classes with `destroy()` method that removes listeners (`element.removeEventListener`)
- Call view.destroy() in afterEach if views are instantiated
- Use `{ once: true }` option for single-fire listeners: `btn.addEventListener('click', handler, { once: true })`
- Alternatively: rely on `document.body.innerHTML = ''` which removes elements and orphans listeners (garbage collected)
**Warning signs:** Handlers fire multiple times, "handler called 3 times, expected 1"

### Pitfall 5: Async Timing Issues
**What goes wrong:** Test clicks button, immediately checks DOM, but async model.addToCart() hasn't updated cart yet
**Why it happens:** View methods may be async (fetch API calls), tests must wait for promises to resolve
**How to avoid:**
- Make test async: `it('should add to cart', async () => { ... })`
- Await user interactions: `await user.click(btn)`
- Use waitForDOM for async DOM updates: `await waitForDOM('.cart-count')`
- Never use arbitrary `setTimeout(100)` - fragile and slow
**Warning signs:** Tests pass locally but fail in CI (slower environment), intermittent failures

### Pitfall 6: Testing Implementation Details
**What goes wrong:** Test asserts `cart.items.length === 1` (internal state) instead of "cart badge shows '1'"
**Why it happens:** Unit test mindset (test the code) instead of user mindset (test the behavior)
**How to avoid:**
- Ask: "What does the user see/experience?" not "What did the code do?"
- Test outcomes (DOM changes, network calls, storage updates) not intermediate steps
- Use semantic queries (getByRole, getByText) not implementation queries (querySelector('.cart-badge'))
- If you can't test without accessing private state, the code may need refactoring
**Warning signs:** Tests break on refactoring (renaming variables, restructuring code), brittle tests

### Pitfall 7: Globals Not Mocked
**What goes wrong:** Test calls window.scrollTo(), Happy-DOM throws "not implemented" error
**Why it happens:** Happy-DOM provides most browser APIs but some are stubs or missing
**How to avoid:**
- Mock globals in setup.js: `window.scrollTo = vi.fn()`
- Mock window.location methods (assign, reload, replace) to prevent navigation
- Mock window.alert, window.confirm if used (return default values)
- Check Happy-DOM docs for missing APIs, add mocks as needed
**Warning signs:** "window.X is not a function", tests error on browser API calls

## Code Examples

Verified patterns from official sources:

### DOM Rendering Helper
```javascript
// Source: Adapted from backend pattern (tests/helpers/dom.js already exists)
// tests/helpers/dom.js
import { getQueriesForElement } from '@testing-library/dom';

/**
 * Renders HTML into document.body and returns Testing Library queries bound to body
 */
export function render(html) {
  document.body.innerHTML = html;
  return getQueriesForElement(document.body);
}

/**
 * Mounts a View instance into the DOM (for MVC View testing)
 */
export function mountView(ViewClass, ...args) {
  const view = new ViewClass(...args);
  view.render();
  return {
    view,
    queries: getQueriesForElement(document.body),
    unmount: () => {
      if (view.destroy) view.destroy();
      document.body.innerHTML = '';
    }
  };
}

// Usage:
// const { view, queries, unmount } = mountView(ProductModalView, productData);
// const heading = queries.getByRole('heading', { name: /product details/i });
// unmount(); // Cleanup
```

### Factory with Reset Counter
```javascript
// Source: Backend pattern (backend/tests/helpers/factories.js)
// tests/helpers/factories.js
let counter = 0;

export function resetFactoryCounter() {
  counter = 0;
}

export function createProduct(overrides = {}) {
  counter++;
  return {
    id: 1000 + counter,
    name: `Test Product ${counter}`,
    description: `Description ${counter}`,
    usd_price: 50 + counter,
    ils_price: (50 + counter) * 3.7,
    category: 'necklaces',
    images: [
      {
        desktop: `products/test-${counter}-desktop.jpg`,
        mobile: `products/test-${counter}-mobile.jpg`
      }
    ],
    quantity: 10,
    sku: `T${counter.toString().padStart(3, '0')}`,
    available: true,
    ...overrides
  };
}

export function createProducts(count, commonOverrides = {}) {
  return Array.from({ length: count }, () => createProduct(commonOverrides));
}

// In beforeEach: resetFactoryCounter() for predictable sequences
```

### User Interaction Test
```javascript
// Source: https://testing-library.com/docs/user-event/intro/
import userEvent from '@testing-library/user-event';
import { render } from './helpers/dom.js';

it('should update cart badge when Add to Cart is clicked', async () => {
  const user = userEvent.setup();

  const { getByRole, getByText } = render(`
    <div>
      <button>Add to Cart</button>
      <span class="cart-badge" aria-label="Cart items">0</span>
    </div>
  `);

  const addBtn = getByRole('button', { name: /add to cart/i });
  await user.click(addBtn);

  const badge = getByText('1');
  expect(badge).toBeInTheDocument();
});
```

### Fetch Mocking Pattern
```javascript
// Source: https://stevekinney.com/courses/testing/mocking-fetch-and-network-requests
import { vi, beforeEach, afterEach } from 'vitest';
import * as model from '../js/model.js';

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  global.fetch = fetchMock;
});

afterEach(() => {
  vi.clearAllMocks();
});

it('should fetch products from API', async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => [
      { id: 1, name: 'Gold Necklace', usd_price: 50, ils_price: 185 }
    ]
  });

  const products = await model.fetchProducts();

  expect(fetchMock).toHaveBeenCalledWith('/api/products');
  expect(products).toHaveLength(1);
  expect(products[0].name).toBe('Gold Necklace');
});
```

### Complete Test File Example
```javascript
// Source: Combined patterns from research
// tests/model/cart.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createProduct, resetFactoryCounter } from '../helpers/factories.js';
import * as model from '../../js/model.js';

describe('Model: Cart Management', () => {
  beforeEach(() => {
    localStorage.clear();
    resetFactoryCounter();
  });

  it('should add product to cart and persist to localStorage', () => {
    const product = createProduct({ id: 1, usd_price: 50 });

    model.addToCart(product, 2);

    const cart = JSON.parse(localStorage.getItem('cart'));
    expect(cart).toHaveLength(1);
    expect(cart[0].id).toBe(1);
    expect(cart[0].quantity).toBe(2);
  });

  it('should increase quantity if product already in cart', () => {
    const product = createProduct({ id: 1 });

    model.addToCart(product, 1);
    model.addToCart(product, 2);

    const cart = JSON.parse(localStorage.getItem('cart'));
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(3);
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jsdom | Happy-DOM | 2025-2026 | 2-3x performance improvement for large test suites, trade-off: some browser APIs not fully implemented (layout, CSS calculations) |
| fireEvent (single event dispatch) | @testing-library/user-event | 2021-present | Realistic user interactions (full event sequences), catches bugs that fireEvent misses (focus, keyboard, form validation) |
| Custom test utilities | @testing-library/dom | 2018-present | Industry standard semantic queries, enforces accessibility, survives refactoring |
| Manual mock objects | Factory functions with counter | Established pattern | Prevents ID collisions, predictable sequences, supports overrides, reduces boilerplate |
| Jest | Vitest | 2021-present | Vite-native, instant HMR-based test execution, ESM-first, same API as Jest (easy migration) |
| MSW v1 API | MSW v2 API | Nov 2024 | Breaking changes in handler syntax, improved TypeScript support, better error messages |

**Deprecated/outdated:**
- **jsdom for Vitest:** Happy-DOM is now recommended for Vitest due to performance and Vite integration
- **fireEvent for user interactions:** Use @testing-library/user-event instead (more realistic event sequences)
- **testing-library/react for vanilla JS:** Use @testing-library/dom directly (no React overhead)
- **Jest for Vite projects:** Vitest offers better Vite integration, faster startup, instant HMR

## Open Questions

Things that couldn't be fully resolved:

1. **Happy-DOM 20.0.11 vs latest version (20.0.x)**
   - What we know: v20.0.11 is security-patched (CVE-2025-61927), stable with Vitest 4.0.18
   - What's unclear: Whether newer 20.0.x versions (if any) introduce additional breaking changes
   - Recommendation: Start with 20.0.11, monitor Happy-DOM releases, upgrade conservatively (test suite will catch regressions)

2. **MSW vs vi.fn() for fetch mocking**
   - What we know: vi.fn() is simpler (less setup), MSW is more powerful (network-level interception, request inspection)
   - What's unclear: Vanilla JS MVC needs - does model.js require complex network mocking? Are there edge cases vi.fn() can't handle?
   - Recommendation: Start with vi.fn() in setup.js (global fetch mock), add MSW only if needed (e.g., testing network errors, request retries, concurrent requests)

3. **View lifecycle and cleanup**
   - What we know: View classes likely add event listeners, may hold DOM references
   - What's unclear: Do View classes already have destroy() methods? Is there a consistent mount/unmount pattern?
   - Recommendation: Inspect View.js base class and page-specific views, add destroy() method if missing (removeEventListener, clear references), call in afterEach

4. **Coverage thresholds for frontend**
   - What we know: Backend has no coverage thresholds yet (commented in vitest.config.js), v1.2 took risk-based approach (critical paths first)
   - What's unclear: What's realistic coverage for vanilla JS MVC? Should thresholds differ by file type (Model: 80%, View: 60%, Controller: 70%)?
   - Recommendation: Start with no thresholds (like backend), establish baseline coverage after phases 18-22, set incremental thresholds (e.g., 60% lines, 50% branches) in v1.4+

5. **Test organization for MVC**
   - What we know: Model tests go in tests/model/, View tests in tests/views/, but what about controller.js (router)?
   - What's unclear: Should controller routing be tested in isolation (unit) or through integration tests? Does it make sense to test "navigate to /cart" separately from "CartView renders correctly"?
   - Recommendation: Start with model tests (phase 18-19), defer controller testing to integration phase (22), reassess after View tests (20-21) reveal controller coupling

## Sources

### Primary (HIGH confidence)
- [Vitest Test Environment Guide](https://vitest.dev/guide/environment) - Happy-DOM configuration
- [Testing Library DOM Queries](https://testing-library.com/docs/queries/about/) - Semantic query patterns
- [Testing Library user-event Introduction](https://testing-library.com/docs/user-event/intro/) - User interaction simulation
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking) - Fetch mocking patterns
- [Happy-DOM Setup as Test Environment](https://github.com/capricorn86/happy-dom/wiki/Setup-as-Test-Environment) - Official setup docs
- Backend tests (C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\tests\) - Established factory/fixture patterns

### Secondary (MEDIUM confidence)
- [jsdom vs happy-dom: Navigating the Nuances of JavaScript Testing](https://blog.seancoughlin.me/jsdom-vs-happy-dom-navigating-the-nuances-of-javascript-testing) - Performance comparison
- [Vitest Discussion #1607: jsdom vs happy-dom](https://github.com/vitest-dev/vitest/discussions/1607) - Community consensus on trade-offs
- [Steve Kinney: Mocking Fetch And Network Requests](https://stevekinney.com/courses/testing/mocking-fetch-and-network-requests) - Fetch mocking patterns
- [Steve Kinney: Using Testing Library](https://stevekinney.com/courses/testing/testing-library) - Semantic query patterns
- [How to Build Testing Workflows with GitHub Actions (2026-01-26)](https://oneuptime.com/blog/post/2026-01-26-testing-workflows-github-actions/view) - CI/CD patterns
- [How to Generate Code Coverage Reports with GitHub Actions (2026-01-27)](https://oneuptime.com/blog/post/2026-01-27-code-coverage-reports-github-actions/view) - Coverage workflows

### Tertiary (LOW confidence - marked for validation)
- [Happy DOM CVE-2025-61927 Security Advisory](https://gbhackers.com/happy-dom-flaw-affecting-2-7-million-users/) - VM escape vulnerability (verify with official GitHub Security Advisory)
- [MSW Quick Start](https://mswjs.io/docs/quick-start/) - MSW v2 setup (if needed, verify API changes from Nov 2024)
- [Vitest in 2026: The New Standard](https://jeffbruchado.com.br/en/blog/vitest-2026-standard-modern-javascript-testing) - General Vitest trends (WebSearch only, verify claims)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vitest 4.0.18 already used (v1.2), Happy-DOM widely adopted, @testing-library/dom is industry standard
- Architecture: HIGH - Patterns verified with official docs (Vitest, Testing Library), backend tests provide proven template
- Pitfalls: MEDIUM - Based on community discussions (GitHub issues, blog posts), some project-specific (View lifecycle), will be validated in phases 18-22

**Research date:** 2026-02-08
**Valid until:** ~30 days (stable stack, unlikely to change rapidly)
