# Phase 6: Frontend Product Reordering - Research

**Researched:** 2026-02-03
**Domain:** Drag-and-drop UI with state management and optimistic concurrency
**Confidence:** HIGH

## Summary

Phase 6 delivers a drag-and-drop product reordering interface for admins using SortableJS (already installed, v1.15.6). The interface provides category-scoped reordering with explicit save/cancel, full undo/redo, visual feedback states, and handles optimistic concurrency conflicts (409) from the backend API.

The standard approach uses SortableJS for drag interactions (handles touch/mobile automatically), vanilla JavaScript for state management (command pattern for undo/redo), and lightweight toast notifications for feedback. The existing MVC architecture extends naturally: a new `adminProductsView.js` manages UI state and SortableJS integration, while `model.js` handles API calls.

Key architectural decisions are locked from CONTEXT.md: drag handles visible only in "reorder mode", floating action bar at bottom with Save/Cancel/Undo/Redo, category dropdown selector, and auto-refresh on 409 conflicts. CSS variables for z-index (1100-1110 for drag layers, 2000 for toasts) are already established in `variables.css`.

**Primary recommendation:** Use SortableJS with handle option, implement command pattern for undo/redo (stack-based state tracking), use Toastify.js for notifications (3KB, zero dependencies), and follow existing codebase patterns (alert() currently used, migrate to toast pattern).

## Standard Stack

The established libraries/tools for drag-and-drop reordering with admin UX:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SortableJS | 1.15.6 | Drag-and-drop list reordering | Already installed, industry standard, touch support, RTL-aware via CSS, zero dependencies, 96%+ browser support |
| Vanilla JavaScript | ES6+ | State management and undo/redo | Existing codebase pattern (no React/Vue), command pattern for undo/redo is framework-agnostic |
| Fetch API | Native | HTTP requests to backend | Existing codebase standard (see model.js) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Toastify.js | Latest | Toast notifications | Lightweight (3KB), zero dependencies, positioned notifications, aligns with modern UX patterns |
| CSS Custom Properties | Native | Z-index scale and theming | Already established in variables.css (--z-sortable-ghost: 1100, --z-toast: 2000) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Toastify.js | Native alert() | alert() currently used in codebase (see cartView.js:468), but blocks UI and poor UX; toast is non-blocking and modern |
| Command pattern | External undo lib (js-undo-redo) | External lib adds 5KB dependency; command pattern is 50 lines, tailored to domain, no deps |
| SortableJS | Pragmatic-drag-and-drop | Pragmatic is framework-agnostic but requires more setup; SortableJS already installed and battle-tested |

**Installation:**
```bash
# SortableJS already installed (Phase 4)
npm install sortablejs  # v1.15.6 confirmed in package.json

# Add Toastify.js for toast notifications
npm install toastify-js
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/
├── js/
│   ├── Views/
│   │   └── adminProductsView.js    # New: Admin product list with reorder mode
│   ├── model.js                     # Extend: Add reorder API call
│   └── controller.js                # Extend: Add admin route handler
├── css/
│   ├── admin-products.css           # New: Admin product list styles
│   ├── admin-products-800plus.css   # New: Desktop styles
│   └── variables.css                # Exists: Z-index scale already defined
└── html/
    └── admin/
        └── products.html            # New: Admin product management page
```

### Pattern 1: SortableJS Integration with Handle
**What:** Drag-and-drop with handle selector (grip icon)
**When to use:** When only specific UI element should initiate drag (not entire row)
**Example:**
```javascript
// Source: https://sortablejs.github.io/Sortable/
import Sortable from 'sortablejs';

const productList = document.querySelector('.product-list');
const sortable = Sortable.create(productList, {
  handle: '.drag-handle',           // Drag only from grip icon
  animation: 150,                    // Smooth animation during drag
  ghostClass: 'sortable-ghost',      // CSS class for placeholder (opacity: 0.4)
  chosenClass: 'sortable-chosen',    // CSS class for selected item
  dragClass: 'sortable-drag',        // CSS class for dragging item
  disabled: false,                   // Toggle for reorder mode
  onEnd: (evt) => {
    // Record move for undo/redo
    const command = new MoveCommand(evt.oldIndex, evt.newIndex);
    undoStack.push(command);
    redoStack = []; // Clear redo stack on new action
  }
});

// Toggle reorder mode
function enterReorderMode() {
  sortable.option('disabled', false);
  document.querySelectorAll('.drag-handle').forEach(el => el.style.display = 'block');
}

function exitReorderMode() {
  sortable.option('disabled', true);
  document.querySelectorAll('.drag-handle').forEach(el => el.style.display = 'none');
}
```

