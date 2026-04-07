# Phase 35: Manual Trigger, Backup Listing & Failure Alerting - Research

**Researched:** 2026-04-07
**Domain:** Node.js/Express admin API — BackupLog Mongoose model, EmailJS server-side REST, S3 listing, concurrency control
**Confidence:** HIGH (all key findings verified against live codebase)

## Summary

Phase 35 extends the Phase 34 backup infrastructure with three coordinated capabilities: a synchronous POST endpoint to trigger backups on demand, a GET endpoint that merges Spaces object metadata with MongoDB BackupLog history, and an email alerting path that fires on any backup failure via the EmailJS REST API.

The codebase is well-prepared. `backupService.runBackup()` already returns a full result object (D-07). `createBackupS3Client()` is exported and ready to reuse for the listing endpoint's `listObjectsV2` call. The admin middleware chain (`adminRateLimiter, fetchUser, requireAdmin`) is established and consistent. The Mongoose model patterns in `models/Settings.js` and `models/Product.js` provide clear templates. The test framework (Vitest + mongodb-memory-server + nock + supertest) is fully configured.

The main research findings of note: the backend runs Node 22.15.0, so `fetch` is globally available — the EmailJS POST can use `globalThis.fetch` (the same approach the `agentLog` helper already uses in `index.js`). The official EmailJS docs show a v1.0 endpoint; the CONTEXT.md locked decision specifies v1.6 — these are treated as the locked choice. The `app` is exported from `backend/index.js` for supertest integration tests, and existing integration tests (`backupStatus.test.js`) provide the exact pattern for new backup endpoint tests.

**Primary recommendation:** Build in four files — `backend/models/BackupLog.js`, `backend/services/backupAlertService.js`, `backend/routes/backup.js` (Express Router), and modifications to `backend/jobs/backupJob.js` — then wire up via a single `app.use('/admin', backupRoutes)` in `index.js`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Email Alert Mechanism**
- D-01: Use EmailJS REST API (POST to `api.emailjs.com/api/v1.6/email/send`) for server-side failure alerts. No new dependencies — plain HTTPS request.
- D-02: Recipient configured via `ALERT_EMAIL_TO` env var. Not hardcoded.
- D-03: New dedicated EmailJS template for backup alerts (separate from contact form template `template_kwezl8a`). Template receives backup-specific fields.
- D-04: Email sent on ALL backup failures — both cron and manually triggered.
- D-05: If EmailJS API call fails, log warning `[backup] alert email failed: {error}` and move on. No retry.
- D-06: Env vars: `EMAILJS_SERVICE_ID`, `EMAILJS_ALERT_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`, `ALERT_EMAIL_TO`. All configurable, no hardcoded service/template IDs.
- D-07: Alert email includes full context: error message, timestamp, filename attempted, duration before failure.

**Backup Log Persistence**
- D-08: ALL backup runs (cron + manual) persist to `backup_logs` MongoDB collection.
- D-09: `backupService.runBackup()` stays pure (no Mongoose dependency). Callers persist the result to BackupLog after `runBackup()` returns.
- D-10: No TTL index on backup_logs. Entries kept indefinitely.
- D-11: BackupLog model includes `trigger` field: `'cron'` or `'manual'`.

**Backup Listing**
- D-12: GET `/admin/backups` returns merged data — Spaces objects (key, size, lastModified) enriched with backup_logs data (status, duration, error, trigger). Matched by filename.
- D-13: Failed backups included in listing (from backup_logs, no Spaces object). Shows status='failed' + error.
- D-14: No pagination. Return all entries sorted newest first.

**API Route Design**
- D-15: All backup endpoints under `/admin` prefix: `POST /admin/backup`, `GET /admin/backups`. Consistent with existing `GET /admin/backup-status`.
- D-16: Synchronous response for POST `/admin/backup`. Await `runBackup()` and return result directly.
- D-17: In-memory concurrency lock (`isBackupRunning` boolean). Returns 409 Conflict if backup already in progress.
- D-18: Backup routes extracted to `backend/routes/backup.js`.

