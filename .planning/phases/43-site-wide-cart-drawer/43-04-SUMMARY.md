---
phase: 43-site-wide-cart-drawer
plan: "04"
subsystem: cart-drawer
tags: [cart, drawer, auto-open, homepage, categories, model, event-driven, d-04, d-09]

dependency_graph:
  requires:
    - 43-03: _bindCartDrawer / _renderCartDrawer in View.js
    - 43-02: model.handleAddToCart / model.cart mutators
  provides:
    - cart:item-added: global CustomEvent contract wiring auto-open on every page
    - window.tkAddToCart: global hook bridging homepage.js IIFE to bundled model
    - _openCartDrawer: shared open method on base View class
  affects:
    - frontend/js/View.js
    - frontend/js/homepage.js
    - frontend/js/Views/categoriesView.js

tech_stack:
  added: []
  patterns:
    - "cart:item-added CustomEvent contract — zero-payload same-origin signal; dispatcher fires and forgets, listener re-renders + opens"
    - "_cartAddedBound idempotency guard — prevents duplicate listeners on language toggle"
    - "window.tkAddToCart global hook — bridge between plain IIFE script and bundled ES module model"
    - "_openCartDrawer() extracted shared method — single open-state implementation used by both icon-click and auto-open"
    - "Dispatch in success path only — catch blocks never dispatch cart:item-added (no phantom drawer opens on failure)"

key_files:
  created: []
  modified:
    - frontend/js/View.js
    - frontend/js/homepage.js
    - frontend/js/Views/categoriesView.js

decisions:
  - "_openCartDrawer() extracted as class method: avoids duplicating the open-state logic between the icon-click open() closure and the cart:item-added listener; both call the same method"
  - "window.tkAddToCart passes the .tk-prod card element directly to model.handleAddToCart: no wrapper shim needed — model reads data-id, data-name-en, data-name-he, data-usd-price, data-ils-price from the card; data-quant defaults to +null=0 (stored stock qty), data-currency defaults to 'ils' (does not affect drawer rendering which uses usdPrice/ilsPrice directly)"
  - "cart:item-added dispatch in addToCart(e) placed INSIDE try block after await: ensures dispatch only fires on success; the catch block does not return, so placement inside try is the only way to gate on success"
  - "cart:item-added dispatch in modal path placed AFTER the try/catch block: catch always returns early on error, so post-try/catch code is unambiguously the success path"
  - "renderProducts() kept in homepage.js currency-changed listener: home grid price hydration is home-only; View.js handles the drawer re-price separately via its own currency-changed subscriber"
  - "getCurrency/symbol/money helpers retained in homepage.js: renderProducts + priceHTML still need local currency reading for grid price display; the plan's retire intent was cart-drawer usage, not grid hydration utilities"

metrics:
  duration: "~15 minutes"
  completed: "2026-06-28"
  tasks_completed: 3
  tasks_total: 3
  files_created: 0
  files_modified: 3
---

# Phase 43 Plan 04: Auto-open on Add-to-Cart + Demo Cart Retirement Summary

**One-liner:** `cart:item-added` CustomEvent wired from every Add-to-Cart entry point (homepage featured grid, category cards, product/modal) to a single View.js listener that re-renders and auto-opens the global drawer (D-04), and the homepage demo cart fully retired so only one drawer implementation runs on any page.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add cart:item-added auto-open listener + _openCartDrawer + window.tkAddToCart to View.js | a84ad88 | frontend/js/View.js |
| 2 | Retire homepage.js demo cart and re-point featured Add-to-Cart at real model | e2012da | frontend/js/homepage.js |
| 3 | Dispatch cart:item-added from category card + modal Add-to-Cart paths | 3896d21 | frontend/js/Views/categoriesView.js |

## What Was Built

### View.js (MODIFIED — 39 lines net added)

**`_openCartDrawer()` (new method):**
- Queries `#tk-overlay`, `#tk-drawer`, `#tk-cart-close` fresh each call
- Guards: returns if elements missing, no-ops if already open (idempotent)
- Sets `is-open` on both overlay and drawer, locks body scroll, focuses close button via `requestAnimationFrame`
- Used by both the icon-click `open()` closure in `_bindCartDrawer()` and the `cart:item-added` listener

**`cart:item-added` listener (inside `_bindCartDrawer()`):**
- Registered once per page with `_cartAddedBound` idempotency guard (survives language toggle)
- On event: calls `_renderCartDrawer()` then `_openCartDrawer()` — re-renders drawer with new item, then opens if not already open
- Satisfies D-04 for all entry points that dispatch the event

**`window.tkAddToCart` global hook (inside `_bindCartDrawer()`):**
- Registered once (`if (!window.tkAddToCart)`) — bridge for homepage.js plain IIFE which cannot `import` model
- `(el) => model.handleAddToCart(el).then(() => window.dispatchEvent(new CustomEvent('cart:item-added')))`
- Calls the real `model.handleAddToCart` (same path category pages use) then dispatches `cart:item-added` to trigger auto-open
- T-43-10 mitigation: adds no new privileged capability; just forwards to existing model path

**`open()` closure refactored:**
- Now calls `this._renderCartDrawer()` then `this._openCartDrawer()` — same behavior, no duplication

