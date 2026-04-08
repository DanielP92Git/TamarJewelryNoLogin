# Phase 36: Database Restore - Research

**Researched:** 2026-04-08
**Domain:** MongoDB restore via mongorestore, DigitalOcean Spaces download, Express route integration
**Confidence:** HIGH

## Summary

Phase 36 adds a `POST /admin/restore/:key` endpoint that downloads a backup archive from DigitalOcean
Spaces into memory and pipes it to `mongorestore` via stdin. The implementation mirrors the existing
`runBackup()` / `spawnMongodump()` pattern from Phase 34 in reverse: `getObject` replaces `putObject`,
`spawnMongorestore()` replaces `spawnMongodump()`, and the result is returned synchronously. All
decisions are locked in 36-CONTEXT.md — no alternatives need researching.

The three areas that need careful implementation are: (1) the unified concurrency lock that replaces
the boolean `isBackupRunning` with a string enum `activeOperation`; (2) the pre-restore safety backup
sequence, which must abort the restore if the safety backup fails; and (3) the `BackupLog` schema
extension needed to store `trigger: 'restore'` and `preRestoreBackup` field. All other aspects
directly reuse existing Phase 34/35 patterns already proven in production and in tests.

**Primary recommendation:** Mirror `spawnMongodump()` exactly for `spawnMongorestore()` — same spawn
pattern, same stderr capture, same credential redaction. The only difference is the extra `--drop`
flag and piping stdin from a Buffer instead of collecting stdout into a Buffer.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Pre-restore Safety**
- D-01: Auto-create a backup before every restore. Prefix: `pre-restore-` (e.g., `pre-restore-backup-2026-04-08T...archive.gz`).
- D-02: If pre-restore backup fails, abort the restore entirely. Never restore without a safety net.
- D-03: Pre-restore backups stored in a separate prefix (e.g., `pre-restore/`) — excluded from retention cleanup.
- D-04: API response includes `preRestoreBackup` field with the pre-restore backup filename.

**Restore Execution**
- D-05: Download backup archive from Spaces into memory (Buffer), then pipe to mongorestore via stdin.
- D-06: Use `mongorestore --archive --gzip --drop` — full clean state, not a merge.
- D-07: Synchronous response — await mongorestore completion, return result directly. Set generous request timeout.
- D-08: Add `runRestore()` to existing `backend/services/backupService.js`.
- D-09: Add `POST /admin/restore/:key` to existing `backend/routes/backup.js`.

**Confirmation Gate**
- D-10: Request body must include `{ "confirm": "RESTORE" }` — wrong/missing value returns 400, not a restore.
- D-11: Backup key validated against actual Spaces objects before restore begins — unknown key returns 404.

**Concurrency & Locking**
- D-12: Replace `isBackupRunning` boolean with `activeOperation` string: `null | 'backup' | 'restore'`.
- D-13: 409 response includes descriptive message per operation type.
- D-14: Cron backup skips silently if restore is in progress (log warning, skip run).

**Restore Logging**
- D-15: Reuse existing `BackupLog` model with `trigger: 'restore'`.
- D-16: Restore log entry includes `preRestoreBackup` field for audit traceability.
- D-17: Email alert sent on restore failure via existing `backupAlertService`.

**Error Handling & Reporting**
- D-18: Full error detail returned to admin — mongorestore stderr (credentials redacted), which step failed, step timing.
- D-19: No auto-rollback on partial restore failure. Return error with pre-restore backup filename for manual recovery.
- D-20: Step-by-step timing: `downloadMs`, `preBackupMs`, `restoreMs`, `totalMs`.

### Claude's Discretion
- Cooldown period between restores (recommended: no cooldown — gate + lock are sufficient)
- Maximum age limit on restorable backups (recommended: no limit)
- `MONGORESTORE_PATH` env var usage (already documented in Phase 33, D-08)
- mongorestore child process spawning details (spawn vs execFile, stderr capture — follow spawnMongodump pattern)
- BackupLog schema changes for restore-specific fields (preRestoreBackup field type, optional fields)
- Structured JSON log line format for restore (follow existing `[backup]` prefix pattern)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REST-01 | Admin can restore database from a specific backup via authenticated POST endpoint | Route pattern verified in backup.js; S3 getObject confirmed in aws-sdk v2 |
| REST-02 | Restore requires explicit confirmation to prevent accidental data overwrite | Confirmation gate pattern: check `req.body.confirm === 'RESTORE'`, return 400 if wrong |
</phase_requirements>

