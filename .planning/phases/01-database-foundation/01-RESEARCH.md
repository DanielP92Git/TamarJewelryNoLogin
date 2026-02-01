# Phase 1: Database Foundation - Research

**Researched:** 2026-02-01
**Domain:** Mongoose/MongoDB schema design, validation, and unique constraint enforcement
**Confidence:** HIGH

## Summary

This phase implements SKU field management at the database and server validation layer using Mongoose 8.6.1 (current project version) with MongoDB. The standard approach combines sparse unique indexes for database-level enforcement with custom validators and middleware for application-level validation and user-friendly error handling.

Key findings: Mongoose's `unique` option is not a validator but an index helper. Sparse unique indexes allow multiple documents without SKU while preventing duplicates when present. Built-in string transformations (uppercase, trim) handle normalization. Custom validators with regex patterns enforce format rules. E11000 duplicate key errors require parsing and transformation into user-friendly messages.

**Primary recommendation:** Use sparse unique index at schema level for database enforcement, pre-save custom validators for format validation, and Express error handling middleware to transform E11000 errors into structured validation responses.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| mongoose | 8.6.1 | MongoDB ODM | Project already uses this version; provides schema validation, middleware hooks, and index management |
| mongodb | (via mongoose) | Database driver | Underlying driver for MongoDB operations; sparse unique index support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| express | (current) | Web framework | Error handling middleware for transforming database errors into API responses |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom uniqueness check | mongoose-unique-validator plugin | Plugin adds pre-save validation but requires npm dependency; custom approach offers more control and no external deps |
| Manual error parsing | mongoose-beautiful-unique-validation | Plugin auto-converts E11000 to validation errors but adds dependency; manual parsing is lightweight and sufficient for single field |

**Installation:**
No additional packages required - using existing Mongoose 8.6.1 installation.

## Architecture Patterns

### Recommended Schema Structure
```javascript
// backend/models/Product.js
const ProductSchema = new mongoose.Schema({
  // ... existing fields ...

  sku: {
    type: String,
    uppercase: true,        // Auto-transform to uppercase
    trim: true,             // Auto-trim whitespace
    sparse: true,           // Allow multiple docs without SKU
    unique: true,           // Prevent duplicates when present
    minLength: 2,           // Minimum length validation
    maxLength: 7,           // Maximum length validation
    validate: {             // Custom format validator
      validator: function(v) {
        // Only validate if SKU is provided (optional for existing products)
        if (!v) return true;
        return /^[A-Z0-9]+$/.test(v);
      },
      message: 'SKU must contain only uppercase letters and numbers (A-Z, 0-9)'
    }
  }
});

// Create sparse unique index (done automatically by Mongoose based on schema)
ProductSchema.index({ sku: 1 }, { unique: true, sparse: true });
```

### Pattern 1: Normalization Order
**What:** Transform data before validation, validate format, then check uniqueness
**When to use:** All SKU operations (create, update)
**Implementation order:**
1. Mongoose automatic transformations run first (trim, uppercase)
2. Built-in validators run (minLength, maxLength)
3. Custom validators run (regex pattern match)
4. Database uniqueness check happens on save (via unique index)

**Example:**
```javascript
// Input: "  abc123  " (lowercase with whitespace)
// After trim: "abc123"
// After uppercase: "ABC123"
// After validation: passes regex /^[A-Z0-9]+$/
// On save: checks unique index
```

### Pattern 2: Conditional Validation for New vs Existing Products
**What:** Require SKU for new products, optional for existing products without SKU
**When to use:** Product creation and update operations
**Example:**
```javascript
// Pre-save middleware for conditional requirement
ProductSchema.pre('save', function(next) {
  // Check if this is a new product (not yet saved to DB)
  if (this.isNew) {
    // New product must have SKU
    if (!this.sku || this.sku.trim() === '') {
      const error = new Error('SKU is required for new products');
      error.name = 'ValidationError';
      return next(error);
    }
  }
  next();
});
```

### Pattern 3: Edit Operation Self-Exclusion
**What:** MongoDB automatically excludes the document being updated from uniqueness checks when updating by _id
**When to use:** Product update operations
**How it works:** When using `findByIdAndUpdate()` or `save()` on an existing document, MongoDB's unique index naturally excludes the current document from the duplicate check. No special handling needed.

**Example:**
```javascript
// Updating product with id=123, SKU="ABC123" to new SKU="XYZ789"
// MongoDB checks: Is "XYZ789" used by any product WHERE id != 123?
// This happens automatically - no code changes needed

// Edge case: Updating SKU to its current value
// Product id=123 has SKU="ABC123"
// Update: set SKU="ABC123" (same value)
// Result: No duplicate error because it's the same document
```

