# Phase 42: Mobile Navigation - Pattern Map

**Mapped:** 2026-06-25
**Files analyzed:** 3 (all modified, none created net-new)
**Analogs found:** 3 / 3 (all files are self-referential — each file is its own analog)

---

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/views/partials/header.ejs` | SSR partial/template | request-response | self — existing overlay markup pattern in `homepage.css` (`.tk-drawer`) | role-match |
| `frontend/css/homepage.css` | stylesheet | N/A | self — existing `.tk-overlay` / `.tk-drawer` block (lines 359–395) | exact |
| `frontend/js/View.js` | base view / event binder | event-driven | self — `hydratePrototypeChrome` (line 978) | exact |

---

## Pattern Assignments

### `backend/views/partials/header.ejs` (SSR partial, request-response)

**Analog:** self — the file's existing structure plus the `.tk-drawer` overlay pattern from `homepage.css`

#### Existing structure (lines 1–57, full file — read-only reference):

```ejs
<%
  var _hero = (typeof heroNav !== 'undefined') && heroNav;
  var _active = (typeof activeNav !== 'undefined') ? activeNav : '';
  var _eng = lang === 'eng';
%>
<header class="tk-nav <%= _hero ? 'tk-nav--transparent' : 'tk-nav--solid' %>">
  <a class="tk-nav__logo" …>…</a>

  <nav class="tk-nav__links" aria-label="Primary">
    <a class="tk-nav__link<%= _active === 'Home' ? ' is-active' : '' %>" href="/<%= urlLang %>">…</a>
    …(5 links total)…
  </nav>

  <div class="tk-nav__utils">
    <div class="tk-lang flag-dropdown" role="group" aria-label="Language">
      <div class="flag-icon flag-eng<%= _eng ? ' selected' : '' %>" data-lang="eng" …>…svg…</div>
      <div class="flag-icon flag-heb<%= !_eng ? ' selected' : '' %>" data-lang="heb" …>…svg…</div>
    </div>
    <select name="currency" id="currency-desktop" class="header-currency-selector tk-nav__currency-select" …>
      …options…
    </select>
    <a class="tk-nav__cart" id="tk-cart-open" href="/<%= urlLang %>/cart" aria-label="Cart">
      …svg cart…
      <span class="tk-nav__count cart-number-mobile" id="tk-cart-count">0</span>
    </a>
  </div>
</header>
```

#### Net-new markup to append (hamburger button + overlay) — copy this pattern:

The hamburger button is appended as the last child of `<header class="tk-nav ...">`, after `</div>` (closing `.tk-nav__utils`):

```ejs
  <%# Hamburger button — hidden on desktop (≥800px), shown on mobile (<800px) %>
  <button
    type="button"
    class="tk-hamburger"
    aria-expanded="false"
    aria-controls="tk-mobile-nav"
    aria-label="<%= _eng ? 'Open navigation menu' : 'פתח תפריט ניווט' %>"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="1.5" stroke-linecap="round" width="24" height="24" aria-hidden="true">
      <line x1="3" y1="6"  x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  </button>
</header>

