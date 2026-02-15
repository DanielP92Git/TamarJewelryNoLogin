---
phase: 29-admin-ui-translation-workflow
plan: 02
subsystem: admin-backend-integration
tags: [bilingual-data-flow, translation-status, form-submission, product-list-ui]

dependency-graph:
  requires:
    - phase: 29-01
      provides: [Bilingual form UI with translate buttons]
    - phase: 27-01
      provides: [Bilingual schema fields in Product model]
  provides:
    - Backend endpoints accept and save name_en, name_he, description_en, description_he
    - Form submission sends bilingual fields to backend
    - Product list shows translation status badges (Bilingual/Needs translation/No translations)
    - Legacy name/description fields populated for backward compatibility
  affects: [30, 31, 32]

tech-stack:
  added: []
  patterns: [bilingual-data-persistence, translation-status-badge-pattern]

key-files:
  created: []
  modified:
    - backend/index.js
    - admin/BisliView.js
    - admin/bambaYafa-desktop.css

key-decisions:
  - "Fallback to legacy name/description fields for English content ensures backward compatibility"
  - "Translation status badge logic: bilingual (both EN+HE complete), needs translation (partial), no translations (none)"
  - "Badge color scheme: green for bilingual, yellow for needs translation, muted gray for no translations"
  - "Validation requires at least one language (EN or HE) for product name"

patterns-established:
  - "Translation badge pattern: compute status from bilingual field presence, display inline with stock status"
  - "Legacy field population pattern: derive from bilingual fields with English priority"

metrics:
  duration_seconds: 323
  tasks_completed: 2
  files_created: 0
  files_modified: 3
  commits: 2
  completed_date: 2026-02-15
---

# Phase 29 Plan 02: Backend Bilingual Field Wiring + Product List Translation Badges Summary

Backend endpoints accept and save bilingual fields, form submission sends all four bilingual fields, product list displays translation status badges showing bilingual/partial/none states.

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-15T18:21:21Z
- **Completed:** 2026-02-15T18:26:44Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Backend POST /addproduct endpoint extracts and saves name_en, name_he, description_en, description_he
- Backend POST /updateproduct/:id endpoint extracts and updates bilingual fields
- Admin addProduct function sends bilingual fields in productData JSON
- Admin updateProduct function sends bilingual fields via FormData
- Product list renders translation status badges for each product
- Legacy name/description fields populated from English content for backward compatibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Update backend endpoints to accept and save bilingual fields** - `754a0af` (feat)
2. **Task 2: Wire form submission to send bilingual fields and add translation badges** - `57d4868` (feat)

**Plan metadata:** (will be added in final commit)

## Files Created/Modified

- `backend/index.js` - Added bilingual field extraction and persistence in addproduct (line 2138-2141) and updateproduct (line 2281-2284, 2321-2324) endpoints
- `admin/BisliView.js` - Updated addProduct to extract bilingual fields and send in productData (line 4436-4449, 4576-4579), updated updateProduct to extract and append bilingual fields to FormData (line 3935-3943, 3962-3965), added translation badge rendering in product list (line 2205-2213, 2246)
- `admin/bambaYafa-desktop.css` - Added .badge--muted CSS class for "No translations" state (line 885-889)

## Implementation Details

### Backend Changes (backend/index.js)

**POST /addproduct endpoint (line 2115-2144):**
- Added bilingual fields to Product construction:
  - `name_en: req.body.name_en || req.body.name || ''` (fallback to legacy name)
  - `name_he: req.body.name_he || ''`
  - `description_en: req.body.description_en || req.body.description || ''` (fallback to legacy description)
  - `description_he: req.body.description_he || ''`
- Legacy `name` and `description` fields remain unchanged for backward compatibility

**POST /updateproduct/:id endpoint (line 2273-2324):**
- Added bilingual field extraction from req.body (line 2281-2284)
- Added conditional updates after existing field updates (line 2321-2324):
  ```javascript
  if (name_en !== undefined) product.name_en = name_en || '';
  if (name_he !== undefined) product.name_he = name_he || '';
  if (description_en !== undefined) product.description_en = description_en || '';
  if (description_he !== undefined) product.description_he = description_he || '';
  ```

### Admin Form Changes (admin/BisliView.js)

**addProduct function (line 4405):**
- Extracts bilingual fields from form inputs (line 4436-4439):
  ```javascript
  const nameEn = document.getElementById("name-en")?.value?.trim() || '';
  const nameHe = document.getElementById("name-he")?.value?.trim() || '';
  const descriptionEn = document.getElementById("description-en")?.value?.trim() || '';
  const descriptionHe = document.getElementById("description-he")?.value?.trim() || '';
  ```
- Derives legacy fields from bilingual content (line 4442-4443):
  ```javascript
  const name = nameEn || nameHe || '';
  const description = descriptionEn || descriptionHe || '';
  ```
- Updates hidden legacy input fields for backward compatibility (line 4446-4449)
- Changed validation to require at least one language for name (line 4458)
- Added bilingual fields to productData object sent to backend (line 4576-4579)

