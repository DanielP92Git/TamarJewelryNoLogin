# Stack Research: Frontend Testing

**Domain:** Vanilla JS MVC Frontend Testing
**Researched:** 2026-02-06
**Confidence:** HIGH

## Executive Summary

Your backend already has Vitest 4.0.18+ configured with robust test infrastructure. For frontend testing, you need minimal additional tooling. The key decision is switching from jsdom to happy-dom for better performance, plus adding @testing-library/dom for user-centric DOM queries. Avoid over-tooling with framework-specific libraries (you don't need React Testing Library or @testing-library/user-event).

**Philosophy:** Test vanilla JS MVC the same way users interact with it - find elements by text/labels/roles, trigger native DOM events, verify DOM state and localStorage persistence.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vitest | 4.0.18+ | Test runner and assertion library | Already installed. Fast, modern, native ESM support. Vitest 4.0 released in late 2025. |
| Happy-DOM | 15.0.0+ | Lightweight DOM simulation | **Switch from jsdom**. 2-3x faster than jsdom for large test suites, sufficient API coverage for vanilla JS testing. Latest version 20.0.11 (published Jan 2026). |
| @testing-library/dom | 10.4.1+ | DOM query utilities for user-centric tests | Find elements the way users do (by text, label, role). Framework-agnostic, works perfectly with vanilla JS. Latest 10.4.1 (published Aug 2025). |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitest/coverage-v8 | 4.0.18+ | Code coverage reporting | Already installed. Use for coverage metrics. |
| @vitest/ui | 4.0.18+ | Visual test dashboard | **Optional but recommended**. Beautiful UI for watching tests during development. |
| MSW (Mock Service Worker) | 2.12.8+ | HTTP request mocking at network level | **When testing API integration**. More realistic than fetch mocks. Latest 2.12.8 (published Feb 2026). |
| vitest-fetch-mock | 0.3.0+ | Simple fetch() mocking | **Alternative to MSW** for simpler cases. Use when you just need to mock a few fetch calls without full MSW setup. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest Watch Mode | Auto-rerun tests on file changes | `npm run test:watch` - already configured |
| Vitest UI | Interactive test dashboard | `vitest --ui` - requires @vitest/ui installation |
| Coverage Reports | HTML coverage visualization | `npm run test:coverage` - already configured |

## Installation

```bash
# Switch DOM environment (already have jsdom 28.0.0, replace with happy-dom)
npm uninstall jsdom
npm install -D happy-dom@^20.0.0

# Add DOM testing utilities
npm install -D @testing-library/dom@^10.4.1

# Optional: Add UI dashboard for better DX
npm install -D @vitest/ui@^4.0.18

# Optional: Add HTTP mocking (choose ONE)
# Option A: MSW (more realistic, reusable across tools)
npm install -D msw@^2.12.8

# Option B: vitest-fetch-mock (simpler, Vitest-specific)
npm install -D vitest-fetch-mock@^0.3.0
```

## Configuration Changes Required

### 1. Update frontend/vitest.config.js

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // CHANGE: Switch from jsdom to happy-dom
    environment: 'happy-dom',  // was: 'jsdom'

    // Test file patterns (unchanged)
    include: [
      'tests/**/*.test.js',
      'js/**/*.test.js'
    ],

    // Setup file to run before each test (unchanged)
    setupFiles: ['./tests/setup.js'],

    // Enable globals (unchanged)
    globals: true,

    // Timeout (unchanged)
    testTimeout: 10000,

    // Exclude (unchanged)
    exclude: [
      'node_modules/**',
      '.parcel-cache/**',
      'dist/**',
    ],

    // Coverage configuration (unchanged)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['js/**/*.js'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'coverage/**',
        'dist/**',
        '.parcel-cache/**',
        '*.config.js',
        '**/*.test.js',
        '**/postbuild.js'
      ],
    }
  }
});
```

### 2. Update frontend/tests/setup.js (if using MSW)

If you choose MSW for HTTP mocking, add server setup:

```javascript
import { beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';

// Import your MSW handlers
import { handlers } from './mocks/handlers.js';

// Setup MSW server
export const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers after each test to prevent leakage
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());

