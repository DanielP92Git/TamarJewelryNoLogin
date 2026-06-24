---
status: passed
phase: 39-header-utilities-layout
source: [39-VERIFICATION.md]
started: "2026-06-24T00:00:00Z"
updated: "2026-06-24T00:00:00Z"
---

## Current Test

[complete — all items approved by user 2026-06-24]

## Tests

### 1. LTR header (/en) — flags + cluster order
expected: Two separate round flag icons (US + IL). Active language flag is full color; inactive flag is visibly dimmed (~0.4 opacity). NO gold/white ring on the active flag. Left-to-right order: Flags → Currency → Cart, with even spacing.
result: PASS — approved (2026-06-24)

### 2. Currency dropdown — custom chevron + labels
expected: Native OS arrow hidden; a single custom chevron on the right — dark (#666666) on the solid nav, white (#ffffff) over the hero (transparent nav). Options read `$ USD` and `₪ ILS`.
result: PASS (partial) — approved on the transparent/hero nav (white chevron, `$ USD`). Could NOT verify the dark chevron on a *solid* nav because the styled `.tk-nav` header does not render on non-home pages (e.g. /en/necklaces). Tracked separately — NOT a Phase 39 gap (Phase 39 did not change page↔stylesheet wiring; see Gaps).

### 3. RTL header (/he) — true mirror
expected: Utils cluster sits at the LEFT edge, order Cart → Currency → Flags. Cart count badge on the LEFT of the cart icon. Currency chevron on the LEFT. Nav links stay centered; TK logo stays at the right edge. Currency options still read `$ USD` / `₪ ILS`.
result: PASS — re-test approved (2026-06-24) after fix `74765fd`. UAT had found (a) only a partial mirror (cluster did not relocate to the left edge) and (b) the currency box was a different width on /en vs /he. Root cause: `<html dir="rtl">` already reverses flex rows natively, so the plan's explicit `flex-direction: row-reverse` on `.tk-nav`/`.tk-nav__utils` double-reversed and cancelled the mirror; width differed because the browser auto-sizes the `<select>` to its widest option, which differs by language. Fix: removed both row-reverse rules + pinned `width: 6.5rem`.

### 4. Currency label persistence (clarification)
expected: This is about the option LABELS, not a specific currency. Open the currency dropdown on /en and /he: the two real options must read `$ USD` and `₪ ILS` (not bare `USD`/`ILS` or Hebrew `דולר`/`שקל`), and they must STAY that way after the page settles (no flash-revert when View.js hydration runs). NOTE: View.js is Parcel-bundled, so the persistence guarantee only takes effect after `npm run build` (in /frontend) + backend restart. Until then the SSR labels are already correct; the build only protects against the hydration revert.
result: PASS — approved (2026-06-24). Labels read `$ USD` / `₪ ILS` and persist after hydration.

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- **Out-of-scope (not a Phase 39 gap):** The styled `.tk-nav` prototype header does not render on non-home SSR pages (e.g. /en/necklaces) even though those pages `include('../partials/header')`. Likely cause: `homepage.css` (which styles `.tk-nav`) is not linked on category/product/cart pages, or an older header conflicts. Phase 39 only edited header CSS/labels and did not touch which pages load `homepage.css`, so this is a pre-existing rollout gap — recommend a separate quick-task or a NAV-rollout phase to link the chrome stylesheet site-wide.
