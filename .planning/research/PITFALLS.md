# Pitfalls Research

**Domain:** Frontend Testing for Vanilla JavaScript MVC E-commerce Application
**Researched:** 2026-02-06
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: localStorage State Pollution Between Tests

**What goes wrong:**
Tests share localStorage state across test runs, causing false positives/negatives. Cart data from one test affects subsequent tests. Language/currency preferences leak between tests. Storage quota errors when accumulated data exceeds limits.

**Why it happens:**
Vitest's jsdom environment doesn't automatically clear localStorage between tests. Developers assume test isolation but localStorage persists across `describe` blocks. Setting up mocks without clearing previous state compounds the problem.

**How to avoid:**
```javascript
// In setup.js or beforeEach hooks
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

// For specific tests needing clean state
afterEach(() => {
  localStorage.removeItem('cart');
  localStorage.removeItem('language');
  localStorage.removeItem('currency');
  localStorage.removeItem('auth-token');
});

// Mock localStorage with spy to verify calls
vi.spyOn(Storage.prototype, 'setItem');
vi.spyOn(Storage.prototype, 'getItem');
```

**Warning signs:**
- Tests pass in isolation but fail when run together
- Flaky tests that pass/fail randomly
- Cart count tests show unexpected values
- Language/currency tests interfere with each other
- Error: "QuotaExceededError: localStorage is full"

**Phase to address:**
Base View Tests (Phase 1) - Establish clean localStorage patterns early before cart and locale testing compounds the issue.

---

### Pitfall 2: querySelector Fragility with Dynamic DOM

**What goes wrong:**
Tests break when CSS classes or DOM structure changes. querySelector returns null before async rendering completes. View-specific selectors (`.cart-number-mobile`, `.header-utilities`) become brittle. Hebrew vs English DOM differences cause selector mismatches.

**Why it happens:**
View.js dynamically rewrites menu/header/footer HTML on language change. Tests using direct querySelector don't wait for async DOM updates. Selectors couple tightly to CSS implementation details. RTL layout changes modify DOM structure for Hebrew.

**How to avoid:**
```javascript
// BAD: Direct querySelector without waiting
const cartBtn = document.querySelector('.add-to-cart-btn');
expect(cartBtn).toBeTruthy();

// GOOD: Use vi.waitFor with polling
await vi.waitFor(() => {
  const cartBtn = document.querySelector('.add-to-cart-btn');
  expect(cartBtn).toBeTruthy();
  return cartBtn;
}, { timeout: 3000, interval: 100 });

// BETTER: Use semantic attributes
<button data-testid="add-to-cart" class="add-to-cart-btn">
await vi.waitFor(() => {
  return document.querySelector('[data-testid="add-to-cart"]');
});

// BEST: Query by role or text (less brittle)
const cartBtn = await vi.waitFor(() => {
  return document.querySelector('button[aria-label="Add to cart"]');
});
```

**Warning signs:**
- Tests fail with "Cannot read property of null"
- Works in one language but fails in Hebrew
- Passes when running single test, fails in suite
- Breaks after CSS refactoring despite logic unchanged

**Phase to address:**
Base View Tests (Phase 1) - Establish robust query patterns before page-specific views multiply the problem.

---

### Pitfall 3: Event Listener Memory Leaks in View Tests

**What goes wrong:**
Event listeners accumulate across tests causing MaxListenersExceededWarning. Tests slow down progressively as suite runs. Menu toggle listeners stack up (mobile view adds new listener each time). Currency change listeners persist after view cleanup.

**Why it happens:**
View.js uses event delegation on `document` but tests don't clean up. `setLanguage()` called multiple times adds duplicate listeners (lines 806-830 in View.js). Tests instantiate views without corresponding teardown. cloneNode technique (lines 161-166, 401-406) prevents cleanup but multiplies handlers.

