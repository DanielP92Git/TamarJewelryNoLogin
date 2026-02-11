# Phase 25: Dynamic SSR + Structured Data + Sitemap - Research

**Researched:** 2026-02-11
**Domain:** Server-side rendering, structured data (Schema.org), XML sitemaps
**Confidence:** HIGH

## Summary

Phase 25 implements three interconnected SEO enhancements: (1) server-side rendering for category and product pages with MongoDB-populated data, (2) Schema.org structured data (Product and BreadcrumbList JSON-LD) on product-related pages, and (3) a dynamic XML sitemap with hreflang alternates and image extensions. The phase builds on the existing EJS/Express SSR foundation established in Phase 24, extending it to dynamic content while maintaining progressive enhancement principles.

The core technical challenge is coordinating three systems: EJS template rendering with async MongoDB queries, JSON-LD structured data generation with proper escaping and validation, and XML sitemap generation with proper namespace declarations and URL management. The existing codebase already has established patterns (buildPageData helper, EJS partials, Product model with slug generation) that provide a solid foundation.

**Primary recommendation:** Extend the existing routes/ssr.js pattern to category and product pages, generate JSON-LD server-side using template literals or dedicated helper functions, use the npm sitemap package for XML generation, and implement SSR detection via data-ssr attributes to prevent client-side re-rendering.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| EJS | 3.x | Template engine for SSR | Already in use; simple syntax; supports partials and includes; no layout engine needed per phase 24 decisions |
| Express.js | 4.x | Web framework for routes/middleware | Already in use; handles routing, middleware, view rendering |
| Mongoose | 8.x | MongoDB ODM | Already in use; provides Product model with slug field |
| sitemap | 8.x+ | XML sitemap generation | Industry standard for Node.js; supports images, hreflang, lastmod; streaming API for large datasets |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| slugify | 1.x | URL slug generation | Already in Product model pre-save hook; immutable after creation |
| validator | 13.x | Input validation | Optional: validate slug params in routes if additional security needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sitemap npm | Manual XML generation | Manual approach more error-prone; sitemap package handles namespaces, escaping, validation automatically |
| Server-side JSON-LD | Client-side injection | Server-side better for SEO (guaranteed in initial HTML); client-side risks if JS fails |
| EJS partials | Template literals | Partials already established; consistent with Phase 24 patterns |

**Installation:**
```bash
npm install sitemap
```

## Architecture Patterns

### Recommended Project Structure
```
backend/
├── routes/
│   ├── ssr.js              # Static page handlers (existing)
│   ├── ssrDynamic.js       # NEW: Category/product SSR handlers
│   └── sitemap.js          # NEW: XML sitemap route
├── views/
│   ├── pages/
│   │   ├── category.ejs    # NEW: Category page template
│   │   └── product.ejs     # NEW: Product detail page template
│   └── partials/
│       ├── meta-tags.ejs   # Existing (extend for product OG tags)
│       ├── product-schema.ejs  # NEW: Product JSON-LD partial
│       └── breadcrumb-schema.ejs  # NEW: BreadcrumbList JSON-LD partial
├── helpers/
│   └── schemaHelpers.js    # NEW: JSON-LD generation utilities
└── index.js                # Add new routes
```

### Pattern 1: SSR Route with MongoDB Query
**What:** Async route handler fetches products from MongoDB, renders EJS template with data
**When to use:** Category pages, product detail pages
**Example:**
```javascript
// routes/ssrDynamic.js
async function renderCategoryPage(req, res) {
  const { lang, category } = req.params; // e.g., /en/necklaces
  const langKey = lang === 'he' ? 'heb' : 'eng';

  try {
    // Fetch products (limit 20 per phase 24 decision)
    const products = await Product.find({
      category,
      available: true
    })
    .sort({ displayOrder: 1 })
    .limit(20)
    .lean();

    if (products.length === 0) {
      return res.status(404).render('pages/404', buildPageData(req, '404', []));
    }

    const pageData = {
      ...buildPageData(req, 'category', [...pageStyles]),
      category,
      products, // Pass to template
      ssrFlag: true // Enable data-ssr detection
    };

    res.render('pages/category', pageData);
  } catch (err) {
    console.error('Category SSR error:', err);
    res.status(500).render('pages/error', buildPageData(req, 'error', []));
  }
}
```