---

## Standard Stack

### Core

All required packages are already installed — no new dependencies needed. [VERIFIED: backend/package.json]

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| aws-sdk | ^2.1693.0 | S3 getObject to download backup from Spaces | Already used for backup upload in backupService.js |
| child_process | Node built-in | spawn mongorestore process | Same as mongodump pattern — no new dep |
| mongoose | ^8.6.1 | BackupLog persistence for restore log entries | Existing model, reuse with trigger:'restore' |
| express-rate-limit | ^7.5.1 | adminRateLimiter on restore route | Already recreated in backup.js |

### No New Dependencies

This phase adds zero npm packages. Everything needed is already present:
- `aws-sdk` S3 `getObject` (parallel to `putObject` already used)
- `child_process.spawn` (same as `spawnMongodump`)
- `BackupLog` model (same Mongoose model, new trigger value)
- `sendBackupFailureAlert` (same alert service, restore failure)

**Installation:** none required.

**Version verification:** All packages verified against installed versions in `backend/package.json`. [VERIFIED: backend/package.json]

---

## Architecture Patterns

### Recommended File Changes

```
backend/
├── services/
│   └── backupService.js          # ADD: runRestore(), spawnMongorestore(), buildPreRestoreFilename()
├── routes/
│   └── backup.js                 # ADD: POST /admin/restore/:key, REPLACE: isBackupRunning → activeOperation
├── models/
│   └── BackupLog.js              # MODIFY: add trigger enum value 'restore', add preRestoreBackup field
├── jobs/
│   └── backupJob.js              # MODIFY: check activeOperation !== null instead of isBackupRunning
└── env.example                   # (already documents MONGORESTORE_PATH from Phase 33)
```

### Pattern 1: spawnMongorestore() — Mirror of spawnMongodump()

**What:** Spawn mongorestore child process, write Buffer to stdin, capture stderr for error reporting.
**When to use:** Always — called from `runRestore()` after the download step.

Key difference from `spawnMongodump`: stdin is piped IN (write buffer, then end), stdout is ignored, stderr is captured for error reporting. Exit code 0 = success.

```javascript
// [ASSUMED] — pattern derived from spawnMongodump() in backupService.js [VERIFIED: backupService.js]
// Exact implementation is Claude's discretion per CONTEXT.md
function spawnMongorestore(mongoUri, archiveBuffer) {
  return new Promise((resolve, reject) => {
    const mongorestorePath = process.env.MONGORESTORE_PATH || 'mongorestore';

    const child = childProcess.spawn(
      mongorestorePath,
      ['--uri', mongoUri, '--archive', '--gzip', '--drop'],
      { stdio: ['pipe', 'ignore', 'pipe'] }  // stdin piped IN, stdout ignored, stderr piped
    );

    const stderrChunks = [];
    child.stderr.on('data', chunk => stderrChunks.push(chunk));

    child.on('close', code => {
      if (code !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString('utf8');
        const redacted = stderr.replace(/(mongodb(?:\+srv)?:\/\/)[^\s@]+@/g, '$1[REDACTED]@');
        return reject(new Error(`mongorestore exited ${code}: ${redacted}`));
      }
      resolve();
    });

    child.on('error', err => reject(err));

    // Write archive to stdin, then signal EOF
    child.stdin.write(archiveBuffer);
    child.stdin.end();
  });
}
```

**Critical difference from mongodump:** mongodump reads stdout, mongorestore writes to stdin. The
`stdio` option flips from `['ignore', 'pipe', 'pipe']` to `['pipe', 'ignore', 'pipe']`.

### Pattern 2: S3 getObject — Download to Buffer

**What:** Download a Spaces object into a Node.js Buffer using aws-sdk v2 `getObject`.
**When to use:** First step in `runRestore()` after key validation.

```javascript
// [VERIFIED: existing createBackupS3Client() in backupService.js + aws-sdk v2 API]
async function downloadFromSpaces(s3, bucket, key) {
  const response = await s3.getObject({ Bucket: bucket, Key: key }).promise();
  return response.Body; // Buffer in aws-sdk v2
}
```