### Claude's Discretion
- BackupLog Mongoose schema field types and indexes (beyond the required fields)
- EmailJS REST API request implementation details (https module vs fetch)
- Concurrency lock implementation pattern (module-level variable, class, etc.)
- Merge algorithm for combining Spaces objects with backup_logs entries
- Route file structure and Express Router setup
- Middleware chain details (reuse existing `adminRateLimiter, fetchUser, requireAdmin` pattern)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADM-01 | Admin can trigger a manual backup via authenticated POST endpoint | `backupService.runBackup()` already returns the result object for direct API response; admin middleware chain pattern established |
| REST-03 | Admin can view list of available backups (GET endpoint) | `createBackupS3Client()` is exported from `backupService.js`; `listObjectsV2` already used in `runRetentionCleanup()`; merge algorithm needed for Spaces + BackupLog |
| MON-02 | Failed backups trigger an email alert via EmailJS | EmailJS REST API v1.0 documented (v1.6 per locked decision); Node 22.15 has global `fetch`; no new npm dependency needed |
| MON-03 | Backup run history is persisted in a MongoDB `backup_logs` collection | Mongoose model pattern from `Settings.js`/`Product.js`; mongodb-memory-server test infra supports BackupLog without extra setup |
</phase_requirements>

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| mongoose | ^8.6.1 | BackupLog model and persistence | [VERIFIED: backend/package.json] existing project ORM |
| aws-sdk | ^2.1693.0 | `listObjectsV2` for Spaces backup listing | [VERIFIED: backend/package.json] same SDK used in backupService.js |
| node (global fetch) | 22.15.0 | EmailJS REST API HTTP call | [VERIFIED: node --version] Node 22+ has globalThis.fetch built-in |
| express | ^4.20.0 | Router for backup.js routes file | [VERIFIED: backend/package.json] existing framework |

### Supporting (test infrastructure, already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^4.0.18 | Unit and integration tests | [VERIFIED: backend/package.json] project test runner |
| supertest | ^7.2.2 | HTTP endpoint integration tests | [VERIFIED: backend/package.json] for new route tests |
| mongodb-memory-server | ^11.0.1 | In-memory MongoDB for BackupLog model tests | [VERIFIED: backend/package.json] already used in test setup |
| nock | ^14.0.10 | Mock EmailJS and Spaces HTTP calls in tests | [VERIFIED: backend/package.json] already used for external API mocking |

**No new dependencies required.** [VERIFIED: all tools are in backend/package.json]

**Installation:** None needed — `npm install` already done.

---

## Architecture Patterns

### Recommended File Structure
```
backend/
├── models/
│   └── BackupLog.js          # NEW — Mongoose model (mirror Settings.js pattern)
├── services/
│   └── backupAlertService.js # NEW — EmailJS REST alert sender
├── routes/
│   └── backup.js             # NEW — Express Router with POST /backup, GET /backups
│                             #       exports { router, isBackupRunning } (lock for testing)
├── jobs/
│   └── backupJob.js          # MODIFY — add BackupLog.create() + alert after runBackup()
└── index.js                  # MODIFY — require('./routes/backup'), app.use('/admin', ...)
```

### Pattern 1: BackupLog Mongoose Model
**What:** Schema matching the MON-03 required fields plus `trigger` (D-11). Mirror `Settings.js` pattern exactly — schema, statics if needed, `mongoose.models.X || mongoose.model('X', schema)` guard.

**Required fields (MON-03 + D-11):**
```javascript
// Source: CONTEXT.md MON-03 success criterion + D-11
const BackupLogSchema = new mongoose.Schema({
  timestamp:   { type: Date, required: true, default: Date.now },
  status:      { type: String, required: true, enum: ['success', 'failed'] },
  filename:    { type: String, required: true },
  bytes:       { type: Number, default: null },   // sizeBytes from runBackup result
  duration_ms: { type: Number, default: null },
  error:       { type: String, default: null },
  trigger:     { type: String, required: true, enum: ['cron', 'manual'] }, // D-11
});
```

