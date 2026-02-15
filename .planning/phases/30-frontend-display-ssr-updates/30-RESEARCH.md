# Phase 30: Frontend Display & SSR Updates - Research

**Researched:** 2026-02-15
**Domain:** SSR bilingual content rendering, client-side hydration, fallback logic
**Confidence:** HIGH

## Summary

Phase 30 implements bilingual product display on customer-facing pages (SSR category/product pages, client-side cart). The backend already stores `name_en`, `name_he`, `description_en`, `description_he` fields (Phase 29). This phase switches SSR templates and client-side views from legacy `name`/`description` fields to bilingual fields with English fallback logic.

**Technical challenge:** The app uses URL-based language detection (`/en/` vs `/he/`) for SSR, but client-side views use localStorage (`'eng'` vs `'heb'`). Both systems need consistent bilingual field selection logic.

**Primary recommendation:** Use bilingual fields with English fallback everywhere. SSR selects fields based on `lang` param (`en`/`he`), client-side views select based on localStorage (`eng`/`heb`). Fallback chain: `name_he || name_en || name` ensures backward compatibility during migration.

## Standard Stack

### Core (Already in Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| EJS | Latest | SSR templating | Already used for all SSR pages, server-side variable interpolation |
| Express | 4.x | Backend routing | Current architecture, handles SSR route handlers |
| Mongoose | 6.x | MongoDB ODM | Current stack, Product schema with bilingual fields |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Sharp | Latest | Image processing | Already integrated, used for responsive image generation |
| Schema.org | N/A | Structured data | Already used in schemaHelpers.js for JSON-LD generation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| EJS templates | React SSR | Current architecture is EJS-based; React migration out of scope |
| Client-side field selection in View classes | Centralized helper module | View-based approach matches existing MVC pattern |

**Installation:**
No new dependencies required. All changes use existing stack.

## Architecture Patterns

### Recommended Project Structure
Current structure already supports this phase:
```
backend/
├── routes/
│   ├── ssr.js                    # Static page SSR handlers
│   ├── ssrDynamic.js             # Category/Product SSR handlers (UPDATE)
├── helpers/
│   ├── schemaHelpers.js          # JSON-LD generation (UPDATE)
├── views/
│   └── pages/
│       ├── category.ejs          # Category SSR template (UPDATE)
│       ├── product.ejs           # Product SSR template (UPDATE)
frontend/js/
├── Views/
│   ├── categoriesView.js         # Category client-side rendering (UPDATE)
│   └── cartView.js               # Cart client-side rendering (UPDATE)
```

### Pattern 1: SSR Bilingual Field Selection
**What:** Select bilingual fields in SSR route handlers before passing to EJS templates
**When to use:** Category page rendering, product page rendering
**Example:**
```javascript
// Source: backend/routes/ssrDynamic.js (to be updated)
async function renderProductPage(req, res) {
  const { lang, slug } = req.params; // 'en' or 'he' from URL
  const langKey = lang === 'he' ? 'heb' : 'eng';

  const product = await Product.findOne({ slug }).lean();

  // Bilingual field selection with English fallback
  const productName = langKey === 'heb'
    ? (product.name_he || product.name_en || product.name)
    : (product.name_en || product.name);

  const productDescription = langKey === 'heb'
    ? (product.description_he || product.description_en || product.description)
    : (product.description_en || product.description);

  // Pass selected values to template
  res.render('pages/product', {
    ...pageData,
    productName,
    productDescription,
    product, // Full product for other fields
  });
}
```

### Pattern 2: Client-Side Field Selection in categoriesView
**What:** Extract bilingual product name/description from SSR-rendered HTML or API-fetched products
**When to use:** Category page hydration, client-side language switching
**Example:**
```javascript
// Source: frontend/js/Views/categoriesView.js (to be updated)
class CategoriesView extends View {
  getProductName(product) {
    const lng = this.lang; // 'eng' or 'heb' from localStorage
    if (lng === 'heb') {
      return product.name_he || product.name_en || product.name || '';
    }
    return product.name_en || product.name || '';
  }

  getProductDescription(product) {
    const lng = this.lang;
    if (lng === 'heb') {
      return product.description_he || product.description_en || product.description || '';
    }
    return product.description_en || product.description || '';
  }
}
```

