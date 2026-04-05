---
phase: 34
slug: core-backup-service
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `backend/vitest.config.js` |
| **Quick run command** | `cd backend && npm test -- --reporter=verbose tests/unit/services/backupService.test.js` |
| **Full suite command** | `cd backend && npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npm test -- tests/unit/services/backupService.test.js tests/unit/jobs/backupJob.test.js`
- **After every plan wave:** Run `cd backend && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 34-01-01 | 01 | 0 | BKUP-01 | unit | `npm test -- tests/unit/services/backupService.test.js` | ❌ W0 | ⬜ pending |
| 34-01-02 | 01 | 0 | BKUP-01 | unit | `npm test -- tests/unit/jobs/backupJob.test.js` | ❌ W0 | ⬜ pending |
| 34-02-01 | 02 | 1 | BKUP-01 | unit | `npm test -- tests/unit/services/backupService.test.js` | ❌ W0 | ⬜ pending |
| 34-02-02 | 02 | 1 | BKUP-02 | unit (nock) | `npm test -- tests/unit/services/backupService.test.js` | ❌ W0 | ⬜ pending |
| 34-02-03 | 02 | 1 | BKUP-03 | unit | `npm test -- tests/unit/services/backupService.test.js` | ❌ W0 | ⬜ pending |
| 34-02-04 | 02 | 1 | MON-01 | unit | `npm test -- tests/unit/services/backupService.test.js` | ❌ W0 | ⬜ pending |
| 34-03-01 | 03 | 1 | RET-01 | unit (nock) | `npm test -- tests/unit/services/backupService.test.js` | ❌ W0 | ⬜ pending |
| 34-03-02 | 03 | 1 | ADM-03 | unit | `npm test -- tests/unit/services/backupService.test.js` | ❌ W0 | ⬜ pending |
| 34-04-01 | 04 | 2 | BKUP-01 | unit | `npm test -- tests/unit/jobs/backupJob.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/unit/services/backupService.test.js` — stubs for BKUP-01, BKUP-02, BKUP-03, MON-01, ADM-03, RET-01
- [ ] `backend/tests/unit/jobs/backupJob.test.js` — stubs for cron expression validity (BKUP-01 scheduling)

*Existing infrastructure (Vitest, mongodb-memory-server, nock S3 mocks in `tests/helpers/mocks/s3.js`) covers all supporting infrastructure — no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Backup runs at 03:00 Israel time | BKUP-01 | Real cron timing cannot be unit tested | Verify cron expression parses correctly; manual deployment test |
| File appears in DO Spaces bucket | BKUP-02 | Requires real S3 endpoint | Deploy and check Spaces bucket via DO console |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
