# Phase 16: Security & Middleware Tests - Research

**Researched:** 2026-02-05
**Domain:** Security middleware testing (CORS, rate limiting, input validation)
**Confidence:** HIGH

## Summary

Phase 16 focuses on testing existing security middleware implementations: CORS configuration, rate limiting, and input validation. The codebase already has these security features implemented in `backend/index.js`. Research confirms established testing patterns using supertest for HTTP-boundary tests, with specific techniques for testing CORS via Origin headers, rate limiting through sequential requests, and input validation using OWASP-recommended attack vectors.

The codebase uses:
- **CORS**: `cors` package v2.8.5 with dynamic origin callback
- **Rate Limiting**: `express-rate-limit` v7.5.1 with three tiers (auth, payment, admin)
- **Security Headers**: `helmet` v8.1.0 with API-oriented configuration
- **Input Validation**: Manual validation in route handlers (no centralized validation library)

**Primary recommendation:** Use supertest with explicit Origin headers for CORS tests, sequential request patterns for rate limiting (resetting between test files), and OWASP-based attack vectors for input validation. Test both development (permissive) and production (strict) modes by controlling NODE_ENV.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cors | ^2.8.5 | CORS middleware | De facto Express CORS solution |
| express-rate-limit | ^7.5.1 | Rate limiting | Most popular Express rate limiter |
| helmet | ^8.1.0 | Security headers | Industry standard for Express security headers |

### Testing (Already in Codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.0.18 | Test runner | Modern, fast, ESM-native |
| supertest | ^7.2.2 | HTTP assertions | Standard for Express integration tests |
| nock | ^14.0.10 | HTTP mocking | Prevents external API calls in tests |

### No Additional Libraries Required
The existing test infrastructure is sufficient. Security middleware tests follow the same patterns as existing auth and payment tests.

## Architecture Patterns

### Recommended Test File Structure
```
backend/tests/
├── integration/
│   ├── security.cors.test.js        # CORS middleware tests (SEC-01 to SEC-03)
│   ├── security.ratelimit.test.js   # Rate limiting tests (SEC-04 to SEC-07)
│   └── security.validation.test.js  # Input validation tests (SEC-08, SEC-09)
└── helpers/
    └── securityHelpers.js           # XSS/injection test vectors (optional)
```

### Pattern 1: CORS Testing with Origin Headers
**What:** Test CORS middleware by setting Origin header and verifying Access-Control-Allow-Origin response
**When to use:** All CORS tests (SEC-01, SEC-02, SEC-03)
**Example:**
```javascript
// Source: supertest documentation + codebase pattern
import request from 'supertest';

describe('CORS Middleware - Production Mode', () => {
  it('should allow configured origins', async () => {
    // Set NODE_ENV before importing app
    process.env.NODE_ENV = 'production';
    process.env.HOST = 'https://example.com';

    const { app } = await import('../../index.js');

    const response = await request(app)
      .options('/allproducts')
      .set('Origin', 'https://example.com')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('https://example.com');
  });

  it('should reject unauthorized origins in production', async () => {
    const response = await request(app)
      .get('/allproducts')
      .set('Origin', 'https://malicious-site.com');

    // CORS middleware returns error for disallowed origins
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
```

### Pattern 2: Rate Limiting with Sequential Requests
**What:** Send requests sequentially up to and beyond the limit, verify 429 response
**When to use:** Rate limit enforcement tests (SEC-04 to SEC-07)
**Example:**
```javascript
// Source: express-rate-limit testing patterns
describe('Rate Limiting - Auth Endpoints', () => {
  // Use unique X-Forwarded-For per test to isolate rate limit state
  const uniqueIP = () => `192.168.1.${Date.now() % 255}`;

  it('should allow requests within limit (default 20 in 15min)', async () => {
    const ip = uniqueIP();

    // Send 5 requests (well under limit)
    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .post('/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'test@example.com', password: 'wrong' });

      // Should not be rate limited (401 = auth failed, not rate limited)
      expect(response.status).not.toBe(429);
    }
  });

  it('should reject requests exceeding limit', async () => {
    const ip = uniqueIP();
    const limit = Number(process.env.RATE_LIMIT_AUTH_MAX || 20);

    // Exhaust the rate limit
    for (let i = 0; i < limit; i++) {
      await request(app)
        .post('/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'test@example.com', password: 'wrong' });
    }

    // Next request should be rate limited
    const response = await request(app)
      .post('/login')
      .set('X-Forwarded-For', ip)
      .send({ email: 'test@example.com', password: 'wrong' });

    expect(response.status).toBe(429);
    expect(response.body.error).toMatch(/too many requests/i);
  });
});
```

