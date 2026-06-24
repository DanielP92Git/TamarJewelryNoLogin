---
phase: 40-currency-selector-wiring
plan: 01
subsystem: ui
tags: [currency, localStorage, ssr, custom-events, geoip, parcel]

# Dependency graph
requires:
  - phase: 39-header-utilities-layout
    provides: styled native currency <select> (.header-currency-selector / .tk-nav__currency-select), deferred D-08 dropdown-reflects-currency
provides:
  - Category prices render in the persisted currency on SSR reload and on navigation (not the SSR language-default)
  - Header currency dropdown stays in sync with localStorage + rendered prices after a GeoIP first-load override
  - Confirmed-working currency-changed publisher/subscriber/on-load-sync wiring (audit, no code change needed for the live-switch path)
affects: [40-02 cart currency wiring, 40.1 homepage featured products]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SSR price reconciliation: after extracting SSR products, re-render once only when persisted currency differs from the language-default SSR currency (guarded to preserve SSR DOM)"
    - "Inline, load-order-independent syncCurrencySelectors mirror in locale.js (value-only, non-destructive) for the early GeoIP path"

key-files:
  created: []
  modified:
    - frontend/js/Views/categoriesView.js
    - frontend/js/locale.js

key-decisions:
  - "D-05 verify-then-fix: live testing found the re-render IS broken on reload/nav, so the fix was applied (not preemptive)"
  - "Fixed the GeoIP selector/storage desync inline in locale.js rather than importing the heavy View.js module, to keep the early-bootstrap path lightweight and load-order-independent"

patterns-established:
  - "Pattern 1: SSR pages reconcile persisted currency vs language-default SSR currency on load with a single guarded displayProducts() re-render"
  - "Pattern 2: any programmatic currency-changed dispatch (locale.js GeoIP) must also call a selector sync — the dispatch alone never moves the <select>"

requirements-completed: [CURR-01, CURR-02, CURR-05]

# Metrics
duration: ~20min
completed: 2026-06-25
---

# Phase 40 Plan 01: Currency Selector Wiring (Verify + Harden) Summary

**Category prices now re-render in the persisted currency on SSR reload/navigation, and the header dropdown stays in sync with localStorage + prices after a GeoIP first-load override — fixing two real desync bugs surfaced by live human verification.**

## Performance

- **Duration:** ~20 min (Task 2 continuation; Task 1 audit committed earlier)
- **Completed:** 2026-06-25
- **Tasks:** Task 1 (audit) complete earlier; Task 2 (live-verify) surfaced real bugs → fixes applied
- **Files modified:** 2 (source) + frontend bundle rebuilt

## Accomplishments

- **Primary fix (reload + navigation persistence, CURR-05):** `initialSetup()` in `categoriesView.js` extracted SSR products but never re-rendered, so a persisted currency (e.g. ILS) silently reverted to the SSR language-default (`eng→usd` / `heb→ils`) on reload and when navigating between category pages. After `setupCurrencyHandler()`, SSR pages now re-render once when the selected currency differs from the SSR/language-default currency. Guarded so the SSR DOM is preserved when they already match (no DOM thrash, no first-paint regression).
- **Secondary fix (GeoIP first-load desync, D-04/D-08):** `hydrateLocaleFromBackend()` in `locale.js` overrode `localStorage.currency` and dispatched `currency-changed`, but never moved the header `<select>`. Result: after GeoIP resolution the dropdown disagreed with storage and rendered prices (observed: storage `usd`, selector stuck on `ils`). Added an inline `syncCurrencySelectors()` (mirrors `View.js:28-40`, value-only / non-destructive) called immediately after the override so selector, localStorage, and prices all agree.
- **Audit (Task 1, prior commit):** Publisher (`View.js` `initCurrencyPersistence` + `currency-changed` dispatch), the category subscriber (`setupCurrencyHandler` → `displayProducts`), the on-load `applySaved`/`syncCurrencySelectors` sync, and the GeoIP seed were all confirmed present and correct. The live USD↔ILS switch (no reload) already worked — left unchanged per D-05.

## Task Commits

1. **Task 1: Static wiring audit** — committed earlier (no code change; wiring confirmed present)
2. **Task 2 fix (primary): category re-render on SSR load** — `662f2c2` (fix)
3. **Task 2 fix (secondary): GeoIP selector sync** — `41d8dc0` (fix)

_Note: two CSS blockers found during the checkpoint were already fixed by the orchestrator in `29fe481` and `c7f35f0` (legacy hero CSS + `desktop-menu.css a{width:100%}` breaking `.tk-nav`); not redone here._

## Files Created/Modified