### Pattern 2: Command Pattern for Undo/Redo
**What:** Stack-based state tracking with command objects
**When to use:** When users need multi-level undo/redo for reversible operations
**Example:**
```javascript
// Source: https://www.esveo.com/en/blog/undo-redo-and-the-command-pattern/
class MoveCommand {
  constructor(fromIndex, toIndex) {
    this.fromIndex = fromIndex;
    this.toIndex = toIndex;
  }

  execute(list) {
    const item = list.splice(this.fromIndex, 1)[0];
    list.splice(this.toIndex, 0, item);
  }

  undo(list) {
    const item = list.splice(this.toIndex, 1)[0];
    list.splice(this.fromIndex, 0, item);
  }
}

class UndoManager {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
    this.productOrder = []; // Current state
  }

  execute(command) {
    command.execute(this.productOrder);
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo on new action
    this.updateUI();
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const command = this.undoStack.pop();
    command.undo(this.productOrder);
    this.redoStack.push(command);
    this.updateUI();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const command = this.redoStack.pop();
    command.execute(this.productOrder);
    this.undoStack.push(command);
    this.updateUI();
  }

  canUndo() { return this.undoStack.length > 0; }
  canRedo() { return this.redoStack.length > 0; }

  updateUI() {
    // Re-render list and update button states
  }
}
```

### Pattern 3: Toast Notifications for Feedback
**What:** Non-blocking, auto-dismissing messages (Toastify.js)
**When to use:** Success, error, and info messages that don't require user action
**Example:**
```javascript
// Source: https://apvarun.github.io/toastify-js/
import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';

function showSuccessToast(message) {
  Toastify({
    text: message,
    duration: 3000,
    close: true,
    gravity: 'top',        // top or bottom
    position: 'right',     // left, center or right
    stopOnFocus: true,     // Prevents dismissing on hover
    className: 'toast-success',
    style: {
      background: 'linear-gradient(to right, #00b09b, #96c93d)',
    }
  }).showToast();
}

function showErrorToast(message) {
  Toastify({
    text: message,
    duration: 5000,       // Longer for errors
    close: true,
    gravity: 'top',
    position: 'right',
    stopOnFocus: true,
    className: 'toast-error',
    style: {
      background: 'linear-gradient(to right, #ff5f6d, #ffc371)',
    }
  }).showToast();
}

// Usage
showSuccessToast('Order saved successfully!');
showErrorToast('Failed to save. Please try again.');
```

### Pattern 4: Optimistic Concurrency with 409 Handling
**What:** Auto-refresh and retry on version conflict
**When to use:** When backend uses optimistic locking (__v field)
**Example:**
```javascript
// Source: https://treblle.com/blog/rest-api-error-handling
async function saveProductOrder(category, productIds) {
  try {
    const response = await fetch('/api/admin/products/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'auth-token': localStorage.getItem('auth-token')
      },
      body: JSON.stringify({ category, productIds })
    });

    const data = await response.json();

    if (response.status === 409) {
      // Conflict: Another admin modified products
      showErrorToast('Product list was updated by another admin. Refreshing...');
      await refreshProductList(category); // Reload from server
      return { conflict: true };
    }

    if (!response.ok) {
      throw new Error(data.errors || 'Failed to save order');
    }

    showSuccessToast('Order saved successfully!');
    return { success: true };

  } catch (error) {
    console.error('Save error:', error);
    showErrorToast(`Error: ${error.message}`);
    return { error: error.message };
  }
}
```

### Pattern 5: Unsaved Changes Warning
**What:** beforeunload event to prevent accidental navigation
**When to use:** When user has unsaved changes in reorder mode
**Example:**
```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
let hasUnsavedChanges = false;

function enterReorderMode() {
  hasUnsavedChanges = false;
  window.addEventListener('beforeunload', handleBeforeUnload);
}

function exitReorderMode() {
  hasUnsavedChanges = false;
  window.removeEventListener('beforeunload', handleBeforeUnload);
}

function handleBeforeUnload(event) {
  if (!hasUnsavedChanges) return;

  // Modern browsers show generic message
  event.preventDefault();
  event.returnValue = ''; // Required for Chrome
}

// Mark changes as unsaved on any drag
sortable.onEnd = () => {
  hasUnsavedChanges = true;
};

// Clear flag on save
async function saveOrder() {
  hasUnsavedChanges = false;
  // ... save logic
}
```

