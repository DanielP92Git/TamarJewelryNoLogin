# Feature Research: Frontend Testing

**Domain:** Vanilla JS MVC E-commerce Frontend Testing
**Researched:** 2026-02-06
**Confidence:** HIGH

## Feature Landscape

This research identifies WHAT to test in the existing vanilla JavaScript MVC e-commerce frontend for the jewelry store. Focus is on table stakes (must-have tests for confidence), differentiators (tests catching subtle bugs), and anti-features (what NOT to test).

### Table Stakes (Users Expect These to Work)

Tests users assume work correctly. Missing these = broken e-commerce experience.

| Feature Category | Why Expected | Complexity | Notes |
|-----------------|--------------|------------|-------|
| **Cart Add/Remove Operations** | Core revenue path - users must add/remove items | LOW | Test localStorage sync, cart counter updates, UI reflection |
| **Cart Persistence Across Sessions** | Users expect cart to survive page reload/browser restart | LOW | Test localStorage read/write, data structure integrity |
| **Checkout Flow (End-to-End)** | Revenue-critical - broken checkout = lost sales | MEDIUM | Test Stripe/PayPal integration points, price calculation handoff |
| **Price Display Accuracy** | Wrong prices = lost customer trust + legal issues | MEDIUM | Test currency display (USD/ILS), discount calculations, totals |
| **Product Modal Open/Close** | Primary product browsing UX - users click to view details | LOW | Test DOM manipulation, image gallery rendering, escape key |
| **Language Switching (Eng/Heb)** | Multilingual store - users expect language to persist and work | MEDIUM | Test localStorage persistence, UI text updates, RTL layout |
| **Currency Switching (USD/ILS)** | Multi-currency store - users expect accurate conversion | MEDIUM | Test localStorage persistence, price recalculation, symbol display |
| **Navigation Routing** | Users navigate between pages - broken routing = broken site | LOW | Test controller hash routing, view instantiation, cleanup |
| **Cart Counter Visibility** | Users need visual confirmation of cart state | LOW | Test badge display, number updates, zero-state handling |
| **Form Validation (Contact)** | Users expect immediate feedback on invalid inputs | LOW | Test EmailJS integration, field validation, error messages |

### Differentiators (Catch Subtle Bugs)

Tests that catch edge cases and bugs unique to this architecture.

