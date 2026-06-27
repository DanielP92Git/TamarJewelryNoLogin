# Phase 43: Site-wide Cart Drawer - Pattern Map

**Mapped:** 2026-06-28
**Files analyzed:** 6 (1 new partial, 5 modified)
**Analogs found:** 6 / 6 (every file has an in-repo analog — this phase is "move + wire," not greenfield)

> Note on line numbers: CONTEXT.md / the todo cite some stale line references
> (e.g. drawer at `home.ejs:165-176`, header cart at `header.ejs:50`). Verified
> against the live files: the **drawer markup is `home.ejs:228-241`**, the
> **nav cart icon is `header.ejs:50-55`** (`#tk-cart-open`), and the
> **badge is `header.ejs:54`** (`#tk-cart-count`, class `cart-number-mobile`).
> Use the numbers in this document, not the CONTEXT ones.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/views/partials/cart-drawer.ejs` (NEW) | partial / chrome (EJS) | request-response (SSR-static markup) | `backend/views/partials/header.ejs` + drawer block `home.ejs:228-241` | exact (markup exists; only relocation + include wiring is new) |
| `backend/views/pages/home.ejs` (MODIFIED) | page template | request-response | siblings already using `include('../partials/cart-drawer')` (none yet — pattern from footer include `home.ejs:251`) | role-match (remove inline block; add include) |
| `backend/views/partials/header.ejs` (MODIFIED) | partial / chrome (EJS) | request-response | itself — `#tk-cart-open` at `:50-55` stays SSR `<a href>` fallback | exact |
| `frontend/js/View.js` (MODIFIED) | base view / global chrome controller | event-driven (bind-only hydration) | `_bindHamburgerMenu()` `View.js:888-976` + `hydratePrototypeChrome()` `:847-886` | exact (same non-destructive bind pattern) |
| `frontend/js/Views/cartView.js` (MODIFIED or shared) | view (render + currency helpers) | CRUD / event-driven | itself — `_getCurrentCurrency`/`_getItemPrice`/`_getCurrencySymbol` `:22-65`, `currency-changed` listener `:81-95` | exact (reuse, don't reimplement) |
| `frontend/js/homepage.js` (MODIFIED — retire demo) | page script (home-only) | CRUD (demo) | n/a — code is being **removed/retired**, replaced by View.js + cartView wiring | exact (delete demo `renderCart`/`money`/`openCart`) |

## Pattern Assignments

### `backend/views/partials/cart-drawer.ejs` (NEW partial, SSR-static chrome)

**Analog A — the markup to move (verbatim contract):** `backend/views/pages/home.ejs:228-241`

```ejs
<!-- ============ CART DRAWER ============ -->
<div class="tk-overlay" id="tk-overlay"></div>
<aside class="tk-drawer" id="tk-drawer" aria-label="<% if (lang === 'eng') { %>Shopping cart<% } else { %>עגלת קניות<% } %>">
  <div class="tk-drawer__head">
    <span class="tk-drawer__title"><% if (lang === 'eng') { %>Shopping Cart<% } else { %>עגלת קניות<% } %></span>
    <button class="tk-drawer__close" id="tk-cart-close" type="button" aria-label="Close">&times;</button>
  </div>
  <div class="tk-drawer__body" id="tk-drawer-body"><!-- lines injected --></div>
  <div class="tk-drawer__foot">
    <div class="tk-drawer__subtotal"><span><% if (lang === 'eng') { %>Subtotal<% } else { %>סכום ביניים<% } %></span><b id="tk-subtotal">₪0</b></div>
    <p class="tk-drawer__note"><% if (lang === 'eng') { %>Shipping calculated at checkout.<% } else { %>המשלוח מחושב בקופה.<% } %></p>
    <button class="tk-btn tk-btn--primary tk-btn--full" id="tk-checkout" type="button" disabled><% if (lang === 'eng') { %>Proceed to Checkout<% } else { %>מעבר לתשלום<% } %></button>
  </div>
</aside>
```

**Analog B — how a partial is authored as SSR chrome (bilingual via `lang`, `urlLang`):** `backend/views/partials/header.ejs:1-8`

```ejs
<%
  var _hero = (typeof heroNav !== 'undefined') && heroNav;
  var _active = (typeof activeNav !== 'undefined') ? activeNav : '';
  var _eng = lang === 'eng';
%>
```

The drawer partial receives the same `{ lang, urlLang }` locals the header/footer get. Keep the `lang === 'eng'` bilingual ternary style already in the moved markup. The CTA (D-01/D-02) must route to `/<%= urlLang %>/cart` — see Shared Pattern "Language-aware cart URL". For the empty state (D-10), add bilingual `"Your cart is empty" / "העגלה שלך ריקה"` + `"Continue shopping" / "המשך בקנייה"` nodes following the same `<% if (lang === 'eng') { %>...<% } else { %>...<% } %>` pattern.

**Analog C — how every page includes a chrome partial:** `backend/views/pages/home.ejs:251` (footer) and the header include table below. **All 11 pages** include header + footer this way; the drawer must be added to each (or, cleaner, included once inside `footer.ejs`/`header.ejs` so it inherits all 11 call sites for free — planner's call per CONTEXT D "Global-partial vs View.js injection"):

```ejs
<%- include('../partials/footer', { lang, urlLang }) %>
```

Include sites verified (each needs the drawer too): `home.ejs:51/251`, `cart.ejs:28/79`, `category.ejs:31/152`, `product.ejs:31/176`, `about.ejs:16/89`, `contact.ejs:25/173`, `workshop.ejs:23/116`, `policies.ejs:16/108`, `404.ejs:9/24`, `error.ejs:9/29`.

---

### `backend/views/pages/home.ejs` (MODIFIED)

**Action:** Delete the inline drawer block (`228-241`) now that it lives in the partial; add the partial include (matching the footer include style at `:251`). Also retire the `<script src="/js/homepage.js" defer>` cart wiring (`:253`) once open/close moves to `View.js` (homepage.js may stay for grid/newsletter/scroll, but its cart functions are removed — see homepage.js entry).

**Dual-render guard (CLAUDE.md):** home.ejs is the one page where homepage.js runs. Ensure the drawer is no longer double-owned (SSR partial + homepage.js demo). The drawer markup must be SSR-only; JS only binds.

---

### `backend/views/partials/header.ejs` (MODIFIED — nav cart icon + badge)

**Integration point — nav cart icon (`header.ejs:50-55`):**

```ejs
<a class="tk-nav__cart" id="tk-cart-open" href="/<%= urlLang %>/cart" aria-label="Cart">
  <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5">
    <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" stroke-linecap="round" stroke-linejoin="round"></path>
  </svg>
  <span class="tk-nav__count cart-number-mobile" id="tk-cart-count">0</span>
</a>
```

**Pattern (D-05 / progressive enhancement):** Keep the `<a href="/<%= urlLang %>/cart">` exactly as-is — it is the no-JS fallback. `View.js` intercepts the click with `preventDefault()` to open the drawer (mirror of `homepage.js:213`). No markup change needed to the icon itself; the badge `#tk-cart-count` (class `cart-number-mobile`, `:54`) is the single sync target — already driven by `persistCartNumber`/`increase/decreaseCartNumber` (see Shared Pattern "Cart-count badge sync"). The mobile-bar cart icon is the same element (Phase 42 D-03), so no second binding is required.

---

### `frontend/js/View.js` (MODIFIED — site-wide open/close + render wiring)

**This is where `homepage.js` open/close logic relocates.** It must follow the **non-destructive bind-only** pattern, NOT rewrite chrome `innerHTML`.

**Analog — `_bindHamburgerMenu()` (`View.js:888-976`)** is the closest structural twin: a same-shaped three-way-dismissal modal binder with a double-bind guard, body scroll lock, focus management, Esc, and an 800px `matchMedia` close. The drawer binder (call it `_bindCartDrawer()`) should be a near-copy.

Double-bind guard + open/close (`:896-917`):

```javascript
// Double-bind guard (same pattern as flag-icon bind guard above)
if (hamburger.dataset.tkHamburgerBound === '1') return;
hamburger.dataset.tkHamburgerBound = '1';

const open = () => {
  overlay.classList.add('is-open');
  hamburger.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';   // body scroll lock
  if (closeBtn) requestAnimationFrame(() => closeBtn.focus());
};
const close = () => {
  overlay.classList.remove('is-open');
  hamburger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
  hamburger.focus();
};
```

Three-way dismissal (D-06) (`:942-966`) — re-tap trigger, close button, scrim, Esc:

```javascript
hamburger.addEventListener('click', () => {
  overlay.classList.contains('is-open') ? close() : open();
});
if (closeBtn) closeBtn.addEventListener('click', close);
overlay.addEventListener('click', e => {
  if (e.target.closest('a, button, select, input, label, .flag-icon, [role="button"]')) return;
  close();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
});
```

For the drawer, the open/close maps to the demo's `is-open` toggling on `#tk-overlay` + `#tk-drawer` (homepage.js `openCart`/`closeCart` `:147-154`). Bind `#tk-cart-open` with `e.preventDefault()` (preserve href fallback), `#tk-cart-close`, and `#tk-overlay`-click.

**Where the binder is invoked — `hydratePrototypeChrome()` (`View.js:847-886`):** This method already runs on every page (called from `:657` when there is no legacy `.menu` host) and already calls `this._bindHamburgerMenu()` at `:879`. Add `this._bindCartDrawer()` here — same call site, same lifecycle, same guarantee that the SSR chrome is never destructively rewritten (`:653-656` comment is the canonical rule).

**Currency comment to honor (`View.js:866-870`):** currency selection is handled by the delegated `change` listener in `initCurrencyPersistence` (`:42-73`), which dispatches the `currency-changed` event. The drawer becomes a new subscriber to that event (see cartView entry + Shared Pattern).

---

### `frontend/js/Views/cartView.js` (REUSE — rendering + currency helpers)

**Do NOT reimplement these in the drawer.** Reuse or extract.

**Currency helpers (`cartView.js:22-65`)** — the canonical replacements for homepage.js's demo `getCurrency`/`symbol`/`money`:

```javascript
_getCurrentCurrency() {
  const saved = localStorage.getItem('currency') || 'usd';
  return saved === 'ils' ? 'ils' : 'usd';
}
_getItemPrice(item, useOriginal = false) {
  const currency = this._getCurrentCurrency();
  if (currency === 'usd') {
    return useOriginal ? Math.round(item.originalUsdPrice || item.originalPrice || item.usdPrice || item.price || 0)
                       : Math.round(item.usdPrice || item.price || 0);
  } else {
    return useOriginal ? Math.round(item.originalIlsPrice || item.originalPrice || item.ilsPrice || item.price || 0)
                       : Math.round(item.ilsPrice || item.price || 0);
  }
}
_getCurrencySymbol() {
  return this._getCurrentCurrency() === 'usd' ? '$' : '₪';
}
```

**`currency-changed` subscriber pattern (`cartView.js:78-96`)** — the drawer's re-price-on-event handler should copy this shape (idempotent guard + try/catch + reload fallback):

```javascript
if (!this._currencyListenerAdded) {
  this._currencyListenerAdded = true;
  window.addEventListener('currency-changed', async e => {
    const next = e?.detail?.currency;
    if (next !== 'usd' && next !== 'ils') return;
    try {
      const cartNum = await model.checkCartNumber();
      const lng = localStorage.getItem('language') || 'eng';
      this.render(cartNum);
      await this._renderSummary(cartNum, lng);
    } catch (err) {
      console.error('[CartView] Error handling currency change:', err);
      window.location.reload();
    }
  });
}
```

**Line-item rendering reference (`cartView.js:226-272`, render entry `:352`)** — the per-item map uses `_getItemPrice(item, false)` / `(item, true)` for sale detection, `_getCurrencySymbol()` prefix, `_getItemName(item)` for bilingual names, and reads `item.quantity`/`item.amount`. The drawer body builder should mirror this pricing logic. NOTE: homepage.js (`:108-145`) builds the drawer line via `document.createElement` + `textContent`/`setAttribute` (XSS-safe, WR-01) — keep that **DOM-node** construction style for the drawer (admin-sourced names), but feed it `model.cart` + `_getItemPrice`, not the demo array.

---

### `frontend/js/homepage.js` (MODIFIED — retire demo cart)

**Action:** Delete/retire the demo cart machinery now superseded:
- `getCurrency`/`symbol`/`money` (`:19-24`) → replaced by cartView `_getCurrentCurrency`/`_getCurrencySymbol`/`_getItemPrice`.
- `let cart = []` demo array (`:26`) → replaced by `model.cart` (`model.js:2`).
- `addToCart`/`removeItem`/`renderCart` (`:69-146`) → replaced by `model.js` mutators + cartView render.
- `openCart`/`closeCart` (`:147-154`) → moved to `View.js` `_bindCartDrawer`.
- The `currency-changed` listener's `renderCart()` call (`:207`) and the `#tk-cart-open`/`#tk-cart-close`/`#tk-overlay`/Esc bindings (`:213-215`, `:239`) → moved to `View.js`.

Keep (home-only, not cart): `renderProducts` grid hydration (`:50-64`), smooth-scroll, newsletter, toast, `data-nav` handlers. The featured-grid Add-to-Cart (`:193-198`) must be re-pointed at the **real** model add path so D-04 auto-open fires through the global drawer.

---

## Shared Patterns

### Non-destructive SSR-chrome hydration (the hard constraint)
**Source:** `frontend/js/View.js:650-658` (the `.menu` absence branch) + `:888-976` (`_bindHamburgerMenu`)
**Apply to:** the new `_bindCartDrawer` in View.js; the drawer partial
**Rule (CLAUDE.md "SSR + Client Dual-Render"):** chrome markup is SSR-static; JS **only** adds/removes classes and binds handlers — never `innerHTML`-rewrites the header/drawer on load or language toggle. Use a `dataset.*Bound = '1'` double-bind guard like `:851` / `:896`.
```javascript
// No legacy `.menu` host => the global prototype chrome is SSR-static.
// Don't destructively rewrite it; just wire the behavior it needs.
await this.hydratePrototypeChrome(lng, cartNum);
```

### Currency: read + subscribe (Phase 40)
**Source:** `frontend/js/View.js:42-73` (`initCurrencyPersistence` dispatches `currency-changed`); `frontend/js/Views/cartView.js:22-65` (helpers), `:81-95` (subscriber)
**Apply to:** drawer rendering + re-price on open and on `currency-changed`
**Rule:** never hardcode a rate (kill homepage.js `money()`/`3.7`); read persisted currency via `_getCurrentCurrency()`/`getSavedCurrency()` and per-item dual `usdPrice`/`ilsPrice`. Storage uses `'usd'/'ils'`; cart-item `currency` field uses `'$'/'₪'` (`model.js:233,246` — `currencyCheck === '$'`). Keep both encodings in sync.

### Cart-count badge sync
**Source:** `frontend/js/View.js:292-324` (`increaseCartNumber`/`decreaseCartNumber`/`persistCartNumber`, all target `.cart-number-mobile`)
**Apply to:** every drawer mutation (add/remove/qty) and on open
**Rule:** the badge is `#tk-cart-count.cart-number-mobile` (`header.ejs:54`); update it through the existing `persistCartNumber(num)` / `increase`/`decreaseCartNumber` helpers, not by hand. `hydratePrototypeChrome` already calls `persistCartNumber(cartNum)` at `:873-875` on every page load.

### Language-aware cart URL (CTA + href fallback)
**Source:** CLAUDE.md "Payment Integration URLs"; `header.ejs:50` (`href="/<%= urlLang %>/cart"`); `homepage.js:190` (`document.documentElement.lang`)
**Apply to:** drawer `#tk-checkout` CTA (D-01/D-02) and the `#tk-cart-open` fallback href
**Rule:** SSR uses `urlLang` (`en`/`he`). Client code maps `localStorage.getItem('language')` (`'eng'`/`'heb'`) → `'en'`/`'he'`. The CTA navigates to `/{lang}/cart` (where PayPal/Stripe already live) — no in-drawer payment.

### CSS scoping guard (cross-cutting trap)
**Source:** `chrome_rollout_css_conflicts.md` (canonical_refs); CONTEXT `code_context` "CSS scoping"
**Apply to:** any site-wide drawer CSS
**Rule:** `homepage.css` is site-wide but `homepage.js` is home-only; legacy `desktop-menu.css` global selectors can hijack `tk-`-prefixed chrome off-homepage. Scope drawer styles under the `tk-` namespace and verify they survive on category/product/about/etc. where the legacy per-page CSS loads. RTL: drawer slides from the cart-icon side — right on `/en`, mirrored left on `/he` (Phase 39 D-09 / Phase 42 true-mirror).

## No Analog Found

None. Every file has a strong in-repo analog — this phase is a relocation + real-data wiring of code that already exists in `home.ejs` + `homepage.js`, reusing `cartView.js`/`model.js`/`View.js` machinery.

## Metadata

**Analog search scope:** `backend/views/pages`, `backend/views/partials`, `frontend/js`, `frontend/js/Views`
**Files scanned:** home.ejs, header.ejs, footer.ejs, View.js, cartView.js, model.js, homepage.js + 11 page-include sites
**Pattern extraction date:** 2026-06-28
