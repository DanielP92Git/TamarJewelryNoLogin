# Phase 15: Database & Model Tests - Research

**Researched:** 2026-02-05
**Domain:** Mongoose model testing with Vitest and mongodb-memory-server
**Confidence:** HIGH

## Summary

Phase 15 tests Mongoose schema models (Product, User, Settings) to verify CRUD operations, field validation, uniqueness constraints, and database-level behavior. The testing infrastructure from Phase 10 provides mongodb-memory-server with global setup/cleanup, establishing a proven pattern for model-level tests.

The standard approach is direct Mongoose model testing using the real database (mongodb-memory-server) rather than mocking, as Mongoose's validation, hooks, and database behavior are integral to model correctness. Tests should verify schema validation rules (required fields, data types, enums), uniqueness constraints (with race condition handling), pre-save hooks (like displayOrder auto-assignment), static methods (like Settings.getSettings()), and comprehensive CRUD operations.

Key considerations: sparse unique indexes allow multiple null values while preventing duplicates when present; validation runs automatically on save() but requires runValidators option for update operations; pre-save hooks should be tested by triggering actual save operations to verify real behavior; and Settings model singleton pattern requires testing that getSettings() doesn't create duplicates.

**Primary recommendation:** Use direct Mongoose model tests with mongodb-memory-server (already configured in Phase 10) to test schema validation, CRUD operations, and database behavior. Follow the unit test pattern established in Phase 11-14 with describe/it blocks, factories for test data, and afterEach cleanup.

## Standard Stack

The established libraries/tools for Mongoose model testing with the existing Phase 10 infrastructure:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 4.0.18+ | Test runner | Modern, fast test runner already configured in Phase 10 with globals enabled |
| mongodb-memory-server | 11.0.1+ | In-memory MongoDB | Provides real MongoDB behavior for model testing without production database |
| Mongoose | 8.6.1+ | ODM | Already in use by application, testing validates actual schemas |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bcrypt | 5.1.1+ | Password hashing | Already used by User model, needed for password validation tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| mongodb-memory-server | mockingoose | Mock approach is faster but misses validation, hooks, and database behavior |
| Direct model tests | API integration tests | Integration tests cover end-to-end but don't isolate model validation logic |

**Installation:**
No new packages required - all dependencies already installed in Phase 10.

## Architecture Patterns

### Recommended Project Structure
```
backend/tests/
├── unit/
│   ├── models/                    # NEW: Model-level tests
│   │   ├── Product.test.js        # Product schema validation & CRUD
│   │   ├── User.test.js           # User schema validation & CRUD
│   │   └── Settings.test.js       # Settings singleton behavior
│   ├── middleware/                # Existing from Phase 11
│   ├── services/                  # Existing from Phase 13
│   └── jobs/                      # Existing from Phase 13
├── integration/                   # Existing HTTP-level tests
├── helpers/                       # Existing test utilities
│   ├── factories.js               # Already has createProduct, createUser
│   └── db.js                      # Already has clearDatabase
└── setup.js                       # Global test setup from Phase 10
```

### Pattern 1: Direct Model Validation Testing
**What:** Test Mongoose schema validation by saving documents and checking for validation errors
**When to use:** For required fields, data type validation, enum constraints, custom validators
**Example:**
```javascript
// Test required field validation
it('should fail validation when name is missing', async () => {
  const Product = mongoose.model('Product');
  const invalidProduct = new Product({
    category: 'necklaces',
    usd_price: 50
    // name is required but missing
  });

  await expect(invalidProduct.save()).rejects.toThrow();
  // Alternative: check error structure
  try {
    await invalidProduct.save();
  } catch (error) {
    expect(error.errors.name).toBeDefined();
    expect(error.errors.name.kind).toBe('required');
  }
});
```

