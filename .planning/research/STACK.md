# Stack Research

**Domain:** MongoDB Backup & Recovery System (v1.6 milestone)
**Researched:** 2026-04-04
**Confidence:** HIGH

## Context: What Already Exists (Do Not Re-Add)

This is an additive milestone. The following are already installed and in active use. The backup system is built on top of them — no new packages required.

| Already Present | Installed Version | Active Use |
|-----------------|-------------------|------------|
| `node-cron` | `^3.0.3` | Exchange rate job (`backend/jobs/exchangeRateJob.js`) |
| `aws-sdk` | `^2.1693.0` | DigitalOcean Spaces uploads via `s3.upload()` (`backend/index.js`) |
| `mongoose` | `^8.6.1` | MongoDB ODM — backup uses existing DB connection indirectly |
| `child_process` | Node.js built-in | Available in all Node.js — no install needed |
| `fs` | Node.js built-in | Temp file I/O — no install needed |

**Zero new npm packages are needed.** All backup capability comes from already-installed dependencies and Node.js built-ins.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `child_process.spawn` (Node built-in) | Node.js LTS | Execute `mongodump` and `mongorestore` subprocesses | `spawn` streams stdout/stderr without buffering — avoids the 200 KB memory ceiling of `exec`; exit code cleanly signals success/failure; same pattern as OS-level backup tools everywhere |
| `mongodump` / `mongorestore` (system binary) | 100.15.0 (MongoDB Database Tools) | Create BSON archive backups and restore them | Official MongoDB tooling; `--archive --gzip` flags produce a single compressed file; BSON preserves all MongoDB types precisely (ObjectId, Date, etc.) unlike JSON export; `mongorestore --drop` handles duplicate `_id` on restore |
| `aws-sdk` v2 `s3.upload()` (already installed) | `^2.1693.0` (existing) | Upload backup archive to DigitalOcean Spaces | Already configured in `backend/index.js` with `SPACES_ENDPOINT`, `SPACES_KEY`, `SPACES_SECRET`; `s3.upload()` auto-handles multipart for large files and accepts a Readable stream as `Body` — identical usage to existing image uploads |
| `node-cron` (already installed) | `^3.0.3` (existing) | Schedule daily backup job | Already running for exchange rate job; same `cron.schedule()` API applies; daily at 2 AM UTC after exchange rate job (3 AM) fits sub-2-hour RTO requirement |
| `fs.createReadStream` / `fs.unlink` (Node built-in) | Node.js LTS | Read temp backup file for upload; clean up after | Writes archive to `/tmp/backup-{timestamp}.gz`, reads it as stream for S3 upload, deletes after upload completes — standard pattern for ephemeral App Platform filesystem |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `s3.listObjects` / `s3.deleteObject` (aws-sdk v2, existing) | `^2.1693.0` | List backups and delete old ones for retention policy | Run after each successful backup upload; list all objects under `BACKUP_SPACES_PREFIX`, sort by `LastModified`, delete keys older than `BACKUP_RETENTION_DAYS` — no separate library needed |
| `s3.getObject` (aws-sdk v2, existing) | `^2.1693.0` | Download backup from Spaces for restore | Returns a readable stream that pipes to `mongorestore` stdin |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `mongodump` local binary | Test backup execution locally | macOS: `brew install mongodb-database-tools`; Ubuntu/CI: `apt-get install mongodb-database-tools` |
| `mongorestore` local binary | Test restore locally | Bundled with MongoDB Database Tools alongside mongodump |
| Vitest (already installed `^4.0.18`) | Unit tests for backup service | Mock `child_process.spawn` and `s3.upload`; test success/failure paths and retention logic without real DB/S3 |

---

## Installation

**No new npm packages.** Zero changes to `backend/package.json`.

```bash
# Nothing to npm install
```

### System Binary: DigitalOcean App Platform

The `mongodump` / `mongorestore` binaries must be available at runtime on App Platform. The mechanism is an **Aptfile** at the repo root (alongside `backend/`):

**Create `backend/Aptfile`** (one line, no file extension):
```
mongodb-database-tools
```

The heroku-buildpack-apt installs this during the build phase. However, the installed binaries land in `/layers/digitalocean_apt/apt/usr/bin/` (not standard `/usr/bin`), so the PATH must be extended. Add this to your App Platform environment variables:

```
PATH=/layers/digitalocean_apt/apt/usr/bin:$PATH
```

