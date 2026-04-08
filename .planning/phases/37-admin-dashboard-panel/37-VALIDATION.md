---
phase: 37
slug: admin-dashboard-panel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 37 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual browser verification (admin SPA — no test framework for frontend) |
| **Config file** | none — pure frontend admin SPA |
| **Quick run command** | `npm run lint --prefix admin 2>/dev/null || echo "no lint configured"` |
| **Full suite command** | `npm test --prefix backend` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Visual inspection of admin dashboard in browser
- **After every plan wave:** Run `npm test --prefix backend` (backend tests should still pass)
- **Before `/gsd-verify-work`:** Full suite must be green + manual browser verification
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 37-01-01 | 01 | 1 | ADM-02 | — | N/A | manual | Visual: sidebar has "System > Backups" nav item | N/A | ⬜ pending |
| 37-01-02 | 01 | 1 | ADM-02 | — | N/A | manual | Visual: backup list table renders with columns | N/A | ⬜ pending |
| 37-01-03 | 01 | 1 | ADM-02 | — | N/A | manual | Visual: summary status card shows last backup | N/A | ⬜ pending |
| 37-01-04 | 01 | 1 | ADM-02 | — | N/A | manual | Visual: "Run Backup Now" triggers backup | N/A | ⬜ pending |
| 37-01-05 | 01 | 1 | ADM-02 | T-37-01 | Confirmation gate prevents accidental restore | manual | Visual: restore modal requires "RESTORE" input | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Backup list renders with dates, sizes | ADM-02 SC1 | Frontend SPA — no automated DOM testing | Navigate to Backups page, verify table columns |
| Summary card visible without scrolling | ADM-02 SC2 | Layout/viewport dependent | Load Backups page, verify card is above fold |
| Manual backup trigger works inline | ADM-02 SC3 | Requires real API interaction | Click "Run Backup Now", verify toast and table update |
| Restore modal confirmation gate | ADM-02 SC4 | Interactive modal flow | Click Restore, verify "RESTORE" input required |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
