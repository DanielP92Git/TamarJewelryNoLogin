# Phase 40: Currency Selector Wiring - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the header currency dropdown reliably re-price the page and persist the choice. The dispatch + persistence plumbing already exists (`View.js` `initCurrencyPersistence` + the `currency-changed` dispatcher); `categoriesView` and `cartView` already read dual `usd_price`/`ils_price` data and already listen for `currency-changed`. This phase **hardens and verifies** that existing system rather than building it from scratch.

**In scope:**
- `currency-changed` event reliability end-to-end (dispatch → subscribers re-render).
- Fix the documented re-render bug **only if it is still broken** (see D-05).
- Currency persists across page loads and navigation (`localStorage.currency`).
- The dropdown reflects the resolved currency on load (no blank "default" placeholder shown) — delivers Phase 39's deferred D-08.
- Cart drawer (`cartView.js`) and category pages (`categoriesView.js`) re-price correctly and persist.
- First-load default currency follows existing GeoIP locale detection.

**Out of scope (moved to the NEW "Homepage Featured Products" phase — see Deferred):**
- The homepage featured grid (`homepage.js`) and its hardcoded `CURRENCY='ILS'`.
- The homepage's separate demo cart drawer.
- Roadmap criterion 3 / requirement CURR-03 (homepage grid currency wiring).

**Also out of scope:** footer social (Phase 41); mobile nav (Phase 42); any currency UI restyle (done in Phase 39).

</domain>

<decisions>
## Implementation Decisions

### Phase scope & structure
- **D-01:** The homepage featured-products work the user wants (real catalogue data, `isFeatured` flag, admin toggle, SSR grid) is a **new capability split into its own phase** ("Homepage Featured Products"), to run **after** Phase 40. Phase 40 stays lean per the boundary above.
- **D-02:** Because the homepage grid moves out, **roadmap Success Criterion 3 and requirement CURR-03 (homepage grid currency) must be removed from Phase 40** and re-homed in the new phase. This ROADMAP/REQUIREMENTS edit is required (flagged in Deferred).

