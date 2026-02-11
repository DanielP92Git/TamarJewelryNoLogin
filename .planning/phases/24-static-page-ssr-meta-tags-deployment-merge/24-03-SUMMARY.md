---
phase: 24-static-page-ssr-meta-tags-deployment-merge
plan: 03
subsystem: backend-ssr
tags: [ssr, home-page, json-ld, organization-schema, seo, mongodb, products]

# Dependency graph
requires:
  - phase: 24-01
    provides: "Meta configuration and shared partials (header, footer, meta-tags)"
  - phase: 23-03
    provides: "Language middleware with lang/dir variables"
  - phase: 23-01
    provides: "EJS view engine setup"

provides:
  - "SSR home page template with Organization JSON-LD structured data"
  - "Home page route handler with database product fetching"
  - "Fully-rendered home page HTML at /en and /he URLs"

affects:
  - "Phase 25: Category/product SSR (will use similar patterns)"
  - "Phase 26: Deployment merge (home page will be first SSR page in production)"

# Tech tracking
tech-stack:
  added: ["Organization JSON-LD schema", "Product database queries in SSR"]
  patterns: ["Async route handlers with DB queries", "Graceful degradation (page without products on DB error)", "Bilingual template conditionals"]

key-files:
  created:
    - backend/views/pages/home.ejs
    - backend/routes/ssr.js (merged with Plan 24-02 content)
  modified:
    - backend/index.js

key-decisions:
  - "Home page does NOT render actual product grid from database - template only has category grid (matches existing frontend structure)"
  - "Product query limited to 20 items for performance"
  - "Graceful error handling: DB failure renders page without products rather than 500 error"
  - "Currency determination based on language (heb→ILS, eng→USD) - cookie-based in future phases"

patterns-established:
  - "Async SSR route handlers with try/catch for DB operations"
  - "Bilingual template structure with <%= %> conditionals"
  - "JSON-LD structured data in EJS templates using <%- JSON.stringify() %>"

# Metrics
duration: 9 min
completed: 2026-02-11
---

# Phase 24 Plan 03: Home Page SSR with Organization JSON-LD Summary

**SSR home page template with Organization structured data, full SEO meta tags, and bilingual content in both English and Hebrew**

## Performance

- **Duration:** 9 minutes
- **Started:** 2026-02-11T13:58:32Z
- **Completed:** 2026-02-11T14:08:18Z
- **Tasks:** 2/2
- **Files created:** 2 (1 new, 1 merged)
- **Files modified:** 1

## Accomplishments

- Created full home page EJS template matching frontend structure with hero section and category grid
- Added Organization JSON-LD structured data with contactPoint, address, and social media links
- Implemented async home page route handler with Product model database queries
- Wired home page route into Express at `/:lang(en|he)` pattern
- All meta tags present: canonical, OG tags, Twitter Card, hreflang (en, he, x-default)
- Bilingual support with proper RTL for Hebrew

## Task Commits

Each task was committed atomically:

1. **Task 1: Create home page EJS template** - `4529fd3` (feat)
2. **Task 2: Add route handler and wire into Express** - `125a78b` (feat)

## Files Created/Modified

**Created:**
- `backend/views/pages/home.ejs` - Full home page template with Organization JSON-LD, hero section, category grid, bilingual content
- `backend/routes/ssr.js` - SSR route handlers module (merged with Plan 24-02 static page handlers)

**Modified:**
- `backend/index.js` - Added renderHomePage import and route registration at `/:lang(en|he)`

## Decisions Made

1. **Home page shows category grid, not product grid:** Template matches existing frontend structure with static category links. Products are fetched from DB in the route handler (for future use), but current template doesn't render them. This preserves existing UX while preparing infrastructure for Phase 25 product rendering.

2. **Graceful error handling for DB queries:** If Product query fails, page renders without products rather than returning 500 error. Ensures site remains functional even if database is down.

3. **Currency based on language for now:** `lang === 'heb' ? 'ILS' : 'USD'`. Future phases will use cookie-based currency selection independent of language.

4. **Limit products to 20:** `.limit(20)` on Product query for performance. Prevents loading excessive data for home page.

5. **Merged routes/ssr.js with Plan 24-02:** Plan 24-02 created routes/ssr.js with static page handlers. Added home page handler to the same module for consistency.

