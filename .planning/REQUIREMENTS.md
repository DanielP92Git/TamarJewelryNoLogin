# Requirements: Tamar Kfir Jewelry - v1.3 Frontend Testing

**Defined:** 2026-02-06
**Core Value:** Clean, professional product information management that matches real-world e-commerce standards and improves admin workflow efficiency

## v1.3 Requirements

Requirements for frontend testing coverage. Each maps to roadmap phases.

### Test Infrastructure

- [x] **INFRA-01**: Vitest configured for browser environment with Happy-DOM
- [x] **INFRA-02**: localStorage cleanup between tests prevents state pollution
- [x] **INFRA-03**: DOM query helpers with semantic selectors (@testing-library/dom)
- [x] **INFRA-04**: Test utilities and factories for common scenarios
- [x] **INFRA-05**: CI/CD GitHub Actions workflow runs frontend tests on PR/push

### Model Testing

- [x] **MODEL-01**: Cart add operation adds product with correct quantity and price
- [x] **MODEL-02**: Cart remove operation removes product from cart state
- [x] **MODEL-03**: Cart update operation changes product quantity
- [x] **MODEL-04**: Cart clear operation removes all items from cart
- [x] **MODEL-05**: Cart data persists to localStorage on every change
- [x] **MODEL-06**: Cart data loads from localStorage on page reload
- [x] **MODEL-07**: Cart survives browser restart (localStorage persistence)
- [x] **MODEL-08**: API calls are mocked with vitest-fetch-mock or vi.fn()
- [x] **MODEL-09**: Product fetch API calls return mocked data
- [x] **MODEL-10**: Order creation API calls are properly mocked
- [x] **MODEL-11**: Currency conversion USD → ILS uses correct exchange rate
- [x] **MODEL-12**: Currency conversion ILS → USD uses correct exchange rate
- [x] **MODEL-13**: Currency conversion handles floating-point precision with toBeCloseTo()
- [x] **MODEL-14**: Malformed localStorage data doesn't crash cart (corruption handling)
- [x] **MODEL-15**: API network failures are handled gracefully
- [x] **MODEL-16**: API 4xx/5xx error responses are handled gracefully

### Base View Testing

- [x] **VIEW-01**: Language selector renders with English and Hebrew options
- [x] **VIEW-02**: Language selector switches from English to Hebrew
- [x] **VIEW-03**: Language selector switches from Hebrew to English
- [x] **VIEW-04**: Language switch triggers RTL layout changes
- [x] **VIEW-05**: Currency selector renders with USD and ILS options
- [x] **VIEW-06**: Currency selector switches from USD to ILS
- [x] **VIEW-07**: Currency selector switches from ILS to USD
- [x] **VIEW-08**: Currency switch triggers price recalculation in views
- [x] **VIEW-09**: Header menu renders navigation links
- [x] **VIEW-10**: Header menu state updates on navigation
- [x] **VIEW-11**: Event listeners are cleaned up on view unmount (memory leak prevention)

### Page View Testing

- [x] **PAGE-01**: Cart view displays cart items with correct product names
- [x] **PAGE-02**: Cart view shows correct quantities for each item
- [x] **PAGE-03**: Cart view displays prices in current currency (USD or ILS)
- [x] **PAGE-04**: Cart view total calculates correctly across all items
- [x] **PAGE-05**: Product modal renders product images in gallery
- [x] **PAGE-06**: Product modal displays product description
- [x] **PAGE-07**: Product modal shows price in current currency
- [x] **PAGE-08**: Product modal "Add to Cart" button triggers cart update
- [x] **PAGE-09**: Checkout view renders payment method selection
- [x] **PAGE-10**: Checkout view displays order summary with correct totals
- [x] **PAGE-11**: Categories view displays products filtered by category
- [x] **PAGE-12**: Home page view renders featured products
- [x] **PAGE-13**: Contact form view validates required fields

### Locale Testing

- [x] **LOCALE-01**: RTL layout applies when Hebrew language selected
- [x] **LOCALE-02**: LTR layout applies when English language selected
- [x] **LOCALE-03**: RTL layout changes flex-direction correctly
- [x] **LOCALE-04**: Currency display uses $ symbol for USD
- [x] **LOCALE-05**: Currency display uses ₪ symbol for ILS
- [x] **LOCALE-06**: Currency formatting shows correct decimal places (2 for both)
- [x] **LOCALE-07**: Price recalculation updates all cart items on currency switch
- [x] **LOCALE-08**: Price recalculation maintains cart quantity on currency switch
- [x] **LOCALE-09**: Translation text updates when language switches
- [x] **LOCALE-10**: Bidirectional text handles Hebrew names + English SKUs correctly
- [x] **LOCALE-11**: GeoIP detection determines initial locale from headers
- [x] **LOCALE-12**: GeoIP fallback chain works when detection fails
- [x] **LOCALE-13**: Locale preference persists to localStorage
- [x] **LOCALE-14**: Locale preference loads from localStorage on page reload

### MVC Integration Testing

- [ ] **MVC-01**: Controller routes to correct view based on hash fragment
- [ ] **MVC-02**: Hash change triggers view navigation
- [ ] **MVC-03**: Cart model updates trigger cart view re-render
- [ ] **MVC-04**: Currency model change triggers all view updates
- [ ] **MVC-05**: Language model change triggers all view updates
- [ ] **MVC-06**: View mount lifecycle initializes event listeners
- [ ] **MVC-07**: View update lifecycle refreshes DOM with new data
- [ ] **MVC-08**: View unmount lifecycle cleans up event listeners
- [ ] **MVC-09**: Currency change mid-checkout maintains cart state consistency
- [ ] **MVC-10**: Navigation with unsaved cart changes preserves cart data

