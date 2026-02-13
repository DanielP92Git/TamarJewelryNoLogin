---
phase: 27-schema-migration-foundation
plan: 02
subsystem: api-backend-frontend
tags: [api, cart, migration, backward-compatibility, bilingual]

# Dependency graph
requires:
  - phase: 27-schema-migration-foundation
    plan: 01
    provides: Bilingual Product schema fields
provides:
  - API response normalization with bilingual field support
  - Cart timestamp-based migration detection and silent cleanup
  - Backward compatibility for SSR templates and schema helpers
affects: [28-frontend-language-routing, 29-backend-language-api, 30-frontend-display-logic]

# Tech tracking
tech-stack:
  added: []
  patterns: [api-response-normalization, cart-migration-detection, silent-data-cleanup]

key-files:
  created: []
  modified:
    - backend/index.js
    - frontend/js/model.js
    - frontend/tests/model/localStorage.test.js

key-decisions:
  - "normalizeProductForClient ensures both legacy and bilingual fields present in all API responses"
  - "Cart migration detection uses timestamp absence as the detection mechanism (no hardcoded dates)"
  - "Old cart data silently cleared with no user-facing messages per plan requirements"
  - "Tests updated to include cartTimestamp in setup data (Deviation Rule 3: blocking issue)"

patterns-established:
  - "API normalization ensures backward compatibility: legacy fields always populated from bilingual fields"
  - "Bilingual fields always populated from legacy fields for gradual migration support"
  - "Hebrew fields default to empty string (not undefined) for safe frontend length checks"
  - "Cart migration detection via timestamp absence (simple, no date comparisons needed)"

# Metrics
duration: 12 min
completed: 2026-02-13
---

# Phase 27 Plan 02: API Response Normalization & Cart Migration Summary

**Added bilingual field support to normalizeProductForClient and cart timestamp migration detection for silent old-data cleanup**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-13T22:15:15Z
- **Completed:** 2026-02-13T22:27:37Z
- **Tasks:** 2 completed
- **Files modified:** 3 (2 production files, 1 test file)

## Accomplishments

- API responses now include both legacy (name, description) and bilingual fields (name_en/he, description_en/he)
- SSR templates, schema helpers, and sitemap continue working unchanged (use product.name which is always populated)
- Hebrew fields default to empty string (not undefined) for safe frontend checks
- Cart data from before migration silently cleared on next load (no user-facing message)
- New cart saves include cartTimestamp for future migration detection
- Full test suite passes: 866 tests (447 backend + 419 frontend)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add bilingual field support to normalizeProductForClient** - `0d31fdb` (feat)
2. **Task 2: Add cart timestamp migration detection** - `6288539` (feat)

## Files Created/Modified

- **backend/index.js** - normalizeProductForClient now populates both legacy and bilingual fields bidirectionally, ensures Hebrew fields are empty string (not undefined)
- **frontend/js/model.js** - handleLoadStorage detects old cart via missing cartTimestamp and silently clears; createLocalStorage writes timestamp on every save
- **frontend/tests/model/localStorage.test.js** - Updated 6 test cases to include cartTimestamp in setup data

## Decisions Made

**API normalization strategy:**
- Legacy fields (name, description) populated from bilingual fields if missing - critical for SSR templates (product.ejs, category.ejs), schemaHelpers.js (JSON-LD), and sitemap.js
- Bilingual fields (name_en, description_en) populated from legacy fields if missing - supports gradual migration (products created before Plan 01)
- Hebrew fields default to empty string (not undefined) - allows frontend to safely check `.length` without undefined errors
- No changes needed to SSR templates or schema helpers - they continue using product.name/description which are always populated

**Cart migration approach:**
- Timestamp absence IS the detection mechanism - no hardcoded dates needed
- Silent cleanup with no user-facing messages per plan requirements
- Logged-in users unaffected - their cart is server-side, not localStorage
- Future-proof: any cart with cartTimestamp is post-migration and preserved

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Updated tests to include cartTimestamp**
- **Found during:** Task 2 verification
- **Issue:** Frontend localStorage tests failed because they set up cart data without cartTimestamp, causing handleLoadStorage to clear the cart immediately (new behavior from Task 2)
- **Fix:** Added `localStorage.setItem('cartTimestamp', Date.now().toString())` to 6 test cases that set up cart data for loading tests
- **Files modified:** frontend/tests/model/localStorage.test.js (lines 92, 119, 257, 287, 308, 326)
- **Commit:** Included in 6288539 (Task 2 commit)
- **Rationale:** Tests were blocking verification of Task 2. Without this fix, tests would fail even though production code was correct. This is a classic Deviation Rule 3 scenario: fix needed to complete current task.

## Issues Encountered

None beyond the test update deviation documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

API normalization and cart migration complete. Ready for:
- **Phase 28:** Frontend language routing and locale detection
- **Phase 29:** Backend API language parameter handling
- **Phase 30:** Frontend bilingual display logic

**Important:** After deploying these changes, users with old cart data will have it silently cleared on next page load. New cart saves will include timestamp. This is a one-time transition - no ongoing impact.

---
*Phase: 27-schema-migration-foundation*
*Completed: 2026-02-13*

## Self-Check: PASSED

Verified:
- backend/index.js modified (bilingual field normalization logic present)
- frontend/js/model.js modified (cart timestamp logic present)
- frontend/tests/model/localStorage.test.js modified (cartTimestamp in test setup)
- Commit 0d31fdb exists (Task 1: bilingual field normalization)
- Commit 6288539 exists (Task 2: cart timestamp migration)
- Backend tests pass: 447 tests
- Frontend tests pass: 419 tests
