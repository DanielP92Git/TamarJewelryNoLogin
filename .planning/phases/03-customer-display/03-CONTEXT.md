# Phase 3: Customer Display - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Display SKU information on product pages for customers with multi-language support and professional presentation. This phase adds SKU display to the frontend product modal. Backend validation (Phase 1) and admin management (Phase 2) are already complete.

</domain>

<decisions>
## Implementation Decisions

### Visual Presentation
- **Text size:** Small/subtle text - smaller than body text, visible but de-emphasized (like fine print)
- **Styling:** Light background/border to distinguish it visually from surrounding content
- **Spacing:** Tight spacing - minimal margin, keeps it compact and close to surrounding content
- **Label vs value:** Bold label with regular value (e.g., "**SKU:** ABC123")
- **Corners:** Rounded corners on background/border - softer, modern feel
- **Color scheme:** Neutral gray background - professional and unobtrusive
- **Interaction:** Copy-to-clipboard on click - useful for customer support
- **Copy feedback:** "Copied!" tooltip appears briefly near the SKU

### Positioning & Layout
- **Location:** Bottom of description - below product description text, following e-commerce convention
- **Alignment:** Left-aligned in LTR mode, right-aligned in RTL mode - follows text direction and aligns with description
- **Display mode:** SKU gets its own line/block - clear separation from description

### Language Handling
- **Hebrew label:** "מק״ט" (makat) - standard Hebrew abbreviation for stock keeping unit
- **SKU value direction:** Always left-to-right (ABC123 reads A-B-C, never reversed) - codes don't reverse in RTL
- **Format:** "Label: Value" with colon space (e.g., "SKU: ABC123" in English, "מק״ט: ABC123" in Hebrew)

### Conditional Display
- **Missing SKU:** Show placeholder text instead of hiding completely
- **Placeholder text:** "Not available" in English, "לא זמין" in Hebrew
- **Placeholder styling:** Same visual styling as actual SKU - consistent appearance
- **Placeholder interaction:** Copy-to-clipboard disabled for placeholder - only real SKUs are copyable
- **Error state:** Hide SKU completely if product load fails - avoid confusion

### Claude's Discretion
- Mobile positioning optimization (same as desktop is preferred, but adapt if needed)
- Loading state implementation (skeleton loader or hide until loaded)
- Exact tooltip positioning and animation timing
- Specific padding/margin values for "tight spacing"
- Exact shade of neutral gray for background

</decisions>

<specifics>
## Specific Ideas

- Copy-to-clipboard feature is specifically for customer support scenarios - customers can easily share SKU when contacting support
- The "Not available" placeholder ensures visual consistency across products while clearly indicating absence of SKU
- Direction handling for SKU value is critical: alphanumeric codes must always read left-to-right even in RTL mode

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 03-customer-display*
*Context gathered: 2026-02-01*
