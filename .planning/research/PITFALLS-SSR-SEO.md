# Domain Pitfalls: SSR & SEO Migration

**Domain:** Adding Server-Side Rendering and SEO to an existing vanilla JS multi-page SPA (e-commerce)
**Researched:** 2026-02-10
**Confidence:** HIGH (verified against codebase analysis, Google documentation, and multiple industry sources)

---

## Critical Pitfalls

Mistakes that cause rewrites, traffic loss, or major production incidents.

---

### Pitfall 1: URL Migration Breaks Existing Indexed Pages and Bookmarks

**Severity:** CRITICAL
**Suggested phase:** Phase 1 (URL structure and redirects)

**What goes wrong:**
The current site uses paths like `/html/categories/necklaces.html`, `/html/about.html`, `/html/cart.html`, and `/index.html`. Migrating to clean URLs like `/shop/necklaces`, `/about`, `/cart` without comprehensive 301 redirects causes:
- All existing Google-indexed URLs return 404, causing deindexing within days
- Customer bookmarks break
- External links from social media, blogs, and other sites go dead
- Google Search Console floods with "Page not found" errors
- Link equity accumulated over time is permanently lost

**Why it happens in THIS codebase:**
The codebase has URLs hardcoded in multiple locations: `View.js` `handleMenuLanguage()` (lines ~606-692), `setFooterLng()` (lines ~1005-1097), each HTML file's header/footer, and even the backend (`index.js` lines 1439, 3486-3487 reference `/html/cart.html` and `/index.html` in PayPal/Stripe redirect URLs). A partial migration that updates some but not all references creates a mix of old and new URLs.

**Warning signs:**
- Google Search Console "Page not found" errors spike after deployment
- Analytics show sudden drop in organic traffic
- Customer complaints about broken links
- PayPal/Stripe payment flows fail because return URLs are 404

**Prevention strategy:**
1. Create a comprehensive URL mapping file BEFORE any migration: every old URL -> new URL
2. Implement 301 redirects on the server for ALL old paths, including `/index.html` -> `/`
3. Update backend payment return URLs (PayPal `cancel_url`, Stripe `success_url`/`cancel_url`) simultaneously
4. Use a redirect validation script that crawls all old URLs and verifies they reach the correct new URL
5. Keep old redirects permanently (not just 6 months -- Google recommends at least 1 year)
6. Deploy redirects BEFORE removing old URL patterns, not after

**Detection:**
```bash
# After deployment, verify all old URLs return 301
curl -sI https://yoursite.com/html/categories/necklaces.html | head -5
# Should show: HTTP/1.1 301 Moved Permanently
# Location: https://yoursite.com/shop/necklaces
```

---

### Pitfall 2: Redirect Loops Between Old and New URL Patterns

**Severity:** CRITICAL
**Suggested phase:** Phase 1 (URL structure and redirects)

**What goes wrong:**
When implementing clean URL rewriting alongside 301 redirects from old URLs, conflicting rules create redirect loops:
- `/html/about.html` -> 301 to `/about` -> rewrite internally to `/html/about.html` -> 301 to `/about` -> infinite loop
- The DIGITALOCEAN_SETUP.md already discusses clean URL rewriting (removing `.html` extensions), and adding SSR routing on top creates multiple layers of URL transformation that can conflict

Google follows up to 10 redirect hops before giving up. Redirect loops are immediate 5xx-equivalent failures.

**Why it happens in THIS codebase:**
The project already has an html-rewrite-middleware concept (referenced in `DIGITALOCEAN_SETUP.md`). Adding SSR routes creates a second routing layer. If both try to handle the same URL pattern, they can conflict. Express middleware order is critical and easy to get wrong.

**Warning signs:**
- Browser shows "ERR_TOO_MANY_REDIRECTS"
- Server logs show the same request cycling
- `curl -L --max-redirs 10` fails to resolve

**Prevention strategy:**
1. Define a single source of truth for URL resolution: either the SSR middleware handles it OR the redirect middleware, never both for the same URL
2. Write integration tests that follow redirect chains for every old URL and verify they terminate
3. Use this Express middleware pattern: redirect middleware runs first (converts old -> new), then SSR middleware handles new URLs only
4. Test redirect behavior in staging before production deployment
5. Never redirect from a URL to itself (compare normalized request URL against redirect target)

---

### Pitfall 3: SSR HTML and SPA Client-Side HTML Mismatch (Hydration Failure)

**Severity:** CRITICAL
**Suggested phase:** Phase 2 (SSR implementation)

