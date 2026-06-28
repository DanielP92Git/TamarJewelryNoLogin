---
phase: quick-260628-e7w
plan: "01"
subsystem: nav
tags: [nav, submenu, desktop, mobile, RTL, EJS, CSS, View.js]
dependency_graph:
  requires: []
  provides: [shop-categories-submenu-desktop, shop-categories-submenu-mobile]
  affects: [header.ejs, homepage.css, frontend/js/View.js]
tech_stack:
  added: []
  patterns: [click-to-toggle dropdown, mobile accordion, idempotent bind guard, logical CSS properties]
key_files:
  created: []
  modified:
    - backend/views/partials/header.ejs
    - frontend/css/homepage.css
    - frontend/js/View.js
decisions:
  - Hardcoded 6 categories inline in header.ejs to match established EJS style (avoid threading navCategories through buildPageData on ~9 include sites)
  - Used inset-inline-start logical CSS property for dropdown alignment (auto-handles RTL natively)
  - Separate double-bind guards for desktop (tkSubmenuBound) and mobile (tkMobileSubmenuBound) triggers
metrics:
  duration: "~15 min"
  completed: "2026-06-28"
  tasks_completed: 2
  tasks_total: 3
---

# Phase quick-260628-e7w Plan 01: Shop Submenu Summary

## One-liner

Click-to-toggle desktop dropdown and mobile accordion listing all 6 shop categories, with bilingual labels and RTL support, bound site-wide via View.js `_bindShopSubmenu()`.

## What Was Implemented

### Task 1 — Submenu markup (header.ejs) + CSS (homepage.css)

**header.ejs:**
- Added `cats[]` array at the top of the partial (6 entries with slug, English label, Hebrew label). Comment points to `backend/config/meta.js` + `backend/routes/ssrDynamic.js` as sources of truth.
- Replaced the standalone desktop Shop `<a>` with a `<div class="tk-nav__item tk-nav__item--has-submenu">` containing the trigger `<a>` + `<ul class="tk-nav__submenu">` of 6 category links.
- Replaced the standalone mobile Shop `<a>` with a `<div class="tk-mobile-nav__item tk-mobile-nav__item--has-submenu">` containing the trigger `<a>` + `<ul class="tk-mobile-nav__submenu">` of 6 category links.
- Both menus use `/<%= urlLang %>/<slug>` hrefs and render bilingual labels via `_eng ? c.en : c.he`.
- `aria-haspopup="true"` and `aria-expanded="false"` on both triggers.

**homepage.css:**
- Desktop dropdown: `.tk-nav__item--has-submenu { position: relative }`, `.tk-nav__submenu` hidden by default, shown via `.is-open`. Uses `inset-inline-start: 0` for RTL-safe alignment. Solid white background + shadow for readability in both transparent and solid nav states. `.tk-nav__submenu-link` guarded against legacy `desktop-menu.css` bare `a { width:100% }` hijack.
- Mobile accordion: `.tk-mobile-nav__submenu` hidden by default, shown via `.is-expanded`. Links centered, slightly smaller than top-level items.
- RTL rules: `[dir="rtl"] .tk-nav__submenu { text-align: right }` for desktop; `[dir="rtl"] .tk-mobile-nav__submenu-link` uses logical padding properties for right-side indent.
- Caret rotation: 180deg when `.is-open` / `.is-expanded` on the parent.

**Commit:** `927712f`

### Task 2 — Toggle behavior (View.js) + frontend rebuild

**View.js:**
- Added `_bindShopSubmenu()` method to the base View class.
- Called from `setLanguage()` right after `this._bindHamburgerMenu()` — runs site-wide on every page load and after every language toggle.
- Desktop: idempotent guard via `desktopTrigger.dataset.tkSubmenuBound`. `preventDefault()` + toggle `.is-open`. Closes on: outside click (document listener), Escape key, click on a category link, `matchMedia('(max-width: 799.9px)')` change.
- Mobile: idempotent guard via `mobileTrigger.dataset.tkMobileSubmenuBound`. `preventDefault()` + `classList.toggle('is-expanded')`. Category link clicks navigate normally.
- Both blocks guard early if elements are absent (pages without the nav are safe).

**Frontend rebuilt:** `npm run build` succeeded. Bundle `frontend.c01f7c79.js` confirmed to contain the submenu logic.

**Commit:** `b46cb7e`

## Commit Hashes

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Submenu markup (header.ejs) + CSS (homepage.css) | `927712f` |
| 2 | _bindShopSubmenu() in View.js + frontend rebuild | `b46cb7e` |

## IMPORTANT: Backend Must Be Restarted Before Testing

The backend reads `frontend/dist/index.html` at **startup** to extract bundle script hashes. The rebuild produced a new bundle hash (`frontend.c01f7c79.js`). The backend must be restarted to serve the new bundle. Without a restart, the old JS bundle will be served and the submenu toggle behavior will not work.

**Steps:**
1. Restart the backend (`npm run devStart` in `/backend` or restart the Node process)
2. Then verify in the browser

## Human-Verify Checkpoint (Pending)

Task 3 is a `checkpoint:human-verify` gate — it has NOT been completed and must be verified by a human. See the verification steps in the plan:

**Desktop (>=800px):**
1. Visit `http://localhost:3000/en` — click "Shop" — dropdown of 6 categories appears
2. Click a category → navigates; click outside → closes; press Escape → closes; caret/aria-expanded toggles
3. Visit a solid-nav page (e.g. `/en/about`) — dropdown is readable with solid background

**Mobile (<800px):**
4. Open hamburger menu, tap "Shop" → accordion expands with 6 categories; tap one → navigates; tap Shop again → collapses

**Hebrew / RTL:**
5. Visit `http://localhost:3000/he` — labels in Hebrew, links to `/he/<slug>`, layout right-aligned

**Language toggle:**
6. Toggle language while submenu is in use — submenu must still open/close correctly after toggle

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- `backend/views/partials/header.ejs`: modified (cats array + desktop dropdown + mobile accordion)
- `frontend/css/homepage.css`: modified (dropdown + accordion + RTL CSS)
- `frontend/js/View.js`: modified (_bindShopSubmenu method + call in setLanguage)
- Commits 927712f and b46cb7e: exist on branch `quick/260628-e7w-shop-submenu`
- EJS compiles: verified via `ejs.compile()`
- Bundle contains submenu logic: verified (`tkSubmenuBound` in `frontend.c01f7c79.js`)

## Self-Check: PASSED
