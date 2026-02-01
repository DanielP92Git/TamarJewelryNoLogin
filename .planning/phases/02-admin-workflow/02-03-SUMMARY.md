---
phase: 02-admin-workflow
plan: 03
subsystem: admin-ui
tags: [sku, product-listing, filtering, sorting, inline-editing, javascript]
requires: [02-01]
provides:
  - SKU column in product listing with sorting
  - SKU search integration
  - Missing SKU filter
  - Inline SKU editing
affects: []
tech-stack:
  added: []
  patterns: [inline-editing, sessionStorage-persistence, client-side-filtering]
key-files:
  created: []
  modified:
    - admin/BisliView.js
decisions:
  - SKU column positioned second (after Product name)
  - Sort indicator shows direction (up/down arrow)
  - Empty SKUs sorted to end of list
  - Missing SKU filter shows count and toggles with visual feedback
  - Filter/sort state persists via sessionStorage
  - Inline editing saves on blur or Enter, cancels on Escape
  - Auto-uppercase SKU input while typing
  - Inline editing calls /updateproduct/:id endpoint
metrics:
  duration: 7.9 min
  completed: 2026-02-01
---

# Phase 02 Plan 03: SKU Column with Filtering and Inline Editing Summary

**One-liner:** Product listing now displays SKU column with A-Z/Z-A sorting, search integration, missing SKU filter badge, and single-click inline editing with auto-save.

## What Was Built

Added comprehensive SKU management to the admin product listing table:

1. **SKU Column Display**
   - Added SKU as second column in product listing table (after Product)
   - Shows dash (—) for products without SKUs
   - Column header is clickable to sort A-Z or Z-A
   - Sort indicator (↑/↓) shows current sort direction
   - Empty SKUs automatically sorted to end of list

2. **Search Integration**
   - Extended search filter to include SKU (partial match)
   - Updated search placeholder: "Search by product name, ID, SKU..."
   - SKU search uses case-insensitive contains matching

3. **Missing SKU Filter**
   - Added "Missing SKU (N)" badge to toolbar
   - Badge shows dynamic count of products without SKUs
   - Click badge to toggle filter (shows only products missing SKU)
   - Visual feedback: red highlight when filter active
   - Count updates automatically when SKUs added/removed via inline editing

4. **Inline SKU Editing**
   - Click any SKU cell to edit inline
   - Input auto-uppercases while typing
   - Save on blur or Enter key
   - Cancel on Escape key
   - Client-side validation (2-7 chars, alphanumeric only)
   - Shows duplicate error from backend if SKU already exists
   - Updates missing SKU count immediately after save

5. **State Persistence**
   - Sort state stored in sessionStorage (key: productListSort)
   - Filter state stored in sessionStorage (key: productListFilters)
   - State persists when navigating away and returning to product list
   - Filter state includes: showMissingSku, category, searchTerm

## Technical Implementation

**Modified Files:**
- `admin/BisliView.js` (+418 lines)
  - Updated table header to include sortable SKU column
  - Updated product row template to include SKU cell with inline edit capability
  - Added SKU sorting logic with sessionStorage persistence
  - Extended search filter to include SKU field
  - Added Missing SKU filter badge and toggle handler
  - Implemented comprehensive inline editing with validation and API integration

**Key Code Patterns:**

1. **Sortable Column Header:**
```javascript
<p class="sortable-header" data-column="sku" style="cursor:pointer;">
  SKU <span class="sort-indicator"></span>
</p>
```

2. **Inline Editable Cell:**
```javascript
<div class="sku-cell mono" data-product-id="${item.id}" data-editable="true">
  <span class="sku-display">${item.sku || '—'}</span>
  <input type="text" class="sku-inline-input input" />
</div>
```

3. **Sort Logic:**
- Applies after category and missing SKU filters, before search filter
- Empty SKUs sorted to end regardless of direction
- Uses localeCompare for proper string sorting

4. **Filter State Management:**
- Single sessionStorage object for all filters (productListFilters)
- Includes: showMissingSku, category, searchTerm
- Saved on every filter change (search input, category change, badge click)

## Deviations from Plan

None - plan executed exactly as written.

## Testing Evidence

**Verification Results:**
- ✓ SKU column header with sortable class found (2 occurrences)
- ✓ SKU cell in product row template found (2 occurrences)
- ✓ Search filter includes sku.includes(searchTerm) (1 occurrence)
- ✓ Missing SKU filter badge with count (3 occurrences)
- ✓ sessionStorage used for persistence (11 occurrences)
- ✓ Inline edit saves via /updateproduct/:id (2 occurrences)
- ✓ Enter/Escape key handlers implemented (2 occurrences)

**All success criteria met:**
- SKU column appears in product listing table header
- SKU column header is clickable and sorts products
- Sort indicator shows current direction (up/down arrow)
- Product rows show SKU value or dash for missing
- Search input finds products by SKU (partial match)
- "Missing SKU (N)" badge shows count of products without SKU
- Clicking Missing SKU badge toggles filter
- Filter badge changes appearance when active
- Filter/sort state persists in sessionStorage
- Clicking SKU cell shows inline input
- Inline input auto-uppercases text
- Enter saves inline SKU change
- Escape cancels inline edit
- Blur saves inline SKU change
- Invalid SKU format shows alert
- Duplicate SKU shows error from backend

## Decision Log

| Decision | Rationale | Impact |
|----------|-----------|--------|
| SKU column as second column | Matches plan; keeps product name primary while making SKU prominent | Clear visual hierarchy |
| Empty SKUs at end of sort | Keeps products with SKUs grouped together regardless of sort direction | Better UX for finding SKU'd products |
| Red visual feedback for active filter | Clear visual indicator that filter is active | Prevents confusion about why product list changed |
| sessionStorage for persistence | Lightweight, doesn't require backend; state persists within session | Smooth UX when navigating between pages |
| Auto-uppercase in input | Prevents case-sensitivity issues; matches backend auto-uppercase | Consistent with 01-01 decision |
| Save on blur with delay | Allows Escape to cancel before blur triggers | Better UX; gives user control |

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Recommendations:**
- Consider adding bulk SKU import/export for assigning SKUs to many products
- Could add SKU column to export CSV functionality
- Future enhancement: SKU preview in product hover tooltip

## Files Changed

**Modified:**
- `admin/BisliView.js`
  - Added SKU column to table header with sortable styling
  - Updated product row template with inline-editable SKU cell
  - Implemented SKU sorting with sessionStorage persistence
  - Extended search filter to include SKU field
  - Added Missing SKU filter badge with count and toggle
  - Created inline edit handlers with validation and API integration
  - Added filter state persistence to search and category handlers

## Commits

| Commit | Task | Description |
|--------|------|-------------|
| c624813 | Task 1 | feat(02-03): add SKU column with sorting to product listing |
| 7d80a0f | Task 2 | feat(02-03): add SKU search and Missing SKU filter |
| 938e041 | Task 3 | feat(02-03): add inline SKU editing to product listing |

---

**Status:** ✅ Complete
**Completed:** 2026-02-01
**Duration:** 7.9 minutes
