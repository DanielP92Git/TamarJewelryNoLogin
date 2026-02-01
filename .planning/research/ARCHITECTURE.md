# Architecture Research: Admin UX Features (Drag-and-Drop Reordering & Modals)

**Domain:** E-commerce Admin Dashboard Enhancement
**Researched:** 2026-02-01
**Confidence:** HIGH

## Existing Architecture Context

### Current System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Vanilla JS MVC)                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ model.js│  │ View.js  │  │*View.js  │  │controller│     │
│  │         │  │ (base)   │  │(pages)   │  │.js       │     │
│  │ API     │  │ DOM mgmt │  │ Extends  │  │ Router   │     │
│  │ calls   │  │ Language │  │ base     │  │ Nav      │     │
│  └────┬────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘     │
│       │            │             │             │            │
├───────┴────────────┴─────────────┴─────────────┴────────────┤
│                   REST API (Express)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐      │
│  │              index.js (monolithic)                 │      │
│  │  Routes + Middleware + Business Logic              │      │
│  └───────────────────────────────────────────────────┘      │
├─────────────────────────────────────────────────────────────┤
│                   Data Layer (MongoDB + Mongoose)            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Product  │  │ User     │  │ Settings │                   │
│  │ Schema   │  │ Schema   │  │ Schema   │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Current Product Schema Structure

**Existing fields relevant to new features:**
- `category` (String, indexed) - Products belong to categories (necklaces, hoops, dangle, etc.)
- `mainImage` (Object) - Desktop/mobile responsive versions
- `smallImages` (Array) - Gallery images with responsive versions
- `id` (Number, indexed) - Product identifier
- `available` (Boolean) - Product visibility

**Key constraint:** `mainImage` and `smallImages` are separate fields, but admin needs unified sortable array.

## Recommended Architecture Changes

### 1. MongoDB Schema Extensions for Ordering

#### Pattern: Category-Scoped Display Order

Products display in category-specific order on frontend. Each category maintains independent ordering.

**Schema Addition:**

```javascript
const ProductSchema = new mongoose.Schema({
  // ... existing fields ...

  // NEW: Category-specific display order
  displayOrder: {
    type: Number,
    default: 0,
    index: true  // Performance for category+order queries
  }

  // ... existing fields ...
});

// NEW: Compound index for efficient category-ordered queries
ProductSchema.index({ category: 1, displayOrder: 1, available: 1 });
```

**Rationale:**
- Simple integer field per product (not per-category nested structure)
- Order is scoped by category in queries, not schema
- Products in "necklaces" can have displayOrder 0-10, products in "hoops" can also have 0-5 (order values can overlap across categories)
- Compound index `{category, displayOrder, available}` enables fast sorted queries: `Product.find({category: 'necklaces', available: true}).sort({displayOrder: 1})`

**Alternative Considered: Separate OrderMap Collection**
```javascript
// NOT RECOMMENDED for this use case
OrderMap: {
  category: String,
  productOrder: [productId1, productId2, ...] // Array of IDs
}
```
**Why not:** Adds complexity, requires two queries (fetch order array, then fetch products), harder to maintain consistency, no performance benefit for ~50-100 products per category.

#### Data Migration Strategy

**Migration Script for Existing Products:**

```javascript
// Migration: Add displayOrder to existing products
// Run once during deployment

const categories = ['necklaces', 'crochetNecklaces', 'hoops', 'dangle'];

for (const category of categories) {
  const products = await Product.find({ category })
    .sort({ date: -1 })  // Default order: newest first
    .exec();

  for (let i = 0; i < products.length; i++) {
    products[i].displayOrder = i;
    await products[i].save();
  }
}
```