### Pattern 3: Input Validation with Attack Vectors
**What:** Send XSS and NoSQL injection payloads, verify sanitization or rejection
**When to use:** Input validation tests (SEC-08, SEC-09)
**Example:**
```javascript
// Source: OWASP XSS Prevention Cheat Sheet
describe('Input Validation - XSS Prevention', () => {
  const xssVectors = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
    '"><script>alert(1)</script>',
    "javascript:alert('XSS')",
    '<svg onload=alert(1)>',
    '{{constructor.constructor("alert(1)")()}}', // Template injection
  ];

  it('should sanitize XSS in product descriptions', async () => {
    // Create admin token for authenticated request
    const token = createAuthToken({ userType: 'admin' });

    for (const xss of xssVectors) {
      const product = createProduct({ description: xss });

      await request(app)
        .post('/addproduct')
        .set('auth-token', token)
        .send(product);

      // Fetch product and verify XSS is sanitized/escaped
      const fetched = await Product.findOne({ id: product.id });

      // Should not contain raw script tags
      expect(fetched.description).not.toContain('<script>');
      expect(fetched.description).not.toMatch(/onerror\s*=/i);
    }
  });
});

// Source: OWASP NoSQL Injection Prevention
describe('Input Validation - NoSQL Injection Prevention', () => {
  const noSqlVectors = [
    { email: { $gt: '' } },           // Operator injection
    { email: { $ne: null } },         // Not-equal bypass
    { email: { $regex: '.*' } },      // Regex injection
    { $where: 'this.password.length > 0' }, // $where clause
  ];

  it('should reject NoSQL operators in login fields', async () => {
    for (const payload of noSqlVectors) {
      const response = await request(app)
        .post('/login')
        .send({ ...payload, password: 'test' });

      // Should reject with 400 (validation error), not process the query
      expect(response.status).toBe(400);
      expect(response.body.errors).toMatch(/invalid/i);
    }
  });
});
```

### Anti-Patterns to Avoid
- **Testing rate limits without IP isolation:** Without unique X-Forwarded-For headers, tests contaminate each other's rate limit state
- **Testing CORS without Origin header:** CORS middleware only applies when Origin header is present
- **Assuming SQL injection applies to MongoDB:** Test NoSQL-specific operators ($gt, $ne, $where), not SQL keywords
- **Testing validation by checking status code only:** Verify error messages are user-friendly, not stack traces

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XSS test vectors | Custom payload list | OWASP XSS Filter Evasion Cheat Sheet | Comprehensive, maintained by security experts |
| NoSQL injection payloads | Ad-hoc operator tests | OWASP NoSQL Injection Testing Guide | Covers edge cases like $where |
| CORS testing | Manual header assertions | supertest .set('Origin', ...) | Handles preflight automatically |
| Rate limit state reset | Restart server between tests | Unique IP per test via X-Forwarded-For | Faster, no server restart needed |

**Key insight:** Security testing effectiveness comes from using established attack vectors, not inventing new ones. OWASP cheat sheets provide battle-tested payloads.

## Common Pitfalls

### Pitfall 1: CORS Testing Without NODE_ENV Control
**What goes wrong:** Development mode allows any localhost origin, masking production CORS bugs
**Why it happens:** Tests inherit NODE_ENV=test which uses development-like CORS rules
**How to avoid:** Explicitly set NODE_ENV='production' for production CORS tests, use separate describe blocks
**Warning signs:** Tests pass but production CORS is broken

### Pitfall 2: Rate Limit State Contamination
**What goes wrong:** One test's requests count against another test's rate limit
**Why it happens:** express-rate-limit's default memory store persists between tests
**How to avoid:** Use unique X-Forwarded-For IP per test, or set very high limits in test env
**Warning signs:** Tests pass individually but fail when run together

### Pitfall 3: Confusing Input Validation with Sanitization
**What goes wrong:** Tests check for rejection when the app actually sanitizes, or vice versa
**Why it happens:** Different strategies for different field types
**How to avoid:** Document per-field strategy: descriptions may sanitize, SKU/email should reject
**Warning signs:** Flaky tests that depend on unstated assumptions