## Deviations from Plan

None - plan executed exactly as written.

Plan called for home page template with Organization JSON-LD and route handler. Both delivered as specified. Product fetching infrastructure added but not yet used in template (matches existing frontend behavior).

## Verification Results

**All verifications passed:**

1. ✅ `/en` returns 200 with fully-rendered HTML
2. ✅ `/he` returns 200 with Hebrew content and `dir="rtl"`
3. ✅ Organization JSON-LD present with @context, @type, name, url, logo, contactPoint, address, sameAs
4. ✅ Meta tags present: title, description, canonical
5. ✅ OG tags: og:title, og:description, og:image, og:url, og:type, og:locale
6. ✅ Twitter Card tags: twitter:card, twitter:title, twitter:description, twitter:image
7. ✅ Hreflang tags: en, he, x-default (all three links)
8. ✅ Hebrew version has `lang="he"` and `dir="rtl"`
9. ✅ Canonical URLs correct: `https://tamarkfir.online/en` and `https://tamarkfir.online/he`
10. ✅ All 447 tests pass - no regressions

**Manual verification (curl tests):**
```bash
# English home page HTML structure present
curl http://localhost:4000/en | head -40

# Hebrew home page with RTL
curl http://localhost:4000/he | grep '<html'
# Output: <html lang="he" dir="rtl">

# Organization JSON-LD schema present
curl http://localhost:4000/en | grep -E "@context|@type"
# Output shows Organization schema with ContactPoint and PostalAddress

# All SEO tags present
curl http://localhost:4000/en | grep -E "og:|twitter:|hreflang|canonical"
# Output shows all required meta and link tags
```

## Issues Encountered

None. Smooth execution with clean merge of Plan 24-02's routes/ssr.js content.

## User Setup Required

None - no external service configuration required.

## Technical Notes

### Organization JSON-LD Structure

The home page includes complete Organization structured data:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Tamar Kfir Jewelry",
  "url": "https://tamarkfir.online",
  "logo": "https://tamarkfir.online/imgs/icons/favicon.png",
  "description": "Handmade jewelry crafted with love in Jerusalem",
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Service",
    "availableLanguage": ["English", "Hebrew"]
  },
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Jerusalem",
    "addressCountry": "IL"
  },
  "sameAs": [
    "https://www.instagram.com/tamar_kfir_jewelry/",
    "https://www.facebook.com/tamarkfirjewelry"
  ]
}
```

This makes the business eligible for Google Knowledge Graph and rich search results.

### Route Handler Pattern

The `renderHomePage` function demonstrates the SSR pattern for dynamic pages:

1. Extract language from URL params (`en` or `he`)
2. Map to content language key (`eng` or `heb`)
3. Load meta configuration from `meta.js`
4. Query database for dynamic content (products)
5. Build canonical and alternate URLs
6. Pass all data to EJS template

This pattern will be reused for category and product pages in Phase 25.

### Bilingual Template Structure

Templates use EJS conditionals for bilingual content:

```ejs
<% if (lang === 'eng') { %>
  English content
<% } else { %>
  Hebrew content
<% } %>
```

This approach is verbose but explicit, making translations easy to audit and update.

## Next Phase Readiness

**Ready for Phase 24-04 (if it exists) or Phase 25:**

- Home page SSR working with full SEO metadata
- Organization JSON-LD deployed for Knowledge Graph eligibility
- Pattern established for async route handlers with DB queries
- Template structure proven for bilingual content
- All tests passing - no regressions

**Blockers:** None

**Recommendations for Phase 25:**
1. Extend SSR pattern to category pages (fetch products by category)
2. Add Product JSON-LD structured data on product detail pages
3. Consider rendering featured products on home page template (infrastructure already in place)
4. Add BreadcrumbList JSON-LD for category/product navigation

---

## Self-Check: PASSED

**Created files verification:**
- ✓ FOUND: backend/views/pages/home.ejs
- ✓ FOUND: backend/routes/ssr.js

**Commits verification:**
- ✓ FOUND: 4529fd3 (Task 1 - home page template)
- ✓ FOUND: 125a78b (Task 2 - route handler)

All claimed files and commits exist and are accessible.

---

**Summary created:** 2026-02-11
**Plan status:** COMPLETE
**Ready for:** Next plan in Phase 24 or Phase 25 planning
