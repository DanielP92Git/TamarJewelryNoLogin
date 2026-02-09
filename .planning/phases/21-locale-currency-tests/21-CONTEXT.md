# Phase 21: Locale & Currency Tests - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Automated tests validating multi-language (English/Hebrew with RTL), multi-currency (USD/ILS), GeoIP-based detection, and locale persistence. Covers 14 LOCALE requirements. This phase tests existing behavior, not new features.

</domain>

<decisions>
## Implementation Decisions

### RTL testing depth
- Claude's discretion on whether to test attributes only vs attributes + CSS classes
- Document the gap: Happy-DOM doesn't apply CSS, so visual RTL layout (flex-direction, margins) cannot be verified in unit tests. Note this in test file comments, no action needed now
- LOCALE-03 (flex-direction): Claude decides whether to test the trigger (dir attribute) or mark N/A with justification
- RTL flow isolation: Claude decides whether to test locale.js directly or through the View flow, based on avoiding duplication with Phase 19

### GeoIP & backend hydration
- Claude decides whether to test frontend-only (locale.js consuming mocked fetch responses) or include backend endpoint tests, based on what v1.2 already covers
- Claude decides whether to test the 900ms timeout behavior based on risk assessment
- Claude decides whether to test the "respect user preference" behavior (hydration only overrides auto-filled values)
- Fallback chain (/api/locale -> /locale -> browser guess): Claude decides the testing approach based on code structure

### Overlap with Phase 19/20
- Claude determines the right boundary between Phase 21 and Phase 19/20 based on what's already tested
- Claude evaluates whether LOCALE-07/08 (price recalculation) are already covered by Phase 20 cart tests
- Claude evaluates whether LOCALE-13/14 (persistence) need additional bootstrapLocaleSync() tests beyond Phase 19
- General direction: Phase 21 should primarily focus on locale.js as a standalone module + any LOCALE requirements not already covered by Phase 19/20

### Bidirectional text (LOCALE-10)
- Claude investigates the codebase to determine if any special bidi handling exists (bdi elements, dir attributes on SKU spans)
- Claude decides the right test approach based on findings — if no bidi markup exists, determine whether to test basic presence or flag as a gap

### Translation mechanism (LOCALE-09)
- Claude investigates where translations are stored (inline HTML swaps vs JSON files vs JS objects)
- Test approach follows from what's found in the codebase

### Claude's Discretion
- All areas above are delegated to Claude's judgment — user trusts Claude to make sensible testing decisions
- Key constraint: avoid duplicating Phase 19/20 tests while ensuring all 14 LOCALE requirements are covered or justified as N/A
- Focus on locale.js module as the primary test target for new coverage

</decisions>

<specifics>
## Specific Ideas

- Happy-DOM CSS limitation is documented and accepted — not a blocker, just a noted gap
- Phase 19 tested View-level language/currency switching; Phase 21 should add value at the locale.js module level
- locale.js has clear, well-structured functions (bootstrapLocaleSync, hydrateLocaleFromBackend, mapIsoToApp, guessLocaleFromBrowser) that are good unit test targets
- The __localeAuto flag mechanism for tracking auto-filled vs user-chosen prefs is a key behavior to verify

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-locale-currency-tests*
*Context gathered: 2026-02-09*
