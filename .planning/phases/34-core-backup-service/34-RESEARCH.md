# Phase 34: Core Backup Service - Research

**Researched:** 2026-04-05
**Domain:** Node.js child_process (mongodump), AWS SDK v2 S3, node-cron scheduling
**Confidence:** HIGH

## Summary

Phase 34 implements a daily automated MongoDB backup: `mongodump --archive --gzip` stdout buffered in memory, uploaded to DigitalOcean Spaces (ams3), with count-based retention cleanup. All decisions are locked in CONTEXT.md — the research domain is narrow and well-defined by prior context.

The project already has every runtime dependency in place: `aws-sdk@2.1693.0`, `node-cron@3.0.3`, `backupBinaryCheck.js`, and the test harness (Vitest + mongodb-memory-server + nock S3 mocks). The implementation pattern is directly modelled on the existing `exchangeRateJob.js`.

One critical correction from CONTEXT.md: the MongoDB connection env var in this codebase is `MONGO_URL` (confirmed in `backend/config/db.js`), NOT `DATABASE_URL` as stated in CONTEXT.md §code_context. The backup service must use `process.env.MONGO_URL` when constructing the mongodump URI argument.

**Primary recommendation:** Model `backupService.js` and `backupJob.js` exactly on the `exchangeRateJob.js`/`exchangeRateService.js` split — separate concerns, export a `startBackupJob()` function called from `index.js` startup.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use `mongodump --archive --gzip` to produce a single streamable archive file (no `--out` directory approach)
- **D-02:** Buffer mongodump stdout in memory (Buffer.concat), then upload the complete buffer to S3 via `putObject`. No temp file on disk.
- **D-03:** File size is derived from `buffer.length` before upload — gives exact byte count for logging.
- **D-04:** Daily at 03:00 AM Israel time (Asia/Jerusalem), using `cron.schedule()` with timezone — consistent with `exchangeRateJob.js` pattern.
- **D-05:** Cron expression is hardcoded (`'0 3 * * *'`), not configurable via env var. Change requires code deploy.
- **D-06:** Each backup run produces a single JSON log line prefixed with `[backup]`. Fields: timestamp, status, filename, sizeBytes, durationMs, retentionDeleted, error.
- **D-07:** `runBackup()` function returns the result object AND logs the JSON line. Phase 35's manual trigger endpoint can return the object directly as API response.
- **D-08:** On failure: log a JSON line with `status:'failed'` and error message. No automatic retry.
- **D-09:** If retention cleanup fails after a successful backup, the backup is still reported as `status:'success'`. Retention failure is logged as a separate warning field (`retentionError`).

### Claude's Discretion

- Service file structure (single `backupService.js` or split into backup + retention modules)
- S3 client initialization pattern (reuse aws-sdk v2 already in dependencies)
- mongodump child process spawning details (spawn vs execFile, error capture)
- Retention cleanup implementation (list objects, sort, delete oldest beyond count)
- The `[backup]` log prefix format and exact JSON field names (as long as MON-01 fields are covered)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BKUP-01 | System runs automated daily MongoDB backup using mongodump with gzip compression | `mongodump --archive --gzip` child_process spawn; node-cron `'0 3 * * *'` with `Asia/Jerusalem` timezone |
| BKUP-02 | Backup archives are uploaded directly to DigitalOcean Spaces (off-region bucket) | AWS SDK v2 `putObject` to ams3 bucket; backup-specific S3 client using `BACKUP_SPACES_*` credentials |
| BKUP-03 | Backup files use timestamped naming convention (ISO format, sortable) | ISO 8601 with dashes replacing colons: `backup-2026-04-05T03-00-00Z.archive.gz`; produced via `new Date().toISOString().replace(/:/g, '-')` |
| MON-01 | Each backup run produces a structured log entry (timestamp, status, size, duration, error) | JSON log line `console.log('[backup] ' + JSON.stringify({...}))` with fields: timestamp, status, filename, sizeBytes, durationMs, retentionDeleted, error |
| RET-01 | System auto-deletes backups exceeding retention count after each successful backup | S3 `listObjectsV2` on prefix → sort by key (lexicographic = chronological) → `deleteObjects` for surplus entries |
| ADM-03 | Retention count configurable via `BACKUP_RETENTION_COUNT` env var (default 14) | `parseInt(process.env.BACKUP_RETENTION_COUNT, 10) \|\| 14` at runtime |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- No `/api` prefix on routes — admin endpoints continue the existing pattern (`/admin/...`)
- `requireAdmin` middleware is `fetchUser, requireAdmin` chain from `backend/middleware/auth.js`
- Backend is monolithic — startup integration goes in `backend/index.js`, similar to `startExchangeRateJob()` call
- Environment variables follow grouped format in `env.example` with section headers — backup vars already added in Phase 33
- Test framework: Vitest with `mongodb-memory-server`; test files in `backend/tests/`; run with `npm test` (from `/backend`)

