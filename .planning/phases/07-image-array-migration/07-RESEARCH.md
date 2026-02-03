# Phase 7: Image Array Migration - Research

**Researched:** 2026-02-03
**Domain:** MongoDB schema migrations, data transformation, backwards compatibility
**Confidence:** HIGH

## Summary

MongoDB schema migrations for field consolidation require careful planning to avoid data loss. The established pattern uses **migrate-mongo** (already in project) with structured up/down methods, validation-first approach, and bulkWrite for performance.

The existing codebase already has one migration (Phase 4's displayOrder) demonstrating the pattern: pre-migration validation → category-scoped processing → bulkWrite operations → index management → verification logging.

**Current image schema fragmentation:**
- `mainImage` object with desktop/mobile/public URLs (6 properties)
- `smallImages` array of objects with similar structure (4 properties each)
- Legacy fields: `image`, `smallImagesLocal`, `imageLocal`, `publicImage`, `directImageUrl`

**Target unified schema:**
- Single `images` array where first element = featured/main image
- Each element preserves responsive format (desktop/mobile/public URLs)
- Eliminates dual-field logic throughout frontend/backend

**Primary recommendation:** Use migrate-mongo with dry-run capability, validation-first processing, and keep old fields during transition period for backwards compatibility until frontend fully migrated.

## Standard Stack

The established libraries/tools for MongoDB schema migrations in Node.js:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| migrate-mongo | 11.x | MongoDB migration framework | Industry standard, version-controlled migrations, up/down methods, already in project |
| MongoDB Native Driver | 6.x | Database operations | Via mongoose, supports bulkWrite and aggregation pipelines |
| Mongoose | 8.6.1 | Schema management | Already in project, handles indexes and validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | Latest | Environment configuration | Already in project, loads DB connection strings |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| migrate-mongo | mongoengine-migrate | Supports dry-run natively but requires Python ecosystem |
| bulkWrite | updateMany loop | 10-100x slower, acceptable for one-time migration but bulkWrite is better practice |
| Aggregation pipeline | Traditional update operators | More expressive but overkill for simple field merging |

**Installation:**
```bash
# Already installed in project
cd backend
npm list migrate-mongo
# migrate-mongo@11.0.0
```

**Migration commands:**
```bash
# Create new migration
npx migrate-mongo create merge-image-arrays

# Check migration status
npx migrate-mongo status

# Run migrations
npx migrate-mongo up

# Rollback last migration
npx migrate-mongo down
```

## Architecture Patterns

### Recommended Migration Script Structure
```javascript
// Based on existing 20260201194100-add-product-display-order.js
module.exports = {
  async up(db) {
    const products = db.collection('products');

    // 1. PRE-MIGRATION VALIDATION
    //    Count affected products, validate data quality

    // 2. CATEGORIZED PROCESSING (if needed)
    //    Process by category or batch for memory management

    // 3. BULK OPERATIONS
    //    Use bulkWrite for performance

    // 4. INDEX/SCHEMA UPDATES
    //    Add new indexes, no schema changes yet (keep old fields)

    // 5. VERIFICATION LOGGING
    //    Count migrated records, log summary
  },

  async down(db) {
    const products = db.collection('products');

    // 1. REVERSE TRANSFORMATIONS
    //    Split images array back to mainImage + smallImages

    // 2. CLEANUP
    //    Remove new fields/indexes

    // 3. VERIFICATION
    //    Log rollback results
  }
};
```

### Pattern 1: Validation-First Processing
**What:** Check data quality BEFORE making changes, fail fast on invalid state
**When to use:** All migrations that transform data
**Example:**
```javascript
// Source: Existing Phase 4 migration
async up(db) {
  const products = db.collection('products');

  // Block migration if data invalid
  const invalidCount = await products.countDocuments({
    $or: [
      { mainImage: { $exists: true, $type: 'string' } }, // Old format
      { smallImages: { $exists: false } }
    ]
  });

  if (invalidCount > 0) {
    throw new Error(
      `Migration blocked: ${invalidCount} products have invalid image structure. ` +
      `Fix before running migration.`
    );
  }

  // Proceed with migration...
}
```

### Pattern 2: Dry-Run Capability
**What:** Preview changes without committing to database
**When to use:** High-risk migrations (flagged in STATE.md as Pitfall #4)
**Example:**
```javascript
// Source: Research - mongoengine-migrate pattern adapted to JS
async up(db) {
  const products = db.collection('products');
  const DRY_RUN = process.env.DRY_RUN === 'true';

  const affected = await products.find({ mainImage: { $exists: true } }).toArray();

  console.log(`DRY RUN: Would migrate ${affected.length} products`);

  if (DRY_RUN) {
    // Sample preview
    console.log('Sample transformation:');
    console.log('BEFORE:', JSON.stringify(affected[0], null, 2));

    const transformed = transformProduct(affected[0]);
    console.log('AFTER:', JSON.stringify(transformed, null, 2));

    console.log('\nRun without DRY_RUN=true to apply changes');
    return; // Exit without changes
  }

  // Actual migration proceeds...
}
```

### Pattern 3: BulkWrite for Performance
**What:** Batch all updates into single database round-trip
**When to use:** Updating multiple documents (already established in Phase 5)
**Example:**
```javascript
// Source: Phase 4 migration (established pattern)
const bulkOps = products.map(product => ({
  updateOne: {
    filter: { _id: product._id },
    update: {
      $set: {
        images: mergeImageArrays(product.mainImage, product.smallImages)
      }
    }
  }
}));

await products.bulkWrite(bulkOps);
console.log(`Migrated ${bulkOps.length} products`);
```

### Pattern 4: Backwards Compatibility Period
**What:** Keep old fields during transition, remove after frontend updated
**When to use:** Schema changes affecting API responses (established in v1.0 SKU migration)
**Example:**
```javascript
// Migration adds NEW field but keeps OLD fields
await products.bulkWrite([
  {
    updateOne: {
      filter: { _id: product._id },
      update: {
        $set: { images: [...] }
        // DO NOT $unset mainImage or smallImages yet
      }
    }
  }
]);

// Separate migration AFTER frontend updated
// migration: 20260210000000-remove-legacy-image-fields.js
await products.updateMany(
  {},
  { $unset: { mainImage: '', smallImages: '', smallImagesLocal: '' } }
);
```

### Anti-Patterns to Avoid
- **Immediate field deletion:** Never `$unset` old fields in same migration that adds new fields — breaks API for un-updated clients
- **No validation:** Skipping pre-checks can corrupt data if assumptions wrong (e.g., assuming all products have mainImage)
- **UpdateMany loops:** Using `for (product of products) await updateOne()` instead of bulkWrite — 10-100x slower
- **No rollback:** Down method that just throws error instead of actually reversing changes
- **Blind migration:** Running on production without dry-run preview on staging data

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration versioning | Custom tracking table | migrate-mongo changelog collection | Handles applied/pending, ordering, file hashing |
| Dry-run mode | Console.log + manual review | Environment flag pattern (DRY_RUN=true) | Standardized approach, script remains testable |
| Data validation | Ad-hoc if statements | Pre-migration validation block with countDocuments | Fails fast, provides actionable error messages |
| Array merging | Manual loops | MongoDB aggregation pipeline with $concatArrays | Handles edge cases (null, missing, empty) |
| Progress tracking | Custom logging | migrate-mongo built-in status + structured console output | Integrates with CI/CD, shows migration history |

**Key insight:** migrate-mongo already handles the hard parts (version tracking, ordering, preventing re-runs). Focus migration scripts on the transformation logic, not infrastructure.

## Common Pitfalls

### Pitfall 1: Data Loss from Unvalidated Assumptions
**What goes wrong:** Assuming all products have both mainImage AND smallImages, when some may have only one or neither
**Why it happens:** Database schema flexibility means documents can have different structures
**How to avoid:**
- Query for all edge cases BEFORE migration
- Handle null/undefined/missing gracefully in transformation logic
- Test migration script on copy of production data, not just dev data
**Warning signs:**
```javascript
// Count edge cases BEFORE migrating
const noMainImage = await products.countDocuments({ mainImage: { $exists: false } });
const noSmallImages = await products.countDocuments({ smallImages: { $exists: false } });
const legacyFormat = await products.countDocuments({ image: { $exists: true } });

console.log(`Edge cases found:
  - No mainImage: ${noMainImage}
  - No smallImages: ${noSmallImages}
  - Legacy image field: ${legacyFormat}
`);
```

### Pitfall 2: Migration Without Rollback Capability
**What goes wrong:** Migration succeeds but breaks frontend, no way to undo without database restore
**Why it happens:** Down method not implemented or only removes new fields without restoring old data
**How to avoid:**
- Implement proper `down()` method that reverses transformation
- Test rollback on staging before running migration on production
- Keep old fields during transition period (can't rollback if data deleted)
**Warning signs:** Down method looks like this:
```javascript
// BAD - No actual rollback
async down(db) {
  throw new Error('Migration cannot be rolled back');
}

// GOOD - Reverses transformation
async down(db) {
  const products = db.collection('products');

  const affected = await products.find({ images: { $exists: true } }).toArray();

  const bulkOps = affected.map(product => ({
    updateOne: {
      filter: { _id: product._id },
      update: {
        $set: {
          mainImage: product.images[0],
          smallImages: product.images.slice(1)
        },
        $unset: { images: '' }
      }
    }
  }));

  await products.bulkWrite(bulkOps);
  console.log(`Rollback complete: ${bulkOps.length} products reverted`);
}
```

### Pitfall 3: Frontend-Backend Deployment Race Condition
**What goes wrong:** Frontend deployed first expects new schema, but migration hasn't run yet → 500 errors
**Why it happens:** Separate deployment pipelines, no coordination between schema and code changes
**How to avoid:**
- Deploy in sequence: Database migration → Backend API update → Frontend update
- API should handle BOTH old and new schemas during transition
- Use feature flags to control when frontend uses new field
**Warning signs:**
```javascript
// Backend API should handle both during transition
app.get('/api/products/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);

  // TEMPORARY COMPATIBILITY LAYER
  if (product.images && !product.mainImage) {
    // New schema - API client expects this
    product.mainImage = product.images[0];
    product.smallImages = product.images.slice(1);
  }

  res.json(product);
});
```

### Pitfall 4: Inadequate Testing with Production Data Characteristics
**What goes wrong:** Migration works on dev data (20 products) but fails on production (2000 products) due to memory/timeout
**Why it happens:** Dev data too small, too clean, doesn't have edge cases from years of schema evolution
**How to avoid:**
- Test on anonymized production backup or staging with prod data copy
- Use cursor-based iteration for large collections, not `.toArray()`
- Set realistic timeouts in migrate-mongo-config.js
**Warning signs:**
```javascript
// BAD - Loads all products into memory
const products = await products.find({}).toArray();
products.forEach(product => { /* transform */ });

// GOOD - Cursor-based iteration
const cursor = products.find({});
const bulkOps = [];

for await (const product of cursor) {
  bulkOps.push({
    updateOne: {
      filter: { _id: product._id },
      update: { $set: { images: transform(product) } }
    }
  });

  // Process in batches of 1000 to avoid memory issues
  if (bulkOps.length >= 1000) {
    await products.bulkWrite(bulkOps);
    bulkOps.length = 0; // Clear array
  }
}

// Process remaining
if (bulkOps.length > 0) {
  await products.bulkWrite(bulkOps);
}
```

### Pitfall 5: Breaking Compound Indexes
**What goes wrong:** Renaming fields breaks existing compound indexes, queries become slow
**Why it happens:** Indexes reference field names, renaming field invalidates index
**How to avoid:**
- Check for indexes on fields being renamed: `db.products.getIndexes()`
- Drop old indexes, create new ones with new field names
- Test query performance after migration
**Warning signs:**
```bash
# Check existing indexes before migration
mongo
> use jewelry
> db.products.getIndexes()

# If you see indexes referencing mainImage or smallImages:
[
  { "v": 2, "key": { "mainImage.desktop": 1 }, "name": "mainImage_desktop_idx" }
]

# Migration must drop and recreate
await products.dropIndex('mainImage_desktop_idx');
await products.createIndex({ 'images.0.desktop': 1 }, { name: 'main_image_desktop_idx' });
```

## Code Examples

Verified patterns from existing migrations and MongoDB best practices:

### Image Array Transformation Logic
```javascript
// Source: Research synthesis - handles all edge cases identified
function mergeImageArrays(mainImage, smallImages) {
  const images = [];

  // Handle mainImage (first in array = featured)
  if (mainImage && typeof mainImage === 'object' && Object.keys(mainImage).length > 0) {
    // Keep responsive format structure
    images.push({
      desktop: mainImage.desktop || null,
      mobile: mainImage.mobile || null,
      desktopLocal: mainImage.desktopLocal || null,
      mobileLocal: mainImage.mobileLocal || null,
      publicDesktop: mainImage.publicDesktop || null,
      publicMobile: mainImage.publicMobile || null
    });
  }

  // Handle smallImages (gallery)
  if (Array.isArray(smallImages) && smallImages.length > 0) {
    smallImages.forEach(img => {
      if (img && typeof img === 'object') {
        images.push({
          desktop: img.desktop || null,
          mobile: img.mobile || null,
          desktopLocal: img.desktopLocal || null,
          mobileLocal: img.mobileLocal || null,
          // smallImages may not have public URLs, fill if present
          publicDesktop: img.publicDesktop || null,
          publicMobile: img.publicMobile || null
        });
      } else if (typeof img === 'string') {
        // Handle legacy string format
        images.push({
          desktop: img,
          mobile: img,
          desktopLocal: null,
          mobileLocal: null,
          publicDesktop: null,
          publicMobile: null
        });
      }
    });
  }

  return images;
}
```

### Pre-Migration Audit Script
```javascript
// Source: Best practices from migration verification research
async function auditImageData(db) {
  const products = db.collection('products');

  const total = await products.countDocuments({});
  const hasMainImage = await products.countDocuments({ mainImage: { $exists: true } });
  const hasSmallImages = await products.countDocuments({ smallImages: { $exists: true } });
  const hasBoth = await products.countDocuments({
    mainImage: { $exists: true },
    smallImages: { $exists: true }
  });
  const hasNeither = await products.countDocuments({
    mainImage: { $exists: false },
    smallImages: { $exists: false }
  });
  const hasLegacyImage = await products.countDocuments({ image: { $exists: true } });

  // Check for corrupted data
  const mainImageIsString = await products.countDocuments({
    mainImage: { $type: 'string' }
  });
  const smallImagesNotArray = await products.countDocuments({
    smallImages: { $exists: true, $not: { $type: 'array' } }
  });

  console.log('=== IMAGE DATA AUDIT ===');
  console.log(`Total products: ${total}`);
  console.log(`\nField presence:`);
  console.log(`  - Has mainImage: ${hasMainImage} (${((hasMainImage/total)*100).toFixed(1)}%)`);
  console.log(`  - Has smallImages: ${hasSmallImages} (${((hasSmallImages/total)*100).toFixed(1)}%)`);
  console.log(`  - Has both: ${hasBoth} (${((hasBoth/total)*100).toFixed(1)}%)`);
  console.log(`  - Has neither: ${hasNeither} (${((hasNeither/total)*100).toFixed(1)}%)`);
  console.log(`  - Has legacy image: ${hasLegacyImage} (${((hasLegacyImage/total)*100).toFixed(1)}%)`);

  if (mainImageIsString > 0 || smallImagesNotArray > 0) {
    console.log(`\n⚠️  DATA CORRUPTION DETECTED:`);
    if (mainImageIsString > 0) {
      console.log(`  - ${mainImageIsString} products have mainImage as string (expected object)`);
    }
    if (smallImagesNotArray > 0) {
      console.log(`  - ${smallImagesNotArray} products have smallImages as non-array`);
    }
    throw new Error('Fix corrupted data before migration');
  }

  // Sample products for manual review
  const sample = await products.find({}).limit(3).toArray();
  console.log(`\nSample products (first 3):`);
  sample.forEach((p, i) => {
    console.log(`\n${i + 1}. Product #${p.id} - ${p.name}`);
    console.log(`   mainImage keys: ${p.mainImage ? Object.keys(p.mainImage).join(', ') : 'none'}`);
    console.log(`   smallImages count: ${Array.isArray(p.smallImages) ? p.smallImages.length : 0}`);
  });

  return {
    total,
    hasMainImage,
    hasSmallImages,
    hasBoth,
    hasNeither,
    safe: mainImageIsString === 0 && smallImagesNotArray === 0
  };
}
```

### Complete Migration with Dry-Run
```javascript
// Source: Synthesis of migrate-mongo pattern + dry-run research + existing Phase 4 migration
module.exports = {
  async up(db) {
    const products = db.collection('products');
    const DRY_RUN = process.env.DRY_RUN === 'true';

    console.log(`Starting image array migration (DRY_RUN: ${DRY_RUN})...`);

    // 1. Pre-migration audit
    const audit = await auditImageData(db);
    if (!audit.safe) {
      throw new Error('Audit failed - fix data corruption first');
    }

    // 2. Fetch products that need migration
    const cursor = products.find({
      $or: [
        { mainImage: { $exists: true } },
        { smallImages: { $exists: true } }
      ]
    });

    const bulkOps = [];
    let processedCount = 0;

    for await (const product of cursor) {
      const images = mergeImageArrays(product.mainImage, product.smallImages);

      if (DRY_RUN && processedCount < 3) {
        console.log(`\nSample ${processedCount + 1}:`);
        console.log('BEFORE:', JSON.stringify({
          mainImage: product.mainImage,
          smallImages: product.smallImages
        }, null, 2));
        console.log('AFTER:', JSON.stringify({ images }, null, 2));
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $set: { images }
            // Keep old fields for backwards compatibility
          }
        }
      });

      processedCount++;

      // Process in batches to avoid memory issues
      if (!DRY_RUN && bulkOps.length >= 1000) {
        await products.bulkWrite(bulkOps);
        console.log(`  Processed ${processedCount} products...`);
        bulkOps.length = 0;
      }
    }

    if (DRY_RUN) {
      console.log(`\n=== DRY RUN COMPLETE ===`);
      console.log(`Would migrate ${processedCount} products`);
      console.log(`Run without DRY_RUN=true to apply changes`);
      return;
    }

    // Process remaining batch
    if (bulkOps.length > 0) {
      await products.bulkWrite(bulkOps);
    }

    // 3. Verification
    const migratedCount = await products.countDocuments({ images: { $exists: true } });
    console.log(`\nMigration complete: ${migratedCount} products now have images array`);

    if (migratedCount !== processedCount) {
      console.warn(`⚠️  Warning: Expected ${processedCount} but found ${migratedCount} with images array`);
    }
  },

  async down(db) {
    const products = db.collection('products');

    console.log('Rolling back image array migration...');

    const cursor = products.find({ images: { $exists: true } });
    const bulkOps = [];
    let processedCount = 0;

    for await (const product of cursor) {
      const update = {
        $unset: { images: '' }
      };

      // Restore original structure if images array exists
      if (Array.isArray(product.images) && product.images.length > 0) {
        update.$set = {
          mainImage: product.images[0],
          smallImages: product.images.slice(1)
        };
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: product._id },
          update
        }
      });

      processedCount++;

      if (bulkOps.length >= 1000) {
        await products.bulkWrite(bulkOps);
        console.log(`  Rolled back ${processedCount} products...`);
        bulkOps.length = 0;
      }
    }

    if (bulkOps.length > 0) {
      await products.bulkWrite(bulkOps);
    }

    console.log(`Rollback complete: ${processedCount} products reverted to mainImage/smallImages`);
  }
};

