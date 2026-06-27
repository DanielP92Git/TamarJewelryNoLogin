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
  warning: 6
  info: 4
  total: 10
status: issues_found
---

# Phase 42: Code Review Report

**Reviewed:** 2026-06-27
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the Phase 42 mobile-navigation work: the SSR hamburger button +
`#tk-mobile-nav` overlay (`header.ejs`), the overlay/breakpoint CSS
(`homepage.css`), the `_bindHamburgerMenu()` toggle plus the `svgHandler()`
legacy retirement (`View.js`), and the lifecycle test suite.

The core architecture is sound: the overlay is SSR-static, the toggle uses a
`data-tkHamburgerBound` double-bind guard consistent with the existing
`hydratePrototypeChrome` pattern, the duplicate-ID concern for the currency
`<select>` was handled correctly (`currency-desktop` vs `currency-mobile`), and
design tokens carry sensible fallbacks. No security vulnerabilities or
crash-class bugs were found, and `<%= %>` output escaping is intact.

However, the adversarial pass surfaced six robustness/correctness defects and
four quality issues. The most concrete: the flag SVGs were cloned verbatim into
the overlay, emitting duplicate (load-bearing) element IDs; the overlay stays
stuck open with scroll locked when the viewport crosses 800px; the scrim-dismiss
guard does not actually recognize the language flags it claims to protect; the
`aria-modal` dialog has no real focus trap; `stickyMenuFn` abuses the `+`
operator; and — despite a 580-line test file in the same phase — the new
hamburger toggle has no test coverage at all.

## Warnings

### WR-01: Duplicate `id` attributes (`flag-icons-il` / `clipPath#il-a`) after cloning flags into the overlay

**File:** `backend/views/partials/header.ejs:108`, `:115`, `:116` (originals at `:24`, `:31`, `:32`)
**Issue:** The phase duplicated the full flag-dropdown markup into
`.tk-mobile-nav__controls`. The SSR page now emits `id="flag-icons-us"`,
`id="flag-icons-il"`, and `<clipPath id="il-a">` **twice** in the same document.
Duplicate IDs are invalid HTML, and the duplicated `clipPath id="il-a"` is
load-bearing: the Israeli flag is clipped via `clip-path="url(#il-a)"`, which per
spec resolves to the **first** `#il-a` in document order. It renders today only
because both definitions are byte-identical — a fragile coincidence. Any future
edit to one flag (or a tool that de-dupes/strips defs) silently mis-clips the
overlay flag.
**Fix:** Give the overlay copies unique IDs and update the local reference, e.g.
```html
<svg id="flag-icons-il-m" ...>
  <defs><clipPath id="il-a-m"><path .../></clipPath></defs>
  <g clip-path="url(#il-a-m)"> ... </g>
</svg>
```
Better: factor the two identical flag-dropdown blocks into a shared EJS partial
parameterized by an `idSuffix`, so desktop/mobile stay in sync and collisions are
impossible.

### WR-02: Overlay stays open and scroll-locked when the viewport grows past the 800px breakpoint

**File:** `frontend/js/View.js:896-908`; `frontend/css/homepage.css:526-560`
**Issue:** `#tk-mobile-nav` has no `display:none` at `>=800px` and there is no
`resize` handler that closes it. If a device crosses the breakpoint while the
menu is open (tablet rotated portrait→landscape, desktop window resize, devtools),
the desktop `.tk-nav__links` reappear **and** the full-screen overlay remains
`is-open` covering the page, with `document.body.style.overflow` still `'hidden'`
(scroll locked). The hamburger is now `display:none`, so the documented "re-tap to
close" cannot help; only the close button / Escape recover.
**Fix:** Close and unlock on resize past the breakpoint. CSS alone
(`@media (min-width:800px){ #tk-mobile-nav{ display:none } }`) is insufficient — it
leaves `body.overflow` locked. Wire a matchMedia listener:
```js
const mq = window.matchMedia('(min-width: 800px)');
mq.addEventListener('change', e => { if (e.matches) close(); });
```
(`close()` already clears `overflow` and `is-open`.)

### WR-03: Scrim/outside-tap guard does not recognize the language flags it claims to protect

**File:** `frontend/js/View.js:925-928`
**Issue:** The outside-tap dismissal does
`if (e.target.closest('a, button, select, input, label')) return;` and the comment
states it protects "links, close button, flags, currency select." But the flags
are `<div class="flag-icon" role="button">` — **not** `<button>` — so `closest()`
returns `null` and tapping a flag falls through to `close()`. The flag's own click
handler (`hydratePrototypeChrome`, line 850) also fires and calls
`window.location.assign(...)`, so the navigation currently masks the stray
`close()`. The logic is still wrong against its documented contract and becomes
user-visible the moment flag selection is made async/SPA or navigation is blocked.
**Fix:** Include the role-based control in the guard:
```js
if (e.target.closest('a, button, select, input, label, .flag-icon, [role="button"]')) return;
```

### WR-04: `aria-modal="true"` dialog with no real focus trap

