# Project Research Summary

**Project:** Tamar Kfir Jewelry — MongoDB Backup & Recovery System (v1.6)
**Domain:** Automated database backup/restore for Node.js/Express on DigitalOcean App Platform
**Researched:** 2026-04-04
**Confidence:** HIGH

## Executive Summary

This milestone (v1.6) adds a production-grade automated backup and restore system to an existing e-commerce backend without introducing any new npm packages. The entire system is built on already-installed dependencies: `node-cron` (already running the exchange rate job), `aws-sdk` v2 (already uploading product images to DigitalOcean Spaces), and Node.js built-ins (`child_process`, `fs`). The only external dependency that must be added is the `mongodump`/`mongorestore` binary from MongoDB Database Tools, installed on DigitalOcean App Platform via an `Aptfile` at the repo root. The core architecture mirrors the existing `exchangeRateJob.js` + `exchangeRateService.js` pattern: a new `backupJob.js` schedules the work and a new `backupService.js` contains all backup/restore/retention logic.

The recommended approach is a temp-file backup flow: `mongodump --archive --gzip` writes a single compressed archive to a local `/tmp` path, which is uploaded to a dedicated DigitalOcean Spaces bucket under a `backups/` prefix using the existing S3 client, then deleted locally. A count-based retention policy (default: keep last 14 backups) runs after every successful backup. Three admin API routes (`POST /backup`, `GET /backups`, `POST /restore/:key`) are added to `backend/index.js` behind the existing `requireAdmin` middleware. An admin dashboard panel in `admin/BisliView.js` surfaces backup status and manual controls. The streaming alternative (piping `mongodump` stdout directly to S3 with no temp file) is more elegant but harder to debug; the temp-file approach makes each step independently verifiable and is the recommended starting point.

The two highest risks are environment setup concerns, not logic concerns. First, the `mongodump` binary installs to a non-standard layer path on App Platform after Aptfile installation and requires explicit `PATH` configuration — this must be verified in a deployed container before any backup logic is written. Second, silent failure is the most dangerous long-term risk: a backup job that catches errors and logs only to `console.error` will go undetected until the moment a restore is needed. Failure alerting — admin dashboard status row and email notification via the existing EmailJS integration — must ship as a first-class feature with the backup system, not as a follow-on task.

---

## Key Findings

### Recommended Stack

All required capability exists in the current `backend/package.json`. Zero new npm packages are needed. The `aws-sdk` v2 `s3.upload()` method handles streaming multipart uploads to DigitalOcean Spaces using the same configuration already used for product image uploads. The `node-cron` scheduler is already running in `backend/jobs/exchangeRateJob.js` and the identical API applies. `child_process.spawn` (preferred over `exec` for large subprocess output) runs `mongodump` and `mongorestore`.

**Core technologies:**
- `child_process.spawn` (Node built-in): Execute `mongodump`/`mongorestore` subprocesses — streams stdout/stderr without memory buffering; exit code signals success/failure cleanly; avoids `exec`'s 200 KB buffer ceiling
- `mongodump` / `mongorestore` (MongoDB Database Tools 100.15.0): Create and restore BSON archive backups — `--archive --gzip` produces a single compressed file; BSON preserves all MongoDB types (ObjectId, Date); `--drop` flag enables clean restore
- `aws-sdk` v2 `s3.upload()` (already installed `^2.1693.0`): Upload backup archives to DigitalOcean Spaces — already configured with `SPACES_ENDPOINT`, `SPACES_KEY`, `SPACES_SECRET`; handles multipart for large files; identical usage to existing image uploads
- `node-cron` (already installed `^3.0.3`): Schedule daily backup at 03:00 AM — same `cron.schedule()` API the exchange rate job uses; zero new dependency
- `fs.createReadStream` / `fs.unlink` (Node built-in): Read temp backup file for S3 upload; delete immediately after upload completes

**Critical installation note:** Create `backend/Aptfile` (single line: `mongodb-database-tools`) and add `/layers/digitalocean_apt/apt/usr/bin` to `PATH` in App Platform environment variables. No changes to `backend/package.json`.

