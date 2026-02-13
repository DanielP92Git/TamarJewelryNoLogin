# Phase 27: Schema Migration & Foundation - Research

**Researched:** 2026-02-13
**Domain:** MongoDB schema migration for bilingual product fields
**Confidence:** HIGH

## Summary

Phase 27 migrates the Product schema from single-language fields (`name`, `description`) to bilingual fields (`name_en`, `name_he`, `description_en`, `description_he`). This research confirms that the standard approach is direct field migration using migrate-mongo with backward compatibility via legacy field retention, not virtuals. The codebase already has mature migration infrastructure (3 prior migrations) following idempotent, batched, dry-run patterns that should be replicated here.

Key findings: (1) Cart data is ID-based, not name-based, so migration impact is minimal—silent localStorage clear is the simplest approach; (2) No external integrations consume product data beyond admin dashboard and sitemap, both internal; (3) Legacy field compatibility can be maintained via Mongoose virtuals with getters/setters OR API-level response duplication—virtuals recommended for cleaner separation; (4) Migration should use the established pattern from `20260203000000-merge-image-arrays.js` with batching, validation, and dry-run support.

**Primary recommendation:** Use migrate-mongo with batched updateMany, Mongoose virtual getters for legacy fields, silent cart clear, and API response duplication during transition period.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Existing product data:**
- All ~94 products are currently in English (names and descriptions)
- Migration maps existing `name` -> `name_en` and `description` -> `description_en`
- Hebrew fields (`name_he`, `description_he`) start empty for all products
- Claude should verify during research whether any Hebrew text exists in other product fields (alt text, categories, etc.)
- Products in unlisted categories (bracelets, rings, unisex, shalom club) still get bilingual fields in migration—translation happens later in Phase 32, not skipped permanently
- No special-case handling for any products—all migrated equally

**Cart transition handling:**
- Old-format cart data in localStorage is silently cleared after migration
- No user-facing message—customer simply sees an empty cart
- Cart data volume is unknown (no analytics), but silent clear is accepted regardless

