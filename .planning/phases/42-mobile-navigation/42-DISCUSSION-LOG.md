# Phase 42: Mobile Navigation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-25
**Phase:** 42-mobile-navigation
**Areas discussed:** Menu form factor, Lang/currency placement, Breakpoint alignment, Hamburger position + legacy cleanup

---

## Menu Form Factor

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown panel under bar | Panel drops beneath the header bar; simplest, fewest RTL pitfalls (recommended) | |
| Full-screen overlay | Fills the screen with centered link list + close ✕; boutique-elegant, needs scroll-lock + transparent-nav handling | ✓ |
| Slide-in side drawer | Slides in from the side (RTL direction-aware); familiar but most moving parts | |

**User's choice:** Full-screen overlay
**Notes:** Layout per the chosen mockup — centered vertical link list, close ✕ top corner, flags + currency pinned at the bottom of the overlay.

---

## Language / Currency Placement on Mobile (NAV-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep in collapsed bar | Flags + currency + cart all stay in the bar (least work, already visible today); risk of crowding ~320px | |
| Move into the menu | Bar shows logo + cart + burger; flags + currency move into the overlay | |
| Hybrid: cart in bar, lang/curr in menu | Cart stays in the bar (one-tap); flags + currency move into the overlay | ✓ |

**User's choice:** Hybrid — cart in bar, language + currency into the menu
**Notes:** Mobile collapsed bar = logo + cart + hamburger. Must avoid duplicate-ID / orphaned-JS-hook conflicts when relocating the currency select and flags.

---

## Breakpoint Alignment

| Option | Description | Selected |
|--------|-------------|----------|
| Align both to 800px | Change the live 860px rule to 800px to match roadmap wording + site standard; hamburger appears exactly where links hide | ✓ |
| Keep current 860px | Leave tk-nav at 860px, just add the hamburger there; avoids touching the media query but diverges from roadmap | |

**User's choice:** Align both to 800px
**Notes:** `frontend/css/homepage.css:419` `@media (max-width: 860px)` → 800px. Single source of truth for links-hidden and hamburger-shown.

---

## Hamburger Position + Legacy Cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Far end + retire legacy | Hamburger at far end (right /en, mirror left /he); retire dead svgHandler/.menu, build fresh non-destructive toggle | ✓ |
| Far end + keep legacy code | Same placement, leave the orphaned svgHandler/.menu code (still logs its error) | |
| Near the logo (start side) | Hamburger next to logo; also retires legacy code | |

**User's choice:** Far end + retire legacy
**Notes:** Retires `svgHandler()` (`View.js:451`) + the menu-restore block (~line 942) that target non-existent `.menubars-svg`/`.menu` and currently log a console error.

---

## Claude's Discretion

- Overlay visual finish: scrim opacity/color, opaque vs translucent, open/close animation (fade vs slide), body-scroll-lock, active-link highlight inside the overlay — deferred to planner / `/gsd-ui-phase` (UI hint present). Reuse existing `.is-active` convention.
- Hamburger/close iconography: may reuse the legacy close-X SVG path or a fresh icon.
- Exact mechanism for relocating flags/currency (responsive CSS move of single markup vs second instance) — planner's call, with the duplicate-hook pitfall flagged.
- Toggle JS placement: `View.js` site-wide hydration (recommended) vs tiny inline script in `header.ejs` — planner decides; must be non-destructive and run on every page (NOT homepage.js).

## Deferred Ideas

- Overlay motion-design polish beyond basic open/close — within this phase's UI-SPEC, not a new phase.
- Site-wide cart drawer / mini-cart — explicitly Phase 43, not here.
