# Stack Research: SKU Management

**Domain:** E-commerce Product Information Management (SKU fields)
**Researched:** 2026-02-01
**Confidence:** HIGH

## Executive Summary

Adding SKU (Stock Keeping Unit) management to the existing Tamar Kfir Jewelry e-commerce platform requires **zero new dependencies**. The current stack (Mongoose 8.6.1 + MongoDB + vanilla JavaScript frontend) already provides all necessary primitives. The implementation centers on schema patterns for unique-but-optional fields and error handling for duplicate key violations.

**Key Finding:** Use Mongoose's built-in `sparse: true` + `unique: true` index pattern for backwards compatibility with existing products that lack SKUs.

---

## Recommended Stack

### Core Technologies (No Changes)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Mongoose** | 8.6.1 (current) | ODM with schema validation and indexing | Built-in `sparse` + `unique` index support handles optional-but-unique fields without race conditions. No upgrade needed. |
| **MongoDB** | 5.0+ (implied by Mongoose 8.x) | Document database | Native sparse unique index support (enhanced in 5.0+ to allow multiple sparse/non-sparse indexes on same key pattern). |
| **Express** | 4.20.0 (current) | Backend API framework | Existing error handling middleware can catch E11000 duplicate key errors. |
| **Vanilla JavaScript** | ES6+ | Frontend forms | Existing fetch API and form handling patterns work for SKU input field. |

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| ~~mongoose-unique-validator~~ | N/A | Convert E11000 errors to validation errors | **NOT RECOMMENDED** - Adds dependency for marginal DX benefit. Handle E11000 in existing error middleware instead. | HIGH |
| ~~mongoose-beautiful-unique-validation~~ | N/A | Prettier duplicate error messages | **NOT RECOMMENDED** - Same rationale. Server-side error handling + frontend validation is cleaner. | HIGH |

**Verdict:** No new npm packages required.

---

## Installation

```bash
# NO NEW DEPENDENCIES NEEDED
# Existing stack already supports SKU management
```

---

## Mongoose Schema Patterns for SKU Management

### Pattern 1: Sparse Unique Index (RECOMMENDED)

**Confidence:** HIGH (Official MongoDB/Mongoose documentation)

```javascript
// backend/models/Product.js
const ProductSchema = new mongoose.Schema({
  // ... existing fields ...
  sku: {
    type: String,
    sparse: true,    // Allow multiple docs without SKU (backwards compat)
    unique: true,    // Enforce uniqueness for docs that DO have SKU
    uppercase: true, // Normalize to uppercase for consistency
    trim: true       // Remove whitespace
  },
});
```

**Why this works:**
- **Backwards compatibility:** Existing products without `sku` field continue working. MongoDB's sparse index excludes documents missing the field from the index entirely.
- **Uniqueness enforcement:** New products with SKUs cannot duplicate existing SKUs (database-level constraint via unique index).
- **No race conditions:** Unlike custom async validators, MongoDB's unique index is atomic at the database level.