### Pattern 4: E11000 Error Transformation
**What:** Parse MongoDB duplicate key errors and return user-friendly messages
**When to use:** Express error handling middleware or try-catch in route handlers
**Example:**
```javascript
// Source: Current project pattern from backend/index.js
// In route handler catch block:
try {
  await product.save();
  res.json({ success: true, id: product.id });
} catch (error) {
  // Check if it's a duplicate key error
  if (error.code === 11000 || error.name === 'MongoServerError') {
    // Extract field and value from error
    const field = Object.keys(error.keyPattern || {})[0];
    const value = error.keyValue?.[field];

    // Find the conflicting product to show its name
    const existingProduct = await Product.findOne({ [field]: value });

    return res.status(409).json({
      success: false,
      error: 'validation',
      field: field,
      message: `SKU '${value}' is already used by ${existingProduct?.name || 'another product'}. Please choose a different SKU.`
    });
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'validation',
      details: Object.values(error.errors).map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Generic error fallback
  res.status(500).json({
    success: false,
    error: 'Failed to save product',
    ...(process.env.NODE_ENV !== 'production' ? { message: error.message } : {})
  });
}
```

### Anti-Patterns to Avoid
- **Setting `default: null` on unique sparse field:** Mongoose/MongoDB treat explicit null as a value, potentially causing uniqueness violations. Omit default value instead.
- **Using `unique: true` without `sparse: true` on optional fields:** Would allow only one document without SKU field.
- **Checking uniqueness with `findOne()` before save:** Race condition - two simultaneous requests could both pass the check. Let database index handle enforcement.
- **Silently stripping invalid characters:** User decisions require rejection with error, not silent transformation. Be explicit about validation failures.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Uniqueness enforcement | Custom pre-save query checking for duplicates | MongoDB sparse unique index | Race conditions - two simultaneous saves could both pass check; database indexes are atomic |
| String normalization | Custom pre-save hook to trim and uppercase | Mongoose built-in `trim: true, uppercase: true` | Built-in transformations run before validation, well-tested, and declarative |
| Alphanumeric validation | Custom string parsing logic | Mongoose validator with regex `/^[A-Z0-9]+$/` | Validators integrate with error handling, support custom messages, run automatically |
| E11000 error detection | String matching on error message | Check `error.code === 11000` | Error messages vary by MongoDB version; error codes are stable |

**Key insight:** Mongoose provides declarative schema features specifically designed for this domain. Custom solutions introduce race conditions, inconsistent error handling, and bypass Mongoose's validation framework.

## Common Pitfalls

### Pitfall 1: Treating `unique` as a Validator
**What goes wrong:** Developers expect `unique: true` to trigger validation errors with the standard ValidationError structure.
**Why it happens:** Mongoose's `unique` is an index helper, not a validator. Duplicate violations throw MongoServerError (E11000) from the database, not ValidationError from Mongoose.
**How to avoid:**
- Understand that `unique` creates a database index, not a validation rule
- Handle E11000 errors separately from validation errors in catch blocks
- Use error.code === 11000 to detect duplicate key errors
**Warning signs:**
- Receiving MongoServerError instead of ValidationError for duplicates
- error.errors property is undefined for duplicate key violations
- Different error structure than other field validations

### Pitfall 2: Sparse Index Query Behavior
**What goes wrong:** Queries for products without SKU may not use the sparse index efficiently, causing performance issues.
**Why it happens:** Sparse indexes intentionally omit documents where the indexed field is missing/null. MongoDB might perform collection scan for `{ sku: null }` or `{ sku: { $exists: false } }` queries.
**How to avoid:**
- For finding products without SKU, use `{ sku: { $exists: false } }` or `{ sku: null }` but expect collection scan
- For performance-critical queries on SKU presence/absence, consider a separate boolean field `hasSku: true/false`
- Monitor query performance with explain() during testing
**Warning signs:**
- Slow queries when filtering products without SKU
- Collection scans in query explain() output for SKU null checks