## Future Requirements

Deferred to future milestones.

### Performance Testing

- **PERF-01**: Bundle size monitoring for frontend JavaScript
- **PERF-02**: Core Web Vitals tracking (LCP, FID, CLS)
- **PERF-03**: localStorage quota management

### Visual Regression Testing

- **VISUAL-01**: Automated screenshot comparison for RTL layouts
- **VISUAL-02**: Cross-browser rendering validation
- **VISUAL-03**: Mobile vs desktop viewport testing

### E2E Testing

- **E2E-01**: Complete purchase flow with real Stripe test mode
- **E2E-02**: Complete purchase flow with real PayPal sandbox
- **E2E-03**: Multi-device testing (desktop, tablet, mobile)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Testing implementation details (method names, private functions) | Tests should verify user behavior, not code structure |
| Mocking browser internals (IntersectionObserver, ResizeObserver) | Trust browser APIs, don't test them |
| Testing third-party libraries (PayPal SDK, Stripe.js) | Vendors maintain their own tests |
| Snapshot testing entire DOM trees | Too brittle, breaks on any HTML change |
| Testing CSS styling directly | Wrong tool - visual regression tools better suited |
| E2E tests with real payment processing | Deferred to future milestone, requires sandbox setup |
| Cross-browser compatibility testing | Manual testing sufficient for v1.3, automation later |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 17 | Complete |
| INFRA-02 | Phase 17 | Complete |
| INFRA-03 | Phase 17 | Complete |
| INFRA-04 | Phase 17 | Complete |
| INFRA-05 | Phase 17 | Complete |
| MODEL-01 | Phase 18 | Complete |
| MODEL-02 | Phase 18 | Complete |
| MODEL-03 | Phase 18 | Complete |
| MODEL-04 | Phase 18 | Complete |
| MODEL-05 | Phase 18 | Complete |
| MODEL-06 | Phase 18 | Complete |
| MODEL-07 | Phase 18 | Complete |
| MODEL-08 | Phase 18 | Complete |
| MODEL-09 | Phase 18 | Complete |
| MODEL-10 | Phase 18 | Complete |
| MODEL-11 | Phase 18 | Complete |
| MODEL-12 | Phase 18 | Complete |
| MODEL-13 | Phase 18 | Complete |
| MODEL-14 | Phase 18 | Complete |
| MODEL-15 | Phase 18 | Complete |
| MODEL-16 | Phase 18 | Complete |
| VIEW-01 | Phase 19 | Complete |
| VIEW-02 | Phase 19 | Complete |
| VIEW-03 | Phase 19 | Complete |
| VIEW-04 | Phase 19 | Complete |
| VIEW-05 | Phase 19 | Complete |
| VIEW-06 | Phase 19 | Complete |
| VIEW-07 | Phase 19 | Complete |
| VIEW-08 | Phase 19 | Complete |
| VIEW-09 | Phase 19 | Complete |
| VIEW-10 | Phase 19 | Complete |
| VIEW-11 | Phase 19 | Complete |
| PAGE-01 | Phase 20 | Complete |
| PAGE-02 | Phase 20 | Complete |
| PAGE-03 | Phase 20 | Complete |
| PAGE-04 | Phase 20 | Complete |
| PAGE-05 | Phase 20 | Complete |
| PAGE-06 | Phase 20 | Complete |
| PAGE-07 | Phase 20 | Complete |
| PAGE-08 | Phase 20 | Complete |
| PAGE-09 | Phase 20 | Complete |
| PAGE-10 | Phase 20 | Complete |
| PAGE-11 | Phase 20 | Complete |
| PAGE-12 | Phase 20 | Complete |
| PAGE-13 | Phase 20 | Complete |
| LOCALE-01 | Phase 21 | Complete |
| LOCALE-02 | Phase 21 | Complete |
| LOCALE-03 | Phase 21 | Complete |
| LOCALE-04 | Phase 21 | Complete |
| LOCALE-05 | Phase 21 | Complete |
| LOCALE-06 | Phase 21 | Complete |
| LOCALE-07 | Phase 21 | Complete |
| LOCALE-08 | Phase 21 | Complete |
| LOCALE-09 | Phase 21 | Complete |
| LOCALE-10 | Phase 21 | Complete |
| LOCALE-11 | Phase 21 | Complete |
| LOCALE-12 | Phase 21 | Complete |
| LOCALE-13 | Phase 21 | Complete |
| LOCALE-14 | Phase 21 | Complete |
| MVC-01 | Phase 22 | Pending |
| MVC-02 | Phase 22 | Pending |
| MVC-03 | Phase 22 | Pending |
| MVC-04 | Phase 22 | Pending |
| MVC-05 | Phase 22 | Pending |
| MVC-06 | Phase 22 | Pending |
| MVC-07 | Phase 22 | Pending |
| MVC-08 | Phase 22 | Pending |
| MVC-09 | Phase 22 | Pending |
| MVC-10 | Phase 22 | Pending |

**Coverage:**
- v1.3 requirements: 60 total
- Mapped to phases: 60/60 (100% coverage)
- Unmapped: 0

**Phase distribution:**
- Phase 17 (Test Infrastructure): 5 requirements
- Phase 18 (Model Tests): 16 requirements
- Phase 19 (Base View Tests): 11 requirements
- Phase 20 (Page View Tests): 13 requirements
- Phase 21 (Locale & Currency Tests): 14 requirements
- Phase 22 (MVC Integration Tests): 10 requirements

---
*Requirements defined: 2026-02-06*
*Last updated: 2026-02-06 after roadmap creation*
