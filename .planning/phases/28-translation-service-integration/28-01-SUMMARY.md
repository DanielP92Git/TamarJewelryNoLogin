---
phase: 28-translation-service-integration
plan: 01
subsystem: backend-translation
tags: [service-layer, google-cloud, caching, i18n]
dependency-graph:
  requires: [node-cache, google-cloud-sdk]
  provides: [translation-api, bidirectional-translation, translation-cache]
  affects: []
tech-stack:
  added: [@google-cloud/translate@9.3.0]
  patterns: [cache-first, retry-with-backoff, graceful-degradation]
key-files:
  created:
    - backend/cache/translationCache.js
    - backend/services/translationService.js
  modified:
    - backend/package.json
    - backend/package-lock.json
decisions: []
metrics:
  duration_seconds: 201
  tasks_completed: 1
  files_created: 2
  files_modified: 2
  commits: 1
  completed_date: 2026-02-15
---

# Phase 28 Plan 01: Translation Service Foundation Summary

Google Cloud Translation API v3 integration with caching, retry logic, and bidirectional Hebrew/English support.

## Objective Completion

**Goal:** Create the translation service layer: install @google-cloud/translate, create the translation cache instance, and build the translation service with caching, retry logic, and bidirectional Hebrew/English support.

**Status:** ✓ Complete

**Output:** Two new service files (translationService.js, translationCache.js) and @google-cloud/translate ^9.3.0 installed.

## Tasks Completed

### Task 1: Create translation cache and translation service with Google Cloud Translation API v3

**Files:**
- Created: `backend/cache/translationCache.js`
- Created: `backend/services/translationService.js`
- Modified: `backend/package.json`, `backend/package-lock.json`

**Implementation:**

1. **Installed @google-cloud/translate ^9.3.0** - Google Cloud Translation API v3 SDK

2. **Created translationCache.js** following pageCache.js pattern:
   - node-cache instance with 1-hour TTL (3600s)
   - maxKeys: 1000 (prevents memory bloat, ~200KB total)
   - useClones: false for performance
   - Production stats logging every hour (hit rate monitoring)

3. **Created translationService.js** following exchangeRateService.js pattern:
   - **Exports:** `translateText`, `translateProductFields`, `clearCache`, `getCacheKey`
   - **Initialization:** TranslationServiceClient from @google-cloud/translate v3 namespace
   - **Graceful degradation:** Warns if credentials missing, doesn't crash at load time
   - **Cache strategy:** Cache-first with bidirectional collision prevention (cache key includes source and target language)
   - **Retry logic:** Exponential backoff with jitter for transient errors (429, 500, 503, network errors)
   - **Error handling:** Distinguishes API errors from network errors, clear error messages

**Key Features:**

- **`translateText(text, targetLang, sourceLang)`:** Core translation function
  - Validates input (non-empty string, targetLang must be 'en' or 'he')
  - Checks cache first using `getCacheKey(text, sourceLang, targetLang)`
  - Retries transient errors with exponential backoff (max 3 attempts, cap at 30s)
  - Caches successful translations
  - Returns `{translatedText, detectedSourceLanguage?}`

- **`translateProductFields(fields)`:** Bidirectional product translation
  - Auto-detects direction based on which fields are populated
  - Translates name_en → name_he and/or name_he → name_en
  - Translates description_en → description_he and/or description_he → description_en
  - Returns only newly translated fields

- **`retryWithBackoff(fn, maxAttempts, baseDelay)`:** Retry helper
  - Only retries transient errors (429, 500, 503, ECONNRESET, ETIMEDOUT)
  - Does NOT retry non-transient errors (400, 401, 403)
  - Exponential backoff formula: `min((2^attempt + random(0-1)) * baseDelay, 30000)`
  - Logs warnings on each retry attempt

**Verification:**
- ✓ translationCache.js loads without error
- ✓ translationService.js exports all required functions
- ✓ Cache TTL correctly set to 3600 seconds
- ✓ @google-cloud/translate in package.json dependencies
- ✓ All 447 existing backend tests pass (26 test files)

**Commit:** b8e5d11

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All plan verification steps passed:

1. ✓ `node -e "require('./backend/cache/translationCache.js')"` - loads without error
2. ✓ `node -e "const s = require('./backend/services/translationService.js'); console.log(Object.keys(s))"` - prints `['translateText', 'translateProductFields', 'clearCache', 'getCacheKey']`
3. ✓ `node -e "const c = require('./backend/cache/translationCache.js'); console.log(c.translationCache.options.stdTTL)"` - prints `3600`
4. ✓ `@google-cloud/translate` is in `backend/package.json` dependencies
5. ✓ Existing backend tests pass: 447 passed, 1 skipped

## Success Criteria

- [x] Translation service module loads cleanly and exports all required functions
- [x] Cache instance is properly configured following pageCache.js pattern
- [x] Service handles missing credentials gracefully (warns, doesn't crash at load time)
- [x] All existing tests pass

## Next Steps

This foundation service is ready for integration into:
- Translation endpoints (28-02)
- Product creation/update endpoints (28-03)
- Bulk migration script (28-04)

## Self-Check: PASSED

### Files Created
- [x] backend/cache/translationCache.js exists
- [x] backend/services/translationService.js exists

### Commits
- [x] b8e5d11 exists in git history

### Functionality
- [x] translationCache.js exports translationCache instance
- [x] translationService.js exports translateText, translateProductFields, clearCache, getCacheKey
- [x] @google-cloud/translate ^9.3.0 installed in backend/package.json
- [x] All existing tests pass (447 passed)
