# Feature Research: SKU Management for E-commerce

**Domain:** Product information management (handmade jewelry e-commerce)
**Researched:** 2026-02-01
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features that are standard in professional e-commerce product management. Missing these = admin workflow feels unprofessional or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **SKU input field in product form** | Every major platform (Shopify, WooCommerce, BigCommerce) has dedicated SKU field separate from description | LOW | Basic text input field, should be visible/prominent in admin UI |
| **SKU uniqueness validation** | Prevents inventory chaos and fulfillment errors. Industry standard since SKU = unique identifier | LOW | Database unique constraint + frontend validation on save/update |
| **SKU display in product listings** | Admins need to see SKUs alongside product names to identify items quickly | LOW | Add SKU column to admin product table/list view |
| **Search products by SKU** | Critical for order fulfillment - warehouse staff search by SKU code, not product names | MEDIUM | Add SKU to search index, filter by SKU in product queries |
| **Optional SKU for existing products** | Backwards compatibility - forcing SKU on 100+ existing products = migration disaster | LOW | Make field optional for existing products, required for new ones |
| **SKU in order details** | Staff need to see SKU when processing orders for accurate picking/packing | LOW | Display SKU in order line items in admin and customer receipts |
| **Basic SKU validation rules** | Prevent common data entry errors (special chars, leading zeros, excessive length) | LOW | Frontend validation: alphanumeric + dash/underscore only, max 16 chars, no leading zero |

### Differentiators (Competitive Advantage)

Features that improve workflow but aren't baseline expectations. Nice-to-have improvements that add polish.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **SKU-based barcode generation** | Makes SKU system compatible with physical inventory/warehouse workflows | MEDIUM | Auto-generate Code 128 or Code 39 barcode from SKU for printing labels. Shopify offers free barcode generator |
| **Bulk SKU import/export (CSV)** | Allows backfilling SKUs for existing products without clicking through 100+ forms | MEDIUM | CSV import with SKU + product ID, validate uniqueness before import, export SKU column in product CSV |
| **Duplicate SKU detection UI** | Catch duplicates before saving vs showing generic database error | LOW | Check for existing SKU on blur/submit, show friendly "SKU already exists for Product X" message |
| **SKU format suggestions/templates** | Helps admin create consistent SKU patterns (e.g., BRCE-SLV-001 for silver bracelet) | LOW | Display SKU pattern examples in UI, optional prefix/suffix helpers in form |
| **SKU history/audit log** | Track when SKU was added/changed (useful for debugging inventory issues) | LOW | Add `skuUpdatedAt` timestamp field, log SKU changes in product update history |
| **Filter by "Has SKU" / "No SKU"** | Helps identify which products still need SKUs during migration period | LOW | Add boolean filter to admin product list view |
| **Auto-suggest next SKU** | For sequential numbering (e.g., last SKU was JWL-012, suggest JWL-013) | MEDIUM | Parse existing SKUs, detect numeric suffix pattern, increment |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem useful but create unnecessary complexity for a small handmade business. Deliberately NOT building these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Complex SKU templates with dynamic rules** | "Let admin configure SKU format like {CATEGORY}-{COLOR}-{SIZE}-{SEQ}" | Over-engineering for handmade jewelry with minimal variants. Most SKUs assigned manually, not auto-generated. Adds 10x complexity. | Provide simple SKU format examples in UI documentation. Manual entry is fine for <1000 products. |
| **Multi-variant SKU management** | "Each color/size variant needs its own SKU" | This platform doesn't have product variants architecture (no size/color variations in schema). Would require complete product model rewrite. | Current model = one product = one SKU. If variant management needed later, that's a separate major feature. |
| **Auto-generate SKU from product name** | "Make it automatic so I don't have to think about it" | Creates terrible SKUs (long, inconsistent, breaks if product renamed). Random generation loses human-readable benefit. | SKU is strategic - admin should define pattern that makes sense for their inventory system. Provide guidance, not automation. |
| **Hierarchical SKU categories** | "Create SKU prefixes for categories, subcategories, etc." | Jewelry categories are flat and rarely change. Hierarchical system = premature optimization. | Simple prefix recommendations (BRCE, NKLC, ERNGS) documented in admin UI is sufficient. |
| **SKU versioning** | "Track when SKU changes and maintain history of old SKUs" | Leads to SKU proliferation. Best practice = never reuse SKUs, but also never change them once assigned. | Lock SKU after first save (show warning if editing), log change in audit trail, but don't maintain multiple "versions". |
| **Barcode scanning in admin** | "Scan barcodes to edit products" | Requires hardware integration, camera access, barcode parsing libraries. Massive scope for minimal admin benefit (admin already at computer). | Barcode generation for printing is useful. Scanning is warehouse/POS feature out of scope. |