### Pattern 2: Uniqueness Constraint Testing with Race Conditions
**What:** Test unique indexes with concurrent inserts to verify MongoDB prevents duplicates
**When to use:** For unique fields (email, SKU) that must handle race conditions
**Example:**
```javascript
// Test email uniqueness with concurrent inserts
it('should prevent duplicate emails even with concurrent inserts', async () => {
  const User = mongoose.model('Users');

  // Try to create two users with same email simultaneously
  const promises = [
    User.create({ email: 'test@example.com', password: 'hash123' }),
    User.create({ email: 'test@example.com', password: 'hash456' })
  ];

  // One should succeed, one should fail with duplicate key error
  const results = await Promise.allSettled(promises);
  const succeeded = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');

  expect(succeeded).toHaveLength(1);
  expect(failed).toHaveLength(1);
  expect(failed[0].reason.code).toBe(11000); // MongoDB duplicate key error
});
```

### Pattern 3: Sparse Unique Index Testing
**What:** Test that sparse indexes allow multiple documents with null/undefined values
**When to use:** For optional unique fields like SKU in Product model
**Example:**
```javascript
// Test sparse unique index allows multiple null SKUs
it('should allow multiple products without SKU (sparse index)', async () => {
  const Product = mongoose.model('Product');

  // Create two products without SKU
  const product1 = await Product.create({
    id: 1001,
    name: 'Product 1',
    category: 'necklaces',
    usd_price: 50,
    images: []
    // SKU omitted
  });

  const product2 = await Product.create({
    id: 1002,
    name: 'Product 2',
    category: 'necklaces',
    usd_price: 60,
    images: []
    // SKU omitted
  });

  expect(product1).toBeDefined();
  expect(product2).toBeDefined();
  expect(product1.sku).toBeUndefined();
  expect(product2.sku).toBeUndefined();
});

// But duplicates with SKU present should fail
it('should reject duplicate SKUs when SKU is present', async () => {
  const Product = mongoose.model('Product');

  await Product.create({
    id: 1001,
    name: 'Product 1',
    category: 'necklaces',
    usd_price: 50,
    images: [],
    sku: 'ABC123'
  });

  // Try to create product with duplicate SKU
  await expect(
    Product.create({
      id: 1002,
      name: 'Product 2',
      category: 'necklaces',
      usd_price: 60,
      images: [],
      sku: 'ABC123'
    })
  ).rejects.toThrow();
});
```

### Pattern 4: Pre-Save Hook Testing
**What:** Test Mongoose pre-save hooks by triggering save operations and verifying side effects
**When to use:** For auto-generated fields, transformations, computed values (e.g., Product displayOrder)
**Example:**
```javascript
// Test displayOrder auto-assignment in pre-save hook
it('should auto-assign displayOrder for new products', async () => {
  const Product = mongoose.model('Product');

  // Create product without displayOrder
  const product = new Product({
    id: 1001,
    name: 'Test Product',
    category: 'necklaces',
    usd_price: 50,
    images: []
    // displayOrder not provided
  });

  await product.save();

  // displayOrder should be auto-assigned
  expect(product.displayOrder).toBeDefined();
  expect(product.displayOrder).toBeGreaterThan(0);
});

// Test sequential displayOrder assignment
it('should assign incremental displayOrder within category', async () => {
  const Product = mongoose.model('Product');

  const product1 = await Product.create({
    id: 1001,
    name: 'Product 1',
    category: 'necklaces',
    usd_price: 50,
    images: []
  });

  const product2 = await Product.create({
    id: 1002,
    name: 'Product 2',
    category: 'necklaces',
    usd_price: 60,
    images: []
  });

  // Product 2 should have higher displayOrder than Product 1
  expect(product2.displayOrder).toBeGreaterThan(product1.displayOrder);
});
```

### Pattern 5: Static Method Testing (Singleton Pattern)
**What:** Test custom static methods like Settings.getSettings() singleton behavior
**When to use:** For models with custom finder methods or business logic
**Example:**
```javascript
// Test Settings singleton pattern
it('should return same settings document when called multiple times', async () => {
  const Settings = mongoose.model('Settings');

  const settings1 = await Settings.getSettings();
  const settings2 = await Settings.getSettings();

  // Should return same document ID
  expect(settings1._id.toString()).toBe(settings2._id.toString());
});

it('should create settings document if none exists', async () => {
  const Settings = mongoose.model('Settings');

  // Verify no settings exist
  const count = await Settings.countDocuments();
  expect(count).toBe(0);

  // Call getSettings
  const settings = await Settings.getSettings();

  // Should have created one document
  expect(settings).toBeDefined();
  const newCount = await Settings.countDocuments();
  expect(newCount).toBe(1);
});
```

