# Phase 10: Test Infrastructure Foundation - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish safe test infrastructure with database isolation and external API mocking to enable automated testing without contaminating production resources. This phase sets up the foundation (Vitest, mongodb-memory-server, nock for API mocking, environment validation) and creates a sample integration test to verify the infrastructure works. Writing actual test coverage for features is handled in subsequent phases (11-16).

</domain>

<decisions>
## Implementation Decisions

### Database Strategy
- **mongodb-memory-server for all tests** — Real MongoDB instance in memory for accurate schema validation and query behavior, with automatic isolation and cleanup

### Claude's Discretion

#### Test Execution Safety
- Credential detection approach (pattern matching vs environment variable allowlist)
- Handling of production-like configuration (hard fail vs warn with override)
- Environment validation timing (every test run vs once on setup)
- Accidental external network call handling (block all vs log warnings)

#### Mock vs Real Resources
- Payment provider mocking strategy (full mocking, test mode APIs, or hybrid)
- File storage mocking (S3 client mock, local filesystem, or in-memory buffer)
- Exchange rate API mocking approach (fixed rates, dynamic scenarios, or record/replay)

#### Test Data Lifecycle
- Fixture sharing strategy (shared fixtures, fresh data per test, or hybrid)
- Cleanup timing (after each test, after suite, or automatic via memory server)
- Test parallelization level (full parallel, sequential only, or parallel within limits)
- Data creation patterns (factory functions, builder pattern, or raw object literals)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches that prioritize safety and developer experience.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-test-infrastructure-foundation*
*Context gathered: 2026-02-04*
