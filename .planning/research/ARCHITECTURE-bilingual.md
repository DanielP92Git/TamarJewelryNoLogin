# Architecture Patterns: Bilingual Product Content Integration

**Domain:** E-commerce bilingual content (Hebrew/English)
**Researched:** 2026-02-13
**Confidence:** HIGH

## Executive Summary

Adding bilingual product fields (name, description) to an existing e-commerce platform requires coordinated changes across 7 architectural layers: database schema, API routes, admin UI, SSR templates, JSON-LD structured data, XML sitemap, and client-side rendering. This document maps integration points, identifies new vs. modified components, and provides a dependency-aware build order.

**Key Decision:** Use flat embedded fields (`name_en`, `name_he`, `description_en`, `description_he`) over nested documents for MongoDB schema. This maximizes compatibility with existing validation, indexing, and query patterns while avoiding breaking changes to API responses.

## Recommended Architecture

### Schema Design: Flat Embedded Fields (Winner)

```javascript
// Product.js (MODIFIED)
const ProductSchema = new mongoose.Schema({
  // Legacy fields (keep for backward compatibility during migration)
  name: { type: String, required: true },        // Primary language (English)
  description: { type: String },                 // Primary language (English)

  // NEW bilingual fields
  name_en: { type: String, required: true },
  name_he: { type: String, required: true },
  description_en: { type: String },
  description_he: { type: String },

  // ... existing fields (category, images, prices, etc.)
});
```

**Why Flat Fields Win:**

| Criterion | Flat Fields (`name_en`) | Nested Object (`translations.en.name`) | Separate Collections |
|-----------|------------------------|----------------------------------------|---------------------|
| **Query simplicity** | ✅ `product.name_en` | ⚠️ `product.translations.en.name` | ❌ JOIN overhead |
| **Index support** | ✅ Direct indexing | ⚠️ Compound index needed | ⚠️ Cross-collection |
| **Mongoose validation** | ✅ Works as-is | ⚠️ Nested validation | ❌ Complex refs |
| **API backward compat** | ✅ Keep `name` field | ⚠️ API reshape needed | ❌ Major refactor |
| **Slug generation** | ✅ Simple pre-save hook | ⚠️ Complex logic | ❌ External service |
| **SSR template access** | ✅ `product.name_en` | ⚠️ `product.translations.en.name` | ❌ Multiple queries |