**How to avoid:**
```javascript
// Store listener references for cleanup
let currencyChangeHandler;
let languageChangeHandler;

beforeEach(() => {
  // Setup with tracked references
  currencyChangeHandler = vi.fn();
  document.addEventListener('change', currencyChangeHandler);
});

afterEach(() => {
  // Always cleanup listeners
  document.removeEventListener('change', currencyChangeHandler);
  document.removeEventListener('click', languageChangeHandler);

  // Clear any view-added listeners by replacing elements
  const menu = document.querySelector('.menu');
  if (menu) {
    const newMenu = menu.cloneNode(true);
    menu.replaceWith(newMenu);
  }
});

// For testing View.js specifically
afterEach(() => {
  // Remove delegation listeners
  const oldDoc = document.cloneNode(true);
  // Reset global state flags
  delete window.__currencyPersistenceInitialized;
});
```

**Warning signs:**
- Console warning: "MaxListenersExceededWarning: Possible EventEmitter memory leak"
- Test suite runs slower with each added test
- Memory usage grows during test execution
- Events fire multiple times from single action

**Phase to address:**
Base View Tests (Phase 1) - Critical to establish cleanup patterns before cart/locale tests add more listeners.

---

### Pitfall 4: Async API Race Conditions in Model Tests

**What goes wrong:**
Tests assert before `fetch` completes. Multiple API calls resolve in unpredictable order. Cart update from localStorage races with server sync. Exchange rate fetch races with currency display. Payment intent creation races with order capture.

**Why it happens:**
model.js mixes localStorage (sync) with API calls (async) without coordination. No loading state between currency change and rate fetch. `handleAddToCart` doesn't await API response before UI update. Tests mock fetch but don't control timing.

**How to avoid:**
```javascript
// BAD: Race between localStorage and API
export const handleAddToCart = function (data) {
  if (!localStorage.getItem('auth-token')) {
    addToLocalStorage(data); // sync
  } else {
    addToUserStorage(data); // async, no await!
  }
};

// GOOD: Control timing in tests
it('syncs cart after adding item', async () => {
  const mockFetch = vi.fn(() =>
    Promise.resolve({ json: () => Promise.resolve({ success: true }) })
  );
  global.fetch = mockFetch;

  await model.handleAddToCart(mockData);
  await vi.waitFor(() => {
    expect(mockFetch).toHaveBeenCalled();
  });
});

// BETTER: Test with controlled promise resolution
it('handles concurrent cart updates correctly', async () => {
  let resolveFirst, resolveSecond;
  const firstPromise = new Promise(r => resolveFirst = r);
  const secondPromise = new Promise(r => resolveSecond = r);

  global.fetch = vi.fn()
    .mockReturnValueOnce(firstPromise)
    .mockReturnValueOnce(secondPromise);

  const call1 = model.addToUserStorage(data1);
  const call2 = model.addToUserStorage(data2);

  // Resolve in reverse order to test race
  resolveSecond({ json: () => ({ success: true }) });
  resolveFirst({ json: () => ({ success: true }) });

  await Promise.all([call1, call2]);
  // Assert final state is correct despite timing
});
```

**Warning signs:**
- Tests flaky when run with `--reporter=verbose`
- Pass with added `setTimeout`, fail without
- Different results on fast vs slow machines
- Occasional "unhandled promise rejection" errors

**Phase to address:**
Cart State Tests (Phase 3) - Addresses concurrent cart updates, localStorage/API sync races.

---

### Pitfall 5: Currency Conversion Floating-Point Errors

**What goes wrong:**
Cart totals don't match sum of items due to rounding. $17.95 becomes 17.950000000000002 in tests. Currency conversion (USD→ILS) accumulates precision errors. Test assertions fail on exact equality: `expect(total).toBe(17.95)` fails with 17.950000000000003.

**Why it happens:**
JavaScript uses IEEE 754 double-precision floats. Multiple conversions (original price → discount → currency → total) compound errors. `Math.round()` on floats doesn't prevent accumulation (model.js line 362). Tests compare with `toBe()` instead of approximate equality.

