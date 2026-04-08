---
phase: 35-manual-trigger-backup-listing-failure-alerting
plan: 01
subsystem: infra
tags: [mongodb, backup, emailjs, express, mongoose, s3, node-cron]

# Dependency graph
requires:
  - phase: 34-core-backup-service
    provides: runBackup() returning structured result object, createBackupS3Client(), backupJob.js cron skeleton
  - phase: 33-environment-setup-binary-verification
    provides: BACKUP_SPACES_* env var pattern, mongodump binary check

provides:
  - BackupLog Mongoose model with trigger/status/filename/bytes/duration_ms/error fields
  - POST /admin/backup — synchronous manual backup trigger with concurrency lock (409 on contention)
  - GET /admin/backups — merged Spaces + MongoDB log listing sorted newest-first
  - sendBackupFailureAlert() via EmailJS REST API v1.6 (no new dependencies)
  - backupJob.js cron now persists to BackupLog and sends failure alerts
  - All 5 EmailJS/alert env vars documented in env.example

affects:
  - 35-02 (backup route tests)
  - 36-restore-capability (uses BackupLog model and backup routes pattern)
  - 37-admin-dashboard-ui (consumes GET /admin/backups endpoint)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Caller-persists pattern: backupService.runBackup() stays Mongoose-free; callers (route + cron) persist BackupLog after runBackup returns"
    - "Local adminRateLimiter in route files (not exported from index.js monolith)"
    - "In-memory concurrency lock (isBackupRunning boolean) for single-instance App Platform"
    - "globalThis.fetch for server-side EmailJS calls (Node 22 built-in, zero new deps)"
    - "Guard-then-proceed pattern for optional email alerting (skip silently if env vars absent)"

key-files:
  created:
    - backend/models/BackupLog.js
    - backend/services/backupAlertService.js
    - backend/routes/backup.js
  modified:
    - backend/models/index.js
    - backend/jobs/backupJob.js
    - backend/index.js
    - backend/env.example

key-decisions:
  - "Caller-persists pattern: backupService stays pure (no Mongoose); route and cron persist BackupLog independently (D-09)"
  - "adminRateLimiter recreated locally in routes/backup.js — index.js does not export it"
  - "isBackupRunning in-memory lock is sufficient for single App Platform instance (D-17)"
  - "EmailJS v1.6 REST API via globalThis.fetch — no new npm dependencies (D-01)"
  - "Alert silently skipped (not error) when EMAILJS env vars absent — safe for dev/staging"
  - "No TTL on backup_logs collection — entries kept indefinitely (~200 bytes each, D-10)"

patterns-established:
  - "Route files recreate adminRateLimiter locally rather than importing from index.js monolith"
  - "BackupLog.create wrapped in nested try/catch so DB failures never block API response"
  - "Guard pattern in alert service: check all required env vars before attempting HTTP call"

requirements-completed: [ADM-01, REST-03, MON-02, MON-03]

# Metrics
duration: 25min
completed: 2026-04-07
---

# Phase 35 Plan 01: Manual Trigger, Backup Listing & Failure Alerting — Production Code Summary

**BackupLog Mongoose model, EmailJS failure alert service, POST /admin/backup manual trigger with 409 concurrency lock, GET /admin/backups merged Spaces+MongoDB listing, and cron job persistence/alerting — all wired into index.js**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-07T00:00:00Z
- **Completed:** 2026-04-07T00:25:00Z
- **Tasks:** 3
- **Files modified:** 7 (3 new, 4 modified)

## Accomplishments

- BackupLog Mongoose model with `trigger` enum (`cron`/`manual`), `timestamp:-1` index, export guard, and all MON-03 fields
- EmailJS REST API v1.6 alert service using `globalThis.fetch` — no new npm dependencies; silently skips when env vars absent
- POST /admin/backup endpoint with in-memory concurrency lock (409), synchronous runBackup() call, BackupLog persistence, and failure alerting
- GET /admin/backups endpoint merging DigitalOcean Spaces objects with MongoDB log entries by filename, sorted newest-first
- backupJob.js cron callback now persists BackupLog with `trigger:'cron'` and sends failure alerts
- All 5 EmailJS/alert env vars documented in backend/env.example