Or prefix spawn calls explicitly:
```javascript
const MONGODUMP_BIN = process.env.MONGODUMP_PATH || 'mongodump';
spawn(MONGODUMP_BIN, [...args]);
```

### New Environment Variables

Add these to `backend/.env` and DigitalOcean App Platform config (no new credentials — reuses existing `SPACES_*`):

```
BACKUP_RETENTION_DAYS=14        # Days to keep backups before deletion (default: 14)
BACKUP_SPACES_PREFIX=backups/   # S3 key prefix for backup objects (default: backups/)
MONGODUMP_PATH=                 # Override binary path if not on PATH (optional)
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `child_process.spawn` + `mongodump` binary | Pure Node.js via Mongoose cursor → JSON files | Use if the `mongodump` binary absolutely cannot be installed (very locked-down PaaS). JSON-based backup loses BSON type fidelity (ObjectId becomes string, Date becomes ISO string) and complicates restore. Not recommended for production e-commerce data. |
| Existing `aws-sdk` v2 `s3.upload()` | `@aws-sdk/client-s3` v3 + `@aws-sdk/lib-storage` | Use v3 only when the project migrates off v2 entirely. Introducing v3 alongside v2 creates two S3 SDK installations (~2 MB extra), potential config conflicts, and DigitalOcean Spaces v3 compatibility quirks documented in GitHub issues. v2 already works in this project. |
| `node-cron` in-process (existing) | App Platform Native Scheduled Jobs | App Platform Jobs support cron (minimum 15-minute interval) and are billed only while running. Prefer them only if the backup job needs to run independently from the web service or if billing separation matters. For this project's scale, in-process node-cron is simpler and already proven. |
| Write to `/tmp` then upload | Stream `mongodump` stdout directly to `s3.upload()` (no temp file) | Use direct streaming only if App Platform's `/tmp` limit (ephemeral, ~4 GB max per instance) proves insufficient. Direct streaming is more elegant but harder to debug: if the stream errors mid-upload, partial multipart uploads can be left on Spaces. Temp-file approach makes each step independently verifiable. |
| `mongodump --archive --gzip` (single file) | `mongodump` directory output (multiple BSON files) | Use directory output only for per-collection granular restore capability. Archive mode is strictly better for automated cloud backup: one atomic object per backup, one S3 key to delete for retention, one integrity check. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `mongodb-backup` npm package | Last published 9 years ago (v1.6.9); effectively abandoned; no BSON archive mode | `child_process.spawn` + `mongodump` directly |
| `mongodb-backup-toolkit` npm package | New/unproven package; JSON-only output (not BSON-compatible with `mongorestore`); tiny ecosystem | `child_process.spawn` + `mongodump` |
| `mongo-dump-stream` npm package | Streams BSON but cannot produce the `--archive` format compatible with `mongorestore --archive`; unmaintained | `mongodump --archive` via system binary |
| `child_process.exec` instead of `spawn` | `exec` buffers all subprocess output in memory — a `mongodump` archive of hundreds of MB will overflow Node's process with `RangeError: stdout maxBuffer exceeded` | `child_process.spawn` with event listeners |
| `@aws-sdk/client-s3` v3 (new addition) | Would add a second S3 SDK alongside existing aws-sdk v2; DigitalOcean Spaces has known quirks with aws-sdk v3 multipart uploads; no functional benefit for this milestone | Keep existing `aws-sdk` v2 for all S3 operations |
| Relying solely on DigitalOcean Managed MongoDB built-in backups | DO Managed MongoDB provides automatic 7-day daily backups, but: (1) restores only to a new cluster, cannot restore to existing; (2) no programmatic trigger; (3) no off-region copy by default. Does not meet the milestone's RTO < 2 hours + off-region + manual trigger requirements. | Custom backup service per this milestone |

---

## Stack Patterns by Variant

**For backup creation (temp file approach — recommended):**
- `spawn('mongodump', ['--uri', MONGO_URL, '--archive=/tmp/backup-{ts}.gz', '--gzip'])`
- Wait for exit code 0
- `s3.upload({ Bucket, Key: 'backups/backup-{ts}.gz', Body: fs.createReadStream('/tmp/backup-{ts}.gz') }).promise()`
- `fs.unlink('/tmp/backup-{ts}.gz')` after successful upload
- Run retention: `s3.listObjects`, sort by date, `s3.deleteObject` for files older than `BACKUP_RETENTION_DAYS`

**For backup creation (streaming approach — no temp file):**
- `spawn('mongodump', ['--uri', MONGO_URL, '--archive', '--gzip'])` — omit filename to use stdout
- `s3.upload({ Bucket, Key: 'backups/backup-{ts}.gz', Body: mongodumpProcess.stdout }).promise()`
- No disk write; harder to debug mid-stream failures

**For restore:**
- `s3.getObject({ Bucket, Key: backupKey }).createReadStream()` returns a Readable
- `spawn('mongorestore', ['--uri', MONGO_URL, '--archive', '--gzip', '--drop'])`
- Pipe S3 stream to `mongorestoreProcess.stdin`
- `--drop` flag is required to drop each collection before insert, preventing duplicate `_id` errors

**For retention policy:**
- `s3.listObjects({ Bucket, Prefix: BACKUP_SPACES_PREFIX }).promise()`
- Filter `Contents` where `LastModified < Date.now() - (BACKUP_RETENTION_DAYS * 86400000)`
- `s3.deleteObject({ Bucket, Key: obj.Key }).promise()` for each expired object
- Runs as the last step of every backup job (not a separate cron)

---

## New Files to Create

| File | Purpose |
|------|---------|
| `backend/jobs/backupJob.js` | Cron schedule (daily at 3 AM) + `runBackupNow()` manual export |
| `backend/services/backupService.js` | `createBackup()`, `uploadBackup()`, `restoreBackup()`, `applyRetentionPolicy()` |
| `backend/Aptfile` | Single line: `mongodb-database-tools` — installs binary on App Platform |

**Backend route additions** (in `backend/index.js` or new router):
- `POST /admin/backup` — trigger manual backup (admin-auth required)
- `POST /admin/restore` — trigger restore from named backup key (admin-auth required)
- `GET /admin/backups` — list available backups in Spaces (admin-auth required)

---

## Version Compatibility

| Package / Tool | Compatible With | Notes |
|----------------|-----------------|-------|
| `mongodump` 100.15.0 | MongoDB Server 4.x, 5.x, 6.x, 7.x | The `100.x` version line supports all modern MongoDB; minor version mismatch warnings in logs do not block backup operation |
| `aws-sdk` v2 `s3.upload()` | DigitalOcean Spaces S3 API | Confirmed working in this project for image uploads with same endpoint/credentials config; backup uses identical API surface |
| `node-cron` v3.0.3 | Node.js 14+ | `scheduled: true` and `timezone` options used — same API the exchange rate job uses today |
| `child_process.spawn` | Node.js 14+ LTS | Built-in; no version concerns |

---

## Sources

- [mongodb/mongo-tools CHANGELOG](https://github.com/mongodb/mongo-tools/blob/master/CHANGELOG.md) — version 100.15.0 current release confirmed (MEDIUM — inferred from multiple sources; official changelog not directly retrieved)
- [MongoDB Backup and Restore Tools](https://www.mongodb.com/docs/manual/tutorial/backup-and-restore-tools/) — `--archive`, `--gzip`, `--drop` flag behavior (MEDIUM — HTML retrieval incomplete; flags confirmed in multiple community sources)
- [DigitalOcean App Platform Aptfile Buildpack](https://docs.digitalocean.com/products/app-platform/reference/buildpacks/aptfile/) — Debian package install via Aptfile confirmed; `/layers/digitalocean_apt/apt/` path documented (HIGH)
- [DigitalOcean Community: Aptfile PATH Issues](https://www.digitalocean.com/community/questions/app-platform-installing-packages-using-aptfile) — Non-standard layer path requires manual PATH addition (MEDIUM)
- [AWS SDK v2 Managed Upload Announcement](https://aws.amazon.com/blogs/developer/announcing-the-amazon-s3-managed-uploader-in-the-aws-sdk-for-javascript/) — `s3.upload()` stream support, multipart, unknown-size payloads (HIGH)
- [DigitalOcean App Platform Jobs Documentation](https://docs.digitalocean.com/products/app-platform/how-to/manage-jobs/) — Minimum 15-min cron interval; in-process node-cron comparison (HIGH)
- `backend/package.json` (local) — aws-sdk v2, node-cron v3.0.3, mongoose v8.6.1 confirmed present (HIGH)
- `backend/index.js` (local) — `s3.upload()` usage, S3 client construction with `SPACES_ENDPOINT`, env var names confirmed (HIGH)
- `backend/jobs/exchangeRateJob.js` (local) — node-cron v3 scheduling pattern confirmed for reference (HIGH)

---
*Stack research for: MongoDB Backup & Recovery System (v1.6 milestone)*
*Researched: 2026-04-04*
