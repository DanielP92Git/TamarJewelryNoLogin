# Pitfalls Research

**Domain:** E-commerce Admin Dashboard - Drag-and-Drop Product/Image Reordering
**Researched:** 2026-02-01
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Touch Support Missing or Broken on Mobile Devices

**What goes wrong:**
Vanilla HTML5 drag-and-drop API does not support touch events by default. Admin users on tablets/mobile devices cannot reorder products or images, leading to frustration and the need to switch to desktop for basic tasks.

**Why it happens:**
Developers test on desktop browsers during development and assume HTML5 drag-and-drop "just works" everywhere. The native `dragstart`, `dragover`, and `drop` events only fire for mouse interactions, not touch events.

**How to avoid:**
- Use a library with built-in touch support (SortableJS is the industry standard for vanilla JS)
- If implementing custom drag-and-drop, add a polyfill like `drag-drop-touch-js/dragdroptouch`
- Test on actual mobile devices during development, not just Chrome DevTools device emulation
- Verify touch functionality works on both iOS Safari and Android Chrome

**Warning signs:**
- Drag functionality works on desktop but fails silently on tablets
- No `touchstart`, `touchmove`, `touchend` event handlers in codebase
- Testing plan only includes desktop browsers

**Phase to address:**
Phase 1 (Library Selection) - Choose library with proven mobile/touch support from day one

