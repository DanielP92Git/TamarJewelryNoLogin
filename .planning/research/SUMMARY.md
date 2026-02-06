# Project Research Summary

**Project:** Frontend Testing Infrastructure (v1.3)
**Domain:** Vanilla JavaScript MVC E-commerce Application Testing
**Researched:** 2026-02-06
**Confidence:** HIGH

## Executive Summary

This e-commerce jewelry store uses vanilla JavaScript MVC architecture (model.js, View.js base class, page-specific views) with unique complexity from multi-language (English/Hebrew RTL) and multi-currency (USD/ILS) support. Expert testing for this stack prioritizes integration tests over unit tests, uses Happy-DOM for fast DOM simulation, and focuses on localStorage cart operations as the highest-value testing target. The recommended approach is starting with Model cart operations (revenue-critical), then base View tests (language/currency switching), followed by page-specific view integration tests.

The critical insight from research: vanilla JS MVC testing must test actual integration between layers, not mock them apart. The model-view coordination is the architecture — testing Model in isolation defeats the purpose. Focus on user flows (add to cart → view updates → localStorage persists) over individual method tests. The biggest risk is localStorage state pollution between tests causing flaky failures; establish cleanup patterns in Phase 1 before other tests compound the problem.

Key technology decision: switch from jsdom to Happy-DOM (2-3x faster, sufficient API coverage for vanilla JS) and add @testing-library/dom for semantic queries (getByRole, getByText) that make tests resilient to markup changes. Avoid @testing-library/user-event (React-focused, unnecessary for vanilla JS) and use native DOM events instead.

## Key Findings

### Recommended Stack

The backend already has Vitest 4.0.18 configured. Frontend needs minimal additional tooling. The key change is switching from jsdom to Happy-DOM for better performance while adding @testing-library/dom for user-centric queries.

**Core technologies:**
- **Vitest 4.0.18** (keep existing): Fast test runner with native ESM support, already configured
- **Happy-DOM 20.0.11** (replace jsdom): 2-3x faster than jsdom, sufficient for vanilla JS DOM testing
- **@testing-library/dom 10.4.1**: Framework-agnostic DOM queries (getByRole, getByText) for resilient tests
- **vitest-fetch-mock 0.3.0**: Simple API mocking (start here, migrate to MSW if needed later)

**Already installed:**
- @vitest/coverage-v8 4.0.18: Keep for code coverage
- @testing-library/jest-dom 5.17.0: Keep if using custom matchers (toBeInTheDocument), update to 6.6.3

**Remove:**
- jsdom 28.0.0: Replaced by Happy-DOM
- @testing-library/user-event 13.5.0: Not needed for vanilla JS, use native events

### Expected Features

Research identified what to test based on e-commerce user expectations and MVC architecture validation.

**Must have (table stakes — P1 for v1.3):**
- Cart add/remove operations with localStorage sync — revenue-critical path
- Cart persistence across sessions — users expect cart to survive reload
- Currency display accuracy (USD/ILS conversion) — legal/trust requirement
- Language switching with localStorage persistence — multilingual store requirement
- Price display in selected currency — multi-currency support validation
- Checkout flow integration (HTTP boundary) — validates payment handoff
- Model-View integration — validates MVC coordination
- View cleanup on navigation — prevents memory leaks

**Should have (differentiators — P2 for v1.4+):**
- RTL layout edge cases (Hebrew) — catch flex-direction, text alignment bugs
- Multi-currency cart consistency — add in ILS, switch to USD, verify recalculation
- localStorage corruption handling — graceful fallback for malformed data
- Discount calculation edge cases — global + item discounts + currency switching
- Product modal interactions — image gallery, keyboard navigation
- Form validation (contact form) — EmailJS integration verification

**Defer (v2+ nice-to-have):**
- Visual regression testing (Percy/Chromatic) — automate screenshot comparison
- Performance testing (bundle size, LCP/FID/CLS) — optimization metrics
- Accessibility testing (ARIA, keyboard nav, screen reader) — a11y audit
- Cross-browser testing (Safari, Firefox, Edge) — compatibility validation

### Architecture Approach

Testing architecture mirrors the MVC structure with emphasis on integration over isolation. Test files organized in tests/unit/ and tests/integration/ directories with shared helpers/ for factories, mocks, and DOM setup utilities.