## Task Commits

Each task was committed atomically:

1. **Task 1: BackupLog model + models index + env.example** - `9071910` (feat)
2. **Task 2: backupAlertService email alert service** - `fae1490` (feat)
3. **Task 3: backup routes, backupJob persistence, index.js wiring** - `509b42d` (feat)

## Files Created/Modified

- `backend/models/BackupLog.js` — Mongoose model for backup run history (timestamp, status, filename, bytes, duration_ms, error, trigger, retention_deleted, retention_error)
- `backend/services/backupAlertService.js` — sendBackupFailureAlert() via EmailJS REST API v1.6; guards for missing env vars; no retry on failure
- `backend/routes/backup.js` — Express Router: POST /backup (manual trigger, concurrency lock) + GET /backups (merged Spaces+log listing)
- `backend/models/index.js` — Added BackupLog export
- `backend/jobs/backupJob.js` — Added BackupLog.create() + sendBackupFailureAlert() after cron runBackup()
- `backend/index.js` — Added `require('./routes/backup')` and `app.use('/admin', backupRoutes)`
- `backend/env.example` — Added EMAILJS_SERVICE_ID, EMAILJS_ALERT_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY, ALERT_EMAIL_TO

## Decisions Made

- **Caller-persists pattern (D-09):** backupService.runBackup() remains Mongoose-free and testable; BackupLog.create() called by route handler and cron callback after runBackup returns. Preserves clean separation of concerns.
- **Local adminRateLimiter:** routes/backup.js recreates `rateLimit({ windowMs: 15*60*1000, limit: 120 })` locally since index.js monolith does not export it.
- **In-memory lock (D-17):** `isBackupRunning` boolean in module scope is sufficient — App Platform runs single instance. `finally` block always releases lock even on unexpected errors.
- **No new npm dependencies:** EmailJS via `globalThis.fetch` (Node 22 built-in) rather than `node-fetch` or `axios`.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Worktree has no `node_modules` (expected for git worktrees sharing code with main repo). Node-based verification commands from the plan cannot run in the worktree directory. Verified all acceptance criteria via grep pattern checks instead, confirming structural correctness.

## User Setup Required

**External services require manual configuration before email alerts will fire.**

The EmailJS dashboard steps from the plan frontmatter `user_setup` section apply:
1. Create a new EmailJS template for backup alerts (separate from contact form `template_kwezl8a`)
   - Template must accept: `to_email`, `error_message`, `timestamp`, `filename`, `duration_ms`
   - Subject: "Backup Failed — Tamar Kfir Jewelry"
2. Set environment variables:
   - `EMAILJS_SERVICE_ID` — EmailJS Dashboard → Email Services → Service ID
   - `EMAILJS_ALERT_TEMPLATE_ID` — the new template's ID
   - `EMAILJS_PUBLIC_KEY` — EmailJS Dashboard → Account → API Keys → Public Key
   - `EMAILJS_PRIVATE_KEY` — EmailJS Dashboard → Account → API Keys → Private Key
   - `ALERT_EMAIL_TO` — admin email address for alerts

If these env vars are not set, the alert service skips silently (backup still runs and persists to MongoDB).

## Next Phase Readiness

- Phase 35 Plan 02 (backup route tests) can now test all three integration points: BackupLog model, backupAlertService, and backup routes
- Phase 36 (restore capability) can import BackupLog for restore audit logging using the same caller-persists pattern
- Phase 37 (admin dashboard UI) has the GET /admin/backups endpoint ready to consume

---
*Phase: 35-manual-trigger-backup-listing-failure-alerting*
*Completed: 2026-04-07*
