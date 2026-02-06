# Phase 17: Test Infrastructure & Utilities - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish frontend testing foundation with Happy-DOM environment, test utilities, and CI integration for the vanilla JS MVC architecture. This infrastructure will support phases 18-22 (Model, View, and Integration tests). New test coverage areas or feature testing belong in subsequent phases.

</domain>

<decisions>
## Implementation Decisions

### Test Environment Setup
- Happy-DOM version and browser API configuration: Claude's discretion based on Vitest compatibility and stability vs maintenance trade-offs
- Browser API access pattern (globals vs imports): Claude's discretion based on Vitest + Happy-DOM best practices
- Network request mocking approach (global mock, per-file, or MSW): Claude's discretion based on vanilla JS testing patterns
- DOM query strategy (semantic queries vs querySelector): Claude's discretion based on testing best practices and @testing-library/dom usage

### Test Utilities & Factories
- DOM setup helpers (renderView utility vs manual mount): Claude's discretion based on MVC testing needs
- Mock data generation (factory functions vs JSON fixtures vs both): Claude's discretion based on vanilla JS testing patterns
- Model mocking approach (mock entire Model, individual methods, or test with real Model): Claude's discretion based on testing level (unit vs integration)
- User interaction simulation (native DOM events, @testing-library/user-event, or helper wrappers): Claude's discretion based on vanilla JS needs and researched tools

### State Cleanup Patterns
- localStorage cleanup timing (afterEach, beforeEach, or manual): Claude's discretion based on best practices for preventing test pollution
- DOM cleanup strategy (body.innerHTML wipe, container removal, or Happy-DOM auto-reset): Claude's discretion based on Happy-DOM capabilities and safety
- Event listener cleanup (explicit view.unmount, automatic cleanup, or rely on Happy-DOM reset): Claude's discretion based on View lifecycle and memory leak prevention
- Global state handling (reset to defaults, clear all, or test-specific setup): Claude's discretion based on predictability and maintainability

### CI/CD Integration
- CI platform selection (GitHub Actions vs separate service): Claude's discretion based on existing CI infrastructure
- Test execution triggers (PR, push to main, all branches): Claude's discretion based on workflow best practices
- Code coverage reporting (with thresholds, informational only, or skip): Claude's discretion based on testing maturity and goals
- Failure handling (block merges, warning only, or tiered approach): Claude's discretion based on workflow requirements

### Claude's Discretion
All implementation decisions for this phase are delegated to Claude. The user trusts Claude to establish appropriate patterns based on:
- Vitest + Happy-DOM best practices
- Vanilla JS MVC testing needs
- Prevention of state pollution and memory leaks
- CI/CD workflow integration standards
- Balance between safety, maintainability, and developer experience

</decisions>

<specifics>
## Specific Ideas

No specific requirements — user has delegated all technical decisions to Claude for this infrastructure phase.

Claude should establish:
- Clean, maintainable patterns that downstream phases (18-22) will follow
- Robust state cleanup preventing test pollution
- Reusable utilities reducing boilerplate in later test files
- CI integration matching existing backend test workflow

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 17-test-infrastructure-utilities*
*Context gathered: 2026-02-06*
