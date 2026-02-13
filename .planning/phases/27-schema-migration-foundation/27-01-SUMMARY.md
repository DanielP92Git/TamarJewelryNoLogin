---
phase: 27-schema-migration-foundation
plan: 01
subsystem: database
tags: [mongoose, mongodb, schema, migration, bilingual, i18n]

# Dependency graph
requires:
  - phase: 26-seo-foundation
    provides: Product schema baseline with slugs
provides:
  - Bilingual Product schema fields (name_en, name_he, description_en, description_he)
  - Idempotent migration to populate English fields from legacy data
  - Foundation for Phase 32 translation automation
affects: [28-frontend-language-routing, 29-backend-language-api, 30-frontend-display-logic, 31-admin-bilingual-crud, 32-translation-automation]

# Tech tracking
tech-stack:
  added: []
  patterns: [bilingual-schema-separate-fields, idempotent-migrations, dry-run-migrations]

key-files:
  created:
    - backend/migrations/20260213000000-add-bilingual-product-fields.js
  modified:
    - backend/models/Product.js

key-decisions:
  - "Bilingual fields use default: '' (not required) to avoid breaking existing product creation until migration runs"
  - "Legacy name/description fields remain required and unchanged for backward compatibility through v1.5"
  - "Migration follows established codebase pattern: DRY_RUN mode, batching (1000 docs), idempotent checks, full rollback"
  - "English fields populated from legacy fields; Hebrew fields start empty (Phase 32 will fill via translation)"

patterns-established:
  - "Bilingual schema pattern: separate fields per language (name_en, name_he) rather than embedded objects"
  - "Migration idempotency: check if field exists before processing"
  - "Backward compatibility: legacy fields coexist with new fields during transition"

# Metrics
duration: 3 min
completed: 2026-02-13
---

# Phase 27 Plan 01: Bilingual Product Fields Summary

**Added bilingual schema fields (name_en/he, description_en/he) and idempotent migration to populate English content from legacy fields**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-13T22:09:34Z
- **Completed:** 2026-02-13T22:12:49Z
- **Tasks:** 2 completed
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- Product schema extended with 4 bilingual fields alongside unchanged legacy fields
- Migration script ready to populate name_en/description_en from existing data
- Hebrew fields (name_he/description_he) exist but start empty for Phase 32 translation
- Migration supports DRY_RUN preview and is fully idempotent
- Full rollback capability via down() method

## Task Commits

Each task was committed atomically:

1. **Task 1: Add bilingual fields to Product schema** - `87a2932` (feat)
2. **Task 2: Create idempotent bilingual migration script** - `0de969c` (feat)

## Files Created/Modified

- **backend/models/Product.js** - Added name_en, name_he, description_en, description_he fields with `default: ''`, positioned after description field
- **backend/migrations/20260213000000-add-bilingual-product-fields.js** - Idempotent migration with DRY_RUN support, batching (1000 docs), sample previews, and full rollback

## Decisions Made

**Schema field design:**
- Used `default: ''` (not `required: true`) because Hebrew fields start empty and migration populates English fields
- name_en is NOT required in schema to avoid breaking existing product creation before migration runs
- Legacy name (required: true) and description fields unchanged to maintain backward compatibility

**Migration pattern:**
- Followed established codebase pattern from 20260203 (merge-image-arrays) and 20260210 (add-product-slugs)
- Idempotent check: skips products where name_en already exists and is not empty
- DRY_RUN mode shows sample transformations before applying changes
- Batched bulkWrite operations (1000 docs per batch) for memory efficiency
- Full rollback removes all 4 bilingual fields via $unset

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Schema and migration foundation complete. Ready for:
- **Plan 02:** Running the migration against the database (execution + verification)
- **Phase 28:** Frontend language routing and locale detection
- **Phase 29:** Backend API language parameter handling

**Important:** Migration script is created but NOT yet executed. Plan 02 will run the migration in DRY_RUN mode first, then apply to populate the fields in the database.

---
*Phase: 27-schema-migration-foundation*
*Completed: 2026-02-13*

## Self-Check: PASSED

Verified:
- backend/models/Product.js exists
- backend/migrations/20260213000000-add-bilingual-product-fields.js exists
- Commit 87a2932 exists (Task 1: bilingual schema fields)
- Commit 0de969c exists (Task 2: migration script)