## Feature Dependencies

```
[SKU input field]
    └──enables──> [SKU uniqueness validation]
                      └──enables──> [Search by SKU]
                                        └──enables──> [SKU in orders]

[SKU input field] ──enhances──> [Duplicate SKU detection UI]

[SKU in database] ──enables──> [Bulk import/export]
                    ────────────> [Filter by Has SKU]
                    ────────────> [SKU-based barcode]

[Search by SKU] ──conflicts──> [SKU auto-generation from name]
(auto-gen creates unsearchable SKUs)
```

### Dependency Notes

- **SKU uniqueness validation requires input field:** Can't validate uniqueness without persistent SKU storage
- **Search requires indexed SKU:** SKU must be in database and searchable before it's useful in order fulfillment
- **Barcode generation requires stable SKU:** Don't generate barcodes if SKU can change arbitrarily
- **Bulk operations require schema stability:** CSV import/export needs final SKU field structure

## MVP Definition

### Launch With (v1) - SKU Foundation

Minimum viable SKU management — what's needed to move SKUs out of product descriptions professionally.

- [x] **SKU input field in admin product form** — Core requirement: replace "SKU in description" anti-pattern
- [x] **Database schema with SKU field** — Optional for existing products, required for new products
- [x] **SKU uniqueness validation** — Database unique constraint + friendly error message
- [x] **Display SKU in product listings** — Show SKU column in admin product table
- [x] **Search products by SKU** — Enable SKU search in admin product search bar
- [x] **SKU in order line items** — Display SKU when admin views order details
- [x] **Basic input validation** — Alphanumeric + dash/underscore, max 16 chars, no leading zero

**Rationale:** These 7 features transform SKU from "text buried in description" to "proper product identifier". Covers the professional baseline without complexity.

### Add After Validation (v1.x)

Features to add once core SKU workflow is working and admin feedback collected.

- [ ] **Duplicate SKU detection UI** — Improve error UX (trigger: if admin reports confusion about uniqueness errors)
- [ ] **Filter by Has SKU / No SKU** — Migration helper (trigger: if backfilling SKUs for old products takes >1 week)
- [ ] **Bulk SKU CSV import/export** — Batch operations (trigger: if admin requests "faster way to add SKUs to 50 products")
- [ ] **SKU format guidance in UI** — Pattern suggestions (trigger: if inconsistent SKU formats emerge in first month)

### Future Consideration (v2+)

Features to defer until product-market fit is established and scale demands them.

