---
phase: 40-currency-selector-wiring
plan: 02
subsystem: ui
tags: [currency, localStorage, cart, custom-events, parcel, dual-encoding]

# Dependency graph
requires:
  - phase: 40-currency-selector-wiring
    plan: "01"
    provides: verified-working currency-changed publisher + on-load selector sync (View.js / locale.js)
provides:
  - Cart drawer re-prices line items + order summary on currency change (currency-changed subscriber confirmed correct)
  - Cart price helpers read live localStorage.currency on every render (no SSR/language-default price to revert to — cart is fully client-rendered)
  - D-06 window.location.reload() fallback preserved in the cart currency-changed catch
  - Dual-encoding seam confirmed consistent: localStorage 'usd'/'ils' vs cart-item '$'/'₪' symbol; live currency drives display, stored symbol is at-add-time only
affects: [40.1 homepage featured products]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cart drawer is fully client-rendered from localStorage; every render() re-derives price via _getItemPrice -> _getCurrentCurrency -> localStorage.currency, so persisted currency applies on reload/drawer-open with no SSR reconciliation step (unlike category pages in Plan 01)"

key-files:
  created: []
  modified:
    - frontend/js/Views/cartView.js

key-decisions:
  - "D-05 verify-then-fix: the cart re-price path passed ALL audit checks unchanged (subscriber shape, live-currency price helpers, dual-encoding consistency, reload fallback). No re-price fix was needed (contrast with Plan 01, where live testing forced a fix)."
  - "Claude's Discretion tidy: removed the unused `_rate = process.env.USD_ILS_RATE || 3.7` field (no live conversion; prices come from per-product dual usd/ils values)."

patterns-established:
  - "Cart on-load persistence is structural, not reconciled: because the cart drawer renders entirely from localStorage cart data, _getItemPrice always reads the live currency — there is no SSR price to silently override it."

requirements-completed: [CURR-02, CURR-04]

# Metrics
duration: ~15min
completed: 2026-06-25
---

# Phase 40 Plan 02: Cart Currency Wiring (Verify + Harden) Summary

**The cart drawer's currency-changed re-price path, live-currency price helpers, dual-encoding consistency, and the D-06 reload fallback were all confirmed correct by static audit; the only code change was removing one unused `_rate` field. Live human verification is pending a backend restart.**

## Performance

