---
phase: 20-page-view-tests
plan: 03
subsystem: frontend-views
tags: [vitest, happy-dom, page-views, checkout, home, contact, anti-spam]

requires:
  - 19-04-base-view-cleanup-tests
  - 20-02-product-category-modal-tests
provides:
  - Checkout payment and order summary test coverage (PAGE-09, PAGE-10)
  - Home page category rendering test coverage (PAGE-12)
  - Contact form validation and anti-spam test coverage (PAGE-13)
affects:
  - 20-04-page-view-tests-conclusion

tech-stack:
  added: []
  patterns:
    - DOM fixture with manual element reference re-assignment for singleton views
    - Async dynamic import for emailjs mocking with vi.mock at module level
    - Mock clearing strategy with vi.clearAllMocks() in beforeEach
    - Static import pattern for shared singleton views (cartView)

key-files:
  created:
    - frontend/tests/views/checkout.test.js
    - frontend/tests/views/home.test.js
    - frontend/tests/views/contact.test.js
  modified: []

decisions:
  - decision_id: test-20-03-001
    date: 2026-02-09
    title: Static import with DOM re-assignment for CartView singleton
    context: CartView is singleton with constructor-time DOM references that become stale after render()
    decision: Import statically and manually re-assign _summaryDetails and other DOM properties after render()
    alternatives:
      - Dynamic import with vi.resetModules (used in Plan 01, but inconsistent)
      - Factory pattern (requires refactoring production code)
    rationale: Matches existing cart.test.js pattern, avoids production code changes
    impact: All CartView tests use consistent setup pattern

  - decision_id: test-20-03-002
    date: 2026-02-09
    title: Module-level mock for emailjs with beforeEach clearing
    context: ContactMeView uses @emailjs/browser library for form submission
    decision: Use vi.mock() at module level before imports, then vi.clearAllMocks() in beforeEach
    alternatives:
      - Manual mock with vi.fn() for each test (verbose, error-prone)
      - Import emailjs in afterEach and reset (timing issues)
    rationale: Vitest best practice for mocking third-party modules, ensures clean state per test
    impact: Contact form tests have predictable mock behavior without cross-test contamination

  - decision_id: test-20-03-003
    date: 2026-02-09
    title: Test anti-spam via observable outcomes, not internal validation results
    context: ContactMeView has _validateNotBot() and _validateContent() private methods
    decision: Test through sendEmail() public method, verify observable outcomes (emailjs.send calls, alerts, form clearing)
    alternatives:
      - Access private methods directly (brittle, couples tests to implementation)
      - Expose methods for testing (pollutes production API)
    rationale: Tests behavior users/systems observe, allows refactoring validation logic without breaking tests
    impact: Contact tests verify anti-spam works correctly from user perspective

metrics:
  duration: 425
  completed: 2026-02-09
---

# Phase 20 Plan 03: Checkout, Home, and Contact View Tests Summary

**One-liner:** Comprehensive tests for checkout payment flow (Stripe session creation with USD conversion), home page category rendering (English/Hebrew with Rubik font), and contact form validation (honeypot, timing, content quality, and spam detection).

## What Was Built

Created 29 tests across 3 view test files covering final page-specific view requirements:

**Checkout View Tests (10 tests)** - `frontend/tests/views/checkout.test.js`
- Payment method selection (Stripe checkout button rendering)
- Order summary with correct totals (subtotal, discount, shipping)
- USD price conversion for Stripe (regardless of display currency ILS/USD)
- Checkout session creation with correct POST request
- Discount line display when global discount active
- Summary hidden when cart empty
- Stripe URL redirect on successful response

**Home Page View Tests (4 tests)** - `frontend/tests/views/home.test.js`
- All 6 jewelry category names render in English
- Category names render in Hebrew
- Hebrew font family (Rubik) applied correctly
- setPageSpecificLanguage updates categories

