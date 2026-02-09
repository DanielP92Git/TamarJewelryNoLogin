# Technology Stack: SEO & Server-Side Rendering

**Project:** Tamar Kfir Jewelry - SEO & Marketing Foundation
**Researched:** 2026-02-10
**Overall Confidence:** HIGH

---

## Current Architecture (Relevant Context)

Before recommending additions, it is essential to clarify what the app actually is today:

- **NOT a hash-routing SPA.** The frontend is a **multi-page application (MPA)** with separate static HTML files (`index.html`, `html/categories/necklaces.html`, `html/about.html`, etc.)
- **Parcel bundles shared JS** (`controller.js`) across all pages; page identity is determined by `document.body.id`
- **Backend is API-only.** Express serves JSON endpoints and image files on port 4000. The frontend is served separately (DigitalOcean App Platform static site or Nginx).
- **Product content is fetched client-side** via `POST /productsByCategory` and `GET /getproduct/:id` -- this is invisible to search engine crawlers
- **No individual product pages exist.** Products appear as cards within category listing pages, loaded dynamically via JS fetch calls
- **Categories are static HTML files** with hardcoded names (`necklaces.html`, `hoops.html`, etc.)

**The core SEO problem:** Product names, descriptions, prices, and images exist only in MongoDB. Crawlers see empty `<div class="inner-products-container"></div>` elements because the content requires JavaScript execution.

---

## Recommended Stack

### 1. Template Engine: EJS

| Attribute | Value |
|-----------|-------|
| **Package** | `ejs` |
| **Version** | `4.0.1` (verified 2026-01-14) |
| **Purpose** | Server-side HTML rendering for SEO-critical pages |
| **Confidence** | HIGH (npm registry verified) |

**Why EJS over alternatives:**

| Engine | Syntax | Learning Curve | Fit for This Project |
|--------|--------|---------------|---------------------|
| **EJS** | Plain HTML + `<%= %>` tags | Minimal -- it IS HTML | Best. Existing HTML files can be renamed to `.ejs` with zero rewrite. Insert data tags where needed. |
| Pug | Indentation-based, no HTML | Steep | Poor. Would require rewriting every HTML file into Pug syntax. |
| Handlebars | `{{}}` mustache syntax | Low | Acceptable, but "logic-less" philosophy fights against bilingual conditional rendering. |
| Nunjucks | Jinja2-like `{% %}` | Low | Acceptable but less popular, smaller ecosystem. |

**The decisive factor:** EJS templates ARE valid HTML with embedded JS expressions. This means the existing static `.html` files (like `necklaces.html`) can be converted to `.ejs` templates by:
1. Renaming the file extension
2. Adding `<%= product.name %>` where dynamic content is needed
3. Adding `<%- include('partials/head') %>` for shared elements

No syntax translation required. No new templating language to learn.

**EJS v4.0.1 breaking changes (verified):**
- Main entry point moved from `./lib/ejs.js` to `./lib/cjs/ejs.js`
- Added ESM support via `./lib/esm/ejs.js`
- Proper `exports` field in `package.json` makes this transparent -- **no code changes needed**
- Backward compatible for `require('ejs')` usage

**Integration with Express:**
```javascript
// In backend/index.js (or a new SSR module)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// SSR route for category pages
app.get('/category/:slug', async (req, res) => {
  const products = await Product.find({ category: req.params.slug, available: true })
    .sort({ displayOrder: 1 }).lean();
  res.render('category', { products, category: req.params.slug, lang: 'eng' });
});
```

### 2. Sitemap Generation: `sitemap` Package

| Attribute | Value |
|-----------|-------|
| **Package** | `sitemap` |
| **Version** | `9.0.0` (verified 2025-11-02) |
| **Purpose** | Dynamic XML sitemap generation from MongoDB product data |
| **Confidence** | HIGH (npm registry verified) |

**Why `sitemap` over alternatives:**

| Package | Weekly DL | Last Updated | Recommendation |
|---------|-----------|-------------|----------------|
| **`sitemap`** | ~1.2M | 2025-11-02 | **USE THIS.** Most popular, streaming API, handles large sitemaps, actively maintained. |
| `express-sitemap-xml` | ~6K | 2024-04-19 | Too simple. Wraps xmlbuilder, only provides middleware. For ~94 products we do not need middleware complexity, but the underlying `sitemap` package gives more control. |
| `express-sitemap` | ~2K | Unmaintained | Skip. |
| Hand-rolled XML | N/A | N/A | Avoid. XML escaping, proper formatting, and sitemap index support are already solved. |