**New environment variables required:**
- `BACKUP_RETENTION_DAYS=14` — days to retain backups before deletion
- `BACKUP_SPACES_PREFIX=backups/` — S3 key prefix for all backup objects
- `BACKUP_BUCKET=` — separate Spaces bucket in a different DO region for off-region isolation; defaults to `SPACES_BUCKET` in development
- `MONGODUMP_PATH=` — optional binary path override if PATH resolution fails

### Expected Features

**Must have (v1.6 table stakes):**
- Automated daily backup via `node-cron` at 03:00 AM — without automation, backups will be skipped; manual-only is not a safety net
- `mongodump --archive --gzip` to temp file + upload to DigitalOcean Spaces — App Platform ephemeral filesystem requires off-region persistence for every backup
- Timestamped backup filenames (`backup-2026-04-04T02-00-00Z.archive.gz`) — ISO format is both human-readable and lexicographically sortable; prerequisite for retention and restore selection
- Retention policy: auto-delete backups beyond configurable count (default: 14) — prevents unbounded Spaces storage growth and cost
- Structured backup success/failure log entry per run — operators must know if last night's backup ran; silent failure is worse than no backup
- Manual backup trigger: `POST /backup` (admin-auth required) — needed before risky migrations or bulk data operations
- Database restore: `POST /restore/:key` with explicit confirmation gate (admin-auth required) — backup has no value without a proven, tested restore path

**Should have (add after v1.6 is validated in production):**
- Admin dashboard backup panel in `BisliView.js` — list backups with human-readable dates/sizes, trigger manual run, display last-run status without requiring SSH access to App Platform logs
- Persistent backup history log in a `backup_logs` MongoDB collection — 5-8 fields per entry (timestamp, status, filename, bytes, duration_ms, error); enables "last backup" timestamp display

**Defer (v2+):**
- Automated restore verification to a staging MongoDB instance — requires a second database; meaningful only after primary backup runs reliably for 30+ days
- Second Spaces region for 3-2-1 redundancy — same SDK and credentials, just a second bucket in NYC vs FRA; build after primary is proven
- Email/webhook alert on backup failure — valuable operational monitoring; build after structured logging is confirmed stable

### Architecture Approach

The backup system follows the established service-layer pattern already in this codebase. A new `backupJob.js` in `backend/jobs/` mirrors `exchangeRateJob.js` exactly: exports `startBackupJob()` and `runBackupNow()`, registered in `index.js` inside the `connectDb().then()` block alongside the existing exchange rate job. All I/O-heavy logic (spawn, S3 upload, S3 list, S3 delete) lives in `backupService.js` in `backend/services/`, keeping it testable in isolation. Because the monolithic `index.js` does not export its `s3` client, `backupService.js` creates its own S3 instance using the same environment variables — acceptable duplication that avoids out-of-scope refactoring of the monolith. Three admin routes are added directly to `index.js`, consistent with the existing monolithic route pattern.

**Major components:**
1. `backend/jobs/backupJob.js` (NEW) — node-cron schedule wiring; exports `startBackupJob()` and `runBackupNow()`; delegates all logic to `backupService`; mirrors `exchangeRateJob.js` structure exactly
2. `backend/services/backupService.js` (NEW) — all backup/restore/retention logic: `runBackup()`, `runRestore()`, `listBackups()`, `applyRetention()`; owns its own S3 client instance and child_process spawning
3. Admin routes in `backend/index.js` (MODIFIED) — `POST /backup`, `GET /backups`, `POST /restore/:key`; all protected by existing `requireAdmin` middleware; route handlers contain only request parsing and response sending
4. `backend/Aptfile` (NEW) — single line `mongodb-database-tools`; installs `mongodump`/`mongorestore` at App Platform build time via heroku-buildpack-apt mechanism
5. Admin dashboard backup panel in `admin/BisliView.js` (MODIFIED) — backup list with human-readable formatting, manual trigger button, last-run status row, restore UI with confirmation phrase requirement

