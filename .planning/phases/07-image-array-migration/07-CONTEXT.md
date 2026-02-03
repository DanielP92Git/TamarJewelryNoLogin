# Phase 7: Image Array Migration - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Unify the fragmented `mainImage` and `galleryImages` fields into a single sortable `images` array. The first image in the array automatically serves as the featured/main product image. This is a data migration and schema refactoring phase that reorganizes how images are stored and accessed in the database, with corresponding updates to backend API and frontend display logic.

</domain>

<decisions>
## Implementation Decisions

### Migration safety & rollback
- **Dry-run required:** Migration script MUST support dry-run mode that previews changes without modifying data — never run migration blind
- **Validation approach:** Claude's discretion (count-based, sample inspection, or automated comparison)
- **Rollback strategy:** Claude's discretion (automatic rollback, manual script, or backup restore)
- **Old field cleanup timing:** Remove `mainImage` and `galleryImages` from schema AFTER frontend is updated to use new array — keep old fields during transition for safety

### Legacy data handling
- **API response format:** Claude's discretion (new format only, both formats, or version-based)
- **Conflict resolution:** If product has both old fields AND new array, **new array wins** — ignore mainImage/galleryImages completely
- **Frontend fallback duration:** Claude's discretion (permanent, temporary, or no fallback)
- **New products during transition:** Claude's discretion (enforce new schema, auto-convert, or support both temporarily)

### Empty/missing image scenarios
- **Products with no images:** Claude's discretion (empty array, null, or default placeholder)
- **Only mainImage exists:** Migrate to **single-image array** `images: [mainImage]`
- **Only galleryImages exists:** **First gallery image becomes main** `images: [galleryImages[0], ...rest]`
- **Corrupted image URLs:** **Skip invalid URLs** — filter out broken URLs, migrate only valid images

### Frontend migration timing
- **Update sequence:** Claude's discretion (before, after, or same deployment as data migration)
- **Feature flags:** Claude's discretion (flag-controlled or auto-detection)
- **Affected files identification:** Claude identifies which frontend files/components need updates during planning
- **Admin forms update:** **Immediate switch** — update admin Add/Edit forms to use images array as soon as data is migrated

### Claude's Discretion
- Exact validation method (count vs sample vs automated comparison)
- Rollback mechanism (automatic, manual script, or backup)
- API response format during transition
- Frontend fallback logic duration
- Feature flag necessity
- Empty image handling (empty array vs null vs placeholder)
- Migration script error handling and logging
- Database transaction scoping

</decisions>

<specifics>
## Specific Ideas

- STATE.md flags image array migration as "high-risk (Pitfall #4 in research)" — conservative approach expected with pre-migration audit and rollback capability
- Phase 4 research already identified this as unified images array with first-image-as-featured convention
- Existing pattern from v1.0: backwards compatibility for schema changes (SKU sparse index), extend to image migration

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-image-array-migration*
*Context gathered: 2026-02-03*
