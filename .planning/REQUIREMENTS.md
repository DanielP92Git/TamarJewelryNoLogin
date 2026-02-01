# Requirements: SKU Management

**Defined:** 2026-02-01
**Core Value:** Clean, professional product information management that matches real-world e-commerce standards

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Database Schema

- [x] **SKU-01**: Product model has SKU field (string, optional in schema, sparse unique index)
- [x] **SKU-02**: SKU uniqueness enforced at database level (prevents duplicate SKUs)
- [x] **SKU-03**: Existing products without SKUs continue to function (backwards compatible)

### Server Validation

- [x] **VAL-01**: Server validates SKU uniqueness before saving (handles race conditions)
- [x] **VAL-02**: New products require SKU field (validation at API level)
- [x] **VAL-03**: Edit operations exclude current product from uniqueness check
- [x] **VAL-04**: User-friendly error messages for duplicate SKUs (not raw database errors)

### Admin Add Product

- [x] **ADD-01**: Admin "Add Product" form includes SKU input field
- [x] **ADD-02**: SKU field validation on submission (required, format check)
- [x] **ADD-03**: Clear error display if SKU already exists

### Admin Edit Product

- [x] **EDIT-01**: Admin "Edit Product" form includes SKU input field (pre-filled if exists)
- [x] **EDIT-02**: Admin can update SKU on existing products
- [x] **EDIT-03**: Uniqueness validation excludes current product's own SKU

### Admin Product Listings

- [x] **LIST-01**: SKU column displayed in admin product tables/lists
- [x] **LIST-02**: Search products by SKU (exact or partial match)
- [x] **LIST-03**: Filter products by "Missing SKU" status (shows products without SKUs)

### Customer Display

- [ ] **DISP-01**: SKU displayed on frontend product modal (when SKU exists)
- [ ] **DISP-02**: SKU formatted as small text with "SKU:" label (or Hebrew equivalent)
- [ ] **DISP-03**: Products without SKUs display gracefully (no broken UI or error messages)
- [ ] **DISP-04**: SKU positioned at bottom of product description container

### Multi-Language Support

- [ ] **LANG-01**: SKU label translated in English ("SKU:") and Hebrew ("מק"ט:")
- [ ] **LANG-02**: SKU display works correctly with RTL layout (Hebrew)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Bulk Operations

- **BULK-01**: CSV export includes SKU field
- **BULK-02**: CSV import updates SKU field for existing products
- **BULK-03**: Admin dashboard shows count of products missing SKUs

### Admin UX Polish

- **UX-01**: Duplicate SKU detection UI (real-time check before submission)
- **UX-02**: SKU format guidance tooltip (recommended pattern)
- **UX-03**: Auto-suggest next available SKU based on existing patterns

### Advanced Features

- **ADV-01**: Barcode generation from SKU (downloadable/printable)
- **ADV-02**: SKU audit history (track changes over time)
- **ADV-03**: SKU-based inventory tracking integration

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Auto-generated SKUs | Inappropriate for handmade products - manual SKUs are more meaningful and human-readable |
| Complex SKU templates | Overkill for small catalog - freeform text is sufficient |
| Multi-SKU variants per product | Requires product model redesign for variant support - not needed for current catalog |
| Custom SKU field types | Simple string field handles all use cases - additional complexity unnecessary |
| SKU prefix/suffix rules | Enforcing patterns adds complexity without clear benefit for handmade jewelry |
| Barcode scanning | Physical warehouse operations not in scope - online-only business |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SKU-01 | Phase 1 | Complete |
| SKU-02 | Phase 1 | Complete |
| SKU-03 | Phase 1 | Complete |
| VAL-01 | Phase 1 | Complete |
| VAL-02 | Phase 1 | Complete |
| VAL-03 | Phase 1 | Complete |
| VAL-04 | Phase 1 | Complete |
| ADD-01 | Phase 2 | Complete |
| ADD-02 | Phase 2 | Complete |
| ADD-03 | Phase 2 | Complete |
| EDIT-01 | Phase 2 | Complete |
| EDIT-02 | Phase 2 | Complete |
| EDIT-03 | Phase 2 | Complete |
| LIST-01 | Phase 2 | Complete |
| LIST-02 | Phase 2 | Complete |
| LIST-03 | Phase 2 | Complete |
| DISP-01 | Phase 3 | Pending |
| DISP-02 | Phase 3 | Pending |
| DISP-03 | Phase 3 | Pending |
| DISP-04 | Phase 3 | Pending |
| LANG-01 | Phase 3 | Pending |
| LANG-02 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22/22 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-02-01*
*Last updated: 2026-02-01 (Phase 2 requirements complete)*