**Contact Form View Tests (15 tests)** - `frontend/tests/views/contact.test.js`
- Required field validation (name, email, message)
- Anti-spam: Honeypot detection (silently blocks with fake success)
- Anti-spam: Timing validation (blocks submissions under 3 seconds)
- Content validation: URL limits (max 2), name format (letters only), message length (10+ chars)
- Spam keyword detection (viagra, casino, buy now, etc.)
- Email format validation
- Successful submission with correct emailjs parameters
- Form clearing after submission

## Requirements Verified

**PAGE-09: Checkout View - Payment Method Selection**
- Stripe checkout button renders and is visible
- "Check Me Out With:" label displayed
- Button visible when cart has items

**PAGE-10: Checkout View - Order Summary**
- Subtotal displays sum of cart item prices
- Shipping shows "Calculated at checkout"
- Discount line displays when global discount active (with percentage)
- Order summary hidden when cart empty

**PAGE-12: Home Page View - Category Rendering**
- All 6 jewelry categories render (Necklaces, Crochet Necklaces, Hoop Earrings, Bracelets, Dangle Earrings, Unisex Jewelry)
- Categories render in both English and Hebrew
- Hebrew text uses Rubik font family

**PAGE-13: Contact Form View - Validation and Anti-Spam**
- Required fields validated (name, lastname, email, message)
- Honeypot field detects bots (silent block with fake success alert)
- Timing check blocks submissions under 3 seconds (bot behavior)
- Content quality validation:
  - Max 2 URLs per message
  - Name format: letters, spaces, hyphens, apostrophes (2+ chars)
  - Message length: 10+ characters after removing URLs
  - Spam keyword detection (7+ spam patterns)
  - Valid email format required
- Successful submission calls emailjs.send with correct service/template IDs
- Form fields cleared after successful submission

## Test Architecture

### Singleton View Pattern with DOM Re-Assignment

CartView is a singleton with constructor-time DOM references:
```javascript
class CartView extends View {
  _summaryDetails = document.querySelector('.summary-details');
  // ... other element references
}
export default new CartView(); // Instantiated immediately
```

**Problem:** When test renders DOM fixture, constructor has already run with old DOM.

**Solution:** Static import + manual re-assignment (matches cart.test.js pattern):
```javascript
import cartView from '../../js/Views/cartView.js';

beforeEach(() => {
  render(/* DOM fixture */);

  // Re-assign all DOM references after render
  cartView._summaryDetails = document.querySelector('.summary-details');
  cartView._checkoutBtn = document.querySelector('#stripe-checkout-btn');
  // ... other references
});
```

### EmailJS Mocking Strategy

ContactMeView uses @emailjs/browser for form submission. Module-level mock ensures consistent behavior:

```javascript
// At module level, before imports
vi.mock('@emailjs/browser', () => ({
  default: {
    send: vi.fn().mockResolvedValue({})
  },
  EmailJSResponseStatus: class {}
}));

// In beforeEach: clear mock calls
beforeEach(async () => {
  vi.clearAllMocks(); // Prevent cross-test contamination

  // ... render DOM, import view
  const emailjsModule = await import('@emailjs/browser');
  emailjs = emailjsModule.default;
});
```

**Why vi.clearAllMocks():** Without it, emailjs.send calls accumulate across tests, causing false failures in anti-spam tests that expect send NOT to be called.

### Anti-Spam Testing Philosophy

ContactMeView has two validation layers:
1. `_validateNotBot()` - Honeypot and timing checks (silent block)
2. `_validateContent()` - Content quality checks (user feedback)

**Testing approach:** Test through public `sendEmail()` method, verify observable outcomes:
- Alert messages (real vs fake success)
- emailjs.send call count
- Form field clearing

**Why not test private methods?** Observable outcome testing:
- Allows refactoring validation logic without breaking tests
- Tests what users/systems actually experience
- Proves anti-spam works correctly end-to-end

## Deviations from Plan

