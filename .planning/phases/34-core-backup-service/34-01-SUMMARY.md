---
phase: 34-core-backup-service
plan: "01"
subsystem: backup
tags: [backup, mongodb, s3, cron, node-cron, aws-sdk]
dependency_graph:
  requires: [backend/jobs/exchangeRateJob.js, backend/utils/backupBinaryCheck.js, aws-sdk, node-cron]
  provides: [runBackup, startBackupJob, backupService, backupJob]
  affects: [backend/index.js startup sequence]
tech_stack:
  added: []
  patterns: [spawn child_process with manual buffer accumulation, AWS S3 putObject via aws-sdk v2, node-cron schedule with Asia/Jerusalem timezone, nested try/catch for non-critical cleanup failure]
key_files:
  created:
    - backend/services/backupService.js
    - backend/jobs/backupJob.js
  modified:
    - backend/index.js
decisions:
  - "D-01: mongodump --archive --gzip (single archive stream, no --out directory)"
  - "D-02: Buffer stdout in memory with Buffer.concat — no temp file on disk"
  - "D-03: sizeBytes = buffer.length (exact byte count before upload)"
  - "D-04: Daily at 03:00 AM Israel time (Asia/Jerusalem)"
  - "D-05: Cron expression hardcoded — change requires code deploy"
  - "D-06: Single [backup] JSON log line per run"
  - "D-07: runBackup() returns result object for Phase 35 manual trigger"
  - "D-08: No retry on failure — next run in 24h or manual trigger"
  - "D-09: retention failure does not change backup status to failed"
metrics:
  duration_seconds: 125
  completed_date: "2026-04-05"
  tasks_completed: 2
  files_created: 2
  files_modified: 1
---

# Phase 34 Plan 01: Core Backup Service Summary

**One-liner:** MongoDB backup pipeline using mongodump --archive --gzip with in-memory buffering, S3 putObject upload, lexicographic retention cleanup, and structured JSON logging via a daily node-cron job at 03:00 AM Israel time.

## What Was Built

### backend/services/backupService.js

Complete backup orchestration module with 5 exported functions:

- **`createBackupS3Client()`** — Creates an AWS S3 client using `BACKUP_SPACES_*` credentials (separate from `index.js` S3 client which is not exported)
- **`buildBackupFilename()`** — Generates ISO timestamp filenames with colons replaced by dashes (e.g. `backup-2026-04-05T03-00-00.000Z.archive.gz`) — filesystem-safe and lexicographically sortable (BKUP-03)
- **`spawnMongodump(mongoUri)`** — Spawns `mongodump --archive --gzip` via `child_process.spawn`, buffers stdout chunks with `Buffer.concat`, pipes stderr separately for error reporting. MongoDB URI is redacted from any error messages before surfacing.
- **`runRetentionCleanup(s3, bucket, prefix, retentionCount)`** — Lists objects via `listObjectsV2`, sorts by Key (lexicographic = chronological given ISO filenames), deletes surplus oldest-first via `deleteObjects`. Checks `deleteResp.Errors` for partial batch failures.
- **`runBackup()`** — Main orchestrator: credential guard → `spawnMongodump` → `putObject` upload → nested retention cleanup (D-09: failure here does not change status) → structured JSON log line → return result object

### backend/jobs/backupJob.js

Cron scheduling wrapper mirroring `exchangeRateJob.js` pattern exactly:

- `startBackupJob()` schedules `'0 3 * * *'` with `timezone: 'Asia/Jerusalem'`
- Cron expression hardcoded per D-05 (change requires code deploy)
- Dev-only startup log: `[backup] Daily backup job scheduled (03:00 AM Israel time)`

### backend/index.js (modified)

Two minimal changes:
1. `require('./jobs/backupJob')` import added after `exchangeRateJob` import
2. `startBackupJob()` called after `verifyMongodumpBinary()` inside `connectDb().then()` under `NODE_ENV !== 'test'` guard

## Requirements Satisfied

| Requirement | Implementation |
|-------------|----------------|
| BKUP-01 | `spawnMongodump` with `--archive --gzip`; `startBackupJob` schedules `'0 3 * * *'` at `Asia/Jerusalem` |
| BKUP-02 | `s3.putObject()` to BACKUP_BUCKET using backup-specific S3 client |
| BKUP-03 | `buildBackupFilename()` produces `backup-YYYY-MM-DDTHH-mm-ss.mmmZ.archive.gz` |
| MON-01 | `console.log('[backup] ' + JSON.stringify(result))` with all 8 fields: timestamp, status, filename, sizeBytes, durationMs, retentionDeleted, error, retentionError |
| RET-01 | `runRetentionCleanup` lists, sorts oldest-first, deletes surplus via deleteObjects |
| ADM-03 | `parseInt(process.env.BACKUP_RETENTION_COUNT, 10) \|\| 14` at runtime |

## Commits

| Hash | Task | Description |
|------|------|-------------|
| 61fe2e2 | Task 1 | feat(34-01): create backup service with mongodump spawn, S3 upload, retention, and logging |
| ed3e3ca | Task 2 | feat(34-01): create backup cron job and wire into index.js startup |

## Deviations from Plan

None — plan executed exactly as written. All 9 locked decisions D-01 through D-09 honored. No Rule 1/2/3 auto-fixes required.

## Known Stubs

None — all functions are fully implemented. No hardcoded empty values, no placeholder text, no unconnected data sources. The service requires infrastructure (BACKUP_SPACES_* env vars, BACKUP_BUCKET, provisioned DigitalOcean Spaces bucket) to produce real backups, but that is runtime configuration, not a code stub.

## Self-Check: PASSED

See below.