### Pattern 2: Product Schema JSON-LD Generation
**What:** Server-side generation of Product structured data with proper escaping
**When to use:** Product detail pages, category pages (one Product per item)
**Example:**
```javascript
// helpers/schemaHelpers.js
function generateProductSchema(product, langKey, baseUrl) {
  const name = product.name;
  const imageUrl = product.images?.[0]?.publicDesktop || product.mainImage?.publicDesktop;
  const description = product.description || '';
  const price = langKey === 'heb' ? product.ils_price : product.usd_price;
  const currency = langKey === 'heb' ? 'ILS' : 'USD';
  const availability = product.quantity > 0
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": name,
    "image": imageUrl,
    "description": description,
    "sku": product.sku || undefined,
    "offers": {
      "@type": "Offer",
      "url": `${baseUrl}/${langKey === 'heb' ? 'he' : 'en'}/product/${product.slug}`,
      "priceCurrency": currency,
      "price": price?.toFixed(2),
      "availability": availability
    }
  };
}
```

### Pattern 3: BreadcrumbList Schema
**What:** Navigation hierarchy for category > product pages
**When to use:** Category pages (Home > Category), Product pages (Home > Category > Product)
**Example:**
```javascript
function generateBreadcrumbSchema(items, baseUrl) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url ? `${baseUrl}${item.url}` : undefined
    }))
  };
}

// Usage for product page:
// items = [
//   { name: "Home", url: "/en" },
//   { name: "Necklaces", url: "/en/necklaces" },
//   { name: "Gold Star Necklace", url: null } // Current page has no URL
// ]
```

### Pattern 4: SSR Detection and Hydration Skip
**What:** Client-side JS detects SSR content via data-ssr attribute, skips initial fetch
**When to use:** Category pages, product pages with SSR content
**Example:**
```html
<!-- category.ejs -->
<div id="product-grid" data-ssr="true">
  <% products.forEach(product => { %>
    <div class="product-card" data-product-id="<%= product.id %>">
      <img src="<%= product.images?.[0]?.publicMobile %>" alt="<%= product.name %>">
      <h3><%= product.name %></h3>
      <p><%= lang === 'eng' ? product.usd_price : product.ils_price %> <%= lang === 'eng' ? 'USD' : 'ILS' %></p>
    </div>
  <% }); %>
</div>
```

```javascript
// client-side controller.js
function loadCategoryPage(category) {
  const grid = document.getElementById('product-grid');
  if (grid && grid.dataset.ssr === 'true') {
    console.log('SSR content detected, skipping re-fetch');
    // Attach event listeners to existing DOM
    attachProductCardHandlers(grid);
    return;
  }

  // No SSR content, fetch from API
  fetchCategoryProducts(category);
}
```

### Pattern 5: Dynamic XML Sitemap with sitemap npm
**What:** Express route generates XML sitemap from MongoDB data
**When to use:** /sitemap.xml endpoint
**Example:**
```javascript
// routes/sitemap.js
const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');

async function generateSitemap(req, res) {
  const baseUrl = process.env.BASE_URL || 'https://tamarkfir.online';
  const stream = new SitemapStream({
    hostname: baseUrl,
    xmlns: {
      news: false,
      xhtml: true,
      image: true,
      video: false
    }
  });

  const links = [];

  // Static pages (home, about, contact, workshop, policies)
  const staticPages = ['', '/about', '/contact', '/workshop', '/policies'];
  staticPages.forEach(page => {
    ['en', 'he'].forEach(lang => {
      links.push({
        url: `/${lang}${page}`,
        changefreq: 'monthly',
        priority: page === '' ? 1.0 : 0.8,
        links: [
          { lang: 'en', url: `/en${page}` },
          { lang: 'he', url: `/he${page}` },
          { lang: 'x-default', url: `/en${page}` }
        ]
      });
    });
  });

  // Category pages
  const categories = ['necklaces', 'hoops', 'dangle', 'crochet-necklaces'];
  categories.forEach(cat => {
    ['en', 'he'].forEach(lang => {
      links.push({
        url: `/${lang}/${cat}`,
        changefreq: 'weekly',
        priority: 0.9,
        links: [
          { lang: 'en', url: `/en/${cat}` },
          { lang: 'he', url: `/he/${cat}` },
          { lang: 'x-default', url: `/en/${cat}` }
        ]
      });
    });
  });

  // Product pages (with images and lastmod)
  const products = await Product.find({ available: true })
    .select('slug images mainImage date')
    .lean();

  products.forEach(product => {
    const imageUrl = product.images?.[0]?.publicDesktop || product.mainImage?.publicDesktop;
    ['en', 'he'].forEach(lang => {
      links.push({
        url: `/${lang}/product/${product.slug}`,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: product.date ? new Date(product.date).toISOString() : undefined,
        img: imageUrl ? [{ url: imageUrl, caption: product.name }] : undefined,
        links: [
          { lang: 'en', url: `/en/product/${product.slug}` },
          { lang: 'he', url: `/he/product/${product.slug}` },
          { lang: 'x-default', url: `/en/product/${product.slug}` }
        ]
      });
    });
  });

  const data = await streamToPromise(Readable.from(links).pipe(stream));
  res.header('Content-Type', 'application/xml');
  res.send(data.toString());
}
```