---

## Standard Stack

### Core (all already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `aws-sdk` | 2.1693.0 | S3 putObject, listObjectsV2, deleteObjects | Already in deps; v2 API consistent with existing `index.js` S3 usage |
| `node-cron` | 3.0.3 | `cron.schedule()` with timezone | Already in deps; used by `exchangeRateJob.js` — established project pattern |
| `child_process` (Node built-in) | — | `spawn()` for mongodump subprocess | No import needed — built-in module |

### No New Dependencies

All libraries required for Phase 34 are already installed. No `npm install` step needed.

**Version verification:** Confirmed from `backend/package.json` directly (not training data).

---

## Architecture Patterns

### Recommended File Structure

```
backend/
├── jobs/
│   ├── exchangeRateJob.js      # Existing pattern to mirror
│   └── backupJob.js            # NEW: cron schedule wrapper (startBackupJob)
├── services/
│   ├── exchangeRateService.js  # Existing pattern to mirror
│   └── backupService.js        # NEW: runBackup(), createS3Client(), runRetentionCleanup()
└── index.js                    # Add: require + startBackupJob() call at startup
```

This follows the established two-file separation: job file handles scheduling/wiring, service file handles logic.

### Pattern 1: S3 Client Initialization

The backup service creates its own S3 client — `index.js` does not export its client. Follow the same constructor pattern:

```javascript
// Source: backend/index.js lines 131-139 (direct read)
const s3 = new AWS.S3({
  endpoint: new AWS.Endpoint(process.env.BACKUP_SPACES_ENDPOINT),
  accessKeyId: process.env.BACKUP_SPACES_KEY,
  secretAccessKey: process.env.BACKUP_SPACES_SECRET,
  region: process.env.BACKUP_SPACES_REGION || undefined,
});
```

Guard: if any of `BACKUP_SPACES_ENDPOINT`, `BACKUP_SPACES_KEY`, `BACKUP_SPACES_SECRET` is absent, `runBackup()` must fail fast with a clear error rather than silently uploading to the wrong bucket.

### Pattern 2: Cron Job Wiring

Exact model from `exchangeRateJob.js`:

```javascript
// Source: backend/jobs/exchangeRateJob.js (direct read)
function startBackupJob() {
  cron.schedule(
    '0 3 * * *',
    async () => { await runBackup(); },
    { scheduled: true, timezone: 'Asia/Jerusalem' }
  );
  if (!isProd) console.log('[backup] Daily backup job scheduled (03:00 AM Israel time)');
}
module.exports = { startBackupJob, runBackup };
```

### Pattern 3: mongodump Child Process (spawn, not execFile)

`execFile` buffers stdout in memory automatically but is limited by `maxBuffer`. For potentially large dumps, `spawn` with manual buffer accumulation is safer and matches D-02 (explicit Buffer.concat):

```javascript
// Canonical pattern for D-01/D-02
const { spawn } = require('child_process');

function spawnMongodump(mongoUri) {
  const mongodumpPath = process.env.MONGODUMP_PATH || 'mongodump';
  // NEVER put mongoUri in args array that gets logged — redact in any error logging
  const args = [
    '--uri', mongoUri,
    '--archive',
    '--gzip',
  ];
  return spawn(mongodumpPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
}
```

