# Phase 36: Database Restore - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can restore the database from any available Spaces backup via an authenticated POST endpoint, with an explicit confirmation gate (`{ "confirm": "RESTORE" }`) preventing accidental data overwrite. Includes pre-restore safety backup, unified concurrency lock, restore logging, and failure alerting. No admin dashboard UI (Phase 37).

</domain>

<decisions>
## Implementation Decisions

### Pre-restore Safety
- **D-01:** Automatically create a backup before every restore. Named with `pre-restore-` prefix (e.g., `pre-restore-backup-2026-04-08T...archive.gz`) to distinguish from regular backups.
- **D-02:** If the pre-restore backup fails, abort the restore entirely. Never restore without a safety net.
- **D-03:** Pre-restore backups are excluded from retention cleanup — stored in a separate prefix (e.g., `pre-restore/`) so `runRetentionCleanup()` never deletes them.
- **D-04:** Restore API response includes `preRestoreBackup` field with the pre-restore backup filename so the admin can undo if needed.

### Restore Execution
- **D-05:** Download backup archive from Spaces into memory (Buffer), then pipe to `mongorestore` via stdin. Consistent with Phase 34's in-memory approach. DB is <10MB compressed.
- **D-06:** Use `mongorestore --archive --gzip --drop` — drop each collection before restoring for a clean state. This is full disaster recovery, not a merge.
- **D-07:** Synchronous response — await mongorestore completion and return result directly. Consistent with POST `/admin/backup` (Phase 35, D-16). Set generous request timeout.
- **D-08:** Add `runRestore()` function to existing `backend/services/backupService.js` alongside `runBackup()`. Shares `createBackupS3Client()` and keeps backup/restore logic together.
- **D-09:** Add `POST /admin/restore/:key` route to existing `backend/routes/backup.js`. Same auth middleware chain (`adminRateLimiter, fetchUser, requireAdmin`).

### Confirmation Gate
- **D-10:** Request body must include `{ "confirm": "RESTORE" }`. Missing or wrong confirmation string returns 400 error, not a restore. (Per success criteria SC-2.)
- **D-11:** Backup key (`:key` param) is validated against actual Spaces objects before restore begins. Unknown keys return 404. (Per success criteria SC-3.)

### Concurrency & Locking
- **D-12:** Unified lock replacing `isBackupRunning` — module-level `activeOperation` variable in `backup.js`: `null | 'backup' | 'restore'`. Prevents backup-during-restore and vice versa.
- **D-13:** 409 Conflict response includes descriptive message per operation type ("Backup in progress" vs "Restore in progress").
- **D-14:** Cron-scheduled backup skips silently if restore is in progress (log warning, skip this run). Pre-restore auto-backup already created a fresh snapshot.

### Restore Logging
- **D-15:** Reuse existing `BackupLog` model with `trigger: 'restore'`. Same collection, Phase 37 dashboard sees backup and restore history in one place.
- **D-16:** Restore log entry includes `preRestoreBackup` field for audit traceability (which safety backup was created before this restore).
- **D-17:** Email alert sent on restore failure via existing `backupAlertService`. Consistent with Phase 35 failure alerting.

### Error Handling & Reporting
- **D-18:** Full error detail returned to admin — mongorestore stderr (credentials redacted), which step failed (download, pre-backup, or mongorestore), step-by-step timing. Admin endpoint is privileged.
- **D-19:** No auto-rollback on partial restore failure. Log the failure, return error details with pre-restore backup filename, let the admin decide next steps.
- **D-20:** Step-by-step timing in response: `downloadMs`, `preBackupMs`, `restoreMs`, `totalMs`. Useful for Phase 37 dashboard and debugging.

