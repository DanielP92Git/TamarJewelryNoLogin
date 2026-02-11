---
phase: 25-dynamic-ssr-structured-data-sitemap
plan: 02
subsystem: ssr
tags: [ssr, json-ld, schema.org, product-pages, structured-data, seo, og-tags]

# Dependency graph
requires:
  - phase: 25-01
    provides: Schema helpers, EJS partials for structured data, meta-tags with product price support
  - phase: 23-product-slug-migration
    provides: Product slug field (required for product pages to work)
provides:
  - Product detail page SSR with MongoDB product query
  - Product.ejs template with image gallery, price, SKU, availability display
  - Reverse category mapping (DB values to URL slugs) for breadcrumbs
  - 404 and error page templates
  - Product route registered at /:lang/product/:slug
affects: [25-03-sitemap, 25-04-client-ssr-awareness, frontend-product-linking]

# Tech tracking
tech-stack:
  added: []
  patterns: [Dynamic product title/description from MongoDB, Manual pageData construction for product-specific meta, Reverse category mapping for breadcrumb links]

key-files:
  created:
    - backend/views/pages/product.ejs
    - backend/views/pages/404.ejs
    - backend/views/pages/error.ejs
  modified:
    - backend/routes/ssrDynamic.js
    - backend/config/meta.js
    - backend/index.js

key-decisions:
  - "Product pages use product name as title (no 'Product Details' prefix)"
  - "Description truncated to 158 characters for meta tag optimal length"
  - "Manual pageData construction instead of buildPageData for product-specific content"
  - "Created DB_TO_URL_CATEGORY reverse mapping for breadcrumb category links"
  - "Product image gallery shows main image large with thumbnail strip below"
  - "Reuse categories CSS for product pages (no product-specific CSS needed)"
  - "Error and 404 pages use simple inline styles for minimal dependency"

patterns-established:
  - "Product pages follow same EJS structure as category pages"
  - "Breadcrumbs show 3-level hierarchy: Home > Category > Product"
  - "data-ssr='true' flag on main container for client-side detection"
  - "Product data-attributes match category page format for cart functionality"

# Metrics
duration: 9 min
completed: 2026-02-11
---

# Phase 25 Plan 02: Product Detail Pages with Structured Data Summary

**Individual product pages render server-side with product-specific meta tags, Product and BreadcrumbList JSON-LD, image gallery, price display, and SKU - ready for use once product slugs are populated**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-11T20:01:32Z
- **Completed:** 2026-02-11T20:10:45Z
- **Tasks:** 2
- **Files modified:** 3 (core implementation) + 3 (blocking fixes)

## Accomplishments

- Product detail page handler queries MongoDB by slug with availability check
- Product.ejs template with responsive image gallery and thumbnail strip
- Price display with discount support (strikethrough original price)
- SKU display (conditional - only shown if present)
- Availability indicator (In Stock / Out of Stock based on quantity)
- Product-specific meta tags with dynamic title (product name) and description (truncated)
- Product JSON-LD with name, image, description, SKU, price, currency, availability
- BreadcrumbList JSON-LD with 3-level hierarchy (Home > Category > Product Name)
- Product price Open Graph tags for social sharing
- Route registered at /:lang(en|he)/product/:slug supporting both languages
- Invalid product slugs return 404 with localized error page
- Hebrew product pages show ILS prices and RTL layout

## Task Commits

Each task was committed atomically:

1. **Task 1: Add product detail handler and template** - `d289af5` (feat)
2. **Task 2: Register product route in index.js** - `d99cfb8` (feat)
3. **Blocking fix: Add error and 404 pages** - `f12c12a` (fix)

## Files Created/Modified

**Created:**
- `backend/views/pages/product.ejs` - Product detail page template with gallery, price, SKU, availability
- `backend/views/pages/404.ejs` - Not found page template (localized)
- `backend/views/pages/error.ejs` - Server error page template (localized)

**Modified:**
- `backend/routes/ssrDynamic.js` - Added renderProductPage handler and DB_TO_URL_CATEGORY reverse mapping
- `backend/config/meta.js` - Added product, error, and 404 meta config entries
- `backend/index.js` - Imported renderProductPage and registered product route

## Decisions Made