Collect stdout chunks: `chunks.push(chunk)` in `data` handler → `Buffer.concat(chunks)` in `close` handler. Check exit code in `close` handler — non-zero means failure.

**Security:** Never log `mongoUri` directly. If logging spawn args for debug, redact: `args.map(a => a.startsWith('mongodb') ? '[REDACTED]' : a)`.

### Pattern 4: Filename Generation (ISO with dashes)

```javascript
// Produces: backup-2026-04-05T03-00-00Z.archive.gz
function buildFilename() {
  return 'backup-' + new Date().toISOString().replace(/:/g, '-') + '.archive.gz';
}
```

The `.replace(/:/g, '-')` step makes the filename filesystem-safe while preserving lexicographic sort order.

### Pattern 5: Retention Cleanup

```javascript
async function runRetentionCleanup(s3, bucket, prefix, retentionCount) {
  const listResp = await s3.listObjectsV2({ Bucket: bucket, Prefix: prefix }).promise();
  const objects = (listResp.Contents || [])
    .sort((a, b) => a.Key.localeCompare(b.Key)); // lexicographic = chronological given ISO filenames
  const surplus = objects.slice(0, Math.max(0, objects.length - retentionCount));
  if (surplus.length === 0) return 0;
  await s3.deleteObjects({
    Bucket: bucket,
    Delete: { Objects: surplus.map(o => ({ Key: o.Key })) }
  }).promise();
  return surplus.length;
}
```

AWS SDK v2 `listObjectsV2` returns up to 1000 objects per call. With retention=14, this project will never exceed that limit (14 + 1 at most on any given run).

### Pattern 6: Structured Log Line (MON-01)

```javascript
// Always one JSON line per backup run
console.log('[backup] ' + JSON.stringify({
  timestamp: new Date().toISOString(),
  status: 'success' | 'failed',
  filename: 'backup-2026-04-05T03-00-00Z.archive.gz',  // null on failure
  sizeBytes: buffer.length,                              // null on failure
  durationMs: Date.now() - startedAt,
  retentionDeleted: 2,                                   // 0 on failure or clean run
  error: null | 'error message string',
  retentionError: null | 'retention error message',      // D-09
}));
```

### Anti-Patterns to Avoid

- **Logging MongoDB URI:** Never include `process.env.MONGO_URL` in logged spawn args or error messages. Use `[REDACTED]` sentinel.
- **Temp file on disk:** D-02 is explicit — no `--out /tmp/backup` pattern. Buffer in memory only.
- **Reusing index.js S3 client:** index.js does not export `s3`. Backup service creates its own with backup-specific credentials.
- **Hard-coding env var names in spawn args:** Always read `process.env.MONGODUMP_PATH || 'mongodump'` — Phase 33 decision D-08.
- **Treating retention failure as backup failure:** D-09 — successful upload + retention failure = `status:'success'` with `retentionError` field set.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cron scheduling | Custom setInterval/setTimeout loop | `node-cron` (already installed) | DST handling, timezone support, second-level precision, proven reliability |
| S3 upload | Raw HTTPS PUT | `aws-sdk` v2 `putObject` (already installed) | Handles auth signing, retries, multipart for large objects |
| MongoDB dump format | Custom BSON serialization | `mongodump --archive --gzip` | Authoritative tool; handles indexes, metadata, all collections atomically |

**Key insight:** All three problem spaces have battle-tested tools already installed in the project. Phase 34 is wiring them together, not inventing new infrastructure.

---

## Common Pitfalls

### Pitfall 1: `MONGO_URL` vs `DATABASE_URL`

**What goes wrong:** CONTEXT.md §code_context states "MongoDB URI: Available via `process.env.DATABASE_URL`" — but the actual codebase uses `MONGO_URL` (confirmed in `backend/config/db.js` line 4 and `backend/env.example` line 22).

**Why it happens:** The CONTEXT.md contained an incorrect env var name.

**How to avoid:** The backup service must pass `process.env.MONGO_URL` as the `--uri` argument to mongodump, not `process.env.DATABASE_URL`.