### Pattern 6: Product Open Graph Price Tags (META-06)
**What:** Add product:price:amount and product:price:currency to meta-tags.ejs
**When to use:** Product detail pages only
**Example:**
```html
<!-- partials/meta-tags.ejs -->
<% if (typeof productPrice !== 'undefined' && productPrice !== null) { %>
<meta property="product:price:amount" content="<%= productPrice %>">
<meta property="product:price:currency" content="<%= productCurrency %>">
<% } %>
```

### Anti-Patterns to Avoid
- **Client-side JSON-LD injection:** Always generate structured data server-side in initial HTML
- **Slug mutation:** Never change product slugs after creation (breaks external links, sitemaps)
- **Sitemap generation on every request:** Cache or pre-generate for large product catalogs (not an issue for 20-product limit, but future-proofing)
- **Missing error handling:** Always catch MongoDB query failures and render error pages gracefully
- **Forgetting hreflang reciprocity:** Each language version must link back to all others including itself
- **Hardcoded dates in lastmod:** Use actual product.date from MongoDB, not build time

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XML sitemap generation | Custom XML string concatenation | sitemap npm package | Handles namespaces, escaping, validation, streaming; supports images/hreflang out of box |
| JSON-LD escaping | Manual string replacement for quotes/newlines | JSON.stringify() | Handles all edge cases; prevents injection vulnerabilities |
| Slug validation regex | Custom regex parser | slugify + Mongoose validation | Already in Product model; battle-tested; collision handling built-in |
| URL-safe string conversion | Custom character replacement | slugify package | Handles Unicode, diacritics, edge cases; already in use |
| Date formatting for lastmod | Manual date string construction | Date.toISOString() | W3C Datetime compliant; timezone-aware |

**Key insight:** SEO-critical output (sitemaps, structured data) has strict format requirements and edge cases. Using established libraries reduces validation errors, manual actions, and crawl budget waste.

## Common Pitfalls

### Pitfall 1: Hydration Mismatch / Content Flash
**What goes wrong:** Client-side JS re-fetches and re-renders products already in SSR HTML, causing visible flash/flicker
**Why it happens:** Client-side controller doesn't detect SSR content, assumes SPA cold start
**How to avoid:** Add data-ssr="true" attribute to SSR-rendered containers; check for this flag before fetching
**Warning signs:** Users report "page blinks" on category navigation; duplicate network requests in DevTools

### Pitfall 2: Missing Reciprocal Hreflang Links
**What goes wrong:** Google ignores hreflang annotations because bidirectional linking is incomplete
**Why it happens:** Forgetting that each language version must link to all others including itself
**How to avoid:** Use consistent link generation (array of all versions, loop to generate all alternates); validate with Google Search Console
**Warning signs:** Search Console reports "No return tags" hreflang errors; wrong language versions appear in search results

### Pitfall 3: Incorrect Product Schema Availability Values
**What goes wrong:** Using custom strings like "in stock" instead of schema.org URLs; validation fails
**Why it happens:** Misunderstanding that availability expects ItemAvailability enumeration URLs, not plain text
**How to avoid:** Always use full URLs: https://schema.org/InStock, https://schema.org/OutOfStock, etc.
**Warning signs:** Google Search Console shows "Invalid value for availability"; rich results don't appear