// ... rest of existing setup.js code
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Happy-DOM | jsdom | If you need complete browser API compliance (rare). jsdom is more complete but 2-3x slower. Your current frontend/vitest.config.js uses jsdom. |
| @testing-library/dom | Direct DOM manipulation | Never. Testing Library queries (getByRole, getByText) make tests more maintainable and user-centric. |
| MSW | vitest-fetch-mock | Use vitest-fetch-mock if you only need to mock 1-2 simple fetch calls. Use MSW if you need realistic HTTP mocking, reusable handlers, or plan to use mocks in Storybook/dev mode later. |
| Native DOM events | @testing-library/user-event | You don't need user-event for vanilla JS. It's designed for React/framework integration. Use native `element.click()`, `element.dispatchEvent()` etc. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| @testing-library/react | Framework-specific for React. You have vanilla JS. | @testing-library/dom |
| @testing-library/user-event | Designed for framework integration, unnecessary complexity for vanilla JS. Recent issues with Vitest compatibility. | Native DOM events (element.click(), new KeyboardEvent(), etc.) |
| vitest-localstorage-mock | Unnecessary - both jsdom and happy-dom provide working localStorage implementations. | Native localStorage (already available in test environment) |
| Jest | Slower than Vitest, requires additional Babel config for ESM. You already have Vitest. | Vitest (already installed) |
| Enzyme | React-specific, deprecated. | N/A (you have vanilla JS) |

## Stack Patterns by Use Case

### For Unit Testing Model.js (Data Layer)

**Tools needed:**
- Vitest + Happy-DOM
- MSW or vitest-fetch-mock (for API calls)
- Native localStorage (already in environment)

**Pattern:**
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import * as model from '../js/model.js';

describe('Cart State Management', () => {
  beforeEach(() => {
    localStorage.clear();
    model.cart.length = 0; // Reset cart array
  });

  it('syncs cart to localStorage when items added', () => {
    model.addToCart({ id: 1, name: 'Ring', price: 100 });
    const stored = JSON.parse(localStorage.getItem('cart'));
    expect(stored).toEqual([{ id: 1, name: 'Ring', price: 100 }]);
  });
});
```

### For Testing View.js (Base View Class)

**Tools needed:**
- Vitest + Happy-DOM
- @testing-library/dom (for queries)
- Native DOM events

**Pattern:**
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/dom';
import View from '../js/View.js';

describe('Currency Selector Persistence', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <select class="header-currency-selector" name="currency">
        <option value="usd">USD</option>
        <option value="ils">ILS</option>
      </select>
    `;
  });

  it('persists currency selection to localStorage', () => {
    const selector = screen.getByRole('combobox', { name: /currency/i });
    selector.value = 'ils';
    selector.dispatchEvent(new Event('change'));

    expect(localStorage.getItem('currency')).toBe('ils');
  });
});
```

### For Testing Page-Specific Views (e.g., cartView)

**Tools needed:**
- Vitest + Happy-DOM
- @testing-library/dom
- MSW (for checkout API calls)

**Pattern:**
```javascript
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/dom';
import CartView from '../js/Views/cartView.js';

describe('Cart View Rendering', () => {
  it('displays cart items with correct prices in selected currency', () => {
    localStorage.setItem('currency', 'ils');
    const cartView = new CartView();
    cartView.render([
      { id: 1, name: 'Ring', priceUSD: 100, priceILS: 370 }
    ]);

    const item = screen.getByText('Ring');
    const price = within(item.closest('.cart-item')).getByText(/370/);
    expect(price).toBeInTheDocument();
  });
});
```

### For Testing RTL (Right-to-Left) Layouts

**Tools needed:**
- Vitest + Happy-DOM
- @testing-library/dom

**Pattern:**
```javascript
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/dom';
import View from '../js/View.js';