**Discretionary additions (Claude's discretion):**
- Index on `timestamp: -1` — the listing endpoint sorts newest-first; index prevents collection scan as log grows
- `retention_deleted` field (Number, default 0) — already in runBackup result, cheap to store, useful for Phase 37 dashboard
- `retention_error` field (String, default null) — same rationale

**Export pattern (verified from Settings.js):**
```javascript
// Source: [VERIFIED: backend/models/Settings.js line 23]
module.exports = mongoose.models.BackupLog || mongoose.model('BackupLog', BackupLogSchema);
```

Add to `backend/models/index.js` exports.

### Pattern 2: EmailJS Alert Service
**What:** Thin service that POSTs to EmailJS REST API using `globalThis.fetch`. No new dependency. Fails silently per D-05.

**Implementation approach (Claude's discretion: use globalThis.fetch):**
Node 22.15 has global `fetch`. The `agentLog` helper in `index.js` lines 63-65 already uses `globalThis.fetch` with the same pattern. This is the correct approach.

```javascript
// Source: [VERIFIED: backend/index.js lines 63-65 — existing fetch pattern in codebase]
// Source: [CITED: https://www.emailjs.com/docs/rest-api/send/] for request body shape
async function sendBackupFailureAlert(result) {
  // Guard: skip silently if EmailJS env vars not configured
  if (
    !process.env.EMAILJS_SERVICE_ID ||
    !process.env.EMAILJS_ALERT_TEMPLATE_ID ||
    !process.env.EMAILJS_PUBLIC_KEY
  ) {
    console.warn('[backup] alert email skipped: EMAILJS env vars not configured');
    return;
  }

  try {
    const body = {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_ALERT_TEMPLATE_ID,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      accessToken: process.env.EMAILJS_PRIVATE_KEY,  // private key per D-06
      template_params: {
        to_email: process.env.ALERT_EMAIL_TO,         // D-02
        error_message: result.error,                  // D-07
        timestamp: result.timestamp,                  // D-07
        filename: result.filename,                    // D-07
        duration_ms: result.durationMs,               // D-07
      },
    };

    const resp = await globalThis.fetch(
      'https://api.emailjs.com/api/v1.0/email/send',  // NOTE: see Pitfall 3 re v1.6
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${text}`);
    }
  } catch (err) {
    // D-05: log warning, no retry, move on
    console.warn('[backup] alert email failed:', err.message);
  }
}
```

### Pattern 3: Concurrency Lock (Claude's discretion)
**What:** Module-level boolean in `backup.js`. Single-instance App Platform (D-17). Simple, testable.

```javascript
// Source: [VERIFIED: 35-CONTEXT.md D-17]
let isBackupRunning = false;

// In POST /backup handler:
if (isBackupRunning) {
  return res.status(409).json({ success: false, error: 'Backup already in progress' });
}
isBackupRunning = true;
try {
  const result = await runBackup();
  // persist + alert
  return res.json({ success: true, ...result });
} finally {
  isBackupRunning = false;
}
```

Export `isBackupRunning` getter for testing (or export the whole router module and test via HTTP).

### Pattern 4: Express Router File
**What:** `backend/routes/backup.js` exports an Express Router. Mounted with `app.use('/admin', backupRoutes)` in `index.js`.

```javascript
// Source: [VERIFIED: backend/index.js line 43 + line 1236 — sitemap pattern]
// backend/routes/backup.js
const { Router } = require('express');
const { adminRateLimiter } = require('../middleware/rateLimit'); // or inline from index
const { fetchUser, requireAdmin } = require('../middleware/auth');
const { runBackup, createBackupS3Client } = require('../services/backupService');
const BackupLog = require('../models/BackupLog');
const { sendBackupFailureAlert } = require('../services/backupAlertService');

const router = Router();
let isBackupRunning = false;

// POST /admin/backup  (D-15, D-16, D-17, ADM-01)
router.post('/backup', adminRateLimiter, fetchUser, requireAdmin, async (req, res) => { ... });