**How to avoid:**
```javascript
// BAD: Direct float comparison
const total = cart.reduce((sum, item) => sum + item.price * item.amount, 0);
expect(total).toBe(17.95); // FAILS: 17.950000000000003

// GOOD: Use cents for calculations
const totalCents = cart.reduce((sum, item) =>
  sum + Math.round(item.price * 100) * item.amount, 0
);
expect(totalCents / 100).toBeCloseTo(17.95, 2);

// BETTER: Test with epsilon tolerance
expect(total).toBeCloseTo(17.95, 2); // Allows ±0.01 variance

// BEST: Store prices as integers (cents) in cart
const itemData = {
  priceCents: Math.round(price * 100), // 1795 instead of 17.95
  currency: 'usd'
};
// Convert for display only
const displayPrice = (item.priceCents / 100).toFixed(2);

// For currency conversion tests
it('converts USD to ILS without precision loss', () => {
  const usdCents = 1995; // $19.95
  const rate = 3.67;
  const ilsCents = Math.round(usdCents * rate); // 7322 = ₪73.22

  expect(ilsCents / 100).toBeCloseTo(73.22, 2);
});
```

**Warning signs:**
- Cart total tests fail intermittently
- Errors like "Expected: 17.95, Received: 17.950000000000003"
- Currency conversion off by 0.01
- Sum of items ≠ total in test output

**Phase to address:**
Cart State Tests (Phase 3) - Critical for multi-currency cart calculations and checkout totals.

---

### Pitfall 6: RTL Layout Testing Without Proper Direction Context

**What goes wrong:**
Hebrew layout tests pass but visual bugs remain. CSS logical properties not tested (`margin-inline-start` vs `margin-left`). Bidirectional text (Hebrew + English product names) renders incorrectly. `dir="rtl"` attribute missing in test DOM causing style mismatches.

**Why it happens:**
jsdom doesn't apply CSS, so RTL-specific styles aren't tested. Tests check text content but not layout direction. View.js sets `dir="rtl"` (line 559) but tests don't verify. Mixed LTR/RTL content (product SKUs, prices) needs special handling.

**How to avoid:**
```javascript
// BAD: Only checks text content
it('displays Hebrew text', () => {
  view.changeToHeb();
  const title = document.querySelector('.item-title');
  expect(title.textContent).toBe('שרשרת');
});

// GOOD: Verify direction attribute
it('sets RTL direction for Hebrew', () => {
  view.changeToHeb();
  expect(document.documentElement.dir).toBe('rtl');
  expect(document.documentElement.lang).toBe('he');
});

// BETTER: Test bidirectional content handling
it('handles mixed LTR/RTL content correctly', () => {
  view.changeToHeb();
  const sku = document.querySelector('.product-sku');

  // SKU should be LTR even in RTL context
  expect(sku.style.direction).toBe('ltr');
  expect(sku.style.unicodeBidi).toBe('embed');

  // Product name should be RTL
  const title = document.querySelector('.item-title');
  expect(title.dir).toBe('rtl');
});

// BEST: Test with actual RTL data
it('renders Hebrew product with English SKU correctly', () => {
  const product = {
    name: 'שרשרת זהב',  // Hebrew: Gold necklace
    sku: 'NK-001',      // English SKU
    price: 150
  };

  view.setLanguage('heb');
  view.renderProduct(product);

  const container = document.querySelector('.product-card');
  expect(container.dir).toBe('rtl');

  // SKU should be LTR embedded in RTL
  const skuEl = container.querySelector('.product-sku');
  expect(skuEl.textContent).toBe('NK-001'); // Not reversed
});

// For CSS logical properties (requires snapshot or integration test)
it('uses logical properties for spacing', () => {
  // This requires actual CSS rendering - flag for manual testing
  // or use Playwright/Puppeteer for visual regression
});
```

**Warning signs:**
- Visual bugs in Hebrew layout despite passing tests
- SKUs/prices appear reversed in production
- Margins wrong side in RTL mode
- Mixed content renders incorrectly

**Phase to address:**
Locale Switching Tests (Phase 4) - RTL-specific concerns need dedicated test phase after basic language switching works.

---

### Pitfall 7: Hash-Based Router Timing Issues

**What goes wrong:**
View renders before `hashchange` event fires. Multiple rapid hash changes cause view stacking. Back button breaks state sync between URL and view. Tests navigate but don't wait for view rendering.