`getObject().promise()` returns an object where `Body` is a `Buffer` (or `Blob` in browser — in Node
with aws-sdk v2, it is always a `Buffer`). [ASSUMED — based on training knowledge of aws-sdk v2 behavior; consistent with how putObject accepts Buffer as Body]

### Pattern 3: Unified Concurrency Lock (replaces isBackupRunning)

**What:** Module-level string enum in backup.js — `null | 'backup' | 'restore'`.
**When to use:** Checked at start of both POST /admin/backup and POST /admin/restore/:key. Also
checked in backupJob.js cron handler before running.

```javascript
// [VERIFIED: existing isBackupRunning pattern in backup.js — this is its replacement per D-12]
let activeOperation = null; // 'backup' | 'restore' | null

// In POST /admin/backup:
if (activeOperation !== null) {
  const msg = activeOperation === 'restore'
    ? 'Restore in progress'
    : 'Backup already in progress';
  return res.status(409).json({ success: false, error: msg });
}
activeOperation = 'backup';
try { /* ... */ } finally { activeOperation = null; }

// In POST /admin/restore/:key:
if (activeOperation !== null) {
  const msg = activeOperation === 'backup'
    ? 'Backup in progress'
    : 'Restore already in progress';
  return res.status(409).json({ success: false, error: msg });
}
activeOperation = 'restore';
try { /* ... */ } finally { activeOperation = null; }

// In backupJob.js cron handler:
if (activeOperation !== null) {
  console.warn('[backup] Cron backup skipped — operation in progress:', activeOperation);
  return;
}
```

### Pattern 4: Key Validation via listObjectsV2 (D-11)

**What:** Validate `:key` param against actual Spaces objects before restore begins.
**When to use:** After confirmation gate, before pre-restore backup.

The cleanest implementation is a prefix-aware key check. The route receives `:key` as the user-supplied
object key. Validate by attempting `headObject` (lightweight) or by checking the backup listing.

```javascript
// [ASSUMED] — headObject is the most efficient single-key existence check in aws-sdk v2
// Alternative: listObjectsV2 with Prefix=key (consistent with existing listing pattern)
async function keyExistsInSpaces(s3, bucket, key) {
  try {
    await s3.headObject({ Bucket: bucket, Key: key }).promise();
    return true;
  } catch (err) {
    if (err.code === 'NotFound' || err.statusCode === 404) return false;
    throw err; // Re-throw unexpected errors
  }
}
```

### Pattern 5: runRestore() Orchestration

**What:** Full restore flow — matches the locked decisions exactly.
**Step sequence (each step timed independently per D-20):**

```
1. Guard: confirm === 'RESTORE' → 400 if wrong
2. Guard: key format / credentials present
3. Validate key against Spaces (headObject/listObjects) → 404 if not found
4. Pre-restore safety backup (runBackup() with separate prefix) → abort if fails (D-02)
5. Download archive buffer (s3.getObject) — measure downloadMs
6. spawnMongorestore(mongoUri, buffer) — measure restoreMs
7. Persist BackupLog with trigger:'restore', preRestoreBackup field (D-15, D-16)
8. Send failure alert if failed (D-17)
9. Return result with all timing + preRestoreBackup field (D-04, D-20)
```

### Pattern 6: BackupLog Schema Extension

**What:** Add `'restore'` to the trigger enum, add optional `preRestoreBackup` field.
**When to use:** BackupLog.create() call after restore completes.

Current schema: `trigger: { type: String, required: true, enum: ['cron', 'manual'] }`.
Change needed: extend enum to `['cron', 'manual', 'restore']`, add `preRestoreBackup: { type: String, default: null }`.

```javascript
// [VERIFIED: current BackupLog schema in backend/models/BackupLog.js]
// Change trigger enum:
trigger: { type: String, required: true, enum: ['cron', 'manual', 'restore'] },
// Add new optional field:
preRestoreBackup: { type: String, default: null },
```

### Pre-restore Backup Naming (D-01, D-03)

Pre-restore backups use a separate prefix from regular backups to prevent retention cleanup from
deleting them. The CONTEXT.md specifies prefix `pre-restore/` and filename prefix `pre-restore-backup-`.

