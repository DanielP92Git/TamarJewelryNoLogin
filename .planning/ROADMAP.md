# Roadmap: Tamar Kfir Jewelry

## Milestones

- ✅ **v1.0 SKU Management** — Phases 1-3 (shipped 2026-02-01) — [archive](.planning/milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Admin Product Management UX** — Phases 4-9 (shipped 2026-02-04) — [archive](.planning/milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Test Infrastructure & Critical Coverage** — Phases 10-16 (shipped 2026-02-06) — [archive](.planning/milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Frontend Testing** — Phases 17-22 (shipped 2026-02-09) — [archive](.planning/milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 SEO & Marketing Foundation** — Phases 23-26 (shipped 2026-02-12) — [archive](.planning/milestones/v1.4-ROADMAP.md)
- 🚧 **v1.5 Bilingual Product Content** — Phases 27-32 (in progress)

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

### 🚧 v1.5 Bilingual Product Content (In Progress)

**Milestone Goal:** Enable true bilingual product content with automated Google Cloud Translation, so Hebrew and English visitors each see product names and descriptions in their language.

#### Phase 27: Schema Migration & Foundation
**Goal**: Product database supports bilingual fields with backward compatibility
**Depends on**: Phase 26
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04
**Success Criteria** (what must be TRUE):
  1. Product schema has separate Hebrew and English fields for name and description
  2. Existing products migrated with English data populating name_en/description_en fields
  3. Legacy name/description fields still work for backward compatibility
  4. Cart handles transition from single-language to bilingual product names gracefully
  5. Migration script is idempotent and can run multiple times safely
**Plans**: 2 plans

Plans:
- [ ] 27-01-PLAN.md — Schema update + migration script (bilingual fields, idempotent migration)
- [ ] 27-02-PLAN.md — Backend API compatibility + cart transition handling

#### Phase 28: Translation Service Integration
**Goal**: Backend can translate product content on demand using Google Cloud Translation API
**Depends on**: Phase 27
**Requirements**: TRANS-01, TRANS-02, TRANS-03, TRANS-04, TRANS-05
**Success Criteria** (what must be TRUE):
  1. Translation service integrates Google Cloud Translation API v3 with service account authentication
  2. Backend endpoint (POST /admin/translate) accepts Hebrew or English text and returns translation
  3. Translation results cached in memory to reduce API costs
  4. Translation errors handled gracefully so admin can still save product with manual entry
  5. Bulk operations use batching with delays to respect API rate limits
**Plans**: 2 plans

Plans:
- [ ] 28-01-PLAN.md — Translation cache + service with Google Cloud Translation API v3
- [ ] 28-02-PLAN.md — Admin translation endpoints (single-field + bulk with SSE progress)

#### Phase 29: Admin UI & Translation Workflow
**Goal**: Admin can create and edit bilingual products with automated translation assistance
**Depends on**: Phase 28
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04
**Success Criteria** (what must be TRUE):
  1. Product form shows side-by-side Hebrew and English text fields for name and description
  2. "Translate" button translates content between languages on demand
  3. Admin can manually edit translated text before saving
  4. Product list shows translation status indicators (translated / needs translation)
  5. Form validation clearly indicates which fields are required
**Plans**: 2 plans

Plans:
- [ ] 29-01-PLAN.md — Bilingual form fields with translate buttons (CSS + form UI + translate handler)
- [ ] 29-02-PLAN.md — Backend bilingual field wiring + product list translation badges

#### Phase 30: Frontend Display & SSR Updates
**Goal**: Customers see product content in their language on all pages
**Depends on**: Phase 29
**Requirements**: DISP-01, DISP-02, DISP-03, DISP-04, DISP-05, DISP-06, DISP-07
**Success Criteria** (what must be TRUE):
  1. SSR product pages show correct language name/description based on URL (/en/ or /he/)
  2. SSR category pages show correct language for all product cards
  3. Client-side views display correct language matching SSR logic
  4. Cart displays product names in user's current language
  5. Graceful fallback to English when Hebrew translation is missing
  6. JSON-LD structured data uses language-specific content with inLanguage property
  7. OG meta tags use localized product descriptions for social sharing
**Plans**: TBD

Plans:
- [ ] 30-01: TBD
- [ ] 30-02: TBD
- [ ] 30-03: TBD

#### Phase 31: Cache Invalidation & SEO Polish
**Goal**: Cache system properly handles bilingual content and SEO remains strong
**Depends on**: Phase 30
**Requirements**: CACHE-01, CACHE-02, CACHE-03
**Success Criteria** (what must be TRUE):
  1. Product update clears cached pages for both /en/ and /he/ variants
  2. Bulk translation triggers cache invalidation for all affected products
  3. Category cache cleared when products in that category are translated
  4. Hreflang tags point to pages with actually different content (verified)
  5. Performance testing shows cache hit rate remains high after bilingual changes
**Plans**: TBD

Plans:
- [ ] 31-01: TBD
- [ ] 31-02: TBD

#### Phase 32: Bulk Translation & Migration Tooling
**Goal**: Admin can translate all existing products efficiently in bulk
**Depends on**: Phase 31
**Requirements**: ADMIN-05, ADMIN-06
**Success Criteria** (what must be TRUE):
  1. Bulk translate tool translates multiple products at once without blocking admin UI
  2. Progress indicator shows translation status ("Translating 47/94 products...")
  3. Tool handles API rate limits with batching and delays
  4. Failed translations can be retried without re-translating successful ones
  5. Admin notified when bulk translation completes
**Plans**: TBD

Plans:
- [ ] 32-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 27 → 28 → 29 → 30 → 31 → 32

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-3. SKU Management | v1.0 | Complete | Complete | 2026-02-01 |
| 4-9. Admin UX | v1.1 | Complete | Complete | 2026-02-04 |
| 10-16. Test Infrastructure | v1.2 | Complete | Complete | 2026-02-06 |
| 17-22. Frontend Testing | v1.3 | Complete | Complete | 2026-02-09 |
| 23-26. SEO & Marketing | v1.4 | Complete | Complete | 2026-02-12 |
| 27. Schema Migration | v1.5 | 0/2 | Planned | - |
| 28. Translation Service | v1.5 | 2/2 | Complete | 2026-02-15 |
| 29. Admin UI | v1.5 | Complete    | 2026-02-15 | - |
| 30. Frontend Display | v1.5 | 0/TBD | Not started | - |
| 31. Cache & SEO | v1.5 | 0/TBD | Not started | - |
| 32. Bulk Translation | v1.5 | 0/TBD | Not started | - |

---
*Last updated: 2026-02-15 after Phase 29-01 execution*