**Sources:**
- [DragDropTouch - Mobile Polyfill](https://github.com/drag-drop-touch-js/dragdroptouch)
- [Best Drag-and-Drop Libraries 2026](https://www.cssscript.com/best-drag-drop-javascript-libraries/)

---

### Pitfall 2: RTL (Hebrew Interface) Coordinate Inversion

**What goes wrong:**
In RTL mode, dragging right moves elements left and vice versa. The drag ghost appears in wrong positions. Drop zones highlight on the opposite side of where you're dragging. Visual feedback is completely broken, making the feature unusable for Hebrew-speaking admins.

**Why it happens:**
Drag-and-drop implementations calculate positions using clientX/pageX coordinates without accounting for `direction: rtl` CSS. The X-axis is essentially flipped in RTL layouts, but vanilla event coordinates are always left-to-right. Most drag-and-drop tutorials and libraries were built without RTL testing.

**How to avoid:**
- Add RTL test cases from Phase 1 - test Hebrew admin interface before building features
- Use SortableJS which has partial RTL support (though not perfect - needs manual testing)
- When calculating drop positions, check `document.dir` or `element.dir` and invert X coordinates accordingly
- Consider using `getBoundingClientRect()` which returns coordinates relative to viewport, not document flow
- Test with `<html dir="rtl">` enabled during development, not just at the end

**Warning signs:**
- Drag ghost element positions incorrectly in Hebrew mode
- Drop zones highlight on wrong side when dragging
- No `dir="rtl"` tests in test suite
- Code uses raw `event.clientX` without directional adjustments

**Phase to address:**
Phase 1 (Foundation/Setup) - RTL testing infrastructure before building drag features
Phase 2 (Implementation) - RTL-aware coordinate handling

**Sources:**
- [RTL Drag Direction Issues](https://github.com/orefalo/svelte-splitpanes/issues/3)
- [Angular Calendar RTL Drag Bug](https://github.com/mattlewis92/angular-calendar/issues/1203)
- [BigBlueButton RTL Drag-Drop Bug](https://github.com/bigbluebutton/bigbluebutton/issues/12567)

---

### Pitfall 3: Race Conditions in Product Order Updates (Multiple Admins)

**What goes wrong:**
Admin A drags Product 1 to position 3. Admin B simultaneously drags Product 5 to position 2. Both updates hit MongoDB. Final state is corrupted: two products have the same order value, some products are missing order values, or the order sequence has gaps (1, 2, 5, 8, 9 instead of 1, 2, 3, 4, 5).

**Why it happens:**
Product reordering requires reading current order values, calculating new positions, then updating multiple documents. Between read and write, another admin's changes can complete. MongoDB operations are atomic at the document level, but reordering often touches multiple documents in a single operation. Without optimistic locking or transactions, the last write wins, overwriting concurrent changes.

**How to avoid:**
**Option 1: Optimistic Concurrency Control**
- Add `__v` (version) field to Product schema (Mongoose provides this)
- Include version in update query: `Product.findOneAndUpdate({ _id, __v: currentVersion }, { $set: { order }, $inc: { __v: 1 } })`
- If version mismatch, retry with fresh data
- Frontend shows "Order changed by another user, refreshing..." message

**Option 2: Pessimistic Locking**
- Add `isBeingReordered` flag to category/product
- Before drag operation, set flag: `Category.updateOne({ name }, { $set: { isBeingReordered: true } })`
- Perform reorder operations
- Clear flag when complete
- Other admins see "Category is being reordered by another admin" message

**Option 3: Atomic Position Swaps (Best for small changes)**
- Instead of recalculating all positions, use atomic increments
- Swap only affected products: `$inc: { order: 1 }` or `$inc: { order: -1 }`
- MongoDB guarantees atomic document updates

**Option 4: Per-Category Reorder Lock**
- Use MongoDB transactions (requires replica set)
- Wrap read-calculate-update in transaction
- MongoDB handles concurrency automatically

**Recommended approach:** Start with Option 3 (atomic swaps) for MVP. Add Option 1 (optimistic locking) for full reordering operations.

**Warning signs:**
- Products in same category have duplicate order values after concurrent edits
- Order sequence has gaps (1, 2, 5, 8 instead of 1, 2, 3, 4)
- No version field or transaction handling in update code
- Testing only includes single-user scenarios

**Phase to address:**
Phase 2 (Product Ordering Backend) - Implement atomic operations with optimistic locking
Phase 4 (Testing) - Multi-user concurrency tests

**Sources:**
- [MongoDB Race Conditions - Atomic Operations](https://medium.com/tales-from-nimilandia/handling-race-conditions-and-concurrent-resource-updates-in-node-and-mongodb-by-performing-atomic-9f1a902bd5fa)
- [MongoDB Race Conditions - Optimistic Updates](https://medium.com/@codersauthority/handling-race-conditions-and-concurrent-resource-updates-in-node-and-mongodb-by-performing-f54140da8bc5)
- [MongoDB Concurrency FAQ](https://www.mongodb.com/docs/manual/faq/concurrency/)

---

### Pitfall 4: Image Array Migration Breaks Existing Products

**What goes wrong:**
Migration script converts `mainImage` + `smallImages` into unified `images` array. Script runs but:
- Old products lose their main image (desktop/mobile variants)
- Gallery image ordering is lost or reversed
- Some products end up with empty arrays
- Existing products display broken images on frontend
- Rollback is impossible because data was destructively modified

**Why it happens:**
Product schema has evolved:
- Legacy: `image` (string)
- Current: `mainImage { desktop, mobile, desktopLocal, mobileLocal, publicDesktop, publicMobile }` + `smallImages` array
- Target: unified `images` array with order field

Each product may have different fields populated based on when it was created. Migration script assumes consistent structure but finds:
- Some products still use legacy `image` field
- Some have `mainImage` but no `smallImages`
- Some have `smallImagesLocal` (legacy array) instead of `smallImages` objects
- Null/undefined values scattered throughout

**How to avoid:**
**Pre-migration audit:**
```javascript
// Find all unique image field combinations
db.products.aggregate([
  {
    $project: {
      hasImage: { $cond: [{ $ifNull: ["$image", false] }, 1, 0] },
      hasMainImage: { $cond: [{ $ifNull: ["$mainImage", false] }, 1, 0] },
      hasSmallImages: { $cond: [{ $ifNull: ["$smallImages", false] }, 1, 0] },
      hasSmallImagesLocal: { $cond: [{ $ifNull: ["$smallImagesLocal", false] }, 1, 0] }
    }
  },
  { $group: { _id: { hasImage: "$hasImage", hasMainImage: "$hasMainImage", hasSmallImages: "$hasSmallImages", hasSmallImagesLocal: "$hasSmallImagesLocal" }, count: { $sum: 1 } } }
]);
```

**Safe migration strategy:**
1. **Add new field, don't remove old** - Add `images` array field alongside existing `mainImage`/`smallImages`
2. **Dual-write period** - New updates write to both old and new fields for backward compatibility
3. **Incremental migration** - Process products in batches, verify each batch before continuing
4. **Rollback plan** - Keep old fields intact; frontend falls back to old fields if `images` array is empty
5. **Verification** - After migration, query for products with empty `images` array and investigate

**Migration script safeguards:**
```javascript
// Example safe migration (pseudo-code)
async function migrateProduct(product) {
  const images = [];

  // Priority 1: mainImage (most common)
  if (product.mainImage?.desktop) {
    images.push({
      order: 0,
      isMain: true,
      desktop: product.mainImage.desktop,
      mobile: product.mainImage.mobile,
      // ... other variants
    });
  }
  // Fallback: legacy image field
  else if (product.image) {
    images.push({
      order: 0,
      isMain: true,
      url: product.image
    });
  }

  // Priority 2: smallImages array
  if (Array.isArray(product.smallImages)) {
    product.smallImages.forEach((img, index) => {
      if (img?.desktop) {
        images.push({
          order: index + 1,
          isMain: false,
          desktop: img.desktop,
          mobile: img.mobile
        });
      }
    });
  }
  // Fallback: legacy smallImagesLocal
  else if (Array.isArray(product.smallImagesLocal)) {
    product.smallImagesLocal.forEach((url, index) => {
      images.push({
        order: index + 1,
        isMain: false,
        url
      });
    });
  }

  // CRITICAL: Don't delete old fields yet
  await Product.updateOne(
    { _id: product._id },
    { $set: { images } }
    // NOT: { $set: { images }, $unset: { mainImage: '', smallImages: '' } }
  );
}
```

**Warning signs:**
- Migration script has no dry-run mode
- No backup taken before migration
- Script uses `$unset` to remove old fields
- No field existence checks (`if (product.mainImage)`)
- Testing only covers products with complete field sets
- No rollback plan documented

**Phase to address:**
Phase 3 (Image Array Migration) - Dedicated phase with extensive testing
Phase 4 (Verification) - Post-migration data validation

**Sources:**
- [MongoDB Schema Migrations with migrate-mongo](https://postulate.us/@samsonzhang/p/2021-03-06-Making-Mongodb-Schema-Changes-with-kL4J3vYUhY9V6SK16TisC7)
- [MongoDB Schema Migration Best Practices](https://www.mongodb.com/community/forums/t/best-practices-for-schema-management-migrations-and-scaling-in-mongodb/306805)
- [MongoDB Migration Lessons (2026)](https://medium.com/@coding_with_tech/mongodb-to-postgresql-migration-3-months-2-mental-breakdowns-1-lesson-2980110461a5)

---

### Pitfall 5: Modal Z-Index Conflicts with Drag Ghost

**What goes wrong:**
Admin opens product preview modal. Modal appears correctly. Admin tries to drag products behind the modal (e.g., to reorder while referencing modal content). The drag ghost element appears **behind** the modal overlay, or the modal blocks drop zones, or the modal closes unexpectedly when dragging starts.

Alternatively: Drag operation starts, ghost element appears, but drop zones under the modal overlay don't respond to drag events because the modal's overlay captures all pointer events.

**Why it happens:**
Z-index stacking contexts conflict:
- Modal overlay: `z-index: 1055` (Bootstrap convention)
- Drag ghost element: `z-index: 9999` (SortableJS default)
- BUT: If drag container is inside a positioned parent with lower z-index, the ghost inherits that stacking context and can't escape

Additionally, modals often use `pointer-events: all` on overlay to capture clicks outside modal for closing. This blocks drag events from reaching underlying elements.

**How to avoid:**
**Z-Index Hierarchy (establish upfront):**
```css
/* Define clear z-index scale for entire admin dashboard */
:root {
  --z-base: 1;
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
  --z-drag-ghost: 1080; /* ABOVE modals */
}

.sortable-ghost {
  z-index: var(--z-drag-ghost) !important;
}

.modal-backdrop {
  z-index: var(--z-modal-backdrop);
  pointer-events: none; /* Let drag events pass through */
}

.modal {
  z-index: var(--z-modal);
}
```

**Prevent modal overlay from blocking drags:**
```javascript
// When modal is open, make overlay ignore pointer events
// EXCEPT on the modal content itself
modalOverlay.style.pointerEvents = 'none';
modalContent.style.pointerEvents = 'all';
```

**SortableJS configuration:**
```javascript
new Sortable(el, {
  ghostClass: 'sortable-ghost',
  // Force ghost to render at document root to escape stacking contexts
  fallbackOnBody: true,
  // Append to body, not parent
  appendTo: document.body
});
```

**Warning signs:**
- No z-index scale documented in CSS
- Drag ghost element parent is positioned (`position: relative/absolute`)
- Modal overlay uses `pointer-events: all`
- Testing doesn't include "drag while modal is open" scenario
- Multiple `z-index: 9999` declarations scattered in CSS

**Phase to address:**
Phase 1 (Foundation) - Establish z-index scale and CSS variables
Phase 3 (Modal Integration) - Test modal + drag interaction

**Sources:**
- [Z-Index Troubleshooting Guide](https://coder-coder.com/z-index-isnt-working/)
- [Bootstrap Z-Index Scale](https://getbootstrap.com/docs/5.3/layout/z-index/)
- [Modal Z-Index Issues - Ant Design](https://github.com/ant-design/ant-design/issues/31513)

---

### Pitfall 6: Memory Leaks from Orphaned Event Listeners

**What goes wrong:**
Admin navigates between product list and other admin pages. After 10-15 page transitions, browser becomes sluggish. Memory usage climbs from 100MB to 800MB+. DevTools heap snapshot shows hundreds of orphaned event listeners and DOM nodes. Eventually browser tab crashes.

**Why it happens:**
Drag-and-drop implementations add event listeners to DOM elements:
```javascript
productList.addEventListener('dragstart', handleDragStart);
productList.addEventListener('dragover', handleDragOver);
productList.addEventListener('drop', handleDrop);
```

When navigating away from product list page, the DOM is cleared BUT:
- Event listeners remain attached (browser can't garbage collect)
- If listeners capture variables from outer scope (closure), entire scope is retained
- Each page view creates NEW listeners without removing old ones
- Memory accumulates

**Event delegation pitfall:**
Using event delegation on `document` or `body` seems like a solution (one listener for all elements), but creates worse memory leaks:
```javascript
// DON'T DO THIS
document.addEventListener('dragstart', (e) => {
  // This closure captures 'productList' and entire component scope
  if (e.target.matches('.product-item')) {
    handleDragStart(e, productList);
  }
});
```

Now the listener is attached to `document` (which never gets removed), AND it captures component variables, preventing garbage collection.

**How to avoid:**
**Pattern 1: Explicit cleanup**
```javascript
class ProductListView {
  constructor() {
    this.boundHandleDragStart = this.handleDragStart.bind(this);
    this.boundHandleDragOver = this.handleDragOver.bind(this);
    this.boundHandleDrop = this.handleDrop.bind(this);
  }

  mount() {
    this.productList = document.querySelector('.product-list');
    this.productList.addEventListener('dragstart', this.boundHandleDragStart);
    this.productList.addEventListener('dragover', this.boundHandleDragOver);
    this.productList.addEventListener('drop', this.boundHandleDrop);
  }

  unmount() {
    // CRITICAL: Remove listeners on cleanup
    this.productList.removeEventListener('dragstart', this.boundHandleDragStart);
    this.productList.removeEventListener('dragover', this.boundHandleDragOver);
    this.productList.removeEventListener('drop', this.boundHandleDrop);
    this.productList = null; // Release DOM reference
  }
}
```

**Pattern 2: AbortController (modern approach)**
```javascript
class ProductListView {
  mount() {
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    this.productList.addEventListener('dragstart', handleDragStart, { signal });
    this.productList.addEventListener('dragover', handleDragOver, { signal });
    this.productList.addEventListener('drop', handleDrop, { signal });
  }

  unmount() {
    // Removes ALL listeners registered with this signal
    this.abortController.abort();
    this.productList = null;
  }
}
```

**Pattern 3: Library cleanup (SortableJS)**
```javascript
class ProductListView {
  mount() {
    this.sortable = new Sortable(this.productList, { /* options */ });
  }

  unmount() {
    // CRITICAL: Call library destroy method
    this.sortable.destroy();
    this.sortable = null;
  }
}
```

**Warning signs:**
- No `unmount()` or `destroy()` method in view/component
- Event listeners added in `mount()` but never removed
- No lifecycle management in MVC controller
- Testing doesn't include multiple page navigations
- DevTools memory profiler not used during development
- Event listeners use arrow functions directly (can't be removed without reference)

**Phase to address:**
Phase 2 (Drag-and-Drop Implementation) - Implement proper lifecycle management from start
Phase 4 (Testing) - Memory leak testing with multiple navigations

**Sources:**
- [JavaScript Event Listener Memory Leaks](https://dev.to/alex_aslam/how-to-avoid-memory-leaks-in-javascript-event-listeners-4hna)
- [Event Delegation and Memory Leaks](https://infinitejs.com/posts/mastering-event-listeners-memory-leaks/)
- [Causes of Memory Leaks in JavaScript](https://www.ditdot.hr/en/causes-of-memory-leaks-in-javascript-and-how-to-avoid-them)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip touch support testing | Faster initial development | Unusable on tablets; requires full rewrite | Never - touch is table stakes in 2026 |
| Use inline `order` recalculation instead of atomic operations | Simpler code, no transaction setup | Race conditions, data corruption with concurrent admins | Only for single-admin systems |
| Keep old image fields after migration | Safer migration, easier rollback | Database bloat, confusion about source of truth | Acceptable for 1-2 months during migration period, then must clean up |
| Use global z-index values (9999, 99999) instead of CSS variables | Quick fixes when modals conflict | Unmaintainable z-index wars; impossible to debug | Never - establish scale upfront |
| Use `querySelectorAll()` + loop for event listeners | Easier to understand than event delegation | Memory leaks, performance issues with large lists | Never - use proper event delegation or library |
| Drag library without destroy() method | Faster to ship | Memory leaks on navigation; browser crashes | Never - choose libraries with lifecycle methods |
| Testing only in English/LTR mode | Faster test runs | RTL completely broken; Hebrew users abandoned | Never - RTL is core requirement |
| Skip optimistic locking "for now" | Simpler backend code | Silent data corruption; admin frustration | Only for MVP with single admin, must add before multi-admin launch |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| SortableJS + Modal | Drag ghost appears behind modal overlay | Set `fallbackOnBody: true` and `z-index: 1080` on ghost class |
| SortableJS + RTL | Drag positions inverted in Hebrew mode | Test with `dir="rtl"` early; may need manual position adjustments |
| Mongoose + Array Reordering | Direct array assignment loses other concurrent changes | Use `$set` with positional operator or atomic array operations |
| MongoDB + Image Migration | Assume all products have same fields | Audit existing field combinations; handle all legacy formats |
| Vanilla JS + Touch Devices | Assume HTML5 drag-and-drop works on mobile | Add touch event polyfill or use library with touch support |
| Event Listeners + SPA Navigation | Add listeners on mount, forget to remove on unmount | Always pair `addEventListener` with `removeEventListener` or use AbortController |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Dragging 500+ product list without virtualization | Laggy drag ghost, dropped frames | Virtual scrolling or pagination; only render visible products | >200 products in single category |
| Re-rendering entire product list on every drag event | Flickering, unresponsive UI during drag | Use SortableJS swap/insert mode; update DOM positions without re-render | >50 products |
| Loading full-size images in draggable product cards | Slow initial render, high memory usage | Use thumbnails (64x64 or 128x128) for drag list; full images only in modal | >20 products with high-res images |
| Querying database for current order on every drag | Slow drag response, stale data | Cache current order in memory; only query on page load | Any concurrent admin scenario |
| Updating all product orders in single query | Slow save operation, blocks UI | Only update affected products (swapped items or range) | >100 products in category |
| No debouncing on drag position updates | Excessive API calls during drag | Debounce position updates; only save final position on drop | Real-time position sync attempts |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| No admin authentication check on reorder endpoint | Any user can reorder products via API | Require `requireAdmin` middleware on all reorder routes |
| Accepting arbitrary `order` values from client | Client can set order to negative, duplicate, or invalid values | Validate order values on backend; recalculate based on drop position |
| No rate limiting on reorder endpoint | Malicious user can spam reorder requests, DoS backend | Add rate limiting: max 30 reorders per minute per admin |
| Exposing product IDs in drag data | Not a security risk, but... | Product IDs are already public; this is fine |
| No CSRF protection on reorder endpoint | CSRF attack can reorder products | Use CSRF tokens or SameSite cookies (likely already implemented for other admin endpoints) |
| Allowing reorder across categories without validation | Client could move product to non-existent category | Validate category exists and admin has permission |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual feedback during drag | User unsure if drag is working | Add semi-transparent ghost, highlight drop zones, cursor change |
| No loading state after drop | User drags, release, waits... did it work? | Show spinner or "Saving order..." message; disable further drags until save complete |
| No error handling for failed reorder | Drag succeeds visually but order isn't saved; silent failure | Show error message "Failed to save order, please try again"; revert UI to old order |
| No undo for accidental drags | User accidentally drags product to wrong position; has to manually fix | Add "Undo" button for 5 seconds after drop; or Ctrl+Z keyboard shortcut |
| Drag works only with mouse, no keyboard alternative | Keyboard-only users cannot reorder | Add up/down arrow buttons on each product for keyboard reordering |
| No indication of what's draggable | User doesn't know they can drag | Add drag handle icon; cursor changes to grab on hover |
| Modal closes when drag starts | User wants to reference modal while dragging; frustrating | Keep modal open during drag; only close on explicit close button click |
| Long product lists require scrolling while dragging | Dragging to bottom of 100-product list is painful | Auto-scroll when dragging near top/bottom edge; or add "Move to position" input field |

---

## "Looks Done But Isn't" Checklist

- [ ] **Drag-and-Drop:** Often missing touch support — verify drag works on iPad Safari, not just desktop Chrome
- [ ] **Drag-and-Drop:** Often missing RTL testing — verify drag positions correctly in Hebrew `dir="rtl"` mode
- [ ] **Product Reordering:** Often missing concurrent admin handling — verify two admins reordering simultaneously doesn't corrupt data
- [ ] **Image Migration:** Often missing legacy field handling — verify products created before 2024 still display correctly
- [ ] **Event Listeners:** Often missing cleanup on unmount — verify DevTools heap snapshot shows no orphaned listeners after 10 page navigations
- [ ] **Modal Integration:** Often missing z-index testing — verify drag ghost appears above modal overlay
- [ ] **Error Handling:** Often missing failed save scenarios — verify network failure during drag-save shows error and reverts UI
- [ ] **Keyboard Accessibility:** Often missing keyboard alternatives — verify products can be reordered via keyboard (not just drag)
- [ ] **Performance:** Often missing large list testing — verify 200+ products still drag smoothly
- [ ] **Save Confirmation:** Often missing save feedback — verify admin knows when order is saved vs still saving

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Touch support missing | MEDIUM | Add SortableJS (has built-in touch); replace custom drag code; test on mobile |
| RTL drag broken | MEDIUM | Add `dir="rtl"` tests; invert X coordinates for RTL; may need library switch if unfixable |
| Race condition corrupted order | HIGH | Write repair script to detect and fix duplicate/missing order values; add optimistic locking to prevent future corruption |
| Image migration broke products | HIGH | Rollback migration; write safer incremental migration; add field existence checks; re-run with backups |
| Modal z-index conflict | LOW | Add CSS variable scale; update modal and ghost z-index; test interactions |
| Memory leaks | MEDIUM | Add AbortController or explicit cleanup to all views; test with memory profiler; may need refactor if deeply embedded |
| No concurrent admin handling | MEDIUM | Add optimistic locking to backend; add version field to schema; handle conflicts in UI |
| Large list performance | MEDIUM | Add virtual scrolling (e.g., react-window port for vanilla JS); or add pagination to product list |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Touch support missing | Phase 1: Library Selection | Test drag on iPad Safari |
| RTL drag broken | Phase 1: Foundation + Phase 2: Implementation | Test with `dir="rtl"` in dev environment |
| Race conditions | Phase 2: Product Ordering Backend | Multi-admin stress test: 2 admins reorder simultaneously |
| Image migration breaks products | Phase 3: Image Array Migration | Query products with empty `images` array; manual spot-checks on staging |
| Modal z-index conflicts | Phase 1: Foundation + Phase 3: Modal Integration | Open modal, drag products behind it |
| Memory leaks | Phase 2: Drag Implementation + Phase 4: Testing | DevTools heap snapshot after 20 navigations |
| No error handling | Phase 2: Implementation + Phase 4: Testing | Disconnect network during drag-save; verify error shown |
| Large list performance | Phase 2: Implementation + Phase 5: Performance Testing | Test with 500 products; measure frame rate during drag |
| Security: missing auth | Phase 2: Backend Implementation | Attempt API call without auth token; verify 401 response |
| UX: no visual feedback | Phase 2: Frontend Implementation + Phase 4: UX Testing | User testing: can first-time user figure out drag? |

---

## Phase-Specific Warnings

### Phase 1: Library Selection & Foundation
- **Critical:** Choose library with proven touch + mobile support (SortableJS recommended)
- **Critical:** Establish z-index CSS variable scale before building modals
- **Important:** Set up RTL testing environment (`dir="rtl"` toggle in admin)

### Phase 2: Product Ordering Implementation
- **Critical:** Implement atomic operations or optimistic locking from day one
- **Critical:** Add lifecycle cleanup (unmount/destroy) for all event listeners
- **Important:** Don't use direct array assignment for order updates
- **Important:** Test error handling for failed saves

### Phase 3: Image Array Migration
- **Critical:** Audit existing products before writing migration script
- **Critical:** Add dry-run mode and rollback plan
- **Critical:** Keep old image fields during migration period
- **Important:** Handle all legacy field combinations (image, mainImage, smallImagesLocal)
- **Important:** Verify migration on staging with production data clone

### Phase 4: Modal Integration
- **Critical:** Test drag-and-drop with modal open
- **Critical:** Verify z-index hierarchy (ghost above modal)
- **Important:** Test modal overlay pointer-events handling

### Phase 5: Testing & Polish
- **Critical:** Multi-admin concurrency testing
- **Critical:** Memory leak testing (20+ navigations)
- **Critical:** Mobile/touch testing on real devices
- **Critical:** RTL testing in Hebrew mode
- **Important:** Performance testing with 200+ products
- **Important:** Keyboard accessibility testing

---

## Sources

### Drag-and-Drop General
- [Medium: Drag-n-Drop with Vanilla JavaScript](https://medium.com/codex/drag-n-drop-with-vanilla-javascript-75f9c396ecd)
- [DigitalOcean: Vanilla JavaScript Drag and Drop Tutorial](https://www.digitalocean.com/community/tutorials/js-drag-and-drop-vanilla-js)
- [Stack Abuse: Drag and Drop in Vanilla JavaScript](https://stackabuse.com/drag-and-drop-in-vanilla-javascript/)

### Touch Support
- [GitHub: DragDropTouch - Touch Polyfill](https://github.com/drag-drop-touch-js/dragdroptouch)
- [CSS Script: Best Drag-and-Drop Libraries 2026](https://www.cssscript.com/best-drag-drop-javascript-libraries/)
- [GitHub: touch-drag-n-drop Library](https://github.com/giorgiogilbert/touch-drag-n-drop)

### SortableJS
- [SortableJS Official Site](https://sortablejs.github.io/Sortable/)
- [GitHub: SortableJS/Sortable](https://github.com/SortableJS/Sortable)
- [CSS Script: SortableJS Guide](https://www.cssscript.com/lightweight-js-sorting-library-with-native-html5-drag-and-drop-sortable/)

### RTL Issues
- [GitHub: Svelte RTL Drag Direction Issue](https://github.com/orefalo/svelte-splitpanes/issues/3)
- [GitHub: Angular Calendar RTL Drag Bug](https://github.com/mattlewis92/angular-calendar/issues/1203)
- [GitHub: BigBlueButton RTL Drag-Drop Issue](https://github.com/bigbluebutton/bigbluebutton/issues/12567)
- [Drupal: Drag and Drop RTL Awareness](https://www.drupal.org/project/drupal/issues/197641)

### MongoDB Race Conditions
- [Medium: MongoDB Race Conditions - Atomic Operations](https://medium.com/tales-from-nimilandia/handling-race-conditions-and-concurrent-resource-updates-in-node-and-mongodb-by-performing-atomic-9f1a902bd5fa)
- [Medium: MongoDB Race Conditions - Optimistic Updates](https://medium.com/@codersauthority/handling-race-conditions-and-concurrent-resource-updates-in-node-and-mongodb-by-performing-f54140da8bc5)
- [MongoDB Docs: Concurrency FAQ](https://www.mongodb.com/docs/manual/faq/concurrency/)
- [Yarsa Labs: How to Solve MongoDB Race Conditions](https://blog.yarsalabs.com/mongodb-race-conditions-part2/)

### MongoDB Schema Migration
- [Software on the Road: MongoDB Schema Migrations in Node.js](https://softwareontheroad.com/database-migration-node-mongo)
- [Postulate: MongoDB Schema Changes with migrate-mongo](https://postulate.us/@samsonzhang/p/2021-03-06-Making-Mongodb-Schema-Changes-with-kL4J3vYUhY9V6SK16TisC7)
- [MongoDB Community: Schema Migration Best Practices](https://www.mongodb.com/community/forums/t/best-practices-for-schema-management-migrations-and-scaling-in-mongodb/306805)
- [Medium: MongoDB Migration Lessons (Jan 2026)](https://medium.com/@coding_with_tech/mongodb-to-postgresql-migration-3-months-2-mental-breakdowns-1-lesson-2980110461a5)

### MongoDB Product Catalog
- [MongoDB Docs: cursor.sort()](https://www.mongodb.com/docs/manual/reference/method/cursor.sort/)
- [MongoDB Blog: Performance Best Practices - Indexing](https://www.mongodb.com/company/blog/performance-best-practices-indexing)
- [MongoDB Blog: Retail Architecture - Product Catalog](https://www.mongodb.com/blog/post/retail-reference-architecture-part-1-building-flexible-searchable-low-latency-product)

### Z-Index Issues
- [Coder Coder: 4 Reasons Your Z-Index Isn't Working](https://coder-coder.com/z-index-isnt-working/)
- [Bootstrap Docs: Z-Index Layout](https://getbootstrap.com/docs/5.3/layout/z-index/)
- [GitHub: Ant Design Modal Z-Index Issue](https://github.com/ant-design/ant-design/issues/31513)

### Performance
- [Saeloun Blog: Dropdown Virtualization Performance](https://blog.saeloun.com/2022/03/03/infinite-scroll-with-pagination/)
- [Puck: Top Drag-and-Drop Libraries for React 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react)
- [SitePen: Next Generation Virtual Scrolling](https://www.sitepen.com/blog/next-generation-virtual-scrolling)

### Memory Leaks
- [DEV Community: Avoid Memory Leaks in Event Listeners](https://dev.to/alex_aslam/how-to-avoid-memory-leaks-in-javascript-event-listeners-4hna)
- [Nobie Tech: Memory Leaks in JavaScript](https://nobietech.com/memory-leaks-javascript-how-to-prevent)
- [Infinite JS: Mastering Event Listeners - Memory Leaks](https://infinitejs.com/posts/mastering-event-listeners-memory-leaks/)
- [Dit Dot: Causes of Memory Leaks in JavaScript](https://www.ditdot.hr/en/causes-of-memory-leaks-in-javascript-and-how-to-avoid-them)

---

*Pitfalls research for: E-commerce Admin Dashboard - Drag-and-Drop Product/Image Reordering*
*Researched: 2026-02-01*
*Confidence: HIGH*
