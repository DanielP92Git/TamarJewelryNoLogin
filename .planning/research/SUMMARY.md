# Project Research Summary

**Project:** Tamar Kfir Jewelry - Test Infrastructure for v1.2
**Domain:** Retrofitting test coverage to production e-commerce platform (zero baseline)
**Researched:** 2026-02-04
**Confidence:** HIGH

## Executive Summary

This research synthesizes findings on adding test infrastructure to a production e-commerce platform with zero existing test coverage. The platform is a monolithic Express backend (4,233 lines in index.js) with vanilla JS MVC frontend, handling live payments (PayPal/Stripe), authentication (JWT), file uploads (Sharp + DigitalOcean Spaces), and multi-currency operations (USD/ILS).

**The recommended approach:** Integration-first testing using Vitest + Supertest for the backend monolith, with payment/external API mocking via nock and isolated test databases via mongodb-memory-server. Priority is highest-risk areas: payment flows, authentication, and currency conversion. Frontend testing is deferred until backend reaches 70%+ coverage.

**Key risks and mitigations:** (1) Production database contamination - use dedicated test database with validation; (2) Live payment API calls - enforce sandbox-only testing with environment validation; (3) Over-mocking monolith - test at HTTP boundary level, not internal functions; (4) False confidence from weak tests - behavior-focused naming and assertion density standards.

The monolithic architecture means traditional unit testing is difficult without refactoring. Integration tests via HTTP endpoints provide better ROI and allow safe refactoring later with tests as safety net.

## Key Findings

### Recommended Stack

Modern JavaScript testing ecosystem for Node.js 22 with focus on speed and ESM compatibility.

**Core technologies:**
- **Vitest 4.0.18+:** Test framework for both backend and frontend - 10-20x faster than Jest in watch mode, native ESM support, 30.8M weekly downloads (Jan 2026). Compatible with most Jest APIs for easy adoption.
- **Supertest 7.0.0+:** HTTP integration testing for Express - tests routes in-memory without spinning up server. Perfect for monolithic backend where unit testing is impractical.
- **mongodb-memory-server 11.0.1+:** In-memory MongoDB for isolated testing - spins up separate instances per suite, eliminating test pollution. Fast (~7MB per instance) and works in CI without external dependencies.
- **nock 14.0.0+:** HTTP request mocking - intercepts external API calls (PayPal, Stripe, exchange rate API) at network layer. More comprehensive than simple stubs. Updated Jan 2026.
- **Happy-DOM 15.0.0+:** DOM simulation for frontend - faster and lighter than JSDOM, sufficient for vanilla JS testing. 2-3x faster for simple DOM operations.

**Supporting tools:**
- **@vitest/coverage-v8:** Built-in code coverage using Node.js native V8 (faster than Istanbul)
- **aws-sdk-mock 6.1.0+:** Mock S3-compatible DigitalOcean Spaces uploads
- **sinon 21.0.1+:** Spies/stubs for complex mocking (cron jobs, timers)

**Why NOT Jest:** Slower than Vitest (10-20x in watch mode), experimental ESM support, larger footprint. Vitest is Jest-compatible but modern. For a codebase with zero tests, starting with Vitest avoids future migration cost.

### Expected Features

Testing a production e-commerce platform requires different priorities than greenfield development.

**Must have (v1.2 - first coverage):**
- Payment flow integration tests (PayPal/Stripe mocked) - Highest risk: payment bugs lose money. Test order creation, capture, error handling.
- Auth security tests (JWT validation, role-based access) - Auth breaches expose customer data. Test token validation, admin vs user boundaries.
- Currency conversion unit tests (USD/ILS fallback chain) - Wrong currency = wrong charges. Test API failure → stored → env → default fallback.
- Database operation tests (Product, User, Settings models) - Data integrity risk. Test CRUD, validation, constraints.
- File upload validation tests (MIME types, size limits) - Security risk: malicious uploads. Test validation logic.
- Test infrastructure setup - Install test runner, configure, create fixtures. Backend priority over frontend.

**Should have (v1.3+):**
- Payment sandbox integration (real test mode) - Catch SDK changes mocks miss. Run less frequently (nightly).
- Multi-currency E2E tests (USD and ILS flows) - Verify complete user journey per currency including RTL display.
- File upload E2E tests (Sharp to Spaces) - Test complete pipeline with test S3 bucket. Complex setup deferred.
- Exchange rate job tests (cron scheduling) - Verify scheduled updates. Low priority (manual testing sufficient).

