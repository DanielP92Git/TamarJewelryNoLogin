# Phase 3: Customer Display - Research

**Researched:** 2026-02-01
**Domain:** Frontend JavaScript/CSS for SKU display with RTL support and copy-to-clipboard
**Confidence:** HIGH

## Summary

Research into displaying SKU information on product modal pages with multi-language support, RTL handling, and copy-to-clipboard functionality. The standard approach uses modern JavaScript Clipboard API for copying, CSS direction properties for RTL support, and vanilla JavaScript for conditional rendering and tooltips.

**Key findings:**
- Modern Clipboard API (navigator.clipboard.writeText) is the standard for copy functionality (HTTPS required)
- RTL handling for mixed content requires CSS `direction` and `unicode-bidi` properties
- SKU values (alphanumeric codes) must use `unicode-bidi: plaintext` or `direction: ltr` to prevent reversal in RTL mode
- Pure CSS tooltips are preferred over JavaScript libraries for simple feedback messages
- Conditional rendering should check for null/undefined/empty string before displaying SKU

**Primary recommendation:** Use native browser APIs (Clipboard API, CSS direction properties) without external libraries. SKU display integrates into existing modal structure between description and price sections.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Clipboard API | Native | Copy text to clipboard | Modern browser standard, no dependencies, HTTPS-only security |
| CSS Direction | Native | RTL/LTR text handling | W3C standard for bidirectional text, built into browsers |
| Vanilla JS | ES6+ | DOM manipulation | No framework needed, matches existing codebase architecture |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS Transitions | Native | Tooltip animations | Smooth fade-in/fade-out effects for "Copied!" feedback |
| Template Literals | ES6 | HTML string generation | Consistent with existing modal markup generation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Clipboard API | clipboard.js library | Library adds 11KB for functionality already in browsers; only useful for legacy browser support |
| CSS tooltips | JavaScript tooltip library | Libraries add overhead and dependencies; CSS-only is faster and simpler for basic tooltips |
| Framework components | React/Vue SKU component | Would require rewriting entire frontend; vanilla JS matches existing MVC architecture |

**Installation:**
```bash
# No installation needed - all native browser APIs
# Existing project already has build tooling (Parcel)
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/js/Views/
├── categoriesView.js        # Add SKU display to generatePreview() method
frontend/css/
├── categories-800plus.css   # Desktop SKU styles
└── categories-devices.css   # Mobile SKU styles (same positioning)
```

### Pattern 1: Conditional SKU Display in Modal
**What:** Check if product has SKU field before rendering, show placeholder if missing
**When to use:** Every product modal render
**Example:**
```javascript
// Source: Existing categoriesView.js pattern (lines 612-856)
// Adapt for SKU display below description

generatePreview(item, imageMarkup, hasMultipleImages) {
  const product = this.products.find(prod => prod.id == item.dataset.id);
  const sku = product?.sku || null; // Get SKU from product data

  // SKU markup with conditional rendering
  const skuMarkup = sku
    ? `<div class="product-sku" data-sku="${sku}">
         <span class="sku-label">${this.lang === 'eng' ? 'SKU:' : 'מק״ט:'}</span>
         <span class="sku-value" dir="ltr">${sku}</span>
       </div>`
    : `<div class="product-sku product-sku--placeholder">
         <span class="sku-label">${this.lang === 'eng' ? 'SKU:' : 'מק״ט:'}</span>
         <span class="sku-value">${this.lang === 'eng' ? 'Not available' : 'לא זמין'}</span>
       </div>`;

  // Insert SKU after description, before price
  const modalContent = `
    <div class="item-specs" dir="${this.lang === 'heb' ? 'rtl' : 'ltr'}">
      <h2 class="item-title_modal">${title}</h2>
      ${description ? `<div class="details-container">
        <div class="item-description_modal">${description}</div>
        ${skuMarkup}
      </div>` : `<div class="details-container">${skuMarkup}</div>`}
      <div class="price-actions-wrapper">...</div>
    </div>`;
}
```

