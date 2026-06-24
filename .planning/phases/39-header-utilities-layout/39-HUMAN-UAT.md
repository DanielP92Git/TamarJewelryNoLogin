---
status: partial
phase: 39-header-utilities-layout
source: [39-VERIFICATION.md]
started: "2026-06-24T00:00:00Z"
updated: "2026-06-24T00:00:00Z"
---

## Current Test

[awaiting human testing]

## Tests

### 1. LTR header (/en) — flags + cluster order
expected: Two separate round flag icons (US + IL). Active language flag is full color; inactive flag is visibly dimmed (~0.4 opacity). NO gold/white ring on the active flag. Left-to-right order: Flags → Currency → Cart, with even spacing.
result: [pending]

### 2. Currency dropdown — custom chevron + labels
expected: Native OS arrow hidden; a single custom chevron on the right — dark (#666666) on the solid nav, white (#ffffff) over the hero (transparent nav). Options read `$ USD` and `₪ ILS`.
result: [pending]

### 3. RTL header (/he) — true mirror
expected: Utils cluster sits at the LEFT edge, order Cart → Currency → Flags. Cart count badge on the LEFT of the cart icon. Currency chevron on the LEFT. Nav links stay centered; TK logo stays at the right edge. Currency options still read `$ USD` / `₪ ILS`.
result: [pending]

### 4. Post-build label persistence
expected: After `npm run build` (in /frontend) + backend restart, load /en and /he, open the currency dropdown and let the page settle — `$ USD` / `₪ ILS` persist with NO flash-revert to USD/ILS/דולר/שקל after View.js hydration runs.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
