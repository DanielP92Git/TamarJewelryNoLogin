# Phase 12: Payment Processing Tests - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Testing PayPal and Stripe payment flows with mocked APIs to ensure payment integration works correctly without touching live payment services. This phase covers testing existing payment endpoints (order creation, capture, payment intents) against mocked API responses. Does NOT include building new payment features or refactoring payment code — only verifying what's already implemented.

</domain>

<decisions>
## Implementation Decisions

### Test organization
- **File structure:** Organize by provider — separate `paypal.test.js` and `stripe.test.js` files, each containing all flows for that provider (create, capture, errors)
- **Integration vs unit:** Claude's discretion on whether to split integration/unit tests based on test count and readability
- **Shared setup:** Claude's discretion on helper file vs using existing Phase 10 fixtures — minimize duplication while keeping tests readable
- **Test scope:** Claude's discretion on payment-only endpoints vs including order context — balance focused payment testing with realistic scenarios

### Mock depth
- **Response realism:** Use full PayPal/Stripe response objects matching official API documentation — all fields, nested objects, metadata (not just essential fields)
- **Schema validation:** Include tests that verify mock structure matches official API schemas — catches drift when APIs change
- **Webhook handling:** Claude's discretion on webhook testing based on current implementation complexity — may defer to Phase 16 if minimal
- **Response timing:** Claude's discretion on latency simulation — balance test speed with timeout handling coverage

### Error scenarios
- **Priority coverage:** Test all four categories:
  - Card/payment declined (insufficient funds, rejected payment methods)
  - Network/API failures (timeouts, 500 errors, connection issues)
  - Validation errors (invalid amounts, unsupported currencies, missing fields)
  - Business logic errors (duplicate payments, already-captured orders, refund failures)
- **Error verification:** Assert both HTTP status codes (400, 402, 500) AND error message content/format for frontend display
- **Retry logic:** Test retry behavior for transient failures (network errors retry, permanent failures like declined cards do not)
- **Coverage depth:** Cover all known PayPal/Stripe error codes — comprehensive coverage even if rare

### Test data patterns
- **Payment amounts:** Claude's discretion on realistic jewelry prices vs edge cases — choose amounts that best validate payment logic
- **Currency coverage:** Test both USD and ILS payment flows separately — verify currency-specific logic and exchange rate handling
- **Order data realism:** Full order context with products, quantities, shipping address, customer info — realistic checkout data
- **Authentication:** Mock JWT tokens directly in tests (don't create real users) — payment tests use tokens but don't verify auth

### Claude's Discretion
- Integration vs unit test split (together or separate files)
- Shared helper structure (dedicated file or use existing fixtures)
- Test scope depth (payment endpoints only or include order flow context)
- Webhook testing approach (full payload or skip for Phase 16)
- Mock timing simulation (instant or delayed responses)
- Payment amount selection (realistic, edge cases, or mix)

</decisions>

<specifics>
## Specific Ideas

- **Full API response matching:** Mocks should match PayPal/Stripe documentation exactly, not just minimal fields we use — helps catch breaking changes
- **Schema validation tests:** Automated checks that mocks conform to official schemas
- **Comprehensive error coverage:** Test every documented error code from both providers, not just common ones
- **Dual-currency testing:** USD and ILS both covered in payment tests (not deferred to Phase 13)
- **Realistic order context:** Complete checkout data structure in test fixtures
- **Error message assertions:** Tests verify user-facing error messages, not just status codes

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-payment-processing*
*Context gathered: 2026-02-05*
