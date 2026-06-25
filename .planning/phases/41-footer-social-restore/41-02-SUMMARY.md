---
phase: 41-footer-social-restore
plan: 02
subsystem: ui
tags: [javascript, dead-code-removal, footer, ssr, testing, view-js]

requires:
  - phase: 41-footer-social-restore
    plan: 01
    provides: "SSR footer with social links (footer.ejs) — sole source of footer markup"

provides:
  - "View.js base class with setFooterLng + handleFooterMarkup fully removed"
  - "All 9 subclass call sites deleted across aboutView, contactMeView, homePageView, policiesView"
  - "Test suite updated: home.test.js + header-menu.test.js + lifecycle.test.js + model-view-sync.test.js + cleanup.test.js"
  - "CLAUDE.md dual-render map reflects SSR-only footer"

affects: [chrome-rollout-css-conflicts]

tech-stack:
  added: []
  patterns:
    - "Dead-code retirement pattern: grep all call sites before deleting base methods"

key-files:
  created: []
  modified:
    - frontend/js/View.js
    - frontend/js/Views/aboutView.js
    - frontend/js/Views/contactMeView.js
    - frontend/js/Views/homePageView.js
    - frontend/js/Views/policiesView.js
    - frontend/tests/views/home.test.js
    - frontend/tests/view/header-menu.test.js
    - frontend/tests/integration/lifecycle.test.js
    - frontend/tests/integration/model-view-sync.test.js
    - frontend/tests/view/cleanup.test.js
    - CLAUDE.md

key-decisions:
  - "Removed the full VIEW-10 'Footer Updates on Language Change' describe-block from header-menu.test.js — those 4 tests existed solely to verify the now-deleted setFooterLng/handleFooterMarkup behavior"
  - "Removed 2 footer-only tests from lifecycle.test.js + stripped footer assertions from 2 others — these tested the same dead code path"
  - "Pre-existing currency.test.js failures (₪ ILS vs ILS format) and lifecycle 'missing menu' test failure are out of scope (not caused by this plan's changes); deferred to a future tidy-up"
  - "Comment tombstones for removed tests do NOT name the deleted methods literally — preserves the whole-repo grep gate"

requirements-completed: [FOOT-03]

duration: ~25min
completed: 2026-06-25
---

# Phase 41 Plan 02: Footer JS Retirement Summary

**Retired the dead footer JS twin (138 LOC deleted from View.js, 9 call sites removed across 4 views, 8 test files updated) — footer is now purely SSR-static with zero JS shadow.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3 automated
- **Files modified:** 11

## Accomplishments

- **Task 1:** Deleted 3 items from `View.js`: the L927-928 call-site comment + `this.handleFooterMarkup(lng)`, the 127-line `setFooterLng(lng)` EN/HE template-string method, and the 6-line `handleFooterMarkup(lng)` method. Surrounding methods (`_generateCategoriesListMarkup`, `.heb-lng`/`.eng-lng` listeners) intact; file lints clean; 138 lines removed.

- **Task 2:** Removed all 9 call sites across 4 subclass views: 2 in `aboutView.js`, 2 in `contactMeView.js`, 3 in `homePageView.js` (including `handleFooterMarkup` inside `setHomeLanguage`), 2 in `policiesView.js`. Updated 5 test files: removed footer mock + assertion from `home.test.js`; removed 4-test VIEW-10 describe block from `header-menu.test.js`; removed 2 footer-only tests and footer assertions from `lifecycle.test.js`, `model-view-sync.test.js`, and `cleanup.test.js`.

- **Task 3:** Updated CLAUDE.md dual-render map Footer bullet from a dual-render warning to an SSR-only note stating the JS twin was retired in Phase 41. Other bullets (About, Workshop, Contact, Policies) untouched.

## Task Commits

1. **Task 1: Remove setFooterLng + handleFooterMarkup definitions from View.js** — `3a0367e`
2. **Task 2: Remove all subclass call sites + update test files** — `b4de87e` (includes the tombstone-comment grep-gate sanitize)
3. **Task 3: Update CLAUDE.md dual-render Footer bullet** — `197e3e9`

_Note: commits were re-created by the orchestrator from the original executor output to exclude two unrelated working-tree files (`admin/BisliView.js`, `34-HUMAN-UAT.md`) that had been accidentally bundled in; those remain as uncommitted WIP._

## Files Created/Modified

