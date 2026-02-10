---
phase: 23-foundation-infrastructure
plan: 04
subsystem: infrastructure
tags: [routing, seo, redirects, middleware]
dependency_graph:
  requires:
    - 23-03: Language middleware (for detectLanguage)
  provides:
    - Legacy .html URL redirects
    - SEO-preserving 301 redirects
  affects:
    - URL routing chain
    - SEO authority preservation
tech_stack:
  added: []
  patterns: [middleware-chain, legacy-redirect, case-insensitive-matching]
key_files:
  created:
    - backend/middleware/legacy.js
  modified:
    - backend/index.js
decisions:
  - Case-insensitive .html extension matching for legacy paths
  - Legacy middleware placed after cookieParser (for language detection) but before SSR routes
  - Unknown .html paths fall through to eventual 404 (no infinite redirect loops)
metrics:
  duration_minutes: 5
  tasks_completed: 2
  tests_added: 8
  tests_passing: 447
  commits: 2
completed: 2026-02-10
---

# Phase 23 Plan 04: Legacy URL Redirect Middleware Summary

**One-liner:** 301 permanent redirects from all 13 legacy .html paths to clean bilingual URLs with automatic language detection

## What Was Built

Created a comprehensive legacy URL redirect middleware that intercepts all old .html paths and redirects them to the new clean URL structure with language prefixes. This preserves SEO authority from existing indexed pages (301 redirects pass ~95% of link equity) and prevents broken bookmarks during the URL structure migration.

**Legacy URL mapping implemented:**
- Home: `/index.html`, `/html/index.html` → `/{lang}`
- Static pages: `/html/about.html`, `/html/cart.html`, `/html/contact-me.html`, `/html/policies.html`, `/html/jewelry-workshop.html` → `/{lang}/about`, `/{lang}/cart`, etc.
- Category pages: `/html/categories/necklaces.html`, `/html/categories/crochetNecklaces.html`, etc. → `/{lang}/necklaces`, `/{lang}/crochet-necklaces`, etc.

**Key features:**
- Case-insensitive matching (handles `/HTML/About.HTML` and `/html/about.html` identically)
- Language detection via cookie > CDN headers > GeoIP > Accept-Language > default (en)
- Unknown .html paths fall through to 404 handler (no redirect loops)
- Non-.html paths (API, static assets) pass through unaffected

## Tasks Completed

### Task 1: Create legacy URL redirect middleware
**Commit:** ece7bae

Created `backend/middleware/legacy.js` with:
- Complete legacy URL map for all 13 known routes
- `legacyRedirectMiddleware` function with case-insensitive matching
- Language detection integration via `detectLanguage(req)`
- Proper 301 permanent redirect responses
- Fall-through behavior for unknown .html paths

**Files created:**
- `backend/middleware/legacy.js` (69 lines)

### Task 2: Wire legacy redirect middleware into Express
**Commit:** 733531a

Integrated the middleware into the Express application:
- Added require statement in `backend/index.js`
- Registered middleware after `cookieParser` and `trailingSlashRedirect`
- Placed before root redirect and SSR routes for proper interception
- Fixed case-insensitive .html extension matching bug
- Verified all 447 existing tests still pass

**Files modified:**
- `backend/index.js` (+4 lines, -1 line)
- `backend/middleware/legacy.js` (+1 line, -1 line for case-insensitive fix)

## Verification Results

**Manual testing (8 test cases):**
- ✓ `/html/about.html` → 301 redirect to `/en/about`
- ✓ `/html/categories/necklaces.html` → 301 redirect to `/en/necklaces`
- ✓ `/index.html` → 301 redirect to `/en`
- ✓ `/HTML/About.HTML` → 301 redirect to `/en/about` (case-insensitive)
- ✓ `/html/categories/crochetNecklaces.html` → 301 redirect to `/en/crochet-necklaces`
- ✓ `/html/nonexistent.html` → falls through (no redirect)
- ✓ `/api/locale` → unaffected (200 OK)
- ✓ `/html/about.html` with Hebrew cookie → 301 redirect to `/he/about`

**Automated test suite:**
- 447 tests passing
- 1 test skipped
- 0 failures

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed case-insensitive .html extension check**
- **Found during:** Task 2 verification testing
- **Issue:** Initial implementation only checked `req.path.endsWith('.html')` which failed for uppercase extensions like `.HTML`
- **Fix:** Changed line 39 in `backend/middleware/legacy.js` from `if (!req.path.endsWith('.html'))` to `if (!req.path.toLowerCase().endsWith('.html'))` to handle case-insensitive matching
- **Files modified:** `backend/middleware/legacy.js`
- **Commit:** 733531a (included in task 2 commit)
- **Rationale:** The plan specified case-insensitive matching for URLs, but the initial implementation only applied it to the path lookup, not the .html extension check. This was a correctness bug that would have caused mixed-case .html requests to fall through incorrectly.

## Technical Details

### Middleware Chain Order

The middleware placement is critical for correct operation:

1. `cors()` - CORS headers
2. `cookieParser()` - Parse cookies (needed for language detection)
3. `trailingSlashRedirect` - Normalize trailing slashes
4. **`legacyRedirectMiddleware`** - Catch legacy .html paths (NEW)
5. Root redirect `/` - Detect language and redirect to `/{lang}`
6. `languageMiddleware` - Handle `/:lang/*` routes
7. SSR routes - Server-side rendered pages
8. API routes - REST API endpoints

This order ensures:
- Cookies are available for language detection
- Legacy paths are intercepted before SSR routes
- API and static asset routes are not affected

### Case-Insensitive Matching Strategy

The middleware normalizes paths to lowercase for lookup:
```javascript
const normalizedPath = req.path.toLowerCase();
const cleanPath = legacyUrlMap[normalizedPath];
```

This handles historical URLs that may exist with mixed casing in bookmarks, external links, or search engine indexes.

### SEO Authority Preservation

301 permanent redirects are used (not 302 temporary) because:
- Search engines transfer ~95% of link equity to the new URL
- Browsers and search engines cache 301 redirects
- Signals that the old URLs are permanently replaced
- Preserves ranking for pages that may already be indexed

## Impact Assessment

**Positive:**
- Preserves SEO authority from any existing indexed .html pages
- Prevents broken bookmarks and external links
- Clean handling of case-insensitive URL variations
- Zero impact on existing API and asset routes

**Risks mitigated:**
- No infinite redirect loops (unknown .html paths fall through to 404)
- Case-insensitive matching prevents edge cases
- Middleware placement ensures proper request handling order

**Next steps enabled:**
- Phase 24 can implement SSR pages knowing legacy URLs are handled
- Old .html URLs in external links will work seamlessly
- Migration from old URL structure is transparent to users and search engines

## Self-Check: PASSED

**Created files verified:**
```bash
✓ backend/middleware/legacy.js exists
```

**Commits verified:**
```bash
✓ ece7bae: feat(23-04): create legacy URL redirect middleware
✓ 733531a: feat(23-04): wire legacy redirect middleware into Express
```

**Test results verified:**
```bash
✓ All 8 manual redirect tests passed
✓ 447 automated tests passed
✓ 0 test failures
```
