---
phase: 29-admin-ui-translation-workflow
plan: 01
subsystem: admin-ui
tags: [admin-forms, bilingual-ui, translation-workflow, css-grid]

dependency-graph:
  requires:
    - phase: 28-02
      provides: [POST /admin/translate endpoint]
  provides:
    - Bilingual form fields for product name and description
    - Translation buttons calling POST /admin/translate
    - Admin can manually edit any field before saving
  affects: [29-02]

tech-stack:
  added: []
  patterns: [css-grid-bilingual-layout, translate-button-pattern, inline-error-display]

key-files:
  created: []
  modified:
    - admin/bambaYafa-desktop.css
    - admin/BisliView.js

key-decisions:
  - "Side-by-side bilingual field layout using CSS grid (1fr auto 1fr)"
  - "Translate button shows bidirectional arrows (→ for EN→HE, ← for HE→EN)"
  - "Overwrite confirmation when translating into field with existing content"
  - "Loading state with spinning animation during API call"
  - "Inline error display below bilingual field groups"
  - "Hidden legacy name/description fields for backward compatibility"

patterns-established:
  - "Bilingual field pattern: grid with left field, center translate buttons, right field"
  - "RTL support via .bilingual-field__item--rtl class with direction: rtl"
  - "Field-updated animation (green flash) on successful translation"
  - "Language badge pattern (.label-lang) for field labels"

metrics:
  duration_seconds: 213
  tasks_completed: 2
  files_created: 0
  files_modified: 2
  commits: 2
  completed_date: 2026-02-15
---

# Phase 29 Plan 01: Admin UI Translation Workflow Summary

Side-by-side bilingual form fields for product name and description with translate buttons calling Phase 28 translation endpoint, inline error handling, and RTL support.

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T18:14:40Z
- **Completed:** 2026-02-15T18:18:12Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- CSS grid layout for side-by-side English/Hebrew fields with translate buttons
- Translate button handler with loading state, overwrite confirmation, and error handling
- Bilingual fields added to both Add Product and Edit Product forms
- Edit form pre-populates with existing bilingual data from product object
- Hidden legacy name/description fields maintain backward compatibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Add bilingual CSS and translate button handler** - `b7352e9` (feat)
2. **Task 2: Add bilingual fields to Add and Edit Product forms** - `8bda2d7` (feat)

**Plan metadata:** (will be added in final commit)

## Files Created/Modified

- `admin/bambaYafa-desktop.css` - Added bilingual field layout, translate button styles, field-error, label-lang badge, field-updated animation, spin keyframes
- `admin/BisliView.js` - Added handleTranslateClick and attachTranslateHandlers functions, replaced single-language fields with bilingual layouts in both Add and Edit Product forms

## Implementation Details

### CSS Additions (admin/bambaYafa-desktop.css)

Added 113 lines of CSS after line 913:

1. **.bilingual-field** - CSS grid with `1fr auto 1fr` columns for side-by-side layout
2. **.bilingual-field__item** - Flex column container for label + input
3. **.bilingual-field__item--rtl** - RTL support with `direction: rtl; text-align: right;`
4. **.bilingual-field__actions** - Center column with translate buttons, `padding-top: 28px` to align with input fields
5. **.btn-translate** - 36x36px button with border, hover states, disabled state
6. **.btn-translate.is-loading** - Loading state with spinning border animation
7. **.field-error** - Inline error display with red background and border
8. **.label-lang** - Small badge (EN/HE) for field labels
9. **.field-updated** - Animation for successful translation (green flash)
10. **@keyframes spin** - Rotation animation for loading state
11. **@keyframes fieldHighlight** - Green background fade for field-updated

All styles use existing CSS variables (`--border`, `--surface-2`, `--muted`, `--primary`, `--danger`) for consistency with design system.

### JavaScript Additions (admin/BisliView.js)

**handleTranslateClick function (92 lines):**
- Gets source/target input elements from button's data attributes
- Validates source field has content (shows error toast if empty)
- Confirms overwrite if target field already has content
- Disables button and adds `.is-loading` class during API call
- Calls `apiFetch('/admin/translate', ...)` with text and targetLang
- Uses `localStorage.getItem('auth-token')` for Authorization header
- On success: populates target field, adds `.field-updated` animation, shows success toast
- On error: displays inline error message + error toast
- Always re-enables button and removes loading state in finally block

**attachTranslateHandlers function:**
- Finds all `.btn-translate` buttons in current DOM
- Attaches `handleTranslateClick` as click listener to each button
- Called after both Add Product and Edit Product form renders

