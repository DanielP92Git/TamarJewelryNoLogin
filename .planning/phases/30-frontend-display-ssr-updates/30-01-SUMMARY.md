---
phase: 30-frontend-display-ssr-updates
plan: 01
subsystem: ssr-bilingual-display
tags: [ssr, bilingual, seo, json-ld, meta-tags]
dependency_graph:
  requires: [29-02]
  provides: [ssr-bilingual-content, json-ld-inlanguage]
  affects: [product-pages, category-pages, search-indexing]
tech_stack:
  added: []
  patterns: [bilingual-field-selection, fallback-chain]
key_files:
  created: []
  modified:
    - backend/routes/ssrDynamic.js
    - backend/helpers/schemaHelpers.js
    - backend/views/pages/product.ejs
    - backend/views/pages/category.ejs
decisions:
  - Bilingual field selection uses fallback chain: he || en || legacy for Hebrew, en || legacy for English
  - inLanguage property added to Product schema for search engine language signals
  - OG meta tags automatically use localized content via route handler title/description variables
  - data-name-en/data-name-he attributes added to product containers for client-side bilingual cart support
metrics:
  duration: 176
  tasks_completed: 2
  files_modified: 4
  commits: 2
  completed_date: 2026-02-15
---

# Phase 30 Plan 01: SSR Bilingual Display & JSON-LD Summary

**One-liner:** SSR product and category pages now display bilingual names/descriptions with English fallback, including JSON-LD inLanguage property for SEO.

## What Was Done

### Task 1: Add bilingual field selection to SSR route handlers and JSON-LD

**Files:** `backend/routes/ssrDynamic.js`, `backend/helpers/schemaHelpers.js`

**Changes:**
- Added bilingual fields (`name_en`, `name_he`, `description_en`, `description_he`) to product `.select()` queries in both `renderCategoryPage` and `renderProductPage`
- Implemented bilingual field selection with fallback chain in `renderProductPage`:
  - Hebrew: `name_he || name_en || name` (prioritizes Hebrew translation, falls back to English, then legacy field)
  - English: `name_en || name` (prioritizes new English field, falls back to legacy field)
- Updated `generateProductSchema()` to accept optional `productName` and `productDescription` parameters
- Added internal bilingual field selection logic to `generateProductSchema()` for category pages (where products are passed as array)
- Added `inLanguage` property to Product JSON-LD schema (`en` or `he`) for search engine language signals
- Updated breadcrumb generation to use `productName` instead of `product.name`
- Updated page title and meta description to use bilingual variables

**Commit:** cd31660

### Task 2: Update EJS templates to use bilingual content

**Files:** `backend/views/pages/product.ejs`, `backend/views/pages/category.ejs`

**Changes:**

**product.ejs:**
- Replaced all visible `product.name` references with `productName` variable (breadcrumb, h1, alt text)
- Replaced `product.description` with `productDescription` variable in description div
- Added `data-name-en` and `data-name-he` attributes to `.product-detail-container` for client-side JavaScript extraction

**category.ejs:**
- Added bilingual field selection logic inside the `products.forEach` loop:
  ```ejs
  const productName = lang === 'heb'
    ? (product.name_he || product.name_en || product.name)
    : (product.name_en || product.name);
  const productDescription = lang === 'heb'
    ? (product.description_he || product.description_en || product.description)
    : (product.description_en || product.description);
  ```
- Updated item title and alt text to use computed `productName` variable
- Updated description formatting to use computed `productDescription` variable
- Added `data-name-en` and `data-name-he` attributes to `.item-container` for client-side JavaScript extraction

**OG Meta Tags:**
- No changes needed to `meta-tags.ejs` — OG tags automatically use localized content because `ssrDynamic.js` now passes `productName` as `title` and localized `metaDescription` as `description`

**Commit:** f885001

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

All verification checks passed:

1. `grep -c "inLanguage" backend/helpers/schemaHelpers.js` → 1 ✓
2. `grep -c "productName\|productDescription" backend/routes/ssrDynamic.js` → 12 ✓
3. `grep "name_en.*name_he" backend/routes/ssrDynamic.js` → Found bilingual fields in .select() ✓
4. `grep "productName" backend/views/pages/product.ejs` → 6 matches ✓
5. `grep "productName\|productDescription" backend/views/pages/category.ejs` → 6 matches ✓
6. `grep "data-name-en" backend/views/pages/category.ejs backend/views/pages/product.ejs` → Found in both files ✓
7. `node -e "require('./backend/helpers/schemaHelpers.js')"` → No syntax errors ✓
8. Legacy `product.name` only appears in data attributes (structural), not visible text ✓

