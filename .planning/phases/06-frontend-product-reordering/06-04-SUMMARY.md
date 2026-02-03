---
phase: 06-frontend-product-reordering
plan: 04
subsystem: verification
tags: [human-verification, UAT, checkpoint]

requires:
  - 06-01 # Reorder mode UI infrastructure
  - 06-02 # SortableJS integration with undo/redo
  - 06-03 # API integration and save workflow

provides:
  - human-verified-reorder-feature

issues_found: 3
issues_fixed: 3

tech-stack:
  verified:
    - Toastify.js toast notifications
    - SortableJS drag-and-drop
    - Command pattern undo/redo
    - Backend reorder API
    - Loading states and error handling
    - Navigation protection (beforeunload)

key-files:
  modified:
    - admin/BisliView.js # Bug fixes during checkpoint
    - backend/index.js # Added displayOrder sorting

decisions:
  - what: "Store products in state.products in loadProducts()"
    why: "getFilteredProducts() needs access to full product list for category filtering"
    impact: "Bug fix - reorder mode can now enter successfully"

  - what: "Use MongoDB _id (ObjectId strings) throughout app instead of numeric id"
    why: "Backend API expects ObjectId strings, not numbers"
    impact: "All data-product-id attributes changed from item.id to item._id"

  - what: "Sort /allproducts endpoint by category and displayOrder"
    why: "Admin panel must reflect saved product order after reordering"
    impact: "Products now display in correct order after save"

metrics:
  duration: 45 minutes (including 3 bug fixes)
  completed: 2026-02-03
---

# Phase 06 Plan 04: Human Verification Summary

Complete drag-and-drop product reordering feature verified through hands-on testing. Three bugs discovered and fixed during checkpoint.

## Checkpoint Flow

**Initial Testing → Bug Found → Fixed → Retested → Bug Found → Fixed → Retested → Bug Found → Fixed → Approved**

## Issues Found and Fixed

### Issue 1: "No products in this category to reorder"
**Symptom:** Clicking "Reorder Products" button always showed error toast even with valid category selected.

**Root Cause:** `loadProducts(data)` function wasn't storing product data in `state.products`, so `getFilteredProducts()` found `state.products === null`.

**Fix (Commit 5c8b416):**
```javascript
// Added to loadProducts() function
state.products = data; // Store full product list
```

**Result:** Reorder mode now enters successfully.

---

### Issue 2: CastError - Cast to ObjectId failed for value "2"
**Symptom:** Backend threw MongoDB casting error when saving reorder.

**Root Cause:** Frontend sent numeric IDs (like `2`) instead of MongoDB ObjectId strings (like `"507f1f77bcf86cd799439011"`).

**Details:**
- Product rows used `data-product-id="${item.id}"` (numeric)
- UndoManager collected these numeric IDs
- Backend expected ObjectId strings

**Fix (Commit a9464a2):**
Changed all product ID references to use `_id`:
- `products.map(p => p.id)` → `products.map(p => p._id)`
- All `data-product-id="${item.id}"` → `data-product-id="${item._id}"`
- Updated 7 locations: checkbox, SKU cell, edit/duplicate/delete buttons, image delete buttons

**Result:** Backend receives valid ObjectId strings, save succeeds.

---

### Issue 3: Products return to original position after save
**Symptom:** Drag and save worked, but after reload products appeared in original order.

**Root Cause:** Two issues:
1. **Frontend:** `saveProductOrder` used `p.id` instead of `p._id` to match products after save
2. **Backend:** `/allproducts` endpoint didn't sort by `displayOrder`

**Fix (Commit c9bda92):**

Frontend:
```javascript
// Changed in saveProductOrder
state.products.find(p => p.id === id)  // ❌ Wrong
state.products.find(p => p._id === id) // ✅ Correct
```

Backend:
```javascript
// Added sorting to /allproducts endpoint
Product.find({}).sort({ category: 1, displayOrder: 1 }).lean()
```

**Result:** Products display in saved order after reload.

---

## Verification Results

All ORDER requirements verified through hands-on testing:

### ✓ Test 1: Enter Reorder Mode (ORDER-05)
- Floating action bar appears with all buttons
- Drag handles visible on product rows
- Category dropdown disabled
- Info toast "Reorder mode active"

### ✓ Test 2: Drag and Drop (ORDER-01, ORDER-02, ORDER-03, ORDER-04)
- Grip handle initiates drag (not entire row)
- Ghost preview visible during drag
- Product moves with animation
- Undo/Save buttons enable after drag

### ✓ Test 3: Undo/Redo (ORDER-10, ORDER-11)
- Undo button reverses last move
- Multiple undos work correctly (stack-based)
- Redo re-applies undone moves
- Keyboard shortcuts work (Ctrl+Z, Ctrl+Y)

### ✓ Test 4: Cancel (ORDER-07)
- Confirm dialog appears if unsaved changes
- Products return to original order on cancel
- Exits reorder mode cleanly

### ✓ Test 5: Save (ORDER-06, ORDER-08)
- Loading overlay with spinner displays
- All buttons disabled during save
- Success toast appears
- **Products persist in new order after page refresh**

### ✓ Test 6: Error Handling (ORDER-09)
- Error toasts show user-friendly messages
- Network errors handled gracefully
- 409 conflicts auto-refresh

### ✓ Test 7: Customer-Facing Order
- Admin-defined order reflects on customer pages
- Backend sorts by displayOrder correctly

### ✓ Test 8: Edge Cases
- "All Categories" blocks reorder mode with error
- Search filter blocks reorder mode
- Browser warns on tab close with unsaved changes
- Sidebar navigation prompts confirm dialog

## Technical Highlights

**Three-layer ID consistency:**
- Database: MongoDB `_id` field (ObjectId)
- API: Accepts/returns ObjectId strings
- Frontend: Uses `_id` throughout (data attributes, state management, API calls)

**Sorting cascade:**
- Backend: `.sort({ category: 1, displayOrder: 1 })`
- Frontend: Displays products as received (pre-sorted)
- Result: Consistent order across admin and customer views

**Checkpoint value:**
- Found 3 critical bugs that automated tests would miss
- Bugs manifested only in real user workflow
- Fixes applied atomically with clear commit messages
- User verified fixes before approval

## Files Modified During Checkpoint

| File | Changes | Commits |
|------|---------|---------|
| admin/BisliView.js | Store products in state, use _id for IDs, fix product matching | 5c8b416, a9464a2, c9bda92 |
| backend/index.js | Add displayOrder sorting to /allproducts | c9bda92 |

## Commits

| Commit | Description | Type |
|--------|-------------|------|
| 5c8b416 | Store products in state for filtering | Bug fix |
| a9464a2 | Use MongoDB _id instead of numeric id | Bug fix |
| c9bda92 | Ensure products display in saved order | Bug fix |

**Total commits:** 3 (all bug fixes discovered during checkpoint)

---

## Phase 6 Readiness

All ORDER requirements (ORDER-01 through ORDER-11) verified and approved. Product reordering feature is production-ready:

- ✅ UI/UX matches industry standards (Shopify, WooCommerce)
- ✅ Full undo/redo with keyboard shortcuts
- ✅ Loading states and error handling
- ✅ Navigation protection prevents data loss
- ✅ Customer-facing order matches admin-defined order
- ✅ Edge cases handled gracefully

**Next:** Phase verification to confirm all must_haves satisfied.

---

*Execution time: 45 minutes*
*Completed: 2026-02-03*
*User approval: pass*
