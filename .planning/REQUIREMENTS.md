# Requirements: Tamar Kfir Jewelry - Admin Product Management UX

**Defined:** 2026-02-01
**Core Value:** Clean, professional product information management that matches real-world e-commerce standards and improves admin workflow efficiency

## v1.1 Requirements

Requirements for admin UX improvements milestone. Each maps to roadmap phases.

### Product Preview Modal

- [ ] **MODAL-01**: Admin can click product row to open preview modal
- [ ] **MODAL-02**: Modal displays customer-facing product view (images, description, price, SKU)
- [ ] **MODAL-03**: Modal includes "Edit" button that navigates to edit page
- [ ] **MODAL-04**: Modal has X button to close
- [ ] **MODAL-05**: Modal closes when pressing ESC key
- [ ] **MODAL-06**: Modal closes when clicking outside/backdrop
- [ ] **MODAL-07**: Modal implements focus trap (tab cycles within modal)
- [ ] **MODAL-08**: Modal includes ARIA labels for screen readers
- [ ] **MODAL-09**: Modal footer includes quick action buttons (Edit, Delete, Duplicate)

### Product Reordering

- [ ] **ORDER-01**: Each product row has drag handle (six-dot icon)
- [ ] **ORDER-02**: Product row shows visual feedback during dragging state
- [ ] **ORDER-03**: Product list shows visual feedback for drop zones
- [ ] **ORDER-04**: Ghost preview appears during drag operation
- [ ] **ORDER-05**: Product order is per-category (bracelets order ≠ necklaces order)
- [ ] **ORDER-06**: "Save Order" button commits reordering changes
- [ ] **ORDER-07**: "Cancel" button reverts unsaved changes
- [ ] **ORDER-08**: Loading state displays while saving order
- [ ] **ORDER-09**: Error handling displays user-friendly message for failed saves
- [ ] **ORDER-10**: Undo button reverts last order change
- [ ] **ORDER-11**: Redo button reapplies undone order change

### Image Gallery Reordering

- [ ] **IMAGE-01**: Product schema merges mainImage + galleryImages into single images array
- [ ] **IMAGE-02**: First image in images array automatically becomes main/featured image
- [ ] **IMAGE-03**: Admin can drag image thumbnails to reorder in edit form
- [ ] **IMAGE-04**: Image thumbnails show visual feedback during dragging state
- [ ] **IMAGE-05**: Image gallery shows visual feedback for drop indicator position
- [ ] **IMAGE-06**: Image order changes save when product form is submitted
- [ ] **IMAGE-07**: Visual indicator highlights which image is main (position 1)
- [ ] **IMAGE-08**: Admin can delete image from gallery with confirmation dialog

### Backend Foundation

- [ ] **FOUND-01**: Product schema includes displayOrder integer field
- [ ] **FOUND-02**: Compound index on {category, displayOrder, available} for efficient queries
- [ ] **FOUND-03**: New products default to creation date order
- [ ] **FOUND-04**: POST /api/admin/products/reorder endpoint accepts category + product IDs array
- [ ] **FOUND-05**: Migration script converts mainImage + smallImages to images array
- [ ] **FOUND-06**: Backwards compatibility maintained during migration period

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Interactions

- **INTX-01**: Keyboard shortcuts in modal (E for edit, Del for delete)
- **INTX-02**: Keyboard alternative for product reordering (arrow keys + modifiers)
- **INTX-03**: One-click promote any image to main position
- **INTX-04**: Drag-and-drop file upload for gallery images
- **INTX-05**: Image cropping/editing tool in gallery

### Performance & Scalability

- **PERF-01**: Virtual scrolling for product lists with >200 items
- **PERF-02**: Lazy loading for product modal images
- **PERF-03**: Optimistic UI updates for reordering

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Auto-advance to next product in modal | Disrupts admin workflow, creates modal bombardment |
| Auto-save on drag | Prevents undo, causes accidental reorders |
| Nested modals (edit inside preview) | Creates modal bombardment anti-pattern |
| Dragging entire product row | Conflicts with click-to-preview interaction |
| Real-time frontend updates during drag | Creates visual chaos for customers |
| Barcode scanning for product reorder | Hardware integration, massive scope |
| Bulk move actions (top/bottom) | Nice-to-have, defer until requested |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 4 | Pending |
| FOUND-02 | Phase 4 | Pending |
| FOUND-03 | Phase 4 | Pending |
| FOUND-04 | Phase 5 | Complete |
| FOUND-05 | Phase 7 | Pending |
| FOUND-06 | Phase 7 | Pending |
| ORDER-01 | Phase 6 | Pending |
| ORDER-02 | Phase 6 | Pending |
| ORDER-03 | Phase 6 | Pending |
| ORDER-04 | Phase 6 | Pending |
| ORDER-05 | Phase 6 | Pending |
| ORDER-06 | Phase 6 | Pending |
| ORDER-07 | Phase 6 | Pending |
| ORDER-08 | Phase 6 | Pending |
| ORDER-09 | Phase 6 | Pending |
| ORDER-10 | Phase 6 | Pending |
| ORDER-11 | Phase 6 | Pending |
| IMAGE-01 | Phase 7 | Pending |
| IMAGE-02 | Phase 7 | Pending |
| IMAGE-03 | Phase 8 | Pending |
| IMAGE-04 | Phase 8 | Pending |
| IMAGE-05 | Phase 8 | Pending |
| IMAGE-06 | Phase 8 | Pending |
| IMAGE-07 | Phase 8 | Pending |
| IMAGE-08 | Phase 8 | Pending |
| MODAL-01 | Phase 8 | Pending |
| MODAL-02 | Phase 8 | Pending |
| MODAL-03 | Phase 8 | Pending |
| MODAL-04 | Phase 8 | Pending |
| MODAL-05 | Phase 8 | Pending |
| MODAL-06 | Phase 8 | Pending |
| MODAL-07 | Phase 8 | Pending |
| MODAL-08 | Phase 8 | Pending |
| MODAL-09 | Phase 8 | Pending |

**Coverage:**
- v1.1 requirements: 34 total
- Mapped to phases: 34/34 ✓
- Unmapped: 0

**Phase Breakdown:**
- Phase 4 (Foundation): 3 requirements (FOUND-01, FOUND-02, FOUND-03)
- Phase 5 (Backend API): 1 requirement (FOUND-04)
- Phase 6 (Product Reordering): 11 requirements (ORDER-01 through ORDER-11)
- Phase 7 (Migration): 4 requirements (FOUND-05, FOUND-06, IMAGE-01, IMAGE-02)
- Phase 8 (Modal & Image UI): 15 requirements (MODAL-01 through MODAL-09, IMAGE-03 through IMAGE-08)
- Phase 9 (Testing): 0 new requirements (validates all 34 existing requirements)

---
*Requirements defined: 2026-02-01*
*Last updated: 2026-02-01 after roadmap creation with full traceability*