### Pitfall 4: Testing Security Headers Without Baseline
**What goes wrong:** Tests pass but miss headers that should be set
**Why it happens:** Only testing for presence of some headers, not complete set
**How to avoid:** Compare against helmet's default headers list, verify no X-Powered-By
**Warning signs:** Security scanner finds missing headers despite passing tests

### Pitfall 5: NoSQL Injection Tests Returning Wrong Status
**What goes wrong:** Test expects 400 but gets 500 (unhandled error) or 200 (query executed)
**Why it happens:** App may not have validation, allowing dangerous queries
**How to avoid:** First document current behavior, then test expected behavior
**Warning signs:** Test fails because validation doesn't exist (need to implement, not just test)

## Code Examples

Verified patterns from official sources:

### CORS Preflight Testing
```javascript
// Source: expressjs/cors documentation + supertest patterns
it('should handle OPTIONS preflight correctly', async () => {
  const response = await request(app)
    .options('/orders')
    .set('Origin', 'https://allowed-origin.com')
    .set('Access-Control-Request-Method', 'POST')
    .set('Access-Control-Request-Headers', 'Content-Type, auth-token');

  expect(response.status).toBe(204);
  expect(response.headers['access-control-allow-origin']).toBe('https://allowed-origin.com');
  expect(response.headers['access-control-allow-methods']).toContain('POST');
  expect(response.headers['access-control-allow-headers']).toContain('auth-token');
  expect(response.headers['access-control-allow-credentials']).toBe('true');
});
```

### Security Headers Verification
```javascript
// Source: helmet documentation
it('should set security headers (helmet)', async () => {
  const response = await request(app).get('/allproducts');

  // Helmet defaults
  expect(response.headers['x-dns-prefetch-control']).toBe('off');
  expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  expect(response.headers['x-content-type-options']).toBe('nosniff');
  expect(response.headers['x-xss-protection']).toBe('0'); // Disabled per modern recommendation

  // Should NOT have X-Powered-By (helmet removes it)
  expect(response.headers['x-powered-by']).toBeUndefined();
});
```

### Rate Limit Headers Verification
```javascript
// Source: express-rate-limit standardHeaders: 'draft-7'
it('should include rate limit headers', async () => {
  const response = await request(app)
    .post('/login')
    .set('X-Forwarded-For', '192.168.1.100')
    .send({ email: 'test@example.com', password: 'test' });

  // draft-7 standard headers
  expect(response.headers['ratelimit-limit']).toBeDefined();
  expect(response.headers['ratelimit-remaining']).toBeDefined();
  expect(response.headers['ratelimit-reset']).toBeDefined();
});
```