**Why it happens:**
controller.js uses hash routing but tests change hash synchronously. `window.location.hash = '#cart'` doesn't immediately fire `hashchange`. View initialization async but tests assert on DOM immediately. Browser history in tests doesn't behave like real navigation.

**How to avoid:**
```javascript
// BAD: Set hash and immediately assert
window.location.hash = '#cart';
expect(document.querySelector('.cart-view')).toBeTruthy(); // FAILS

// GOOD: Wait for hashchange event
it('navigates to cart page', async () => {
  const hashChangePromise = new Promise(resolve => {
    window.addEventListener('hashchange', resolve, { once: true });
  });

  window.location.hash = '#cart';
  await hashChangePromise;

  await vi.waitFor(() => {
    expect(document.querySelector('.cart-view')).toBeTruthy();
  });
});

// BETTER: Helper for hash navigation in tests
async function navigateTo(hash) {
  const hashChangePromise = new Promise(resolve => {
    window.addEventListener('hashchange', resolve, { once: true });
  });

  window.location.hash = hash;
  await hashChangePromise;

  // Wait for view to render
  await vi.waitFor(() => {
    const content = document.querySelector('.page-content');
    return content && content.children.length > 0;
  }, { timeout: 2000 });
}

it('handles back button navigation', async () => {
  await navigateTo('#products');
  await navigateTo('#cart');

  // Simulate back button
  window.history.back();

  await vi.waitFor(() => {
    expect(window.location.hash).toBe('#products');
  });
});
```

**Warning signs:**
- Router tests fail with null elements
- State desync between URL and rendered view
- Tests pass but manual testing shows navigation bugs
- Multiple views render simultaneously

**Phase to address:**
MVC Integration Tests (Phase 5) - Router is the glue between controller and views.

---

### Pitfall 8: View Class Inheritance and Method Override Confusion

**What goes wrong:**
Child views don't call parent methods correctly. `setPageSpecificLanguage` overrides in children not invoked. `super` calls missing causing incomplete initialization. Mock/spy on base View class affects all child views.

**Why it happens:**
View.js base class has 900+ lines with complex inheritance. Child views (homePageView, cartView) override methods without calling super. Tests mock View.prototype affecting all instances. `setLanguage` calls `setPageSpecificLanguage` (line 945) but child implementation varies.

**How to avoid:**
```javascript
// BAD: Test affects all view instances
vi.spyOn(View.prototype, 'setLanguage').mockImplementation(() => {});
const cart = new CartView();
const home = new homePageView();
// Both views now broken!

// GOOD: Test specific instance
it('cart view sets page-specific language', () => {
  const cartView = new CartView();
  const spy = vi.spyOn(cartView, 'setPageSpecificLanguage');

  cartView.setLanguage('heb', 5);

  expect(spy).toHaveBeenCalledWith('heb', 5);
});

// BETTER: Test inheritance chain explicitly
it('calls parent setLanguage then child override', async () => {
  const cartView = new CartView();

  const parentSpy = vi.spyOn(View.prototype, 'setLanguage');
  const childSpy = vi.spyOn(cartView, 'setPageSpecificLanguage');

  await cartView.setLanguage('heb', 3);

  expect(parentSpy).toHaveBeenCalled();
  expect(childSpy).toHaveBeenCalledWith('heb', 3);

  // Verify order
  const parentCall = parentSpy.mock.invocationCallOrder[0];
  const childCall = childSpy.mock.invocationCallOrder[0];
  expect(parentCall).toBeLessThan(childCall);
});

// Pattern for child views to prevent missing super calls
class CartView extends View {
  async setPageSpecificLanguage(lng, cartNum) {
    // This gets called by parent's setLanguage
    // No need to call super.setPageSpecificLanguage (it's a hook)
    this.renderCartInLanguage(lng);
  }
}
```

**Warning signs:**
- Mocking one view breaks unrelated view tests
- Child view missing expected functionality
- "Method not defined" despite being in parent
- Duplicate code across child views

