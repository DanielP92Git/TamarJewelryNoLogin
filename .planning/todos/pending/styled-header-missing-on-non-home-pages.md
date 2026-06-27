---
id: todo-styled-header-missing-non-home
type: bug
status: resolved
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

## Root cause (CONFIRMED 2026-06-24)

The original hypothesis (homepage.css linked only on home.ejs) was **wrong**.
`buildPageData()` in `backend/routes/ssr.js:34` appends `homepage.css` to **every**
page, and `/en/necklaces` source confirms `homepage.css` + `tokens.css` both load
and `.tk-nav` markup is emitted correctly.

The real cause is a **CSS conflict**: each page's pre-redesign page stylesheet still
carries old `header { height: 90vh/30%; background-image: <hero> }` rules from when
`<header>` WAS a full-height hero banner. Those rules (esp. the high-specificity
`body#categories.<cat> header { background-image }`) hijack the new `.tk-nav`
element, stretching it into a full-screen photo banner and burying the nav.

There were TWO independent legacy-CSS conflicts:

**(1) Per-page hero `header {}` rules** (category-only so far): old
`header { height: 90vh/30%; background-image: <category hero> }` stretched the
new nav into a full-screen photo. Fixed for category (see Status below).

**(2) `desktop-menu.css` bare `a { width: 100%; display: flex }`** (lines 55–61) —
this is the SYSTEMIC cause across ALL non-home pages. `desktop-menu.css` is loaded
on category/product/cart/about/contact/workshop/policies (NOT homepage) and its
bare `a` rule forces every nav `<a>` (logo, links, cart) to full width, blowing the
nav apart and overflowing the page horizontally. **Fixed site-wide 2026-06-24** by
adding `.tk-nav a { width: auto; }` to `homepage.css` (linked on every page; scoped
to `.tk-nav` so product-card / footer links are untouched; no-op on homepage).

### Status by page
- **Category** (`categories-800plus.css` / `categories-devices.css`): **FIXED 2026-06-24**
  — removed the stale `header {}` hero + `body#categories.* header` background rules
  (cause 1), AND the `.tk-nav a` guard fixes the nav overflow (cause 2). Verified
  during Phase 40 execution.
- **About, contact, workshop, cart**: **FIXED 2026-06-28** — removed bare `header { display:flex; flex-flow:column; ... }` blocks from `about-800plus.css`, `about-devices.css`, `contact-me-devices.css`, `jewelry-workshop-800plus.css`, `jewelry-workshop-devices.css`, `cart-devices.css`, `cart-800plus.css`. No background-image rules existed in these files.
- **Product, policies**: no bare `header {}` rules found — already clean.

## Scope / why it's tracked separately

NOT a Phase 39 regression. Phase 39 (Header Utilities Layout) only edited header
CSS rules + currency labels + flag a11y; it never changed which pages link
`homepage.css`. This is a pre-existing global-chrome **rollout** gap.

## Suggested fix (remaining pages)

For each remaining non-home page, audit its page stylesheet(s) for legacy
`header { ... }` hero rules (height/background-image/background-size:cover) and
remove them so the new `.tk-nav` renders as the slim bar (mirroring the category
fix). homepage.css already styles `.tk-nav` site-wide — the work is purely
*deleting* conflicting old rules, not adding stylesheet links.

## Acceptance

- `/en/necklaces` renders the styled slim `.tk-nav` header identical to the
  homepage's solid-nav variant. **(category: done)**
- Product, cart, about, contact, workshop, policies likewise render the slim nav.
- Currency `<select>` shows the dark (#666666) chevron on the solid nav.
- Footer chrome likewise styled site-wide (check while fixing).
- No double-header / conflicting old-header artifacts.
