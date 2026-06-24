# Phase 40: Currency Selector Wiring - Pattern Map

**Mapped:** 2026-06-24
**Files analyzed:** 5 (all MODIFIED, none created)
**Analogs found:** 5 / 5 (internal reference implementation, not external analogs)

> **Phase nature:** This is a HARDENING / VERIFICATION phase. No new files are created. The "analog" for every target file is the **same project's already-working subscriber, `categoriesView.js`**. The planner's job is to diff each target against that reference and harden only where divergences cause real failures (per D-05: verify, fix only if broken). Code excerpts below are the **current** state so the planner reasons from reality, not assumptions.

---

## File Classification

| Modified File | Role | Data Flow | Reference / Analog | Match Quality |
|---------------|------|-----------|--------------------|---------------|
| `frontend/js/View.js` | base view / global dispatcher | event-driven (publish) | n/a — it IS the publisher | source-of-truth |
| `frontend/js/Views/categoriesView.js` | page view | event-driven (subscribe) → re-render | n/a — it IS the reference subscriber | source-of-truth |
| `frontend/js/Views/cartView.js` | page view | event-driven (subscribe) → re-render | `categoriesView.js` `setupCurrencyHandler` | role + flow match (the file to harden) |
| `frontend/js/locale.js` | utility / bootstrap | event-driven (first-load publish) | `View.js` dispatcher | flow match |
| `frontend/js/model.js` | data layer | transform (dual-price read + symbol encode) | `categoriesView.getProductMarkup` data-* writer | producer↔consumer pair |

**Currency event topology (who publishes / who subscribes):**
- **Publishers of `currency-changed`:** `View.js:69-71` (user changes the `<select>`), `locale.js:175-179` (first-load GeoIP seed).
- **Subscribers:** `categoriesView.js:1047` (→ `displayProducts()`), `cartView.js:82` (→ `render()` + `_renderSummary()`).
- **Storage key:** `localStorage.currency` holds `'usd'`/`'ils'` (View.js `CURRENCY_STORAGE_KEY`, locale.js `CURRENCY_KEY`).
- **DOM hook:** `select.header-currency-selector[name="currency"]` (legacy JS hook; co-exists with `.tk-nav__currency-select` style class — keep BOTH).

---

## Reference Implementation: `categoriesView.js` (the "correct" subscriber)

Everything else is hardened against this. Three pieces:

**1. Init/sync on load** (`categoriesView.js:1031-1041`):
```javascript
setupCurrencyHandler() {
  this.selectedCurrency = localStorage.getItem('currency') || 'usd';
  document
    .querySelectorAll('select.header-currency-selector[name="currency"]')
    .forEach(sel => {
      if (!sel) return;
      if (sel.value === 'default' || sel.value !== this.selectedCurrency) {
        sel.value = this.selectedCurrency;   // forces select off the "default" placeholder
      }
    });
```

**2. Idempotent subscriber** (`categoriesView.js:1043-1066`):
```javascript
  if (this._currencyListenerAdded) return;   // guard: one listener per instance
  this._currencyListenerAdded = true;

  window.addEventListener('currency-changed', async e => {
    if (!this.outerProductsContainer) return;
    const next = e?.detail?.currency;
    if (next !== 'usd' && next !== 'ils') return;   // validate payload
    // ...spinner show...
    try {
      this.selectedCurrency = next;
      this.displayProducts();                 // full re-render with new currency
    } catch (err) {
      console.error('[CategoriesView] Error handling currency change:', err);
    } finally { /* spinner hide */ }
  });
```

**3. Dual-price formatting at render** (`categoriesView.js:1403-1458`):
```javascript
const curSign = this.selectedCurrency === 'usd' ? '$' : '₪';
const price = this.getDisplayPrice(item);        // picks usd_price vs ils_price (111-134)
const originalPrice = this.getOriginalPrice(item); // picks original_* (136+)
// ...renders ${curSign}${price}, and writes data-usd-price/data-ils-price/data-original-* (1461)
```
`getDisplayPrice` (`111-134`) / `getOriginalPrice` (`136+`) select the per-product stored price for the active currency with legacy fallbacks. **No live exchange-rate math** — the `this.exchangeRate = 3.7` field at line 30 is vestigial (only `3.3`/ratio fallbacks inside the getters are used).

**Key traits to replicate everywhere:** (a) validate `detail.currency ∈ {usd,ils}`; (b) idempotent listener guard; (c) sync the `<select>` off `'default'` on load; (d) read per-product dual prices, never convert.

---

## Pattern Assignments (current state of each target)

### `frontend/js/View.js` — global publisher (event-driven)

**Storage + normalize helpers** (`9-26`): `CURRENCY_STORAGE_KEY='currency'`, `normalizeCurrency` returns `'usd'|'ils'|null`, `getSavedCurrency` defaults to `'usd'`, `setSavedCurrency` ignores invalid.

**`syncCurrencySelectors`** (`28-40`): sets `el.value = c` on every `select.header-currency-selector[name="currency"]` — this is what forces the dropdown off `'default'`. Delivers D-04.

