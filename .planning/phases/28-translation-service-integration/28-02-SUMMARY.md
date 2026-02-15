---
phase: 28-translation-service-integration
plan: 02
subsystem: backend-api
tags: [admin-endpoints, sse, translation-api, progress-streaming]
dependency-graph:
  requires:
    - phase: 28-01
      provides: [translationService, translateText, translateProductFields]
  provides:
    - POST /admin/translate endpoint for single-field translation
    - POST /admin/translate/bulk endpoint with SSE progress streaming
    - Save-as-you-go bulk translation with failure recovery
  affects: [29-admin-translation-ui]
tech-stack:
  added: []
  patterns: [sse-progress-streaming, save-as-you-go, cancellation-support, rate-limiting]
key-files:
  created: []
  modified:
    - backend/index.js
    - backend/env.example
    - .gitignore
decisions:
  - "User-friendly error messages on translation failure: 'Translation failed. Please try again or enter manually.'"
  - "100ms delay between bulk translations to respect Google Cloud rate limits (6000 req/min)"
  - "Save-as-you-go pattern for bulk translation: each product saved immediately after translation"
  - "Continue on per-product failure: bulk operation reports summary, doesn't abort on single failure"
  - "SSE keepalive every 30s to prevent proxy timeouts on long operations"
  - "Cancellation support via client disconnect detection (req.on('close'))"
metrics:
  duration_seconds: 235
  tasks_completed: 2
  files_created: 0
  files_modified: 3
  commits: 1
  completed_date: 2026-02-15
---

# Phase 28 Plan 02: Translation Admin Endpoints Summary

Admin-protected translation API endpoints: single-field translation with validation, and bulk SSE-streamed translation with save-as-you-go failure recovery.

## Objective Completion

**Goal:** Add admin translation endpoints to the Express server: single-field translation (POST /admin/translate) and bulk translation with SSE progress streaming (POST /admin/translate/bulk). Update env.example and .gitignore for Google Cloud credentials.

**Status:** ✓ Complete

**Output:** Two new admin endpoints in backend/index.js, updated env.example with Google Cloud configuration docs, updated .gitignore to exclude service account key files.

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T17:43:08Z
- **Completed:** 2026-02-15T17:47:04Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Single-field translation endpoint with comprehensive input validation
- Bulk translation endpoint with SSE progress streaming and save-as-you-go pattern
- Both endpoints admin-protected with adminRateLimiter + fetchUser + requireAdmin
- Google Cloud credentials documented in env.example
- Service account key files excluded from git

## Task Commits

Both tasks were part of a single atomic commit (endpoints are tightly coupled):

1. **Tasks 1-2: Translation endpoints and config** - `1d88020` (feat)

**Plan metadata:** (will be added in final commit)

## Files Created/Modified

- `backend/index.js` - Added POST /admin/translate and POST /admin/translate/bulk endpoints (245 lines added)
- `backend/env.example` - Added Google Cloud Translation section with GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_CLOUD_PROJECT_ID
- `.gitignore` - Added exclusion patterns for service account key JSON files

## Implementation Details

### POST /admin/translate

**Purpose:** Single-field translation for admin forms (translate individual product names/descriptions on-demand)

**Authentication:** adminRateLimiter → fetchUser → requireAdmin

**Validation:**
- `text`: Required non-empty string
- `targetLang`: Must be 'en' or 'he'
- Character limits: Max 30K (hard limit), warn at 5K (soft limit)

**Response:**
- Success: `{ success: true, translatedText: string, detectedSourceLanguage?: string }`
- Error: `{ success: false, error: "Translation failed. Please try again or enter manually." }`

**Error handling:** All errors caught, user-friendly message returned, never crashes server

### POST /admin/translate/bulk

**Purpose:** Bulk translate all products with missing bilingual fields, stream progress to admin UI

**Authentication:** adminRateLimiter → fetchUser → requireAdmin

**SSE Events:**
- `start`: `{ total: number }` - total products needing translation
- `progress`: `{ current, total, productName, productId }` - per-product progress
- `success`: `{ productId, productName, translations }` - successful translation
- `error`: `{ productId, productName, error }` - per-product failure (continues)
- `complete`: `{ translated, failed, skipped, failedProducts }` - final summary

**Query logic:** Finds products where bilingual fields are missing:
- `name_en` exists but `name_he` is empty (or vice versa)
- `description_en` exists but `description_he` is empty (or vice versa)
- Uses simple load-all-and-filter approach (only ~94 products)

**Save-as-you-go:** Each product saved immediately after translation via `Product.updateOne({ _id }, { $set: translations })`

