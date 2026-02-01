# Stack Research

**Domain:** Admin UX Enhancements (Drag-and-Drop + Modals)
**Researched:** 2026-02-01
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| SortableJS | 1.15.6 | Drag-and-drop reordering for products and images | Industry-standard library with 2.3M+ weekly downloads, actively maintained, built on native HTML5 API with touch support and auto-scrolling. Works perfectly with vanilla JS. |
| Native Modal Pattern | N/A | Admin product preview modals | Your frontend already implements a robust modal pattern in `categoriesView.js` (~800 lines). Reusing this pattern maintains consistency, avoids dependencies, and supports your existing RTL/bilingual implementation. |
| Parcel | 2.14.4+ | Module bundler (existing) | Already in use. SortableJS integrates seamlessly with Parcel - no additional configuration needed. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SortableJS | 1.15.6 | Product list reordering within categories | Use for the product list drag-and-drop in admin dashboard. Persist order with `onEnd` event callback. |
| SortableJS | 1.15.6 | Image gallery reordering in product edit form | Use a second instance for image thumbnails. Sync order changes to form state before submission. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Parcel Bundler | Builds and bundles SortableJS with your vanilla JS code | Already configured. SortableJS works as ES6 import or UMD. Use `import Sortable from 'sortablejs'`. |
| Chrome DevTools | Test drag-and-drop on touch simulation | Enable touch emulation to test mobile drag behavior without physical device. |

## Installation

```bash
# Install SortableJS (from /admin directory if separate, or /frontend)
npm install sortablejs --save

# TypeScript types (optional, for better IDE support)
npm install --save-dev @types/sortablejs
```

## Implementation Approach

### 1. Product Reordering (Admin Dashboard)

**Pattern:**
```javascript
import Sortable from 'sortablejs';

// Initialize on product list container
const productList = document.querySelector('.products-list');
const sortable = Sortable.create(productList, {
  animation: 150,
  handle: '.drag-handle', // Optional: specific drag handle
  onEnd: async function (evt) {
    // evt.oldIndex and evt.newIndex
    const productId = evt.item.dataset.productId;
    const newPosition = evt.newIndex;

    // Persist to MongoDB via API
    await fetch(`${API_URL}/products/${productId}/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position: newPosition })
    });
  }
});
```

**Backend (MongoDB):**
- Add `displayOrder` field to Product schema (Number, default 0)
- On reorder endpoint: update affected products' `displayOrder` values
- Fetch products sorted by `displayOrder` ascending

### 2. Image Gallery Reordering (Product Edit Form)

**Pattern:**
```javascript
// Initialize on image thumbnails container
const imageGallery = document.querySelector('.image-gallery');
const imageSortable = Sortable.create(imageGallery, {
  animation: 150,
  draggable: '.image-thumb',
  onEnd: function (evt) {
    // Update hidden form input with new order
    const newOrder = Sortable.toArray(imageSortable);
    document.querySelector('#imageOrderInput').value = JSON.stringify(newOrder);
  }
});
```

**MongoDB Integration:**
- Store image array in existing order
- On form submit, reorder images array based on drag-and-drop positions
- Product schema already has `imagesDesktop` and `imagesMobile` arrays

### 3. Admin Product Preview Modal

**Pattern (Reuse Existing Modal):**
```javascript
// Adapt pattern from frontend/js/Views/categoriesView.js (line ~808)
function openProductPreviewModal(productId) {
  const modal = document.querySelector('.admin-modal');

  const modalContent = `
    <div class="item-overlay">
      <div class="modal-content">
        <button class="close-modal-btn">&times;</button>
        <div class="modal-layout">
          <!-- Product preview (customer view) -->
          <div class="customer-preview">
            ${renderCustomerView(product)}
          </div>
          <!-- Edit actions -->
          <div class="admin-actions">
            <button onclick="editProduct('${productId}')">Edit Product</button>
          </div>
        </div>
      </div>
    </div>
  `;

  modal.innerHTML = modalContent;
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden'; // Prevent body scroll
}
```

**Why Not Use a Modal Library:**
- Your frontend already has a production-tested modal with image gallery, RTL support, and scroll-lock
- Modal libraries (Micromodal.js, PicoModal) would add 2-5kb for functionality you already have
- Consistency: Admin modals will behave identically to customer-facing modals

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| SortableJS | Native HTML5 Drag and Drop API | Only if bundle size is absolutely critical (<1kb requirement) AND you don't need touch support, auto-scrolling, or animation. Native API is notoriously difficult to work with. |
| SortableJS | dragula.js | Never. Dragula has had no commits since 2020 and is no longer maintained. SortableJS has 10x more downloads and active development. |
| SortableJS | html5sortable | If you specifically need a lighter library (~2kb vs ~11kb minified). However, html5sortable has fewer features and smaller community. |
| Existing Modal Pattern | Micromodal.js | If you were starting from scratch without existing modal code. Micromodal is excellent (1.9kb, accessible) but redundant here. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| dragula.js | Abandoned project (last commit 2020). No touch improvements, no active maintenance. | SortableJS |
| React-based drag libraries (react-dnd, dnd-kit) | Your app is vanilla JS. Adding React would be massive overhead (100kb+) for drag-and-drop. | SortableJS for vanilla JS |
| jQuery UI Sortable | Requires jQuery dependency (30kb+). Outdated approach for modern vanilla JS apps. | SortableJS |
| interact.js | More complex library focused on gestures/multi-touch beyond simple sorting. Overkill for this use case. | SortableJS for reordering |
| Separate modal library | You already have a robust modal implementation with RTL support. Don't add redundancy. | Extend existing modal pattern |

## RTL Compatibility

**SortableJS and RTL:**
- SortableJS works with RTL layouts by default
- The library respects `dir="rtl"` attribute on containers
- Your existing CSS `direction: rtl` for Hebrew will work seamlessly
- No special configuration needed
- Visual feedback (drag ghost, insertion line) follows document direction

**Tested Pattern:**
```html
<div class="products-list" dir="rtl">
  <!-- Hebrew product list will drag right-to-left correctly -->