### Pattern 2: Copy-to-Clipboard with Async/Await
**What:** Modern Clipboard API with error handling and user feedback
**When to use:** Click handler on SKU element (only when SKU exists, not placeholder)
**Example:**
```javascript
// Source: MDN Clipboard API documentation
// https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText

async function copySkuToClipboard(skuText) {
  try {
    await navigator.clipboard.writeText(skuText);
    // Show "Copied!" tooltip
    showCopiedTooltip();
  } catch (err) {
    console.error('Failed to copy SKU:', err);
    // Fallback: could implement textarea method for older browsers
  }
}

// Event delegation in _setupModalEventListeners()
modal.addEventListener('click', (e) => {
  const skuElement = e.target.closest('.product-sku:not(.product-sku--placeholder)');
  if (skuElement) {
    const skuValue = skuElement.dataset.sku;
    if (skuValue) {
      copySkuToClipboard(skuValue);
    }
  }
});
```

### Pattern 3: RTL-Safe SKU Value Display
**What:** Force LTR direction for alphanumeric SKU codes even in RTL context
**When to use:** Always for SKU value span, regardless of page language
**Example:**
```css
/* Source: W3C RTL best practices
   https://www.w3.org/International/questions/qa-ltr-scripts-in-rtl */

.sku-value {
  direction: ltr;           /* Force left-to-right for alphanumeric codes */
  unicode-bidi: plaintext;  /* Prevent reversal in RTL context */
  display: inline-block;    /* Ensure direction applies correctly */
}

/* RTL alignment for container */
[dir="rtl"] .product-sku {
  text-align: right;        /* Align entire SKU block to right */
}

[dir="ltr"] .product-sku {
  text-align: left;         /* Align entire SKU block to left */
}
```

### Pattern 4: Pure CSS Tooltip for "Copied!" Feedback
**What:** CSS-only tooltip that appears briefly after copy, no JavaScript libraries
**When to use:** User feedback after successful clipboard copy
**Example:**
```css
/* Source: CSS-Tricks tooltip best practices
   https://css-tricks.com/tooltip-best-practices/ */

.product-sku {
  position: relative;       /* Positioning context for tooltip */
  cursor: pointer;
}

.product-sku--placeholder {
  cursor: default;          /* No pointer for placeholder */
}

/* Tooltip appears when .copied class is added via JavaScript */
.product-sku.copied::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 8px); /* 8px above SKU element */
  left: 50%;
  transform: translateX(-50%);
  background-color: #1f2937;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  white-space: nowrap;
  opacity: 0;
  animation: tooltip-fade-in-out 2s ease-in-out;
  pointer-events: none;     /* Don't interfere with mouse events */
}

@keyframes tooltip-fade-in-out {
  0% { opacity: 0; transform: translateX(-50%) translateY(5px); }
  15% { opacity: 1; transform: translateX(-50%) translateY(0); }
  85% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(5px); }
}
```

```javascript
// JavaScript to trigger tooltip
function showCopiedTooltip(skuElement) {
  const tooltipText = this.lang === 'eng' ? 'Copied!' : 'הועתק!';
  skuElement.setAttribute('data-tooltip', tooltipText);
  skuElement.classList.add('copied');

  // Remove class after animation completes (2s)
  setTimeout(() => {
    skuElement.classList.remove('copied');
  }, 2000);
}
```

### Anti-Patterns to Avoid
- **Using `title` attribute for tooltips:** Not accessible, no control over styling/timing, inconsistent browser behavior
- **Reversing SKU string in RTL mode:** Codes like "ABC123" should never become "321CBA" even in Hebrew
- **Using `document.execCommand('copy')`:** Deprecated API, synchronous (blocks UI), limited browser support going forward
- **Adding SKU to product listing cards:** Clutters UI, SKU is secondary information best suited for detail view
- **External clipboard libraries:** Unnecessary dependency for functionality available in all modern browsers

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Copy to clipboard | Custom textarea creation/selection/copy logic | navigator.clipboard.writeText() | Native API handles permissions, security contexts, mobile compatibility; custom solutions have edge cases |
| RTL text handling | String reversal or manual character reordering | CSS `direction` and `unicode-bidi` | Unicode Bidirectional Algorithm is complex; browsers implement it correctly; custom logic breaks for edge cases |
| Tooltip positioning | Manual coordinate calculations for tooltip placement | CSS pseudo-elements with positioning | CSS handles viewport boundaries, RTL flipping, and animations cleanly; JavaScript calculations are fragile |
| Conditional rendering | Complex if/else chains for missing data | Ternary operators with null coalescing | Concise, readable, standard pattern in existing codebase |

