# Phase 15: Database & Model Tests - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Test Mongoose schema models (Product, User, Settings) to verify CRUD operations, field validation, uniqueness constraints, and database-level behavior. This phase tests the data layer foundation in isolation from the HTTP stack.

</domain>

<decisions>
## Implementation Decisions

### Test approach & isolation
- **Claude's Discretion:** Choose between direct Mongoose model tests vs API integration testing
- **Claude's Discretion:** Determine cleanup strategy (global afterEach vs per-model vs transactions)
- **Claude's Discretion:** Use real MongoDB (mongodb-memory-server) or mock approach based on Phase 10 infrastructure
- **Claude's Discretion:** Define appropriate scope (schema validation only vs database behavior included)

### Validation testing depth

**Product model validations:**
- Required fields: name, price_usd, images
- Data types & formats: price must be number, SKU format, category enum values
- Business rules: displayOrder integrity, images array structure, price_ils calculation
- Edge cases: Empty strings vs null, negative prices, oversized arrays

**User model validations:**
- Required fields: email, password
- Email validation: Valid format, case handling, whitespace trimming
- Password handling: Minimum length, bcrypt hashing on save, password comparison method
- Role validation: userType enum (admin/customer), default values

**Settings model validations:**
- Exchange rate fields: current_exchange_rate, last_updated_at (data types and defaults)
- Configuration fields: Any other settings with validation rules
- Update behavior: Settings model is singleton-like - test updates don't create duplicates
- **Claude's Discretion:** Determine appropriate Settings validation coverage

**Error message testing:**
- **Claude's Discretion:** Choose appropriate level (verify rejection only vs check error structure vs validate specific messages)

### Uniqueness & constraints

**Email uniqueness (User model):**
- Basic duplicate test: Create user, try duplicate email, verify rejection
- Case sensitivity test: Email@example.com and email@example.com treated as duplicates
- Concurrent insert test: Race condition with Promise.all - ensure index prevents duplicates

**SKU uniqueness (Product model):**
- Basic duplicate test: Create product with SKU, try duplicate, verify rejection
- Sparse index behavior: Products without SKU (null/undefined) don't conflict - sparse index allows multiple nulls
- Case sensitivity: Test if ABC-123 and abc-123 are treated as unique or duplicate

**Compound index (category + displayOrder):**
- **Claude's Discretion:** Determine appropriate compound index testing (sorting behavior, uniqueness, or just verify existence)

**Race condition handling:**
- **Claude's Discretion:** Decide if race condition testing with Promise.all is necessary or if MongoDB index guarantees are sufficient

### Model method coverage

**Password methods (User model):**
- **Claude's Discretion:** Determine if password hashing/comparison method testing is needed here or if Phase 11 coverage is sufficient

**Virtual properties:**
- **Claude's Discretion:** Check codebase for virtuals (computed properties) and test any found

**Static methods:**
- **Claude's Discretion:** Check codebase for custom static methods (finders, business logic) and test any found

**CRUD operations:**
- Test comprehensive CRUD for each model: .create(), .find(), .findById(), .updateOne(), .deleteOne()
- Focus on verifying operations work correctly with business rules (e.g., Product displayOrder updates)

</decisions>

<specifics>
## Specific Ideas

- Phase 10 infrastructure provides mongodb-memory-server with global setup/cleanup
- Phase 11 already covered authentication password hashing - avoid duplication
- Models to test: Product (with images array, SKU, displayOrder), User (with email uniqueness, userType), Settings (with exchange rate fields)
- Test isolation pattern established in Phases 10-14 should be followed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-database-and-model-tests*
*Context gathered: 2026-02-05*
