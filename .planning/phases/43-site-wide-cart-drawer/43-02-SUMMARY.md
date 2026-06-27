---
phase: 43-site-wide-cart-drawer
plan: "02"
subsystem: ui
tags: [cart, model, localStorage, quantity, TDD, vitest]

requires:
  - phase: 40-currency-handling
    provides: dual-price fields (usdPrice/ilsPrice) on cart items used by mutators

provides:
  - increaseAmount(id) and decreaseAmount(id) exported from frontend/js/model.js
  - Cart-quantity mutators targeting the shared model.cart array with min-1 and stock-cap enforcement
  - 18 Vitest tests covering guest/logged-in paths and edge cases for both mutators

affects:
  - 43-03-PLAN (wires +/- buttons to increaseAmount/decreaseAmount)
  - cartView.js (reads model.cart amount after mutations)

tech-stack:
  added: []
  patterns:
    - "Cart-quantity mutation: in-place update of shared model.cart array + createLocalStorage() persist (same pattern as removeFromUserCart)"
    - "TDD RED/GREEN: failing test commit before implementation commit"
    - "Loose == id coercion for String dataset vs Number cart ids (matches removeFromUserCart convention)"

key-files:
  created:
    - frontend/tests/model/cart-quantity.test.js (18 Vitest tests for increaseAmount/decreaseAmount)
  modified:
    - frontend/js/model.js (added increaseAmount and decreaseAmount exported mutators after removeFromUserCart)

key-decisions:
  - "/addtocart route verified to increment on bare {itemId} (routes/cart.js: userData.cartData[itemId] += 1) — kept server POST for logged-in increase path"
  - "decreaseAmount for logged-in users is session-local only: /removefromcart exists and decrements by 1, but the plan explicitly chose not to wire it for quantity decrease (only for item removal via removeFromUserCart); disclosed limitation documented in SUMMARY"
  - "TDD cycle: RED commit (7fbbbe7) before GREEN commit (4806fb5) — gate sequence honored"

requirements-completed: [D-07, D-08]

duration: 8min
completed: 2026-06-28
---

# Phase 43 Plan 02: Cart Quantity Mutators Summary

**`increaseAmount(id)` / `decreaseAmount(id)` added to model.js, mutating the shared cart array with stock-cap and min-1 guards, guest-persisted via createLocalStorage() and server-synced increase for logged-in users via `/addtocart`**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-28T00:41:00Z
- **Completed:** 2026-06-28T00:48:00Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2 (model.js, cart-quantity.test.js)

## Accomplishments
- Added `increaseAmount(itemId)` and `decreaseAmount(itemId)` to `frontend/js/model.js`, exported alongside `removeFromUserCart`
- Both mutators operate on the shared `model.cart` array (D-08: drawer and /cart page read the same source of truth)
- Min-1 floor guard in `decreaseAmount` prevents auto-removal; stock-cap guard in `increaseAmount` prevents over-stocking
- Guest path persists via existing `createLocalStorage()` (no second persistence mechanism)
- Logged-in increase syncs to server via bare `{itemId}` POST to `/addtocart` (verified: `routes/cart.js` does `userData.cartData[itemId] += 1`)
- 18 Vitest tests (RED phase committed before implementation): all pass after GREEN implementation

## Task Commits

TDD cycle (RED before GREEN):

1. **RED — Failing tests** - `7fbbbe7` (test)
2. **GREEN — Implementation** - `4806fb5` (feat)

## Files Created/Modified
- `frontend/js/model.js` - Added `increaseAmount` and `decreaseAmount` exported mutators (50 lines after `removeFromUserCart`)
- `frontend/tests/model/cart-quantity.test.js` - 18 tests: guest increase/decrease, logged-in increase/decrease, stock-cap and floor edge cases

## Decisions Made

### `/addtocart` Route Verification (plan-required step)

Per the plan, I verified `backend/routes/cart.js` `/addtocart` handler before choosing the logged-in increase path:

```js
router.post('/addtocart', fetchUser, async (req, res) => {
  const itemId = Number(req.body.itemId);
  ...
  userData.cartData[itemId] += 1;   // ← increments on bare {itemId} ✓
```

Result: the route DOES increment server-side count on bare `{itemId}` → kept the server POST for logged-in `increaseAmount` (plan branch: "keep the POST as written").

### Logged-in Decrease: Session-Local Only (Disclosed Limitation)

`/removefromcart` (in `routes/cart.js`) does `userData.cartData[itemId] -= 1` — it EXISTS and decrements by 1. However, the plan explicitly designated `decreaseAmount` as session-local for logged-in users ("no decrement route, out of scope"). This is the disclosed plan limitation. For logged-in users:

- `increaseAmount` → syncs to server via `/addtocart` ✓
- `decreaseAmount` → updates `model.cart` in-memory only (no server call); on next full reload the server hydrates the pre-decrement count

The guest path (dominant flow for this store) is fully persistent for both directions.

If a future plan adds server-synced decrements for logged-in users, wire `decreaseAmount` to POST `{ itemId }` to `/removefromcart` — the route is ready.

## Known Limitations

### Logged-in Decrement Is Not Server-Synced (Disclosed)

For AUTHENTICATED users, `decreaseAmount` updates `model.cart` and the drawer/cart UI in-session but does NOT lower the server-side cart count. On the next full reload the server returns the higher count and the cart re-hydrates to it.

**Why accepted:** Adding a new backend route is out of scope for this plan ("no new backend routes"). The guest path — the dominant checkout flow — is fully persistent. The `/addtocart` server route already handles the increase direction for logged-in users.

**In-session consistency (D-08) holds:** the drawer and the /cart page both read `model.cart` while the session is active, so they stay in sync during a session.

## Deviations from Plan

None — plan executed exactly as written. The `/addtocart` verification step produced the "keep the POST" branch exactly as the plan anticipated.

## Issues Encountered

**ESLint not runnable in worktree environment:** The worktree's `frontend/` directory does not have its own `node_modules/` (worktree shares source files but not dependencies), so `npm run lint` is not available. Manual code review confirmed the implementation matches existing patterns in model.js (same function style as `removeFromUserCart`, same `==` coercion, same `console.error` for failures). The main repo's `npm run lint` is the canonical lint gate; no new patterns were introduced.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (test) | `7fbbbe7` | PASS — 18 tests failed (functions missing) |
| GREEN (feat) | `4806fb5` | PASS — 18 tests pass |
| REFACTOR | N/A | No refactor needed |

## Threat Model Coverage

| Threat ID | Mitigation Applied |
|-----------|--------------------|
| T-43-04 (Tampering: over-stock/negative qty) | increaseAmount caps at `item.quantity` (stock); decreaseAmount floors at 1. No path from these mutators produces amount < 1 or > stock. |
| T-43-05 (Elevation: price recomputation) | Mutators change only `amount`; no price field is touched. |
| T-43-06 (DoS: storage quota) | createLocalStorage() with QuotaExceededError try/catch reused as-is. |

## Next Phase Readiness
- `increaseAmount` and `decreaseAmount` are exported from `model.js` and ready to be wired by Plan 03 drawer +/- buttons
- Both mutators update `model.cart` so `checkCartNumber()` (which sums `item.amount`) correctly reflects quantity changes for the badge count
- No frontend build required for Plan 03 to import these — they're plain ES module exports

---
*Phase: 43-site-wide-cart-drawer*
*Completed: 2026-06-28*
