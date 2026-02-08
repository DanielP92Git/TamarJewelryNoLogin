# Roadmap: Tamar Kfir Jewelry - SKU Management

## Milestones

- ✅ **v1.0 SKU Management** - Phases 1-3 (shipped 2026-02-01)
- ✅ **v1.1 Admin Product Management UX** - Phases 4-9 (shipped 2026-02-04)
- ✅ **v1.2 Test Infrastructure & Critical Coverage** - Phases 10-16 (shipped 2026-02-06)
- 🚧 **v1.3 Frontend Testing** - Phases 17-22 (in progress)

## Phases

<details>
<summary>✅ v1.0 SKU Management (Phases 1-3) - SHIPPED 2026-02-01</summary>

### Phase 1: Database & Schema
**Goal**: MongoDB SKU field with validation
**Plans**: 3 plans

Plans:
- [x] 01-01: Add SKU field to Product schema
- [x] 01-02: Implement sparse unique index
- [x] 01-03: Create duplicate validation API

### Phase 2: Admin Dashboard Integration
**Goal**: SKU management in admin forms
**Plans**: 1 plan

Plans:
- [x] 02-01: Add SKU inputs to Add/Edit Product pages

### Phase 3: Frontend Display
**Goal**: Customer-facing SKU display
**Plans**: 1 plan

Plans:
- [x] 03-01: Display SKU in product modals with copy-to-clipboard

</details>

<details>
<summary>✅ v1.1 Admin Product Management UX (Phases 4-9) - SHIPPED 2026-02-04</summary>

### Phase 4: Product Preview Modal
**Goal**: Admin can preview customer-facing product view
**Plans**: 5 plans

Plans:
- [x] 04-01: Create product preview modal component
- [x] 04-02: Implement image carousel in modal
- [x] 04-03: Add Edit/Delete/Duplicate actions
- [x] 04-04: Implement keyboard navigation
- [x] 04-05: Add cross-device testing

### Phase 5: Database Schema Migration
**Goal**: displayOrder field for all products
**Plans**: 5 plans

Plans:
- [x] 05-01: Add displayOrder field to Product schema
- [x] 05-02: Create migration script with dry-run
- [x] 05-03: Implement rollback capability
- [x] 05-04: Execute migration on production data
- [x] 05-05: Verify migration success

### Phase 6: Product List Reordering
**Goal**: Drag-and-drop product reordering
**Plans**: 7 plans

Plans:
- [x] 06-01: Integrate SortableJS library
- [x] 06-02: Implement drag-and-drop UI
- [x] 06-03: Add visual feedback (ghost preview)
- [x] 06-04: Implement Save Order API
- [x] 06-05: Add undo/redo functionality
- [x] 06-06: Add beforeunload protection
- [x] 06-07: Handle conflict resolution

### Phase 7: Image Gallery Unification
**Goal**: Single sortable gallery
**Plans**: 6 plans

Plans:
- [x] 07-01: Merge mainImage + galleryImages in edit form
- [x] 07-02: Implement drag-to-reorder for images
- [x] 07-03: First image becomes main image
- [x] 07-04: Update image upload handlers
- [x] 07-05: Migrate existing products
- [x] 07-06: Update frontend rendering

### Phase 8: Cross-Device Testing
**Goal**: Validation across devices and browsers
**Plans**: 5 plans

Plans:
- [x] 08-01: Desktop keyboard testing
- [x] 08-02: iPad Safari touch testing
- [x] 08-03: Android Chrome testing
- [x] 08-04: RTL Hebrew layout testing
- [x] 08-05: Performance testing with 200+ products

### Phase 9: Documentation & Cleanup
**Goal**: Document patterns and clean up
**Plans**: 5 plans

Plans:
- [x] 09-01: Document SortableJS patterns
- [x] 09-02: Document command pattern state management
- [x] 09-03: Clean up console.log statements
- [x] 09-04: Update PROJECT.md with decisions
- [x] 09-05: Create MILESTONES.md

</details>

<details>
<summary>✅ v1.2 Test Infrastructure & Critical Coverage (Phases 10-16) - SHIPPED 2026-02-06</summary>

### Phase 10: Test Infrastructure
**Goal**: Testing foundation configured
**Plans**: 3 plans

Plans:
- [x] 10-01: Configure Vitest with mongodb-memory-server
- [x] 10-02: Set up environment guards
- [x] 10-03: Create test utilities and helpers

### Phase 11: Authentication & Authorization Tests
**Goal**: Auth system comprehensively tested
**Plans**: 4 plans

Plans:
- [x] 11-01: JWT lifecycle tests
- [x] 11-02: Password hashing tests
- [x] 11-03: Role-based access control tests
- [x] 11-04: Auth middleware integration tests

### Phase 12: Payment Processing Tests
**Goal**: Payment flows validated
**Plans**: 3 plans

Plans:
- [x] 12-01: PayPal integration tests
- [x] 12-02: Stripe integration tests
- [x] 12-03: Payment error handling tests