**Manual pageData construction:** Product pages build pageData manually instead of using buildPageData() because they need dynamic title (product name) and description (truncated product description) rather than static meta config values.

**Reverse category mapping:** Created DB_TO_URL_CATEGORY mapping to convert MongoDB category values (crochetNecklaces) to URL slugs (crochet-necklaces) for breadcrumb links back to category pages.

**CSS reuse:** Used categories CSS files for product pages since the layout needs are similar (no product-specific CSS created).

**Error page creation:** Added 404 and error page templates with inline styles to avoid CSS dependencies and ensure they always render.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing error and 404 page templates**
- **Found during:** Task 1 verification (server crashed trying to render 404)
- **Issue:** Code referenced 'pages/404' and 'pages/error' templates that didn't exist, causing "Failed to lookup view" errors
- **Fix:** Created backend/views/pages/404.ejs and backend/views/pages/error.ejs with localized content and inline styles
- **Files created:** backend/views/pages/404.ejs, backend/views/pages/error.ejs
- **Verification:** Server renders 404 page when product slug is invalid
- **Committed in:** f12c12a (separate fix commit)

**2. [Rule 3 - Blocking] Added missing error and 404 meta config entries**
- **Found during:** Task 1 verification (server crashed trying to build page data for error pages)
- **Issue:** buildPageData() called for '404' and 'error' pages but those keys didn't exist in meta.js config, causing "Cannot read properties of undefined" errors
- **Fix:** Added error and 404 entries to meta.js with localized titles and descriptions
- **Files modified:** backend/config/meta.js
- **Verification:** Server successfully renders error pages with proper meta tags
- **Committed in:** f12c12a (same fix commit as templates)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were necessary for error handling to work. The plan referenced error pages but they weren't yet created. No scope creep - error handling is critical functionality.

## Issues Encountered

**Product slugs not yet populated:** Testing revealed that products in the database don't have slug field values yet (showing "undefined" in category page JSON-LD). This is expected per Phase 25-01 Summary which noted: "Products must have slug field populated for product detail pages to work (Phase 23 migration should have handled this)".

**Impact:** Product detail pages work correctly for 404 handling and would work for valid products, but cannot be fully tested with real data until slug migration is completed.

**Workaround for verification:** Verified implementation correctness through:
- Code review of renderProductPage logic
- Testing 404 functionality (invalid slugs return 404 page)
- Testing route registration (both /en and /he routes respond)
- Inspecting generated 404 page HTML for proper structure
- Reviewing schema generation code reused from Plan 01

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 03 (Sitemap):**
- Product page route structure is established
- Product URLs follow /:lang/product/:slug pattern
- Both English and Hebrew routes are working
- Route registration in index.js is complete

**Blockers:**
- Product slugs must be populated in database before product pages can be accessed by users
- Slug migration (Phase 23) needs to be verified/completed

**Considerations:**
- Frontend product links should be updated to use /product/:slug URLs instead of modal overlays (Plan 04)
- Category pages show "undefined" in product URLs - this will resolve when slugs are populated
- Add to Cart button is non-functional for SSR (client-side JS will handle)

## Self-Check

Verifying claims in this summary:

**Created files:**
```bash
[ -f "C:/Users/pagis/OneDrive/WebDev/Projects/Online/backend/views/pages/product.ejs" ] && echo "FOUND: product.ejs" || echo "MISSING: product.ejs"
[ -f "C:/Users/pagis/OneDrive/WebDev/Projects/Online/backend/views/pages/404.ejs" ] && echo "FOUND: 404.ejs" || echo "MISSING: 404.ejs"
[ -f "C:/Users/pagis/OneDrive/WebDev/Projects/Online/backend/views/pages/error.ejs" ] && echo "FOUND: error.ejs" || echo "MISSING: error.ejs"
```

**Commits:**
```bash
git log --oneline --all | grep -E "(d289af5|d99cfb8|f12c12a)" && echo "FOUND: All commits" || echo "MISSING: Commits"
```

Running checks...

**Results:**
- FOUND: product.ejs
- FOUND: 404.ejs
- FOUND: error.ejs
- FOUND: All commits (d289af5, d99cfb8, f12c12a)

## Self-Check: PASSED

All claimed files exist and all commits are present in git history.
