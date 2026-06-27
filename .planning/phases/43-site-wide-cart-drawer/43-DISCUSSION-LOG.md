# Phase 43: Site-wide Cart Drawer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-27
**Phase:** 43-site-wide-cart-drawer
**Areas discussed:** Checkout CTA design, Open / auto-open behavior, In-drawer editing, Empty-cart state

---

## Checkout CTA design

| Option | Description | Selected |
|--------|-------------|----------|
| Single button to /cart | One primary 'Proceed to Checkout' → `/{lang}/cart` (where PayPal/Stripe already live). Simplest, single payment source, conversion-forward label. | ✓ (Claude) |
| Two buttons | 'View Cart' → /cart + 'Checkout' → straight to payment. Saves a click but duplicates checkout surface and needs a drawer-triggered payment flow. | |

**User's choice:** "You decide based on best UX and marketing approaches."
**Notes:** Claude chose the single-CTA route on UX/marketing + risk grounds — payment lives on `/cart`, so one button keeps a single source of truth and reuses the already-built bilingual `#tk-checkout` markup (enabled only when the cart has items).

---

## Open / auto-open behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-open the drawer (on add) | Adding an item slides the drawer open with the new line + subtotal. | ✓ |
| Just update the badge | Adding only bumps `#tk-cart-count` / a toast. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Open the drawer everywhere | Cart icon opens the mini-cart on every page incl. /cart. Consistent, no special-casing. | ✓ |
| Plain link on /cart | Icon is a no-op on /cart, opens drawer only elsewhere. | |

**User's choice:** Auto-open the drawer on add; open the drawer everywhere (including /cart).
**Notes:** Close stays standard (✕ / overlay / Esc) consistent with Phase 42 three-way dismissal.

---

## In-drawer editing

| Option | Description | Selected |
|--------|-------------|----------|
| Remove only | Line items + subtotal + per-item Remove (matches demo markup); qty changes on /cart. | |
| Remove + quantity steppers | Full editing in the drawer: +/- qty + remove, live subtotal. | ✓ |
| Read-only summary | View-only; all editing on /cart. | |

**User's choice:** Remove + quantity steppers (full in-drawer editing).
**Notes:** Reuse `model.js` mutators + `cartView.js` qty/remove helpers to avoid duplicating min-1 / stock / symbol-encoding edge cases.

---

## Empty-cart state

| Option | Description | Selected |
|--------|-------------|----------|
| Message + shop link | 'Your cart is empty' + 'Continue shopping' button (closes drawer / routes to shop). | ✓ (Claude) |
| Message only | Just the empty text, no action. | |

**User's choice:** "You decide."
**Notes:** Claude chose a warm bilingual 'Your cart is empty' / 'העגלה שלך ריקה' + 'Continue shopping' / 'המשך בקנייה' that closes the drawer (works identically on every page). Subtotal + CTA hidden while empty; visual finish deferred to UI polish.

---

## Claude's Discretion

- Drawer slide side + RTL mirror (default: cart-icon side, mirrored on `/he`).
- Global-partial vs `View.js` injection mechanism for making the drawer global.
- Empty-state visual finish (icon/spacing/illustration) and open/close motion — candidate for `/gsd-ui-phase`.
- Optional add-to-cart toast alongside the auto-open.

## Deferred Ideas

- Two-button checkout with a direct drawer-to-payment flow (rejected for this phase).
- Promo codes / shipping estimate / save-for-later in the mini-cart (future phases).
- Overlay/drawer motion-design polish beyond a basic slide/fade.
