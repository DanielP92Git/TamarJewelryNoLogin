---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: Homepage / Global-Chrome Redesign Rollout
status: executing
stopped_at: Phase 42 UI-SPEC approved
last_updated: "2026-06-25T20:55:27.404Z"
last_activity: 2026-06-25 -- Phase 42 planning complete
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 15
  completed_plans: 12
  percent: 80
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-23)

**Core value:** A discoverable, professional online jewelry store that ranks in search engines, looks great when shared on social platforms, and converts visitors into customers — with true bilingual content so Hebrew and English visitors each see products in their language
**Current focus:** Phase 41 complete & verified; next up: Phase 42 — Mobile Navigation

## Current Position

Phase: 41 (footer-social-restore) — COMPLETE (2/2 plans, verified; FOOT-01/02/03 satisfied)
Plan: 2 of 2 complete
Status: Ready to execute
Last activity: 2026-06-25 -- Phase 42 planning complete

```
Progress: [█████████░] 90%
```

## Performance Metrics

**Velocity:**

- Total plans completed: 123 (v1.0: 5, v1.1: 33, v1.2: 25, v1.3: 14, v1.4: 19, v1.5: 12, v1.6: 11)
- Average duration: ~5 min/plan
- Total execution time: ~29 hours 37 min

**Recent Trend:**

- v1.6: 11 plans completed (2026-04-04 → 2026-04-08)
- v1.5: 12 plans completed in 3 days (2026-02-14 → 2026-02-16)

## Accumulated Context

### Roadmap Evolution

- Phase 40.1 inserted after Phase 40: Homepage Featured Products — isFeatured flag + admin toggle + SSR featured grid with dual prices; absorbs criterion 3 / CURR-03 split from Phase 40
- Phase 43 added (end of milestone): Site-wide Cart Drawer — promote homepage-only demo drawer into global chrome; real model.js data; honors Phase 40 currency wiring; CTA → /{lang}/cart. Source: todos/pending/site-wide-cart-drawer.md

### Decisions

All milestone decisions are logged in PROJECT.md Key Decisions table and phase summaries.

See milestone archives in `.planning/milestones/` for detailed decision history.

**v1.7 design constraints (from CLAUDE.md + prototype integration):**

- SSR chrome (header/footer) is static — do NOT reintroduce destructive `View.setLanguage` innerHTML rewrites
- `View.js` is Parcel-bundled: any changes require `npm run build` in `/frontend` + backend restart
- `homepage.js` is served raw via `GET /js/homepage.js` (not bundled) — edits take effect immediately without a build step
- Chrome changes must work bilingually: EN (`/en`) and HE (`/he`) with RTL styling

**v1.7 file map by workstream:**

- HEADER: `backend/views/partials/header.ejs`, `frontend/css/homepage.css`
- CURR: `frontend/js/homepage.js` (remove hardcoded ILS), `frontend/js/View.js` (initCurrencyPersistence, `currency-changed` listener), `frontend/js/Views/cartView.js` (`_getCurrencySymbol`, `_getItemPrice`)
- FOOT: `backend/views/partials/footer.ejs` (+ scoped CSS in `homepage.css`)
- NAV: `backend/views/partials/header.ejs` + CSS breakpoint rules + small JS toggle (non-destructive)
- [Phase ?]: Phase 40-01: D-05 verify-then-fix fired — category prices reverted to SSR language-default on reload/nav; fixed via a guarded one-time displayProducts() re-render in categoriesView.initialSetup()
- [Phase ?]: Phase 40-01: GeoIP first-load selector/storage desync fixed inline in locale.js (value-only syncCurrencySelectors after the override) instead of importing heavy View.js, keeping the early bootstrap load-order-independent
- [Phase 40.1]: Plan 01: dedicated global featuredOrder field (D-01), displayOrder NOT reused; featuredOrder auto-defaults to end-of-list via global pre-save hook (D-09) with NaN-safe coercion storing null never NaN
- [Phase ?]: Plan 40.1-02: homepage Featured grid server-rendered from real data — renderHomePage queries top 8 in-stock featured products by featuredOrder (D-02/D-03); home.ejs renders dual-price data-* .tk-prod cards with length-guarded empty-state band (D-04) and discount-only Sale badge (D-07); homepage.js hydration deferred to Plan 04.
- [Phase ?]: Plan 40.1-03: Admin featured toggle UI (D-09) in add/edit forms; >8 soft note (D-10) from state.products; edit path appends featured fields to multipart FormData
- [Phase ?]: Plan 40.1-04: homepage.js hydrates the SSR featured grid in localStorage.currency (CURR-03) and re-prices the grid + demo cart drawer on 'currency-changed'; featured cards navigate to /{lang}/product/{slug} (D-06); cart lines store dual usd/ils prices (D-08), full model.js cart deferred to Phase 43

### Pending Todos

- Plan Phase 39 next (`/gsd-plan-phase 39`)
- Phase 40 note: `currency-changed` event is currently broken (calls non-existent `this._render()` — existing tech debt); fix must be part of CURR wiring

### Blockers/Concerns

- Product slugs not populated in production database (pre-existing; migration script exists, needs manual run)
- SCHEMA-02: Migration script not executed (runtime normalization covers functionality)
- `currency-changed` event handler bug in View.js (calls non-existent `this._render()`) — must be resolved in Phase 40

## Session Continuity

Last session: 2026-06-25T20:30:43.273Z
Stopped at: Phase 42 UI-SPEC approved
Resume: `/gsd-plan-phase 39` to plan Phase 39 (Header Utilities Layout)

## Quick Tasks Completed

Quick tasks are maintenance/bug fixes separate from planned phases:

1. **quick-001** (2026-02-08): Fixed error handling in addToUserStorage and createLocalStorage
   - Added .catch() for network errors, try-catch for storage quota
   - Commits: bfa6d54 (fix), 667d621 (test)
   - Summary: .planning/quick/001-fix-error-handling-bugs-in-model-js-add/001-SUMMARY.md
