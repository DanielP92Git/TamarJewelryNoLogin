# Phase 8: Modal Integration & Image Reordering - Research

**Researched:** 2026-02-03
**Domain:** Native HTML dialog element, SortableJS image galleries, accessibility patterns
**Confidence:** HIGH

## Summary

Phase 8 delivers two integrated features: a product preview modal for admin viewing (MODAL-01 through MODAL-09) and drag-and-drop image reordering within the product edit form (IMAGE-03 through IMAGE-08). Prior decisions from v1.1 research establish the core stack: native `<dialog>` element for modals (zero dependencies, built-in accessibility) and SortableJS for drag-and-drop (already installed for product reordering in Phase 6).

The codebase already has a mature modal implementation in `categoriesView.js` (customer-facing) that can be adapted for admin use. The key difference is the admin modal shows a preview-only view with action buttons (Edit, Delete, Duplicate) rather than "Add to Cart". SortableJS is already configured in `BisliView.js` for product list reordering and can be instantiated separately for image thumbnails.

The native `<dialog>` element provides built-in ESC key handling, focus management, and `::backdrop` pseudo-element for overlay styling. Combined with the established patterns from Phase 6 (Toastify for notifications, beforeunload for unsaved changes), Phase 8 builds on proven infrastructure.

**Primary recommendation:** Use native `<dialog>` with `showModal()` for the preview modal (built-in accessibility, 96%+ browser support), reuse SortableJS with handle pattern for image thumbnails, persist image order in hidden form field submitted with product form.

## Standard Stack

The established libraries/tools for this phase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native `<dialog>` | HTML5 | Modal container | Zero dependencies, built-in ESC/focus trap, 96%+ browser support, ARIA semantics automatic |
| SortableJS | 1.15.6 | Image thumbnail reordering | Already installed (Phase 4/6), touch support, handle option prevents accidental drags |
| Toastify.js | Latest | Toast notifications | Already configured in BisliView.js (Phase 6), consistent UX |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS `::backdrop` | Native | Modal overlay styling | Dialog pseudo-element for dimmed background |
| CSS logical properties | Native | RTL support | `inset-inline-start` instead of `left` for Hebrew |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<dialog>` | Custom modal div | Custom requires manual ESC, focus trap, ARIA; dialog provides all built-in |
| SortableJS for images | Separate drag library | Adding another library is unnecessary; SortableJS already proven in codebase |
| Hidden form field | Separate AJAX save | Form field approach is simpler, saves with rest of product data, no additional endpoint |

**Installation:**
```bash
# No new packages needed - all dependencies already in project
# SortableJS: installed in Phase 4 (npm list sortablejs -> 1.15.6)
# Toastify: installed in Phase 6
# Native dialog: browser API
```

## Architecture Patterns

### Recommended Project Structure
```
admin/
  BisliView.js         # Extend: Add modal rendering, image gallery sortable
frontend/
  css/
    admin-modal.css    # New: Modal styles (can be embedded or separate)
```

### Pattern 1: Native Dialog Modal
**What:** HTML `<dialog>` element with `showModal()` for modal behavior
**When to use:** Any modal that needs backdrop, ESC dismiss, focus trapping
**Example:**
```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
function createProductPreviewModal() {
  // Remove any existing modal
  const existingModal = document.getElementById('productPreviewModal');
  if (existingModal) existingModal.remove();

  const dialog = document.createElement('dialog');
  dialog.id = 'productPreviewModal';
  dialog.className = 'admin-preview-modal';
  dialog.setAttribute('aria-labelledby', 'modal-title');
  dialog.setAttribute('aria-describedby', 'modal-description');

  dialog.innerHTML = `
    <div class="modal-header">
      <h2 id="modal-title" class="modal-title"></h2>
      <button type="button" class="close-modal-btn" aria-label="Close modal">&times;</button>
    </div>
    <div id="modal-description" class="modal-body">
      <!-- Product preview content -->
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn--primary" data-action="edit">Edit</button>
      <button type="button" class="btn btn--danger" data-action="delete">Delete</button>
      <button type="button" class="btn" data-action="duplicate">Duplicate</button>
    </div>
  `;

  document.body.appendChild(dialog);
  return dialog;
}