**What goes wrong:**
The server renders HTML for SEO (with product data, meta tags, and structured content), but when the client-side JavaScript loads, it re-renders the DOM differently. This causes:
- Flash of SSR content, then blank page, then SPA content (triple render)
- Content flickers or jumps, destroying user experience
- Google may see different content than users (cloaking perception)
- Interactive elements break because event listeners are attached to elements that get replaced

**Why it happens in THIS codebase:**
The current architecture has View classes that completely rewrite DOM on initialization. For example, `View.setLanguage()` (line 736) does `menu.innerHTML = this.handleMenuLanguage(lng)` -- it nukes the menu and rebuilds it. `CategoriesView` fetches products client-side and renders them into `.inner-products-container`. If SSR pre-fills these elements, the client-side JS will immediately destroy and rebuild them.

The `controller.js` `init()` function (lines 219-268) checks `document.body.id` and dispatches to controller functions that call `setLanguage()`, which replaces menu, footer, and header content regardless of whether it was already server-rendered correctly.

**Warning signs:**
- Page content "flashes" between server and client versions
- Menu renders, disappears briefly, then re-renders
- Product images load, disappear, then reload
- Category titles change briefly (e.g., "NECKLACES" -> "" -> "NECKLACES")

**Prevention strategy:**
1. SSR should render the SAME initial HTML that the client would render -- not a separate template
2. Client-side JS must detect SSR content and skip re-rendering if content matches (hydration check)
3. Add a `data-ssr="true"` attribute to server-rendered containers. Client JS checks for this before DOM replacement
4. For this codebase specifically: the SSR template must include the exact same menu HTML that `handleMenuLanguage()` generates, with the correct language
5. Consider making `setLanguage()` idempotent: if the menu already has the correct language content, skip the innerHTML replacement

**Implementation sketch:**
```javascript
// In View.js setLanguage(), add hydration awareness
async setLanguage(lng, cartNum) {
  const menu = document.querySelector('.menu');
  const existingLangMenu = menu.querySelector(`.ul-${lng}`);
  // Skip re-render if SSR already set correct language
  if (!existingLangMenu || !menu.hasAttribute('data-ssr')) {
    menu.innerHTML = this.handleMenuLanguage(lng);
  } else {
    menu.removeAttribute('data-ssr');
  }
  // ... rest of method
}
```

---

### Pitfall 4: Duplicate Content -- Same Page Accessible at Multiple URLs

**Severity:** CRITICAL
**Suggested phase:** Phase 1 (URL structure) and Phase 2 (SSR meta tags)

**What goes wrong:**
After migration, the same content is accessible at multiple URLs without proper canonical tags:
- `/html/categories/necklaces.html` (old, still served if redirect not in place)
- `/shop/necklaces` (new clean URL)
- `/shop/necklaces/` (trailing slash variant)
- `/SHOP/Necklaces` (case variant, if not normalized)
- SSR-rendered page vs client-only page serving identical content

Google penalizes duplicate content by splitting ranking signals across URLs, effectively diluting SEO authority.

**Why it happens in THIS codebase:**
Currently each category is a separate HTML file (`necklaces.html`, `hoops.html`, etc.) with its own `<title>` and `<meta description>`. If SSR renders the same content at a new URL without removing or redirecting the old file, both URLs serve identical content. Additionally, the bilingual nature means English and Hebrew versions of the same page could be seen as duplicates without hreflang.

**Warning signs:**
- Google Search Console reports "Duplicate, Google chose different canonical than user"
- Same page appears multiple times in search results with different URLs
- "Duplicate without user-selected canonical" in Index Coverage report

**Prevention strategy:**
1. Every page must have exactly ONE canonical URL, declared via `<link rel="canonical" href="...">`
2. All non-canonical variants must 301 redirect to the canonical URL
3. Enforce trailing slash consistency (pick one and redirect the other)
4. Enforce lowercase URLs (redirect uppercase variants)
5. SSR templates MUST include canonical tags pointing to the clean URL version
6. Old `.html` paths MUST redirect, never serve content directly

---

### Pitfall 5: Language/Locale Caching Serves Wrong Language to Users

**Severity:** CRITICAL
**Suggested phase:** Phase 3 (caching layer)