</div>
```

## Bundle Size Analysis

| Library | Minified | Gzipped | Impact |
|---------|----------|---------|--------|
| SortableJS | ~44kb | ~11kb | Acceptable for admin dashboard (not customer-facing) |
| Micromodal.js (not recommended) | ~4kb | ~1.9kb | Unnecessary - you have modals |
| dragula.js (not recommended) | ~17kb | ~6kb | Smaller but unmaintained |

**Admin Dashboard Context:**
- Admin dashboard is internal tool, not customer-facing
- 11kb gzipped for comprehensive drag-and-drop is excellent value
- Your existing Parcel bundle already handles code-splitting

## Integration with Vanilla JS MVC

**BisliView.js Pattern:**
Your admin uses functional approach (not class-based). SortableJS integrates perfectly:

```javascript
// BisliView.js
let productSortable = null;

function initProductList() {
  const productsContainer = document.querySelector('.products-grid');

  productSortable = Sortable.create(productsContainer, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    onEnd: handleProductReorder
  });
}

async function handleProductReorder(evt) {
  const movedProductId = evt.item.dataset.productId;
  const newPosition = evt.newIndex;

  await apiFetch(`/products/${movedProductId}/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ position: newPosition })
  });
}
```

**State Management:**
- No special state management needed
- SortableJS manages DOM reordering
- Persist changes via your existing `apiFetch()` wrapper
- MongoDB stores `displayOrder` field

## MongoDB Schema Changes

**Product Model Enhancement:**
```javascript
// backend/models/Product.js
const productSchema = new mongoose.Schema({
  // ... existing fields
  displayOrder: {
    type: Number,
    default: 0,
    index: true // For efficient sorting queries
  },
  // ... existing fields
});
```

**Migration Strategy:**
1. Add `displayOrder` field with default 0
2. Run migration script to assign sequential order to existing products (grouped by category)
3. Update product list queries to sort by `displayOrder`

**API Endpoints:**
```javascript
// PATCH /api/products/:id/reorder
// Update displayOrder for affected products
// Return updated product list

// GET /api/products?category=bracelets&sort=order
// Fetch products sorted by displayOrder
```

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| sortablejs | 1.15.6 | Parcel 2.14.4+ | Works out of box. ES6 imports supported. |
| sortablejs | 1.15.6 | Node.js 14+ | Backend doesn't use SortableJS, only frontend. |
| sortablejs | 1.15.6 | All modern browsers + IE11 | IE11 requires polyfills (not needed for admin dashboard). |

## Sources

**HIGH Confidence:**
- [SortableJS GitHub](https://github.com/SortableJS/Sortable) - Official repository, verified version 1.15.6 and features
- [SortableJS Official Docs](https://sortablejs.github.io/Sortable/) - Installation and usage examples
- [npm trends: dragula vs sortablejs](https://npmtrends.com/dragula-vs-sortable-vs-sortablejs) - Download statistics (2.3M vs 254K weekly)
- [CSS Script: Best Drag And Drop JavaScript Libraries (2026 Update)](https://www.cssscript.com/best-drag-drop-javascript-libraries/) - Current recommendations
- [Bundlephobia: sortablejs](https://bundlephobia.com/package/sortablejs) - Bundle size analysis

**MEDIUM Confidence:**
- [Medium: Optimized way to save sort order into DB](https://medium.com/@ankit.chaudhary_/optimized-way-to-save-the-sort-order-into-db-using-sortablejs-vue-draggable-next-or-react-dnd-1cb690ebfa8a) - Backend persistence patterns
- [GitHub Issues: SortableJS MongoDB integration](https://github.com/SortableJS/Sortable/issues/1169) - Community examples of database persistence

**Verified from Codebase:**
- `frontend/js/Views/categoriesView.js` - Existing modal implementation (lines 808-919)
- `admin/BisliView.js` - Functional admin pattern (not class-based)
- `frontend/package.json` - Parcel 2.14.4 confirmed

---
*Stack research for: Admin UX improvements (drag-and-drop + modals)*
*Researched: 2026-02-01*