**Key insight:** Modern browsers already solve bidirectional text, clipboard access, and CSS animations. Reimplementing these leads to bugs, accessibility issues, and maintenance overhead. Use native APIs and let browsers handle cross-platform differences.

## Common Pitfalls

### Pitfall 1: Clipboard API Fails on HTTP
**What goes wrong:** `navigator.clipboard.writeText()` returns rejected Promise on non-HTTPS sites
**Why it happens:** Clipboard API requires secure context (HTTPS or localhost)
**How to avoid:** Development uses localhost (secure context), production uses HTTPS (already configured per DIGITALOCEAN_SETUP.md)
**Warning signs:** "TypeError: Cannot read property 'writeText' of undefined" or Promise rejection in browser console

### Pitfall 2: SKU Value Reverses in RTL Mode
**What goes wrong:** SKU "ABC123" displays as "321CBA" in Hebrew mode
**Why it happens:** Default Unicode Bidirectional Algorithm treats mixed content based on surrounding text direction
**How to avoid:** Always apply `direction: ltr` and `unicode-bidi: plaintext` to `.sku-value` span
**Warning signs:** SKU appears backwards when viewing product in Hebrew, QA testing with Hebrew language shows reversed codes

### Pitfall 3: Tooltip Positioning Breaks at Viewport Edges
**What goes wrong:** Tooltip gets cut off at top of modal or screen edges
**Why it happens:** Fixed `bottom: calc(100% + 8px)` doesn't account for available space above element
**How to avoid:** Position tooltip below SKU element instead (`top: calc(100% + 8px)`), or use CSS containment
**Warning signs:** Tooltip partially hidden when SKU is near top of modal content area

### Pitfall 4: Copy Handler Triggers for Placeholder
**What goes wrong:** Clicking "Not available" placeholder tries to copy and shows "Copied!" feedback
**Why it happens:** Event listener attached to all `.product-sku` elements without checking for placeholder state
**How to avoid:** Use `:not(.product-sku--placeholder)` selector or check `dataset.sku` exists before copying
**Warning signs:** User can "copy" the text "Not available" instead of actual SKU, confusing UX

### Pitfall 5: Language Switch Doesn't Update SKU Label
**What goes wrong:** SKU label stays "SKU:" when switching to Hebrew, or "מק״ט:" when switching to English
**Why it happens:** SKU markup generated once on modal open, language switcher doesn't re-render modal content
**How to avoid:** Either (a) close and reopen modal after language change, or (b) add SKU label to `setPageSpecificLanguage()` method
**Warning signs:** User switches language while modal is open, SKU label doesn't translate

### Pitfall 6: Missing Data Attributes for Cart Integration
**What goes wrong:** Add to cart from modal fails when SKU is present
**Why it happens:** SKU field added to Product schema but not included in `data-*` attributes on modal button
**How to avoid:** Product schema includes SKU, but cart doesn't need it - ensure existing `data-usd-price`, `data-ils-price` attributes remain intact
**Warning signs:** "Add to Cart" functionality broken after SKU display added

## Code Examples

Verified patterns from official sources:

### Clipboard Copy with Error Handling
```javascript
// Source: MDN Web Docs - Clipboard API
// https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText

async function copySkuToClipboard(skuText, skuElement) {
  // Check if Clipboard API is available
  if (!navigator.clipboard) {
    console.warn('Clipboard API not available');
    return;
  }

  try {
    await navigator.clipboard.writeText(skuText);

    // Show success feedback
    const tooltipText = this.lang === 'eng' ? 'Copied!' : 'הועתק!';
    skuElement.setAttribute('data-tooltip', tooltipText);
    skuElement.classList.add('copied');

    setTimeout(() => {
      skuElement.classList.remove('copied');
      skuElement.removeAttribute('data-tooltip');
    }, 2000);
  } catch (err) {
    console.error('Failed to copy SKU:', err);
    // Could show error feedback here
  }
}
```

