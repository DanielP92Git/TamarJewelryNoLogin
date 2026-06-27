---
status: partial
phase: 43-site-wide-cart-drawer
source: [43-VERIFICATION.md]
started: 2026-06-28T12:00:00Z
updated: 2026-06-28T12:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Drawer opens on every page type
expected: Navigate to home, category, product detail, /cart, about, contact, and workshop pages and click the nav cart icon on each — drawer slides in from the right, body scroll locks, close button receives focus, and the nav link does NOT navigate to /cart.
result: [pending]

### 2. RTL mirror on /he
expected: On any /he/ URL, opening the drawer slides it in from the LEFT (the `[dir="rtl"] .tk-drawer` rule applies), not the right.
result: [pending]

### 3. No auto-close at 800px breakpoint
expected: With the drawer open, resizing the browser across the 800px boundary leaves the drawer open; only ✕ / scrim / Esc / icon-toggle close it (unlike the hamburger menu).
result: [pending]

### 4. Add-to-cart auto-open (D-04) from all entry points
expected: Adding an item from (a) the homepage featured grid, (b) a category page card, and (c) the product/modal Add-to-Cart each auto-opens the drawer showing the newly added item in the persisted currency, and the badge increments.
result: [pending]

### 5. Currency re-pricing in the drawer (D-09)
expected: With items in the drawer, switching the currency selector between USD and ILS updates the subtotal and per-line prices immediately in the new currency with no page reload and no hardcoded 3.7 rate.
result: [pending]

### 6. Quantity steppers and remove live-update (D-07/D-08)
expected: Clicking + / - on a line and Remove on another updates the line quantity, line total, subtotal, and badge live; removing the last item shows the empty state, disables checkout, and hides the footer.
result: [pending]

### 7. Empty state and Continue-shopping (D-10)
expected: Opening the drawer with an empty cart shows the empty state ("Your cart is empty" / "העגלה שלך ריקה"), disables the checkout button, and the "Continue shopping" button closes the drawer without navigating.
result: [pending]

### 8. Checkout navigation (D-01)
expected: Clicking "Proceed to Checkout" with items in the cart navigates to /{lang}/cart (en or he depending on current locale).
result: [pending]

### 9. Three-way dismiss (D-06)
expected: An open drawer can be dismissed via the ✕ close button, clicking the scrim/overlay, and pressing Esc.
result: [pending]

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0
blocked: 0

## Gaps