describe('Hebrew RTL Layout', () => {
  it('applies RTL class when Hebrew language selected', () => {
    localStorage.setItem('language', 'heb');
    const view = new View();
    view.initLanguage();

    expect(document.body).toHaveClass('rtl');
    // Or: expect(document.dir).toBe('rtl');
  });
});
```

### For Testing MVC Integration (Controller Routing)

**Tools needed:**
- Vitest + Happy-DOM
- @testing-library/dom
- MSW (if testing routes that fetch data)

**Pattern:**
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/dom';
import * as controller from '../js/controller.js';

describe('Router Navigation', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('renders cart view when navigating to /cart', async () => {
    await controller.navigate('/cart');
    expect(screen.getByRole('heading', { name: /cart/i })).toBeInTheDocument();
  });
});
```

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Vitest 4.0.18 | Happy-DOM 20.0.11 | ✅ Fully compatible. Happy-DOM updated for Node v25 Web Storage API changes. |
| Vitest 4.0.18 | @testing-library/dom 10.4.1 | ✅ Fully compatible. Works with any DOM environment. |
| @testing-library/dom 10.4.1 | Happy-DOM 20.0.11 | ✅ Fully compatible. Testing Library works with any DOM implementation. |
| MSW 2.12.8 | Vitest 4.0.18 | ✅ Fully compatible. MSW 2.0 has Fetch API native support. |
| MSW 2.12.8 | Happy-DOM 20.0.11 | ✅ Compatible. MSW intercepts at network level, independent of DOM environment. |
| vitest-fetch-mock 0.3.0+ | Vitest 4.0.18 | ✅ Supports Vitest 2.0+, works with Vitest 4.0. |
| Parcel 2.14.4 | Vitest 4.0.18 | ⚠️ No native integration. Parcel handles bundling/dev server, Vitest handles testing separately. This is fine - they don't need to integrate. |

**Important compatibility note:**
- Node v25.0.0 enabled Web Storage API by default with different behavior than browsers. Happy-DOM 20.0.11 has been updated to handle this correctly.
- If you see localStorage issues, ensure you're on Happy-DOM 15.0.0+ or downgrade Node to v22.

## Migration Path from Current Setup

Your frontend currently uses:
- ✅ Vitest 4.0.18 (keep)
- ✅ @vitest/coverage-v8 4.0.18 (keep)
- ❌ jsdom 28.0.0 (replace with happy-dom)
- ❌ @testing-library/jest-dom 5.17.0 (review if needed - provides custom matchers like toBeInTheDocument())
- ❌ @testing-library/user-event 13.5.0 (remove - not needed for vanilla JS)

**Step-by-step migration:**

1. **Install new packages:**
   ```bash
   npm install -D happy-dom@^20.0.0 @testing-library/dom@^10.4.1
   ```

2. **Update vitest.config.js:**
   Change `environment: 'jsdom'` to `environment: 'happy-dom'`

3. **Review @testing-library/jest-dom:**
   - This provides custom matchers like `toBeInTheDocument()`, `toHaveClass()`, etc.
   - If your tests use these, keep it: `npm install -D @testing-library/jest-dom@^6.6.3` (update to latest)
   - Import in setup.js: `import '@testing-library/jest-dom/vitest'`
   - If you prefer native Vitest assertions, remove it

4. **Remove unused packages:**
   ```bash
   npm uninstall jsdom @testing-library/user-event
   ```

5. **Run tests to verify:**
   ```bash
   npm test
   ```

## HTTP Mocking: MSW vs vitest-fetch-mock Decision Matrix

| Criterion | MSW | vitest-fetch-mock |
|-----------|-----|-------------------|
| **Setup complexity** | Medium (need handlers file) | Low (inline mocks) |
| **Reusability** | High (handlers work in Storybook, dev mode) | Low (Vitest-only) |
| **Realism** | High (intercepts at network level) | Medium (mocks fetch function) |
| **Learning curve** | Medium (new API) | Low (simple mock syntax) |
| **Best for** | Complex API testing, multiple endpoints | Simple fetch mocking, 1-2 endpoints |

**Recommendation for your project:**

Start with **vitest-fetch-mock** for initial testing. Your backend API is relatively simple (product fetching, cart operations, checkout). If you later need:
- Storybook integration
- Development mode API mocking
- Complex GraphQL mocking

Then migrate to MSW.

## Testing localStorage: No Additional Library Needed

**Why no vitest-localstorage-mock:**

Both jsdom and happy-dom provide working localStorage implementations out of the box. Your current `tests/setup.js` already clears localStorage in `afterEach`, which is all you need.

**Testing pattern:**

```javascript
// Write to localStorage
localStorage.setItem('cart', JSON.stringify([{ id: 1 }]));

// Read from localStorage
const cart = JSON.parse(localStorage.getItem('cart'));
expect(cart).toEqual([{ id: 1 }]);

// Verify it was called (if needed)
import { vi } from 'vitest';
const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
// ... trigger code that writes to localStorage
expect(setItemSpy).toHaveBeenCalledWith('cart', expect.any(String));
```

## Common Pitfalls to Avoid

### 1. Don't test implementation details