### RTL-Safe SKU Styling
```css
/* Source: W3C Internationalization - RTL Scripts
   https://www.w3.org/International/questions/qa-ltr-scripts-in-rtl */

.product-sku {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-top: 12px;
  background-color: #f5f5f5;
  border-radius: 6px;
  font-size: 0.85rem;
  transition: background-color 0.2s ease;
  position: relative;
}

.product-sku:not(.product-sku--placeholder) {
  cursor: pointer;
}

.product-sku:not(.product-sku--placeholder):hover {
  background-color: #ebebeb;
}

.sku-label {
  font-weight: 600;
  color: #333;
}

.sku-value {
  color: #666;
  font-family: 'Courier New', monospace; /* Monospace for code-like appearance */
  direction: ltr;           /* CRITICAL: Force LTR for alphanumeric codes */
  unicode-bidi: plaintext;  /* Prevent reversal in RTL context */
  display: inline-block;    /* Ensure direction applies */
}

/* RTL alignment */
[dir="rtl"] .product-sku {
  flex-direction: row;      /* Label on right, value on left visually */
  text-align: right;
}

[dir="ltr"] .product-sku {
  flex-direction: row;
  text-align: left;
}

/* Placeholder styling */
.product-sku--placeholder {
  opacity: 0.6;
  cursor: default;
}

.product-sku--placeholder .sku-value {
  font-style: italic;
  font-family: inherit;     /* Don't use monospace for placeholder text */
}
```

### Modal Integration Point
```javascript
// Source: Existing categoriesView.js generatePreview() method
// Integration point: Inside .item-specs div, after .details-container

generatePreview(item, imageMarkup, hasMultipleImages) {
  // ... existing code ...

  const product = this.products.find(prod => prod.id == id);
  const sku = product?.sku || null;

  // Generate SKU markup
  const skuMarkup = this._generateSkuMarkup(sku);

  const modalContent = `
    <div class="item-specs" dir="${this.lang === 'heb' ? 'rtl' : 'ltr'}">
      <h2 class="item-title_modal" dir="${this.lang === 'heb' ? 'rtl' : 'ltr'}">${title}</h2>
      ${description
        ? `<div class="details-container">
             <div class="item-description_modal" dir="${this.lang === 'heb' ? 'rtl' : 'ltr'}">${description.replace(/\n/g, '<br>')}</div>
             ${skuMarkup}
           </div>`
        : `<div class="details-container">${skuMarkup}</div>`
      }
      <div class="price-actions-wrapper">
        <!-- existing price and add-to-cart markup -->
      </div>
    </div>`;

  // ... rest of modal generation ...
}

_generateSkuMarkup(sku) {
  const hasValue = sku && sku.trim() !== '';
  const label = this.lang === 'eng' ? 'SKU:' : 'מק״ט:';
  const value = hasValue
    ? sku
    : (this.lang === 'eng' ? 'Not available' : 'לא זמין');

  const classes = hasValue
    ? 'product-sku'
    : 'product-sku product-sku--placeholder';

  return `
    <div class="${classes}" ${hasValue ? `data-sku="${sku}"` : ''}>
      <span class="sku-label">${label}</span>
      <span class="sku-value">${value}</span>
    </div>`;
}
```