### Default / first-load currency (CURR-05)
- **D-03:** When no currency is saved, prices follow **existing GeoIP locale detection** (`locale.js`: Israel→ILS, everyone else→USD; it already seeds `localStorage.currency` on first load). Do NOT introduce a separate fixed default or couple currency to page language. Note the existing SSR-by-language price render (`ssrDynamic.js:167`, heb→ils / eng→usd) — the client currency layer re-applies the saved/resolved currency on top, so first-paint may briefly differ from the final currency; that is acceptable and follows the established pattern.
- **D-04:** On load the dropdown must **always reflect the resolved currency** (usd/ils) — `syncCurrencySelectors(getSavedCurrency())` must run so the dropdown never sits on the empty "default" placeholder. The placeholder must not be the displayed/selectable resting state. (This is Phase 39's deferred D-08.)

### Cart re-render reliability (CURR-02, CURR-04)
- **D-05:** **Verify, fix only if broken.** Manually exercise currency switching on the cart drawer and category pages; confirm prices flip and persist. The documented `this._render()` bug appears already replaced (`cartView.js:82-96` now calls `this.render()` + `_renderSummary()`), so do NOT preemptively rewrite — only change code if verification reveals an actual failure. No mandatory regression test (user chose not to require one).
- **D-06:** **Keep the `window.location.reload()` fallback** in the cartView `currency-changed` handler (`cartView.js:94`) as a safety net — worst case the page reloads and shows correct prices. Do not remove it.

### Claude's Discretion
- Whether to clean up the unused `_rate = process.env.USD_ILS_RATE || 3.7` field in `cartView.js:20` and the hardcoded `3.7` default in `categoriesView.js:30` (neither is used for live conversion — prices come from per-product dual values). Tidy if low-risk.
- The two parallel currency encodings to keep consistent: `localStorage.currency` uses `'usd'`/`'ils'`, but cart item objects store a symbol (`'$'`/`'₪'`) in their `currency` field (`model.js:233,246,260`; consumed in `cartView.js:470,570`). Keep these in sync; exact mechanism is the planner's call.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 40: Currency Selector Wiring" — goal + success criteria. **Criterion 3 (homepage grid) must be removed / re-homed per D-02.**
- `.planning/REQUIREMENTS.md` — CURR-01 … CURR-05. **CURR-03 moves to the new "Homepage Featured Products" phase per D-02.**
- `.planning/PROJECT.md` §"Current Milestone: v1.7" — milestone goal and the SSR-static-chrome hard constraint.
- `.planning/phases/39-header-utilities-layout/39-CONTEXT.md` — Phase 39 locked the currency dropdown as a styled native `<select>` (D-06) and deferred "dropdown reflects active currency" (D-08) to this phase.

### Project conventions
- `CLAUDE.md` §"SSR + Client Dual-Render" — global chrome (`header.ejs`) is SSR-static; do not destructively rewrite it from `View.js`. Currency persistence/dispatch lives in `View.js` non-destructively.

### Implementation targets (code)
- `frontend/js/View.js:9-78` — `CURRENCY_STORAGE_KEY`, `normalizeCurrency`/`getSavedCurrency`/`setSavedCurrency` (12-26), `syncCurrencySelectors` (28-40), `initCurrencyPersistence` + the `currency-changed` dispatcher (42-73), module-init call (76-78). `getCurrencySelectorMarkup` (1018-1044) renders the `<select name="currency" class="header-currency-selector">` with the `default`/`usd`/`ils` options.
- `frontend/js/locale.js:2,122-133,155-188` — currency key/seeding from GeoIP and the secondary `currency-changed` dispatch on hydration (the first-load default path, D-03).
- `frontend/js/Views/cartView.js:20-26,38-66,82-97,224-287` — `_rate` (unused), `_getCurrentCurrency`, `_getItemPrice`/`_getCurrencySymbol`, the `currency-changed` listener + reload fallback (D-05/D-06), price render sites.
- `frontend/js/Views/categoriesView.js:30,1031-1067,1403-1458` — already-working subscriber: `setupCurrencyHandler`, `currency-changed` listener → `displayProducts()`, dual-price formatting. Reference for "correct" behavior.
- `frontend/js/model.js:145,233-282` — dual-price reads from SSR `data-*` (`usdPrice`/`ilsPrice`/`original*`), cart-item currency symbol encoding.
- `backend/routes/ssrDynamic.js:70-71,167-168` — SSR price-by-language render (the first-paint behavior referenced in D-03).

### Visual reference
- None new — currency dropdown styling was delivered in Phase 39.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Centralized currency plumbing in `View.js` (storage helpers, `syncCurrencySelectors`, `initCurrencyPersistence`, the `currency-changed` dispatcher) — the phase builds on this, does not replace it.
- `categoriesView.js` is a complete, working `currency-changed` subscriber — use it as the reference implementation for what "re-prices correctly" looks like.
- Per-product dual prices (`usd_price`/`ils_price`/`original_*`) carried from backend → SSR `data-*` → client (`model.js`, `categoriesView.js`). No live exchange-rate math needed; pick the value for the active currency.

### Established Patterns
- **Non-destructive SSR-static chrome:** header is SSR-rendered; `View.js` only binds behavior and syncs the select — no `innerHTML` rewrites of the header. Keep currency work on this path.
- **Hybrid dual-class hooks:** the select carries both `.tk-nav__currency-select` (style) and `.header-currency-selector` (JS hook). Keep the legacy hook class — the dispatcher and `syncCurrencySelectors` select against it.
- **Two currency encodings** coexist (`'usd'/'ils'` in localStorage vs `'$'/'₪'` on cart items) — must stay consistent (Claude's Discretion above).

### Integration Points
- Dispatcher: `document` `change` listener on `select.header-currency-selector` → `setSavedCurrency` → `syncCurrencySelectors` → `window.dispatchEvent(currency-changed)` (`View.js:55-72`).
- Subscribers: `cartView.js:82` and `categoriesView.js:1047`. These are the components that must re-render. (Homepage is intentionally NOT a subscriber in Phase 40 — moved to the new phase.)
- First-load currency seeding happens in `locale.js` (GeoIP) — the source of the D-03 default.

</code_context>

<specifics>
## Specific Ideas

- The user wants real, hand-curated homepage products eventually — an `isFeatured` boolean + admin toggle, delivered via SSR `data-*` attributes (same pattern as `category.ejs`), NOT a client API fetch and NOT a single-rate conversion. Captured for the new phase (Deferred).
- Currency should remain independently switchable via the dropdown (not hard-coupled to language), even though SSR's initial paint is language-driven.

</specifics>

<deferred>
## Deferred Ideas

- **NEW phase: "Homepage Featured Products"** (runs after Phase 40). Owns the homepage grid end-to-end:
  - Add `isFeatured` boolean to the Product schema (`backend/models/Product.js`) + an admin toggle in `admin/BisliView.js`.
  - Backend query for featured products (dual prices); render the homepage grid **server-side** in `home.ejs` (currently an empty `<div id="tk-prod-grid">` filled by `homepage.js`) with dual prices in `data-*` attributes, following the `category.ejs` / `ssrDynamic.js` pattern.
  - Refactor `frontend/js/homepage.js`: remove hardcoded `CURRENCY='ILS'` (line 17) and the demo `PRODUCTS` array (22-31); read products + dual prices from SSR DOM; subscribe to `currency-changed`; make its demo cart drawer currency-aware (or wire to the real cart controller).
  - **Absorbs roadmap Success Criterion 3 and requirement CURR-03.**
- **Required ROADMAP/REQUIREMENTS edit:** remove Phase 40 Success Criterion 3 and CURR-03 from Phase 40; add them (or equivalents) to the new phase. Do this via `/gsd-phase` so verification matches the locked boundary. (Carries forward the same housekeeping pattern flagged in 39-CONTEXT for criteria 1/3/4.)
- **Footer social** — Phase 41 (FOOT).
- **Mobile hamburger nav** — Phase 42 (NAV).

</deferred>

---

*Phase: 40-currency-selector-wiring*
*Context gathered: 2026-06-24*
