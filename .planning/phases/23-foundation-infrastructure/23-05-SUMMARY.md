---
phase: 23-foundation-infrastructure
plan: 05
subsystem: infra
tags: [robots.txt, express, static-middleware, seo, crawler-directives]

# Dependency graph
requires:
  - phase: 23-01
    provides: Express server with EJS view engine
provides:
  - robots.txt with crawler directives (admin/API blocking, AI bot rules)
  - Express static middleware for frontend assets (dist, imgs, favicon)
  - Foundation for SSR deployment merge (Express serves all assets)
affects: [23-06, 24-*, 25-*]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Static middleware with content-type overrides for special files"
    - "Frontend asset serving from Express (prepares for deployment merge)"

key-files:
  created:
    - backend/public/robots.txt
  modified:
    - backend/index.js

key-decisions:
  - "robots.txt blocks admin and API paths for all crawlers"
  - "AI training bots explicitly blocked (7 bots: GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended, PerplexityBot, Claude-Web)"
  - "AI search bots explicitly allowed (2 bots: Claude-SearchBot, ChatGPT-User) for discoverability"
  - "robots.txt served with text/plain content type via setHeaders override"
  - "Static middleware placed before SSR routes for efficient serving"
  - "No sitemap reference yet (deferred to Phase 25)"

patterns-established:
  - "Content-type override pattern: use setHeaders in static middleware options for special file types"
  - "Frontend asset structure: /dist/ for bundles, /imgs/ for images, /favicon.ico for favicon"

# Metrics
duration: 8min
completed: 2026-02-10
---

# Phase 23 Plan 05: robots.txt and Static Asset Serving Summary

**robots.txt with AI bot controls and Express static middleware for frontend assets (dist, imgs, favicon) at site root**

## Performance

- **Duration:** 8 min 19 sec
- **Started:** 2026-02-10T11:59:58Z
- **Completed:** 2026-02-10T12:08:17Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- robots.txt created with crawler directives blocking admin/API paths and controlling AI bot access
- 7 AI training bots explicitly blocked from scraping original creative content
- 2 AI search bots explicitly allowed for discoverability
- Express static middleware configured for public assets, frontend dist, images, and favicon
- All static assets served with correct content types and cache headers
- 447 existing tests continue to pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create robots.txt with crawler directives** - `92a43c5` (feat)
2. **Task 2: Configure Express static middleware for frontend assets** - `a4e5093` (feat)

## Files Created/Modified
- `backend/public/robots.txt` - Crawler directives file with admin/API blocking and AI bot rules
- `backend/index.js` - Added static middleware for public/, /dist/, /imgs/, and /favicon.ico

## Decisions Made
- robots.txt served with text/plain content type using setHeaders override (best practice for crawler compliance)
- Static middleware placed before Health endpoints and SSR routes for efficient serving
- No sitemap.xml reference in robots.txt yet (will be added in Phase 25 when sitemap is generated)
- Frontend assets use longer cache durations (7d) with immutable flag for Parcel bundles (content-hashed filenames)
- Public assets use shorter cache duration (1d) for robots.txt and other potentially changing files

## Deviations from Plan

**1. [Rule 2 - Missing Critical] Added setHeaders for robots.txt content type**
- **Found during:** Task 2 (Express static middleware configuration)
- **Issue:** Express static middleware was serving robots.txt with text/html content type instead of text/plain, which could cause crawler compliance issues
- **Fix:** Added setHeaders option to static middleware for backend/public/ to explicitly set Content-Type: text/plain for robots.txt
- **Files modified:** backend/index.js
- **Verification:** curl -I /robots.txt shows Content-Type: text/plain; charset=utf-8
- **Committed in:** a4e5093 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Auto-fix necessary for SEO best practices. No scope creep.

## Issues Encountered
None - execution proceeded smoothly with clean test results.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- robots.txt serving correctly at site root with all required directives
- Frontend static asset serving configured and ready for SSR pages
- Express server ready for deployment merge (can serve frontend and backend from single service)
- Static middleware architecture established for all future SSR pages in Phase 24

## Self-Check: PASSED

All created files verified to exist:
- ✓ backend/public/robots.txt exists

All commits verified to exist:
- ✓ Commit 92a43c5 exists (Task 1)
- ✓ Commit a4e5093 exists (Task 2)

---
*Phase: 23-foundation-infrastructure*
*Completed: 2026-02-10*
