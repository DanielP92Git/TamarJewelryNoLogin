# Roadmap: Tamar Kfir Jewelry - Admin Product Management UX

## Milestones

- v1.0 SKU Management - Phases 1-3 (shipped 2026-02-01)
- v1.1 Admin Product Management UX - Phases 4-9 (in progress)

## Overview

Enhance admin product management workflow with modern UX patterns for viewing, ordering, and organizing products. The roadmap progresses from backend schema foundations through drag-and-drop product reordering, image gallery unification, product preview modals, and comprehensive testing. Each phase delivers independently verifiable capabilities that build toward a professional admin experience matching industry standards from Shopify and WooCommerce.

## Phases

**Phase Numbering:**
- Integer phases (4, 5, 6, 7, 8, 9): Planned milestone work
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

## v1.1 Admin Product Management UX (In Progress)

**Milestone Goal:** Enhance admin product management workflow with modern UX patterns for viewing, ordering, and organizing products.

**Target features:**
- Product preview modal (customer view with edit button)
- Drag-and-drop product reordering within categories
- Drag-and-drop gallery image reordering (merge main + gallery images)

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
- [ ] 06-01-PLAN.md — Reorder mode UI with toast notifications, action bar, and drag handles
- [ ] 06-02-PLAN.md — SortableJS integration with command pattern undo/redo
- [ ] 06-03-PLAN.md — API integration, loading states, 409 conflict handling, beforeunload
- [ ] 06-04-PLAN.md — Human verification of complete reorder feature

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
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

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
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

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
**Plans**: TBD

Plans:
- [ ] 09-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 4 -> 5 -> 6 -> 7 -> 8 -> 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Schema & Validation | v1.0 | 1/1 | Complete | 2026-02-01 |
| 2. Admin Forms | v1.0 | 2/2 | Complete | 2026-02-01 |
| 3. Customer Display | v1.0 | 2/2 | Complete | 2026-02-01 |
| 4. Schema Foundation & Library | v1.1 | 3/3 | Complete | 2026-02-02 |
| 5. Product Ordering Backend | v1.1 | 1/1 | Complete | 2026-02-03 |
| 6. Frontend Product Reordering | v1.1 | 0/4 | Planned | - |
| 7. Image Array Migration | v1.1 | 0/TBD | Not started | - |
| 8. Modal Integration | v1.1 | 0/TBD | Not started | - |
| 9. Testing & Polish | v1.1 | 0/TBD | Not started | - |

---
*Last updated: 2026-02-03 after Phase 6 planning*
