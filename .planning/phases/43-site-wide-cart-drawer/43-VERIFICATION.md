---
phase: 43-site-wide-cart-drawer
verified: 2026-06-28T12:00:00Z
status: passed
human_verified: 2026-06-28T15:00:00Z (all 9 UAT items confirmed; 8 bugs found & fixed — see 43-HUMAN-UAT.md)
score: 10/10
overrides_applied: 0
human_verification:
  - test: "Open the drawer on every page type (home, category, product, cart, about, contact, workshop)"
    expected: "Drawer slides in from the right on each page; nav cart icon opens it via click without navigating away"
    why_human: "Requires a running browser across multiple page routes"
  - test: "On /he URL, open the drawer"
    expected: "Drawer slides from the LEFT (RTL mirror: [dir=rtl] .tk-drawer rule)"
    why_human: "Visual CSS behavior; requires a Hebrew-locale browser session"
  - test: "Resize browser from >800px to <800px with drawer open, then close and reopen"
    expected: "Drawer does NOT auto-close at the 800px breakpoint (unlike the hamburger); closes only via ✕ / scrim / Esc / icon-toggle"
    why_human: "Requires interactive viewport resize"
  - test: "Add an item from the homepage featured grid; confirm drawer auto-opens with the item listed"
    expected: "window.tkAddToCart forwards card to model.handleAddToCart; cart:item-added fires; drawer opens showing the real item in the persisted currency"
    why_human: "Requires a live server with products seeded"
  - test: "Add an item from a category page card and from the product modal"
    expected: "Drawer auto-opens on both; badge count increments correctly"
    why_human: "Requires a running browser with category/product pages loaded"
  - test: "With items in the drawer, switch the currency selector between USD and ILS"
    expected: "Subtotal and per-line prices re-render immediately in the new currency using usdPrice/ilsPrice (no page reload, no 3.7 hardcoded rate)"
    why_human: "Runtime currency-changed event behavior"
  - test: "Use the +/- steppers and Remove buttons inside an open drawer"
    expected: "Line quantity updates, subtotal and badge update live; removing the last item shows the empty state, disables the checkout button, and hides the footer"
    why_human: "Interactive DOM mutation requiring a live page"
  - test: "Open the drawer when the cart is empty"
    expected: "Empty state shown ('Your cart is empty' / 'העגלה שלך ריקה'), checkout button disabled, 'Continue shopping' button closes the drawer without navigating"
    why_human: "Requires verifying toggle of hidden attribute and disabled state"
  - test: "Click 'Proceed to Checkout' with items in the cart"
    expected: "Navigates to /{lang}/cart (en or he depending on current locale)"
    why_human: "Runtime navigation behavior with language detection"
---

# Phase 43: Site-wide Cart Drawer — Verification Report

