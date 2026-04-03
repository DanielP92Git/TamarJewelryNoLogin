# Tamar Kfir Jewelry - E-commerce Platform

## What This Is

Handmade jewelry e-commerce platform with professional product management, comprehensive testing, full SEO foundation, and bilingual product content. The store serves both English and Hebrew-speaking customers with server-side rendered pages, clean bilingual URLs, structured data for search engines, automated Google Cloud Translation for product content, and integrated payment processing (PayPal & Stripe).

## Core Value

A discoverable, professional online jewelry store that ranks in search engines, looks great when shared on social platforms, and converts visitors into customers — with true bilingual content so Hebrew and English visitors each see products in their language.

## Previous Milestones

**v1.5 Bilingual Product Content (Shipped: 2026-02-17)**
- Bilingual product schema with separate Hebrew/English fields and runtime normalization for backward compatibility
- Google Cloud Translation API v3 integration with in-memory caching and graceful error handling
- Admin bilingual forms with side-by-side layout, bidirectional translate buttons, and translation status badges
- SSR + client-side bilingual display with fallback chain (he > en > legacy) and JSON-LD inLanguage
- Conditional hreflang and sitemap filtering — only translated products get Hebrew alternate URLs
- Bulk translation tool with SSE progress streaming, cancel/retry, and automatic cache invalidation
- 24/25 requirements satisfied (SCHEMA-02 accepted as tech debt — runtime normalization covers functionality)

**v1.4 SEO & Marketing Foundation (Shipped: 2026-02-12)**
- Server-side rendering for all pages (home, categories, products, static pages) with EJS templates
- Clean bilingual URLs (/en/, /he/) with GeoIP-based language detection and legacy .html redirects
- Complete SEO metadata: unique titles, descriptions, canonical URLs, OG/Twitter cards, hreflang on every page
- JSON-LD structured data (Product, BreadcrumbList, Organization) for Google rich results
- Dynamic XML sitemap with hreflang alternates, image entries, and accurate lastmod dates
- In-memory page caching with cache invalidation, HTTP cache headers, and sub-50ms cached TTFB
- Deployment merged to single DigitalOcean App Platform service
- 866 tests passing with zero regressions

**v1.3 Frontend Testing (Shipped: 2026-02-09)**
- 419 tests passing (104 new frontend tests + 315 backend tests)
- Complete MVC test coverage: model, views, controller, locale switching, user journeys
- Happy-DOM testing infrastructure (2-3x faster than jsdom)
- All 60 v1.3 requirements satisfied with 100% traceability
- 2 bugs discovered and fixed through testing (CartView currency calculation, cart number rendering)

**v1.2 Test Infrastructure & Critical Coverage (Shipped: 2026-02-06)**
- 447 tests passing with comprehensive safety net for future development
- Zero test coverage to 80 requirements satisfied with risk-based testing approach
- Critical security vulnerabilities covered (auth, payments, CORS, rate limiting, XSS/injection)
- CI/CD pipeline operational with automated test execution and coverage reporting

## Requirements

### Validated

<!-- Existing capabilities from current codebase -->

- ✓ E-commerce product catalog with categories (bracelets, necklaces, earrings, etc.) — existing
- ✓ Multi-language support (English/Hebrew with RTL) — existing
- ✓ Multi-currency support (USD/ILS with automatic exchange rates) — existing
- ✓ Shopping cart with localStorage and server-side persistence — existing
- ✓ Admin dashboard for product management (create, edit, delete) — existing
- ✓ Payment processing (PayPal and Stripe integration) — existing
- ✓ Image upload and CDN storage (DigitalOcean Spaces) — existing
- ✓ User authentication with JWT and role-based access control — existing
- ✓ GeoIP-based locale detection with client-side overrides — existing
- ✓ Responsive design with 800px breakpoint (desktop/mobile) — existing

<!-- v1.0 SKU Management - shipped 2026-02-01 -->

- ✓ Add SKU field to Product MongoDB schema — v1.0
- ✓ Add SKU input field to admin "Add Product" page — v1.0
- ✓ Add SKU input field to admin "Edit Product" page — v1.0
- ✓ Validate SKU uniqueness across all products — v1.0 (database + API + client-side)
- ✓ Require SKU for new products (but allow existing products to have empty SKU) — v1.0
- ✓ Display SKU on frontend product modal as small text with "SKU:" label — v1.0
- ✓ Position SKU at bottom of description container (following UI best practices) — v1.0
- ✓ Handle SKU display for products without SKUs (hide label if empty) — v1.0

