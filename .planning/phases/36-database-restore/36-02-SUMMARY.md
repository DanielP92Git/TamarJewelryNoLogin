---
phase: 36-database-restore
plan: "02"
subsystem: backup-restore
tags: [backup, restore, testing, unit-tests, integration-tests, concurrency, auth]
dependency_graph:
  requires: [backend/services/backupService.js, backend/routes/backup.js, backend/utils/backupLock.js, backend/jobs/backupJob.js, backend/models/BackupLog.js]
  provides: [test coverage for spawnMongorestore, keyExistsInSpaces, runRestore, POST /admin/restore/:key, cron lock skip]
  affects: [backend/tests/unit/services/backupService.test.js, backend/tests/unit/jobs/backupJob.test.js, backend/tests/integration/backup.restore.test.js]
tech_stack:
  added: []
  patterns: [CJS-module-property-replacement, EventEmitter-spawn-mock, S3-instance-queue-pattern, backupLock-state-control-in-tests]
key_files:
  created:
    - backend/tests/integration/backup.restore.test.js
  modified:
    - backend/tests/unit/services/backupService.test.js
    - backend/tests/unit/jobs/backupJob.test.js
decisions:
  - "Mock childProcess.spawn at lowest level for runRestore tests — since runRestore calls runBackup and spawnMongorestore as direct closures (not via module.exports), the only reliable mock layer is childProcess.spawn + S3 instance queue"
  - "s3MockInstanceQueue pattern from Phase 34 extended to handle runRestore's two S3 instantiations (one for runRestore key check/download, one for runBackup pre-restore backup)"
  - "backupLockModule.getActiveOperation replaced via module property assignment in cron skip test — same pattern as other CJS mocks in this codebase"
  - "Integration test uses backupLockModule.setActiveOperation/clearActiveOperation directly to test concurrency 409 responses — avoids timing-dependent concurrent-request pattern"
metrics:
  duration: ~12min
  completed: "2026-04-08"
  tasks_completed: 2
  files_created: 1
  files_modified: 2
---

# Phase 36 Plan 02: Test Suite for Database Restore Summary

**One-liner:** Comprehensive test suite for the Phase 36 restore pipeline: 24 unit tests for spawnMongorestore/keyExistsInSpaces/runRestore, 1 cron lock skip test, and 20 integration tests for POST /admin/restore/:key covering auth gating, confirmation gate, key validation, concurrency lock, response shape, and BackupLog persistence.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend backupService.test.js with spawnMongorestore, keyExistsInSpaces, runRestore suites | 12d4ea1 | backend/tests/unit/services/backupService.test.js |
| 2 | Extend backupJob.test.js with cron skip test and create backup.restore.test.js integration tests | 2528525 | backend/tests/unit/jobs/backupJob.test.js (modified), backend/tests/integration/backup.restore.test.js (new) |

## What Was Built

### backend/tests/unit/services/backupService.test.js (extended)

Three new `describe` blocks added after the existing `runBackup` suite:

**`describe('spawnMongorestore')` — 7 tests:**
- Spawn args verification: `['--uri', mongoUri, '--archive', '--gzip', '--drop']` with `stdio: ['pipe', 'ignore', 'pipe']`
- `child.stdin.write(archiveBuffer)` called, `child.stdin.end()` called
- Resolves on exit code 0, rejects with stderr content on non-zero
- Credential redaction in error messages (`[REDACTED]`)
- ENOENT spawn error propagation
- `MONGORESTORE_PATH` env var override

**`describe('keyExistsInSpaces')` — 4 tests:**
- Returns `true` on successful `headObject`
- Returns `false` on `err.code === 'NotFound'`
- Returns `false` on `err.statusCode === 404`
- Re-throws on unexpected errors (e.g. ETIMEDOUT)