The simplest approach is to call `runBackup()` with overridden env for the prefix, or to add a `buildPreRestoreFilename()` helper and call `runBackup()` then copy/move the result. However, since `runBackup()` derives the prefix from `process.env.BACKUP_SPACES_PREFIX`, the cleanest implementation
is a new thin function or passing a config override to `runBackup()`.

**Claude's discretion:** Implementation detail of how pre-restore prefix is passed. Options:
1. Extract the upload step into a helper that accepts a prefix parameter (cleanest)
2. Temporarily override `process.env.BACKUP_SPACES_PREFIX` before calling `runBackup()` (fragile)
3. Add an optional `options` parameter to `runBackup({ prefix })` (backwards compatible)

Recommended: Option 3 — add optional `options` to `runBackup()`, default to existing env var behavior.
This keeps pre-restore backup logic inside the existing service without duplicating upload code.

### Anti-Patterns to Avoid

- **Piping archiveBuffer into mongorestore stdout:** mongorestore reads from stdin — write buffer to
  `child.stdin`, not `child.stdout`. Stdout from mongorestore is ignored.
- **Using `--out` flag:** Phase 34 decided `--archive --gzip` format (D-01). Restore must use
  matching `--archive --gzip` flags. No temp files.
- **Logging MongoDB URI in spawn args:** Same redaction pattern from spawnMongodump applies here —
  never log the URI, redact credentials from stderr before surfacing.
- **Forgetting `--drop` flag:** Without `--drop`, mongorestore merges instead of replacing — partial
  restores leave stale data. D-06 requires `--drop` for full disaster recovery semantics.
- **Allowing restore key with path traversal:** The `:key` param should be validated as a known
  Spaces object — the headObject check (D-11) prevents arbitrary key injection.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Archive piping to mongorestore | Custom stream pipeline | child_process.spawn + stdin.write + stdin.end | Existing spawnMongodump pattern proven; Buffer fits in memory for <10MB DB |
| Key existence check | Parse backup listing manually | S3 headObject (lightweight HEAD request) | Single API call, returns 404 on missing key |
| Credential redaction | Custom regex | Same regex as spawnMongodump: `/(mongodb(?:\+srv)?:\/\/)[^\s@]+@/g` | Already tested and verified in existing code |
| Pre-restore backup storage | Separate service | Call runBackup() with pre-restore prefix option | Reuses all upload + logging logic; no duplication |

**Key insight:** The entire restore is the inverse of backup — getObject instead of putObject, stdin write instead of stdout collect. Don't build new infrastructure; reverse the existing flow.

---

## Common Pitfalls

### Pitfall 1: stdin.end() Never Called — mongorestore Hangs Forever

**What goes wrong:** If you forget to call `child.stdin.end()` after writing the buffer, mongorestore
waits for more data and the process never exits. The route handler hangs until timeout.

**Why it happens:** mongorestore reads an archive stream from stdin — it expects EOF to know the stream
is complete. Writing data without ending the stream leaves mongorestore blocked on stdin.

**How to avoid:** Always call `child.stdin.end()` immediately after `child.stdin.write(archiveBuffer)`.
Or use `child.stdin.end(archiveBuffer)` to write and end in one call.

**Warning signs:** Route hangs, no response until server timeout, no error in stderr.

### Pitfall 2: Lock Not Released on Pre-restore Backup Failure

**What goes wrong:** If the pre-restore backup fails and an error is thrown before the `finally` block
releases `activeOperation`, the lock stays in `'restore'` state. All subsequent backup and restore
requests return 409 until server restart.

**Why it happens:** Error paths that don't reach `finally` — especially if the abort-on-failure (D-02)
path throws before entering the try/finally block.

**How to avoid:** Ensure `activeOperation = null` is in a `finally` block that wraps the ENTIRE
restore handler body, including the pre-restore backup step and the key validation step.

### Pitfall 3: BackupLog trigger Enum Rejection

**What goes wrong:** `BackupLog.create({ trigger: 'restore', ... })` throws a Mongoose validation
error because `'restore'` is not in the current enum `['cron', 'manual']`.

**Why it happens:** Mongoose schema validates enum values on create. Adding a new trigger value without
updating the schema causes silent log failures (caught in the outer try/catch).