### Pitfall 4: Canonical Tags Pointing to Self with Parameters
**What goes wrong:** Category pages with filters/sorting have canonicals like /en/necklaces?sort=price instead of /en/necklaces
**Why it happens:** Blindly using req.originalUrl for canonical generation
**How to avoid:** Canonicals should always point to clean base URL without query params; use req.path not req.originalUrl
**Warning signs:** Google indexes duplicate pages for same category; crawl budget wasted

### Pitfall 5: Lastmod Dates in Future or Wrong Format
**What goes wrong:** Sitemap rejected or lastmod ignored due to invalid W3C Datetime format
**Why it happens:** Using local date strings (MM/DD/YYYY), Unix timestamps, or future dates from incorrect timezone handling
**How to avoid:** Use Date.toISOString() for W3C compliance; validate dates are in past
**Warning signs:** Search Console reports sitemap format errors; lastmod values appear red in validators

### Pitfall 6: Structured Data Not in Initial HTML
**What goes wrong:** JSON-LD added via client-side JS after page load; not indexed by crawlers
**Why it happens:** Treating structured data like app logic instead of critical SEO content
**How to avoid:** Always render JSON-LD in <head> server-side; verify with "View Source" (not DevTools Inspect)
**Warning signs:** Google Search Console shows no structured data found; Rich Results Test fails

### Pitfall 7: Duplicate Canonical Tags
**What goes wrong:** Multiple <link rel="canonical"> tags in HTML from plugin/partial conflicts; Google ignores all
**Why it happens:** Adding canonical in meta-tags partial AND in page template
**How to avoid:** Single source of truth for canonical (meta-tags.ejs partial only); verify rendered HTML
**Warning signs:** Search Console shows conflicting canonical tags; indexing issues

### Pitfall 8: Sitemap Contains Noindexed or 404 URLs
**What goes wrong:** Sitemap lists products that are unavailable or return errors; wastes crawl budget
**Why it happens:** Not filtering by available: true or not handling soft-deleted products
**How to avoid:** Query MongoDB with available: true filter; exclude products with quantity: 0 if treating as unavailable
**Warning signs:** Search Console reports 404s from sitemap; high error rate in Index Coverage report

## Code Examples

Verified patterns from official sources and documentation:

### EJS Partial Include with Data Passing
```html
<!-- views/pages/product.ejs -->
<%- include('../partials/product-schema', {
  product,
  lang,
  baseUrl,
  urlLang
}) %>
```

### Product Schema Partial
```html
<!-- views/partials/product-schema.ejs -->
<script type="application/ld+json">
<%- JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Product",
  "name": product.name,
  "image": product.images?.[0]?.publicDesktop || product.mainImage?.publicDesktop,
  "description": product.description || '',
  "sku": product.sku,
  "offers": {
    "@type": "Offer",
    "url": `${baseUrl}/${urlLang}/product/${product.slug}`,
    "priceCurrency": lang === 'eng' ? 'USD' : 'ILS',
    "price": (lang === 'eng' ? product.usd_price : product.ils_price)?.toFixed(2),
    "availability": product.quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
  }
}, null, 2) %>
</script>
```

### BreadcrumbList Schema for Product Page
```html
<!-- views/partials/breadcrumb-schema.ejs -->
<script type="application/ld+json">
<%- JSON.stringify({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": lang === 'eng' ? 'Home' : 'בית',
      "item": `${baseUrl}/${urlLang}`
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": categoryDisplayName,
      "item": `${baseUrl}/${urlLang}/${category}`
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": product.name
      // No "item" for current page
    }
  ]
}, null, 2) %>
</script>
```

