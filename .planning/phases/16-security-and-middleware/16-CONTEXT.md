# Phase 16: Security & Middleware Tests - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Test CORS middleware, rate limiting enforcement, and input validation to verify the application protects against unauthorized access, abuse, and malicious input. This phase covers security testing only - actual security implementation already exists in the codebase.

</domain>

<decisions>
## Implementation Decisions

### CORS Testing Approach
- **Separate test suites for dev vs production:** Development environment tests (localhost permissive) and production environment tests (strict whitelist) should be distinct test suites
- **Comprehensive testing priority:** CORS is critical security - test thoroughly with many scenarios, not just basic cases
- **Same-origin verification:** Include tests that verify same-origin requests pass without CORS headers (baseline behavior)
- **Credentials handling:** Test Access-Control-Allow-Credentials flag when cookies/auth are sent cross-origin

### Rate Limiting Verification
- **All sensitive endpoints:** Auth endpoints (login, signup, password reset), payment endpoints (PayPal, Stripe), contact form, and admin actions all require rate limit testing
- **Middleware sequence verification:** Test that middleware order matters - verify CORS runs before auth, rate limit before validation, etc.

### Input Validation Patterns
- **All POST/PUT endpoints:** Any endpoint that accepts user data requires input validation tests
- **Field-specific validation rules:** Test each field type - email format, price numbers, SKU alphanumeric, URL structure
- **Detailed message validation:** Verify exact error messages for user-friendly feedback (not just status codes)
- **Both boundaries and encoding edge cases:** Test max length, zero/negative numbers, empty strings, plus Unicode (emoji), RTL characters, and non-ASCII in Hebrew names
- **NoSQL injection protection:** Send MongoDB operators like {$gt: ''}, {$ne: null} in fields to verify rejection
- **Content-type validation:** Verify application/json required, reject text/plain or form-data

### Test Data and Scenarios
- **OWASP test vectors:** Use established attack databases and payload lists for comprehensive coverage
- **Comprehensive slow tests:** Test every attack vector thoroughly, accept longer run time over speed
- **Middleware sequence testing:** Verify that middleware order matters for security (CORS before auth, rate limit before validation)
- **Positive security scenarios:** Verify legitimate inputs pass (valid Hebrew names, proper SKUs, real emails aren't blocked by security rules)
- **Production vs development behavior:** Test that dev allows more permissive CORS/validation while production is stricter
- **Security headers verification:** Test Content-Security-Policy, X-Frame-Options, etc. are properly set
- **Security assumptions documentation:** Comment why each test exists - explain threat model and what each test protects against

### Claude's Discretion
- CORS attack patterns to include (null origin, subdomain tricks, port variations)
- Rate limit enforcement testing strategy (sequential vs concurrent request patterns)
- Rate limit reset behavior testing (whether to wait for time window)
- Rate limit response validation depth (status, headers, error message)
- Per-IP vs per-user rate limiting key strategy (check codebase implementation)
- Endpoint-specific rate limit configurations (check if limits differ per endpoint)
- Rate limit test isolation strategy (state reset vs unique IPs)
- Admin rate limit bypass behavior (check if exemptions exist)
- HTTP method restrictions in CORS (whether to test allowed/blocked methods)
- Preflight OPTIONS request testing depth (headers only vs full flow)
- CORS headers to validate (core vs credentials/max-age)
- CORS testing scope (global middleware vs per-endpoint)
- CORS rejection verification approach (missing header vs status code)
- Wildcard origin handling (check if app uses wildcards)
- CORS edge cases (protocol, port, subdomain, null origin, malformed headers)
- Attack vectors to cover (determine if SQL injection relevant for MongoDB app, path traversal, command injection)
- Sanitization vs rejection strategy per field type (descriptions sanitized, SKU/email rejected)
- Payload realism (real CVE payloads vs sanitized test patterns)

</decisions>

<specifics>
## Specific Ideas

- Tests should inherit patterns from Phases 10-15: mongodb-memory-server isolation, nock HTTP mocking, supertest HTTP-boundary testing
- Test suite should complement existing 374 passing tests
- Use counter-based unique data generation for test isolation
- Document security threat model in test comments (why each test exists, what it protects against)

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 16-security-and-middleware*
*Context gathered: 2026-02-05*