| Feature Category | Value Proposition | Complexity | Notes |
|-----------------|-------------------|------------|-------|
| **RTL Layout Edge Cases** | Hebrew users see broken layouts if RTL isn't tested | HIGH | Test flex-direction reversals, text alignment, icon flipping, arrow indicators |
| **Multi-Currency Cart Consistency** | Users add items in ILS, switch to USD - prices must recalculate | HIGH | Test stored USD/ILS prices, conversion accuracy, discount preservation across currency change |
| **localStorage Corruption Handling** | Malformed cart data causes crashes - graceful fallback needed | MEDIUM | Test JSON parse failures, missing fields, type coercion, migration from old data structures |
| **View Cleanup on Navigation** | Memory leaks from event listeners not removed on page change | MEDIUM | Test event listener removal, DOM cleanup, no zombie listeners |
| **MVC Layer Separation** | Model changes should update View without tight coupling | MEDIUM | Test model-view sync via events, controller coordination, no direct DOM manipulation in model |
| **Currency Change Mid-Checkout** | User switches currency during checkout flow - must recalculate | HIGH | Test cart re-render, summary update, Stripe session price consistency |
| **Discount Calculation Edge Cases** | Global discounts + per-item discounts + currency switching | HIGH | Test discount stacking, rounding errors (Math.round), original price preservation |
| **Category Dropdown Mobile vs Desktop** | Different interaction patterns (click vs hover) per viewport | MEDIUM | Test click handlers on mobile, hover on desktop, prevent double-binding |
| **Sticky Menu Intersection Observer** | Edge cases: rapid scrolling, resize during scroll, multiple observers | LOW | Test sticky state transitions, hidden state on scroll-up, threshold edge cases |
| **Image Gallery State Management** | Flipping between images in modal maintains state correctly | LOW | Test image index, thumbnail highlighting, keyboard navigation |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems or aren't necessary.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Test Every View Method Individually** | "100% coverage = quality" | Creates brittle tests tied to implementation details, not user behavior | **Integration tests for user flows** - Test "user adds item to cart" not "_addToLocalCart() method" |
| **Mock localStorage Globally** | "Tests should be isolated" | Breaks realistic testing of persistence layer, hides storage bugs | **Use real localStorage with cleanup** - Clear between tests, test actual browser API |
| **Test Browser Internals (IntersectionObserver, etc.)** | "Ensure APIs work" | Browser APIs are tested by browser vendors, waste of effort | **Integration tests verify behavior** - Test "menu becomes sticky" not "IntersectionObserver fires" |
| **Test Third-Party Libraries (PayPal SDK, Stripe)** | "Need to know they work" | Libraries have their own test suites, mocking defeats the purpose | **Integration tests at HTTP boundary** - Test your code's API calls, not library internals |
| **Snapshot Testing for Entire DOM** | "Catch all UI regressions" | Too brittle, breaks on any markup change, low signal-to-noise | **Targeted assertions on critical elements** - Test cart item exists, not entire HTML structure |
| **Test CSS Styling Directly** | "Ensure design is correct" | Style is visual, not functional - wrong tool for the job | **Visual regression tests (if needed)** - Use Percy/Chromatic for visual diffs, not unit tests |
| **Test Base View Class in Isolation** | "Unit test everything" | Base View is abstract - meaningless without page-specific context | **Test via subclasses** - homePageView, cartView tests cover base functionality |
| **Mock Model in View Tests** | "True unit testing" | Breaks the MVC contract - need to test model-view integration | **Integration tests with real model** - Test actual cart operations, not mocked responses |
| **Test Every Language String** | "Ensure translations exist" | Content testing, not functionality testing | **Sample critical strings only** - Test language switching mechanism, not every translation |
| **Test Exchange Rate API Directly** | "Ensure rates are accurate" | External API, not your code - backend responsibility | **Test frontend uses provided rate** - Test price calculation with mocked rate, not API call |

## Feature Dependencies

```
[Cart State Testing]
    └──requires──> [localStorage Testing]
                       └──requires──> [Model.js cart operations]

[Locale Testing (Language + Currency)]
    ├──requires──> [localStorage persistence]
    ├──requires──> [View.js setLanguage()]
    └──requires──> [Currency conversion display]

[MVC Integration Testing]
    ├──requires──> [Controller routing]
    ├──requires──> [Model-View sync]
    └──requires──> [View cleanup on navigation]

[Checkout Flow Testing]
    ├──requires──> [Cart state]
    ├──requires──> [Currency handling]
    └──requires──> [Payment API mocking]

[RTL Layout Testing]
    └──enhances──> [Language testing]

[Multi-Currency Cart Testing]
    ├──requires──> [Cart state]
    └──requires──> [Currency switching]

[View Cleanup Testing]
    └──requires──> [Navigation/routing]
```

### Dependency Notes

- **Cart State requires localStorage**: Can't test cart operations without testing persistence layer
- **Locale requires View.js**: Language/currency switching is core View responsibility
- **MVC Integration requires all layers**: Tests validate separation of concerns and coordination
- **Checkout requires Cart + Currency**: Can't test payment flow without valid cart and currency state
- **RTL enhances Language**: RTL testing is subset of language testing but with visual component
- **Multi-Currency Cart requires both**: Must test cart operations AND currency switching together
- **View Cleanup requires Routing**: Cleanup only matters when navigating between views

## MVP Definition (v1.3 Milestone)

### Launch With (v1.3 - Initial Frontend Testing)

Minimum viable test suite to validate core e-commerce functionality.

- [ ] **Cart Operations Testing** - Add, remove, persist, counter updates (revenue-critical)
- [ ] **localStorage Testing** - Read/write, corruption handling, data integrity
- [ ] **Currency Display Testing** - Symbol display, price formatting, conversion accuracy
- [ ] **Language Switching Testing** - localStorage persistence, UI text updates, basic RTL
- [ ] **Checkout Flow Integration** - Cart → Stripe session creation (HTTP boundary, not full payment)
- [ ] **Model-View Integration** - Cart operations trigger view updates correctly
- [ ] **View Cleanup Testing** - Event listeners removed on navigation (prevent memory leaks)