### Express Route Pattern for Product Detail Page
```javascript
// routes/ssrDynamic.js
const { Product } = require('../models');
const { buildPageData } = require('./ssr');

async function renderProductPage(req, res) {
  const { lang, slug } = req.params; // e.g., /en/product/gold-star-necklace
  const langKey = lang === 'he' ? 'heb' : 'eng';
  const baseUrl = process.env.BASE_URL || 'https://tamarkfir.online';

  try {
    const product = await Product.findOne({ slug, available: true }).lean();

    if (!product) {
      return res.status(404).render('pages/404', buildPageData(req, '404', []));
    }

    // Build page data with product-specific meta tags
    const pageData = {
      ...buildPageData(req, 'product', [
        { href: '/css/standard-reset.css' },
        { href: '/css/desktop-menu.css' },
        { href: '/css/product-mobile.css', media: '(max-width: 799.9px)' },
        { href: '/css/product-desktop.css', media: '(min-width: 800px)' },
        { href: '/css/footer-desktop.css', media: '(min-width: 800px)' },
        { href: '/css/footer-mobile.css', media: '(max-width: 799.9px)' },
        { href: '/css/mobile-menu.css', media: '(max-width: 799.9px)' }
      ]),
      product,
      productPrice: langKey === 'eng' ? product.usd_price : product.ils_price,
      productCurrency: langKey === 'eng' ? 'USD' : 'ILS',
      ogImage: product.images?.[0]?.publicDesktop || product.mainImage?.publicDesktop,
      categoryDisplayName: getCategoryDisplayName(product.category, langKey),
      ssrFlag: true
    };

    // Override canonical to product-specific URL
    pageData.canonical = `${baseUrl}/${lang}/product/${slug}`;
    pageData.alternateUrl = {
      en: `${baseUrl}/en/product/${slug}`,
      he: `${baseUrl}/he/product/${slug}`
    };

    res.render('pages/product', pageData);
  } catch (err) {
    console.error('Product SSR error:', err);
    res.status(500).render('pages/error', buildPageData(req, 'error', []));
  }
}

module.exports = { renderProductPage };
```

### Category Page SSR Route
```javascript
// routes/ssrDynamic.js
async function renderCategoryPage(req, res) {
  const { lang, category } = req.params;
  const langKey = lang === 'he' ? 'heb' : 'eng';
  const baseUrl = process.env.BASE_URL || 'https://tamarkfir.online';

  try {
    // Fetch products (limit 20 per phase 24 decision)
    const products = await Product.find({
      category,
      available: true
    })
    .sort({ displayOrder: 1 })
    .limit(20)
    .select('id name slug images mainImage description quantity ils_price usd_price category')
    .lean();

    if (products.length === 0) {
      return res.status(404).render('pages/404', buildPageData(req, '404', []));
    }

    const pageData = {
      ...buildPageData(req, 'category', [
        { href: '/css/standard-reset.css' },
        { href: '/css/desktop-menu.css' },
        { href: '/css/category-mobile.css', media: '(max-width: 799.9px)' },
        { href: '/css/category-desktop.css', media: '(min-width: 800px)' },
        { href: '/css/footer-desktop.css', media: '(min-width: 800px)' },
        { href: '/css/footer-mobile.css', media: '(max-width: 799.9px)' },
        { href: '/css/mobile-menu.css', media: '(max-width: 799.9px)' }
      ]),
      category,
      categoryDisplayName: getCategoryDisplayName(category, langKey),
      products,
      ssrFlag: true
    };

    pageData.canonical = `${baseUrl}/${lang}/${category}`;
    pageData.alternateUrl = {
      en: `${baseUrl}/en/${category}`,
      he: `${baseUrl}/he/${category}`
    };

    res.render('pages/category', pageData);
  } catch (err) {
    console.error('Category SSR error:', err);
    res.status(500).render('pages/error', buildPageData(req, 'error', []));
  }
}
```

