# Tamar Kfir Jewelry - SKU Management

## What This Is

Professional SKU (Stock Keeping Unit) management for an existing handmade jewelry e-commerce platform. Adding proper SKU fields to the admin dashboard and displaying them on the frontend product modals, replacing the current unprofessional practice of embedding SKUs in product descriptions.

## Core Value

Clean, professional product information management that matches real-world e-commerce standards and improves admin workflow efficiency.

## Current Milestone: v1.1 Admin Product Management UX

**Goal:** Enhance admin product management workflow with modern UX patterns for viewing, ordering, and organizing products.

**Target features:**
- Product preview modal (customer view with edit button)
- Drag-and-drop product reordering within categories
- Drag-and-drop gallery image reordering (merge main + gallery images)

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

### Active

<!-- v1.1 milestone: Admin UX improvements -->

- [ ] Product preview modal opens when clicking product row in admin list
- [ ] Modal displays customer-facing product view (images, description, price, SKU)
- [ ] Modal includes "Edit" button to navigate to edit page
- [ ] Modal closes on ESC or click outside
- [ ] Drag-and-drop reordering of products within each category
- [ ] Product display order persists per-category (bracelets order ≠ necklaces order)
- [ ] "Save Order" button to commit reordering changes
- [ ] New products default to creation date order
- [ ] Merge main image + gallery images into single sortable gallery in edit form
- [ ] First image in gallery becomes the main product image
- [ ] Drag image to position 1 to set as new main image
- [ ] Drag-and-drop interface follows UX best practices

### Out of Scope

- Auto-generating SKUs for existing products — manual admin entry only
- Advanced SKU formatting rules (prefix/suffix patterns) — freeform text entry
- SKU-based search or filtering — defer to future enhancement
- Barcode generation from SKUs — not needed for digital jewelry sales
- SKU history or versioning — simple current value only

## Context

**Current State (v1.0 Shipped):**
- Shipped v1.0 with ~869 LOC across backend, admin, and frontend
- Tech stack: Node.js/Express backend, Vanilla JS MVC frontend, MongoDB/Mongoose
- SKU management now professional: database schema, admin workflow, customer display
- 25 files modified across 3 phases in single-day execution (16 hours)

**Problem Solved:**
- ✅ Eliminated SKU-in-description anti-pattern
- ✅ Professional e-commerce product information management
- ✅ Admin workflow efficiency improved with duplicate validation
- ✅ Customer-facing display matches industry standards

**Technical Environment:**
- MVC frontend architecture (Vanilla JS, Parcel bundler)
- Express/Node.js monolithic backend
- MongoDB with Mongoose ODM
- Multi-language support (English/Hebrew with RTL)
- Admin dashboard with product add/edit forms

**Known Issues/Tech Debt:**
- Duplicate index definition causes Mongoose warning (harmless, cosmetic)
- Legacy /updateproduct endpoint (without :id) doesn't handle SKU - use /updateproduct/:id instead

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
*Last updated: 2026-02-01 after v1.1 milestone started*