### Add After Validation (v1.x - Enhanced Coverage)

Features to add once core is working and patterns are established.

- [ ] **RTL Layout Edge Cases** - Comprehensive Hebrew layout testing (flexbox, arrows, alignment)
- [ ] **Multi-Currency Cart Consistency** - Add ILS, switch to USD, verify recalculation
- [ ] **Discount Calculation Edge Cases** - Global discount + item discount + currency switching
- [ ] **Category Dropdown Mobile/Desktop** - Viewport-specific interaction testing
- [ ] **Image Gallery State** - Modal state management and keyboard navigation
- [ ] **Form Validation (Contact)** - EmailJS integration and field validation
- [ ] **Product Modal Testing** - Open/close, image gallery, escape key handling

### Future Consideration (v2+ - Nice-to-Have)

Features to defer until product-market fit is established.

- [ ] **Visual Regression Testing** - Automated screenshot comparison (Percy/Chromatic)
- [ ] **Performance Testing** - Bundle size, load time, LCP/FID/CLS metrics
- [ ] **Accessibility Testing** - ARIA labels, keyboard navigation, screen reader
- [ ] **Cross-Browser Testing** - Safari, Firefox, Edge compatibility
- [ ] **Mobile Device Testing** - Real device testing (not just viewport simulation)
- [ ] **SEO Testing** - Meta tags, structured data, sitemap validation

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Cart Add/Remove Operations | HIGH | LOW | P1 |
| Cart Persistence | HIGH | LOW | P1 |
| Checkout Flow | HIGH | MEDIUM | P1 |
| Price Display Accuracy | HIGH | MEDIUM | P1 |
| Currency Switching | HIGH | MEDIUM | P1 |
| Language Switching | HIGH | MEDIUM | P1 |
| Model-View Integration | HIGH | MEDIUM | P1 |
| View Cleanup | MEDIUM | LOW | P1 |
| localStorage Corruption Handling | MEDIUM | MEDIUM | P2 |
| RTL Layout Edge Cases | MEDIUM | HIGH | P2 |
| Multi-Currency Cart Consistency | MEDIUM | HIGH | P2 |
| Discount Calculation Edge Cases | MEDIUM | HIGH | P2 |
| Product Modal | MEDIUM | LOW | P2 |
| Category Dropdown Mobile/Desktop | LOW | MEDIUM | P2 |
| Form Validation | LOW | LOW | P2 |
| Image Gallery State | LOW | LOW | P3 |
| Sticky Menu Edge Cases | LOW | LOW | P3 |
| Visual Regression | LOW | HIGH | P3 |
| Performance Testing | LOW | MEDIUM | P3 |
| Accessibility Testing | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.3 (core revenue paths and architecture validation)
- P2: Should have for v1.4+ (enhanced coverage, edge cases)
- P3: Nice to have for v2+ (polish, optimization)

## Testing Strategy Comparison

### Unit Testing vs Integration Testing

