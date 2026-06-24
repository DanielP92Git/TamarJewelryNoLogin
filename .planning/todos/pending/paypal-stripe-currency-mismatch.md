---
id: todo-paypal-stripe-currency-mismatch
type: hardening
status: pending
priority: medium
created: "2026-06-25"
source: Phase 40 execution — flagged by 40-02 executor during cart audit
tags: [cart, checkout, currency, paypal, stripe, payments]
resolves_phase: null
---

# PayPal vs Stripe read different currency sources at checkout

## Observation

During the Phase 40 cart audit, the checkout paths were found to read currency
inconsistently:
- **PayPal** path reads the **at-add-time stored symbol** on cart items
  (`frontend/js/Views/cartView.js:470, :570`).
- **Stripe** path uses the **live/active** currency.

If a shopper adds items under one currency and switches before paying, PayPal and
Stripe could disagree on which currency the order is charged in.

## Why it's not urgent

Server-side pricing is authoritative (threat T-40-05), so this does not affect the
cart *display* re-pricing that Phase 40 delivered, and the server validates order
amounts. It's a consistency/hardening concern, not a live display bug.

## Suggested fix

Make both checkout paths derive currency from the same single source of truth (the
live persisted currency via `_getCurrentCurrency()` / `localStorage.currency`), not
the at-add-time stored item symbol. Verify the server-side order creation
(`createOrder()` PayPal + `/create-checkout-session` Stripe in `backend/index.js`)
receives and validates a consistent currency. Add a check that the charged currency
matches the currency shown at the moment of checkout.

## Acceptance

- PayPal and Stripe both charge in the currently-active currency.
- Switching currency before checkout updates the charged currency consistently.
- Server validates the order currency against authoritative pricing.