**What goes wrong:**
When SSR output is cached (either at the Express level, CDN level, or DigitalOcean's infrastructure), a page rendered in Hebrew for an Israeli visitor gets cached and served to an English-speaking visitor, or vice versa. The entire page -- including meta tags, structured data, navigation text, and product names -- appears in the wrong language.

**Why it happens in THIS codebase:**
The app has GeoIP-based locale detection (`backend/config/locale.js`) that determines language from IP/headers. If the SSR response is cached without including the language as a cache key, all subsequent visitors get the first visitor's language. The current locale system uses cookies and CDN headers (`cf-ipcountry`, `x-vercel-ip-country`, etc.) which may not be consistent cache keys.

Additionally, product data includes both `name` (English) and potentially Hebrew names, and the currency display differs (USD vs ILS). A cached page showing ILS prices to a US visitor is a serious UX and conversion issue.

**Warning signs:**
- Customer reports seeing the wrong language
- Hebrew users see English content (or vice versa)
- Prices display in wrong currency
- Google indexes a page in the wrong language for a region

**Prevention strategy:**
1. Use separate URLs for each language version: `/en/shop/necklaces` and `/he/shop/necklaces` -- this is the ONLY reliable approach for SEO
2. Never cache SSR output based solely on URL path -- always include language in the cache key
3. If using CDN caching, set `Vary: Accept-Language` header (though many CDNs ignore `Vary`)
4. Preferred approach: language in URL path prefix eliminates the problem entirely -- each language gets a unique cacheable URL
5. Set `Cache-Control: private` on pages that vary by user preference until language-in-URL is fully implemented

---

## High-Severity Pitfalls

Mistakes that cause significant SEO damage or require substantial rework.

---

### Pitfall 6: Broken Hreflang Implementation Wastes Bilingual SEO Potential

**Severity:** HIGH
**Suggested phase:** Phase 2 (meta tags and hreflang)

**What goes wrong:**
Hreflang tags tell Google "this page has an English version at URL X and a Hebrew version at URL Y." Common implementation errors:
- Missing self-referencing tag (every page must reference itself)
- Non-bidirectional links (English page points to Hebrew, but Hebrew page does not point back to English)
- Wrong language codes: using `heb` instead of ISO 639-1 `he`, or `eng` instead of `en`
- Pointing to redirected or 404 URLs
- Using relative URLs instead of absolute URLs

According to industry data, 31% of international sites have conflicting hreflang directives and 16% are missing self-referencing tags.

**Why it happens in THIS codebase:**
The app uses non-standard language codes internally: `eng` and `heb` (see `locale.js` lines 1-2). Hreflang requires ISO 639-1 codes: `en` and `he`. A developer might accidentally use the app's internal codes in hreflang tags. The mapping exists in `locale.js` `mapIsoToApp()` (line 16) and `setDocumentLanguage()` (line 48), but it is easy to use the wrong one in SSR templates.

**Warning signs:**
- Google Search Console International Targeting report shows hreflang errors
- Hebrew pages ranking for English queries or vice versa
- "Invalid hreflang value" warnings in Search Console

**Prevention strategy:**
1. Create a centralized hreflang generator function that accepts the page path and outputs both tags:
```html
<link rel="alternate" hreflang="en" href="https://tamarkfir.com/en/shop/necklaces" />
<link rel="alternate" hreflang="he" href="https://tamarkfir.com/he/shop/necklaces" />
<link rel="alternate" hreflang="x-default" href="https://tamarkfir.com/en/shop/necklaces" />
```
2. Always include `x-default` for the fallback language
3. Use absolute URLs only
4. Validate with Google's Rich Results Test before deployment
5. Also declare hreflang in the XML sitemap (more maintainable than in-page tags)
6. Write a unit test that verifies hreflang codes are ISO 639-1 (`en`/`he`), not the app's internal codes (`eng`/`heb`)

---

### Pitfall 7: JSON-LD Structured Data Validation Failures

**Severity:** HIGH
**Suggested phase:** Phase 2 (structured data)

**What goes wrong:**
Product structured data (JSON-LD) fails Google's validation, preventing rich results (product cards, prices in search results, star ratings). Common errors:
- Missing required `offers` property on `Product` schema
- Using wrong `@type` values
- Price not matching the actual displayed price (especially with dual-currency)
- Missing `priceCurrency` or using wrong currency code
- `availability` value not from the allowed enum (`InStock`, `OutOfStock`, etc.)
- `image` URL is relative instead of absolute
- Dynamic prices (ILS/USD conversion) not reflected in structured data

**Why it happens in THIS codebase:**
Products have dual pricing (`ils_price` and `usd_price` in the Product schema). The structured data must reflect the price actually displayed to the user, which depends on their language/region. If structured data hardcodes one currency but the page displays another, Google may flag this as a mismatch. Additionally, product images use complex URL schemes (DigitalOcean Spaces CDN with fallbacks), and relative URLs in JSON-LD are not valid.

**Warning signs:**
- Google Search Console shows "Missing field" errors under Enhancements > Products
- Rich Results Test fails for product pages
- Product cards never appear in search results despite correct implementation on other pages
- "Price not found" or "Invalid value for offers" errors

**Prevention strategy:**
1. Use the language/region from the URL to determine which currency to put in structured data
2. For `/en/` pages: use `usd_price` with `"priceCurrency": "USD"`
3. For `/he/` pages: use `ils_price` with `"priceCurrency": "ILS"`
4. Always use absolute image URLs (use the `spacesPublicBaseUrl` or `SPACES_CDN_BASE_URL` from the backend)
5. Validate every product page template with Google's Rich Results Test
6. Build a CI check that renders SSR output and validates JSON-LD against schema.org

**Template pattern:**
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{{product.name}}",
  "image": "{{absolute_image_url}}",
  "description": "{{product.description}}",
  "sku": "{{product.sku}}",
  "offers": {
    "@type": "Offer",
    "price": "{{price_for_locale}}",
    "priceCurrency": "{{currency_code}}",
    "availability": "https://schema.org/{{product.available ? 'InStock' : 'OutOfStock'}}",
    "url": "{{canonical_url}}"
  }
}
```

---

### Pitfall 8: SSR Adds Unacceptable Latency to Page Loads

**Severity:** HIGH
**Suggested phase:** Phase 2 (SSR implementation) and Phase 3 (caching)

**What goes wrong:**
Every SSR page request now requires:
1. Express route matching
2. MongoDB query to fetch products (for category pages) or page data
3. Template rendering with product data
4. Sending full HTML response

Without caching, this adds 100-900ms latency per request compared to serving static HTML files. On DigitalOcean App Platform's basic tier, this can spike CPU usage and cause timeouts under moderate traffic.

**Why it happens in THIS codebase:**
The current site serves pre-built static HTML files (via Parcel build), which is extremely fast. Category pages fetch products client-side via API calls. Moving to SSR means the server must fetch and render products BEFORE sending HTML, fundamentally changing the performance profile. With ~94 products across 4+ categories, even simple queries can take 50-200ms on cold connections.

The monolithic `backend/index.js` (3,662+ lines) already handles API routes, payment processing, image uploads, and file serving. Adding SSR rendering to this same process creates resource contention.

**Warning signs:**
- Time to First Byte (TTFB) increases from <100ms to >500ms
- DigitalOcean App Platform shows high CPU utilization
- Page load times regress compared to static site
- Server responds slowly during traffic spikes

**Prevention strategy:**
1. Implement response caching for SSR pages with a short TTL (e.g., 5-15 minutes)
2. Cache invalidation on product updates (when admin saves product, bust the category cache)
3. Use in-memory caching (Map or node-cache) as first layer, not just CDN
4. Only SSR pages that need SEO (product/category/home pages) -- keep cart, checkout, admin as client-only
5. Pre-render static pages (about, contact, policies, workshop) at build time rather than per-request
6. Monitor TTFB before and after SSR deployment; set a regression threshold (e.g., max 200ms TTFB)
7. Consider SSG (static site generation) with periodic rebuilds rather than per-request SSR for category pages that change infrequently

---

### Pitfall 9: Open Graph Tags Fail on WhatsApp, Facebook, or Twitter

**Severity:** HIGH
**Suggested phase:** Phase 2 (meta tags)

**What goes wrong:**
Product and category page links shared on social media show:
- No image preview (blank card)
- Wrong image (WhatsApp picks a different image than Facebook)
- Cropped or distorted image
- Missing title or description
- Stale cached preview that does not update

**Why it happens in THIS codebase:**
Product images are stored in DigitalOcean Spaces with complex responsive variants (`desktop`, `mobile`, `publicDesktop`, `publicMobile`). Open Graph requires a single, specific image URL. If the OG image URL points to a responsive image that returns different sizes based on client hints, social platforms may reject it. WhatsApp uses the LAST `og:image` tag while Facebook uses the FIRST -- if multiple are present, different platforms show different images.

Image dimensions must be exactly right: 1200x630px for Facebook/WhatsApp at 1.91:1 aspect ratio. Product images are jewelry photos that are likely not this exact ratio, requiring generation of OG-specific crops.

**Warning signs:**
- Shared links on WhatsApp show no image or wrong image
- Facebook Sharing Debugger shows warnings or missing properties
- Twitter Card Validator shows errors
- Different platforms show different preview images

**Prevention strategy:**
1. Generate OG-specific images for each product at 1200x630px (can be done with Sharp during image upload)
2. Use exactly ONE `og:image` tag per page (not multiple)
3. Include all required OG tags: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
4. For product pages, use `og:type="product"`
5. Set image dimensions explicitly: `og:image:width="1200"` and `og:image:height="630"`
6. Use absolute URLs for all OG tag values
7. Test with Facebook Sharing Debugger (https://developers.facebook.com/tools/debug/) before launch
8. For bilingual pages, OG tags must match the page language (Hebrew OG description for Hebrew pages)

---

### Pitfall 10: Existing 419+ Tests Break Due to Routing and DOM Changes

**Severity:** HIGH
**Suggested phase:** Every phase (continuous)

**What goes wrong:**
The existing test suite (23 frontend test files, 26 backend test files) was built around the current MPA architecture. Changes to routing, DOM structure, or the way views initialize can cascade into widespread test failures:
- Frontend `routing.test.js` explicitly tests body.id-based dispatch -- changing routing breaks these tests
- View tests expect specific DOM structures that SSR may alter
- Integration tests like `lifecycle.test.js` and `user-journeys.test.js` verify full page initialization sequences
- Cart tests reference specific URLs (`/html/cart.html`) in assertions
- Backend tests may hardcode URL paths in request mocking

**Why it happens in THIS codebase:**
The test setup (`frontend/tests/setup.js`) mocks `window.location` and clears DOM between tests. Tests like `routing.test.js` create fixtures with `createBaseFixture('home')` and check `document.body.id.includes('home')`. If the routing system changes, every test that creates page fixtures needs updating.

`View.js` tests rely on the exact HTML structure output by `handleMenuLanguage()` and `setFooterLng()`. If SSR adds wrapper elements, data attributes, or changes the HTML structure, these assertions break.

**Warning signs:**
- `npm test` failures spike after SSR-related changes
- Tests pass in isolation but fail when run together (order-dependent failures from SSR state leaking)
- New SSR code has zero test coverage while old tests are broken

**Prevention strategy:**
1. Run the full test suite BEFORE starting any SSR work to establish a green baseline
2. Make SSR changes additive: add new SSR routes/middleware without modifying existing view code initially
3. When modifying shared code (View.js, controller.js), update affected tests in the SAME commit
4. Create a separate test suite for SSR endpoints (server-side rendering tests using supertest)
5. Use a test tagging system: mark tests as `@legacy-routing` so they can be updated systematically
6. Never merge a PR that reduces test count or breaks existing tests
7. Add SSR-specific tests incrementally: test that SSR output contains expected meta tags, structured data, and content

---

## Moderate-Severity Pitfalls

Mistakes that cause delays, suboptimal SEO, or technical debt.

---

### Pitfall 11: XML Sitemap Contains Stale, Duplicate, or Invalid URLs

**Severity:** MODERATE
**Suggested phase:** Phase 2 (sitemap generation)

**What goes wrong:**
The XML sitemap includes URLs that do not exist, omits URLs that do exist, has incorrect lastmod dates, or contains both old and new URL formats:
- Products that are `available: false` still appear in sitemap
- Sitemap includes both `/html/categories/necklaces.html` and `/shop/necklaces`
- lastmod dates are static instead of reflecting actual product updates
- Missing product-level URLs (individual product pages if implemented)
- Language variants not properly represented

**Why it happens in THIS codebase:**
With ~94 products across 4 categories plus static pages in 2 languages, the sitemap needs to be dynamically generated from the database. Static sitemaps go stale immediately when products are added/removed/toggled via the admin dashboard. The `available` field and `displayOrder` on products mean the visible product set changes frequently.

**Prevention strategy:**
1. Generate sitemap dynamically from MongoDB on each request (with short cache TTL)
2. Only include products where `available: true`
3. Use product `date` field for lastmod (or track a separate `updatedAt` field)
4. Include hreflang alternates in the sitemap (more reliable than in-page tags)
5. Validate sitemap with Google's Sitemap Testing Tool
6. Keep sitemap under 50,000 URLs and 50MB (not a risk with ~94 products, but good practice)
7. Submit sitemap to Google Search Console after initial generation

---

### Pitfall 12: RTL/LTR Direction Conflicts in SSR Output

**Severity:** MODERATE
**Suggested phase:** Phase 2 (SSR templates)

**What goes wrong:**
Hebrew pages require `dir="rtl"` on the `<html>` element and potentially on individual elements. If SSR renders the HTML shell with `dir="ltr"` (the default), the page briefly displays in LTR before client-side JavaScript sets it to RTL. This creates:
- Flash of incorrectly-directed content (text and layout jump from LTR to RTL)
- CSS layout issues during the transition
- Structured data and meta tags may appear in wrong direction context

**Why it happens in THIS codebase:**
The current `locale.js` `setDocumentLanguage()` function (line 48-61) sets `document.documentElement.dir = 'rtl'` client-side. The static HTML files all ship with `<html lang="en">` (see `index.html` line 2, `necklaces.html` line 2). For SSR, the server must set the correct `lang` and `dir` attributes in the initial HTML response.

**Warning signs:**
- Hebrew pages flash as LTR before correcting
- CSS flexbox/grid layouts break momentarily
- Google sees LTR content on Hebrew pages in its index

**Prevention strategy:**
1. SSR must set `<html lang="he" dir="rtl">` for Hebrew pages and `<html lang="en" dir="ltr">` for English
2. The language is determined by the URL prefix (`/he/` vs `/en/`), not client-side detection
3. All CSS that depends on direction must work with both the initial SSR state and client state
4. Test SSR output for Hebrew pages specifically to verify `dir="rtl"` is present

---

### Pitfall 13: Robots.txt Blocks SSR Pages or Critical Resources

**Severity:** MODERATE
**Suggested phase:** Phase 1 (infrastructure)

**What goes wrong:**
A misconfigured `robots.txt` can:
- Block Googlebot from crawling SSR-rendered pages entirely
- Block CSS/JS files that Google needs to render the page properly
- Block API endpoints that feed structured data
- Allow crawling of admin/internal pages that should be hidden

**Why it happens in THIS codebase:**
The project currently has no `robots.txt` (no file found in the codebase). When adding one for SEO, common mistakes include overly broad `Disallow` rules that accidentally block the new SSR paths, or forgetting to allow Google to access static assets needed for rendering.

**Prevention strategy:**
1. Create a minimal robots.txt that allows all public pages:
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Sitemap: https://tamarkfir.com/sitemap.xml
```
2. Do NOT block CSS or JavaScript files (Google needs them to understand the page)
3. Use Google Search Console's URL Inspection tool to verify Google can render your pages
4. Block only truly private paths (API endpoints, admin dashboard)
5. Include the sitemap URL in robots.txt

