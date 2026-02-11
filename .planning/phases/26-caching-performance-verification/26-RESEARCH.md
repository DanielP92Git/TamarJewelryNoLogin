# Phase 26: Caching, Performance & Verification - Research

**Researched:** 2026-02-11
**Domain:** Server-side caching, performance optimization, structured data validation
**Confidence:** HIGH

## Summary

Phase 26 adds an in-memory caching layer for SSR pages to achieve sub-500ms TTFB for cached responses, implements cache invalidation on content updates, optimizes HTTP cache headers for browser caching, and verifies all structured data and SEO configurations are production-ready. The phase also ensures the complete test suite (866 tests: 447 backend + 419 frontend) continues passing with zero regressions.

Key technical challenges include building language/currency-aware cache keys (4 variants: en+USD, en+ILS, he+USD, he+ILS), implementing granular cache invalidation that triggers on product CRUD operations and exchange rate updates, and setting up Google Search Console verification programmatically. Google Fonts already include `display=swap` in most templates, requiring only minor cleanup.

The codebase already has view caching enabled for EJS templates in production (`app.set('view cache', true)`), which caches compiled template functions. This phase adds response-level caching for the fully-rendered HTML output.

**Primary recommendation:** Use `node-cache` for in-memory page caching with composite cache keys including language and currency, implement event-driven cache invalidation via shared invalidation utility, set `Cache-Control: public, max-age=3600, stale-while-revalidate=86400` for SSR pages, and validate structured data with Google Rich Results Test before verifying Search Console.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node-cache | ^5.1.2 | In-memory key-value cache with TTL | Most actively maintained (3.8M weekly downloads), built-in TTL, automatic cleanup, stats/events, better than memory-cache (unmaintained since 2018) |
| vitest | ^4.0.18 | Test runner for regression detection | Already in project, 866 tests passing, ESM-first, fast |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | Built-in Express/EJS features sufficient | EJS view cache (template compilation) already enabled, HTTP headers via `res.set()` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| node-cache | Redis | Redis better for multi-server deployments, but overkill for single-server DigitalOcean App Platform deployment. Adds infrastructure complexity. |
| node-cache | memory-cache | memory-cache simpler but unmaintained since 2018, lacks size limits (memory leak risk), no stats/events |
| node-cache | lru-cache | lru-cache excellent for LRU eviction but requires manual TTL implementation, node-cache provides both LRU and TTL out-of-box |
| Manual invalidation | Dependency tracking | Complex dependency graphs (product → category page, exchange rate → all pages) manageable with simple event-driven invalidation |

**Installation:**
```bash
cd backend
npm install node-cache
```

## Architecture Patterns

### Recommended Project Structure

```
backend/
├── cache/
│   ├── pageCache.js         # node-cache instance and cache utility functions
│   ├── cacheKeys.js         # Cache key generation logic (language/currency)
│   └── invalidation.js      # Cache invalidation triggers
├── middleware/
│   └── cacheMiddleware.js   # Express middleware for SSR page caching
├── routes/
│   ├── ssr.js               # Static SSR routes with cache middleware
│   └── ssrDynamic.js        # Dynamic SSR routes with cache middleware
```

### Pattern 1: Language/Currency-Aware Cache Keys

**What:** Composite cache keys that include URL path, language, and currency to serve correct content to each visitor segment.

**When to use:** All SSR routes that render prices or language-specific content.

**Example:**
```javascript
// cache/cacheKeys.js
function generateCacheKey(req) {
  const urlLang = req.params.lang || 'en'; // from URL: /en/ or /he/
  // Currency based on language (as per phase 25 decision)
  const currency = urlLang === 'he' ? 'ILS' : 'USD';
  // Include query params if any (none currently, but future-proof)
  const queryString = Object.keys(req.query).length > 0
    ? '?' + new URLSearchParams(req.query).toString()
    : '';

  return `${req.path}:${urlLang}:${currency}${queryString}`;
}

// Example keys:
// "/en/necklaces:en:USD"
// "/he/necklaces:he:ILS"
// "/en/product/silver-moon-necklace:en:USD"
// "/he/product/silver-moon-necklace:he:ILS"
```

