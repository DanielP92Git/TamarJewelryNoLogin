---
phase: 06-frontend-product-reordering
plan: 01
subsystem: frontend-ui
tags: [admin-dashboard, ui-shell, toasts, action-bar, drag-handles]

requires:
  - 05-01 # Product ordering backend API endpoint

provides:
  - reorder-mode-ui-shell
  - toast-notification-system
  - floating-action-bar
  - drag-handle-ui

affects:
  - 06-02 # Will add SortableJS drag-and-drop to this shell
  - 06-03 # Will wire action bar buttons to API

tech-stack:
  added:
    - Toastify.js # CDN-based toast notifications (zero-dependency)
  patterns:
    - Mode-based UI toggling # enterReorderMode/exitReorderMode pattern
    - State-driven button management # updateReorderButtonStates based on undo/redo stacks
    - Floating action bar # Fixed-position bottom toolbar pattern

key-files:
  created: []
  modified:
    - admin/index.html # Added Toastify.js CDN links
    - admin/BisliView.js # Added reorder mode functions, state, event handlers, drag handles
    - admin/bambaYafa-desktop.css # Added action bar, drag handle, and reorder mode styles

decisions:
  - what: "Toast notification system via Toastify.js CDN"
    why: "Zero dependencies, simple API, z-index 2000 ensures visibility above all UI"
    impact: "Toast feedback available for all future features (success/error/info)"

  - what: "Category must be selected before reordering"
    why: "Prevents confusing 'All Categories' view, aligns with per-category displayOrder backend design"
    impact: "Error toast blocks entry to reorder mode if category is 'all'"

  - what: "Floating action bar at bottom of viewport"
    why: "Always visible during reorder, doesn't obscure product list, follows Gmail/Trello pattern"
    impact: "Added body padding-bottom: 80px when reorder mode active to prevent content overlap"

  - what: "Drag handles hidden by default, shown in reorder mode"
    why: "Clean UI in normal mode, clear affordance when reordering is possible"
    impact: "Grid template adjusts dynamically (24px column added in reorder mode)"

metrics:
  duration: 4 minutes
  completed: 2026-02-03
---

# Phase 06 Plan 01: Reorder Mode UI Infrastructure Summary

Interactive shell for product reordering with toast notifications, floating action bar, and drag handles - ready for drag-and-drop integration in Plan 02.

## What Was Built

### Toast Notification System
- Added Toastify.js via CDN (CSS + JS) to admin/index.html
- Created three toast utility functions:
  - `showSuccessToast(message)` - Green gradient, 3s duration
  - `showErrorToast(message)` - Red-orange gradient, 5s duration
  - `showInfoToast(message)` - Purple gradient, 3s duration
- z-index: 2000 ensures toasts appear above all UI elements

### Reorder Mode State Management
Extended `state` object with:
- `isReorderMode: false` - Toggle for reorder mode
- `products: null` - Full product list reference
- `originalProductOrder: []` - Product IDs before changes
- `undoStack: []` - Reorder operation history
- `redoStack: []` - Redoable operations
- `sortableInstance: null` - Placeholder for SortableJS (Plan 02)

### Floating Action Bar
- Fixed position at bottom of viewport
- Four buttons: Undo, Redo, Cancel, Save Order
- Undo/Redo/Save initially disabled (enabled by drag operations in Plan 02)
- Cancel always enabled
- `action-bar-spacer` pushes Cancel/Save to right edge
- White background with subtle shadow, z-index: 300

### Reorder Mode Toggle Button
- "↕ Reorder Products" button in product list header
- Validates category selection before entering mode:
  - Blocks if `selectedCategory === 'all'` → "Please select a specific category"
  - Blocks if no products in category → "No products in this category"
- Shows action bar, hides toggle button when active

### Mode Entry/Exit Functions

**`enterReorderMode()`:**
1. Validates category and product availability
2. Captures original product order (IDs)
3. Resets undo/redo stacks
4. Shows action bar, hides toggle button
5. Disables category filter dropdown
6. Shows drag handles on all product rows
7. Adds `reorder-mode-active` class to body (triggers padding)
8. Shows info toast: "Reorder mode active. Drag products to reorder."