### Pitfall 3: Validation Runs Before Save Only
**What goes wrong:** Calling `findByIdAndUpdate()` or `updateOne()` bypasses validators by default.
**Why it happens:** Mongoose validators are registered as pre('save') middleware. Update operations don't trigger save middleware unless explicitly configured.
**How to avoid:**
- Use `{ runValidators: true }` option with update operations
- Or fetch document, modify, and call save() to trigger full validation
- For SKU updates, prefer save() pattern to ensure all validation runs
**Warning signs:**
- Invalid SKU formats saved to database when using update methods
- Validation works on create but not on update
**Example:**
```javascript
// WRONG - bypasses validation
await Product.findByIdAndUpdate(id, { sku: 'invalid value!' });

// CORRECT - runs validators
await Product.findByIdAndUpdate(
  id,
  { sku: 'ABC123' },
  { runValidators: true, context: 'query' }
);

// ALSO CORRECT - triggers full validation
const product = await Product.findById(id);
product.sku = 'ABC123';
await product.save();
```

### Pitfall 4: Index Creation on Existing Collections
**What goes wrong:** Adding a unique index to an existing collection with duplicate values fails.
**Why it happens:** MongoDB cannot create a unique index if duplicates already exist in the collection.
**How to avoid:**
- Ensure all existing products have no SKU (or unique SKUs) before deploying schema change
- Use migration script to verify no duplicates before adding index
- Consider manual index creation with error handling rather than relying on Mongoose auto-creation
**Warning signs:**
- Index creation fails on deployment to production
- Error: "E11000 duplicate key error" during schema update
- Mongoose reports index creation failure in logs
**Resolution:**
```javascript
// Check for duplicates before adding index
const duplicates = await Product.aggregate([
  { $match: { sku: { $exists: true, $ne: null } } },
  { $group: { _id: '$sku', count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
]);

if (duplicates.length > 0) {
  console.error('Cannot create unique index - duplicates found:', duplicates);
  // Resolve duplicates before proceeding
}
```

### Pitfall 5: Mongoose 9 Migration Concerns (Future)
**What goes wrong:** Pre-save middleware breaks after upgrading to Mongoose 9.
**Why it happens:** Mongoose 9 removed `next()` parameter from pre-save hooks; requires async functions.
**How to avoid:**
- Current project uses Mongoose 8.6.1, so not immediate concern
- When upgrading, convert all pre-save middleware to async functions
- Remove `next()` parameter and return/throw instead
**Warning signs:**
- Planning to upgrade to Mongoose 9
- Using `next()` callback pattern in middleware
**Future-proof pattern:**
```javascript
// Mongoose 8 (current) - both patterns work
ProductSchema.pre('save', function(next) {
  // validation logic
  next();
});

// Mongoose 9 (future) - only async pattern works
ProductSchema.pre('save', async function() {
  // validation logic
  // no next() call needed
});
```

## Code Examples

Verified patterns from official sources:

### Sparse Unique Index on Optional Field
```javascript
// Source: https://www.mongodb.com/docs/manual/core/index-sparse/
// Allows multiple documents without SKU, prevents duplicates when present
const ProductSchema = new mongoose.Schema({
  sku: {
    type: String,
    sparse: true,
    unique: true
  }
});

// Explicit index definition (alternative approach)
ProductSchema.index({ sku: 1 }, { unique: true, sparse: true });
```

### Built-in String Transformations
```javascript
// Source: https://mongoosejs.com/docs/schematypes.html
const ProductSchema = new mongoose.Schema({
  sku: {
    type: String,
    uppercase: true,  // Calls .toUpperCase() automatically
    trim: true,       // Calls .trim() automatically
    minLength: 2,     // Validates minimum length
    maxLength: 7      // Validates maximum length
  }
});
```

### Custom Validator with Regex
```javascript
// Source: https://mongoosejs.com/docs/validation.html
const ProductSchema = new mongoose.Schema({
  sku: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty for optional field
        return /^[A-Z0-9]+$/.test(v);
      },
      message: props => `${props.value} is not a valid SKU format. Use only A-Z and 0-9.`
    }
  }
});
```

### Conditional Required Validation (Pre-save Middleware)
```javascript
// Source: https://mongoosejs.com/docs/validation.html
// Require SKU for new products only
ProductSchema.pre('save', function(next) {
  if (this.isNew && (!this.sku || this.sku.trim() === '')) {
    const error = new Error('SKU is required for new products');
    error.name = 'ValidationError';
    return next(error);
  }
  next();
});
```

### E11000 Error Detection and Parsing
```javascript
// Source: Community best practices + current project pattern
try {
  await product.save();
} catch (error) {
  // Detect duplicate key error
  if (error.code === 11000 || error.name === 'MongoServerError') {
    // Parse error details
    const field = Object.keys(error.keyPattern || {})[0];
    const value = error.keyValue?.[field];

    // Look up conflicting product
    const existing = await Product.findOne({ [field]: value }).select('name');

    // Return user-friendly error
    return res.status(409).json({
      success: false,
      error: 'validation',
      message: `SKU '${value}' is already used by ${existing?.name || 'another product'}. Please choose a different SKU.`
    });
  }
  // ... handle other errors
}
```