### Phase 13: Currency & Exchange Rate Tests
**Goal**: Currency system tested
**Plans**: 3 plans

Plans:
- [x] 13-01: Exchange rate service tests
- [x] 13-02: Cron job scheduling tests
- [x] 13-03: Price recalculation tests

### Phase 14: File Upload & Image Processing Tests
**Goal**: Image handling validated
**Plans**: 4 plans

Plans:
- [x] 14-01: MIME validation tests
- [x] 14-02: Sharp image processing tests
- [x] 14-03: S3 mock integration tests
- [x] 14-04: Dimension limit tests

### Phase 15: Database & Model Tests
**Goal**: Data layer tested
**Plans**: 4 plans

Plans:
- [x] 15-01: Product model CRUD tests
- [x] 15-02: User model tests
- [x] 15-03: Settings model tests
- [x] 15-04: Race condition tests

### Phase 16: Security & Middleware Tests
**Goal**: Security vulnerabilities covered
**Plans**: 4 plans

Plans:
- [x] 16-01: CORS validation tests
- [x] 16-02: Rate limiting tests
- [x] 16-03: XSS/injection exploratory tests
- [x] 16-04: Input validation tests

</details>

### 🚧 v1.3 Frontend Testing (In Progress)

**Milestone Goal:** Complete the testing foundation with comprehensive frontend test coverage for the vanilla JS MVC architecture.

#### Phase 17: Test Infrastructure & Utilities
**Goal**: Frontend testing foundation with Happy-DOM environment and reusable test utilities
**Depends on**: Phase 16
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. Vitest runs frontend tests in browser environment with Happy-DOM
  2. localStorage is cleaned between tests preventing state pollution
  3. Test utilities and factories are available for common scenarios
  4. CI/CD pipeline runs frontend tests on PR and push events
  5. Tests use semantic DOM queries that are resilient to markup changes
**Plans**: 3 plans

Plans:
- [x] 17-01-PLAN.md - Configure Vitest with Happy-DOM environment
- [x] 17-02-PLAN.md - Create test utilities with @testing-library/dom and factories
- [x] 17-03-PLAN.md - Validate infrastructure and verify CI/CD

#### Phase 18: Model Unit Tests
**Goal**: Cart operations and API interactions tested in isolation with mocked dependencies
**Depends on**: Phase 17
**Requirements**: MODEL-01, MODEL-02, MODEL-03, MODEL-04, MODEL-05, MODEL-06, MODEL-07, MODEL-08, MODEL-09, MODEL-10, MODEL-11, MODEL-12, MODEL-13, MODEL-14, MODEL-15, MODEL-16
**Success Criteria** (what must be TRUE):
  1. Cart add/remove/update/clear operations modify state correctly
  2. Cart data persists to localStorage and survives browser restart
  3. Currency conversion calculations are accurate within floating-point tolerance
  4. API calls are properly mocked and network failures are handled gracefully
  5. Malformed localStorage data doesn't crash the cart (corruption handling)
**Plans**: 4 plans

Plans:
- [x] 18-01-PLAN.md - Cart operations tests with fetch and DOM mocks
- [x] 18-02-PLAN.md - localStorage persistence and corruption handling tests
- [x] 18-03-PLAN.md - API mocking and error handling tests
- [x] 18-04-PLAN.md - Currency storage and discount calculation tests

#### Phase 19: Base View Tests
**Goal**: Shared View class functionality validated for language/currency switching and header menu
**Depends on**: Phase 17
**Requirements**: VIEW-01, VIEW-02, VIEW-03, VIEW-04, VIEW-05, VIEW-06, VIEW-07, VIEW-08, VIEW-09, VIEW-10, VIEW-11
**Success Criteria** (what must be TRUE):
  1. Language selector switches between English and Hebrew with RTL layout changes
  2. Currency selector switches between USD and ILS with price recalculation
  3. Header menu renders correctly and updates on navigation
  4. Event listeners are cleaned up on view unmount preventing memory leaks
  5. View base class patterns are established for page-specific views
**Plans**: 4 plans

Plans:
- [x] 19-01-PLAN.md - Language selector and switching tests (VIEW-01 through VIEW-04)
- [x] 19-02-PLAN.md - Currency selector tests (VIEW-05 through VIEW-08)
- [x] 19-03-PLAN.md - Header menu rendering and navigation tests (VIEW-09, VIEW-10)
- [x] 19-04-PLAN.md - Event listener cleanup tests (VIEW-11)

#### Phase 20: Page View Tests
**Goal**: Page-specific views render correctly with accurate data display
**Depends on**: Phase 19
**Requirements**: PAGE-01, PAGE-02, PAGE-03, PAGE-04, PAGE-05, PAGE-06, PAGE-07, PAGE-08, PAGE-09, PAGE-10, PAGE-11, PAGE-12, PAGE-13
**Success Criteria** (what must be TRUE):
  1. Cart view displays items with correct names, quantities, prices, and totals
  2. Product modal renders images, description, price, and triggers cart updates
  3. Checkout view shows payment methods and order summary with correct totals
  4. Categories view filters products correctly and home page shows featured products
  5. Contact form validates required fields before submission