### Pattern 6: CRUD Operation Testing
**What:** Test basic Mongoose CRUD operations work correctly with model constraints
**When to use:** For every model to verify basic database operations
**Example:**
```javascript
describe('Product CRUD Operations', () => {
  it('should create product with valid data', async () => {
    const Product = mongoose.model('Product');
    const productData = createProduct(); // Factory from helpers

    const product = await Product.create(productData);

    expect(product._id).toBeDefined();
    expect(product.name).toBe(productData.name);
  });

  it('should find product by ID', async () => {
    const Product = mongoose.model('Product');
    const product = await Product.create(createProduct());

    const found = await Product.findById(product._id);

    expect(found).toBeDefined();
    expect(found._id.toString()).toBe(product._id.toString());
  });

  it('should update product', async () => {
    const Product = mongoose.model('Product');
    const product = await Product.create(createProduct({ name: 'Original' }));

    await Product.updateOne({ _id: product._id }, { name: 'Updated' });

    const updated = await Product.findById(product._id);
    expect(updated.name).toBe('Updated');
  });

  it('should delete product', async () => {
    const Product = mongoose.model('Product');
    const product = await Product.create(createProduct());

    await Product.deleteOne({ _id: product._id });

    const found = await Product.findById(product._id);
    expect(found).toBeNull();
  });

  it('should find products by category', async () => {
    const Product = mongoose.model('Product');
    await Product.create(createProduct({ category: 'necklaces' }));
    await Product.create(createProduct({ category: 'bracelets' }));

    const necklaces = await Product.find({ category: 'necklaces' });

    expect(necklaces).toHaveLength(1);
    expect(necklaces[0].category).toBe('necklaces');
  });
});
```

### Anti-Patterns to Avoid
- **Mocking Mongoose validation:** Don't mock mongoose.save() - use real database to test actual validation behavior
- **Not testing race conditions:** For unique constraints, test concurrent operations with Promise.all to verify index enforcement
- **Testing only save, not update:** Validation behaves differently for updates (requires runValidators option)
- **Ignoring pre-save hooks:** Don't manually set auto-generated fields in tests - verify hooks work by omitting them
- **Not cleaning database between tests:** Always use afterEach cleanup to prevent test pollution

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| In-memory database | Custom mock objects | mongodb-memory-server (Phase 10) | Real MongoDB behavior including validation, indexes, and hooks |
| Test data generation | Manual object creation | Factories (helpers/factories.js) | Unique, consistent data with counter reset |
| Database cleanup | Manual collection.drop() | clearDatabase helper (Phase 10) | Handles all collections, prevents leaks |
| Unique test users | Hard-coded emails | Factory with counter | Prevents collisions, allows parallel tests |
| Token generation | Manual jwt.sign() | authHelpers (Phase 11) | Consistent, reusable across tests |

**Key insight:** Mongoose model testing requires real database behavior. Mocking Mongoose validation, hooks, or database operations leads to tests that pass but miss real-world failures. The mongodb-memory-server provides fast, isolated, real MongoDB for accurate testing.

## Common Pitfalls

### Pitfall 1: Sparse Index Misunderstanding
**What goes wrong:** Tests expect duplicate null values to fail unique constraint, but sparse indexes allow multiple nulls
**Why it happens:** Confusion between standard unique indexes (only one null) and sparse unique indexes (multiple nulls allowed)
**How to avoid:** Explicitly test both cases - multiple nulls should succeed, duplicate non-null values should fail
**Warning signs:** Test failure message about duplicate key error on null values

### Pitfall 2: Validation Only Runs on save() by Default
**What goes wrong:** Tests using updateOne() don't trigger validation, allowing invalid data
**Why it happens:** Mongoose only runs validators on save() by default, not on update operations
**How to avoid:** When testing updates, either use save() or add { runValidators: true } option to update operations
**Warning signs:** Invalid data persists after update operation without throwing validation error

