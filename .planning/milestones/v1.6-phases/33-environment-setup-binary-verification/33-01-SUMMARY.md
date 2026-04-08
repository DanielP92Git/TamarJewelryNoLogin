---
phase: 33-environment-setup-binary-verification
plan: 01
subsystem: infra
tags: [mongodb, mongodump, aptfile, digitalocean, app-platform, backup, binary-verification]

# Dependency graph
requires: []
provides:
  - "backend/Aptfile with mongodb-database-tools Ubuntu 22.04 .deb URL for App Platform build"
  - "verifyMongodumpBinary() startup check with fail-loud in production and warn in dev"
  - "GET /admin/backup-status endpoint showing binary availability, versions, and env config state"
  - "All 9 backup env vars documented in env.example with correct defaults and section format"
affects:
  - 33-02
  - phase-34-backup-implementation

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Aptfile direct .deb URL pattern for App Platform system package installation"
    - "startup binary check using execFileSync with fail-loud in production / warn in dev"
    - "admin diagnostic endpoint pattern for infrastructure verification"

key-files:
  created:
    - "backend/Aptfile"
    - ".planning/phases/33-environment-setup-binary-verification/33-01-SUMMARY.md"
  modified:
    - "backend/env.example"
    - "backend/index.js"

key-decisions:
  - "D-01: Use in-process node-cron for backup scheduling (consistent with exchangeRateJob.js)"
  - "D-02: No distributed lock needed — single App Platform instance"
  - "D-06: Fail loud in production if binary missing, warn in dev (expected absence locally)"
  - "D-07: Admin diagnostic endpoint GET /admin/backup-status behind adminRateLimiter + requireAdmin"
  - "D-08: MONGODUMP_PATH/MONGORESTORE_PATH env vars with bare-name fallback"
  - "execFileSync over execSync — no shell spawned, throws cleanly on non-zero exit"

patterns-established:
  - "Pattern: Startup binary gate — verify external binary with execFileSync --version, fail loud in prod"
  - "Pattern: Admin diagnostic endpoint — lightweight status check following /admin/update-exchange-rate shape"
  - "Pattern: Aptfile direct .deb URL — bypass GPG/repo setup for packages not in default Ubuntu repos"

requirements-completed:
  - BKUP-04

# Metrics
duration: 15min
completed: 2026-04-04
---

# Phase 33 Plan 01: Environment Setup & Binary Verification Summary

**Aptfile with mongodb-database-tools .deb URL, startup execFileSync binary gate (fail-loud in prod), and admin /backup-status diagnostic endpoint with env config inspection**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-04T00:00:00Z
- **Completed:** 2026-04-04T00:15:00Z
- **Tasks:** 2
- **Files modified:** 3 (backend/Aptfile created, backend/env.example modified, backend/index.js modified)

## Accomplishments
- Created `backend/Aptfile` with the mongodb-database-tools Ubuntu 22.04 x86_64 .deb URL — App Platform will install mongodump/mongorestore at build time on next deploy
- Added `verifyMongodumpBinary()` startup function that checks both mongodump and mongorestore using `execFileSync`, logs resolved path via `which`, fails loud in production (`throw`), warns in dev/local
- Added `GET /admin/backup-status` endpoint (behind `adminRateLimiter`, `fetchUser`, `requireAdmin`) returning binary found/version/resolvedPath for both tools plus full env config inspection
- Documented all 9 backup env vars in `backend/env.example` with defaults, inline comments, and section format matching existing conventions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Aptfile and update env.example with backup configuration** - `1f75ea0` (chore)
2. **Task 2: Add startup binary verification and admin backup-status endpoint to index.js** - `e288873` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `backend/Aptfile` - Single-line .deb URL for mongodb-database-tools Ubuntu 22.04 x86_64; triggers DigitalOcean App Platform Aptfile buildpack at build time
- `backend/env.example` - New "MongoDB Backup" section with all 9 env vars: BACKUP_BUCKET, BACKUP_SPACES_REGION, BACKUP_SPACES_ENDPOINT, BACKUP_SPACES_KEY, BACKUP_SPACES_SECRET, BACKUP_SPACES_PREFIX, BACKUP_RETENTION_COUNT, MONGODUMP_PATH, MONGORESTORE_PATH
- `backend/index.js` - Added `verifyMongodumpBinary()` function + call in `connectDb().then()` chain + `GET /admin/backup-status` route

## Decisions Made
- Used `execFileSync` (not `execSync`) — avoids spawning a shell, throws cleanly on non-zero exit, per research anti-patterns guidance
- Fail-loud only in production (`NODE_ENV === 'production'`) — binary is not expected in local dev, so a warning is appropriate there
- `which` call wrapped in its own try/catch — `which` may not be available on Windows; falls back to logging the configured path
- `require('child_process')` scoped inside the route handler function — intentional co-location for a rarely-called diagnostic endpoint, consistent with plan instructions
- D-01 and D-02 scheduling/concurrency decisions documented as code comments adjacent to the function definition

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None for this plan — env.example documents the vars but no external service configuration is needed until Phase 34 implements the actual backup job.

**Note for deployment:** After deploying with the new Aptfile, check App Platform build logs for "digitalocean_apt" buildpack invocation and runtime startup logs for `[backup] mongodump resolved path:` lines. If the binary is not on PATH, set `MONGODUMP_PATH` and `MONGORESTORE_PATH` to the confirmed `/layers/digitalocean_apt/apt/usr/bin/` path in App Platform env vars.

## Next Phase Readiness
- Aptfile committed and ready to deploy — binary installation will be confirmed on next App Platform deploy
- `verifyMongodumpBinary()` will log the exact resolved path after first deploy, confirming the actual `/layers/...` path
- `GET /admin/backup-status` available for post-deploy verification without code changes
- All 9 backup env vars documented — admin/ops can add them to App Platform environment settings
- Phase 33 Plan 02 (or Phase 34) can proceed to implement the actual backup service once binary path is confirmed

---
*Phase: 33-environment-setup-binary-verification*
*Completed: 2026-04-04*