**Phase Goal:** Promote the homepage-only demo cart drawer into global chrome so the nav cart icon opens a mini-cart on EVERY page, rendering real model.js cart data (not the homepage demo data), honoring Phase 40 currency wiring for live + persisted re-pricing, with a "View cart / Checkout" CTA that routes to /{lang}/cart. Scope: move drawer markup from home.ejs into a global partial; move open/close wiring from homepage.js into base View.js; dual-render safety; cart-count badge sync; mobile + RTL.
**Verified:** 2026-06-28T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Drawer markup lives in a single global partial (`backend/views/partials/cart-drawer.ejs`), included site-wide via `footer.ejs`, with no duplicate `#tk-drawer` id in `home.ejs` | VERIFIED | `cart-drawer.ejs` exists with full id contract. `footer.ejs` line 45 includes it. `grep id="tk-drawer" home.ejs` returns 0 matches. All 10 page templates include footer (category, cart, product, home, about, contact, workshop, policies, 404, error). |
| 2 | D-01/D-02: Single `#tk-checkout` button labelled "Proceed to Checkout" / "מעבר לתשלום" with `data-cart-url="/{urlLang}/cart"`, ships disabled, subtotal + "Shipping calculated at checkout" note present | VERIFIED | `cart-drawer.ejs` line 25 has the exact markup including `data-cart-url`. Lines 23-24 have `#tk-subtotal` and the shipping note. |
| 3 | D-10: Empty state present in drawer with "Your cart is empty" / "העגלה שלך ריקה" and `#tk-cart-continue` "Continue shopping" / "המשך בקנייה" button | VERIFIED | `cart-drawer.ejs` lines 16-19 contain `id="tk-cart-empty"` (with `hidden`), bilingual empty message, and `id="tk-cart-continue"` ghost button. |
| 4 | `View.js` base class contains `_bindCartDrawer`, `_renderCartDrawer`, `_bindCartDrawerEditing`, `_openCartDrawer` and a `cart:item-added` listener; all called from `hydratePrototypeChrome` | VERIFIED | All four methods confirmed at View.js lines 1036, 1169, 1298, 1151. `hydratePrototypeChrome` calls `this._bindCartDrawer()` at line 884. `cart:item-added` listener at lines 1126-1131. |
| 5 | D-09: Rendering reads `model.cart`; prices use `_getCurrentCurrency()` + `_getItemPrice()` + `_getCurrencySymbol()` on base View class; re-prices on `currency-changed` event; no hardcoded `3.7` rate | VERIFIED | Currency helpers at View.js lines 988-1028. `_renderCartDrawer` uses `this._getCurrencySymbol()` and `this._getItemPrice()` at lines 1182-1284. `currency-changed` subscriber at lines 1108-1118. Grep for `3.7` in View.js returns 0 matches. |
| 6 | D-03: `#tk-checkout` enabled only when cart has items; disabled + footer hidden in empty state | VERIFIED | View.js lines 1185-1197: empty path sets `checkoutBtn.disabled = true` and `footEl.setAttribute('hidden', '')`. Non-empty path sets `checkoutBtn.disabled = false` and `footEl.removeAttribute('hidden')`. |
| 7 | D-06: Three-way dismissal — `#tk-cart-close` (✕), overlay/scrim tap, Escape key — no matchMedia(800px) auto-close on the cart drawer | VERIFIED | View.js lines 1067-1082 implement all three dismiss paths. The only `matchMedia('(min-width: 800px)')` call is at line 977 inside `_bindHamburgerMenu`, not `_bindCartDrawer`. Comment at line 1084 explicitly documents the decision. |
| 8 | `model.js` exports `increaseAmount(id)` and `decreaseAmount(id)` operating on the shared `model.cart` array with min-1 floor (decreaseAmount) and stock-cap (increaseAmount); persisted via `createLocalStorage()` | VERIFIED | `export const increaseAmount` at model.js line 342, `export const decreaseAmount` at line 368. Stock-cap guard (`>= stock`) at line 346. Min-1 guard (`<= 1`) at line 371. Both call `createLocalStorage()` on the guest path. |
| 9 | Homepage demo cart machinery fully removed from `homepage.js` (no `renderCart`, `openCart`, `closeCart`, `let cart = []`, no `#tk-cart-open` bindings); featured Add-to-Cart re-pointed to `window.tkAddToCart` | VERIFIED | Grep for `function renderCart`, `function openCart`, `function closeCart`, `let cart = []`, `getElementById('tk-cart-open')` all return 0 matches in homepage.js. `window.tkAddToCart(card)` called at homepage.js lines 101-103. `window.tkAddToCart` defined in View.js at line 1138. |
| 10 | `categoriesView.js` dispatches `cart:item-added` at BOTH add-to-cart entry points (card add + modal add) in the success path only; non-destructive bind-only pattern honored (no chrome `innerHTML` rewrites for the drawer) | VERIFIED | `cart:item-added` dispatched at categoriesView.js line 484 (inside try block after `await model.handleAddToCart`) and line 610 (after try/catch, catch returns early). View.js `innerHTML` uses are confined to menu and currency selectors (lines 662, 678, 715) — none write drawer chrome or product data. `_renderCartDrawer` uses `createElement`/`textContent`/`setAttribute` exclusively. |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/views/partials/cart-drawer.ejs` | Global SSR-static cart-drawer chrome (overlay + drawer + empty-state + checkout CTA) | VERIFIED | 27 lines; contains all required ids: `tk-overlay`, `tk-drawer`, `tk-cart-close`, `tk-drawer-body`, `tk-cart-empty`, `tk-cart-continue`, `tk-subtotal`, `tk-checkout`; `data-cart-url` present |
| `backend/views/partials/footer.ejs` | Single global include site of the drawer partial | VERIFIED | Line 45: `<%- include('cart-drawer', { lang: lang, urlLang: ... }) %>` |
| `frontend/css/homepage.css` | Site-wide drawer + RTL mirror + quantity-stepper + empty-state styling | VERIFIED | `[dir="rtl"] .tk-drawer` at line 414; `.tk-line__qty-btn` at line 434; `#tk-cart-continue` at line 466; `.tk-drawer__empty` at line 454 |
| `frontend/js/View.js` | `_bindCartDrawer` + `_renderCartDrawer` + drawer currency helpers on base View class | VERIFIED | All four drawer methods present; `_getCurrentCurrency`, `_getItemPrice`, `_getCurrencySymbol`, `_getDrawerItemName` at lines 988-1028 |
| `frontend/js/model.js` | `increaseAmount` / `decreaseAmount` cart-quantity mutators | VERIFIED | Both exported at lines 342 and 368; 18/18 Vitest tests pass (confirmed by orchestrator) |
| `frontend/js/homepage.js` | Demo cart removed; featured Add-to-Cart re-pointed at real model + global drawer | VERIFIED | Demo machinery gone; `window.tkAddToCart(card)` at lines 101-103 |
| `frontend/js/Views/categoriesView.js` | Add-to-cart entry points dispatching `cart:item-added` | VERIFIED | 2 dispatches at lines 484 and 610 |
| `frontend/tests/model/cart-quantity.test.js` | 18 Vitest tests for increaseAmount/decreaseAmount | VERIFIED | File exists; orchestrator confirmed 18/18 pass |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `footer.ejs` | `cart-drawer.ejs` | EJS include | VERIFIED | `<%- include('cart-drawer', ...) %>` at footer.ejs line 45 |
| All 10 page templates | `footer.ejs` | EJS include with `{ lang, urlLang }` | VERIFIED | Confirmed in category, cart, product, home, about, contact, workshop, policies, 404, error EJS files |
| `cart-drawer.ejs #tk-checkout` | `/{urlLang}/cart` | `data-cart-url` attribute | VERIFIED | `data-cart-url="/<%= _urlLang %>/cart"` on the checkout button |
| `View.js hydratePrototypeChrome` | `_bindCartDrawer()` | direct method call | VERIFIED | Line 884: `this._bindCartDrawer()` |
| `View.js _bindCartDrawer #tk-cart-open click` | drawer open + `_renderCartDrawer()` | `preventDefault` + `is-open` toggle + render | VERIFIED | Lines 1062-1065: `e.preventDefault()` then `open()` which calls `_renderCartDrawer()` and `_openCartDrawer()` |
| `View.js _renderCartDrawer +/- buttons` | `model.increaseAmount` / `model.decreaseAmount` / `model.removeFromUserCart` | `_bindCartDrawerEditing` event delegation | VERIFIED | Lines 1308, 1316, 1324 in `_bindCartDrawerEditing` |
| `View.js currency-changed listener` | `_renderCartDrawer()` | Phase 40 currency-changed subscriber | VERIFIED | Lines 1108-1118 with `_drawerCurrencyBound` idempotency guard |
| `cart:item-added` event | `_renderCartDrawer()` + `_openCartDrawer()` | `window.addEventListener('cart:item-added', ...)` | VERIFIED | Lines 1128-1131 in `_bindCartDrawer` |
| `homepage.js featured Add-to-Cart` | `model.handleAddToCart` + `cart:item-added` | `window.tkAddToCart` global hook | VERIFIED | `window.tkAddToCart` defined at View.js line 1138; called at homepage.js line 101 |
| `categoriesView.js addToCart` | `cart:item-added` event | `window.dispatchEvent(new CustomEvent('cart:item-added'))` | VERIFIED | Line 484 (success path inside try block) |
| `categoriesView.js modal add` | `cart:item-added` event | `window.dispatchEvent(new CustomEvent('cart:item-added'))` | VERIFIED | Line 610 (post-try/catch; catch returns early — unambiguous success path) |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `View.js _renderCartDrawer` | `model.cart` | `import * as model from './model.js'` (line 4); cart array populated by `model.handleAddToCart` | Yes — reads the live shared cart array, not a demo or hardcoded array | FLOWING |
| `View.js _renderCartDrawer` | Currency / prices | `_getCurrentCurrency()` reads `localStorage.getItem('currency')`; `_getItemPrice()` reads `item.usdPrice`/`item.ilsPrice` | Yes — dual-price fields from model.cart; no hardcoded rate | FLOWING |
| `View.js #tk-subtotal` | subtotal | `cart.reduce((s, it) => s + this._getItemPrice(it) * it.amount, 0)` | Yes — computed from real cart state | FLOWING |
| `View.js _bindCartDrawerEditing` | item id | `dataset.id` on stepper/remove buttons set in `_renderCartDrawer` | Yes — flows from cart item id to model mutator | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED for code-level checks (no runnable entry point without a live server). Visual and interactive behaviors routed to human verification below.

