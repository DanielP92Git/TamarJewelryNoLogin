# Tamar Kfir Jewelry - SKU Management

## What This Is

Professional SKU (Stock Keeping Unit) management for an existing handmade jewelry e-commerce platform. Adding proper SKU fields to the admin dashboard and displaying them on the frontend product modals, replacing the current unprofessional practice of embedding SKUs in product descriptions.

## Core Value

Clean, professional product information management that matches real-world e-commerce standards and improves admin workflow efficiency.

## Current Milestone: v1.3 Frontend Testing

**Goal:** Complete the testing foundation with comprehensive frontend test coverage for the vanilla JS MVC architecture.

**Target features:**
- Base View class testing (language/currency selectors, header menu, shared functionality)
- Page-specific view testing (incremental coverage: cart, product modal, checkout, then others)
- Cart state scenario testing (complete user journeys with localStorage sync and multi-currency)
- Locale switching testing (RTL layouts, currency display/conversion, GeoIP detection, translations)
- MVC integration testing (controller routing, model-view sync, API error handling)

## Previous Milestones

**v1.2 Test Infrastructure & Critical Coverage (Shipped: 2026-02-06)**
- 447 tests passing with comprehensive safety net for future development
- Zero test coverage → 80 requirements satisfied with risk-based testing approach
- Critical security vulnerabilities covered (auth, payments, CORS, rate limiting, XSS/injection)
- CI/CD pipeline operational with automated test execution and coverage reporting
- Test infrastructure prevents production contamination through environment guards

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

### Active

<!-- v1.3 Frontend Testing - in progress -->

- [ ] Base View class tests (language/currency selectors, header menu)
- [ ] Page-specific view tests (cart, product modal, checkout views)
- [ ] Cart state scenario tests (localStorage sync, multi-currency calculations)
- [ ] Locale switching tests (RTL layouts, currency display, GeoIP detection, translations)
- [ ] MVC integration tests (controller routing, model-view sync, API error handling)

### Out of Scope

- Auto-generating SKUs for existing products — manual admin entry only
- Advanced SKU formatting rules (prefix/suffix patterns) — freeform text entry
- SKU-based search or filtering — defer to future enhancement
- Barcode generation from SKUs — not needed for digital jewelry sales
- SKU history or versioning — simple current value only

## Context

**Current State (v1.2 Shipped):**
- v1.0 (2026-02-01): SKU Management with ~869 LOC across 3 phases
- v1.1 (2026-02-04): Admin Product Management UX with 6 phases, 33 plans
- v1.2 (2026-02-06): Test Infrastructure & Critical Coverage with 7 phases, 25 plans, 447 tests
- Production e-commerce platform handling payments (PayPal & Stripe)
- ~94 products in catalog with multi-image support
- Comprehensive test coverage for critical paths (auth, payments, currency, files, data, security)
- Safety net established for future refactoring and feature development

**Technical Environment:**
- MVC frontend architecture (Vanilla JS, Parcel bundler)
- Express/Node.js monolithic backend (3,662 lines in single file)
- MongoDB with Mongoose ODM
- Multi-language support (English/Hebrew with RTL)
- Admin dashboard with product management, drag-and-drop reordering
- Payment integrations: PayPal SDK, Stripe API
- Image processing: Sharp library with DigitalOcean Spaces (S3-compatible)
- Currency service: Scheduled exchange rate updates (USD/ILS)

**Known Issues/Tech Debt:**
- Monolithic backend remains (3,662 lines) - refactoring deferred to future
- 147+ console.log statements not conditional on environment
- Incomplete error handling in catch blocks (silent failures)
- Input validation documented but not sanitized (exploratory testing approach)
- No structured logging (console.log/error scattered throughout)
- No audit logging for admin actions
- Frontend testing in progress (v1.3 milestone)
- Payment sandbox integration deferred to future (real API testing with test mode)

## Constraints

- **Tech Stack**: Vanilla JavaScript frontend (no React/Vue) — must work with existing View pattern
- **Database**: MongoDB with Mongoose — schema changes must handle existing products gracefully
- **Multi-language**: SKU label must support English/Hebrew translations — use existing language switching pattern
- **Uniqueness**: Database-level unique constraint on SKU field — prevent duplicates server-side
- **Backwards Compatibility**: Existing products without SKUs must continue to work — SKU is optional for existing data, required for new

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

---
*Last updated: 2026-02-06 after starting v1.3 milestone*
