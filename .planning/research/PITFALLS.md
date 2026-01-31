# Pitfalls Research: SKU Management for E-Commerce

**Domain:** Adding SKU fields to existing jewelry e-commerce product catalog
**Researched:** 2026-02-01
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Database NULL Handling in Unique Indexes

**What goes wrong:**
MongoDB treats NULL values differently than SQL databases when creating unique indexes. Without proper configuration, MongoDB will reject all documents after the first one that lacks a SKU field, breaking backwards compatibility with existing products that don't have SKUs.

**Why it happens:**
Developers assume unique indexes work the same across all databases. In MongoDB, unique indexes will raise a uniqueness violation error when more than one document has NULL for the field that has a unique index. The standard unique index treats missing/null values as duplicates.

**How to avoid:**
Use a **sparse unique index** (`{ unique: true, sparse: true }`) instead of a regular unique index. Sparse indexes only contain entries for documents that have the indexed field, even if the field contains a null value, and skip over any document missing the field. An index that is both sparse and unique prevents duplicate values but allows multiple documents that omit the key.

**Warning signs:**
- Migration script fails with "duplicate key error" on first run
- Only one existing product successfully migrates while others are rejected
- Database throws uniqueness violations even though no SKUs exist yet

**Phase to address:**
Phase 1: Database Schema Migration - Must configure sparse unique index from the start to prevent blocking existing products.

