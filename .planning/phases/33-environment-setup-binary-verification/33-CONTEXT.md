# Phase 33: Environment Setup & Binary Verification - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Confirm mongodump/mongorestore binaries are available and PATH-resolved in the DigitalOcean App Platform container. Create the Aptfile, document new environment variables, and make the scheduling strategy decision — all before any backup logic is written.

</domain>

<decisions>
## Implementation Decisions

### Scheduling Strategy
- **D-01:** Use in-process node-cron for backup scheduling, consistent with the existing `exchangeRateJob.js` pattern. No separate worker process or App Platform Scheduled Job.
- **D-02:** No distributed lock needed — single App Platform instance means no concurrent backup risk.

### Backup Storage
- **D-03:** Create a dedicated Spaces bucket (e.g., `tamar-jewelry-backups`) separate from the image bucket (`tamar-jewelry-images`).
- **D-04:** Backup bucket region: Amsterdam (ams3) — off-region from primary Frankfurt (fra1) for geographic redundancy.
- **D-05:** Separate Spaces credentials for the backup bucket (BACKUP_SPACES_KEY, BACKUP_SPACES_SECRET, etc.) — distinct from image storage credentials.

### Binary Verification
- **D-06:** Startup verification: run `mongodump --version` on server start and log the result. Fail loud if binaries are missing.
- **D-07:** Admin endpoint: expose GET `/admin/backup-status` (behind auth) that returns binary availability, path, and version info.

### Environment Variables
- **D-08:** `MONGODUMP_PATH` defaults to `mongodump` (PATH lookup). Override available for non-standard install locations. Same pattern for `MONGORESTORE_PATH`.
- **D-09:** New env vars to document in `env.example`: `BACKUP_BUCKET`, `BACKUP_SPACES_PREFIX`, `BACKUP_RETENTION_COUNT`, `MONGODUMP_PATH`, `MONGORESTORE_PATH`, `BACKUP_SPACES_KEY`, `BACKUP_SPACES_SECRET`, `BACKUP_SPACES_ENDPOINT`, `BACKUP_SPACES_REGION`.

### Claude's Discretion
- Default values for `BACKUP_RETENTION_COUNT` (14 per requirements) and `BACKUP_SPACES_PREFIX` (e.g., `backups/`)
- Aptfile exact package name and format
- Startup check implementation details (child_process.execSync vs execFileSync, error handling)
- Admin endpoint response shape

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — BKUP-04 requirement (mongodump/mongorestore available via Aptfile)
- `.planning/ROADMAP.md` §Phase 33 — Success criteria (5 items) defining done state

### Existing PRD
- `backend/backup-prd.md` — Original PRD with architecture overview, backup/restore flow, and security considerations

### Existing Patterns
- `backend/jobs/exchangeRateJob.js` — node-cron scheduling pattern to follow for backup job
- `backend/env.example` — Current env var documentation format to extend
- `backend/index.js` — Monolithic server where startup check and admin endpoint will be added

### Infrastructure
- `backend/package.json` — Current dependencies (aws-sdk already present for Spaces integration)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `aws-sdk` (v2.1693.0) already in backend dependencies — backup service will create its own S3 client for the backup bucket
- `node-cron` (v3.0.3) already in backend dependencies — scheduling infrastructure ready
- `backend/middleware/auth.js` — `requireAdmin` middleware for protecting the backup-status endpoint

### Established Patterns
- Cron jobs: `backend/jobs/exchangeRateJob.js` uses `cron.schedule()` with timezone — follow same pattern
- S3 client: `backend/index.js` creates an S3 client for image uploads — backup service creates its own with backup-specific credentials
- Admin routes: Protected with `fetchUser, requireAdmin` middleware chain
- Env vars: Grouped by concern in `env.example` with section headers and comments

### Integration Points
- Startup: Binary check runs after Express setup but before `app.listen()`
- Admin routes: New `/admin/backup-status` added alongside existing admin endpoints in `index.js`
- Env loading: `dotenv` already configured in backend startup

</code_context>

<specifics>
## Specific Ideas

- STATE.md warns that Aptfile binary PATH is "MEDIUM confidence" — must log `which mongodump` from the deployed container to confirm the actual install path before hardcoding anything
- The backup service must create its own S3 client (monolithic index.js does not export its s3 instance)
- Never log spawn args containing the MongoDB URI — redact before any logging

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 33-environment-setup-binary-verification*
*Context gathered: 2026-04-04*