<%# Full-screen mobile navigation overlay — always in DOM; JS toggles .is-open %>
<div id="tk-mobile-nav" role="dialog" aria-modal="true"
     aria-label="<%= _eng ? 'Mobile navigation' : 'ניווט מובייל' %>">

  <%# Top strip: close button %>
  <div class="tk-mobile-nav__top">
    <button
      type="button"
      class="tk-mobile-nav__close"
      aria-label="<%= _eng ? 'Close navigation menu' : 'סגור תפריט ניווט' %>"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--tk-ink)"
           stroke-width="1.5" stroke-linecap="round" width="24" height="24" aria-hidden="true">
        <line x1="6" y1="6"  x2="18" y2="18"/>
        <line x1="18" y1="6" x2="6"  y2="18"/>
      </svg>
    </button>
  </div>

  <%# Center: nav links (reuse href / is-active from .tk-nav__links) %>
  <nav class="tk-mobile-nav__links" aria-label="Mobile primary">
    <a class="tk-mobile-nav__link<%= _active === 'Home'            ? ' is-active' : '' %>" href="/<%= urlLang %>"><%=          _eng ? 'Home'             : 'בית'             %></a>
    <a class="tk-mobile-nav__link<%= _active === 'Shop'            ? ' is-active' : '' %>" href="/<%= urlLang %>/necklaces"><%= _eng ? 'Shop'             : 'חנות'            %></a>
    <a class="tk-mobile-nav__link<%= _active === 'Jewelry Workshop'? ' is-active' : '' %>" href="/<%= urlLang %>/workshop"><%= _eng ? 'Jewelry Workshop' : 'סדנת תכשיטים'    %></a>
    <a class="tk-mobile-nav__link<%= _active === 'About'           ? ' is-active' : '' %>" href="/<%= urlLang %>/about"><%= _eng ? 'About'            : 'אודות'           %></a>
    <a class="tk-mobile-nav__link<%= _active === 'Contact Me'      ? ' is-active' : '' %>" href="/<%= urlLang %>/contact"><%= _eng ? 'Contact Me'       : 'צור קשר'         %></a>
  </nav>

  <%# Bottom strip: flags + currency (relocated from .tk-nav__utils on mobile) %>
  <%# IMPORTANT D-04: use class="header-currency-selector" + name="currency" %>
  <%# but a DIFFERENT id (e.g. id="currency-mobile") to avoid duplicate-ID conflict %>
  <div class="tk-mobile-nav__controls">
    <div class="tk-lang flag-dropdown" role="group" aria-label="Language">
      <div class="flag-icon flag-eng<%= _eng ? ' selected' : '' %>" data-lang="eng"
           role="button" tabindex="0" aria-label="English" title="English"<% if (_eng) { %> aria-current="true"<% } %>>
        <%# Same US flag SVG as in .tk-nav__utils — copy verbatim from header.ejs lines 24-28 %>
      </div>
      <div class="flag-icon flag-heb<%= !_eng ? ' selected' : '' %>" data-lang="heb"
           role="button" tabindex="0" aria-label="עברית" title="עברית"<% if (!_eng) { %> aria-current="true"<% } %>>
        <%# Same IL flag SVG as in .tk-nav__utils — copy verbatim from header.ejs lines 31-40 %>
      </div>
    </div>
    <select name="currency" id="currency-mobile"
            class="header-currency-selector tk-nav__currency-select"
            aria-label="Currency"<% if (!_eng) { %> dir="rtl"<% } %>>
      <option value="default" class="currency-option"><%= _eng ? 'Currency' : 'מטבע' %></option>
      <option value="usd" class="currency-option">$ USD</option>
      <option value="ils" class="currency-option">₪ ILS</option>
    </select>
  </div>

</div>
```

**D-04 PITFALL — duplicate-ID conflict:** The existing `header.ejs` has `id="currency-desktop"` on the `.tk-nav__utils` select. The overlay's second select MUST use `id="currency-mobile"` (or any other unique ID). The JS currency system is safe because:
- `syncCurrencySelectors` (View.js:28) queries by `select.header-currency-selector[name="currency"]` — class+name, not ID — so it syncs both selects at once.
- `initCurrencyPersistence` (View.js:42) uses event delegation on `document` via the same class+name selector — fires from whichever select the user changes.
- Flag bindings in `hydratePrototypeChrome` use `document.querySelectorAll('.flag-icon[data-lang]')` with a `data-tkLangBound='1'` double-bind guard — both sets of flags in the DOM will be bound once.

---

### `frontend/css/homepage.css` (stylesheet)

**Analog:** self — existing `.tk-overlay` / `.tk-drawer` block (lines 359–395) shows the established pattern for fixed full-screen overlays using `.is-open` class toggling.

#### Analog: existing overlay/drawer pattern (lines 359–395):

```css
/* Cart drawer overlay */
.tk-overlay {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(0,0,0,0.45);
  opacity: 0; pointer-events: none;
  transition: opacity var(--tk-dur) var(--tk-ease);
}
.tk-overlay.is-open { opacity: 1; pointer-events: auto; }