**Defer (v2+):**
- Frontend view unit tests - Backend has higher risk and zero coverage. Frontend bugs are cosmetic, backend bugs lose money.
- Performance regression tests - Need baseline data first. Add after functional tests stable.
- Security fuzzing tests - Requires specialized tools and expertise. Consider external security audit.

### Architecture Approach

HTTP-boundary testing pattern for monolithic backend, with strategic isolation of testable modules.

**Testing strategy for 4,233-line monolith:**
1. **Export app separately from server** - Minimal change to index.js: export app without calling app.listen() for Supertest to consume
2. **Integration tests as primary pattern** - Test complete HTTP request flows through monolith. Mock only external services (PayPal, Stripe, S3).
3. **Unit tests for extracted modules** - Test middleware/auth.js functions, services/exchangeRateService.js, config/locale.js in isolation
4. **Defer monolith refactoring** - Don't extract code just to make it testable. Test what exists, refactor later with tests as safety net.

**Test structure:**
```
backend/
├── tests/
│   ├── setup.js                    # MongoDB memory server + mocks
│   ├── fixtures/                   # Test data (images, JSON)
│   ├── integration/                # PRIMARY - Supertest endpoint tests
│   │   ├── auth.test.js
│   │   ├── payments.test.js
│   │   ├── products.test.js
│   │   └── uploads.test.js
│   └── unit/                       # SECONDARY - Extracted modules only
│       ├── middleware/auth.test.js
│       └── services/exchangeRate.test.js
├── vitest.config.js
└── package.json
```

**Major components to test:**
1. **Payment processing** (~400 lines) - Test via integration (Supertest + nock mocks), not unit tests
2. **Authentication middleware** (110 lines) - Unit test pure functions (getTokenFromRequest, requireAdmin)
3. **Currency conversion service** (223 lines) - Unit test with mocked external API
4. **File upload validation** (~200 lines) - Integration test with aws-sdk-mock
5. **Database models** (~150 lines) - Integration test with mongodb-memory-server

**Key pattern:** Test at HTTP boundary (request → response) for monolithic code. Mock external boundaries only (payment APIs, S3, exchange rate API). Use real implementations for internal dependencies (MongoDB, JWT, bcrypt, Sharp).

### Critical Pitfalls

Top 5 pitfalls from research that could derail v1.2 testing efforts:

1. **Production database contamination** - Tests execute against production MongoDB, writing test data or deleting real records. **Prevention:** Environment validation in test bootstrap (MONGO_URL must contain "test"), use mongodb-memory-server for isolation, drop test database after suite.

2. **Live payment API calls during tests** - Tests call real PayPal/Stripe APIs, creating actual payment intents or charging accounts. **Prevention:** Startup validation rejects `sk_live_` Stripe keys, verify PayPal URL contains "sandbox", mock all HTTP calls with nock.

3. **S3/Spaces file upload to production storage** - Tests upload to production DigitalOcean Spaces bucket, filling storage or overwriting product images. **Prevention:** Use SPACES_BUCKET_TEST, prefix test files, cleanup in afterAll, mock S3 SDK in unit tests.

4. **Monolith over-mocking leading to brittle tests** - Tests mock every internal function, tightly coupling to implementation. Refactoring breaks tests even though behavior unchanged. **Prevention:** Test at API boundary (HTTP endpoints), mock only external services, don't mock internal helpers.

5. **False confidence from high coverage with weak tests** - Team achieves 80% coverage but tests don't validate behavior (just execute code without assertions). **Prevention:** Behavior-focused test naming, assertion density requirements, test quality over quantity.

**Additional concerns:**
- Environment variable leakage between tests (snapshot/restore process.env)
- Race conditions in async assertions (await all promises, disable background jobs)
- Test data cleanup failure causing cascading failures (transaction rollback or explicit cleanup registry)

## Implications for Roadmap

Based on research, v1.2 should be structured as 3 focused phases prioritizing risk mitigation:

### Phase 1: Test Infrastructure Foundation (1-2 days)
**Rationale:** Cannot write tests without safe infrastructure. Risk of production contamination is catastrophic - must establish isolation first.

**Delivers:**
- Vitest installed and configured (backend + frontend)
- mongodb-memory-server setup with environment validation
- nock mocks for PayPal/Stripe/exchange rate APIs
- aws-sdk-mock for S3/Spaces uploads
- .env.test file with safe test credentials
- Test database isolation verified
- CI/CD test scripts added