### Sitemap Route with Express
```javascript
// routes/sitemap.js
const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');
const { Product } = require('../models');

async function serveSitemap(req, res) {
  const baseUrl = process.env.BASE_URL || 'https://tamarkfir.online';

  try {
    const stream = new SitemapStream({
      hostname: baseUrl,
      xmlns: {
        news: false,
        xhtml: true,
        image: true,
        video: false
      }
    });

    const links = [];

    // Static pages
    const staticPages = [
      { path: '', priority: 1.0, changefreq: 'monthly' },
      { path: '/about', priority: 0.8, changefreq: 'monthly' },
      { path: '/contact', priority: 0.8, changefreq: 'monthly' },
      { path: '/workshop', priority: 0.8, changefreq: 'monthly' },
      { path: '/policies', priority: 0.7, changefreq: 'yearly' }
    ];

    staticPages.forEach(({ path, priority, changefreq }) => {
      ['en', 'he'].forEach(lang => {
        links.push({
          url: `/${lang}${path}`,
          changefreq,
          priority,
          links: [
            { lang: 'en', url: `/en${path}` },
            { lang: 'he', url: `/he${path}` },
            { lang: 'x-default', url: `/en${path}` }
          ]
        });
      });
    });

    // Category pages
    const categories = ['necklaces', 'hoops', 'dangle', 'crochet-necklaces'];
    categories.forEach(cat => {
      ['en', 'he'].forEach(lang => {
        links.push({
          url: `/${lang}/${cat}`,
          changefreq: 'weekly',
          priority: 0.9,
          links: [
            { lang: 'en', url: `/en/${cat}` },
            { lang: 'he', url: `/he/${cat}` },
            { lang: 'x-default', url: `/en/${cat}` }
          ]
        });
      });
    });

    // Product pages
    const products = await Product.find({ available: true })
      .select('slug name images mainImage date')
      .lean();

    products.forEach(product => {
      const imageUrl = product.images?.[0]?.publicDesktop || product.mainImage?.publicDesktop;
      ['en', 'he'].forEach(lang => {
        links.push({
          url: `/${lang}/product/${product.slug}`,
          changefreq: 'weekly',
          priority: 0.7,
          lastmod: product.date ? new Date(product.date).toISOString() : undefined,
          img: imageUrl ? [{ url: imageUrl, caption: product.name }] : undefined,
          links: [
            { lang: 'en', url: `/en/product/${product.slug}` },
            { lang: 'he', url: `/he/product/${product.slug}` },
            { lang: 'x-default', url: `/en/product/${product.slug}` }
          ]
        });
      });
    });

    const data = await streamToPromise(Readable.from(links).pipe(stream));

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(data.toString());
  } catch (err) {
    console.error('Sitemap generation error:', err);
    res.status(500).send('Error generating sitemap');
  }
}

module.exports = { serveSitemap };
```

