---
phase: 36
slug: database-restore
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.0.18 |
| **Config file** | backend/vitest.config.js |
| **Quick run command** | `cd backend && npx vitest run --reporter=verbose -- restore` |
| **Full suite command** | `cd backend && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npx vitest run --reporter=verbose -- restore`
- **After every plan wave:** Run `cd backend && npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 36-01-01 | 01 | 1 | REST-01 | T-36-01 | Auth required for restore | unit | `npx vitest run -- restore` | ❌ W0 | ⬜ pending |
| 36-01-02 | 01 | 1 | REST-02 | T-36-02 | Confirmation gate rejects bad input | unit | `npx vitest run -- restore` | ❌ W0 | ⬜ pending |
| 36-01-03 | 01 | 1 | REST-01 | T-36-03 | Key validated against Spaces objects | unit | `npx vitest run -- restore` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/restoreService.test.js` — stubs for REST-01, REST-02
- [ ] Test fixtures for mock S3 responses and mongorestore spawn

*Existing backup test infrastructure covers shared fixtures.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end restore against real Atlas cluster | SC-4 | Requires real Spaces bucket + Atlas URI | Deploy, trigger restore via POST /admin/restore/:key with valid backup key, verify DB state |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
