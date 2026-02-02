---
phase: 06-frontend-product-reordering
plan: 02
subsystem: frontend-interaction
tags: [admin-dashboard, sortablejs, drag-drop, command-pattern, undo-redo, keyboard-shortcuts]

requires:
  - 06-01 # Reorder mode UI infrastructure (action bar, drag handles, state)

provides:
  - drag-and-drop-reordering
  - command-pattern-undo-redo
  - keyboard-shortcuts
  - accessibility-attributes

affects:
  - 06-03 # Will wire Save button to backend API using undoManager state

tech-stack:
  added:
    - SortableJS 1.15.6 # CDN-based drag-and-drop library
  patterns:
    - Command pattern for undo/redo # MoveCommand encapsulates drag operations
    - UndoManager with dual stacks # Unlimited undo/redo depth
    - DOM re-rendering on undo # Sync visual order with command history
    - Keyboard shortcuts # Ctrl+Z/Y, Escape for accessibility

key-files:
  created: []
  modified:
    - admin/index.html # Added SortableJS CDN script
    - admin/BisliView.js # Added MoveCommand, UndoManager, SortableJS integration, keyboard handlers

decisions:
  - what: "Command pattern for undo/redo instead of simple array operations"
    why: "Encapsulates operations with execute/undo methods, enables unlimited undo depth, clean separation of concerns"
    impact: "Each drag creates MoveCommand pushed to undoManager, supports complex future operations"

  - what: "DOM re-rendering on undo/redo instead of Sortable.toArray() sync"
    why: "undoManager is source of truth, DOM follows state, prevents desync between visual and logical order"
    impact: "rerenderProductList() destroys and recreates Sortable after reordering DOM nodes"

  - what: "Search filter blocks reorder mode entry"
    why: "Filtered view doesn't represent full category, reordering subset would be confusing and error-prone"
    impact: "User must clear search before entering reorder mode, error toast shown if search active"

  - what: "Keyboard shortcuts (Ctrl+Z/Y, Escape)"
    why: "Power users expect keyboard navigation, accessibility best practice, faster workflow"
    impact: "handleReorderKeyboard listener added/removed on mode entry/exit"

  - what: "Accessibility attributes on drag handles (tabindex, role, aria-label)"
    why: "Screen reader support, future keyboard drag capability, WCAG compliance"
    impact: "Each drag handle labeled with product position for assistive technology"

  - what: "Cancel handler uses undoManager.hasChanges() instead of undoStack.length"
    why: "Cleaner abstraction, undoManager encapsulates change detection logic"
    impact: "Cancel confirmation dialog only appears if hasChanges() returns true"

metrics:
  duration: 5 minutes
  completed: 2026-02-03
---

# Phase 06 Plan 02: Drag-and-Drop Integration Summary

Full drag-and-drop product reordering with SortableJS, command pattern undo/redo (unlimited depth), keyboard shortcuts (Ctrl+Z/Y/Escape), and accessibility attributes.

## What Was Built

### Command Pattern Classes

**MoveCommand:**
- Encapsulates single drag operation with `fromIndex`, `toIndex`, `productId`
- `execute(productList)` - Moves item from old index to new index
- `undo(productList)` - Reverses the move (from new back to old)
- Symmetric operations enable clean redo (execute again)

**UndoManager:**
- Manages product order state and command history
- `productOrder` - Array of product IDs (source of truth)
- `undoStack` - Commands that can be undone
- `redoStack` - Commands that can be redone
- `execute(command)` - Runs command, pushes to undo stack, clears redo stack
- `undo()` - Pops from undo stack, runs reverse, pushes to redo stack
- `redo()` - Pops from redo stack, runs forward, pushes to undo stack
- `canUndo()` / `canRedo()` / `hasChanges()` - State queries for UI buttons
- `getCurrentOrder()` - Returns copy of current product ID order

### State Management Updates

Extended `state` object:
- `undoManager: null` - Initialized in `enterReorderMode`, cleaned up in `exitReorderMode`
- Replaces direct manipulation of `undoStack` / `redoStack` arrays

Updated `updateReorderButtonStates()`:
- Undo button: `disabled = !state.undoManager?.canUndo()`
- Redo button: `disabled = !state.undoManager?.canRedo()`
- Save button: `disabled = !state.undoManager?.hasChanges()`
- Uses optional chaining for safety when undoManager is null

### SortableJS Integration

**CDN Integration (admin/index.html):**
- Added `<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/Sortable.min.js"></script>`
- Loaded before BisliView.js, available globally as `Sortable`

**Initialization in enterReorderMode():**
```javascript
state.sortableInstance = Sortable.create(productList, {
  handle: '.drag-handle',        // Only grip icon drags
  animation: 150,                 // Smooth transitions
  delay: 50,                      // Prevents accidental drags
  delayOnTouchOnly: true,         // Touch requires 50ms hold
  ghostClass: 'sortable-ghost',   // Semi-transparent preview
  chosenClass: 'sortable-chosen', // Active drag item
  dragClass: 'sortable-drag',     // Item being dragged
  forceFallback: false,           // Use native HTML5 drag
  onStart: (evt) => body.classList.add('dragging-active'),
  onEnd: (evt) => {
    // Create and execute MoveCommand
    // Update button states
    // Log drag event to console
  }
});
```

**onEnd Handler:**
1. Extracts `productId` from dragged element (`.edit-btn` dataset)
2. Creates `MoveCommand(oldIndex, newIndex, productId)`
3. Executes via `state.undoManager.execute(command)`
4. Updates button states (undo enabled, redo cleared, save enabled)
5. Console logs drag event for debugging

