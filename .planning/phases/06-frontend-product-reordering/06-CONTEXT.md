# Phase 6: Frontend Product Reordering - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Drag-and-drop interface for admins to reorder products within categories. Backend API (Phase 5) is complete — this phase delivers the interactive admin UX that calls it. Admins can visually manipulate product order, save changes, and receive feedback on success/error/conflicts.

</domain>

<decisions>
## Implementation Decisions

### Drag Interaction Design
- **Drag handle:** Icon-only (⋮⋮ grip) — minimal visual noise, common pattern
- **Drag visual:** Ghost preview (semi-transparent) — dragged item becomes semi-transparent, placeholder shows original position
- **Drop zones:** Gap expansion — space between rows expands to show where item will land
- **Touch support:** Yes, full touch support — long-press to initiate drag on touch devices (SortableJS handles this)
- **Drag constraints:** Category-locked (enforced) — products can't be dragged outside their category
- **Category organization:** One category at a time — dropdown selector to switch categories, reorder within selected category only
- **Mode toggle:** Toggle mode (edit/view) — button to enter 'reorder mode', drag handles only visible in that mode
- **Unsaved navigation:** Block navigation with warning — "You have unsaved changes" dialog, stay or discard

### Save/Cancel Workflow
- **Save timing:** Explicit save button — user drags to reorder, then clicks 'Save Order' to persist changes
- **Cancel action:** Revert to original order — cancel button resets list to order before entering reorder mode
- **Undo/redo:** Full undo/redo stack — undo button reverses last drag, redo re-applies it (multiple levels)
- **Control position:** Floating action bar (bottom) — sticky bar at bottom with Save/Cancel/Undo/Redo buttons

### Visual Feedback States
- **Loading state:** Disable list + spinner — product list becomes non-interactive, loading spinner overlays it
- **Success feedback:** Success toast + exit mode — show 'Order saved!' message, exit reorder mode back to normal view
- **Error display:** Claude's discretion — choose between toast/banner/modal based on codebase patterns
- **Conflict handling (409):** Auto-refresh + notify — reload product list automatically, show 'List was updated by another admin' message

### List Presentation
- **Row content:** Image + name + key details — include price, SKU, and availability status
- **Row density:** Same as normal view — keep consistent spacing between modes
- **Category switching:** Dropdown selector — dropdown menu at top, select category to load its products
- **Empty state:** Empty state message — "No products in this category yet" with link to add products

### Claude's Discretion
- Exact error display pattern (toast vs banner vs modal) for generic errors
- Undo/redo stack implementation details
- Drag handle icon styling and positioning
- Exact wording for messages and tooltips

</decisions>

<specifics>
## Specific Ideas

- SortableJS library is already installed (Phase 4) — use it for drag-and-drop implementation
- API endpoint ready: POST /api/admin/products/reorder (Phase 5)
- Z-index CSS variables established in Phase 4 (modal: 1050-1060, drag: 1100-1110)
- API validates category scope and returns 409 Conflict on concurrent updates

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-frontend-product-reordering*
*Context gathered: 2026-02-03*
