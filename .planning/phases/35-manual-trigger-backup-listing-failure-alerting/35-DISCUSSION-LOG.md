# Phase 35: Manual Trigger, Backup Listing & Failure Alerting - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 35-manual-trigger-backup-listing-failure-alerting
**Areas discussed:** Email alert mechanism, Backup log persistence, Backup listing data source, API route design

---

## Email Alert Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| EmailJS REST API | POST to api.emailjs.com/api/v1.6/email/send. Reuses existing EmailJS account. No new service signup. | ✓ |
| Nodemailer + SMTP | Add nodemailer package and configure SMTP credentials. More control but new dependency. | |
| You decide | Claude picks simplest approach. | |

**User's choice:** EmailJS REST API
**Notes:** No server-side email capability existed in backend — EmailJS was client-side only.

| Option | Description | Selected |
|--------|-------------|----------|
| Env var ALERT_EMAIL_TO | Configurable recipient, change without code deploy. | ✓ |
| Hardcoded in template | EmailJS template defines recipient in dashboard. | |

**User's choice:** Env var ALERT_EMAIL_TO

| Option | Description | Selected |
|--------|-------------|----------|
| New dedicated template | Separate template with backup-specific fields. | ✓ |
| Reuse contact template | Same template as contact form, awkward field mapping. | |

**User's choice:** New dedicated template

| Option | Description | Selected |
|--------|-------------|----------|
| All failures | Email on any failure — cron or manual. | ✓ |
| Cron failures only | Only unattended cron failures send email. | |

**User's choice:** All failures (cron and manual)

| Option | Description | Selected |
|--------|-------------|----------|
| Log and move on | Log warning, no retry. Consistent with Phase 34 D-08. | ✓ |
| Retry once | One retry with short delay, then log on second failure. | |

**User's choice:** Log and move on, no retry

| Option | Description | Selected |
|--------|-------------|----------|
| Full env vars | EMAILJS_SERVICE_ID, EMAILJS_ALERT_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY. | ✓ |
| Hardcode service ID | Hardcode existing service_t4qcx4j, only template + keys as env vars. | |

**User's choice:** Full env vars — all configurable

| Option | Description | Selected |
|--------|-------------|----------|
| Full context | Error + timestamp + filename + duration in email. | ✓ |
| Error only | Just error message and timestamp. | |

**User's choice:** Full context — enough to diagnose without checking logs

---

## Backup Log Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| All backups | Every runBackup() call — cron and manual — writes to backup_logs. | ✓ |
| Manual only | Only manually-triggered backups persist. Cron uses console.log only. | |

**User's choice:** All backups (cron + manual)

| Option | Description | Selected |
|--------|-------------|----------|
| Wrapper in backupJob | runBackup() stays pure. Callers persist result to BackupLog. | ✓ |
| Inside backupService.js | Add Mongoose save directly in runBackup(). Couples service to MongoDB. | |

**User's choice:** Wrapper pattern — runBackup() stays pure, callers persist

| Option | Description | Selected |
|--------|-------------|----------|
| Keep indefinitely | Log entries ~200 bytes each. Full history useful for auditing. | ✓ |
| TTL auto-expire | Auto-delete after N days. Loses long-term history. | |

**User's choice:** Keep indefinitely

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add trigger field | trigger: 'cron' or 'manual'. Enables Phase 37 filtering. | ✓ |
| No extra field | Only MON-03 required fields. | |

**User's choice:** Yes — add trigger field

---

## Backup Listing Data Source

| Option | Description | Selected |
|--------|-------------|----------|
| Merge both | Spaces objects enriched with backup_logs data. Full picture in one call. | ✓ |
| Spaces only | Only S3 bucket contents. Simple but limited. | |
| Two endpoints | Separate endpoints for Spaces vs logs. Client combines. | |

**User's choice:** Merge both — Spaces + backup_logs

| Option | Description | Selected |
|--------|-------------|----------|
| Include failed | Show all backup_logs entries. Failed ones show status + error. | ✓ |
| Successful only | Only entries with matching Spaces object. | |

**User's choice:** Include failed backups in listing

| Option | Description | Selected |
|--------|-------------|----------|
| No pagination | Return all entries sorted newest first. Small dataset. | ✓ |
| Simple limit param | Optional ?limit=N query param. | |

**User's choice:** No pagination

---

## API Route Design

| Option | Description | Selected |
|--------|-------------|----------|
| /admin prefix | POST /admin/backup, GET /admin/backups. Consistent with /admin/backup-status. | ✓ |
| Root level | POST /backup, GET /backups. Simpler but breaks grouping. | |

**User's choice:** /admin prefix

| Option | Description | Selected |
|--------|-------------|----------|
| Synchronous | Await runBackup() and return result. DB <10MB, fast. | ✓ |
| Async with polling | Return 202, poll for status. More complex. | |

**User's choice:** Synchronous response

| Option | Description | Selected |
|--------|-------------|----------|
| In-memory lock | Boolean isBackupRunning. 409 Conflict if busy. Single instance. | ✓ |
| No guard | Allow concurrent triggers. Retention handles extras. | |

**User's choice:** In-memory concurrency lock

| Option | Description | Selected |
|--------|-------------|----------|
| Separate routes file | backend/routes/backup.js. Cleaner for Phase 36/37 additions. | ✓ |
| Inline in index.js | Next to existing /admin/backup-status. Monolithic pattern. | |

**User's choice:** Separate routes file

---

## Claude's Discretion

- BackupLog Mongoose schema field types and indexes
- EmailJS REST API request implementation details
- Concurrency lock implementation pattern
- Merge algorithm for Spaces + backup_logs
- Route file structure and Express Router setup
- Middleware chain reuse details

## Deferred Ideas

None — discussion stayed within phase scope
