---
phase: 25-dynamic-ssr-structured-data-sitemap
plan: 01
subsystem: ssr
tags: [ssr, json-ld, schema.org, category-pages, structured-data, seo]

# Dependency graph
requires:
  - phase: 24-static-ssr-meta-deploy
    provides: EJS engine, buildPageData helper, meta-tags partial, header/footer partials
provides:
  - Schema helper functions (Product and BreadcrumbList JSON-LD generation)
  - EJS partials for structured data rendering (product-schema, breadcrumb-schema)
  - Category page SSR with MongoDB-populated product grids
  - Meta config extended with category and cart entries
  - Product price Open Graph tags in meta-tags partial
affects: [25-02-product-detail-pages, 25-03-sitemap, 25-04-client-ssr-awareness]

# Tech tracking
tech-stack:
  added: []
  patterns: [JSON-LD generation with schema helpers, EJS partial includes for structured data, URL-to-DB category mapping]

key-files:
  created:
    - backend/helpers/schemaHelpers.js
    - backend/views/partials/product-schema.ejs
    - backend/views/partials/breadcrumb-schema.ejs
    - backend/routes/ssrDynamic.js
    - backend/views/pages/category.ejs
  modified:
    - backend/views/partials/meta-tags.ejs
    - backend/config/meta.js
    - backend/routes/ssr.js
    - backend/index.js

key-decisions:
  - "Use English product slugs for both language versions (simpler, consistent with Phase 23 decision)"
  - "Map URL slugs with hyphens to camelCase MongoDB category values (crochet-necklaces -> crochetNecklaces)"
  - "Use full schema.org URLs for availability values (https://schema.org/InStock)"
  - "Last breadcrumb item has no 'item' URL property per schema.org conventions"
  - "Limit category pages to 20 products per Phase 24 decision"
  - "data-ssr flag enables client-side detection to prevent re-rendering"

patterns-established:
  - "Schema helpers generate JSON-LD objects, EJS partials render script tags"
  - "Category pages follow exact HTML structure of categoriesView.js for CSS compatibility"
  - "Product schema omits SKU field if empty (conditional inclusion)"

# Metrics
duration: 6 min
completed: 2026-02-11
---

# Phase 25 Plan 01: Category Page SSR with Structured Data Summary

**Category pages render server-side with MongoDB-populated product grids, Product and BreadcrumbList JSON-LD, and reusable schema infrastructure for product detail pages**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-11T17:42:57Z
- **Completed:** 2026-02-11T17:49:24Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Schema helpers generate valid Product and BreadcrumbList JSON-LD with proper schema.org URLs
- All 6 category pages render with SSR product grids (necklaces, crochet-necklaces, hoops, dangle, bracelets, unisex)
- Product schema includes name, image, description, SKU (conditional), price, currency, availability
- BreadcrumbList schema shows Home > Category hierarchy (last item has no URL)
- Category meta config added with SEO-optimized titles and descriptions for all categories
- Product price Open Graph tags added to meta-tags partial for future product detail pages
- data-ssr="true" flag enables client-side SSR detection
- Invalid categories return 404

## Task Commits

Each task was committed atomically:

1. **Task 1: Create schema helpers, EJS partials, and extend meta config** - `b9d64e2` (feat)
2. **Task 2: Create category SSR route, EJS template, and register routes** - `e995eb9` (feat)

## Files Created/Modified

**Created:**
- `backend/helpers/schemaHelpers.js` - generateProductSchema and generateBreadcrumbSchema functions
- `backend/views/partials/product-schema.ejs` - Renders Product JSON-LD array from schemaItems
- `backend/views/partials/breadcrumb-schema.ejs` - Renders BreadcrumbList JSON-LD from breadcrumbSchema
- `backend/routes/ssrDynamic.js` - renderCategoryPage handler with MongoDB query and schema generation
- `backend/views/pages/category.ejs` - Category page template matching categoriesView.js structure

