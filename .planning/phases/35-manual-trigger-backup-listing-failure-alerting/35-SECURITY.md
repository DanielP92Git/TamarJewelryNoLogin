---
phase: 35
slug: manual-trigger-backup-listing-failure-alerting
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-07
---

# Phase 35 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client -> POST /admin/backup | Untrusted HTTP request triggers server-side backup execution | Auth token (JWT), backup result metadata |
| client -> GET /admin/backups | Untrusted HTTP request reads backup metadata | Auth token (JWT), backup listing (filenames, sizes, timestamps) |
| server -> EmailJS API | Server sends alert data to external service | Error message, timestamp, filename, duration (no credentials in payload) |
| server -> Spaces S3 | Server reads backup object listing from external storage | S3 credentials (via env vars), backup object metadata |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-35-01 | Elevation of Privilege | POST /admin/backup | mitigate | `fetchUser + requireAdmin` middleware chain; returns 401/403 for non-admin (backup.js:38-40) | closed |
| T-35-02 | Elevation of Privilege | GET /admin/backups | mitigate | `fetchUser + requireAdmin` middleware chain; returns 401/403 for non-admin (backup.js:108-110) | closed |
| T-35-03 | Denial of Service | POST /admin/backup | mitigate | `adminRateLimiter` (120 req/15min) + `isBackupRunning` concurrency lock with 409 rejection + `finally` block lock release (backup.js:25-28, 31, 43-48, 96-98) | closed |
| T-35-04 | Information Disclosure | POST /admin/backup error response | mitigate | `backupService.spawnMongodump()` redacts MongoDB URI credentials from stderr via regex before surfacing in error message (backupService.js:80) | closed |
| T-35-05 | Information Disclosure | EmailJS private key in logs | mitigate | `backupAlertService.js` never logs the request body containing `accessToken`; only logs `err.message` on failure (backupAlertService.js:72) | closed |
| T-35-06 | Tampering | BackupLog entries | accept | Only server-side code writes to backup_logs collection; `trigger` field hardcoded to `'cron'` or `'manual'` — no user input maps to log fields | closed |
| T-35-07 | Repudiation | Manual backup trigger | accept | BackupLog with `trigger: 'manual'` provides audit trail; single-admin model — no user ID needed | closed |
| T-35-08 | Information Disclosure | Test env vars | mitigate | `validateTestEnvironment()` called in `beforeAll` prevents production credentials; env vars restored in `afterEach` (backup.trigger.test.js:89, backup.listing.test.js:103) | closed |
| T-35-09 | Denial of Service | Test resource leak | mitigate | `cleanAllMocks()` in `beforeEach`, `BackupLog.deleteMany({})` cleanup, `disableNetConnect` prevents real HTTP requests (backup.trigger.test.js:103,111; backup.listing.test.js:116,128) | closed |

*Status: open / closed*
*Disposition: mitigate (implementation required) / accept (documented risk) / transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-35-01 | T-35-06 | Only server-side code writes BackupLog; no external input maps to log fields. Risk of tampered entries requires MongoDB access, which is already gated by Atlas IP allowlist and credentials. | gsd-security-auditor | 2026-04-07 |
| AR-35-02 | T-35-07 | Single-admin model means `trigger: 'manual'` is sufficient audit trail. If multi-admin is added in future, extend BackupLog schema with `triggeredBy` user ID field. | gsd-security-auditor | 2026-04-07 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-07 | 9 | 9 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-07