.tk-drawer {
  position: fixed; top: 0; right: 0; height: 100%;
  width: 420px; max-width: 90vw; z-index: 1101;
  background: #fff; box-shadow: -8px 0 30px rgba(0,0,0,0.12);
  display: flex; flex-direction: column;
  font-family: var(--tk-font-body);
  transform: translateX(100%);
  transition: transform var(--tk-dur-slow) var(--tk-ease);
}
.tk-drawer.is-open { transform: translateX(0); }
```

#### Breakpoint change (line 419) — change 860px → 800px:

```css
/* BEFORE (line 419): */
@media (max-width: 860px) {
  .tk-nav { padding: 0 1.25rem; }
  .tk-nav__links { display: none; }   /* line 421 — kept, moved to 800px query */
  …
}

/* AFTER — same block, single breakpoint for links-hidden AND hamburger-shown: */
@media (max-width: 800px) {
  .tk-nav { padding: 0 1.25rem; }
  .tk-nav__links { display: none; }   /* unchanged rule, now at 800px */
  …
}
```

#### New CSS blocks to add (after line 505 — after the RTL block):

```css
/* ---------- Hamburger button ---------- */
.tk-hamburger {
  background: none;
  border: none;
  cursor: pointer;
  display: none;              /* hidden at ≥800px */
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 10px;
  color: var(--tk-text);      /* currentColor for SVG stroke */
  flex: 0 0 auto;
}
/* Guard against desktop-menu.css bare `a { width:100% }` — same pattern as line 122 */
.tk-nav .tk-hamburger { width: 44px; }

.tk-nav--transparent .tk-hamburger { color: #fff; }

@media (max-width: 800px) {
  /* Show hamburger; hide flags + currency in utils bar (they live in overlay instead) */
  .tk-hamburger { display: flex; }
  .tk-nav__utils .tk-lang  { display: none; }
  .tk-nav__utils .tk-nav__currency-select { display: none; }
}

/* ---------- Mobile nav overlay ---------- */
#tk-mobile-nav {
  position: fixed;
  inset: 0;
  z-index: 200;                /* above header (--tk-z-header: 100); below cart drawer (1100+) */
  background: var(--tk-white);
  display: flex;
  flex-direction: column;
  font-family: var(--tk-font-body);
  /* Closed state */
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  transform: scale(0.98);
  transition:
    opacity var(--tk-dur-fast) var(--tk-ease),
    transform var(--tk-dur) var(--tk-ease),
    visibility 0s linear var(--tk-dur-fast);  /* visibility delayed on close */
}
#tk-mobile-nav.is-open {
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
  transform: scale(1);
  transition:
    opacity var(--tk-dur) var(--tk-ease),
    transform var(--tk-dur) var(--tk-ease),
    visibility 0s linear 0s;
}

/* Top strip (close button area) */
.tk-mobile-nav__top {
  position: relative;
  height: var(--tk-header-height);   /* 80px — mirrors header bar height */
  flex: 0 0 auto;
}
.tk-mobile-nav__close {
  position: absolute;
  inset-inline-end: 20px;            /* logical property — auto-mirrors LTR/RTL */
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 10px;
}

/* Nav link list (center section) */
.tk-mobile-nav__links {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--tk-xl, 32px);          /* xl spacing token — 32px */
}
.tk-mobile-nav__link {
  font-size: var(--tk-size-body);    /* 1rem */
  font-weight: var(--tk-weight-medium);
  letter-spacing: var(--tk-track-label);
  text-transform: uppercase;
  text-decoration: none;
  color: var(--tk-ink);
  opacity: 0.85;
  transition: color var(--tk-dur) var(--tk-ease), opacity var(--tk-dur) var(--tk-ease);
}
.tk-mobile-nav__link:hover { opacity: 1; }
/* is-active mirrors the desktop .tk-nav__link.is-active convention (homepage.css:113),
   but uses gold accent color (Claude's discretion per UI-SPEC) */