function openProductPreview(product) {
  const dialog = createProductPreviewModal();

  // Populate content
  dialog.querySelector('#modal-title').textContent = product.name;
  dialog.querySelector('.modal-body').innerHTML = renderProductPreview(product);

  // Show modal - automatically handles:
  // - Focus trapping (Tab cycles within dialog)
  // - ESC key to close
  // - Backdrop display
  dialog.showModal();

  // Close button handler
  dialog.querySelector('.close-modal-btn').addEventListener('click', () => {
    dialog.close();
  });

  // Backdrop click to close (native dialog doesn't do this automatically)
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.close();
    }
  });

  // Action button handlers
  dialog.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (action === 'edit') {
      dialog.close();
      editProduct(product);
    } else if (action === 'delete') {
      if (confirm('Are you sure you want to delete this product?')) {
        dialog.close();
        deleteProduct(product._id);
      }
    } else if (action === 'duplicate') {
      dialog.close();
      duplicateProduct(product);
    }
  });

  // Cleanup on close
  dialog.addEventListener('close', () => {
    dialog.remove();
  });
}
```

### Pattern 2: SortableJS for Image Thumbnails
**What:** Drag-and-drop reordering for image gallery within product form
**When to use:** Image gallery in edit form where order matters
**Example:**
```javascript
// Source: https://sortablejs.github.io/Sortable/
function initImageGallerySortable(container, onOrderChange) {
  // Container is the thumbnails wrapper
  // e.g., document.querySelector('.edit-gallery-thumbs')

  const sortable = Sortable.create(container, {
    animation: 150,
    handle: '.image-drag-handle',  // Specific handle, not entire thumb
    ghostClass: 'image-sortable-ghost',
    chosenClass: 'image-sortable-chosen',
    dragClass: 'image-sortable-drag',
    delay: 50,
    delayOnTouchOnly: true,
    onEnd: function(evt) {
      // Get new order as array of image URLs or indices
      const items = Array.from(container.querySelectorAll('.gallery-thumb'));
      const newOrder = items.map(item => item.dataset.imageUrl);

      // First item is main image - add visual indicator
      items.forEach((item, idx) => {
        item.classList.toggle('is-main-image', idx === 0);
      });

      // Callback to update hidden form field
      onOrderChange(newOrder);
    }
  });

  return sortable;
}

// In editProduct form setup:
const galleryContainer = document.querySelector('.edit-gallery-thumbs');
const imageOrderInput = document.getElementById('imageOrderInput');

