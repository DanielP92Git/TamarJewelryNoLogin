---
id: todo-category-hero-banner-new-chrome
type: enhancement
status: pending
priority: medium
created: "2026-06-24"
source: Phase 40 execution — user decision (split: slim nav now, hero later)
tags: [header, chrome, css, category, hero, design, rollout]
resolves_phase: null
---

# Per-category hero banner under the new global chrome

## Context

During Phase 40 (currency-selector wiring) the category page's stale hero CSS was
removed to unblock the slim `.tk-nav` bar (see
`styled-header-missing-on-non-home-pages.md`). The user explicitly chose to **split**
the work: ship the slim-nav fix immediately, and bring the per-category hero photos
back as this follow-up.

The category hero images themselves still exist and are still referenced nowhere now
that the CSS was removed, e.g.:
- `frontend/imgs/Hero-imgs/categories-images/new-hero-imgs/Necklaces-Hero.webp`
- `.../Hoop-Hero.webp`, `.../Dangle-Hero.webp`, `.../Crochet-Hero.webp`
- `frontend/imgs/Hero-imgs/shalom-club-hero.webp`, `frontend/imgs/website-images/bracelets/B3.jpg`
- `frontend/imgs/Hero-imgs/IMG_0173.jpg` (unisex)

## Goal

Reintroduce a proper per-category hero banner **as its own element** (NOT by styling
`<header>`), with the new `.tk-nav` overlaid on top (transparent variant, like the
homepage hero), then the `NECKLACES` title and product grid below.

## Implementation notes

1. **Markup** — add a hero element to `backend/views/pages/category.ejs` (between the
   `header` include and the `<main>`/title), e.g. `<section class="category-hero" ...>`
   carrying the category's hero image (data attr or inline `style="background-image"`
   keyed off `dbCategory`).
2. **Nav variant** — pass `heroNav: true` to the header include on category pages so
   `.tk-nav--transparent` is used and the nav overlays the hero (currently category
   passes only `{ lang, dir, urlLang }` → solid). Confirm currency chevron + flag
   contrast over a photo (Phase 39 used white text on transparent nav).
3. **CSS** — add scoped `.category-hero { ... background-size: cover; height: ... }`
   in `categories-800plus.css` / `categories-devices.css`. Do NOT reintroduce bare
   `header { height: 90vh }` — keep the nav and hero as separate elements.
4. **Dual-render** — mirror any hero markup/logic in `frontend/js/Views/categoriesView.js`
   per the SSR + Client Dual-Render rule in CLAUDE.md, or the client view will
   overwrite the SSR hero on load / language toggle.
5. **Map category → image** server-side (the EJS already knows `dbCategory` /
   `category` slug); reuse the slug→image mapping that the old CSS encoded.

## Acceptance

- Each category page shows its hero photo with the new `.tk-nav` overlaid (transparent),
  title + product grid below — on desktop and mobile.
- Survives client hydration and the in-page language toggle (no SSR overwrite).
- Currency selector + flags remain legible/usable over the hero photo.