- `frontend/js/Views/categoriesView.js` — `initialSetup()` re-renders SSR products once when persisted currency ≠ SSR language-default currency (guarded).
- `frontend/js/locale.js` — added inline `syncCurrencySelectors()` and called it after the GeoIP currency override in `hydrateLocaleFromBackend()`.

## Decisions Made

- **D-05 confirmed as fix-now:** live verification proved the reload/navigation re-render was genuinely broken, so the documented fix was applied (this is the "fix only if broken" branch firing, not preemptive work).
- **Inline sync over View.js import:** the GeoIP fix duplicates a tiny value-only selector sync in `locale.js` rather than importing `View.js` (which pulls model.js, SVGs, etc.). `locale.js` bootstraps before the heavy view modules, so keeping it self-contained avoids load-order/circular-import risk. Non-destructive per the CLAUDE.md SSR-static-header rule.

## Deviations from Plan

These were the explicitly-gated D-05 fixes the plan anticipated (Task 1 step 3/4 and the checkpoint resume path), triggered by the live-verification failures — so they are planned conditional work rather than unplanned scope. Documented here for traceability.

**1. [Rule 1 - Bug] Category prices revert to SSR language-default on reload/navigation**
- **Found during:** Task 2 (live human verification)
- **Issue:** SSR-extracted products were never re-rendered, so a persisted currency only applied to live switches, not to reload or cross-category navigation.
- **Fix:** Guarded one-time `displayProducts()` re-render in `initialSetup()` when `selectedCurrency` ≠ SSR/language-default currency.
- **Files modified:** `frontend/js/Views/categoriesView.js`
- **Verification:** Pending live re-verify after backend restart (see below).
- **Committed in:** `662f2c2`

**2. [Rule 1 - Bug] Dropdown desyncs from storage/prices after GeoIP first-load override**
- **Found during:** Task 2 (live human verification, GeoIP path: `localStorage.removeItem('currency')` + reload)
- **Issue:** GeoIP override updated storage + dispatched `currency-changed` but never moved the `<select>`, leaving the dropdown showing the browser-guess value while storage/prices showed the GeoIP value.
- **Fix:** Inline `syncCurrencySelectors(mapped.appCurrency)` after the override in `hydrateLocaleFromBackend()`.
- **Files modified:** `frontend/js/locale.js`
- **Verification:** Pending live re-verify after backend restart.
- **Committed in:** `41d8dc0`

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs, both pre-authorized by the plan's D-05 verify-then-fix gate).
**Impact on plan:** Both fixes are minimal, follow existing patterns (guarded re-render / value-only selector sync), and preserve the SSR DOM when currency already matches. No scope creep; no new innerHTML rewrite of the SSR-static header.

## Issues Encountered

- Parcel minification strips comments, so a source-comment grep against `frontend/dist/` returns nothing — bundle content was verified via a successful clean build instead. `dist/` is gitignored and not committed.

## Build / Restart Requirement

- Frontend was rebuilt with a clean build (`rm -rf dist && npm run build`) so both fixes are bundled with new content-hashed filenames.
- **The running backend (port 4000) MUST be restarted** to extract the new bundle `<script>` tags from `dist/index.html`. Until restart, the live page serves the old bundle. The orchestrator should restart the backend and ask the user to re-verify.

## Pending Live Re-Verification (Task 2 checkpoint)

After backend restart, re-run the four checkpoint steps on a category page (e.g. `/en/necklaces`):
1. Live USD↔ILS switch re-prices with no reload. (Already confirmed working pre-fix.)
2. Reload on ILS → prices stay ILS AND dropdown shows ILS. (Primary fix target.)
3. Navigate to another category on ILS → ILS prices + dropdown. (Primary fix target.)
4. `localStorage.removeItem('currency')` + reload → selector, storage, and prices all agree on the GeoIP-resolved currency, never blank "default". (Secondary fix target.)

## Next Phase Readiness

- Category-page currency wiring is hardened. Plan 40-02 (cart drawer currency) can proceed.
- Final human sign-off on the four steps above is still outstanding pending the backend restart.

## Self-Check: PASSED

- `frontend/js/Views/categoriesView.js` — FOUND (guarded `ssrCurrency` re-render present)
- `frontend/js/locale.js` — FOUND (inline `syncCurrencySelectors` present, called in `hydrateLocaleFromBackend`)
- `40-01-SUMMARY.md` — FOUND
- Commit `662f2c2` (primary fix) — FOUND
- Commit `41d8dc0` (secondary fix) — FOUND

---
*Phase: 40-currency-selector-wiring*
*Completed: 2026-06-25*