const gallerySortable = initImageGallerySortable(galleryContainer, (newOrder) => {
  // Store order in hidden input for form submission
  imageOrderInput.value = JSON.stringify(newOrder);

  // Mark form as dirty for unsaved changes warning
  formHasChanges = true;
});
```

### Pattern 3: Customer-Facing Preview Rendering
**What:** Render product exactly as customer sees it, within admin modal
**When to use:** Admin preview modal content
**Example:**
```javascript
// Source: Adapted from categoriesView.js showProductModal
function renderProductPreview(product) {
  // Get images using existing helper (handles legacy/new format)
  const mainImageUrl = getImageUrl(
    product.image,
    product.imageLocal,
    product.publicImage,
    product.mainImage
  );

  const galleryUrls = getAllSmallImageUrls(product);

  // Include main image as first thumbnail (match customer view)
  const allImages = mainImageUrl ? [mainImageUrl, ...galleryUrls] : galleryUrls;

  return `
    <div class="preview-layout">
      <div class="preview-images">
        <div class="preview-main-image">
          <img src="${allImages[0] || ''}" alt="${product.name}" />
        </div>
        ${allImages.length > 1 ? `
          <div class="preview-thumbnails">
            ${allImages.map((url, idx) => `
              <div class="preview-thumb ${idx === 0 ? 'active' : ''}" data-index="${idx}">
                <img src="${url}" alt="View ${idx + 1}" loading="lazy" />
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
      <div class="preview-details">
        <h3 class="preview-title">${product.name}</h3>
        ${product.description ? `
          <div class="preview-description">${product.description.replace(/\n/g, '<br>')}</div>
        ` : ''}
        ${product.sku ? `
          <div class="preview-sku">
            <span class="sku-label">SKU:</span>
            <span class="sku-value">${product.sku}</span>
          </div>
        ` : ''}
        <div class="preview-price">${product.ils_price} ILS</div>
      </div>
    </div>
  `;
}
```

### Pattern 4: Image Delete with Confirmation
**What:** Delete button on each thumbnail with confirm dialog
**When to use:** Destructive action on gallery images
**Example:**
```javascript
// Source: Existing BisliView.js deleteProductImage pattern
function setupImageDeleteButtons(container, productId) {
  container.querySelectorAll('.delete-image-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const imageUrl = decodeURIComponent(btn.dataset.imageUrl);
      const imageIndex = parseInt(btn.dataset.imageIndex, 10);

      if (!confirm('Delete this image from the gallery?')) return;

      btn.disabled = true;

      try {
        const response = await apiFetch('/deleteproductimage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          },
          body: JSON.stringify({
            productId,
            imageUrl,
            imageIndex  // For images array, index is cleaner
          })
        });

        if (response.ok) {
          // Remove from DOM
          const thumb = btn.closest('.gallery-thumb');
          thumb.remove();

          // Update main image indicator if first was removed
          const firstThumb = container.querySelector('.gallery-thumb');
          if (firstThumb) {
            firstThumb.classList.add('is-main-image');
          }

          showSuccessToast('Image deleted');
        } else {
          throw new Error('Delete failed');
        }
      } catch (error) {
        showErrorToast('Failed to delete image');
        btn.disabled = false;
      }
    });
  });
}
```

### Anti-Patterns to Avoid
- **Custom focus trap implementation:** Native `<dialog>` handles this automatically; hand-rolling is error-prone and unnecessary
- **Inline onclick handlers:** Use event delegation; modals are dynamically created
- **Dragging entire thumbnail:** Users may want to click to preview; use drag handle icon to distinguish
- **Saving image order on every drag:** Wait for form submission; reduces API calls, enables cancel
- **Blocking modals for confirmations:** Delete confirmation can use native confirm() for simplicity

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal focus trapping | Custom Tab key interception | Native `<dialog>` with `showModal()` | Browser handles all edge cases (nested focusables, screen readers, platform differences) |
| ESC key modal close | `keydown` event listener | Native `<dialog>` default behavior | Built-in, no code needed, respects cancel event for override |
| Modal backdrop styling | Custom overlay div | `dialog::backdrop` pseudo-element | Native, no z-index conflicts, automatic with showModal() |
| Image drag-and-drop | Custom mouse/touch handlers | SortableJS | Touch support, scroll handling, ghost image, already installed |
| Toast notifications | Custom positioned divs | Toastify.js | Already configured in Phase 6, consistent UX |
| ARIA modal semantics | Manual role/aria attributes | Native `<dialog>` | Browser adds appropriate semantics automatically |

**Key insight:** The native `<dialog>` element eliminates hundreds of lines of accessibility and focus management code. Combined with SortableJS (already proven in Phase 6), Phase 8 requires minimal new patterns.

## Common Pitfalls

### Pitfall 1: Backdrop Click Not Closing Dialog
**What goes wrong:** User clicks backdrop, modal stays open
**Why it happens:** Native `<dialog>` doesn't close on backdrop click by default
**How to avoid:** Add explicit click handler checking `e.target === dialog`
**Warning signs:** Users complaining they "can't close the modal"
```javascript
dialog.addEventListener('click', (e) => {
  const rect = dialog.getBoundingClientRect();
  if (
    e.clientX < rect.left || e.clientX > rect.right ||
    e.clientY < rect.top || e.clientY > rect.bottom
  ) {
    dialog.close();
  }
});
// Or simpler approach checking target directly:
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close();
});
```

### Pitfall 2: Focus Not Returned After Modal Close
**What goes wrong:** After closing modal, focus goes to body instead of trigger element
**Why it happens:** Modal removed from DOM before focus can be restored
**How to avoid:** Store reference to trigger element, restore focus in close handler before removing dialog
**Warning signs:** Keyboard users lose their place after closing modal
```javascript
function openProductPreview(product, triggerElement) {
  const dialog = createProductPreviewModal();
  // ...
  dialog.addEventListener('close', () => {
    if (triggerElement && triggerElement.focus) {
      triggerElement.focus();
    }
    dialog.remove();
  });
}
```

### Pitfall 3: Image Order Lost on Cancel
**What goes wrong:** User reorders images, clicks Cancel, order persists
**Why it happens:** SortableJS mutates DOM directly; no rollback mechanism
**How to avoid:** Store original order, restore DOM on cancel, only persist on Save
**Warning signs:** "I cancelled but my changes saved anyway"
```javascript
let originalImageOrder = [];