### Pattern 3: Cart Item Name Display
**What:** Display product names in cart using bilingual fields from localStorage cart data
**When to use:** Cart page rendering, cart summary, checkout
**Example:**
```javascript
// Source: frontend/js/Views/cartView.js (to be updated)
class CartView extends View {
  _getProductName(item, lng) {
    // Cart items store product data from categoriesView add-to-cart
    // Bilingual fields already attached by categoriesView (addToLocalStorage)
    if (lng === 'heb') {
      return item.name_he || item.name_en || item.title || '';
    }
    return item.name_en || item.title || '';
  }
}
```

### Pattern 4: JSON-LD Structured Data with inLanguage
**What:** Add `inLanguage` property to Product schema JSON-LD, use bilingual product name/description
**When to use:** Product page SSR, category page product items
**Example:**
```javascript
// Source: backend/helpers/schemaHelpers.js (to be updated)
function generateProductSchema(product, langKey, baseUrl, productName, productDescription) {
  const urlLang = langKey === 'heb' ? 'he' : 'en';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    description: productDescription,
    inLanguage: urlLang,
    offers: {
      '@type': 'Offer',
      url: `${baseUrl}/${urlLang}/product/${product.slug}`,
      priceCurrency: langKey === 'heb' ? 'ILS' : 'USD',
      price: (langKey === 'heb' ? product.ils_price : product.usd_price).toFixed(2),
      availability: product.quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };
  return schema;
}
```

### Pattern 5: EJS Template Bilingual Variable Interpolation
**What:** Use pre-selected bilingual variables in EJS templates (not field selection in template)
**When to use:** Category page product cards, product detail page
**Example:**
```ejs
<!-- Source: backend/views/pages/product.ejs (to be updated) -->
<h1 class="product-name"><%= productName %></h1>
<div class="product-description"><%- productDescription %></div>

<!-- Source: backend/views/pages/category.ejs (to be updated) -->
<% products.forEach(function(product) {
  const productName = lang === 'heb'
    ? (product.name_he || product.name_en || product.name)
    : (product.name_en || product.name);
  const productDescription = lang === 'heb'
    ? (product.description_he || product.description_en || product.description)
    : (product.description_en || product.description);
%>
<div class="item-title"><%= productName %></div>
<div class="item-description"><%- productDescription %></div>
<% }); %>
```

### Anti-Patterns to Avoid
- **Duplicate field selection logic:** Don't repeat fallback logic in templates AND route handlers. Select in route handler, pass clean variables to template.
- **Client-side API calls for bilingual fields:** Don't fetch full product from API just to get bilingual name. Use bilingual fields already in SSR HTML or localStorage cart data.
- **Breaking legacy name field:** Don't remove `product.name` references until migration completes. Keep fallback chain: `name_en || name`.
- **Hardcoded English fallback in Hebrew pages:** Don't display English when Hebrew is missing without checking English first. Correct chain: `name_he || name_en || name`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bilingual field selection | Custom string selection logic per view | Centralized helper functions | Consistency across SSR/client-side, easier to update fallback logic |
| Language detection from URL | Custom regex parsing | Existing `languageMiddleware` | Already implemented, handles edge cases (invalid lang codes) |
| Client-side language sync | Manual localStorage checks | Existing locale.js `bootstrapLocaleSync` | Already handles browser detection, backend hydration |
| Schema.org JSON-LD | Manual JSON string building | `schemaHelpers.js` functions | Type safety, consistent formatting, URL construction |

**Key insight:** The app already has robust language detection (SSR: URL-based via `languageMiddleware`, client-side: localStorage via `locale.js`). Don't create new language detection logic—use existing systems and add bilingual field selection on top.

## Common Pitfalls