**Bad:**
```javascript
// Testing internal class methods
expect(view._parseData()).toBe(...)
```

**Good:**
```javascript
// Testing visible behavior
expect(screen.getByText('Product Name')).toBeInTheDocument();
```

### 2. Don't use test IDs unnecessarily

**Bad:**
```javascript
<div data-testid="cart-item">...</div>
const item = screen.getByTestId('cart-item');
```

**Good:**
```javascript
const item = screen.getByRole('listitem');
// Or: screen.getByText('Ring - $100')
```

Use test IDs only when semantic queries are impossible (rare).

### 3. Don't forget to clean up between tests

Your `tests/setup.js` already does this:
- ✅ `document.body.innerHTML = ''` (clears DOM)
- ✅ `localStorage.clear()` (clears storage)
- ✅ `sessionStorage.clear()` (clears session)

Make sure new tests don't pollute global state.

### 4. Don't mock what you don't need to

**Avoid over-mocking:**
- ❌ Don't mock localStorage (it works in test environment)
- ❌ Don't mock window.scrollTo (already mocked in setup.js)
- ❌ Don't mock DOM APIs (happy-dom provides them)

**Do mock external dependencies:**
- ✅ Fetch/API calls (use MSW or vitest-fetch-mock)
- ✅ Payment SDKs (PayPal, Stripe)
- ✅ EmailJS
- ✅ Third-party scripts (Clarity analytics)

## Sources

Research conducted February 6, 2026:

### Performance Comparisons
- [jsdom vs happy-dom discussion - Vitest GitHub](https://github.com/vitest-dev/vitest/discussions/1607)
- [jsdom vs happy-dom: Navigating the Nuances](https://blog.seancoughlin.me/jsdom-vs-happy-dom-navigating-the-nuances-of-javascript-testing)
- [Performance of happy-dom in tests - GitHub Discussion](https://github.com/capricorn86/happy-dom/discussions/1438)

### Testing Library Documentation
- [DOM Testing Library - GitHub](https://github.com/testing-library/dom-testing-library)
- [@testing-library/dom - npm](https://www.npmjs.com/package/@testing-library/dom)
- [How to Unit Test HTML and Vanilla JavaScript - DEV](https://dev.to/thawkin3/how-to-unit-test-html-and-vanilla-javascript-without-a-ui-framework-4io)

### localStorage Testing
- [How to mock and spy on local storage in vitest](https://dylanbritz.dev/writing/mocking-local-storage-vitest/)
- [How to Test LocalStorage with Vitest](https://runthatline.com/vitest-mock-localstorage/)
- [Testing Local Storage - Steve Kinney](https://stevekinney.com/courses/testing/testing-local-storage)

### HTTP Mocking
- [Mock Service Worker - Official Docs](https://mswjs.io/)
- [Using Mock Service Worker With Vitest - Steve Kinney](https://stevekinney.com/courses/testing/testing-with-mock-service-worker)
- [vitest-fetch-mock - npm](https://www.npmjs.com/package/vitest-fetch-mock)
- [How to Mock Fetch API in Vitest](https://runthatline.com/how-to-mock-fetch-api-with-vitest/)

### Current Package Versions (verified Feb 2026)
- [happy-dom - npm](https://www.npmjs.com/package/happy-dom) - v20.0.11
- [msw - npm](https://www.npmjs.com/package/msw) - v2.12.8
- [@testing-library/dom - npm](https://www.npmjs.com/package/@testing-library/dom) - v10.4.1
- [@testing-library/user-event - npm](https://www.npmjs.com/package/@testing-library/user-event) - v14.6.1

### Vanilla JS MVC Testing Patterns
- [The MVC Design Pattern in Vanilla JavaScript - SitePoint](https://www.sitepoint.com/mvc-design-pattern-javascript/)
- [Classic Front End MVC with Vanilla Javascript - Medium](https://medium.com/@patrickackerman/classic-front-end-mvc-with-vanilla-javascript-7eee550bc702)

### Vitest Documentation
- [Vitest UI - Guide](https://vitest.dev/guide/ui)
- [@vitest/ui - npm](https://www.npmjs.com/package/@vitest/ui)
- [Vitest Environment Guide](https://vitest.dev/guide/environment)

---
*Stack research for: Vanilla JS MVC Frontend Testing*
*Researched: 2026-02-06*
*Confidence: HIGH - All package versions verified from npm/official sources*