**Major components:**
1. **Model.js testing** — localStorage operations, API calls with fetch mocks, cart state management. Pattern: spy on Storage.prototype methods, mock global fetch, verify state transitions.
2. **View.js base class testing** — language/currency switching, menu rendering, event delegation. Pattern: minimal DOM setup with Happy-DOM, semantic queries with @testing-library/dom, verify DOM transformations.
3. **Page-specific views testing** (homePageView, cartView, etc.) — inheritance from View.js, page rendering, event handlers. Pattern: integration tests with real Model + base View, mock only external boundaries (API, payment SDKs).
4. **Controller routing testing** — hash-based navigation, view instantiation, cleanup. Pattern: wrap hashchange events in promises, use vi.waitFor for async rendering.
5. **Integration testing** — full user flows across Model + View + Controller. Pattern: minimal mocking (only external APIs), test localStorage → Model → View → DOM updates.

**Test utilities layer:**
- Factories (createProduct, createCartItem, createAddToCartElement) for dynamic test data
- DOM helpers (setupBasePage, setupCartPage, clickElement) for consistent structure
- Mocks (mockLocalStorage, mockFetchSuccess, mockFetchError) for external boundaries

### Critical Pitfalls

Research identified 8 critical pitfalls with prevention strategies.

1. **localStorage state pollution between tests** — Tests share state causing flaky failures. Solution: Clear localStorage in beforeEach/afterEach hooks globally. Critical for Phase 1 (Base View Tests) to establish pattern before cart tests compound the issue.

2. **querySelector fragility with dynamic DOM** — Tests break when CSS changes or before async rendering completes. Solution: Use data-testid attributes, semantic queries (getByRole, getByText), and vi.waitFor for async DOM updates. Establish pattern in Phase 1.

3. **Event listener memory leaks in View tests** — Listeners accumulate across tests causing MaxListenersExceededWarning. Solution: Track listener references, cleanup in afterEach with removeEventListener, replace cloneNode technique with proper cleanup. Critical for Phase 1 (View.js tests many delegated listeners).

4. **Async API race conditions in Model tests** — Tests assert before fetch completes, multiple calls resolve unpredictably. Solution: Control promise resolution timing with manual mocks, use vi.waitFor with explicit assertions, test concurrent scenarios. Address in Phase 3 (Cart State Tests).

5. **Currency conversion floating-point errors** — Cart totals fail equality checks due to JavaScript float precision. Solution: Use toBeCloseTo() for all currency assertions, consider storing prices in cents (integers). Critical for Phase 3 (Cart State Tests with multi-currency).

6. **RTL layout testing without proper direction context** — Hebrew layout tests pass but visual bugs remain. Solution: Verify dir="rtl" attribute, test bidirectional content (Hebrew text + English SKU), flag CSS logical properties for manual testing. Address in Phase 4 (Locale Switching Tests).

7. **Hash-based router timing issues** — Tests navigate but don't wait for hashchange event and view rendering. Solution: Wrap navigation in promise that waits for hashchange, use vi.waitFor for DOM updates, create navigateTo() test helper. Address in Phase 5 (MVC Integration Tests).

8. **View class inheritance and method override confusion** — Child views don't call parent methods correctly, mocks affect all instances. Solution: Test specific instances not prototypes, verify inheritance chain explicitly, document hook methods. Establish pattern in Phase 1 (Base View Tests).

## Implications for Roadmap

Based on research, suggested 6-phase structure prioritizing revenue paths, establishing patterns early, and building from unit to integration tests.

### Phase 1: Test Infrastructure & Base View Tests (Week 1)

**Rationale:** Establish test environment and patterns before writing tests. Base View is the foundation for all page views — patterns established here (cleanup, queries, async handling) prevent pitfalls in all subsequent phases.

**Delivers:**
- Vitest config with Happy-DOM environment
- Global setup.js with localStorage/DOM cleanup
- Test helpers (dom.js, factories.js, mocks/)
- Base View class tests (language switching, cart counter, menu rendering)

**Addresses features:**
- Language switching with localStorage persistence (table stakes)
- Infrastructure for all subsequent testing

