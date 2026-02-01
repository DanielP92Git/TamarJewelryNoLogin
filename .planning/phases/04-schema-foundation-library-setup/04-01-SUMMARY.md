---
phase: 04-schema-foundation-library-setup
plan: 01
subsystem: backend-database
tags: [mongodb, mongoose, schema-migration, indexing]
type: foundation
status: complete
requires: [03-02]
provides:
  - displayOrder field in Product schema
  - Migration infrastructure (migrate-mongo)
  - Gap-based product ordering within categories
affects: [04-02, 05-01, 06-01]
tech-stack:
  added:
    - migrate-mongo: ^14.0.7 (dev) - MongoDB schema migrations with rollback
  patterns:
    - Gap-based sequential ordering (10, 20, 30) for efficient reordering
    - ESR compound indexing (Equality-Sort-Range) for query optimization
    - Pre-save hooks for automatic field assignment
decisions:
  - id: FOUND-01
    what: Use gap-based displayOrder numbering (increments of 10)
    why: Allows insertions between items without renumbering entire list
    alternatives: Sequential (1,2,3) requires O(N) updates; fractional adds complexity
  - id: FOUND-02
    what: Initial order based on creation date (newest first)
    why: Matches user expectation that recently added products appear first
    alternatives: Alphabetical or reverse chronological
  - id: FOUND-03
    what: Per-category ordering with compound index {category, displayOrder, available}
    why: Each category has independent order; index follows ESR guideline for optimal query performance
    alternatives: Global ordering would prevent category-scoped reordering
key-files:
  created:
    - backend/migrate-mongo-config.js: Migration tool configuration with MONGODB_URI
    - backend/migrations/20260201194100-add-product-display-order.js: Migration script with up/down
  modified:
    - backend/package.json: Added migrate-mongo dev dependency and npm scripts
    - backend/models/Product.js: Added displayOrder field and pre-save hook
metrics:
  duration: 3 minutes
  tasks: 3/3
  commits: 3
  files_modified: 4
  files_created: 2
completed: 2026-02-01
---

# Phase 04 Plan 01: Schema Foundation - displayOrder Migration Summary

> Database migration infrastructure and displayOrder field for category-scoped product ordering

## One-Liner

Gap-based displayOrder field (10, 20, 30) with migrate-mongo tooling, compound index {category, displayOrder, available}, and pre-save hook for new products.

## What Was Built

### 1. Migration Infrastructure
- Installed **migrate-mongo** as dev dependency for version-controlled schema migrations
- Created `migrate-mongo-config.js` using `MONGODB_URI` environment variable (no hardcoded credentials)
- Added npm scripts: `migrate:up`, `migrate:down`, `migrate:status`
- Created `migrations/` directory for migration scripts

### 2. displayOrder Migration Script
- **Up migration**: Assigns gap-based displayOrder (10, 20, 30...) to all existing products
- **Sorting**: Products ordered by creation date descending (newest first) per category
- **Validation**: Pre-flight check ensures all products have category field (fails fast if orphaned products exist)
- **Batch processing**: Uses `bulkWrite()` for efficient updates
- **Indexing**: Creates compound index `{category: 1, displayOrder: 1, available: 1}` following ESR guideline
- **Down migration**: Rollback removes displayOrder field and drops index

### 3. Product Schema Update
- Added `displayOrder` field to ProductSchema:
  - Type: Number
  - Default: null (backwards compatible with existing products)
  - Min: 1 (validation)
  - Indexed for efficient sorting
- Added pre-save hook to auto-assign displayOrder for new products:
  - Queries highest displayOrder in same category
  - Assigns `maxDisplayOrder + 10` (maintains gap-based pattern)
  - Defaults to 10 if first product in category
  - Error handling prevents save failures

## Technical Decisions

### Decision: Gap-Based Numbering (10, 20, 30)
**What**: displayOrder values increment by 10 instead of 1
**Why**: Allows inserting items between positions without renumbering entire list (e.g., insert at 25 between 20 and 30)
**Impact**: O(1) updates on reorder vs O(N) with sequential numbering; ~9 insertions before gap exhaustion triggers renumbering
**Alternative considered**: Strict sequential (1, 2, 3) - rejected due to renumbering overhead

### Decision: Compound Index Field Order
**What**: Index fields ordered as `{category: 1, displayOrder: 1, available: 1}`
**Why**: Follows MongoDB ESR guideline (Equality → Sort → Range) for optimal query performance
**Impact**: Category-filtered queries use index efficiently; wrong order would cause full collection scans
**Pattern**: All product list queries filter by category first, then sort by displayOrder

### Decision: Pre-Save Hook for New Products
**What**: Automatically assign displayOrder when creating new products
**Why**: Ensures all new products get valid displayOrder without manual assignment
**Impact**: New products append to bottom of category (highest displayOrder + 10); maintains gap-based pattern
**Alternative considered**: Client-side assignment - rejected as error-prone

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Commit | Type | Description | Files |
|--------|------|-------------|-------|
| d25e8a7 | chore | Install migrate-mongo and create configuration | package.json, migrate-mongo-config.js |
| 48ceb61 | feat | Add displayOrder migration script with rollback | migrations/20260201194100-add-product-display-order.js |
| 6bb9f9d | feat | Add displayOrder field to Product schema | models/Product.js |

## Testing Notes

### Verified
- Backend server starts without Mongoose schema errors
- migrate-mongo detects migration file (connection error expected without database)
- Product.js schema includes displayOrder field with pre-save hook
- Migration has both up() and down() methods for rollback

### Not Yet Tested (requires database connection)
- Migration execution on real product data
- Gap collision handling (what happens after 9 insertions)
- Pre-save hook behavior when creating new products
- Index performance on category-scoped queries

## Next Phase Readiness

### Phase 5 (API Endpoints) Ready
✅ displayOrder field exists in schema
✅ Pre-save hook handles new product creation
✅ Compound index ready for efficient queries
⚠️ **Migration not yet run** - user must execute against production database

### Known Gaps
- Migration prepared but not executed (intentional - requires production database access)
- No dry-run mode (recommendation: test on staging database first)
- Renumbering logic not implemented (deferred to Phase 5 when reordering API is built)

### Recommendations
1. **Before running migration**: Back up production database
2. **Migration test**: Run on staging environment with production data copy first
3. **Downtime**: Expect <30 seconds for ~500 products (validation + 4 categories + indexing)
4. **Verification**: After migration, run `db.products.find({displayOrder: {$exists: false}}).count()` - should be 0

## Related Documentation

- **Research**: .planning/phases/04-schema-foundation-library-setup/04-RESEARCH.md (ESR indexing, gap-based ordering patterns)
- **Context**: .planning/phases/04-schema-foundation-library-setup/04-CONTEXT.md (user decisions on ordering strategy)
- **Migration tool**: [migrate-mongo docs](https://www.npmjs.com/package/migrate-mongo)
- **MongoDB ESR guideline**: [Official docs](https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/)

---

**Phase**: 04-schema-foundation-library-setup
**Completed**: 2026-02-01
**Duration**: 3 minutes
**Status**: ✅ Complete - migration infrastructure ready, schema updated