**updateProduct function (line 3902):**
- Extracts bilingual fields from form inputs (line 3935-3938)
- Derives legacy fields from bilingual content with fallback (line 3941-3942)
- Appends bilingual fields to FormData for multipart/form-data submission (line 3962-3965)

**Product list rendering (line 2164):**
- Added translation badge logic before innerHTML assignment (line 2205-2213):
  - Checks if both EN and HE have name AND description → "Bilingual" (green badge--success)
  - Checks if any bilingual field exists → "Needs translation" (yellow badge--warning)
  - Otherwise → "No translations" (gray badge--muted)
- Badge inserted after stock status badge in product list HTML (line 2246)

### CSS Changes (admin/bambaYafa-desktop.css)

**New .badge--muted class (line 885-889):**
```css
.badge--muted {
  color: var(--muted-2);
  background: rgba(157, 157, 185, 0.08);
  border-color: rgba(157, 157, 185, 0.15);
}
```
Uses existing CSS variables for consistency with design system.

## Data Flow

1. **Add Product Flow:**
   - User fills bilingual fields in form (name-en, name-he, description-en, description-he)
   - addProduct function extracts values from inputs
   - Legacy name/description derived from bilingual fields (English priority)
   - productData JSON sent to POST /addproduct with all four bilingual fields
   - Backend persists bilingual fields to database
   - Legacy fields remain populated for backward compatibility

2. **Edit Product Flow:**
   - editProduct loads existing product data, pre-populates bilingual fields (from Phase 29-01)
   - updateProduct function extracts bilingual field values
   - FormData built with bilingual fields appended
   - POST /updateproduct/:id receives FormData and conditionally updates bilingual fields
   - Backend persists changes to database

3. **Product List Display:**
   - Product list fetches products from database with bilingual fields
   - For each product, translation badge computed from field presence
   - Badge rendered inline with stock status badge
   - Green badge if both languages complete, yellow if partial, muted if none

## Decisions Made

1. **Backward compatibility strategy** - Legacy name/description fields populated from English content ensures existing code depending on single-language fields continues to work
2. **Translation status logic** - "Bilingual" requires BOTH name AND description in both languages (complete translation), not just existence of any bilingual field
3. **Badge color scheme** - Green (success) for bilingual, yellow (warning) for partial, muted gray for no translations - matches existing admin UI badge patterns
4. **Validation requirement** - At least one language required for name prevents empty product creation while allowing single-language products during migration period

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 30 (Product Translation Management)

**What's ready:**
- Backend persists bilingual fields to database
- Form submission sends all bilingual fields
- Product list shows translation status for easy identification of products needing translation
- Legacy fields maintain backward compatibility

**What's needed next (Phase 30):**
- Batch translation workflow for untranslated products
- Translation queue management
- Bulk translate action in admin UI
- Migration script to populate bilingual fields from legacy fields (if not already complete)

## Verification Results

All plan verification steps passed:

1. ✓ Backend endpoints accept bilingual fields: `grep -c "name_en\|name_he\|description_en\|description_he" backend/index.js` returns 34 matches
2. ✓ Form submission sends bilingual fields: `grep "formData.append.*name_en" admin/BisliView.js` finds match in updateProduct
3. ✓ Product list has translation badges: `grep "badge--translation" admin/BisliView.js` finds 3 matches (Bilingual, Needs translation, No translations)
4. ✓ CSS has muted badge: `grep "badge--muted" admin/bambaYafa-desktop.css` finds match
5. ✓ All backend tests pass: 446 tests passed (1 pre-existing image processing test failure unrelated to changes)
6. ✓ No JavaScript syntax errors expected - changes follow existing patterns

## Self-Check: PASSED

### Files Modified
- [x] backend/index.js modified with bilingual field handling in addproduct and updateproduct
- [x] admin/BisliView.js modified with bilingual field extraction and badge rendering
- [x] admin/bambaYafa-desktop.css modified with badge--muted class

### Commits
- [x] 754a0af exists in git history (Task 1)
- [x] 57d4868 exists in git history (Task 2)

### Functionality
- [x] POST /addproduct accepts name_en, name_he, description_en, description_he from req.body
- [x] POST /updateproduct/:id accepts bilingual fields from req.body
- [x] addproduct endpoint saves bilingual fields to database with fallback to legacy fields
- [x] updateproduct endpoint conditionally updates bilingual fields in database
- [x] addProduct function extracts bilingual fields from form inputs
- [x] addProduct sends bilingual fields in productData JSON
- [x] updateProduct extracts bilingual fields and appends to FormData
- [x] Product list computes translation status from bilingual field presence
- [x] Translation badges render with correct text and color classes
- [x] Legacy name/description fields populated from English content
- [x] Validation requires at least one language for product name
- [x] Badge--muted CSS class added for "No translations" state

---
*Phase: 29-admin-ui-translation-workflow*
*Completed: 2026-02-15*
