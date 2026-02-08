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

- [ ] **MODEL-01**: Cart add operation adds product with correct quantity and price
- [ ] **MODEL-02**: Cart remove operation removes product from cart state
- [ ] **MODEL-03**: Cart update operation changes product quantity
- [ ] **MODEL-04**: Cart clear operation removes all items from cart
- [ ] **MODEL-05**: Cart data persists to localStorage on every change
- [ ] **MODEL-06**: Cart data loads from localStorage on page reload
- [ ] **MODEL-07**: Cart survives browser restart (localStorage persistence)
- [ ] **MODEL-08**: API calls are mocked with vitest-fetch-mock or vi.fn()
- [ ] **MODEL-09**: Product fetch API calls return mocked data
- [ ] **MODEL-10**: Order creation API calls are properly mocked
- [ ] **MODEL-11**: Currency conversion USD → ILS uses correct exchange rate
- [ ] **MODEL-12**: Currency conversion ILS → USD uses correct exchange rate
- [ ] **MODEL-13**: Currency conversion handles floating-point precision with toBeCloseTo()
- [ ] **MODEL-14**: Malformed localStorage data doesn't crash cart (corruption handling)
- [ ] **MODEL-15**: API network failures are handled gracefully
- [ ] **MODEL-16**: API 4xx/5xx error responses are handled gracefully

### Base View Testing

- [ ] **VIEW-01**: Language selector renders with English and Hebrew options
- [ ] **VIEW-02**: Language selector switches from English to Hebrew
- [ ] **VIEW-03**: Language selector switches from Hebrew to English
- [ ] **VIEW-04**: Language switch triggers RTL layout changes
- [ ] **VIEW-05**: Currency selector renders with USD and ILS options
- [ ] **VIEW-06**: Currency selector switches from USD to ILS
- [ ] **VIEW-07**: Currency selector switches from ILS to USD
- [ ] **VIEW-08**: Currency switch triggers price recalculation in views
- [ ] **VIEW-09**: Header menu renders navigation links
- [ ] **VIEW-10**: Header menu state updates on navigation
- [ ] **VIEW-11**: Event listeners are cleaned up on view unmount (memory leak prevention)

### Page View Testing

- [ ] **PAGE-01**: Cart view displays cart items with correct product names
- [ ] **PAGE-02**: Cart view shows correct quantities for each item
- [ ] **PAGE-03**: Cart view displays prices in current currency (USD or ILS)
- [ ] **PAGE-04**: Cart view total calculates correctly across all items
- [ ] **PAGE-05**: Product modal renders product images in gallery
- [ ] **PAGE-06**: Product modal displays product description
- [ ] **PAGE-07**: Product modal shows price in current currency
- [ ] **PAGE-08**: Product modal "Add to Cart" button triggers cart update
- [ ] **PAGE-09**: Checkout view renders payment method selection
- [ ] **PAGE-10**: Checkout view displays order summary with correct totals
- [ ] **PAGE-11**: Categories view displays products filtered by category
- [ ] **PAGE-12**: Home page view renders featured products
- [ ] **PAGE-13**: Contact form view validates required fields

### Locale Testing

- [ ] **LOCALE-01**: RTL layout applies when Hebrew language selected
- [ ] **LOCALE-02**: LTR layout applies when English language selected
- [ ] **LOCALE-03**: RTL layout changes flex-direction correctly
- [ ] **LOCALE-04**: Currency display uses $ symbol for USD
- [ ] **LOCALE-05**: Currency display uses ₪ symbol for ILS
- [ ] **LOCALE-06**: Currency formatting shows correct decimal places (2 for both)
- [ ] **LOCALE-07**: Price recalculation updates all cart items on currency switch
- [ ] **LOCALE-08**: Price recalculation maintains cart quantity on currency switch
- [ ] **LOCALE-09**: Translation text updates when language switches
- [ ] **LOCALE-10**: Bidirectional text handles Hebrew names + English SKUs correctly
- [ ] **LOCALE-11**: GeoIP detection determines initial locale from headers
- [ ] **LOCALE-12**: GeoIP fallback chain works when detection fails
- [ ] **LOCALE-13**: Locale preference persists to localStorage
- [ ] **LOCALE-14**: Locale preference loads from localStorage on page reload

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
| MODEL-01 | Phase 18 | Pending |
| MODEL-02 | Phase 18 | Pending |
| MODEL-03 | Phase 18 | Pending |
| MODEL-04 | Phase 18 | Pending |
| MODEL-05 | Phase 18 | Pending |
| MODEL-06 | Phase 18 | Pending |
| MODEL-07 | Phase 18 | Pending |
| MODEL-08 | Phase 18 | Pending |
| MODEL-09 | Phase 18 | Pending |
| MODEL-10 | Phase 18 | Pending |
| MODEL-11 | Phase 18 | Pending |
| MODEL-12 | Phase 18 | Pending |
| MODEL-13 | Phase 18 | Pending |
| MODEL-14 | Phase 18 | Pending |
| MODEL-15 | Phase 18 | Pending |
| MODEL-16 | Phase 18 | Pending |
| VIEW-01 | Phase 19 | Pending |
| VIEW-02 | Phase 19 | Pending |
| VIEW-03 | Phase 19 | Pending |
| VIEW-04 | Phase 19 | Pending |
| VIEW-05 | Phase 19 | Pending |
| VIEW-06 | Phase 19 | Pending |
| VIEW-07 | Phase 19 | Pending |
| VIEW-08 | Phase 19 | Pending |
| VIEW-09 | Phase 19 | Pending |
| VIEW-10 | Phase 19 | Pending |
| VIEW-11 | Phase 19 | Pending |
| PAGE-01 | Phase 20 | Pending |
| PAGE-02 | Phase 20 | Pending |
| PAGE-03 | Phase 20 | Pending |
| PAGE-04 | Phase 20 | Pending |
| PAGE-05 | Phase 20 | Pending |
| PAGE-06 | Phase 20 | Pending |
| PAGE-07 | Phase 20 | Pending |
| PAGE-08 | Phase 20 | Pending |
| PAGE-09 | Phase 20 | Pending |
| PAGE-10 | Phase 20 | Pending |
| PAGE-11 | Phase 20 | Pending |
| PAGE-12 | Phase 20 | Pending |
| PAGE-13 | Phase 20 | Pending |
| LOCALE-01 | Phase 21 | Pending |
| LOCALE-02 | Phase 21 | Pending |
| LOCALE-03 | Phase 21 | Pending |
| LOCALE-04 | Phase 21 | Pending |
| LOCALE-05 | Phase 21 | Pending |
| LOCALE-06 | Phase 21 | Pending |
| LOCALE-07 | Phase 21 | Pending |
| LOCALE-08 | Phase 21 | Pending |
| LOCALE-09 | Phase 21 | Pending |
| LOCALE-10 | Phase 21 | Pending |
| LOCALE-11 | Phase 21 | Pending |
| LOCALE-12 | Phase 21 | Pending |
| LOCALE-13 | Phase 21 | Pending |
| LOCALE-14 | Phase 21 | Pending |
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