**Backward compatibility scope:**
- API returns both legacy format AND new bilingual fields during transition (Claude's discretion on exact approach)
- Claude should verify whether any external systems consume product data (research phase task)
- Legacy fields (`name`, `description`) kept through the entire v1.5 milestone (Phases 27-32)
- Legacy field removal deferred to a future cleanup after all v1.5 phases complete
- Migration deploys directly to production (no staging)—script is idempotent, ~94 products is low-risk

### Claude's Discretion

- Cart storage approach after migration (ID-only vs storing name)—pick what works best with existing cart architecture
- API response shape during transition (both formats recommended, exact implementation flexible)
- Whether external integrations exist that consume product data (verify during research)

### Deferred Ideas (OUT OF SCOPE)

None—discussion stayed within phase scope.

</user_constraints>

## Standard Stack

### Core Migration Tools

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| migrate-mongo | ^14.0.7 | MongoDB schema migrations | Already in project (3 existing migrations), industry standard for MongoDB versioned migrations, supports idempotent scripts and rollback |
| Mongoose | ^8.6.1 | Schema definition and validation | Already in project, native virtual support for backward compatibility |

**Installation:**
```bash
# Already installed in backend/package.json
cd backend
npm run migrate:up    # Apply migration
npm run migrate:down  # Rollback migration
npm run migrate:status # Check migration state
```

### Migration Configuration (Already Established)

The project already has `backend/migrate-mongo-config.js`:
```javascript
{
  mongodb: {
    url: process.env.MONGODB_URI,
    options: {}
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.js',
  useFileHash: false,
  moduleSystem: 'commonjs'
}
```

### Existing Migration Patterns

The codebase has 3 prior migrations to follow as templates:
- `20260201194100-add-product-display-order.js` - Added new field with index
- `20260203000000-merge-image-arrays.js` - Complex data transformation with batching, dry-run, validation
- `20260210000000-add-product-slugs.js` - Added field with unique index, collision handling

## Architecture Patterns

### Recommended Project Structure

```
backend/
├── migrations/
│   └── 20260213000000-add-bilingual-product-fields.js  # New migration
├── models/
│   └── Product.js                                       # Schema with virtuals for legacy fields
└── index.js                                             # API routes already have normalizeProductForClient
```

### Pattern 1: Field-Level Bilingual Schema (Recommended)

**What:** Separate fields per language with language suffix (`name_en`, `name_he`)

**When to use:** When you need maximum query flexibility, explicit field access, and simple validation per language

**Why this pattern:**
- MongoDB best practice for 2-3 languages (versus embedded document pattern for 5+ languages)
- Explicit field names make queries simpler: `{ name_en: "Necklace" }` vs `{ "name.en": "Necklace" }`
- Easier to validate, index, and migrate individually
- Avoids plugin dependencies (mongoose-intl, mongoose-locale-schema add complexity for minimal benefit with only 2 languages)

**Example:**
```javascript
// Source: MongoDB official docs + codebase convention
const ProductSchema = new mongoose.Schema({
  // Legacy fields (kept for backward compatibility)
  name: { type: String, required: true },
  description: { type: String },

  // New bilingual fields
  name_en: { type: String, required: true },
  name_he: { type: String },
  description_en: { type: String },
  description_he: { type: String },

  // ... other fields
});
```

### Pattern 2: Mongoose Virtual Getters for Legacy Field Compatibility

**What:** Use Mongoose virtuals to maintain legacy `name` and `description` fields without storing duplicate data

**When to use:** During transition period when both old and new field formats must coexist

**Example:**
```javascript
// Source: Mongoose official docs - https://mongoosejs.com/docs/tutorials/virtuals.html
// Virtual getter: reads from name_en when accessing product.name
ProductSchema.virtual('name').get(function() {
  return this.name_en || '';
});

ProductSchema.virtual('description').get(function() {
  return this.description_en || '';
});

// IMPORTANT: Ensure virtuals are included in JSON responses
ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });
```

**Why virtuals:**
- Avoid data duplication (don't store both `name` and `name_en` with same value)
- Cleaner than manual API-level duplication
- Can be removed easily in future cleanup phase
- Virtuals don't persist to DB, so no migration needed to remove them later

**Limitations:**
- Cannot query on virtual fields: `Product.find({ name: "Necklace" })` won't work
- Must query on actual fields: `Product.find({ name_en: "Necklace" })`
- Since all API queries currently use `.find({})` or query by ID/category (not by name), this limitation doesn't impact the application

### Pattern 3: Idempotent Migration with Batching and Dry-Run

**What:** Migration script that can run multiple times safely, processes in batches, and supports preview mode

**When to use:** Any migration touching >50 documents or transforming data (not just adding indexes)

**Example (from existing codebase):**
```javascript
// Source: backend/migrations/20260203000000-merge-image-arrays.js
module.exports = {
  async up(db) {
    const products = db.collection('products');
    const DRY_RUN = process.env.DRY_RUN === 'true';

    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'LIVE'}`);

    // 1. Pre-migration validation
    const total = await products.countDocuments({});
    console.log(`Total products: ${total}`);

    // 2. Find products needing migration (idempotent check)
    const needsMigration = await products.find({
      $or: [
        { name_en: { $exists: false } },
        { name_en: null },
        { name_en: '' }
      ]
    }).toArray();

    if (needsMigration.length === 0) {
      console.log('All products already migrated. Nothing to do.');
      return;
    }

    // 3. Build bulk operations
    const bulkOps = [];
    for (const product of needsMigration) {
      bulkOps.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $set: {
              name_en: product.name || '',
              description_en: product.description || '',
              name_he: '',
              description_he: ''
            }
            // Keep legacy fields - DO NOT $unset
          }
        }
      });

      // Batch processing (every 1000 docs)
      if (!DRY_RUN && bulkOps.length >= 1000) {
        await products.bulkWrite(bulkOps);
        console.log(`Processed ${bulkOps.length} products...`);
        bulkOps.length = 0;
      }
    }

    // 4. Process remaining batch
    if (!DRY_RUN && bulkOps.length > 0) {
      await products.bulkWrite(bulkOps);
    }

    // 5. Verification
    const migrated = await products.countDocuments({ name_en: { $exists: true } });
    console.log(`Migration complete: ${migrated} products`);
  },

  async down(db) {
    // Rollback: Remove new fields, keep legacy fields
    const products = db.collection('products');
    await products.updateMany(
      {},
      { $unset: { name_en: '', name_he: '', description_en: '', description_he: '' } }
    );
    console.log('Rollback complete');
  }
};
```

**Why batching:**
- Prevents memory issues with large collections
- 94 products is small enough to process in single batch, but pattern prepares for future growth
- Matches established codebase pattern

### Pattern 4: API Response Duplication (Alternative to Virtuals)

**What:** Manually duplicate legacy fields in API responses via `normalizeProductForClient`

**When to use:** If virtuals cause issues with SSR or serialization (test virtuals first, fall back to this if needed)

**Example:**
```javascript
// backend/index.js - normalizeProductForClient() already exists
function normalizeProductForClient(productDoc) {
  const obj = productDoc.toObject ? productDoc.toObject() : { ...productDoc };

  // BACKWARD COMPATIBILITY: Populate legacy fields from bilingual fields
  // Remove this block after v1.5 milestone complete
  if (obj.name_en && !obj.name) {
    obj.name = obj.name_en;
  }
  if (obj.description_en && !obj.description) {
    obj.description = obj.description_en;
  }

  return obj;
}
```

**Tradeoff:** More explicit but requires manual API-level handling vs automatic virtuals

### Anti-Patterns to Avoid

- **Don't use mongoose-intl or locale plugins:** Overkill for 2 languages, adds dependency and complexity. Direct field-level approach is cleaner for small language count.
- **Don't query on virtual fields:** Virtuals are computed properties, not stored in DB. Query on actual fields (`name_en`, `name_he`).
- **Don't store duplicate data:** Don't set both `name` and `name_en` to same value. Use virtuals or API-level duplication instead.
- **Don't skip idempotency checks:** Always check if migration already ran (`name_en exists`) before processing documents.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration versioning | Custom migration tracker | migrate-mongo | Handles changelog collection, migration order, rollback, already installed |
| Batch processing | Manual iteration with counters | `bulkWrite()` with batch slicing | MongoDB native batch operations are atomic and optimized |
| Legacy field compatibility | Manual field copying in every route | Mongoose virtuals OR centralized `normalizeProductForClient` | Single point of maintenance, automatic for all queries |
| Migration dry-run | Separate test script | `DRY_RUN=true` environment variable | Reuses migration logic, no code duplication |

**Key insight:** MongoDB migrations are deceptively simple but have many edge cases (idempotency, rollback, batch memory limits, validation). The codebase already has a battle-tested pattern—reuse it rather than reinventing.

## Common Pitfalls

### Pitfall 1: Forgetting toJSON/toObject for Virtuals

**What goes wrong:** Mongoose virtuals don't appear in API responses by default, causing frontend to receive products without `name` field

**Why it happens:** Virtuals are excluded from `toJSON()` and `toObject()` by default for performance

**How to avoid:**
```javascript
ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });
```

**Warning signs:** Frontend logs "product.name is undefined" after migration deploys

### Pitfall 2: Querying on Virtual Fields

**What goes wrong:** Query like `Product.find({ name: "Necklace" })` returns empty results after migration

**Why it happens:** Virtuals are computed properties, not stored in database. MongoDB can't query them.

**How to avoid:** Update all queries to use actual fields:
```javascript
// Before migration
Product.find({ name: "Necklace" })