| Aspect | Unit Testing | Integration Testing |
|--------|-------------|---------------------|
| **Scope** | Individual functions (model.addToCart) | User flows (add item → view updates → localStorage syncs) |
| **Isolation** | Mock dependencies | Real dependencies (real localStorage, real DOM) |
| **Speed** | Fast (milliseconds) | Slower (seconds) |
| **Brittleness** | High (breaks on refactor) | Low (breaks on behavior change) |
| **Confidence** | Low (doesn't test integration) | High (tests real user experience) |
| **Our Approach** | **Minimize** - Only for complex logic (discount calculations) | **Prioritize** - Focus on user flows and MVC coordination |

### DOM Testing Approaches

| Approach | Tool | Use Case |
|----------|------|----------|
| **JSDOM** | Jest default | Lightweight, fast, good for unit tests |
| **Happy-DOM** | Vitest default | Faster than JSDOM, modern APIs |
| **Playwright/Puppeteer** | Real browser | E2E tests, cross-browser, visual regression |
| **Our Approach** | **Happy-DOM (Vitest)** | Balance speed and realism, matches backend stack |

## Complexity Estimation

| Test Category | Test Count | Estimated Effort | Risk |
|--------------|-----------|------------------|------|
| **Cart State** | 15-20 tests | 4-6 hours | LOW - Straightforward localStorage operations |
| **Locale (Language + Currency)** | 20-25 tests | 6-8 hours | MEDIUM - RTL edge cases complex |
| **MVC Integration** | 10-15 tests | 4-5 hours | MEDIUM - Requires coordination testing |
| **View Testing (Base + Pages)** | 25-30 tests | 8-10 hours | MEDIUM - Multiple page-specific views |
| **Checkout Flow** | 5-8 tests | 3-4 hours | LOW - HTTP boundary testing, mocked APIs |
| **Edge Cases (RTL, Multi-Currency)** | 15-20 tests | 6-8 hours | HIGH - Complex interaction scenarios |
| **Total Estimated** | **90-118 tests** | **31-41 hours** | - |

## Testing Anti-Patterns to Avoid

Based on research and vanilla JS MVC architecture:

1. **Don't test implementation details** - Test "cart counter updates" not "_updateCartNumber() is called"
2. **Don't mock what you don't own** - Don't mock localStorage, IntersectionObserver, browser APIs
3. **Don't test third-party libraries** - Don't test PayPal SDK, Stripe.js, EmailJS internals
4. **Don't snapshot entire DOM trees** - Test specific elements, not entire HTML structure
5. **Don't test CSS** - Visual appearance is for visual regression tools, not unit tests
6. **Don't test static content** - Don't test every translation string, only switching mechanism
7. **Don't test in isolation what only works integrated** - MVC layers must be tested together
8. **Don't ignore RTL** - Hebrew layout breaks are invisible without explicit RTL testing
9. **Don't test happy path only** - Test corrupted localStorage, missing prices, invalid currency
10. **Don't create brittle selectors** - Use data-testid or semantic queries, not .cart-item__content > div:nth-child(2)

## Sources

### Vanilla JavaScript Testing
- [Frontend Unit Testing Best Practices](https://www.meticulous.ai/blog/frontend-unit-testing-best-practices)
- [How to Unit Test HTML and Vanilla JavaScript](https://dev.to/thawkin3/how-to-unit-test-html-and-vanilla-javascript-without-a-ui-framework-4io)
- [JavaScript Testing Best Practices (GitHub)](https://github.com/goldbergyoni/javascript-testing-best-practices)

### E-commerce Testing
- [Shopify: Ecommerce Testing Guide 2026](https://www.shopify.com/blog/ecommerce-testing)
- [BrowserStack: How to Test E-commerce Website](https://www.browserstack.com/guide/how-to-test-ecommerce-website)
- [BugBug: Ecommerce Testing Guide](https://bugbug.io/blog/software-testing/ecommerce-testing/)

### MVC Pattern Testing
- [Stack Overflow: MVC Pattern Maintainability](https://stackoverflow.blog/2023/05/17/keep-em-separated-get-better-maintainability-in-web-projects-using-the-model-view-controller-pattern/)
- [FreeCodeCamp: MVC Architecture Explained](https://www.freecodecamp.org/news/the-model-view-controller-pattern-mvc-architecture-and-frameworks-explained/)

### Internationalization Testing
- [Aqua Cloud: Internationalization Testing Best Practices](https://aqua-cloud.io/internationalization-testing/)
- [BrowserStack: Internationalization Testing Guide](https://www.browserstack.com/guide/internationalization-testing-of-websites-and-apps)
- [DEV: i18n and RTL for E-commerce](https://dev.to/ash_dubai/i18n-and-rtl-implementation-for-global-e-commerce-mastering-i18n-3jb1)

### localStorage Testing
- [Medium: Testing localStorage with React (patterns apply)](https://jogilvyt.medium.com/storing-and-testing-state-in-localstorage-with-react-fdf8b8b211a4)
- [Plain English: Testing Local Storage with Testing Library](https://plainenglish.io/blog/testing-local-storage-with-testing-library-580f74e8805b)
- [LogRocket: localStorage in JavaScript Complete Guide](https://blog.logrocket.com/localstorage-javascript-complete-guide/)

---
*Feature research for: Vanilla JS MVC E-commerce Frontend Testing*
*Researched: 2026-02-06*