**v9.0.0 key changes (verified):**
- Stream-based API for memory efficiency
- Mobile sitemap support dropped (Google deprecated it)
- Enhanced XML entity escaping (security improvement)
- `createSitemapIndex` now returns Promise (was callback)
- Gzips by default (pass `gzip: false` to disable)

**Integration approach:**
```javascript
const { SitemapStream, streamToPromise } = require('sitemap');

app.get('/sitemap.xml', async (req, res) => {
  const products = await Product.find({ available: true }).lean();
  const smStream = new SitemapStream({ hostname: 'https://tamkfir.com' });

  // Static pages
  smStream.write({ url: '/', changefreq: 'weekly', priority: 1.0 });
  smStream.write({ url: '/category/necklaces', changefreq: 'weekly', priority: 0.8 });
  // ... other categories

  // Dynamic product pages (when individual product pages exist)
  products.forEach(p => {
    smStream.write({ url: `/product/${p.id}`, lastmod: p.date, priority: 0.6 });
  });

  smStream.end();
  const xml = await streamToPromise(smStream);
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});
```

**For bilingual sitemaps**, include `<xhtml:link rel="alternate" hreflang="en" />` entries. The `sitemap` package supports this via the `links` option on each URL entry.

### 3. JSON-LD Structured Data: Hand-Rolled (No Library Needed)

| Attribute | Value |
|-----------|-------|
| **Package** | None -- plain JavaScript objects |
| **Purpose** | Product, Organization, BreadcrumbList, and WebSite schema markup |
| **Confidence** | HIGH |

**Why no library:**

- `schema-dts` (v1.1.5) provides TypeScript type definitions only -- zero runtime output. It is a type-checking tool, not a generator. Since this project uses plain JavaScript (not TypeScript), it provides no value.
- JSON-LD is simply a `<script type="application/ld+json">` tag containing a JSON object. No library is needed to generate JSON.
- The schema shapes for e-commerce are well-defined and stable (Product, Offer, Organization).

**Implementation approach -- a utility module:**
```javascript
// backend/utils/jsonld.js
function productJsonLd(product, baseUrl, lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images?.[0]?.publicDesktop || product.publicImage,
    sku: product.sku,
    offers: {
      '@type': 'Offer',
      priceCurrency: lang === 'heb' ? 'ILS' : 'USD',
      price: lang === 'heb' ? product.ils_price : product.usd_price,
      availability: product.quantity > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${baseUrl}/product/${product.id}`,
    },
  };
}
```

Then in the EJS template:
```html
<script type="application/ld+json">
  <%- JSON.stringify(jsonLd) %>
</script>
```

### 4. Meta Tag / Open Graph Management: EJS Partials (No Library)

| Attribute | Value |
|-----------|-------|
| **Package** | None -- EJS partial template |
| **Purpose** | Dynamic `<title>`, `<meta description>`, Open Graph, and Twitter Card tags |
| **Confidence** | HIGH |

**Why no library:**

Meta tag management libraries (like `react-helmet`) exist for client-side SPAs where the `<head>` cannot be controlled server-side. With EJS rendering the full HTML on the server, the `<head>` section is directly authored in the template. A library would add complexity with zero benefit.

**Implementation approach -- an EJS partial:**
```html
<!-- views/partials/meta.ejs -->
<title><%= meta.title %></title>
<meta name="description" content="<%= meta.description %>" />
<meta property="og:title" content="<%= meta.title %>" />
<meta property="og:description" content="<%= meta.description %>" />
<meta property="og:image" content="<%= meta.image %>" />
<meta property="og:url" content="<%= meta.url %>" />
<meta property="og:type" content="<%= meta.type || 'website' %>" />
<meta property="og:locale" content="<%= lang === 'heb' ? 'he_IL' : 'en_US' %>" />
<meta name="twitter:card" content="summary_large_image" />

<!-- hreflang for bilingual support -->
<link rel="alternate" hreflang="en" href="<%= meta.enUrl %>" />
<link rel="alternate" hreflang="he" href="<%= meta.heUrl %>" />
<link rel="alternate" hreflang="x-default" href="<%= meta.enUrl %>" />
```

### 5. Robots.txt: Static File (No Library)

| Attribute | Value |
|-----------|-------|
| **Package** | None |
| **Purpose** | Crawler directives |
| **Confidence** | HIGH |

A `robots.txt` file is a static text file. No library is needed. Serve it from Express or as a static file:

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Sitemap: https://tamkfir.com/sitemap.xml
```