### Pattern 6: Loading State with Overlay
**What:** Disable UI with spinner during save operation
**When to use:** During async operations that should block interaction
**Example:**
```javascript
// Source: https://github.com/muhdfaiz/js-loading-overlay
function showLoadingOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.innerHTML = `
    <div class="spinner"></div>
    <p>Saving order...</p>
  `;
  document.querySelector('.product-list-container').appendChild(overlay);
}

function hideLoadingOverlay() {
  const overlay = document.querySelector('.loading-overlay');
  if (overlay) overlay.remove();
}

// CSS
// .loading-overlay {
//   position: absolute;
//   top: 0; left: 0; right: 0; bottom: 0;
//   background: rgba(255, 255, 255, 0.8);
//   display: flex;
//   flex-direction: column;
//   align-items: center;
//   justify-content: center;
//   z-index: 1000;
//   pointer-events: all; /* Block all clicks */
// }
```

### Pattern 7: Floating Action Bar (Bottom-Sticky)
**What:** Fixed-position action bar with Save/Cancel/Undo/Redo
**When to use:** When actions should be always accessible during editing
**Example:**
```javascript
// Source: https://web.dev/articles/building/a-fab-component
// HTML structure
const actionBar = `
  <div class="reorder-action-bar">
    <button class="btn-undo" disabled>Undo</button>
    <button class="btn-redo" disabled>Redo</button>
    <div class="action-bar-spacer"></div>
    <button class="btn-cancel">Cancel</button>
    <button class="btn-save">Save Order</button>
  </div>
`;

// CSS
// .reorder-action-bar {
//   position: fixed;
//   bottom: 0;
//   left: 0;
//   right: 0;
//   background: white;
//   border-top: 1px solid #ddd;
//   padding: 12px 16px;
//   display: flex;
//   gap: 12px;
//   align-items: center;
//   box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
//   z-index: var(--z-sticky); /* 300 from variables.css */
// }
//
// .action-bar-spacer { flex: 1; } /* Push Save/Cancel to right */
```

### Anti-Patterns to Avoid
- **Auto-saving on every drag:** Causes excessive API calls, poor UX on slow connections, hard to undo mistakes
- **Blocking modal for errors:** Use toast notifications; modals require click to dismiss (friction)
- **Deep copying entire product list into history:** Memory-inefficient; command pattern stores only operations (fromIndex/toIndex)
- **Allowing drag without visible handle:** Conflicts with text selection, scrolling on touch devices

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop list reordering | Custom mousedown/touchstart event handlers | SortableJS | Touch device support is complex (300ms delay, scroll conflicts, ghost images); SortableJS handles all edge cases including RTL, nested lists, multiple lists |
| Toast notifications | Custom positioned divs with setTimeout | Toastify.js (3KB) | Stacking logic, positioning, z-index conflicts, accessibility (ARIA labels), animation, queue management |
| Undo/redo system | Direct array mutations with snapshots | Command pattern | Deep copying arrays is memory-inefficient; command pattern stores only operations (50 lines vs potential memory leaks) |
| Loading overlays | Manual z-index and pointer-events | CSS pattern with pointer-events: all | Tricky to block all interactions (buttons, links, form inputs); CSS pattern is battle-tested |
| 409 Conflict retry | Manual retry with counters | Exponential backoff pattern | Simple retry can cause thundering herd; exponential backoff prevents server overload |

**Key insight:** Drag-and-drop is deceptively complex. SortableJS handles 100+ edge cases (touch delay, ghost positioning, scroll triggers, browser differences). Building custom drag logic takes weeks and still misses mobile edge cases. SortableJS is 45KB minified, but saves 1000+ lines of custom code.

## Common Pitfalls

