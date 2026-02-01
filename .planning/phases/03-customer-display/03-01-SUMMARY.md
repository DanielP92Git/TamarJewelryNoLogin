---
phase: 03-customer-display
plan: 01
subsystem: ui
tags: [frontend, sku, modal, clipboard-api, rtl, i18n]

# Dependency graph
requires:
  - phase: 02-admin-workflow
    provides: SKU field in product schema and admin UI
provides:
  - SKU display on customer-facing product modals
  - Multi-language SKU labels (English/Hebrew)
  - Copy-to-clipboard functionality with visual feedback
  - RTL-aware SKU display
  - Placeholder for products without SKU
affects: [future customer-facing features requiring SKU visibility]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Copy-to-clipboard with Clipboard API"
    - "LTR value enforcement in RTL context using dir attribute"
    - "CSS-only tooltip with data attributes and animations"
    - "Keyboard accessibility with tabindex and Enter/Space handlers"

key-files:
  created: []
  modified:
    - frontend/js/Views/categoriesView.js
    - frontend/css/categories-800plus.css
    - frontend/css/categories-devices.css
    - backend/index.js

key-decisions:
  - "SKU value always LTR (dir='ltr') to prevent reversal in RTL mode"
  - "Copy-to-clipboard requires user gesture (click/keyboard), no auto-copy"
  - "Tooltip positioned above element to avoid overlap with modal content"
  - "Focus outline only on keyboard navigation, not mouse clicks"
  - "Dedicated PATCH /api/products/:id/sku endpoint for inline editing"

patterns-established:
  - "Pattern 1: Clipboard API with fallback error handling and user feedback"
  - "Pattern 2: Language-aware labels using this.lang conditional"
  - "Pattern 3: Placeholder styling with --modifier BEM syntax"
  - "Pattern 4: Accessible copy action with click + keyboard handlers"

# Metrics
duration: 342min
completed: 2026-02-01
---

# Phase 03 Plan 01: SKU Display on Modal Summary

**Customer-facing SKU display with multi-language support, RTL handling, copy-to-clipboard, and accessibility**

## Performance

- **Duration:** 5h 42min (342 minutes)
- **Started:** 2026-02-01T12:29:24+02:00
- **Completed:** 2026-02-01T18:11:36+02:00
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 4

## Accomplishments
- SKU displayed on product modals with language-aware labels (SKU: / makat)
- One-click copy-to-clipboard with visual tooltip feedback
- RTL-safe display: SKU values stay LTR, container aligns per language direction
- Graceful fallback for products without SKU (placeholder text)
- Keyboard accessibility (Tab + Enter/Space to copy)
- Discovered and fixed 4 bugs during implementation and testing

## Task Commits

Each task was committed atomically:

1. **Task 1: Add SKU display to product modal** - `4c06daa` (feat)
2. **Task 2: Add SKU CSS styling** - `efa195e` (feat)
3. **Task 3: Human verification checkpoint** - APPROVED by user

**Additional bugfixes during execution:**
- `0d2dcc0` - Dedicated PATCH endpoint for inline SKU editing
- `17d76af` - CORS support for PATCH method
- `574791c` - Tooltip positioning above element
- `16e5b68` - Remove focus outline on click

**Plan metadata:** _(will be committed after SUMMARY creation)_

## Files Created/Modified
- `frontend/js/Views/categoriesView.js` - Added `_generateSkuMarkup()` method, copy-to-clipboard handler, keyboard accessibility
- `frontend/css/categories-800plus.css` - SKU display styling for desktop, hover states, tooltip animation
- `frontend/css/categories-devices.css` - Mobile-optimized SKU styling with tighter spacing
- `backend/index.js` - Added PATCH /api/products/:id/sku endpoint, CORS PATCH support

## Decisions Made

1. **SKU value always LTR**: Used `dir="ltr"` attribute on `.sku-value` span to prevent reversal in Hebrew/RTL mode (SKU codes are product identifiers, not translatable text)

2. **Copy-to-clipboard via Clipboard API**: Used modern `navigator.clipboard.writeText()` with try/catch error handling instead of deprecated execCommand

3. **CSS-only tooltip with data attributes**: Implemented tooltip using `::after` pseudo-element with `attr(data-tooltip)` instead of JS-injected element

4. **Tooltip positioned above element**: Changed from `top: calc(100% + 8px)` to `bottom: calc(100% + 8px)` after testing showed overlap issues in modal context

5. **Focus outline only on keyboard navigation**: Added `:focus-visible` polyfill behavior - focus outline appears on Tab but not on mouse click (UX improvement)

6. **Dedicated PATCH endpoint for SKU**: Created `/api/products/:id/sku` endpoint accepting `{sku: string}` payload for inline editing from admin product listing

## Deviations from Plan

Plan specified Tasks 1-3. During execution, 4 additional bugs were discovered and fixed following deviation rules:

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing PATCH endpoint for inline SKU editing**
- **Found during:** Task 3 verification - testing admin product listing inline edit
- **Issue:** Admin listing page attempted to PATCH individual SKU field, but backend only supported full product PUT updates
- **Fix:** Added dedicated `PATCH /api/products/:id/sku` endpoint with SKU-only validation
- **Files modified:** `backend/index.js`
- **Verification:** Inline edit from admin listing successfully updates SKU without touching other fields
- **Committed in:** `0d2dcc0`

**2. [Rule 1 - Bug] PATCH method blocked by CORS**
- **Found during:** Task 3 verification - PATCH requests failing with CORS error
- **Issue:** Backend CORS configuration only allowed GET, POST, PUT, DELETE methods
- **Fix:** Added 'PATCH' to allowed methods array in CORS middleware
- **Files modified:** `backend/index.js`
- **Verification:** PATCH requests succeed from frontend
- **Committed in:** `17d76af`

**3. [Rule 1 - Bug] Tooltip obscured by modal content**
- **Found during:** Task 3 verification - tooltip appeared below SKU element and was cut off
- **Issue:** Tooltip positioning used `top: calc(100% + 8px)` which places it below element
- **Fix:** Changed to `bottom: calc(100% + 8px)` to position above element with upward animation
- **Files modified:** `frontend/css/categories-800plus.css`, `frontend/css/categories-devices.css`
- **Verification:** Tooltip appears above SKU element, fully visible
- **Committed in:** `574791c`

**4. [Rule 1 - Bug] Focus outline appears on mouse click**
- **Found during:** Task 3 verification - blue outline appeared when clicking SKU
- **Issue:** `:focus` pseudo-class triggers on both keyboard Tab and mouse click, causing visual noise
- **Fix:** Added `:focus:not(:focus-visible)` rule to suppress outline on mouse/pointer events
- **Files modified:** `frontend/css/categories-800plus.css`, `frontend/css/categories-devices.css`
- **Verification:** Outline only appears when using keyboard Tab, not mouse clicks
- **Committed in:** `16e5b68`

---

**Total deviations:** 4 auto-fixed (4 x Rule 1 - Bug)
**Impact on plan:** All auto-fixes necessary for correct functionality and professional UX. No scope creep - all related to making planned SKU display feature work properly in production context.

## Issues Encountered

None - plan execution was straightforward. All issues were bugs discovered during testing, handled via deviation rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Phase 3 Plan 1 Complete:**
- SKU display feature fully functional on customer-facing product modals
- Multi-language and RTL support verified
- Copy-to-clipboard and keyboard accessibility working
- All bugs fixed, no console errors

**Ready for next customer-facing features** that may reference or build upon SKU visibility.

**No blockers or concerns.**

---
*Phase: 03-customer-display*
*Completed: 2026-02-01*