<!-- v1.1 Admin Product Management UX - shipped 2026-02-04 -->

- ✓ Product preview modal opens when clicking product row in admin list — v1.1
- ✓ Modal displays customer-facing product view (images, description, price, SKU) — v1.1
- ✓ Modal includes "Edit" button to navigate to edit page — v1.1
- ✓ Modal closes on ESC or click outside — v1.1
- ✓ Drag-and-drop reordering of products within each category — v1.1
- ✓ Product display order persists per-category (bracelets order ≠ necklaces order) — v1.1
- ✓ "Save Order" button to commit reordering changes — v1.1
- ✓ New products default to creation date order — v1.1
- ✓ Merge main image + gallery images into single sortable gallery in edit form — v1.1
- ✓ First image in gallery becomes the main product image — v1.1
- ✓ Drag image to position 1 to set as new main image — v1.1
- ✓ Drag-and-drop interface follows UX best practices — v1.1

<!-- v1.2 Test Infrastructure & Critical Coverage - shipped 2026-02-06 -->

- ✓ Test infrastructure configured (Vitest setup for backend and frontend) — v1.2
- ✓ Authentication tests cover JWT generation, validation, and expiration — v1.2
- ✓ Authentication tests cover role-based access control (admin vs regular user) — v1.2
- ✓ Payment tests cover PayPal order creation, approval, and capture flows — v1.2
- ✓ Payment tests cover Stripe payment intent creation and confirmation — v1.2
- ✓ Payment tests cover refund and error handling scenarios — v1.2
- ✓ Currency conversion tests cover exchange rate updates and USD/ILS calculations — v1.2
- ✓ File upload tests cover image validation, size limits, and malformed files — v1.2
- ✓ File upload tests cover Sharp image processing and DigitalOcean Spaces integration — v1.2
- ✓ CORS tests validate allowed origins per environment (production vs development) — v1.2
- ✓ Security header tests validate rate limiting on critical endpoints — v1.2
- ✓ Database connection tests cover reconnection and timeout scenarios — v1.2
- ✓ Frontend MVC tests cover model/view synchronization and API error handling — v1.2 (deferred to v1.3)
- ✓ Locale detection tests cover GeoIP-based detection and fallback logic — v1.2 (not applicable, working as designed)

<!-- v1.3 Frontend Testing - shipped 2026-02-09 -->

- ✓ Frontend testing infrastructure with Happy-DOM and @testing-library/dom — v1.3
- ✓ Model layer tests (cart operations, localStorage, API mocking, currency) — v1.3
- ✓ Base View class tests (language/currency selectors, header menu, event cleanup) — v1.3
- ✓ Page-specific view tests (cart, product modal, checkout, categories, home, contact) — v1.3
- ✓ Locale switching tests (RTL layouts, currency display, GeoIP detection, bidirectional text) — v1.3
- ✓ MVC integration tests (controller routing, model-view sync, view lifecycle, user journeys) — v1.3

<!-- v1.4 SEO & Marketing Foundation - shipped 2026-02-12 -->

- ✓ Server-side rendering for key pages (product, category, home, static pages) — v1.4
- ✓ Clean URL structure with real paths instead of hash routing — v1.4
- ✓ Dynamic meta tags per page (title, description, canonical) — v1.4
- ✓ Open Graph tags for social preview cards — v1.4
- ✓ JSON-LD structured data (Product, BreadcrumbList, Organization) for rich results — v1.4
- ✓ XML sitemap auto-generation with hreflang and image entries — v1.4
- ✓ Bilingual SEO with hreflang tags — v1.4
- ✓ Robots.txt configuration — v1.4

<!-- v1.5 Bilingual Product Content - shipped 2026-02-17 -->

- ✓ Bilingual product schema (separate Hebrew/English fields for name and description) — v1.5
- ✓ Admin form with Hebrew/English text areas and on-demand "Translate" button — v1.5
- ✓ Google Cloud Translation API integration for Hebrew ↔ English translation — v1.5
- ✓ Frontend/SSR language-aware display (correct language based on /en/ or /he/ URL) — v1.5
- ✓ Bulk translate tool for existing products (English → Hebrew) — v1.5
- ✓ Data migration (runtime normalization as functional equivalent) — v1.5 (tech debt: migration script exists but not executed)

## Current Milestone: v1.6 MongoDB Backup & Recovery System

**Goal:** Prevent permanent data loss with automated off-region backups and quick recovery capability (RTO < 2 hours).