---

### Pitfall 14: DigitalOcean App Platform SSR Configuration Issues

**Severity:** MODERATE
**Suggested phase:** Phase 4 (deployment)

**What goes wrong:**
DigitalOcean App Platform has specific behaviors that can break SSR:
- Static site components strip devDependencies after build -- if SSR rendering depends on any devDependency, it fails in production
- Health check endpoints must respond within timeout or the app is marked unhealthy
- SSR increases memory usage; the basic tier ($5/mo) may not have enough RAM
- The build process may not correctly distinguish between frontend static build and backend SSR server
- Route configuration in the App Platform dashboard may conflict with Express routing

**Why it happens in THIS codebase:**
The current deployment likely has the frontend as a static site component and the backend as a service component. Adding SSR means the backend now serves HTML pages AND API endpoints. The app.yaml or dashboard configuration must be updated to route HTML page requests to the backend service instead of the static site component.

The `package.json` build commands (`parcel build`) produce static files. SSR pages cannot be served from static files -- they need the running Express server. This is a fundamental architectural shift in the deployment topology.

**Warning signs:**
- Deployment succeeds but SSR pages return 404 or show static SPA instead
- Health checks fail causing deployment rollback
- Memory usage spikes causing container restarts
- Build succeeds but runtime errors due to missing dependencies

