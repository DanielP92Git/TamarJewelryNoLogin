# Phase 1: Database Foundation - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend data schema and validation layer for SKU management. Establishes database field, uniqueness constraints, and validation rules. Ensures backwards compatibility for existing products without SKUs. Admin UI and frontend display are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Validation behavior
- **SKU requirement**: Required for all new products. Existing products can remain without SKUs.
- **Empty SKU handling**: Show "SKU required" error if admin tries to save new product without SKU. No auto-generation.
- **Edit validation**: When SKU hasn't changed during edit, skip uniqueness validation to prevent false duplicates.
- **Validation timing**: Server-side enforcement is mandatory. Client-side real-time validation is optional/discretionary.

### Migration strategy
- **Existing products**: Default SKU field to null/empty for all existing products when schema is added.
- **Admin notification**: Show notification banner in dashboard indicating count of products without SKUs, with link to filter/update them.
- **Bulk updates**: Include multi-select UI feature allowing admin to select multiple products and add SKUs in batch.
- **Bulk update approach**: Multi-select products in dashboard with inline editor or modal for entering SKUs.

### Error responses
- **Duplicate SKU message**: Show conflict details - "SKU 'ABC123' is already used by [Product Name]. Please choose a different SKU."
- **Bulk update errors**: Partial success model - apply valid SKUs, report failed ones separately. Admin can retry only failures.
- **HTTP status codes**: Claude's discretion (choose appropriate codes for validation errors).
- **Error structure**: Claude's discretion (decide whether to group with other product validation errors or separate).

### Data normalization
- **Case handling**: Force uppercase - all SKUs converted to uppercase automatically (ABC123 and abc123 treated as duplicates).
- **Whitespace**: Auto-trim leading/trailing whitespace before processing.
- **Character restrictions**: Alphanumeric only (A-Z, 0-9). Reject with validation error if special characters or spaces are present.
- **Invalid character handling**: Reject with error - don't silently strip. Admin must correct input.
- **Length limits**: Minimum 2 characters, maximum 7 characters.
- **Normalization order**: Normalize first (trim whitespace, convert uppercase), then validate format, then check uniqueness.

### Claude's Discretion
- Client-side real-time validation implementation (optional API check as admin types)
- Exact HTTP status codes for different validation error types
- Error response structure (grouped vs separate from other product errors)

</decisions>

<specifics>
## Specific Ideas

- Compact SKU format (2-7 chars) suitable for small handmade jewelry catalog
- Professional e-commerce standard: uppercase alphanumeric codes
- Admin workflow focused on gradual migration - no forced immediate updates to existing products

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 01-database-foundation*
*Context gathered: 2026-02-01*
