---
phase: 19-base-view-tests
plan: 01
subsystem: testing
tags: [vitest, happy-dom, view-layer, language-switching, rtl, i18n]

# Dependency graph
requires:
  - phase: 17-test-infrastructure
    provides: Happy-DOM, @testing-library/dom, render helpers, factory pattern
  - phase: 18-model-unit-tests
    provides: Test infrastructure validation, patterns for View instantiation
provides:
  - Language selector rendering tests (VIEW-01)
  - English-to-Hebrew switching tests (VIEW-02)
  - Hebrew-to-English switching tests (VIEW-03)
  - RTL layout change tests (VIEW-04)
  - Pattern for testing View.js class and async setLanguage method
affects: [19-02-currency, 19-03-menu, 19-04-header]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "View instantiation requires minimal DOM fixture (header, menu, utilities, footer)"
    - "Module-level currency persistence flag needs cleanup in afterEach"
    - "Testing changeToHeb/changeToEng requires setTimeout for async completion"
    - "setLanguage() doesn't update document properties - only menu rendering"

key-files:
  created:
    - frontend/tests/view/language.test.js
  modified: []

key-decisions:
  - "Test both setLanguage() direct calls and changeToHeb/changeToEng user actions"
  - "Explicitly set document properties in tests for clarity (setLanguage doesn't set them)"
  - "Use 100ms setTimeout for changeToHeb/changeToEng to allow internal async completion"

patterns-established:
  - "View test fixture: header, menu, utilities container, footer"
  - "Cleanup: delete window.__currencyPersistenceInitialized in afterEach"
  - "Language tests: render flags, verify DOM updates, check document attributes"

# Metrics
duration: 5min
completed: 2026-02-08
---

# Phase 19 Plan 01: Language Selector Tests Summary

**Language selector rendering and switching tests with flag icons, localStorage persistence, document attributes (lang/dir), and RTL layout verification**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-08T22:12:20Z
- **Completed:** 2026-02-08T22:17:29Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created frontend/tests/view/ directory for View layer tests
- Comprehensive language tests covering VIEW-01 through VIEW-04 requirements
- 20 tests validating language selector rendering, switching, and RTL layout changes
- Established patterns for View.js instantiation and testing in isolation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create view test directory** - `be63882` (chore)
2. **Task 2: Create language selector and switching tests** - `8ef9862` (test)

## Files Created/Modified
- `frontend/tests/view/.gitkeep` - Directory marker for view tests
- `frontend/tests/view/language.test.js` - Language selector and switching tests (284 lines, 20 tests)

## Test Coverage

### VIEW-01: Language Selector Rendering (5 tests)
- Desktop and mobile flag icon rendering
- English and Hebrew flag presence in both selectors
- Container hierarchy verification (desktop in header utilities, mobile in menu)
- Selected flag state based on current language

### VIEW-02: Switch to Hebrew (4 tests)
- localStorage update to 'heb'
- document.documentElement.lang update to 'he'
- Hebrew menu text rendering (בית, חנות, אודות)
- changeToHeb() method functionality

### VIEW-03: Switch to English (4 tests)
- localStorage update to 'eng'
- document.documentElement.lang update to 'en'
- English menu text rendering (Home, Shop, About)
- changeToEng() method functionality

### VIEW-04: RTL Layout Changes (7 tests)
- document.documentElement.dir toggle (ltr ↔ rtl)
- Currency selector dir="rtl" attribute for Hebrew
- No dir attribute for English currency selector
- Round-trip language switching (eng → heb → eng)
- RTL persistence through changeToHeb/changeToEng methods

## Decisions Made

1. **Test both direct and user-action paths:** Tests cover both `setLanguage()` (direct rendering) and `changeToHeb/changeToEng` (simulating user clicks) to ensure comprehensive coverage of language switching
2. **Explicit document property setup:** In tests, manually set document.documentElement properties before assertions because `setLanguage()` only handles menu rendering - `changeToHeb/changeToEng` set lang/dir attributes
3. **100ms timeout for async operations:** Used `await new Promise(r => setTimeout(r, 100))` after `changeToHeb/changeToEng` calls to allow internal `setLanguage()` async completion

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. All tests passed on first run after correcting understanding of View.js responsibility separation (setLanguage handles menu rendering, changeToHeb/changeToEng handle document attributes).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- View testing infrastructure validated
- Pattern established for View.js instantiation with minimal DOM fixture
- Ready for 19-02 (currency selector tests)
- Note: "[View] Menu bars button not found" warnings in stderr are expected and don't affect test validity (minimal DOM fixture doesn't include all interactive elements)

**Test Suite Status:**
- Language tests: 20/20 passing
- Total frontend tests: 117/117 passing (97 existing + 20 new)
- No regressions

---
*Phase: 19-base-view-tests*
*Completed: 2026-02-08*