**Avoids pitfalls:**
- localStorage state pollution (Pitfall 1) — establish cleanup pattern
- querySelector fragility (Pitfall 2) — establish semantic query pattern
- Event listener leaks (Pitfall 3) — establish cleanup verification
- View inheritance confusion (Pitfall 8) — test base class before children

**Test count:** ~15-20 tests, 4-6 hours estimated

**Research flags:** Standard patterns, skip research-phase. Vitest/Happy-DOM well-documented, Testing Library has extensive vanilla JS examples.

### Phase 2: Model Unit Tests (Week 2)

**Rationale:** Cart operations are highest ROI for e-commerce testing. Model is data layer — testing in isolation with mocked fetch is appropriate here (unlike View which needs DOM integration).

**Delivers:**
- Cart operations tests (addToLocalStorage, removeFromUserCart, deleteAll)
- Cart number calculation tests (checkCartNumber)
- localStorage persistence verification
- API integration with fetch mocks

**Addresses features:**
- Cart add/remove operations (P1 table stakes)
- Cart persistence across sessions (P1 table stakes)
- Model-View integration foundation (P1)

**Avoids pitfalls:**
- Async API race conditions (Pitfall 4) — controlled promise mocks
- localStorage pollution (Pitfall 1) — apply Phase 1 cleanup patterns

**Test count:** ~20-25 tests, 6-8 hours estimated

**Research flags:** Standard patterns, skip research-phase. localStorage mocking and fetch mocking well-documented in Vitest ecosystem.

### Phase 3: Cart State & Currency Tests (Week 3)

**Rationale:** Revenue-critical path combines cart operations with currency conversion. Phase 2 Model tests + Phase 1 View tests enable integration testing here.

**Delivers:**
- Currency display tests (symbol, formatting, conversion accuracy)
- Currency switching with cart re-render tests
- Discount calculation tests (global + item discounts)
- Multi-currency cart consistency tests

**Addresses features:**
- Currency display accuracy (P1 table stakes)
- Price display in selected currency (P1)
- Discount calculation edge cases (P2 differentiator)
- Multi-currency cart consistency (P2 differentiator)

**Avoids pitfalls:**
- Currency conversion floating-point errors (Pitfall 5) — use toBeCloseTo()
- Async API race conditions (Pitfall 4) — concurrent cart update tests
- localStorage state pollution (Pitfall 1) — verify cleanup between currency changes

**Test count:** ~20-25 tests, 6-8 hours estimated

**Research flags:** NEEDS RESEARCH-PHASE. Currency conversion precision testing needs deeper investigation. Potential migration to cents-based pricing (large refactor) needs validation. Exchange rate API mocking patterns need research.

### Phase 4: Locale Switching & RTL Tests (Week 4)

**Rationale:** Language switching builds on Phase 1 View tests. RTL is unique complexity — dedicated phase prevents underestimating effort.

**Delivers:**
- Language switching tests (English ↔ Hebrew)
- localStorage persistence for language preference
- RTL layout verification (dir attribute, bidirectional text)
- RTL edge cases (flexbox, arrows, alignment)

**Addresses features:**
- Language switching with persistence (P1 table stakes)
- RTL layout edge cases (P2 differentiator)

**Avoids pitfalls:**
- RTL layout testing without direction context (Pitfall 6) — verify dir="rtl", test bidirectional content
- querySelector fragility (Pitfall 2) — Hebrew DOM structure differs from English

**Test count:** ~20-25 tests, 8-10 hours estimated

