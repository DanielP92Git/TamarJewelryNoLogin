---
id: todo-site-wide-cart-drawer
type: feature
status: pending
priority: high
created: "2026-06-25"
source: Phase 40 execution — user request (planned as its own phase, e.g. Phase 41)
tags: [cart, drawer, chrome, rollout, dual-render, currency]
resolves_phase: null
---

# Site-wide cart drawer (mini-cart) across all pages

## What the user wants

A slide-out cart drawer (mini-cart) that opens from the nav cart icon on **every**
page (not just the homepage), showing real cart line items + subtotal. The drawer's
primary CTA ("View cart" / "Checkout") navigates to the full `/cart` page for review
and payment. Confirmed as a standard real-world e-commerce pattern.

## Current state (why it doesn't work site-wide today)

- The drawer markup (`#tk-drawer`, `#tk-overlay`) exists **only** in `home.ejs:165-176`.
- Open/close + rendering is wired **only** in `frontend/js/homepage.js` (`openCart()`
  at :122, bound to `#tk-cart-open` at :160). Its `renderCart()` is **demo code**
  using its own localStorage demo data — NOT the real cart in `frontend/js/model.js`.
- On non-home pages the nav cart is `<a href="/{lang}/cart">` (header.ejs:50) and is
  *intended* to route to `/cart` when this script is absent (see homepage.js:155-157
  comment). So today: homepage = demo drawer; other pages = navigate to `/cart`.

## Implementation outline (its own phase: discuss → plan → execute)

1. **Markup → global partial.** Move/clone the drawer + overlay into a global partial
   (e.g. `partials/cart-drawer.ejs`) included on every page (like header/footer), or
   inject via the global `View.js`. Keep RTL/Hebrew labels.
2. **Wiring → global.** Move open/close out of `homepage.js` into the base
   `frontend/js/View.js` (which already owns global chrome) so `#tk-cart-open` opens the
   drawer on all pages. Per the SSR + Client Dual-Render rule in CLAUDE.md, ensure the
   client view doesn't get clobbered on load / language toggle.
3. **Real cart data.** Render the drawer from `model.js` (real cart state), reusing
   `cartView.js` rendering/helpers — NOT the homepage demo `renderCart()`. Wire
   add/remove + the `#tk-cart-count` badge.
4. **Currency.** Drawer prices must honor the Phase 40 currency wiring (`currency-changed`
   + persisted currency + `_getCurrentCurrency()`); re-price live and on open. This is the
   direct continuation of Phase 40.
5. **CTA.** Drawer "View cart / Checkout" button → `/{lang}/cart` (language-aware path,
   per CLAUDE.md payment-URL notes). Consider the common two-button pattern (View cart
   → /cart, Checkout → payment) vs the user's single button — confirm in discuss.
6. **Mobile + a11y.** Drawer behavior on <800px, focus trap, close on overlay/Esc.

## Acceptance

- Cart icon opens the drawer on home, category, product, cart, about, contact, etc.
- Drawer shows real cart items + subtotal in the active/persisted currency.
- CTA navigates to `/{lang}/cart`.
- Survives client hydration + language toggle; cart-count badge stays in sync.
- Works on mobile + RTL.