**Addresses:**
- PITFALL-1: Production database contamination
- PITFALL-2: Live payment API calls
- PITFALL-3: S3 upload to production storage
- PITFALL-4: Environment variable leakage

**Success criteria:**
- Test can run against test database only
- Environment validation rejects production credentials
- Sample integration test passes
- No production resources touched during test run

### Phase 2: Critical Path Coverage - Auth & Payments (3-4 days)
**Rationale:** Highest-risk areas first. Auth breaches expose customer data, payment bugs lose money. These areas are security/revenue critical.

**Delivers:**
- Auth middleware unit tests (JWT validation, role checks)
- Payment integration tests (PayPal/Stripe order creation, capture, errors)
- Currency conversion unit tests (fallback chain, rate staleness)
- Database model tests (User, Settings basic CRUD)
- ~60-70% coverage of critical paths

**Addresses:**
- FEATURE-1: Payment flow integration tests
- FEATURE-2: Auth security tests
- FEATURE-3: Currency conversion unit tests
- PITFALL-5: False confidence from weak tests (establish quality standards)
- PITFALL-6: Monolith over-mocking (establish HTTP-boundary pattern)

**Uses:**
- Supertest for endpoint testing
- nock for payment API mocking
- mongodb-memory-server for auth/user tests

**Success criteria:**
- All auth endpoints tested (login, register, token validation)
- PayPal and Stripe payment flows tested (success + error scenarios)
- Currency fallback chain verified
- Tests follow behavior-focused naming convention
- Code review checklist includes test quality verification

### Phase 3: Data Integrity & File Operations (2-3 days)
**Rationale:** Second-tier risk areas. File upload vulnerabilities create security issues, database bugs corrupt product catalog.

**Delivers:**
- File upload validation tests (MIME types, size limits, malicious files)
- Product model tests (CRUD, validation, displayOrder for drag-drop)
- Settings model tests (exchange rate updates, cron job integration)
- Image processing tests (Sharp resize, WebP conversion)
- ~70-80% overall backend coverage

**Addresses:**
- FEATURE-4: File upload validation tests
- FEATURE-5: Database operation tests
- ARCHITECTURE-4: File upload validation testing
- ARCHITECTURE-5: Database model testing

**Uses:**
- Supertest .attach() for file uploads
- aws-sdk-mock for S3 operations
- Sinon for cron job mocking

**Success criteria:**
- Upload endpoints reject invalid files
- Product catalog operations tested (create, update, reorder)
- Sharp image processing verified
- No file leaks to production storage
- Test cleanup hooks prevent data pollution

### Phase Ordering Rationale

1. **Infrastructure before tests** - Cannot safely write tests without database isolation and API mocking. Starting with test code risks catastrophic production contamination.

2. **Auth + Payments before anything else** - These are the highest-risk areas in e-commerce. Auth breaches expose PII, payment bugs lose revenue. Cover critical paths at 90%+ before touching lower-risk code.

3. **File operations last** - Important for security but less critical than payments/auth. Complex setup (S3 mocking, Sharp processing) deferred until simpler tests validate infrastructure works.

4. **Frontend deferred to v1.3+** - Backend has zero coverage and higher risk. Frontend bugs are cosmetic (visible immediately), backend bugs lose money silently. Prioritize backend until 70%+ coverage achieved.

### Research Flags

**Phases needing deeper research during execution:**
- **Phase 2:** Payment API error scenarios - Research showed many payment bugs come from unexpected API responses. Test declined cards, timeout, network errors beyond basic success case.
- **Phase 3:** Sharp image processing edge cases - Research noted WebP conversion can fail in non-obvious ways (corrupt images, unsupported formats). May need additional fixture images.

**Phases with standard patterns (skip additional research):**
- **Phase 1:** Database isolation with mongodb-memory-server is well-documented, standard 2026 practice
- **Phase 2:** JWT testing patterns are mature, auth.js middleware already modular and testable
- **Phase 3:** Mongoose model testing is straightforward, extensive documentation available

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Vitest/Supertest/mongodb-memory-server are proven 2026 standards with extensive documentation. 30M+ weekly downloads. Compatible with Node.js 22. |
| Features | HIGH | Payment testing best practices well-documented by Stripe/PayPal. E-commerce testing patterns established. Critical path identification backed by multiple sources. |
| Architecture | HIGH | HTTP-boundary testing for monoliths is well-researched pattern. Integration-first approach for legacy systems documented across multiple sources (Ayende, Understand Legacy Code). |
| Pitfalls | HIGH | Production contamination pitfalls documented in multiple testing guides. Payment testing pitfalls from Stripe official docs. Monolith testing anti-patterns from experienced practitioners. |

