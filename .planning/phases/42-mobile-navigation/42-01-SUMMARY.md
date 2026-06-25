---
phase: 42-mobile-navigation
plan: "01"
subsystem: nav
tags: [mobile, hamburger, overlay, css, ejs, rtl, accessibility]
dependency_graph:
  requires: []
  provides: [hamburger-markup, mobile-nav-overlay-markup, hamburger-css, overlay-css, 800px-breakpoint]
  affects: [frontend/css/homepage.css, backend/views/partials/header.ejs]
tech_stack:
  added: []
  patterns: [is-open-toggle, logical-properties-rtl, double-bind-guard-ready, aria-dialog-overlay]
key_files:
  created: []
  modified:
    - backend/views/partials/header.ejs
    - frontend/css/homepage.css
decisions:
  - "D-04 enforced: overlay currency select uses id=currency-mobile (distinct from id=currency-desktop); class+name attributes identical so initCurrencyPersistence/syncCurrencySelectors work without change"
  - "D-05 applied: @media (max-width: 860px) retargeted to 800px — single shared query hides .tk-nav__links and shows .tk-hamburger"
  - "D-06 hamburger placement: last child of <header>; flex reversal on dir=rtl auto-positions to start on /he"
  - "RTL via logical properties: inset-inline-end: 20px on close button auto-mirrors LTR/RTL; no flex-direction: row-reverse added"
  - "Overlay z-index 200: above header (100), below cart drawer (1100+); visibility:hidden default prevents overlay from trapping focus before Wave-2 JS wires it"
metrics:
  duration: "3m"
  completed_date: "2026-06-25T21:07:33Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
  files_created: 0
---

# Phase 42 Plan 01: Mobile Nav Markup + CSS Summary

Static SSR chrome for hamburger button and full-screen mobile nav overlay — markup in header.ejs and complete CSS in homepage.css, with breakpoint aligned to 800px.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add hamburger button + #tk-mobile-nav overlay markup to header.ejs | 36f1cc8 | backend/views/partials/header.ejs |
| 2 | Align breakpoint to 800px and add hamburger + overlay CSS in homepage.css | 009c52e | frontend/css/homepage.css |

## What Was Built

**Task 1 — header.ejs markup:**
- Hamburger button (`class="tk-hamburger"`, `aria-controls="tk-mobile-nav"`) appended as last child of `<header>` before `</header>`
- Full-screen overlay (`id="tk-mobile-nav"`, `role="dialog"`, `aria-modal="true"`) appended after `</header>`
- Overlay contains: close button (`.tk-mobile-nav__close`), 5 nav links with `is-active` logic mirroring desktop nav, flags + currency controls relocated from `.tk-nav__utils`
- D-04: overlay currency select uses `id="currency-mobile"` (distinct from existing `id="currency-desktop"`); both selects share `class="header-currency-selector tk-nav__currency-select"` and `name="currency"` so Phase-40 currency hooks work on both
- Both US and IL flag SVGs copied verbatim into overlay — no `crossorigin` attribute added

**Task 2 — homepage.css breakpoint + styling:**
- D-05: `@media (max-width: 860px)` retargeted to `@media (max-width: 800px)` — single shared query hides `.tk-nav__links` and (via new block) shows `.tk-hamburger`
- `.tk-hamburger`: `display: none` at ≥800px; `display: flex` at <800px; white color on `.tk-nav--transparent`; 44px touch target; width guard against `desktop-menu.css` hijack
- `.tk-nav__utils .tk-lang` and `.tk-nav__utils .tk-nav__currency-select`: `display: none` at <800px (controls relocated into overlay)
- `#tk-mobile-nav`: `position: fixed; inset: 0; z-index: 200`; opacity/visibility/scale transition for open/close; starts hidden (`opacity: 0; visibility: hidden; pointer-events: none`)
- `#tk-mobile-nav.is-open`: full opacity/visibility; JS toggles this class in Wave-2 (Plan 42-02)
- `.tk-mobile-nav__close`: `inset-inline-end: 20px` (CSS logical property auto-mirrors LTR/RTL)
- `.tk-mobile-nav__links`: centered column flex; `is-active` uses `color: var(--tk-gold)`; `#tk-mobile-nav a { width: auto }` guard
- `.tk-mobile-nav__controls`: 80px bottom strip; `border-top` separator; `background: var(--tk-surface)`

## Deviations from Plan

### Plan Verification Note

**Acceptance criteria deviation: `grep -c 'flex-direction: row-reverse' homepage.css` expected 0 but returns 1**
- Found during: Task 2 verification
- Issue: The pre-existing RTL comment block at line 498 contains the string `flex-direction: row-reverse` as part of a "DO NOT use" warning: `"Do NOT add \`flex-direction: row-reverse\` here"`
- Status: This comment was in the file BEFORE this plan — it is not a CSS rule I added. No actual `flex-direction: row-reverse` CSS declaration exists anywhere in the file (verified by checking only the new blocks added from line 506 onward).
- Impact: None — RTL true-mirror rule respected. The comment itself is correct guidance.

No other deviations from plan.

## Known Stubs

None — no placeholder text, hardcoded empty values, or unconnected data sources in the modified files. The overlay markup is fully formed SSR chrome; Wave-2 (Plan 42-02) wires the JS toggle behavior.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes. The EJS interpolated values (`urlLang`, `_eng`, `_active`) are server-controlled locals — no user input reflected in the new markup (T-42-01 mitigated as planned).

## Self-Check: PASSED

- `backend/views/partials/header.ejs` — modified, hamburger + overlay markup present
- `frontend/css/homepage.css` — modified, 800px breakpoint + all overlay CSS present
- Task 1 commit 36f1cc8 — verified in git log
- Task 2 commit 009c52e — verified in git log