**Plans**: TBD

Plans:
- [ ] 20-01: TBD (cart view tests)
- [ ] 20-02: TBD (product modal tests)
- [ ] 20-03: TBD (checkout and other page views tests)

#### Phase 21: Locale & Currency Tests
**Goal**: Multi-language RTL layouts and multi-currency display validated
**Depends on**: Phase 19
**Requirements**: LOCALE-01, LOCALE-02, LOCALE-03, LOCALE-04, LOCALE-05, LOCALE-06, LOCALE-07, LOCALE-08, LOCALE-09, LOCALE-10, LOCALE-11, LOCALE-12, LOCALE-13, LOCALE-14
**Success Criteria** (what must be TRUE):
  1. RTL layout applies correctly when Hebrew is selected (dir attribute, flex-direction)
  2. Currency symbols display correctly ($ for USD, ₪ for ILS) with proper formatting
  3. Price recalculation updates all cart items when currency switches
  4. Translation text updates when language switches
  5. Locale preferences persist to localStorage and load on page reload
**Plans**: TBD

Plans:
- [ ] 21-01: TBD (RTL layout tests)
- [ ] 21-02: TBD (currency display and conversion tests)
- [ ] 21-03: TBD (translation and GeoIP tests)
- [ ] 21-04: TBD (locale persistence tests)

#### Phase 22: MVC Integration Tests
**Goal**: Full MVC architecture integration validated with controller routing and lifecycle management
**Depends on**: Phase 18, Phase 19, Phase 20
**Requirements**: MVC-01, MVC-02, MVC-03, MVC-04, MVC-05, MVC-06, MVC-07, MVC-08, MVC-09, MVC-10
**Success Criteria** (what must be TRUE):
  1. Controller routes to correct view based on hash fragment changes
  2. Model updates trigger view re-renders (cart, currency, language changes)
  3. View lifecycle methods execute correctly (mount, update, unmount)
  4. Cart state remains consistent during navigation and currency changes mid-checkout
  5. Event listeners are cleaned up on navigation preventing memory leaks
**Plans**: TBD

Plans:
- [ ] 22-01: TBD (controller routing tests)
- [ ] 22-02: TBD (model-view synchronization tests)
- [ ] 22-03: TBD (lifecycle and cleanup tests)
- [ ] 22-04: TBD (integration scenario tests)

## Progress

**Execution Order:**
Phases execute in numeric order: 17 → 18 → 19 → 20 → 21 → 22

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Database & Schema | v1.0 | 3/3 | Complete | 2026-02-01 |
| 2. Admin Dashboard Integration | v1.0 | 1/1 | Complete | 2026-02-01 |
| 3. Frontend Display | v1.0 | 1/1 | Complete | 2026-02-01 |
| 4. Product Preview Modal | v1.1 | 5/5 | Complete | 2026-02-04 |
| 5. Database Schema Migration | v1.1 | 5/5 | Complete | 2026-02-04 |
| 6. Product List Reordering | v1.1 | 7/7 | Complete | 2026-02-04 |
| 7. Image Gallery Unification | v1.1 | 6/6 | Complete | 2026-02-04 |
| 8. Cross-Device Testing | v1.1 | 5/5 | Complete | 2026-02-04 |
| 9. Documentation & Cleanup | v1.1 | 5/5 | Complete | 2026-02-04 |
| 10. Test Infrastructure | v1.2 | 3/3 | Complete | 2026-02-06 |
| 11. Authentication & Authorization Tests | v1.2 | 4/4 | Complete | 2026-02-06 |
| 12. Payment Processing Tests | v1.2 | 3/3 | Complete | 2026-02-06 |
| 13. Currency & Exchange Rate Tests | v1.2 | 3/3 | Complete | 2026-02-06 |
| 14. File Upload & Image Processing Tests | v1.2 | 4/4 | Complete | 2026-02-06 |
| 15. Database & Model Tests | v1.2 | 4/4 | Complete | 2026-02-06 |
| 16. Security & Middleware Tests | v1.2 | 4/4 | Complete | 2026-02-06 |
| 17. Test Infrastructure & Utilities | v1.3 | 3/3 | Complete | 2026-02-08 |
| 18. Model Unit Tests | v1.3 | 4/4 | Complete | 2026-02-08 |
| 19. Base View Tests | v1.3 | 4/4 | Complete | 2026-02-09 |
| 20. Page View Tests | v1.3 | 0/3 | Not started | - |
| 21. Locale & Currency Tests | v1.3 | 0/4 | Not started | - |
| 22. MVC Integration Tests | v1.3 | 0/4 | Not started | - |