**File:** `frontend/js/View.js:896-908` (the `// focus trap` comments); `backend/views/partials/header.ejs:76`
**Issue:** The overlay is announced to assistive tech as a modal dialog
(`role="dialog" aria-modal="true"`), and the JS comments label the open/close
focus moves a "focus trap." It is not one — nothing constrains Tab order, so
keyboard/AT users can Tab straight out of the visible overlay into the page
content underneath (the header logo and `.tk-nav__cart` remain focusable and are
not `inert`/`aria-hidden`). `aria-modal` then misrepresents the actual behavior.
UAT only exercised mouse + Escape, so this was not caught.
**Fix:** Implement an actual trap (cycle Tab/Shift+Tab between first/last focusable
elements while open, or mark `header.tk-nav` `inert`/`aria-hidden` in `open()` and
restore in `close()`). If a trap is out of scope for v1, drop `aria-modal="true"`
and the "focus trap" comments so the markup does not over-promise to AT.

### WR-05: `stickyMenuFn` chains `classList.add()`/`remove()` with `+`, producing a discarded NaN

**File:** `frontend/js/View.js:238`, `:259`
**Issue:** This phase modified `stickyMenuFn` (added the `innerWidth < 800` guards).
Two lines in the touched function abuse the `+` operator:
```js
menu.classList.add('sticky') + menu.classList.remove('hidden');
```
`classList.add`/`remove` return `undefined`, so this evaluates
`undefined + undefined → NaN`, which is discarded. It "works" only via the method
side effects, reads as an intended expression, and is a correctness/clarity trap.
**Fix:** Use statements:
```js
menu.classList.add('sticky');
menu.classList.remove('hidden');
```

### WR-06: The new mobile-nav toggle has no test coverage

**File:** `frontend/tests/integration/lifecycle.test.js:59-65`, `:524-538`
**Issue:** A 580-line test file is part of this phase, but every language-switch
test renders a `.menu` fixture, so `setLanguage()` takes the legacy `.menu` branch
and never reaches `hydratePrototypeChrome → _bindHamburgerMenu` — the actual
production path for header.ejs pages. The one no-`.menu` test (`should handle
missing menu element gracefully`) deliberately omits `.tk-hamburger`/
`#tk-mobile-nav`, so `_bindHamburgerMenu` returns early at line 890. Result: open/
close, body scroll lock, Escape dismissal, and the scrim handler (WR-03) — the
core deliverables of the phase — are entirely untested, which is why WR-02/WR-03/
WR-04 slipped through.
**Fix:** Add a test that renders the SSR-chrome fixture (`.tk-hamburger` +
`#tk-mobile-nav` with `.tk-mobile-nav__close`), invokes
`view.hydratePrototypeChrome('eng', 0)`, then asserts: hamburger click adds
`is-open` and sets `aria-expanded="true"`; close button / Escape / empty-space tap
remove it; and a tap on a `.flag-icon` does NOT close it (covers WR-03).

## Info

### IN-01: Dead/misleading "Dismissal method 1: hamburger re-tap" path

**File:** `frontend/js/View.js:910-913`
**Issue:** The header is `z-index:100` and the overlay is `z-index:200`, so once
open the overlay covers the hamburger. A "re-tap" actually lands on the overlay's
top strip and is handled by the scrim listener (WR-03 path), never by this toggle
handler's `close()` branch — which is therefore unreachable via pointer.
**Fix:** Simplify to `open()` on first tap and update the comment, or explicitly
document that re-tap-to-close is handled by the scrim listener.

### IN-02: Document-level `keydown` (Escape) listener is only guarded by the hamburger element

**File:** `frontend/js/View.js:931-933`
**Issue:** The Escape handler is `document.addEventListener('keydown', ...)` inside
`_bindHamburgerMenu`, gated only by the hamburger's `data-tkHamburgerBound` flag.
Safe under the current SSR-static design, but if the chrome is ever client-rendered
with a fresh hamburger element the guard passes and a new `document` keydown
listener accumulates each render, each closing over a stale `overlay`.
**Fix:** Track the document listener with a module/window-level flag, or attach the
keydown handler to the overlay element instead of `document`.

### IN-03: Overlay link list has no scroll fallback for short viewports

**File:** `frontend/css/homepage.css:585-592`
**Issue:** `.tk-mobile-nav__links` is `flex:1` centered with no `overflow`, and
`open()` locks body scroll. On a short landscape phone the 5 links + top strip +
controls can exceed viewport height with no way to scroll to clipped items.
**Fix:** Add `overflow-y:auto` to `.tk-mobile-nav__links` (or `#tk-mobile-nav`).

### IN-04: Overlay flags are `role="button" tabindex="0"` but respond only to `click`

**File:** `backend/views/partials/header.ejs:107`, `:114`; `frontend/js/View.js:847-861`
**Issue:** The flags advertise themselves as keyboard-operable buttons, but
`hydratePrototypeChrome` binds only `click`. Enter/Space on a focused flag does
nothing (native click synthesis does not apply to non-button elements), so keyboard
users cannot switch language via the flags. Pre-existing pattern, reproduced by the
overlay.
**Fix:** Add a keydown handler for Enter/Space, or render the flags as real
`<button>`s.

---

_Reviewed: 2026-06-27_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