**Prevention strategy:**
1. Update the DigitalOcean App Platform configuration to route page requests through the backend service
2. Ensure SSR template rendering libraries are in `dependencies`, not `devDependencies`
3. Add a dedicated health check endpoint that also verifies SSR is working (renders a test page)
4. Monitor memory usage after SSR deployment; upgrade container size if needed
5. Test the full deployment in a staging App Platform environment before production
6. Keep static assets (CSS, JS, images) served from the static component or CDN for performance

---

### Pitfall 15: Stale Product Data in Cached SSR Pages

**Severity:** MODERATE
**Suggested phase:** Phase 3 (caching strategy)

**What goes wrong:**
When SSR pages are cached for performance, product changes made through the admin dashboard do not appear on the site until the cache expires:
- Admin marks a product as unavailable, but the cached page still shows it
- Admin updates a price, but cached page shows old price
- Admin adds a new product, but it does not appear on the cached category page
- Exchange rate updates (via `exchangeRateJob.js`) change ILS/USD prices, but cached pages show stale prices

**Why it happens in THIS codebase:**
The exchange rate job runs on a cron schedule (`jobs/exchangeRateJob.js`) and updates product prices. The admin dashboard allows real-time product management. If SSR cache TTL is longer than the interval between price updates or product changes, users see stale data. This is particularly dangerous for an e-commerce site where price accuracy is legally important.