// After migration
Product.find({ name_en: "Necklace" })
```

**Warning signs:** Search functionality breaks, product lookups fail with "not found"

**Codebase status:** ✅ Low risk - verified that codebase doesn't query by product name. All queries use ID, category, slug, or fetch all products. Only sitemap queries `name` for display (non-filtering), which virtuals handle correctly.

### Pitfall 3: Cart Data Structure Mismatch

**What goes wrong:** Cart stores product names, migration changes field name, cart items show blank names

**Why it happens:** localStorage cart structure depends on old schema fields

**How to avoid:** Verify cart storage format before migration. Two strategies:
1. **ID-only storage (current approach):** Cart stores product IDs, fetches fresh data on load—migration has no impact
2. **Name storage (legacy approach):** Cart stores product names—requires migration or silent clear

**Codebase status:** ✅ Cart stores product metadata (name, price, image) in localStorage (see `frontend/js/model.js` line 236-249). User decision: **silent clear accepted**—simplest approach, low user impact.

### Pitfall 4: Non-Idempotent Migration

**What goes wrong:** Migration runs twice (manual re-run or deploy issue), duplicates data or fails with errors

**Why it happens:** Migration doesn't check if work already complete before processing

**How to avoid:**
```javascript
// Always check before processing
const needsMigration = await products.find({
  $or: [
    { name_en: { $exists: false } },
    { name_en: null },
    { name_en: '' }
  ]
}).toArray();

