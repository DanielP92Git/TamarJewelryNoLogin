# Phase 2: Admin Workflow - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can create new products with SKUs, edit existing products to add/update SKUs, and search products by SKU through dashboard. This phase delivers the complete admin tooling for SKU management including forms, validation, listings, search, and workflows for migrating legacy products.

</domain>

<decisions>
## Implementation Decisions

### Form validation and error feedback
- **Validation timing:** Claude's discretion (real-time, on blur, or on submit)
- **Duplicate error message:** Show conflicting product name with clickable link to view that product (e.g., "SKU ABC123 is already used by Silver Ring [View Product]")
- **SKU requirement:** Required field for Add Product form (cannot save new product without SKU)
- **Field position:** SKU field appears at bottom of Add/Edit Product forms (after other fields)
- **Input formatting:** Auto-uppercase as admin types (visual feedback for consistency)
- **Edit confirmation:** Show warning before saving when changing existing product's SKU (prevents accidental changes)
- **Error handling:** Scroll to error and focus SKU field when validation fails on submit
- **Required indicator:** Red asterisk (*) next to SKU label on Add Product form

### Product listing and SKU visibility
- **Column position:** SKU appears as second column in product listing table (after product name)
- **Sorting:** Yes, clickable column header to sort A-Z or Z-A by SKU
- **Empty SKU display:** Show 'N/A' or dash (-) for products without SKUs
- **SKU interaction:** SKU text is non-interactive (just display, no click behavior)

### Search and filtering workflows
- **Search behavior:** Partial match (contains) - find products if SKU contains search term
- **Search field:** Claude's discretion (dedicated SKU field vs unified search vs dropdown filter)
- **Missing SKU filter:** Quick filter button/badge showing count like "Missing SKU (23)" that filters when clicked
- **Filter persistence:** Yes, remember search/filter state in session when admin navigates away and returns

### Legacy product migration
- **Migration workflow:** Both bulk edit mode AND inline editing in listing table
- **Bulk edit design:** Table view where each row has an editable SKU input field, save all changes at once
- **Inline edit trigger:** Single click on SKU cell makes it editable immediately
- **Visual priority:** No special highlighting for missing SKUs - rely on filter to surface them

### Claude's Discretion
- Exact validation timing strategy (real-time vs blur vs submit)
- Search field implementation (dedicated vs unified vs dropdown)
- Inline editing save/cancel UI details
- Error state styling and animation
- Loading states during validation checks

</decisions>

<specifics>
## Specific Ideas

- Duplicate error should be actionable - show product name AND provide link to view the conflicting product
- Auto-uppercase input provides immediate visual feedback that SKU will be stored in uppercase format
- Bulk edit mode optimized for admin workflow: filter to "Missing SKU", then fill multiple products quickly
- Inline editing for quick one-off SKU additions without leaving the listing page
- Filter persistence helps admin resume work efficiently after editing individual products

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 02-admin-workflow*
*Context gathered: 2026-02-01*
