# Phase 5: Product Ordering Backend - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

API endpoint for batch product reordering with concurrency protection. Accepts new product order from admin, validates request, persists displayOrder changes safely. The frontend drag-and-drop interface (Phase 6) will consume this API — this phase focuses purely on backend contract, validation, and data persistence.

</domain>

<decisions>
## Implementation Decisions

### API Contract Design
- **HTTP status codes:** Standard REST approach
  - 200: Success
  - 400: Validation errors (bad request)
  - 401: Unauthorized (admin auth required)
  - 409: Concurrency conflict
  - 500: Server errors
- **Request format:** Claude's discretion (simple array of IDs vs explicit pairs)
- **Response shape:** Claude's discretion (success-only vs full updated product list)
- **Category scope:** Claude's discretion (explicit categoryId in request vs inferred from products)

### Validation & Errors
- **Required validations:**
  - All product IDs must exist in database
  - All products must belong to the same category (no mixed-category reordering)
  - No duplicate product IDs in request
  - Request must include all products in the category (full reorder, not partial)
- **Error messages:** Specific and helpful
  - Example: "Product ABC123 not found" instead of generic "Validation failed"
  - Example: "Cannot reorder: products from multiple categories (bracelets, necklaces)"
- **displayOrder gaps:** Claude's discretion (enforce 10/20/30 pattern vs accept client values)
- **Transaction handling:** Claude's discretion (atomic all-or-nothing vs partial updates)

### Performance Constraints
- **Batch size limit:** No hard limit
  - Accept categories with 200+ products in single request
  - No artificial cap on products per reorder
- **Database optimization:** Use bulk update operation
  - MongoDB bulkWrite() for batch updates (single database round-trip)
  - Optimize for large category reorders
- **Processing mode:** Claude's discretion (synchronous vs async background job)
- **Request timeout:** Claude's discretion (explicit timeout vs default server handling)

### Claude's Discretion
- Request format (array of IDs vs {id, displayOrder} pairs)
- Response shape (success message vs full product array)
- Category scope approach (explicit vs inferred)
- displayOrder gap enforcement (strict 10/20/30 vs flexible)
- Transaction handling (atomic vs partial)
- Processing mode (sync vs async for large batches)
- Timeout configuration (custom vs default)

</decisions>

<specifics>
## Specific Ideas

No specific product references or external examples — open to standard REST API patterns and MongoDB best practices.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-product-ordering-backend*
*Context gathered: 2026-02-02*