**Phase to address:**
Base View Tests (Phase 1) - Establish inheritance testing patterns before child views tested in Phase 2.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term testing problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `document.querySelector` without data-testid | No markup changes needed | Brittle tests break on CSS refactor | **Never** - always add test identifiers |
| Mocking entire View.prototype | Quick test isolation | Breaks all view instances globally | **Never** - mock specific instances |
| `setTimeout` to "fix" async races | Tests pass quickly | Flaky tests, slow suite, masks real bugs | **Never** - use vi.waitFor or proper async |
| Skipping localStorage.clear() in afterEach | Faster test writing | State pollution, flaky tests | **Never** - always clean up |
| Testing only English, assuming Hebrew works | Half the test time | RTL bugs in production | **Only in MVP** - add RTL by Phase 4 |
| Comparing floats with toBe() | Simple assertions | Precision errors cause failures | **Never** - use toBeCloseTo() |
| Inline event handlers `onclick="..."` | Easy to add | Can't removeEventListener, memory leaks | **Never** - use addEventListener |
| Global fetch mock for all tests | One setup for suite | Race conditions hard to reproduce | **Only for happy path** - per-test mocks for edge cases |

## Integration Gotchas

Common mistakes when testing external service interactions.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| localStorage | Assuming isolation between tests | Clear in beforeEach/afterEach hooks |
| Fetch API | Mock once globally, can't test timing | Mock per-test with controlled promise resolution |
| PayPal SDK | Load real SDK in tests (slow, flaky) | Mock window.paypal object with test stubs |
| Stripe SDK | Use real API keys in test env | Mock stripe.js, never load real SDK |
| Exchange Rate API | Call real API in tests | Mock response with fixed rate, test staleness separately |
| DigitalOcean Spaces | Upload real files in tests | Mock S3 client, verify calls not results |
| EmailJS | Send test emails (quota limits) | Mock emailjs.send(), verify parameters |
| Microsoft Clarity | Load tracking script in tests | Conditional load based on NODE_ENV, mock in tests |

## Performance Traps

Patterns that work at small scale but fail as test suite grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Not clearing event listeners | Tests slow down progressively | afterEach cleanup, track listener refs | >50 tests |
| Accumulating localStorage data | QuotaExceededError in CI | Clear storage in afterEach | >100 tests |
| Loading full product catalog | Slow test suite, high memory | Mock with minimal data fixtures | >200 products |
| Re-rendering entire menu each test | DOM operations pile up | Reuse rendered markup, reset state | >30 view tests |
| Deep cloning cart array | O(n²) for nested cart operations | Shallow clone when possible | >20 items in cart |
| Synchronous fetch mocks | Tests wait for setTimeout | Use vi.useFakeTimers() and vi.runAllTimers() | >100 async tests |

## Security Mistakes

Testing-specific security issues to avoid.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Committing test API keys | Real credentials exposed in repo | Use .env.test with dummy values |
| Using production MongoDB in tests | Data loss, privacy violations | Separate test database, mock in unit tests |
| Skipping CSRF token validation in test mode | Production code has bypass path | Never conditional security, mock token generation |
| Test JWTs with weak secrets | If copied to production, vulnerability | Use same crypto strength, different secret |
| Storing sensitive test data in localStorage | Leaks in test snapshots | Sanitize before snapshots, use generic data |
| Mocking authentication to always succeed | Security bugs not caught | Test auth failures, expired tokens, role checks |

## UX Pitfalls

Common testing mistakes that miss user experience issues.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Only testing one language | Hebrew users see broken layout | Test both English and Hebrew in critical flows |
| Not testing currency switching | Price displays wrong after switch | Test currency change on cart/checkout pages |
| Ignoring keyboard navigation | Inaccessible to keyboard-only users | Test with tab key navigation, screen reader attributes |
| Testing empty cart only | "No items" state works, 10+ items overflow | Test cart with 0, 1, 10, 50 items |
| Fast mocked responses | UI flicker not caught in tests | Test loading states, slow network simulation |
| Testing desktop viewport only | Mobile menu broken, touch events fail | Test at 320px, 768px, 1920px widths |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces in testing context.