- [ ] **SKU-based barcode generation** — Warehouse integration (defer: unless physical inventory tracking becomes bottleneck)
- [ ] **SKU audit history** — Compliance/debugging (defer: unless SKU change issues arise)
- [ ] **Auto-suggest next sequential SKU** — Data entry helper (defer: low value for handmade products with inconsistent SKU patterns)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Phase |
|---------|------------|---------------------|----------|-------|
| SKU input field | HIGH | LOW | P1 | v1 |
| Database schema with SKU | HIGH | LOW | P1 | v1 |
| Uniqueness validation | HIGH | LOW | P1 | v1 |
| Display in listings | HIGH | LOW | P1 | v1 |
| Search by SKU | HIGH | MEDIUM | P1 | v1 |
| SKU in orders | HIGH | LOW | P1 | v1 |
| Input validation rules | MEDIUM | LOW | P1 | v1 |
| Duplicate detection UI | MEDIUM | LOW | P2 | v1.x |
| Filter Has SKU / No SKU | MEDIUM | LOW | P2 | v1.x |
| Bulk CSV import/export | MEDIUM | MEDIUM | P2 | v1.x |
| SKU format guidance | LOW | LOW | P2 | v1.x |
| Barcode generation | LOW | MEDIUM | P3 | v2+ |
| SKU audit history | LOW | LOW | P3 | v2+ |
| Auto-suggest SKU | LOW | MEDIUM | P3 | v2+ |

**Priority key:**
- **P1** (Must have for launch): Baseline professional SKU management - missing these = feature incomplete
- **P2** (Should have, add when possible): Workflow improvements - missing these = usable but less polished
- **P3** (Nice to have, future consideration): Advanced features - missing these = no impact on core value

## Competitor Feature Analysis

Real-world SKU management in major e-commerce platforms (2026):

| Feature | Shopify | WooCommerce | Square | Our Approach |
|---------|---------|-------------|--------|--------------|
| **SKU field** | ✓ Text input, optional | ✓ Text input, required for inventory tracking | ✓ Auto-generate or manual | ✓ Text input, required for new products |
| **Uniqueness** | ✓ Enforced per variant | ✓ Enforced globally | ✓ Optional warning | ✓ Enforced globally (no variants) |
| **Search by SKU** | ✓ Global search | ✓ Product filter | ✓ Search bar + barcode scan | ✓ Product search filter |
| **Bulk edit** | ✓ CSV import/export + apps | ✓ Native CSV importer | ✓ Spreadsheet import | Defer to v1.x (CSV) |
| **Barcode** | ✓ Free barcode generator tool | ✓ Plugins available | ✓ Built-in barcode generation | Defer to v2+ |
| **SKU templates** | ✗ Manual only | ✗ Manual (plugins exist) | ✓ Auto-generate with rules | ✗ Manual with guidance |
| **Variant SKUs** | ✓ Per color/size | ✓ Per variation | ✓ Per item option | ✗ No variant architecture |
| **Bin location** | ✓ Via apps | ✓ Via plugins | ✓ Native feature | ✗ Out of scope |

**Key Insights:**

1. **All platforms enforce SKU uniqueness** — This is non-negotiable table stakes
2. **Search by SKU is universal** — Critical for order fulfillment workflow
3. **Bulk operations are standard** — But often added after initial release (v1.x is appropriate timing)
4. **Auto-generation is divisive** — Shopify/WooCommerce avoid it, Square offers it. Manual = safer for quality
5. **Variant SKUs require product model changes** — Not just a SKU feature, it's a product architecture change
6. **Barcode features are often plugins** — Core platform handles SKU, ecosystem adds barcodes

## Implementation Recommendations

Based on research, recommended approach for this handmade jewelry platform:

### Phase 1: SKU Foundation (v1)

**Goal:** Professional product identification without over-engineering

**Features:**
- Add `sku` field to Product schema (String, unique: true, sparse: true for backwards compatibility)
- Admin UI: SKU input in product form with validation (alphanumeric + dash/underscore, max 16 chars)
- Display SKU in admin product list table
- Add SKU to product search filter
- Show SKU in order line items
- Frontend validation: unique check on blur, friendly duplicate error

**Validation:**
- Admin can create products with SKUs instead of embedding in description
- Staff can search products by SKU for order fulfillment
- No duplicate SKU errors occur in database

### Phase 2: Migration & Workflow (v1.x)

**Goal:** Support backfilling SKUs for existing catalog

