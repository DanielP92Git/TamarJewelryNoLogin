# Phase 43: Site-wide Cart Drawer - Context

**Gathered:** 2026-06-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Promote the homepage-only **demo** cart drawer into **global chrome** so the nav
cart icon opens a mini-cart on **every** page (home, category, product, cart,
about, contact, etc.), rendering **real `model.js` cart data** — not the
homepage `homepage.js` demo data. The drawer honors Phase 40 currency wiring
(live + persisted re-pricing), keeps the `#tk-cart-count` badge in sync, and is
dual-render-safe (no destructive `innerHTML` chrome rewrites), mobile-correct,
and RTL-mirrored.

**In scope:**
- Move/clone the drawer + overlay markup (`#tk-drawer`, `#tk-overlay`,
  `home.ejs:229-239`) into a **global partial** included on every page.
- Move open/close wiring out of `homepage.js` into the site-wide path
  (base `View.js` non-destructive hydration) so `#tk-cart-open` opens the drawer
  everywhere.
- Render the drawer from **real cart state** (`model.js`), reusing `cartView.js`
  rendering/helpers — retire the demo `renderCart()`.
- Full in-drawer editing (quantity steppers + remove) with live subtotal + badge.
- Currency: re-price on open and on `currency-changed` (Phase 40 wiring).
- Footer CTA → `/{lang}/cart`.
- Empty-cart state.
- Mobile (<800px) + RTL behavior; focus/close (✕ / overlay / Esc).

**Out of scope (new capabilities — belong in other phases):**
- A standalone in-drawer payment flow (PayPal/Stripe stay on `/cart`).
- Any redesign of the full `/cart` page or its checkout.
- New cart capabilities (wishlist, save-for-later, promo codes, etc.).
- Header/nav restyle (locked in Phases 39/42).

</domain>

<decisions>
## Implementation Decisions

### Checkout CTA (drawer footer)
- **D-01:** **Single full-width primary CTA**, not a two-button split. It routes
  to `/{lang}/cart` (language-aware path), where the existing PayPal/Stripe
  checkout already lives. Rationale: one source of truth for payment, no
  duplicated checkout surface, lower risk; a two-button split would only save one
  click. (User delegated — decided on UX/marketing grounds.)
- **D-02:** **Reuse the existing footer markup** (`home.ejs:236-239`): the
  `#tk-checkout` button + `.tk-drawer__subtotal` (`#tk-subtotal`) + the
  "Shipping calculated at checkout" note. Keep the conversion-forward bilingual
  label **"Proceed to Checkout" / "מעבר לתשלום"**.
- **D-03:** The CTA is **enabled only when the cart has items**; it is
  hidden/disabled in the empty state (see D-10). The demo markup ships the button
  `disabled` by default — toggle it based on real cart contents.

### Open / Auto-open behavior
- **D-04:** **Adding an item auto-opens the drawer** (showing the new line +
  updated subtotal). Strong conversion pattern — instant confirmation + nudge to
  checkout. Applies to every add-to-cart entry point (category/product pages;
  homepage featured grid once it uses real cart data).
- **D-05:** **The cart icon opens the drawer on every page, including `/cart`.**
  No page-specific no-op logic — consistent behavior everywhere; the drawer simply
  mirrors current cart state. (Today the nav cart is `<a href="/{lang}/cart">`;
  it must be converted to open the drawer while preserving the href as a
  no-JS / progressive-enhancement fallback.)
- **D-06:** **Close stays standard, mirroring Phase 42 dismissal:** the ✕ button
  (`#tk-cart-close`), tapping the overlay/scrim (`#tk-overlay`), and Esc.

### In-drawer editing
- **D-07:** **Full editing in the drawer** — per-line **quantity steppers (+/−)**
  *and* a **remove** control, with **live subtotal + `#tk-cart-count` badge**
  updates (not just remove-only, not read-only).
- **D-08:** **Reuse `model.js` cart mutators and `cartView.js` quantity/remove
  helpers** rather than reimplementing edge cases (min quantity 1, stock limits,
  the `'$'`/`'₪'` symbol encoding) in a second place. If the `/cart` page is open
  in another context, its view and the drawer must stay consistent (shared model
  state). Exact wiring is the planner's call.

