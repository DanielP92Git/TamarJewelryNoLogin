# Roadmap: Tamar Kfir Jewelry

## Milestones

- ✅ **v1.0 SKU Management** — Phases 1-3 (shipped 2026-02-01) — [archive](.planning/milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Admin Product Management UX** — Phases 4-9 (shipped 2026-02-04) — [archive](.planning/milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Test Infrastructure & Critical Coverage** — Phases 10-16 (shipped 2026-02-06) — [archive](.planning/milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Frontend Testing** — Phases 17-22 (shipped 2026-02-09) — [archive](.planning/milestones/v1.3-ROADMAP.md)
- 🚧 **v1.4 SEO & Marketing Foundation** — Phases 23-26 (in progress)

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

### v1.4 SEO & Marketing Foundation (In Progress)

**Milestone Goal:** Make the store discoverable by search engines and shareable on social platforms through server-side rendering, structured data, clean URLs, and bilingual SEO.

- [ ] **Phase 23: Foundation & Infrastructure** — EJS engine, slug system, bilingual routing, legacy redirects, robots.txt
- [ ] **Phase 24: Static Page SSR + Meta Tags + Deployment Merge** — Home/about/contact SSR, meta/OG tags, hreflang, Organization schema, deployment unification
- [ ] **Phase 25: Dynamic SSR + Structured Data + Sitemap** — Category pages, product detail pages (new), client-side SSR awareness, Product/Breadcrumb schema, XML sitemap
- [ ] **Phase 26: Caching, Performance & Verification** — SSR cache layer, HTTP cache headers, Google Search Console, structured data validation, test regression

## Phase Details

### Phase 23: Foundation & Infrastructure
**Goal**: Express server is configured for SSR with EJS templates, product slugs exist for URL generation, bilingual URL routing is operational, legacy paths redirect correctly, and crawlers receive proper directives
**Depends on**: Phase 22 (v1.3 complete, 419 tests passing)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, URL-05, URL-06, LANG-01, CRAWL-01
**Success Criteria** (what must be TRUE):
  1. Visiting `/en/test` or `/he/test` serves an EJS-rendered page with correct `lang` and `dir` HTML attributes for the language in the URL
  2. Every product in MongoDB has a unique slug field, and the slug migration script can be re-run safely (idempotent)
  3. Visiting any old `.html` path (e.g., `/html/categories/necklaces.html`) returns a 301 redirect to the corresponding new clean URL
  4. Visiting `/` redirects to `/en` or `/he` based on GeoIP or browser Accept-Language
  5. `robots.txt` is served at the site root with appropriate Allow/Disallow rules
**Plans**: 5 plans

Plans:
- [ ] 23-01-PLAN.md — EJS view engine setup and test page
- [ ] 23-02-PLAN.md — Product slug schema and migration
- [ ] 23-03-PLAN.md — Bilingual routing middleware and language detection
- [ ] 23-04-PLAN.md — Legacy URL redirect middleware
- [ ] 23-05-PLAN.md — Static asset serving and robots.txt

### Phase 24: Static Page SSR + Meta Tags + Deployment Merge
**Goal**: Static pages and the home page render complete HTML from the server with full SEO metadata, the deployment is unified into a single Express service, and every served page has unique title, meta description, canonical URL, Open Graph tags, and hreflang alternates
**Depends on**: Phase 23
**Requirements**: INFRA-06, SSR-01, SSR-04, SSR-05, URL-03, URL-04, LANG-02, LANG-03, LANG-04, LANG-05, META-01, META-02, META-03, META-04, META-05, META-07, SCHEMA-04
**Success Criteria** (what must be TRUE):
  1. Visiting `/en/about`, `/he/about`, `/en/contact`, `/he/contact`, `/en`, and `/he` returns fully-rendered HTML with visible page content (no empty containers waiting for JS)
  2. Viewing page source on any served page shows a unique `<title>`, `<meta name="description">`, `<link rel="canonical">`, Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`), Twitter Card tags, and hreflang alternate links (including `x-default`)
  3. The home page source contains Organization JSON-LD structured data with name, logo, and contact information
  4. The SSR-rendered HTML structure matches what the existing client-side JS produces, and the page functions identically with JavaScript enabled or disabled for static content
  5. The application runs as a single DigitalOcean App Platform service (no separate static site component), serving both pages and API from one Express process
**Plans**: TBD

### Phase 25: Dynamic SSR + Structured Data + Sitemap
**Goal**: Category pages render with pre-populated product grids, individual product detail pages exist as a new feature with dedicated URLs, all product-related pages carry Product and BreadcrumbList structured data, and a dynamic XML sitemap covers the entire public site in both languages
**Depends on**: Phase 24
**Requirements**: SSR-02, SSR-03, SSR-06, SSR-07, URL-01, URL-02, META-06, SCHEMA-01, SCHEMA-02, SCHEMA-03, CRAWL-02, CRAWL-03, CRAWL-04, CRAWL-05, CRAWL-06
**Success Criteria** (what must be TRUE):
  1. Visiting `/en/necklaces` returns a fully-rendered page with product names, images, prices, and descriptions visible in the HTML source (not injected by JavaScript)
  2. Visiting `/en/product/gold-star-necklace` (or any valid slug) returns a dedicated product detail page with full product information, and the page source includes Product JSON-LD structured data with name, image, description, SKU, and price/currency/availability
  3. Client-side JavaScript detects SSR-rendered content via `data-ssr` flag and does not re-fetch or re-render the already-present product data, preventing content flashing
  4. `/sitemap.xml` returns a valid XML sitemap listing all public pages (home, categories, products, static pages) in both English and Hebrew, with hreflang alternates, image entries, and `lastmod` dates reflecting actual content update times
  5. Category and product pages include BreadcrumbList JSON-LD structured data showing the navigation hierarchy (Home > Category > Product)
**Plans**: TBD

### Phase 26: Caching, Performance & Verification
**Goal**: SSR pages serve fast through an in-memory cache layer, HTTP cache headers optimize repeat visits, Google Search Console is verified with sitemap submitted, all structured data passes validation, and the existing test suite confirms zero regression
**Depends on**: Phase 25
**Requirements**: INFRA-07, INFRA-08, SCHEMA-05, CRAWL-07, PERF-01, PERF-02, PERF-03, PERF-04
**Success Criteria** (what must be TRUE):
  1. Cached SSR pages serve with TTFB under 500ms, and uncached pages serve within 2 seconds, with cache keys distinguishing between language and currency combinations
  2. Editing or creating a product in the admin dashboard invalidates the relevant cached pages, so the next visitor sees updated content without waiting for TTL expiry
  3. All Product and Organization structured data on the live site passes the Google Rich Results Test with zero errors
  4. Google Search Console is verified, the sitemap is submitted and shows indexed pages, and the URL Inspection tool confirms SSR pages are crawlable
  5. The full test suite (419+ tests) passes with zero regressions after all SSR changes
**Plans**: TBD

## Progress

**Execution Order:** Phase 23 → 24 → 25 → 26

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 23. Foundation & Infrastructure | v1.4 | 0/5 | Not started | - |
| 24. Static Page SSR + Meta + Deploy | v1.4 | 0/TBD | Not started | - |
| 25. Dynamic SSR + Schema + Sitemap | v1.4 | 0/TBD | Not started | - |
| 26. Caching, Perf & Verification | v1.4 | 0/TBD | Not started | - |
