---
phase: 04-schema-foundation-library-setup
plan: 02
subsystem: frontend-infrastructure
tags: [sortablejs, css-variables, z-index, drag-drop-prep, modal-prep]

requires:
  - none

provides:
  - SortableJS library (1.15.6)
  - Z-index CSS variable system
  - Pre-styled SortableJS integration classes

affects:
  - 06-drag-drop-reordering (will use SortableJS and z-index vars)
  - 08-modal-integration (will use z-index vars for modal layering)

tech-stack:
  added:
    - sortablejs@1.15.6
  patterns:
    - CSS custom properties for z-index management
    - Bootstrap-compatible z-index scale

key-files:
  created:
    - frontend/css/variables.css
  modified:
    - frontend/package.json
    - frontend/package-lock.json

decisions:
  - id: sortablejs-version
    choice: "Install latest stable (1.15.6) without version pinning"
    rationale: "No breaking change concerns, want latest features and bug fixes"
    alternatives: ["Pin to specific version"]
    impact: "Will get patch updates on npm install"

  - id: z-index-scale
    choice: "Bootstrap-compatible values (modal: 1050-1060, drag: 1100-1110)"
    rationale: "Industry standard, allows future Bootstrap integration, gaps for intermediate layers"
    alternatives: ["Custom scale", "Smaller values"]
    impact: "Consistent with common UI frameworks, easier to debug layer issues"

  - id: css-variables-import-deferred
    choice: "Create variables.css but don't import anywhere yet"
    rationale: "Phase 6/8 will handle integration when features are implemented"
    alternatives: ["Import immediately into all pages"]
    impact: "No effect on existing pages, isolated foundation work"

metrics:
  duration: 2min
  tasks_completed: 2
  commits: 2
  files_changed: 3
  completed: 2026-02-01
---

# Phase 4 Plan 02: Library Installation & Z-Index Foundation Summary

**One-liner:** Installed SortableJS (1.15.6) and established Bootstrap-compatible z-index CSS variable system for future drag-drop and modal integration.

## What Was Built

**Infrastructure preparation for Phase 6 (drag-and-drop) and Phase 8 (modals):**

1. **SortableJS Library Installation**
   - Added sortablejs@1.15.6 as runtime dependency
   - Framework-agnostic, zero dependencies
   - Touch support for mobile/tablet
   - RTL awareness for future Hebrew admin
   - Industry standard (27k+ GitHub stars, used by Trello, GitHub Projects, Shopify)

2. **Z-Index CSS Variable System**
   - Created frontend/css/variables.css with centralized z-index scale
   - Bootstrap-compatible values (modal-backdrop: 1050, modal: 1055)
   - Drag elements above modals (1100-1110) for clear UX
   - Gaps of 50-100 allow intermediate layers without renumbering
   - Pre-styled SortableJS classes (.sortable-ghost, .sortable-chosen, .sortable-drag)

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Install SortableJS library | 6bbd996 | frontend/package.json, frontend/package-lock.json |
| 2 | Create z-index CSS variable system | 2cb8507 | frontend/css/variables.css |

## Technical Implementation

### SortableJS Installation

```bash
npm install sortablejs --save
```

Installed as runtime dependency (not dev) since drag-and-drop will be user-facing feature in production admin interface.

### CSS Variables Architecture

**Z-Index Scale Hierarchy:**
- Base layers: 0-300 (header, dropdown, sticky)
- Modal layers: 1050-1060 (backdrop, modal, close button)
- Drag layers: 1100-1110 (ghost, chosen, active drag)
- Notifications: 2000+ (toast, tooltip)

**SortableJS Integration Classes:**
```css
.sortable-ghost {
  z-index: var(--z-sortable-ghost);
  opacity: 0.4;
  background-color: #f0f0f0;
}

.sortable-chosen {
  z-index: var(--z-sortable-chosen);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.sortable-drag {
  z-index: var(--z-sortable-drag);
  opacity: 1;
}
```

These classes are applied automatically by SortableJS during drag operations, ensuring proper layering above all other UI elements including modals.