**Prevention strategy:**
1. Implement cache invalidation on product mutations: when admin saves a product, bust the relevant category page cache
2. Use short cache TTLs for category pages (5 minutes max)
3. Use longer cache TTLs for static pages (about, contact, policies -- 1 hour+)
4. After exchange rate updates, invalidate all product-related caches
5. Add a "clear cache" button in the admin dashboard for manual emergency cache clearing
6. Log cache hit/miss ratios to ensure caching is actually helping

---

### Pitfall 16: Canonical URLs Point to Wrong Language Version

**Severity:** MODERATE
**Suggested phase:** Phase 2 (meta tags)

**What goes wrong:**
If a bilingual page at `/en/shop/necklaces` has a canonical tag pointing to `/he/shop/necklaces` (or vice versa), Google treats one language version as the "real" page and ignores the other. This effectively deindexes half your content.

**Why it happens in THIS codebase:**
The locale detection system (`locale.js`, `config/locale.js`) uses IP-based detection and localStorage. If the canonical URL is generated based on detected locale rather than the URL's explicit language prefix, it can point to the wrong language version. The canonical must ALWAYS match the URL being served.

**Prevention strategy:**
1. Canonical URL must always be the same as the page's own URL (self-referencing canonical)
2. Use hreflang tags (not canonical) to signal language alternatives
3. Never use canonical to point from one language to another
4. Generate canonical from the request URL path, not from locale detection
5. Write a validation test: for every SSR-rendered page, verify `<link rel="canonical">` href matches the request URL