// Helper function from Code Examples section above
function mergeImageArrays(mainImage, smallImages) { /* ... */ }
function auditImageData(db) { /* ... */ }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual MongoDB shell scripts | migrate-mongo with version control | 2020+ | Migrations tracked in changelog, repeatable, team-visible |
| updateMany loops | bulkWrite operations | MongoDB 3.2+ (2015) | 10-100x performance improvement for batch updates |
| Immediate field deletion | Gradual deprecation with compatibility period | Modern practice | Zero-downtime deployments, rollback safety |
| $rename operator | Aggregation pipelines with $set | MongoDB 4.2+ (2019) | More expressive transformations, but $rename still valid for simple renames |
| Blocking migrations | Dry-run capability | Modern DevOps | Risk reduction, preview changes before committing |

**Deprecated/outdated:**
- **migrate (npm package):** Older generic migration tool, migrate-mongo is MongoDB-specific with better features
- **db.collection.save() loops:** Deprecated in favor of bulkWrite, update operations
- **No migration tracking:** Raw shell scripts without version control - migrate-mongo changelog is standard now

## Open Questions

Things that couldn't be fully resolved:

1. **Frontend fallback duration**
   - What we know: CONTEXT.md marks as Claude's discretion, backwards compatibility established pattern
   - What's unclear: Should frontend ALWAYS check both schemas or remove fallback after X months?
   - Recommendation: Keep permanent fallback in frontend (defensive programming), remove old fields from schema after confirmed no old documents exist