- [ ] **localStorage tests:** Often missing cleanup — verify afterEach clears all keys
- [ ] **Async API tests:** Often missing race condition tests — verify concurrent calls, verify timeout handling
- [ ] **Currency tests:** Often missing precision tests — verify floating point rounding, verify conversion both ways (USD→ILS→USD)
- [ ] **RTL tests:** Often missing bidirectional text — verify Hebrew text with English SKU, verify number formatting in RTL
- [ ] **Event listener tests:** Often missing cleanup verification — verify listeners removed, verify no memory leaks with many tests
- [ ] **View inheritance tests:** Often missing super calls — verify child calls parent methods, verify override doesn't break siblings
- [ ] **Router tests:** Often missing hashchange timing — verify navigation waits for event, verify back button state sync
- [ ] **Error handling tests:** Often missing network failure — verify fetch rejection, verify timeout scenarios, verify partial response data

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| localStorage pollution | LOW | 1. Add `beforeEach(() => localStorage.clear())` to all test files<br>2. Run tests to identify interdependencies<br>3. Fix tests assuming pre-existing state |
| querySelector brittleness | MEDIUM | 1. Add data-testid to all interactive elements<br>2. Create test helpers: `getByTestId(id)`<br>3. Replace querySelector calls incrementally<br>4. Add ESLint rule against raw querySelector in tests |
| Event listener leaks | MEDIUM | 1. Identify leaking tests with `--reporter=verbose --logHeapUsage`<br>2. Add afterEach cleanup for each test file<br>3. Use WeakMap/WeakRef for listener tracking<br>4. Replace cloneNode strategy with proper removeEventListener |
| Async race conditions | HIGH | 1. Identify flaky tests with `--retry=10`<br>2. Add controlled promise mocks with manual resolution<br>3. Refactor code to return promises consistently<br>4. Use vi.waitFor with explicit assertions |
| Float precision errors | LOW | 1. Change all `toBe()` to `toBeCloseTo()` for currency<br>2. Add helper: `expectCurrency(value, expected)`<br>3. Refactor model to use cents (large change) |
| RTL layout bugs | MEDIUM | 1. Add visual regression tests with Playwright<br>2. Test Hebrew on all critical pages manually<br>3. Add snapshot tests for RTL markup<br>4. Create RTL-specific test fixtures |
| Router timing issues | MEDIUM | 1. Create `navigateTo(hash)` test helper<br>2. Add hashchange promise wrapper<br>3. Replace all direct hash assignments<br>4. Add integration tests for full navigation flows |
| View inheritance confusion | HIGH | 1. Document inheritance contract in View.js<br>2. Create test suite for base View class<br>3. Test each child's override explicitly<br>4. Add TypeScript/JSDoc to clarify expected methods |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| localStorage pollution | Phase 1: Base View Tests | All tests pass when run with `--reporter=verbose`, no flaky tests |
| querySelector fragility | Phase 1: Base View Tests | No raw querySelector in test files, all use data-testid or waitFor |
| Event listener leaks | Phase 1: Base View Tests | Memory stable across 100+ test runs, no MaxListeners warnings |
| Async API races | Phase 3: Cart State Tests | Concurrent cart operations tests pass 100/100 runs |
| Float precision | Phase 3: Cart State Tests | All currency tests use toBeCloseTo, cart totals accurate |
| RTL layout | Phase 4: Locale Switching Tests | Hebrew tests pass, visual snapshots for RTL pages |
| Router timing | Phase 5: MVC Integration Tests | Navigation tests reliable, back/forward work correctly |
| View inheritance | Phase 1: Base View Tests | All child views call parent methods, inheritance documented |

## Sources

