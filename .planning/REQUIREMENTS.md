# Requirements: SKU Management

**Defined:** 2026-02-01
**Core Value:** Clean, professional product information management that matches real-world e-commerce standards

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Database Schema

- [ ] **SKU-01**: Product model has SKU field (string, optional in schema, sparse unique index)
- [ ] **SKU-02**: SKU uniqueness enforced at database level (prevents duplicate SKUs)
- [ ] **SKU-03**: Existing products without SKUs continue to function (backwards compatible)

### Server Validation

- [ ] **VAL-01**: Server validates SKU uniqueness before saving (handles race conditions)
- [ ] **VAL-02**: New products require SKU field (validation at API level)
- [ ] **VAL-03**: Edit operations exclude current product from uniqueness check
- [ ] **VAL-04**: User-friendly error messages for duplicate SKUs (not raw database errors)

### Admin Add Product

- [ ] **ADD-01**: Admin "Add Product" form includes SKU input field
- [ ] **ADD-02**: SKU field validation on submission (required, format check)
- [ ] **ADD-03**: Clear error display if SKU already exists

### Admin Edit Product

- [ ] **EDIT-01**: Admin "Edit Product" form includes SKU input field (pre-filled if exists)
- [ ] **EDIT-02**: Admin can update SKU on existing products
- [ ] **EDIT-03**: Uniqueness validation excludes current product's own SKU

### Admin Product Listings

- [ ] **LIST-01**: SKU column displayed in admin product tables/lists
- [ ] **LIST-02**: Search products by SKU (exact or partial match)
- [ ] **LIST-03**: Filter products by "Missing SKU" status (shows products without SKUs)

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
| SKU-01 | Pending | Pending |
| SKU-02 | Pending | Pending |
| SKU-03 | Pending | Pending |
| VAL-01 | Pending | Pending |
| VAL-02 | Pending | Pending |
| VAL-03 | Pending | Pending |
| VAL-04 | Pending | Pending |
| ADD-01 | Pending | Pending |
| ADD-02 | Pending | Pending |
| ADD-03 | Pending | Pending |
| EDIT-01 | Pending | Pending |
| EDIT-02 | Pending | Pending |
| EDIT-03 | Pending | Pending |
| LIST-01 | Pending | Pending |
| LIST-02 | Pending | Pending |
| LIST-03 | Pending | Pending |
| DISP-01 | Pending | Pending |
| DISP-02 | Pending | Pending |
| DISP-03 | Pending | Pending |
| DISP-04 | Pending | Pending |
| LANG-01 | Pending | Pending |
| LANG-02 | Pending | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 0 (pending roadmap creation)
- Unmapped: 22 ⚠️

---
*Requirements defined: 2026-02-01*
*Last updated: 2026-02-01 after initial definition*