### Pitfall 1: SSR/Client-Side Language Code Mismatch
**What goes wrong:** SSR uses `en`/`he` (from URL), client-side uses `eng`/`heb` (from localStorage). Bilingual field selection breaks if not normalized.
**Why it happens:** Historical split: SSR routes added later with ISO codes, client-side pre-existing with custom codes.
**How to avoid:**
- SSR route handlers: Map `lang` param to `langKey`: `const langKey = lang === 'he' ? 'heb' : 'eng';`
- Client-side views: Use localStorage `'eng'`/`'heb'` directly, no URL parsing
- Never mix: Don't use `req.params.lang` in client-side code
**Warning signs:** Product name showing wrong language after client-side language switch, SSR Hebrew pages showing English content

### Pitfall 2: Fallback Chain Order Errors
**What goes wrong:** Using fallback `name_en || name_he` instead of `name_he || name_en` for Hebrew pages. Displays English even when Hebrew exists.
**Why it happens:** Copy-paste error from English fallback logic.
**How to avoid:**
- Hebrew pages: Check Hebrew first: `product.name_he || product.name_en || product.name`
- English pages: Check English first: `product.name_en || product.name`
- Always include legacy `product.name` as final fallback during migration
**Warning signs:** Hebrew pages showing English content even after translation added, product names not updating after translation

### Pitfall 3: Cart Item Bilingual Field Propagation
**What goes wrong:** Cart shows product names in wrong language because bilingual fields not stored in localStorage cart data.
**Why it happens:** `addToLocalStorage` in categoriesView only stores `title` (from DOM `.item-title` text), doesn't store `name_en`/`name_he` fields.
**How to avoid:**
- Extract bilingual fields from product data when adding to cart
- Store both `name_en` and `name_he` in cart item object
- Cart rendering selects from stored bilingual fields based on current language
**Warning signs:** Cart shows product names in language from when item was added (not current language), language switching doesn't update cart product names

### Pitfall 4: OG Meta Tags Not Localized
**What goes wrong:** Facebook/social previews show English description for Hebrew product pages.
**Why it happens:** `og:description` meta tag uses `product.description` instead of localized `productDescription`.
**How to avoid:**
- Pass localized `productDescription` to meta-tags partial
- Update `meta-tags.ejs` to use passed description for `og:description`
- Verify OG tags use bilingual fields, not legacy fields
**Warning signs:** Social sharing previews show wrong language, Facebook debugger shows English content for Hebrew URLs

### Pitfall 5: JSON-LD Missing inLanguage Property
**What goes wrong:** Google Search Console warnings about missing language signals in structured data.
**Why it happens:** `inLanguage` property not added to Product schema when bilingual fields introduced.
**How to avoid:**
- Add `inLanguage` property to Product schema JSON-LD: `'en'` or `'he'`
- Use URL language (`urlLang`), not internal langKey
- Test structured data with Google Rich Results Test
**Warning signs:** SEO warnings in Search Console, product rich results not appearing, bilingual site treated as single-language

## Code Examples

Verified patterns from existing codebase:

### SSR Language Detection (Current Pattern)
```javascript
// Source: backend/routes/ssrDynamic.js lines 49-50
async function renderCategoryPage(req, res) {
  const { lang, category } = req.params; // e.g., /en/necklaces
  const langKey = lang === 'he' ? 'heb' : 'eng';
  const urlLang = lang;
  // ...
}
```

### Client-Side Language Detection (Current Pattern)
```javascript
// Source: frontend/js/Views/categoriesView.js lines 184, 271
this.lang = localStorage.getItem('language') || 'eng';
// Used throughout view for UI text and future bilingual field selection
```

### EJS Bilingual Variable Usage (Current Pattern - prices)
```ejs
<!-- Source: backend/views/pages/category.ejs lines 53-55 -->
<%
  const price = lang === 'eng' ? product.usd_price : product.ils_price;
  const originalPrice = lang === 'eng' ? product.original_usd_price : product.original_ils_price;
  const curSign = lang === 'eng' ? '$' : '₪';
%>
```

