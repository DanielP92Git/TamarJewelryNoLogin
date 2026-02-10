---
phase: 23-foundation-infrastructure
plan: 03
subsystem: ssr-rendering
tags: [language-detection, url-routing, middleware, cookie-management, bilingual]

# Dependency graph
requires:
  - phase: 23-01
    provides: EJS view engine and bilingual test routes

provides:
  - language-middleware
  - root-redirect-handler
  - cookie-persistence
  - trailing-slash-normalization
  - invalid-language-redirects

affects: [backend/index.js, backend/middleware/language.js, 24-static-pages, 25-product-pages, 26-seo-core]

# Tech tracking
tech-stack:
  added: []
  patterns: [url-language-detection, cookie-based-preferences, middleware-composition]

key-files:
  created:
    - backend/middleware/language.js
  modified:
    - backend/index.js

key-decisions:
  - "Language detection priority: cookie > CDN headers > GeoIP > Accept-Language > default (en)"
  - "Cookie stores both lang and currency, only updates on language change to preserve manual currency overrides"
  - "Invalid language prefixes (e.g., /fr/) redirect to /en equivalent with 301 for SEO"
  - "Trailing slashes normalized early in middleware chain with 301 redirects"
  - "Root / redirects with 302 (temporary) since user preference may change"

patterns-established:
  - "Language middleware sets req.lang and req.dir for all bilingual routes"
  - "Cookie-based preference persistence with 30-day expiry"
  - "Middleware composition: trailingSlashRedirect -> cookieParser -> languageMiddleware -> routes"

# Metrics
duration_minutes: 13
tasks_completed: 2
files_created: 1
files_modified: 1
tests_passing: 447
commits: [9d5085c, be2bcc8]
completed_date: 2026-02-10
---

# Phase 23 Plan 03: Bilingual URL Routing Middleware Summary

**Multi-tier language detection with cookie persistence, URL prefix routing, and automatic redirects for invalid languages and trailing slashes**

## Objective

Create bilingual URL routing middleware that extracts language from URL prefix, detects language for root redirects, persists preferences in cookies, and normalizes trailing slashes.

## Performance

- **Duration:** 13 min
- **Started:** 2026-02-10T12:00:36Z
- **Completed:** 2026-02-10T12:14:12Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- Language middleware module with multi-tier detection (cookie > CDN > GeoIP > default)
- Root URL redirect handler that detects language and creates initial cookie
- Trailing slash normalization middleware for clean URLs
- Invalid language prefix redirects (e.g., /fr/about -> /en/about)
- Cookie persistence for lang+currency preferences with 30-day expiry
- Integration with existing EJS test route from Plan 01

## Task Commits

Each task was committed atomically:

1. **Task 1: Create language middleware module** - `9d5085c` (feat)
   - detectLanguage() with priority-based detection
   - trailingSlashRedirect() for URL normalization
   - languageMiddleware() to extract lang from URL and set req.lang/req.dir
   - Cookie management with lang+currency persistence

2. **Task 2: Wire middleware into Express** - `be2bcc8` (feat)
   - Root redirect handler (/ -> /en or /he with cookie)
   - Trailing slash middleware registration
   - Language middleware applied to SSR test route
   - Invalid language prefix catch-all routes
   - Test route simplified to use req.lang/req.dir

## Files Created/Modified

- `backend/middleware/language.js` - Language detection and routing middleware (121 lines)
- `backend/index.js` - Integrated middleware into Express app

## Verification Results

All planned verification tests passed:

1. ✓ `curl localhost:4000/` redirects to `/en` (302 temporary)
2. ✓ `curl localhost:4000/en/test` returns HTML with `lang="en" dir="ltr"`
3. ✓ `curl localhost:4000/he/test` returns HTML with `lang="he" dir="rtl"`
4. ✓ `curl localhost:4000/fr/about` redirects to `/en/about` (301 permanent)
5. ✓ `curl localhost:4000/en/test/` redirects to `/en/test` (301 permanent)
6. ✓ Response headers include `Set-Cookie: locale_pref` with lang and currency
7. ✓ All 447 existing backend tests pass (1 skipped)

## Decisions Made

1. **Multi-tier language detection**: Implemented priority-based detection (cookie > CDN headers > GeoIP > Accept-Language > default) to respect user preferences while falling back gracefully.

2. **Cookie update strategy**: Cookie only updates when language changes, preserving manual currency overrides. This allows users to visit /he/ but manually switch to USD without the cookie overwriting their choice.

3. **Redirect status codes**: Invalid language prefixes use 301 (permanent) for SEO benefit, root redirect uses 302 (temporary) since user preference may change.

4. **Middleware ordering**: Trailing slash normalization runs early (after cookieParser, before routes) to ensure clean URLs throughout the application.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. All functionality implemented as specified, all tests passing.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 23 Plan 04** (Product slug API endpoints)

This plan establishes the core routing infrastructure that all SSR pages in Phases 24-26 depend on:

- ✓ req.lang and req.dir are now available on all `/:lang(en|he)/*` routes
- ✓ Cookie system ready for language/currency persistence
- ✓ Invalid URL patterns automatically redirect to valid equivalents
- ✓ Root redirect provides automatic language detection for new visitors
- ✓ Pattern established for applying languageMiddleware to future SSR routes

Future SSR pages (static pages in 24, product pages in 25) can now simply apply `languageMiddleware` to their routes and access `req.lang`/`req.dir` for bilingual rendering.

---
*Phase: 23-foundation-infrastructure*
*Completed: 2026-02-10*

## Self-Check

Verifying all claimed files and commits exist:

**Files:**
- ✓ backend/middleware/language.js exists
- ✓ backend/index.js modified

**Commits:**
- ✓ 9d5085c - feat(23-03): create language middleware module
- ✓ be2bcc8 - feat(23-03): wire language middleware and root redirect into Express

## Self-Check: PASSED
