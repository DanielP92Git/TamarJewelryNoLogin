---
phase: 42-mobile-navigation
plan: "03"
subsystem: nav
tags: [mobile, hamburger, overlay, build, bundle, verification, uat, dismissal]
dependency_graph:
  requires: [42-01, 42-02]
  provides: [fresh-bundle-served, mobile-nav-verified-e2e, scrim-dismissal-fixed]
  affects: [frontend/dist, frontend/js/View.js]
tech_stack:
  added: []
  patterns: [clean-parcel-build, content-hash-bundle, non-interactive-ancestor-scrim]
key_files:
  created: []
  modified:
    - frontend/dist
    - frontend/js/View.js
decisions:
  - "UAT decision: re-tap-the-hamburger dismissal (NAV-03) intentionally DROPPED. The full-screen overlay is z-index 200 and deliberately covers the header (z-index 100), so the hamburger sits behind the white panel and cannot be re-tapped. The close button occupies that same top-corner slot, so raising the hamburger above the overlay would collide with the close button. Accepted three dismissals: close button + outside/scrim tap + Escape."
  - "Scrim/outside-tap dismissal (NAV-03) fixed: overlay is a flex column whose children fill 100% of it, so the original `e.target === overlay` guard never fired. Replaced with absence-of-interactive-ancestor detection (`e.target.closest('a, button, select, input, label')`)."
  - "Clean `rm -rf dist && npm run build` + bundle rebuilt twice (initial, then after scrim fix); backend restarted by the user to re-read dist/index.html (bundleScripts)."
metrics:
  duration: "~25m (incl. UAT round-trip)"
  completed_date: "2026-06-27T00:00:00Z"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 2
  files_created: 0
---

# Phase 42 Plan 03: Build + End-to-End Verification Summary

Rebuilt the frontend bundle clean, served it via the restarted backend, ran automated source-contract checks, and completed human verification across breakpoint, dismissals, currency, RTL, and language-toggle persistence. Human UAT surfaced two NAV-03 dismissal defects; one was fixed (scrim/outside-tap) and one was resolved by an explicit design decision (re-tap dropped).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Clean rebuild frontend bundle + restart backend | (build artifact — dist gitignored) | frontend/dist |
| 2 | Automated source/markup verification of served chrome | (read-only checks) | — |
| 3 | Human verification (responsive, dismissal, currency, RTL, persistence) | 429a72f | frontend/js/View.js |

## What Was Built

**Task 1 — Clean rebuild + restart:**
- `rm -rf dist .parcel-cache && npm run build` from `frontend/` — Parcel build exited 0, `postbuild.js` ran (favicon copied)
- Fresh `frontend/dist/index.html` regenerated with new content-hashed bundle (`frontend.64680ff0.js`, later `frontend.f923b1bb.js` after the scrim fix)
- Backend restarted by the user so `bundleScripts` (read from `dist/index.html` at startup) reflects the new hashes
- `dist` is gitignored — this task produced no committed source changes

**Task 2 — Automated source-contract checks (all passed):**
- `ham`=1, `overlay`=1 (header markup present)
- `curmob`=1, `curdesk`=1 (unique currency IDs — no duplicate-ID collision)
- `css860`=0 (breakpoint retargeted to 800px), `cssoverlay`=3 (overlay styled)
- `bind`=1 (`_bindHamburgerMenu()` wired in hydratePrototypeChrome)
- `svg`=0 (legacy svgHandler fully retired)

**Task 3 — Human verification:**
- NAV-01 (breakpoint): PASS — hamburger hidden ≥800px / shown <800px; no `[View] Menu bars button not found` console error
- NAV-02 (open): PASS — overlay fades/scales in with all 5 links, current page in gold, body scroll locked
- NAV-03 (dismissals): PASS after fix + decision — close button ✓, outside/empty-space tap ✓ (fixed), Escape ✓; re-tap dropped (see deviation)
- NAV-04 (mobile language + currency): PASS — flags + currency in overlay; currency change updates prices
- NAV-05 (RTL): PASS — hamburger far-left, close button top-left mirrored, Hebrew links centered
- NAV-05 (persistence): PASS — language interaction throws no console error, no chrome rebuild/flash; toggle remains idempotent

## Deviations from Plan

### UAT-surfaced Issues

**1. [NAV-03 — Fixed] Outside/scrim tap did nothing**
- Found during: Task 3 human verification (check 3c)
- Issue: `#tk-mobile-nav` is a flex column whose three children (`__top` 80px, `__links` flex:1, `__controls` 80px) cover 100% of the overlay, so a tap on "empty white space" always lands on the `.tk-mobile-nav__links` child. The handler only closed when `e.target === overlay`, which never fired.
- Fix: Replaced with `if (e.target.closest('a, button, select, input, label')) return; close();` — closes on any tap that is not an interactive control.
- Files modified: `frontend/js/View.js`
- Commit: 429a72f

**2. [NAV-03 — Design decision, dropped] Re-tap hamburger to dismiss**
- Found during: Task 3 human verification (check 3a)
- Issue: The overlay (z-index 200) intentionally covers the header (z-index 100), so the hamburger is physically behind the white panel and cannot be re-tapped. The close button occupies the same top-corner slot; raising the hamburger above the overlay would collide with it.
- Resolution: Per explicit UAT decision, re-tap dismissal is dropped. The three accepted dismissal methods are **close button + outside/scrim tap + Escape** (all verified working). This is a deliberate deviation from NAV-03's "re-tap" wording. The hamburger's existing toggle code is harmless (its close branch is simply unreachable while open) and was left in place.

No other deviations from plan.

## Known Stubs

None — the mobile navigation is fully functional end-to-end on the served bundle.

## Threat Flags

T-42-07 (bundle freshness) mitigated: clean `rm -rf dist` build + backend restart ensures the verified source is exactly what is served. No new network endpoints, auth paths, or schema changes. The scrim fix reads `e.target` from trusted browser click events; no innerHTML, no string-to-DOM.

## Self-Check: PASSED

- `frontend/dist/index.html` rebuilt with new content hash (`frontend.f923b1bb.js`)
- Automated source-contract checks all matched acceptance criteria (ham=1, overlay=1, curmob=1, curdesk=1, css860=0, cssoverlay=3, bind=1, svg=0)
- Scrim fix commit 429a72f — verified: `git log --oneline | grep 429a72f`
- All 6 human-verification checks confirmed passing by the product owner
- Frontend test suite: 6 pre-existing currency-label failures remain (unrelated to this phase — phase 42 touched no test source until 42-02's lifecycle fix, which reduced failures 7→6); no new regressions
