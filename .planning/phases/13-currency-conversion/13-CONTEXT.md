# Phase 13: Currency Conversion Tests - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Test USD/ILS exchange rate API integration, caching mechanisms, fallback chains, and bidirectional currency conversion calculations. This phase verifies the existing currency conversion infrastructure - NOT adding new currencies or redesigning the system.

</domain>

<decisions>
## Implementation Decisions

### Exchange rate fetching & caching
- **Cache TTL verification**: Claude's discretion - test strategy should verify production TTL behavior
- **API testing approach**: Include one real API smoke test (skipped in CI without key); all other tests use nock mocks
- **Cache usage validation**: Verify both timestamp stability (lastUpdated doesn't change) AND absence of network calls (nock tracks HTTP request counts)
- **Stale data definition**: Age-based threshold (e.g., >24 hours since last update) triggers warnings or fallback behavior

### Conversion calculation accuracy
- **Rounding rules**: Match current production behavior in exchangeRateService.js (tests verify existing implementation)
- **Decimal precision**: Match current production precision (tests verify existing rules per currency)
- **Edge cases to cover**:
  - Zero and negative amounts (validate rejection of negatives)
  - Very large amounts (>$1M) - verify no overflow/precision loss
  - Very small amounts (<$0.01) - test sub-cent rounding
  - Round-trip accuracy (USD→ILS→USD) - verify reasonable accuracy maintained
- **Bidirectional testing**: Paired tests in same suite verify both USD→ILS and ILS→USD for symmetry

### Fallback chain behavior
- **API failure handling**: Match current production fallback in exchangeRateService.js (tests verify existing behavior)
- **Failure scenarios to simulate**:
  - Network timeout (nock delayConnection)
  - HTTP error responses (404, 500, 503)
  - Malformed response data (200 OK but invalid/missing rate)
  - DNS/connection failures (complete network unavailability)
- **Total failure scenario**: Verify app returns clear error response when both API AND cache fail (no rate available)
- **Scheduled updates**: Test cron job logic in isolation - verify schedule correctness and service calls, but don't wait for actual timing

### Currency display formatting
- **Symbol formatting**: Match current production rules in frontend (tests verify existing implementation)
- **Locale-specific formatting**: Claude's discretion - determine if locale testing (eng vs heb) belongs in backend tests or frontend tests
- **Number formatting**: Match current production decimal/thousands separator rules (tests verify existing implementation)
- **Context coverage**: Test 2-3 representative display contexts (e.g., product page, cart, checkout) to verify consistent formatting

### Claude's Discretion
- Cache TTL testing strategy (single production config vs multiple TTL scenarios)
- Whether locale-specific formatting belongs in this phase or frontend tests
- Test organization and helper function structure
- Mock data fixture design for exchange rate responses

</decisions>

<specifics>
## Specific Ideas

- One real API smoke test should be skippable in CI without API key (use `test.skipIf(!process.env.EXCHANGE_RATE_API_KEY)`)
- nock tracking pattern: assert no HTTP requests when cache is fresh
- Stale rate warning threshold: likely 24 hours based on common TTL patterns
- Round-trip conversion test tolerance: allow small precision loss (e.g., $100.00 → ILS → $99.98 is acceptable)
- Total failure scenario returns error to prevent showing incorrect prices

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 13-currency-conversion*
*Context gathered: 2026-02-05*