**Source:** [MongoDB multilingual schema design patterns](https://aymanelbadawy.com/mongodb-internationalization-i18n/) confirm flat fields for 2-language scenarios; nested documents for 5+ languages.

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN CREATES/EDITS PRODUCT               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Admin Form (BisliView.js)                                  │
│  - Name input → name_en                                      │
│  - Name (Hebrew) input → name_he (NEW)                       │
│  - Description textarea → description_en                     │
│  - Description (Hebrew) textarea → description_he (NEW)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Translation Endpoint (backend/index.js) — NEW              │
│  POST /translate                                             │
│  - Receives: { text, sourceLang, targetLang }               │
│  - Calls: Google Cloud Translation API                      │
│  - Returns: { translatedText }                              │
│  - Caching: Redis/Memory for repeated strings               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Product Schema (backend/models/Product.js) — MODIFIED      │
│  - Pre-save hook: Auto-translate if missing                 │
│  - Slug generation: Use name_en (unchanged)                 │
│  - Validation: Require both languages                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Product API Routes (backend/index.js) — MODIFIED           │
│  - GET /allproducts: Include bilingual fields               │
│  - POST /productsByCategory: Include bilingual fields       │
│  - GET /getproduct/:id: Include bilingual fields            │
│  - Legacy `name`/`description`: Alias to `name_en`          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  SSR Templates (backend/views/pages/) — MODIFIED            │
│  - product.ejs: Use product[`name_${lang}`]                 │
│  - category.ejs: Use product[`name_${lang}`]                │
│  - Language detection: req.params.lang (already exists)     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  JSON-LD Schema (backend/views/partials/) — MODIFIED        │
│  - product-schema.ejs: Use lang-specific name/description   │
│  - Hreflang remains unchanged (URL-level, not content)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  XML Sitemap (backend/routes/sitemap.js) — NO CHANGE        │
│  - Product slugs language-agnostic (name_en based)          │
│  - Hreflang alternates work at URL level                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Client-Side Views (frontend/js/Views/) — MODIFIED          │
│  - categoriesView.js: Render product[`name_${lang}`]        │
│  - Language detection: this.lang (already exists)           │
│  - Fallback: Use _en if _he missing                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Cache Invalidation (backend/cache/pageCache.js) — NEW      │
│  - On product update: Clear both /en/ and /he/ keys         │
│  - Cache key format: "path:lang:currency" (already aware)   │
└─────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### Layer 1: Database Schema

**File:** `backend/models/Product.js` (MODIFIED)

**Changes:**

```javascript
// Add new fields
name_en: { type: String, required: true },
name_he: { type: String, required: true },
description_en: { type: String },
description_he: { type: String },

// Keep legacy fields during migration
name: { type: String, required: true },  // Alias to name_en in getter
description: { type: String },           // Alias to description_en in getter
```

**Pre-save hook (NEW):**

```javascript
ProductSchema.pre('save', async function(next) {
  // Auto-populate legacy fields for backward compatibility
  if (this.name_en && !this.name) {
    this.name = this.name_en;
  }
  if (this.description_en && !this.description) {
    this.description = this.description_en;
  }

  // Auto-translate if one language missing (uses translation service)
  if (this.name_en && !this.name_he) {
    this.name_he = await translateText(this.name_en, 'en', 'he');
  }
  if (this.name_he && !this.name_en) {
    this.name_en = await translateText(this.name_he, 'he', 'en');
  }
  // Similar for description_en/description_he

  next();
});
```

**Migration strategy:**

```javascript
// One-time migration script: backend/migrations/add-bilingual-fields.js (NEW)
const Product = require('../models/Product');

async function migrateToBilingual() {
  const products = await Product.find({});

  for (const product of products) {
    // Default: current `name`/`description` = English
    product.name_en = product.name;
    product.description_en = product.description;

    // Auto-translate to Hebrew
    product.name_he = await translateText(product.name, 'en', 'he');
    product.description_he = product.description
      ? await translateText(product.description, 'en', 'he')
      : '';

    await product.save();
  }
}
```

### Layer 2: Translation Service

**File:** `backend/services/translationService.js` (NEW)

**Purpose:** Call Google Cloud Translation API with caching

```javascript
const { Translate } = require('@google-cloud/translate').v2;
const NodeCache = require('node-cache');

const translate = new Translate({
  key: process.env.GOOGLE_TRANSLATE_API_KEY
});

// In-memory cache (1 hour TTL)
const translationCache = new NodeCache({ stdTTL: 3600 });

async function translateText(text, sourceLang, targetLang) {
  if (!text) return '';

  const cacheKey = `${sourceLang}-${targetLang}-${text.substring(0, 100)}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  try {
    const [translation] = await translate.translate(text, {
      from: sourceLang,
      to: targetLang
    });

    translationCache.set(cacheKey, translation);
    return translation;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Fallback to original
  }
}

module.exports = { translateText };
```

**Cost optimization:** [Google Cloud Translation API best practices](https://cloud.google.com/blog/products/ai-machine-learning/four-best-practices-for-translating-your-website) recommend caching at application layer (Redis or in-memory). Expect 50-80% API call reduction for repetitive content.

**File:** `backend/index.js` (ADD NEW ROUTE)

```javascript
// Translation endpoint (admin-only)
app.post('/translate', verifyToken, verifyAdmin, async (req, res) => {
  const { text, sourceLang, targetLang } = req.body;

  if (!text || !sourceLang || !targetLang) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const translation = await translateText(text, sourceLang, targetLang);
    res.json({ translatedText: translation });
  } catch (error) {
    res.status(500).json({ error: 'Translation failed' });
  }
});
```

### Layer 3: Admin UI

**File:** `admin/BisliView.js` (MODIFIED)

**Current form structure (lines 4306-4307):**

```javascript
const name = document.getElementById("name").value;
const description = document.getElementById("description").value || "";
```

**New form structure:**

```html
<!-- In loadAddProductsPage() and loadEditProductPage() -->
<input type="text" id="name-en" placeholder="Product Name (English)" required />
<input type="text" id="name-he" placeholder="שם המוצר (עברית)" required dir="rtl" />
<button type="button" id="translate-name-btn">Auto-translate ↔️</button>