**Confidence:** HIGH (Standard MongoDB pattern, verified in [MongoDB Product Catalog documentation](https://mongodb-documentation.readthedocs.io/en/latest/use-cases/product-catalog.html))

### 2. Image Array Restructuring

#### Current State Problem

```javascript
// CURRENT SCHEMA (fragmented)
{
  mainImage: {
    desktop: "url1",
    mobile: "url1-mobile"
  },
  smallImages: [
    { desktop: "url2", mobile: "url2-mobile" },
    { desktop: "url3", mobile: "url3-mobile" }
  ]
}
```

**Issue:** Admin needs single sortable array for drag-and-drop, but frontend needs to distinguish main image from gallery.

#### Recommended Pattern: Unified Array with Position Flag

```javascript
const ProductSchema = new mongoose.Schema({
  // NEW: Unified image array (replaces mainImage + smallImages)
  images: [
    {
      desktop: { type: String, required: true },
      mobile: { type: String, required: true },
      position: { type: Number, required: true },  // Determines display order
      isMain: { type: Boolean, default: false }    // First image or explicitly marked
    }
  ]

  // DEPRECATED (keep for backward compatibility during migration)
  mainImage: { ... },
  smallImages: [ ... ]
});
```

**Usage Pattern:**
- Admin drag-and-drop updates `position` field
- Frontend displays `images.find(img => img.isMain)` as main image
- Gallery displays `images.filter(img => !img.isMain).sort((a,b) => a.position - b.position)`
- If no `isMain` flag, first image (position 0) is main by convention

#### Data Migration for Image Arrays

**Phase 1: Add new field without removing old**

```javascript
// Migration: Merge mainImage + smallImages → images array
async function migrateProductImages() {
  const products = await Product.find({});

  for (const product of products) {
    const images = [];

    // Main image becomes position 0 with isMain flag
    if (product.mainImage?.desktop) {
      images.push({
        desktop: product.mainImage.desktop,
        mobile: product.mainImage.mobile || product.mainImage.desktop,
        position: 0,
        isMain: true
      });
    }

    // Gallery images follow (position 1, 2, 3...)
    if (product.smallImages?.length) {
      product.smallImages.forEach((img, idx) => {
        images.push({
          desktop: img.desktop,
          mobile: img.mobile || img.desktop,
          position: idx + 1,
          isMain: false
        });
      });
    }

    product.images = images;
    await product.save();
  }
}
```

**Phase 2: Update frontend to read from `images` array**

**Phase 3: (Future) Remove deprecated `mainImage` and `smallImages` fields**

**Confidence:** HIGH (MongoDB `$mergeObjects` and array operations well-documented: [MongoDB $mergeObjects](https://database.guide/mongodb-mergeobjects/))

### 3. Backend API Extensions

#### New Endpoint: Update Product Display Order

**Pattern:** Batch update for efficient reordering

```javascript
// POST /api/admin/products/reorder
// Body: { category: string, productOrders: [{id: number, displayOrder: number}] }

router.post('/api/admin/products/reorder', requireAdmin, async (req, res) => {
  const { category, productOrders } = req.body;

  try {
    // Validate category
    const validCategories = ['necklaces', 'crochetNecklaces', 'hoops', 'dangle'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Batch update using bulkWrite for performance
    const bulkOps = productOrders.map(item => ({
      updateOne: {
        filter: { id: item.id, category },  // Ensure product belongs to category
        update: { $set: { displayOrder: item.displayOrder } }
      }
    }));

    const result = await Product.bulkWrite(bulkOps);

    res.json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Why bulkWrite:** Updates multiple products in single database round-trip (vs. N separate updates).

**Confidence:** HIGH (Standard Express pattern, bulkWrite documented in [MongoDB updateMany](https://docs.mongodb.com/manual/reference/method/db.collection.updateMany/))

#### Modified Endpoint: Update Product Images

**Extend existing PUT /api/admin/products/:id**

```javascript
// Modified: Handle new images array structure
router.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const { images } = req.body;  // NEW: Accept images array

  // Validate images array structure
  if (images && Array.isArray(images)) {
    images.forEach((img, idx) => {
      if (!img.desktop || !img.mobile) {
        throw new Error('Image missing desktop/mobile URLs');
      }
      // Auto-assign position if not provided
      if (img.position === undefined) {
        img.position = idx;
      }
    });

    // Ensure at least one image marked as main
    if (!images.some(img => img.isMain)) {
      images[0].isMain = true;
    }
  }

  // ... rest of update logic
});
```

### 4. Frontend MVC Integration

#### Drag-and-Drop: SortableJS Integration

**Library Choice:** SortableJS (no dependencies, 45KB minified, touch support)

**Installation:**
```bash
npm install sortablejs --save
```

**Integration Location:** Create new admin view extending base View class

**File Structure:**
```
frontend/js/Views/
├── View.js              # Base class (existing)
├── adminProductsView.js # NEW: Admin product management view
└── ... other views
```

**adminProductsView.js Implementation:**

```javascript
import View from './View.js';
import Sortable from 'sortablejs';

class AdminProductsView extends View {
  _parentElement = document.querySelector('.admin-products-container');
  _currentCategory = 'necklaces';  // Track which category is being managed

  // Initialize drag-and-drop after rendering product list
  initDragAndDrop() {
    const productList = this._parentElement.querySelector('.product-list');

    if (!productList) return;

    // SortableJS setup
    this._sortable = Sortable.create(productList, {
      animation: 150,           // Smooth animation
      handle: '.drag-handle',   // Only drag via handle icon
      ghostClass: 'sortable-ghost',  // CSS class for dragging placeholder

      // Event: User finished dragging
      onEnd: (evt) => {
        this._handleReorder(evt);
      }
    });
  }

  async _handleReorder(evt) {
    const productElements = [...this._parentElement.querySelectorAll('.product-item')];

    // Build new order array
    const productOrders = productElements.map((el, index) => ({
      id: parseInt(el.dataset.productId),
      displayOrder: index
    }));

    try {
      // Save to backend
      const response = await fetch('/api/admin/products/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': localStorage.getItem('auth-token')
        },
        body: JSON.stringify({
          category: this._currentCategory,
          productOrders
        })
      });

      if (!response.ok) throw new Error('Reorder failed');

      // Show success feedback
      this._showToast('Order saved successfully');

    } catch (error) {
      console.error('Reorder error:', error);
      // Revert UI on failure
      this._sortable.sort(evt.oldIndex);
      this._showToast('Failed to save order', 'error');
    }
  }

  // Cleanup when view unmounts
  destroy() {
    if (this._sortable) {
      this._sortable.destroy();
    }
  }
}