function enterEditMode(product) {
  // Store original order
  originalImageOrder = getAllSmallImageUrls(product);
}

function handleCancel() {
  // Restore original order in DOM
  rerenderImageGallery(originalImageOrder);
}
```

### Pitfall 4: SortableJS Conflict with Existing Instance
**What goes wrong:** Drag behavior erratic, multiple ghost images
**Why it happens:** Previous SortableJS instance not destroyed when navigating
**How to avoid:** Store instance reference, call `destroy()` before creating new one
**Warning signs:** Console errors, jerky drag behavior after multiple edit sessions
```javascript
let galleryInstanceSortable = null;

function setupGallerySortable(container) {
  // Destroy existing instance
  if (galleryInstanceSortable) {
    galleryInstanceSortable.destroy();
    galleryInstanceSortable = null;
  }

  galleryInstanceSortable = Sortable.create(container, { /* options */ });
}
```

### Pitfall 5: Main Image Indicator Not Updated
**What goes wrong:** After reordering, visual indicator shows wrong image as main
**Why it happens:** `is-main-image` class not updated after drag
**How to avoid:** Update class in SortableJS `onEnd` handler
**Warning signs:** Visual mismatch between indicator and actual first image

### Pitfall 6: Modal Z-Index Conflicts
**What goes wrong:** Modal appears behind other elements (sticky header, toast)
**Why it happens:** Dialog z-index not high enough or stacking context issues
**How to avoid:** Use `dialog::backdrop` (browser handles z-index), set dialog z-index above header
**Warning signs:** Modal "invisible" or partially obscured
```css
dialog.admin-preview-modal {
  z-index: 1500; /* Above sticky header (1000), below toasts (2000) */
}

dialog.admin-preview-modal::backdrop {
  background: rgba(0, 0, 0, 0.5);
}
```

### Pitfall 7: RTL Layout Breaks Modal/Gallery
**What goes wrong:** In Hebrew mode, close button on wrong side, drag direction confusing
**Why it happens:** Using `left`/`right` instead of logical properties
**How to avoid:** Use `inset-inline-start`/`inset-inline-end`, test in Hebrew mode
**Warning signs:** Hebrew users report "close button misplaced"

## Code Examples

Verified patterns from official sources:

### Complete Modal Lifecycle
```javascript
// Source: MDN + codebase patterns
function initProductPreviewModal() {
  // Remove any existing modal first
  const existingModal = document.getElementById('productPreviewModal');
  if (existingModal) existingModal.remove();

  const dialog = document.createElement('dialog');
  dialog.id = 'productPreviewModal';
  dialog.className = 'admin-preview-modal';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'preview-modal-title');

  document.body.appendChild(dialog);
  return dialog;
}