<textarea id="description-en" placeholder="Description (English)"></textarea>
<textarea id="description-he" placeholder="תיאור (עברית)" dir="rtl"></textarea>
<button type="button" id="translate-desc-btn">Auto-translate ↔️</button>
```

**JavaScript changes:**

```javascript
// In addProduct() function (line 4306)
const nameEn = document.getElementById("name-en").value;
const nameHe = document.getElementById("name-he").value;
const descriptionEn = document.getElementById("description-en").value || "";
const descriptionHe = document.getElementById("description-he").value || "";

// Auto-translate handler
document.getElementById("translate-name-btn").addEventListener("click", async () => {
  const nameEn = document.getElementById("name-en").value;
  if (!nameEn) return;

  const response = await apiFetch('/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: nameEn, sourceLang: 'en', targetLang: 'he' })
  });

  const { translatedText } = await response.json();
  document.getElementById("name-he").value = translatedText;
});
```

### Layer 4: SSR Templates

**File:** `backend/views/pages/product.ejs` (MODIFIED)

**Current (line 106):**

```html
<h1 class="product-name">...><%= product.name %></h1>
```

**Updated:**

```html
<h1 class="product-name">...><%= product[`name_${lang}`] || product.name %></h1>
```

**Current (line 141):**

```html
<div class="product-description">...><%- product.description || '' %></div>
```

**Updated:**

```html
<div class="product-description">...><%- product[`description_${lang}`] || product.description || '' %></div>
```

**File:** `backend/views/pages/category.ejs` (MODIFIED)

**Current (line 88):**

```html
<div class="item-title">...<%= product.name %></div>
```

**Updated:**

```html
<div class="item-title">...<%= product[`name_${lang}`] || product.name %></div>
```

**Current (line 89):**

```html
<div class="item-description">...<%- formattedDescription %></div>
```

**Updated (lines 57-62):**

```javascript
const description = product[`description_${lang}`] || product.description || '';
const maxDescriptionLength = 150;
const formattedDescription = description.length > maxDescriptionLength
  ? description.substring(0, maxDescriptionLength).replace(/\n/g, '<br>') + '...'
  : description.replace(/\n/g, '<br>');
```

### Layer 5: JSON-LD Structured Data

**File:** `backend/views/partials/product-schema.ejs` (NO CHANGE NEEDED)

**Why:** Schema is generated in backend route (`backend/index.js`), not in template. Template just renders JSON.

**File:** `backend/index.js` (MODIFIED in `renderProductPage` function)

**Current schema generation (estimate based on typical pattern):**

```javascript
const schemaItems = [{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": product.name,
  "description": product.description,
  // ...
}];
```

**Updated:**

```javascript
const schemaItems = [{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": product[`name_${lang}`] || product.name,
  "description": product[`description_${lang}`] || product.description,
  "inLanguage": lang === 'eng' ? 'en' : 'he',
  // ...
}];
```

**SEO Impact:** [JSON-LD for multilingual content](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) recommends one schema per language version of page with `inLanguage` property. Google uses hreflang (already implemented) for language alternates, not schema.

### Layer 6: OG Meta Tags

**File:** `backend/views/partials/meta-tags.ejs` (MODIFIED)

**Current (line 34):**

```html
<meta property="og:description" content="<%= description %>">
```

**Issue:** `description` variable passed from route needs to use bilingual field.

**File:** `backend/index.js` (MODIFIED in `renderProductPage` function)

**Current (estimate):**

```javascript
const description = product.description || 'Handmade jewelry';
```

**Updated:**

```javascript
const description = product[`description_${lang}`] || product.description || 'Handmade jewelry';
```

### Layer 7: XML Sitemap

**File:** `backend/routes/sitemap.js` (NO CHANGE)

**Why:** Sitemap lists URLs, not content. Product slugs are language-agnostic (generated from `name_en` in schema pre-save hook). Hreflang alternates work at URL level (`/en/product/slug` vs `/he/product/slug`), not content level.

**Verification:** Lines 104-108 already implement proper hreflang structure:

```javascript
const hreflangLinks = [
  { lang: 'en', url: `/en/product/${product.slug}` },
  { lang: 'he', url: `/he/product/${product.slug}` },
  { lang: 'x-default', url: `/en/product/${product.slug}` }
];
```

### Layer 8: Client-Side Views

**File:** `frontend/js/Views/categoriesView.js` (MODIFIED)

**Language detection already exists (line 26):**

```javascript
this.lang = 'eng';
```

**Rendering logic needs update (estimate based on SSR pattern):**

**Current:**

```javascript
const productName = product.name;
const productDescription = product.description;
```

**Updated:**

```javascript
const langKey = this.lang === 'heb' ? 'he' : 'en';
const productName = product[`name_${langKey}`] || product.name;
const productDescription = product[`description_${langKey}`] || product.description;
```

**Note:** Frontend Views are primarily for SPA fallback. SSR (already enabled per line 42 `data-ssr="true"`) serves most users, so client-side rendering is secondary.

### Layer 9: Cache Invalidation

**File:** `backend/cache/pageCache.js` (NEW or MODIFIED)

**Current cache structure:** `node-cache` with TTL (3600s per `cacheMiddleware.js` line 15).

**Cache key format (from `cacheKeys.js` lines 10-30):**

```javascript
`${normalizedPath}:${urlLang}:${currency}${queryString}`
// Example: "/en/product/gold-earrings:en:USD"
```

**Problem:** Product update clears neither `/en/product/...` nor `/he/product/...` cache.

**Solution:** Create cache invalidation utility (NEW FILE)

**File:** `backend/cache/invalidation.js` (NEW)

```javascript
const { pageCache } = require('./pageCache');

