# Phase 9: Bug Catalog

**Created:** 2026-02-04
**Test Phase:** Desktop Browser Testing
**Browser:** Chrome (latest)

---

## Bug Tracking

| Bug ID | Priority | Status | Category | Test |
|--------|----------|--------|----------|------|
| BUG-01 | MEDIUM | FIXED | Accessibility | Keyboard - Focus Indicators |
| BUG-02 | HIGH | DEFERRED | Accessibility | Keyboard - Product Reordering |
| BUG-03 | LOW | DEFERRED | UX Polish | Focus-Visible Styling |

---

## BUG-01: Drag Handle Missing Focus Indicator

**Priority:** MEDIUM
**Category:** Accessibility
**Test:** Keyboard Accessibility - Focus Indicators (Test 4.3)
**Status:** FIXED

### Description
Drag handles in reorder mode do not show visible focus indicator when navigating with Tab key.

### Steps to Reproduce
1. Navigate to Admin Products page
2. Select a category with products
3. Click "Reorder Products" button
4. Press Tab repeatedly to navigate to drag handle
5. Observe: No visible outline or border on focused drag handle

### Expected Behavior
Drag handle should show visible focus indicator (outline, border, or background change) when focused via keyboard.

### Actual Behavior
Drag handle receives focus (can be activated with Space/Enter) but has no visual indicator.