**Sources:**
- [MongoDB Sparse Indexes Documentation](https://www.mongodb.com/docs/manual/core/index-sparse/) — "An index that is both sparse and unique prevents a collection from having documents with duplicate values for a field but allows multiple documents that omit the key."
- [Mongoose SchemaTypes Documentation](https://mongoosejs.com/docs/schematypes.html) — Sparse and unique options verified

### Pattern 2: Required for New Products (Application Layer)

**Confidence:** MEDIUM (Best practice from e-commerce platforms)

While the database allows optional SKUs (backwards compatibility), enforce SKUs for **new** products at the application layer:

```javascript
// In POST /addproduct endpoint (backend/index.js)
app.post('/addproduct', async (req, res) => {
  const { sku, name, category, /* ...other fields */ } = req.body;

  // Application-level requirement for new products
  if (!sku || sku.trim() === '') {
    return res.status(400).json({
      error: 'SKU is required for new products'
    });
  }

  // SKU format validation (6-12 alphanumeric chars, optional dashes)
  const skuPattern = /^[A-Z0-9][A-Z0-9-]{4,10}[A-Z0-9]$/;
  if (!skuPattern.test(sku.toUpperCase())) {
    return res.status(400).json({
      error: 'SKU must be 6-12 alphanumeric characters (dashes allowed)'
    });
  }

  try {
    const product = new Product({ sku, name, category, /* ... */ });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    // Handle E11000 duplicate key error
    if (error.code === 11000 && error.keyPattern?.sku) {
      return res.status(409).json({
        error: `SKU "${sku}" already exists`
      });
    }
    throw error; // Re-throw other errors
  }
});
```

**Why application-level validation:**
- Better error messages than raw E11000 errors
- Format validation (alphanumeric, length) happens before DB round-trip
- Frontend can mirror validation for instant feedback

**Sources:**
- [Mongoose Validation Documentation](https://mongoosejs.com/docs/validation.html) — "The unique option for schemas is not a validator. It's a convenient helper for building MongoDB unique indexes."
- [E-commerce SKU Best Practices](https://www.ablestar.com/sku-best-practices/) — Format recommendations (6-12 characters, alphanumeric)

---

## Validation Strategy

### Three-Layer Validation Approach

| Layer | Mechanism | Purpose | Handles |
|-------|-----------|---------|---------|
| **1. Frontend** | HTML5 `pattern` attribute + JS | Instant user feedback | Format errors (length, characters) |
| **2. Backend (Express)** | Pre-save validation in route handler | Business logic + security | Format + required field enforcement |
| **3. Database (MongoDB)** | Sparse unique index | Data integrity | Duplicate SKU prevention (race-safe) |

**Why three layers:**
- **Frontend:** Best UX (no round-trip)
- **Backend:** Security (never trust client)
- **Database:** Atomicity (prevents race conditions even with concurrent requests)

### Handling E11000 Duplicate Key Errors

**Confidence:** HIGH (MongoDB error codes are stable)

```javascript
// Centralized error handler in Express middleware
app.use((error, req, res, next) => {
  // E11000 duplicate key error
  if (error.name === 'MongoServerError' && error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    const value = error.keyValue[field];
    return res.status(409).json({
      error: `Duplicate ${field}: "${value}" already exists`,
      field,
      value
    });
  }

  // Other errors
  res.status(500).json({ error: error.message });
});
```

**Sources:**
- [Handling Mongoose E11000 Errors](https://dev.to/ahmedmagdy11/handling-mongoose-dublication-errors-3f6n) — Error code 11000 handling pattern
- [Sling Academy: E11000 Troubleshooting](https://www.slingacademy.com/article/fixing-mongoose-e11000-duplicate-key-error-collection/) — keyPattern/keyValue extraction

---

## SKU Format Best Practices

**Confidence:** MEDIUM (Industry standards, not technical requirements)

Based on 2026 e-commerce platform guidance (Shopify, Ecwid, Lightspeed):

### Format Specification

```
Pattern: /^[A-Z0-9][A-Z0-9-]{4,10}[A-Z0-9]$/
Length: 6-12 characters
Allowed: Letters (A-Z), numbers (0-9), dashes (-)
Forbidden: Spaces, special chars (!@#$%), lowercase (normalize to uppercase)
```

**Examples:**
- ✅ `NECK-001` (category prefix + sequence)
- ✅ `BR-GOLD-42` (category + material + ID)
- ✅ `SHL-2024-A` (category + year + variant)
- ❌ `n001` (too short)
- ❌ `NECKLACE-GOLD-DIAMOND-2024` (too long, >12 chars)
- ❌ `NECK 001` (contains space)

### Why These Rules

| Rule | Rationale |
|------|-----------|
| **6-12 characters** | Balance between descriptiveness and brevity. Typical industry standard. |
| **Alphanumeric only** | Prevents confusion with UPC/EAN codes (numbers-only) or descriptions (letters-only). |
| **Avoid 0/O and 1/I** | Reduces manual entry errors if SKUs are read from labels. |
| **Uppercase normalization** | Case-insensitive comparison (`sku.toUpperCase()` in schema) prevents duplicates like "neck-001" vs "NECK-001". |
| **No special chars** | Simplifies URL encoding, CSV exports, barcode integration. Dashes allowed for readability. |

**Sources:**
- [Shopify SKU Guide 2026](https://www.shopify.com/blog/what-is-a-stock-keeping-unit) — Alphanumeric format recommendation
- [Ecwid SKU Formats](https://support.ecwid.com/hc/en-us/articles/360011125640-Understanding-SKU-formats) — Length and character guidance
- [Ablestar SKU Best Practices](https://www.ablestar.com/sku-best-practices/) — Avoid special characters

---

## Backwards Compatibility Strategy

### Challenge

Existing products in MongoDB lack `sku` field. Adding a required unique field breaks:
1. Existing product updates (PUT /editproduct/:id)
2. Database queries assuming all products have SKUs

### Solution: Sparse Index + Optional Field

**Confidence:** HIGH (MongoDB 5.0+ feature)

```javascript
// Schema allows missing SKU
sku: { type: String, sparse: true, unique: true }

// Existing products (no SKU field)
{ _id: 1, name: "Gold Ring", category: "rings" }  // ✅ Valid

// New products (with SKU)
{ _id: 2, name: "Silver Ring", sku: "RING-001" }  // ✅ Valid

// Duplicate SKU attempt
{ _id: 3, name: "Bronze Ring", sku: "RING-001" }  // ❌ E11000 error
```

**Migration not required:** No data migration script needed. Products without SKUs continue functioning.

**Gradual adoption:** Admin can add SKUs to existing products via Edit Product form. Once added, SKU becomes immutable (or editable with duplicate check).

**Sources:**
- [MongoDB Sparse Indexes](https://www.mongodb.com/docs/manual/core/index-sparse/) — Backwards compatibility behavior
- [Mongoose Schema Migration Guide](https://www.slingacademy.com/article/mongoose-how-to-migrate-data-after-changing-schema/) — Optional field addition patterns

---

## Frontend Form Handling

**Confidence:** HIGH (Uses existing patterns from codebase)

The admin dashboard already uses vanilla JavaScript + fetch API for product forms. SKU input follows the same pattern:

```javascript
// In loadAddProductsPage() markup (admin/BisliView.js)
`
<div class="field">
  <div class="label">SKU <span class="required">*</span></div>
  <input
    class="input"
    type="text"
    name="sku"
    id="sku"
    placeholder="e.g. NECK-001"
    pattern="[A-Z0-9-]{6,12}"
    maxlength="12"
    required
    style="text-transform: uppercase;"
  />
  <div class="help">
    6-12 alphanumeric characters (dashes allowed). Must be unique.
  </div>
</div>
`
```

**Existing patterns reused:**
- HTML5 validation (`pattern`, `required`, `maxlength`)
- CSS uppercase transform (`text-transform: uppercase`)
- Fetch API for POST/PUT (already in `addProductHandler()`)

**Error display:** E11000 errors returned from backend show in existing alert/toast UI.

---

## What NOT to Use

| Avoid | Why | Use Instead | Confidence |
|-------|-----|-------------|------------|
| **mongoose-unique-validator** | Adds npm dependency for error handling that Express middleware can do. Plugin doesn't prevent race conditions anyway. | Express error handler catching `error.code === 11000` | HIGH |
| **Custom async validators** | Race condition: two concurrent requests can both validate successfully, then both insert (one fails with E11000). Database index is atomic. | Mongoose `unique: true` + Express error handler | HIGH |
| **required: true in schema** | Breaks existing products without SKU. Would require data migration. | `sparse: true` + application-level validation for new products | HIGH |
| **Auto-generated SKUs** | Defeats purpose of human-readable product identifiers. Admin should control SKU format. | Manual SKU entry with format validation | MEDIUM |
| **UUIDs as SKUs** | Too long (36 chars), not human-readable, defeats SKU purpose (quick visual identification). | Semantic alphanumeric format (category + sequence) | MEDIUM |

**Sources:**
- [mongoose-unique-validator GitHub Issues](https://github.com/mongoose-unique-validator/mongoose-unique-validator) — Plugin maintainers note race conditions still possible
- [Mongoose Validation Docs](https://mongoosejs.com/docs/validation.html) — "unique option is not a validator"

---

## Multi-Language Considerations

**Confidence:** MEDIUM (Based on project context)

The platform supports English/Hebrew UI. SKU field implications:

| Aspect | Recommendation |
|--------|----------------|
| **SKU values** | Always ASCII (A-Z, 0-9, dash). Never Hebrew characters. SKUs are internal identifiers, not user-facing. |
| **Form label** | Translate "SKU" label via existing locale system (`eng`/`heb` keys). Hebrew: `מק"ט` (maKaT - standard Hebrew abbreviation). |
| **Validation messages** | Return English error messages from API (easier to debug). Frontend translates for display. |
| **Admin dashboard** | SKU input field remains left-to-right (LTR) even in Hebrew UI mode (`dir="ltr"` on input). |

**Implementation:**
```javascript
// Frontend locale strings (if needed)
const SKU_LABELS = {
  eng: 'SKU',
  heb: 'מק"ט'
};
```

**No backend changes:** SKU storage/validation logic is locale-agnostic.

---

## Database Index Creation

**Confidence:** HIGH (Mongoose handles this automatically)

### Automatic Index Creation (Development)

Mongoose creates indexes automatically on schema initialization when `autoIndex: true` (default):

```javascript
// No manual action needed - Mongoose creates sparse unique index on first run
const ProductSchema = new mongoose.Schema({
  sku: { type: String, sparse: true, unique: true }
});
```

**First app startup after schema change:**
```
Mongoose: products.createIndex({ sku: 1 }, { unique: true, sparse: true })
```

### Manual Index Creation (Production)

**Best practice:** Disable `autoIndex` in production, create indexes manually.

```bash
# MongoDB shell or Atlas UI
db.products.createIndex({ sku: 1 }, { unique: true, sparse: true })
```

**Why manual in production:**
- Auto-indexing blocks writes during creation on large collections
- Allows control over index build timing (low-traffic window)

**Migration safety:** Creating sparse unique index on existing collection (without SKUs) succeeds immediately—no conflicts because all existing docs lack the field.

**Sources:**
- [Mongoose Index Documentation](https://mongoosejs.com/docs/guide.html#indexes) — autoIndex option
- [MongoDB Index Management Best Practices](https://www.mongodb.com/resources/products/fundamentals/mongodb-operations-best-practices) — Production index strategies

---

## Testing Strategy

**Confidence:** HIGH (Standard test scenarios)

### Test Cases for SKU Validation

| Test Case | Expected Result | Layer |
|-----------|----------------|-------|
| Add product with valid SKU "NECK-001" | Success (201 Created) | Backend |
| Add product with duplicate SKU "NECK-001" | 409 Conflict with E11000 message | Database |
| Add product without SKU | 400 Bad Request ("SKU required") | Backend |
| Add product with invalid SKU "abc" | 400 Bad Request (format error) | Backend |
| Add product with SKU "NECKLACE-GOLD-DIAMOND-2024" | 400 Bad Request (too long) | Backend |
| Edit existing product (no SKU) without adding SKU | Success (200 OK) | Backend |
| Edit existing product, add SKU "BR-001" | Success (200 OK) | Backend |
| Frontend form input "neck-001" | Auto-uppercase to "NECK-001" | Frontend |

### Manual Testing Checklist

```bash
# 1. Add product with SKU
curl -X POST http://localhost:4000/addproduct \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Ring","category":"rings","sku":"RING-001","ils_price":100}'

# 2. Attempt duplicate SKU (should fail)
curl -X POST http://localhost:4000/addproduct \
  -H "Content-Type: application/json" \
  -d '{"name":"Another Ring","category":"rings","sku":"RING-001","ils_price":200}'

# 3. Verify E11000 error message includes SKU value
# Expected: {"error":"Duplicate sku: \"RING-001\" already exists"}
```

---

## Version Compatibility Notes

| Package | Current Version | SKU Feature Requirements | Notes |
|---------|-----------------|--------------------------|-------|
| Mongoose | 8.6.1 | ≥5.0 (sparse unique indexes stable) | ✅ Compatible. Mongoose 8 released Nov 2025 with no breaking changes affecting this feature. |
| MongoDB | 5.0+ (implied) | ≥4.2 (sparse unique stable), 5.0+ ideal | ✅ Sparse unique index enhancements in 5.0. Background index option deprecated in 4.2 (irrelevant for this feature). |
| Node.js | 18+ (implied by Express 4.20) | Any LTS version | ✅ No version-specific requirements. |

**No upgrades required.**

**Sources:**
- [Mongoose 9.1.5 Changelog](https://github.com/Automattic/mongoose/blob/master/CHANGELOG.md) — Mongoose 8→9 breaking changes (none affect sparse/unique)
- [Mongoose Version Support](https://mongoosejs.com/docs/version-support.html) — Mongoose 8 supported until Feb 2026

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative | Confidence |
|-------------|-------------|-------------------------|------------|
| **Sparse unique index** | Unique index + manual null handling | Never. Sparse is MongoDB's built-in solution for optional unique fields. | HIGH |
| **Application-layer validation** | mongoose-unique-validator plugin | If team strongly prefers Mongoose ValidationErrors over E11000 handling. Adds dependency. | MEDIUM |
| **Manual SKU entry** | Auto-generated sequential SKUs (e.g., next available `NECK-XXX`) | For high-volume catalogs where manual entry is error-prone. Not needed for handmade jewelry (low SKU count). | LOW |
| **Uppercase normalization (schema)** | Case-sensitive SKUs | Never. "NECK-001" and "neck-001" should be the same SKU. | HIGH |

---

## Summary: Zero-Dependency Solution

**The complete SKU management feature requires:**

✅ **Schema change:** Add `sku: { type: String, sparse: true, unique: true, uppercase: true, trim: true }`
✅ **Backend validation:** 15 lines in POST/PUT routes (format check + E11000 handler)
✅ **Frontend form field:** One `<input>` with HTML5 validation
✅ **Index creation:** Automatic (dev) or manual MongoDB command (prod)

❌ **No new npm packages**
❌ **No data migration**
❌ **No third-party services**

**Implementation time estimate:** 2-4 hours (schema + backend + frontend + testing)

---

## Sources

### Official Documentation (HIGH Confidence)
- [Mongoose SchemaTypes](https://mongoosejs.com/docs/schematypes.html) — Sparse and unique options
- [Mongoose Validation](https://mongoosejs.com/docs/validation.html) — Custom validators and unique clarification
- [MongoDB Sparse Indexes](https://www.mongodb.com/docs/manual/core/index-sparse/) — Backwards compatibility behavior
- [MongoDB Unique Indexes](https://www.mongodb.com/docs/manual/core/index-unique/) — Uniqueness enforcement

### Community Best Practices (MEDIUM Confidence)
- [Handling Mongoose E11000 Errors (Dev.to)](https://dev.to/ahmedmagdy11/handling-mongoose-dublication-errors-3f6n) — Error code handling
- [Sling Academy: E11000 Troubleshooting](https://www.slingacademy.com/article/fixing-mongoose-e11000-duplicate-key-error-collection/) — keyPattern extraction
- [Mongoose Schema Migration Guide](https://www.slingacademy.com/article/mongoose-how-to-migrate-data-after-changing-schema/) — Adding optional fields

### Industry Standards (MEDIUM Confidence)
- [Shopify: What Is a SKU (2026 Guide)](https://www.shopify.com/blog/what-is-a-stock-keeping-unit) — Format best practices
- [Ecwid: Understanding SKU Formats](https://support.ecwid.com/hc/en-us/articles/360011125640-Understanding-SKU-formats) — Length guidelines
- [Ablestar: SKU Best Practices for E-commerce](https://www.ablestar.com/sku-best-practices/) — Character restrictions
- [Lightspeed: SKU Numbers Explained](https://www.lightspeedhq.com/blog/sku-numbers/) — Avoid special characters

### Version-Specific
- [Mongoose Changelog](https://github.com/Automattic/mongoose/blob/master/CHANGELOG.md) — Mongoose 8/9 changes
- [Mongoose Version Support](https://mongoosejs.com/docs/version-support.html) — Support timeline

---

**End of Stack Research**
*Researched: 2026-02-01*
*For: SKU Management Feature (Tamar Kfir Jewelry E-commerce)*