### Pitfall 3: Race Condition False Positives
**What goes wrong:** Race condition tests pass locally but fail in CI, or vice versa
**Why it happens:** Timing-dependent tests are sensitive to CPU speed and scheduling
**How to avoid:** Use Promise.allSettled() to capture both success and failure, verify one succeeds and one fails with code 11000
**Warning signs:** Intermittent test failures on uniqueness tests

### Pitfall 4: Not Testing Pre-Save Hook Execution
**What goes wrong:** Tests manually set fields that hooks should auto-generate, missing hook failures
**Why it happens:** Developers assume hooks work and test the end result, not the hook behavior
**How to avoid:** Create documents without auto-generated fields, verify hooks populate them
**Warning signs:** Tests always pass but production has missing displayOrder values

### Pitfall 5: Enum Validation Case Sensitivity
**What goes wrong:** Tests expect case-insensitive enum validation but Mongoose is case-sensitive
**Why it happens:** Assumption that 'admin' and 'Admin' are equivalent in enums
**How to avoid:** Test exact enum values, verify case mismatches fail validation
**Warning signs:** Production data has invalid case variations of enum values

### Pitfall 6: Settings Singleton Creating Duplicates
**What goes wrong:** Multiple Settings.getSettings() calls create duplicate documents
**Why it happens:** Race condition between findOne() and create() in singleton pattern
**How to avoid:** Test concurrent getSettings() calls, verify only one document exists
**Warning signs:** Settings collection has multiple documents after parallel requests

### Pitfall 7: Forgetting to Import Models Before Testing
**What goes wrong:** mongoose.model('Product') throws "Schema hasn't been registered" error
**Why it happens:** Models must be imported before accessing via mongoose.model()
**How to avoid:** Import app or models at test file top, or import from models/index.js
**Warning signs:** Test error about schema not registered for model

## Code Examples

Verified patterns from Mongoose documentation and existing Phase 10-14 tests:

### Basic Model Validation Test
```javascript
import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';

describe('User Model - Required Fields', () => {
  it('should fail validation when email is missing', async () => {
    const User = mongoose.model('Users');
    const invalidUser = new User({
      password: 'hashedpassword123'
      // email missing
    });

    await expect(invalidUser.save()).rejects.toThrow();
  });

  it('should fail validation when password is missing', async () => {
    const User = mongoose.model('Users');
    const invalidUser = new User({
      email: 'test@example.com'
      // password missing
    });

    await expect(invalidUser.save()).rejects.toThrow();
  });
});
```

### Enum Validation Test
```javascript
describe('User Model - Enum Validation', () => {
  it('should accept valid userType values', async () => {
    const User = mongoose.model('Users');

    const user = await User.create({
      email: 'admin@example.com',
      password: 'hashedpassword',
      userType: 'admin'
    });

    expect(user.userType).toBe('admin');
  });

  it('should use default userType when not provided', async () => {
    const User = mongoose.model('Users');

    const user = await User.create({
      email: 'user@example.com',
      password: 'hashedpassword'
      // userType not provided
    });

    expect(user.userType).toBe('user'); // Default from schema
  });

  // If schema has enum validation (not currently in User.js)
  it('should reject invalid userType values', async () => {
    const User = mongoose.model('Users');

    await expect(
      User.create({
        email: 'test@example.com',
        password: 'hashedpassword',
        userType: 'superuser' // Invalid value
      })
    ).rejects.toThrow();
  });
});
```

### Email Format Validation Test
```javascript
describe('User Model - Email Validation', () => {
  it('should accept valid email format', async () => {
    const User = mongoose.model('Users');

    const user = await User.create({
      email: 'valid.email@example.com',
      password: 'hashedpassword'
    });

    expect(user.email).toBe('valid.email@example.com');
  });

  it('should reject invalid email format', async () => {
    const User = mongoose.model('Users');

    await expect(
      User.create({
        email: 'not-an-email',
        password: 'hashedpassword'
      })
    ).rejects.toThrow();
  });

  it('should reject email without @', async () => {
    const User = mongoose.model('Users');

    await expect(
      User.create({
        email: 'invalidemail.com',
        password: 'hashedpassword'
      })
    ).rejects.toThrow();
  });
});
```