**Failure recovery:** Per-product errors logged, tracked in `failedProducts` array, operation continues

**Rate limiting:** 100ms delay between products (well under 6000 req/min Google Cloud limit)

**Keepalive:** SSE keepalive comment every 30s to prevent proxy timeouts on long operations

**Cancellation:** Detects client disconnect via `req.on('close')`, breaks loop gracefully

### Configuration Updates

**backend/env.example:**
- Added Google Cloud Translation section after DigitalOcean Spaces
- Documented `GOOGLE_APPLICATION_CREDENTIALS` (path to service account key JSON)
- Documented `GOOGLE_CLOUD_PROJECT_ID` (Google Cloud project ID)
- Included instructions on where to get these values (Google Cloud Console)

**.gitignore:**
- Added `*-service-account*.json` pattern
- Added `*-translator-key*.json` pattern
- Comment: "Google Cloud service account keys (NEVER commit these)"

## Decisions Made

1. **User-friendly error messages:** Translation errors return "Translation failed. Please try again or enter manually." — per locked user decision from research phase
2. **100ms rate limiting delay:** Conservative delay between bulk translations to stay well under Google Cloud's 6000 requests/min limit
3. **Save-as-you-go pattern:** Each product saved immediately after translation (not batch save at end) for resilience
4. **Continue on failure:** Bulk operation continues when individual products fail, reports summary at end
5. **SSE keepalive:** Send keepalive comment every 30s to prevent proxy timeouts on long operations
6. **Cancellation support:** Detect client disconnect and break loop gracefully (allows user to cancel mid-operation)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All plan verification steps passed:

1. ✓ POST /admin/translate endpoint exists in index.js with adminRateLimiter + fetchUser + requireAdmin
2. ✓ POST /admin/translate/bulk endpoint exists with SSE headers and progress streaming
3. ✓ Both endpoints import from `./services/translationService`
4. ✓ Bulk endpoint queries Product model for products with missing bilingual fields
5. ✓ Bulk endpoint uses save-as-you-go (Product.updateOne per product)
6. ✓ Bulk endpoint has 100ms delay between translations
7. ✓ Bulk endpoint handles cancellation (req.on('close'))
8. ✓ backend/env.example has GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_CLOUD_PROJECT_ID entries
9. ✓ .gitignore excludes service account key files
10. ✓ All 447 existing backend tests pass (1 skipped)

## Issues Encountered

None.

## User Setup Required

Manual configuration required before endpoints can be used:

1. **Create Google Cloud service account** (if not done in 28-01):
   - Go to Google Cloud Console → IAM & Admin → Service Accounts
   - Create service account with "Cloud Translation API User" role
   - Create JSON key, download to safe location (NEVER commit to git)

2. **Set environment variables in backend/.env**:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   ```

3. **Verify setup:**
   - Server should start without warnings about missing Google Cloud credentials
   - Test single-field translation via admin UI (Phase 29)
   - Run bulk translation to populate missing bilingual fields

See `.planning/phases/28-translation-service-integration/28-01-SUMMARY.md` for detailed Google Cloud setup instructions.

## Next Phase Readiness

✓ Ready for Phase 29 (Admin Translation UI)

**What's ready:**
- Single-field translation endpoint for translate buttons in product forms
- Bulk translation endpoint for "Translate All Products" feature
- SSE progress streaming for real-time bulk operation feedback
- Error handling and user-friendly messages
- Configuration documented, secrets excluded from git

**Next steps:**
- Phase 29: Add translate buttons to admin product forms
- Phase 29: Add bulk translation UI with progress bar
- Phase 29: Test end-to-end translation workflow

## Self-Check: PASSED

### Files Modified
- [x] backend/index.js modified with translation endpoints
- [x] backend/env.example modified with Google Cloud section
- [x] .gitignore modified with service account exclusions

### Commits
- [x] 1d88020 exists in git history

### Functionality
- [x] POST /admin/translate endpoint exists
- [x] POST /admin/translate/bulk endpoint exists
- [x] Both endpoints protected by adminRateLimiter + fetchUser + requireAdmin
- [x] Single endpoint validates text, targetLang, character limits
- [x] Bulk endpoint has SSE headers and progress streaming
- [x] Bulk endpoint uses save-as-you-go pattern
- [x] Bulk endpoint has 100ms delay between translations
- [x] Bulk endpoint handles cancellation
- [x] env.example has Google Cloud credentials docs
- [x] .gitignore excludes service account keys
- [x] All 447 existing tests pass
- [x] Server starts without error (expected warnings about missing credentials)
