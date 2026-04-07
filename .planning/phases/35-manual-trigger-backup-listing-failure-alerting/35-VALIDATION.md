---
phase: 35
slug: manual-trigger-backup-listing-failure-alerting
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | backend/jest.config.js |
| **Quick run command** | `npx jest --testPathPattern="backup" --no-coverage` |
| **Full suite command** | `npx jest --no-coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="backup" --no-coverage`
- **After every plan wave:** Run `npx jest --no-coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 35-01-01 | 01 | 1 | MON-02 | — | N/A | unit | `npx jest BackupLog` | ❌ W0 | ⬜ pending |
| 35-01-02 | 01 | 1 | MON-03 | — | N/A | unit | `npx jest backupAlertService` | ❌ W0 | ⬜ pending |
| 35-01-03 | 01 | 1 | ADM-01 | T-35-01 | Admin-only access enforced | integration | `npx jest backup.routes` | ❌ W0 | ⬜ pending |
| 35-01-04 | 01 | 1 | REST-03 | — | N/A | integration | `npx jest backup.routes` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/__tests__/models/BackupLog.test.js` — stubs for MON-02
- [ ] `backend/__tests__/services/backupAlertService.test.js` — stubs for MON-03
- [ ] `backend/__tests__/routes/backup.routes.test.js` — stubs for ADM-01, REST-03
- [ ] `backend/__tests__/jobs/backupJob.test.js` — update existing for BackupLog persistence

*Existing test infrastructure covers framework and fixtures.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| EmailJS receives alert email | MON-03 | Requires real EmailJS account with configured template | Trigger a backup failure (e.g., invalid MongoDB URI), check EmailJS dashboard for received email |
| Email contains full context (error, timestamp, filename, duration) | MON-03 | Template rendering is EmailJS-side | Inspect received email body for all required fields |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
