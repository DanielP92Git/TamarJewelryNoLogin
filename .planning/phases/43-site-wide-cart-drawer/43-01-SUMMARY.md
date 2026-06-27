---
phase: 43-site-wide-cart-drawer
plan: "01"
subsystem: cart-drawer
tags: [ejs-partial, css, rtl, site-wide-chrome, cart]
dependency_graph:
  requires: []
  provides: [cart-drawer-markup-contract, rtl-mirror-css, qty-stepper-css, empty-state-css]
  affects: [backend/views/partials/footer.ejs, backend/views/pages/home.ejs, frontend/css/homepage.css]
tech_stack:
  added: []
  patterns: [ssr-static-chrome, ejs-partial-include, rtl-mirror, tk-namespace-scoping]
key_files:
  created:
    - backend/views/partials/cart-drawer.ejs
  modified:
    - backend/views/partials/footer.ejs
    - backend/views/pages/home.ejs
    - frontend/css/homepage.css
decisions:
  - "Drawer included via footer.ejs tail (not header.ejs) so all 10 page call-sites inherit it automatically without touching individual page templates"
  - "Defensive _urlLang guard in both cart-drawer.ejs and the footer include call to handle pages that do not forward urlLang"
  - "Empty-state uses hidden attribute (browser-native; Plan 03 toggles it) rather than a CSS class to avoid flash of visible empty state before JS hydrates"
  - "[dir=rtl] .tk-drawer mirrors to left with box-shadow flipped; no !important added"
metrics:
  duration: "~12 minutes"
  completed: "2026-06-28"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 3
---

# Phase 43 Plan 01: Global Cart-Drawer Partial + Site-wide CSS Summary

**One-liner:** SSR-static `cart-drawer.ejs` partial with bilingual D-01/D-02/D-10 contract moved out of `home.ejs` into a single global footer include, with RTL mirror, quantity-stepper, and empty-state CSS.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create global cart-drawer EJS partial | 3ae04d5 | backend/views/partials/cart-drawer.ejs (created) |
| 2 | Include drawer globally via footer.ejs; remove inline home.ejs block | a4d04fd | backend/views/partials/footer.ejs, backend/views/pages/home.ejs |
| 3 | Harden drawer CSS — RTL mirror, qty-stepper, empty-state | 206fd04 | frontend/css/homepage.css |

## What Was Built

### cart-drawer.ejs (NEW)
Global SSR-static partial included on every page via footer.ejs. Contains:
- `#tk-overlay` + `#tk-drawer` with full bilingual chrome (Shopping Cart / עגלת קניות)
- `#tk-cart-close` close button
- `#tk-drawer-body` with `#tk-cart-empty` (D-10 empty-state, `hidden` by default), bilingual "Your cart is empty" / "העגלה שלך ריקה" and `#tk-cart-continue` "Continue shopping" / "המשך בקנייה"
- `#tk-checkout` CTA with `data-cart-url="/<%= _urlLang %>/cart"` (D-01/D-02), ships `disabled`
- Defensive `_urlLang` guard for pages that omit `urlLang`

### footer.ejs (MODIFIED)
Tail include: `<%- include('cart-drawer', { lang, urlLang: ... }) %>` — all 10 page templates inherit the drawer automatically.

### home.ejs (MODIFIED)
Inline drawer block (formerly lines 228–241) removed. No duplicate `#tk-drawer`/`#tk-overlay` ids on the homepage.

### homepage.css (MODIFIED — site-wide)
Added three CSS blocks after the existing `.tk-drawer__note` rule:
1. **RTL mirror** — `[dir="rtl"] .tk-drawer { right: auto; left: 0; box-shadow: 8px 0 30px ...; transform: translateX(-100%) }` + `.is-open` reset
2. **Quantity-stepper contract** — `.tk-line__qty` (flex row), `.tk-line__qty-btn` (26×26 border square, hover + disabled states), `.tk-line__qty-val` (centered display)
3. **Empty-state** — `.tk-drawer__empty` flex-column layout; `#tk-cart-continue` ghost button styled to match the tk-btn system

No `!important` introduced. All new selectors under the `tk-` namespace.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. This plan is markup + CSS only. The drawer body is intentionally empty (lines injected by Plan 03's JS). The `#tk-checkout` button ships `disabled` by design — Plan 03 enables it based on cart state.

## Threat Flags

No new threat surface introduced. EJS only interpolates `_urlLang` (constrained to `'en'`/`'he'`) and literal bilingual strings — no user data in this plan (T-43-01 / T-43-02 mitigations applied as planned).

## Self-Check: PASSED

- FOUND: backend/views/partials/cart-drawer.ejs
- FOUND: backend/views/partials/footer.ejs (modified)
- FOUND: backend/views/pages/home.ejs (modified)
- FOUND: frontend/css/homepage.css (modified)
- FOUND commit: 3ae04d5 (Task 1)
- FOUND commit: a4d04fd (Task 2)
- FOUND commit: 206fd04 (Task 3)