### Input Validation for Unicode/RTL
```javascript
// Source: OWASP Input Validation Cheat Sheet + codebase Hebrew support
describe('Unicode and RTL Character Handling', () => {
  const validHebrewNames = [
    'תכשיטים יפים',          // Hebrew product name
    'Sarah (שרה)',            // Mixed Hebrew/English
    'Tamar Kfir Jewelry',     // English (should pass)
  ];

  const invalidInputs = [
    '\u0000malicious',        // Null byte injection
    'name\u202Eevil',         // RTL override character
    'a'.repeat(10001),        // Excessive length
  ];

  it('should accept valid Hebrew names', async () => {
    for (const name of validHebrewNames) {
      // Verify legitimate Hebrew doesn't get blocked
      // Implementation depends on validation approach
    }
  });

  it('should reject dangerous Unicode sequences', async () => {
    for (const name of invalidInputs) {
      // Verify control characters and excessive length rejected
    }
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| X-XSS-Protection header | helmet disables it (0) | 2020+ | Modern browsers have built-in XSS protection, header can cause issues |
| RateLimit-* headers | ratelimit-* (lowercase, draft-7) | express-rate-limit v7 | Standard header format per IETF draft |
| CORS wildcards (*) | Dynamic origin callback | Always | Credentials require specific origin, not wildcard |
| SQL injection testing | NoSQL injection testing | MongoDB adoption | Different attack vectors for document databases |

**Deprecated/outdated:**
- `legacyHeaders: true` in express-rate-limit (use standardHeaders: 'draft-7')
- X-XSS-Protection: 1 (modern browsers ignore it, can cause false positives)
- Testing CORS with wildcard origins (doesn't work with credentials)

## Codebase-Specific Findings

### Current CORS Configuration (backend/index.js lines 615-684)
- **Development:** Allows any localhost/127.0.0.1 port dynamically
- **Production:** Strict allowlist from HOST, ADMIN_URL, FULLHOST, API_URL env vars
- **Credentials:** Enabled (cookies/auth headers allowed)
- **Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Headers:** Content-Type, Authorization, auth-token, X-Requested-With

### Current Rate Limits (backend/index.js lines 215-247)
| Limiter | Window | Default Limit | Env Override |
|---------|--------|---------------|--------------|
| authRateLimiter | 15 min | 20 | RATE_LIMIT_AUTH_MAX |
| paymentRateLimiter | 15 min | 60 | RATE_LIMIT_PAYMENT_MAX |
| adminRateLimiter | 15 min | 120 | RATE_LIMIT_ADMIN_MAX |

All use `standardHeaders: 'draft-7'` and `legacyHeaders: false`.

### Endpoints with Rate Limiting Applied
- `/login` - authRateLimiter
- `/signup` - authRateLimiter
- `/orders` - paymentRateLimiter
- `/orders/:orderID/capture` - paymentRateLimiter
- `/addproduct` - adminRateLimiter
- `/upload` - adminRateLimiter
- `/removeproduct` - adminRateLimiter
- `/editproduct/:id` - adminRateLimiter
- Multiple other admin endpoints

### Input Validation Observations
The codebase uses manual validation in route handlers:
- Type checking: `typeof req.body.email !== 'string'`
- Required fields: `!req.body.name`
- Format validation: SKU regex `/^[A-Z0-9]+$/`
- No centralized sanitization library (e.g., no express-validator, no DOMPurify)

**Implication for SEC-08/SEC-09:** Tests should document current behavior. If XSS/NoSQL injection passes through, that's a finding, not a test failure. The test documents the current state; fixing is separate.

## Open Questions

Things that couldn't be fully resolved:

1. **Does the app sanitize or reject XSS in descriptions?**
   - What we know: No sanitization library visible in dependencies
   - What's unclear: Mongoose may provide some protection, needs testing
   - Recommendation: Test and document actual behavior, don't assume

2. **Is NoSQL injection prevented at the Mongoose level?**
   - What we know: Mongoose query sanitization exists for some operators
   - What's unclear: Which operators are blocked vs allowed
   - Recommendation: Test specific vectors, document which pass through

3. **How does rate limiting behave with proxies?**
   - What we know: `trust proxy: 1` is set, X-Forwarded-For should work
   - What's unclear: Behavior with multiple proxy levels
   - Recommendation: Verify X-Forwarded-For is respected in tests

## Sources

### Primary (HIGH confidence)
- Backend codebase: `backend/index.js` (lines 215-247 rate limiting, 615-684 CORS)
- Backend tests: Existing test patterns in `backend/tests/integration/`
- express-rate-limit GitHub: Configuration options and standardHeaders
- helmet.js documentation: Default security headers list

### Secondary (MEDIUM confidence)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) - Validation strategies
- [OWASP XSS Filter Evasion Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/XSS_Filter_Evasion_Cheat_Sheet.html) - XSS test vectors
- [OWASP NoSQL Injection Testing](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05.6-Testing_for_NoSQL_Injection) - MongoDB injection vectors
- [PortSwigger XSS Cheat Sheet](https://portswigger.net/web-security/cross-site-scripting/cheat-sheet) - Comprehensive XSS payloads
- [supertest documentation](https://www.npmjs.com/package/supertest) - HTTP testing patterns
- [Express CORS middleware](https://expressjs.com/en/resources/middleware/cors.html) - CORS configuration

### Tertiary (LOW confidence)
- Web searches for testing patterns - General guidance, verify with official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Versions confirmed from package.json
- Architecture: HIGH - Patterns derived from existing codebase tests
- CORS behavior: HIGH - Source code directly examined
- Rate limit behavior: HIGH - Configuration directly examined
- Input validation: MEDIUM - No centralized validation visible, needs testing
- Attack vectors: MEDIUM - OWASP sources, may need codebase-specific adjustment

**Research date:** 2026-02-05
**Valid until:** 30 days (stable middleware versions, OWASP guidance evolves slowly)