.tk-mobile-nav__link.is-active { color: var(--tk-gold); opacity: 1; }

/* Guard against desktop-menu.css bare `a { width:100% }` — same .tk-nav a pattern */
#tk-mobile-nav a { width: auto; }

/* Controls strip (bottom section — flags + currency) */
.tk-mobile-nav__controls {
  flex: 0 0 auto;
  height: var(--tk-header-height);   /* 80px */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--tk-lg, 24px);           /* lg token — 24px */
  padding: 0 var(--tk-md, 16px);
  border-top: 1px solid var(--tk-border-light);
  background: var(--tk-surface);     /* #fafafa — differentiated from link area */
}
/* Currency select inside overlay: always uses dark text (white panel, not transparent nav) */
.tk-mobile-nav__controls .tk-nav__currency-select {
  color: var(--tk-text-muted);
  border-color: var(--tk-border-strong);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%23666666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
```

#### Existing RTL pattern to copy (lines 494–505) — DO NOT add `flex-direction: row-reverse`:

```css
/* RTL header mirror (Hebrew /he)
   NOTE: `<html dir="rtl">` already reverses every flex-direction:row container
   natively. Do NOT add `flex-direction: row-reverse` — it double-reverses.
   Only physical, dir-agnostic properties need explicit flipping. */
[dir="rtl"] .tk-nav__count     { right: auto; left: -8px; }
[dir="rtl"] .tk-nav__currency-select {
  background-position: left 6px center;
  padding: 4px 8px 4px 24px;
}
```

For the overlay, `inset-inline-end` on `.tk-mobile-nav__close` (a CSS logical property) auto-positions correctly in both `dir="ltr"` and `dir="rtl"` — no `[dir="rtl"]` override needed. Flex centering on `.tk-mobile-nav__links` mirrors automatically.

#### Existing `.is-active` convention (lines 113–114):

```css
.tk-nav__link:hover, .tk-nav__link.is-active { opacity: 1; }
.tk-nav--solid .tk-nav__link:hover, .tk-nav--solid .tk-nav__link.is-active { color: var(--tk-text); }
```

The overlay `.tk-mobile-nav__link.is-active` extends this with `color: var(--tk-gold)` per UI-SPEC.

#### Legacy CSS guard pattern (line 122) — apply the same to overlay:

```css
/* Existing guard — copy pattern for overlay links */
.tk-nav a { width: auto; }
/* Add alongside it: */
#tk-mobile-nav a { width: auto; }
```

---

### `frontend/js/View.js` (base view / event binder, event-driven)

**Analog:** self — `hydratePrototypeChrome` (lines 978–1012) is the established non-destructive bind pattern.

#### Pattern to follow: `hydratePrototypeChrome` bind structure (lines 978–1012):

```javascript
// Behavior wiring for the global SSR-static prototype chrome. The header/footer
// markup is rendered server-side (header.ejs / footer.ejs), so we only attach
// behavior here — no destructive innerHTML rewrites.
async hydratePrototypeChrome(lng, cartNum) {
  // Language flags => full navigation to the other-language SSR URL.
  document.querySelectorAll('.flag-icon[data-lang]').forEach(flag => {
    if (flag.dataset.tkLangBound === '1') return; // avoid double-binding
    flag.dataset.tkLangBound = '1';
    flag.addEventListener('click', () => {
      const target = flag.getAttribute('data-lang') === 'heb' ? 'heb' : 'eng';
      const toUrlLang = target === 'heb' ? 'he' : 'en';
      localStorage.setItem('language', target);
      const path = window.location.pathname;
      const m = path.match(/^\/(en|he)(\/|$)/);
      const newPath = m
        ? path.replace(/^\/(en|he)/, '/' + toUrlLang)
        : '/' + toUrlLang;
      window.location.assign(newPath + window.location.search);
    });
  });

  // Currency option labels follow the page language.
  // Selection handled by the delegated `change` listener (initCurrencyPersistence).
  document
    .querySelectorAll('select.header-currency-selector[name="currency"]')
    .forEach(sel => this.updateCurrencySelectorText(sel, lng));

  // Cart count badge.
  if (typeof cartNum === 'number') {
    this.persistCartNumber(cartNum);
  }

  // Page-specific language/body setup MUST still run.
  if (typeof this.setPageSpecificLanguage === 'function') {
    await this.setPageSpecificLanguage(lng, cartNum);
  }
}
```

**Key rules from this pattern:**
- Use a guard attribute (`data-tkLangBound`) to prevent double-binding on language toggle.
- Never call `innerHTML` inside this method.
- Always `await this.setPageSpecificLanguage(lng, cartNum)` at the end.

#### New method to add inside `hydratePrototypeChrome` (before the `setPageSpecificLanguage` call):

```javascript
// Hamburger / mobile-nav toggle. Bound once per page load; survives language toggle
// because the SSR chrome is never rewritten (no innerHTML, no re-render).
this._bindHamburgerMenu();
```

#### New private method `_bindHamburgerMenu` — copy structure from `hydratePrototypeChrome` guards:

```javascript
_bindHamburgerMenu() {
  const hamburger = document.querySelector('.tk-hamburger');
  const overlay   = document.getElementById('tk-mobile-nav');
  const closeBtn  = overlay && overlay.querySelector('.tk-mobile-nav__close');

  if (!hamburger || !overlay) return; // guard: elements not present

  // Double-bind guard (same pattern as flag-icon bind guard in hydratePrototypeChrome)
  if (hamburger.dataset.tkHamburgerBound === '1') return;
  hamburger.dataset.tkHamburgerBound = '1';

  const open = () => {
    overlay.classList.add('is-open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';          // body scroll lock
    closeBtn && closeBtn.focus();                     // focus trap: move to close button
  };

  const close = () => {
    overlay.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    hamburger.focus();                                // focus trap: return to hamburger
  };

  // Dismissal method 1: hamburger toggle (re-tap)
  hamburger.addEventListener('click', () => {
    overlay.classList.contains('is-open') ? close() : open();
  });

  // Dismissal method 2: close ✕ button
  if (closeBtn) {
    closeBtn.addEventListener('click', close);
  }

  // Dismissal method 3: scrim / outside tap (click on overlay backdrop, not children)
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  // Bonus: Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
  });
}
```

#### Code to RETIRE — `svgHandler()` (lines 451–513, to be deleted):

```javascript
// DELETE THIS ENTIRE METHOD — it targets .menubars-svg / .menu which do not exist
// in the tk-nav chrome. The console.error('[View] Menu bars button not found') at
// line 512 confirms it always fails on all global-chrome pages.
svgHandler() {
  const menuBars = document.querySelector('.menubars-svg');  // never found
  const menu = document.querySelector('.menu');              // never found on tk-nav pages
  …
}
```

#### Code to RETIRE — `wasMenuOpen` restore block (lines 940–967, to be deleted):

```javascript
// DELETE THIS ENTIRE setTimeout BLOCK in setLanguage() ~line 940:
// It reinitializes svgHandler() after language change and restores .menu state —
// but .menu does not exist on tk-nav pages, so setLanguage() returns early at
// line 756 (via hydratePrototypeChrome) and this block is never reached anyway.
// The new _bindHamburgerMenu uses a data-tkHamburgerBound guard, so it is
// idempotent and does NOT need re-calling after language toggle.
setTimeout(() => {
  this.svgHandler();        // <-- retire
  if (wasMenuOpen) {        // <-- retire entire block
    …
  }
}, 0);
```

**Why the open state survives language toggle without the restore block:** the new overlay uses `classList.add/remove('is-open')` on the SSR-static `#tk-mobile-nav` element, which is never rewritten by `hydratePrototypeChrome`. The open/close state on the DOM element persists through the language toggle naturally.