function openProductPreview(product, triggerElement) {
  const dialog = initProductPreviewModal();

  dialog.innerHTML = `
    <header class="modal-header">
      <h2 id="preview-modal-title">${product.name}</h2>
      <button type="button" class="modal-close" aria-label="Close">&times;</button>
    </header>
    <main class="modal-body">
      ${renderProductPreview(product)}
    </main>
    <footer class="modal-footer">
      <button type="button" class="btn" data-action="duplicate">Duplicate</button>
      <button type="button" class="btn btn--danger" data-action="delete">Delete</button>
      <button type="button" class="btn btn--primary" data-action="edit">Edit</button>
    </footer>
  `;

  // Show modal (triggers built-in focus trap and ESC handling)
  dialog.showModal();

  // Close handlers
  const closeModal = () => {
    dialog.close();
    triggerElement?.focus();
    dialog.remove();
  };

  dialog.querySelector('.modal-close').addEventListener('click', closeModal);

  // Backdrop click
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeModal();
  });

  // Action buttons
  dialog.querySelector('[data-action="edit"]').addEventListener('click', () => {
    closeModal();
    editProduct(product);
  });

  dialog.querySelector('[data-action="delete"]').addEventListener('click', () => {
    if (confirm(`Delete "${product.name}"? This cannot be undone.`)) {
      closeModal();
      deleteProduct(product._id).then(() => {
        showSuccessToast('Product deleted');
        fetchInfo(); // Refresh list
      });
    }
  });

  dialog.querySelector('[data-action="duplicate"]').addEventListener('click', () => {
    closeModal();
    duplicateProduct(product);
  });

  // Setup image thumbnail click handlers in modal
  const thumbnails = dialog.querySelectorAll('.preview-thumb');
  const mainImage = dialog.querySelector('.preview-main-image img');

  thumbnails.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbnails.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      mainImage.src = thumb.querySelector('img').src;
    });
  });
}
```

### Image Gallery Sortable in Edit Form
```javascript
// Source: SortableJS docs + Phase 6 patterns
function setupEditFormImageGallery(product) {
  const galleryContainer = document.querySelector('.edit-gallery-thumbs');
  if (!galleryContainer) return;

  // Get images using unified array (Phase 7 migration)
  let currentImages = [];
  if (Array.isArray(product.images) && product.images.length > 0) {
    currentImages = product.images.map(img => ({
      url: img.desktop || img.publicDesktop || '',
      original: img
    }));
  } else {
    // Fallback to legacy format
    const mainUrl = getImageUrl(product.image, product.imageLocal, product.publicImage, product.mainImage);
    const smallUrls = getAllSmallImageUrls(product);
    if (mainUrl) currentImages.push({ url: mainUrl, original: product.mainImage });
    smallUrls.forEach(url => currentImages.push({ url, original: null }));
  }

  // Store original for cancel
  const originalOrder = [...currentImages];

  // Render thumbnails with drag handles
  galleryContainer.innerHTML = currentImages.map((img, idx) => `
    <div class="gallery-thumb ${idx === 0 ? 'is-main-image' : ''}" data-index="${idx}" data-url="${encodeURIComponent(img.url)}">
      <div class="image-drag-handle" aria-label="Drag to reorder">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="4" cy="4" r="1.5"/>
          <circle cx="4" cy="8" r="1.5"/>
          <circle cx="4" cy="12" r="1.5"/>
          <circle cx="12" cy="4" r="1.5"/>
          <circle cx="12" cy="8" r="1.5"/>
          <circle cx="12" cy="12" r="1.5"/>
        </svg>
      </div>
      <img src="${img.url}" alt="Gallery image ${idx + 1}" loading="lazy" />
      <button type="button" class="delete-image-btn" data-index="${idx}" aria-label="Delete image">
        &times;
      </button>
      ${idx === 0 ? '<span class="main-badge">Main</span>' : ''}
    </div>
  `).join('');

  // Destroy previous instance if exists
  if (window._galleryInstanceSortable) {
    window._galleryInstanceSortable.destroy();
  }

  // Initialize SortableJS
  window._galleryInstanceSortable = Sortable.create(galleryContainer, {
    handle: '.image-drag-handle',
    animation: 150,
    ghostClass: 'gallery-sortable-ghost',
    chosenClass: 'gallery-sortable-chosen',
    dragClass: 'gallery-sortable-drag',
    delay: 50,
    delayOnTouchOnly: true,
    onEnd: function(evt) {
      // Update main badge
      const thumbs = galleryContainer.querySelectorAll('.gallery-thumb');
      thumbs.forEach((thumb, idx) => {
        thumb.classList.toggle('is-main-image', idx === 0);
        const badge = thumb.querySelector('.main-badge');
        if (idx === 0 && !badge) {
          thumb.insertAdjacentHTML('beforeend', '<span class="main-badge">Main</span>');
        } else if (idx !== 0 && badge) {
          badge.remove();
        }
      });

      // Store new order in hidden field
      updateImageOrderField(galleryContainer);
    }
  });

  // Delete handlers
  setupImageDeleteButtons(galleryContainer, product._id);
}