// GET /admin/backups  (D-12, D-13, D-14, REST-03)
router.get('/backups', adminRateLimiter, fetchUser, requireAdmin, async (req, res) => { ... });

module.exports = router;
```

**Mount in index.js** (after existing routes, before error handlers):
```javascript
// Source: [VERIFIED: backend/index.js existing pattern]
const backupRoutes = require('./routes/backup');
app.use('/admin', backupRoutes);
```

**Important:** `adminRateLimiter` is defined inside `index.js` and is not currently exported. Two approaches:
1. Pass it explicitly: `app.use('/admin', (req, res, next) => adminRateLimiter(req, res, next), backupRoutes)` — awkward
2. Move `adminRateLimiter` definition to a shared middleware file before Phase 35 — cleaner but scope-creep
3. **Recommended (Claude's discretion):** Recreate rate limiter inside `backup.js` using the same config, or require `express-rate-limit` directly in `backup.js`. Avoids touching shared infra. This is how future Phase 36/37 will work too.

### Pattern 5: Backup Listing Merge Algorithm
**What:** GET `/admin/backups` fetches S3 objects and all BackupLog entries, then merges by filename. Returns entries sorted newest-first.

```javascript
// Source: [VERIFIED: 35-CONTEXT.md D-12, D-13, D-14]
// Merge strategy:
// 1. list all Spaces objects (listObjectsV2) — keyed by basename of Key
// 2. fetch all BackupLog entries — keyed by filename
// 3. union of both key sets, sorted newest-first
// 4. each entry: { filename, lastModified, sizeBytes, status, durationMs, error, trigger }
//    - spacesEntry fields come from S3 object (if exists)
//    - logEntry fields come from BackupLog (if exists)
//    - failed backups: no S3 object, logEntry only (D-13)

const s3 = createBackupS3Client();
const prefix = process.env.BACKUP_SPACES_PREFIX || 'backups/';
const listResp = await s3.listObjectsV2({ Bucket: process.env.BACKUP_BUCKET, Prefix: prefix }).promise();
const spacesObjects = listResp.Contents || [];

const logs = await BackupLog.find({}).sort({ timestamp: -1 }).lean();

// Build lookup from filename -> spaces object
const spacesMap = new Map();
for (const obj of spacesObjects) {
  const filename = obj.Key.replace(prefix, '');
  spacesMap.set(filename, obj);
}

// Build merged list — start from logs (most complete set)
const logMap = new Map();
for (const log of logs) {
  logMap.set(log.filename, log);
}

// Union: all filenames from both sources
const allFilenames = new Set([...spacesMap.keys(), ...logMap.keys()]);
const merged = [];
for (const filename of allFilenames) {
  const spacesObj = spacesMap.get(filename);
  const logEntry = logMap.get(filename);
  merged.push({
    filename,
    lastModified: spacesObj?.LastModified ?? logEntry?.timestamp ?? null,
    sizeBytes: spacesObj?.Size ?? logEntry?.bytes ?? null,
    status: logEntry?.status ?? 'unknown',
    durationMs: logEntry?.duration_ms ?? null,
    error: logEntry?.error ?? null,
    trigger: logEntry?.trigger ?? null,
  });
}