**Warning signs:** mongodump exits with error "Invalid Connection String" or "URI required" if the env var name is wrong.

### Pitfall 2: mongodump stderr vs stdout

**What goes wrong:** mongodump writes progress output to stderr and archive data to stdout. Reading both on the same stream produces a corrupt archive.

**Why it happens:** Treating `stdio: 'pipe'` as a single stream rather than separating `stdout` and `stderr`.

**How to avoid:** Use `spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })`. Collect `process.stdout` chunks into the backup buffer. Collect `process.stderr` separately for error logging only.

### Pitfall 3: Non-zero exit code not checked

**What goes wrong:** mongodump exits with code 1 on partial failure (e.g., auth error, network error) but may have written some bytes to stdout before failing. Uploading a corrupt partial archive.

**Why it happens:** Only listening to the `close` event but not checking `code`.

**How to avoid:** In the `close` handler, check `if (code !== 0)` before uploading. If non-zero: reject the promise with the stderr content.

### Pitfall 4: `listObjectsV2` pagination not handled

**What goes wrong:** If somehow more than 1000 backup objects exist in the prefix, `listObjectsV2` only returns the first 1000 and retention cleanup acts on an incomplete list.

**Why it happens:** AWS SDK v2 `listObjectsV2` defaults to `MaxKeys: 1000`.

**How to avoid:** For this project (retention=14), this is not a realistic risk. However, the planner should note this in a comment in the retention cleanup function. No pagination implementation needed for Phase 34.

### Pitfall 5: S3 credentials absent at startup

**What goes wrong:** If `BACKUP_SPACES_*` env vars are not set in production, `putObject` fails with an unhelpful auth error rather than a clear config error.

**Why it happens:** The S3 client constructor doesn't validate credentials — it only fails on actual API calls.

**How to avoid:** At the start of `runBackup()`, check that `BACKUP_SPACES_ENDPOINT`, `BACKUP_SPACES_KEY`, `BACKUP_SPACES_SECRET`, and `BACKUP_BUCKET` are all non-empty. If any are missing, fail immediately with a descriptive error message. This produces a clean `status:'failed'` log line rather than a cryptic S3 auth error.

### Pitfall 6: `deleteObjects` fails silently on partial error

**What goes wrong:** AWS `deleteObjects` can return a 200 response but include per-key errors in the `Errors` array of the response body.

**Why it happens:** The operation is a batch call — AWS doesn't fail the whole request if individual deletes fail.

**How to avoid:** Check `deleteResp.Errors` after calling `deleteObjects`. If non-empty, surface as `retentionError` in the log line (D-09). Do not throw — the backup itself succeeded.

---

## Code Examples

### Full runBackup() skeleton (verified against all locked decisions)

```javascript
// Source: derived from D-01 through D-09 in 34-CONTEXT.md + Node.js child_process docs
const AWS = require('aws-sdk');
const { spawn } = require('child_process');

async function runBackup() {
  const startedAt = Date.now();
  const filename = 'backup-' + new Date().toISOString().replace(/:/g, '-') + '.archive.gz';
  const result = {
    timestamp: new Date().toISOString(),
    status: 'success',
    filename,
    sizeBytes: null,
    durationMs: null,
    retentionDeleted: 0,
    error: null,
    retentionError: null,
  };

  try {
    // Guard: credentials present
    const bucket = process.env.BACKUP_BUCKET;
    const prefix = process.env.BACKUP_SPACES_PREFIX || 'backups/';
    if (!bucket || !process.env.BACKUP_SPACES_ENDPOINT ||
        !process.env.BACKUP_SPACES_KEY || !process.env.BACKUP_SPACES_SECRET) {
      throw new Error('Missing BACKUP_SPACES_* credentials or BACKUP_BUCKET');
    }

    // Spawn mongodump
    const buffer = await spawnMongodump(process.env.MONGO_URL);
    result.sizeBytes = buffer.length;

    // Upload to Spaces
    const s3 = createBackupS3Client();
    const key = prefix + filename;
    await s3.putObject({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: 'application/gzip',
    }).promise();

    // Retention cleanup (D-09: failure here does not change status)
    try {
      const retentionCount = parseInt(process.env.BACKUP_RETENTION_COUNT, 10) || 14;
      result.retentionDeleted = await runRetentionCleanup(s3, bucket, prefix, retentionCount);
    } catch (retErr) {
      result.retentionError = retErr.message;
    }

  } catch (err) {
    result.status = 'failed';
    result.error = err.message;
  }

  result.durationMs = Date.now() - startedAt;
  console.log('[backup] ' + JSON.stringify(result));
  return result;
}
```