### Pattern 2: Cache Middleware with TTFB Optimization

**What:** Express middleware that checks cache before rendering, stores rendered HTML, and sets HTTP cache headers.

**When to use:** Wrap all SSR route handlers.

**Example:**
```javascript
// middleware/cacheMiddleware.js
const { pageCache, generateCacheKey } = require('../cache/pageCache');

function cacheMiddleware(options = {}) {
  const ttl = options.ttl || 3600; // 1 hour default

  return (req, res, next) => {
    // Skip cache for admin routes, POST requests, authenticated requests
    if (req.method !== 'GET' || req.path.startsWith('/admin') || req.headers.authorization) {
      return next();
    }

    const cacheKey = generateCacheKey(req);
    const cached = pageCache.get(cacheKey);

    if (cached) {
      // Cache hit: serve immediately (sub-50ms TTFB typical)
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      return res.send(cached);
    }

    // Cache miss: intercept res.send to cache response
    const originalSend = res.send;
    res.send = function(body) {
      if (res.statusCode === 200 && typeof body === 'string') {
        pageCache.set(cacheKey, body, ttl);
      }
      res.set('X-Cache', 'MISS');
      res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      originalSend.call(this, body);
    };

    next();
  };
}

module.exports = cacheMiddleware;
```

### Pattern 3: Event-Driven Cache Invalidation

**What:** Centralized invalidation utility that invalidates all related cache keys when content changes.

**When to use:** Call from product CRUD endpoints and exchange rate update job.

**Example:**
```javascript
// cache/invalidation.js
const { pageCache } = require('./pageCache');

/**
 * Invalidate all cache entries for a specific category
 * Clears both language versions and category + home pages
 */
function invalidateCategory(categorySlug) {
  const patterns = [
    `/en/${categorySlug}:en:USD`,
    `/he/${categorySlug}:he:ILS`,
    '/en:en:USD',  // Home page shows products
    '/he:he:ILS',  // Home page shows products
  ];

  patterns.forEach(key => pageCache.del(key));

  console.log(`Cache invalidated for category: ${categorySlug}`);
}

/**
 * Invalidate all cache entries for a specific product
 * Clears product detail page, its category page, and home
 */
function invalidateProduct(productSlug, categorySlug) {
  const patterns = [
    `/en/product/${productSlug}:en:USD`,
    `/he/product/${productSlug}:he:ILS`,
  ];

  patterns.forEach(key => pageCache.del(key));

  // Also invalidate the category this product belongs to
  if (categorySlug) {
    invalidateCategory(categorySlug);
  }

  console.log(`Cache invalidated for product: ${productSlug}`);
}

/**
 * Invalidate ALL cached pages
 * Use for exchange rate updates (affects all product prices)
 */
function invalidateAll() {
  pageCache.flushAll();
  console.log('All page cache invalidated');
}

module.exports = {
  invalidateCategory,
  invalidateProduct,
  invalidateAll,
};
```

### Pattern 4: Integration with Product CRUD Endpoints

**What:** Call invalidation functions from existing product management endpoints.

**When to use:** After successful product create/update/delete operations.

**Example:**
```javascript
// In backend/index.js product endpoints

const { invalidateProduct, invalidateAll } = require('./cache/invalidation');

// Add Product endpoint
app.post('/addproduct', authUser, requireAdmin, upload, async (req, res) => {
  // ... existing product creation logic ...

  // After successful save:
  const dbCategorySlug = categoryUrlMap[product.category]; // e.g., 'necklaces'
  invalidateProduct(product.slug, dbCategorySlug);

  res.status(200).json({ message: 'Product added successfully', product });
});

// Edit Product endpoint
app.put('/products/:id', authUser, requireAdmin, upload, async (req, res) => {
  // ... existing product update logic ...

  // After successful save:
  const dbCategorySlug = categoryUrlMap[product.category];
  invalidateProduct(product.slug, dbCategorySlug);

  res.status(200).json({ message: 'Product updated successfully', product });
});

// Delete Product endpoint
app.delete('/products/:id', authUser, requireAdmin, async (req, res) => {
  const product = await Product.findById(req.params.id);
  const slug = product.slug;
  const dbCategorySlug = categoryUrlMap[product.category];

  // ... existing deletion logic ...

  invalidateProduct(slug, dbCategorySlug);

  res.status(200).json({ message: 'Product deleted successfully' });
});
```