// Sort newest-first
merged.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
return res.json({ success: true, backups: merged });
```

### Pattern 6: Modified backupJob.js (cron caller)
**What:** After `await runBackup()`, persist to BackupLog and call alert service. Both wrapped in try/catch so neither can crash the cron.

```javascript
// Source: [VERIFIED: 35-CONTEXT.md D-08, D-09]
// Inside startBackupJob() cron callback:
async () => {
  const result = await runBackup();

  // Persist to MongoDB (D-08, D-09 — caller persists, not backupService)
  try {
    await BackupLog.create({
      timestamp: new Date(result.timestamp),
      status: result.status,
      filename: result.filename,
      bytes: result.sizeBytes,
      duration_ms: result.durationMs,
      error: result.error,
      trigger: 'cron',  // D-11
    });
  } catch (dbErr) {
    console.warn('[backup] failed to persist BackupLog:', dbErr.message);
  }

  // Send alert on failure (D-04, MON-02)
  if (result.status === 'failed') {
    await sendBackupFailureAlert(result);
  }
}
```

### Anti-Patterns to Avoid
- **Importing mongoose inside backupService.js:** Violates D-09. Service stays pure and testable without MongoDB.
- **Hardcoding EmailJS service/template IDs:** Violates D-06. All configurable via env vars.
- **Crashing the cron on BackupLog write failure:** BackupLog persistence failure must be caught and logged, not propagated — backup already ran successfully.
- **Re-exporting `adminRateLimiter` from index.js:** index.js is 4800+ lines and doesn't export it currently. Don't add exports to index.js for this purpose — recreate in the route file.
- **Using `crossorigin="anonymous"` on any images:** CLAUDE.md constraint — irrelevant to this phase but noted as standing rule.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MongoDB persistence | Custom file-based log writer | Mongoose + BackupLog model | mongodb-memory-server test infra already works with mongoose; full query/sort support |
| HTTP request to EmailJS | xml/https raw socket code | `globalThis.fetch` (built-in Node 22) | Already used in codebase (agentLog pattern); zero dependency; simpler than `https.request` |
| S3 object listing | Manual Spaces HTTP calls | `aws-sdk S3.listObjectsV2` | Already used in `runRetentionCleanup()`; correct S3 auth handled |
| Admin auth check | Custom token validation | `fetchUser, requireAdmin` middleware | Consistent with all 15+ existing admin endpoints |

**Key insight:** Every capability needed in Phase 35 already has an established pattern in the codebase. The work is wiring them together correctly, not inventing new mechanisms.

---

## Common Pitfalls

### Pitfall 1: adminRateLimiter Not Exported from index.js
**What goes wrong:** `backup.js` imports `adminRateLimiter` from `index.js` — but `index.js` only exports `{ app }`. Import fails at runtime.
**Why it happens:** All existing admin routes are defined inline in index.js where `adminRateLimiter` is in scope. Route files are new in Phase 35.
**How to avoid:** Recreate the rate limiter in `backup.js` using `express-rate-limit` (already installed) with the same config parameters: `windowMs: 15 * 60 * 1000`, `limit: Number(process.env.RATE_LIMIT_ADMIN_MAX || 120)`.
**Warning signs:** `TypeError: adminRateLimiter is not a function` at startup.

### Pitfall 2: BackupLog Model Double-Registration
**What goes wrong:** `mongoose.model('BackupLog', schema)` called twice (e.g., in unit test hot-reload). Mongoose throws `OverwriteModelError`.
**Why it happens:** Test environment imports modules multiple times.
**How to avoid:** Always guard with `mongoose.models.BackupLog || mongoose.model('BackupLog', schema)` — exact pattern from Settings.js line 23.
**Warning signs:** `OverwriteModelError: Cannot overwrite BackupLog model once compiled.`

### Pitfall 3: EmailJS API Version Mismatch
**What goes wrong:** POST to `api.emailjs.com/api/v1.6/email/send` returns 404 if v1.6 doesn't exist as a separate endpoint.
**Why it happens:** Official EmailJS docs consistently show v1.0 at [emailjs.com/docs/rest-api/send](https://www.emailjs.com/docs/rest-api/send/). The CONTEXT.md D-01 specifies v1.6. These may diverge.
**How to avoid:** The CONTEXT.md locked decision (v1.6) takes precedence for planning. If testing reveals 404, fall back to v1.0. Log the response status in failure path. The `sendBackupFailureAlert` try/catch already handles this gracefully per D-05.
**Warning signs:** `[backup] alert email failed: HTTP 404` in logs on first real send.

### Pitfall 4: Concurrency Lock Not Reset on runBackup() Throw
**What goes wrong:** If `runBackup()` throws (not returns a failed result but actually throws), the `finally` block doesn't execute if not used. `isBackupRunning` stays `true` permanently — all subsequent manual triggers get 409 forever.
**Why it happens:** Missing `try/finally` around the lock.
**How to avoid:** Always use `try { ... } finally { isBackupRunning = false; }` around the entire runBackup + persist + alert block.
**Warning signs:** Persistent 409 responses to `/admin/backup` after an error.

### Pitfall 5: BackupLog Persistence Failure Blocking API Response
**What goes wrong:** If `BackupLog.create()` throws (e.g., MongoDB connection lost momentarily), the manual trigger endpoint returns 500 even though the backup itself succeeded.
**Why it happens:** Uncaught await rejection.
**How to avoid:** Wrap `BackupLog.create()` in a nested try/catch in the route handler. Return the runBackup result to the caller regardless of DB write outcome. Log the DB failure as a warning.
**Warning signs:** POST /admin/backup returns 500 when MongoDB is degraded.

### Pitfall 6: Spaces Listing Returns Zero Results During Backup Test
**What goes wrong:** Integration test expects backups in the listing but Spaces is not real — S3 calls return empty.
**Why it happens:** Tests use real aws-sdk calls without nock mocks.
**How to avoid:** The unit tests for backupService already show the correct CJS mock pattern (aws-sdk S3 prototype replacement). For integration tests of GET /backups, use nock or the existing `s3.js` mock helpers to stub `listObjectsV2`.
**Warning signs:** GET /admin/backups returns `{ backups: [] }` in all tests even with BackupLog entries seeded.

---

## Code Examples

Verified patterns from existing codebase:

### Existing Admin Route Pattern (from index.js)
```javascript
// Source: [VERIFIED: backend/index.js lines 3426-3449]
app.get(
  '/admin/backup-status',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  (req, res) => {
    // handler
    res.json({ ... });
  }
);
```

### Mongoose Model Export Guard
```javascript
// Source: [VERIFIED: backend/models/Settings.js line 23]
module.exports = mongoose.models.BackupLog || mongoose.model('BackupLog', BackupLogSchema);
```

### globalThis.fetch Pattern (existing in codebase)
```javascript
// Source: [VERIFIED: backend/index.js lines 63-77]
if (typeof globalThis.fetch === 'function') {
  globalThis.fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    .catch(() => {});
  return;
}
// Node < 18 fallback: use https.request (not needed on Node 22.15)
```

### BackupLog.create() Call (caller persistence pattern)
```javascript
// Source: [VERIFIED: 35-CONTEXT.md D-09 — runBackup() result fields from backupService.js lines 142-151]
await BackupLog.create({
  timestamp: new Date(result.timestamp),  // result.timestamp is ISO string
  status: result.status,                  // 'success' | 'failed'
  filename: result.filename,
  bytes: result.sizeBytes,               // may be null on failure
  duration_ms: result.durationMs,        // always set (finally block in runBackup)
  error: result.error,                   // null on success
  trigger: 'cron',                       // or 'manual'
});
```

### Integration Test Pattern (from backupStatus.test.js)
```javascript
// Source: [VERIFIED: backend/tests/integration/backupStatus.test.js lines 25-58]
import request from 'supertest';
import { createAdmin } from '../helpers/factories.js';
import { createAuthToken, TEST_JWT_KEY } from '../helpers/authHelpers.js';
import { disableNetConnect, cleanAllMocks } from '../helpers/mocks/index.js';

