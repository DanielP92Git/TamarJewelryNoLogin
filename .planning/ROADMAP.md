# Roadmap: Tamar Kfir Jewelry

## Milestones

- ✅ **v1.0 SKU Management** — Phases 1-3 (shipped 2026-02-01) — [archive](.planning/milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Admin Product Management UX** — Phases 4-9 (shipped 2026-02-04) — [archive](.planning/milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Test Infrastructure & Critical Coverage** — Phases 10-16 (shipped 2026-02-06) — [archive](.planning/milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Frontend Testing** — Phases 17-22 (shipped 2026-02-09) — [archive](.planning/milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 SEO & Marketing Foundation** — Phases 23-26 (shipped 2026-02-12) — [archive](.planning/milestones/v1.4-ROADMAP.md)

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

<details>
<summary>✅ v1.3 Frontend Testing (Phases 17-22) — SHIPPED 2026-02-09</summary>

- [x] Phase 17: Test Infrastructure & Utilities (3/3 plans) — completed 2026-02-08
- [x] Phase 18: Model Unit Tests (4/4 plans) — completed 2026-02-08
- [x] Phase 19: Base View Tests (4/4 plans) — completed 2026-02-09
- [x] Phase 20: Page View Tests (3/3 plans) — completed 2026-02-09
- [x] Phase 21: Locale & Currency Tests (2/2 plans) — completed 2026-02-09
- [x] Phase 22: MVC Integration Tests (4/4 plans) — completed 2026-02-09

See [v1.3-ROADMAP.md](.planning/milestones/v1.3-ROADMAP.md) for full phase details.

</details>

<details>
<summary>✅ v1.4 SEO & Marketing Foundation (Phases 23-26) — SHIPPED 2026-02-12</summary>

- [x] Phase 23: Foundation & Infrastructure (5/5 plans) — completed 2026-02-10
- [x] Phase 24: Static Page SSR + Meta Tags + Deployment Merge (5/5 plans) — completed 2026-02-11
- [x] Phase 25: Dynamic SSR + Structured Data + Sitemap (4/4 plans) — completed 2026-02-11
- [x] Phase 26: Caching, Performance & Verification (4/4 plans) — completed 2026-02-12

See [v1.4-ROADMAP.md](.planning/milestones/v1.4-ROADMAP.md) for full phase details.

</details>
