---
phase: 10-test-infrastructure-foundation
plan: 05
type: summary
completed: 2026-02-04

subsystem: testing
tags: [test-data, fixtures, factories, test-isolation, cleanup]

dependency-graph:
  requires:
    - "10-01: Backend test infrastructure (mongodb-memory-server, Vitest)"
    - "10-04: External API mocking (nock, cleanAllMocks)"
  provides:
    - "Test data fixtures (mockProduct, mockUser, mockAdmin)"
    - "Factory functions for unique test data (createProduct, createUser)"
    - "Automated test cleanup (afterEach hooks)"
    - "Test isolation (database clearing, counter resets, mock cleanup)"
  affects:
    - "All future backend tests (can use fixtures and factories)"
    - "Test reliability (no pollution between tests)"

tech-stack:
  added: []
  patterns:
    - "Test data fixtures for consistent scenarios"
    - "Factory pattern for unique test data generation"
    - "Automated cleanup for test isolation"

key-files:
  created:
    - backend/tests/helpers/fixtures/products.js
    - backend/tests/helpers/fixtures/users.js
    - backend/tests/helpers/fixtures/index.js
    - backend/tests/helpers/factories.js
  modified:
    - backend/tests/setup.js

decisions:
  - decision: "Use fixtures for consistent data, factories for unique data"
    rationale: "Fixtures provide predictable data for specific scenarios; factories generate fresh data for each test to avoid collisions"
    alternatives: "Could use only factories, but fixtures are faster and clearer for common scenarios"
    impact: "Tests are more readable and maintainable"

  - decision: "Automated cleanup in afterEach (not manual)"
    rationale: "Ensures test isolation without requiring developers to remember cleanup"
    alternatives: "Manual cleanup in each test, but error-prone and verbose"
    impact: "All tests automatically isolated; prevents test pollution"

  - decision: "Fixed SKU format to T001 (7 chars max)"
    rationale: "Product schema enforces 7-character max; original TEST0001 format violated constraint"
    alternatives: "Could change schema, but 7 chars is intentional business constraint"
    impact: "Factory-generated products now pass validation"

metrics:
  duration: 5min
  tasks-completed: 3
  commits: 2
  tests-added: 0
  tests-passing: 20
---

# Phase 10 Plan 05: Test Data Fixtures and Factories Summary

**One-liner:** Test data infrastructure with fixtures for consistent scenarios, factories for unique data, and automated cleanup for test isolation.

## What Was Built

Created comprehensive test data infrastructure:

1. **Product and User Fixtures** (Task 1 - already existed from 10-04)
   - `mockProduct`: Basic product with single image
   - `mockProductWithImages`: Product with gallery (3 images)
   - `mockProductsByCategory`: Products grouped by category
   - `mockProductNoSku`: Legacy product without SKU
   - `mockUser`: Regular customer with credentials
   - `mockAdmin`: Admin user with credentials
   - `mockUserWithCart`: User with cart items
   - All fixtures match actual schema (usd_price/ils_price, cartData, images structure)

2. **Factory Functions for Dynamic Test Data** (Task 2)
   - `createProduct()`: Generates unique products with auto-incrementing IDs
   - `createUser()`: Generates unique users with unique emails
   - `createAdmin()`: Creates admin users
   - `createProducts(count)`: Batch creation
   - `createCartItem()`, `createSettings()`, `createOrder()`: Related entities
   - `resetFactoryCounter()`: For predictable test sequences
   - Counter ensures uniqueness within test suite

3. **Automated Test Cleanup** (Task 3)
   - `afterEach` hook clears all database collections
   - Factory counter resets between tests
   - HTTP mocks cleaned via `cleanAllMocks()`
   - Verified with isolation test (database empty, counters reset)

## Decisions Made

**Test Data Strategy:**
- Use **fixtures** for consistent, predictable scenarios (login, specific product tests)
- Use **factories** for unique data needs (bulk tests, collision avoidance)
- Fixtures are static objects; factories generate fresh data each call

**Cleanup Automation:**
- Automatic cleanup in `afterEach` (not manual in each test)
- Clears: database, factory counters, HTTP mocks
- Ensures test isolation without developer burden

**SKU Format Fix:**
- Changed factory SKU from `TEST0001` (8 chars) to `T001` (4 chars)
- Product schema enforces 7-character max
- This was a **bug fix** (Rule 1 deviation) - factory violated schema constraint

## Key Files

**Created:**
- `backend/tests/helpers/fixtures/products.js` - Product test fixtures
- `backend/tests/helpers/fixtures/users.js` - User/auth fixtures
- `backend/tests/helpers/fixtures/index.js` - Central export
- `backend/tests/helpers/factories.js` - Factory functions

**Modified:**
- `backend/tests/setup.js` - Added afterEach cleanup hooks

## Testing & Verification

**All tests passing:** 20 tests across 2 test files

**Cleanup verification:**
- Created temporary test to verify isolation
- Confirmed database clears between tests
- Confirmed factory counter resets
- Test results: database empty at start of each test, predictable counter values

**Fixtures verified:**
- Imported successfully via central index
- Match actual schema structure
- Include all common test scenarios

**Factories verified:**
- Generate unique data on each call
- Support overrides for customization
- Counter increments correctly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed SKU length violation in factory**
- **Found during:** Task 3 verification (cleanup test)
- **Issue:** Factory generated SKUs like `TEST0001` (8 characters), but Product schema enforces 7-character maximum
- **Fix:** Changed SKU format from `TEST${counter.padStart(4, '0')}` to `T${counter.padStart(3, '0')}` (e.g., `T001`)
- **Files modified:** backend/tests/helpers/factories.js
- **Commit:** 40c0f9f (included in Task 3 commit)

**2. [Note] Task 1 files already existed**
- Fixtures (products.js, users.js, index.js) were created in plan 10-04
- Verified they match plan requirements exactly
- No additional work needed for Task 1
- This is not a deviation - just noted for tracking

## Integration Points

**Depends on:**
- Plan 10-01: Backend test infrastructure (Vitest, mongodb-memory-server)
- Plan 10-04: HTTP mocking (nock, cleanAllMocks function)

**Enables:**
- All future backend tests can use fixtures for common scenarios
- Tests can generate unique data without collisions via factories
- Test isolation guaranteed (no pollution between tests)

**Usage examples:**
```javascript
// Using fixtures
import { mockProduct, mockUser } from './helpers/fixtures/index.js';
await Product.create(mockProduct);

// Using factories
import { createProduct, createUser } from './helpers/factories.js';
const product1 = createProduct();
const product2 = createProduct({ category: 'rings' });
```

## Next Phase Readiness

**Ready for next plans:**
- ✅ Test data infrastructure complete
- ✅ Fixtures cover all common scenarios
- ✅ Factories support unique data generation
- ✅ Test isolation guaranteed via automated cleanup
- ✅ 20 tests passing (infrastructure + env guards)

**Future test authoring will use:**
1. Import fixtures for predictable scenarios
2. Use factories for tests needing unique data
3. Rely on automatic cleanup (no manual cleanup needed)
4. Trust test isolation (no data leakage between tests)

**No blockers or concerns.**

---

**Completion:** 2026-02-04
**Duration:** ~5 minutes
**Test Coverage:** Infrastructure verified (20 tests passing)
**Commits:**
- 6bcafc8: test(10-05): add factory functions for dynamic test data
- 40c0f9f: test(10-05): add test cleanup automation to setup