### Pitfall 1: Touch Device Drag Conflicts with Scroll
**What goes wrong:** On mobile, dragging fails or triggers page scroll instead
**Why it happens:** Browsers default touch events to scrolling; SortableJS delay not configured
**How to avoid:** Set SortableJS `delay: 50` and `delayOnTouchOnly: true` to distinguish tap from drag
**Warning signs:** Mobile users report "can't drag items" or "page scrolls when trying to reorder"

### Pitfall 2: Z-Index Stacking Context Issues
**What goes wrong:** Dragged item appears below other elements (modal backdrop, sticky header)
**Why it happens:** CSS transforms or opacity create new stacking contexts, breaking z-index
**How to avoid:** Use CSS variables from `variables.css` (--z-sortable-drag: 1110); avoid transform on sortable items
**Warning signs:** Dragged item visually "disappears" behind header or other elements during drag

### Pitfall 3: Undo/Redo Out of Sync with UI
**What goes wrong:** Undo button shows enabled but undo does nothing, or undo shows wrong state
**Why it happens:** Stacks not cleared on save, or UI re-rendered without updating undo manager
**How to avoid:** Clear both stacks on successful save; always call `undoManager.updateUI()` after stack operations
**Warning signs:** Undo button is enabled when it shouldn't be; undo shows stale product order

### Pitfall 4: 409 Conflict Ignored or Poorly Handled
**What goes wrong:** User clicks Save, sees error, doesn't know what to do; loses their reorder work
**Why it happens:** Generic error handling treats 409 like 500; no auto-refresh implemented
**How to avoid:** Special case 409: show "Another admin updated products" toast + auto-refresh list from server
**Warning signs:** Support tickets about "lost reorder changes" or "error when saving"

### Pitfall 5: RTL Layout Breaks Drag Visuals
**What goes wrong:** In Hebrew mode, drag handle appears on wrong side, drag animation jitters
**Why it happens:** Drag handle positioned with absolute left/right; SortableJS doesn't auto-flip
**How to avoid:** Use CSS logical properties (inset-inline-start) or conditional RTL classes; test in Hebrew mode
**Warning signs:** Hebrew users report "drag handle on wrong side" or "weird animation when dragging"

### Pitfall 6: Memory Leak from Event Listeners
**What goes wrong:** After switching categories multiple times, drag becomes sluggish
**Why it happens:** SortableJS instance not destroyed when switching categories; old listeners accumulate
**How to avoid:** Call `sortable.destroy()` before creating new instance; store reference for cleanup
**Warning signs:** Performance degrades after using reorder mode multiple times; DevTools shows increasing event listeners

### Pitfall 7: Unsaved Changes Lost on Navigation
**What goes wrong:** User drags products, accidentally clicks back button, loses all changes
**Why it happens:** No beforeunload warning; browser allows navigation without confirmation
**How to avoid:** Add beforeunload listener when entering reorder mode; remove on save/cancel
**Warning signs:** User complaints about "lost work" or "accidentally left page"

### Pitfall 8: Button State Not Updated After Operations
**What goes wrong:** Undo button stays enabled after undo stack empties; Save button disabled when changes exist
**Why it happens:** Button states not recalculated after stack operations or drag events
**How to avoid:** Call `updateButtonStates()` after every undo/redo/drag/save operation
**Warning signs:** Buttons show incorrect enabled/disabled state; users try to undo when nothing to undo

## Code Examples

Verified patterns from official sources:

### Category Dropdown Selector
```javascript
// Source: https://www.w3schools.com/howto/howto_js_filter_dropdown.asp
const categorySelect = document.querySelector('#category-selector');

categorySelect.addEventListener('change', async (e) => {
  const category = e.target.value;
  if (!category) return;

  // Exit reorder mode if active (prevents losing changes)
  if (isReorderMode) {
    if (!confirm('Exit reorder mode? Unsaved changes will be lost.')) {
      e.target.value = currentCategory; // Restore previous selection
      return;
    }
    exitReorderMode();
  }

  // Load products for selected category
  await loadProductsForCategory(category);
  currentCategory = category;
});
```

### Empty State Message
```javascript
// Source: https://www.eleken.co/blog-posts/empty-state-ux
function renderEmptyState(category) {
  const emptyHtml = `
    <div class="empty-state">
      <svg class="empty-icon"><!-- illustration --></svg>
      <h3>No products in ${category} yet</h3>
      <p>Add your first product to start organizing this category.</p>
      <a href="/admin/products/new?category=${category}" class="btn-primary">
        Add Product
      </a>
    </div>
  `;
  productListContainer.innerHTML = emptyHtml;
}

// Check after loading products
if (products.length === 0) {
  renderEmptyState(currentCategory);
}
```

