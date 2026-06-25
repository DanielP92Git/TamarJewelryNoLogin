# Phase 42: Mobile Navigation - Context

**Gathered:** 2026-06-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a working mobile navigation for the global `tk-nav` chrome. Below the
breakpoint, the desktop nav links (which already hide today) are replaced by a
**hamburger button** that opens a **full-screen overlay menu** exposing all
nav links plus the language and currency controls. The menu is dismissible
three ways and renders correctly in RTL — all without destructive `innerHTML`
rewrites to the chrome.

**In scope:** hamburger button + full-screen overlay menu, open/close behavior
(toggle, close button, outside/scrim tap), relocating flags + currency into the
overlay on mobile, breakpoint alignment, retiring the orphaned legacy mobile-menu
code, RTL correctness.

**Out of scope:** desktop nav redesign, nav-link/logo restyle, the site-wide
cart drawer (Phase 43), any new nav destinations, currency/language *behavior*
(already wired in Phases 39–40 — this phase only relocates the existing controls).
</domain>

<decisions>
## Implementation Decisions

### Menu Form Factor
- **D-01:** The opened menu is a **full-screen overlay** — a centered vertical
  list of the nav links with a dedicated close **✕** in a top corner. NOT a
  side drawer and NOT a dropdown panel. (User chose this over the simpler
  dropdown for the boutique-elegant feel.)
- **D-02:** Language flags + currency selector sit **at the bottom of the
  overlay** (below the link list), per the chosen layout.

### Language / Currency on Mobile (NAV-04)
- **D-03:** **Hybrid placement.** The **cart icon stays in the collapsed header
  bar** (one-tap access). The **flags + currency selector move into the overlay
  menu** on mobile. So the mobile collapsed bar = logo (start) + cart + hamburger
  (far end). On desktop (≥ breakpoint) everything stays as today — flags +
  currency + cart all in `.tk-nav__utils`.
- **D-04:** Because flags/currency are *relocated* (not duplicated), the
  implementation must avoid two live copies fighting over the same JS hooks
  (`#currency-desktop`, `.header-currency-selector`, `.flag-icon[data-lang]`).
  Move via responsive CSS/layout of the single existing markup where feasible;
  if a second instance is unavoidable, keep IDs unique and ensure
  `initCurrencyPersistence` / flag-click binding / `currency-changed` still
  target the correct active control. (Approach is the planner's call — flagged
  as a known pitfall, see code_context.)

### Breakpoint
- **D-05:** **Align both to 800px.** Change the current `@media (max-width: 860px)`
  rule in `frontend/css/homepage.css:419` to **800px** so the hamburger appears
  at exactly the same width where `.tk-nav__links` hides — and so it matches the
  roadmap wording ("narrower than 800px") and the site's general 800px breakpoint
  (CLAUDE.md). Keep the single source of truth: links-hidden and hamburger-shown
  must use the same query.

### Hamburger Button + Legacy Cleanup
- **D-06:** Hamburger button sits at the **far end** of the header bar — right on
  `/en`, **mirrored to the left on `/he`** (consistent with the Phase 39 D-09 RTL
  true-mirror). On mobile the bar order is: logo → cart → hamburger (LTR);
  mirrored on RTL.
- **D-07:** **Retire the orphaned legacy mobile-menu code** — `svgHandler()` in
  `frontend/js/View.js:451` (and its `wasMenuOpen` restore block ~line 942) target
  `.menubars-svg` / `.menu`, which do **not** exist in the tk-nav chrome, so it
  currently just logs `'[View] Menu bars button not found'`. Remove/replace it with
  a fresh, small, **non-destructive** toggle.

### Toggle JS Placement & Non-Destructive Rule (NAV-05)
- **D-08:** The toggle must run on **every page**, so it lives in the **site-wide
  path** — bind a click handler inside `View.js` hydration (the established
  `hydratePrototypeChrome` non-destructive pattern: bind/toggle classes only, no
  `innerHTML` rewrites), **NOT** in `homepage.js` (which loads on the homepage
  only — `home.ejs:253`). A tiny inline script in `header.ejs` is an acceptable
  alternative; planner decides. Either way: **no destructive chrome rewrites**,
  and the menu's open/close state must survive the in-page language toggle.

### Dismissal (locked by Success Criterion 3)
- **D-09:** Menu dismisses **three ways**: tapping the hamburger again, a
  dedicated close **✕** button inside the overlay, and tapping the
  scrim/outside the menu content. (This is mandated by the roadmap criterion, not
  a free choice — captured here so the planner builds all three.)

### Claude's Discretion
- Overlay visual finish — scrim opacity/color, whether it's opaque or
  translucent, open/close animation (fade vs slide), body-scroll-lock while open,
  and how the active link is highlighted inside the overlay — are left to the
  planner / **`/gsd-ui-phase`** (this phase carries a UI hint). Reuse the existing
  `.is-active` link convention for the current page.