#### `initCurrencyPersistence` — already safe for D-04 (lines 42–73, no changes needed):

```javascript
// Event delegation: works even if header/menu re-renders or elements are replaced.
document.addEventListener('change', e => {
  const target = e.target;
  if (!target.matches('select.header-currency-selector[name="currency"]')) return;
  …
});
```

This fires correctly from both `#currency-desktop` (in `.tk-nav__utils`) and `#currency-mobile` (in the overlay) because it matches by class+name, not ID. No change needed.

---

## Shared Patterns

### `.is-open` toggle class
**Source:** `frontend/css/homepage.css` lines 365, 375
**Apply to:** `#tk-mobile-nav` overlay
```css
/* Closed */  opacity: 0; pointer-events: none; visibility: hidden;
/* Open  */   .is-open { opacity: 1; pointer-events: auto; visibility: visible; }
```

### Double-bind guard
**Source:** `frontend/js/View.js` lines 982–983
**Apply to:** `_bindHamburgerMenu()` — prevent re-binding on language toggle
```javascript
if (hamburger.dataset.tkHamburgerBound === '1') return;
hamburger.dataset.tkHamburgerBound = '1';
```

### Legacy CSS conflict guard
**Source:** `frontend/css/homepage.css` line 122, 355
**Apply to:** All new nav anchor elements
```css
.tk-nav a { width: auto; }       /* existing */
#tk-mobile-nav a { width: auto; } /* add alongside — same pattern */
```