**Backup data flow:** cron trigger or admin POST → `backupService.runBackup()` → `spawn('mongodump', ['--uri', ..., '--archive=/tmp/backup-{ts}.gz', '--gzip'])` → wait for exit code 0 → `s3.upload()` to Spaces `backups/` prefix → `fs.unlink()` temp file → `applyRetention()` (list, sort, delete beyond retention count) → return result.

**Restore data flow:** admin POST with `{ confirm: "RESTORE" }` → validate backup key against known Spaces objects → `s3.getObject()` download to temp file → `spawn('mongorestore', ['--uri', ..., '--archive=...', '--gzip', '--drop'])` → `fs.unlink()` temp file → return result.

### Critical Pitfalls

1. **`mongodump` binary missing in production container** — `spawn('mongodump')` throws `ENOENT`; backups fail silently from day one. Prevention: create `Aptfile` with `mongodb-database-tools`; add `/layers/digitalocean_apt/apt/usr/bin` to `PATH` in App Platform environment; log `mongodump --version` at startup; verify in a deployed container before writing any backup logic. Do not advance past Phase 1 until this is confirmed.

2. **Silent backup failure — no alerting** — `try/catch` catches errors, `console.error` is the only signal, App Platform logs rotate, failures go undetected for weeks until a restore is needed. Prevention: write a structured log entry to MongoDB `backup_logs` per run; expose "last successful backup" timestamp on admin health endpoint; send failure alert via existing EmailJS integration. Treat backup failure as a production incident.

3. **node-cron fires N times with N App Platform instances** — duplicate `mongodump` operations race on the same Spaces key during rolling deploys; retention cleanup deletes files just created by the parallel job. Prevention: use App Platform native Scheduled Jobs component (runs exactly once per schedule, isolated process), or implement MongoDB-backed distributed lock with TTL index; at minimum use unique timestamped filenames to prevent overwriting.

4. **`mongorestore --drop` targets wrong database** — under incident pressure a misconfigured namespace drops the wrong collections permanently. Prevention: require explicit confirmation string in request body; validate backup key against known Spaces objects (never accept user-supplied filenames directly); log target database name before executing; treat restore as a privileged, documented operation.

5. **MongoDB credentials exposed in logs** — `spawn('mongodump', ['--uri', MONGO_URL, ...])` puts the full connection string including password in process list and any `console.log(args)` debug line. Prevention: never log `args.join(' ')` when args contains the URI; redact before any logging: `uri.replace(/:\/\/([^@]+)@/, '://***@')`; grep App Platform logs for the Atlas cluster hostname after first deployment.

---

## Implications for Roadmap

The pitfall-to-phase mapping from PITFALLS.md directly drives the phase order. Environment constraints (binary availability, Atlas connectivity, scheduler architecture) must be resolved before any service logic is written. Core backup ships before restore because restore requires real backups to test against. Failure alerting ships in the same phase as manual trigger — not as a follow-on — because a backup system without observable failure status is not a backup system.

### Phase 1: Environment Setup and Binary Verification

**Rationale:** The single most dangerous risk is discovering that `mongodump` is unavailable in production after the full backup system is built. Pitfalls 1, 3, and 4 (binary missing, duplicate cron runs, Atlas IP allowlist) are all environment-level and must be resolved before writing any service code. This phase has zero backup business logic — only infrastructure.

**Delivers:** Confirmed `mongodump --version` output logged from a deployed App Platform container; `Aptfile` committed and `PATH` configured in App Platform environment; new env vars documented in `backend/env.example`; Atlas IP allowlist verified for `mongodump` connection at job runtime (not just Mongoose startup); explicit decision documented on App Platform Jobs vs. in-process node-cron with distributed lock.

**Avoids:** Building backup logic on an unverified platform assumption; discovering binary is absent at the moment of first production backup

### Phase 2: Core Backup Service

**Rationale:** With environment verified, implement the full backup data path end-to-end. This is the highest-value deliverable — a running daily automated backup. Follows the `exchangeRateService`/`exchangeRateJob` pattern exactly, so there are no novel architectural decisions.

