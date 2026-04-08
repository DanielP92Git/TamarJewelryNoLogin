# Phase 35: Manual Trigger, Backup Listing & Failure Alerting - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can trigger a backup on demand via authenticated POST endpoint, view backup run history (merged Spaces + MongoDB logs) via authenticated GET endpoint, and receive an email notification when any backup fails. Adds a BackupLog Mongoose model for persistent history. No restore capability (Phase 36), no admin dashboard UI (Phase 37).

</domain>

<decisions>
## Implementation Decisions

### Email Alert Mechanism
- **D-01:** Use EmailJS REST API (POST to `api.emailjs.com/api/v1.6/email/send`) for server-side failure alerts. No new dependencies — plain HTTPS request.
- **D-02:** Recipient configured via `ALERT_EMAIL_TO` env var. Not hardcoded.
- **D-03:** New dedicated EmailJS template for backup alerts (separate from contact form template `template_kwezl8a`). Template receives backup-specific fields.
- **D-04:** Email sent on ALL backup failures — both cron and manually triggered.
- **D-05:** If EmailJS API call fails, log warning `[backup] alert email failed: {error}` and move on. No retry. Consistent with Phase 34 D-08 no-retry philosophy.
- **D-06:** Env vars: `EMAILJS_SERVICE_ID`, `EMAILJS_ALERT_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`, `ALERT_EMAIL_TO`. All configurable, no hardcoded service/template IDs.
- **D-07:** Alert email includes full context: error message, timestamp, filename attempted, duration before failure. Enough to diagnose without checking logs.

### Backup Log Persistence
- **D-08:** ALL backup runs (cron + manual) persist to `backup_logs` MongoDB collection. Complete history.
- **D-09:** `backupService.runBackup()` stays pure (no Mongoose dependency). Callers (backupJob.js for cron, route handler for manual) persist the result to BackupLog after `runBackup()` returns. Keeps backup service testable without MongoDB.
- **D-10:** No TTL index on backup_logs. Entries kept indefinitely — ~200 bytes each, negligible storage, useful for auditing.
- **D-11:** BackupLog model includes `trigger` field: `'cron'` or `'manual'`. Enables Phase 37 dashboard filtering.

### Backup Listing
- **D-12:** GET `/admin/backups` returns merged data — Spaces objects (key, size, lastModified) enriched with backup_logs data (status, duration, error, trigger). Matched by filename.
- **D-13:** Failed backups included in listing (from backup_logs, no Spaces object). Shows status='failed' + error. Admin sees full history including failures.
- **D-14:** No pagination. Return all entries sorted newest first. ~14 Spaces objects + growing log entries — small enough to return all.

### API Route Design
- **D-15:** All backup endpoints under `/admin` prefix: `POST /admin/backup`, `GET /admin/backups`. Consistent with existing `GET /admin/backup-status`.
- **D-16:** Synchronous response for POST `/admin/backup`. Await `runBackup()` and return result directly. DB is <10MB, backup completes in seconds. Set generous request timeout.
- **D-17:** In-memory concurrency lock (`isBackupRunning` boolean). Returns 409 Conflict if backup already in progress. Good enough for single-instance App Platform (Phase 33, D-02).
- **D-18:** Backup routes extracted to `backend/routes/backup.js` (not inline in index.js). Cleaner organization as Phase 36 (restore) and Phase 37 (dashboard) add more routes.

### Claude's Discretion
- BackupLog Mongoose schema field types and indexes (beyond the required fields)
- EmailJS REST API request implementation details (https module vs fetch)
- Concurrency lock implementation pattern (module-level variable, class, etc.)
- Merge algorithm for combining Spaces objects with backup_logs entries
- Route file structure and Express Router setup
- Middleware chain details (reuse existing `adminRateLimiter, fetchUser, requireAdmin` pattern)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — ADM-01, REST-03, MON-02, MON-03 requirements for this phase
- `.planning/ROADMAP.md` §Phase 35 — Success criteria (4 items) defining done state

### Existing PRD
- `backend/backup-prd.md` — Original PRD with architecture overview and security considerations

### Prior Phase Context
- `.planning/phases/33-environment-setup-binary-verification/33-CONTEXT.md` — Scheduling strategy, storage bucket, credentials, binary verification decisions
- `.planning/phases/34-core-backup-service/34-CONTEXT.md` — Backup execution, logging, failure handling decisions. D-07 (runBackup returns result object) is critical for this phase.

### Existing Code (Phase 34 Output)
- `backend/services/backupService.js` — `runBackup()` function that returns result object. Phase 35 manual trigger calls this directly.
- `backend/jobs/backupJob.js` — Cron job wrapper. Phase 35 adds BackupLog persistence + email alerting after `runBackup()` call.
- `backend/utils/backupBinaryCheck.js` — Binary verification utility

### Existing Patterns
- `backend/jobs/exchangeRateJob.js` — node-cron scheduling pattern with timezone
- `backend/middleware/auth.js` — `fetchUser`, `requireAdmin` middleware for admin route protection
- `backend/index.js` lines ~3426-3449 — Existing `/admin/backup-status` endpoint showing admin route pattern with `adminRateLimiter`
- `backend/models/Product.js` — Mongoose model pattern to follow for BackupLog model

### Infrastructure
- `backend/package.json` — Current dependencies (aws-sdk v2 for Spaces, node-cron, mongoose)
- `backend/env.example` — Env var documentation format to extend with EmailJS + alert vars

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backupService.runBackup()` — Returns result object with all MON-01 fields, ready for API response (Phase 34, D-07)
- `backupService.createBackupS3Client()` — Exported; listing endpoint can reuse for `listObjectsV2`
- `adminRateLimiter, fetchUser, requireAdmin` — Existing middleware chain for admin endpoints
- `aws-sdk` S3 `listObjectsV2` — Already available for listing Spaces objects

### Established Patterns
- Admin routes: `app.get('/admin/...', adminRateLimiter, fetchUser, requireAdmin, handler)` in index.js
- Cron jobs: Export `startXxxJob()` called from index.js startup
- Mongoose models: Schema + model export in `backend/models/` directory
- Logging: `[prefix]` style — `[backup]` prefix established in Phase 34

### Integration Points
- `backupJob.js` — Add BackupLog persistence + email alert call after `runBackup()` returns
- `index.js` — Mount new backup routes (`app.use('/admin', backupRoutes)`)
- `backend/models/` — New `BackupLog.js` model file
- `backend/routes/` — New `backup.js` routes file
- `backend/services/` — New email alert service (e.g., `backupAlertService.js`)
- `backend/env.example` — Document new EmailJS + ALERT_EMAIL_TO env vars

</code_context>

<specifics>
## Specific Ideas

- EmailJS is currently client-side only (`@emailjs/browser` in contactMeView.js with service_t4qcx4j). Phase 35 introduces the first server-side EmailJS usage via REST API — user must create a new template in the EmailJS dashboard and obtain the private API key.
- The existing `runBackup()` console.log JSON line should remain (it's useful for App Platform log inspection). MongoDB persistence is additive, not a replacement.
- The concurrency lock should also prevent manual trigger while a cron backup is running, and vice versa. Same `isBackupRunning` flag checked by both paths.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 35-manual-trigger-backup-listing-failure-alerting*
*Context gathered: 2026-04-07*
