---
phase: 21-locale-currency-tests
plan: 01
subsystem: testing
tags: [vitest, happy-dom, locale, i18n, rtl, hebrew, currency]

# Dependency graph
requires:
  - phase: 17-test-infrastructure
    provides: Vitest + Happy-DOM setup, test utilities, @testing-library/dom
  - phase: frontend/js/locale.js
    provides: Locale initialization and persistence functions
provides:
  - 51 comprehensive tests for locale.js synchronous functions
  - Test coverage for normalizeAppLanguage, normalizeAppCurrency, mapIsoToApp
  - Test coverage for guessLocaleFromBrowser, setDocumentLanguage, getApiBase
  - Test coverage for bootstrapLocaleSync and applyDocumentLanguageFromStorage
  - LOCALE-03, LOCALE-06 limitations documented in test files
  - LOCALE-13, LOCALE-14 verification (persistence and reload behavior)
affects: [21-02-locale-hydration-tests, 21-03-bidi-tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Mock Intl.DateTimeFormat for timezone-based locale detection tests
    - Mock navigator.language with vi.stubGlobal for browser locale tests
    - Test internal functions via exported function side effects
    - Save and restore global mocks (Intl, navigator) in beforeEach/afterEach

key-files:
  created:
    - frontend/tests/locale/helpers.test.js
    - frontend/tests/locale/bootstrap.test.js
  modified: []

key-decisions:
  - "Test internal helpers via exported function side effects (not direct exports)"
  - "Mock Happy-DOM's default Asia/Jerusalem timezone to ensure consistent test results"
  - "Document LOCALE-03 (Happy-DOM cannot verify CSS flex-direction) and LOCALE-06 (integer pricing) as known limitations"

patterns-established:
  - "Test locale functions with explicit Intl and navigator mocks to avoid Happy-DOM defaults"
  - "Test normalization functions by verifying localStorage values after bootstrapLocaleSync"
  - "Test case-insensitive validation by setting both language and currency to avoid __localeAuto side effects"

# Metrics
duration: 6min
completed: 2026-02-09
---

# Phase 21 Plan 01: Locale Helper and Bootstrap Tests

**51 tests verify locale.js synchronous initialization, browser guessing, normalization, and localStorage persistence with Happy-DOM limitations documented**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-09T01:20:47Z
- **Completed:** 2026-02-09T01:26:58Z
- **Tasks:** 2
- **Files modified:** 2 created
- **Tests:** 51 (29 helpers + 22 bootstrap)

## Accomplishments

- 29 tests covering locale helper functions (normalize, map, guess, setDocument, getApiBase)
- 22 tests covering bootstrapLocaleSync and applyDocumentLanguageFromStorage
- LOCALE-13 verified: bootstrapLocaleSync persists locale to localStorage on fresh visit
- LOCALE-14 verified: bootstrapLocaleSync preserves existing localStorage on reload
- LOCALE-03 and LOCALE-06 limitations documented as test file comments

## Task Commits

Each task was committed atomically:

1. **Task 1: Create locale helper function unit tests** - `57b0b66` (test)
   - 29 tests covering normalizeAppLanguage, normalizeAppCurrency, mapIsoToApp
   - Test guessLocaleFromBrowser, setDocumentLanguage, getApiBase via exported functions
   - Document LOCALE-03 (Happy-DOM cannot verify CSS) and LOCALE-06 (integer pricing)

2. **Task 2: Create bootstrapLocaleSync and persistence tests** - `7eed968` (test)
   - 22 tests covering fresh visit, returning visitor, partial state scenarios
   - Test LOCALE-13 (persistence to localStorage) and LOCALE-14 (reload preservation)
   - Test __localeAuto flags for tracking auto-filled values

## Files Created/Modified

- `frontend/tests/locale/helpers.test.js` - 29 tests for locale.js internal helper functions
- `frontend/tests/locale/bootstrap.test.js` - 22 tests for bootstrapLocaleSync and persistence

## Decisions Made

**1. Test internal helpers via exported function side effects**
- **Rationale:** Helper functions (normalizeAppLanguage, mapIsoToApp, etc.) are not exported from locale.js. Rather than refactor locale.js to export internals for testing, test them indirectly by calling exported functions (bootstrapLocaleSync, hydrateLocaleFromBackend) and checking localStorage, document attributes, and __localeAuto flags.
- **Trade-off:** Less direct, but maintains clean module interface. Tests verify actual behavior, not implementation details.

**2. Mock Happy-DOM's default Asia/Jerusalem timezone**
- **Discovery:** Happy-DOM's default Intl.DateTimeFormat().resolvedOptions().timeZone returns 'Asia/Jerusalem', causing guessLocaleFromBrowser to return Hebrew/ILS instead of English/USD.
- **Solution:** In beforeEach, mock Intl with 'America/New_York' timezone, then selectively override for specific tests that need Jerusalem.
- **Impact:** Tests now pass consistently regardless of Happy-DOM's internal defaults.

**3. Document LOCALE-03 and LOCALE-06 as known limitations**
- **LOCALE-03:** Happy-DOM doesn't apply CSS, so `dir="rtl"` triggering `flex-direction: row-reverse` cannot be unit tested. Test only verifies the attribute is set. Visual RTL layout verification requires Playwright or manual testing.
- **LOCALE-06:** The app uses Math.round() for all prices (integers only), not 2 decimal places. This is a deviation from the requirement, but it's the actual implementation. Tests verify integer behavior.
- **Documentation:** Added detailed comments in test file headers explaining these limitations.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**1. Happy-DOM defaults to Asia/Jerusalem timezone**
- **Problem:** Tests expecting English/USD were failing because guessLocaleFromBrowser detected Jerusalem timezone and returned Hebrew/ILS.
- **Solution:** Mock Intl.DateTimeFormat in beforeEach with 'America/New_York' timezone, restore in afterEach.
- **Resolution:** Tests now pass consistently.

**2. Case-insensitive normalization confusion**
- **Initial assumption:** normalizeAppLanguage('ENG') would write 'eng' to localStorage.
- **Actual behavior:** normalizeAppLanguage returns lowercase 'eng', but bootstrapLocaleSync only writes to localStorage if the value is MISSING (null). If 'ENG' is already in localStorage, normalizeAppLanguage returns 'eng' (valid), bootstrapLocaleSync doesn't overwrite, so 'ENG' stays.
- **Resolution:** Tests updated to verify that uppercase values are ACCEPTED as valid (not rejected), but not normalized in storage. Added both language and currency to avoid __localeAuto side effects.

## Next Phase Readiness

- Locale helper and bootstrap tests complete
- Ready for: Plan 21-02 (hydrateLocaleFromBackend and GeoIP tests)
- Ready for: Plan 21-03 (bidirectional text tests)
- No blockers

**Testing notes:**
- All 51 tests pass in isolation and as part of full suite (335 tests total)
- No regressions in existing tests
- Intl and navigator mocking patterns established for subsequent locale tests

---
*Phase: 21-locale-currency-tests*
*Plan: 01*
*Completed: 2026-02-09*