**Delivers:** `backend/services/backupService.js` with `runBackup()` and `applyRetention()`; `backend/jobs/backupJob.js` registered in `index.js`; daily backups landing in a dedicated Spaces bucket with timestamped filenames; count-based retention cleaning up old archives; structured log entry written per backup run.

**Uses:** `child_process.spawn`, `mongodump --archive --gzip`, `aws-sdk` v2 `s3.upload()`, `node-cron`, `fs.unlink`

**Implements:** `backupService.js` and `backupJob.js` components (Architecture components 1 and 2)

**Avoids:** Credentials in logs (Pitfall 5); `execSync` blocking event loop (anti-pattern from ARCHITECTURE.md); temp file persisting after upload; using same Spaces bucket as product images (retention cleanup must never touch image objects)

### Phase 3: Manual Trigger and Failure Alerting

**Rationale:** Manual trigger is needed before risky production operations. Failure alerting must ship with the backup system because PITFALLS.md classifies silent failure as a critical risk requiring Phase 3 treatment — not a follow-on. Both features share the same code path as Phase 2.

**Delivers:** `POST /backup` admin route returning job result synchronously (size acceptable for current ~94-product catalog); `backup_logs` MongoDB collection with structured entries (timestamp, status, filename, bytes, duration_ms, error); "last successful backup" timestamp on an admin health endpoint; EmailJS failure notification triggered when backup job throws.

**Uses:** Existing `requireAdmin` middleware; existing EmailJS integration; `backupService.runBackup()` from Phase 2

**Avoids:** Silent failure going undetected for weeks (Pitfall 8); `console.error` as the only failure signal

### Phase 4: Database Restore

**Rationale:** Restore is the proof that backups have value. It ships after backup is proven reliable so there are real Spaces archives to test restore against. It is also the highest-risk operation — permanent data loss if misconfigured — so it requires the most defensive implementation.

**Delivers:** `backupService.runRestore(key)` with `mongorestore --drop`; `GET /backups` route listing Spaces objects as human-readable entries (date, size, status); `POST /restore/:key` route requiring `{ confirm: "RESTORE" }` in request body and validating key against known Spaces objects; filename sanitization against strict regex pattern; runbook comment in code near restore logic; end-to-end restore test documented and confirmed working.

**Implements:** Admin routes component (Architecture component 3); `listBackups()` and `runRestore()` in `backupService.js`

**Avoids:** `mongorestore` on wrong database (Pitfall 6); path traversal from user-supplied filenames (security mistake from PITFALLS.md); one-click restore with no confirmation

### Phase 5: Admin Dashboard Backup Panel

**Rationale:** Admin visibility without SSH access. Ships last because it depends on all API routes from Phases 2-4 existing and confirmed working in production. UI work is decoupled from data protection logic and adds no new risk to the core backup path.

**Delivers:** New section in `admin/BisliView.js` showing backup list with human-readable formatting ("April 4, 2026 — 03:00 AM — 4.2 MB — Success"), manual trigger button with confirmation dialog, "last backup" status row visible at a glance, restore UI with explicit confirmation phrase requirement before execution.

**Implements:** Admin dashboard panel component (Architecture component 5)

**Avoids:** Admin having no visibility into backup health without navigating App Platform logs; undiscoverable restore capability during an incident; one-click restore with no safeguard

---

### Phase Ordering Rationale

- **Environment before service logic:** PITFALLS.md explicitly maps binary availability and Atlas connectivity to Phase 1. Building a service module on top of an unverified binary assumption wastes the entire Phase 2 implementation if the binary is absent or misconfigured.
- **Backup before restore:** Restore depends on real backups existing in Spaces. Testing restore without confirmed Phase 2 output means testing with manually uploaded files, which masks real integration issues with the production restore path.
- **Alerting in Phase 3 alongside manual trigger (not later):** PITFALLS.md classifies silent failure as a critical risk and explicitly requires Phase 3 treatment. Grouping alerting with manual trigger keeps both observability features together and prevents shipping a backup system that fails silently.
- **Admin UI last:** Dashboard depends on stable API contracts from all prior phases. Building UI against unstable or unconfirmed API responses leads to rework.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 1 (Aptfile PATH):** The exact path where Aptfile-installed binaries land (`/layers/digitalocean_apt/apt/usr/bin/`) is rated MEDIUM confidence — documented in community sources, not in a canonical DO doc. Also, the decision between App Platform Scheduled Jobs and in-process node-cron with a MongoDB distributed lock has architectural implications that should be validated against the actual App Platform plan and instance configuration before committing to an approach.