**`initCurrencyPersistence`** (`42-73`) — the dispatcher, guarded by `window.__currencyPersistenceInitialized`:
```javascript
const applySaved = () => syncCurrencySelectors(getSavedCurrency());
// runs on DOMContentLoaded or immediately (46-52)

document.addEventListener('change', e => {           // event delegation on document
  const target = e.target;
  if (!target?.matches?.('select.header-currency-selector[name="currency"]')) return;
  const chosen = normalizeCurrency(target.value);
  if (!chosen) return;                                // ignore "default"
  setSavedCurrency(chosen);
  syncCurrencySelectors(chosen);
  window.dispatchEvent(new CustomEvent('currency-changed', { detail: { currency: chosen } }));
});
```
Module-init call at `76-78`. **Non-destructive** — only reads/writes `select.value`, never `innerHTML` of the SSR-static header (honors the CLAUDE.md Dual-Render rule).

**`getCurrencySelectorMarkup`** (`1018-1044`): renders the `<select name="currency" class="header-currency-selector">` with `default`/`usd`/`ils` options and a `selected` attribute on the saved currency. **Note:** this markup still emits a `default` placeholder option — D-04 requires the *resting displayed* value never be `default`, which `syncCurrencySelectors`/`setupCurrencyHandler` enforce at runtime. Verify both run on every page that renders this select.

**Verification focus:** the dispatcher fires once, delegates on `document` (survives header re-render), and dispatches a validated payload. Confirm `syncCurrencySelectors(getSavedCurrency())` actually runs on load on cart + category + static pages.

---

### `frontend/js/Views/cartView.js` — subscriber to HARDEN (contrast vs categoriesView)

**Current subscriber** (`80-97`):
```javascript
if (!this._currencyListenerAdded) {            // ✓ matches reference idempotency guard
  this._currencyListenerAdded = true;
  window.addEventListener('currency-changed', async e => {
    const next = e?.detail?.currency;
    if (next !== 'usd' && next !== 'ils') return;   // ✓ matches reference validation
    try {
      const cartNum = await model.checkCartNumber();
      const lng = localStorage.getItem('language') || 'eng';
      this.render(cartNum);                    // ✓ D-05: already this.render(), NOT _render()
      await this._renderSummary(cartNum, lng);
    } catch (err) {
      console.error('[CartView] Error handling currency change:', err);
      window.location.reload();                // ✓ D-06: KEEP this reload fallback
    }
  });
}
```

**Divergences from the `categoriesView` reference — for the planner to weigh (fix only if verification shows breakage):**

| Aspect | categoriesView (reference) | cartView (current) | Note |
|--------|----------------------------|--------------------|------|
| Listener guard | `this._currencyListenerAdded` | same | aligned |
| Payload validation | `next !== 'usd' && next !== 'ils'` | same | aligned |
| Re-render call | `this.displayProducts()` | `this.render()` + `await this._renderSummary()` | D-05: bug already fixed; do NOT rewrite |
| On-load select sync | explicit loop sets `sel.value` off `'default'` (1034-1041) | **NO equivalent** — cartView has no on-load `syncCurrencySelectors`/select-sync | relies solely on View.js global `applySaved`. **Verify the cart drawer's select shows resolved currency, not `default`** |
| Error path | log only | log **+ `window.location.reload()`** | D-06: keep the reload safety net |

