---
phase: 43-site-wide-cart-drawer
plan: "03"
subsystem: cart-drawer
tags: [cart, drawer, view, site-wide, currency, rtl, quantity-stepper]

dependency_graph:
  requires:
    - 43-01: cart-drawer-markup-contract (EJS partial + CSS)
    - 43-02: increaseAmount / decreaseAmount mutators in model.js
  provides:
    - _bindCartDrawer: site-wide drawer open/close/dismissal on base View
    - _renderCartDrawer: real model.cart line rendering with currency/subtotal/badge
    - drawer currency/name helpers on base View class
  affects:
    - frontend/js/View.js

tech_stack:
  added: []
  patterns:
    - "Non-destructive SSR-chrome hydration (bind-only, no innerHTML rewrites)"
    - "Event delegation on #tk-drawer-body for stepper/remove (no per-render handler leak)"
    - "Double-bind guard (tkCartBound / tkEditBound dataset flags)"
    - "Currency helpers mirrored from cartView.js to base View class"

key_files:
  created: []
  modified:
    - frontend/js/View.js

decisions:
  - "Implemented Tasks 1-3 in a single commit: they are mutually referential (_bindCartDrawer calls _renderCartDrawer which is Task 2; editing delegation is Task 3) — intermediate states would not compile/run"
  - "No matchMedia(800px) auto-close on the cart drawer: unlike the mobile-only hamburger, the drawer is valid at all viewport widths; dismissal is only via ✕ / scrim / Esc / icon-toggle"
  - "Event delegation on #tk-drawer-body for +/−/remove: one listener survives re-renders without handler leaks"
  - "Both base class and modifier class on stepper buttons (tk-line__qty-btn tk-line__qty-btn--plus) to satisfy both CSS styling and JS delegation selector"
  - "footEl hide/show uses hidden attribute (matches Plan 01 empty-state convention)"
  - "Frontend build cannot run in worktree environment (shared source, no node_modules); noted for main-repo build gate post-merge"

metrics:
  duration: "~18 minutes"
  completed: "2026-06-28"
  tasks_completed: 3
  tasks_total: 3
  files_created: 0
  files_modified: 1
---

# Phase 43 Plan 03: Site-wide Cart Drawer Wiring Summary

**One-liner:** `_bindCartDrawer()` + `_renderCartDrawer()` + `_bindCartDrawerEditing()` added to base `View.js`, wiring the Plan 01 global drawer markup against real `model.cart` data with three-way dismissal, currency-aware pricing, quantity steppers, remove, and empty state — live on every page.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | _bindCartDrawer() + helpers + hydratePrototypeChrome call | b0a8a37 | frontend/js/View.js |
| 2 | _renderCartDrawer() — real cart lines, currency, subtotal, badge, empty state | b0a8a37 | frontend/js/View.js |
| 3 | _bindCartDrawerEditing() — delegation for quantity steppers + remove | b0a8a37 | frontend/js/View.js |

## What Was Built

### View.js (MODIFIED — 317 lines added)

**Currency / name helpers on base View class** (mirrored from cartView.js; needed on non-cart pages):
- `_getCurrentCurrency()` — reads localStorage, normalises to `usd`/`ils`
- `_getItemPrice(item, useOriginal)` — currency-aware price from usdPrice/ilsPrice, Math.round
- `_getCurrencySymbol()` — `$` or `₪`
- `_getDrawerItemName(item)` — bilingual name from `name_en`/`name_he`/`title`

**`_bindCartDrawer()`** (D-05/D-06/D-03/D-10):
- Elements: `#tk-cart-open` (trigger), `#tk-overlay`, `#tk-drawer`, `#tk-cart-close`
- Double-bind guard: `trigger.dataset.tkCartBound === '1'` prevents double-binding on language toggle
- `open()`: adds `is-open` to both overlay and drawer, locks body scroll, calls `_renderCartDrawer()`, focuses close button via `requestAnimationFrame`
- `close()`: removes `is-open`, clears scroll lock, returns focus to trigger
- D-05: `e.preventDefault()` on `#tk-cart-open` click — preserves `<a href>` no-JS fallback, opens drawer on every page including /cart
- D-06 three-way dismissal: ✕ click, scrim outside-tap (ignores interactive controls), Escape key
- D-10: `#tk-cart-continue` click calls `close()` (no routing)
- D-03: `#tk-checkout` click validates `data-cart-url` against `^/(en|he)/cart$` (T-43-02) before `window.location.assign`, builds fallback from language map
- D-09: `currency-changed` listener registered once per page (idempotent `_drawerCurrencyBound` guard), calls `_renderCartDrawer()`
- Called from `hydratePrototypeChrome()` after `this._bindHamburgerMenu()`