**`describe('runRestore')` — 11 tests:**
- Success path: `status:'success'`, all timing fields populated
- `failedStep:'validation'` when key not found in Spaces
- `failedStep:'pre-backup'` when pre-restore backup fails (abort behavior)
- Pre-restore backup uses `pre-restore/` prefix (D-03)
- `preRestoreBackup` filename set in result (D-04)
- `failedStep:'restore'` when `spawnMongorestore` rejects
- All timing fields present: `downloadMs`, `preBackupMs`, `restoreMs`, `totalMs` (D-20)
- Error for missing `BACKUP_SPACES_*` credentials
- Error for missing `MONGO_URL`
- Structured log on success and failure: `[backup] restore {json}`

**Two additional tests in `runBackup` suite:**
- `options.prefix` override uses custom prefix
- Falls back to `BACKUP_SPACES_PREFIX` when no prefix in options

**Total: 52 tests (28 existing + 24 new), all passing**

### backend/tests/unit/jobs/backupJob.test.js (extended)

New `describe('cron lock check (D-14)')` block with 1 test:
- Cron callback does NOT call `runBackup` when `getActiveOperation()` returns `'restore'`
- Verifies `console.warn` called with "skipped" message
- Uses module property replacement on `backupLockModule.getActiveOperation` + cache-clearing reload pattern

**Total: 14 tests (13 existing + 1 new), all passing**

### backend/tests/integration/backup.restore.test.js (new file)

20 integration tests for `POST /admin/restore/:key` mirroring `backup.trigger.test.js` structure:

**Authentication gating (3 tests, T-36-T02):**
- 401 unauthenticated, 403 non-admin, 200 admin

**Confirmation gate (5 tests, REST-02, T-36-T01):**
- 400 missing confirm, 400 `'yes'`, 400 lowercase `'restore'`, 400 empty object, 200 exact `'RESTORE'`

**Key validation (1 test):**
- 404 when `failedStep === 'validation'`

**Concurrency lock (4 tests, D-12):**
- 409 when `activeOperation === 'backup'` (message: "Backup in progress")
- 409 when `activeOperation === 'restore'` (message: "Restore already in progress")
- Lock released after successful restore
- Lock released after failed restore

**Success response shape (2 tests):**
- `preRestoreBackup` present in 200 response
- All timing fields present: `downloadMs`, `preBackupMs`, `restoreMs`, `totalMs`

**Failure handling (5 tests):**
- 500 with `preRestoreBackup` on failed restore (D-19)
- `sendBackupFailureAlert` called on failure
- `sendBackupFailureAlert` NOT called on success
- `BackupLog.create` called with `trigger: 'restore'` (D-15)
- `BackupLog.create` called with `preRestoreBackup` field (D-16)

## Test Counts

| File | Before | After | Added |
|------|--------|-------|-------|
| backupService.test.js | 28 | 52 | +24 |
| backupJob.test.js | 13 | 14 | +1 |
| backup.restore.test.js | 0 | 20 | +20 |
| **Total** | **41** | **86** | **+35** |

## Threat Model Coverage

| Threat | Test Coverage |
|--------|---------------|
| T-36-T01: Confirmation gate — verify all invalid inputs rejected | Covered — tests for `'yes'`, `'restore'` (lowercase), `{}`, missing confirm all return 400 |
| T-36-T02: Auth gating — 401 no token, 403 non-admin | Covered — three auth gating tests |

## Deviations from Plan

**1. [Rule 1 - Minor] runRestore test suite: 11 tests instead of 10**

The plan listed 10 test cases for `runRestore` but the logging test was split into two separate tests (success log and failure log) for clarity, resulting in 11 tests. All plan behaviors are covered.

**2. [Rule 2 - Minor] No `describe('runBackup options.prefix')` nesting**

The two `options.prefix` tests were added directly inside the existing `runBackup` describe block rather than a nested sub-describe, which is cleaner given they test an existing function parameter variation.

## Known Stubs

None — all tests exercise real production code paths through mocked I/O dependencies.

## Self-Check: PASSED

Files verified:
- FOUND: backend/tests/unit/services/backupService.test.js
- FOUND: backend/tests/unit/jobs/backupJob.test.js
- FOUND: backend/tests/integration/backup.restore.test.js

Commits verified:
- FOUND: 12d4ea1 (test(36-02): extend backupService.test.js)
- FOUND: 2528525 (test(36-02): add cron lock skip test and create backup.restore.test.js)