**Target features:**
- Daily automated MongoDB backup (mongodump + gzip)
- Manual backup trigger capability
- Cloud storage upload (outside primary region)
- Database restore from backup (mongorestore)
- Backup success/failure logging
- Retention policy (auto-delete old backups, keep last 7-14)

### Active

- [ ] Automated daily MongoDB backup
- [ ] Manual backup trigger
- [ ] Cloud storage upload (off-region)
- [ ] Database restore capability
- [ ] Backup logging (success/failure)
- [ ] Retention policy with auto-cleanup

### Out of Scope

- Auto-generating SKUs for existing products — manual admin entry only
- Advanced SKU formatting rules (prefix/suffix patterns) — freeform text entry
- SKU-based search or filtering — defer to future enhancement
- Barcode generation from SKUs — not needed for digital jewelry sales
- SKU history or versioning — simple current value only
- Full framework migration (Next.js/Nuxt) — EJS on Express achieves SSR without rewriting the entire frontend
- AI-generated product descriptions — handmade jewelry needs authentic artisan descriptions (note: translation is different from generation — v1.5 uses Google Translate for existing admin-written content)
- Complex analytics setup (GA4, GTM, Facebook Pixel) — Microsoft Clarity already integrated
- Real-time translation during typing — wastes API quota, admin should write first then translate
- Auto-translate without admin review — machine translation always needs human review for quality
- Language-specific slugs (/he/product/hebrew-slug) — English-only slugs simpler for routing
- Client-side translation (browser-side API calls) — security risk exposing API credentials

## Context

**Current State (v1.5 Shipped):**
- v1.0 (2026-02-01): SKU Management with ~869 LOC across 3 phases
- v1.1 (2026-02-04): Admin Product Management UX with 6 phases, 33 plans
- v1.2 (2026-02-06): Test Infrastructure & Critical Coverage with 7 phases, 25 plans, 447 tests
- v1.3 (2026-02-09): Frontend Testing with 6 phases, 20 plans, 104 new tests (419 total)
- v1.4 (2026-02-12): SEO & Marketing Foundation with 4 phases, 18 plans, 49 requirements
- v1.5 (2026-02-17): Bilingual Product Content with 6 phases, 12 plans, 25 requirements
- Production e-commerce platform handling payments (PayPal & Stripe)
- ~94 products in catalog with multi-image support
- 866 tests passing (comprehensive backend + frontend coverage)
- Full SSR with EJS templates, bilingual URLs, structured data, XML sitemap
- Google Cloud Translation API integration for bilingual product content
- Admin bilingual forms with translate buttons and bulk translation tool

**Technical Environment:**
- MVC frontend architecture (Vanilla JS, Parcel bundler) — progressive enhancement over SSR
- Express/Node.js backend with EJS server-side rendering
- MongoDB with Mongoose ODM
- Multi-language support (English/Hebrew with RTL) via bilingual URL routing (/en/, /he/)
- Bilingual product content with separate Hebrew/English fields and language-aware fallback chains
- Admin dashboard with product management, drag-and-drop reordering, translation workflow
- Payment integrations: PayPal SDK, Stripe API
- Image processing: Sharp library with DigitalOcean Spaces (S3-compatible)
- Currency service: Scheduled exchange rate updates (USD/ILS)
- Translation service: Google Cloud Translation API v3 with in-memory caching
- In-memory page caching (node-cache) with cache invalidation and conditional hreflang
- Deployed on DigitalOcean (App Platform) — single unified Express service

**Known Issues/Tech Debt:**
- Monolithic backend remains (large single file) — refactoring deferred to future
- 147+ console.log statements not conditional on environment
- Incomplete error handling in catch blocks (silent failures)
- Input validation documented but not sanitized (exploratory testing approach)
- No structured logging (console.log/error scattered throughout)
- No audit logging for admin actions
- Currency-changed event handler bug (calls non-existent this._render() method)
- Payment sandbox integration deferred to future (real API testing with test mode)
- Product slugs not populated in production database (migration script exists, needs manual run)
- Payment return URLs hardcoded to old paths (update needed)
- CRAWL-07 partial: Google Search Console requires post-deployment manual setup
- robots.txt missing Sitemap: directive (minor SEO best practice)
- SCHEMA-02: Migration script not executed (runtime normalization covers functionality)
- normalizeProductForClient performance overhead (field copy on every API response)

## Constraints