### 6. URL Routing: Express Router (Built-in)

| Attribute | Value |
|-----------|-------|
| **Package** | None -- Express built-in routing |
| **Purpose** | Clean SEO-friendly URL paths replacing `.html` file references |
| **Confidence** | HIGH |

**The routing shift explained:**

Currently, pages are static files served at paths like:
- `/html/categories/necklaces.html`
- `/html/about.html`
- `/html/cart.html`

The SEO milestone introduces Express-rendered routes at clean URLs:
- `/category/necklaces` (SSR with product data)
- `/product/42` (SSR with individual product data -- NEW page type)
- `/about`, `/contact`, `/cart` (SSR with dynamic meta tags)

**This does NOT require a new library.** Express already has `app.get()` routing. The architectural change is:
1. Backend gains an EJS view layer alongside its existing API routes
2. SEO-critical pages are rendered server-side with product data pre-populated
3. Client-side JS enhances the page after load (add-to-cart, language switching, etc.)
4. Old `.html` paths get 301 redirects to clean URLs for link equity preservation

---

## Complete Dependency Summary

### New Backend Dependencies (Production)

| Package | Version | Install Command |
|---------|---------|----------------|
| `ejs` | `^4.0.1` | `npm install ejs` |
| `sitemap` | `^9.0.0` | `npm install sitemap` |

**Total: 2 new production dependencies.**

### New Backend Dependencies (Development)

| Package | Version | Purpose |
|---------|---------|---------|
| None required | -- | EJS and sitemap have no required dev tooling |

### Installation

```bash
cd backend
npm install ejs sitemap
```

---

## Integration Points with Existing Architecture

### How SSR Routes Coexist with API Routes

The Express server currently serves only JSON API endpoints. SSR adds HTML-rendering routes alongside them:

```
CURRENT:
  GET /allproducts          -> JSON
  POST /productsByCategory  -> JSON
  GET /getproduct/:id       -> JSON
  GET /health               -> JSON

ADDED:
  GET /                     -> EJS HTML (home page)
  GET /category/:slug       -> EJS HTML (category page with products)
  GET /product/:id          -> EJS HTML (product detail page)
  GET /about                -> EJS HTML
  GET /contact              -> EJS HTML
  GET /sitemap.xml          -> XML
  GET /robots.txt           -> Text
```

**Route ordering matters.** API routes (prefixed with `/api/` or existing paths like `/allproducts`) must be registered before the SSR catch-all routes to avoid conflicts.

### Deployment Change: Unified Server

Currently the frontend is a separate static site. After this milestone:

**Option A (Recommended): Backend serves everything.**
- Express serves both API endpoints and SSR-rendered pages
- `express.static()` serves CSS, JS bundles, and images from the frontend build
- Single DigitalOcean App Platform service instead of two
- Simpler deployment, single domain, no CORS issues

**Option B: Separate services with SSR proxy.**
- Keep frontend static site for non-product pages
- Backend handles only `/category/*`, `/product/*`, and `/sitemap.xml`
- More complex routing rules, potential cache issues

**Recommendation: Option A.** The backend already serves on DigitalOcean. Adding `express.static('./frontend/dist')` and EJS views consolidates the deployment, eliminates CORS configuration, and ensures all pages have proper SSR.

### EJS Views Directory Structure

```
backend/
  views/
    layouts/
      base.ejs           # Shared HTML shell (head, header, footer)
    partials/
      meta.ejs           # Dynamic meta/OG tags
      header.ejs         # Site header (extracted from current HTML)
      footer.ejs         # Site footer (extracted from current HTML)
      jsonld.ejs         # Structured data injection
    pages/
      home.ejs           # Home page
      category.ejs       # Category listing page
      product.ejs        # Individual product page (NEW)
      about.ejs          # About page
      contact.ejs        # Contact page
      cart.ejs           # Cart page
      policies.ejs       # Policies page
      workshop.ejs       # Workshop page
```

### Client-Side JS Adaptation

The existing `controller.js` and view classes will still work. The key changes:

1. **Page detection** currently uses `document.body.id` -- this remains unchanged
2. **Product rendering** on category pages will have server-rendered HTML as the initial state; JS can enhance it (add-to-cart buttons, language switching) without re-fetching
3. **Cart functionality** remains fully client-side (cart is user-specific, not SEO-relevant)

---

## What NOT to Add (and Why)

