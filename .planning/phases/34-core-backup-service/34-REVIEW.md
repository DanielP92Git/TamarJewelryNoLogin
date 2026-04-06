---
phase: 34-core-backup-service
reviewed: 2026-04-07T12:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - backend/services/backupService.js
  - backend/jobs/backupJob.js
  - backend/index.js
  - backend/tests/unit/services/backupService.test.js
  - backend/tests/unit/jobs/backupJob.test.js
findings:
  critical: 1
  warning: 2
  info: 2
  total: 5
status: issues_found
---

# Phase 34: Code Review Report

**Reviewed:** 2026-04-07T12:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

The backup service implementation is well-structured with clear separation between the service layer (`backupService.js`), the scheduling layer (`backupJob.js`), and the startup wiring in `index.js`. Code quality is high overall: good error handling with nested try/catch for retention cleanup (D-09), proper credential guards, and comprehensive test coverage. The tests are thorough and use a smart CJS-level mocking strategy to work around Vitest ESM constraints.

However, there is one critical security issue: the MongoDB URI credential redaction regex fails to match `mongodb+srv://` connection strings, which is the scheme used in production. There are also two warning-level issues around negative retention count handling and a minor redaction gap for userinfo-less URIs.

## Critical Issues

### CR-01: URI Credential Redaction Fails for mongodb+srv:// Scheme

**File:** `backend/services/backupService.js:80`
**Issue:** The redaction regex `/(mongodb[^s]?:\/\/)[^\s@]+@/g` is designed to match both `mongodb://` and `mongodb+srv://` but fails on the latter. The character class `[^s]?` matches at most one character that is not `s`, so it matches the `+` in `mongodb+srv://`, but then the regex expects `://` while the remaining text is `srv://`. This means `mongodb+srv://user:pass@host` connection strings will NOT have credentials redacted in error messages. The test suite (line 303-327) only tests `mongodb://` format, masking this bug. The project's own test fixtures use `mongodb+srv://` (line 146), confirming this is the expected production scheme.

**Fix:**
```javascript
// Line 80 — replace the regex to handle both mongodb:// and mongodb+srv://
const redacted = stderr.replace(/(mongodb(?:\+srv)?:\/\/)[^\s@]+@/g, '$1[REDACTED]@');
```

The corresponding test should also add a case for `mongodb+srv://`:
```javascript
it('redacts mongodb+srv:// credentials from stderr', async () => {
  const mockChild = createMockChild();
  spawnSpy.mockReturnValue(mockChild);

  const promise = spawnMongodump('mongodb+srv://user:pass@cluster.example.com/db');

  setImmediate(() => {
    mockChild.stderr.emit(
      'data',
      Buffer.from('Error: failed for mongodb+srv://user:pass@cluster.example.com/db')
    );
    mockChild.emit('close', 1);
  });

  let errorMsg = '';
  try { await promise; } catch (err) { errorMsg = err.message; }

  expect(errorMsg).not.toContain('pass');
  expect(errorMsg).toContain('[REDACTED]');
});
```

## Warnings

### WR-01: Negative BACKUP_RETENTION_COUNT Deletes All Backups

**File:** `backend/services/backupService.js:187`
**Issue:** The retention count is parsed as `parseInt(process.env.BACKUP_RETENTION_COUNT, 10) || 14`. If an operator sets `BACKUP_RETENTION_COUNT=-5`, `parseInt` returns `-5` (truthy, so no fallback to 14). In `runRetentionCleanup` at line 108, `Math.max(0, objects.length - (-5))` evaluates to `objects.length + 5`, which exceeds the array length, causing `objects.slice(0, totalLength)` to return ALL objects. Every backup would be deleted. While this requires a misconfiguration, the service should guard against it.

**Fix:**
```javascript
// Line 187 — clamp to minimum of 1
const parsed = parseInt(process.env.BACKUP_RETENTION_COUNT, 10);
const retentionCount = (Number.isFinite(parsed) && parsed >= 1) ? parsed : 14;
```

### WR-02: Unhandled Promise Rejection in Cron Callback

**File:** `backend/jobs/backupJob.js:26-28`
**Issue:** The cron callback is an `async` function that `await`s `runBackup()`. While `runBackup()` currently has a comprehensive try/catch that prevents it from throwing, if a future change introduces an error path that escapes the try/catch (e.g., an error in the `finally` block or in the JSON.stringify call on line 206), the returned promise rejection would be unhandled by `node-cron`, leading to an `unhandledRejection` event. Defensive wrapping is low-cost and prevents future regressions.

**Fix:**
```javascript
cron.schedule(
  '0 3 * * *',
  async () => {
    try {
      await runBackup();
    } catch (err) {
      console.error('[backup] Unexpected error in backup cron callback:', err);
    }
  },
  { scheduled: true, timezone: 'Asia/Jerusalem' }
);
```

## Info

### IN-01: Test Does Not Validate mongodb+srv Redaction Despite Using It in Fixtures

**File:** `backend/tests/unit/services/backupService.test.js:146`
**Issue:** `DEFAULT_ENV.MONGO_URL` is set to `'mongodb+srv://user:pass@cluster.example.com/testdb'` (the `+srv` scheme), but the explicit redaction test at line 303-327 only tests the `mongodb://` scheme. This gap allowed CR-01 to go undetected. Adding a `mongodb+srv://` redaction test case would catch this.

**Fix:** Add a test case for `mongodb+srv://` as shown in the CR-01 fix above.

### IN-02: Commented-out Code Style Comment in index.js

**File:** `backend/index.js:827`
**Issue:** Line 827 has a malformed comment: `// Concurrency (D-02): No distributed lock needed...` starts with `//` (correct) but when viewed in the grep output it appeared as `\ Concurrency` -- this is likely a rendering artifact in the diff, but worth confirming the actual file content has a proper `//` prefix. If not, it would be a syntax error or dead text.

**Fix:** Verify the line starts with `//` -- no action needed if it does.

---

_Reviewed: 2026-04-07T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