### Pattern 5: Integration with Exchange Rate Job

**What:** Invalidate all pages after exchange rate updates since prices change globally.

**When to use:** In the exchange rate update job after successful price recalculation.

**Example:**
```javascript
// In backend/jobs/exchangeRateJob.js

const { invalidateAll } = require('../cache/invalidation');

async function updateExchangeRateAndPrices() {
  try {
    // ... existing rate fetch and product price update logic ...

    // After all products updated:
    if (updatedCount > 0) {
      // Invalidate all page cache since prices changed globally
      invalidateAll();

      if (!isProd) {
        console.log('✓ Page cache invalidated due to price updates');
      }
    }

    // ... rest of function ...
  } catch (error) {
    console.error('Fatal error in exchange rate update job:', error);
  }
}
```

### Pattern 6: HTTP Cache Headers with stale-while-revalidate

**What:** Set Cache-Control headers that allow browsers to cache pages and serve stale content while revalidating in background.

**When to use:** All SSR pages.

**Example:**
```javascript
// Applied in cache middleware (Pattern 2) or directly in routes
res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');

// Breakdown:
// - public: can be cached by CDN/proxies (not private to user)
// - max-age=3600: fresh for 1 hour
// - stale-while-revalidate=86400: serve stale for 24 hours while fetching fresh
```

Benefits:
- Browsers serve cached content instantly (0ms perceived TTFB)
- Background revalidation ensures freshness without blocking user
- Supported in Chrome 75+, Firefox 68+

### Anti-Patterns to Avoid

- **Anti-pattern: Caching authenticated content** — Never cache responses for logged-in users or admin routes. Always check `req.headers.authorization` or admin middleware before caching.

- **Anti-pattern: Missing cache invalidation** — Forgetting to invalidate cache after content updates leads to stale data. Always invalidate in CRUD endpoints.

- **Anti-pattern: Too-fine-grained TTL** — Setting TTL too low (< 5 minutes) defeats caching benefits. SSR content can be cached for 1 hour; invalidation handles updates.

- **Anti-pattern: Not handling cache miss performance** — If uncached TTFB exceeds 2 seconds, optimize database queries (add indexes, use lean(), limit fields). Cache hides DB performance issues temporarily.

- **Anti-pattern: Ignoring memory limits** — node-cache unbounded can consume all RAM. Set `maxKeys` limit (e.g., 500 pages = ~50MB assuming 100KB per page).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| In-memory caching | Custom Map with setTimeout cleanup | node-cache | Handles TTL expiration, stats, events, memory management. Custom solution misses edge cases (what if server restarts mid-cleanup?). |
| Cache key generation | String concatenation with separators | Standardized function with validation | Prevents collisions (what if product slug contains `:` or `?`), ensures consistency, easier to debug. |
| HTTP cache header logic | Manual Cache-Control string building | Well-documented patterns (stale-while-revalidate) | Browser caching has subtle rules (Vary, ETags, revalidation). Standard patterns proven to work. |
| Structured data validation | Regex or custom JSON parsing | Google Rich Results Test | Google's own validator, official source of truth, tests actual rendering eligibility not just schema validity. |
| Google Search Console verification | Manual file upload | Google Search Console API or meta tag verification | Automated verification can be part of deployment, no manual steps, survives redeployments. |

**Key insight:** Caching seems simple ("just store it in a Map!") but production-grade caching requires TTL management, memory limits, eviction policies, stats for debugging, and integration with the application lifecycle. node-cache provides all this out-of-the-box and is battle-tested across thousands of production deployments.

## Common Pitfalls