### Cart Item Data Structure (Current Pattern)
```javascript
// Source: frontend/js/model.js lines 246-260 (addToLocalStorage)
const itemData = {
  title: itemTitle,  // From DOM .item-title textContent
  image: itemImage,
  price: currentPrice,
  usdPrice: usdPrice,  // Stored for currency switching
  ilsPrice: ilsPrice,
  currency: currencyCheck,
  quantity: prodQuantity,
  id: +itemId,
};
// FUTURE: Add name_en/name_he here for bilingual cart display
```

### Existing Fallback Pattern (Image Selection)
```ejs
<!-- Source: backend/views/pages/category.ejs lines 51-52 -->
<%
  const desktopImage = product.images?.[0]?.publicDesktop || product.mainImage?.publicDesktop || product.image || '';
  const mobileImage = product.images?.[0]?.publicMobile || product.mainImage?.publicMobile || product.image || desktopImage;
%>
```
**Lesson:** Existing image fallback uses chained `||` operators for multiple fallbacks. Apply same pattern to bilingual fields.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-language products (legacy `name`/`description` fields only) | Bilingual schema with separate fields per language | Phase 29 (Feb 2026) | Admin can create/edit bilingual products; frontend still uses legacy fields |
| Manual product name translation in admin | Automated Google Translate API integration | Phase 29 (Feb 2026) | Faster workflow, but manual editing still required for quality |
| No translation status indicators | Visual badges in admin product list | Phase 29 (Feb 2026) | Admin sees which products need translation at a glance |
| SSR hardcoded English content | SSR language detection from URL (`/en/` vs `/he/`) | Phase 26 (SSR migration, Jan 2026) | SEO improvement, server-side language routing |

**Deprecated/outdated:**
- Using `product.name` directly in templates without bilingual fallback (still works during migration, but won't show translations)
- Single-language JSON-LD structured data (missing `inLanguage` property)

## Open Questions

1. **Cart Item Bilingual Field Storage**
   - What we know: Cart items stored in localStorage with `title` field (plain text from DOM)
   - What's unclear: Should cart store both `name_en` and `name_he` fields, or just current language?
   - Recommendation: Store both bilingual fields. Allows language switching in cart without re-fetching products. Increases localStorage size slightly but ensures better UX.

2. **Fallback Behavior When Both Languages Missing**
   - What we know: Legacy `name`/`description` fields exist for backward compatibility
   - What's unclear: Should we display "Untitled Product" or hide product completely if all fields empty?
   - Recommendation: Use final fallback to legacy field (`product.name`), then empty string. Don't hide products—admin should see them to fix data issues.

3. **Client-Side Language Switch Performance**
   - What we know: Language switcher calls `setLanguage()` which re-renders all product cards
   - What's unclear: Does re-rendering product cards from bilingual fields in SSR HTML cause performance issues?
   - Recommendation: Extract bilingual fields from SSR data attributes once on page load, cache in categoriesView.products array. Language switch updates text content only, doesn't re-fetch or re-parse HTML.

## Sources

### Primary (HIGH confidence)
- Codebase inspection (2026-02-15): backend/routes/ssrDynamic.js, backend/views/pages/category.ejs, backend/views/pages/product.ejs, frontend/js/Views/categoriesView.js, frontend/js/Views/cartView.js, backend/models/Product.js, backend/helpers/schemaHelpers.js
- Phase 29 Verification Report (29-VERIFICATION.md): Bilingual schema fields, admin UI implementation, backend endpoint updates
- Phase 27 migration decisions: Bilingual schema design, English-only slugs, fallback strategy

### Secondary (MEDIUM confidence)
- Schema.org Product documentation: inLanguage property, offers structure, availability values

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All patterns use existing architecture (EJS, Express, Mongoose, MVC views)
- Architecture: HIGH - Bilingual field selection matches existing image fallback pattern, SSR/client-side split already established
- Pitfalls: HIGH - Identified from actual codebase patterns (lang vs langKey mismatch, SSR vs client-side code differences)

**Research date:** 2026-02-15
**Valid until:** 30 days (stable architecture, no fast-moving dependencies)