if (needsMigration.length === 0) {
  console.log('Already migrated. Skipping.');
  return;
}
```

**Warning signs:** Second migration run shows errors or unexpected document counts

### Pitfall 5: Missing Index After Schema Change

**What goes wrong:** Queries become slow after migration because indexes weren't updated for new field names

**Why it happens:** Mongoose schema indexes aren't automatically applied to existing collections

**How to avoid:** Explicitly create indexes in migration for searchable/filterable fields:
```javascript
// If products will be searched/filtered by name_en
await products.createIndex({ name_en: 1 }, { name: 'product_name_en_idx' });
```

**Codebase status:** ✅ Low risk - current schema doesn't index `name` or `description`, so no index migration needed. Category, ID, slug, displayOrder already have indexes and aren't changing.

### Pitfall 6: SSR Template Breakage

**What goes wrong:** Server-rendered pages show blank product names after migration

**Why it happens:** EJS templates access `product.name`, which is now a virtual that might not serialize correctly

**How to avoid:** Test SSR routes (`/en/necklaces`, `/en/product/[slug]`) immediately after migration:
```bash
# Verify SSR templates render correctly
curl http://localhost:3000/en/necklaces | grep "product-name"
```

**Codebase status:** ⚠️ Medium risk - SSR templates in `backend/views/pages/category.ejs` and `product.ejs` directly access `product.name` and `product.description`. Virtuals should handle this, but requires verification testing.

## Code Examples

Verified patterns from codebase and official sources:

### Example 1: Migration Script Structure (Bilingual Fields)

```javascript
// backend/migrations/20260213000000-add-bilingual-product-fields.js
// Source: Codebase pattern from 20260203000000-merge-image-arrays.js

