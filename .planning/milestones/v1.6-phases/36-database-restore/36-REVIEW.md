---
phase: 36-database-restore
reviewed: 2026-04-08T11:34:49Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - backend/jobs/backupJob.js
  - backend/models/BackupLog.js
  - backend/routes/backup.js
  - backend/services/backupService.js
  - backend/tests/integration/backup.restore.test.js
  - backend/tests/unit/jobs/backupJob.test.js
  - backend/tests/unit/services/backupService.test.js
  - backend/utils/backupLock.js
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 36: Code Review Report

**Reviewed:** 2026-04-08T11:34:49Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Reviewed the database restore feature (Phase 36) including the restore service logic, route handler, concurrency lock, backup log model, and all associated tests. The code is well-structured with solid error handling patterns, proper credential redaction, confirmation gates, and comprehensive test coverage. The restore flow (validate key -> pre-restore backup -> download -> mongorestore --drop) is logically sound with appropriate step timing and structured logging.

Three warnings were identified: an unhandled promise rejection path in the cron job's alert call, a missing stdin error handler in spawnMongorestore that could cause crashes on write failures, and an inaccurate failedStep label when S3 download fails during restore. Two informational items note missing key format validation and duplicated BackupLog persistence code.

## Warnings

### WR-01: Unhandled sendBackupFailureAlert rejection in cron callback

**File:** `backend/jobs/backupJob.js:60`
**Issue:** The `await sendBackupFailureAlert(result)` call on line 60 is not wrapped in a try/catch block. If the alert service throws (e.g., network timeout, email service down), the unhandled rejection will propagate out of the cron callback. While Node.js async cron callbacks don't crash the process on unhandled rejections by default, this could cause unexpected behavior and the rejection would go unlogged. The manual trigger in `backup.js:229-239` correctly wraps the same call in try/catch.
**Fix:**
```javascript
// backupJob.js line 59-61, wrap in try/catch like backup.js does:
if (result.status === 'failed') {
  try {
    await sendBackupFailureAlert(result);
  } catch (alertErr) {
    console.warn('[backup] cron alert failed:', alertErr.message);
  }
}
```

### WR-02: Missing stdin error handler in spawnMongorestore

**File:** `backend/services/backupService.js:252`
**Issue:** `child.stdin.write(archiveBuffer)` and `child.stdin.end()` are called without an `'error'` event handler on `child.stdin`. If the mongorestore process exits or closes its stdin pipe before the write completes (e.g., immediate validation failure, corrupt archive detected), the writable stream emits an `'error'` event. Without a handler, this becomes an unhandled `'error'` event which crashes the Node.js process. The `child.on('error')` handler on line 249 only catches spawn-level errors (e.g., ENOENT), not stdin write errors.
**Fix:**
```javascript
// Add stdin error handler before writing, around line 251:
child.stdin.on('error', () => {
  // Swallow stdin write errors — the 'close' event with non-zero exit code
  // will handle the actual error reporting via stderr
});

// Write archive to stdin, then signal EOF (Pitfall 1: MUST call end)
child.stdin.write(archiveBuffer);
child.stdin.end();
```

### WR-03: Incorrect failedStep label when S3 download fails during restore

**File:** `backend/services/backupService.js:370`
**Issue:** The catch block at line 367-371 sets `result.failedStep = 'restore'` for all errors that reach it. However, if the S3 `getObject` call on line 358 fails (download step), the `failedStep` would be labeled `'restore'` instead of `'download'`. This misreports which step actually failed, making debugging harder. The same applies to credential guard errors (lines 311-322) which would be labeled `'restore'` instead of `'validation'`.
**Fix:**
```javascript
// Track the current step to produce accurate failedStep labels:
let currentStep = 'validation'; // for the guards

// ... after guards pass:
currentStep = 'download';
const downloadStart = Date.now();
const response = await s3.getObject({ Bucket: bucket, Key: key }).promise();
const archiveBuffer = response.Body;
result.downloadMs = Date.now() - downloadStart;

currentStep = 'restore';
const restoreStart = Date.now();
await spawnMongorestore(process.env.MONGO_URL, archiveBuffer);
result.restoreMs = Date.now() - restoreStart;

// In the catch block:
} catch (err) {
  result.status = 'failed';
  result.error = err.message;
  if (!result.failedStep) result.failedStep = currentStep;
}
```

## Info

### IN-01: No format validation on restore key parameter

**File:** `backend/routes/backup.js:210`
**Issue:** `req.params.key` is passed directly to `runRestore()` and subsequently to S3 `headObject` and `getObject` without validating that it matches the expected backup filename pattern (e.g., `backups/backup-YYYY-MM-DDTHH-mm-ss.mmmZ.archive.gz`). While the endpoint is admin-only and S3 operations are bucket-scoped, validating the key format would provide defense-in-depth against reading arbitrary objects from the bucket.
**Fix:** Add a regex check before calling runRestore:
```javascript
const BACKUP_KEY_PATTERN = /^(backups|pre-restore)\/backup-\d{4}-\d{2}-\d{2}T[\d-]+\.archive\.gz$/;
if (!BACKUP_KEY_PATTERN.test(req.params.key)) {
  return res.status(400).json({ success: false, error: 'Invalid backup key format' });
}
```

### IN-02: Duplicated BackupLog.create() persistence logic

**File:** `backend/jobs/backupJob.js:43-56` and `backend/routes/backup.js:57-71`
**Issue:** The BackupLog.create() call with field mapping from the runBackup result is duplicated verbatim between the cron job callback and the manual backup route handler. Both map the same fields (`timestamp`, `status`, `filename`, `bytes` from `sizeBytes`, `duration_ms` from `durationMs`, etc.) with the same try/catch pattern. This increases maintenance burden -- any schema change requires updating both locations.
**Fix:** Extract a shared helper function, e.g., in a `utils/backupLogHelper.js`:
```javascript
async function persistBackupLog(result, trigger) {
  try {
    await BackupLog.create({
      timestamp: new Date(result.timestamp),
      status: result.status,
      filename: result.filename,
      bytes: result.sizeBytes,
      duration_ms: result.durationMs,
      error: result.error,
      trigger,
      retention_deleted: result.retentionDeleted || 0,
      retention_error: result.retentionError || null,
    });
  } catch (dbErr) {
    console.warn('[backup] failed to persist BackupLog:', dbErr.message);
  }
}
```

---

_Reviewed: 2026-04-08T11:34:49Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