**Sources:**
- [MongoDB Sparse Indexes Documentation](https://www.mongodb.com/docs/manual/core/index-sparse/)
- [MongoDB Unique Indexes Documentation](https://www.mongodb.com/docs/manual/core/index-unique/)
- [MongoDB Community: Can't create unique index that ignores nulls](https://www.mongodb.com/community/forums/t/cant-create-a-unique-index-that-ignores-nulls-in-mongodb/199145)

---

### Pitfall 2: Race Condition on Duplicate SKU Submissions

**What goes wrong:**
Two admins can simultaneously submit different products with the same SKU. If validation only happens client-side or if the database constraint doesn't handle concurrent inserts properly, both submissions might pass validation, then one fails at insertion time with a cryptic database error, causing data loss or requiring manual recovery.

**Why it happens:**
Developers rely solely on client-side validation or implement server-side validation that queries for existing SKUs before insertion, creating a time window between the "check if exists" query and the "insert" operation. During this window, another concurrent request can insert the same SKU.

**How to avoid:**
Implement **defense in depth** with multiple layers:
1. **Database-level constraint**: Sparse unique index on SKU field (enforces at atomic level)
2. **Server-side validation with try-catch**: Catch duplicate key errors and return user-friendly messages
3. **Client-side pre-validation**: Immediate feedback for UX (but never trust alone)
4. **Optimistic locking**: Use version fields if supporting product updates

**Warning signs:**
- Intermittent "duplicate SKU" errors that can't be reproduced consistently
- Database constraint violations appearing in production logs
- Users reporting "something went wrong" without clear error messages
- Testing passes but production has occasional failures under load

**Phase to address:**
- Phase 1: Database constraint (prevents corruption)
- Phase 2: Server-side validation with proper error handling (user experience)
- Phase 3: Client-side validation (real-time feedback)

**Sources:**
- [Preventing Database Race Conditions with Redis](https://iniakunhuda.medium.com/hands-on-preventing-database-race-conditions-with-redis-2c94453c1e47)
- [Race Conditions in Inventory Tracking - Sylius Issue](https://github.com/Sylius/Sylius/issues/2776)
- [How to Avoid Race Conditions in Rails](https://www.honeybadger.io/blog/avoid-race-condition-in-rails/)

---

### Pitfall 3: Frontend Display of Products Without SKUs

**What goes wrong:**
Admin dashboard and frontend product displays crash, show "undefined", or have broken layouts when rendering products that lack SKU values. Sorting/filtering by SKU fails. Export functionality breaks when encountering null SKUs.

**Why it happens:**
Developers design the UI assuming all products have SKUs, using code like `product.sku.toUpperCase()` or string interpolation without null checks. They don't test with mixed data (some products with SKUs, some without).

**How to avoid:**
- **Graceful fallback display**: Show "N/A", "No SKU", or product.id as fallback
- **Null-safe operations**: Use optional chaining (`product.sku?.toUpperCase()`) or default values (`product.sku || 'N/A'`)
- **Conditional features**: Disable SKU-based sorting/filtering for products without SKUs
- **Clear visual distinction**: Use badges or indicators to show which products need SKUs
- **Export handling**: Replace null with empty string or placeholder in CSV/Excel exports

**Warning signs:**
- JavaScript console errors: "Cannot read property 'X' of undefined"
- Admin dashboard shows blank spaces where SKU should appear
- Table sorting/filtering breaks when clicking SKU column
- Export to CSV fails or produces malformed files

**Phase to address:**
- Phase 2: Admin UI updates (display handling)
- Phase 3: Frontend product pages (public-facing graceful degradation)
- Phase 4: Export/reporting features (data integrity)

**Sources:**
- Product catalog migration best practices research (multiple sources)
- [Database Design for Product Management](https://medium.com/@pesarakex/database-design-for-product-management-9280fd7c66fe)

---

### Pitfall 4: Required vs. Optional Field Confusion

**What goes wrong:**
Setting SKU as required at the schema level (`required: true`) immediately breaks the application for existing products. Alternatively, making it optional everywhere means new products can be created without SKUs, defeating the purpose of adding the field.

**Why it happens:**
Developers struggle with the paradox: existing products can't have SKUs (data doesn't exist), but new products must have SKUs (business requirement). They either make it required (breaking existing products) or optional (allowing bad new data).

**How to avoid:**
Implement **conditional validation** at the application layer, not the database schema:
1. **Schema level**: Keep SKU optional/nullable (`required: false`)
2. **Application level**: Add validation logic that requires SKU only for new products (created after migration date)
3. **Admin UI**: Show SKU as required field for new products, optional/disabled for existing ones
4. **Migration tracking**: Add `createdAt` timestamp or `migratedProduct: boolean` flag to distinguish old vs. new

**Warning signs:**
- Migration script fails when adding `required: true` to schema
- New products being created without SKUs in production
- Admins confused about when SKU is needed
- Validation errors appearing inconsistently

**Phase to address:**
Phase 1: Schema design (keep optional at DB level) + Phase 2: Application-level validation logic

**Sources:**
- [EF Core Migration Unique Nullable Field Issues](https://learn.microsoft.com/en-us/answers/questions/4378312/ef-core-create-unique-index-migration-doesnt-work)
- [Django Migration Nullable to Non-Nullable Issues](https://github.com/ESSolutions/django-mssql-backend/issues/75)

---

### Pitfall 5: Missing Server-Side Validation (Client-Side Only)

**What goes wrong:**
Developers implement SKU validation only in the admin frontend (JavaScript), trusting that the form won't be bypassed. Malicious users or simple browser bugs can submit products with duplicate SKUs or missing SKUs despite frontend validation, corrupting the database.

**Why it happens:**
Client-side validation provides instant feedback and good UX, making it tempting to skip the "redundant" server-side validation. Developers forget that client-side JavaScript can be disabled, modified, or bypassed entirely via direct API calls.

**How to avoid:**
**Never trust the client**. Always implement validation on both sides:

**Server-side (mandatory):**
- Check SKU uniqueness before insertion
- Validate SKU format (alphanumeric, length limits, no special chars)
- Enforce business rules (required for new products, optional for legacy)
- Return clear, actionable error messages

**Client-side (UX enhancement):**
- Real-time feedback while typing
- Debounced uniqueness checks via API
- Format validation hints
- Pre-submission validation

**Warning signs:**
- Duplicate SKUs appearing in production database
- Products created without SKUs despite "required" frontend field
- API endpoints accepting malformed data
- No validation errors in server logs

**Phase to address:**
- Phase 1: Server-side validation (security foundation)
- Phase 2: Client-side validation (UX polish)

**Sources:**
- [Client-side vs Server-side Validation - MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation)
- [Client-Side vs Server-Side Form Validation - SurveyJS](https://surveyjs.io/stay-updated/blog/client-server-data-validation)
- [Dev.to Discussion: Client vs Server Validation](https://dev.to/madza/input-validation-client-side-or-server-side-3h50/comments)

---

### Pitfall 6: No Migration Rollback Plan

**What goes wrong:**
Migration adds SKU field, creates unique index, and deploys to production. Critical bug discovered: unique index is NOT sparse, rejecting all existing products. Team tries to rollback but realizes the index can't be safely removed without potential data loss. Production is down.

**Why it happens:**
Developers focus on forward migration ("up") and neglect the rollback path ("down"). They don't test rollback procedures or create emergency rollback scripts. MongoDB index operations aren't automatically reversible.

**How to avoid:**
Create **idempotent, reversible migrations**:
1. Write both "up" and "down" migration scripts
2. Test rollback on staging before production deploy
3. Document index names and creation parameters for safe removal
4. Use migration tools with built-in rollback support
5. Create checkpoints: verify data integrity before and after migration

**Warning signs:**
- No rollback script exists in migration folder
- Migration wasn't tested in staging environment
- No data backup before running migration
- Index names are auto-generated (hard to target for removal)

**Phase to address:**
Phase 1: Migration script development - Create rollback scripts alongside forward migrations.

---

### Pitfall 7: SKU Format Inconsistency

**What goes wrong:**
Admins create SKUs in different formats: "SKU-001", "sku001", "001-SKU", "JEWELRY-001". Later, reports and integrations break because they expect consistent formatting. Duplicate detection fails because "SKU-001" ≠ "sku-001" in case-sensitive databases.

**Why it happens:**
No SKU format validation or generation rules are defined. Admins improvise their own patterns. System doesn't normalize input (trim whitespace, enforce case, validate pattern).

**How to avoid:**
**Establish SKU format standards early**:
1. **Define format pattern**: E.g., `[CATEGORY]-[NUMBER]` → `BRACELETS-0001`
2. **Validation regex**: Enforce pattern at server side
3. **Case normalization**: Convert to uppercase before storage
4. **Whitespace trimming**: Remove leading/trailing spaces
5. **Auto-generation option**: Provide "Generate SKU" button for consistency
6. **Migration**: Optionally provide tool to bulk-assign SKUs to existing products

**Warning signs:**
- SKU field contains varied formats in database
- Duplicate SKUs due to case differences ("ABC-123" vs "abc-123")
- Reports failing to group products correctly
- Excel exports showing extra spaces causing misalignment

**Phase to address:**
- Phase 1: Format definition and documentation
- Phase 2: Validation implementation (regex, normalization)
- Phase 3: Auto-generation helper (optional enhancement)

**Sources:**
- [SKU Best Practices - Square](https://squareup.com/ca/en/the-bottom-line/operating-your-business/stock-keeping-unit)
- [How to Handle Complex SKU Data - Experlogix](https://experlogix.com/blog/complex-sku/)

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip sparse index, use regular unique index | Simpler migration script | Existing products can't coexist with SKU requirement, forces immediate SKU assignment to all products | Never - sparse index is minimal effort |
| Client-side validation only | Faster development, no backend changes | Security vulnerability, data corruption, duplicate SKUs in production | Never - server validation is critical |
| No SKU format validation | Admins can use any format they want | Inconsistent data, integration failures, duplicate detection issues | Only in MVP if auto-generation is planned for Phase 2 |
| Make SKU required at DB level | Enforces data quality for new products | Breaks backwards compatibility, blocks existing products from updates | Never for migration; only for greenfield projects |
| No rollback script | Skip "extra work" of down migration | Production incidents with no recovery path, extended downtime | Never - always write rollback |
| Auto-generate SKUs for all products in migration | All products get SKUs immediately | May conflict with manual SKU assignment, can't distinguish legacy vs. new | Only if business confirms auto-generated SKUs are acceptable |

---

## Integration Gotchas

Common mistakes when connecting SKU management to external services or systems.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Inventory sync systems | Sending null SKUs to inventory API | Filter products without SKUs OR use product.id as fallback identifier |
| E-commerce platforms (Shopify, etc.) | Updating product SKU breaks existing orders | Never change SKUs after creation; treat as immutable identifiers |
| Analytics/reporting | Joining by SKU fails for products without SKUs | Use LEFT JOIN or COALESCE to handle nulls, or filter to SKU-enabled products only |
| Search indexing | Products without SKUs break search filters | Index null SKUs as special token (e.g., "NO_SKU") for filtering purposes |
| CSV export/import | Null SKUs create blank columns | Replace null with placeholder ("N/A") or empty string; document in import spec |

**Sources:**
- [Recharge: Updating SKUs for Existing Orders](https://support.getrecharge.com/hc/en-us/articles/360008683794-Updating-SKUs-for-existing-and-future-subscription-orders)
- [Next-Cart: Product Data Migration Checklist](https://next-cart.com/blog/a-checklist-for-preparing-your-product-data-for-migration/)

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Query products by SKU without index | Works fine with 100 products | Create index on SKU field from start | 1000+ products, queries take >2 seconds |
| N+1 queries checking SKU uniqueness | Admin form validation is slow | Single query with `findOne()`, not loop through all products | 500+ products |
| Loading all SKUs into memory for validation | Fast checks in code | Use database query for existence check | 10,000+ products (memory pressure) |
| Full collection scan for SKU search | Search works but slow | Use text index or regex index on SKU field | 5,000+ products, 100+ concurrent users |
| No pagination on SKU listing pages | All products load at once | Implement cursor-based pagination | 2,000+ products with SKUs |

---

## UX Pitfalls

Common user experience mistakes in SKU management.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No indication which products need SKUs | Admins don't know what to update | Dashboard widget: "X products missing SKUs" with link to bulk assign tool |
| Cryptic error: "E11000 duplicate key" | Admin confused, doesn't know SKU is duplicated | Parse MongoDB error, return: "SKU 'ABC-123' already exists on product [name]" |
| No SKU search/filter in admin | Can't find products by SKU | Add SKU filter to product table, include in search |
| Bulk edit doesn't support SKU | Have to edit 100 products individually | Add SKU column to bulk edit interface |
| No SKU preview before save | Typos and duplicates discovered after submission | Show live validation: "✓ SKU available" or "✗ Already in use by [product]" |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **SKU uniqueness**: Unique index created, BUT is it sparse? (Test: can products without SKU coexist?)
- [ ] **Server validation**: SKU validation works in frontend, BUT is it enforced server-side? (Test: direct POST to API bypasses validation)
- [ ] **Race condition handling**: Single user can't create duplicates, BUT can two concurrent requests? (Test: send simultaneous duplicate SKU submissions)
- [ ] **Null handling**: Products display correctly, BUT do they crash when SKU is null? (Test: try sorting by SKU with mixed null/non-null data)
- [ ] **Error messages**: Duplicate detection works, BUT does admin see useful error? (Test: submit duplicate, verify message names the conflict)
- [ ] **Rollback tested**: Migration script runs successfully, BUT can it be safely reversed? (Test: run down migration on staging)
- [ ] **Format normalization**: SKU saves successfully, BUT is whitespace trimmed and case normalized? (Test: submit " abc-123 " and verify it becomes "ABC-123")
- [ ] **Existing product updates**: New products require SKU, BUT can existing products be edited without providing SKU? (Test: edit legacy product, verify save works)

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Non-sparse unique index breaks production | MEDIUM | 1. Drop unique index via mongo shell<br>2. Create sparse unique index<br>3. Verify existing products accessible<br>4. Deploy fix |
| Duplicate SKUs in database | MEDIUM-HIGH | 1. Query for duplicates: `db.products.aggregate([{$group: {_id: "$sku", count: {$sum: 1}}}, {$match: {count: {$gt: 1}}}])`<br>2. Manually resolve conflicts (rename or remove)<br>3. Add unique constraint after cleanup |
| No server-side validation | HIGH | 1. Audit database for invalid SKUs<br>2. Implement server validation<br>3. Add database constraint<br>4. Clean up bad data<br>5. Deploy with thorough testing |
| Products without SKUs break frontend | LOW | 1. Add null checks to rendering code<br>2. Deploy hotfix<br>3. Add to smoke test suite |
| Migration can't be rolled back | HIGH | 1. Restore from backup (if available)<br>2. Manually reverse changes via mongo shell<br>3. Document manual rollback steps<br>4. Test thoroughly before retrying |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Non-sparse unique index | Phase 1: Database Migration | Run migration on staging with existing products, verify no errors |
| Race condition duplicates | Phase 1: DB constraint + Phase 2: Server validation | Concurrent duplicate submission test (2 requests same SKU) |
| Frontend null crashes | Phase 2: Admin UI + Phase 3: Public frontend | Load product list with mixed SKU/no-SKU products, check console |
| Required vs. optional confusion | Phase 1: Schema design + Phase 2: Conditional validation | Create new product (requires SKU), edit old product (SKU optional) |
| No server validation | Phase 2: Server-side validation | Direct API call with duplicate SKU, verify rejection |
| No rollback plan | Phase 1: Migration development | Execute rollback on staging, verify clean reversal |
| Format inconsistency | Phase 2: Validation + normalization | Submit various formats, verify standardization |

---

## Phase-Specific Deep Dives

### Phase 1: Database Schema Migration
**Critical decisions:**
- Sparse vs. regular unique index (MUST be sparse)
- Index creation timing (before or after adding field)
- Rollback script completeness

**Testing requirements:**
- Migration on staging with production data copy
- Rollback on staging
- Verify existing products still load/update
- Verify index exists: `db.products.getIndexes()`

### Phase 2: Server-Side Validation & Admin UI
**Critical decisions:**
- Validation logic location (middleware vs. route handler)
- Error message format (user-friendly vs. technical)
- Conditional validation (how to distinguish new vs. legacy products)

**Testing requirements:**
- Duplicate SKU submission (via API and UI)
- Concurrent requests (race condition test)
- Format validation (whitespace, case, special chars)
- Legacy product update without SKU

### Phase 3: Frontend Display & UX
**Critical decisions:**
- Null SKU display strategy (hide, show placeholder, show ID)
- Filtering/sorting behavior with nulls
- Admin dashboard indication of missing SKUs

**Testing requirements:**
- Product list with mixed SKU/no-SKU
- Sorting by SKU column
- Filtering by SKU
- Export to CSV with null SKUs

---

## Sources

### Database & Migration
- [MongoDB Sparse Indexes](https://www.mongodb.com/docs/manual/core/index-sparse/)
- [MongoDB Unique Indexes](https://www.mongodb.com/docs/manual/core/index-unique/)
- [MongoDB Community: Unique Index Ignoring Nulls](https://www.mongodb.com/community/forums/t/cant-create-a-unique-index-that-ignores-nulls-in-mongodb/199145)
- [Unique Index on NULL Values - DEV Community](https://dev.to/aws-heroes/unique-index-on-null-values-in-sql-nosql-34ej)
- [PostgreSQL Unique Constraint NULL - EDB](https://www.enterprisedb.com/postgres-tutorials/postgresql-unique-constraint-null-allowing-only-one-null)
- [How Unique Index Works with Nullable Columns - Medium](https://ron-liu.medium.com/how-unique-index-work-with-nullable-columns-c62ba2fa3fee)

### Race Conditions & Validation
- [Preventing Database Race Conditions with Redis](https://iniakunhuda.medium.com/hands-on-preventing-database-race-conditions-with-redis-2c94453c1e47)
- [Race Conditions in Inventory Tracking - Sylius](https://github.com/Sylius/Sylius/issues/2776)
- [How to Avoid Race Conditions in Rails](https://www.honeybadger.io/blog/avoid-race-condition-in-rails/)
- [Client-side Form Validation - MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation)
- [Client-Side vs Server-Side Validation - SurveyJS](https://surveyjs.io/stay-updated/blog/client-server-data-validation)

### SKU Best Practices
- [SKU Management - Square](https://squareup.com/ca/en/the-bottom-line/operating-your-business/stock-keeping-unit)
- [Complex SKU Handling - Experlogix](https://experlogix.com/blog/complex-sku/)
- [Database Design for Product Management - Medium](https://medium.com/@pesarakex/database-design-for-product-management-9280fd7c66fe)
- [SKU Variations in E-commerce - ShipBob](https://www.shipbob.com/blog/sku-variations/)

### Migration & Data Quality
- [Product Data Migration Checklist - Next-Cart](https://next-cart.com/blog/a-checklist-for-preparing-your-product-data-for-migration/)
- [Recharge: Updating SKUs for Existing Orders](https://support.getrecharge.com/hc/en-us/articles/360008683794-Updating-SKUs-for-existing-and-future-subscription-orders)
- [Data Migration Strategy - Couchbase](https://www.couchbase.com/blog/data-migration-strategy/)
- [Legacy Data Migration - Datafold](https://www.datafold.com/blog/legacy-data-migration)

---

*Pitfalls research for: SKU management in existing e-commerce product catalog*
*Researched: 2026-02-01*
*Confidence: HIGH - Findings verified across official documentation (MongoDB), community forums, and e-commerce platform best practices*
