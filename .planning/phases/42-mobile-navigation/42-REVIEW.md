---
phase: 42-mobile-navigation
reviewed: 2026-06-27T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - backend/views/partials/header.ejs
  - frontend/css/homepage.css
  - frontend/js/View.js
  - frontend/tests/integration/lifecycle.test.js
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 42: Code Review Report

**Reviewed:** 2026-06-27T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the Phase 42 mobile-navigation work: the SSR hamburger button +
`#tk-mobile-nav` overlay (`header.ejs`), the overlay/breakpoint CSS
(`homepage.css`), the `_bindHamburgerMenu()` toggle plus the `svgHandler()`
legacy retirement (`View.js`), and the lifecycle test comment update.

The core flow is sound and matches what UAT confirmed (open + close button +
scrim + Escape). Design-token references all resolve against the new
`tokens.css`, the double-bind guard correctly prevents listener accumulation,
and the legacy-retirement does not break `cleanup.test.js` (those tests assert
only that `setLanguage` resolves, never call `svgHandler` directly).

No BLOCKERs found. There are, however, four correctness/robustness defects worth
fixing: duplicate SVG `id`s introduced by cloning the flag markup into the
overlay, an overlay that stays stuck open (with body scroll locked) when the
viewport crosses 800px, a scrim-dismiss guard that does not actually recognize
the language flags it claims to protect, and an `aria-modal` dialog with no real
focus trap. Several smaller quality issues are filed as Info.

## Warnings

### WR-01: Duplicate `id` attributes (`flag-icons-il` / `clipPath#il-a`) after cloning flags into the overlay

**File:** `backend/views/partials/header.ejs:108`, `:115`, `:116` (and the original copies at `:24`, `:31`, `:32`)
**Issue:** The phase duplicated the full flag-dropdown markup into
`.tk-mobile-nav__controls`. The SSR page now emits `id="flag-icons-us"`,
`id="flag-icons-il"`, and `<clipPath id="il-a">` **twice** in the same document.
Duplicate IDs are invalid HTML, and the duplicated `clipPath id="il-a"` is
load-bearing: the Israeli flag is clipped via `clip-path="url(#il-a)"`, which
per spec resolves to the **first** `#il-a` in document order. It renders today
only because both definitions are byte-identical — a fragile coincidence. Any
future edit to one flag (or an AT/browser that de-dupes IDs) silently mis-clips
the overlay flag.
**Fix:** Give the overlay copies unique IDs and update the local reference, e.g.

```html
<svg id="flag-icons-il-m" ...>
  <defs><clipPath id="il-a-m"><path .../></clipPath></defs>
  <g clip-path="url(#il-a-m)"> ... </g>
</svg>
```

Better still, factor the two identical flag-dropdown blocks into a shared EJS
partial parameterized by an `idSuffix`, so desktop and mobile stay in sync and
collisions are impossible.

### WR-02: Overlay stays open and scroll-locked when viewport grows past the 800px breakpoint

**File:** `frontend/js/View.js:896-908`; `frontend/css/homepage.css:526-560`
**Issue:** `#tk-mobile-nav` has no `display:none` at `>=800px` and there is no
`resize` handler that closes it. On a device that crosses the breakpoint while
the menu is open (e.g. a tablet rotated portrait→landscape: 768px → 1024px), the
desktop `.tk-nav__links` reappear **and** the full-screen overlay remains
`is-open` covering the page, with `document.body.style.overflow` still `'hidden'`
(scroll locked). The hamburger toggle is now `display:none`, so the documented
"re-tap to close" cannot help; only the close button / Escape recover.
**Fix:** Close and unlock on resize past the breakpoint. A pure CSS
`@media (min-width:800px){ #tk-mobile-nav{ display:none } }` is **not**
sufficient on its own because it leaves `body.overflow` locked — wire a resize
listener instead:

```js
const mq = window.matchMedia('(min-width: 800px)');
mq.addEventListener('change', e => { if (e.matches) close(); });
```

(`close()` already clears `overflow` and `is-open`.)

### WR-03: Scrim/outside-tap guard does not recognize the language flags it claims to protect