export default new AdminProductsView();
```

**HTML Structure for Drag-and-Drop:**

```html
<div class="admin-products-container">
  <ul class="product-list">
    <li class="product-item" data-product-id="101">
      <span class="drag-handle">☰</span>
      <span class="product-name">Gold Necklace</span>
      <span class="product-sku">NK001</span>
      <button class="edit-btn">Edit</button>
    </li>
    <!-- More product items... -->
  </ul>
</div>
```

**CSS for Drag Feedback:**

```css
.sortable-ghost {
  opacity: 0.4;
  background: #f0f0f0;
}

.drag-handle {
  cursor: grab;
  user-select: none;
}

.drag-handle:active {
  cursor: grabbing;
}
```

**Confidence:** HIGH (SortableJS is production-ready, used by 50k+ projects, documented at [SortableJS GitHub](https://github.com/SortableJS/Sortable))

#### Modal: Native HTML `<dialog>` Element

**Library Choice:** Native `<dialog>` element (zero dependencies, built-in accessibility)

**Why `<dialog>` over custom modal:**
- **Built-in focus trap** (keyboard navigation contained)
- **ESC key handling** (automatic close)
- **Backdrop handling** (::backdrop pseudo-element)
- **Accessibility** (implicit `aria-modal="true"` with `showModal()`)
- **Browser support** (96%+ as of 2026, polyfill available for IE11 if needed)

**Integration Location:** Extend base View class with modal helper methods

**View.js Extension:**

```javascript
// Add to base View.js class
class View {
  // ... existing methods ...

