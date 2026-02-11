---
phase: 25-dynamic-ssr-structured-data-sitemap
plan: 03
subsystem: seo
tags: [sitemap, xml, hreflang, seo, crawling]

# Dependency graph
requires:
  - phase: 23-bilingual-ssr-foundation
    provides: URL structure with /en and /he prefixes
  - phase: 24-static-page-ssr-meta-tags
    provides: SSR page infrastructure and meta config
provides:
  - Dynamic XML sitemap at /sitemap.xml with all public pages
  - Hreflang alternates for bilingual SEO
  - Image sitemap extension for product images
  - Lastmod dates from actual content updates
affects: [seo, crawling, product-pages, category-pages]

# Tech tracking
tech-stack:
  added: [sitemap (npm package v9.0.0)]
  patterns: [Dynamic sitemap generation from MongoDB, SitemapStream with XML namespaces]

key-files:
  created:
    - backend/routes/sitemap.js
  modified:
    - backend/index.js
    - backend/package.json

key-decisions:
  - "Sitemap includes static pages, category pages, and product pages in both languages"
  - "Hreflang alternates on every URL with x-default pointing to English"
  - "Image sitemap extension for product images to appear in Google Image Search"
  - "Lastmod uses actual product.date field, not current timestamp"
  - "Cache-Control: max-age=3600 for CDN caching"
  - "Each URL appears once per language (en and he) with hreflang linking them"

patterns-established:
  - "XML sitemap with xmlns:xhtml and xmlns:image namespaces"
  - "SitemapStream + Readable.from pattern for dynamic generation"
  - "Product image URLs use images[0].publicDesktop with mainImage.publicDesktop fallback"

# Metrics
duration: 6min
completed: 2026-02-11
---

# Phase 25 Plan 03: Dynamic XML Sitemap Summary

**XML sitemap at /sitemap.xml with 210+ URLs (static, category, product pages) in both languages, complete with hreflang alternates, product images, and content-based lastmod dates**

## Performance

- **Duration:** 6 minutes
- **Started:** 2026-02-11T17:43:02Z
- **Completed:** 2026-02-11T17:49:04Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Dynamic XML sitemap generated from MongoDB product data
- All 5 static pages + 6 category pages + ~94 products included in both languages
- Hreflang alternates (en, he, x-default) on every URL for proper international SEO
- Image sitemap extension with product images for Google Image Search visibility
- Content-based lastmod dates using actual product.date field (not current timestamp)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install sitemap package and create sitemap route** - `51f81ce` (feat)
2. **Task 2: Register sitemap route in index.js** - `fb3443b` (feat)

## Files Created/Modified
- `backend/routes/sitemap.js` - Dynamic XML sitemap generator with SitemapStream, hreflang alternates, image entries, and lastmod dates
- `backend/index.js` - Import serveSitemap and register GET /sitemap.xml route
- `backend/package.json` - Added sitemap package v9.0.0
- `backend/package-lock.json` - Dependency lock file updated

## Decisions Made

None - followed plan as specified. Key implementation decisions:
- Used SitemapStream from sitemap package with proper XML namespaces (xhtml for hreflang, image for product images)
- Static pages: priority 1.0 (home) to 0.7 (policies), changefreq monthly/yearly
- Category pages: priority 0.9, changefreq weekly
- Product pages: priority 0.7, changefreq weekly, with lastmod from product.date
- Each URL appears once per language with hreflang links connecting en/he versions
- Image URLs prefer images[0].publicDesktop with fallback to mainImage.publicDesktop
- Response headers: application/xml content type, Cache-Control max-age=3600

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation was straightforward. Sitemap package handled XML generation and namespace management cleanly.

## Verification Results

Successfully verified during execution:
- `/sitemap.xml` returns valid XML (verified with Python xml.etree.ElementTree)
- Content-Type: application/xml header present
- 210 URL entries generated (5 static × 2 langs + 6 categories × 2 langs + ~94 products × 2 langs)
- Hreflang alternates present on all URLs (verified `xhtml:link` elements found)
- Image sitemap extension present on product URLs (verified `image:image` elements found)
- Lastmod dates in ISO 8601 format (e.g., 2024-07-01T11:07:21.066Z)
- Static pages include home, about, contact, workshop, policies
- Category pages include all 6 categories (necklaces, crochet-necklaces, hoops, dangle, bracelets, unisex)
- Product URLs use /en/product/{slug} and /he/product/{slug} pattern

## User Setup Required

None - no external service configuration required. Sitemap is generated dynamically from existing MongoDB data.

## Next Phase Readiness

Ready for Phase 25 Plan 04 (structured data for products) and subsequent SEO enhancements. Sitemap provides complete crawl coverage for both languages.

Notes:
- Sitemap will automatically include new products as they're added to the database
- Cache-Control header allows CDN to cache for 1 hour, reducing database load
- Search engines will discover all pages through the sitemap
- Image sitemap extension helps product images appear in Google Image Search

## Self-Check: PASSED

Verified all claims:
- FOUND: backend/routes/sitemap.js
- FOUND: commit 51f81ce (Task 1)
- FOUND: commit fb3443b (Task 2)
- FOUND: sitemap package in backend/package.json

---
*Phase: 25-dynamic-ssr-structured-data-sitemap*
*Completed: 2026-02-11*