### Client-Side SSR Detection Pattern
```javascript
// frontend/js/Views/categoriesView.js (or similar)
class CategoriesView {
  render(category) {
    const grid = document.getElementById('product-grid');

    // Check for SSR content
    if (grid && grid.dataset.ssr === 'true') {
      console.log(`[SSR] Category ${category} already rendered, skipping fetch`);
      this._attachEventListeners(grid);
      return;
    }

    // No SSR content, load from API
    this._fetchAndRender(category);
  }

  _attachEventListeners(grid) {
    const cards = grid.querySelectorAll('.product-card');
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        const productId = card.dataset.productId;
        window.location.href = this._buildProductUrl(productId);
      });
    });
  }

  _fetchAndRender(category) {
    // Existing SPA fetch logic
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side only rendering | SSR + progressive enhancement | 2024-2025 | Better SEO, faster FCP, works without JS |
| Manual XML string concatenation | sitemap npm package | Stable since 2020 | Reduced errors, proper namespace handling |
| Microdata/RDFa | JSON-LD | Google recommendation since 2016 | Easier implementation, separate from HTML |
| Single language sitemap | Hreflang alternates in sitemap | Standard since 2012 | Better international SEO, language targeting |
| Build-time static sitemaps | Dynamic runtime generation | Modern practice | Always current, reflects DB state |

**Deprecated/outdated:**
- express-ejs-layouts: Phase 24 decided against layout engine; use direct partials
- Microdata for structured data: Google recommends JSON-LD for new implementations
- Static sitemap.xml files: Dynamic generation ensures accuracy for e-commerce catalogs

## Open Questions

1. **Category displayOrder sorting vs. other metrics**
   - What we know: Products have displayOrder field (gap-based, category-scoped)
   - What's unclear: Should category pages allow sorting by price/date or stick to displayOrder?
   - Recommendation: Phase 25 uses displayOrder only; sorting features can be Phase 26+

2. **Cart page SSR scope**
   - What we know: SSR-07 mentions "cart page rendered server-side (shell only)"
   - What's unclear: Should cart page have its own EJS template or remain SPA-only?
   - Recommendation: Create minimal cart.ejs shell with header/footer, but cart contents remain client-side (localStorage dependent)

3. **Product schema aggregateRating without reviews**
   - What we know: Google prefers aggregateRating but warns about fake reviews
   - What's unclear: Should we add aggregateRating if products have no reviews yet?
   - Recommendation: Omit aggregateRating until review system implemented; avoid validation warnings

4. **Sitemap caching strategy**
   - What we know: 20-product limit means small catalog, but MongoDB query on every request
   - What's unclear: Should we cache generated sitemap XML in memory or regenerate each time?
   - Recommendation: Start with no cache (catalog is small); add memory cache with TTL if performance issues arise

5. **Product URL slug in both languages**
   - What we know: Phase 24 decided English slugs for SEO reach
   - What's unclear: Should Hebrew version (/he/product/slug) also use English slug or translate?
   - Recommendation: Use same English slug for both languages (simpler, consistent with decision)

## Sources

### Primary (HIGH confidence)
- [Schema.org Product Type](https://schema.org/Product) - Official specification for Product structured data
- [Schema.org BreadcrumbList Type](https://schema.org/BreadcrumbList) - Official specification for BreadcrumbList
- [Sitemaps.org Protocol](https://www.sitemaps.org/protocol.html) - XML sitemap standard specification
- [Google Search Central: Product Structured Data](https://developers.google.com/search/docs/appearance/structured-data/product) - Google's requirements and guidelines
- [Google Search Central: Localized Versions](https://developers.google.com/search/docs/specialty/international/localized-versions) - Hreflang implementation guide
- [Google Search Central: Image Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps) - Image sitemap extension specifications
- [EJS Official Documentation](https://ejs.co/) - EJS template syntax and features
- [Express.js Performance Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html) - Official Express production guidelines

### Secondary (MEDIUM confidence)
- [sitemap npm package](https://www.npmjs.com/package/sitemap) - Node.js sitemap generation library
- [Server Side Rendering using Express.js And EJS - GeeksforGeeks](https://www.geeksforgeeks.org/node-js/server-side-rendering-using-express-js-and-ejs-template-engine/) - SSR implementation patterns
- [How To Use EJS to Template Your Node Application - DigitalOcean](https://www.digitalocean.com/community/tutorials/how-to-use-ejs-to-template-your-node-application) - EJS partial includes and best practices
- [Yoast Hreflang Ultimate Guide](https://yoast.com/hreflang-ultimate-guide/) - Hreflang implementation patterns
- [JSON-LD Best Practices - W3C](https://w3c.github.io/json-ld-bp/) - W3C best practices for JSON-LD
- [Progressive Hydration - Patterns.dev](https://www.patterns.dev/react/progressive-hydration/) - Hydration concepts and detection patterns
- [Yoast: What is a slug and how to optimize it for SEO](https://yoast.com/slug/) - URL slug best practices

### Secondary (WebSearch verified)
- [Build and Submit a Sitemap - Google Search Central](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) - Sitemap building guide
- [10 XML Sitemap Errors and Fixes - SearchX](https://searchxpro.com/xml-sitemap-errors-fixes/) - Common sitemap mistakes
- [Fixing Structured Data Errors in Google Search Console - Salt Agency](https://salt.agency/blog/fixing-common-json-ld-structured-data-issues-in-google-search-console/) - Common JSON-LD errors
- [Canonical Tag: A SEO Guide - PanPan Digital](https://www.panpan.digital/en/content/canonical-tag-comprehensive-guide-to-avoid-duplicate-content) - Canonical tag best practices
- [Express Routing Guide](https://expressjs.com/en/guide/routing.html) - Express dynamic route patterns
- [How dynamic routing works in Express.js - SourceBae](https://sourcebae.com/blog/how-dynamic-routing-works-in-express-js/) - Route parameter validation patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - EJS/Express already in use; sitemap npm is industry standard with 2M+ weekly downloads
- Architecture: HIGH - Patterns extend existing Phase 24 buildPageData approach; verified with official docs
- Pitfalls: HIGH - Common errors documented in Google Search Console guides and SEO audits; verified with multiple sources
- Code examples: HIGH - Based on official documentation (Schema.org, sitemap npm, EJS) and existing codebase patterns

**Research date:** 2026-02-11
**Valid until:** 2026-03-15 (30 days - SSR/SEO practices stable; Schema.org changes infrequent)