### Form Changes

**Add Product Form (loadAddProductsPage):**
- Replaced single `name` input with bilingual layout:
  - Left: `name_en` input (English)
  - Center: Two translate buttons (→ and ←)
  - Right: `name_he` input (Hebrew, dir="rtl")
  - Below: Error div and hidden `name` field
- Replaced single `description` textarea with same bilingual pattern
- Called `attachTranslateHandlers()` after form inserted into DOM

**Edit Product Form (editProduct):**
- Same bilingual layout as Add Product
- Pre-populates `name_en` with `product.name_en || product.name || ''`
- Pre-populates `name_he` with `product.name_he || ''`
- Pre-populates `description_en` with `product.description_en || product.description || ''`
- Pre-populates `description_he` with `product.description_he || ''`
- Hidden legacy fields populated with `product.name` and `product.description`
- Updated page subtitle to use `product.name_en || product.name`
- Called `attachTranslateHandlers()` after form setup

## Decisions Made

1. **CSS Grid layout (1fr auto 1fr)** - Clean three-column layout with translate buttons centered between fields
2. **Bidirectional translate buttons** - Arrow symbols (→ and ←) clearly indicate translation direction
3. **Overwrite confirmation** - Prevents accidental loss of manual edits when translating into populated field
4. **Loading state with spin animation** - Visual feedback during API call, button disabled to prevent double-clicks
5. **Inline error display** - Field-specific errors shown below bilingual field group, separate from toast notifications
6. **Hidden legacy fields** - Maintains backward compatibility with existing backend code expecting `name` and `description` fields
7. **Language badges (EN/HE)** - Clear labeling of which language each field represents

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 29-02 (Backend Bilingual Field Wiring + Product List Translation Badges)

**What's ready:**
- Bilingual form UI with translate buttons functional
- Translation workflow calls POST /admin/translate endpoint
- Edit form loads existing bilingual data
- Add form ready for new bilingual product creation

**What's needed next (Plan 29-02):**
- Wire up form submission to save bilingual fields to backend
- Populate hidden legacy name/description fields from _en fields on submit
- Add translation status badges to product list (translated/untranslated indicators)
- Handle bilingual data in updateProduct and addProduct handlers

## Verification Results

All plan verification steps passed:

1. ✓ admin/bambaYafa-desktop.css contains `.bilingual-field`, `.btn-translate`, `.field-error`, `.label-lang`, `.field-updated`, `@keyframes spin`, `@keyframes fieldHighlight` (17 occurrences)
2. ✓ admin/BisliView.js contains `handleTranslateClick` function with `apiFetch('/admin/translate'...)` call
3. ✓ admin/BisliView.js contains `attachTranslateHandlers` function (3 occurrences: definition + 2 calls)
4. ✓ `name-en`, `name-he`, `description-en`, `description-he` fields exist in both forms (9 occurrences each)
5. ✓ `.bilingual-field` appears in both loadAddProductsPage and editProduct (16 occurrences)
6. ✓ `.btn-translate` buttons exist (9 occurrences: 4 buttons per form x 2 forms + definition)
7. ✓ `attachTranslateHandlers()` called in both loadAddProductsPage and editProduct contexts
8. ✓ Hidden `name` and `description` fields exist for backward compatibility

## Self-Check: PASSED

### Files Modified
- [x] admin/bambaYafa-desktop.css modified with bilingual field CSS
- [x] admin/BisliView.js modified with translate handler and bilingual forms

### Commits
- [x] b7352e9 exists in git history (Task 1)
- [x] 8bda2d7 exists in git history (Task 2)

### Functionality
- [x] CSS grid layout creates side-by-side bilingual fields
- [x] Translate buttons positioned between field pairs
- [x] handleTranslateClick calls POST /admin/translate with correct payload
- [x] Loading state shows spinner animation during API call
- [x] Overwrite confirmation shown when target field has content
- [x] Inline errors displayed below field groups
- [x] Field-updated animation triggers on successful translation
- [x] attachTranslateHandlers wires up all translate buttons
- [x] Both Add Product and Edit Product forms use bilingual layout
- [x] Edit form pre-populates with existing bilingual data
- [x] Hidden legacy fields maintain backward compatibility
- [x] RTL support applied to Hebrew fields
- [x] Language badges (EN/HE) visible on field labels

---
*Phase: 29-admin-ui-translation-workflow*
*Completed: 2026-02-15*