**File:** `frontend/js/View.js:925-928`
**Issue:** The outside-tap dismissal does
`if (e.target.closest('a, button, select, input, label')) return;` and the
comment states the guard protects "links, close button, flags, currency select."
But the language flags are `<div class="flag-icon" role="button">` — **not**
`<button>` elements — so `closest()` returns `null` and tapping a flag falls
through to `close()`. The flag's own click handler
(`hydratePrototypeChrome`, line 850) fires too and calls
`window.location.assign(...)`, so the navigation currently masks the stray
`close()`. The logic is nonetheless wrong against its documented contract and
becomes user-visible the moment flag selection is made async/SPA or navigation
is blocked.
**Fix:** Include the role-based control in the guard:

```js
if (e.target.closest('a, button, select, input, label, [role="button"]')) return;
```

### WR-04: `aria-modal="true"` dialog with no real focus trap

**File:** `frontend/js/View.js:896-908` (the `// focus trap` comments); `backend/views/partials/header.ejs:76`
**Issue:** The overlay is announced to assistive tech as a modal dialog
(`role="dialog" aria-modal="true"`), and the JS comments label the open/close
focus moves as a "focus trap." It is not one — nothing constrains Tab order, so
keyboard/AT users can Tab straight out of the visible overlay into the page
content underneath (which is not inert). `aria-modal` then misrepresents the
actual behavior. UAT only exercised mouse + Escape, so this gap was not caught.
**Fix:** Either implement an actual trap (cycle Tab/Shift+Tab between the first
and last focusable elements in `#tk-mobile-nav` while open, or use the
`inert` attribute / `dialog` element), or, if a trap is out of scope for v1,
drop `aria-modal="true"` and the "focus trap" comments so the markup does not
over-promise to AT.

## Info

### IN-01: Dead/misleading "Dismissal method 1: hamburger re-tap" path

**File:** `frontend/js/View.js:910-913`
**Issue:** The header is `z-index:100` and the overlay is `z-index:200`
(confirmed in `tokens.css`), so once open the overlay covers the hamburger. A
"re-tap" actually lands on the overlay's empty top strip and is handled by the
scrim listener (WR-03 path), never by this toggle handler's `close()` branch —
which is therefore unreachable via pointer. This also contradicts the phase
decision that "re-tap-the-hamburger was intentionally dropped." Harmless, but the
comment is inaccurate and the `close()` branch here is dead.
**Fix:** Simplify to `open()` only (first tap) and update the comment, or
explicitly document that re-tap is handled by the scrim listener.

### IN-02: Legacy `.menu` branch of `setLanguage` no longer wires any mobile menu toggle

**File:** `frontend/js/View.js:617-839` (the `if (!menu)` else-branch)
**Issue:** Retiring `svgHandler()` removed the only mobile-menu wiring from the
legacy `.menu` code path; `_bindHamburgerMenu()` is called solely from the
`hydratePrototypeChrome` (no-`.menu`) branch. Any page that still renders the
old `.menu` + `.menubars-svg` chrome (e.g. the static `frontend/html/*.html`
files) would have a non-functional hamburger. This appears intentional per
decision D-07 (those pages are believed dead post-SSR-migration), but it is not
verified here.
**Fix:** Confirm no production route still serves the legacy `.menu` chrome; if
any does, migrate it to the SSR header or restore a toggle for it.

### IN-03: Overlay link list has no scroll fallback for short viewports

**File:** `frontend/css/homepage.css:585-592`
**Issue:** `.tk-mobile-nav__links` is `flex:1` centered with no `overflow`, and
`open()` locks body scroll. On a short landscape phone the 5 links + top strip +
controls can exceed the viewport height with no way to scroll to clipped items.
**Fix:** Add `overflow-y:auto` to `.tk-mobile-nav__links` (or to
`#tk-mobile-nav`) so content remains reachable when it overflows.

### IN-04: Bare short-circuit / ternary expression statements may trip ESLint and read poorly

**File:** `frontend/js/View.js:900` (`closeBtn && closeBtn.focus();`), `:912` (`overlay.classList.contains('is-open') ? close() : open();`)
**Issue:** Both are expression statements used for control flow. Depending on the
project ESLint config (`no-unused-expressions`) they may warn, and they are less
clear than explicit conditionals.
**Fix:** `if (closeBtn) closeBtn.focus();` and
`if (overlay.classList.contains('is-open')) close(); else open();`.

---

_Reviewed: 2026-06-27T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