**How to avoid:** Update `BackupLog.js` enum BEFORE writing the restore route. Add `'restore'` and
`preRestoreBackup` field in the same Wave 0 or Wave 1 task that modifies the schema. Tests will catch
this if BackupLog creation is tested.

### Pitfall 4: Pre-restore Backup Gets Deleted by Retention Cleanup

**What goes wrong:** `runRetentionCleanup()` is called with `prefix = 'backups/'`. If pre-restore
backups are stored at `backups/pre-restore-backup-*`, they match the prefix and get counted and deleted
in retention cleanup.

**Why it happens:** `listObjectsV2` with `Prefix: 'backups/'` returns ALL keys under that prefix
including any sub-paths.

**How to avoid:** Store pre-restore backups under a completely separate prefix (e.g., `pre-restore/`)
as decided in D-03. The `runRetentionCleanup()` call in `runBackup()` uses `BACKUP_SPACES_PREFIX`
(default `backups/`) which does NOT match `pre-restore/`.

### Pitfall 5: headObject Error Code Differences Between Spaces and AWS S3

**What goes wrong:** `headObject` for a missing key may throw an error with `code: 'NotFound'` or
`code: '404'` or `statusCode: 404` depending on the S3-compatible provider. If only checking one
form, valid-but-missing keys may be misidentified as server errors.

**Why it happens:** DigitalOcean Spaces is S3-compatible but not identical — error shapes may vary
slightly from canonical AWS.

**How to avoid:** Check both `err.code === 'NotFound'` and `err.statusCode === 404` in the catch
block. If either matches, treat as key not found. Re-throw anything else.

### Pitfall 6: Confirmation Gate Bypassed by Truthy Check

**What goes wrong:** `if (req.body.confirm)` instead of `if (req.body.confirm !== 'RESTORE')` allows
any truthy string (e.g., `"yes"`, `"true"`, `"restore"`) to bypass the gate.

**Why it happens:** Developer writes a loose truthy check instead of strict string equality.

**How to avoid:** Use strict equality: `if (req.body.confirm !== 'RESTORE') return res.status(400)...`
Test specifically that `{ "confirm": "yes" }` returns 400.

### Pitfall 7: mongorestore --drop Drops Collections Before Restore Fails

**What goes wrong:** mongorestore with `--drop` drops each collection before restoring it. If the
restore fails mid-way (e.g., corrupt archive), some collections are dropped and not restored — the
database is left in a partial state.

**Why it happens:** mongorestore applies `--drop` per-collection during restore, not atomically.

**How to avoid:** This is a known limitation — D-19 explicitly says no auto-rollback. The mitigation
is the pre-restore backup (D-01, D-02): if restore fails, the admin uses `preRestoreBackup` filename
from the response to trigger another restore from the safety backup. The response MUST include the
`preRestoreBackup` field even on failure.

---

## Code Examples

### End-to-End Restore Route Structure

```javascript
// [VERIFIED: pattern derived from POST /admin/backup in backup.js]
// Source: backend/routes/backup.js (Phase 35 output)

router.post(
  '/restore/:key',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    // D-10: Confirmation gate — strict equality required
    if (req.body.confirm !== 'RESTORE') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid confirmation. Send { "confirm": "RESTORE" } to proceed.',
      });
    }

    // D-12: Unified concurrency lock
    if (activeOperation !== null) {
      const msg = activeOperation === 'backup'
        ? 'Backup in progress — cannot restore while backup is running'
        : 'Restore already in progress';
      return res.status(409).json({ success: false, error: msg });
    }

    activeOperation = 'restore';
    try {
      const result = await runRestore(req.params.key);

      // D-15: Persist to BackupLog with trigger:'restore'
      try {
        await BackupLog.create({
          timestamp: new Date(result.timestamp),
          status: result.status,
          filename: req.params.key,
          bytes: null,
          duration_ms: result.totalMs,
          error: result.error,
          trigger: 'restore',
          preRestoreBackup: result.preRestoreBackup,
        });
      } catch (dbErr) {
        console.warn('[backup] failed to persist restore BackupLog:', dbErr.message);
      }

      // D-17: Alert on restore failure
      if (result.status === 'failed') {
        await sendBackupFailureAlert({ ...result, filename: req.params.key });
      }

      const httpStatus = result.status === 'failed' ? 500 : 200;
      return res.status(httpStatus).json({ success: result.status === 'success', ...result });
    } finally {
      activeOperation = null; // Always release lock
    }
  }
);
```

