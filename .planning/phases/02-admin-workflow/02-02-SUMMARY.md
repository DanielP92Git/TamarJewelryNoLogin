---
phase: 02-admin-workflow
plan: 02
subsystem: admin-ui
status: complete
tags: [sku, forms, validation, admin, inline-validation]
completed: 2026-02-01

dependencies:
  requires: [02-01]
  provides: [sku-form-fields, sku-inline-validation]
  affects: [02-03]

tech-stack:
  added: []
  patterns: [inline-validation, blur-validation, duplicate-detection]

key-files:
  created: []
  modified:
    - path: admin/BisliView.js
      changes: [validateSkuField-function, add-product-sku-field, edit-product-sku-field, sku-validation-handlers]

decisions:
  - title: Blur-based validation instead of submit-only
    rationale: Provides immediate feedback to admin before form submission attempt
    impact: Better UX, catches duplicates early
  - title: Auto-uppercase with cursor preservation
    rationale: Prevents duplicate SKUs from case differences, maintains typing flow
    impact: Consistent SKU format without interrupting admin workflow
  - title: Scroll and focus on validation error
    rationale: Guides admin to the problem field immediately
    impact: Faster error resolution, especially on long forms
  - title: Confirmation dialog for SKU changes
    rationale: Prevents accidental SKU changes that could affect inventory tracking
    impact: Safety mechanism for existing products

metrics:
  duration: 8.2 minutes
  tasks: 3
  commits: 3
  files-modified: 1
---

# Phase 2 Plan 2: Add SKU Form Fields with Validation Summary

**One-liner:** SKU input fields with inline duplicate validation and auto-uppercase on Add/Edit Product forms

## What Was Built

### Core Functionality

1. **SKU Validation Function** (`validateSkuField`)
   - Format validation: 2-7 alphanumeric characters
   - Duplicate check via `/check-sku-duplicate` API
   - Product exclusion for edit scenarios
   - User-friendly error messages with clickable product links
   - Graceful degradation on API failures

2. **Add Product Form Integration**
   - Product Identifier card with SKU input field
   - Required field indicator (red asterisk)
   - Auto-uppercase input with cursor position preservation
   - Blur-based validation calling validateSkuField()
   - Form submission validates SKU before other fields
   - Scroll to and focus on SKU field for validation errors

3. **Edit Product Form Integration**
   - Product Identifier card with SKU input field
   - Pre-filled with existing `product.sku` value
   - Contextual help text (different for products with/without SKU)
   - Original SKU storage for change detection
   - Blur validation excluding current product from duplicate check
   - Confirmation dialog when changing existing SKU
   - SKU update only sent when value changes

## Technical Implementation

### Validation Flow

```
User types in SKU field
  → Auto-uppercase transformation (input event)
  → User moves to next field
  → Blur event triggers
  → validateSkuField() runs
    → Format check (length, alphanumeric)
    → API duplicate check (/check-sku-duplicate)
    → Display error or clear
  → User submits form
  → Final validation (Add form: required check, Edit form: change warning)
  → Submit to backend
```

### Key Code Patterns

**Auto-uppercase with Cursor Preservation:**
```javascript
skuInput.addEventListener('input', (e) => {
  const start = e.target.selectionStart;
  const end = e.target.selectionEnd;
  e.target.value = e.target.value.toUpperCase();
  e.target.setSelectionRange(start, end);
});
```

**Product Exclusion in Edit Form:**
```javascript
await validateSkuField(skuInput.value.trim(), product.id);
```

**Change Detection:**
```javascript
const originalSku = product.sku || '';
// ... later ...
if (newSkuValue !== originalSku) {
  formData.append("sku", newSkuValue || null);
}
```

## Files Modified

### `admin/BisliView.js`
- **Lines ~174-270**: Added `validateSkuField()` async function
- **Lines ~3231-3275**: Added SKU card to Add Product form HTML
- **Lines ~3368-3385**: Added SKU input handlers for Add Product form
- **Lines ~3479-3502**: Added SKU validation in Add Product submit handler
- **Lines ~3571**: Added SKU to Add Product data object
- **Lines ~2056-2082**: Added SKU card to Edit Product form HTML
- **Lines ~2179**: Stored originalSku for change detection
- **Lines ~2188-2206**: Added SKU input handlers for Edit Product form
- **Lines ~2607-2630**: Added SKU validation in updateProduct function
- **Lines ~2651-2654**: Added conditional SKU to formData

## Verification Results

All success criteria met:

- ✅ validateSkuField function exists and handles format + duplicate validation
- ✅ Add Product form has SKU field with required indicator (red asterisk)
- ✅ Edit Product form has SKU field pre-filled with product.sku value
- ✅ SKU input auto-uppercases text while preserving cursor position
- ✅ Blur validation shows format errors (length, alphanumeric)
- ✅ Blur validation shows duplicate errors with conflicting product link
- ✅ Add Product form submission includes sku field
- ✅ Edit Product form submission includes sku when changed
- ✅ Edit form shows confirmation when changing existing SKU
- ✅ Validation errors scroll to and focus SKU field

## Integration Points

### Upstream Dependencies
- **Plan 02-01**: `/check-sku-duplicate` API endpoint for duplicate detection
- **Plan 01-01**: Database SKU field with unique constraint

### Downstream Impact
- **Plan 02-03**: SKU column in product listing can display values entered here
- **Future plans**: SKU search, filtering, and bulk operations will use these values

## Edge Cases Handled

1. **Empty SKU on Edit**: Allows removal of SKU (formData sends null)
2. **Unchanged SKU on Edit**: No duplicate error, no unnecessary update
3. **API Failure**: Validation allows submission (backend validates)
4. **Duplicate Detection**: Shows product name and clickable link to edit conflicting product
5. **Format Validation**: Clear error messages for length and character requirements
6. **Cursor Position**: Preserved during auto-uppercase to avoid jarring UX

## Deviations from Plan

None - plan executed exactly as written.

## Authentication Gates

None.

## Next Phase Readiness

**Ready for Plan 02-03**: SKU form fields now functional and validated. Product listing can display and filter by SKU values.

**Blockers:** None

**Concerns:** None

## Performance Notes

- Blur validation adds ~200-300ms API call overhead (acceptable for UX improvement)
- Duplicate check fails gracefully if API unreachable
- No performance impact on form rendering

---

**Plan completed:** 2026-02-01
**Execution time:** 8.2 minutes
**Task completion:** 3/3
**Commits:** a46573d, 155b285, 96497ef
