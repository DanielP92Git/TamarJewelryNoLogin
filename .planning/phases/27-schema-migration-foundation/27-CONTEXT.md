# Phase 27: Schema Migration & Foundation - Context

**Gathered:** 2026-02-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate the Product database schema to support separate Hebrew and English fields for name and description. Existing products migrated with English data populating the English fields. Legacy fields maintained for backward compatibility. Cart handles the transition. Migration script is idempotent.

Translation service, admin UI, frontend display, and bulk translation are all separate phases (28-32).

</domain>

<decisions>
## Implementation Decisions

### Existing product data
- All ~94 products are currently in English (names and descriptions)
- Migration maps existing `name` -> `name_en` and `description` -> `description_en`
- Hebrew fields (`name_he`, `description_he`) start empty for all products
- Claude should verify during research whether any Hebrew text exists in other product fields (alt text, categories, etc.)
- Products in unlisted categories (bracelets, rings, unisex, shalom club) still get bilingual fields in migration -- translation happens later in Phase 32, not skipped permanently
- No special-case handling for any products -- all migrated equally

### Cart transition handling
- Old-format cart data in localStorage is silently cleared after migration
- No user-facing message -- customer simply sees an empty cart
- Cart data volume is unknown (no analytics), but silent clear is accepted regardless

### Backward compatibility scope
- API returns both legacy format AND new bilingual fields during transition (Claude's discretion on exact approach)
- Claude should verify whether any external systems consume product data (research phase task)
- Legacy fields (`name`, `description`) kept through the entire v1.5 milestone (Phases 27-32)
- Legacy field removal deferred to a future cleanup after all v1.5 phases complete
- Migration deploys directly to production (no staging) -- script is idempotent, ~94 products is low-risk

### Claude's Discretion
- Cart storage approach after migration (ID-only vs storing name) -- pick what works best with existing cart architecture
- API response shape during transition (both formats recommended, exact implementation flexible)
- Whether external integrations exist that consume product data (verify during research)

</decisions>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches. The user wants a clean, safe migration that doesn't disrupt existing functionality.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 27-schema-migration-foundation*
*Context gathered: 2026-02-13*
