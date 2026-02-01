# Phase 4: Schema Foundation & Library Setup - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish database schema for product ordering (displayOrder field, compound indexes) and install drag-and-drop infrastructure (SortableJS library, z-index system). This is foundation layer — no user-facing features yet, just backend schema and frontend library setup that enables drag-and-drop in later phases.

</domain>

<decisions>
## Implementation Decisions

### Default ordering strategy
- **Initial order for existing products**: Creation date, newest first (most recently added products appear first in category)
- **Numbering strategy**: Claude's discretion — use sequential or gap-based numbering based on reordering performance best practices
- **New products after migration**: Append to bottom (last position in category)
- **Products without category**: Require category — all products must have a valid category before migration proceeds (no orphaned products)

### Category scope handling
- **Category storage**: String field (e.g., 'bracelets', 'necklaces', 'earrings', 'rings')
- **displayOrder scope**: Per-category (each category has independent sequence: bracelets 1-20, necklaces 1-15, etc.)
- **Category change behavior**: Prompt admin to choose position in new category when moving product between categories
- **Existing categories**: Bracelets, Necklaces, Earrings, Rings (standard jewelry categories)

### Migration safety
- **Dry-run mode**: Claude's discretion — include if it's a best practice for schema migrations
- **Rollback capability**: Yes, include rollback script to remove displayOrder field and restore original state
- **Concurrent changes**: Lock database during migration (prevent product changes, requires brief downtime)
- **Migration logging**: Claude's discretion — include appropriate logging for debugging and audit trail

### RTL testing setup
- **RTL in admin**: Not needed — admin interface does not require RTL/Hebrew language support
- **RTL testing timing**: Skip RTL testing in Phase 4 — defer to Phase 6 when actually implementing drag-and-drop UI
- **Z-index system**: Claude's discretion — establish CSS variable scale for modal/drag layers using best practices

### Claude's Discretion
- Exact displayOrder numbering pattern (sequential vs gaps)
- Dry-run mode implementation
- Migration logging verbosity and format
- Z-index CSS variable naming and values
- RTL testing approach for development (if needed in later phases)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for schema migrations and library setup.

The key constraint is that the admin interface is English-only (no RTL needed), which simplifies the foundation phase by deferring RTL testing to Phase 6 when drag-and-drop is actually implemented in the UI.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-schema-foundation-library-setup*
*Context gathered: 2026-02-01*