### Pitfall 1: Cache Invalidation is Too Broad or Too Narrow

**What goes wrong:** Either invalidating too much (flush entire cache on single product update → cache hit rate drops), or too little (update product but forget to invalidate category page → users see stale data).

**Why it happens:** Unclear mental model of content relationships. A product update affects: its detail page, its category page, and the home page (if it's featured).

**How to avoid:** Map out the dependency graph explicitly:
- Product update → invalidate: product detail page (both languages), category page (both languages), home page (both languages)
- Category metadata update (if added later) → invalidate: category page only
- Exchange rate update → invalidate: ALL pages (prices change globally)

**Warning signs:** Users report seeing old prices after admin updates, or cache hit rate drops to 20% (should be 80%+ in production).

### Pitfall 2: Caching Breaks During Deployment

**What goes wrong:** Deploy new code, cache is warm with old HTML structure, new CSS/JS don't match cached HTML → visual breakage.

**Why it happens:** Cache persists across deployments (in-memory cache lost on restart, but if using Redis it persists).

**How to avoid:**
1. With in-memory cache (node-cache): Cache is automatically cleared on deployment restart. No action needed.
2. If moving to Redis later: Implement cache versioning in keys (`v1:page:/en/necklaces`) and flush all keys on deployment, or use deployment ID in keys.

**Warning signs:** After deployment, first visitor sees correct page, subsequent visitors see broken styling.

### Pitfall 3: Not Monitoring Cache Performance

**What goes wrong:** Cache is configured but no visibility into hit rate, TTFB, or memory usage. Don't know if caching is working.

**Why it happens:** "Set and forget" mentality with caching. No instrumentation added.

**How to avoid:**
1. Add `X-Cache: HIT/MISS` header to responses (Pattern 2 includes this)
2. Log cache stats periodically: `pageCache.getStats()` → `{ keys: 42, hits: 1024, misses: 103, ksize: 42000 }`
3. Monitor TTFB in production: cached should be <100ms, uncached <2s
4. Set up alerts if cache hit rate drops below 70%

**Warning signs:** Can't answer "Is caching working?" without code changes.

### Pitfall 4: Structured Data Validation Only in Dev

**What goes wrong:** Structured data validates in dev with dummy products, but production data has edge cases (missing SKU, null price) → Google Rich Results Test fails in production.

**Why it happens:** Dev data is clean, production data is messy. Didn't test with real production dataset.

**How to avoid:**
1. Test Rich Results Test against staging URL with production database snapshot
2. Add validation in backend: require `ils_price` and `usd_price` to be numbers > 0 before product save
3. Add Mongoose pre-save hook to validate required fields for structured data
4. Run Rich Results Test on 10-20 random production product URLs before marking phase complete

**Warning signs:** Rich Results Test passes for one product but fails for others, or shows warnings about missing fields.

### Pitfall 5: Google Fonts Blocking Render

**What goes wrong:** Google Fonts loaded without `display=swap` → 3-second blank text flash on slow connections.

**Why it happens:** Default font loading behavior is block → swap → fallback (FOIT: Flash Of Invisible Text).

**How to avoid:** Already mostly done! Current templates include `display=swap`:
```html
<link href="https://fonts.googleapis.com/css2?family=Raleway&display=swap" rel="stylesheet">
```

Just verify ALL font links include this parameter. One location needs fix:
- `frontend/css/desktop-menu.css` line 1 has `@import url(...)` without `display=swap`

Change to:
```css
/* Don't use @import, move to HTML <link> tag with display=swap */
```

**Warning signs:** Lighthouse report shows "Ensure text remains visible during webfont load" warning.

### Pitfall 6: Test Suite Regression from Cache Side Effects

**What goes wrong:** Tests pass before caching, fail after. Cache middleware affects test behavior (cached responses, invalid invalidation).

**Why it happens:** Tests don't clear cache between runs, or cache middleware runs during tests with test database.

**How to avoid:**
1. Skip cache middleware in test environment: `if (process.env.NODE_ENV !== 'test') { app.use(cacheMiddleware()); }`
2. Or: Clear cache in test setup: `beforeEach(() => pageCache.flushAll())`
3. Test cache behavior explicitly in dedicated cache integration tests
4. Run full test suite before and after cache implementation: `npm test` should show same pass count

**Warning signs:** Tests intermittently fail, pass when run individually but fail in suite, or flakiness appears after cache added.

## Code Examples

Verified patterns from research and Express.js best practices:

### Setting up node-cache

```javascript
// cache/pageCache.js
const NodeCache = require('node-cache');

// Create cache instance
// stdTTL: default TTL in seconds (1 hour)
// checkperiod: interval to check for expired keys (10 minutes)
// maxKeys: maximum number of keys (prevents memory bloat)
const pageCache = new NodeCache({
  stdTTL: 3600,           // 1 hour default
  checkperiod: 600,       // cleanup every 10 minutes
  useClones: false,       // faster, but don't modify returned values
  maxKeys: 500,           // limit to ~500 pages (~50MB if 100KB per page)
});

// Log cache stats every hour (optional, for monitoring)
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    const stats = pageCache.getStats();
    console.log('Page cache stats:', {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hits / (stats.hits + stats.misses) * 100 + '%',
    });
  }, 3600000); // 1 hour
}

module.exports = { pageCache };
```

### Cache Key Generation with Safety

```javascript
// cache/cacheKeys.js

/**
 * Generate cache key with URL, language, and currency
 * Format: "path:lang:currency"
 */
function generateCacheKey(req) {
  const urlLang = req.params.lang || 'en';
  const currency = urlLang === 'he' ? 'ILS' : 'USD';

  // Normalize path (remove trailing slashes, lowercase)
  const normalizedPath = req.path.toLowerCase().replace(/\/+$/, '');

  // Include query params if present (sorted for consistency)
  let queryString = '';
  if (Object.keys(req.query).length > 0) {
    const sortedQuery = Object.keys(req.query)
      .sort()
      .map(k => `${k}=${req.query[k]}`)
      .join('&');
    queryString = '?' + sortedQuery;
  }

  return `${normalizedPath}:${urlLang}:${currency}${queryString}`;
}

module.exports = { generateCacheKey };
```

### Applying Cache Middleware to Routes

```javascript
// In backend/index.js

const cacheMiddleware = require('./middleware/cacheMiddleware');
const { renderHomePage, renderAboutPage, renderContactPage, renderWorkshopPage, renderPoliciesPage } = require('./routes/ssr');
const { renderCategoryPage, renderProductPage, renderCartPage } = require('./routes/ssrDynamic');

// Skip cache in test environment
const useCache = process.env.NODE_ENV !== 'test';

// Static pages (1 hour TTL)
app.get('/:lang(en|he)', useCache ? cacheMiddleware({ ttl: 3600 }) : (req, res, next) => next(), renderHomePage);
app.get('/:lang(en|he)/about', useCache ? cacheMiddleware({ ttl: 3600 }) : (req, res, next) => next(), renderAboutPage);
app.get('/:lang(en|he)/contact', useCache ? cacheMiddleware({ ttl: 3600 }) : (req, res, next) => next(), renderContactPage);
app.get('/:lang(en|he)/workshop', useCache ? cacheMiddleware({ ttl: 3600 }) : (req, res, next) => next(), renderWorkshopPage);
app.get('/:lang(en|he)/policies', useCache ? cacheMiddleware({ ttl: 3600 }) : (req, res, next) => next(), renderPoliciesPage);

// Category pages (1 hour TTL, invalidated on product changes)
app.get('/:lang(en|he)/:category(necklaces|crochet-necklaces|hoops|dangle|bracelets|unisex)', useCache ? cacheMiddleware({ ttl: 3600 }) : (req, res, next) => next(), renderCategoryPage);

// Product detail pages (1 hour TTL, invalidated on product changes)
app.get('/:lang(en|he)/product/:slug', useCache ? cacheMiddleware({ ttl: 3600 }) : (req, res, next) => next(), renderProductPage);

// Cart page (shell only, no user-specific data)
app.get('/:lang(en|he)/cart', useCache ? cacheMiddleware({ ttl: 3600 }) : (req, res, next) => next(), renderCartPage);
```

### Testing Cache Behavior

```javascript
// backend/tests/unit/cache/pageCache.test.js

const { describe, it, expect, beforeEach } = require('vitest');
const { pageCache } = require('../../../cache/pageCache');
const { generateCacheKey } = require('../../../cache/cacheKeys');

describe('Page Cache', () => {
  beforeEach(() => {
    pageCache.flushAll();
  });

  it('should generate unique cache keys for different languages', () => {
    const reqEn = { path: '/necklaces', params: { lang: 'en' }, query: {} };
    const reqHe = { path: '/necklaces', params: { lang: 'he' }, query: {} };

    const keyEn = generateCacheKey(reqEn);
    const keyHe = generateCacheKey(reqHe);

    expect(keyEn).toBe('/necklaces:en:USD');
    expect(keyHe).toBe('/necklaces:he:ILS');
    expect(keyEn).not.toBe(keyHe);
  });

  it('should store and retrieve cached pages', () => {
    const key = '/necklaces:en:USD';
    const html = '<html><body>Necklaces</body></html>';

    pageCache.set(key, html, 60);
    const cached = pageCache.get(key);

    expect(cached).toBe(html);
  });

  it('should respect TTL expiration', (done) => {
    const key = '/test:en:USD';
    const html = '<html>Test</html>';

    pageCache.set(key, html, 1); // 1 second TTL

    setTimeout(() => {
      const cached = pageCache.get(key);
      expect(cached).toBeUndefined();
      done();
    }, 1500); // Wait 1.5 seconds
  }, 2000);

  it('should invalidate specific cache keys', () => {
    pageCache.set('/necklaces:en:USD', '<html>EN</html>', 60);
    pageCache.set('/necklaces:he:ILS', '<html>HE</html>', 60);

    pageCache.del('/necklaces:en:USD');

    expect(pageCache.get('/necklaces:en:USD')).toBeUndefined();
    expect(pageCache.get('/necklaces:he:ILS')).toBeDefined();
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Redis/Memcached for all caching | In-memory node-cache for single-server, Redis for multi-server | 2023-2024 | In-memory faster and simpler for single-server deployments (DigitalOcean App Platform). Redis still best for distributed systems. |
| ETag-based caching only | `stale-while-revalidate` Cache-Control | 2020 (Chrome 75, Firefox 68) | Better user experience: serve stale content instantly while revalidating in background. Prevents flash of loading state. |
| Flush all cache on any change | Granular invalidation by dependency | Ongoing best practice | Maintains high cache hit rate (80%+) while ensuring data freshness. Full flush drops hit rate to 0%. |
| Manual Google Search Console verification | HTML file upload or meta tag | Current | HTML file works but requires persistent filesystem (not ephemeral). Meta tag simpler for App Platform deployments. |
| Google Structured Data Testing Tool | Google Rich Results Test | 2020 | Newer tool tests actual rich result eligibility, not just schema validity. Shows how Google will display results. |
| `font-display: auto` (default) | `font-display: swap` | 2019 (widespread adoption) | Prevents invisible text flash (FOIT). Text visible immediately in fallback font, swaps when custom font loads. |

**Deprecated/outdated:**
- Google Structured Data Testing Tool: Replaced by Rich Results Test (more accurate for SEO)
- memory-cache npm package: Unmaintained since 2018, lacks memory limits
- Cache-Control without stale-while-revalidate: Older pattern misses performance opportunity

## Open Questions

1. **Should we add Cache-Control Vary header for Accept-Language?**
   - What we know: Vary header tells CDNs/proxies to cache separate versions based on request headers
   - What's unclear: Whether DigitalOcean App Platform CDN respects Vary header, or if URL-based language prefix (/en/, /he/) is sufficient
   - Recommendation: Test with/without `Vary: Accept-Language`. If language is in URL path, Vary may be redundant. Monitor cache behavior in production.

2. **What's the optimal max-age for SSR pages?**
   - What we know: 1 hour (3600s) is common for semi-static content, 24 hours (86400s) for truly static
   - What's unclear: Whether 1-hour is too aggressive given admin updates can happen anytime
   - Recommendation: Start with 1 hour, rely on invalidation for immediate updates. Monitor admin feedback on stale content visibility.

3. **Should we pre-warm cache on server startup?**
   - What we know: First visitor after deployment experiences slow TTFB (cache miss), subsequent visitors fast (cache hit)
   - What's unclear: Whether pre-warming (render all pages on startup) is worth the startup delay
   - Recommendation: Skip pre-warming for MVP. Implement if deployment health checks show slow first-response times. Most traffic hits popular pages anyway (home, necklaces).

4. **How to handle Google Search Console verification across deployments?**
   - What we know: Meta tag verification `<meta name="google-site-verification" content="...">` persists in code
   - What's unclear: Whether verification should be manual one-time setup or automated via API
   - Recommendation: Use meta tag verification (add to meta-tags.ejs partial). One-time manual verification, persists across deployments. API automation nice-to-have for v2.

## Sources

### Primary (HIGH confidence)

- [node-cache npm package](https://www.npmjs.com/package/node-cache) - Official documentation and API
- [Express.js Performance Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html) - Official Express.js guide on caching
- [EJS documentation](https://ejs.co/) - View caching configuration
- [MDN Cache-Control header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control) - HTTP caching specification
- [Google Rich Results Test](https://search.google.com/test/rich-results) - Official structured data validator
- [Google Search Console Documentation](https://support.google.com/webmasters/answer/7451001?hl=en) - Sitemap submission and verification
- [Vitest Documentation](https://vitest.dev/guide/features) - Test framework features and CI/CD integration

### Secondary (MEDIUM confidence)

- [Simple server side cache for Express.js with Node.js](https://medium.com/the-node-js-collection/simple-server-side-cache-for-express-js-with-node-js-45ff296ca0f0) - Medium article with Express caching patterns, verified with official Express docs
- [Keeping things fresh with stale-while-revalidate](https://web.dev/articles/stale-while-revalidate) - web.dev article by Google, verified implementation pattern
- [node-cache vs memory-cache comparison](https://npm-compare.com/lru-cache,memory-cache,node-cache,quick-lru) - npm-compare stats, verified with npm registry data
- [Caching in Node.js: Best Practices](https://medium.com/@akhanriz/caching-in-node-js-best-practices-for-optimization-and-maximum-performance-58ac50174c93) - Medium article, cross-referenced with multiple sources
- [Cache Invalidation Strategies](https://clouddevs.com/node/caching-strategies/) - CloudDevs article, patterns verified with Express.js documentation
- [Google Fonts font-display optimization](https://perfmatters.io/docs/font-display-swap/) - Verified with MDN font-display documentation

### Tertiary (LOW confidence)

- Community Reddit discussions on cache invalidation patterns (not linked, general consensus only)
- Blog posts on TTFB optimization (principles validated against official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - node-cache is well-established, current project structure supports integration cleanly
- Architecture: HIGH - Patterns derived from Express.js official docs and verified with real codebase structure
- Cache invalidation: MEDIUM-HIGH - Event-driven pattern is standard, but specific dependency graph (product → category) is custom to this app
- HTTP caching: HIGH - stale-while-revalidate is documented MDN standard with known browser support
- Structured data: HIGH - Google Rich Results Test is official Google tool, requirements documented
- Performance targets: MEDIUM - TTFB <500ms for cached is achievable with in-memory cache, <2s uncached depends on DB query optimization
- Pitfalls: MEDIUM-HIGH - Derived from research and common production issues, but not all tested on this specific codebase yet

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - caching is stable domain, but node-cache updates should be monitored)

**Test suite note:** Requirements state "419 tests" but current suite has 866 tests (447 backend + 419 frontend). Updated success criteria should reflect actual count to detect regression accurately.
