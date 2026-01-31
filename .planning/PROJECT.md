# Tamar Kfir Jewelry - SKU Management

## What This Is

Professional SKU (Stock Keeping Unit) management for an existing handmade jewelry e-commerce platform. Adding proper SKU fields to the admin dashboard and displaying them on the frontend product modals, replacing the current unprofessional practice of embedding SKUs in product descriptions.

## Core Value

Clean, professional product information management that matches real-world e-commerce standards and improves admin workflow efficiency.

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

### Active

<!-- Current scope: SKU management feature -->

- [ ] Add SKU field to Product MongoDB schema
- [ ] Add SKU input field to admin "Add Product" page
- [ ] Add SKU input field to admin "Edit Product" page
- [ ] Validate SKU uniqueness across all products
- [ ] Require SKU for new products (but allow existing products to have empty SKU)
- [ ] Display SKU on frontend product modal as small text with "SKU:" label
- [ ] Position SKU at bottom of description container (following UI best practices)
- [ ] Handle SKU display for products without SKUs (hide label if empty)

### Out of Scope

- Auto-generating SKUs for existing products — manual admin entry only
- Advanced SKU formatting rules (prefix/suffix patterns) — freeform text entry
- SKU-based search or filtering — defer to future enhancement
- Barcode generation from SKUs — not needed for digital jewelry sales
- SKU history or versioning — simple current value only

## Context

**Current Problem:**
SKUs are currently embedded in product descriptions, creating:
- Unprofessional appearance on product pages
- Poor admin UX (mixing SKU data with marketing copy)
- No validation or uniqueness enforcement
- Inconsistent SKU formatting across products

**Technical Environment:**
- MVC frontend architecture (Vanilla JS, Parcel bundler)
- Express/Node.js monolithic backend
- MongoDB with Mongoose ODM
- Existing admin dashboard with product add/edit forms
- Multi-language UI requiring SKU label translation

**Implementation Notes:**
- Product model already has complex image handling (mainImage variants, smallImages array)
- Admin forms use HTML forms with fetch API for submissions
- Frontend uses View classes with language-switching methods
- Backend has normalizeProductForClient() that transforms product data before sending to frontend

## Constraints

- **Tech Stack**: Vanilla JavaScript frontend (no React/Vue) — must work with existing View pattern
- **Database**: MongoDB with Mongoose — schema changes must handle existing products gracefully
- **Multi-language**: SKU label must support English/Hebrew translations — use existing language switching pattern
- **Uniqueness**: Database-level unique constraint on SKU field — prevent duplicates server-side
- **Backwards Compatibility**: Existing products without SKUs must continue to work — SKU is optional for existing data, required for new

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SKU required for new products only | Avoids forcing admin to retroactively add SKUs to entire catalog | — Pending |
| Unique constraint on SKU field | Prevents duplicate SKUs across products, ensures each is identifiable | — Pending |
| Display as "SKU: ABC123" format | Matches professional e-commerce conventions (Amazon, Shopify, etc.) | — Pending |
| Position at bottom of description | Keeps SKU visible but secondary to product name/description/price | — Pending |

---
*Last updated: 2026-02-01 after initialization*
