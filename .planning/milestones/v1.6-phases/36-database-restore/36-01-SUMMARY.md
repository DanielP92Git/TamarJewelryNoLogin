---
phase: 36-database-restore
plan: "01"
subsystem: backup-restore
tags: [backup, restore, mongodb, concurrency, admin-api]
dependency_graph:
  requires: [backend/services/backupService.js, backend/routes/backup.js, backend/models/BackupLog.js, backend/jobs/backupJob.js]
  provides: [POST /admin/restore/:key, runRestore, spawnMongorestore, keyExistsInSpaces, backupLock]
  affects: [backend/services/backupService.js, backend/routes/backup.js, backend/models/BackupLog.js, backend/jobs/backupJob.js]
tech_stack:
  added: [backend/utils/backupLock.js]
  patterns: [shared-concurrency-lock, pre-restore-safety-backup, mongorestore-stdin-pipe, headObject-key-validation]
key_files:
  created:
    - backend/utils/backupLock.js
  modified:
    - backend/services/backupService.js
    - backend/routes/backup.js
    - backend/models/BackupLog.js
    - backend/jobs/backupJob.js
decisions:
  - "Shared lock module (backupLock.js) replaces per-module isBackupRunning boolean — single source of truth for concurrency across routes and cron job"
  - "spawnMongorestore mirrors spawnMongodump pattern: stdin piped in, stdout ignored, stderr piped for error reporting"
  - "keyExistsInSpaces uses headObject (not listObjects) for lightweight key existence check with Spaces-compatible 404 handling"
  - "failedStep:'validation' maps to 404 HTTP status; all other failures map to 500"
  - "Pre-restore backup uses BACKUP_PRE_RESTORE_PREFIX env var (default: pre-restore/) to separate from regular backups"
metrics:
  duration: ~15min
  completed: "2026-04-08"
  tasks_completed: 3
  files_created: 1
  files_modified: 4
---

# Phase 36 Plan 01: Database Restore Pipeline Summary

**One-liner:** Full MongoDB restore pipeline via POST /admin/restore/:key with confirmation gate, headObject key validation, pre-restore safety backup, mongorestore stdin piping, and unified backupLock concurrency module.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create shared lock module, extend BackupLog schema, update backupJob cron skip | 3204921 | backend/utils/backupLock.js (new), backend/models/BackupLog.js, backend/jobs/backupJob.js |
| 2 | Add spawnMongorestore, keyExistsInSpaces, and runRestore to backupService.js | 9e0d97c | backend/services/backupService.js |
| 3 | Add POST /admin/restore/:key route with unified concurrency lock | a1c2246 | backend/routes/backup.js |

## What Was Built

### backend/utils/backupLock.js (new)
Shared concurrency lock module replacing the `isBackupRunning` boolean in backup.js. Exports `getActiveOperation()`, `setActiveOperation(op)`, `clearActiveOperation()`. The `activeOperation` value is `null | 'backup' | 'restore'`, enabling both routes and the cron job to share a single lock with descriptive state.

### backend/models/BackupLog.js (extended)
- `trigger` enum extended from `['cron', 'manual']` to `['cron', 'manual', 'restore']`
- New optional field `preRestoreBackup: { type: String, default: null }` for audit trail and manual recovery reference

### backend/jobs/backupJob.js (updated)
Added lock check at the top of the cron callback: if `getActiveOperation() !== null`, logs a warning and returns early. Prevents scheduled backup from running concurrently with an in-progress restore.

### backend/services/backupService.js (extended)
Three new functions + one signature change:
- **`runBackup(options = {})`**: Now accepts `options.prefix` to override the S3 prefix, enabling pre-restore safety backups under a separate `pre-restore/` prefix
- **`spawnMongorestore(mongoUri, archiveBuffer)`**: Mirrors `spawnMongodump` in reverse — writes archive buffer to stdin, ignores stdout, pipes stderr. Uses `--drop` for clean state. MongoDB URI redacted in error messages
- **`keyExistsInSpaces(s3, bucket, key)`**: Lightweight headObject check; handles both `err.code === 'NotFound'` and `err.statusCode === 404` for Spaces compatibility
- **`runRestore(key)`**: Full restore orchestration — env guard → key validation (failedStep:'validation') → pre-restore backup (failedStep:'pre-backup') → download → mongorestore (failedStep:'restore'). Returns structured result with `timestamp`, `status`, `preRestoreBackup`, `failedStep`, `downloadMs`, `preBackupMs`, `restoreMs`, `totalMs`, `error`

### backend/routes/backup.js (updated)
- `isBackupRunning` boolean removed entirely
- POST /admin/backup handler migrated to use `getActiveOperation/setActiveOperation/clearActiveOperation`
- New **POST /admin/restore/:key** endpoint:
  - `adminRateLimiter, fetchUser, requireAdmin` middleware chain (T-36-01, T-36-07)
  - Confirmation gate: `req.body.confirm !== 'RESTORE'` → 400 (T-36-02)
  - Concurrency check: `getActiveOperation() !== null` → 409 (T-36-05)
  - Calls `runRestore(req.params.key)` and awaits result
  - Persists BackupLog with `trigger: 'restore'` and `preRestoreBackup`
  - Sends failure alert via `sendBackupFailureAlert` on failure
  - Returns 404 when `failedStep === 'validation'`, 500 for other failures, 200 on success
  - `clearActiveOperation()` in finally block (T-36-05, Pitfall 2)

## Threat Model Coverage

All STRIDE threats from the plan's threat register are mitigated:

| Threat | Status |
|--------|--------|
| T-36-01: Unauthenticated access | Mitigated — adminRateLimiter + fetchUser + requireAdmin |
| T-36-02: Confirmation gate bypass | Mitigated — strict `!== 'RESTORE'` equality check |
| T-36-03: Path traversal via :key | Mitigated — key validated against actual S3 objects via headObject |
| T-36-04: MongoDB URI in response | Mitigated — same redaction regex `/(mongodb(?:\+srv)?:\/\/)[^\s@]+@/g` |
| T-36-05: Concurrent operations DoS | Mitigated — unified lock, 409 responses, finally-block cleanup |
| T-36-06: Partial restore failure | Accepted — preRestoreBackup field provides manual recovery path |
| T-36-07: Privilege escalation | Mitigated — requireAdmin rejects non-admin, rate limiter prevents brute force |

## API Contract

```
POST /admin/restore/:key
Body: { "confirm": "RESTORE" }

200 OK:    { success: true, status: 'success', preRestoreBackup, downloadMs, preBackupMs, restoreMs, totalMs, ... }
400:       { success: false, error: 'Missing or invalid confirmation...' }
404:       { success: false, status: 'failed', failedStep: 'validation', error: 'Backup key not found: ...' }
409:       { success: false, error: 'Backup in progress...' | 'Restore already in progress' }
500:       { success: false, status: 'failed', failedStep: '...', preRestoreBackup, error: '...' }
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data paths are fully wired.

## Self-Check: PASSED

Files created/modified:
- FOUND: backend/utils/backupLock.js
- FOUND: backend/models/BackupLog.js
- FOUND: backend/services/backupService.js
- FOUND: backend/routes/backup.js
- FOUND: backend/jobs/backupJob.js

Commits:
- FOUND: 3204921 (feat(36-01): create shared lock, extend BackupLog schema, add cron skip)
- FOUND: 9e0d97c (feat(36-01): add spawnMongorestore, keyExistsInSpaces, runRestore to backupService)
- FOUND: a1c2246 (feat(36-01): add POST /admin/restore/:key route with unified concurrency lock)