### homepage.js (REWRITTEN — 126 lines removed, 22 added)

**Removed (demo cart machinery):**
- `let cart = []` demo array
- `addToCart(id)` / `removeItem(id)` / `renderCart()` demo functions (~78 lines)
- `openCart()` / `closeCart()` (~8 lines)
- `el()` DOM helper (only used by renderCart)
- `renderCart()` call in `init()`
- `renderCart()` call in `currency-changed` listener
- `#tk-cart-open`, `#tk-cart-close`, `#tk-overlay` click bindings
- `#tk-checkout` "Checkout — coming soon" flash
- Escape → `closeCart()` binding

**Re-pointed featured Add-to-Cart:**
```js
grid.querySelectorAll('.tk-prod__add').forEach(function (btn) {
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    const card = btn.closest('.tk-prod');
    if (window.tkAddToCart) { window.tkAddToCart(card); }
  });
});
```

**Retained (home-only, unchanged):**
- `getCurrency` / `symbol` / `money` / `priceHTML` — still needed by `renderProducts` grid hydration
- `renderProducts()` — price hydration for `.tk-prod` cards
- `renderProducts()` in `currency-changed` listener (grid re-price only; drawer re-price owned by View.js)
- `flash()` toast, `scrollToShop()`, `onNavigate()`, `[data-nav]`/`[data-category]` handlers
- Newsletter form, hero CTA, card-click navigation

### categoriesView.js (MODIFIED — 5 lines added)

**`addToCart(e)` — card Add-to-Cart:**
```js
try {
  await model.handleAddToCart(item);
  window.dispatchEvent(new CustomEvent('cart:item-added')); // D-04
} catch (err) { ... }
```

**Modal Add-to-Cart:**
```js
// catch block returns early on error — post-try/catch is success path
window.dispatchEvent(new CustomEvent('cart:item-added')); // D-04

// Update button text on success
if (addToCartBtn) { ... }
```

Both dispatches fire only in the success path. `increaseCartNumber()` calls and "Added"/"Failed" button label UX preserved.

## Requirements Satisfied

| Req | Description | Status |
|-----|-------------|--------|
| D-04 | Adding from any entry point auto-opens global drawer | DONE — homepage grid, category cards, product/modal all dispatch cart:item-added → View.js auto-opens |
| D-09 | Real model.cart data (dual usd/ils prices) drives drawer | DONE — homepage now uses model.handleAddToCart via window.tkAddToCart; drawer renders from model.cart |

## Deviations from Plan

None — plan executed exactly as written. `_openCartDrawer()` extracted as the plan recommended ("Prefer extracting the open() body ... Either approach is fine"). The decision to keep `getCurrency/symbol/money` in homepage.js (for `renderProducts`) is aligned with the plan's intent (those functions were to be retired from CART rendering, which is done; grid hydration still needs local currency reading).

## Known Stubs

None introduced by this plan. Pre-existing "coming soon" flashes in `homepage.js` (`onNavigate`, category tiles) remain — they are not cart-related and out of scope.

## Threat Model Coverage

| Threat ID | Mitigation Applied |
|-----------|--------------------|
| T-43-01 (XSS via product fields) | `window.tkAddToCart` forwards card element to `model.handleAddToCart` which writes name/image via `textContent`/`setAttribute` (Plan 03 mitigation continues to apply) |
| T-43-09 (cart:item-added spoofing) | Accepted — same-origin no-payload event; worst case is an extra re-render + open |
| T-43-10 (window.tkAddToCart tampering) | Mitigated — hook only forwards to existing `model.handleAddToCart` path with no additional privilege |

## Build Note

**Frontend build (`npm run build`) must be run in the main repo** after this worktree is merged. `homepage.js` is served raw (no build needed for its changes), but `View.js` and `categoriesView.js` are bundled by Parcel. Backend must be restarted after build to pick up new bundle hash (CLAUDE.md). `homepage.js` changes take effect on page reload without a build.

## Self-Check: PASSED

- FOUND: `frontend/js/View.js` modified (a84ad88)
- FOUND: `frontend/js/homepage.js` modified (e2012da)
- FOUND: `frontend/js/Views/categoriesView.js` modified (3896d21)
- VERIFIED: `grep -c 'cart:item-added' frontend/js/View.js` = 4
- VERIFIED: `grep -c '_openCartDrawer' frontend/js/View.js` = 3
- VERIFIED: `grep -c 'tkAddToCart' frontend/js/View.js` = 3
- VERIFIED: `grep -c 'function renderCart' frontend/js/homepage.js` = 0
- VERIFIED: `grep -c 'let cart' frontend/js/homepage.js` = 0
- VERIFIED: `grep -c 'function openCart\|function closeCart' frontend/js/homepage.js` = 0
- VERIFIED: `grep -c 'tk-cart-open' frontend/js/homepage.js` = 0
- VERIFIED: `grep -q 'tkAddToCart' frontend/js/homepage.js` = FOUND
- VERIFIED: `grep -c 'cart:item-added' frontend/js/Views/categoriesView.js` = 2 (both in success paths)
- VERIFIED: `grep -q 'increaseCartNumber' frontend/js/Views/categoriesView.js` = FOUND (preserved)