- **Phase 4 (mongorestore + Atlas SRV flags):** Several Atlas-specific flags (`--numParallelCollections=1`, `--timeoutMS=60000`, `--readPreference=secondaryPreferred`, `?authSource=admin`) are recommended in community sources but not all are confirmed against this specific Atlas tier. A test restore against the actual Atlas cluster in a non-production context should happen before Phase 4 implementation begins.

Phases with standard patterns (skip research-phase):

- **Phase 2 (Core Backup Service):** Directly modeled on existing codebase patterns (`exchangeRateJob.js`, existing S3 image upload in `index.js`). No novel patterns. Well-documented and proven in this repo.
- **Phase 3 (Manual Trigger + Alerting):** Standard Express route pattern + EmailJS alert. EmailJS already integrated. No novel integration required.
- **Phase 5 (Admin Dashboard):** New section in existing single-file `BisliView.js` SPA. Standard DOM + fetch pattern used throughout that file.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies confirmed present in `backend/package.json`; zero new packages; version compatibility verified from existing active usage in codebase |
| Features | HIGH (core), MEDIUM (UI patterns) | Core backup/restore mechanics well-documented in official MongoDB docs and DigitalOcean tutorials; admin UI patterns inferred from existing `BisliView.js` structure |
| Architecture | HIGH | Integration points derived directly from existing codebase source files; component pattern mirrors existing `exchangeRateJob` + `exchangeRateService` with line-level specificity |
| Pitfalls | HIGH (critical pitfalls), MEDIUM (Aptfile PATH specifics) | Critical pitfalls verified with official docs and multiple independent sources; Aptfile binary PATH location rated MEDIUM from community sources only |

**Overall confidence:** HIGH

### Gaps to Address

- **Aptfile binary PATH on App Platform:** The exact non-standard install path (`/layers/digitalocean_apt/apt/usr/bin/`) comes from community sources. Phase 1 must log `which mongodump` from a deployed container to confirm the actual path before hardcoding it or setting `MONGODUMP_PATH`. Fallback: switch to Dockerfile-based deploy with `RUN apt-get install -y mongodb-database-tools` for predictable standard PATH.

- **Atlas connection from App Platform container at job runtime:** The Mongoose connection pool was established from a container IP already on the Atlas allowlist. A new `mongodump` subprocess connection at 03:00 AM may originate from the same container (same IP, fine) or from a replacement container after a rolling deploy (different IP, blocked). This must be verified with a real test backup run from the deployed environment in Phase 1 — do not assume the connection works because the app serves MongoDB-backed requests successfully.

- **App Platform Jobs vs. in-process node-cron with locking:** PITFALLS.md flags duplicate job execution during rolling deploys as a confirmed risk with real production consequences. The architectural decision — App Platform Scheduled Jobs (isolated, runs once per schedule) vs. in-process node-cron with a MongoDB TTL-index distributed lock — should be finalized in Phase 1 before writing the scheduler. App Platform Jobs is the safer default if the App Platform plan supports it; in-process cron is acceptable only if instance count is confirmed and locked at 1.

- **Dedicated BACKUP_BUCKET vs. prefix isolation within SPACES_BUCKET:** PITFALLS.md flags mixing backup files and image files in the same Spaces bucket as a retention logic hazard. A dedicated bucket in a different DO region is the recommended approach for true off-region isolation. This requires provisioning a new Spaces bucket and adding `BACKUP_BUCKET` to App Platform config before Phase 2 uploads begin.

---

## Sources

### Primary (HIGH confidence)