### Do NOT Add: Next.js, Nuxt, Astro, or Any Meta-Framework

These frameworks require rewriting the entire frontend in React/Vue/Svelte. The project constraint is to remain vanilla JS. Adding any meta-framework would mean a full rewrite -- months of work for zero incremental value over EJS.

### Do NOT Add: Puppeteer / Prerender.io / Rendertron

Headless browser prerendering is an alternative to true SSR. It works by:
1. Running a headless Chrome instance on the server
2. Loading each page
3. Waiting for JS to execute
4. Saving the resulting HTML

**Why not:** It requires running Chrome on the server (high memory, ~200MB+ per instance), introduces caching complexity, adds latency (2-5 seconds per render), and is fragile. For ~94 products and 6 categories, server-side EJS rendering is faster, simpler, and more reliable.

### Do NOT Add: `schema-dts`

TypeScript-only type definitions for Schema.org. This is a plain JavaScript project. JSON-LD is just a JSON object -- no library needed to construct one.

### Do NOT Add: `react-helmet` or `vue-meta` or Any Client-Side Meta Library

These exist to manipulate `<head>` from client-side components. With server-side EJS rendering, the `<head>` is authored directly in the template. No runtime meta manipulation needed.

### Do NOT Add: `express-sitemap-xml`

This is a thin wrapper around `xmlbuilder` that provides Express middleware for static URL lists. The `sitemap` package (v9) is more capable, supports streaming, handles bilingual `xhtml:link` entries for hreflang, and is vastly more popular.

### Do NOT Add: A Separate URL Router Library

Express has built-in routing. Libraries like `express-history-api-fallback` or `connect-history-api-fallback` are for SPAs that need all routes to serve `index.html`. This project is moving AWAY from that pattern toward proper server-rendered routes.

---

## Version Verification

All versions verified against npm registry on 2026-02-10:

| Package | Recommended | Latest on npm | Last Published | Status |
|---------|-------------|---------------|----------------|--------|
| `ejs` | `^4.0.1` | `4.0.1` | 2026-01-14 | Current, recently released major version |
| `sitemap` | `^9.0.0` | `9.0.0` | 2025-11-02 | Current, recently released major version |
| `express` | `^4.20.0` (existing) | `5.2.1` | Available | Stay on v4.x -- Express 5 is a separate migration. No SSR features require Express 5. |

**Note on Express 5:** Express 5 is now available (v5.2.1) but migrating to it is a separate concern. EJS works identically with Express 4 and 5. The SSR implementation should NOT be coupled with an Express major version upgrade.

---

## SEO Testing Tools (No Installation Required)

These are external validation services, not npm packages:

| Tool | URL | Purpose |
|------|-----|---------|
| Google Rich Results Test | https://search.google.com/test/rich-results | Validate JSON-LD structured data renders rich results |
| Schema Markup Validator | https://validator.schema.org/ | Validate all Schema.org markup (not Google-specific) |
| Google Search Console | https://search.google.com/search-console | Monitor indexing, sitemap submission, crawl errors |
| Lighthouse | Built into Chrome DevTools | SEO audit, performance, accessibility |
| `curl -A Googlebot` | CLI | Quick check that SSR pages return full HTML without JS |

**Recommended dev-time validation:**
```bash
# Verify SSR output contains product data (no JS required)
curl -s http://localhost:4000/category/necklaces | grep -c "product-card"

# Verify JSON-LD is present
curl -s http://localhost:4000/product/1 | grep "application/ld+json"

# Verify sitemap returns XML
curl -s http://localhost:4000/sitemap.xml | head -5
```

---

## Sources

- [EJS Official Site](https://ejs.co/) - HIGH confidence
- [EJS v4 Release Notes (GitHub)](https://github.com/mde/ejs/blob/main/RELEASE_NOTES_v4.md) - HIGH confidence
- [sitemap.js GitHub](https://github.com/ekalinin/sitemap.js/) - HIGH confidence
- [Express Template Engine Guide](https://expressjs.com/en/guide/using-template-engines.html) - HIGH confidence
- [Google Managing Multi-Regional Sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites) - HIGH confidence
- [Google Structured Data Overview](https://developers.google.com/search/docs/appearance/structured-data) - HIGH confidence
- [npm registry](https://www.npmjs.com/) - Version verification, HIGH confidence
- [Template Engine Comparison (npm-compare)](https://npm-compare.com/ejs,handlebars,nunjucks,pug) - MEDIUM confidence