### Complete Reorder Mode Lifecycle
```javascript
// Source: Combined best practices from search results
let isReorderMode = false;
let originalOrder = [];
let undoManager = null;
let sortable = null;

function enterReorderMode() {
  if (products.length === 0) {
    showErrorToast('Cannot reorder empty category');
    return;
  }

  isReorderMode = true;
  originalOrder = [...products]; // Save for cancel
  undoManager = new UndoManager(products);

  // Show drag handles
  document.querySelectorAll('.drag-handle').forEach(el => {
    el.style.display = 'flex';
  });

  // Enable SortableJS
  const list = document.querySelector('.product-list');
  sortable = Sortable.create(list, {
    handle: '.drag-handle',
    animation: 150,
    delay: 50,
    delayOnTouchOnly: true,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    onEnd: (evt) => {
      const command = new MoveCommand(evt.oldIndex, evt.newIndex);
      undoManager.execute(command);
      updateButtonStates();
    }
  });

  // Show action bar
  document.querySelector('.reorder-action-bar').style.display = 'flex';

  // Prevent navigation
  window.addEventListener('beforeunload', handleBeforeUnload);

  updateButtonStates();
}

function exitReorderMode() {
  isReorderMode = false;

  // Hide drag handles
  document.querySelectorAll('.drag-handle').forEach(el => {
    el.style.display = 'none';
  });

  // Destroy SortableJS
  if (sortable) {
    sortable.destroy();
    sortable = null;
  }

  // Hide action bar
  document.querySelector('.reorder-action-bar').style.display = 'none';

  // Remove navigation blocker
  window.removeEventListener('beforeunload', handleBeforeUnload);

  undoManager = null;
}

async function handleSave() {
  const productIds = products.map(p => p._id);

  showLoadingOverlay();
  updateButtonStates(true); // Disable all buttons

  const result = await saveProductOrder(currentCategory, productIds);

  hideLoadingOverlay();

  if (result.conflict) {
    // 409 already handled by auto-refresh
    exitReorderMode();
    return;
  }

  if (result.success) {
    originalOrder = [...products]; // Update baseline
    exitReorderMode();
    showSuccessToast('Order saved successfully!');
  } else {
    updateButtonStates(); // Re-enable buttons
  }
}

function handleCancel() {
  if (undoManager && undoManager.undoStack.length > 0) {
    if (!confirm('Discard changes and exit reorder mode?')) return;
  }

  // Restore original order
  products = [...originalOrder];
  renderProductList();
  exitReorderMode();
}

function handleUndo() {
  if (undoManager) {
    undoManager.undo();
    renderProductList();
    updateButtonStates();
  }
}

function handleRedo() {
  if (undoManager) {
    undoManager.redo();
    renderProductList();
    updateButtonStates();
  }
}

function updateButtonStates(disabled = false) {
  const undoBtn = document.querySelector('.btn-undo');
  const redoBtn = document.querySelector('.btn-redo');
  const saveBtn = document.querySelector('.btn-save');
  const cancelBtn = document.querySelector('.btn-cancel');

  if (disabled) {
    [undoBtn, redoBtn, saveBtn, cancelBtn].forEach(btn => btn.disabled = true);
    return;
  }

  undoBtn.disabled = !undoManager || !undoManager.canUndo();
  redoBtn.disabled = !undoManager || !undoManager.canRedo();
  saveBtn.disabled = !undoManager || undoManager.undoStack.length === 0;
  cancelBtn.disabled = false;
}

function handleBeforeUnload(event) {
  if (!undoManager || undoManager.undoStack.length === 0) return;
  event.preventDefault();
  event.returnValue = '';
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jQuery UI Sortable | SortableJS | ~2015 | Zero dependencies, better mobile/touch support, smaller bundle size (45KB vs 250KB with jQuery) |
| Custom drag handlers | HTML5 Drag and Drop API | ~2014 | Native browser support, but SortableJS abstracts browser differences |
| alert() for errors | Toast notifications | ~2018 | Non-blocking UX, multiple simultaneous messages, auto-dismiss, better mobile UX |
| Snapshot-based undo | Command pattern | ~2019 | Memory-efficient (stores operations not states), scales to large lists |
| Manual z-index values | CSS custom properties | ~2020 | Maintainable scale, self-documenting, prevents conflicts |
| Pessimistic locking | Optimistic concurrency | ~2020 | No server-side locks needed, better for distributed systems, standard pattern for REST APIs |

**Deprecated/outdated:**
- jQuery UI Sortable: Still works but adds 250KB jQuery dependency; SortableJS is modern standard
- Custom mousedown/touchstart: HTML5 Drag and Drop API exists, but browser differences make SortableJS wrapper essential
- alert() for notifications: Blocks UI, poor mobile UX, no theming; toast pattern is 2020s standard

## Open Questions

Things that couldn't be fully resolved:

1. **RTL-specific drag visual issues**
   - What we know: SortableJS doesn't document explicit RTL support; CSS can handle via logical properties or conditional classes
   - What's unclear: Whether ghost image positioning has RTL-specific bugs; needs testing in Hebrew mode
   - Recommendation: Test early with `dir="rtl"` on container; use `inset-inline-start` instead of `left` for drag handle; monitor GitHub issues for RTL reports

2. **Exact z-index for action bar vs toast**
   - What we know: variables.css defines --z-sticky: 300, --z-toast: 2000; action bar should be below toasts but above content
   - What's unclear: Whether sticky header (z-index ~1000 seen in cart-devices.css) conflicts with action bar
   - Recommendation: Use --z-sticky (300) for action bar; test with sticky header visible; toasts at 2000 are highest priority

3. **Category selector position on mobile**
   - What we know: Dropdown should be at top, action bar at bottom (from CONTEXT.md)
   - What's unclear: Whether category dropdown should scroll with content or be sticky on mobile
   - Recommendation: Non-sticky for mobile (avoids taking vertical space); sticky for desktop where space is abundant

4. **Migration path from alert() to toast**
   - What we know: Codebase currently uses alert() (cartView.js:468, contactMeView.js:112)
   - What's unclear: Whether to refactor existing alerts to toast in this phase or defer
   - Recommendation: Implement toast for Phase 6 only; defer existing alert() refactor to avoid scope creep

## Sources

### Primary (HIGH confidence)
- [SortableJS GitHub](https://github.com/SortableJS/Sortable) - v1.15.6 confirmed installed
- [SortableJS Official Docs](https://sortablejs.github.io/Sortable/) - API reference and examples
- [Toastify.js GitHub](https://github.com/apvarun/toastify-js) - Toast notification library docs
- [MDN: beforeunload event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event) - Navigation blocking
- [MDN: 409 Conflict](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/409) - HTTP status code
- Phase 5 SUMMARY.md - Backend API contract confirmed (POST /api/admin/products/reorder)

### Secondary (MEDIUM confidence)
- [Command Pattern for Undo/Redo](https://www.esveo.com/en/blog/undo-redo-and-the-command-pattern/) - Implementation pattern
- [Web.dev: FAB Component](https://web.dev/articles/building/a-fab-component) - Floating action button pattern
- [Empty State UX Best Practices](https://www.eleken.co/blog-posts/empty-state-ux) - Empty state design
- [API Error Handling](https://treblle.com/blog/rest-api-error-handling) - 409 conflict retry patterns
- [W3Schools: Dropdown Filter](https://www.w3schools.com/howto/howto_js_filter_dropdown.asp) - Category selector pattern

### Tertiary (LOW confidence - not used in recommendations)
- WebSearch results for "SortableJS RTL support" - No explicit RTL documentation found (needs testing)
- WebSearch results for "loading overlay patterns" - Generic patterns, not SortableJS-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - SortableJS confirmed installed and documented; Toastify.js is industry standard
- Architecture: HIGH - MVC pattern established in codebase; patterns verified from official sources
- Pitfalls: MEDIUM - Based on GitHub issues and blog posts, not direct experience with this codebase
- RTL support: LOW - No explicit SortableJS RTL docs; CSS-based solutions unverified in Hebrew mode

**Research date:** 2026-02-03
**Valid until:** 30 days (SortableJS stable, no major updates expected)

---

**Ready for planning:** All technical domains investigated, standard stack identified, patterns documented, pitfalls catalogued. Planner can create PLAN.md files with task-level specificity.