**Research flags:** NEEDS RESEARCH-PHASE. RTL testing with Happy-DOM needs validation (jsdom doesn't apply CSS). Bidirectional text handling (Hebrew + English SKUs) needs deeper research. Visual regression tools (Playwright for RTL snapshots) need investigation.

### Phase 5: MVC Integration & Page Views (Week 5)

**Rationale:** Integration tests validate component coordination. Page-specific views (cartView, homePageView, categoriesView) extend base View — test after base patterns established.

**Delivers:**
- Controller routing tests (hash navigation, view instantiation)
- Cart flow integration (add → view → update → delete)
- Page-specific view tests (cartView, homePageView, categoriesView)
- View cleanup verification (event listener removal)

**Addresses features:**
- Checkout flow integration (P1 table stakes)
- Model-View integration (P1)
- View cleanup on navigation (P1)
- Product modal interactions (P2 differentiator)

**Avoids pitfalls:**
- Hash-based router timing issues (Pitfall 7) — navigateTo() helper with hashchange promise
- Event listener leaks (Pitfall 3) — verify cleanup on navigation
- View inheritance confusion (Pitfall 8) — test child views call parent methods

**Test count:** ~25-30 tests, 8-10 hours estimated

**Research flags:** Standard patterns, skip research-phase. Hash routing and MVC integration well-documented. Page view patterns established in Phase 1.

### Phase 6: Edge Cases & Polish (Week 6)

**Rationale:** Achieve high confidence coverage after critical paths validated. Error handling and edge cases often reveal production bugs.

**Delivers:**
- Error handling tests (API failures, invalid data, network timeouts)
- localStorage corruption handling (malformed JSON, missing fields)
- Browser compatibility concerns (localStorage quota, fetch polyfill)
- Documentation of testing patterns for future developers

**Addresses features:**
- localStorage corruption handling (P2 differentiator)
- Form validation (contact form) (P2)
- Category dropdown mobile/desktop (P2)

**Avoids pitfalls:**
- All pitfalls — comprehensive edge case coverage prevents production bugs

**Test count:** ~15-20 tests, 4-6 hours estimated

**Research flags:** Standard patterns, skip research-phase. Error handling and edge cases follow established patterns from Phases 1-5.

### Phase Ordering Rationale

- **Phase 1 first:** Test infrastructure and Base View tests establish patterns that prevent pitfalls in all subsequent phases. localStorage cleanup, semantic queries, and event listener cleanup patterns must be established before cart and locale tests multiply the complexity.

- **Phase 2 before Phase 3:** Model unit tests in isolation validate cart operations before integration with currency conversion. Pure cart logic (add/remove/persist) separated from currency concerns simplifies debugging.

- **Phase 3 before Phase 4:** Currency/cart state integration tested before locale (language) concerns. Cart + currency is revenue-critical, language switching is UX-critical. If time constraints, Phase 4 could defer to v1.4.

- **Phase 4 dedicated to RTL:** Hebrew RTL layout is unique complexity that shouldn't be underestimated or bundled with other locale testing. Research shows RTL edge cases (bidirectional text, flex-direction, logical properties) need focused attention.

- **Phase 5 after Phases 1-4:** Integration tests require unit test patterns established. Controller routing glues Model + View + pages together — can't test effectively until components validated individually.

- **Phase 6 last:** Edge cases and error handling build on patterns from Phases 1-5. Polish phase catches corner cases after critical paths proven.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 3 (Cart State & Currency):** Currency conversion precision testing, potential cents-based pricing migration (large refactor), exchange rate API mocking patterns
- **Phase 4 (Locale & RTL):** Happy-DOM RTL support validation, bidirectional text handling, visual regression tools for RTL snapshots

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Test Infrastructure):** Vitest/Happy-DOM setup well-documented, Testing Library vanilla JS examples abundant
- **Phase 2 (Model Unit Tests):** localStorage mocking and fetch mocking well-documented in Vitest ecosystem
- **Phase 5 (MVC Integration):** Hash routing and MVC integration patterns established, page view tests follow Phase 1 patterns
- **Phase 6 (Edge Cases):** Error handling follows established patterns from Phases 1-5

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions verified from npm (Feb 2026). Vitest 4.0.18 + Happy-DOM 20.0.11 compatibility confirmed. @testing-library/dom 10.4.1 framework-agnostic. |
| Features | HIGH | E-commerce table stakes well-documented. Cart operations, currency switching, language persistence are standard patterns. RTL testing less common but documented. |
| Architecture | HIGH | Vanilla JS MVC testing patterns established. Testing Pyramid (integration > unit) supported by multiple sources. Helpers/mocks/factories architecture standard for test codebases. |
| Pitfalls | HIGH | All 8 pitfalls sourced from real-world issues (GitHub issues, Stack Overflow, testing guides). localStorage pollution, event listener leaks, async races, float precision all documented problems. |

**Overall confidence:** HIGH

### Gaps to Address

