---
phase: 35
slug: manual-trigger-backup-listing-failure-alerting
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-07
audited: 2026-04-07
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.0.18 |
| **Config file** | backend/vitest.config.js |
| **Quick run command** | `npx vitest run --testNamePattern="backup" --no-coverage` |
| **Full suite command** | `npx vitest run --no-coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --testNamePattern="backup" --no-coverage`
- **After every plan wave:** Run `npx vitest run --no-coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 35-01-01 | 01 | 1 | MON-03 | — | N/A | unit | `npx vitest run --testNamePattern="BackupLog"` | YES | green |
| 35-01-02 | 01 | 1 | MON-02 | — | N/A | unit | `npx vitest run --testNamePattern="backupAlertService"` | YES | green |
| 35-01-03 | 01 | 1 | ADM-01 | T-35-01 | Admin-only access enforced | integration | `npx vitest run --testNamePattern="POST /admin/backup"` | YES | green |
| 35-01-04 | 01 | 1 | REST-03 | — | N/A | integration | `npx vitest run --testNamePattern="GET /admin/backups"` | YES | green |
| 35-02-01 | 02 | 2 | MON-02/MON-03 | — | N/A | unit | `npx vitest run --testNamePattern="backupJob"` | YES | green |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [x] `backend/tests/unit/models/backupLog.test.js` — 31 tests for MON-03 (BackupLog model validation, enums, defaults, index)
- [x] `backend/tests/unit/services/backupAlertService.test.js` — 15 tests for MON-02 (env guard, HTTP request shape, failure handling)
- [x] `backend/tests/integration/backup.trigger.test.js` — 19 tests for ADM-01 (auth gating, success/failure paths, 409 concurrency lock)
- [x] `backend/tests/integration/backup.listing.test.js` — 17 tests for REST-03 (merged listing, sort order, failed-only entries, S3 failure)
- [x] `backend/tests/unit/jobs/backupJob.test.js` — 13 tests (7 new) for BackupLog persistence + failure alerting in cron callback

*Existing test infrastructure covers framework and fixtures.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| EmailJS receives alert email | MON-02 | Requires real EmailJS account with configured template | Trigger a backup failure (e.g., invalid MongoDB URI), check EmailJS dashboard for received email |
| Email contains full context (error, timestamp, filename, duration) | MON-02 | Template rendering is EmailJS-side | Inspect received email body for all required fields |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved — all 95 automated tests green across 5 test files

---

## Validation Audit 2026-04-07

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Coverage Summary:**

| Test File | Tests | Requirement | Status |
|-----------|-------|-------------|--------|
| backupLog.test.js | 31 | MON-03 | COVERED |
| backupAlertService.test.js | 15 | MON-02 | COVERED |
| backup.trigger.test.js | 19 | ADM-01 | COVERED |
| backup.listing.test.js | 17 | REST-03 | COVERED |
| backupJob.test.js | 13 | MON-02/MON-03 | COVERED |
| **Total** | **95** | | **ALL COVERED** |