- **Duration:** ~15 min (Task 1 audit + tidy; Task 2 is a blocking human-verify checkpoint)
- **Completed:** 2026-06-25 (audit) — live verification outstanding
- **Tasks:** Task 1 (static audit + Claude's-Discretion tidy) complete; Task 2 (live human-verify) PENDING
- **Files modified:** 1 (source) + frontend bundle rebuilt

## Accomplishments (Task 1 — static audit, verify-then-fix per D-05)

All six audit checks were run against the `categoriesView.js` reference subscriber. Results:

1. **Subscriber shape (cartView.js:80-97) — PASS, no change.** Idempotent guard `this._currencyListenerAdded` present; payload validation `next !== 'usd' && next !== 'ils'` returns early; re-render uses `this.render(cartNum)` + `await this._renderSummary(cartNum, lng)`. The documented `this._render()` bug is confirmed **absent** (`grep "this._render(" → 0 matches`). No rewrite needed.
2. **Reload fallback / D-06 (cartView.js:94) — PASS, preserved.** `window.location.reload()` is present in the `catch` of the currency-changed handler (`grep -c → 1`). **NOT removed.** This is a hard requirement and it is intact.
3. **Price helpers read live currency (cartView.js:23-66) — PASS, no change.** `_getItemPrice` (line 39) and `_getCurrencySymbol` (line 65) both derive from `_getCurrentCurrency()` = `localStorage.getItem('currency')`. No hardcoded `'₪'`/`'ils'` short-circuit. The render sites (item list 224-225, summary 286-287) consume these, explicitly using the live currency, not the stored cart-item symbol.
4. **Dropdown-on-load on cart page (D-04) — no preemptive change.** cartView has no own select-sync loop and relies on `View.js`'s global `applySaved`/`syncCurrencySelectors` (runs on DOMContentLoaded, forces selects off `'default'`). Per the plan, a duplicate loop was NOT added preemptively — it is the Task 2 verification target. If live testing shows the cart-page dropdown resting on blank "default", the fix is to add a sync loop matching `categoriesView.js:1034-1041`.
5. **Dual-encoding consistency (model.js:233-289) — PASS, consistent.** Cart items are stored with both `usdPrice` and `ilsPrice` (256-257) plus `original*` (258-259) AND a symbol in `currency` (260, 282). `cartView._getItemPrice` re-derives the displayed price from `usdPrice`/`ilsPrice` via the **live** `_getCurrentCurrency()`, so the stored symbol does NOT pin the displayed price — it is only the at-add-time encoding. No path was found where the stored symbol overrides the live currency for display. No fix needed.
6. **Unused `_rate` field (Claude's Discretion) — REMOVED.** `grep` confirmed `_rate`/`USD_ILS_RATE` was referenced only at its declaration (cartView.js:20) and nowhere else. Removed as a low-risk tidy. `require('dotenv')` and `process.env.API_URL`/`process.env.HOST` usages remain intact.

### Key insight (wave-1 lesson applied)

Plan 01's hard-won lesson was that SSR-rendered category prices silently reverted to the language-default currency on reload because the extracted SSR DOM was never re-rendered. **That failure mode does not structurally exist for the cart.** The cart drawer is rendered **entirely client-side** from `localStorage` cart data (`controlCartPage` → `CartView.render` → `_getItemPrice` → `_getCurrentCurrency` → `localStorage.currency`). There is no SSR-default price for the cart to revert to — every `render()` (on load, on drawer-open, on currency-changed) re-derives prices from the persisted currency fresh. The on-load path was traced end-to-end to confirm this. Live verification (Task 2) will confirm it empirically.

## Task Commits

1. **Task 1: Static audit + remove unused `_rate`** — `b996f3e` (refactor) — single-line deletion; audit otherwise confirmed all checks pass unchanged.

## Files Created/Modified

- `frontend/js/Views/cartView.js` — removed the unused `_rate = process.env.USD_ILS_RATE || 3.7` field (line 20). No other source change; the subscriber, price helpers, and reload fallback were verified correct and left untouched.

## Decisions Made

- **D-05 confirmed as verify-only for the cart:** unlike Plan 01 (where live testing forced a real fix), the cart re-price path passed every audit check. No re-price code was rewritten — the "fix only if broken" gate did NOT fire for the re-price logic.
- **D-06 reload fallback preserved** explicitly and asserted via `grep` (count = 1).
- **Tidy over leave:** removed `_rate` because it is provably dead (no references) and low-risk; this mirrors the discretion the plan granted (categoriesView.js:30 mirror is owned by Plan 01 and was not touched here).

## Deviations from Plan

**None affecting behavior.** The single code change (removing the unused `_rate` field) is the Claude's-Discretion tidy the plan explicitly authorized (Task 1 step 6). No bugs (Rule 1), missing functionality (Rule 2), or blockers (Rule 3) were found in the cart re-price path. No architectural change (Rule 4) was needed.

### Observation (not fixed — out of scope, noted for traceability)

The **PayPal** checkout path reads the at-add-time stored symbol (`cartData[0].currency == '$'`, cartView.js:470, 570) to pick the PayPal SDK currency, whereas the **Stripe** checkout path (`_addHandlerCheckout`, line 162) correctly uses the live `_getCurrentCurrency()`. If a shopper adds items under one currency and switches before a PayPal checkout, PayPal could initialize in the at-add-time currency while the cart *displays* the live currency. This is a pre-existing checkout-currency concern, **not** a cart-display re-price bug, and is outside this plan's scope (cart drawer display re-price + display consistency). Per threat T-40-05, authoritative pricing is enforced server-side at checkout, so display tampering has no payment impact — but the PayPal symbol-vs-live-currency mismatch is flagged here for a future checkout-hardening pass. Not changed under D-05 (no verification failure in the in-scope re-price path) and would be Rule 4 (payment-behavior) territory.

## Build / Restart Requirement

- Frontend was rebuilt with a clean build (`rm -rf dist && npm run build`) so the change ships with new content-hashed bundle filenames.
- **The running backend (port 4000) MUST be restarted** to extract the new bundle `<script>` tags from `dist/index.html`. Until restart, the live page serves the old bundle. The orchestrator should restart the backend and ask the user to re-verify.

## Pending Live Verification (Task 2 — blocking human-verify checkpoint)

After backend restart, run these on a page with the cart drawer (e.g. `/en` then add products):

1. **Cart re-price (CURR-04 / CURR-02):** With the header dropdown on `$ USD`, add 1-2 products and open the cart drawer. Note an item price and the order-summary total in `$`/USD. Select `₪ ILS` in the header dropdown. EXPECTED: every cart item price AND the order summary flip to `₪` + ILS values with no manual reload. (If the handler throws, the D-06 fallback may reload the page — acceptable as long as post-reload prices are correct ILS.) Switch back to `$ USD`; prices flip back.
2. **Items-already-in-cart symbol consistency:** the items were added while USD was active (stored symbol `$`). After switching to ILS, EXPECTED: displayed prices follow the ACTIVE currency (`₪`/ILS), NOT the at-add-time `$` — confirming live `_getCurrentCurrency()` drives the display.
3. **Persist across reload (CURR-05 / D-04):** leave it on ILS with items in the cart. Reload (F5) and reopen the drawer. EXPECTED: cart prices stay `₪`/ILS AND the header dropdown shows `₪ ILS` (NOT blank "default"). If the dropdown rests on "default", report it — that triggers the Task 1 step 4 cart-page sync fix (cite categoriesView.js:1034-1041).

**Resume signal:** Type "approved" if all three pass, or describe the failing step (which step, observed symbol/value, whether a reload occurred, dropdown resting value).

## Next Phase Readiness

- Cart-page currency wiring is audited and (minimally) hardened. After human sign-off, Phase 40 is complete and Phase 40.1 (Homepage Featured Products) can proceed.
- Final human sign-off on the three steps above is outstanding pending the backend restart.

## Self-Check: PASSED

- `frontend/js/Views/cartView.js` — FOUND (`_rate` removed; reload fallback present at line ~93; subscriber intact)
- Commit `b996f3e` — FOUND
- `40-02-SUMMARY.md` — FOUND

---
*Phase: 40-currency-selector-wiring*
*Audit completed: 2026-06-25 — live verification pending backend restart*