  /**
   * Show modal with product details
   * @param {Object} productData - Product data to display
   * @param {Function} onSave - Callback when user saves changes
   */
  showProductModal(productData, onSave) {
    // Get or create modal element
    let modal = document.querySelector('#product-modal');

    if (!modal) {
      modal = this._createProductModal();
      document.body.appendChild(modal);
    }

    // Populate with product data
    this._populateModalContent(modal, productData);

    // Setup save button handler
    const saveBtn = modal.querySelector('.save-btn');
    saveBtn.onclick = async () => {
      const formData = this._getModalFormData(modal);
      await onSave(formData);
      modal.close();
    };

    // Show modal (native method)
    modal.showModal();
  }

  _createProductModal() {
    const modal = document.createElement('dialog');
    modal.id = 'product-modal';
    modal.className = 'product-modal';

    modal.innerHTML = `
      <div class="modal-content">
        <button class="close-btn" aria-label="Close">&times;</button>
        <h2 class="modal-title">Product Details</h2>

        <form method="dialog" class="product-form">
          <label>
            Name:
            <input type="text" name="name" required />
          </label>

          <label>
            SKU:
            <input type="text" name="sku" required />
          </label>

          <label>
            Description:
            <textarea name="description"></textarea>
          </label>

          <label>
            Price (ILS):
            <input type="number" name="ils_price" step="0.01" required />
          </label>

          <!-- Image reordering section -->
          <div class="image-reorder-section">
            <h3>Product Images</h3>
            <ul class="image-list sortable">
              <!-- Images populated dynamically -->
            </ul>
          </div>

          <div class="modal-actions">
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="submit" class="save-btn">Save</button>
          </div>
        </form>
      </div>
    `;

    // Close button handler
    modal.querySelector('.close-btn').onclick = () => modal.close();
    modal.querySelector('.cancel-btn').onclick = () => modal.close();

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.close();
    });

    return modal;
  }

  _populateModalContent(modal, productData) {
    modal.querySelector('[name="name"]').value = productData.name || '';
    modal.querySelector('[name="sku"]').value = productData.sku || '';
    modal.querySelector('[name="description"]').value = productData.description || '';
    modal.querySelector('[name="ils_price"]').value = productData.ils_price || '';

    // Populate image list for drag-and-drop reordering
    const imageList = modal.querySelector('.image-list');
    imageList.innerHTML = productData.images?.map((img, idx) => `
      <li class="image-item" data-position="${img.position}">
        <span class="drag-handle">☰</span>
        <img src="${img.desktop}" alt="Product image ${idx + 1}" />
        <label>
          <input type="checkbox" ${img.isMain ? 'checked' : ''} />
          Main Image
        </label>
      </li>
    `).join('') || '';

    // Initialize SortableJS on image list
    Sortable.create(imageList, {
      animation: 150,
      handle: '.drag-handle'
    });
  }

  _getModalFormData(modal) {
    const form = modal.querySelector('.product-form');
    const formData = new FormData(form);

    // Get image order from sortable list
    const imageItems = [...modal.querySelectorAll('.image-item')];
    const images = imageItems.map((item, idx) => ({
      position: idx,
      isMain: item.querySelector('input[type="checkbox"]').checked,
      // ... other image data
    }));

    return {
      name: formData.get('name'),
      sku: formData.get('sku'),
      description: formData.get('description'),
      ils_price: parseFloat(formData.get('ils_price')),
      images
    };
  }
}
```

**CSS for Modal:**

```css
/* Native dialog styling */
dialog::backdrop {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(3px);
}

