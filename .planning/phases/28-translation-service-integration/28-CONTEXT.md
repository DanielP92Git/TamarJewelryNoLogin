# Phase 28: Translation Service Integration - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend translation service that integrates Google Cloud Translation API v3 to translate product content between Hebrew and English on demand. Includes single-product translation endpoint for admin forms and bulk translation for migrating existing products. Admin UI for translation (form layout, side-by-side fields) is Phase 29; frontend display is Phase 30.

</domain>

<decisions>
## Implementation Decisions

### Translation trigger
- Manual "Translate" button next to each field (name, description) — no auto-translate on blur
- Both directions supported: Hebrew-to-English AND English-to-Hebrew — button adapts based on which field has content
- Translation fills the target field directly — admin can edit before saving the product
- No preview/confirmation step for translation result — admin reviews visually in the form

### Failure & fallback
- Inline error next to the translate button when Google API fails: "Translation failed, try again or enter manually"
- Spinner on the translate button while waiting for API response
- Admin can save product with only one language filled — other language shows as "needs translation" in product list
- No automatic translation quality checks — admin reviews and edits translated text visually
- Translation errors never block product saving — manual entry always possible

### Caching
- In-memory cache for Google API responses — keyed on exact input text + direction
- Cache is an admin-workflow optimization only — real persistence is the saved bilingual product fields
- Same input text returns cached result instantly (avoids duplicate API calls during editing sessions)
- Cache resets on server restart — acceptable since translations are saved to product documents

### Bulk translation
- "Translate All Missing" button on the product list page — runs inline with progress
- Translates only untranslated products — existing translations never overwritten
- Auto-detect direction: if Hebrew exists but not English, translate to English, and vice versa
- Confirmation step before starting: "About to translate X products. Continue?"
- Real-time progress: shows current product name + counter ("Translating: Gold Ring (23/94)")
- Continue on failure — skip failed products, translate the rest, show summary at end
- "Retry failed" button after completion for failed products
- Cancellable mid-operation — already-translated products stay saved
- Notification when navigating away: Claude's discretion based on SPA architecture

### Claude's Discretion
- Endpoint design: whether to accept single field or batch multiple fields per request
- Bulk save strategy: save-as-you-go vs batch save (pick based on reliability)
- Notification mechanism when admin navigates away during bulk translation
- Rate limiting implementation: batch sizes, delays between Google API calls
- In-memory cache TTL and eviction strategy
- Translation API client library choice and authentication setup

</decisions>

<specifics>
## Specific Ideas

- Translate button should be per-field (next to name field, next to description field) — admin controls exactly what gets translated
- Bulk translation lives on the product list page, not a separate admin section — keeps workflow focused
- Progress display during bulk should show the actual product name being translated, not just a number

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-translation-service-integration*
*Context gathered: 2026-02-15*