**Modified:**
- `backend/views/partials/meta-tags.ejs` - Added product:price:amount and product:price:currency OG tags
- `backend/config/meta.js` - Added category meta entries and categoryDisplayNames export
- `backend/routes/ssr.js` - Exported buildPageData for reuse in ssrDynamic.js
- `backend/index.js` - Imported renderCategoryPage and registered category routes with regex constraint

## Decisions Made

**URL-to-DB category mapping:** The frontend uses URL slugs with hyphens (crochet-necklaces) but MongoDB stores camelCase values (crochetNecklaces) for some categories. Created URL_TO_DB_CATEGORY mapping to bridge this gap.

**Schema.org availability URLs:** Used full URLs (https://schema.org/InStock) instead of short values per Google's structured data guidelines.

**Conditional SKU inclusion:** Product schema only includes SKU field if the value exists and is non-empty, avoiding empty SKU properties in JSON-LD.

**BreadcrumbList last item:** Current page (category) has no "item" URL property per schema.org conventions for breadcrumbs.

**data-ssr flag:** Added to outer-products-container to signal client-side JS that content is already rendered, preventing re-fetch and flash of content.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Export buildPageData from ssr.js**
- **Found during:** Task 2 (Category route implementation)
- **Issue:** renderCategoryPage called buildPageData but it wasn't exported, causing "buildPageData is not a function" error
- **Fix:** Added buildPageData to module.exports in routes/ssr.js
- **Files modified:** backend/routes/ssr.js
- **Verification:** Server started successfully, category pages rendered
- **Committed in:** e995eb9 (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The export was necessary for ssrDynamic.js to reuse the existing buildPageData helper. No scope creep - this was implicitly required by the plan's instruction to "use buildPageData helper from routes/ssr.js".

## Issues Encountered

None - both tasks executed successfully with one minor export fix.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 02 (Product Detail Pages):**
- Schema helpers are in place and tested
- EJS partials for structured data rendering are working
- Meta-tags partial supports product price OG tags
- buildPageData helper is exported and reusable
- URL slug pattern established (/:lang/:category works, ready for /:lang/product/:slug)

**Blockers:** None

**Considerations:**
- Products must have slug field populated for product detail pages to work (Phase 23 migration should have handled this)
- Product images show as empty in JSON-LD for products without images array populated (legacy mainImage fallback works but some products may need migration)

## Self-Check

Verifying claims in this summary:

**Created files:**
```bash
[ -f "C:/Users/pagis/OneDrive/WebDev/Projects/Online/backend/helpers/schemaHelpers.js" ] && echo "FOUND: schemaHelpers.js" || echo "MISSING: schemaHelpers.js"
[ -f "C:/Users/pagis/OneDrive/WebDev/Projects/Online/backend/views/partials/product-schema.ejs" ] && echo "FOUND: product-schema.ejs" || echo "MISSING: product-schema.ejs"
[ -f "C:/Users/pagis/OneDrive/WebDev/Projects/Online/backend/views/partials/breadcrumb-schema.ejs" ] && echo "FOUND: breadcrumb-schema.ejs" || echo "MISSING: breadcrumb-schema.ejs"
[ -f "C:/Users/pagis/OneDrive/WebDev/Projects/Online/backend/routes/ssrDynamic.js" ] && echo "FOUND: ssrDynamic.js" || echo "MISSING: ssrDynamic.js"
[ -f "C:/Users/pagis/OneDrive/WebDev/Projects/Online/backend/views/pages/category.ejs" ] && echo "FOUND: category.ejs" || echo "MISSING: category.ejs"
```

**Commits:**
```bash
git log --oneline --all | grep -E "(b9d64e2|e995eb9)" && echo "FOUND: Both commits" || echo "MISSING: Commits"
```

Running checks...

**Results:**
- FOUND: schemaHelpers.js
- FOUND: product-schema.ejs
- FOUND: breadcrumb-schema.ejs
- FOUND: ssrDynamic.js
- FOUND: category.ejs
- FOUND: Both commits (b9d64e2, e995eb9)

## Self-Check: PASSED

All claimed files exist and all commits are present in git history.
