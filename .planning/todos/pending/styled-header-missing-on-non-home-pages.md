---
id: todo-styled-header-missing-non-home
type: bug
status: pending
priority: high
created: "2026-06-24"
source: 39-HUMAN-UAT.md (Phase 39 human verification, item 2)
tags: [header, ssr, chrome, css, rollout]
resolves_phase: null
---

# Styled `.tk-nav` header missing on non-home SSR pages

## Problem

The redesigned prototype header (`<header class="tk-nav ...">`) renders correctly
on the homepage (`/en`, `/he`) but is **missing / unstyled on other SSR pages**
(observed on `/en/necklaces`; likely all of: category, product, cart, about,
contact, workshop, policies, 404, error).

All those pages **do** `include('../partials/header', { lang, dir, urlLang })`
(confirmed in `backend/views/pages/*.ejs`), so the markup is emitted — but the
header is not visible/styled there.

## Most likely cause

`frontend/css/homepage.css` (which defines every `.tk-nav*` rule, including
`.tk-nav { height: var(--tk-header-height) }`) is only linked on `home.ejs`.
On other pages the `.tk-nav` markup exists with **no styles**, so it collapses /
looks broken. Either the stylesheet link is homepage-only, or an older header
stylesheet conflicts. Confirm by viewing source on `/en/necklaces` and checking
which CSS files load.

## Scope / why it's tracked separately

NOT a Phase 39 regression. Phase 39 (Header Utilities Layout) only edited header
CSS rules + currency labels + flag a11y; it never changed which pages link
`homepage.css`. This is a pre-existing global-chrome **rollout** gap.

## Suggested fix

Link the chrome stylesheet (`homepage.css` + `tokens.css`) site-wide — likely
in the shared layout/meta-tags partial (`backend/views/partials/meta-tags.ejs`
or `backend/views/layouts/main.ejs`) rather than per-page — so `.tk-nav` (and
the footer chrome) are styled on every SSR page. Verify the dark currency
chevron on a solid nav while there (Phase 39 UAT item 2 was blocked on this).

## Acceptance

- `/en/necklaces` (and other non-home pages) render the styled `.tk-nav` header
  identical to the homepage's solid-nav variant.
- Currency `<select>` shows the dark (#666666) chevron on the solid nav.
- Footer chrome likewise styled site-wide (check while fixing).
- No double-header / conflicting old-header artifacts.