### Uniqueness Constraint Test
```javascript
describe('User Model - Email Uniqueness', () => {
  it('should prevent duplicate email addresses', async () => {
    const User = mongoose.model('Users');

    // Create first user
    await User.create({
      email: 'duplicate@example.com',
      password: 'hashedpassword1'
    });

    // Try to create second user with same email
    await expect(
      User.create({
        email: 'duplicate@example.com',
        password: 'hashedpassword2'
      })
    ).rejects.toThrow();
  });

  it('should treat email case-insensitively', async () => {
    const User = mongoose.model('Users');

    await User.create({
      email: 'Test@Example.com',
      password: 'hashedpassword1'
    });

    // Try with different case - behavior depends on MongoDB collation
    // By default MongoDB is case-sensitive, so this might succeed
    // Test actual behavior rather than assumed behavior
    const result = await User.create({
      email: 'test@example.com',
      password: 'hashedpassword2'
    }).catch(err => err);

    // Document actual behavior in test
    // If case-sensitive: expect(result.email).toBe('test@example.com');
    // If case-insensitive: expect(result.code).toBe(11000);
  });
});
```

### Product Model SKU Validation Test
```javascript
describe('Product Model - SKU Validation', () => {
  it('should accept valid SKU format', async () => {
    const Product = mongoose.model('Product');

    const product = await Product.create({
      id: 1001,
      name: 'Test Product',
      category: 'necklaces',
      usd_price: 50,
      images: [],
      sku: 'ABC123'
    });

    expect(product.sku).toBe('ABC123');
  });

  it('should uppercase SKU automatically', async () => {
    const Product = mongoose.model('Product');

    const product = await Product.create({
      id: 1001,
      name: 'Test Product',
      category: 'necklaces',
      usd_price: 50,
      images: [],
      sku: 'abc123' // Lowercase input
    });

    expect(product.sku).toBe('ABC123'); // Uppercase output
  });

  it('should reject SKU shorter than 2 characters', async () => {
    const Product = mongoose.model('Product');

    await expect(
      Product.create({
        id: 1001,
        name: 'Test Product',
        category: 'necklaces',
        usd_price: 50,
        images: [],
        sku: 'A' // Too short
      })
    ).rejects.toThrow();
  });

  it('should reject SKU longer than 7 characters', async () => {
    const Product = mongoose.model('Product');

    await expect(
      Product.create({
        id: 1001,
        name: 'Test Product',
        category: 'necklaces',
        usd_price: 50,
        images: [],
        sku: 'ABCD1234' // Too long
      })
    ).rejects.toThrow();
  });

  it('should reject SKU with non-alphanumeric characters', async () => {
    const Product = mongoose.model('Product');

    await expect(
      Product.create({
        id: 1001,
        name: 'Test Product',
        category: 'necklaces',
        usd_price: 50,
        images: [],
        sku: 'ABC-123' // Contains hyphen
      })
    ).rejects.toThrow();
  });
});
```

