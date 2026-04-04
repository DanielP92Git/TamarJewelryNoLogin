---
phase: 33
slug: environment-setup-binary-verification
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `backend/vitest.config.js` |
| **Quick run command** | `cd backend && npm test -- tests/unit/jobs/backupVerification.test.js` |
| **Full suite command** | `cd backend && npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npm test -- tests/unit/jobs/backupVerification.test.js`
- **After every plan wave:** Run `cd backend && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 33-01-01 | 01 | 1 | BKUP-04 | unit | `cd backend && npm test -- tests/unit/jobs/backupVerification.test.js` | ❌ W0 | ⬜ pending |
| 33-01-02 | 01 | 1 | BKUP-04 | unit | `cd backend && npm test -- tests/unit/jobs/backupVerification.test.js` | ❌ W0 | ⬜ pending |
| 33-02-01 | 02 | 1 | BKUP-04 | integration | `cd backend && npm test -- tests/integration/backupStatus.test.js` | ❌ W0 | ⬜ pending |
| 33-02-02 | 02 | 1 | BKUP-04 | integration | `cd backend && npm test -- tests/integration/backupStatus.test.js` | ❌ W0 | ⬜ pending |
| 33-03-01 | 03 | 1 | BKUP-04 | manual | review file diff | manual | ⬜ pending |
| 33-03-02 | 03 | 1 | BKUP-04 | manual | `ls backend/Aptfile` | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/unit/jobs/backupVerification.test.js` — stubs for BKUP-04 unit behaviors (mock child_process execFileSync: success path + ENOENT path)
- [ ] `backend/tests/integration/backupStatus.test.js` — covers `/admin/backup-status` endpoint authentication and response shape

*Existing infrastructure: `backend/vitest.config.js`, `backend/tests/setup.js`, and existing unit/middleware test helpers cover shared fixtures — no new framework setup needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `mongodump --version` logged from running App Platform container | BKUP-04 | Requires live App Platform deployment | Deploy to App Platform, check runtime logs for `[backup] mongodump binary OK:` line |
| `backend/Aptfile` triggers buildpack install | BKUP-04 | Requires App Platform build pipeline | Check build logs for `digitalocean_apt` layer or Aptfile detection |
| Atlas IP allowlist permits mongodump connections | BKUP-04 | Requires Atlas console access | Log into Atlas, check IP Access List for App Platform IPs |
| env.example contains all 9 backup env vars | BKUP-04 | Static file review | `grep -c 'BACKUP_\|MONGODUMP_\|MONGORESTORE_' backend/env.example` should return >= 9 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