### Impact
- Users navigating by keyboard cannot see which drag handle is focused
- Violates best practices for keyboard accessibility
- Not a WCAG violation (drag itself isn't keyboard accessible, so focus indicator is secondary)

### Suggested Fix
Add CSS focus styling to drag handle:
```css
.drag-handle:focus {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}
```

### Files Affected
- `frontend/css/categories-800plus.css` (or relevant admin CSS file)

### Blocking v1.1 Ship?
**NO** - Medium priority, affects keyboard users but drag-and-drop isn't keyboard accessible anyway (BUG-02)

### Fix Details
**Fixed:** 2026-02-04
**Fix:** Added CSS `:focus` state to `.drag-handle` class
- Outline: 2px solid #007bff
- Outline offset: 2px
- Color change on focus: #4b5563 (matches hover state)
**Files Modified:** `admin/bambaYafa-desktop.css`
**Commit:** [pending]

---

## BUG-02: Product Reordering Not Keyboard Accessible

**Priority:** HIGH
**Category:** Accessibility (WCAG Violation)
**Test:** Keyboard Accessibility - Product Reordering (Test 2.2-2.5)
**Status:** Open

### Description
Users cannot reorder products using only keyboard. SortableJS drag-and-drop requires mouse interaction.

### Steps to Reproduce
1. Navigate to Admin Products page
2. Select category, enter reorder mode
3. Tab to drag handle
4. Press Space or Enter (attempt to grab product)
5. Observe: Nothing happens (no "grabbed" state)
6. Press Arrow Up/Down keys
7. Observe: Product doesn't move (page scrolls instead)

### Expected Behavior (WCAG 2.1.2)
Users should be able to reorder products using keyboard:
- Space/Enter to grab product
- Arrow keys to move up/down
- Space/Enter to drop product
- OR alternative: Move Up/Down buttons next to each product

### Actual Behavior
No keyboard reordering mechanism exists. SortableJS does not support keyboard drag by default.

### Impact
- **WCAG 2.1.2 violation:** All functionality must be operable via keyboard
- Keyboard-only users (motor disabilities, power users) cannot reorder products
- Screen reader users cannot reorder products
- **Success Criterion #6 not met:** Keyboard accessibility requirement

### Research Notes
From Phase 09 research (09-RESEARCH.md):
- SortableJS doesn't include keyboard drag by default
- Alternatives:
  1. Implement custom keyboard drag pattern (Space to grab, Arrow to move, Space to drop)
  2. Add move up/down buttons (easier, industry standard for accessibility)
  3. Use different drag library with keyboard support (react-beautiful-dnd, dnd-kit)

### Suggested Fix Options

**Option A: Move Up/Down Buttons (Recommended)**
- Add ↑ and ↓ buttons next to each product in reorder mode
- Click/keyboard activates swap with adjacent product
- Simple, WCAG compliant, works for touch devices too
- Example: WordPress admin menu reordering

**Option B: Custom Keyboard Drag Pattern**
- Implement Space to grab/drop, Arrow keys to move
- More complex, requires custom event handling
- Better UX for power users

**Option C: Defer to v1.2**
- Document as known limitation
- Note in release notes: "Product reordering requires mouse; keyboard support planned for v1.2"

### Files Affected
- `admin/BisliView.js` (reorder mode logic)
- `frontend/css/categories-*.css` (if adding buttons)

### Blocking v1.1 Ship?
**DEPENDS** - This is a WCAG violation, but:
- Admin panel is internal tool (not public-facing)
- Affects small subset of users (keyboard-only admin users)
- Product reordering is non-critical admin function
- Decision: User decision needed - ship with known limitation or delay for fix?

### Deferral Decision
**Decision:** DEFERRED to v1.2
**Rationale:**
- Requires architectural change (move up/down buttons or custom keyboard drag)
- Implementation effort: 20-30 minutes for Option A (move up/down buttons)
- Internal admin tool with limited keyboard-only users
- Timeline constraints for v1.1 ship
- Will be documented in known limitations

**Planned for v1.2:**
- Implement Option A: Move Up/Down buttons
- Pattern: WordPress admin menu reordering
- Benefit: Works for touch devices too

---

## BUG-03: Focus-Visible Styling Not Explicitly Implemented

**Priority:** LOW
**Category:** UX Polish
**Test:** Keyboard Accessibility - Focus Indicators (Test 4.4)
**Status:** Open

### Description
Browser default `:focus-visible` behavior works, but no custom focus styling implemented for better UX.

### Steps to Reproduce
1. Navigate to Admin Products page
2. Click a button with mouse
3. Observe: No focus indicator (correct)
4. Tab to a button with keyboard
5. Observe: Browser default focus outline appears (works, but not styled)

### Expected Behavior
Custom `:focus-visible` styling for better visual consistency and brand alignment.

### Actual Behavior
Browser default focus indicators (varies by browser/OS).

### Impact
- No functional impact (default behavior works)
- Minor UX polish issue (inconsistent styling across browsers)
- Good accessibility practice to explicitly define focus styles

### Suggested Fix
Add custom `:focus-visible` styling:
```css
*:focus-visible {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}

button:focus-visible {
  outline: 2px solid #007bff;
  outline-offset: 2px;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}
```

### Files Affected
- `frontend/css/categories-800plus.css` (global focus styles)

### Blocking v1.1 Ship?
**NO** - Low priority polish, can defer to v1.2

### Deferral Decision
**Decision:** DEFERRED to v1.2+
**Rationale:**
- Browser default `:focus-visible` behavior works correctly
- No functional impact, cosmetic enhancement only
- Low priority relative to other v1.2 features

---

## Bug Priority Definitions

**HIGH:** Blocks core functionality or violates accessibility standards
**MEDIUM:** Affects usability but has workarounds
**LOW:** Polish/cosmetic issues

---

## Bug Triage Summary

### Blocking (must fix for v1.1)
None - all bugs are non-blocking for v1.1 ship

### High (should fix for v1.1)
- [ ] BUG-02: Product reordering not keyboard accessible (WCAG 2.1.2 violation)
  - Status: Requires architectural decision (move up/down buttons vs custom keyboard drag)
  - Decision: Defer to v1.2 per internal admin tool scope and timeline constraints
  - Documentation: Will be noted in known limitations

### Medium (defer to v1.2)
- [x] BUG-01: Drag handle missing focus indicator
  - Status: Simple CSS fix, will implement during batch fix phase
  - Impact: Improves keyboard navigation visibility

### Low (defer to v1.2+)
- [ ] BUG-03: Custom focus-visible styling not implemented
  - Status: Browser defaults work, cosmetic enhancement only
  - Impact: Minor UX polish, not functionally required

## Batch Fix Recommendations

### Will Fix in This Plan (09-04)
- BUG-01 (drag handle focus indicator) - Simple CSS addition, improves accessibility

### Deferred to v1.2
- BUG-02 (keyboard reordering) - Requires architectural decision and significant implementation effort
- BUG-03 (custom focus-visible styling) - Low priority polish

---

## Next Steps

1. Complete remaining tests (Memory Leak, Concurrent Admin)
2. User decision on BUG-02 (keyboard reordering):
   - Ship v1.1 with known limitation? OR
   - Implement move up/down buttons before ship?
3. Batch fix non-blocking bugs (BUG-01, BUG-03) if time permits

---