- Hamburger/close iconography: may reuse the legacy close-X SVG path (from the
  retired `svgHandler`) or a fresh icon — designer's call.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 42: Mobile Navigation" — goal + 5 success
  criteria (note Criterion 3 mandates all three dismissal methods; Criterion 5
  mandates RTL + no destructive `innerHTML`).
- `.planning/REQUIREMENTS.md` — NAV-01 … NAV-05.

### Chrome markup & styling (where the work happens)
- `backend/views/partials/header.ejs` — the `tk-nav` header. `.tk-nav__links`
  (lines ~13-19) are the links to expose; `.tk-nav__utils` (lines ~21-56) holds
  flags (`.flag-icon[data-lang]`), the currency `<select id="currency-desktop"
  .header-currency-selector>`, and the cart (`#tk-cart-open` / `#tk-cart-count`).
  Hamburger button is net-new markup added here.
- `frontend/css/homepage.css` — all tk-nav styling. **Line 419** `@media
  (max-width: 860px)` → change to 800px; **line 421** `.tk-nav__links { display:
  none }`; `.tk-nav--transparent` (439) vs solid variants both must keep working;
  flag/currency styles at 447-474.
- `frontend/js/View.js` — `hydratePrototypeChrome` (non-destructive bind pattern
  to follow); `svgHandler()` at **line 451** + the menu-restore block ~**line 942**
  (legacy code to retire, D-07).

### Cross-cutting traps (read before touching CSS/non-home pages)
- `chrome_rollout_css_conflicts` memory (`C:\Users\pagis\.claude\projects\C--Development-Online\memory\chrome_rollout_css_conflicts.md`)
  — legacy `desktop-menu.css` global element selectors hijack new tk-chrome on
  non-home pages; any new nav element (hamburger, overlay links) must be guarded
  (e.g. `.tk-nav a { width:auto }`-style scoping). `homepage.js` is home-only;
  `homepage.css` is site-wide.

### Carried decisions
- `.planning/phases/39-header-utilities-layout/39-CONTEXT.md` — D-05 (header frame:
  logo start / links center / utils far end), D-09 (RTL true mirror), the
  SSR-static-chrome + non-destructive-hydration rule, hybrid dual-class JS hooks.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`.tk-nav__links` anchors** (`header.ejs:13-19`) — the 5 links to render in the
  overlay; reuse their `href`/`is-active` logic verbatim.
- **Existing flags + currency markup** (`header.ejs:22-48`) — relocate, don't
  rebuild. Keep legacy JS-hook classes (`flag-icon`, `header-currency-selector`,
  `cart-number-mobile`).
- **Legacy close-X SVG** (`View.js:482-484`) — usable icon artwork even though the
  surrounding `svgHandler` machinery is being retired.
- **`hydratePrototypeChrome`** — the canonical non-destructive bind pattern the new
  toggle should mirror.

### Established Patterns
- **SSR-static chrome + non-destructive hydration:** `header.ejs` renders;
  `View.js` only binds/toggles classes — never `innerHTML`-rewrites the header.
  NAV-05 reinforces this.
- **RTL true mirror (Phase 39 D-09):** logo/utils swap sides on `/he`; the
  hamburger and overlay must mirror the same way.
- **Transparent vs solid nav variants:** hamburger + overlay must look correct over
  both (`.tk-nav--transparent` overlays the hero on home; solid elsewhere).

### Integration Points
- **Breakpoint single-source:** the same media query gates `.tk-nav__links {
  display:none }` and the hamburger's appearance (D-05).
- **Currency/flags JS hooks** (`#currency-desktop`, `.header-currency-selector`,
  `.flag-icon[data-lang]`): Phase-40 `initCurrencyPersistence` / `currency-changed`
  and flag-click navigation bind to these. Relocating the controls into the overlay
  MUST NOT create duplicate-ID conflicts or orphan these bindings (D-04 pitfall).
- **Toggle script must be site-wide** (`View.js` bundle), not `homepage.js`
  (home-only, `home.ejs:253`).

</code_context>

<specifics>
## Specific Ideas

- Layout reference for the overlay (from the chosen mockup): nav links centered
  and stacked vertically; close ✕ top corner; flags + `$ USD` currency control
  pinned at the bottom of the overlay.
- Collapsed mobile bar contents: logo + cart + hamburger only (flags/currency are
  inside the overlay).

</specifics>

<deferred>
## Deferred Ideas

- Overlay micro-interactions / motion design polish beyond a basic open/close —
  can be refined in `/gsd-ui-phase` for this phase; not a separate roadmap phase.
- Site-wide cart **drawer/mini-cart** behavior — explicitly **Phase 43**, not here.
  This phase keeps the cart as a plain link/icon in the bar.

None of the above expand Phase 42's scope — discussion stayed within the mobile-nav boundary.

</deferred>

---

*Phase: 42-mobile-navigation*
*Context gathered: 2026-06-25*
