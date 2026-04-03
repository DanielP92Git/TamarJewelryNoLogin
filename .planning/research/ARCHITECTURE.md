# Architecture Research: MongoDB Backup & Recovery System (v1.6)

**Domain:** Automated database backup/restore for an existing Express/MongoDB/DigitalOcean app
**Researched:** 2026-04-04
**Confidence:** HIGH (integration points derived directly from existing codebase + official docs)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Existing Express Backend (index.js)                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Admin API Route │  │  Backup Job      │  │  Other Routes    │  │
│  │  POST /backup    │  │  (node-cron)     │  │  (existing)      │  │
│  │  GET  /backups   │  │  daily 3:00 AM   │  │                  │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────────────┘  │
│           │                     │                                    │
│           └──────────┬──────────┘                                    │
│                      ↓                                               │
│           ┌──────────────────────┐                                  │
│           │  backupService.js    │  (NEW - backend/services/)        │
│           │  - runBackup()       │                                   │
│           │  - runRestore()      │                                   │
│           │  - listBackups()     │                                   │
│           │  - applyRetention()  │                                   │
│           └──────────┬───────────┘                                  │
│                      │                                               │
│           ┌──────────┴───────────┐                                  │
│           │  child_process.exec  │  (spawns mongodump/mongorestore)  │
│           └──────────┬───────────┘                                  │
├───────────────────────┼─────────────────────────────────────────────┤
│                       ↓                                              │
│           ┌──────────────────────┐   ┌────────────────────────┐    │
│           │  Temp local file     │   │  Backup cron job        │   │
│           │  backup-YYYY-MM-DD   │   │  backupJob.js (NEW)     │   │
│           │  -HHMM.gz            │   │  backend/jobs/          │   │
│           └──────────┬───────────┘   └────────────────────────┘    │
│                      ↓                                               │
│           ┌──────────────────────┐                                  │
│           │  DigitalOcean Spaces │  (existing aws-sdk S3 client)    │
│           │  backups/ prefix     │                                  │
│           │  (off-region bucket) │                                  │
│           └──────────────────────┘                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | New or Modified |
|-----------|---------------|-----------------|
| `backend/services/backupService.js` | Core logic: spawn mongodump/mongorestore, upload to Spaces, list backups, retention enforcement | NEW |
| `backend/jobs/backupJob.js` | node-cron schedule wiring, mirrors pattern of `exchangeRateJob.js` | NEW |
| Admin API routes in `index.js` | `POST /backup` (manual trigger), `GET /backups` (list), `POST /restore/:key` (restore) protected by `requireAdmin` | MODIFIED (add routes) |
| `backend/env.example` | Document `BACKUP_BUCKET`, `BACKUP_RETENTION_COUNT` env vars | MODIFIED |
| `Aptfile` (repo root) | Declare `mongodb-database-tools` for App Platform buildpack | NEW |

---

## Recommended Project Structure

```
backend/
├── jobs/
│   ├── exchangeRateJob.js     (existing — model to follow)
│   └── backupJob.js           (NEW — daily cron trigger)
│
├── services/
│   ├── exchangeRateService.js (existing — model to follow)
│   ├── translationService.js  (existing)
│   └── backupService.js       (NEW — all backup/restore/retention logic)
│
└── index.js                   (MODIFIED — import backupJob, add admin routes)

Aptfile                        (NEW — repo root, for App Platform mongodump install)
```

### Structure Rationale

- **`jobs/backupJob.js`:** Mirrors the existing `exchangeRateJob.js` exactly. Uses `node-cron`, exports `startBackupJob()` and `runBackupNow()`. Registered in `index.js` alongside the exchange rate job at server startup.
- **`services/backupService.js`:** Keeps all I/O-heavy logic (spawn, S3 upload, S3 list, S3 delete) isolated from the route layer and job layer. Testable in isolation.
- **Admin routes in `index.js`:** Consistent with the existing monolithic pattern — no new route file needed. Protected with the existing `requireAdmin` middleware.
- **`Aptfile` at repo root:** Required by the DigitalOcean App Platform Aptfile buildpack to install `mongodb-database-tools` at build time. Without this, `mongodump` binary is not present on App Platform containers.