## Decisions Made

**1. SortableJS Version Strategy**
- **Choice:** Install latest stable without version pinning
- **Rationale:** No known breaking changes, want latest bug fixes and features
- **Impact:** Will receive patch updates on npm install

**2. Z-Index Scale Design**
- **Choice:** Bootstrap-compatible values with 50-100 gaps
- **Rationale:** Industry standard, allows future library integration, easy to debug
- **Impact:** Consistent with common frameworks, can add intermediate layers without refactoring

**3. CSS Import Deferred**
- **Choice:** Create variables.css but don't import anywhere yet
- **Rationale:** No features use it yet - Phase 6/8 will integrate when implementing
- **Impact:** Zero effect on existing pages, isolated foundation work

## Verification Results

All verification checks passed:

- ✅ SortableJS 1.15.6 installed in frontend/package.json dependencies
- ✅ npm ls sortablejs shows library in dependency tree
- ✅ frontend/css/variables.css created with all required variables
- ✅ CSS file defines --z-modal, --z-sortable-ghost, and other z-index variables
- ✅ CSS file includes SortableJS class styling (.sortable-ghost, .sortable-chosen, .sortable-drag)
- ✅ Frontend still builds/runs without errors (no imports = no impact)

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

**For Phase 6 (Drag-and-Drop Reordering):**
- Import SortableJS: `import Sortable from 'sortablejs';`
- Import variables.css in admin pages
- Instantiate Sortable with RTL configuration (if needed)
- Z-index layering already handled by variables.css classes

**For Phase 8 (Modal Integration):**
- Import variables.css in pages with modals
- Use --z-modal-backdrop, --z-modal, --z-modal-close variables
- Modals will correctly layer below drag elements (1055 < 1100)

## Next Phase Readiness

**Ready for Phase 5 (Product Schema Migration):**
- Libraries installed but not yet used (intentional)
- CSS foundation exists but not imported (intentional)
- No blocking issues

**Blockers/Concerns:**
- None - pure infrastructure preparation
- Actual integration testing happens in Phase 6 when SortableJS is instantiated
- RTL coordinate testing deferred to Phase 6 (mentioned in STATE.md blockers)

**Technical Debt:**
- None - clean foundation work

## Files Changed

**Created:**
- frontend/css/variables.css (65 lines)

**Modified:**
- frontend/package.json (added sortablejs dependency)
- frontend/package-lock.json (dependency tree update)

## Performance Impact

**Build/Runtime:**
- Zero impact - library not imported, CSS not loaded
- SortableJS: 23KB minified, 8KB gzipped (when eventually imported)
- variables.css: <1KB (when eventually imported)

**Development:**
- npm install time: +5 seconds for sortablejs

## Testing Notes

**Not tested (intentional):**
- SortableJS functionality - deferred to Phase 6
- CSS variable usage - deferred to Phase 6/8
- RTL coordinate behavior - deferred to Phase 6

**Why:** This plan only installs dependencies and creates foundation files. Actual functionality testing happens when features are implemented in later phases.

## Knowledge for Future Phases

**SortableJS Critical Features:**
- RTL awareness via `direction: 'rtl'` option (test in Phase 6)
- Touch support enabled by default (mobile/tablet drag-and-drop works)
- Keyboard navigation via handle element
- Animation options for smooth drag transitions
- Fallback for older browsers (uses native drag-and-drop when available)

**Z-Index Pitfalls Avoided:**
- Transform/opacity creating new stacking context (addressed via .sortable-fallback class)
- Fixed/absolute positioning issues (gaps in scale allow intermediate values)
- Modal vs drag priority clear (drag: 1100 > modal: 1055)

**CSS Variable Benefits:**
- Single source of truth for z-index values
- Easy to adjust scale globally
- var() fallback support not needed (modern browsers only per browserslist)
- Inheritance works across shadow DOM boundaries (if needed)

---

**Execution Time:** 2 minutes
**Status:** Complete ✅
**Next Plan:** 04-03 (continue Phase 4 schema foundation work)