process.env.JWT_KEY = TEST_JWT_KEY;

describe('POST /admin/backup', () => {
  let app;
  beforeAll(async () => {
    disableNetConnect();
    const appModule = await import('../../index.js');
    app = appModule.app;
  });
  // tests...
  it('returns 409 when backup already in progress', async () => {
    const resp = await request(app)
      .post('/admin/backup')
      .set('auth-token', adminToken);
    expect(resp.status).toBe(409);
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `https.request` for outbound HTTP | `globalThis.fetch` | Node 18+ (project uses Node 22) | Simpler syntax, no callback pyramid, already used in codebase |
| Inline routes in index.js | Extracted Router files | Phase 35 introduces first route file | Backup routes in `routes/backup.js`; same pattern for Phase 36+37 |
| cron job logs only | BackupLog MongoDB + console.log | Phase 35 | Console log retained (D-06 from Phase 34); MongoDB adds queryable history |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | EmailJS REST endpoint is `v1.6` as stated in D-01 | Architecture Patterns: Pattern 2 | Official docs show v1.0; if v1.6 returns 404, alert silently fails (D-05 handles gracefully) |
| A2 | `adminRateLimiter` is NOT exported from index.js (only `{ app }` is exported) | Common Pitfalls: Pitfall 1 | If index.js is modified to export it before Phase 35, recreating it would be redundant but harmless |

**Both risks are low-impact.** A1 fails silently per D-05. A2 results in duplicate (compatible) rate limiter instance.

---

## Open Questions

1. **EmailJS API version: v1.6 vs v1.0**
   - What we know: Official docs consistently show `https://api.emailjs.com/api/v1.0/email/send` [CITED: emailjs.com/docs/rest-api/send]. CONTEXT.md D-01 specifies v1.6.
   - What's unclear: Whether v1.6 is a newer endpoint not documented on the public /send page, or a transcription error from the discussion.
   - Recommendation: Implement with v1.0 (documented) OR implement exactly as D-01 states (v1.6). Since D-01 is a locked decision, use v1.6. The D-05 silent failure handling means this is safe — if the endpoint doesn't exist, alert fails gracefully and logs a warning. User can update the env var or code post-deploy.

2. **AdminRateLimiter sharing between index.js and backup.js**
   - What we know: `adminRateLimiter` is defined at line 280 in index.js; index.js exports only `{ app }`.
   - What's unclear: Should Phase 35 extract rate limiters to a shared module (future-proofing for Phase 36/37)?
   - Recommendation: Recreate in backup.js now. Document intent to extract to `middleware/rateLimiters.js` as a future Phase 36/37 task. Avoids scope creep here.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | fetch for EmailJS calls | Yes | 22.15.0 | — |
| MongoDB (mongoose) | BackupLog persistence | Yes | mongoose ^8.6.1 | — |
| aws-sdk | S3 listing for GET /backups | Yes | ^2.1693.0 | — |
| express-rate-limit | Rate limiter in backup.js | Yes | ^7.5.1 | — |
| EmailJS account + template | MON-02 | Manual (user action) | — | Alerts silently skipped if env vars absent |

**Missing dependencies with no fallback:** None — all npm packages installed.

**User action required (outside code):** Create a new EmailJS template in the EmailJS dashboard for backup alerts before `EMAILJS_ALERT_TEMPLATE_ID` can be set. The code correctly guards against missing env vars (see Pattern 2 guard block).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | `backend/vitest.config.js` |
| Quick run command | `npm test -- --reporter=verbose --testNamePattern "BackupLog\|POST /admin/backup\|GET /admin/backups\|backupAlert"` |
| Full suite command | `npm test` (from `backend/`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADM-01 | POST /admin/backup returns 200 with result object | integration | `npm test -- --reporter=verbose --testNamePattern "POST /admin/backup"` | Wave 0 |
| ADM-01 | POST /admin/backup returns 401 for unauthenticated | integration | same | Wave 0 |
| ADM-01 | POST /admin/backup returns 403 for non-admin | integration | same | Wave 0 |
| ADM-01 | POST /admin/backup returns 409 when backup in progress | integration | same | Wave 0 |
| REST-03 | GET /admin/backups returns merged listing sorted newest-first | integration | `npm test -- --reporter=verbose --testNamePattern "GET /admin/backups"` | Wave 0 |
| REST-03 | GET /admin/backups includes failed backups (log-only entries) | integration | same | Wave 0 |
| MON-02 | sendBackupFailureAlert POSTs to EmailJS with correct body | unit | `npm test -- --reporter=verbose --testNamePattern "backupAlertService"` | Wave 0 |
| MON-02 | sendBackupFailureAlert skips silently when env vars absent | unit | same | Wave 0 |
| MON-02 | sendBackupFailureAlert logs warning on HTTP failure (D-05) | unit | same | Wave 0 |
| MON-03 | BackupLog.create() called after cron runBackup() | unit | `npm test -- --reporter=verbose --testNamePattern "backupJob"` | Wave 0 (update existing test) |
| MON-03 | BackupLog model schema has all required fields | unit | `npm test -- --reporter=verbose --testNamePattern "BackupLog"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --reporter=verbose --testNamePattern "BackupLog|backup"` (fast subset)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/unit/models/backupLog.test.js` — covers MON-03 schema validation
- [ ] `backend/tests/unit/services/backupAlertService.test.js` — covers MON-02 alert sending
- [ ] `backend/tests/integration/backup.trigger.test.js` — covers ADM-01 (POST /admin/backup)
- [ ] `backend/tests/integration/backup.listing.test.js` — covers REST-03 (GET /admin/backups)
- Existing `backend/tests/unit/jobs/backupJob.test.js` — UPDATE to add BackupLog persistence assertion
- No framework changes needed — Vitest + mongodb-memory-server already configured in setup.js

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `fetchUser` middleware — JWT validation already in use |
| V4 Access Control | yes | `requireAdmin` middleware — role check already in use |
| V5 Input Validation | low | POST /admin/backup takes no body; GET /admin/backups takes no params — no user input to validate |
| V6 Cryptography | no | No new crypto operations; EmailJS private key passed as env var |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated backup trigger | Elevation of Privilege | `fetchUser + requireAdmin` middleware on all endpoints |
| Concurrent backup requests (DoS-adjacent) | Denial of Service | `isBackupRunning` concurrency lock returns 409 |
| EmailJS private key exposure in logs | Information Disclosure | Private key passed as request body field (not URL param); never log the full request body |
| MongoDB URI in BackupLog error field | Information Disclosure | `backupService.runBackup()` already redacts `mongodb+srv://user:pass@...` in error strings before returning — BackupLog inherits this |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: backend/services/backupService.js] — runBackup() return shape, createBackupS3Client() export, runRetentionCleanup() listObjectsV2 usage
- [VERIFIED: backend/jobs/backupJob.js] — existing cron caller pattern to extend
- [VERIFIED: backend/models/Settings.js] — Mongoose model export guard pattern
- [VERIFIED: backend/middleware/auth.js] — fetchUser, requireAdmin signatures
- [VERIFIED: backend/index.js lines 280-289] — adminRateLimiter configuration
- [VERIFIED: backend/index.js lines 3426-3449] — admin endpoint pattern
- [VERIFIED: backend/index.js line 4817] — `module.exports = { app }` (only export)
- [VERIFIED: backend/package.json] — all dependency versions, test scripts
- [VERIFIED: backend/vitest.config.js] — test framework configuration
- [VERIFIED: backend/tests/setup.js] — mongodb-memory-server setup for BackupLog
- [VERIFIED: backend/tests/integration/backupStatus.test.js] — integration test pattern
- [VERIFIED: backend/tests/unit/services/backupService.test.js] — CJS mock pattern for aws-sdk
- [VERIFIED: node --version] — Node 22.15.0 confirming global fetch availability
- [VERIFIED: 35-CONTEXT.md] — all locked decisions

### Secondary (MEDIUM confidence)
- [CITED: https://www.emailjs.com/docs/rest-api/send/] — EmailJS REST API endpoint (`v1.0`), request body fields (`service_id`, `template_id`, `user_id`, `accessToken`, `template_params`), success 200 / failure 400

### Tertiary (LOW confidence — see Assumptions Log)
- EmailJS v1.6 endpoint — mentioned in CONTEXT.md D-01 but only v1.0 found in official docs [ASSUMED per discussion log]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json
- Architecture: HIGH — all patterns verified from live codebase
- EmailJS endpoint version: LOW — official docs show v1.0; D-01 states v1.6
- Pitfalls: HIGH — sourced from codebase reading (index.js exports, Settings.js pattern, backupService.js finally-block pattern)

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable Node.js/Express/Mongoose ecosystem)