---

## Minor Pitfalls

Mistakes that cause annoyance, minor SEO impact, or are easy to fix.

---

### Pitfall 17: Missing or Invalid Meta Descriptions on SSR Pages

**Severity:** MINOR
**Suggested phase:** Phase 2 (meta tags)

**What goes wrong:**
SSR pages ship with generic, duplicate, or missing meta descriptions. Google then generates its own snippet, which may not be optimal. Category pages all say "Discover our collection of handmade jewelry" (the current homepage description from `index.html` line 8) instead of category-specific descriptions.

**Prevention strategy:**
1. Write unique meta descriptions for each page type: home, each category, workshop, about, contact, policies
2. Category page descriptions should include the category name: "Shop handmade necklaces by Tamar Kfir..."
3. Product page descriptions should include product name and price
4. Hebrew pages need Hebrew meta descriptions
5. Keep descriptions between 120-160 characters

---

### Pitfall 18: Sitemap lastmod Set to Build Time Instead of Content Update Time

**Severity:** MINOR
**Suggested phase:** Phase 2 (sitemap)

**What goes wrong:**
All sitemap entries have the same `lastmod` date (the build/deployment time) rather than reflecting when the content actually changed. Google has stated that inaccurate lastmod dates cause them to ignore the field entirely.

**Prevention strategy:**
1. For product/category pages: use the most recent product `date` or `updatedAt` in that category
2. For static pages: use the actual last-modified date of the content
3. Add a Mongoose `updatedAt` timestamp to the Product schema if not already present
4. Only update lastmod when content actually changes, not on every deployment

---

### Pitfall 19: Forgetting to Update the Parcel Build Pipeline for SSR

**Severity:** MINOR
**Suggested phase:** Phase 2 (build system)

**What goes wrong:**
The current Parcel build (`parcel build index.html --dist-dir ./dist`) bundles the frontend as a static SPA. Adding SSR may require:
- SSR templates that are NOT processed by Parcel (they run on the server)
- Shared code between client and server that must be compatible with both
- Build output that includes both static assets AND server-side template files

If Parcel processes SSR templates, it may inline/transform imports that should remain as Node.js `require()` calls, or it may tree-shake code that the server needs.

**Prevention strategy:**
1. Keep SSR templates outside the Parcel build pipeline (in the backend directory)
2. If sharing code between client and server (e.g., product rendering logic), use a separate build step or ensure the shared code is plain JavaScript without browser-specific APIs
3. The Parcel build continues to produce client-side assets; SSR is a separate concern handled by Express

---

## Phase-Specific Warning Summary

