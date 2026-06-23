# Phase 39: Header Utilities Layout - Context

**Gathered:** 2026-06-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Polish the header utilities cluster (`.tk-nav__utils` in `backend/views/partials/header.ejs`) into the approved `.tk-*` visual design and make it RTL-correct on `/he`. The cluster contains three things — the language flags, the currency selector, and the cart icon + count.

**In scope:** visual styling and layout of flags, currency dropdown, and cart+count; their left-to-right order; RTL mirroring of the cluster on `/he`.

**Out of scope:** currency change behavior / `currency-changed` event wiring (Phase 40); footer social (Phase 41); mobile hamburger nav (Phase 42); nav-link or logo redesign; inner-page body restyle.

**Hard constraint:** SSR-static chrome. All changes live in `header.ejs` + `frontend/css/homepage.css`. Do NOT reintroduce destructive `View.setLanguage` / `View.js` `innerHTML` rewrites of the header (dual-render rule in CLAUDE.md). Language switching is a full server round-trip — the server re-renders flags/`selected`/currency labels/`dir`.

</domain>

<decisions>
## Implementation Decisions

### Flags (HEADER-01)
- **D-01:** Keep **two separate round SVG flag icons** (US + IL) — NOT a single combined pill, despite the milestone/criterion wording. The "one rounded pill" idea is dropped.
- **D-02:** Keep the existing inline SVG flag artwork in `header.ejs` (US + IL). Do NOT switch to emoji (`🇺🇸 🇮🇱`) — emoji render inconsistently across OSes and resist styling.
- **D-03:** Active-language treatment = **full color + full opacity on active, dimmed/desaturated (~0.4 opacity) on inactive**. Drop the current 2px gold ring (`box-shadow`) on the selected flag. (Refine spacing/sizing as part of the polish.)
- **⚠ ROADMAP edit required:** HEADER-01 and Phase 39 Success Criterion 1 currently say "a single rounded pill containing both IL and US flags." Amend both to describe two refined separate flag icons (full-color active / dimmed inactive). User explicitly approved amending the criterion — two icons is final.

### Utilities order — LTR (HEADER-03)
- **D-04:** Canonical left-to-right order on `/en` = **Flags → Currency → Cart**, with the cart icon+count at the far right edge. This matches the current DOM order in `header.ejs`, so no markup reordering is needed.
- **D-05:** Header frame unchanged: TK logo at the start (left), nav links centered, utilities cluster at the far end (right). Only the utils internal styling changes, not logo/nav placement.
- **⚠ ROADMAP edit required:** Success Criterion 3 lists "cart icon + item count, currency dropdown, and flag pill in the approved left-to-right sequence" — that ordering (cart leftmost) contradicts the locked Flags→Currency→Cart order and the "flag pill" wording. Amend criterion 3 to: Flags → Currency → Cart (cart at far right).

### Currency selector (HEADER-02)
- **D-06:** Keep the **native `<select>`** (`id="currency-desktop"`, `.tk-nav__currency-select`) but restyle it to match the `.tk-*` design — custom chevron (hide the OS arrow), matching font/spacing/border, and transparent-nav vs solid-nav color variants. Do NOT build a custom button+menu dropdown (keeps Phase 40 `currency-changed` wiring trivial and avoids extra a11y work).
- **D-07:** Option labels show **symbol + code**: `$ USD` and `₪ ILS`. (Hebrew option text still right-aligns via existing `dir="rtl"` on the select.)
- **D-08:** Default-selected option / reflecting the active currency is **deferred to Phase 40** (which reads `localStorage.currency`). Phase 39 only delivers the visual styling.
- **Cleanup note:** `homepage.css:117-123` `.tk-nav__currency` is dead/unused (markup uses `.tk-nav__currency-select`). Safe to remove during this phase.

### RTL mirroring (HEADER-04)
- **D-09:** On `/he`, perform a **true RTL mirror**: logo flips to the right edge, nav stays centered, utilities cluster moves to the left edge, and the cluster's internal order reverses → visually **Cart (left) → Currency → Flags (right)**.
- **D-10:** **Cart count badge** must flip sides in RTL. It is currently hard-pinned `right: -8px` (`homepage.css:138`); in RTL it must move to `left: -8px` so it sits on the correct side of the cart icon.
- **D-11:** Currency dropdown chevron and option text must follow `dir="rtl"` — chevron on the correct (left) side, option text right-aligned in Hebrew.
- **D-12:** Keep gaps symmetric (the existing `gap: 1.4rem` on `.tk-nav__utils`) — avoid per-side margins/padding that break when the row flips.
- **D-13:** Mirroring must NOT break nav-link centering or the TK logo position.
- **⚠ ROADMAP edit required:** Success Criterion 4 says "flag pill at the left, cart at the right" on `/he`. With the locked LTR order (Flags→Currency→Cart) a true mirror puts **cart at the left, flags at the right**. Amend criterion 4 to match the true-mirror behavior (cart left, flags right) and drop "pill".