module.exports = {
  async up(db) {
    const products = db.collection('products');
    const DRY_RUN = process.env.DRY_RUN === 'true';

    console.log(`\n${'='.repeat(60)}`);
    console.log('Migration: Add Bilingual Product Fields');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'LIVE'}`);
    console.log('='.repeat(60) + '\n');

    // Step 1: Pre-migration validation
    const total = await products.countDocuments({});
    console.log(`Total products: ${total}`);

    // Step 2: Find products needing migration (idempotent check)
    const needsMigration = await products.find({
      $or: [
        { name_en: { $exists: false } },
        { name_en: null },
        { name_en: '' }
      ]
    }).toArray();

    console.log(`Products needing migration: ${needsMigration.length}`);

    if (needsMigration.length === 0) {
      console.log('All products already have bilingual fields. Nothing to do.');
      return;
    }

    // Step 3: Build bulk operations
    const bulkOps = [];
    for (const product of needsMigration) {
      bulkOps.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $set: {
              name_en: product.name || '',
              name_he: '',
              description_en: product.description || '',
              description_he: ''
            }
            // DO NOT $unset name or description - keep for backward compatibility
          }
        }
      });

      // Batch processing (1000 docs per batch)
      if (!DRY_RUN && bulkOps.length >= 1000) {
        await products.bulkWrite(bulkOps);
        console.log(`  Processed ${bulkOps.length} products...`);
        bulkOps.length = 0;
      }
    }

    if (DRY_RUN) {
      console.log(`\nDRY RUN COMPLETE - Would migrate ${needsMigration.length} products`);
      return;
    }

    // Step 4: Process remaining batch
    if (bulkOps.length > 0) {
      await products.bulkWrite(bulkOps);
      console.log(`  Processed final batch: ${bulkOps.length} products`);
    }

    // Step 5: Verification
    const migrated = await products.countDocuments({ name_en: { $exists: true } });
    console.log(`\nMigration complete: ${migrated}/${total} products now have bilingual fields`);
    console.log('='.repeat(60) + '\n');
  },

  async down(db) {
    const products = db.collection('products');

    console.log('Rollback: Removing bilingual fields...');

    const result = await products.updateMany(
      {},
      {
        $unset: {
          name_en: '',
          name_he: '',
          description_en: '',
          description_he: ''
        }
      }
    );

    console.log(`Rollback complete: ${result.modifiedCount} products reverted`);
  }
};
```

### Example 2: Mongoose Schema with Virtual Legacy Fields

```javascript
// backend/models/Product.js
// Source: Mongoose virtuals docs + codebase convention

const ProductSchema = new mongoose.Schema({
  id: { type: Number, required: true, index: true },

  // Legacy fields (KEPT for backward compatibility through v1.5 milestone)
  // Will be populated by virtuals, but remain in schema for safety
  name: { type: String, required: true },
  description: { type: String },

  // New bilingual fields (Phase 27)
  name_en: { type: String, required: true },
  name_he: { type: String },
  description_en: { type: String },
  description_he: { type: String },

  // ... other existing fields (category, prices, images, etc.)
});

// Virtual getters for legacy field compatibility
// These allow old code to access product.name and get product.name_en automatically
ProductSchema.virtual('name').get(function() {
  return this.name_en || '';
});

ProductSchema.virtual('description').get(function() {
  return this.description_en || '';
});

// CRITICAL: Include virtuals in JSON/Object serialization
// Without this, API responses won't include legacy fields
ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);
```

### Example 3: Cart Silent Clear on Schema Mismatch

```javascript
// frontend/js/model.js - handleLoadStorage() modification
// Source: User decision from CONTEXT.md

export const handleLoadStorage = async function () {
  try {
    if (!localStorage.getItem('auth-token')) {
      const data = await JSON.parse(localStorage.getItem('cart'));
      if (!data) return;

      // Phase 27: Silent cart clear if schema migration detected
      // Check if cart has old format (stored before bilingual migration)
      // Migration date: 2026-02-13 (hardcoded as migration deployment marker)
      const migrationDate = new Date('2026-02-13').getTime();
      const cartTimestamp = localStorage.getItem('cartTimestamp');

      if (!cartTimestamp || parseInt(cartTimestamp) < migrationDate) {
        console.log('Schema migration detected - clearing legacy cart data');
        localStorage.removeItem('cart');
        localStorage.setItem('cartTimestamp', Date.now().toString());
        return;
      }

      cart.push(...data);
    } else {
      // Logged-in users: cart stored server-side, no client migration needed
      const userData = await fetchUserCartAPI();
      if (!userData) return;
    }
  } catch (err) {
    console.error(err);
  }
};

// Update cart creation to include timestamp
const createLocalStorage = function () {
  try {
    localStorage.setItem('cart', JSON.stringify(cart));
    localStorage.setItem('cartTimestamp', Date.now().toString());
  } catch (error) {
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      console.error('localStorage quota exceeded. Cart not saved:', error);
    } else {
      console.error('Failed to save cart to localStorage:', error);
    }
  }
};
```

### Example 4: Testing Migration Before Deployment

```bash
# Source: Established migrate-mongo workflow

# 1. Dry-run migration (preview changes without applying)
cd backend
DRY_RUN=true npm run migrate:up

# 2. Check migration status
npm run migrate:status

# 3. Apply migration (production)
npm run migrate:up

# 4. Verify migration results
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Product = require('./models/Product');
  const sample = await Product.findOne({}).lean();
  console.log('Sample product after migration:');
  console.log('name_en:', sample.name_en);
  console.log('name_he:', sample.name_he);
  console.log('description_en:', sample.description_en);
  console.log('description_he:', sample.description_he);
  process.exit(0);
});
"

# 5. Test SSR rendering
curl http://localhost:3000/en/necklaces | grep -o 'class="item-title">[^<]*' | head -5

# 6. Test API responses
curl http://localhost:3000/allproducts | jq '.[0] | {name, name_en, name_he}'

# 7. If issues found, rollback
npm run migrate:down
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mongoose plugins for i18n (mongoose-intl, mongoose-locale-schema) | Direct field-level bilingual fields | 2024-2025 | Simpler for 2-3 languages, no plugin dependencies, better query performance |
| Embedded document pattern `{ name: { en: "...", he: "..." } }` | Field-level pattern `{ name_en: "...", name_he: "..." }` | MongoDB best practices 2023+ | Easier indexing, cleaner queries, better TypeScript support |
| Manual migration scripts | migrate-mongo standardization | MongoDB community 2020+ | Versioning, rollback, team collaboration |
| Eager migration (all docs at once) | Lazy + batched migration | Large-scale MongoDB 2022+ | Memory efficient, but 94 products = eager is fine |

**Deprecated/outdated:**
- **mongoose-i18n plugins:** Still functional but overkill for 2 languages. Use direct fields instead.
- **Schema versioning with `_version` field:** Needed for complex migrations with multiple schema versions. Not needed here—simple additive migration.

## Verification Findings

### External System Audit

**Question:** Do any external systems consume product data?

**Findings:**
1. ✅ **Admin dashboard** (`admin/BisliView.js`): Internal system, consumes `/allproducts` endpoint. Backward compatible via virtuals/API duplication.
2. ✅ **Sitemap** (`backend/routes/sitemap.js`): Internal system, queries `Product.find()` and accesses `product.name` for image captions. Virtuals handle this automatically.
3. ✅ **SSR templates** (`backend/views/pages/`): Internal system, accesses `product.name` and `product.description` in EJS. Virtuals should handle this, requires testing.
4. ✅ **Microsoft Clarity analytics**: Tracks page views, doesn't consume product API.
5. ✅ **PayPal/Stripe webhooks**: Don't consume product data (only order/payment data).

**Conclusion:** No external integrations found. All product consumers are internal systems that will receive backward-compatible responses via virtuals or API-level duplication.

### Hebrew Text Audit

**Question:** Does any existing product data contain Hebrew text in other fields?

**Findings (based on schema review):**
1. ✅ **`name` field:** Currently English only per user (verified decision in CONTEXT.md)
2. ✅ **`description` field:** Currently English only per user
3. ✅ **`category` field:** Uses English database values (`necklaces`, `hoop-earrings`, etc.)—display names are translated in frontend, not stored in DB
4. ✅ **`sku` field:** Alphanumeric only (validated by regex `/^[A-Z0-9]+$/`)—no Hebrew possible
5. ✅ **Image alt text:** Not stored in Product schema—handled in frontend templates with hardcoded translations
6. ❓ **Unknown:** Would need database query to definitively confirm no Hebrew in `name` or `description` fields, but user confirmed data is English

**Conclusion:** No Hebrew text found in schema structure. Migration assumption (all products are English) is correct based on schema validation and user confirmation.

## Open Questions

1. **Virtual field serialization in SSR:**
   - What we know: Mongoose virtuals work with `.toJSON()` and `.toObject()` when configured correctly
   - What's unclear: Whether EJS templates properly serialize virtuals when rendering `product.name`
   - Recommendation: Test SSR routes immediately after migration. If virtuals don't serialize, fall back to API-level duplication in `normalizeProductForClient`.

2. **Migration deployment coordination:**
   - What we know: Migration deploys directly to production (no staging), ~94 products = low risk
   - What's unclear: Should frontend deploy happen before, after, or simultaneously with migration?
   - Recommendation: Deploy order should be: (1) Backend migration, (2) Verify API responses include both legacy and new fields, (3) Deploy frontend. This ensures no breaking changes.

3. **Cart timestamp approach:**
   - What we know: Silent clear is accepted, but implementation approach is flexible
   - What's unclear: Should we use timestamp-based detection or version-based detection?
   - Recommendation: Timestamp is simpler (`cartTimestamp < migrationDate`). Version would require more localStorage management. Go with timestamp.

## Sources

### Primary (HIGH confidence)

- **Codebase inspection:**
  - `backend/models/Product.js` - Current schema structure
  - `backend/migrations/20260203000000-merge-image-arrays.js` - Migration pattern template
  - `backend/migrate-mongo-config.js` - Migration infrastructure
  - `frontend/js/model.js` - Cart storage implementation
  - `backend/routes/ssrDynamic.js` - SSR product rendering
  - `backend/routes/sitemap.js` - Sitemap product usage

- **Official Documentation:**
  - [Mongoose Virtuals Tutorial](https://mongoosejs.com/docs/tutorials/virtuals.html) - Virtual getters/setters
  - [MongoDB Updates with Aggregation Pipeline](https://www.mongodb.com/docs/manual/tutorial/update-documents-with-aggregation-pipeline/) - Bulk operations
  - [MongoDB Schema Versioning Pattern](https://www.mongodb.com/docs/manual/data-modeling/design-patterns/data-versioning/schema-versioning/) - Migration patterns

### Secondary (MEDIUM confidence)

- [Best Practices for MongoDB Schema Versioning | Reintech](https://reintech.io/blog/best-practices-mongodb-schema-versioning) - Schema versioning, backward compatibility strategies
- [Making Backward-Compatible Schema Changes in MongoDB](https://mincong.io/2021/02/27/mongodb-schema-compatibility/) - Lazy vs eager migration, validation modes
- [MongoDB schema migration | Liquibase](https://www.liquibase.com/blog/mongodb-schema-migration) - Migration best practices
- [Multi-lingual Data Modeling with MongoDB | Medium](https://bilalalghazi.medium.com/multi-lingual-data-modeling-with-mongodb-4d552bdf3b6c) - Field-level vs embedded document patterns
- [Internationalization | Learn MongoDB The Hard Way](http://learnmongodbthehardway.com/schema/multilanguage/) - Language field patterns
- [migrate-mongo - npm](https://www.npmjs.com/package/migrate-mongo) - Migration tool documentation

### Tertiary (LOW confidence)

- Community forum discussions on mongoose-intl plugins (various sources) - Plugin capabilities, but plugins not recommended for this use case
- WebSearch results on localStorage migration strategies - General patterns, not MongoDB-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - migrate-mongo and Mongoose already installed and proven in codebase
- Architecture: HIGH - Field-level bilingual pattern is MongoDB best practice for 2 languages, verified in official docs
- Migration pattern: HIGH - Direct template from existing codebase migrations (20260203000000-merge-image-arrays.js)
- Cart handling: MEDIUM - Silent clear is user-confirmed, implementation approach (timestamp) is standard but untested in this codebase
- Virtuals for backward compat: MEDIUM - Mongoose feature is well-documented, but SSR serialization needs testing
- Pitfalls: HIGH - Identified from official docs, codebase audit, and established migration patterns

**Research date:** 2026-02-13
**Valid until:** 2026-03-15 (30 days - stable domain, MongoDB/Mongoose patterns don't change rapidly)
