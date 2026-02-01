# Phase 4: Schema Foundation & Library Setup - Research

**Researched:** 2026-02-01
**Domain:** MongoDB schema migrations, compound indexing, drag-and-drop libraries
**Confidence:** HIGH

## Summary

This research investigated four primary domains for establishing product ordering infrastructure: (1) Mongoose schema migrations for adding displayOrder field to existing products, (2) MongoDB compound index optimization for category-scoped queries, (3) SortableJS library for drag-and-drop functionality, and (4) database ordering strategies (sequential vs gap-based numbering).

The standard approach uses **migrate-mongo** for reversible schema migrations with up/down methods, **compound indexes following ESR rule** (Equality-Sort-Range) for query performance, **SortableJS 1.15+** as the industry-standard drag-and-drop library, and **sequential integer ordering with gaps** (e.g., 10, 20, 30) for efficient reordering.

**Primary recommendation:** Use gap-based sequential integers (increments of 10) for displayOrder field, create compound index `{category: 1, displayOrder: 1}` following ESR guideline, and install SortableJS via npm for drag-and-drop in later phases.

## Standard Stack

The established libraries/tools for schema migrations and drag-and-drop:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| migrate-mongo | Latest | MongoDB schema migrations with rollback | Industry standard for Node.js/MongoDB migrations, version-controlled, reversible |
| SortableJS | 1.15+ | Drag-and-drop lists | 27k+ GitHub stars, framework-agnostic, touch support, no dependencies |
| Mongoose | 8.6.1 (current) | MongoDB ODM | Already in project, handles schema definition and validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node-cron | 3.0.3 (installed) | Scheduled tasks | If migration needs to run during maintenance window |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| migrate-mongo | migrate-mongoose | migrate-mongoose is ES6+ focused but less mature, migrate-mongo is more widely adopted |
| Sequential gaps | Fractional indexing | Fractional indexing handles unlimited insertions but adds complexity; gaps sufficient for admin-only reordering |
| SortableJS | dnd-kit (React) | dnd-kit is React-specific; SortableJS works with vanilla JS (matches project's MVC architecture) |

**Installation:**
```bash
# Backend migration tool
npm install --save-dev migrate-mongo

# Frontend drag-and-drop library (later phases)
cd frontend
npm install sortablejs --save
```

## Architecture Patterns

### Recommended Migration Structure
```
backend/
├── migrations/              # Created by migrate-mongo init
│   ├── YYYYMMDDHHMMSS-add-display-order.js
│   └── YYYYMMDDHHMMSS-rollback-display-order.js
└── migrate-mongo-config.js  # Configuration with DB connection
```

### Pattern 1: Gap-Based Sequential Ordering
**What:** Assign displayOrder in increments of 10 (10, 20, 30...) instead of 1, 2, 3
**When to use:** Admin-only drag-and-drop with infrequent reordering
**Example:**
```javascript
// Initial migration assigns gaps
const products = await db.collection('products')
  .find({ category: 'bracelets' })
  .sort({ date: -1 })  // Newest first per user decision
  .toArray();

for (let i = 0; i < products.length; i++) {
  await db.collection('products').updateOne(
    { _id: products[i]._id },
    { $set: { displayOrder: (i + 1) * 10 } }  // 10, 20, 30...
  );
}
```

**Why gaps:** When moving item between positions 20 and 30, assign 25 instead of renumbering entire list. Allows ~9 insertions before collision, sufficient for admin use.

### Pattern 2: Migration with Rollback
**What:** Up/down methods for reversible schema changes
**When to use:** All production schema changes
**Example:**
```javascript
// Source: migrate-mongo standard pattern
module.exports = {
  async up(db, client) {
    // Add field with default values
    await db.collection('products').updateMany(
      {},
      { $set: { displayOrder: 999 } }  // Temporary default
    );
  },

  async down(db, client) {
    // Remove field completely
    await db.collection('products').updateMany(
      {},
      { $unset: { displayOrder: '' } }
    );
  }
};
```

### Pattern 3: Compound Index with ESR Rule
**What:** Index field order: Equality → Sort → Range
**When to use:** Queries filtering by category and sorting by displayOrder
**Example:**
```javascript
// Source: MongoDB ESR guideline
// Query pattern: db.products.find({ category: 'bracelets' }).sort({ displayOrder: 1 })

// Optimal index follows ESR:
ProductSchema.index(
  { category: 1, displayOrder: 1, available: 1 },
  { name: 'category_display_order_available' }
);

// category = Equality (exact match)
// displayOrder = Sort (ordering results)
// available = Range/Filter (optional filter)
```

### Pattern 4: Per-Category Order Scoping
**What:** displayOrder is unique within category, not globally
**When to use:** Independent ordering per category
**Example:**
```javascript
// Bracelets: displayOrder 10, 20, 30
// Necklaces: displayOrder 10, 20, 30  // Same numbers, different category
// Query always includes category filter
db.products.find({ category: 'bracelets' }).sort({ displayOrder: 1 });
```

### Anti-Patterns to Avoid
- **Strict sequential (1, 2, 3):** Requires renumbering entire list on every reorder (N updates instead of 1)
- **Global displayOrder:** Mixing categories prevents independent ordering, violates per-category scoping decision
- **Floating-point fractional indexing:** Adds complexity (precision limits, string encoding) unnecessary for admin-only use case
- **Index without category prefix:** Violates ESR rule, forces full collection scans when filtering by category

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema migrations | Custom scripts with manual rollback | migrate-mongo | Tracks applied migrations, handles version control, built-in up/down pattern, prevents re-running |
| Drag-and-drop UI | Custom mouse/touch event handlers | SortableJS | Touch device support, RTL awareness, accessibility, ghost element animation, 10+ years mature |
| Index optimization | Trial-and-error indexing | MongoDB ESR guideline | Field order matters critically; wrong order = full collection scan even with index |
| Batch processing | Loading all docs in memory | Cursor iteration with limit/skip | Large collections cause memory overflow; cursor streams prevent OOM |

**Key insight:** Schema migrations require atomic operations, rollback capability, and migration tracking—building this correctly is harder than it appears. SortableJS handles cross-browser quirks, touch events, and RTL that take months to debug manually.

## Common Pitfalls

### Pitfall 1: Forgetting Index Prefix Rule
**What goes wrong:** Creating index `{category: 1, displayOrder: 1}` but querying only `displayOrder` causes full collection scan
**Why it happens:** Compound indexes only work for queries matching **leftmost prefix** (can use `category` alone, not `displayOrder` alone)
**How to avoid:** Always include category filter in queries: `db.products.find({ category: 'bracelets' }).sort({ displayOrder: 1 })`
**Warning signs:** Query explain() shows `COLLSCAN` instead of `IXSCAN`

**Source:** [MongoDB Compound Indexes Documentation](https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/)

### Pitfall 2: Default Values Don't Auto-Populate
**What goes wrong:** Adding `displayOrder: { type: Number, default: 0 }` to schema doesn't update existing documents
**Why it happens:** Mongoose defaults only apply to **new documents**, not existing ones via schema definition
**How to avoid:** Use explicit migration script with `updateMany()` to populate existing documents
**Warning signs:** Old products have `undefined` displayOrder, new products have `0`

**Source:** [Mongoose Defaults Documentation](https://mongoosejs.com/docs/defaults.html), [GitHub Issue #12905](https://github.com/Automattic/mongoose/issues/12905)

### Pitfall 3: Migration Without Rollback
**What goes wrong:** Migration fails halfway, database left in inconsistent state with no way to recover
**Why it happens:** Only writing `up()` method, not testing rollback scenario
**How to avoid:** Always implement `down()` method, test rollback on staging data before production
**Warning signs:** Migration tool shows no rollback available, manual database cleanup required

**Source:** [migrate-mongo documentation](https://www.npmjs.com/package/migrate-mongo)

### Pitfall 4: Wrong ESR Field Order
**What goes wrong:** Index `{displayOrder: 1, category: 1}` performs poorly for category-filtered queries
**Why it happens:** Putting sort field before equality field violates ESR guideline
**How to avoid:** Follow ESR rule: Equality (category) → Sort (displayOrder) → Range (available)
**Warning signs:** Query takes seconds instead of milliseconds, explain() shows high `docsExamined` count

**Source:** [MongoDB ESR Guideline](https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/)

### Pitfall 5: Batch Processing Without Limits
**What goes wrong:** Loading 10,000 products into memory with `.toArray()` causes Node.js heap overflow
**Why it happens:** Assuming collection size is small, not planning for scale
**How to avoid:** Process in batches of 100-500 documents using cursor iteration or `limit()`/`skip()`
**Warning signs:** Migration crashes with `JavaScript heap out of memory` error

**Source:** [MongoDB Migration Best Practices](https://softwareontheroad.com/database-migration-node-mongo)

### Pitfall 6: Unique Constraint on displayOrder
**What goes wrong:** Adding unique index on displayOrder prevents multiple categories from using same numbers
**Why it happens:** Misunderstanding per-category scoping (each category should have independent order)
**How to avoid:** Use compound unique index `{category: 1, displayOrder: 1}` if uniqueness needed, or no unique constraint (gaps prevent collisions)
**Warning signs:** Cannot create two products with displayOrder 10 in different categories

### Pitfall 7: Ignoring Category-less Products
**What goes wrong:** Migration assigns displayOrder to products without category field, orphaning them
**Why it happens:** Assuming all products have category (user decision: require category before migration)
**How to avoid:** Pre-migration validation: `db.products.countDocuments({ category: { $exists: false } })` must be 0
**Warning signs:** Products appear in no category, sorting breaks when category is null

## Code Examples

Verified patterns from official sources:

### Migration File Structure (migrate-mongo)
```javascript
// Source: https://dev.to/rutvikmakvana4/step-by-step-guide-to-mongodb-migrations-using-migrate-mongo-1n7e

module.exports = {
  async up(db, client) {
    // 1. Validate all products have category
    const orphaned = await db.collection('products').countDocuments({
      category: { $exists: false }
    });
    if (orphaned > 0) {
      throw new Error(`Found ${orphaned} products without category. Fix before migration.`);
    }

    // 2. Process each category independently
    const categories = ['bracelets', 'necklaces', 'earrings', 'rings'];

    for (const category of categories) {
      const products = await db.collection('products')
        .find({ category })
        .sort({ date: -1 })  // Newest first per user decision
        .toArray();

      // 3. Assign gap-based ordering
      for (let i = 0; i < products.length; i++) {
        await db.collection('products').updateOne(
          { _id: products[i]._id },
          { $set: { displayOrder: (i + 1) * 10 } }
        );
      }
    }

    // 4. Create compound index
    await db.collection('products').createIndex(
      { category: 1, displayOrder: 1, available: 1 },
      { name: 'category_display_order_available' }
    );

    console.log('Migration complete: displayOrder field added with gap-based numbering');
  },

  async down(db, client) {
    // 1. Remove index
    await db.collection('products').dropIndex('category_display_order_available');

    // 2. Remove field from all documents
    await db.collection('products').updateMany(
      {},
      { $unset: { displayOrder: '' } }
    );

    console.log('Rollback complete: displayOrder field and index removed');
  }
};
```

### Mongoose Schema Update
```javascript
// Source: Current Product.js schema pattern (sparse index for SKU)

const ProductSchema = new mongoose.Schema({
  // ... existing fields
  displayOrder: {
    type: Number,
    required: true,
    default: 999,  // New products append to end
    min: [1, 'displayOrder must be positive'],
    validate: {
      validator: Number.isInteger,
      message: 'displayOrder must be an integer'
    }
  }
});

// Compound index for efficient category-scoped queries
ProductSchema.index(
  { category: 1, displayOrder: 1, available: 1 },
  { name: 'category_display_order_available' }
);
```

### Query Pattern (Admin Product List)
```javascript
// Source: MongoDB ESR guideline examples

// Fetch products for category in display order
async function getProductsByCategory(category) {
  return await Product.find({
    category,           // Equality - uses index prefix
    available: true     // Range - optional filter
  })
  .sort({ displayOrder: 1 })  // Sort - uses index, no in-memory sort
  .select('id name mainImage ils_price usd_price displayOrder')
  .lean();  // Plain objects, no Mongoose overhead
}

// Verify index usage with explain()
const explain = await Product.find({ category: 'bracelets' })
  .sort({ displayOrder: 1 })
  .explain('executionStats');

// Check: explain.executionStats.executionStages.inputStage.indexName
// Should be: "category_display_order_available"
```

### SortableJS Basic Setup (Frontend - Phase 6)
```javascript
// Source: https://github.com/SortableJS/Sortable

import Sortable from 'sortablejs';

// Initialize drag-and-drop on product list
const productList = document.getElementById('product-list');
const sortable = Sortable.create(productList, {
  animation: 150,
  ghostClass: 'sortable-ghost',  // CSS class for placeholder
  handle: '.drag-handle',         // Only drag from handle icon
  onEnd: async (evt) => {
    // evt.oldIndex, evt.newIndex available
    await updateProductOrder(evt.item.dataset.productId, evt.newIndex);
  }
});
```

### Reordering Logic (Backend - Phase 5)
```javascript
// Source: Gap-based ordering pattern

async function reorderProduct(productId, newPosition) {
  const product = await Product.findById(productId);
  const category = product.category;

  // Get products in category ordered by displayOrder
  const products = await Product.find({ category })
    .sort({ displayOrder: 1 })
    .select('_id displayOrder');

  // Find surrounding displayOrder values
  const prevOrder = products[newPosition - 1]?.displayOrder || 0;
  const nextOrder = products[newPosition]?.displayOrder || (prevOrder + 20);

  // Calculate new order (midpoint)
  let newOrder = Math.floor((prevOrder + nextOrder) / 2);

  // If collision (gap exhausted), renumber category
  if (newOrder === prevOrder || newOrder === nextOrder) {
    await renumberCategory(category);
    newOrder = (newPosition + 1) * 10;
  }

  await Product.updateOne(
    { _id: productId },
    { $set: { displayOrder: newOrder } }
  );
}

async function renumberCategory(category) {
  const products = await Product.find({ category })
    .sort({ displayOrder: 1 });

  for (let i = 0; i < products.length; i++) {
    await Product.updateOne(
      { _id: products[i]._id },
      { $set: { displayOrder: (i + 1) * 10 } }
    );
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual migration scripts | migrate-mongo tool | ~2018-2020 | Version control, rollback support, changelog tracking |
| Strict sequential (1,2,3) | Gap-based or fractional | ~2020+ | O(1) updates instead of O(N) on reorder |
| Single-field indexes | Compound indexes with ESR | MongoDB 3.0+ | Query performance: seconds → milliseconds |
| jQuery UI Sortable | SortableJS | ~2015-2018 | Framework-agnostic, touch support, smaller bundle |
| In-memory array sorting | Database-level displayOrder | ~2019+ | Consistent order across sessions, persistent state |

**Deprecated/outdated:**
- **jQuery UI Sortable**: Requires jQuery dependency, no touch support, unmaintained
- **Manual migration tracking**: Error-prone, no rollback, risk of re-running migrations
- **Floating-point order without precision handling**: JavaScript precision limits cause bugs after ~50 insertions
- **Index field order by intuition**: Must follow ESR guideline; wrong order = unused index

## Open Questions

Things that couldn't be fully resolved:

1. **Exact gap size (10 vs 100 vs 1000)**
   - What we know: Larger gaps allow more insertions before renumbering, but waste numeric space
   - What's unclear: Optimal gap size for 20-200 products per category with infrequent reordering
   - Recommendation: Use 10 (allows 9 insertions, sufficient for admin use); renumber category if gaps exhausted

2. **Dry-run mode implementation**
   - What we know: Best practice for migrations is to test on staging data first
   - What's unclear: Whether to build explicit dry-run flag into migration script
   - Recommendation: Use separate staging database with production data copy; run migration there first before production

3. **Z-index CSS variable scale**
   - What we know: Bootstrap uses 1000+ scale with 10-20 point increments between layers
   - What's unclear: Whether to adopt Bootstrap values or create custom scale
   - Recommendation: Defer to Phase 6 (drag-and-drop UI); use Bootstrap scale (modal-backdrop: 1050, modal: 1055, sortable-ghost: 1100) for consistency with common patterns

4. **Migration downtime duration**
   - What we know: Migration needs database lock to prevent concurrent product changes
   - What's unclear: Expected duration for ~100-500 products across 4 categories
   - Recommendation: Test on staging; estimate <30 seconds for 500 products (validation + 4 category iterations + index creation)

5. **Handling products added during migration**
   - What we know: Lock prevents writes during migration
   - What's unclear: Whether to implement queue or reject writes
   - Recommendation: Brief maintenance mode (<1 minute); reject admin product changes during migration with user-friendly error

## Sources

### Primary (HIGH confidence)
- [MongoDB ESR Guideline (Official Docs)](https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/) - Compound index field ordering
- [MongoDB Compound Indexes (Official Docs)](https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/) - Index prefix rule, query optimization
- [migrate-mongo npm package](https://www.npmjs.com/package/migrate-mongo) - Migration tool standard
- [Step-by-Step Guide to migrate-mongo](https://dev.to/rutvikmakvana4/step-by-step-guide-to-mongodb-migrations-using-migrate-mongo-1n7e) - Migration patterns
- [SortableJS GitHub](https://github.com/SortableJS/Sortable) - Library features, installation
- [SortableJS Official Site](https://sortablejs.github.io/Sortable/) - Usage examples
- [Mongoose Defaults Documentation](https://mongoosejs.com/docs/defaults.html) - Default value behavior
- [MongoDB updateMany Documentation](https://www.mongodb.com/docs/manual/reference/method/db.collection.updatemany/) - Batch update syntax

### Secondary (MEDIUM confidence)
- [Avoiding Common MongoDB Indexing Pitfalls](https://medium.com/@farihatulmaria/avoiding-common-pitfalls-in-mongodb-indexing-an-advanced-guide-e27a4c1a77c7) - Pitfall patterns verified against official docs
- [Bootstrap Z-Index Scale](https://getbootstrap.com/docs/5.3/layout/z-index/) - Industry-standard z-index values
- [Implementing Re-Ordering at Database Level](https://www.basedash.com/blog/implementing-re-ordering-at-the-database-level-our-experience) - Real-world implementation patterns
- [MongoDB Sparse Indexes](https://www.mongodb.com/docs/manual/core/index-sparse/) - Sparse index behavior (relevant for SKU pattern)

### Tertiary (LOW confidence - informing context only)
- [Fractional Indexing - Steve Ruiz](https://www.steveruiz.me/posts/reordering-fractional-indices) - Alternative approach (not recommended for this phase, but informative)
- [Fractional Indexing (Figma Blog)](https://www.figma.com/blog/realtime-editing-of-ordered-sequences/) - Advanced technique for collaborative editing (overkill for admin-only)
- Web search results for "drag drop list reorder database strategy" - General patterns confirmed with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - migrate-mongo and SortableJS are industry standards with official documentation
- Architecture (gap-based ordering): HIGH - Pattern verified across multiple sources, aligns with user's admin-only use case
- Architecture (ESR indexing): HIGH - Official MongoDB documentation with concrete examples
- Pitfalls: HIGH - Verified against official docs and GitHub issues
- Code examples: HIGH - Based on official documentation patterns adapted to project schema

**Research date:** 2026-02-01
**Valid until:** 2026-03-15 (~45 days) - Schema migration patterns are stable; SortableJS version may update but API is mature
