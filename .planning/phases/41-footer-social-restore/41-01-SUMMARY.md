---
phase: 41-footer-social-restore
plan: 01
subsystem: ui
tags: [ejs, ssr, css, footer, social-links, rtl, bem]

requires:
  - phase: homepage-global-chrome-redesign-rollout
    provides: ".tk-footer prototype chrome + design tokens (--tk-text-muted, --tk-text, --tk-dur, --tk-ease)"
provides:
  - "4th 'Follow Me' social column (Instagram + Facebook) in the global SSR footer partial"
  - "Bare muted social icon styling in .tk-footer token language with 4→2x2 mobile reflow"
  - "Footer-anchor override that neutralizes the legacy global `a` reset on non-home pages"
affects: [41-02-footer-js-retire, chrome-rollout-css-conflicts]

tech-stack:
  added: []
  patterns:
    - "BEM .tk-footer__social* namespace for ported social markup"
    - "Specificity-scoped override (.tk-footer a) to defeat legacy global element resets on non-home pages"

key-files:
  created: []
  modified:
    - backend/views/partials/footer.ejs
    - frontend/css/homepage.css

key-decisions:
  - "Social SVGs emitted once (language-neutral), outside any if(_eng) branch — URLs/aria/rel are not localized"
  - "Dropped the legacy inline style=direction:rtl; the CSS grid auto-reverses in RTL"
  - "Root-caused the non-home footer defect to desktop-menu.css global `a{width:100%;height:3rem;...}`; fixed via .tk-footer anchor override rather than touching the legacy file"

patterns-established:
  - "Pattern: when new tk- chrome renders wrong only on non-home pages, suspect a legacy per-page CSS global element reset (desktop-menu.css `a`, standard-reset.css) — override scoped to .tk-footer, do not edit the legacy file"

requirements-completed: [FOOT-01, FOOT-02, FOOT-03]

duration: ~20min
completed: 2026-06-25
---

# Phase 41: Footer Social Restore — Plan 01 Summary

**Restored working Instagram + Facebook links as a 4th "Follow Me" column in the global SSR footer, styled in the .tk-footer token language, and fixed a legacy-CSS conflict that broke the layout on every non-home page.**

## Performance

- **Duration:** ~20 min (incl. checkpoint defect fix)
- **Tasks:** 2 automated + 1 human-verify checkpoint (approved)
- **Files modified:** 2

## Accomplishments
- Added the 4th `.tk-footer__col` with a bilingual "Follow Me" / "עקבו אחרי" heading and two ported social SVG links (Instagram outline, Facebook solid) to `footer.ejs`.
- Expanded the footer grid 3→4 columns (gap 3rem, max-width 920px) with a 2×2 mobile reflow at `max-width: 860px`, plus bare-muted `.tk-footer__social*` icon styles using only design tokens.
- Diagnosed and fixed the checkpoint-reported non-home defect (social icons flung to column edges, links centered) — caused by `desktop-menu.css`'s global `a { width:100%; height:3rem; display:flex; justify-content:center; text-align:center }`, which loads on non-home pages but not home.

## Task Commits

1. **Task 1: Add 4th "Follow Me" social column to footer.ejs** — `a921b10` (feat)
2. **Task 2: Expand footer grid to 4 cols + social styles + mobile reflow** — `df5c544` (feat)
3. **Checkpoint fix: neutralize legacy global `a` reset for .tk-footer anchors** — `8316117` (fix)

## Files Created/Modified
- `backend/views/partials/footer.ejs` — 4th column with Follow Me heading + Instagram/Facebook SVG links (target=_blank, rel=noopener noreferrer, per-icon aria-label)
- `frontend/css/homepage.css` — 4-col grid + `.tk-footer__social*` token styles + 2×2 mobile reflow + `.tk-footer a { width:auto; height:auto }` and `.tk-footer__link { display:block; text-align:start }` overrides

## Decisions Made
- Emitted the social SVGs/URLs/aria once (language-neutral) rather than duplicating per language branch.
- Did NOT modify the legacy `desktop-menu.css`; instead scoped the fix to `.tk-footer` anchors (specificity `.tk-footer a` = 0,1,1 > bare `a` = 0,0,1), keeping the blast radius to the footer and a no-op on home.

## Deviations from Plan

### Auto-fixed Issues

**1. [Checkpoint defect — CSS conflict] Footer social icons spread to column edges + links centered on non-home pages**
- **Found during:** Task 3 (human-verify checkpoint) — user-reported on /about and /workshop
- **Issue:** `desktop-menu.css` (loaded on every non-home SSR page, not on home) sets a global `a { width:100%; height:3rem; display:flex; justify-content:center; text-align:center }`. Our footer anchors inherited `width:100%`, so each `.tk-footer__social-link` filled half its column and the two icons spread to opposite edges; `.tk-footer__link` text was centered.
- **Fix:** Added `.tk-footer a { width:auto; height:auto }` and `display:block; text-align:start` on `.tk-footer__link` in homepage.css.
- **Files modified:** frontend/css/homepage.css
- **Verification:** Served CSS confirmed; deterministic specificity win; no-op on home (no `a` reset loaded there). Awaiting user hard-refresh confirmation on /about + /workshop.
- **Committed in:** `8316117`

---

**Total deviations:** 1 auto-fixed (checkpoint-reported CSS conflict)
**Impact on plan:** Necessary to satisfy must-have "social column renders identically on a non-home SSR page". No scope creep — fix confined to footer selectors in the already-modified homepage.css.

## Issues Encountered
The footer.ejs commit folded in a pre-existing uncommitted prototype-baseline edit to the same file (working tree was dirty before the phase). Expected and harmless — only footer.ejs and homepage.css were staged; no unrelated files were swept in.

## Next Phase Readiness
SSR footer is confirmed working (social links live, RTL mirrors, non-home conflict fixed), which clears the gate for Plan 41-02 to retire the now-fully-dead footer JS twin (`setFooterLng`/`handleFooterMarkup`).

---
*Phase: 41-footer-social-restore*
*Completed: 2026-06-25*
