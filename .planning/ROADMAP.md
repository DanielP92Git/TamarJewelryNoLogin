# Roadmap: SKU Management

## Overview

This roadmap delivers professional SKU (Stock Keeping Unit) management for Tamar Kfir Jewelry's e-commerce platform in three phases. Phase 1 establishes database schema and backend validation to ensure SKU uniqueness while maintaining backwards compatibility with existing products. Phase 2 implements admin workflow for creating and managing products with SKUs through the dashboard. Phase 3 delivers customer-facing display with multi-language support. The journey progresses from invisible data integrity foundations through admin tooling to polished customer experience.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Database Foundation** - SKU schema and backend validation
- [x] **Phase 2: Admin Workflow** - Product management forms and listings
- [ ] **Phase 3: Customer Display** - Frontend modal and multi-language support

## Phase Details

### Phase 1: Database Foundation
**Goal**: Database accepts and validates SKU field with uniqueness enforcement while allowing existing products without SKUs to continue functioning

**Depends on**: Nothing (first phase)

**Requirements**: SKU-01, SKU-02, SKU-03, VAL-01, VAL-02, VAL-03, VAL-04

**Success Criteria** (what must be TRUE):
  1. Product model accepts SKU field as optional string with automatic uppercase normalization and whitespace trimming
  2. Database prevents duplicate SKUs across all products (sparse unique index enforced at database level)
  3. Existing products without SKUs load and function without errors
  4. Backend API validates SKU uniqueness before saving new products and returns user-friendly error messages for duplicates
  5. Edit operations can update SKU without triggering false duplicate errors when SKU unchanged

**Plans:** 1 plan

Plans:
- [x] 01-01-PLAN.md - Add SKU field to Product schema and integrate validation into API routes

### Phase 2: Admin Workflow
**Goal**: Admin can create new products with SKUs, edit existing products to add/update SKUs, and search products by SKU through dashboard

**Depends on**: Phase 1

**Requirements**: ADD-01, ADD-02, ADD-03, EDIT-01, EDIT-02, EDIT-03, LIST-01, LIST-02, LIST-03

**Success Criteria** (what must be TRUE):
  1. Admin sees SKU input field on "Add Product" form with validation requiring SKU for new products
  2. Admin sees clear error message when attempting to create product with duplicate SKU
  3. Admin sees SKU input field on "Edit Product" form pre-filled with existing value (or empty for legacy products)
  4. Admin can update SKU on existing products and save successfully when SKU is unique
  5. Admin sees SKU column in product listing tables
  6. Admin can search/filter products by SKU (exact or partial match)
  7. Admin can filter products to show only those missing SKUs

**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md - Backend API endpoint for SKU duplicate checking
- [x] 02-02-PLAN.md - Add SKU fields to Add Product and Edit Product forms
- [x] 02-03-PLAN.md - Product listing SKU column, sorting, search, and inline editing

### Phase 3: Customer Display
**Goal**: Customers see SKU displayed professionally on product pages with correct language labels and RTL support

**Depends on**: Phase 2

**Requirements**: DISP-01, DISP-02, DISP-03, DISP-04, LANG-01, LANG-02

**Success Criteria** (what must be TRUE):
  1. Customer sees SKU displayed on frontend product modal when SKU exists for product
  2. SKU displays as small text with proper label ("SKU:" in English, "מק"ט:" in Hebrew)
  3. Products without SKUs display product modal without errors or broken UI elements
  4. SKU appears at bottom of product description container following professional e-commerce conventions
  5. SKU label switches language correctly when customer changes site language
  6. SKU value displays LTR (left-to-right) even in Hebrew RTL mode

**Plans**: TBD

Plans:
- [ ] TBD after planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Database Foundation | 1/1 | Complete | 2026-02-01 |
| 2. Admin Workflow | 3/3 | Complete | 2026-02-01 |
| 3. Customer Display | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-01*
*Last updated: 2026-02-01 (Phase 2 complete)*