function invalidateProductCache(productSlug) {
  const patterns = [
    `/en/product/${productSlug}:en:USD`,
    `/he/product/${productSlug}:he:ILS`
  ];

  patterns.forEach(key => {
    pageCache.del(key);
  });

  // Also clear category pages (product list changed)
  const categories = ['necklaces', 'crochet-necklaces', 'hoops', 'dangle', 'bracelets', 'unisex'];
  categories.forEach(cat => {
    pageCache.del(`/en/${cat}:en:USD`);
    pageCache.del(`/he/${cat}:he:ILS`);
  });
}

module.exports = { invalidateProductCache };
```

**Integration:** Call `invalidateProductCache(product.slug)` after product save/update in backend routes.

## Component Boundaries

| Component | Responsibility | Communicates With | Status |
|-----------|---------------|-------------------|--------|
| **Product Schema** | Store bilingual fields, validate, auto-populate legacy fields | MongoDB | MODIFIED |
| **Translation Service** | Call Google Cloud API, cache results | Google Cloud Translation API | NEW |
| **Admin Form** | Collect bilingual input, trigger auto-translate | Backend API (`/translate`) | MODIFIED |
| **Product API Routes** | Return bilingual fields, maintain backward compat | Product Schema, Translation Service | MODIFIED |
| **SSR Templates** | Render language-specific content | Product API Routes | MODIFIED |
| **JSON-LD Generator** | Create structured data with correct language | Product API Routes | MODIFIED |
| **Client Views** | Render products client-side with language detection | Product API Routes | MODIFIED |
| **Cache Manager** | Invalidate both language versions on update | node-cache | NEW |

## Dependency-Aware Build Order

### Task 1: Database Schema (Foundation)
**Files:**
- `backend/models/Product.js` (add bilingual fields, non-required)
- `backend/services/translationService.js` (NEW)
- `backend/migrations/add-bilingual-fields.js` (NEW)

**Dependencies:** None
**Verification:** Run migration, verify all products have `_en` and `_he` fields

### Task 2: Translation API Endpoint
**Files:**
- `backend/index.js` (add POST `/translate` route)

**Dependencies:** Task 1 (needs `translationService.js`)
**Verification:** curl `/translate` with test text, verify response

### Task 3: Admin UI Update
**Files:**
- `admin/BisliView.js` (modify `addProduct()`, `updateProduct()`, form HTML)

**Dependencies:** Task 2 (needs `/translate` endpoint for auto-translate feature)
**Verification:** Create product with bilingual name/description, verify saved to DB

### Task 4: API Routes Update
**Files:**
- `backend/index.js` (modify `/allproducts`, `/productsByCategory`, `/getproduct/:id`)

**Dependencies:** Task 1 (needs bilingual fields in schema)
**Verification:** curl API, verify response includes `name_en`, `name_he`, etc.

### Task 5: SSR Templates Update
**Files:**
- `backend/views/pages/product.ejs`
- `backend/views/pages/category.ejs`
- `backend/index.js` (`renderProductPage`, `renderCategoryPage` functions)

**Dependencies:** Task 4 (needs API to return bilingual fields)
**Verification:** Visit `/en/product/slug` and `/he/product/slug`, verify correct language shown

### Task 6: JSON-LD Schema Update
**Files:**
- `backend/index.js` (`renderProductPage` function, schema generation)

**Dependencies:** Task 5 (same code area)
**Verification:** View page source, check `<script type="application/ld+json">`, verify language-specific content

### Task 7: Client-Side Views Update
**Files:**
- `frontend/js/Views/categoriesView.js`

**Dependencies:** Task 4 (needs API to return bilingual fields)
**Verification:** Disable JavaScript, verify SSR works; enable, verify client-side matches

### Task 8: Cache Invalidation
**Files:**
- `backend/cache/invalidation.js` (NEW)
- `backend/index.js` (call `invalidateProductCache()` after product updates)

**Dependencies:** Task 4 (needs to know product update routes)
**Verification:** Update product, verify both `/en/` and `/he/` pages show new content

### Task 9: Schema Validation Enforcement
**Files:**
- `backend/models/Product.js` (make `name_en`, `name_he` required)

**Dependencies:** Task 3 (all products have bilingual fields from admin or migration)
**Verification:** Try creating product without `name_he`, verify fails

## Patterns to Follow

### Pattern 1: Language-Aware Field Access

**What:** Always use dynamic field access with language variable

**When:** Rendering product data in templates or client code

**Example:**

```javascript
// EJS template
<%= product[`name_${lang}`] || product.name %>

