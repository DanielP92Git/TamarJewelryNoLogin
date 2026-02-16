---
phase: 32-bulk-translation-migration-tooling
plan: 01
subsystem: backend/translation
tags: [eventSource, sse, auth, caching]
dependency_graph:
  requires:
    - 28-02 (Google Cloud Translation service integration)
    - 31-01 (Cache invalidation infrastructure)
  provides:
    - EventSource-compatible bulk translate endpoint
    - Query parameter authentication for SSE connections
    - Automatic cache invalidation after bulk translation
  affects:
    - backend/middleware/auth.js (token extraction)
    - backend/index.js (bulk translate endpoint)
tech_stack:
  added: []
  patterns:
    - Query param authentication for EventSource
    - SSE with cache invalidation on completion
key_files:
  created: []
  modified:
    - backend/middleware/auth.js
    - backend/index.js
decisions:
  - what: Query parameter token authentication as fallback
    why: EventSource API cannot send custom headers, requires auth via URL
    trade_offs: Slightly less secure than header-based auth, but token is still validated by JWT and only used for SSE connections
  - what: Change bulk translate from POST to GET
    why: EventSource only supports GET requests
    trade_offs: None - endpoint doesn't use request body, purely query-based
  - what: Invalidate cache synchronously after bulk translation
    why: Ensure SSR pages reflect new translations immediately
    trade_offs: Adds ~10ms to bulk operation but guarantees consistency
metrics:
  duration_minutes: 2
  tasks_completed: 1
  files_modified: 2
  completed: 2026-02-16
---

# Phase 32 Plan 01: EventSource-Compatible Bulk Translation Summary

**One-liner:** GET endpoint with query param auth and automatic cache invalidation for EventSource-driven bulk translation

## Objective

Fix backend bulk translate endpoint for EventSource compatibility by changing POST to GET, adding query parameter token support to auth middleware, and wiring cache invalidation to clear stale content after bulk translation completes.

## What Was Built

### 1. Query Parameter Token Authentication
- Updated `getTokenFromRequest` in `backend/middleware/auth.js` to check `req.query.token` as fallback
- Maintains existing header-based auth priority (auth-token header, then Bearer authorization, then query param)
- Token still validated by JWT middleware - query param only changes extraction point

### 2. GET Endpoint for Bulk Translation
- Changed `app.post('/admin/translate/bulk')` to `app.get('/admin/translate/bulk')` in `backend/index.js`
- Endpoint logic unchanged - still streams SSE events, still admin-protected
- EventSource can now connect without custom header workarounds

### 3. Cache Invalidation on Completion
- Track translated product slugs and categories during bulk translation loop
- After loop completes, map DB categories to URL categories via `DB_TO_URL_CATEGORY`
- Call `invalidateBulkProducts(translatedSlugs, urlCategories)` before sending completion event
- Ensures SSR product/category pages reflect new translations immediately

## Deviations from Plan

None - plan executed exactly as written.

## Testing Results

- **Auth middleware test:** Passed - query param token extraction verified via manual test
- **Endpoint verification:** Confirmed - `app.get('/admin/translate/bulk')` at line 3200
- **Cache invalidation wiring:** Confirmed - `invalidateBulkProducts` called with proper parameters
- **Backend test suite:** 25/26 test files passing, 446/447 tests passing
  - 1 pre-existing test failure in `product.test.js` (duplicate SKU validation) unrelated to our changes
  - Our auth and endpoint changes don't affect model validation logic

## Technical Details

### Auth Middleware Flow
```javascript
// Priority order for token extraction:
1. req.header('auth-token')        // Direct header
2. req.header('authorization')     // Bearer token
3. req.query.token                 // Query param (new - for EventSource)
```

### Cache Invalidation Flow
```javascript
// During bulk translation loop:
- translatedSlugs.push(product.slug)
- translatedCategories.push(product.category)

// After loop completes:
- Map DB categories to URL categories
- invalidateBulkProducts(slugs, urlCategories)
- Clear stale cache before completion event
```

## Integration Points

- **With Phase 28-02:** Uses `translateProductFields()` from translation service
- **With Phase 31-01:** Calls `invalidateBulkProducts()` from cache invalidation module
- **With Frontend (next plan):** Enables EventSource connection from admin dashboard

## Risk Assessment

**Low Risk:**
- Query param auth is additive fallback, doesn't change existing auth flow
- POST→GET change has no functional impact (endpoint doesn't use req.body)
- Cache invalidation is fail-safe (errors logged but don't break translation)

**Security Note:** Query param tokens are less secure than headers (visible in logs/history), but:
- Only used for admin-protected SSE endpoints
- Token still validated by JWT middleware
- EventSource connections are temporary (duration of bulk operation)

## Next Steps

**Immediate (Plan 32-02):**
- Build admin UI for bulk translation with EventSource integration
- Show real-time progress with SSE event handling
- Add cancel button that closes EventSource connection

**Future Enhancements:**
- Consider WebSocket for bidirectional admin operations
- Add bulk translation scheduling for off-peak hours

## Self-Check

Verifying all artifacts exist and claims are accurate:

**Files Modified:**
```bash
[ -f "backend/middleware/auth.js" ] && echo "FOUND: backend/middleware/auth.js" || echo "MISSING"
[ -f "backend/index.js" ] && echo "FOUND: backend/index.js" || echo "MISSING"
```

**Commits:**
```bash
git log --oneline --all | grep -q "6dcd81d" && echo "FOUND: 6dcd81d" || echo "MISSING"
```

**Code Patterns:**
```bash
grep -q "req.query.token" backend/middleware/auth.js && echo "FOUND: query param token" || echo "MISSING"
grep -q "app.get.*admin/translate/bulk" backend/index.js && echo "FOUND: GET endpoint" || echo "MISSING"
grep -q "invalidateBulkProducts(translatedSlugs" backend/index.js && echo "FOUND: cache invalidation" || echo "MISSING"
```

## Self-Check Result

```
FOUND: backend/middleware/auth.js
FOUND: backend/index.js
FOUND: 6dcd81d
FOUND: query param token
FOUND: cache invalidation
FOUND: GET endpoint
```

**Self-Check: PASSED** - All files exist, commit is in history, code patterns verified.