2. **Exact validation method**
   - What we know: Pre-migration validation is required, count-based checks demonstrated in Phase 4
   - What's unclear: Should validation be count-based, sample inspection, or automated field-by-field comparison?
   - Recommendation: Multi-level validation (counts + sample inspection + spot-check random products) for high-confidence

3. **Migration script timeout handling**
   - What we know: migrate-mongo supports options config, large collections need cursor-based iteration
   - What's unclear: What timeout is reasonable for production data volume?
   - Recommendation: Test on staging with production data copy to determine realistic timeout, use batched bulkWrite (1000 docs/batch)

4. **Admin form update sequence**
   - What we know: CONTEXT.md specifies "immediate switch" after data migration
   - What's unclear: Should admin forms be updated in same deployment or separate?
   - Recommendation: Same deployment - admin is internal tool, can coordinate deployment. Public API needs longer compatibility period.

## Sources

### Primary (HIGH confidence)
- [MongoDB Bulk Write Operations Documentation](https://www.mongodb.com/docs/manual/core/bulk-write-operations/) - Official MongoDB docs on bulkWrite ordered/unordered operations
- [migrate-mongo npm package](https://www.npmjs.com/package/migrate-mongo) - Official package documentation for migration framework
- [MongoDB Schema Versioning Pattern](https://www.mongodb.com/docs/manual/data-modeling/design-patterns/data-versioning/schema-versioning/) - Official MongoDB docs on maintaining different schema versions
- Existing migration file: `backend/migrations/20260201194100-add-product-display-order.js` - Established project pattern
- Existing Product schema: `backend/models/Product.js` - Current image field structure

### Secondary (MEDIUM confidence)
- [Making Backward-Compatible Schema Changes in MongoDB](https://mincong.io/2021/02/27/mongodb-schema-compatibility/) - Real-world patterns for gradual deprecation
- [Best Practices for MongoDB Schema Evolution](https://moldstud.com/articles/p-best-practices-for-mongodb-schema-evolution-managing-changes-effectively) - Schema versioning strategies
- [MongoDB Data Migration Best Practices 2026](https://medium.com/@kanerika/data-migration-best-practices-your-ultimate-guide-for-2026-7cbd5594d92e) - Current year best practices
- [MongoDB Migration Validation](https://www.compilenrun.com/docs/database/mongodb/mongodb-data-migration/mongodb-migration-validation/) - Pre-check and post-verification patterns
- [Step-by-Step Guide to MongoDB Migrations Using Migrate-Mongo](https://dev.to/rutvikmakvana4/step-by-step-guide-to-mongodb-migrations-using-migrate-mongo-1n7e) - Practical walkthrough

### Tertiary (LOW confidence - WebSearch only)
- [Top 10 Data Migration Risks 2026](https://medium.com/@kanerika/top-10-data-migration-risks-and-how-to-avoid-them-in-2026-fb5dc93c12f5) - General data migration pitfalls
- [MongoDB updateMany with Aggregation Pipeline](https://www.geeksforgeeks.org/mongodb/update-with-aggregation-pipeline/) - Advanced update patterns (not needed for this phase but useful reference)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - migrate-mongo already in project, existing migration demonstrates pattern
- Architecture: HIGH - Existing Phase 4 migration provides concrete template, MongoDB docs authoritative
- Pitfalls: MEDIUM-HIGH - Some from official sources, others from WebSearch but cross-verified with project patterns

**Research date:** 2026-02-03
**Valid until:** ~60 days (stable domain - MongoDB migration patterns don't change rapidly, but verify migrate-mongo version compatibility)

**Project context verified:**
- ✅ Checked existing Product schema structure
- ✅ Reviewed existing Phase 4 migration for established patterns
- ✅ Confirmed migrate-mongo already installed and configured
- ✅ Identified frontend usage of mainImage/smallImages in categoriesView.js
- ✅ CONTEXT.md decisions incorporated (dry-run required, new array wins conflicts, immediate admin switch)