function updateImageOrderField(container) {
  const orderInput = document.getElementById('imageOrderInput');
  if (!orderInput) return;

  const order = Array.from(container.querySelectorAll('.gallery-thumb'))
    .map(thumb => decodeURIComponent(thumb.dataset.url));

  orderInput.value = JSON.stringify(order);
}
```

### Modal CSS with RTL Support
```css
/* Source: MDN dialog + CSS-Tricks patterns */
dialog.admin-preview-modal {
  position: fixed;
  inset: 0;
  margin: auto;
  max-width: 900px;
  max-height: 80vh;
  padding: 0;
  border: none;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  z-index: 1500;
}

dialog.admin-preview-modal::backdrop {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

dialog.admin-preview-modal[open] {
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-close {
  /* Use logical properties for RTL */
  margin-inline-start: auto;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
}

.modal-close:hover {
  color: #1f2937;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
}

/* RTL support */
[dir="rtl"] .modal-footer {
  justify-content: flex-start;
}

/* Image gallery sortable styles */
.gallery-thumb {
  position: relative;
  width: 80px;
  height: 80px;
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
}

.gallery-thumb.is-main-image {
  border-color: #4ade80;
}

.main-badge {
  position: absolute;
  bottom: 4px;
  inset-inline-start: 4px;
  padding: 2px 6px;
  background: #4ade80;
  color: white;
  font-size: 10px;
  font-weight: 600;
  border-radius: 4px;
}

.image-drag-handle {
  position: absolute;
  top: 4px;
  inset-inline-start: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  cursor: grab;
  opacity: 0.7;
  transition: opacity 0.15s;
}

.gallery-thumb:hover .image-drag-handle {
  opacity: 1;
}

.gallery-sortable-ghost {
  opacity: 0.4;
  border-color: #3b82f6;
}

.gallery-sortable-chosen {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.delete-image-btn {
  position: absolute;
  top: 4px;
  inset-inline-end: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.15s;
}

.gallery-thumb:hover .delete-image-btn {
  opacity: 1;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom modal divs with ARIA | Native `<dialog>` element | 2022 (Safari support) | Zero-dependency modals with built-in accessibility |
| Manual focus trap libraries | `<dialog>`.showModal() | 2022 | Browser handles focus trap, no library needed |
| `tabindex=-1` + JS focus management | Native dialog focus behavior | 2022 | Automatic first-focusable-element focus |
| z-index conflicts with overlays | `::backdrop` pseudo-element | 2022 | Browser manages stacking context |
| jQuery UI Sortable | SortableJS | 2015+ | No jQuery dependency, better touch support |
| Separate save button for image order | Hidden form field + form submit | Modern practice | Unified save action, simpler mental model |

**Deprecated/outdated:**
- **focus-trap library:** Unnecessary with native dialog; only use if supporting IE11
- **body-scroll-lock library:** Dialog handles scroll lock automatically
- **Custom ESC key handlers:** Dialog closes on ESC by default
- **aria-hidden on siblings:** Dialog automatically manages inert state

## Open Questions

Things that couldn't be fully resolved:

1. **Duplicate product implementation details**
   - What we know: MODAL-09 requires Duplicate action button
   - What's unclear: Does duplicate copy images? SKU handling? Name suffix?
   - Recommendation: Copy product with "(Copy)" suffix, generate new SKU, copy image references (don't duplicate files)

2. **Image order persistence endpoint**
   - What we know: IMAGE-06 says "save when product form is submitted"
   - What's unclear: Whether existing update endpoint handles image order or needs modification
   - Recommendation: Add `imageOrder` field to product update payload; backend reorders images array

3. **Modal on mobile/touch devices**
   - What we know: Dialog has good touch support, SortableJS handles touch
   - What's unclear: Whether modal sizing works well on small screens
   - Recommendation: Add responsive CSS (max-width: 100vw on mobile), test on actual devices

4. **Image delete during edit vs immediate**
   - What we know: Current implementation deletes immediately via API
   - What's unclear: Should delete be staged until form save (like reorder)?
   - Recommendation: Keep immediate delete (existing pattern), provides clear feedback, irreversible action should be explicit

## Sources

### Primary (HIGH confidence)
- [MDN: The Dialog Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) - Official HTML5 dialog reference
- [SortableJS Official Docs](https://sortablejs.github.io/Sortable/) - Drag-and-drop configuration
- [CSS-Tricks: No Need to Trap Focus on Dialog](https://css-tricks.com/there-is-no-need-to-trap-focus-on-a-dialog-element/) - Focus trap is built-in
- [Jared Cunha: HTML Dialog Accessibility and UX](https://jaredcunha.com/blog/html-dialog-getting-accessibility-and-ux-right) - Best practices for dialog accessibility
- Existing codebase: `categoriesView.js` modal implementation (lines 800-940)
- Existing codebase: `BisliView.js` SortableJS implementation (lines 1351-1491)
- Phase 6 RESEARCH.md - Established SortableJS patterns, Toastify configuration

### Secondary (MEDIUM confidence)
- [Harvard Digital Accessibility: Accessible Modal Dialogs](https://accessibility.huit.harvard.edu/technique-accessible-modal-dialogs) - ARIA requirements
- [DEV.to: HTML Dialog Element Guide](https://dev.to/ilham-bouktir/the-html-dialog-element-your-native-solution-for-accessible-modals-and-popups-308p) - Practical implementation guide
- [UXPin: Focus Traps in Modals](https://www.uxpin.com/studio/blog/how-to-build-accessible-modals-with-focus-traps/) - When custom traps are needed (not with dialog)

### Tertiary (LOW confidence - not used in recommendations)
- WebSearch results for "dialog closedby attribute" - mentioned but not well documented yet

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Native dialog 96%+ support, SortableJS already proven in codebase
- Architecture: HIGH - Patterns adapt existing categoriesView modal and BisliView SortableJS
- Pitfalls: MEDIUM - Based on MDN docs and community articles, not direct experience
- RTL support: MEDIUM - Logical properties documented, needs testing in Hebrew mode

**Research date:** 2026-02-03
**Valid until:** 60 days (stable domain - dialog element and SortableJS are mature)

---

**Ready for planning:** All technical domains investigated, native dialog pattern verified, SortableJS reuse confirmed, accessibility patterns documented. Planner can create PLAN.md files for modal (MODAL-01 through MODAL-09) and image reordering (IMAGE-03 through IMAGE-08).