dialog.product-modal {
  border: none;
  border-radius: 8px;
  padding: 0;
  max-width: 600px;
  width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

dialog.product-modal .modal-content {
  padding: 24px;
}

/* Open/close animations */
dialog[open] {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

**Confidence:** HIGH (Native `<dialog>` element is standard, documented at [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) and [HTML Dialog Accessibility Best Practices](https://jaredcunha.com/blog/html-dialog-getting-accessibility-and-ux-right))

## Data Flow Diagrams

### Reorder Flow (Admin Drag-and-Drop)

```
[Admin drags product in list]
    ↓
[SortableJS onEnd event fires]
    ↓
[adminProductsView._handleReorder()]
    ↓ (collect new positions)
[POST /api/admin/products/reorder]
    ↓ (with category + productOrders array)
[Backend validates & bulkWrite()]
    ↓
[MongoDB updates displayOrder fields]
    ↓ (success response)
[Frontend shows success toast]
```

### Modal Edit Flow

```
[Admin clicks "Edit" button on product]
    ↓
[adminProductsView triggers showProductModal()]
    ↓
[Base View creates/shows <dialog> element]
    ↓
[Modal populated with product data]
    ↓
[Admin edits fields + reorders images via SortableJS]
    ↓
[Admin clicks "Save"]
    ↓
[_getModalFormData() collects form + image positions]
    ↓
[PUT /api/admin/products/:id]
    ↓
[Backend validates & updates Product document]
    ↓
[MongoDB saves updated images array]
    ↓
[Modal closes, product list refreshes]
```

### Frontend Category Display Flow (Customer-Facing)

```
[User navigates to category page (e.g., /categories/necklaces)]
    ↓
[categoriesView.js fetches products]
    ↓
[GET /api/products?category=necklaces]
    ↓
[Backend queries: Product.find({category: 'necklaces', available: true})
                        .sort({displayOrder: 1})]
    ↓
[Returns products in admin-defined order]
    ↓
[categoriesView renders products in order]
    ↓
[Main image (images[0] or images.find(img => img.isMain)) displays first]
    ↓
[Gallery images display in sorted order]
```

## Component Responsibilities

| Component | Responsibility | Integration Pattern |
|-----------|----------------|---------------------|
| **Product Schema** | Store displayOrder and images array | MongoDB model with compound index {category, displayOrder} |
| **Backend API** | Validate & persist reorder operations, serve ordered products | Express routes in index.js (monolithic pattern) |
| **adminProductsView.js** | Admin UI for drag-and-drop product reordering per category | New View class extending base View.js |
| **Base View.js** | Modal helper methods (showProductModal, create/populate dialog) | Extended with dialog management methods |
| **SortableJS Library** | DOM manipulation for drag-and-drop UX | Imported in adminProductsView, attached to product list |
| **Native `<dialog>`** | Modal container with built-in accessibility | Created/shown via View.js methods |
| **model.js** | API calls to fetch/update products and orders | New methods: fetchProductsByCategory(), reorderProducts(), updateProduct() |
| **controller.js** | Route admin product management page | New route handler for admin product page |

## Architectural Patterns

### Pattern 1: Category-Scoped Integer Ordering

**What:** Each product has single `displayOrder` integer field. Category scope enforced in queries, not schema.

**When to use:** Per-category ordering without nested data structures. Works for small-to-medium catalogs (~100 products per category).

**Trade-offs:**
- **Pro:** Simple schema, fast queries with compound index, easy to migrate
- **Pro:** Standard MongoDB pattern (widely documented)
- **Con:** Not ideal for thousands of products per category (would need sharding on category)
- **Con:** Reordering all products in category requires multiple writes (mitigated by bulkWrite batch operation)

**Example:**
```javascript
// Query products in necklaces category, sorted by display order
const products = await Product
  .find({ category: 'necklaces', available: true })
  .sort({ displayOrder: 1 })
  .limit(50)
  .exec();
```

### Pattern 2: Unified Image Array with Position Metadata

**What:** Single `images` array replaces `mainImage` + `smallImages`. Position order + `isMain` flag determine display.

**When to use:** Need single sortable data structure for admin while maintaining frontend "main vs gallery" distinction.

**Trade-offs:**
- **Pro:** Single source of truth, no sync issues between mainImage and smallImages
- **Pro:** Natural fit for drag-and-drop (array reordering)
- **Pro:** Flexible (can mark any image as main, not just first)
- **Con:** Migration required for existing products
- **Con:** Slightly more complex queries (filter/find vs direct field access)

**Example:**
```javascript
// Frontend code to get main image
const mainImage = product.images.find(img => img.isMain) || product.images[0];

// Admin code to reorder images
product.images.forEach((img, idx) => {
  img.position = idx;  // Update positions after drag-and-drop
});
```

### Pattern 3: Optimistic UI with Rollback

**What:** Update UI immediately on drag-and-drop, rollback if backend save fails.

**When to use:** Improve perceived performance for user actions (drag feels instant).

**Trade-offs:**
- **Pro:** Feels fast and responsive
- **Pro:** User sees immediate feedback
- **Con:** Requires rollback logic if save fails
- **Con:** Potential for confusion if multiple admins editing simultaneously (rare for small teams)

**Example:**
```javascript
async _handleReorder(evt) {
  const oldOrder = this._captureCurrentOrder();  // Snapshot for rollback

  try {
    await this._saveNewOrder();
  } catch (error) {
    this._sortable.sort(oldOrder);  // Rollback UI
    this._showToast('Failed to save', 'error');
  }
}
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-500 products total | Current design sufficient. Single MongoDB instance, no sharding needed. |
| 500-5k products | Add pagination to admin product list. Consider caching category order in Redis for frontend queries. |
| 5k+ products | Implement virtual scrolling for admin drag-and-drop lists. Shard MongoDB on `category` field if query latency increases. |

### Scaling Priorities

1. **First bottleneck:** Admin drag-and-drop becomes sluggish with 200+ products in single category
   - **Solution:** Add pagination/filtering to admin view (e.g., show 50 products at a time, drag within page)
   - **Alternative:** Implement "Move to Position X" input field for large jumps

2. **Second bottleneck:** Frontend category queries slow down with many products
   - **Solution:** Add Redis caching layer for `Product.find({category}).sort({displayOrder})` results
   - **Cache invalidation:** Clear cache on POST /api/admin/products/reorder

## Anti-Patterns

### Anti-Pattern 1: Storing Order as Array of IDs

**What people do:** Create separate collection with `{category: 'necklaces', order: [id1, id2, id3...]}`

**Why it's wrong:**
- Requires two queries (fetch order array, then fetch products by IDs)
- Hard to maintain consistency (delete product → must update order array)
- No performance benefit for small catalogs
- More complex to query (join operation needed)

**Do this instead:** Use `displayOrder` field on each product with compound index `{category, displayOrder}`

### Anti-Pattern 2: Using Date Field for Ordering

**What people do:** Rely on `createdAt` or `updatedAt` for display order, update date when admin reorders

**Why it's wrong:**
- Semantic confusion (date doesn't mean order)
- Breaks "sort by newest" functionality
- Precision issues with millisecond timestamps (two products saved in same millisecond)
- Harder to debug (order changes not explicit)

**Do this instead:** Explicit `displayOrder` integer field clearly indicates purpose

### Anti-Pattern 3: Client-Side Only Reordering

**What people do:** Save product order in localStorage or cookies, only persist to DB on explicit "Save" button

**Why it's wrong:**
- Order lost if user closes browser before saving
- Multiple admins can't see each other's changes
- Order not reflected on frontend until manually saved

**Do this instead:** Persist immediately on drag end (with optimistic UI and rollback on failure)

### Anti-Pattern 4: Custom Modal Framework for Simple Use Case

**What people do:** Import large modal library (Bootstrap modals, Material UI dialogs, etc.) for basic product edit modal

**Why it's wrong:**
- Adds 50-200KB bundle size for feature already in browser
- Dependency maintenance burden
- Styling conflicts with existing CSS
- No accessibility benefit over native `<dialog>`

**Do this instead:** Use native `<dialog>` element (zero dependencies, built-in accessibility, 96%+ browser support in 2026)

## Integration Points

### External Dependencies

| Dependency | Integration Pattern | Notes |
|------------|---------------------|-------|
| SortableJS | NPM package imported in adminProductsView.js | 45KB minified, zero dependencies. [GitHub](https://github.com/SortableJS/Sortable) |
| Native `<dialog>` | HTML5 standard element | No library needed. Polyfill available if IE11 support required (not recommended for admin panel). [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| adminProductsView ↔ model.js | Method calls (fetchProductsByCategory, reorderProducts) | Standard MVC pattern, same as existing views |
| model.js ↔ Backend API | Fetch API (POST /api/admin/products/reorder) | RESTful JSON, auth-token header for admin auth |
| Backend ↔ MongoDB | Mongoose ODM (Product.bulkWrite) | Existing pattern, no changes to connection/pooling |
| Base View ↔ Child Views | Inheritance (extends View) | adminProductsView extends View, inherits modal methods |

## Recommended Build Order

Build in dependency order to enable incremental testing:

### Phase 1: Schema Foundation (Backend)
1. Add `displayOrder` field to Product schema
2. Create compound index `{category, displayOrder, available}`
3. Write migration script to assign initial displayOrder values
4. Test: Query products sorted by displayOrder works

**Rationale:** Schema must exist before API or frontend can use it.

### Phase 2: Ordering API (Backend)
1. Create POST `/api/admin/products/reorder` endpoint
2. Implement validation (category check, admin auth)
3. Implement bulkWrite logic for batch updates
4. Test: Postman/curl can update displayOrder via API

**Rationale:** API must work before frontend can call it.

### Phase 3: Frontend Display (Customer-Facing)
1. Update `model.js` to fetch products with `.sort({displayOrder: 1})`
2. Verify categoriesView displays products in admin-defined order
3. Test: Manually change displayOrder in DB, see order change on frontend

**Rationale:** Proves end-to-end flow before building admin UI.

### Phase 4: Admin Drag-and-Drop (Admin UI)
1. Install SortableJS (`npm install sortablejs`)
2. Create `adminProductsView.js` extending View
3. Implement drag-and-drop with SortableJS
4. Implement `_handleReorder()` with API call
5. Add optimistic UI + rollback on failure
6. Test: Drag products, verify order persists and displays on frontend

**Rationale:** Drag-and-drop is core feature, validate before adding modal complexity.

### Phase 5: Image Array Migration (Backend + Frontend)
1. Add `images` array field to Product schema (keep old fields for now)
2. Write migration script to merge mainImage + smallImages → images
3. Update backend API to accept images array on product update
4. Update frontend product display to read from images array
5. Test: Existing products display correctly with new schema

**Rationale:** Migration must complete before modal can edit images array.

### Phase 6: Modal Integration (Admin UI)
1. Extend base `View.js` with modal helper methods
2. Create product edit modal using `<dialog>` element
3. Integrate SortableJS for image reordering within modal
4. Connect modal save to PUT `/api/admin/products/:id`
5. Test: Edit product in modal, verify changes persist

**Rationale:** Modal is least critical feature, build last to avoid blocking other work.

### Phase 7: Polish & Cleanup
1. Add loading states and error handling
2. Add success/error toast notifications
3. CSS polish for drag handles, modal animations
4. (Optional) Remove deprecated mainImage/smallImages fields from schema

**Confidence:** HIGH (Incremental build order prevents integration issues)

## Sources

- [SortableJS GitHub](https://github.com/SortableJS/Sortable) - Drag-and-drop library documentation
- [MongoDB Product Catalog Schema Design](https://mongodb-documentation.readthedocs.io/en/latest/use-cases/product-catalog.html) - Official MongoDB use case patterns
- [MongoDB $merge Aggregation](https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/) - Array field merging
- [MongoDB updateMany Method](https://docs.mongodb.com/manual/reference/method/db.collection.updateMany/) - Batch update operations
- [MDN Web Docs: `<dialog>` Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) - Native modal documentation
- [HTML Dialog Accessibility Best Practices](https://jaredcunha.com/blog/html-dialog-getting-accessibility-and-ux-right) - Accessibility guide for dialog element
- [Building Production-Ready Modal with Vanilla JavaScript](https://medium.com/@francesco.saviano87/building-a-production-ready-modal-component-with-vanilla-javascript-a-complete-guide-4c125d20ddc9) - Modal implementation patterns
- [MongoDB Data Modeling Design Patterns](https://www.geopits.com/blog/mongodb-data-modeling-design-patterns) - Schema design patterns
- [DZone: Product Catalog Part 1 - Schema Design](https://dzone.com/articles/product-catalog-part-1-schema) - E-commerce catalog patterns

---

*Architecture research for: Admin UX Features (Drag-and-Drop Reordering & Modals)*
*Researched: 2026-02-01*