### runRestore() Function Skeleton (backupService.js)

```javascript
// [ASSUMED] — derived from runBackup() pattern [VERIFIED: backupService.js]
async function runRestore(key) {
  const startedAt = Date.now();
  const result = {
    timestamp: new Date().toISOString(),
    status: 'success',
    preRestoreBackup: null,
    failedStep: null,
    downloadMs: null,
    preBackupMs: null,
    restoreMs: null,
    totalMs: null,
    error: null,
  };

  try {
    // Guard: credentials
    if (!process.env.BACKUP_BUCKET || !process.env.BACKUP_SPACES_ENDPOINT ||
        !process.env.BACKUP_SPACES_KEY || !process.env.BACKUP_SPACES_SECRET) {
      throw new Error('Missing BACKUP_SPACES_* credentials or BACKUP_BUCKET');
    }
    if (!process.env.MONGO_URL) throw new Error('MONGO_URL is not set');

    const s3 = createBackupS3Client();
    const bucket = process.env.BACKUP_BUCKET;

    // D-11: Validate key against actual Spaces objects
    const exists = await keyExistsInSpaces(s3, bucket, key);
    if (!exists) {
      result.status = 'failed';
      result.failedStep = 'validation';
      result.error = `Backup key not found: ${key}`;
      return result; // Return early — no 404 thrown here, route handler decides status code
    }

    // D-01/D-02: Pre-restore safety backup
    const preBackupStart = Date.now();
    const preBackupResult = await runBackup({ prefix: process.env.BACKUP_PRE_RESTORE_PREFIX || 'pre-restore/' });
    result.preBackupMs = Date.now() - preBackupStart;
    if (preBackupResult.status === 'failed') {
      result.status = 'failed';
      result.failedStep = 'pre-backup';
      result.error = `Pre-restore backup failed: ${preBackupResult.error}`;
      return result; // D-02: abort restore if safety backup fails
    }
    result.preRestoreBackup = preBackupResult.filename; // D-04

    // D-05: Download archive into memory
    const downloadStart = Date.now();
    const archiveBuffer = await downloadFromSpaces(s3, bucket, key);
    result.downloadMs = Date.now() - downloadStart;

    // D-06: Run mongorestore --archive --gzip --drop
    const restoreStart = Date.now();
    await spawnMongorestore(process.env.MONGO_URL, archiveBuffer);
    result.restoreMs = Date.now() - restoreStart;

  } catch (err) {
    result.status = 'failed';
    result.error = err.message;
    if (!result.failedStep) result.failedStep = 'restore';
  } finally {
    result.totalMs = Date.now() - startedAt;
  }

  console.log('[backup] restore ' + JSON.stringify(result));
  return result;
}
```

### backupJob.js — Updated Cron Skip Check (D-14)

```javascript
// [VERIFIED: existing backupJob.js — this replaces the isBackupRunning check]
// Import activeOperation from backup.js, or use a shared lock module
// Simplest: backup.js exports a getter function, backupJob.js calls it

// In backup.js, export a getter:
function getActiveOperation() { return activeOperation; }
module.exports = router;
// Attach to router for import by backupJob.js:
router.getActiveOperation = getActiveOperation;

// In backupJob.js:
const { getActiveOperation } = require('../routes/backup');
// In cron handler:
if (getActiveOperation() !== null) {
  console.warn('[backup] Cron backup skipped — operation in progress:', getActiveOperation());
  return;
}
```

