# Phase 20: Page View Tests - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Test page-specific views render correctly with accurate data display. Covers: cart view, product modal, checkout view, categories view, home page, and contact form. Static content views (about, policies, workshop) are included or excluded at Claude's discretion based on complexity.

</domain>

<decisions>
## Implementation Decisions

### Test grouping
- Claude's discretion on how to split across ~3 plans (roadmap suggests cart, modal, checkout+others)
- Claude decides whether static views (about, policies, workshop) warrant basic smoke tests
- Claude determines appropriate depth for categories filtering and home page featured products

### Cart & checkout depth
- Test both display AND user actions (quantity buttons trigger correct model methods)
- Verify the math: subtotal/total should add up from item prices x quantities in the view
- Checkout: full flow mock — order summary, payment method selection, and submission trigger (mocked)
- Include key edge cases: empty cart redirect/message, single-item cart, max quantity boundaries

### Product modal scope
- Test image carousel navigation (next/prev buttons cycle through images)
- Add-to-cart: verify button triggers model call AND UI feedback (cart count updates, success message)
- Test all three modal close methods: X button, backdrop click, Escape key
- Claude's discretion on whether dual-currency price display belongs in Phase 20 or Phase 21

### Contact form
- Full coverage: required field validation, successful submission (mocked), and error states

### Data setup strategy
- Claude's discretion on reusing Phase 17 factories vs creating view-specific fixtures
- Claude's discretion on DOM fixture approach (shared minimal vs per-view)
- Claude's discretion on mock strategy: network-level fetch mocks vs model method stubs

### Claude's Discretion
- Test plan grouping and file organization
- Static view inclusion/exclusion
- Categories filter testing depth
- Home page testing scope (own describe block vs minimal)
- Data factory approach (reuse vs extend)
- DOM fixture strategy per view
- Mock level (fetch vs model methods)
- Price display testing boundary between Phase 20 and Phase 21

</decisions>

<specifics>
## Specific Ideas

- Cart actions should be tested end-to-end within the view: click quantity button -> verify model method called -> verify UI reflects change
- Checkout flow should mock payment submission without testing actual PayPal/Stripe SDKs
- Modal close behavior matters for all three methods (X, backdrop, Escape) since they were specifically implemented
- Contact form covers validation + submission + error states — not just field presence

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-page-view-tests*
*Context gathered: 2026-02-09*
