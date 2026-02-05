---
phase: 15-database-and-model-tests
plan: 01
subsystem: testing
tags: [vitest, mongoose, model-tests, validation, crud]

# Dependency graph
requires:
  - phase: 10-test-infrastructure-setup
    provides: Vitest + mongodb-memory-server test infrastructure with global setup
provides:
  - Comprehensive Product model tests covering validation, uniqueness, CRUD, and sorting
  - 38 tests validating DATA-01 through DATA-09 requirements
  - Direct Mongoose model testing pattern (not HTTP boundary)
affects: [15-02, future-model-tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Direct Mongoose model testing with dynamic CommonJS import
    - Sparse index validation (undefined SKU fields allowed, explicit null rejected)
    - Pre-save hook testing with .save() method
    - MongoDB duplicate key error handling (code 11000)

key-files:
  created:
    - backend/tests/models/product.test.js
  modified: []

key-decisions:
  - "Test Mongoose models directly instead of through HTTP endpoints for unit-level validation"
  - "Use dynamic import for CommonJS Product model in ESM test environment"
  - "Document actual schema behavior for fields without validators (prices, categories)"
  - "Test sparse index behavior with undefined SKU (allowed) vs explicit null (rejected)"

patterns-established:
  - "Model tests import Mongoose model directly: Product = (await import('../../models/Product.js')).default"
  - "Required field validation tests use .rejects.toThrow() pattern"
  - "Uniqueness tests use try/catch for MongoDB duplicate key errors (code 11000)"
  - "Pre-save hook tests use .save() method (not .create()) to ensure hooks fire"

# Metrics
duration: 11min
completed: 2026-02-05
---

# Phase 15 Plan 01: Product Model Tests Summary

**Comprehensive Product model validation with 38 tests covering required fields, SKU uniqueness with sparse index, displayOrder auto-assignment, and CRUD operations**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-05T22:38:57Z
- **Completed:** 2026-02-05T22:49:57Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- 38 passing tests for Product Mongoose model (DATA-01 through DATA-09)
- Validated required fields (name, category, id) rejection
- Verified SKU uniqueness with sparse index behavior (multiple undefined allowed, duplicate strings rejected)
- Tested SKU format validation (uppercase transform, alphanumeric, 2-7 chars)
- Confirmed displayOrder pre-save hook auto-assignment with 10-value gaps
- Validated CRUD operations (create, read, update, delete)
- Tested category filtering and displayOrder sorting

## Task Commits

Each task was committed atomically:

1. **Task 1: Product model validation and uniqueness tests** - `3aee4aa` (test)
   - 24 tests covering DATA-01 through DATA-05
   - Required field validation, SKU uniqueness, format validation, displayOrder validation

2. **Task 2: Product model CRUD and sorting tests** - `7726a88` (test)
   - 14 tests covering DATA-06 through DATA-09
   - Update operations, delete operations, category filtering, displayOrder sorting

## Files Created/Modified
- `backend/tests/models/product.test.js` - Direct Mongoose model tests for Product schema validation, uniqueness constraints, CRUD operations, and sorting behavior

## Decisions Made

**1. Test Mongoose model directly instead of HTTP endpoints**
- **Rationale:** Unit-level testing of model validation logic requires direct database access. HTTP endpoints would add unnecessary layers and make it harder to test specific validation rules and edge cases.

**2. Use dynamic import for CommonJS Product model**
- **Rationale:** Test environment uses ESM (import/export) but Product model uses CommonJS (module.exports). Dynamic import bridges the gap: `Product = (await import('../../models/Product.js')).default`

**3. Document actual schema behavior for fields without validators**
- **Rationale:** Product schema has no min/max price validators or category enum. Tests document actual behavior (negative prices accepted, any category string allowed) rather than assuming validation exists.

**4. Test sparse index with undefined vs explicit null**
- **Rationale:** Initial test attempted multiple explicit `null` SKUs which failed. MongoDB sparse indexes only ignore undefined/missing fields, not explicit null. Updated test to verify correct behavior: multiple undefined SKUs allowed, explicit null treated as duplicate key.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed sparse index null handling test**
- **Found during:** Task 1 (SKU uniqueness tests)
- **Issue:** Test "should allow multiple products with null SKU" failed with duplicate key error. MongoDB sparse indexes don't allow multiple explicit null values, only undefined/missing fields.
- **Fix:** Changed test to "should allow multiple products with undefined SKU (omitted field)" - removed explicit `sku: null` and omitted field entirely. Updated assertions to check `sku: { $exists: false }` instead of `sku: null`.
- **Files modified:** backend/tests/models/product.test.js
- **Verification:** Test now passes. Both products save successfully with undefined SKU.
- **Committed in:** 3aee4aa (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary fix to match actual MongoDB sparse index behavior. No scope creep.

## Issues Encountered

**Sparse index behavior clarification**
- **Problem:** Initial understanding that sparse index would allow multiple explicit `null` values was incorrect.
- **Resolution:** MongoDB documentation clarifies sparse indexes ignore documents where field is undefined/missing, but explicit `null` is treated as a value and subject to unique constraint. Updated test to reflect correct behavior.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 15-02 (Settings and User model tests):**
- Product model test pattern established
- Direct Mongoose model testing verified working
- Dynamic import pattern for CommonJS models confirmed
- Sparse index behavior documented

**Test suite health:**
- 374 total tests passing (up from 296 baseline)
- 38 new Product model tests added
- No regressions in existing tests

---
*Phase: 15-database-and-model-tests*
*Completed: 2026-02-05*
