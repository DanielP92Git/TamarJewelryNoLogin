---
phase: 19-base-view-tests
plan: 02
subsystem: testing
tags: [vitest, happy-dom, view, currency, localization, event-delegation]

# Dependency graph
requires:
  - phase: 17-test-infrastructure
    provides: Happy-DOM test environment, Testing Library integration, DOM helpers
  - phase: 19-01
    provides: Language selector rendering and switching tests
provides:
  - Currency selector rendering tests for English and Hebrew (VIEW-05)
  - USD-to-ILS and ILS-to-USD switching tests (VIEW-06, VIEW-07)
  - CustomEvent dispatch tests for price recalculation (VIEW-08)
  - Happy-DOM workaround for 'selected' attribute limitation
affects: [19-03, 19-04, 20-controller-tests, 21-locale-tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Manual selector.value sync for Happy-DOM 'selected' attribute limitation
    - Event delegation testing with document-level change listeners
    - Currency persistence testing with localStorage synchronization

key-files:
  created:
    - frontend/tests/view/currency.test.js
  modified: []

key-decisions:
  - "Worked around Happy-DOM limitation where 'selected' attribute in innerHTML doesn't set .value property"
  - "Did not delete window.__currencyPersistenceInitialized in afterEach to preserve event delegation"
  - "Manually set selector.value after rendering to simulate browser behavior in tests"

patterns-established:
  - "Happy-DOM workaround: selector.value = localStorage.getItem('currency') after rendering"
  - "Currency persistence module-level initialization persists across tests (event delegation)"
  - "Test both desktop and mobile selectors (currency-desktop, currency-mobile)"

# Metrics
duration: 6min
completed: 2026-02-09
---

# Phase 19 Plan 02: Currency Selector Tests Summary

**15 tests validating currency selector rendering in English/Hebrew, USD↔ILS switching with localStorage sync, and CustomEvent dispatch for price recalculation**

## Performance

- **Duration:** 6 minutes
- **Started:** 2026-02-08T22:12:58Z
- **Completed:** 2026-02-08T22:18:36Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Currency selector rendering validated for both English (Currency/USD/ILS) and Hebrew (מטבע/דולר/שקל) labels
- USD-to-ILS and ILS-to-USD switching confirmed to update localStorage and synchronize all selectors (desktop + mobile)
- CustomEvent 'currency-changed' dispatch verified with correct detail payload for price recalculation
- Currency preference persistence across language switches validated (event delegation architecture works)
- Happy-DOM 'selected' attribute limitation identified and workaround documented

## Task Commits

Each task was committed atomically:

1. **Task 1: Create currency selector and switching tests** - `4dcc933` (test)

## Files Created/Modified

- `frontend/tests/view/currency.test.js` - 15 tests covering VIEW-05 through VIEW-08 currency requirements

## Decisions Made

**1. Happy-DOM 'selected' attribute workaround**
- **Issue:** Happy-DOM doesn't properly apply 'selected' attribute when set via innerHTML, causing selector.value to show wrong currency
- **Evidence:** Debug output showed HTML with `<option value="ils" selected="">` but selector.value === 'usd' and option.selected === false
- **Solution:** Manually set `selector.value = localStorage.getItem('currency')` after rendering to simulate browser behavior
- **Impact:** All tests pass, workaround clearly documented for future maintainers
- **Real browsers:** No impact - browsers correctly apply 'selected' attribute

**2. Preserve currency persistence initialization across tests**
- **Decision:** Do NOT delete `window.__currencyPersistenceInitialized` in afterEach cleanup
- **Rationale:** Module-level initialization (lines 76-78 in View.js) only runs once on import. Event delegation listener on document persists and works correctly across test cases. Deleting flag wouldn't trigger re-initialization since module code already executed.
- **Alternative considered:** Re-importing View.js for each test (too slow, unnecessary)

**3. Test both desktop and mobile selectors**
- **Decision:** Query selectors by ID (currency-desktop, currency-mobile) to verify both render
- **Rationale:** View.js renders currency selector twice for responsive layout. Both must be synchronized by event delegation.

## Deviations from Plan

None - plan executed exactly as written, with expected Happy-DOM limitation handled.

## Issues Encountered

**Happy-DOM 'selected' attribute limitation**
- **Problem:** When View.js renders `<select>` with innerHTML containing `<option selected>`, Happy-DOM doesn't update the DOM selected state or .value property
- **Investigation:** Added debug logging showing HTML has correct attribute but DOM state is wrong
- **Solution:** Manually set selector.value after rendering in tests that check initial state
- **Impact:** Minimal - 3-line workaround in 3 tests, clearly documented
- **Real-world behavior:** Browsers correctly apply 'selected' attribute, no production impact

## Authentication Gates

None encountered.

## Next Phase Readiness

**Ready for Phase 19 Plan 03 (Cart Counter Tests):**
- Currency selector tests establish pattern for View rendering tests
- Happy-DOM workarounds documented for future View tests
- Event delegation testing pattern proven

**Blockers:** None

**Concerns:** None

---

*Phase: 19-base-view-tests*
*Plan: 02*
*Completed: 2026-02-09*