**Features:**
- CSV export with SKU column
- CSV import to update SKUs in bulk
- Filter products by "Has SKU" / "No SKU" status
- SKU format examples in admin UI

**Validation:**
- Admin can add SKUs to all 100+ existing products in <1 day
- Consistent SKU format across catalog

### Phase 3: Advanced (v2+)

**Goal:** Warehouse integration (only if physical inventory becomes priority)

**Features:**
- Generate Code 128 barcode from SKU
- Printable barcode labels
- SKU change audit log

**Validation:**
- Admin can print barcode labels for inventory management
- SKU changes are tracked for debugging

## Sources

**E-commerce Platform Documentation (HIGH confidence):**
- [Shopify: What Is a Stock Keeping Unit (SKU)? Complete 2026 Guide](https://www.shopify.com/blog/what-is-a-stock-keeping-unit)
- [Shopify Help Center: Using SKUs to manage your inventory](https://help.shopify.com/en/manual/products/details/sku)
- [WooCommerce: Product CSV Importer and Exporter Documentation](https://woocommerce.com/document/product-csv-importer-exporter/)
- [Square: SKU: What It Means and How To Use It](https://squareup.com/us/en/the-bottom-line/operating-your-business/stock-keeping-unit)
- [Square Support: Automatically generate SKUs](https://squareup.com/help/us/en/article/7632-auto-generate-skus-with-square-for-retail)

**Best Practices & Industry Standards (MEDIUM-HIGH confidence):**
- [Ablestar: SKU best practices for ecommerce](https://www.ablestar.com/sku-best-practices/)
- [ShipBob: SKU Management Best Practices for Ecommerce Inventory Management](https://www.shipbob.com/blog/sku-management/)
- [The Retail Exec: SKU Management: Benefits, Challenges & Strategies for Success](https://theretailexec.com/logistics/sku-management/)
- [Elastic Blog: How to create a document schema for product variants and SKUs](https://www.elastic.co/blog/how-to-create-a-document-schema-for-product-variants-and-skus-for-your-ecommerce-search-experience)
- [Medium: Database Design for Product Management](https://medium.com/@pesarakex/database-design-for-product-management-9280fd7c66fe)

**Small Business / Handmade Product Context (MEDIUM confidence):**
- [ProfitTree: Mastering SKU Systems: How to Create SKUs for Small Business on Etsy](https://profittree.io/blog/mastering-sku-systems-how-to-create-skus-for-small-business-on-etsy)
- [Alignable: What Is the Best Way to Create a SKU for a Hand Made Product?](https://www.alignable.com/forum/has-anyone-out-there-ever-created-there-own-skus-for-there-hand-made)
- [Midwest AWD: How to Create SKU Numbers: A Comprehensive Guide](https://www.midwestawd.com/blog/how-to-create-sku-numbers/)

**Barcode & Automation Tools (MEDIUM confidence):**
- [Shopify: Free Online Barcode Generator (2026)](https://www.shopify.com/tools/barcode-generator)
- [QuickBooks: Free SKU Generator](https://quickbooks.intuit.com/global/tools-and-templates/sku-generator/)
- [Shopify App Store: SGT: SKU and Barcode Generator](https://apps.shopify.com/ais-barcode-sku-generator)
- [Hextom: Bulk Product Edit](https://apps.shopify.com/bulk-product-edit)

**Common Mistakes & Anti-Patterns (MEDIUM confidence):**
- [Interlake Mecalux: SKU proliferation: how to manage it](https://www.interlakemecalux.com/blog/sku-proliferation)
- [Finale Inventory: Beginner's Guide to SKU Management](https://www.finaleinventory.com/inventory-management/beginners-guide-to-sku-management-tips-for-efficient-inventory-management-with)

---
*Feature research for: SKU Management in E-commerce Product Catalogs*
*Researched: 2026-02-01*
*Confidence: HIGH (verified against Shopify, WooCommerce, Square official docs + multiple industry sources)*