- **Tech Stack**: Vanilla JavaScript frontend (no React/Vue) — must work with existing View pattern
- **Database**: MongoDB with Mongoose — schema changes must handle existing products gracefully
- **Multi-language**: All content must support English/Hebrew — use existing bilingual URL pattern
- **Backwards Compatibility**: Existing bookmarks and admin URLs must continue to work — redirects where needed
- **Deployment**: DigitalOcean (App Platform) — single Express service serving pages + API
- **Performance**: SSR pages cached with sub-50ms TTFB — maintain this baseline

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SKU required for new products only | Avoids forcing admin to retroactively add SKUs to entire catalog | ✓ Good - backwards compatibility maintained |
| Sparse unique index for SKU | Allows existing products without SKU while preventing duplicates when present | ✓ Good - enables phased rollout |
| Auto-uppercase and trim SKU | Prevents accidental duplicates from different casing/whitespace | ✓ Good - no case conflicts reported |
| User-friendly duplicate errors | Shows conflicting product name to help admin identify issue | ✓ Good - clear error messages |
| Display as "SKU: ABC123" format | Matches professional e-commerce conventions (Amazon, Shopify, etc.) | ✓ Good - professional appearance |
| Position at bottom of description | Keeps SKU visible but secondary to product name/description/price | ✓ Good - follows UI best practices |
| Real-time duplicate validation API | Provides instant feedback before form submission | ✓ Good - better UX than submit-only validation |
| Clipboard API for copy-to-clipboard | Modern approach with error handling vs deprecated execCommand | ✓ Good - works across browsers |
| SKU value always LTR in RTL mode | Product codes are identifiers, not translatable text | ✓ Good - prevents reversal confusion |
| EJS as SSR template engine | Existing HTML renamed to .ejs with zero syntax translation needed | ✓ Good - minimal migration effort |
| Bilingual URLs (/en/, /he/) | Language determined by URL path for SEO, not client-side detection | ✓ Good - clean crawlable URLs |
| English slugs for both languages | Global SEO reach with consistent URL identifiers | ✓ Good - avoids transliteration complexity |
| Immutable slugs after creation | Preserves SEO authority and backlinks | ✓ Good - prevents broken links |
| Progressive enhancement SSR | Server renders complete HTML, client-side JS enhances interactivity | ✓ Good - works with/without JS |
| Deployment merge to single service | One Express process serves pages + API (was 2 components) | ✓ Good - simplified deployment |
| node-cache for in-memory caching | Single-server deployment, no Redis needed | ✓ Good - sub-50ms cached TTFB |
| Cache invalidation on product changes | Admin edits immediately visible to next visitor | ✓ Good - no stale content |
| data-ssr flag for client detection | Client JS skips re-fetch/re-render of SSR content | ✓ Good - prevents content flashing |
| Google Cloud Translation API v3 | Purpose-built for translation, free tier, simple service account auth | ✓ Good - reliable, cost-effective |
| Bilingual schema (separate fields per language) | Cleaner than embedded objects, explicit, easy to query per language | ✓ Good - straightforward schema |
| Runtime normalization instead of migration | normalizeProductForClient populates bilingual fields on every API response | ⚠️ Revisit - works but adds overhead |
| Bilingual fields default: '' (not required) | Avoids breaking existing product creation until migration runs | ✓ Good - backward compatible |
| Legacy name/description fields unchanged | Required fields remain for backward compatibility through v1.5+ | ✓ Good - zero breakage |
| CSS grid (1fr auto 1fr) for bilingual layout | Clear language separation in admin forms | ✓ Good - clean responsive layout |
| Bidirectional translate buttons (→ ←) | Admin controls translation direction explicitly | ✓ Good - intuitive UX |
| Overwrite confirmation for translations | Prevents accidental loss of manually edited translations | ✓ Good - safe workflow |
| Fallback chain: he > en > legacy | Graceful degradation when translations missing | ✓ Good - no blank content |
| Conditional hreflang per product | Only translated products get Hebrew alternate URLs | ✓ Good - accurate SEO signals |
| Sitemap excludes untranslated /he/ URLs | Prevents indexing pages with English fallback content | ✓ Good - clean sitemap |
| Query param auth for EventSource | SSE API cannot send headers; JWT validated from URL param | ✓ Good - works with browser limitations |
| SSE for bulk translation progress | Real-time streaming vs polling; cancel/retry support | ✓ Good - responsive admin UX |
| textContent for product names | XSS-safe rendering of server-provided content | ✓ Good - security best practice |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-04 after v1.6 milestone started*
