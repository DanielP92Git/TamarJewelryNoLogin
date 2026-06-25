---
id: todo-featured-grid-review-followups
type: tech-debt
status: pending
priority: medium
created: "2026-06-25"
source: Phase 40.1 code review (40.1-REVIEW.md) — deferred findings
tags: [homepage, featured-grid, i18n, cache, code-review, ssr]
resolves_phase: null
---

# Phase 40.1 featured-grid — deferred code-review findings

The Phase 40.1 code review (`.planning/phases/40.1-homepage-featured-products/40.1-REVIEW.md`)
raised findings beyond the blocker (CR-01) and the cart XSS (WR-01), both of which were
fixed in-phase (commits `1d0baf7`, `b5afb49`). The items below were deferred — none block
the phase goal, but they are unowned by any planned phase, so they are tracked here.

## Warnings

- **WR-02 — Hebrew localization gaps:**
  - The SSR featured grid's "Sale" badge text is hardcoded English in `home.ejs` — should
    localize for `/he`. **Not covered by any planned phase.**
  - The demo cart drawer line name prefers `nameEn` regardless of locale, so the Hebrew cart
    shows English names. **Likely superseded by Phase 43** (Site-wide Cart Drawer) when the
    homepage demo drawer is replaced with the real `model.js` cart — confirm during that phase.
- **WR-03 — empty-slug clickability:** featured cards with an empty `slug` (possible for
  Hebrew-only product names per CLAUDE.md) render but are silently non-clickable, with no
  `id`-route fallback. Add a fallback link target or filter such products from the grid.

## Info

- **IN-01:** `data-images` JSON is emitted on homepage featured cards but never consumed by
  `homepage.js` — dead payload; remove from `home.ejs` or wire a consumer.
- **IN-02:** `invalidateHomePage()` fires on every product add/update, even for non-featured
  products. Gate the add/edit invalidation on `isFeatured` (as the delete + legacy-edit paths
  already do after the CR-01 fix) to avoid needless homepage cache churn.
- **IN-03:** `featuredOrder` is non-unique, so ties are broken nondeterministically under
  `.limit(8)`. Consider a stable secondary sort key (e.g. `createdAt` or `id`) in the SSR query.
- **IN-04:** Redundant compound id comparison in the admin featured-count filter (added in the
  7b reactive-note tweak). Cosmetic; collapse to a single id check.

## How to action

Run `/gsd-code-review-fix 40.1` to auto-apply, or fold the i18n items (WR-02 badge, WR-03)
into the next homepage/i18n touch. Re-confirm the cart-name half (WR-02) is resolved when
Phase 43 lands the real cart drawer.