---

## Architectural Patterns

### Pattern 1: Service Layer for Backup Logic

**What:** All backup/restore logic lives in `backupService.js`. The job and the admin route both call service functions — neither contains business logic directly.

**When to use:** Already established by `exchangeRateService.js` + `exchangeRateJob.js`. Consistent across this codebase.

**Trade-offs:** Slightly more files, but isolates testable logic cleanly and avoids duplication between the cron trigger path and the manual trigger path.

**Example:**
```javascript
// backend/services/backupService.js
const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const execAsync = util.promisify(exec);

const BACKUP_DIR = path.join(__dirname, '../tmp-backups');

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const filename = `backup-${timestamp}.gz`;
  const localPath = path.join(BACKUP_DIR, filename);
  const spacesKey = `backups/${filename}`;

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  await execAsync(
    `mongodump --uri="${process.env.MONGO_URL}" --archive="${localPath}" --gzip`
  );

  await uploadBackupToSpaces(spacesKey, localPath);
  fs.unlinkSync(localPath); // delete temp file after upload

  await applyRetention();
  return { filename, spacesKey };
}
```

### Pattern 2: Reuse Existing S3 Client (by Recreation, Not Import)

**What:** The `s3` client and `SPACES_BUCKET` are already configured in `index.js`. Because `backupService.js` is a separate module, it cannot import the `const s3` variable from `index.js`. The correct approach is to create a new S3 instance inside `backupService.js` using the same env vars.

**When to use:** Required — the monolithic pattern in `index.js` does not export the s3 client. Every service that needs S3 access instantiates its own client.

**Trade-offs:** Slight duplication of S3 instantiation code. The alternative (extract to `config/spaces.js`) is cleaner long-term but adds out-of-scope refactoring.

**Example:**
```javascript
// backend/services/backupService.js (S3 setup)
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  endpoint: new AWS.Endpoint(process.env.SPACES_ENDPOINT),
  accessKeyId: process.env.SPACES_KEY,
  secretAccessKey: process.env.SPACES_SECRET,
  region: process.env.SPACES_REGION,
});
// Use BACKUP_BUCKET if set (off-region), otherwise fall back to image bucket
const BUCKET = process.env.BACKUP_BUCKET || process.env.SPACES_BUCKET;
const BACKUP_PREFIX = 'backups/';
```

### Pattern 3: Count-Based Retention via S3 List + Delete

**What:** After each backup upload, list all objects under the `backups/` prefix, sort by `LastModified` descending, and delete any beyond the retention count (e.g., 14).

**When to use:** S3 lifecycle rules enforce time-based (days old) retention, not count-based (last N). The PRD specifies "keep last 7–14 backups" which is count-based, so programmatic deletion via `listObjectsV2` + `deleteObjects` is required.

**Trade-offs:** Runs on every backup operation. Negligible at 7–14 objects.

**Example:**
```javascript
async function applyRetention(maxCount = parseInt(process.env.BACKUP_RETENTION_COUNT || '14')) {
  const { Contents = [] } = await s3.listObjectsV2({
    Bucket: BUCKET,
    Prefix: BACKUP_PREFIX,
  }).promise();

  const sorted = Contents
    .filter(obj => obj.Key.endsWith('.gz'))
    .sort((a, b) => b.LastModified - a.LastModified);

  const toDelete = sorted.slice(maxCount);
  if (toDelete.length === 0) return;

  await s3.deleteObjects({
    Bucket: BUCKET,
    Delete: { Objects: toDelete.map(obj => ({ Key: obj.Key })) },
  }).promise();
}
```

