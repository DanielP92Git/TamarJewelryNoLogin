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

### Status by page
- **Category** (`categories-800plus.css` / `categories-devices.css`): **FIXED 2026-06-24**
  — removed the stale `header {}` hero + `body#categories.* header` background rules
  during Phase 40 execution (blocker for currency-selector testing).
- **Product, cart, about, contact, workshop, policies**: likely the SAME pattern in
  their own page CSS (`product`/`cart`/`about-*`/`contact-me-*`/`jewelry-workshop-*`/
  `policies-*`.css). Each needs a per-file audit for old `header { ... background-image }`
  rules and the same removal. **STILL PENDING.**

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