### Undo/Redo Handlers

**handleUndo():**
1. Validates `undoManager` exists and can undo
2. Calls `undoManager.undo()` (reverses last command)
3. Calls `rerenderProductList()` to sync DOM
4. Updates button states
5. Shows info toast: "Undid last change"

**handleRedo():**
1. Validates `undoManager` exists and can redo
2. Calls `undoManager.redo()` (re-applies undone command)
3. Calls `rerenderProductList()` to sync DOM
4. Updates button states
5. Shows info toast: "Redid change"

**rerenderProductList():**
1. Gets current order from `undoManager.getCurrentOrder()`
2. Builds map of `productId → DOM row element`
3. Reorders rows in DOM by appending in correct order
4. Destroys old Sortable instance
5. Creates fresh Sortable instance with same config
6. Ensures visual order matches logical state

### Keyboard Shortcuts

**handleReorderKeyboard(e):**
- Ctrl+Z (Cmd+Z on Mac): Undo last drag
- Ctrl+Y (Cmd+Y on Mac): Redo undone drag
- Ctrl+Shift+Z (Cmd+Shift+Z): Alternative redo
- Escape: Trigger cancel button click

**Lifecycle:**
- Added in `enterReorderMode()` via `document.addEventListener('keydown', handleReorderKeyboard)`
- Removed in `exitReorderMode()` via `document.removeEventListener('keydown', handleReorderKeyboard)`
- Prevents default browser behavior (e.g., Ctrl+Z shouldn't undo in text fields)

### Edge Cases Handled

**Search filter validation:**
- Added check at start of `enterReorderMode()`:
  ```javascript
  if (searchInput && searchInput.value.trim()) {
    showErrorToast('Clear search filter before reordering');
    return;
  }
  ```
- Prevents reordering filtered subset of products

**Cancel handler improvements:**
- Changed from `state.undoStack.length > 0` to `state.undoManager?.hasChanges()`
- Destroys Sortable instance before reloading: `state.sortableInstance.destroy()`
- Calls `fetchInfo()` instead of `loadProducts(state.products)` to reload from server
- Ensures fresh data after cancel (discards all uncommitted changes)

**Accessibility attributes:**
- Added to drag handles in `enterReorderMode()`:
  ```javascript
  el.setAttribute('tabindex', '0');          // Keyboard focusable
  el.setAttribute('role', 'button');         // Screen reader role
  el.setAttribute('aria-label', `Drag to reorder product ${index + 1}`);
  ```
- Enables future keyboard drag capability

### Event Listener Registration

Added in `loadProductsPage()` after existing reorder button handlers:
```javascript
const undoBtn = document.getElementById('undoBtn');
if (undoBtn) {
  undoBtn.addEventListener('click', handleUndo);
}

const redoBtn = document.getElementById('redoBtn');
if (redoBtn) {
  redoBtn.addEventListener('click', handleRedo);
}
```

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions

### Why command pattern over simple array manipulation?
- **Encapsulation:** Each operation is self-contained (execute/undo methods)
- **Extensibility:** Easy to add new command types (batch move, swap)
- **Debugging:** Command objects visible in DevTools for inspection
- **Testability:** Commands can be unit tested independently

### Why DOM re-rendering on undo/redo?
- **Single source of truth:** undoManager.productOrder is authoritative
- **Prevents desync:** DOM always reflects command history state
- **Simplicity:** No need to sync Sortable's internal state manually
- **Reliability:** Fresh Sortable instance after each undo/redo

### Why destroy/recreate Sortable on undo?
- **SortableJS state:** Library maintains internal index state
- **Conflict prevention:** Re-rendering DOM can desync internal state
- **Clean slate:** Fresh instance guaranteed to match DOM
- **Performance:** Negligible overhead for typical product counts (<200)

### Why block reorder mode when search is active?
- **User confusion:** Filtered view doesn't show full category
- **Data integrity:** Reordering subset creates gaps in displayOrder
- **Error prevention:** User might think they're reordering all products
- **Clear workflow:** Clear search → reorder → save (explicit steps)

## Testing Performed

All verification criteria met:
- SortableJS loads from CDN, `Sortable` global available ✓
- Drag handles work (only grip icon initiates drag, not row) ✓
- Ghost preview visible during drag (semi-transparent) ✓
- Undo reverses last drag ✓
- Multiple undo operations work (stack-based) ✓
- Redo re-applies undone drags ✓
- Ctrl+Z keyboard shortcut undoes ✓
- Ctrl+Y keyboard shortcut redoes ✓
- Escape key prompts to cancel (if changes exist) ✓
- Cannot enter reorder mode with search active (error toast) ✓
- Cancel with changes prompts confirmation ✓
- After cancel, products reload in original order from server ✓
- Console logs show drag events with correct indices ✓

## Next Phase Readiness

**Plan 03 (API Integration):**
- `undoManager.getCurrentOrder()` provides product IDs in final order
- Save button already wired to `disabled = !undoManager.hasChanges()`
- All UI interactions complete, ready for backend POST /api/admin/products/reorder
- Toast system ready for API success/error feedback
- 409 Conflict handling pattern ready (refresh and retry)

**Unknowns:**
- None - all dependencies satisfied

## Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Implement command pattern for undo/redo | 98997ca | admin/BisliView.js |
| 2 | Integrate SortableJS with drag handles | 75ce765 | admin/index.html, admin/BisliView.js |
| 3 | Handle edge cases and keyboard shortcuts | f6a8284 | admin/BisliView.js |

**Total commits:** 3 (one per task, atomic and independently revertable)

---

*Execution time: 5 minutes*
*Completed: 2026-02-03*
