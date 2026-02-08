# Phase 18: Model Unit Tests - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Testing cart operations and API interactions in isolation with mocked dependencies for the frontend vanilla JS MVC architecture. Focus on the model layer (model.js) which handles cart state, localStorage persistence, and backend API calls. View and controller testing are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Cart Operation Coverage
- **Granularity:** Claude's discretion - choose appropriate test granularity based on risk and complexity
- **Edge cases to cover:**
  - Quantity boundaries (zero, negative, very large numbers)
  - Duplicate item handling (adding same product twice should update quantity, not create duplicates)
  - Operations on empty cart (removing, clearing, etc.)
- **State calculations:** Verify cart totals, item counts, and subtotals in each test
- **Format handling:** Test both frontend format (array of items) and backend format (object keyed by ID) explicitly - verify conversions work correctly

### localStorage Persistence
- **Corruption scenarios:**
  - Malformed JSON (syntax errors) - should fall back to empty cart without crashing
  - Missing required fields (ID, name, price, quantity) - filter out or degrade gracefully
  - Type mismatches (price as string, quantity as float, etc.)
- **Browser restart simulation:** Clear and reload model instance to verify data survives restart (don't just mock localStorage.setItem)
- **Quota handling:** Test localStorage quota exceeded errors - verify app handles gracefully
- **localStorage keys:** Claude's discretion on whether to test exact key names

### API Mocking Strategy
- **Mocking approach:** Claude's discretion - choose between global fetch mocking or MSW based on what's most appropriate
- **Failure scenarios:**
  - Network errors (timeout, no connection)
  - HTTP error responses (404, 500, 4xx, 5xx)
  - Invalid response data (malformed JSON, unexpected structure)
- **Call verification:** Assert exact API calls - verify correct endpoints, headers, body content, and HTTP methods
- **Retry logic:** Claude's discretion - check if model has retry logic and test accordingly

### Currency Conversion Testing
- **Precision:** Claude's discretion on toBeCloseTo() tolerance (likely 2 decimal places for currency)
- **Edge cases:**
  - Zero and negative prices
  - Very large amounts (₪100,000+) - verify precision maintained
  - Round-trip conversion accuracy (USD → ILS → USD should return to original within tolerance)
- **Formatting logic:** Claude's discretion - determine if currency symbol/formatting belongs in model tests or view tests
- **Missing exchange rates:** Claude's discretion - check if fallback logic exists and test accordingly

### Claude's Discretion
- Test granularity per operation (simple happy path vs multiple scenarios)
- Whether to test localStorage key structure explicitly
- API mocking implementation (global fetch vs MSW)
- Whether model has retry logic to test
- Currency precision tolerance (decimal places)
- Whether currency formatting is model or view concern
- Exchange rate fallback logic testing

</decisions>

<specifics>
## Specific Ideas

- Frontend cart format is array of items, backend uses object keyed by ID (from Phase 17 context)
- Infrastructure already established with Happy-DOM, Testing Library, and factories (Phase 17)
- Risk-based testing approach from v1.2 - focus on critical paths first

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 18-model-unit-tests*
*Context gathered: 2026-02-08*
