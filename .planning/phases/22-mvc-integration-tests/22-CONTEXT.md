# Phase 22: MVC Integration Tests - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Validate that the full MVC architecture works as an integrated system. Controller routing maps hash fragments to correct views, model changes propagate to view re-renders, view lifecycle (mount/unmount) executes correctly, and cart/locale state remains consistent across navigation. This phase tests the WIRING between layers already unit-tested in phases 18-21.

</domain>

<decisions>
## Implementation Decisions

### Routing & navigation
- Test ALL hash routes the controller handles (not a subset)
- Test both direct hash changes AND browser back/forward navigation (history stack)
- Unknown/invalid hash routes should redirect to home view
- Assert both view instance creation AND resulting DOM content for each route (both layers)

### Model-View synchronization
- Verify both the re-render mechanism (method called) AND final DOM state for model changes
- Cover model changes from ALL sources: user actions, API responses, and localStorage loads
- When currency switches, verify EVERY visible price element updates (not spot-checks)
- When language switches, verify ALL translatable text updates on the current view

### Lifecycle & cleanup
- Simulate rapid navigation (fast route switching) to catch race conditions and incomplete cleanup
- Verify BOTH specific listener removal AND no duplicate handler accumulation
- Verify BOTH old view DOM removal AND new view DOM presence on navigation
- Test that async operations (pending API calls) are properly cancelled/ignored when navigating away mid-load

### Cross-cutting scenarios
- Full flow test: add items -> navigate to cart -> switch currency -> verify all prices/totals recalculate
- Verify locale preferences (language, currency) persist across view navigation
- Complete user journey test: browse -> add to cart -> view cart -> checkout (single integration test)
- Test BOTH guest (localStorage cart) AND logged-in (API cart) user paths through the full MVC stack

### Claude's Discretion
- Exact test file organization (how many files, grouping strategy)
- Mock strategy for API calls in integration context
- How to simulate rapid navigation timing
- Happy-DOM limitations workarounds for history/navigation APIs

</decisions>

<specifics>
## Specific Ideas

- User wants comprehensive coverage: all routes, all prices, all text — not representative subsets
- Both architectural verification (view instances, method calls) and behavioral verification (DOM outcomes)
- Rapid navigation testing is important — user wants race condition coverage
- Full shopping journey as a single integration test, not broken into partial flows

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-mvc-integration-tests*
*Context gathered: 2026-02-09*