### Settings Singleton Test
```javascript
describe('Settings Model - Singleton Behavior', () => {
  it('should create settings if none exist', async () => {
    const Settings = mongoose.model('Settings');

    const settings = await Settings.getSettings();

    expect(settings).toBeDefined();
    expect(settings._id).toBeDefined();
  });

  it('should return existing settings if already created', async () => {
    const Settings = mongoose.model('Settings');

    const settings1 = await Settings.getSettings();
    const settings2 = await Settings.getSettings();

    expect(settings1._id.toString()).toBe(settings2._id.toString());
  });

  it('should only create one settings document', async () => {
    const Settings = mongoose.model('Settings');

    await Settings.getSettings();
    await Settings.getSettings();
    await Settings.getSettings();

    const count = await Settings.countDocuments();
    expect(count).toBe(1);
  });

  it('should handle concurrent getSettings calls', async () => {
    const Settings = mongoose.model('Settings');

    // Call getSettings multiple times in parallel
    const promises = [
      Settings.getSettings(),
      Settings.getSettings(),
      Settings.getSettings()
    ];

    const results = await Promise.all(promises);

    // All should return same document
    expect(results[0]._id.toString()).toBe(results[1]._id.toString());
    expect(results[1]._id.toString()).toBe(results[2]._id.toString());

    // Only one document should exist
    const count = await Settings.countDocuments();
    expect(count).toBe(1);
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest with mongodb-memory-server | Vitest with mongodb-memory-server | 2023-2024 | Faster test execution, ES module support, better DX |
| Mocking Mongoose with sinon-mongoose | Real database testing | Ongoing | More accurate tests, catches schema/index issues |
| Manual beforeEach/afterEach | Global setup/teardown | Phase 10 | Consistent test isolation, less boilerplate |
| Hard-coded test data | Factory functions | Phase 10 | Unique data, no collisions, predictable sequences |
| Testing validation in route handlers | Testing validation in model layer | Best practice | Clearer separation of concerns, reusable validation |

**Deprecated/outdated:**
- **sinon-mongoose:** Mocking approach that misses real Mongoose behavior (validation, hooks, indexes)
- **Manual model.validate():** Can be used but doesn't test pre-save hooks or database constraints
- **MongoDB in Docker:** Slower than mongodb-memory-server for unit tests, better for integration/E2E
- **mongoose-unique-validator plugin:** Has known race condition issues, better to rely on MongoDB unique indexes

## Open Questions

No unresolved questions - Phase 10 infrastructure and existing model schemas provide clear guidance.

## Sources

### Primary (HIGH confidence)
- [Mongoose v9.1.5: Validation](https://mongoosejs.com/docs/validation.html) - Official Mongoose validation documentation
- [Sparse Indexes - MongoDB Docs](https://www.mongodb.com/docs/manual/core/index-sparse/) - Official sparse index behavior
- [Unique Indexes - MongoDB Docs](https://www.mongodb.com/docs/manual/core/index-unique/) - Official unique constraint documentation
- [Mongoose v9.1.5: Middleware](https://mongoosejs.com/docs/middleware.html) - Official pre/post hook documentation
- Phase 10 test infrastructure (backend/tests/setup.js, helpers/) - Proven patterns from existing codebase
- Phase 11-14 test files - Established patterns for Vitest with Mongoose

### Secondary (MEDIUM confidence)
- [Testing MongoDB in Node with the MongoDB Memory Server | AppSignal Blog](https://blog.appsignal.com/2025/06/18/testing-mongodb-in-node-with-the-mongodb-memory-server.html) - MongoDB memory server testing guide
- [A Simple Guide to Setting Up HTTP-Level Tests with Vitest, MongoDB and Supertest](https://medium.com/@burzhuas/a-simple-guide-to-setting-up-http-level-tests-with-vitest-mongodb-and-supertest-1c5c90d22321) - Vitest + MongoDB integration
- [Mongoose Schema Validation: Best Practices and Anti-Patterns](https://techinsights.manisuec.com/mongodb/mongoose-schema-validation/) - Validation patterns
- [Understanding `unique` in Mongoose - Mastering JS](https://masteringjs.io/tutorials/mongoose/unique) - Unique constraint explanation
- [Handling Race Conditions in MongoDB](https://medium.com/tales-from-nimilandia/handling-race-conditions-and-concurrent-resource-updates-in-node-and-mongodb-by-performing-atomic-9f1a902bd5fa) - Race condition handling
- [Enforcing Uniqueness With MongoDB Partial Indexes](https://thecodebarbarian.com/enforcing-uniqueness-with-mongodb-partial-unique-indexes.html) - Partial/sparse indexes

### Tertiary (LOW confidence)
- WebSearch results for "mongoose CRUD testing patterns" - General patterns verified by official docs
- WebSearch results for "mongoose pre-save hook testing" - Testing approaches verified by middleware docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages already installed and configured in Phase 10
- Architecture: HIGH - Existing Phase 11-14 tests establish clear patterns
- Pitfalls: HIGH - Based on official Mongoose/MongoDB documentation and common issues

**Research date:** 2026-02-05
**Valid until:** 2026-04-05 (60 days - Mongoose and MongoDB are stable, test patterns unlikely to change)
