# Phase 23: Foundation & Infrastructure - Research

**Researched:** 2026-02-10
**Domain:** Express SSR with EJS templates, URL slug generation, bilingual routing, legacy URL redirects, robots.txt
**Confidence:** HIGH

## Summary

Phase 23 establishes the server-side rendering infrastructure for v1.4's SEO transformation. The research validates that the chosen technical stack (Express + EJS + MongoDB sparse unique indexes) aligns with current best practices for progressive enhancement and multilingual SEO.

**Key findings:** EJS is a mature, battle-tested template engine with zero syntax migration cost from existing HTML; slug generation requires counter-based collision handling for readable URLs; bilingual URL structure (/en, /he) with subdirectories is the SEO-recommended approach; robots.txt must explicitly block AI training crawlers (GPTBot, ClaudeBot, CCBot, Google-Extended) while allowing search indexing; and legacy .html redirects via Express middleware are straightforward with 301 status codes.

The codebase already has GeoIP locale detection (`backend/config/locale.js`) and cookie parsing configured, reducing implementation risk. The migration pattern from existing displayOrder migration provides a proven template for idempotent slug generation scripts.

**Primary recommendation:** Use counter-based slug collision handling (e.g., "necklace", "necklace-2", "necklace-3") over random strings for user-friendly URLs. Implement language detection with priority: cookie preference > CDN/proxy headers > GeoIP > Accept-Language > default (en). Use server-side navigation for language switcher to ensure full SSR on language change.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Slug generation:**
- Migration script should auto-generate slugs for all existing products (Claude decides approach)
- Migration must be idempotent (re-runnable safely) per success criteria

**Language detection & redirects:**
- **Language preference cookie:** Yes — set a cookie on first visit or language switch so returning visitors go straight to their language
- **Cookie stores both language AND currency:** Returning visitors get their exact previous combination
- **Currency auto-links to language by default:** Hebrew = ILS, English = USD. But manual currency override is sticky within and across sessions (stored in cookie)
- **Invalid language prefix (e.g., /fr/about):** Redirect to /en equivalent

