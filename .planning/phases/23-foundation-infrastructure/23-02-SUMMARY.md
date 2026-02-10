---
phase: 23-foundation-infrastructure
plan: 02
subsystem: database
tags: [slug, mongodb, mongoose, migration, url-structure, seo]

# Dependency graph
requires:
  - phase: 22-mvc-integration-tests
    provides: 419 passing tests providing safety net for schema changes
provides:
  - Product schema with slug field and sparse unique index
  - Idempotent migration script for generating slugs on existing products
  - Automatic slug generation for new products via pre-save hook
  - Counter-based collision handling for readable URLs
affects: [25-dynamic-ssr-structured-data-sitemap]

# Tech tracking
tech-stack:
  added: [slugify]
  patterns: [sparse-unique-index, idempotent-migrations, counter-based-collision-handling, immutable-slugs]

key-files:
  created:
    - backend/migrations/20260210000000-add-product-slugs.js
  modified:
    - backend/models/Product.js
    - backend/package.json

key-decisions:
  - "Use English product names as slug source for global SEO reach"
  - "Counter-based collision handling (necklace, necklace-2) over random strings for readable URLs"
  - "Slugs are immutable after creation to preserve SEO authority and backlinks"
  - "Sparse unique index allows existing products without slugs while preventing duplicates"

patterns-established:
  - "Idempotent migrations: Check for existing data before creating, early return if already migrated"
  - "Counter-based slug collision handling tracked in memory Set during migration"
  - "Pre-save hooks only run on isNew to ensure immutability"

# Metrics
duration: 5 min
completed: 2026-02-10
---

# Phase 23 Plan 02: Product Slug Infrastructure Summary

**Product schema extended with slug field, migration script generates URL-friendly slugs from English names with counter-based collision handling**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-10T11:48:12Z
- **Completed:** 2026-02-10T11:53:52Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Product schema now has slug field with lowercase, trim, sparse unique index, and regex validation
- Pre-save hook automatically generates slugs for new products with counter-based collision handling
- Idempotent migration script generates slugs for all existing products from English names
- Slugs are immutable after creation, preserving SEO authority and external backlinks
- Migration can be safely re-run (skips already-slugged products)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add slug field to Product schema** - `8a756b4` (feat)
2. **Task 2: Create idempotent slug migration script** - `695aa34` (feat)

## Files Created/Modified

- `backend/models/Product.js` - Added slug field with validation, sparse unique index, and pre-save hook for auto-generation
- `backend/package.json` - Added slugify dependency
- `backend/migrations/20260210000000-add-product-slugs.js` - Idempotent migration script with counter-based collision handling

## Decisions Made

**Slug source language (English vs. Hebrew):** Used English product names as slug source for global SEO reach. Rationale: (a) English is the international language for jewelry e-commerce, (b) simpler migration without per-language duplicate handling, (c) consistent URLs across language switches.

**Collision handling (counter vs. random):** Used counter-based approach (necklace, necklace-2, necklace-3) instead of random strings (necklace-Nyiy4wW9l). Rationale: Readable URLs improve user experience when sharing links and support manual URL typing.

**Slug immutability:** Slugs are immutable after creation (pre-save hook only runs on `isNew`). Rationale: Preserves bookmarks, backlinks, and SEO authority. Manual admin corrections can be done via MongoDB shell if critical, but auto-regeneration on name change would silently break links.

**Sparse index strategy:** Used sparse unique index (same pattern as SKU field) to allow existing products without slugs while preventing duplicates when present. Enables phased rollout and backwards compatibility.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The existing displayOrder migration pattern from Phase 5 provided a proven template for idempotent slug generation. The slugify library handled all edge cases (special characters, Unicode, whitespace) as expected.

## User Setup Required

None - no external service configuration required. The migration script will be run manually when ready to populate slugs for existing products.

## Next Phase Readiness

Product slug infrastructure is complete and ready for Phase 23-03 (bilingual routing). The slug field and migration script provide the foundation for clean product URLs (e.g., `/en/product/gold-star-necklace`) in Phase 25.

**Key validations:**
- ✓ Slug field exists in Product schema with validation rules
- ✓ Sparse unique index declared: `product_slug_unique_idx`
- ✓ Pre-save hook generates slugs for new products with collision handling
- ✓ Migration exports `up()` and `down()` functions
- ✓ Migration is idempotent (documented and implemented)
- ✓ Counter-based collision handling preserves URL readability

**Next steps:**
- Run migration script when ready: `cd backend && npm run migrate:up`
- Phase 23-03 can proceed with bilingual routing implementation
- Phase 25 will use slugs for product detail page URLs

## Self-Check: PASSED

✓ Created file exists: backend/migrations/20260210000000-add-product-slugs.js
✓ Commit exists: 8a756b4 (Task 1: Add slug field to Product schema)
✓ Commit exists: 695aa34 (Task 2: Create slug migration script)

---
*Phase: 23-foundation-infrastructure*
*Completed: 2026-02-10*
