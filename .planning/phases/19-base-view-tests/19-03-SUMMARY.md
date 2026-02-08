---
phase: 19-base-view-tests
plan: 03
subsystem: testing
tags: [vitest, testing-library, dom, view, navigation, menu, i18n]

# Dependency graph
requires:
  - phase: 19-01
    provides: View instantiation pattern with minimal DOM fixture and testing helpers
provides:
  - Header menu rendering tests for English and Hebrew navigation
  - Category dropdown validation across both languages
  - Menu state update tests on language change
  - Cart icon and cart number display tests
  - Footer update tests on language change
affects: [19-04, future view testing phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Using getAllByRole/queryAllByText for elements appearing in multiple places (menu + footer)
    - Testing menu replacement by checking ul-eng and ul-heb classes
    - Explicit String() conversion for numeric textContent to handle DOM quirks

key-files:
  created:
    - frontend/tests/view/header-menu.test.js
  modified:
    - frontend/js/View.js

key-decisions:
  - "Use getAllByRole/queryAllByText for text appearing in menu and footer (avoids multiple element errors)"
  - "Test menu replacement via ul-eng/ul-heb classes instead of text content (more reliable)"
  - "Convert cart number to string explicitly to handle Happy-DOM textContent quirk with 0"

patterns-established:
  - "Pattern 1: For elements appearing in multiple places (menu + footer), use getAllBy*/queryAllBy* and check first match or array length"
  - "Pattern 2: Test DOM replacement by checking class names rather than text content when text appears in multiple places"
  - "Pattern 3: Explicit String() conversion for numeric values assigned to textContent ensures cross-environment compatibility"

# Metrics
duration: 7min
completed: 2026-02-08
---

# Phase 19 Plan 03: Header Menu Tests Summary

**32 comprehensive tests validating English/Hebrew navigation links, category dropdowns, menu state updates, cart icon rendering, and footer content changes**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-08T22:21:24Z
- **Completed:** 2026-02-08T22:28:27Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Created 32 tests covering VIEW-09 (header menu rendering) and VIEW-10 (menu state updates)
- Validated English and Hebrew navigation links with correct hrefs
- Verified category dropdown contains all 4 categories in both languages
- Tested menu content fully replaces when language changes
- Confirmed cart icon renders with link to cart page
- Validated cart number display updates via persistCartNumber
- Verified footer content updates with language switch
- Fixed cart number rendering bug discovered during testing

## Task Commits

Each task was committed atomically:

1. **Task 1a: Fix cart number rendering bug** - `d972ca1` (fix)
2. **Task 1b: Create header menu tests** - `ace6818` (test)

**Plan metadata:** (not applicable - no metadata commit for this plan)

## Files Created/Modified
- `frontend/tests/view/header-menu.test.js` - 32 tests for header menu rendering and navigation (VIEW-09, VIEW-10)
- `frontend/js/View.js` - Fixed persistCartNumber to convert number to string explicitly

## Decisions Made
- Use `getAllByRole`/`queryAllByText` for text appearing in multiple places (menu and footer) to avoid "multiple elements found" errors
- Test menu replacement by checking `.ul-eng` and `.ul-heb` classes rather than text content (more reliable when text appears in footer too)
- Convert cart number to string explicitly with `String(num)` to handle Happy-DOM quirk where `textContent = 0` results in empty string

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed cart number not displaying when value is 0**
- **Found during:** Task 1 (Creating header menu tests)
- **Issue:** `persistCartNumber(num)` set `textContent = num`, but when num is 0, Happy-DOM renders it as empty string. Discovered via test debugging that `textContent = 0` (number) results in `""` but `textContent = "0"` (string) works correctly.
- **Fix:** Changed line 317 in View.js from `cartNumEl.textContent = num` to `cartNumEl.textContent = String(num)` to explicitly convert to string
- **Files modified:** frontend/js/View.js
- **Verification:** Test passes, cart number displays "0" correctly. Manual test confirmed String(0) produces "0" textContent.
- **Committed in:** d972ca1 (separate fix commit before test commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bug fix necessary for correct cart display. Discovered through TDD approach - test revealed production bug that would affect users with empty carts.

## Issues Encountered
- Happy-DOM quirk: Setting `textContent` to the number `0` results in empty string, but setting to string `"0"` works correctly. This required explicit `String()` conversion.
- Multiple "Jewelry Workshop" elements: Text appears in both menu and footer, requiring use of `getAllByRole` and array access instead of `getByRole`.
- Hebrew text "בית" appears in menu and footer: Required `queryAllByText` instead of `queryByText` to avoid "multiple elements found" error.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Header menu testing patterns established
- Ready for plan 19-04 (remaining View.js tests)
- Cart number rendering bug fixed ensures correct display in production
- Test patterns documented for future view testing phases

---
*Phase: 19-base-view-tests*
*Completed: 2026-02-08*