### spawnMongodump helper

```javascript
function spawnMongodump(mongoUri) {
  return new Promise((resolve, reject) => {
    const mongodumpPath = process.env.MONGODUMP_PATH || 'mongodump';
    const child = spawn(mongodumpPath, [
      '--uri', mongoUri,
      '--archive',
      '--gzip',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    const chunks = [];
    const stderrChunks = [];

    child.stdout.on('data', chunk => chunks.push(chunk));
    child.stderr.on('data', chunk => stderrChunks.push(chunk));

    child.on('close', code => {
      if (code !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString('utf8');
        // Redact URI from stderr before logging
        const redacted = stderr.replace(/(mongodb[^s]?:\/\/)[^\s@]+@/g, '$1[REDACTED]@');
        return reject(new Error(`mongodump exited ${code}: ${redacted}`));
      }
      resolve(Buffer.concat(chunks));
    });

    child.on('error', err => reject(err));
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `execFile` with `maxBuffer` for backup | `spawn` with manual chunk collection | Node.js streams best practice | No buffer size limit; safe for growing DB |
| Temp file on disk + upload | In-memory buffer + upload | D-02 (Phase 34 decision) | No disk I/O, no cleanup needed, no disk space risk |
| aws-sdk v3 (modular) | aws-sdk v2 (monolithic) | Project uses v2 throughout | v2 `.promise()` pattern; no change needed for Phase 34 |

---

## Open Questions

1. **mongodump binary path on App Platform**
   - What we know: `backupBinaryCheck.js` logs `which mongodump` at startup; env.example shows `/layers/digitalocean_apt/apt/usr/bin/mongodump` as a likely path
   - What's unclear: The actual resolved path on a deployed container has not been confirmed (STATE.md marks this as MEDIUM confidence)
   - Recommendation: Phase 34 implementation does not need to hardcode the path — `MONGODUMP_PATH` env var override (Phase 33 D-08) handles it. The binary check log from the first deployment will confirm the path.

2. **`listObjectsV2` NextContinuationToken**
   - What we know: AWS paginates at 1000 objects; project will never reach this in practice
   - What's unclear: Whether to implement pagination defensively
   - Recommendation: Add a comment in retention cleanup noting the 1000-object limit; do not implement pagination in Phase 34.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `aws-sdk` | S3 upload / retention cleanup | Yes (package.json) | 2.1693.0 | — |
| `node-cron` | Cron scheduling | Yes (package.json) | 3.0.3 | — |
| `mongodump` binary | Backup execution | Yes in production (Phase 33 verified); not in local dev | 100.x (App Platform) | Dev: skips execution per D-06/backupBinaryCheck.js warning |
| `BACKUP_SPACES_*` credentials | S3 upload | Must be provisioned (not code) | — | Fail fast with descriptive error at runtime |
| `BACKUP_BUCKET` (ams3) | S3 upload | Must be provisioned | — | No fallback — blocks backup execution |
| `MONGO_URL` | mongodump --uri | Yes (always set in production) | — | — |

**Missing dependencies with no fallback:**
- `BACKUP_SPACES_ENDPOINT`, `BACKUP_SPACES_KEY`, `BACKUP_SPACES_SECRET`, `BACKUP_BUCKET` — must be provisioned in the DigitalOcean App Platform environment variables before Phase 34 goes live. These are infrastructure, not code.

**Missing dependencies with fallback:**
- `mongodump` binary in local dev — `backupBinaryCheck.js` logs a warning and continues; backup job can be registered but will fail gracefully when triggered locally.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `backend/vitest.config.js` |
| Quick run command | `cd backend && npm test -- --reporter=verbose tests/unit/services/backupService.test.js` |
| Full suite command | `cd backend && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BKUP-01 | mongodump spawn with `--archive --gzip`; buffers stdout | unit | `npm test -- tests/unit/services/backupService.test.js` | Wave 0 |
| BKUP-01 | mongodump exit code != 0 produces failed status | unit | `npm test -- tests/unit/services/backupService.test.js` | Wave 0 |
| BKUP-02 | S3 putObject called with buffer and correct key | unit (nock) | `npm test -- tests/unit/services/backupService.test.js` | Wave 0 |
| BKUP-03 | Filename matches `backup-YYYY-MM-DDTHH-mm-ssZ.archive.gz` | unit | `npm test -- tests/unit/services/backupService.test.js` | Wave 0 |
| MON-01 | console.log called with JSON containing all 6 fields | unit | `npm test -- tests/unit/services/backupService.test.js` | Wave 0 |
| MON-01 | Failed run logs `status:'failed'` and error message | unit | `npm test -- tests/unit/services/backupService.test.js` | Wave 0 |
| ADM-03 | `BACKUP_RETENTION_COUNT` env var respected; defaults to 14 | unit | `npm test -- tests/unit/services/backupService.test.js` | Wave 0 |
| RET-01 | listObjectsV2 called; surplus objects deleted | unit (nock) | `npm test -- tests/unit/services/backupService.test.js` | Wave 0 |
| RET-01 | Retention failure does not change backup status to failed | unit | `npm test -- tests/unit/services/backupService.test.js` | Wave 0 |
| BKUP-01 | Cron expression `0 3 * * *` is valid (node-cron.validate) | unit | `npm test -- tests/unit/jobs/backupJob.test.js` | Wave 0 |

