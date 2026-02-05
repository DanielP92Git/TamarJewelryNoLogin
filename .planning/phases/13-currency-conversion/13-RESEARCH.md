# Phase 13: Currency Conversion Tests - Research

**Researched:** 2026-02-05
**Domain:** Currency conversion testing (exchange rate APIs, caching, calculations, formatting)
**Confidence:** HIGH

## Summary

This phase tests the existing USD/ILS currency conversion infrastructure in the e-commerce application. The system uses a fallback chain for exchange rates (API → cached DB rate → environment variable → default), performs bidirectional conversions (USD↔ILS), and handles scheduled updates via node-cron. Tests must verify API integration with nock mocks, cache behavior through MongoDB, calculation accuracy using Math.round, fallback chain resilience, and cron job logic without waiting for actual timing.

The application uses Math.round for whole-number rounding (no decimal cents), stores exchange rates in a singleton Settings document, and updates rates weekly at 2:00 AM Sunday via cron. Currency display uses simple symbol mapping ($ for USD, ₪ for ILS) without locale-specific number formatting. Testing focuses on verifying existing behavior rather than adding new features.

**Primary recommendation:** Use Vitest with nock for HTTP mocking, verify cache behavior by asserting timestamp stability + zero HTTP requests, test cron schedule parsing separately from execution timing, and validate round-trip conversion accuracy with tolerance for precision loss.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 4.0.18 | Test framework | Already used in Phase 10, modern Jest alternative with ESM support |
| nock | 14.0.10 | HTTP request mocking | Already configured in Phase 10, industry standard for Node.js HTTP mocking |
| mongodb-memory-server | 11.0.1 | In-memory test database | Already configured in Phase 10, provides isolated MongoDB for testing |
| supertest | 7.2.2 | HTTP assertion library | Already configured in Phase 10, tests Express endpoints at HTTP boundary |
| node-cron | 3.0.3 | Scheduled job execution | Production dependency, needs testing for schedule validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| mongoose | 8.6.1 | MongoDB ODM | Database operations, Settings model queries |
| Node.js fetch | Native (18+) | HTTP requests | Used by exchangeRateService.js for API calls |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nock | msw (Mock Service Worker) | msw is newer but adds complexity; nock is proven and already configured |
| Math.round | dinero.js, currency.js | Libraries offer more precision but app already uses Math.round (whole numbers only) |
| node-cron | node-schedule, agenda | All similar; node-cron is already in production |

**Installation:**
Already installed. No new dependencies required.

## Architecture Patterns

### Recommended Project Structure
```
backend/tests/
├── unit/
│   └── services/
│       └── exchangeRateService.test.js    # Unit tests for service functions
│   └── jobs/
│       └── exchangeRateJob.test.js        # Unit tests for cron job logic
├── integration/
│   └── currency.conversion.test.js        # Integration tests (full stack)
├── helpers/
│   └── mocks/
│       └── exchangeRate.js                # Already exists, may need enhancements
│   └── factories.js                       # May need Settings factory additions
└── setup.js                                # Already configured
```

### Pattern 1: Isolated Service Unit Tests
**What:** Test exchangeRateService.js functions in isolation with mocked HTTP and DB
**When to use:** Testing fetchCurrentRate, getStoredRate, updateRate, getExchangeRate, isRateStale
**Example:**
```javascript
// Unit test pattern for fetchCurrentRate
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fetchCurrentRate } from '../../services/exchangeRateService.js';
import { mockExchangeRateAPI, mockExchangeRateError, cleanAllMocks } from '../helpers/mocks/index.js';

describe('exchangeRateService - fetchCurrentRate', () => {
  afterEach(() => {
    cleanAllMocks();
  });

  it('should fetch rate from primary API successfully', async () => {
    mockExchangeRateAPI(3.75);

    const result = await fetchCurrentRate();

    expect(result.rate).toBe(3.75);
    expect(result.source).toBe('exchangerate-api.com');
  });

  it('should reject negative rate values', async () => {
    nock('https://api.exchangerate-api.com')
      .get('/v4/latest/USD')
      .reply(200, { rates: { ILS: -3.75 } });

    await expect(fetchCurrentRate()).rejects.toThrow('Invalid rate value');
  });
});
```