### Currency (carried from Phase 40)
- **D-09:** Drawer prices **read the persisted/resolved currency** via the Phase 40
  layer (`_getCurrentCurrency()` / `getSavedCurrency()`), re-price **on open** and
  on every **`currency-changed`** event, using per-product dual `usd_price`/
  `ils_price` values. No hardcoded ILS/`3.7` rate in the drawer. The demo
  `money(...)`/`cur` helper in `homepage.js` is retired in favor of the
  cart/currency helpers.

### Empty-cart state
- **D-10:** Empty drawer shows a warm, minimal bilingual message
  **"Your cart is empty" / "העגלה שלך ריקה"** plus a single **"Continue shopping" /
  "המשך בקנייה"** button that **closes the drawer** (the shopper keeps browsing
  wherever they are — works identically on every page, no per-page routing).
  Subtotal + checkout CTA are hidden while empty. (User delegated — decided for a
  boutique feel; visual finish deferred to UI polish.)

### Claude's Discretion
- **Drawer slide side + RTL:** default to sliding from the cart-icon side — right
  on `/en`, **mirrored to the left on `/he`** (consistent with Phase 39 D-09 /
  Phase 42 RTL true-mirror). Planner/`/gsd-ui-phase` may refine.
- **Global-partial vs View.js injection:** how the drawer markup becomes global
  (a `partials/cart-drawer.ejs` included like header/footer **vs** injected by
  `View.js`) is the planner's call — the constraint is dual-render safety, not the
  mechanism.
- **Empty-state visual finish** (icon, spacing, illustration) and drawer
  open/close motion — left to the planner / `/gsd-ui-phase`.
- **Toast on add** (in addition to auto-open) — optional; planner's call.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & source
- `.planning/ROADMAP.md` §"Phase 43: Site-wide Cart Drawer" — goal + scope
  statement (move markup to a global partial; wiring to `View.js`; real
  `model.js` data; currency; CTA → `/{lang}/cart`; mobile + RTL).
- `.planning/todos/pending/site-wide-cart-drawer.md` — the originating todo with
  the implementation outline, current-state analysis (exact file/line pointers),
  and acceptance criteria. **Read first** — it is the phase brief.
- `.planning/REQUIREMENTS.md` — requirements are **TBD** for this phase
  (run `/gsd-plan-phase 43`); derive from this CONTEXT + the todo.

### Project conventions (hard constraints)
- `CLAUDE.md` §"SSR + Client Dual-Render" — global chrome is SSR-static; the
  client View **must not** destructively `innerHTML`-rewrite the drawer/header on
  load or language toggle. Any drawer markup placed in chrome must survive
  hydration + the in-page language toggle.
- `CLAUDE.md` §"Payment Integration URLs" — language-aware paths: map
  `localStorage.getItem('language')` (`'eng'`/`'heb'`) to URL lang codes
  (`'en'`/`'he'`) for the `/{lang}/cart` CTA.

### Carried decisions (prior phases)
- `.planning/phases/40-currency-selector-wiring/40-CONTEXT.md` — currency wiring
  the drawer must honor: `currency-changed` dispatch, `getSavedCurrency`/
  `syncCurrencySelectors`, `cartView.js` `_getCurrentCurrency`/`_getItemPrice`/
  `_getCurrencySymbol`, dual-price `usd_price`/`ils_price` reads, and the
  `'usd'/'ils'` (storage) vs `'$'/'₪'` (cart-item) encoding to keep in sync.
- `.planning/phases/42-mobile-navigation/42-CONTEXT.md` — D-03 (cart icon stays in
  the collapsed mobile bar, one-tap), the non-destructive `hydratePrototypeChrome`
  bind pattern, the 800px breakpoint, and the three-way dismissal model reused for
  the drawer close (D-06 here).
- `.planning/phases/39-header-utilities-layout/39-CONTEXT.md` — D-09 RTL true
  mirror (drawer side mirrors on `/he`).