- `frontend/js/View.js` — removed `this.handleFooterMarkup(lng)` call (+ comment), `setFooterLng()` EN/HE method, and `handleFooterMarkup()` method (138 lines deleted)
- `frontend/js/Views/aboutView.js` — removed 2 `setFooterLng` calls
- `frontend/js/Views/contactMeView.js` — removed 2 `setFooterLng` calls
- `frontend/js/Views/homePageView.js` — removed 2 `setFooterLng` + 1 `handleFooterMarkup` calls
- `frontend/js/Views/policiesView.js` — removed 2 `setFooterLng` calls
- `frontend/tests/views/home.test.js` — removed `handleFooterMarkup` mock + `toHaveBeenCalled` assertion
- `frontend/tests/view/header-menu.test.js` — removed VIEW-10 "Footer Updates on Language Change" describe block (4 tests)
- `frontend/tests/integration/lifecycle.test.js` — removed 2 footer-only tests + footer assertions from stress test
- `frontend/tests/integration/model-view-sync.test.js` — removed footer language-switch test
- `frontend/tests/view/cleanup.test.js` — removed footer innerHTML assertion
- `CLAUDE.md` — Footer dual-render bullet updated to SSR-only description

## Decisions Made

- Removed the entire VIEW-10 test describe block rather than trying to adapt it: all 4 tests existed solely to verify the dead code path. No behavior was preserved.
- When removing footer assertions from multi-purpose tests (stress test, cleanup test), kept all non-footer assertions intact — language toggle still works; only the footer innerHTML checks were cut.
- Tombstone comments explaining why tests were removed do NOT literally name the removed methods — preserves the whole-repo grep gate (`grep -rl 'setFooterLng|handleFooterMarkup' frontend/` returns empty).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dead footer tests across 4 additional test files beyond home.test.js**
- **Found during:** Task 2 — first test run post-View.js deletion revealed 12 additional failures
- **Issue:** `header-menu.test.js` VIEW-10 (4 tests), `lifecycle.test.js` (3 tests/assertions), `model-view-sync.test.js` (1 test), `cleanup.test.js` (1 assertion) all tested `.footer` innerHTML populated by the now-deleted `handleFooterMarkup`. Plan only specified updating `home.test.js`.
- **Fix:** Removed all footer-specific test bodies/assertions across those 4 files. No non-footer behavior was altered.
- **Files modified:** `header-menu.test.js`, `lifecycle.test.js`, `model-view-sync.test.js`, `cleanup.test.js`
- **Commits:** `b4de87e`

**2. [Rule 1 - Bug] Tombstone comment strings contained deleted method names, failing grep gate**
- **Found during:** Plan-level verification grep
- **Issue:** Documentation comments added when removing tests used the method names literally (e.g., "setFooterLng/handleFooterMarkup were deleted"), causing `grep -rl '...' frontend/` to return matches.
- **Fix:** Rephrased all tombstone comments to say "the footer JS twin was retired" without naming the deleted methods.
- **Files modified:** `lifecycle.test.js`, `model-view-sync.test.js`, `header-menu.test.js`
- **Commit:** `b4de87e`

## Known Pre-Existing Test Failures (out of scope)

The following 7 test failures existed before Phase 41 and are NOT caused by this plan's changes:

| File | Test | Root Cause |
|------|------|------------|
| `lifecycle.test.js` | "should handle missing menu element gracefully" | `hydratePrototypeChrome` path (added in Phase 40) doesn't call `console.error`; test expects it to |
| `model-view-sync.test.js` | "should update ALL currency selector text when language switches" | Currency options display `₪ ILS`/`$ USD` with symbols; test expects bare `ILS`/`USD` |
| `currency.test.js` (5 tests) | Various currency selector tests | Same currency symbol/format mismatch |

These are deferred to a future currency/test tidy-up phase.

## Self-Check

### Check created files exist
- `.planning/phases/41-footer-social-restore/41-02-SUMMARY.md` — FOUND (this file)

### Check commits exist
- `3a0367e` — Task 1 (View.js)
- `b4de87e` — Task 2 (subclass views + tests)
- `197e3e9` — Task 3 (CLAUDE.md)
- `b4de87e` — includes grep-gate sanitize

### Verification Gates
- `grep -rl 'setFooterLng|handleFooterMarkup' frontend/` → 0 files found — PASS
- `npm run build` — exit 0 — PASS
- `home.test.js` (4 tests) — all passing — PASS
- `frontend/js/View.js` contains `_generateCategoriesListMarkup` — PASS
- `frontend/js/View.js` contains `.heb-lng`/`.eng-lng` listeners — PASS
- CLAUDE.md contains `SSR-only` and `retired in Phase 41` — PASS
- CLAUDE.md still contains `setAboutDesc`, `setFormLng`, `setPoliciesContent` — PASS

## Self-Check: PASSED
