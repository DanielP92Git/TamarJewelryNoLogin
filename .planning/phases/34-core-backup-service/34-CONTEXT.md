# Phase 34: Core Backup Service - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Automated daily MongoDB backup using mongodump, uploaded to an off-region DigitalOcean Spaces bucket (Amsterdam/ams3), with count-based retention cleanup. Produces structured log entries for each run. No manual trigger, no admin UI, no email alerts — those belong in Phases 35-37.

</domain>

<decisions>
## Implementation Decisions

### Backup Execution
- **D-01:** Use `mongodump --archive --gzip` to produce a single streamable archive file (no `--out` directory approach)
- **D-02:** Buffer mongodump stdout in memory (Buffer.concat), then upload the complete buffer to S3 via `putObject`. No temp file on disk. ~10MB compressed DB fits easily in memory.
- **D-03:** File size is derived from `buffer.length` before upload — gives exact byte count for logging.

### Schedule
- **D-04:** Daily at 03:00 AM Israel time (Asia/Jerusalem), using `cron.schedule()` with timezone — consistent with `exchangeRateJob.js` pattern.
- **D-05:** Cron expression is hardcoded (`'0 3 * * *'`), not configurable via env var. Change requires code deploy.

### Structured Logging
- **D-06:** Each backup run produces a single JSON log line prefixed with `[backup]`. Fields: timestamp, status, filename, sizeBytes, durationMs, retentionDeleted, error.
- **D-07:** `runBackup()` function returns the result object AND logs the JSON line. Phase 35's manual trigger endpoint can return the object directly as API response. Phase 35's monitor can persist it to MongoDB.

### Failure Handling
- **D-08:** On failure (mongodump error or S3 upload error): log a JSON line with `status:'failed'` and the error message. No automatic retry. Next backup runs in 24h, or admin triggers manually (Phase 35).
- **D-09:** If retention cleanup fails after a successful backup, the backup is still reported as `status:'success'`. Retention failure is logged as a separate warning field (`retentionError`). Data safety is the success criterion, not housekeeping.

### Claude's Discretion
- Service file structure (single `backupService.js` or split into backup + retention modules)
- S3 client initialization pattern (reuse aws-sdk v2 already in dependencies)
- mongodump child process spawning details (spawn vs execFile, error capture)
- Retention cleanup implementation (list objects, sort, delete oldest beyond count)
- The `[backup]` log prefix format and exact JSON field names (as long as MON-01 fields are covered)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — BKUP-01, BKUP-02, BKUP-03, MON-01, RET-01, ADM-03 requirements
- `.planning/ROADMAP.md` §Phase 34 — Success criteria (5 items) defining done state

### Existing PRD
- `backend/backup-prd.md` — Original PRD with architecture overview, backup/restore flow, and security considerations

### Prior Phase Context
- `.planning/phases/33-environment-setup-binary-verification/33-CONTEXT.md` — Phase 33 decisions (scheduling strategy, storage bucket, credentials, binary verification, env vars)

### Existing Patterns
- `backend/jobs/exchangeRateJob.js` — node-cron scheduling pattern with timezone to follow
- `backend/utils/backupBinaryCheck.js` — Binary verification utility (Phase 33 output) with dependency injection pattern
- `backend/env.example` — Current env var documentation format

### Infrastructure
- `backend/package.json` — Current dependencies (aws-sdk v2, node-cron already available)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `aws-sdk` (v2.1693.0) already in backend dependencies — backup service creates its own S3 client with backup-specific credentials (D-05 from Phase 33)
- `node-cron` (v3.0.3) already in backend dependencies — scheduling infrastructure ready
- `backend/utils/backupBinaryCheck.js` — `verifyMongodumpBinary()` confirms binary availability at startup, respects `MONGODUMP_PATH` env var
- `backend/middleware/auth.js` — `requireAdmin` middleware for future admin endpoints

### Established Patterns
- Cron jobs: `exchangeRateJob.js` exports `startXxxJob()` function called from `index.js` startup. Uses `cron.schedule()` with `timezone: 'Asia/Jerusalem'`
- S3 client: `index.js` creates S3 client for image uploads with separate credentials — backup service follows same pattern with backup-specific credentials
- Env vars: Grouped by concern in `env.example` with section headers and comments. Phase 33 already added backup env vars (BACKUP_BUCKET, BACKUP_SPACES_*, MONGODUMP_PATH, etc.)
- Logging: `[prefix]` style for module-specific logs (e.g., `[backup]`)

### Integration Points
- Startup: Backup job registered in `index.js` after Express setup, similar to `startExchangeRateJob()` call
- Binary check: `verifyMongodumpBinary()` already runs at startup — backup job depends on this passing
- MongoDB URI: Available via `process.env.DATABASE_URL` (same URI mongodump connects to)

</code_context>

<specifics>
## Specific Ideas

- Never log or pass the MongoDB URI in spawn args visible to logs — redact before any logging
- The backup service must create its own S3 client (monolithic index.js does not export its s3 instance) using the BACKUP_SPACES_* credentials from Phase 33
- `MONGODUMP_PATH` env var override from Phase 33 must be respected when spawning the child process
- ISO timestamp in filename should use dashes instead of colons for filesystem compatibility (e.g., `backup-2026-04-05T03-00-00Z.archive.gz`)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 34-core-backup-service*
*Context gathered: 2026-04-05*
