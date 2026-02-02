---
phase: 04-schema-foundation-library-setup
plan: 03
subsystem: backend-database
tags: [mongodb, mongoose, indexing, query-optimization]
type: gap-closure
status: complete
requires: [04-01, 04-02]
provides:
  - Compound index declared in Product schema
  - Category queries sorted by displayOrder
  - Query optimization for category product listings
affects: [05-01, 06-01]
tech-stack:
  patterns:
    - ESR compound indexing declaration in schema
    - Sorted queries using compound index for efficiency
decisions:
  - id: GAP-01
    what: Declare compound index in schema in addition to migration
    why: Migration creates index but schema declaration ensures persistence across schema changes and model recompilation
    alternatives: Migration-only (rejected - fragile if schema modified)
  - id: GAP-02
    what: Sort all category queries by displayOrder ascending
    why: Without sorting, queries return products in arbitrary order, defeating the purpose of displayOrder field
    alternatives: Sort client-side (rejected - inefficient, doesn't use index)
key-files:
  modified:
    - backend/models/Product.js: Added compound index declaration {category, displayOrder, available}
    - backend/index.js: Added .sort({displayOrder: 1}) to three category query endpoints
metrics:
  duration: 2 minutes
  tasks: 2/2
  commits: 2
  files_modified: 2
  files_created: 0
completed: 2026-02-02
---

# Phase 04 Plan 03: Gap Closure - Index and Query Sorting Summary

> Close verification gaps by declaring compound index in schema and adding displayOrder sorting to category queries

## One-Liner

Compound index {category, displayOrder, available} declared in Product schema; all category queries now sort by displayOrder for admin-defined product order.

## What Was Built

### 1. Compound Index Schema Declaration

**File:** `backend/models/Product.js` (line 73-78)

Added explicit compound index declaration to Product schema after the SKU index:

```javascript
// Compound index for category-scoped product ordering (ESR: Equality-Sort-Range)
// Declared here in addition to migration to ensure persistence across schema changes
ProductSchema.index(
  { category: 1, displayOrder: 1, available: 1 },
  { name: 'category_displayOrder_available_idx' }
);
```

**Why this matters:**
- Migration script (04-01) creates this index in MongoDB
- Schema declaration makes Mongoose "aware" of the index
- Ensures index persists if schema is modified and re-applied
- Future developers see index in schema definition
- Named index for reference and debugging

**Index strategy:**
- Follows MongoDB ESR (Equality-Sort-Range) guideline
- `category: 1` — Equality filter (first in index)
- `displayOrder: 1` — Sort field (second in index)
- `available: 1` — Range filter (last in index)
- This order maximizes query efficiency for category-filtered, displayOrder-sorted queries

### 2. DisplayOrder Sorting in Category Queries

**File:** `backend/index.js` (lines 2641, 2669, 2696)

Added `.sort({ displayOrder: 1 })` to three category-filtered product endpoints:

**Endpoint 1: `/api/products/category` (line 2641)**
- Paginated category product listing
- Storefront main category view
- Added: `.sort({ displayOrder: 1 })` before `.lean()`

**Endpoint 2: `/chunkProducts` (line 2669)**
- Paginated category product chunks
- Infinite scroll / load-more functionality
- Added: `.sort({ displayOrder: 1 })` before `.lean()`

**Endpoint 3: `/getAllProductsByCategory` (line 2696)**
- Non-paginated category listing (all products)
- Used for category overview pages
- Added: `.sort({ displayOrder: 1 })` before `.lean()`

**Query pattern:**
```javascript
const products = await Product.find({
  category: category,
  quantity: { $gt: 0 },
  available: { $ne: false },
})
  .sort({ displayOrder: 1 })  // NEW: Sort by admin-defined order
  .lean()
  .skip(skip)
  .limit(limit);
```

**Impact:**
- **Before:** Products returned in arbitrary order (natural order, essentially by `_id`)
- **After:** Products returned in admin-defined displayOrder (ascending)
- **Performance:** Compound index {category, displayOrder, available} makes sorted queries efficient
- **User experience:** Storefront shows products in order set by admin via drag-and-drop (Phase 6)

## Technical Decisions

### Decision: Schema Declaration + Migration (Both)

**What:** Declare compound index in both migration script AND Product schema
**Why:**
- Migration creates index in MongoDB (one-time operation on existing data)
- Schema declaration ensures Mongoose knows about index (survives schema changes)
- Double declaration is intentional redundancy for robustness

**Alternative considered:** Migration-only approach
**Rejected because:** If schema is modified and Mongoose recreates collections/indexes, it may drop indexes it doesn't know about from the schema definition.

**Best practice:** Always declare indexes in schema if they're permanent parts of the data model.

### Decision: Sort in Database vs Client

**What:** Add `.sort({ displayOrder: 1 })` to MongoDB queries instead of sorting in JavaScript
**Why:**
- MongoDB can use the compound index to return pre-sorted results (efficient)
- Client-side sorting would require loading all results, then sorting (inefficient)
- Database sorting scales better as product count grows
- Compound index makes this operation O(log N) instead of O(N log N)

**Alternative considered:** Fetch all, sort with `Array.prototype.sort()`
**Rejected because:** Doesn't leverage index; inefficient for large datasets; defeats purpose of compound index.

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Commit | Type | Description | Files |
|--------|------|-------------|-------|
| e9c154c | feat | Add compound index declaration to Product schema | models/Product.js |
| 12487ca | feat | Add displayOrder sorting to category product queries | index.js |

## Testing Notes

### Verified

- ✅ Product schema declares compound index {category: 1, displayOrder: 1, available: 1}
- ✅ Index declaration includes explicit name: `category_displayOrder_available_idx`
- ✅ All three category endpoints have `.sort({ displayOrder: 1 })`
- ✅ Backend passes syntax check (`node --check index.js`)
- ✅ Query pattern follows: `.find({category}).sort({displayOrder}).lean()`
- ✅ Grep confirms exactly 3 occurrences of displayOrder sorting in index.js

### Not Yet Tested (requires database connection and migration execution)

- Migration execution to create the index in MongoDB
- Actual query performance with compound index
- Verify index usage with `explain()` output
- Storefront product order matches admin-defined displayOrder
- Behavior with products that have same displayOrder value (stable sort?)

## Gap Closure Summary

This plan closes **Critical Gaps 1 and 2** identified in `04-VERIFICATION.md`:

### Gap 1: Compound Index Not Declared in Schema ✅ CLOSED

**Original issue:** Migration creates index but schema doesn't declare it
**Fix applied:** Added `ProductSchema.index()` declaration at line 73-78 of Product.js
**Verification:** Schema now has explicit compound index with name

### Gap 2: Queries Don't Sort by displayOrder ✅ CLOSED

**Original issue:** Three category endpoints missing `.sort({ displayOrder: 1 })`
**Affected endpoints:**
- `/api/products/category` (line 2636) → Fixed at line 2641
- `/chunkProducts` (line 2663) → Fixed at line 2669
- `/getAllProductsByCategory` (line 2689) → Fixed at line 2696

**Fix applied:** Added `.sort({ displayOrder: 1 })` to all three queries
**Verification:** Grep confirms 3 occurrences of displayOrder sorting

### Gap 3: Migration Not Executed (NOT CLOSED - Intentional)

**Status:** Still pending - this is a deployment/operations task
**Reason:** Migration requires live database connection and is run manually by user
**Impact:** Existing products still lack displayOrder values until migration runs
**Recommendation:** User must run `npm run migrate:up` in backend directory when ready

**This gap is intentional** - infrastructure is complete, execution is a one-time operational task.

## Next Phase Readiness

### Phase 5 (API Endpoints) Ready

✅ Compound index declared in schema
✅ Category queries sort by displayOrder
✅ Query pattern established for frontend to follow
⚠️ **Migration still not executed** - existing products lack displayOrder values

### Phase 6 (Admin UI) Ready

✅ Queries will return products in displayOrder-sorted order
✅ Index supports efficient category-scoped queries
✅ Frontend can trust query order matches admin-defined order
✅ Pattern established for any new category-filtered queries

### Known Limitations

- **Migration execution pending:** User must run migration before displayOrder sorting works on existing products
- **New products only:** Pre-save hook (04-01) ensures new products get displayOrder, but existing products need migration
- **No renumbering logic yet:** Deferred to Phase 5 when reordering API is built

### Recommendations

1. **Before Phase 6 development:** Run migration (`npm run migrate:up`) to populate displayOrder on existing products
2. **Verify index creation:** After migration, check MongoDB logs or run `db.products.getIndexes()` to confirm compound index exists
3. **Test query performance:** Use `.explain()` on category queries to verify index usage
4. **Monitor query patterns:** Ensure any future category-filtered queries include `.sort({ displayOrder: 1 })`

## Related Documentation

- **Verification Report:** .planning/phases/04-schema-foundation-library-setup/04-VERIFICATION.md
- **Phase 4 Plan 1:** .planning/phases/04-schema-foundation-library-setup/04-01-SUMMARY.md (Migration infrastructure)
- **Phase 4 Plan 2:** .planning/phases/04-schema-foundation-library-setup/04-02-SUMMARY.md (Library installation)
- **MongoDB ESR Guideline:** https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/

---

**Phase**: 04-schema-foundation-library-setup
**Completed**: 2026-02-02
**Duration**: 2 minutes
**Status**: ✅ Complete - gaps closed, index declared, queries sorted