### Pattern 2: Cache Verification with Timestamp + HTTP Request Counting
**What:** Verify cache is used by checking (1) timestamp unchanged and (2) zero HTTP requests
**When to use:** Testing that getExchangeRate uses cached rate without API calls
**Example:**
```javascript
// Verify cache usage with dual assertions
import nock from 'nock';
import { getExchangeRate, updateRate } from '../../services/exchangeRateService.js';
import { Settings } from '../../models/index.js';

it('should use cached rate without making HTTP requests', async () => {
  // Seed cache
  await updateRate(3.70, 'test');
  const settingsBefore = await Settings.getSettings();
  const timestampBefore = settingsBefore.exchange_rate_last_updated;

  // Track HTTP requests (no nock mocks registered)
  nock.recorder.rec();

  const rate = await getExchangeRate();

  // Assert no HTTP requests made
  const recordedCalls = nock.recorder.play();
  expect(recordedCalls).toHaveLength(0);
  nock.recorder.clear();

  // Assert timestamp unchanged
  const settingsAfter = await Settings.getSettings();
  expect(settingsAfter.exchange_rate_last_updated).toEqual(timestampBefore);

  // Assert correct rate returned
  expect(rate).toBe(3.70);
});
```

### Pattern 3: Conditional Test Execution (Real API Smoke Test)
**What:** Skip real API test in CI unless API key is present
**When to use:** Single smoke test against real exchange rate API
**Example:**
```javascript
// Source: https://vitest.dev/api/
import { test } from 'vitest';

test.skipIf(!process.env.EXCHANGE_RATE_API_KEY)(
  'should fetch real rate from exchange rate API',
  async () => {
    const result = await fetchCurrentRate();

    expect(result.rate).toBeGreaterThan(0);
    expect(result.source).toBeTruthy();
  }
);
```

### Pattern 4: Cron Job Schedule Validation Without Timing
**What:** Test cron schedule parsing and service invocation, not actual timing
**When to use:** Testing exchangeRateJob.js without waiting for cron execution
**Example:**
```javascript
// Test cron schedule correctness without timing delays
import { describe, it, expect, vi } from 'vitest';
import cron from 'node-cron';

describe('exchangeRateJob - schedule', () => {
  it('should validate cron schedule is weekly Sunday 2:00 AM', () => {
    const schedule = '00 02 * * 0';

    // Validate schedule syntax
    expect(cron.validate(schedule)).toBe(true);
  });

  it('should call updateExchangeRateAndPrices when triggered', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);

    // Test the job function directly (not the schedule timing)
    await mockUpdate();

    expect(mockUpdate).toHaveBeenCalledOnce();
  });
});
```
**Note:** Testing actual cron timing is impractical. Test schedule correctness and function invocation separately.

### Pattern 5: Bidirectional Conversion Symmetry
**What:** Test both USD→ILS and ILS→USD in same suite for symmetry verification
**When to use:** Testing conversion calculation accuracy
**Example:**
```javascript
describe('Currency conversion - bidirectional accuracy', () => {
  const rate = 3.70;

  it('should convert USD to ILS correctly', () => {
    const usd = 100;
    const ils = Math.round(usd * rate); // 370
    expect(ils).toBe(370);
  });

  it('should convert ILS to USD correctly', () => {
    const ils = 370;
    const usd = Math.round(ils / rate); // 100
    expect(usd).toBe(100);
  });

  it('should maintain accuracy in round-trip conversion', () => {
    const originalUsd = 100;
    const ils = Math.round(originalUsd * rate);
    const backToUsd = Math.round(ils / rate);

    // Allow small precision loss (±2 for $100)
    expect(Math.abs(backToUsd - originalUsd)).toBeLessThanOrEqual(2);
  });
});
```

### Anti-Patterns to Avoid
- **Waiting for actual cron timing:** Don't use `setTimeout` or `setInterval` to wait for cron execution. Test schedule syntax and function logic separately.
- **Assuming cache always exists:** Always test both "cache exists" and "cache missing" scenarios in fallback chain tests.
- **Using decimal precision for currency:** App uses `Math.round()` for whole numbers. Don't add decimal testing that doesn't match production behavior.
- **Testing without nock cleanup:** Always use `afterEach(() => cleanAllMocks())` to prevent mock leakage between tests.
- **Ignoring HTTP failure scenarios:** Test all HTTP failure modes (timeout, 404, 500, malformed response), not just success cases.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP request mocking | Custom fetch stubs | nock (already configured) | Handles complex scenarios (timeouts, retries, fallback APIs), proven in Phase 10 tests |
| Test database | Mock mongoose methods | mongodb-memory-server (already configured) | Real MongoDB behavior, proper index testing, no stub maintenance |
| Cron timing simulation | Custom time mocking | Test schedule syntax + function logic separately | Cron timing is unreliable in tests; validate schedule string and test function directly |
| Currency precision | Custom rounding libraries | Math.round (matches production) | App already uses Math.round for whole numbers; introducing decimal libraries breaks parity with production |
| Cache staleness calculation | Manual date math | Existing isRateStale function | Already handles edge cases (missing timestamps, invalid dates) |
| HTTP timeout simulation | Manual delays | nock's delayConnection | Built-in, reliable, no race conditions |