### Update with Validators Enabled
```javascript
// Source: https://mongoosejs.com/docs/validation.html
// Update operations don't run validators by default
await Product.findByIdAndUpdate(
  productId,
  { sku: newSku },
  {
    runValidators: true,  // Enable validation
    context: 'query',     // Set context for validator functions
    new: true             // Return updated document
  }
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Callback-based middleware with `next()` | Async/await middleware (required in Mongoose 9) | Mongoose 9.0.0 (Nov 2025) | Project uses Mongoose 8.6.1 - no immediate impact, but async pattern is future-proof |
| `background: true` for index creation | Automatic foreground index creation | MongoDB 4.2 / Mongoose 9.0.0 | MongoDB deprecated background option; Mongoose 9 removed it entirely |
| Manual uniqueness checks with `findOne()` | Database-level unique indexes | Long-standing best practice | Unique indexes are atomic and prevent race conditions |
| String error message parsing for E11000 | Check `error.code === 11000` | Stable approach | Error messages vary by version; codes are stable |

**Deprecated/outdated:**
- **background option for indexes:** MongoDB 4.2+ deprecated, Mongoose 9 removed. Indexes now created in foreground (faster and safer).
- **Callback-based pre/post middleware:** Mongoose 9 requires async functions or promises. Current project can use either; async is future-proof.

## Open Questions

Things that couldn't be fully resolved:

1. **Index Creation Timing in Production**
   - What we know: Mongoose auto-creates indexes on model compilation; can be slow on large collections
   - What's unclear: Best practice for deploying index changes to production without downtime
   - Recommendation: For initial deployment (small collection), auto-index is fine. For future index changes, consider manual index creation with `db.collection.createIndex()` in maintenance window or use `autoIndex: false` in production and manage indexes separately.

2. **Bulk Update Error Handling Strategy**
   - What we know: User decisions specify partial success model (apply valid SKUs, report failures separately)
   - What's unclear: Optimal transaction/rollback strategy for bulk operations in MongoDB (which doesn't support multi-document transactions in all deployment types)
   - Recommendation: Implement one-by-one update approach with individual try-catch blocks, collecting successes and failures separately. Avoid transaction complexity for this use case.

## Sources

### Primary (HIGH confidence)
- [Mongoose v9.1.5 Validation Documentation](https://mongoosejs.com/docs/validation.html) - Validation timing, custom validators, error handling
- [Mongoose v9.1.5 SchemaTypes Documentation](https://mongoosejs.com/docs/schematypes.html) - String transformations (uppercase, trim, validators)
- [MongoDB Sparse Indexes Documentation](https://www.mongodb.com/docs/manual/core/index-sparse/) - Sparse index behavior with null/undefined values
- Current project codebase: backend/models/Product.js, backend/index.js - Existing error handling patterns

### Secondary (MEDIUM confidence)
- [Mongoose Migration Guide to v9](https://mongoosejs.com/docs/migrating_to_9.html) - Breaking changes for future upgrades
- [REST API Error Handling Best Practices - Baeldung](https://www.baeldung.com/rest-api-error-handling-best-practices) - HTTP status codes and error formats
- [Understanding Unique in Mongoose - Mastering JS](https://masteringjs.io/tutorials/mongoose/unique) - Unique vs validator distinction
- [Express Error Handling Documentation](https://expressjs.com/en/guide/error-handling.html) - Error middleware patterns

### Tertiary (LOW confidence)
- Various Medium articles on E11000 error handling - Practical examples but not authoritative
- Community forum discussions on sparse indexes - Real-world usage but unverified
- Blog posts on Mongoose best practices - Helpful context but require verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing Mongoose 8.6.1, verified via package.json, official docs confirm features
- Architecture: HIGH - All patterns verified with official Mongoose and MongoDB documentation
- Pitfalls: HIGH - Documented in official migration guides and common MongoDB issues; E11000 parsing verified in current codebase

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - Mongoose and MongoDB are stable, major changes unlikely)

**Notes:**
- Project uses Mongoose 8.6.1 (confirmed in backend/package.json)
- Mongoose 9 released Nov 2025 but not yet adopted - async middleware pattern recommended for future-proofing
- Current backend uses monolithic index.js with try-catch error handling - patterns can be adapted directly
- No additional npm packages needed for this phase