**Alternative (simpler):** Extract the lock into a shared module `backend/utils/backupLock.js` that
both `backup.js` and `backupJob.js` import. This avoids circular dependency concerns.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | `backend/vitest.config.js` |
| Quick run command | `npm test -- --reporter=verbose tests/unit/services/backupService.test.js tests/unit/jobs/backupJob.test.js` |
| Full suite command | `npm test` (from `backend/`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REST-01 | POST /admin/restore/:key returns restore result for admin | integration | `npm test -- tests/integration/backup.restore.test.js` | Wave 0 |
| REST-01 | 401 for unauthenticated request | integration | same file | Wave 0 |
| REST-01 | 403 for non-admin user | integration | same file | Wave 0 |
| REST-01 | 404 when key not found in Spaces | integration | same file | Wave 0 |
| REST-01 | 409 when backup in progress | integration | same file | Wave 0 |
| REST-01 | 409 when restore already in progress | integration | same file | Wave 0 |
| REST-02 | 400 when confirm missing | integration | same file | Wave 0 |
| REST-02 | 400 when confirm is wrong string ("yes") | integration | same file | Wave 0 |
| REST-02 | 200 when confirm === "RESTORE" | integration | same file | Wave 0 |
| SC-2 | Pre-restore backup created before restore | unit | `npm test -- tests/unit/services/backupService.test.js` | Wave 0 (extend) |
| SC-3 | Restore aborted if pre-restore backup fails | unit | same file | Wave 0 (extend) |
| D-06 | mongorestore spawned with --archive --gzip --drop flags | unit | same file | Wave 0 |
| D-12 | activeOperation lock: backup blocks restore | integration | `npm test -- tests/integration/backup.restore.test.js` | Wave 0 |
| D-14 | Cron job skips when activeOperation !== null | unit | `npm test -- tests/unit/jobs/backupJob.test.js` | Wave 0 (extend) |

### Sampling Rate
- **Per task commit:** `npm test -- tests/unit/services/backupService.test.js`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `backend/tests/integration/backup.restore.test.js` — covers REST-01, REST-02, D-12, D-13 (new file, mirror backup.trigger.test.js pattern)
- [ ] `backend/tests/unit/services/backupService.test.js` — extend with `runRestore`, `spawnMongorestore`, `keyExistsInSpaces` suites (file exists, needs new describes)
- [ ] `backend/tests/unit/jobs/backupJob.test.js` — extend with test: cron skips when activeOperation !== null (file exists, needs one new test)

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | v22.15.0 | — |
| mongorestore binary | spawnMongorestore() | Local: No (expected) | — | MONGORESTORE_PATH env already documented |
| aws-sdk S3 getObject | Download archive | Yes (npm package) | 2.1693.0 | — |
| DigitalOcean Spaces bucket | Archive storage | Not verifiable locally | — | Must be running in production |
| MongoDB Atlas | MONGO_URL target | Not verifiable locally | — | E2E test requires real Atlas connection |

**Missing dependencies with no fallback:**
- End-to-end restore test (SC-4) requires the real Atlas cluster and real Spaces bucket — cannot be
  mocked. Must be run manually in production/staging after code is deployed. Document result as a code
  comment per SC-4 requirement.

**Missing dependencies with fallback:**
- `mongorestore` binary not available in local dev — expected per Phase 33 D-06 (warn in dev, fail in
  prod). All unit tests mock `child_process.spawn`; integration tests mock `runRestore`.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT via `fetchUser` + `requireAdmin` middleware (existing, verified) |
| V3 Session Management | no | Stateless JWT — no session |
| V4 Access Control | yes | `requireAdmin` on all restore routes |
| V5 Input Validation | yes | Explicit confirmation string check; key validated against Spaces |
| V6 Cryptography | no | Spaces handles AES-256 at rest; no custom crypto |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal in `:key` param | Tampering | D-11: headObject validates key against actual Spaces objects; unknown keys return 404 |
| Confirmation gate bypass (truthy check) | Tampering | Strict equality: `req.body.confirm !== 'RESTORE'` |
| Accidental restore during backup | Denial of Service | D-12: unified `activeOperation` lock returns 409 |
| MongoDB URI leaking in logs | Information Disclosure | Same redaction regex as spawnMongodump — applied to mongorestore stderr |
| Unauthenticated restore | Elevation of Privilege | `adminRateLimiter, fetchUser, requireAdmin` middleware chain |
| Restore leaving DB in partial state | Tampering | Pre-restore backup (D-01/D-02) + preRestoreBackup field in response for manual recovery |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `isBackupRunning: boolean` (Phase 35) | `activeOperation: null | 'backup' | 'restore'` (Phase 36) | This phase | Descriptive 409 messages; prevents cross-operation conflicts |

**No deprecated patterns introduced.** All patterns follow Phase 34/35 established conventions.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `s3.getObject().promise()` returns `{ Body: Buffer }` in aws-sdk v2 with Node.js | Pattern 2 | `Body` might need `.toString()` or be a different type — verify with a quick test or aws-sdk v2 docs |
| A2 | DigitalOcean Spaces returns `err.code === 'NotFound'` or `err.statusCode === 404` for missing keys | Pattern 4 | Wrong error code check causes valid missing-key to be treated as server error |
| A3 | Writing `child.stdin.write(buffer)` then `child.stdin.end()` is sufficient to stream archive to mongorestore | Pattern 1 | If mongorestore needs streaming write of large archives, a single write may cause backpressure — acceptable for <10MB DB per project specs |
| A4 | `runBackup()` can accept an optional `options` param to override the S3 prefix without breaking existing callers | Pattern 5 (pre-restore naming) | If runBackup() is not extended, pre-restore backup needs a different implementation approach |

---

## Open Questions

1. **How exactly should pre-restore backup prefix be passed to runBackup()?**
   - What we know: `runBackup()` currently derives prefix from `BACKUP_SPACES_PREFIX` env var
   - What's unclear: Whether to extend `runBackup(options)` or extract upload logic separately
   - Recommendation: Add optional `options = {}` param with `{ prefix }` override — backwards compatible, no callers break

2. **Should the route return 404 or 400 for unknown backup key?**
   - What we know: D-11 says "unknown keys return 404" (explicitly stated in success criteria SC-3)
   - What's unclear: Whether `runRestore()` should throw a distinguishable error, or if the route handler checks the failedStep field
   - Recommendation: `runRestore()` returns `{ status:'failed', failedStep:'validation', error:'...' }` and route handler returns 404 when `failedStep === 'validation'`

3. **Shared lock architecture: router export vs. shared module?**
   - What we know: `backupJob.js` needs to read `activeOperation` from `backup.js`
   - What's unclear: Whether exporting a getter from the Router module is clean, or if a shared `backupLock.js` util is better
   - Recommendation: Shared `backend/utils/backupLock.js` module — avoids coupling job to route file, no circular dependency risk

---

## Sources

### Primary (HIGH confidence)
- `backend/services/backupService.js` — Full source of spawnMongodump, runBackup, createBackupS3Client patterns [VERIFIED: read in this session]
- `backend/routes/backup.js` — Full source of route structure, isBackupRunning lock, middleware chain [VERIFIED: read in this session]
- `backend/models/BackupLog.js` — Current schema fields and enums [VERIFIED: read in this session]
- `backend/services/backupAlertService.js` — Alert pattern to reuse [VERIFIED: read in this session]
- `backend/utils/backupBinaryCheck.js` — MONGORESTORE_PATH env var handling [VERIFIED: read in this session]
- `backend/jobs/backupJob.js` — Cron job structure, where lock check must be added [VERIFIED: read in this session]
- `backend/package.json` — Dependency versions, vitest test setup [VERIFIED: read in this session]
- `backend/vitest.config.js` — Test framework config, include patterns [VERIFIED: read in this session]
- `backend/tests/unit/services/backupService.test.js` — CJS mocking patterns, spawn mock pattern [VERIFIED: read in this session]
- `backend/tests/integration/backup.trigger.test.js` — Integration test pattern, stub injection approach [VERIFIED: read in this session]
- `.planning/phases/36-database-restore/36-CONTEXT.md` — All locked decisions [VERIFIED: read in this session]

### Secondary (MEDIUM confidence)
- aws-sdk v2 `getObject` behavior (Body as Buffer in Node.js) — consistent with project's existing `putObject` usage pattern [ASSUMED based on training knowledge of aws-sdk v2]

### Tertiary (LOW confidence)
- DigitalOcean Spaces exact error codes for missing headObject keys — not verified against Spaces documentation in this session [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json, no new deps needed
- Architecture: HIGH — all patterns derived directly from existing Phase 34/35 code
- Pitfalls: HIGH — pitfalls 1, 2, 3, 4, 6 derived from reading existing code; pitfall 5 and 7 are ASSUMED from training knowledge
- Test patterns: HIGH — mocking strategy verified from existing test files

**Research date:** 2026-04-08
**Valid until:** 2026-07-08 (stable dependencies — aws-sdk v2 API stable, mongorestore flags stable)