## Success Criteria Met

- [x] SSR product pages at `/he/product/{slug}` show Hebrew name/description (when available) with English fallback
- [x] SSR category pages at `/he/{category}` show Hebrew names/descriptions for all product cards
- [x] JSON-LD schema includes `inLanguage` property ('en' or 'he')
- [x] JSON-LD uses bilingual product name/description matching page language
- [x] OG meta tags use localized product descriptions (automatic via route handler)
- [x] `data-name-en`/`data-name-he` attributes present on product containers for client-side pickup
- [x] All bilingual field selection uses correct fallback chain: `he || en || legacy` for Hebrew, `en || legacy` for English

## Technical Notes

### Bilingual Fallback Chain

The fallback logic ensures graceful degradation when translations are incomplete:

**Hebrew URLs (`/he/...`):**
1. Try Hebrew translation field (`name_he`, `description_he`)
2. Fall back to English translation field (`name_en`, `description_en`)
3. Fall back to legacy field (`name`, `description`)

**English URLs (`/en/...`):**
1. Try English translation field (`name_en`, `description_en`)
2. Fall back to legacy field (`name`, `description`)

This approach maintains backward compatibility with existing products while supporting the new bilingual schema.

### JSON-LD Language Signal

The `inLanguage` property in Product schema provides search engines with explicit language information:
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "inLanguage": "he",
  "name": "שרשרת בעבודת יד",
  "description": "שרשרת מרהיבה..."
}
```

This helps search engines serve the correct language version in search results.

### Client-Side Data Attributes

The `data-name-en` and `data-name-he` attributes allow client-side JavaScript (cart, wish list, etc.) to extract bilingual product names for display/storage, enabling consistent bilingual support across the entire user experience.

## Impact

**SEO:**
- Search engines now receive language-specific product content via JSON-LD `inLanguage` property
- Hebrew product pages rank for Hebrew search terms with properly translated content
- OG meta tags show localized previews when shared on social media

**User Experience:**
- Hebrew visitors see translated product names and descriptions on SSR pages
- Graceful fallback to English when Hebrew translations are incomplete
- Consistent bilingual display across server-rendered and client-rendered content

**Developer Experience:**
- Bilingual field selection centralized in route handlers and schema helpers
- Template variables (`productName`, `productDescription`) clearly indicate bilingual content
- Data attributes provide clean interface for client-side bilingual features

## Next Steps

Phase 30 Plan 02 will update the frontend SPA to use bilingual product fields when rendering product cards and detail pages client-side, ensuring consistency between SSR and SPA display.

## Self-Check: PASSED

**Created files verified:**
- `.planning/phases/30-frontend-display-ssr-updates/30-01-SUMMARY.md` ✓ (this file)

**Modified files verified:**
```bash
[ -f "C:/Users/pagis/OneDrive/WebDev/Projects/Online/backend/routes/ssrDynamic.js" ] && echo "FOUND: backend/routes/ssrDynamic.js" || echo "MISSING: backend/routes/ssrDynamic.js"
```
FOUND: backend/routes/ssrDynamic.js ✓

```bash
[ -f "C:/Users/pagis/OneDrive/WebDev/Projects/Online/backend/helpers/schemaHelpers.js" ] && echo "FOUND: backend/helpers/schemaHelpers.js" || echo "MISSING: backend/helpers/schemaHelpers.js"
```
FOUND: backend/helpers/schemaHelpers.js ✓

```bash
[ -f "C:/Users/pagis/OneDrive/WebDev/Projects/Online/backend/views/pages/product.ejs" ] && echo "FOUND: backend/views/pages/product.ejs" || echo "MISSING: backend/views/pages/product.ejs"
```
FOUND: backend/views/pages/product.ejs ✓

```bash
[ -f "C:/Users/pagis/OneDrive/WebDev/Projects/Online/backend/views/pages/category.ejs" ] && echo "FOUND: backend/views/pages/category.ejs" || echo "MISSING: backend/views/pages/category.ejs"
```
FOUND: backend/views/pages/category.ejs ✓

**Commits verified:**
```bash
git log --oneline --all | grep -q "cd31660" && echo "FOUND: cd31660" || echo "MISSING: cd31660"
```
FOUND: cd31660 ✓

```bash
git log --oneline --all | grep -q "f885001" && echo "FOUND: f885001" || echo "MISSING: f885001"
```
FOUND: f885001 ✓

All files and commits verified successfully.