**Key insight:** The testing infrastructure from Phase 10 already handles most complexity. Focus on testing existing production logic, not adding new testing patterns.

## Common Pitfalls

### Pitfall 1: Testing Cache Without Verifying Zero HTTP Requests
**What goes wrong:** Tests check timestamp stability but miss that cache code is actually making HTTP requests
**Why it happens:** Timestamp assertions pass even if HTTP requests are made (if they fail gracefully)
**How to avoid:** Always use dual verification: (1) timestamp unchanged AND (2) nock confirms zero requests
**Warning signs:** Tests pass but production logs show unexpected API calls; nock pendingMocks() shows unused interceptors

### Pitfall 2: Assuming Cron Jobs Can Be Tested with Timing
**What goes wrong:** Tests use `setTimeout` to wait for cron execution, causing flaky failures or excessive test duration
**Why it happens:** Cron jobs run on actual wall-clock time, which is slow and unreliable in test environments
**How to avoid:** Test cron schedule syntax validation separately from function execution. Call the job function directly in tests.
**Warning signs:** Tests take >30 seconds to run; intermittent failures in CI; "test timeout exceeded" errors

### Pitfall 3: Round-Trip Conversion Expecting Perfect Accuracy
**What goes wrong:** Tests assert `USD→ILS→USD` returns exactly the original value, but Math.round causes small precision loss
**Why it happens:** Integer rounding is not reversible (e.g., $100 → ₪370 → $100, but $101 → ₪373.70 → ₪374 → $101.08)
**How to avoid:** Allow tolerance in round-trip tests (±1-2 units for amounts <$1000). Document expected precision loss.
**Warning signs:** Round-trip tests fail for certain amounts but not others; failures more common with non-round numbers

### Pitfall 4: Not Testing All Fallback Chain Failure Modes
**What goes wrong:** Tests only verify "API fails → use cache" but miss "API + cache both fail → use env/default"
**Why it happens:** Developers focus on happy path and first-level fallback, forgetting complete failure scenario
**How to avoid:** Test the full chain: (1) API success, (2) API fail + cache success, (3) API + cache fail + env success, (4) total failure
**Warning signs:** Production errors when both API and DB are unavailable; unclear error messages; app crashes instead of falling back

### Pitfall 5: Malformed API Response Treated as Network Failure
**What goes wrong:** Tests only mock HTTP 500 errors, missing 200 OK responses with invalid/missing rate data
**Why it happens:** Developers assume "API failure" means HTTP error codes, not malformed payloads
**How to avoid:** Test both HTTP error responses (404, 500, timeout) AND malformed success responses (200 OK with missing/invalid rate)
**Warning signs:** Production logs show "200 OK" but app still uses fallback rate; API changes response format and app breaks

### Pitfall 6: Testing Currency Formatting Without RTL Awareness
**What goes wrong:** Tests verify `$100` format but miss that Hebrew locale may have different display requirements
**Why it happens:** Frontend uses simple symbol replacement (`currency === 'usd' ? '$' : '₪'`), no locale-aware formatting
**How to avoid:** Backend tests only verify symbol selection logic. Frontend tests (separate phase) verify actual display.
**Warning signs:** Tests pass but Hebrew users report formatting issues; RTL layout breaks with currency symbols

### Pitfall 7: Ignoring Scheduled Job Product Price Updates
**What goes wrong:** Tests only verify exchange rate fetching but miss that cron job also updates all product USD prices
**Why it happens:** Cron job does two things (fetch rate + update product prices); developers focus only on rate fetching
**How to avoid:** Test both responsibilities: (1) rate fetching/storage and (2) product price recalculation logic
**Warning signs:** Exchange rate updates correctly but product prices remain stale; frontend shows inconsistent prices

## Code Examples

Verified patterns from existing codebase:

### Exchange Rate Fallback Chain (Current Production)
```javascript
// Source: backend/services/exchangeRateService.js lines 155-189
async function getExchangeRate(forceRefresh = false) {
  // If force refresh, try API first
  if (forceRefresh) {
    try {
      const { rate, source } = await fetchCurrentRate();
      await updateRate(rate, source);
      return rate;
    } catch (error) {
      console.warn('Failed to refresh rate from API, using stored rate');
    }
  }

  // Try to get stored rate from database
  const storedRate = await getStoredRate();
  if (storedRate && Number.isFinite(storedRate) && storedRate > 0) {
    return storedRate;
  }

  // Fall back to environment variable
  const envRate = parseFloat(process.env.USD_ILS_RATE);
  if (Number.isFinite(envRate) && envRate > 0) {
    console.log('Using exchange rate from environment variable');
    try {
      await updateRate(envRate, 'environment_variable');
    } catch (error) {
      console.warn('Failed to store env rate in database:', error.message);
    }
    return envRate;
  }

  // Final fallback to default
  console.warn(`Using default exchange rate: ${DEFAULT_EXCHANGE_RATE}`);
  return DEFAULT_EXCHANGE_RATE; // 3.3
}
```

### Currency Conversion (Production Implementation)
```javascript
// Source: backend/jobs/exchangeRateJob.js lines 91-92
// USD to ILS: multiply by rate, round to whole number
const calculatedUsdPrice = Math.round(product.ils_price / newRate);

// ILS to USD: divide by rate, round to whole number
const calculatedIlsPrice = Math.round(product.usd_price * newRate);
```

### Staleness Detection (24-hour TTL)
```javascript
// Source: backend/services/exchangeRateService.js lines 196-213
async function isRateStale(maxAgeHours = 24) {
  try {
    const settings = await Settings.getSettings();

    if (!settings.usd_ils_rate || !settings.exchange_rate_last_updated) {
      return true; // Rate is missing, consider it stale
    }

    const now = new Date();
    const lastUpdated = new Date(settings.exchange_rate_last_updated);
    const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);

    return hoursSinceUpdate >= maxAgeHours;
  } catch (error) {
    console.error('Error checking rate staleness:', error.message);
    return true; // On error, consider it stale to trigger refresh
  }
}
```

### Currency Symbol Mapping (Frontend)
```javascript
// Source: frontend/js/Views/cartView.js lines 53-55
_getCurrencySymbol() {
  return this._getCurrentCurrency() === 'usd' ? '$' : '₪';
}
```