None - plan executed exactly as written.

## Test Coverage Impact

**Before Plan 03:**
- Test count: 222 tests (18 model + 82 base view + 122 page view)
- View coverage: Base View complete, CategoriesView/ModalView/CartView partial

**After Plan 03:**
- Test count: 251 tests (+29)
- View coverage: Checkout payment flow complete, Home page categories complete, Contact form complete
- New files: 3 test files (checkout, home, contact)

**Verification:** Full frontend test suite passes with 251 tests, 0 failures.

## Technical Notes

### Checkout View Architecture

Checkout is NOT a separate view - it's part of CartView:
- Checkout button: `#stripe-checkout-btn` in cart page DOM
- Handler: `CartView._addHandlerCheckout(data)` attaches click listener
- Currency conversion: Always sends USD prices to Stripe, regardless of display currency:
  ```javascript
  const checkoutItems = data.map(item => ({
    ...item,
    price: item.usdPrice || item.price,
    currency: '$' // Always USD for Stripe
  }));
  ```

### Home Page Category Architecture

HomePageView.setCategoriesLng(lng) updates 6 specific DOM elements:
- `.category-name_necklaces`
- `.category-name_crochet-necklaces`
- `.category-name_hoops`
- `.category-name_bracelets`
- `.category-name_dangle`
- `.category-name_unisex`

Hebrew rendering includes:
- Text content in Hebrew
- Font family: 'Rubik', sans-serif
- Font size: 1.3rem (same as English)

### Contact Form Anti-Spam Layers

**Layer 1: Bot Detection (Silent Block)**
- Honeypot: Hidden `#website` field must be empty
- Timing: Form must be open 3+ seconds before submission
- On detection: Alert "Message Sent Successfully!" (fake success), clear form, do NOT call emailjs.send

**Layer 2: Content Validation (User Feedback)**
- URL limit: Max 2 URLs per message
- Name format: `/^[a-zA-Z\u0590-\u05FF\s'-]{2,}$/` (letters, Hebrew, spaces, hyphens, apostrophes)
- Message length: 10+ chars after removing URLs/whitespace
- Spam patterns: 7 regex patterns (viagra, casino, lottery, winner, click here, buy now, free money, repeated chars, no letters)
- Email format: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- On rejection: Alert specific error message, do NOT clear form, do NOT call emailjs.send

**Why different responses?**
- Bots get fake success to waste their time and avoid revealing anti-spam measures
- Humans get helpful error messages so they can fix legitimate submissions

## Lessons Learned

1. **Singleton View Testing Requires DOM Re-Assignment**
   - CartView singleton pattern captures DOM references at module load time
   - Tests must manually re-assign element references after render()
   - Matches existing cart.test.js pattern for consistency

2. **Module-Level Mocks Need Per-Test Clearing**
   - vi.mock() at module level persists mock across tests
   - vi.clearAllMocks() in beforeEach prevents call accumulation
   - Essential for tests that verify mock NOT called

3. **Anti-Spam Logic Deserves Comprehensive Test Coverage**
   - Honeypot and timing checks prevent bot spam
   - Content validation prevents low-quality submissions
   - Different responses for bots (silent block) vs humans (helpful errors)
   - 15 tests ensure all validation paths work correctly

4. **Currency Conversion Must Be Tested Explicitly**
   - Stripe only accepts USD
   - CartView must convert display currency (ILS) to USD for checkout
   - Tests verify conversion happens correctly regardless of user's selected currency

## Next Steps (Plan 04)

Plan 04 will conclude Phase 20 with final verification and documentation:
- Run full test suite to confirm 250+ tests pass
- Verify all PAGE-01 through PAGE-13 requirements covered
- Document test organization and patterns
- Create phase completion summary
- Update STATE.md with Phase 20 results

**Phase 20 Status:** 3 of 4 plans complete (03 just finished)
**Overall Progress:** Checkpoint, Home, and Contact views now fully tested
