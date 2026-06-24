---
phase: 39-header-utilities-layout
plan: 01
subsystem: header-css
tags: [css, rtl, header, utilities, homepage]
requires: []
provides:
  - Flag opacity-only active state (no gold ring) in homepage.css
  - Currency select custom data-URI chevron (solid + transparent variants)
  - RTL header mirror block ([dir="rtl"]) for nav row, utils cluster, cart badge, currency chevron
affects:
  - frontend/css/homepage.css
tech-stack:
  added: []
  patterns:
    - "appearance:none + data-URI chevron on native <select> (greenfield for this codebase)"
    - "[dir=\"rtl\"] attribute-selector RTL convention now present in homepage.css (first header RTL rules)"
key-files:
  created: []
  modified:
    - frontend/css/homepage.css
decisions:
  - "D-03: active flag affordance is opacity-only (1.0 active / 0.4 inactive / 0.85 hover); gold + white box-shadow rings removed"
  - "D-06: native <select> kept; OS arrow hidden via appearance:none, custom chevron supplied as background-image data-URI"
  - "D-09/D-10: true RTL mirror via flex-direction:row-reverse on .tk-nav and .tk-nav__utils; cart badge flips to left: -8px"
  - "Dead .tk-nav__currency block removed (markup uses .tk-nav__currency-select)"
metrics:
  duration: ~2 min
  completed: 2026-06-24
---

# Phase 39 Plan 01: Header Utilities CSS Restyle Summary

Restyled the `.tk-nav__utils` header cluster in `frontend/css/homepage.css` to the approved `.tk-*` design and made it RTL-correct on `/he`: flags use opacity-only active states (no gold ring), the currency `<select>` hides the OS arrow and shows a custom solid/white chevron, the dead `.tk-nav__currency` block is gone, and a new `[dir="rtl"]` block mirrors the nav row + utils cluster and flips the cart badge.

## What Was Built

**Task 1 — Flag active treatment (opacity-only)** — commit `a6f43ca`
- `.flag-icon` inactive opacity `0.5` → `0.4` (UI-SPEC D-03).
- Simplified `transition` to `opacity var(--tk-dur) var(--tk-ease)` (dropped the now-unused box-shadow segment).
- `.flag-icon.selected` keeps `opacity: 1`, drops `box-shadow: 0 0 0 2px var(--tk-gold)`.
- Deleted `.tk-nav--transparent .flag-icon.selected { box-shadow: 0 0 0 2px #fff; }`.
- `.flag-icon:hover { opacity: 0.85; }` kept as-is.

**Task 2 — Currency select custom chevron + dead block removal** — commit `77e98a3`
- Deleted the dead `.tk-nav__currency` block (3 rules: base + transparent + solid variants).
- `.tk-nav__currency-select`: added `appearance: none; -webkit-appearance: none;`; replaced `background: transparent` with `background-color: transparent`; added a solid `#666666` data-URI chevron with `background-repeat: no-repeat`, `background-position: right 6px center`, `background-size: 12px 12px`; changed padding `4px 6px` → `4px 24px 4px 8px`.
- Transparent variant gains a white `#ffffff` chevron `background-image` override (data-URI stroke can't read a CSS var) while keeping `color: #fff` and `border-color: rgba(255,255,255,0.6)`.
- Kept `.tk-nav__currency-select option { color: var(--tk-text); }` verbatim; no focus-ring suppression.

**Task 3 — Cart badge RTL flip + RTL header mirror** — commit `df13ae4`
- Added a labeled `/* RTL header mirror (Hebrew /he) */` block:
  - `[dir="rtl"] .tk-nav { flex-direction: row-reverse; }`
  - `[dir="rtl"] .tk-nav__utils { flex-direction: row-reverse; }`
  - `[dir="rtl"] .tk-nav__count { right: auto; left: -8px; }`
  - `[dir="rtl"] .tk-nav__currency-select { background-position: left 6px center; padding: 4px 8px 4px 24px; }`
- LTR `.tk-nav__count` (`right: -8px`) left untouched; no `.tk-nav__links` rule added (centering preserved).

## Deviations from Plan

None — plan executed exactly as written. All three tasks' acceptance_criteria grep checks passed.

## Acceptance Verification

| Check | Result |
|-------|--------|
| `box-shadow: 0 0 0 2px ...` removed | PASS (0 matches) |
| `.flag-icon` opacity `0.4`, hover `0.85`, selected `1` | PASS |
| dead `.tk-nav__currency {` block removed | PASS (0 matches) |
| `appearance: none` + `-webkit-appearance: none` present | PASS |
| solid `stroke='%23666666'` + transparent `stroke='%23ffffff'` chevrons | PASS |
| `padding: 4px 24px 4px 8px`, `background-position: right 6px center`, `background-size: 12px 12px` | PASS |
| `.tk-nav__currency-select option { color: var(--tk-text); }` preserved | PASS |
| `[dir="rtl"]` rules for `.tk-nav`, `.tk-nav__utils`, `.tk-nav__count`, `.tk-nav__currency-select` | PASS |
| LTR `.tk-nav__count` `right: -8px` retained | PASS |
| no `[dir="rtl"] .tk-nav__links` rule | PASS (0 matches) |

## Notes for Downstream

- **Markup half is Plan 02:** currency option text (`$ USD` / `₪ ILS`) and flag `title`/`aria-current` attributes live in `backend/views/partials/header.ejs` — NOT touched here.
- **No JS changes / no build needed:** `homepage.css` is served raw via `GET /css/...`; these CSS edits take effect on reload without a Parcel rebuild or backend restart.
- **Manual visual check deferred to phase verification:** load `/en` and `/he` home; confirm cluster order Flags→Currency→Cart (LTR) and Cart→Currency→Flags (RTL), chevron side, and badge side.

## Self-Check: PASSED

- File exists: `frontend/css/homepage.css` — FOUND
- Commit a6f43ca — FOUND
- Commit 77e98a3 — FOUND
- Commit df13ae4 — FOUND