### Pattern 4: node-cron Job Registration (Mirrors exchangeRateJob.js)

**What:** `backupJob.js` mirrors `exchangeRateJob.js` exactly in structure. Exports `startBackupJob()` and `runBackupNow()`. Imported in `index.js` and called inside the `connectDb().then()` block.

**When to use:** Already the established pattern on line 812 of `index.js` for `startExchangeRateJob()`.

**Example:**
```javascript
// backend/jobs/backupJob.js
const cron = require('node-cron');
const { runBackup } = require('../services/backupService');

function startBackupJob() {
  // Daily at 3:00 AM — offset 1 hour from exchange rate job (2:00 AM)
  cron.schedule('00 03 * * *', async () => {
    try {
      const result = await runBackup();
      console.log(`Backup complete: ${result.filename}`);
    } catch (err) {
      console.error('Backup job failed:', err.message);
    }
  }, { timezone: 'Asia/Jerusalem' });
}

async function runBackupNow() {
  return runBackup();
}

module.exports = { startBackupJob, runBackupNow };
```

### Pattern 5: Admin API Routes for Manual Operations

**What:** Three new admin-only routes added to `index.js`:
- `POST /backup` — trigger backup now, awaits completion, returns result
- `GET /backups` — list available backups from Spaces
- `POST /restore/:key` — restore from a named backup key (dangerous — requires admin auth)

**When to use:** Follows the existing monolithic route pattern. All three protected with `authUser` + `requireAdmin` middleware, already available in `index.js`.

**Example:**
```javascript
// In index.js — admin backup routes
app.post('/backup', authUser, requireAdmin, async (req, res) => {
  try {
    const result = await runBackupNow();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Backup failed', message: err.message });
  }
});

app.get('/backups', authUser, requireAdmin, async (req, res) => {
  try {
    const list = await listBackups();
    res.json({ backups: list });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

app.post('/restore/:key', authUser, requireAdmin, async (req, res) => {
  try {
    await runRestore(req.params.key);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Restore failed', message: err.message });
  }
});
```

---

## Data Flow

### Backup Flow

```
[node-cron trigger at 3:00 AM]  OR  [POST /backup admin request]
    ↓
backupService.runBackup()
    ↓
child_process.exec("mongodump --uri=... --archive=./tmp-backups/backup-YYYY-MM-DD-HHMM.gz --gzip")
    ↓ (on success — file written to local tmp)
uploadToSpaces("backups/backup-YYYY-MM-DD-HHMM.gz", localPath)
    ↓
fs.unlinkSync(localPath)   <- delete temp file (ephemeral filesystem)
    ↓
applyRetention()           <- list backups/, delete objects beyond maxCount
    ↓
return { filename, spacesKey, timestamp }
```

### Restore Flow

```
[POST /restore/:key]  <- admin selects backup from list
    ↓
backupService.runRestore(spacesKey)
    ↓
downloadFromSpaces(spacesKey) -> ./tmp-backups/restore-temp.gz
    ↓
child_process.exec("mongorestore --uri=... --archive=./tmp-backups/restore-temp.gz --gzip --drop")
    ↓   (--drop clears existing collections before restoring)
fs.unlinkSync("./tmp-backups/restore-temp.gz")
    ↓
return { success: true }
```

### Key Data Flows

1. **Cron and admin route share one code path:** Both call `backupService.runBackup()`. No logic duplication.
2. **Temp files are transient:** Written to `./tmp-backups/`, uploaded to Spaces, deleted immediately. App Platform ephemeral filesystem is not a concern.
3. **Retention runs inline:** Retention check happens at end of every backup run — no separate job needed.

---

## Integration Points

### New Components

| Component | Location | Integrates With |
|-----------|----------|----------------|
| `backupService.js` | `backend/services/` | `aws-sdk` (existing dep), `child_process` (Node built-in), `fs` (Node built-in) |
| `backupJob.js` | `backend/jobs/` | `node-cron` (existing dep), `backupService.js` |
| Admin backup routes | `backend/index.js` | `requireAdmin` middleware (existing), `backupService.js` |
| `Aptfile` | repo root | DigitalOcean App Platform Aptfile buildpack |

