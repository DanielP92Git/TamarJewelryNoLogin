# Roadmap: Tamar Kfir Jewelry - Admin Product Management UX

## Milestones

- v1.0 SKU Management - Phases 1-3 (shipped 2026-02-01)
- v1.1 Admin Product Management UX - Phases 4-9 (shipped 2026-02-04)
- v1.2 Test Infrastructure & Critical Coverage - Phases 10-16 (in progress)

## Overview

Enhance admin product management workflow with modern UX patterns for viewing, ordering, and organizing products. The roadmap progresses from backend schema foundations through drag-and-drop product reordering, image gallery unification, product preview modals, and comprehensive testing. Each phase delivers independently verifiable capabilities that build toward a professional admin experience matching industry standards from Shopify and WooCommerce.

## Phases

**Phase Numbering:**
- Integer phases (4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16): Planned milestone work
- Decimal phases (e.g., 4.1, 4.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>v1.0 SKU Management (Phases 1-3) - SHIPPED 2026-02-01</summary>

### Phase 1: Schema & Validation Foundation
**Goal**: Establish SKU database schema and validation infrastructure
**Plans**: 1 plan

Plans:
- [x] 01-01: Database schema, sparse index, validation API

### Phase 2: Admin Forms & Workflow
**Goal**: Enable admin to add/edit products with SKU validation
**Plans**: 2 plans

Plans:
- [x] 02-01: Add Product form with SKU field and validation
- [x] 02-02: Edit Product form and product listing enhancements

### Phase 3: Customer Display
**Goal**: Display SKU professionally on customer-facing product modals
**Plans**: 2 plans

Plans:
- [x] 03-01: SKU display on product modals with copy-to-clipboard
- [x] 03-02: Multi-language support and RTL handling

</details>

<details>
<summary>v1.1 Admin Product Management UX (Phases 4-9) - SHIPPED 2026-02-04</summary>

### Phase 4: Schema Foundation & Library Setup
**Goal**: Establish database schema for ordering and install drag-and-drop infrastructure
**Depends on**: Phase 3 (v1.0 complete)
**Requirements**: FOUND-01, FOUND-02, FOUND-03
**Success Criteria** (what must be TRUE):
  1. Every product has a displayOrder integer field with default values assigned
  2. Products can be queried efficiently in sorted order per category
  3. SortableJS library is installed and verified working in admin environment
  4. Z-index CSS variable scale prevents modal/drag conflicts
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md — Backend migration infrastructure and displayOrder schema
- [x] 04-02-PLAN.md — SortableJS library and z-index CSS variables
- [x] 04-03-PLAN.md — Gap closure: compound index declaration and query sorting

### Phase 5: Product Ordering Backend
**Goal**: API endpoint for batch product reordering with concurrency protection
**Depends on**: Phase 4
**Requirements**: FOUND-04
**Success Criteria** (what must be TRUE):
  1. Admin can submit new product order via API and changes persist
  2. Concurrent reorder attempts by multiple admins are handled safely (no duplicate positions)
  3. API validates category scope (only products in same category reorder)
  4. Invalid reorder requests return clear error messages
**Plans**: 1 plan

Plans:
- [x] 05-01-PLAN.md — Reorder API endpoint with validation and concurrency control

### Phase 6: Frontend Product Reordering
**Goal**: Drag-and-drop product reordering interface in admin product list
**Depends on**: Phase 5
**Requirements**: ORDER-01, ORDER-02, ORDER-03, ORDER-04, ORDER-05, ORDER-06, ORDER-07, ORDER-08, ORDER-09, ORDER-10, ORDER-11
**Success Criteria** (what must be TRUE):
  1. Admin can drag product rows to new positions within category using visible drag handles
  2. Visual feedback shows drag state (ghost preview, drop zones, loading states)
  3. Admin can save reordered list or cancel to revert changes
  4. Customer-facing product displays reflect admin-defined order
  5. Admin can undo/redo order changes before saving
  6. Failed saves show user-friendly error messages and rollback to previous order
**Plans**: 4 plans

Plans:
- [x] 06-01-PLAN.md — Reorder mode UI with toast notifications, action bar, and drag handles
- [x] 06-02-PLAN.md — SortableJS integration with command pattern undo/redo
- [x] 06-03-PLAN.md — API integration, loading states, 409 conflict handling, beforeunload
- [x] 06-04-PLAN.md — Human verification of complete reorder feature

### Phase 7: Image Array Migration
**Goal**: Unify mainImage and galleryImages into single sortable images array
**Depends on**: Phase 4
**Requirements**: FOUND-05, FOUND-06, IMAGE-01, IMAGE-02
**Success Criteria** (what must be TRUE):
  1. Product schema includes unified images array field
  2. All existing products migrated from old schema to images array without data loss
  3. First image in array automatically serves as main/featured image
  4. Frontend displays products correctly using new schema with fallback for legacy data
  5. Migration script includes rollback capability and dry-run mode
**Plans**: 5 plans

Plans:
- [x] 07-01-PLAN.md — Migration infrastructure with dry-run audit and rollback
- [x] 07-02-PLAN.md — Execute migration and update Product schema
- [x] 07-03-PLAN.md — Backend API compatibility layer for images array
- [x] 07-04-PLAN.md — Frontend update to use images array
- [x] 07-05-PLAN.md — Human verification of complete migration

### Phase 8: Modal Integration & Image Reordering
**Goal**: Product preview modal with drag-and-drop image gallery management
**Depends on**: Phases 6, 7
**Requirements**: MODAL-01, MODAL-02, MODAL-03, MODAL-04, MODAL-05, MODAL-06, MODAL-07, MODAL-08, MODAL-09, IMAGE-03, IMAGE-04, IMAGE-05, IMAGE-06, IMAGE-07, IMAGE-08
**Success Criteria** (what must be TRUE):
  1. Admin can click product row to open customer-facing preview modal
  2. Modal shows product exactly as customers see it (images, description, price, SKU)
  3. Modal includes Edit button that navigates to edit page, plus quick actions (Delete, Duplicate)
  4. Modal closes via X button, ESC key, or clicking backdrop
  5. Admin can drag image thumbnails within modal to reorder gallery
  6. First image in gallery is visually indicated as main product image
  7. Modal is keyboard-accessible with focus trap and screen reader labels
  8. Image order changes save when product form is submitted
**Plans**: 5 plans

Plans:
- [x] 08-01-PLAN.md — Modal infrastructure with native dialog, CSS, click handlers
- [x] 08-02-PLAN.md — Modal action buttons (Edit, Delete, Duplicate)
- [x] 08-03-PLAN.md — Image gallery sortable in edit form with SortableJS
- [x] 08-04-PLAN.md — Image order persistence and delete functionality
- [x] 08-05-PLAN.md — Human verification of modal and image reordering

### Phase 9: Testing & Polish
**Goal**: Validate all features across devices, languages, and edge cases
**Depends on**: Phase 8
**Requirements**: All v1.1 requirements
**Success Criteria** (what must be TRUE):
  1. Product reordering works on touch devices (iPad Safari, Android Chrome)
  2. Drag-and-drop functions correctly in RTL Hebrew admin interface
  3. Multiple admins reordering simultaneously produces no data corruption
  4. Memory leak testing passes (20+ page navigations without heap growth)
  5. Product lists with 200+ items perform acceptably during drag operations
  6. All keyboard accessibility requirements met (reordering without mouse)
**Plans**: 5 plans

Plans:
- [x] 09-01-PLAN.md — Desktop testing: keyboard accessibility, memory leaks, concurrent admin
- [x] 09-02-PLAN.md — Touch device testing: iPad Safari, Android Chrome
- [x] 09-03-PLAN.md — RTL Hebrew testing and 200+ product performance
- [x] 09-04-PLAN.md — Bug batch fixes from testing
- [x] 09-05-PLAN.md — Ship decision and v1.1 final verification

</details>

## v1.2 Test Infrastructure & Critical Coverage (In Progress)

**Milestone Goal:** Establish comprehensive testing foundation and cover highest-risk areas to enable safe future development.

**Target features:**
- Test infrastructure setup (Vitest for backend and frontend)
- Authentication & authorization test coverage (JWT, role-based access, token lifecycle)
- Payment processing test coverage (PayPal & Stripe mocks for order flows)
- Currency conversion test coverage (exchange rate logic, USD/ILS calculations)
- File upload & image processing test coverage (validation, S3 integration, Sharp)
- Database & model test coverage (Product, User, Settings schemas)
- Security & middleware test coverage (CORS, rate limiting, input validation)

### Phase 10: Test Infrastructure Foundation
**Goal**: Establish safe test infrastructure with database isolation and external API mocking
**Depends on**: Phase 9 (v1.1 complete)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08, INFRA-09, INFRA-10, INFRA-11, INFRA-12, INFRA-13, INFRA-14, INFRA-15
**Success Criteria** (what must be TRUE):
  1. Tests run against isolated test database only (mongodb-memory-server)
  2. Environment validation rejects production credentials (MongoDB, PayPal, Stripe)
  3. External APIs are mocked (PayPal, Stripe, exchange rate API, DigitalOcean Spaces)
  4. Test cleanup automation prevents data pollution between test runs
  5. Sample integration test passes without touching production resources
  6. CI/CD pipeline executes tests on commit with coverage reporting
**Plans**: 7 plans

Plans:
- [x] 10-01-PLAN.md — Vitest and mongodb-memory-server setup for backend
- [x] 10-02-PLAN.md — Vitest and jsdom setup for frontend
- [x] 10-03-PLAN.md — Environment validation guards (MongoDB, PayPal, Stripe)
- [x] 10-04-PLAN.md — HTTP mocking with nock (PayPal, Stripe, exchange rate, S3)
- [x] 10-05-PLAN.md — Test fixtures, factories, and cleanup automation
- [x] 10-06-PLAN.md — Sample integration test demonstrating infrastructure
- [x] 10-07-PLAN.md — CI/CD pipeline with GitHub Actions and coverage reporting

### Phase 11: Authentication & Authorization Tests
**Goal**: Comprehensive test coverage for JWT authentication and role-based access control
**Depends on**: Phase 10
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10, AUTH-11, AUTH-12, AUTH-13, AUTH-14, AUTH-15, AUTH-16
**Success Criteria** (what must be TRUE):
  1. JWT token generation, validation, and expiration are tested and verified
  2. Admin role can access admin-protected routes, regular users cannot
  3. Unauthenticated requests to protected routes return 401
  4. Password hashing with bcrypt is tested (unique salts, correct validation)
  5. Login and signup endpoints are tested with valid and invalid credentials
  6. Middleware auth.js functions are unit tested in isolation
**Plans**: 5 plans

Plans:
- [x] 11-01-PLAN.md — Auth helpers and login endpoint integration tests
- [x] 11-02-PLAN.md — Signup endpoint integration tests with bcrypt verification
- [x] 11-03-PLAN.md — Protected route tests (fetchUser middleware via HTTP)
- [x] 11-04-PLAN.md — Admin route authorization tests (requireAdmin middleware)
- [x] 11-05-PLAN.md — Middleware unit tests (fetchUser, requireAdmin, authUser)

### Phase 12: Payment Processing Tests
**Goal**: Test PayPal and Stripe payment flows with mocked APIs
**Depends on**: Phase 10
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07, PAY-08, PAY-09, PAY-10, PAY-11, PAY-12, PAY-13
**Success Criteria** (what must be TRUE):
  1. PayPal order creation, approval, and capture flows are tested with mocked responses
  2. Stripe payment intent creation and confirmation flows are tested with mocked responses
  3. Payment error scenarios are tested (declined cards, insufficient funds, timeouts)
  4. Payment endpoints validate required fields and reject invalid amounts/currencies
  5. No live payment API calls occur during test runs (verified by environment validation)
**Plans**: 4 plans

Plans:
- [x] 12-01-PLAN.md — PayPal order creation and capture tests (PAY-01 through PAY-05)
- [x] 12-02-PLAN.md — Stripe checkout session tests (PAY-06 through PAY-10)
- [x] 12-03-PLAN.md — Payment validation tests (PAY-11, PAY-12, PAY-13)
- [x] 12-04-PLAN.md — Stripe webhook tests (signature validation, event handling)

### Phase 13: Currency Conversion Tests
**Goal**: Test USD/ILS exchange rate logic and fallback chain
**Depends on**: Phase 10
**Requirements**: CURR-01, CURR-02, CURR-03, CURR-04, CURR-05, CURR-06, CURR-07, CURR-08, CURR-09
**Success Criteria** (what must be TRUE):
  1. Exchange rate API fetch and caching are tested
  2. Currency conversion calculations (USD to ILS and reverse) are accurate
  3. Fallback chain is tested (API failure falls back to cached rate)
  4. Currency formatting displays correct symbols and decimal places
  5. Edge cases are handled (zero amounts, negative values, stale rates)
**Plans**: 2 plans

Plans:
- [ ] 13-01-PLAN.md — Exchange rate service unit tests (fetch, cache, fallback, staleness)
- [ ] 13-02-PLAN.md — Cron job, admin endpoint, conversion accuracy, and currency symbols

### Phase 14: File Upload & Image Processing Tests
**Goal**: Test file upload validation, Sharp image processing, and S3 integration
**Depends on**: Phase 10
**Requirements**: FILE-01, FILE-02, FILE-03, FILE-04, FILE-05, FILE-06, FILE-07, FILE-08, FILE-09, FILE-10, FILE-11
**Success Criteria** (what must be TRUE):
  1. File upload validates MIME types (JPEG, PNG, WebP only)
  2. File upload enforces size limits and rejects oversized files
  3. Sharp image processing resizes and converts formats correctly
  4. Sharp handles corrupted images gracefully without crashing
  5. DigitalOcean Spaces upload is mocked and generates correct URLs
  6. No files are uploaded to production storage during test runs
**Plans**: 2 plans

Plans:
- [ ] 14-01-PLAN.md — Image test helpers and file upload validation tests (FILE-01 through FILE-04)
- [ ] 14-02-PLAN.md — Sharp processing, S3 integration, and file deletion tests (FILE-05 through FILE-11)

### Phase 15: Database & Model Tests
**Goal**: Test Mongoose models (Product, User, Settings) for validation and CRUD operations
**Depends on**: Phase 10
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, DATA-10, DATA-11, DATA-12, DATA-13, DATA-14, DATA-15
**Success Criteria** (what must be TRUE):
  1. Product model creates, updates, deletes, and finds products correctly
  2. Product model validates required fields (name, price) and enforces SKU uniqueness
  3. Product model sorts by displayOrder for drag-and-drop reordering
  4. User model creates users, validates email format, and enforces email uniqueness
  5. Settings model reads and updates site settings (exchange rates, configurations)
**Plans**: 2 plans

Plans:
- [ ] 15-01-PLAN.md — Product model validation, uniqueness, CRUD, and sorting tests
- [ ] 15-02-PLAN.md — User model and Settings model tests

### Phase 16: Security & Middleware Tests
**Goal**: Test CORS, rate limiting, and input validation for security vulnerabilities
**Depends on**: Phase 10
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09
**Success Criteria** (what must be TRUE):
  1. CORS middleware allows configured origins in production and rejects unauthorized origins
  2. CORS middleware allows localhost origins in development
  3. Rate limiting middleware enforces limits on auth and payment endpoints
  4. Rate limiting allows requests within limits and rejects excess requests
  5. Input validation sanitizes XSS attempts and rejects SQL injection patterns
**Plans**: TBD

Plans:
- [ ] TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12 -> 13 -> 14 -> 15 -> 16

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Schema & Validation | v1.0 | 1/1 | Complete | 2026-02-01 |
| 2. Admin Forms | v1.0 | 2/2 | Complete | 2026-02-01 |
| 3. Customer Display | v1.0 | 2/2 | Complete | 2026-02-01 |
| 4. Schema Foundation & Library | v1.1 | 3/3 | Complete | 2026-02-02 |
| 5. Product Ordering Backend | v1.1 | 1/1 | Complete | 2026-02-03 |
| 6. Frontend Product Reordering | v1.1 | 4/4 | Complete | 2026-02-03 |
| 7. Image Array Migration | v1.1 | 5/5 | Complete | 2026-02-03 |
| 8. Modal Integration | v1.1 | 5/5 | Complete | 2026-02-04 |
| 9. Testing & Polish | v1.1 | 5/5 | Complete | 2026-02-04 |
| 10. Test Infrastructure | v1.2 | 7/7 | Complete | 2026-02-04 |
| 11. Auth & Authorization | v1.2 | 5/5 | Complete | 2026-02-05 |
| 12. Payment Processing | v1.2 | 4/4 | Complete | 2026-02-05 |
| 13. Currency Conversion | v1.2 | 2/2 | Complete | 2026-02-05 |
| 14. File Upload & Images | v1.2 | 2/2 | Complete | 2026-02-05 |
| 15. Database & Models | v1.2 | 0/0 | Not started | - |
| 16. Security & Middleware | v1.2 | 0/0 | Not started | - |

---
*Last updated: 2026-02-05 after Phase 14 execution*