**Overall confidence:** HIGH

Research drew from official documentation (Stripe, Vitest, MongoDB), recent 2026 best practices articles, and deep legacy testing resources. Stack versions verified against package.json. Patterns tested with Node.js 22 and Express 4.x.

### Gaps to Address

Minor gaps requiring validation during execution (not blockers):

- **Exchange rate API specific mocking:** Research covered general HTTP mocking, but exchangerate-api.com specific endpoints need documentation review. Straightforward - verify API response schema in Phase 1.

- **DigitalOcean Spaces vs AWS S3 compatibility:** Research focused on S3, but Spaces is S3-compatible. May need minor adjustments to aws-sdk-mock configuration. Test in Phase 1 setup.

- **Parcel + Vitest interaction:** Frontend uses Parcel bundler. Vitest doesn't run through Parcel (imports source directly). Should work but needs verification in Phase 1. Backup plan: manual alias configuration.

- **RTL testing considerations:** Hebrew interface testing not deeply covered in research. Frontend testing deferred to v1.3, but may need research phase if cart/display logic requires currency-specific testing.

**Mitigation strategy:** Address gaps during Phase 1 foundation setup. All gaps are infrastructure-level (not domain-specific) and have clear fallback approaches.

## Sources

### Primary (HIGH confidence)

**Testing Frameworks:**
- [Vitest Official Docs](https://vitest.dev/guide/) - Installation, configuration, API reference
- [Vitest npm](https://www.npmjs.com/package/vitest) - Version 4.0.18, 30.8M weekly downloads
- [Supertest npm](https://www.npmjs.com/package/supertest) - Version 7.0.0+, Express testing standard
- [mongodb-memory-server GitHub](https://github.com/typegoose/mongodb-memory-server) - Version 11.0.1
- [nock GitHub](https://github.com/nock/nock) - Updated Jan 21, 2026
- [Sinon.js Official Docs](https://sinonjs.org/) - Version 21.0.1

**Payment Testing:**
- [Payment gateway testing guide | Stripe](https://stripe.com/resources/more/payment-gateway-testing-a-how-to-guide-for-businesses)
- [Stripe Automated Testing Docs](https://docs.stripe.com/automated-testing)
- [Payment Gateway Testing: Complete Guide | TestPapas](https://testpapas.com/payment-gateway-testing)

**Legacy System Testing:**
- [Testing against Production Database | Microsoft Learn](https://learn.microsoft.com/en-us/ef/core/testing/testing-with-the-database)
- [Avoid retrofitting unit tests | Ayende](https://ayende.com/blog/3296/avoid-retrofitting-unit-tests)
- [Best way to start testing untested code | Understand Legacy Code](https://understandlegacycode.com/blog/best-way-to-start-testing-untested-code/)

### Secondary (MEDIUM confidence)

- [Testing MongoDB with Memory Server | AppSignal Blog](https://blog.appsignal.com/2025/06/18/testing-mongodb-in-node-with-the-mongodb-memory-server.html) - June 2025 tutorial
- [Vitest vs Jest Comparison | Better Stack](https://betterstack.com/community/guides/scaling-nodejs/vitest-vs-jest/) - Performance benchmarks
- [JSDOM vs Happy-DOM | Sean Coughlin](https://blog.seancoughlin.me/jsdom-vs-happy-dom-navigating-the-nuances-of-javascript-testing)
- [Monolithic vs Microservices Testing | BrowserStack](https://www.browserstack.com/guide/testing-strategies-in-microservices-vs-monolithic-applications)

### Tertiary (LOW confidence, needs validation)

- Adobe S3Mock - Alternative to aws-sdk-mock, more comprehensive but complex setup. Consider only if aws-sdk-mock insufficient.

**Verified from Codebase:**
- `backend/package.json` - Node.js 22.15.0, Express 4.20.0, Mongoose 8.6.1, aws-sdk 2.1693.0
- `backend/index.js` - 4,233 lines monolithic structure, payment endpoints at lines 1213+/3253+
- `CLAUDE.md` - Multi-language (eng/heb with RTL), multi-currency (USD/ILS) requirements

---

*Research completed: 2026-02-04*
*Ready for requirements definition: Yes*
*Next step: Create roadmap with 3-phase structure (Foundation → Critical Path → Data Integrity)*