**Current currency read helpers** (the cart's local equivalents of the reference getters):
- `_getCurrentCurrency()` (`23-26`): `localStorage.getItem('currency') || 'usd'`, normalized to `'ils'`/`'usd'`.
- `_getItemPrice(item, useOriginal)` (`38-61`): picks `usdPrice`/`ilsPrice` (or `originalUsdPrice`/`originalIlsPrice`) off the cart-item object, with `.price`/`.originalPrice` fallbacks. **Reads the dual prices model.js stored — no conversion.**
- `_getCurrencySymbol()` (`64-66`): `'$'` / `'₪'`.
- Render sites consume these at `224-225` (item list) and `286-287` (summary), explicitly commented "Use current selected currency, not the stored currency in cart items."

**Unused field (Claude's Discretion, D in CONTEXT):** `_rate = process.env.USD_ILS_RATE || 3.7` (`20`) — never used for live conversion. Mirror of `categoriesView.js:30 this.exchangeRate = 3.7`. Tidy only if low-risk.

---

### `frontend/js/locale.js` — first-load currency seed (event-driven publisher)

**Key constant** (`2`): `const CURRENCY_KEY = 'currency';` — same key as View.js (consistent).

**`bootstrapLocaleSync`** (`121-146`): if `localStorage.currency` missing, seeds it from `guessLocaleFromBrowser()` and records `window.__localeAuto.currencyWasMissing = true`. This is the D-03 default path.

**`hydrateLocaleFromBackend`** (`152-190`): only overrides currency that was missing at page start; on GeoIP result it **dispatches the same event the subscribers listen for** (`172-180`):
```javascript
if (shouldOverrideCurrency && mapped.appCurrency) {
  localStorage.setItem(CURRENCY_KEY, mapped.appCurrency);
  window.dispatchEvent(new CustomEvent('currency-changed', {   // re-uses the View.js topic
    detail: { currency: mapped.appCurrency },
  }));
}
```
Guarded so it never clobbers a saved user preference and never fires twice per load (`__localeAuto` reset in `finally`).

**Verification focus:** confirm the first-load GeoIP dispatch reaches the subscribers AND that `syncCurrencySelectors` is (re)run after it so the dropdown reflects the GeoIP-resolved currency (Israel→ILS / else→USD). The dispatched payload here does NOT call `syncCurrencySelectors` itself — it relies on subscribers + View.js delegation.

---

### `frontend/js/model.js` — dual-price read & cart-item symbol encoding (transform)

**The two-encoding seam (Claude's Discretion item):** `localStorage.currency` is `'usd'/'ils'`, but cart items store a **symbol** in their `currency` field.

**`addToCartHandler` parse** (`233-265`): reads `data-currency` (a symbol, default `'ils'`), and the dual `data-usd-price`/`data-ils-price`/`data-original-*` attributes that `categoriesView.getProductMarkup` wrote (`1461`). Picks current price by **symbol** comparison:
```javascript
const currencyCheck = data.dataset.currency || 'ils';       // '$' or '₪'
const usdPrice = Math.round(Number(data.dataset.usdPrice) || 0);
const ilsPrice = Math.round(Number(data.dataset.ilsPrice) || 0);
// ...
const currentPrice = currencyCheck === '$' ? usdPrice : ilsPrice;   // symbol-keyed
const itemData = { /* ...usdPrice, ilsPrice, originalUsdPrice, originalIlsPrice,
                       currency: currencyCheck, ... */ };
```

**`addToLocalCart`** (`270-289`): persists both currencies + `currency: data.currency` (the symbol) onto the stored cart item. Downstream, `cartView._getItemPrice` re-derives display price from the stored `usdPrice`/`ilsPrice` using the **live** `localStorage.currency` — so the stored symbol is only the at-add-time encoding, not the re-price source.

**Legacy seam to watch** (`145`): the older `addToCartHandler`/cart push at line 141-148 stores `price: product.ils_price` (single ILS price, no dual fields) — a legacy path. Items added via the SSR `data-*` path (233-265) carry full dual prices; items via the legacy path may not, which is why `_getItemPrice` has `.price` fallbacks.

**Consistency requirement (D in CONTEXT):** keep `'usd'/'ils'` (storage) and `'$'/'₪'` (cart-item `currency`) in sync. Symbol is consumed in cartView render (`224`, `248-251`) but the actual re-price uses `_getCurrentCurrency()` from localStorage, so a switch re-prices correctly regardless of the stored symbol — verify this holds after switching currency with items already in cart.

---

## Shared Patterns

### Pub/Sub via `currency-changed` CustomEvent
**Source of truth:** `View.js:42-73` (publish on `change`), `locale.js:172-180` (publish on GeoIP seed).
**Apply to:** every subscriber must (1) guard against double-binding (`this._currencyListenerAdded`), (2) validate `detail.currency ∈ {'usd','ils'}`, (3) fully re-render. Template = `categoriesView.js:1043-1066`.

### Non-destructive SSR-static header
**Source:** `View.js:28-40` (`syncCurrencySelectors` only mutates `select.value`).
**Apply to:** ALL currency code. Per CLAUDE.md Dual-Render rule, never `innerHTML`-rewrite `header.ejs`. The dual-class hook (`.header-currency-selector` JS hook + `.tk-nav__currency-select` style) must both survive — selectors target the JS hook class only.

### Per-product dual prices, never convert
**Source:** producer `categoriesView.getProductMarkup` (`1454-1461` writes `data-usd-price`/`data-ils-price`/`data-original-*`); consumers `model.js:236-247` and `cartView._getItemPrice` (`38-61`).
**Apply to:** any re-price reads the stored value for the active currency. The `3.7`/`3.3` rates are dead fallbacks, not the conversion path.

### Dropdown reflects resolved currency on load (D-04)
**Source:** `View.js:46-52` (`applySaved`) + `categoriesView.js:1034-1041` (per-view select sync).
**Apply to:** every page rendering the currency `<select>`. The `default` option in `getCurrencySelectorMarkup` (`View.js:1025/1035`) must never be the resting displayed value — runtime sync forces it to `usd`/`ils`.

---

## No Analog Found

None. Every target is hardened against the in-repo `categoriesView.js` reference subscriber. There is no external/library analog to import — this phase verifies and aligns existing code.

---

## Metadata

**Analog search scope:** `frontend/js/` (View.js, locale.js, model.js, Views/categoriesView.js, Views/cartView.js)
**Files scanned:** 5 target files + reference excerpts
**Skills checked:** `.claude/skills/` contains only `.zip` archives + `tamar_homepage_vanilla` prototype — no `SKILL.md` to load.
**Pattern extraction date:** 2026-06-24