| Phase | Likely Pitfall | Severity | Mitigation |
|-------|---------------|----------|------------|
| Phase 1: URL Structure | Pitfall 1 (broken URLs), 2 (redirect loops), 4 (duplicate content), 13 (robots.txt) | CRITICAL | Comprehensive redirect mapping, integration tests for all old URLs |
| Phase 2: SSR + Meta Tags | Pitfall 3 (hydration), 6 (hreflang), 7 (JSON-LD), 9 (OG tags), 12 (RTL), 17 (meta desc) | CRITICAL-HIGH | Server-rendered HTML must match client expectations; validate all structured data |
| Phase 3: Caching | Pitfall 5 (wrong language cached), 8 (latency), 15 (stale data) | CRITICAL-HIGH | Language-in-URL, short TTLs, cache invalidation on mutations |
| Phase 4: Deployment | Pitfall 14 (DO App Platform), 19 (build pipeline) | MODERATE | Staging environment testing, deployment configuration review |
| All Phases | Pitfall 10 (test regressions) | HIGH | Run full test suite before/after every change, additive development |

---

## Sources

**URL Migration & Redirects:**
- [Google: Site Moves with URL Changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes) (HIGH confidence)
- [Search Engine Land: Too Many Redirects](https://searchengineland.com/guide/too-many-redirects) (MEDIUM confidence)
- [Ignite Visibility: Why Changing URLs Can Devastate SEO](https://ignitevisibility.com/why-changing-urls-can-devastate-seo-traffic/) (MEDIUM confidence)

**Hreflang & Multilingual SEO:**
- [Google: Managing Multi-Regional Sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites) (HIGH confidence)
- [Search Engine Land: What is Hreflang](https://searchengineland.com/guide/what-is-hreflang) (MEDIUM confidence)
- [Seobility: Multilingual SEO Issues](https://www.seobility.net/en/blog/multilingual-seo-issues/) (MEDIUM confidence)

**Structured Data:**
- [Google: Product Structured Data](https://developers.google.com/search/docs/appearance/structured-data/product) (HIGH confidence)
- [Salt Agency: Fixing JSON-LD Issues in Search Console](https://salt.agency/blog/fixing-common-json-ld-structured-data-issues-in-google-search-console/) (MEDIUM confidence)
- [Google: Structured Data Policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) (HIGH confidence)

**Canonical & Duplicate Content:**
- [Google: 5 Common Mistakes with rel=canonical](https://developers.google.com/search/blog/2013/04/5-common-mistakes-with-relcanonical) (HIGH confidence)
- [Semrush: Canonical URL Guide](https://www.semrush.com/blog/canonical-url-guide/) (MEDIUM confidence)
- [Google: Canonicalization Troubleshooting](https://developers.google.com/search/docs/crawling-indexing/canonicalization-troubleshooting) (HIGH confidence)

**Open Graph:**
- [OG Image Size Guide 2025](https://www.krumzi.com/blog/open-graph-image-sizes-for-social-media-the-complete-2025-guide/) (MEDIUM confidence)
- [WhatsApp Open Graph Pitfalls](https://medium.com/@eduardojs999/how-to-use-whatsapp-open-graph-preview-with-next-js-avoiding-common-pitfalls-88fea4b7c949) (MEDIUM confidence)

**SSR Performance & Caching:**
- [NodeSource: SSR Load Issues in Node.js](https://nodesource.com/blog/ssr-load-issues-in-n) (MEDIUM confidence)
- [Medium: Edge vs SSR vs SSG Performance Numbers](https://medium.com/better-dev-nextjs-react/edge-vs-ssr-vs-ssg-2025-performance-benchmarks-ttfb-data-meta-description-7b508c572b5f) (LOW confidence)
- [PixelFree: Caching in Server-Side Rendering](https://blog.pixelfreestudio.com/how-to-handle-caching-in-server-side-rendering/) (LOW confidence)

**Sitemaps:**
- [Google: Build and Submit a Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) (HIGH confidence)
- [Yoast: lastmod in XML Sitemaps](https://yoast.com/lastmod-xml-sitemaps-google-bing/) (MEDIUM confidence)
- [SE Ranking: Fixing Sitemap Errors](https://seranking.com/blog/fixing-sitemap-errors/) (MEDIUM confidence)

**DigitalOcean App Platform:**
- [DigitalOcean: Node.js Buildpack Reference](https://docs.digitalocean.com/products/app-platform/reference/buildpacks/nodejs/) (HIGH confidence)
- [DigitalOcean: Express.js Sample App](https://docs.digitalocean.com/products/app-platform/getting-started/sample-apps/express.js/) (HIGH confidence)

**Codebase Analysis:**
- Direct inspection of `controller.js`, `View.js`, `locale.js`, `backend/index.js`, `backend/config/locale.js`, `Product.js` schema, HTML templates, test files, and deployment configuration (HIGH confidence -- primary source)