### localStorage Mocking and Testing
- [sessionStorage and localStorage are difficult to mock for test purposes - Mozilla Bugzilla](https://bugzilla.mozilla.org/show_bug.cgi?id=1141698)
- [Local Storage: Testing | CS156](https://ucsb-cs156.github.io/topics/local_storage/local_storage_testing.html)
- [Mocking browser APIs in Jest (localStorage, fetch and more!)](https://bholmes.dev/blog/mocking-browser-apis-fetch-localstorage-dates-the-easy-way-with-jest/)
- [Testing local storage with testing library - JavaScript in Plain English](https://medium.com/javascript-in-plain-english/testing-local-storage-with-testing-library-580f74e8805b)

### Vitest DOM Testing and querySelector
- [Locators | Browser Mode | Vitest](https://vitest.dev/api/browser/locators)
- [Vi | Vitest](https://vitest.dev/api/vi.html)
- [Custom Vitest matchers to test the state of the DOM](https://github.com/chaance/vitest-dom)

### Async Testing and Race Conditions
- [Beyond Async/Await: Why Your 2026 Apps Still Have Race Conditions - JavaScript in Plain English](https://javascript.plainenglish.io/beyond-async-await-why-your-2026-apps-still-have-race-conditions-dc43af7437dd)
- [How to test for race conditions in asynchronous JavaScript code? | AnycodeAI](https://www.anycode.ai/tutorial/how-to-test-for-race-conditions-in-asynchronous-javascript-code)
- [Tackling Asynchronous Bugs in JavaScript: Race Conditions and Unresolved Promises](https://dev.to/alex_aslam/tackling-asynchronous-bugs-in-javascript-race-conditions-and-unresolved-promises-7jo)

### Event Listener Memory Leaks
- [Memory management in tests - Mastering Vitest](https://app.studyraid.com/en/read/11292/352307/memory-management-in-tests)
- [How to Fix \"Memory Leak\" Test Detection](https://oneuptime.com/blog/post/2026-01-24-memory-leak-test-detection/view)
- [How to Avoid Memory Leaks in JavaScript Event Listeners](https://dev.to/alex_aslam/how-to-avoid-memory-leaks-in-javascript-event-listeners-4hna)
- [MaxListenersExceededWarning: Possible EventEmitter Memory Leak - Vitest Issue](https://github.com/vitest-dev/vitest/issues/7194)

### RTL and Bidirectional Layout Testing
- [The Complete Guide to RTL (Right-to-Left) Layout Testing: Arabic, Hebrew & More](https://placeholdertext.org/blog/the-complete-guide-to-rtl-right-to-left-layout-testing-arabic-hebrew-more/)
- [Internationalization Testing: Best Practices Guide for 2026](https://aqua-cloud.io/internationalization-testing/)
- [January 2026 - RTL Support - shadcn/ui](https://ui.shadcn.com/docs/changelog/2026-01-rtl)
- [Right to Left Styling 101](https://rtlstyling.com/posts/rtl-styling/)

### Currency and Floating-Point Precision
- [Handle Money in JavaScript: Financial Precision Without Losing a Cent](https://dev.to/benjamin_renoux/financial-precision-in-javascript-handle-money-without-losing-a-cent-1chc)
- [Currency Calculations in JavaScript - Honeybadger Developer Blog](https://www.honeybadger.io/blog/currency-money-calculations-in-javascript/)
- [JavaScript Rounding Errors (in Financial Applications)](https://www.robinwieruch.de/javascript-rounding-errors/)

### Hash-Based Routing
- [Routing in Vanilla JavaScript: Hash vs History API](https://medium.com/@RyuotheGreate/routing-in-vanilla-javascript-hash-vs-history-api-a65382121871)
- [Single Page Application Routing Using Hash or URL](https://dev.to/thedevdrawer/single-page-application-routing-using-hash-or-url-9jh)
- [How to use window.hashchange event to implement routing in vanilla javascript](https://prahladyeri.github.io/blog/2020/08/how-to-use-windowhashchange-event-to-implement-routing-in-vanilla-javascript.html)

### MVC Pattern Testing
- [The MVC Design Pattern in Vanilla JavaScript — SitePoint](https://www.sitepoint.com/mvc-design-pattern-javascript/)
- [Writing a Simple MVC (Model, View, Controller) App in Vanilla Javascript](https://hackernoon.com/writing-a-simple-mvc-model-view-controller-app-in-vanilla-javascript-u65i34lx)
- [How to Build a Simple MVC App From Scratch in JavaScript](https://www.taniarascia.com/javascript-mvc-todo-app/)

---
*Pitfalls research for: Vanilla JavaScript MVC Frontend Testing*
*Researched: 2026-02-06*