### Cross-cutting trap
- `C:\Users\pagis\.claude\projects\C--Development-Online\memory\chrome_rollout_css_conflicts.md`
  — legacy per-page CSS (`desktop-menu.css`) global selectors can hijack new
  tk-chrome on non-home pages; `homepage.js` is **home-only**, `homepage.css` is
  **site-wide**. New site-wide drawer styling/markup must be scoped so legacy CSS
  doesn't clobber it off-homepage.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Demo drawer markup** (`backend/views/pages/home.ejs:229-239`) — `#tk-overlay`,
  `#tk-drawer` (`.tk-drawer__head`/`__body`/`__foot`), `#tk-cart-close`,
  `#tk-drawer-body`, `#tk-subtotal`, `#tk-checkout`. **Move to a global partial**;
  it is already bilingual (eng/heb labels). This is the visual contract to keep.
- **`cartView.js` helpers** (`frontend/js/Views/cartView.js`) — `_getCurrentCurrency`,
  `_getItemPrice`, `_getCurrencySymbol`, render + summary logic, and the
  `currency-changed` listener (+ reload fallback). Reuse for drawer rendering and
  re-pricing instead of the demo `renderCart()`/`money()` in `homepage.js`.
- **`model.js` cart state** (`frontend/js/model.js:233-282`) — real cart items,
  dual-price reads, add/remove/quantity mutators, the `'$'/'₪'` symbol encoding.
- **`#tk-cart-count`** badge (`header.ejs:54`, class `cart-number-mobile`) — the
  single badge element to keep in sync on every cart mutation.
- **`hydratePrototypeChrome`** (`View.js`) — the canonical non-destructive
  bind-only pattern the new open/close + render wiring must follow (no chrome
  `innerHTML` rewrites).

### Established Patterns
- **SSR-static chrome + non-destructive hydration** — `header.ejs`/partials render
  server-side; `View.js` only binds handlers / toggles classes. The drawer joins
  this chrome and must obey the same rule (survive load + language toggle).
- **Site-wide JS lives in `View.js` / its bundle**, NOT `homepage.js`
  (home-only, loaded at `home.ejs:253`). The open/close + render wiring must move
  to the site-wide path so it runs on every page.
- **RTL true mirror (Phase 39 D-09 / Phase 42)** — drawer side + close-button
  corner mirror on `/he`.
- **Currency re-render via `currency-changed`** (Phase 40) — the drawer becomes a
  new subscriber alongside `categoriesView`/`cartView`.

### Integration Points
- **Nav cart icon** (`header.ejs:50`, `#tk-cart-open`, currently
  `<a href="/{lang}/cart">`) — convert to open the drawer (preserve href as
  no-JS fallback). Opens on every page incl. `/cart` (D-05).
- **Add-to-cart entry points** — must trigger auto-open (D-04) + badge/subtotal
  refresh. (Homepage featured grid added in Phase 40.1 — ensure it drives the
  real drawer once wired.)
- **Mobile collapsed bar** (Phase 42 D-03) — cart icon already lives here; the
  drawer must open correctly under 800px and over both transparent (home hero) and
  solid nav variants.
- **CSS scoping** — site-wide drawer styles must be guarded against legacy
  `desktop-menu.css` selectors on non-home pages (see canonical_refs trap).

</code_context>

<specifics>
## Specific Ideas

- Keep the existing demo drawer's **look and bilingual labels** as the visual
  baseline — this phase is "promote + wire real data," not "redesign."
- Auto-open on add should feel like instant confirmation (boutique pattern), not
  an interruption — pair with the existing subtotal/note so the shopper sees value
  immediately.
- Empty state is warm and forward-moving: "Your cart is empty" + "Continue
  shopping" that closes the drawer rather than dead-ending.

</specifics>

<deferred>
## Deferred Ideas

- **Two-button checkout (View Cart + direct Checkout-to-payment)** — considered and
  rejected for this phase (D-01); would require a drawer-triggered payment flow.
  Could revisit if a future phase moves checkout entry earlier in the funnel.
- **Promo codes / shipping estimate / save-for-later in the mini-cart** — new
  capabilities; their own future phases, not this one.
- Overlay/drawer **motion-design polish** beyond a basic slide/fade — refine in
  `/gsd-ui-phase` for this phase; not a separate roadmap phase.

</deferred>

---

*Phase: 43-site-wide-cart-drawer*
*Context gathered: 2026-06-27*