- `backend/package.json` (local codebase) — confirmed: `aws-sdk` v2 `^2.1693.0`, `node-cron` `^3.0.3`, `mongoose` `^8.6.1`, `vitest` `^4.0.18` all present and active
- `backend/jobs/exchangeRateJob.js` (local codebase) — node-cron v3 scheduling pattern; confirmed reference for `backupJob.js` structure
- `backend/services/exchangeRateService.js` (local codebase) — service layer pattern; confirmed reference for `backupService.js` structure
- `backend/index.js` (local codebase) — S3 client construction (lines 131-160); `s3.upload()` usage; admin route middleware; confirmed env var names (`SPACES_ENDPOINT`, `SPACES_KEY`, `SPACES_SECRET`)
- [DigitalOcean App Platform Aptfile Buildpack](https://docs.digitalocean.com/products/app-platform/reference/buildpacks/aptfile/) — Aptfile package installation mechanism confirmed
- [DigitalOcean App Platform — How to Store Data](https://docs.digitalocean.com/products/app-platform/how-to/store-data/) — ephemeral filesystem and 4 GiB limit confirmed
- [DigitalOcean App Platform Jobs](https://docs.digitalocean.com/products/app-platform/how-to/manage-jobs/) — Scheduled Jobs component; minimum 15-minute interval confirmed
- [MongoDB Database Tools — mongodump/mongorestore docs](https://www.mongodb.com/docs/database-tools/mongodump/) — `--archive`, `--gzip`, `--drop` flags; BSON type fidelity
- [AWS SDK v2 Managed Upload](https://aws.amazon.com/blogs/developer/announcing-the-amazon-s3-managed-uploader-in-the-aws-sdk-for-javascript/) — `s3.upload()` stream support and multipart handling confirmed
- [MongoDB JIRA TOOLS-1020, TOOLS-1782](https://jira.mongodb.org/browse/TOOLS-1020) — credentials visible in process list; confirmed long-standing issue
- [MongoDB mongorestore behavior and --drop](https://www.mongodb.com/docs/database-tools/mongorestore/mongorestore-behavior-access-usage/) — inserts-only default; `--drop` drops before restore
- [node-cron GitHub issue #393](https://github.com/node-cron/node-cron/issues/393) — duplicate cron jobs in multi-instance/cluster mode confirmed

### Secondary (MEDIUM confidence)

- [DigitalOcean Community: Scheduled MongoDB Backups to Spaces](https://www.digitalocean.com/community/tutorials/how-to-set-up-scheduled-logical-mongodb-backups-to-digitalocean-spaces) — reference architecture for this integration
- [DigitalOcean Community: Aptfile PATH issues](https://www.digitalocean.com/community/questions/app-platform-installing-packages-using-aptfile) — non-standard layer path; explicit PATH addition required
- [Percona: Streaming MongoDB Backups Directly to S3](https://www.percona.com/blog/streaming-mongodb-backups-directly-to-s3/) — stream-to-S3 without temp file pattern and tradeoffs
- [Fixing mongodump on Atlas Free Cluster (2025)](https://www.ganesshkumar.com/articles/2025-10-11-fixing-mongodump-on-atlas-free-cluster/) — Atlas-specific recommended flags for reliable connection
- [Cloudron forum: retention pagination limit](https://forum.cloudron.io/topic/9789/backups-before-retention-policy-not-being-deleted-bug) — S3 `listObjectsV2` 1000-object pagination limit as real-world issue
- [MongoDB community forum: accidentally overwrote collection](https://www.mongodb.com/community/forums/t/accidentally-overwrote-collection/275471) — real production incident motivating restore confirmation gate
- [DEV: How to Backup MongoDB Every Night in NodeJS](https://dev.to/yasseryka/how-to-backup-mongodb-every-night-in-nodejs-257o) — node-cron + mongodump pattern
- [GitHub: mongodb-backup-digitalocean-spaces](https://github.com/reddimohan/mongodb-backup-digitalocean-spaces) — reference implementation

---
*Research completed: 2026-04-04*
*Ready for roadmap: yes*