// JavaScript
const langKey = lang === 'eng' ? 'en' : 'he';
const productName = product[`name_${langKey}`] || product.name;
```

**Why:** Enables language switching without code duplication. Fallback to legacy field ensures backward compatibility.

### Pattern 2: Translation Caching

**What:** Cache translation results in memory (NodeCache) or Redis

**When:** Calling Google Cloud Translation API

**Example:**

```javascript
const cacheKey = `${sourceLang}-${targetLang}-${text.substring(0, 100)}`;
const cached = translationCache.get(cacheKey);
if (cached) return cached;

const translation = await translate.translate(text, { from: sourceLang, to: targetLang });
translationCache.set(cacheKey, translation);
```

**Why:** [Google recommends caching](https://cloud.google.com/blog/products/ai-machine-learning/four-best-practices-for-translating-your-website) to reduce API costs 50-80% for repetitive content (product names, common descriptions).

### Pattern 3: Graceful Degradation

**What:** Fallback to English if Hebrew missing (or vice versa)

**When:** Rendering product data

**Example:**

```javascript
const name = product[`name_${lang}`] || product.name_en || product.name;
```

**Why:** Handles legacy products, partial migrations, and API failures without breaking UX.

### Pattern 4: Bidirectional Cache Invalidation

**What:** Clear both `/en/` and `/he/` cache keys on product update

**When:** Product save/update operations

**Example:**

```javascript
function invalidateProductCache(productSlug) {
  pageCache.del(`/en/product/${productSlug}:en:USD`);
  pageCache.del(`/he/product/${productSlug}:he:ILS`);
}
```

**Why:** SSR cache keys include language (per `cacheKeys.js`). Single product update affects both language versions.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Deeply Nested Translation Objects

**What:** Using schema like `translations.en.name`, `translations.he.name`

**Why bad:**
- Complex queries: `Product.find({ 'translations.en.name': /search/ })`
- Difficult indexing: Requires compound indexes
- Template complexity: `product.translations[lang].name`
- Breaks existing validation (Mongoose requires nested validators)

**Instead:** Use flat fields (`name_en`, `name_he`)

### Anti-Pattern 2: Real-Time Translation

**What:** Calling translation API on every product view

**Why bad:**
- Slow (200-500ms per API call)
- Expensive (Google charges per character)
- Fails on API downtime

**Instead:** Pre-translate on product save, cache results

### Anti-Pattern 3: Client-Side Translation

**What:** Sending English-only data to browser, translating with JavaScript

**Why bad:**
- SEO disaster (Google sees only English)
- Slow UX (wait for API call)
- Exposes API keys to client

**Instead:** Server-side translation, SSR with correct language

### Anti-Pattern 4: Ignoring Cache Invalidation

**What:** Updating product without clearing cache

**Why bad:**
- Users see stale content for 1 hour (TTL from `cacheMiddleware.js`)
- Both languages affected (bidirectional issue)

**Instead:** Clear both `/en/` and `/he/` cache keys after update

### Anti-Pattern 5: Breaking API Compatibility

**What:** Removing legacy `name`/`description` fields immediately

**Why bad:**
- Frontend Views may still reference old fields
- External integrations break
- No graceful migration period

**Instead:** Keep legacy fields as aliases/getters for 6-12 months

## Scalability Considerations

### At 100 Products

| Concern | Approach |
|---------|----------|
| **Translation costs** | In-memory cache (NodeCache) sufficient. Expect ~$2/month Google Cloud Translation API costs for new products. |
| **Database size** | 4 fields × 100 products = negligible impact. MongoDB handles easily. |
| **Cache memory** | node-cache with 3600s TTL holds ~200KB for 100 products × 2 languages. |

### At 1000 Products

| Concern | Approach |
|---------|----------|
| **Translation costs** | Move cache to Redis for persistence across restarts. Expect ~$15/month API costs (assuming 50% cache hit rate). |
| **Database queries** | Add text index on `name_en` and `name_he` for search: `ProductSchema.index({ name_en: 'text', name_he: 'text' })` |
| **SSR cache** | Current node-cache (3600s TTL) sufficient. Consider Redis if memory pressure. |

### At 10K+ Products

| Concern | Approach |
|---------|----------|
| **Translation costs** | Batch translate new products overnight (off-peak pricing). Use Cloud Translation API glossary for brand terms. |
| **Search performance** | Implement Elasticsearch with language analyzers (Hebrew stemming, English tokenization). |
| **SSR cache** | Migrate to Redis or Memcached with CDN layer (Cloudflare/Fastly) for global distribution. |

## Open Questions & Research Flags

### Question 1: Hebrew Text Direction in JSON-LD

**Issue:** Does Google Search handle RTL text in JSON-LD structured data correctly?

**Research needed:** Test Hebrew product name in `schema.org/Product` structured data, verify rich results display.

**Mitigation:** Monitor Google Search Console for errors after deployment.

### Question 2: Translation Quality for Jewelry Terms

**Issue:** Google Cloud Translation API may mistranslate domain-specific terms (e.g., "hoop earrings" → incorrect Hebrew phrase).

**Research needed:** Test with sample product names, verify quality.

**Mitigation:** Implement glossary feature in Translation API for custom term mappings. Allow admin manual edit after auto-translate.

### Question 3: Slug Uniqueness Across Languages

**Issue:** Current slug generation uses `name` field (line 138-154 in Product.js). With bilingual names, which language generates slug?

**Decision needed:** Keep English-only slugs for consistency (`name_en` → slug), or support language-specific slugs (`/en/product/gold-earrings` vs `/he/product/עגילי-זהב`)?

**Recommendation:** Keep English-only slugs. Language-specific slugs complicate routing, cache invalidation, and hreflang alternates. Current `/en/` and `/he/` URL prefix already differentiates languages.

### Question 4: Category Names Translation

**Issue:** Category display names (line 40 in `category.ejs`: `<%= categoryDisplayName %>`) currently hardcoded in route logic. Need bilingual category names?

**Scope creep risk:** This milestone focuses on product name/description. Category translation is separate work.

**Recommendation:** Keep out of scope. Add to future milestone if needed.

## Sources

### Schema Design
- [MongoDB multilingual schema design patterns](https://aymanelbadawy.com/mongodb-internationalization-i18n/)
- [Multi-lingual Data Modeling with MongoDB](https://bilalalghazi.medium.com/multi-lingual-data-modeling-with-mongodb-4d552bdf3b6c)
- [Schema design in MongoDB: supporting multiple languages](https://groups.google.com/g/mongodb-user/c/q9zrqm5Jge0)

### Translation API
- [Google Cloud Translation API best practices](https://cloud.google.com/blog/products/ai-machine-learning/four-best-practices-for-translating-your-website)
- [Spend less on Google Translate caching strategies](https://evilmartians.com/chronicles/spend-less-on-google-translate)
- [Google Cloud Translation documentation](https://cloud.google.com/translate/docs)

### SEO & Structured Data
- [JSON-LD for SEO structured data guide](https://www.gtechme.com/insights/json-ld-for-seo-structured-data-guide/)
- [Google structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Structured data Google guide 2026](https://www.clickforest.com/en/blog/structured-data-google)

### Localization Patterns
- [Node.js localization with i18n examples](https://lokalise.com/blog/node-js-i18n-express-js-localization/)
- [EJS template multilingual support](https://github.com/khrismuc/express-i18n)