### Event Listener Setup in Modal
```javascript
// Source: Existing _setupModalEventListeners() pattern
// Add to existing modal event listener setup

_setupModalEventListeners() {
  const modal = document.querySelector('.modal');
  if (!modal) return;

  // ... existing listeners (close button, add to cart, etc.) ...

  // SKU copy-to-clipboard handler
  modal.addEventListener('click', async (e) => {
    const skuElement = e.target.closest('.product-sku:not(.product-sku--placeholder)');
    if (!skuElement) return;

    const skuValue = skuElement.dataset.sku;
    if (!skuValue) return;

    // Copy to clipboard
    if (!navigator.clipboard) {
      console.warn('Clipboard API not available');
      return;
    }

    try {
      await navigator.clipboard.writeText(skuValue);

      // Show tooltip
      const tooltipText = this.lang === 'eng' ? 'Copied!' : 'הועתק!';
      skuElement.setAttribute('data-tooltip', tooltipText);
      skuElement.classList.add('copied');

      setTimeout(() => {
        skuElement.classList.remove('copied');
        skuElement.removeAttribute('data-tooltip');
      }, 2000);
    } catch (err) {
      console.error('Failed to copy SKU:', err);
    }
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| document.execCommand('copy') | navigator.clipboard.writeText() | 2020-2021 | Deprecated API replaced by async Clipboard API; better security, mobile support, and error handling |
| String reversal for RTL | CSS direction + unicode-bidi | Standard since HTML5 | Browser handles bidirectional text correctly; manual reversal breaks for mixed content |
| JavaScript tooltip libraries (Tippy.js, Popper.js) | Pure CSS tooltips | 2023-2024 trend | Simpler for basic tooltips, no dependencies, better performance, CSS animations built-in |
| Inline styles for RTL | CSS `[dir="rtl"]` selectors | Standard since HTML5 | Separation of concerns, easier maintenance, supports dynamic language switching |

**Deprecated/outdated:**
- `document.execCommand()` - Removed from web standards, replaced by Clipboard API
- `<bdo>` element for inline direction - Replaced by `unicode-bidi` CSS property and `dir` attribute
- Flash-based clipboard libraries (ZeroClipboard) - Flash deprecated, native API now standard
- jQuery for DOM manipulation - Not needed for simple SKU display; vanilla JS matches existing codebase

## Open Questions

Things that couldn't be fully resolved:

1. **Loading State for SKU Display**
   - What we know: Product data fetched via existing `fetchProductsByCategory()`, SKU included in Product schema
   - What's unclear: Should SKU show skeleton loader while modal opens, or wait until product data loaded?
   - Recommendation: No skeleton needed - product data already loaded before modal opens (user clicks existing product card). If SKU missing from API response, show placeholder immediately.

2. **Accessibility for Copy-to-Clipboard**
   - What we know: Clipboard API requires user gesture (click), screen readers should announce SKU
   - What's unclear: Should SKU be keyboard-accessible (Tab focus, Enter to copy)?
   - Recommendation: Add `tabindex="0"` and keyboard event listener (Enter/Space) to `.product-sku:not(.product-sku--placeholder)` for accessibility. Test with screen readers.

3. **Mobile Tooltip Positioning**
   - What we know: Desktop tooltip appears above SKU element
   - What's unclear: Does tooltip fit above SKU on small mobile screens, or should it appear below?
   - Recommendation: Start with tooltip above (consistent with desktop). If user testing shows cut-off issues, add media query to flip tooltip below SKU on mobile (`@media (max-width: 699.99px)`).

## Sources

### Primary (HIGH confidence)
- [MDN - Clipboard: writeText() method](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write)
- [MDN - Interact with the clipboard](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard)
- [W3C - Structural markup and right-to-left text in HTML](https://www.w3.org/International/questions/qa-html-dir)
- [W3C - RTL rendering of LTR scripts](https://www.w3.org/International/questions/qa-ltr-scripts-in-rtl)
- [W3C - Unicode Bidirectional Algorithm basics](https://www.w3.org/International/articles/inline-bidi-markup/uba-basics)
- [MDN - CSS direction property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/direction)
- [MDN - CSS unicode-bidi property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/unicode-bidi)

### Secondary (MEDIUM confidence)
- [web.dev - How to copy text (Clipboard API patterns)](https://web.dev/patterns/clipboard/copy-text)
- [CSS-Tricks - Tooltip Best Practices](https://css-tricks.com/tooltip-best-practices/)
- [W3C - Internationalization Best Practices: RTL Scripts](https://www.w3.org/International/geo/html-tech/tech-bidi.html)
- [NNGroup - Skeleton Screens 101](https://www.nngroup.com/articles/skeleton-screens/)
- [UserGuiding - Website Tooltips Guide 2026](https://userguiding.com/blog/website-tooltips)

### Tertiary (LOW confidence)
- WebSearch results for "copy to clipboard JavaScript best practices 2026" - general industry consensus
- WebSearch results for "CSS tooltip animation best practices 2026" - design pattern trends
- WebSearch results for "skeleton loading state best practices 2026" - UX patterns (not critical for this phase)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All native browser APIs, no external dependencies, matches existing codebase architecture
- Architecture: HIGH - Clear integration points in existing categoriesView.js, CSS structure already handles RTL/LTR
- Pitfalls: HIGH - RTL text handling and Clipboard API security contexts are well-documented, common mistakes identified
- Code examples: HIGH - Based on MDN documentation and W3C standards, verified current best practices

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - stable browser APIs, unlikely to change)

**Notes:**
- Existing codebase uses vanilla JavaScript MVC pattern - no framework needed
- RTL support already implemented for Hebrew language throughout app
- Product modal structure already exists with clear insertion point for SKU
- Clipboard API supported in all modern browsers (Chrome 66+, Firefox 63+, Safari 13.1+, Edge 79+)
- Development environment uses localhost (secure context) and production uses HTTPS (secure context)