### Claude's Discretion
- Cooldown period between restores (recommended: no cooldown — confirmation gate + concurrency lock are sufficient)
- Maximum age limit on restorable backups (recommended: no limit — any Spaces backup is valid)
- `MONGORESTORE_PATH` env var usage (already documented in Phase 33, D-08)
- mongorestore child process spawning details (spawn vs execFile, stderr capture pattern — follow spawnMongodump pattern)
- BackupLog schema changes for restore-specific fields (preRestoreBackup field type, optional fields)
- Structured JSON log line format for restore operations (follow existing `[backup]` prefix pattern)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — REST-01 (restore via POST), REST-02 (confirmation gate)
- `.planning/ROADMAP.md` §Phase 36 — Success criteria (4 items) defining done state

### Existing PRD
- `backend/backup-prd.md` — Original PRD with restore flow overview (§6.2) and security considerations (§8)

### Prior Phase Context
- `.planning/phases/33-environment-setup-binary-verification/33-CONTEXT.md` — MONGORESTORE_PATH env var (D-08), binary verification (D-06), storage bucket config (D-03, D-04, D-05)
- `.planning/phases/34-core-backup-service/34-CONTEXT.md` — Archive format (D-01: `--archive --gzip`), in-memory approach (D-02), structured logging (D-06, D-07), failure handling (D-08, D-09)
- `.planning/phases/35-manual-trigger-backup-listing-failure-alerting/35-CONTEXT.md` — Email alerts (D-01–D-07), BackupLog model (D-08–D-11), route design (D-15–D-18), concurrency lock (D-17)

### Existing Code (Phase 34/35 Output)
- `backend/services/backupService.js` — `runBackup()`, `createBackupS3Client()`, `spawnMongodump()`, `buildBackupFilename()`, `runRetentionCleanup()` — restore logic adds to this file
- `backend/routes/backup.js` — POST `/admin/backup`, GET `/admin/backups`, `isBackupRunning` lock, auth middleware chain — restore route adds to this file
- `backend/models/BackupLog.js` — Mongoose model for backup history — restore entries reuse this model
- `backend/services/backupAlertService.js` — `sendBackupFailureAlert()` — reuse for restore failure alerts
- `backend/utils/backupBinaryCheck.js` — Binary verification utility (mongodump/mongorestore)
- `backend/middleware/auth.js` — `fetchUser`, `requireAdmin` middleware

### Infrastructure
- `backend/package.json` — Current dependencies (aws-sdk v2, node-cron, mongoose, express-rate-limit)
- `backend/env.example` — MONGORESTORE_PATH already documented (Phase 33)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createBackupS3Client()` in backupService.js — S3 client for Spaces, ready to use for downloading backup archives
- `spawnMongodump()` pattern — child_process.spawn with stdin/stdout/stderr piping, credential redaction. Mirror this for `spawnMongorestore()`
- `buildBackupFilename()` — can be extended or a parallel function created for pre-restore backup naming
- `BackupLog` model — reuse with `trigger: 'restore'` value
- `sendBackupFailureAlert()` — reuse for restore failure alerting
- `adminRateLimiter` + `fetchUser` + `requireAdmin` middleware chain in backup.js

### Established Patterns
- In-memory buffering: backupService buffers mongodump output to Buffer, then uploads via `putObject`. Restore reverses this: `getObject` to Buffer, pipe to mongorestore stdin
- Concurrency lock: module-level boolean in backup.js (`isBackupRunning`). Evolves to string enum `activeOperation`
- Structured logging: `[backup]` prefix + JSON.stringify(result). Restore follows same pattern
- Error handling: try/catch with result object tracking status/error, no automatic retry (Phase 34, D-08)

### Integration Points
- `backup.js` routes file — add POST `/admin/restore/:key` route
- `backupService.js` — add `runRestore(key)` function
- `BackupLog` model — may need optional fields for restore-specific data (preRestoreBackup)
- `backupJob.js` — needs to check unified lock before running cron backup
- `index.js` — no changes needed (backup routes already mounted)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following existing codebase patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 36-database-restore*
*Context gathered: 2026-04-08*
