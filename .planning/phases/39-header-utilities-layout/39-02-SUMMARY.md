---
phase: 39
plan: 02
subsystem: frontend-chrome
tags: [header, currency, a11y, ssr-dual-render, rtl]
requires:
  - "backend/views/partials/header.ejs (SSR header partial)"
  - "frontend/js/View.js hydratePrototypeChrome / updateCurrencySelectorText"
provides:
  - "Currency option labels `$ USD` / `₪ ILS` (HEADER-02 / D-07)"
  - "Flag accessibility: title tooltip + per-language aria-current (HEADER-01)"
  - "Hydration-safe labels (SSR labels persist post-hydration)"
affects:
  - "Phase 40 currency wiring reads option value=usd/ils (unchanged, intact)"
tech-stack:
  added: []
  patterns:
    - "SSR + Client Dual-Render mirror (CLAUDE.md): SSR option text mirrored in updateCurrencySelectorText"
key-files:
  created: []
  modified:
    - "backend/views/partials/header.ejs"
    - "frontend/js/View.js"
decisions:
  - "D-07: currency labels language-agnostic `$ USD` / `₪ ILS` in both languages"
  - "Mirror labels in View.js (two string literals) rather than touch innerHTML — keeps SSR-static-chrome rule intact"
metrics:
  duration: "~3 min"
  completed: "2026-06-24"
  tasks: 2
  files: 2
---

# Phase 39 Plan 02: Header Currency Labels + Flag A11y Summary

Set currency option labels to `$ USD` / `₪ ILS` in the SSR header and mirrored them in `View.js` hydration so they persist after the dual-render overwrite, plus added flag `title` + `aria-current` accessibility attributes.

## What Was Built

### Task 1 — header.ejs (commit ef89ceb)
- **Currency options:** USD/ILS options now read `$ USD` and `₪ ILS` for both languages (dropped the EN/HE bilingual conditionals on those two options). The `default` option keeps its bilingual `Currency` / `מטבע` conditional.
- **Flag a11y:** Added `title="English"` + conditional `aria-current="true"` (gated on `_eng`) to the US flag; `title="עברית"` + conditional `aria-current="true"` (gated on `!_eng`) to the IL flag. `aria-current` appears exactly twice, each behind its language conditional so only the active flag carries it at render time.
- All JS hooks preserved: `value="usd"/"ils"/"default"`, `class="currency-option"`, `id="currency-desktop"`, `header-currency-selector`, `data-lang="eng"/"heb"`, `flag-eng`/`flag-heb`, and the select's `dir="rtl"` conditional.

### Task 2 — View.js (commit cf100e2)
- **Part A (label mirror):** `updateCurrencySelectorText` now assigns `options[1].text = '$ USD'` and `options[2].text = '₪ ILS'` in BOTH the eng and heb branches. `options[0]` (`Currency` / `מטבע`) and the `dir` add/remove logic are unchanged, as is the selected-value preservation block and the `options.length >= 3` guard. `getCurrencySelectorMarkup` (legacy `.menu` path) was not touched.
- **Part B (hydration audit):** see below.

## hydratePrototypeChrome Audit Result

**Result: PASS — no destructive header rewrite.** `hydratePrototypeChrome` (frontend/js/View.js lines 981-1016) performs NO `.innerHTML` assignment to the header / `.tk-nav` / `.tk-nav__utils` and does not rebuild flag/cart/currency markup. It only:
1. Binds flag-click navigation (full server round-trip to the other-language URL).
2. Calls `updateCurrencySelectorText` on each `select.header-currency-selector`.
3. Calls `persistCartNumber(cartNum)` for the cart badge.
4. Awaits `setPageSpecificLanguage` if defined.

Grep for `innerHTML` within lines 981-1016 returned zero matches. This confirms Plan 01's CSS changes (flag opacity, chevron, RTL block) are NOT undone by JS, and the SSR-static-chrome rule (CLAUDE.md) holds.

## Verification

All acceptance_criteria pass via grep:
- header.ejs contains literal `$ USD` and `₪ ILS`; no longer contains `דולר`/`שקל`; retains bilingual `Currency`/`מטבע`, all option values, classes, ids; `title="English"` + `title="עברית"`; `aria-current="true"` exactly twice.
- View.js `updateCurrencySelectorText` emits `$ USD` / `₪ ILS` in both branches; no old `USD`/`ILS`/`דולר`/`שקל` literals remain on options[1]/[2]; option[0] + dir logic intact.
- No `innerHTML` in hydratePrototypeChrome (981-1016).

Manual verification (load `/en` and `/he`, open currency dropdown, confirm `$ USD` / `₪ ILS` persist with no flash-revert) is deferred to phase verification.

## Build/Deploy Note

`frontend/js/View.js` is Parcel-bundled. These changes will NOT take effect in the browser until the frontend is rebuilt (`npm run build`) and the backend restarted to pick up new bundle hashes. The build was deliberately NOT run as part of this plan — it is a separate deploy step.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Notes

Both target files (`header.ejs`, `View.js`) carried unrelated pre-existing uncommitted edits from other in-progress work. Per execution instructions, the two task commits include the FULL working-tree diff of each target file (this plan's changes plus the prior uncommitted edits in those same files). No files outside the two targets were staged.

## Self-Check: PASSED

- FOUND: backend/views/partials/header.ejs
- FOUND: frontend/js/View.js
- FOUND: .planning/phases/39-header-utilities-layout/39-02-SUMMARY.md
- FOUND commit: ef89ceb (Task 1)
- FOUND commit: cf100e2 (Task 2)