### Sampling Rate

- **Per task commit:** `cd backend && npm test -- tests/unit/services/backupService.test.js tests/unit/jobs/backupJob.test.js`
- **Per wave merge:** `cd backend && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/tests/unit/services/backupService.test.js` — covers BKUP-01, BKUP-02, BKUP-03, MON-01, ADM-03, RET-01
- [ ] `backend/tests/unit/jobs/backupJob.test.js` — covers cron expression validity (BKUP-01 scheduling)

Existing test infrastructure (Vitest, mongodb-memory-server, nock S3 mocks in `tests/helpers/mocks/s3.js`) covers all supporting infrastructure — no new framework install needed.

---

## Sources

### Primary (HIGH confidence)

- `backend/jobs/exchangeRateJob.js` — direct read; cron pattern, job structure, timezone usage
- `backend/utils/backupBinaryCheck.js` — direct read; spawn pattern, env var override, dependency injection
- `backend/tests/helpers/mocks/s3.js` — direct read; existing nock S3 mock helpers (putObject, deleteObject)
- `backend/package.json` — direct read; confirmed aws-sdk@2.1693.0, node-cron@3.0.3
- `backend/env.example` — direct read; confirmed `MONGO_URL` is the env var name, backup vars already added
- `backend/config/db.js` — direct read; confirmed `process.env.MONGO_URL` (contradicts CONTEXT.md `DATABASE_URL` claim)
- `backend/vitest.config.js` — direct read; test runner config, include patterns, coverage config
- `.planning/phases/34-core-backup-service/34-CONTEXT.md` — locked decisions D-01 through D-09

### Secondary (MEDIUM confidence)

- AWS SDK v2 `listObjectsV2` / `deleteObjects` / `putObject` API — consistent with existing `index.js` usage patterns; well-established SDK behavior

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed from package.json direct read; no new dependencies
- Architecture: HIGH — exact pattern exists in exchangeRateJob.js; all decisions locked in CONTEXT.md
- Pitfalls: HIGH — MONGO_URL/DATABASE_URL discrepancy verified from source; spawn/exit code patterns from Node.js child_process documentation
- Test coverage: HIGH — existing test helpers (nock s3.js, factories, vitest setup) confirmed by direct file read

**Research date:** 2026-04-05
**Valid until:** 2026-07-05 (stable — no fast-moving dependencies)