### Modified Components

| Component | Change | Why |
|-----------|--------|-----|
| `backend/index.js` | Import `{ startBackupJob, runBackupNow, listBackups, runRestore }` from `backupJob` / `backupService`. Call `startBackupJob()` in `connectDb().then()` block. Add 3 admin routes. | Same wiring pattern as exchange rate job on lines 28-30 and 812 |
| `backend/env.example` | Add `BACKUP_BUCKET=` and `BACKUP_RETENTION_COUNT=14` with comments | Document new env vars for deployment |

### External Service Boundaries

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| MongoDB (via `MONGO_URL`) | `mongodump --uri="${MONGO_URL}"` | `mongodump` reads directly from the connection URI. Bypasses Mongoose — raw BSON dump. Works with Atlas URIs. |
| DigitalOcean Spaces | `aws-sdk` S3 `upload`, `listObjectsV2`, `getObject`, `deleteObjects` | Same SDK already used for image uploads (`aws-sdk` in `package.json`). Use separate `BACKUP_BUCKET` env var for off-region bucket. |
| `mongodump` / `mongorestore` binaries | `child_process.exec` | Must be present on App Platform via `Aptfile`. Must handle `ENOENT` error gracefully with clear log message. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `backupJob` → `backupService` | Direct function call | Same as `exchangeRateJob` → `exchangeRateService` |
| Admin route → `backupService` | Direct function call | Route contains only request parsing and response sending |
| `backupService` → S3 | New `AWS.S3` instance using same env vars as `index.js` | Cannot import `index.js`-scoped `s3`; create separate instance in service module |

---

## DigitalOcean App Platform: Critical Constraint

App Platform containers do not include `mongodump` or `mongorestore` by default. The binaries come from the `mongodb-database-tools` package and must be installed at build time.

**Mechanism:** Create an `Aptfile` (no extension) in the repo root:

```
mongodb-database-tools
```

The App Platform Aptfile buildpack installs packages listed here during the build phase. This is the same mechanism as `heroku-buildpack-apt`.

**Confidence:** MEDIUM. The Aptfile mechanism is documented and works for standard packages. However, DigitalOcean's own docs note that packages installing files outside `/lib` or `/bin` may not be accessible at runtime. Verify that `mongodump` is accessible in PATH after Aptfile installation by checking App Platform build/run logs in the first deployment.

**Fallback if Aptfile PATH fails:**
1. Switch to a Dockerfile-based deployment (full PATH control, add `mongodb-database-tools` via apt-get in Dockerfile)
2. Alternative: use `mongo-dump-stream` npm package (pure Node.js, no binary required) — less proven than mongodump for production backups

**Recommendation:** Test Aptfile in Phase 1 of implementation. Fail fast and pivot to Dockerfile if needed.

---

## Anti-Patterns

### Anti-Pattern 1: Inline Backup Logic in index.js

**What people do:** Put `exec('mongodump ...')` directly in a route handler inside `index.js`.

**Why it's wrong:** The same logic cannot be reused by both the cron job and the manual trigger. The established pattern in this codebase is service layer for business logic.

**Do this instead:** All backup logic in `backupService.js`. Routes and jobs call service functions.

### Anti-Pattern 2: Keeping Backup Files on App Platform Disk

**What people do:** Write backup files to the local filesystem and leave them there.

**Why it's wrong:** App Platform containers have ephemeral filesystems. Files are lost on redeploy or container restart.

**Do this instead:** Write to a `tmp-backups/` directory, upload to Spaces, call `fs.unlinkSync` immediately after successful upload.

### Anti-Pattern 3: Blocking the Event Loop with execSync

**What people do:** Use synchronous `child_process.execSync()` for mongodump.