### Claude's Discretion
- Exact RTL implementation mechanism (`[dir="rtl"]` selectors, `flex-direction: row-reverse`, logical properties, or a `.heb`/lang class) is left to the planner/researcher — note that `homepage.css` currently has **zero** RTL rules, so this is greenfield for the header.
- Exact opacity/desaturation values for inactive flags, custom chevron asset, and precise sizing/token usage.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 39: Header Utilities Layout" — goal + success criteria (note: criteria 1, 3, 4 require the amendments described in decisions above).
- `.planning/REQUIREMENTS.md` — HEADER-01 … HEADER-04 (HEADER-01 needs amendment per D-03).
- `.planning/PROJECT.md` §"Current Milestone: v1.7" — milestone goal, key context, and the SSR-static-chrome hard constraint.

### Project conventions
- `CLAUDE.md` §"SSR + Client Dual-Render" — the non-negotiable rule that the global chrome (`header.ejs`) is SSR-static and must not be destructively rewritten by `View.js`.

### Implementation targets (code)
- `backend/views/partials/header.ejs` (lines ~21-56) — the `.tk-nav__utils` cluster: `.tk-lang.flag-dropdown` flags, `#currency-desktop` select, `.tk-nav__cart` + `#tk-cart-count`.
- `frontend/css/homepage.css` — all header styling: `.tk-nav` (80-90), `.tk-nav__utils` (116), `.tk-lang`/`.flag-icon` (438-453), `.tk-nav__currency-select` (456-473), `.tk-nav__cart`/`.tk-nav__count` (125-147), dead `.tk-nav__currency` (117-123).
- `frontend/css/tokens.css` — `--tk-*` design tokens (gold, radii, header height, borders) consumed by the rules above.
- `frontend/js/View.js` §`hydratePrototypeChrome` (981-1016) — the non-destructive hydration path; confirm any new behavior stays non-destructive (no `innerHTML` rewrites of the prototype header).

### Visual reference
- `frontend/code.html` (lines ~69-90) — the original approved prototype's utility cluster markup (note: it used emoji flags + a text currency button; this phase deliberately diverges per D-01/D-02/D-06).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Inline US + IL flag SVGs already in `header.ejs` (and duplicated as template literals `ilFlag`/`usFlag` in `View.js`) — reuse the SSR ones; the JS copies are legacy `.menu`-path only and do not run on prototype chrome.
- `.tk-*` token system in `tokens.css` (gold, radii, borders, header height) — style with these, not hardcoded values.
- Transparent-vs-solid nav variants already exist (`.tk-nav--transparent` / `.tk-nav--solid`) — flags, currency, and cart all need both variants kept in sync.

### Established Patterns
- **SSR-static chrome + non-destructive hydration:** `header.ejs` renders the utilities; `View.js hydratePrototypeChrome` only binds flag-click navigation, relabels currency options, and updates the cart badge — no `innerHTML` rewrites. New work must follow this pattern.
- **Hybrid dual-class markup:** elements carry both `.tk-*` classes (styling) and legacy classes (`flag-icon`, `header-currency-selector`, `cart-number-mobile`) that are JS hooks. Keep the legacy classes — `persistCartNumber`, `initCurrencyPersistence`, and flag-click binding select against them.

### Integration Points
- Cart badge `#tk-cart-count` (`.cart-number-mobile`) is updated by `persistCartNumber` — RTL badge-side flip (D-10) is pure CSS, doesn't touch JS.
- Currency `<select>` (`.header-currency-selector[name="currency"]`) is where Phase 40 will attach `currency-changed` — keep it a native select (D-06) so that wiring stays simple.

</code_context>

<specifics>
## Specific Ideas

- Currency labels exactly as `$ USD` / `₪ ILS` (symbol + space + code).
- Inactive flags dimmed rather than ring-highlighted active — minimal, matches `.tk-*` aesthetic.
- The original prototype `frontend/code.html` is the visual north star for the cluster's minimalist feel, but this phase intentionally diverges from it on flags (SVG not emoji) and currency (styled native select, not text button).

</specifics>

<deferred>
## Deferred Ideas

- **Currency change behavior** (selecting a currency updates prices, persistence) — Phase 40 (CURR-01…05). Note pre-existing bug: `currency-changed` handler calls non-existent `this._render()` in `View.js` — must be fixed in Phase 40.
- **Footer social links** — Phase 41 (FOOT).
- **Mobile hamburger nav** (below 800px), including how flags/currency are reached on mobile — Phase 42 (NAV).
- **ROADMAP/REQUIREMENTS criterion amendments** (criteria 1, 3, 4 + HEADER-01) — should be applied to `.planning/ROADMAP.md` and `.planning/REQUIREMENTS.md` so verification matches the locked decisions. Flagged here so it isn't lost.

None of these are in Phase 39 scope.

</deferred>

---

*Phase: 39-header-utilities-layout*
*Context gathered: 2026-06-23*