Static checks performed:
- `grep -c 'function renderCart' homepage.js` = 0 (demo retired)
- `grep -c 'function openCart' homepage.js` = 0 (demo retired)
- `grep -c '3.7' View.js` = 0 (no hardcoded rate)
- `grep -c '<= 1' View.js` = 0 (no duplicated min floor in View layer)
- `grep -c 'innerHTML' ` within product-data injection paths = 0 (all `textContent`/`setAttribute`)
- `grep -c 'cart:item-added' categoriesView.js` = 2 (both add paths covered)
- `grep -c 'tkCartBound' View.js` = 2 (double-bind guard definition + check)

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| D-01 | 43-01 | Single full-width #tk-checkout CTA; routes to /{lang}/cart | SATISFIED | `cart-drawer.ejs` has the CTA; View.js validates and navigates via `data-cart-url` |
| D-02 | 43-01 | Reuse existing footer markup (subtotal + note + CTA) | SATISFIED | `cart-drawer.ejs` has `#tk-subtotal`, `.tk-drawer__note`, `#tk-checkout` |
| D-03 | 43-03 | CTA disabled when cart empty | SATISFIED | `_renderCartDrawer` sets `checkoutBtn.disabled = true` in empty state, `false` when non-empty |
| D-04 | 43-04 | Adding an item auto-opens the drawer from every entry point | SATISFIED | `cart:item-added` CustomEvent dispatched from homepage.js (via tkAddToCart), categoriesView.js card add, categoriesView.js modal add; View.js listener opens drawer |
| D-05 | 43-03 | Cart icon opens drawer on every page including /cart; e.preventDefault preserves no-JS fallback | SATISFIED | View.js line 1063: `e.preventDefault()` then open; no page-specific no-op |
| D-06 | 43-03 | Three-way dismissal: ✕ / scrim / Esc | SATISFIED | View.js lines 1067-1082; no matchMedia(800px) auto-close on cart drawer |
| D-07 | 43-02/03 | Full in-drawer editing: +/- quantity steppers + remove | SATISFIED | `_bindCartDrawerEditing` event delegation; stepper buttons carry both base + modifier class |
| D-08 | 43-02/03 | Reuse model.js mutators; shared model.cart state | SATISFIED | `increaseAmount`/`decreaseAmount` in model.js; `_bindCartDrawerEditing` calls them; View.js never reimplements quantity floor/cap logic |
| D-09 | 43-03/04 | Prices use persisted currency; re-price on open + currency-changed | SATISFIED | `_getCurrentCurrency`, `_getItemPrice`, `_getCurrencySymbol` on base View; currency-changed subscriber in `_bindCartDrawer`; no hardcoded rate |
| D-10 | 43-01/03 | Empty state: bilingual message + Continue-shopping closes drawer; foot hidden | SATISFIED | `cart-drawer.ejs` has `#tk-cart-empty` (hidden by default); View.js `_renderCartDrawer` toggles it; `#tk-cart-continue` click → `close()` |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/js/homepage.js` | 19-24 | `getCurrency`/`symbol`/`money` helpers retained | Info | Intentional — these serve `renderProducts()` grid price hydration, not the drawer. The plan explicitly designated them as KEEP ("retire from CART rendering, not from grid hydration"). Not a stub. |

No blocker anti-patterns found. No `TODO`/`FIXME`/placeholder comments in the drawer wiring code. No hardcoded exchange rate. No empty return stubs.

---

### Human Verification Required

#### 1. Drawer opens on every page type

**Test:** Navigate to home, category, product detail, /cart, about, contact, and workshop pages. Click the nav cart icon on each.
**Expected:** Drawer slides in from the right; body scroll locks; close button receives focus. Nav link does NOT navigate to /cart.
**Why human:** Requires a running browser across multiple SSR routes.

#### 2. RTL mirror on /he

**Test:** Navigate to any `/he/` URL. Open the drawer.
**Expected:** Drawer slides in from the LEFT (not the right); `[dir="rtl"] .tk-drawer` CSS applies.
**Why human:** Visual CSS behavior requiring a Hebrew-locale page.

#### 3. No auto-close at 800px breakpoint

**Test:** Open the drawer, then resize the browser window across the 800px boundary.
**Expected:** Drawer remains open; only explicit ✕ / scrim / Esc / icon-toggle close it.
**Why human:** Interactive viewport resize test.

#### 4. Add-to-cart auto-open (D-04) from all entry points

**Test:** Add an item from (a) the homepage featured grid, (b) a category page card, (c) the product/modal Add-to-Cart.
**Expected:** Drawer auto-opens each time showing the newly added item with current-currency pricing. Badge increments.
**Why human:** Requires a live server with seeded products.

#### 5. Currency re-pricing in the drawer (D-09)

**Test:** Add items, open the drawer, then switch the currency selector between USD and ILS.
**Expected:** Subtotal and per-line prices update immediately in the new currency without a page reload. No `3.7` hardcoded conversion visible.
**Why human:** Runtime `currency-changed` event behavior.

#### 6. Quantity steppers and remove live-update (D-07)

**Test:** With items in the drawer, click + / - on a line and click Remove on another.
**Expected:** Line quantity, line total, subtotal, and badge update live. Removing the last item shows the empty state, disables checkout, hides the footer.
**Why human:** Interactive DOM mutation requiring a live page.

#### 7. Empty state and Continue-shopping (D-10)

**Test:** Open the drawer with an empty cart (or remove all items).
**Expected:** Shows "Your cart is empty" / "העגלה שלך ריקה", checkout disabled, "Continue shopping" closes the drawer without navigating.
**Why human:** Requires verifying `hidden` attribute toggling and button behavior.

#### 8. Checkout CTA navigates to /{lang}/cart (D-01)

**Test:** Add items, open the drawer, click "Proceed to Checkout".
**Expected:** Page navigates to `/en/cart` or `/he/cart` depending on current locale. Invalid `data-cart-url` falls back to the fixed language map.
**Why human:** Runtime navigation with language detection.

---

### Gaps Summary

No gaps found. All 10 observable truths are VERIFIED against the actual codebase. All artifacts exist, are substantive, and are wired. All D-01 through D-10 decisions are implemented. The phase goal is code-complete.

Human verification is required for 8 behavioral items that cannot be confirmed without a running browser and live server.

---

_Verified: 2026-06-28T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