**During Phase 3 planning (Currency & Cart State):**
- **Currency precision handling:** Research shows toBeCloseTo() works, but cents-based pricing (storing integers) is more robust long-term. Need to evaluate refactor scope — model.js stores prices as floats currently, migration to cents affects API contracts, localStorage schema, and View rendering. If refactor too large for v1.3, document technical debt and use toBeCloseTo() as interim solution.

**During Phase 4 planning (RTL & Locale):**
- **Visual regression for RTL:** Happy-DOM doesn't apply CSS, so layout bugs (flex-direction: row-reverse, margin-inline-start) not caught by unit tests. Research suggests Playwright for visual snapshots, but adds E2E dependency. Need to decide: (1) accept manual RTL testing for v1.3, (2) add Playwright for critical RTL pages, or (3) defer comprehensive RTL testing to v1.4.

**During implementation (any phase):**
- **View.js size complexity:** Base View class is 900+ lines with complex inheritance. Tests may reveal tight coupling between menu rendering, language switching, and page-specific hooks. If inheritance issues emerge, consider refactoring View.js into smaller mixins or composition pattern. Document as technical debt if refactor too large for v1.3.

## Sources

### Primary (HIGH confidence)

**Stack research:**
- [Vitest Environment Guide](https://vitest.dev/guide/environment) — official docs for Happy-DOM setup
- [@testing-library/dom - npm](https://www.npmjs.com/package/@testing-library/dom) — version 10.4.1 verified (published Aug 2025)
- [happy-dom - npm](https://www.npmjs.com/package/happy-dom) — version 20.0.11 verified (published Jan 2026)
- [vitest-fetch-mock - npm](https://www.npmjs.com/package/vitest-fetch-mock) — version 0.3.0+ for fetch mocking

**Features research:**
- [JavaScript Testing Best Practices (GitHub)](https://github.com/goldbergyoni/javascript-testing-best-practices) — comprehensive guide with 50+ best practices
- [Shopify: Ecommerce Testing Guide 2026](https://www.shopify.com/blog/ecommerce-testing) — table stakes features for e-commerce
- [Frontend Unit Testing Best Practices](https://www.meticulous.ai/blog/frontend-unit-testing-best-practices) — what to test vs what not to test

**Architecture research:**
- [The MVC Design Pattern in Vanilla JavaScript — SitePoint](https://www.sitepoint.com/mvc-design-pattern-javascript/) — MVC testing patterns
- [Testing the DOM: The Setup | Steve Kinney](https://stevekinney.com/courses/testing/testing-the-dom) — Happy-DOM setup and patterns
- [jsdom vs happy-dom · vitest-dev/vitest Discussion](https://github.com/vitest-dev/vitest/discussions/1607) — performance comparison, API coverage

**Pitfalls research:**
- [How to mock and spy on local storage in vitest](https://dylanbritz.dev/writing/mocking-local-storage-vitest/) — localStorage state pollution prevention
- [MaxListenersExceededWarning: Possible EventEmitter Memory Leak - Vitest Issue](https://github.com/vitest-dev/vitest/issues/7194) — event listener leak patterns
- [Currency Calculations in JavaScript - Honeybadger](https://www.honeybadger.io/blog/currency-money-calculations-in-javascript/) — floating-point precision issues
- [The Complete Guide to RTL Layout Testing](https://placeholdertext.org/blog/the-complete-guide-to-rtl-right-to-left-layout-testing-arabic-hebrew-more/) — RTL bidirectional text handling

### Secondary (MEDIUM confidence)

- [How to Unit Test HTML and Vanilla JavaScript](https://dev.to/thawkin3/how-to-unit-test-html-and-vanilla-javascript-without-a-ui-framework-4io) — vanilla JS testing patterns without frameworks
- [BrowserStack: How to Test E-commerce Website](https://www.browserstack.com/guide/how-to-test-ecommerce-website) — e-commerce testing checklist
- [How to Build a Simple MVC App From Scratch in JavaScript](https://www.taniarascia.com/javascript-mvc-todo-app/) — MVC structure patterns

### Tertiary (LOW confidence)

- Community discussions on Reddit, Stack Overflow for edge cases (localStorage quota, Hebrew layout bugs, currency rounding)
- Blog posts on vanilla JS MVC patterns (some outdated, pre-Vitest era)

---
*Research completed: 2026-02-06*
*Ready for roadmap: yes*