**`_renderCartDrawer()`** (D-07/D-08/D-09/D-10):
- Reads `model.cart` (Plan 02 shared array — same source of truth as /cart page)
- Clears `.tk-line` nodes from `#tk-drawer-body`; never touches drawer chrome
- Empty state (D-10): shows `#tk-cart-empty`, hides `.tk-drawer__foot`, sets `#tk-checkout.disabled = true`, shows `₪0`/`$0` subtotal, calls `persistCartNumber(0)`
- Non-empty: hides `#tk-cart-empty`, shows foot, enables checkout
- Line nodes built with `createElement`/`textContent`/`setAttribute` only — no `innerHTML` for product data (T-43-01 XSS mitigation)
- NO `crossorigin` on product images (CLAUDE.md CORS rule)
- Stepper buttons carry both base (`tk-line__qty-btn`) and modifier (`--plus`/`--minus`) classes
- D-09 subtotal: `reduce()` over `model.cart` using `_getItemPrice(it) * it.amount` in persisted currency — no hardcoded rate
- Badge: sums all `item.amount` values → `persistCartNumber()`

**`_bindCartDrawerEditing()`** (D-07/D-08):
- Event delegation on `#tk-drawer-body` (bound once; `tkEditBound` guard)
- `.tk-line__qty-btn--plus` click → `model.increaseAmount(id)` → `_renderCartDrawer()`
- `.tk-line__qty-btn--minus` click → `model.decreaseAmount(id)` → `_renderCartDrawer()`
- `.tk-line__remove` click → `model.removeFromUserCart(id)` → `_renderCartDrawer()`
- No min-1/stock-cap logic in View.js (lives in model.js, Plan 02)

## Requirements Satisfied

| Req | Description | Status |
|-----|-------------|--------|
| D-03 | #tk-checkout enabled only when cart non-empty | DONE |
| D-05 | #tk-cart-open opens drawer on every page with e.preventDefault fallback | DONE |
| D-06 | Three-way dismissal: ✕ / scrim / Esc | DONE |
| D-07 | +/− steppers and remove with live subtotal/badge update | DONE |
| D-08 | Editing calls Plan 02 model mutators; shared model.cart state | DONE |
| D-09 | Line prices + subtotal use _getItemPrice/_getCurrencySymbol, re-price on currency-changed | DONE |
| D-10 | Empty state shows #tk-cart-empty + Continue-shopping closes drawer; foot hidden | DONE |

## Deviations from Plan

### Auto-fix: Tasks 1-3 committed together (not three separate commits)

The plan calls for three sequential tasks, but all three methods are mutually dependent:
- `_bindCartDrawer()` (Task 1) calls `this._renderCartDrawer()` (Task 2) in `open()`
- `_renderCartDrawer()` (Task 2) builds the DOM nodes that `_bindCartDrawerEditing()` (Task 3) delegates on
- `_bindCartDrawerEditing()` (Task 3) calls both `_renderCartDrawer()` and the model mutators

Committing Task 1 alone would reference a nonexistent method; Task 2 without Task 3 leaves the stepper buttons unresponsive. All three were implemented in one pass and committed as a single atomic changeset. Behavior is correct; the single commit hash `b0a8a37` covers all three tasks.

## Known Stubs

None. All plan requirements are wired to real data:
- Line items read from `model.cart` (not a demo array)
- Prices from `_getItemPrice()` (no hardcoded rate)
- Badge from `persistCartNumber()` (real cart sum)
- Editing delegates to Plan 02 model mutators

## Build Note

**Frontend build (`npm run build`) must be run in the main repo** after this worktree is merged. The worktree shares source files but does not have its own `node_modules/`, so Parcel cannot run inside it. The backend must also be restarted after the build to pick up the new bundle hash (CLAUDE.md: "After rebuilding frontend, the backend must be restarted").

## Threat Model Coverage

| Threat ID | Mitigation Applied |
|-----------|--------------------|
| T-43-01 (XSS via product fields) | All product names/image src/alt written via `textContent`/`setAttribute` on `createElement` nodes — no `innerHTML` with item fields |
| T-43-02 (open redirect via checkout URL) | `data-cart-url` validated against `^/(en|he)/cart$` regex before `window.location.assign`; fallback builds path from fixed language map |
| T-43-07 (quantity tampering) | Steppers call Plan 02 mutators which floor at 1 and cap at stock; View.js adds no clamp logic of its own |
| T-43-08 (shared model state) | Accepted — drawer and /cart page share `model.cart`; server re-validates at checkout |

## Self-Check: PASSED

- FOUND: `frontend/js/View.js` modified (317 lines added)
- FOUND commit: b0a8a37 (all three tasks)
- VERIFIED: `grep -c '_bindCartDrawer' frontend/js/View.js` = 5 (definition + hydratePrototypeChrome call + _bindCartDrawerEditing call + currency-changed comment + render call)
- VERIFIED: `grep -c '_renderCartDrawer' frontend/js/View.js` = 6
- VERIFIED: `grep -c 'model.cart' frontend/js/View.js` = 3
- VERIFIED: `grep -c 'currency-changed' frontend/js/View.js` = 4
- VERIFIED: no hardcoded `3.7` rate in View.js
- VERIFIED: `tk-line__qty-btn--plus` and `--minus` present
- VERIFIED: no `innerHTML` with product-sourced data
- VERIFIED: `tkCartBound` double-bind guard present
- VERIFIED: `e.preventDefault()` on `#tk-cart-open` click
- VERIFIED: Escape key handler present
- VERIFIED: no matchMedia(800px) close on cart drawer (only on hamburger at line 977)