### Transparent nav color inheritance
**Source:** `frontend/css/homepage.css` lines 111, 135, 486–490
**Apply to:** `.tk-hamburger` button (hamburger SVG stroke must be white on transparent nav)
```css
.tk-nav--transparent .tk-hamburger { color: #fff; }
/* Note: SVG uses stroke="currentColor" — inherits from button color */
```

### RTL true-mirror rule
**Source:** `frontend/css/homepage.css` lines 494–505 comment block
**Apply to:** All new flex containers in overlay and hamburger button placement
```
DO NOT add flex-direction: row-reverse anywhere.
<html dir="rtl"> set server-side reverses all flex rows natively.
Use CSS logical properties (inset-inline-end, padding-inline-start/end) for
physical asymmetries. The close ✕ button uses inset-inline-end: 20px — this
auto-positions to top-right on LTR and top-left on RTL with no override.
```

---

## D-04 Pitfall Summary (duplicate-ID + orphaned bindings)

| Hook | Current selector | Risk on relocation | Verdict |
|---|---|---|---|
| `initCurrencyPersistence` change handler | `select.header-currency-selector[name="currency"]` (class+name, event delegation) | None — fires from any matching select anywhere in DOM | Safe |
| `syncCurrencySelectors` | `select.header-currency-selector[name="currency"]` (querySelectorAll) | None — syncs all matching selects | Safe |
| `hydratePrototypeChrome` flag bind | `.flag-icon[data-lang]` (querySelectorAll + `data-tkLangBound` guard) | None — guard prevents double-bind on second set of flags in overlay | Safe |
| `id="currency-desktop"` | Only used as HTML ID (no `getElementById` calls found in View.js) | Safe only if overlay select uses a DIFFERENT id | Use `id="currency-mobile"` in overlay |

**Planner directive:** The overlay's currency select MUST use `id="currency-mobile"` (not `id="currency-desktop"`). All class and name attributes must match exactly: `class="header-currency-selector tk-nav__currency-select"` + `name="currency"`.

---

## No Analog Found

None — all three files have strong existing patterns to follow.

---

## Metadata

**Analog search scope:** `frontend/js/View.js`, `frontend/css/homepage.css`, `backend/views/partials/header.ejs`, `frontend/css/tokens.css`
**Files scanned:** 4
**Pattern extraction date:** 2026-06-25