### Cron Job Schedule (Weekly Sunday 2:00 AM Israel Time)
```javascript
// Source: backend/jobs/exchangeRateJob.js lines 158-167
cron.schedule(
  '00 02 * * 0',  // "At 2:00 AM every Sunday"
  async () => {
    await updateExchangeRateAndPrices();
  },
  {
    scheduled: true,
    timezone: 'Asia/Jerusalem',
  }
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Using Jest for testing | Vitest with ESM support | Phase 10 (completed) | Faster tests, native ESM, better TypeScript support |
| Manual fetch mocking | nock HTTP interceptors | Phase 10 (completed) | Realistic HTTP testing, timeout simulation, fallback API testing |
| Real database in tests | mongodb-memory-server | Phase 10 (completed) | Isolated tests, faster execution, no production risk |
| No exchange rate testing | Comprehensive currency tests | Phase 13 (current) | Verify fallback chain, calculation accuracy, cron job logic |
| Using decimal libraries | Math.round for whole numbers | Production (existing) | Simpler code, matches app's whole-number pricing strategy |

**Deprecated/outdated:**
- **Jest + babel-node:** Replaced by Vitest with native ESM support (Phase 10). Don't use Jest patterns.
- **Manual time mocking for cron:** Modern approach tests schedule syntax and function logic separately. Don't wait for actual cron timing.
- **Client-side currency conversion:** All conversion happens server-side with fresh rates. Frontend only displays pre-calculated prices.

## Open Questions

Things that couldn't be fully resolved:

1. **Frontend currency formatting tests**
   - What we know: Frontend uses simple symbol mapping ($ vs ₪), no locale-specific number formatting
   - What's unclear: Whether locale-specific formatting (thousands separators, decimal places) should be tested in Phase 13 or separate frontend test phase
   - Recommendation: Backend tests verify symbol selection logic only. Full frontend display testing belongs in separate frontend test phase (out of scope for Phase 13).

2. **Cache TTL testing strategy**
   - What we know: Production uses 24-hour TTL via `isRateStale(24)`
   - What's unclear: Whether to test only production TTL (24 hours) or multiple TTL scenarios
   - Recommendation: Test production TTL (24 hours) as primary case, plus edge cases (0 hours = always stale, missing timestamp = stale). Multiple TTL scenarios are lower priority.

3. **Tolerance for round-trip conversion accuracy**
   - What we know: `Math.round()` causes precision loss in round-trip conversions
   - What's unclear: Acceptable tolerance range (±1, ±2, percentage-based?)
   - Recommendation: Use ±2 tolerance for amounts under $1000, document precision loss in test comments. For amounts >$1000, use 0.2% tolerance.

4. **Real API smoke test frequency**
   - What we know: One real API test should be skippable in CI without API key
   - What's unclear: Should it run in CI if key is present, or only in manual testing?
   - Recommendation: Skip in CI by default (`test.skipIf(!process.env.EXCHANGE_RATE_API_KEY)`). Developers can run locally with key for validation.

5. **Cron job product update scope**
   - What we know: Cron job updates exchange rate AND recalculates all product prices
   - What's unclear: Should Phase 13 test product price updates, or is that a separate concern?
   - Recommendation: Test both in Phase 13. Product price updates are core to exchange rate job's purpose (lines 51-134 in exchangeRateJob.js).

## Sources

### Primary (HIGH confidence)
- Existing codebase:
  - `backend/services/exchangeRateService.js` - Exchange rate fetching, caching, fallback chain
  - `backend/jobs/exchangeRateJob.js` - Cron job schedule, product price updates
  - `backend/models/Settings.js` - Exchange rate storage schema
  - `backend/tests/setup.js` - Test infrastructure (Vitest, nock, mongodb-memory-server)
  - `backend/tests/helpers/mocks/exchangeRate.js` - Existing exchange rate mocks
  - `frontend/js/Views/cartView.js` - Currency symbol mapping
- Official documentation (via WebFetch):
  - [Vitest Test API](https://vitest.dev/api/) - test.skipIf, test.runIf conditional execution
  - [nock GitHub](https://github.com/nock/nock) - isDone, pendingMocks, activeMocks verification methods

### Secondary (MEDIUM confidence)
- [Testing scheduled node-cron tasks | Medium](https://medium.com/@kevinstonge/testing-scheduled-node-cron-tasks-6a808be30acd) - Cron testing strategy: test schedule syntax separately from timing
- [How To Use node-cron to Run Scheduled Jobs in Node.js | DigitalOcean](https://www.digitalocean.com/community/tutorials/nodejs-cron-jobs-by-examples) - Best practices for cron jobs
- [Ensure all nock mock interceptors are used | michaelheap.com](https://michaelheap.com/nock-all-mocks-used/) - Verification pattern for asserting all mocks consumed
- [How can I test that a request was not made? · nock Discussion #2732](https://github.com/nock/nock/discussions/2732) - Pattern for verifying zero HTTP requests
- [Handle Money in JavaScript - DEV Community](https://dev.to/benjamin_renoux/financial-precision-in-javascript-handle-money-without-losing-a-cent-1chc) - Currency precision best practices (work with integers, not floats)
- [JavaScript Currency Validation: Complete Guide with 2026 Best Practices](https://copyprogramming.com/howto/currency-validation) - Use Intl.NumberFormat for formatting, server-side conversion only

### Tertiary (LOW confidence)
- [Node.js Job Scheduler Code Example in 2026](https://forwardemail.net/en/blog/docs/node-js-job-scheduler-cron) - General cron job patterns in Node.js
- [Free Currency Converter API](https://free.currencyconverterapi.com/) - Exchange rate API patterns and fallback recommendations
- [nock-requests-tracker - npm](https://www.npmjs.com/package/nock-requests-tracker) - Advanced HTTP request tracking (not needed, but available if detailed tracking required)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already configured in Phase 10, no new dependencies needed
- Architecture: HIGH - Existing codebase provides clear patterns for service/job testing
- Pitfalls: HIGH - Based on common testing mistakes (cron timing, cache verification, precision loss)
- Currency formatting: MEDIUM - Frontend formatting rules are simple but locale testing scope is unclear
- Cron testing: MEDIUM - Clear that timing tests are impractical, but schedule validation patterns vary

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days - stable testing domain, no rapid changes expected)