**Why it's wrong:** Blocks the Node.js event loop for the entire backup duration. All incoming HTTP requests stall. For a database the size of this catalog, backup may take several seconds.

**Do this instead:** `util.promisify(exec)` — non-blocking, returns a Promise, `await`-able.

### Anti-Pattern 4: Restoring Without --drop

**What people do:** Run `mongorestore` without `--drop` on an existing populated database.

**Why it's wrong:** `mongorestore` by default merges with existing data. Documents with existing `_id` values are skipped (not overwritten). Result is a partial/mixed state — not a clean restore.

**Do this instead:** Always use `mongorestore --drop`. The `--drop` flag drops each collection before restoring from the backup. Document this clearly in the admin UI.

### Anti-Pattern 5: Sharing the Image Bucket for Backups

**What people do:** Upload backup archives to the same `SPACES_BUCKET` used for product images.

**Why it's wrong:** If the primary DigitalOcean region fails, both images and backups are inaccessible. This defeats the off-region goal. The retention logic also risks interfering with image objects.

**Do this instead:** Use a separate `BACKUP_BUCKET` env var pointing to a bucket in a different DO region. Default to `SPACES_BUCKET` only as a development fallback.

---

## Scaling Considerations

| Scale | Architecture Adjustment |
|-------|------------------------|
| Current (~1 GB DB, ~94 products) | Single gzipped archive per day, 14-backup retention. Backup completes in under 60 seconds. Spaces cost negligible (<$0.05/month). |
| 10 GB DB | Backup completes in 5–10 minutes. Still fine for daily cron with async exec. Consider streaming upload instead of write-then-upload. |
| 100 GB+ DB | Incremental backup or MongoDB Atlas built-in backup — outside this milestone scope. |

**First bottleneck:** `exec` buffer overflow if mongodump stdout/stderr exceeds Node's default buffer limit. Use `{ maxBuffer: 10 * 1024 * 1024 }` option in `exec` call (10 MB buffer, sufficient for logging output from large dumps).

---

## Sources

- DigitalOcean Aptfile Buildpack: [https://docs.digitalocean.com/products/app-platform/reference/buildpacks/aptfile/](https://docs.digitalocean.com/products/app-platform/reference/buildpacks/aptfile/)
- DigitalOcean MongoDB Backup to Spaces Tutorial: [https://www.digitalocean.com/community/tutorials/how-to-set-up-scheduled-logical-mongodb-backups-to-digitalocean-spaces](https://www.digitalocean.com/community/tutorials/how-to-set-up-scheduled-logical-mongodb-backups-to-digitalocean-spaces)
- mongodump Official Docs: [https://www.mongodb.com/docs/database-tools/mongodump/](https://www.mongodb.com/docs/database-tools/mongodump/)
- Node.js nightly backup pattern: [https://dev.to/yasseryka/how-to-backup-mongodb-every-night-in-nodejs-257o](https://dev.to/yasseryka/how-to-backup-mongodb-every-night-in-nodejs-257o)
- MongoDB + S3 backup automation (Medium): [https://nimamovic9.medium.com/automate-mongodb-backup-and-restore-using-aws-s3-github-actions-and-node-js-e4b608b52ba](https://nimamovic9.medium.com/automate-mongodb-backup-and-restore-using-aws-s3-github-actions-and-node-js-e4b608b52ba)
- GitHub: mongodb-backup-digitalocean-spaces: [https://github.com/reddimohan/mongodb-backup-digitalocean-spaces](https://github.com/reddimohan/mongodb-backup-digitalocean-spaces)
- Existing codebase reference: `backend/jobs/exchangeRateJob.js`, `backend/services/exchangeRateService.js`, `backend/index.js` (S3 client lines 131–160, job startup lines 812–816)

---

*Architecture research for: MongoDB Backup & Recovery System (v1.6)*
*Researched: 2026-04-04*