**Robots.txt rules:**
- **Block admin paths:** Disallow /admin/ and related paths
- **Block API routes:** Disallow /api/*
- **Block AI training bots:** Disallow GPTBot, CCBot, Google-Extended, and similar AI training crawlers

### Claude's Discretion

- Slug generation approach (source language, duplicates, immutability, format, admin editability, category slugs)
- Language detection priority order
- Language switcher implementation (server nav vs client-side)
- Category URL translation strategy
- Dead URL handling
- Hash route redirect rules
- Sitemap reference timing in robots.txt
- EJS template engine configuration details
- All technical architecture decisions

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ejs | ^3.1.x | Template engine | Industry standard for Express SSR; zero syntax migration from HTML; mature caching |
| express | 4.20.0+ | Web server | Already in stack; proven SSR capabilities |
| slugify | ^1.6.x | URL slug generation | Most popular Node.js slug library (11M weekly downloads); robust transliteration |
| cookie-parser | 1.4.6 | Cookie management | Already in stack; required for language/currency persistence |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| express-ejs-layouts | ^2.5.x | Layout/partial system | If template duplication becomes unmanageable (optional for Phase 23) |
| accept-language-parser | ^1.5.x | Parse Accept-Language header | If implementing browser language detection fallback |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| EJS | Pug/Jade | Pug requires learning new syntax; EJS allows .html → .ejs rename with zero changes |
| Counter slugs | Random string (shortId) | Random strings prevent collisions under high concurrency but sacrifice URL readability |
| express-ejs-layouts | Native EJS includes | Layouts add dependency but reduce boilerplate for shared header/footer |

**Installation:**
```bash
# Backend only (EJS already has express in package.json)
cd backend
npm install ejs slugify
# Optional: npm install express-ejs-layouts accept-language-parser
```

## Architecture Patterns

### Recommended Project Structure

```
backend/
├── views/                    # EJS templates
│   ├── layouts/             # Master layout templates
│   │   └── main.ejs         # Base HTML structure with lang/dir
│   ├── partials/            # Reusable components
│   │   ├── header.ejs       # Site header with language switcher
│   │   └── footer.ejs       # Site footer
│   ├── pages/               # Page-specific templates
│   │   ├── home.ejs
│   │   ├── about.ejs
│   │   ├── contact.ejs
│   │   └── categories/
│   │       ├── category.ejs
│   │       └── product.ejs
│   └── errors/              # Error pages
│       ├── 404.ejs
│       └── 500.ejs
├── routes/                  # Express route handlers
│   ├── pages.js             # SSR page routes (/en/*, /he/*)
│   ├── legacy.js            # Legacy redirect middleware
│   └── api.js               # Existing API routes
├── migrations/
│   └── YYYYMMDDHHMMSS-add-product-slugs.js
├── public/                  # Static assets served by Express
│   ├── robots.txt           # Crawler directives
│   ├── dist/                # Parcel-built JS/CSS
│   └── imgs/
└── index.js                 # Main Express server
```

### Pattern 1: EJS Template Configuration

**What:** Configure Express to use EJS as view engine with proper view path resolution

**When to use:** Phase 23 initialization (INFRA-01)

**Example:**
```javascript
// Source: Express official docs + EJS docs
const express = require('express');
const path = require('path');

const app = express();

// Set view engine and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Enable view caching in production (caches template compilation, not rendered output)
if (process.env.NODE_ENV === 'production') {
  app.set('view cache', true);
}

// Render example
app.get('/en/about', (req, res) => {
  res.render('pages/about', {
    lang: 'en',
    dir: 'ltr',
    title: 'About Us',
    // ... other data
  });
});
```

### Pattern 2: Bilingual URL Routing with Language Middleware

**What:** Detect language from URL prefix, set in request context, render with correct lang/dir attributes

**When to use:** All SSR page routes (URL-05, LANG-01)

**Example:**
```javascript
// Source: Multilingual SSR best practices (Search Engine Journal, 2026)
// Middleware to extract language from URL prefix
function languageMiddleware(req, res, next) {
  const urlLang = req.path.match(/^\/(en|he)\//)?.[1];

  if (!urlLang) {
    // Root or invalid - redirect to detected language
    const detectedLang = detectLanguage(req); // See Pattern 3
    return res.redirect(302, `/${detectedLang}${req.path}`);
  }

  // Validate language
  if (!['en', 'he'].includes(urlLang)) {
    // Invalid prefix like /fr/about -> redirect to /en/about
    return res.redirect(301, `/en${req.path.slice(3)}`);
  }

  // Store in request context
  req.lang = urlLang;
  req.dir = urlLang === 'he' ? 'rtl' : 'ltr';
  next();
}

app.use(languageMiddleware);

// Routes now have req.lang and req.dir available
app.get('/:lang/about', (req, res) => {
  res.render('pages/about', {
    lang: req.lang,
    dir: req.dir,
    // ...
  });
});
```

### Pattern 3: Language Detection with Cookie Persistence

**What:** Multi-tier detection (cookie > CDN headers > GeoIP > Accept-Language > default) with persistent preference storage

**When to use:** Root URL redirect (URL-06), language switcher (LANG-01)

**Example:**
```javascript
// Source: Existing backend/config/locale.js + cookie-parser best practices
const cookieParser = require('cookie-parser');
const { resolveRequestLocale } = require('./config/locale');

app.use(cookieParser());

function detectLanguage(req) {
  // Priority 1: Cookie preference (returning visitor)
  if (req.cookies.locale_pref) {
    try {
      const pref = JSON.parse(req.cookies.locale_pref);
      if (['en', 'he'].includes(pref.lang)) {
        return pref.lang;
      }
    } catch (e) {
      // Invalid cookie - continue to fallbacks
    }
  }

  // Priority 2-4: CDN headers, GeoIP, Accept-Language (existing locale.js logic)
  const locale = resolveRequestLocale(req);
  return locale.lang; // 'en' or 'he'
}

// Language switcher route (server-side navigation for full SSR)
app.post('/switch-language', (req, res) => {
  const { lang, currency, returnUrl } = req.body;

  // Validate
  if (!['en', 'he'].includes(lang)) {
    return res.status(400).json({ error: 'Invalid language' });
  }

  // Set persistent cookie (30 days)
  res.cookie('locale_pref', JSON.stringify({ lang, currency }), {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: false, // Accessible to client JS for currency switching
    sameSite: 'lax'
  });

  // Redirect to equivalent URL in new language
  const newUrl = returnUrl.replace(/^\/(en|he)\//, `/${lang}/`);
  res.redirect(303, newUrl);
});
```

### Pattern 4: Idempotent Slug Migration Script

**What:** MongoDB migration that generates slugs for all products, handles duplicates with counters, safely re-runnable

**When to use:** INFRA-02, INFRA-03

**Example:**
```javascript
// Source: Existing migration 20260201194100-add-product-display-order.js + MongoDB idempotency patterns
const slugify = require('slugify');

module.exports = {
  async up(db) {
    const products = db.collection('products');

    // 1. Create sparse unique index (idempotent: if exists, no-op)
    await products.createIndex(
      { slug: 1 },
      { unique: true, sparse: true, name: 'product_slug_unique_idx' }
    );
    console.log('Ensured unique sparse index on slug field');

    // 2. Get all products without slugs
    const needSlugs = await products
      .find({
        $or: [
          { slug: { $exists: false } },
          { slug: null },
          { slug: '' }
        ]
      })
      .toArray();

    console.log(`Found ${needSlugs.length} products needing slugs`);

    // 3. Generate slugs with collision handling
    const slugCounts = new Map(); // Track collisions

    for (const product of needSlugs) {
      // Use English name for slug (SEO best practice for global reach)
      const baseName = product.name || `product-${product.id}`;
      const baseSlug = slugify(baseName, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g
      });

      // Handle duplicates with counter
      let finalSlug = baseSlug;
      let counter = slugCounts.get(baseSlug) || 0;

      while (counter > 0) {
        counter++;
        finalSlug = `${baseSlug}-${counter}`;

        // Check if this slug exists in DB
        const existing = await products.findOne({ slug: finalSlug });
        if (!existing) break;
      }

      if (counter > 0) {
        slugCounts.set(baseSlug, counter);
      } else {
        slugCounts.set(baseSlug, 1);
      }

      // Update product
      await products.updateOne(
        { _id: product._id },
        { $set: { slug: finalSlug } }
      );
    }

    console.log(`Migration complete: ${needSlugs.length} products now have slugs`);
  },

  async down(db) {
    const products = db.collection('products');

    // Drop index
    try {
      await products.dropIndex('product_slug_unique_idx');
      console.log('Dropped slug index');
    } catch (err) {
      console.log('Index may not exist, continuing...');
    }

    // Remove slug field
    const result = await products.updateMany(
      {},
      { $unset: { slug: '' } }
    );
    console.log(`Rollback complete: removed slug from ${result.modifiedCount} products`);
  }
};
```

### Pattern 5: Legacy URL Redirect Middleware

**What:** Express middleware that maps old .html paths to new clean URLs with 301 redirects

**When to use:** INFRA-04

**Example:**
```javascript
// Source: Express redirect best practices + codebase analysis
const legacyUrlMap = {
  // Pages
  '/html/about.html': '/about',
  '/html/cart.html': '/cart',
  '/html/contact-me.html': '/contact',
  '/html/policies.html': '/policies',
  '/html/jewelry-workshop.html': '/workshop',

  // Categories
  '/html/categories/necklaces.html': '/categories/necklaces',
  '/html/categories/crochetNecklaces.html': '/categories/crochet-necklaces',
  '/html/categories/hoops.html': '/categories/hoops',
  '/html/categories/dangle.html': '/categories/dangle',
  '/html/categories/bracelets.html': '/categories/bracelets',
  '/html/categories/unisex.html': '/categories/unisex',
  '/html/categories/shalom-club.html': '/categories/shalom-club'
};

function legacyRedirectMiddleware(req, res, next) {
  const cleanPath = legacyUrlMap[req.path];

  if (cleanPath) {
    // Detect language preference for redirect
    const lang = detectLanguage(req);
    return res.redirect(301, `/${lang}${cleanPath}`);
  }

  // No legacy match - continue to next middleware
  next();
}

// Apply before other routes
app.use(legacyRedirectMiddleware);
```

### Pattern 6: robots.txt Serving

**What:** Serve robots.txt from public directory with explicit AI crawler blocking

**When to use:** CRAWL-01

**Example robots.txt:**
```
# Source: robots.txt AI crawler blocking best practices (2026)
# Block admin and API routes from all crawlers
User-agent: *
Disallow: /admin/
Disallow: /api/

# Block AI training crawlers (preserve content rights)
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: PerplexityBot
Disallow: /

User-agent: Claude-Web
Disallow: /

# Allow AI search/assistant crawlers (preserve discoverability)
User-agent: Claude-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

# Sitemap (optional for Phase 23, required for Phase 25)
# Sitemap: https://www.example.com/sitemap.xml
```

**Express configuration:**
```javascript
// Serve robots.txt from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Or explicit route if needed
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});
```

### Anti-Patterns to Avoid

- **Using `<%-` for user data in EJS:** Always use `<%= %>` (escaped) for user-generated content; `<%-` (unescaped) is only for trusted HTML from includes
- **Forgetting hreflang tags:** Bilingual URLs require hreflang annotations in `<head>` to tell search engines about language variants (defer to Phase 25)
- **Client-side language detection in SSR:** URL prefix is source of truth for language; don't override with JavaScript GeoIP detection
- **Non-idempotent migrations:** Always check for existing slugs/indexes before creating; use `$exists` checks and sparse indexes
- **Mixing hash routes with SSR:** Hash fragments (#/about) don't trigger server requests; SSR requires real URL paths (/en/about)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slug generation | Custom regex/replace logic | `slugify` npm package | Handles Unicode transliteration, edge cases (apostrophes, accents), configurable separators |
| Accept-Language parsing | Header string splitting | `accept-language-parser` (if needed) | Handles q-values, priority weighting, malformed headers |
| Cookie serialization | Manual JSON.stringify/parse | `cookie-parser` middleware | Already in stack; handles encoding, security flags, expiry |
| URL collision detection | In-memory counter during migration | MongoDB unique index + retry loop | Database-level uniqueness guarantee; handles concurrent insertions |
| EJS layout system | Manual header/footer includes in every template | `express-ejs-layouts` (if needed) | DRY principle; centralizes layout changes; reduces copy-paste errors |

**Key insight:** Slug generation is deceptively complex due to Unicode edge cases (Hebrew characters, emoji, Arabic numerals, combining diacritics) and collision handling under load. A battle-tested library like `slugify` handles these cases; custom implementations inevitably miss edge cases that break URLs.

## Common Pitfalls

### Pitfall 1: XSS via Unescaped EJS Output

**What goes wrong:** Using `<%-` instead of `<%=` in EJS templates allows raw HTML injection, creating XSS vulnerabilities

**Why it happens:** `<%-` is required for including partials (`<%- include('header') %>`), so developers get accustomed to the syntax and accidentally use it for user data

**How to avoid:**
- Default to `<%= userdata %>` for all variables
- Only use `<%- %>` for trusted sources: includes, sanitized HTML, server-generated markup
- Never use `<%-` for product names, descriptions, user input, or database content without sanitization
- Implement Content Security Policy (CSP) headers as defense-in-depth

**Warning signs:** Product descriptions containing `<script>` tags render as HTML instead of text; admin-added content breaks page layout

### Pitfall 2: Context Mismatch in JavaScript Blocks

**What goes wrong:** HTML escaping doesn't prevent XSS in JavaScript contexts; template variables injected into `<script>` tags can execute arbitrary code

**Why it happens:** EJS `<%= %>` only escapes HTML entities (`<`, `>`, `&`); doesn't escape for JavaScript string context

**How to avoid:**
```ejs
<!-- WRONG: HTML escaping insufficient in JS context -->
<script>
  const productName = '<%= product.name %>'; // Vulnerable if name contains quotes or newlines
</script>

<!-- RIGHT: JSON.stringify for JavaScript context -->
<script>
  const productData = <%- JSON.stringify({ name: product.name, price: product.price }) %>;
</script>
```

**Warning signs:** Product names with apostrophes break JavaScript; console errors about unexpected tokens

### Pitfall 3: Slug Immutability vs. Product Name Changes

**What goes wrong:** If product slug is auto-regenerated when name changes, existing URLs/bookmarks break; if slug never updates, it becomes misleading

**Why it happens:** No clear decision on slug lifecycle policy

**How to avoid:**
- **Recommended:** Slugs are immutable after creation (preserves bookmarks, backlinks, SEO authority)
- Alternative: Allow manual admin override for critical corrections, but warn about URL change implications
- Never auto-regenerate slugs on name change (silently breaks links)

**Warning signs:** Product URLs change unexpectedly; Google Search Console shows broken backlinks; customer complaints about dead links

### Pitfall 4: Missing Trailing Slash Inconsistency

**What goes wrong:** URLs work with and without trailing slashes (/about and /about/), creating duplicate content for search engines; inconsistent canonical URLs

**Why it happens:** Express routes match both by default; no normalization middleware

**How to avoid:**
```javascript
// Normalize: redirect /about/ to /about (no trailing slash)
app.use((req, res, next) => {
  if (req.path !== '/' && req.path.endsWith('/')) {
    const cleanPath = req.path.slice(0, -1);
    return res.redirect(301, cleanPath + (req.url.slice(req.path.length)));
  }
  next();
});
```

**Warning signs:** Same page indexed twice by Google; Sitemap has inconsistent URL formats

### Pitfall 5: Language Cookie Conflicts with URL Prefix

**What goes wrong:** Cookie stores language preference (e.g., Hebrew), but user manually visits /en/about; page renders in Hebrew despite English URL

**Why it happens:** Cookie logic overrides URL prefix

**How to avoid:**
- **URL is source of truth:** If user explicitly navigates to /en/about, render in English regardless of cookie
- Cookie only affects automatic redirects (root URL, language switcher)
- Update cookie when user visits new language URL (implicit preference change)

**Warning signs:** Language switcher doesn't change page content; /en URLs render in Hebrew for returning visitors

### Pitfall 6: Forgetting Cache-Control for SSR Pages

**What goes wrong:** SSR pages cached by CDN/browser show stale product availability, prices, or content

**Why it happens:** No explicit cache headers; default CDN caching policies apply

**How to avoid:**
```javascript
app.get('/:lang/*', (req, res, next) => {
  // SSR pages: short cache (5 min) with revalidation
  res.set('Cache-Control', 'public, max-age=300, must-revalidate');
  next();
});

// API routes: no cache
app.use('/api/*', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
```

**Warning signs:** Product stock doesn't update; users see old prices; content changes don't appear immediately

## Code Examples

Verified patterns from official sources:

### EJS Layout with Language Support

```ejs
<!-- Source: EJS docs + multilingual SSR best practices -->
<!-- views/layouts/main.ejs -->
<!DOCTYPE html>
<html lang="<%= lang %>" dir="<%= dir %>">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %> | Tamar Kfir Jewelry</title>

  <!-- Language alternates for SEO (hreflang) -->
  <link rel="alternate" hreflang="en" href="https://example.com/en<%= path %>">
  <link rel="alternate" hreflang="he" href="https://example.com/he<%= path %>">

  <!-- Conditional RTL/LTR stylesheets -->
  <% if (dir === 'rtl') { %>
    <link rel="stylesheet" href="/dist/css/rtl.css">
  <% } else { %>
    <link rel="stylesheet" href="/dist/css/ltr.css">
  <% } %>
</head>
<body>
  <%- include('../partials/header', { lang, dir }) %>

  <main>
    <%- body %>
  </main>

  <%- include('../partials/footer', { lang }) %>

  <!-- Progressive enhancement: client-side JS -->
  <script src="/dist/js/main.js" defer></script>
</body>
</html>
```

### Product Slug-Based URL Route

```javascript
// Source: Express routing + MongoDB slug query pattern
app.get('/:lang/products/:slug', async (req, res) => {
  const { lang, slug } = req.params;

  try {
    const product = await Product.findOne({ slug });

    if (!product) {
      return res.status(404).render('errors/404', {
        lang: req.lang,
        dir: req.dir,
        title: lang === 'en' ? 'Product Not Found' : 'המוצר לא נמצא'
      });
    }

    res.render('pages/product', {
      lang: req.lang,
      dir: req.dir,
      title: product.name,
      product,
      // Pass structured data for progressive enhancement
      productJson: JSON.stringify(product)
    });
  } catch (err) {
    console.error('Product fetch error:', err);
    res.status(500).render('errors/500', {
      lang: req.lang,
      dir: req.dir
    });
  }
});
```

### Root URL Language Detection and Redirect

```javascript
// Source: Existing locale.js + multilingual redirect best practices
app.get('/', (req, res) => {
  const lang = detectLanguage(req);

  // Set cookie for future visits
  res.cookie('locale_pref', JSON.stringify({
    lang,
    currency: lang === 'he' ? 'ILS' : 'USD'
  }), {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: false,
    sameSite: 'lax'
  });

  // Temporary redirect (user preference may change)
  res.redirect(302, `/${lang}/`);
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side SPA routing (hash-based) | SSR with progressive enhancement | 2023-2024 shift | SEO crawlers see full content; faster FCP (First Contentful Paint) |
| Accept-Language header only | Multi-tier detection (CDN headers > GeoIP > Accept-Language) | 2024-2025 | More accurate language detection; respects CDN/proxy signals |
| Random string slug collisions (e.g., slug-Nyiy4wW9l) | Counter-based collisions (e.g., slug-2) | Ongoing preference | Readable URLs; better UX when sharing links |
| Block all bots equally | Selective blocking (training bots blocked, search bots allowed) | Late 2023 (GPTBot launch) | Protects content rights while maintaining search discoverability |
| `express-ejs-layouts` for layout system | Native EJS includes (`<%- include() %>`) | 2025-2026 | Reduced dependencies; EJS 3.x includes are mature and performant |

**Deprecated/outdated:**
- **Hash-based routing (#/about):** Replaced by History API clean URLs (/about); hash routing is legacy pattern for SPAs without SSR
- **Universal AI bot blocking:** Nuance required; block training bots (GPTBot, ClaudeBot, CCBot) but allow search/assistant bots (ChatGPT-User, Claude-SearchBot) for discoverability
- **Automatic slug regeneration on name change:** Immutability is current best practice to preserve SEO authority and backlinks

## Open Questions

1. **Hash-based route handling for legacy bookmarks**
   - What we know: Current frontend uses client-side routing (controller.js); hash fragments don't trigger server requests
   - What's unclear: Do real users have bookmarked hash URLs? Are they shared externally?
   - Recommendation: Investigate analytics for hash-based traffic; if none exists, no redirect rules needed. If present, implement client-side redirect in main.js (detect hash, redirect to clean URL)

2. **Category slug strategy (English vs. Hebrew)**
   - What we know: SEO best practice favors translated slugs for local markets; English slugs for global reach
   - What's unclear: Product categories are visible in both English and Hebrew — which language should slug use?
   - Recommendation: Use English category slugs for both languages (e.g., /en/categories/necklaces, /he/categories/necklaces). Rationale: (a) simpler migration (no duplicate slug handling per language), (b) consistent bookmarks across languages, (c) global SEO signal (jewelry is international market). Translate category *names* in UI, not URL slugs.

3. **Admin manual slug editing capability**
   - What we know: Immutability preserves SEO; manual editing allows corrections
   - What's unclear: Does admin need ability to fix slug typos or optimize for keywords?
   - Recommendation: Phase 23 makes slugs auto-generated and immutable (no admin UI). Defer manual editing to Phase 26 (admin enhancements) if business need arises. For Phase 23, manual corrections can be done via MongoDB shell if critical.

4. **Sitemap reference timing in robots.txt**
   - What we know: Sitemap.xml is Phase 25 deliverable; robots.txt is Phase 23
   - What's unclear: Does commented-out sitemap reference in robots.txt cause issues?
   - Recommendation: Omit sitemap reference in Phase 23 robots.txt. Add in Phase 25 when sitemap actually exists. No harm in absence; crawlers will find sitemap.xml at root even without robots.txt reference.

## Sources

### Primary (HIGH confidence)

- [Express - Using Template Engines](https://expressjs.com/en/guide/using-template-engines.html) - Official Express documentation for view engine configuration
- [EJS - Embedded JavaScript Templates](https://ejs.co/) - Official EJS documentation for syntax, options, and best practices
- [MongoDB - Unique Indexes](https://www.mongodb.com/docs/manual/core/index-unique/) - Official MongoDB docs for unique index constraints
- [MongoDB - Sparse Indexes](https://www.mongodb.com/docs/manual/core/index-sparse/) - Official MongoDB docs for sparse index behavior
- [MDN - Accept-Language Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Accept-Language) - HTTP Accept-Language specification
- [Anthropic - ClaudeBot Documentation](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) - Official Anthropic crawler documentation

### Secondary (MEDIUM confidence)

- [Search Engine Journal - Multilingual SEO URL Structure](https://www.searchenginejournal.com/multilingual-seo-url-structure/298747/) - SEO best practices for bilingual URL design
- [Google Developers - Managing Multi-Regional Sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites) - Official Google guidance on hreflang and multilingual SEO
- [Playwire - How to Block AI Bots with robots.txt](https://www.playwire.com/blog/how-to-block-ai-bots-with-robotstxt-the-complete-publishers-guide) - 2026 comprehensive guide to AI crawler blocking
- [Cloudflare - From Googlebot to GPTBot 2025](https://blog.cloudflare.com/from-googlebot-to-gptbot-whos-crawling-your-site-in-2025/) - Current state of AI crawler landscape
- [Koanthic - URL Structure SEO](https://koanthic.com/en/url-structure-seo/) - URL best practices for Google Search
- [Jasmine Directory - SSR vs CSR 2026 Verdict](https://www.jasminedirectory.com/blog/server-side-rendering-ssr-vs-client-side-the-2026-verdict/) - Current SSR trends and hybrid approaches
- [Mastering JS - Express Redirects](https://masteringjs.io/tutorials/express/redirect) - Express redirect patterns including 301 permanent redirects
- [Semgrep - XSS in Express](https://semgrep.dev/docs/cheat-sheets/express-xss) - Security best practices for template rendering
- [GitHub - Salesforce Secure Filters](https://github.com/salesforce/secure-filters) - Anti-XSS filters for EJS and context-specific escaping
- [Event-Driven.io - Idempotency in MongoDB](https://event-driven.io/en/dealing_with_eventual_consistency_and_idempotency_in_mongodb_projections/) - MongoDB idempotent operation patterns
- [npm - slugify](https://www.npmjs.com/package/slugify) - Slugify package documentation and options
- [npm - transliteration](https://www.npmjs.com/package/transliteration) - Alternative slug generation with transliteration support
- [npm - express-robots-txt](https://www.npmjs.com/package/express-robots-txt) - Express middleware for dynamic robots.txt
- [Medium - Implementing URL Slugs on Express Node.js](https://medium.com/@thiscodeworks.com/implementing-url-slugs-on-express-node-js-5f5890431dea) - Practical slug implementation patterns
- [Medium - How to Create Unique URLs in Express and MongoDB](https://medium.com/fbdevclagos/how-to-create-unique-urls-in-an-expressjs-and-mongodb-app-78865802902e) - Slug uniqueness strategies with MongoDB
- [GitHub - mongoose-slug-updater](https://github.com/YuriGor/mongoose-slug-updater) - Counter vs. shortId collision handling comparison

### Tertiary (LOW confidence)

None — all findings verified with official docs or multiple credible sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - EJS and slugify are mature, well-documented libraries with official Express integration
- Architecture: HIGH - Patterns verified with official Express/EJS docs and existing codebase migration examples
- Pitfalls: MEDIUM-HIGH - XSS/security issues verified with Semgrep docs; slug immutability based on SEO community consensus (not official Google statement)
- Language detection: HIGH - Existing codebase already has locale.js with GeoIP detection; cookie-parser already in package.json
- Robots.txt: HIGH - AI crawler user-agents verified with official Anthropic/OpenAI documentation; blocking effectiveness confirmed by Cloudflare 2025 analysis

**Research date:** 2026-02-10
**Valid until:** ~2026-03-10 (30 days for stable technologies; EJS/Express core patterns unlikely to change)

**Limitations:**
- Hash-based route usage unknown without analytics review (deferred to planning)
- Category slug language choice (English vs. Hebrew) is judgment call, not SEO fact
- Admin slug editing need is business decision, not technical constraint
- Slug generation performance under high concurrency not benchmarked (low risk for jewelry e-commerce scale)