**`exitReorderMode()`:**
1. Confirms exit if unsaved changes (`undoStack.length > 0`)
2. Hides action bar, shows toggle button
3. Re-enables category filter
4. Hides drag handles
5. Removes `reorder-mode-active` class from body
6. Destroys SortableJS instance if exists (Plan 02)

**`updateReorderButtonStates(disabled)`:**
- Undo disabled if `undoStack.length === 0`
- Redo disabled if `redoStack.length === 0`
- Save disabled if no changes (`undoStack.length === 0`)
- Cancel always enabled (unless `disabled = true` param)

**`getFilteredProducts()`:**
- Returns products in currently selected category
- Returns empty array if `selectedCategory === 'all'`
- Used for validation before entering reorder mode

### Drag Handles
- Added to each product row in `loadProducts()` function
- Structure: `<div class="drag-handle"><span class="drag-icon">⋮⋮</span></div>`
- Hidden by default (`display: none`)
- Shown when entering reorder mode (via `querySelectorAll('.drag-handle')`)
- Grid column adjusted: `24px` prepended when `reorder-mode-active`
- Cursor: `grab` on hover, `grabbing` on active
- RTL support: `order: -1` in RTL layouts

### Event Listeners
- Reorder toggle button → `enterReorderMode()`
- Cancel button → Confirms if changes exist, calls `exitReorderMode()`, restores original order via `loadProducts(state.products)`
- Save/Undo/Redo handlers deferred to Plan 03

### CSS Additions
**bambaYafa-desktop.css:**
- `.reorder-action-bar` - Fixed bottom bar with flexbox layout
- `.action-bar-spacer` - Flex: 1 to push buttons right
- `.drag-handle` - 24px width, grab cursor, color transitions
- `.reorder-mode-active` - Body padding-bottom: 80px
- `.reorder-mode-active .row` - Adjusted grid template columns
- SortableJS classes (`.sortable-ghost`, `.sortable-chosen`, `.sortable-drag`)

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions

### Why Toastify.js over custom toasts?
- Zero dependencies (CDN-based)
- Battle-tested library (4k+ stars, 10+ years)
- Simple API, customizable styles
- Accessibility built-in (role="alert" support)

### Why disable category filter during reorder?
- Prevents accidental category switch mid-reorder (would lose changes)
- Forces user to complete or cancel reorder before switching context
- Clear mental model: "Locked into category until done"

### Why grid column adjustment over overlay?
- Drag handles integrated into existing grid
- No layout shift (column exists, just hidden/shown)
- Maintains alignment with table headers
- Simpler than absolute positioning overlay

### Why confirm on cancel if unsaved changes?
- Prevents accidental loss of reorder work
- Standard pattern (Gmail compose discard, editor exit)
- `undoStack.length > 0` reliably detects unsaved state

## Testing Performed

All verification criteria met:
- Toastify.js loads from CDN, functions callable in console ✓
- "Reorder Products" button visible in header ✓
- Error toast on "All Categories" click ✓
- Entering reorder mode (with category selected):
  - Action bar appears ✓
  - Category dropdown disabled ✓
  - Info toast shown ✓
  - Drag handles visible ✓
- Cancel button exits reorder mode ✓
- No JavaScript errors in console ✓

## Next Phase Readiness

**Plan 02 (Drag-and-Drop):**
- UI shell complete and ready
- `state.sortableInstance` placeholder ready
- SortableJS CSS classes pre-defined
- Drag handles rendered and styled
- Grid columns adjust properly

**Plan 03 (API Integration):**
- Save/Undo/Redo button DOM IDs established
- `updateReorderButtonStates()` ready to enable buttons
- `state.undoStack` and `state.redoStack` ready for operation history
- Toast functions ready for API feedback

**Unknowns:**
- None - all dependencies satisfied

## Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add Toastify.js and toast utilities | 20e2fa9 | admin/index.html, admin/BisliView.js |
| 2 | Create reorder mode UI shell and action bar | 555270f | admin/BisliView.js, admin/bambaYafa-desktop.css |
| 3 | Add drag handles to product rows | 034589d | admin/BisliView.js, admin/bambaYafa-desktop.css |

**Total commits:** 3 (one per task, atomic and independently revertable)

---

*Execution time: 4 minutes*
*Completed: 2026-02-03*
