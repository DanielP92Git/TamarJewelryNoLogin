---
phase: 11-authentication-authorization-tests
plan: 05
subsystem: testing
tags: [vitest, unit-testing, middleware, jwt, bcrypt, mock, auth]

# Dependency graph
requires:
  - phase: 10-test-infrastructure-foundation
    provides: Vitest setup, mongodb-memory-server, test helpers
  - phase: 11-01
    provides: authHelpers for token generation
  - phase: 11-02
    provides: factories for user creation
provides:
  - Unit test patterns for middleware isolation
  - Mock req/res/next pattern for Express middleware
  - Promise wrapper for callback-based middleware testing
  - Comprehensive coverage of authentication middleware edge cases
affects: [11-06, testing-best-practices]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Mock req/res/next pattern for Express middleware unit tests
    - Promise wrapper pattern for callback-based async middleware
    - Isolated middleware testing with direct function imports

key-files:
  created:
    - backend/tests/unit/middleware/fetchUser.test.js
    - backend/tests/unit/middleware/requireAdmin.test.js
    - backend/tests/unit/middleware/authUser.test.js
  modified: []

key-decisions:
  - "Unit tests complement integration tests by testing middleware in isolation with mock req/res"
  - "Promise wrapper pattern handles callback-based bcrypt.compare in authUser middleware"
  - "Mock functions track calls to verify middleware behavior (next called vs res.status called)"

patterns-established:
  - "Middleware unit tests use createMockReq/createMockRes/createMockNext helpers"
  - "Tests verify both happy path (next called) and error paths (res.status/json called)"
  - "Callback-based middleware wrapped in promise for proper async test handling"

# Metrics
duration: 6min
completed: 2026-02-05
---

# Phase 11 Plan 05: Middleware Unit Tests Summary

**Isolated unit tests for fetchUser, requireAdmin, and authUser middleware with mock req/res objects and comprehensive edge case coverage (39 passing tests)**

## Performance

- **Duration:** 6 minutes
- **Started:** 2026-02-05T00:43:29Z
- **Completed:** 2026-02-05T00:49:49Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments
- Unit tests for all authentication middleware functions in isolation
- Mock req/res/next pattern enables testing without HTTP server
- 19 fetchUser tests covering token extraction and validation
- 10 requireAdmin tests covering RBAC edge cases
- 10 authUser tests with promise wrapper for callback handling
- All 39 tests passing with proper async handling

## Task Commits

Each task was committed atomically:

1. **Task 1: Create fetchUser unit tests** - `fa43e91` (test)
   - 19 tests: token extraction (8), middleware validation (11)

2. **Task 2: Create requireAdmin unit tests** - `83bee7e` (test)
   - 10 tests: admin pass-through, user rejection, edge cases

3. **Task 3: Create authUser unit tests** - `406b6d1` (test)
   - 10 tests: credential validation, bcrypt callback handling

## Files Created/Modified
- `backend/tests/unit/middleware/fetchUser.test.js` - Token extraction and user validation tests
- `backend/tests/unit/middleware/requireAdmin.test.js` - RBAC authorization tests
- `backend/tests/unit/middleware/authUser.test.js` - Login authentication tests with callback handling

## Decisions Made

**Mock pattern for Express middleware:**
- Created helper functions (createMockReq, createMockRes, createMockNext) to simulate Express objects
- Mock functions use Vitest's vi.fn() to track calls and arguments
- Pattern allows testing middleware logic without HTTP server overhead

**Promise wrapper for callback-based middleware:**
- authUser uses bcrypt.compare with callback, not promise
- Created callAuthUser helper that wraps middleware in promise
- Helper detects either res.status() or next() call to resolve promise
- Pattern ensures tests wait for callback completion before assertions

**Unit vs integration test coverage:**
- Unit tests focus on edge cases difficult to trigger via HTTP (malformed tokens, null values, case sensitivity)
- Integration tests (11-03, 11-04) focus on HTTP boundary and real database interactions
- Both approaches provide complementary coverage

## Deviations from Plan

**Auto-fixed Issues:**

**1. [Rule 3 - Blocking] Fixed authUser callback race condition in parallel tests**
- **Found during:** Task 3 verification (all middleware tests run together)
- **Issue:** authUser middleware doesn't await bcrypt.compare callback, causing tests to fail when run in parallel
- **Fix:** Created callAuthUser promise wrapper that detects res.status or next call and resolves after callback completes
- **Files modified:** backend/tests/unit/middleware/authUser.test.js
- **Verification:** All 39 tests pass when run in parallel
- **Committed in:** 406b6d1 (Task 3 commit, amended)

---

**Total deviations:** 1 auto-fixed (blocking issue)
**Impact on plan:** Fix essential for reliable test execution. Parallel test runs exposed callback timing issue that wouldn't appear in sequential execution.

## Issues Encountered

**authUser callback timing:**
- Initial tests used setTimeout(100ms) to wait for bcrypt.compare callback
- When tests ran in parallel, callbacks could execute out of order or after timeout
- Solution: Promise wrapper pattern that waits for actual res.status/next call instead of arbitrary timeout
- Pattern reusable for other callback-based middleware

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Middleware testing patterns established:**
- Mock req/res/next pattern works for all Express middleware
- Promise wrapper pattern handles callback-based async operations
- Edge case coverage ensures middleware robustness

**Test infrastructure complete for remaining Phase 11 plans:**
- Integration tests cover HTTP boundary (11-01 through 11-04)
- Unit tests cover middleware isolation (11-05)
- Ready for cart operations, password reset, and edge case testing

**No blockers for Phase 12 (Payment Testing):**
- Authentication test patterns apply to payment middleware
- Mock pattern adaptable for payment gateway callbacks
- Promise wrapper pattern reusable for Stripe/PayPal webhooks

---
*Phase: 11-authentication-authorization-tests*
*Plan: 05*
*Completed: 2026-02-05*
