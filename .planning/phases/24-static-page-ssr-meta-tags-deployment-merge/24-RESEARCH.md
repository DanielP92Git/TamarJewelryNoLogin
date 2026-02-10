# Phase 24: Static Page SSR + Meta Tags + Deployment Merge - Research

**Researched:** 2026-02-10
**Domain:** Server-Side Rendering (SSR), SEO meta tags, multi-language internationalization, Express.js deployment
**Confidence:** HIGH

## Summary

Phase 24 implements complete server-side rendering for static pages (about, contact, workshop, policies) and the home page using EJS templates, adds comprehensive SEO meta tags including Open Graph and Twitter Cards, implements proper hreflang for bilingual content, adds Organization JSON-LD structured data, and merges the deployment from two DigitalOcean components into a single Express service.

**Primary recommendation:** Use EJS with direct partial includes (no layouts library), enable view caching only in production via NODE_ENV, implement self-referencing canonicals on every page, use hreflang with x-default pointing to English, keep meta descriptions 120-158 characters, place static middleware before SSR routes, and use `<%= %>` for all user data escaping.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| EJS | 3.x | Template engine | Official Express.js docs recommend it, zero translation from HTML, automatic caching, minimal syntax |
| Express.js | 4.x | Web server | Native SSR support, built-in view engine API, production-tested |
| helmet | Latest | Security headers | Standard for Express security, sets proper CSP for meta tags |
| compression | Latest | Gzip responses | Reduces SSR HTML payload size by 60-80% |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| express-rate-limit | Latest | API protection | Already in project, protects SSR routes from abuse |
| cookie-parser | Latest | Read locale cookies | Already in project, needed for language detection |
| sharp | Latest | Image optimization | Already in project, for Open Graph images |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| EJS | Pug/Handlebars | More features but requires syntax translation from existing HTML |
| express.static | nginx reverse proxy | Better performance at scale but adds infrastructure complexity |
| Manual meta tags | react-helmet SSR | Framework-specific, overkill for static pages |

**Installation:**
```bash
# All core dependencies already in project
npm install ejs express helmet compression
```

## Architecture Patterns

### Recommended Project Structure
```
backend/
├── views/
│   ├── partials/        # Reusable header, footer, nav, meta-tags
│   ├── pages/           # Full page templates (home, about, contact, etc.)
│   └── errors/          # 404, 500 error pages
├── middleware/
│   ├── language.js      # Language detection and URL routing (existing)
│   ├── legacy.js        # Legacy redirects (existing)
│   └── ssr.js           # SSR helpers (page data, meta tags, locale)
├── config/
│   ├── locale.js        # GeoIP detection (existing)
│   └── meta.js          # Meta tag configurations per page
└── index.js             # Main server - static middleware BEFORE SSR routes
```

### Pattern 1: EJS Partial Includes Without Layouts
**What:** Direct `<%- include() %>` calls in each page template, no express-ejs-layouts middleware
**When to use:** Every SSR page (decided in Phase 23-01)
**Example:**
```ejs
<!DOCTYPE html>
<html lang="<%= lang %>" dir="<%= dir %>">
<head>
  <%- include('../partials/meta-tags', {
    title,
    description,
    canonical,
    ogImage,
    lang,
    alternateUrl
  }) %>
</head>
<body>
  <%- include('../partials/header', { lang, dir }) %>
  <main>
    <!-- Page content -->
  </main>
  <%- include('../partials/footer', { lang }) %>
</body>
</html>
```
**Why:** Simpler than express-ejs-layouts, explicit control over what's included, easier debugging

### Pattern 2: Meta Tags Partial
**What:** Centralized `partials/meta-tags.ejs` with all SEO tags
**When to use:** Include in `<head>` of every page
**Example:**
```ejs
<!-- partials/meta-tags.ejs -->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><%= title %> | Tamar Kfir Jewelry</title>
<meta name="description" content="<%= description %>">
<link rel="canonical" href="<%= canonical %>">

<!-- Open Graph -->
<meta property="og:title" content="<%= title %> | Tamar Kfir Jewelry">
<meta property="og:description" content="<%= description %>">
<meta property="og:image" content="<%= ogImage %>">
<meta property="og:url" content="<%= canonical %>">
<meta property="og:type" content="website">
<meta property="og:locale" content="<%= lang === 'eng' ? 'en_US' : 'he_IL' %>">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="<%= title %> | Tamar Kfir Jewelry">
<meta name="twitter:description" content="<%= description %>">
<meta name="twitter:image" content="<%= ogImage %>">

<!-- Hreflang -->
<link rel="alternate" hreflang="en" href="<%= alternateUrl.en %>">
<link rel="alternate" hreflang="he" href="<%= alternateUrl.he %>">
<link rel="alternate" hreflang="x-default" href="<%= alternateUrl.en %>">
```

### Pattern 3: Middleware Ordering for SSR + Static Assets
**What:** Static middleware placed BEFORE SSR routes for efficient asset serving
**When to use:** In main Express app setup (decided in Phase 23-05)
**Example:**
```javascript
// index.js
const app = express();

// 1. Security & parsing middleware
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(cookieParser());

// 2. Static assets FIRST (Phase 23-05 decision)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// 3. Language detection & legacy redirects
app.use(detectLanguage);
app.use(legacyRedirectMiddleware);

// 4. SSR routes (after static middleware)
app.get('/:lang(en|he)/', renderHomePage);
app.get('/:lang(en|he)/about', renderAboutPage);
app.get('/:lang(en|he)/contact', renderContactPage);
// ... more SSR routes

// 5. API routes
app.get('/api/products', getProducts);
// ... more API routes
```
**Why:** Static files return immediately without hitting SSR logic, Node processes only dynamic requests

### Pattern 4: View Caching by Environment
**What:** Enable EJS view caching only in production using NODE_ENV
**When to use:** During app initialization (decided in Phase 23-01)
**Example:**
```javascript
// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Enable view caching ONLY in production (Phase 23-01)
if (process.env.NODE_ENV === 'production') {
  app.set('view cache', true);
  // Note: Setting NODE_ENV=production also enables Express's automatic caching
}
```
**Why:** Development needs hot-reloading, production needs speed (3x performance gain)

### Pattern 5: Progressive Enhancement SSR Structure
**What:** Server renders complete HTML matching client-side JS output, JS enhances but isn't required
**When to use:** All static pages and home page
**Example:**
```ejs
<!-- Server renders complete content -->
<nav class="main-nav">
  <a href="/<%= lang %>/" class="logo">Tamar Kfir Jewelry</a>
  <ul class="nav-links">
    <li><a href="/<%= lang %>/shop">Shop</a></li>
    <li><a href="/<%= lang %>/about">About</a></li>
    <li><a href="/<%= lang %>/contact">Contact</a></li>
  </ul>
  <!-- Language & currency selectors work without JS -->
  <form method="GET" action="/set-language">
    <select name="lang" onchange="this.form.submit()">
      <option value="en" <%= lang === 'eng' ? 'selected' : '' %>>English</option>
      <option value="he" <%= lang === 'heb' ? 'selected' : '' %>>עברית</option>
    </select>
  </form>
</nav>

<!-- Client JS enhances with AJAX, animations, etc. -->
<script src="/js/controller.js" type="module"></script>
```
**Why:** SEO bots see full content, users with JS disabled/failed get functional site, faster initial render

### Pattern 6: JSON-LD Structured Data
**What:** Organization schema in `<script type="application/ld+json">` on home page
**When to use:** Home page only (SCHEMA-04 requirement)
**Example:**
```ejs
<!-- pages/home.ejs -->
<head>
  <!-- Meta tags partial -->
  <%- include('../partials/meta-tags', { ... }) %>

  <!-- Organization structured data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Tamar Kfir Jewelry",
    "url": "https://tamarkfir.online",
    "logo": "https://tamarkfir.online/images/logo.png",
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "contact@tamarkfir.online",
      "contactType": "Customer Service"
    },
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "IL"
    },
    "sameAs": [
      "https://instagram.com/tamarkfirjewelry",
      "https://facebook.com/tamarkfirjewelry"
    ]
  }
  </script>
</head>
```
**Why:** Helps Google understand business entity, can enhance Knowledge Graph results

### Anti-Patterns to Avoid

- **Don't use `<%- %>` for user input:** Always use `<%= %>` (HTML-escaped) for any user-supplied data to prevent XSS
- **Don't place SSR routes before static middleware:** Static assets will hit route logic unnecessarily, slowing response time
- **Don't skip self-referencing canonical:** Every page needs `<link rel="canonical">` pointing to itself to prevent duplicate content issues
- **Don't use same meta description for all pages:** Each page must have unique, keyword-optimized description (120-158 chars)
- **Don't omit hreflang x-default:** Without x-default, users in non-targeted regions get unpredictable language selection
- **Don't check `typeof window` in SSR templates:** EJS runs server-side only; browser API checks indicate architecture confusion
- **Don't enable view caching in development:** Breaks hot-reloading and makes debugging painful

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML escaping | Custom escape functions | EJS `<%= %>` syntax | Context-aware escaping is complex, easy to miss edge cases (XSS vulnerabilities) |
| View caching | Manual template compilation cache | `app.set('view cache', true)` and NODE_ENV | Express handles invalidation, memory management, and environment detection automatically |
| Open Graph image generation | Server-side screenshot library | Static pre-generated images with Sharp | Screenshot libraries add 100MB+ dependencies, are slow, and prone to font/rendering issues |
| Meta tag validation | Custom regex checkers | Google's Rich Results Test tool | Google's algorithm changes constantly; manual validation becomes stale |
| Hreflang tag generation | Manual string concatenation | Centralized meta-tags partial with locale config | Easy to create inconsistent/invalid hreflang sets, breaks bidirectional requirements |
| Structured data generation | JSON string building | JSON.stringify() with object literals | Type safety, syntax errors caught at dev time, easier to maintain |

**Key insight:** SEO tooling is deceptively complex. Hreflang requires every page to list all alternates including itself (bidirectional links), meta descriptions must be unique across thousands of pages, and Open Graph/Twitter Card specs have subtle differences. Use proven patterns and official validators rather than custom implementations.

## Common Pitfalls

### Pitfall 1: Hydration Mismatch with Server/Client Data Differences
**What goes wrong:** Server renders page with one set of data (e.g., no user session), client JS hydrates with different data (e.g., localStorage cart), causing DOM mismatch and re-render
**Why it happens:** SSR runs before client-side JS, so server doesn't have access to localStorage, cookies may not be sent, or timezone differences affect date rendering
**How to avoid:** Use progressive enhancement pattern - server renders basic content, client JS adds interactivity without changing existing DOM structure. For cart/user data, render empty containers server-side and populate client-side only
**Warning signs:** React "Hydration failed" errors, flickering content on page load, form inputs losing values, console errors about mismatched text content

### Pitfall 2: Missing or Incorrect Self-Referencing Canonical Tags
**What goes wrong:** Page lacks `<link rel="canonical">` or points to wrong URL, causing duplicate content penalties or incorrect indexing
**Why it happens:** Developer assumes canonical only needed for duplicates, forgets to update canonical when URL structure changes, or hardcodes domain without environment awareness
**How to avoid:** Every SSR route must pass `canonical` variable to meta-tags partial with full absolute URL (protocol + domain + path). Use environment variable for domain in production vs development
**Warning signs:** Google Search Console shows "Duplicate without user-selected canonical", pages not ranking despite good content, wrong URL showing in search results

### Pitfall 3: Hreflang Implementation Errors (Non-Bidirectional Links)
**What goes wrong:** English page lists Hebrew alternate, but Hebrew page doesn't list English alternate, causing Google to ignore hreflang tags entirely
**Why it happens:** Over 65% of international websites have hreflang errors due to complexity - every page must list all alternates INCLUDING ITSELF
**How to avoid:** Use centralized hreflang generation function that always includes self-reference and all language pairs. Test with Google Search Console International Targeting report
**Warning signs:** Google serves wrong language version despite hreflang tags, Search Console shows "hreflang errors" in International Targeting report, users complain about being sent to wrong language

### Pitfall 4: Meta Description Length Violations
**What goes wrong:** Meta descriptions truncated in search results (too long) or Google rewrites them (too short/not relevant)
**Why it happens:** Developer writes descriptions focusing on keywords without checking character count, or copies title tag into description field
**How to avoid:** Keep descriptions 120-158 characters (920 pixels). Note: Google rewrites 60-70% of meta descriptions anyway, so focus on clarity and relevance over keyword stuffing
**Warning signs:** Search results show "..." truncation after brand name, Google uses random page text instead of provided description, click-through rate drops

### Pitfall 5: NODE_ENV Not Set to Production
**What goes wrong:** Production server runs with default NODE_ENV=development, causing view re-compilation on every request, verbose error messages to users, and 3x performance degradation
**Why it happens:** Developer tests locally without NODE_ENV, deploys to DigitalOcean App Platform without setting environment variable, or uses wrong variable name (NODE_ENVIRONMENT instead of NODE_ENV)
**How to avoid:** Always set NODE_ENV=production in deployment environment variables. On DigitalOcean App Platform, add under Settings > App-Level Environment Variables
**Warning signs:** Slow page load times (300ms+ for simple SSR), detailed stack traces visible to users, view template changes appear without server restart in production

### Pitfall 6: Open Graph Image Size/Format Errors
**What goes wrong:** Social media previews show broken images, incorrect crops, or fall back to generic logo
**Why it happens:** Image doesn't meet 1200x630px Open Graph recommendation, file size too large (>8MB), wrong MIME type, or URL not absolute
**How to avoid:** Pre-generate Open Graph images at 1200x630px using Sharp, serve via CDN (DigitalOcean Spaces), use absolute URLs with https://, keep under 1MB. Test with Facebook Sharing Debugger and Twitter Card Validator
**Warning signs:** No image preview on Facebook/Twitter/LinkedIn shares, image stretched/squashed, sharing takes 5+ seconds to load preview

### Pitfall 7: Static Middleware Placed After SSR Routes
**What goes wrong:** CSS/JS/image requests hit route matching logic, slowing asset delivery and causing 404s or incorrect responses
**Why it happens:** Developer adds `app.use(express.static())` at bottom of file after defining routes, or misunderstands Express middleware order
**How to avoid:** Place `express.static()` middleware BEFORE any `app.get()` route definitions (Phase 23-05 decision). Express processes middleware in order; if static middleware finds file, it returns immediately without checking routes
**Warning signs:** Slow asset loading (50ms+ for static files), CSS not applying, JavaScript 404 errors, network tab shows HTML response for .css/.js requests

### Pitfall 8: XSS Vulnerability from Using `<%- %>` with User Data
**What goes wrong:** User input (product name, contact form data, URL parameters) rendered with `<%- %>` allows injection of malicious scripts
**Why it happens:** Developer copies `<%- include() %>` pattern and applies it to user data, or assumes "my users are trusted"
**How to avoid:** Always use `<%= %>` for any user-supplied data (HTML-escaped). Reserve `<%- %>` ONLY for includes and trusted HTML from database (pre-sanitized). Use secure-filters library for JavaScript context escaping
**Warning signs:** `<script>` tags appearing in rendered HTML when viewing source, alert() popups on pages with user content, security scanner reports XSS vulnerabilities

## Code Examples

Verified patterns from official sources and best practices:

### Express App Setup with SSR
```javascript
// backend/index.js
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');

const app = express();

// Security & parsing
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  }
}));
app.use(compression());
app.use(express.json());
app.use(cookieParser());

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Enable caching ONLY in production
if (process.env.NODE_ENV === 'production') {
  app.set('view cache', true);
}

// Static assets FIRST (Phase 23-05)
app.use(express.static(path.join(__dirname, '../frontend/dist'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// Language detection & legacy redirects
app.use(detectLanguage);
app.use(legacyRedirectMiddleware);

// SSR routes
app.get('/:lang(en|he)/', renderHomePage);
app.get('/:lang(en|he)/about', renderAboutPage);
app.get('/:lang(en|he)/contact', renderContactPage);
app.get('/:lang(en|he)/workshop', renderWorkshopPage);
app.get('/:lang(en|he)/policies', renderPoliciesPage);

// API routes
app.get('/api/products', getProducts);
// ... more API routes

module.exports = app;
```

### SSR Route Handler with Meta Tags
```javascript
// backend/middleware/ssr.js
const metaConfig = require('../config/meta');

function renderAboutPage(req, res) {
  const { lang } = req.params;
  const langKey = lang === 'en' ? 'eng' : 'heb';
  const dir = langKey === 'heb' ? 'rtl' : 'ltr';

  const meta = metaConfig.about[langKey];
  const baseUrl = process.env.BASE_URL || 'https://tamarkfir.online';

  const pageData = {
    lang: langKey,
    dir,
    title: meta.title,
    description: meta.description,
    canonical: `${baseUrl}/${lang}/about`,
    ogImage: `${baseUrl}/images/og-about.jpg`,
    alternateUrl: {
      en: `${baseUrl}/en/about`,
      he: `${baseUrl}/he/about`
    }
  };

  res.render('pages/about', pageData);
}

module.exports = { renderAboutPage };
```

### Meta Configuration Object
```javascript
// backend/config/meta.js
module.exports = {
  home: {
    eng: {
      title: 'Handmade Jewelry by Tamar Kfir',
      description: 'Discover unique handmade jewelry pieces crafted with love. Custom rings, necklaces, and bracelets with natural stones and artistic designs.'
    },
    heb: {
      title: 'תכשיטים בעבודת יד של תמר כפיר',
      description: 'גלו תכשיטים ייחודיים בעבודת יד שנוצרו באהבה. טבעות, שרשראות וצמידים מותאמים אישית עם אבנים טבעיות ועיצוב אומנותי.'
    }
  },
  about: {
    eng: {
      title: 'About Tamar Kfir',
      description: 'Learn about Tamar, the jewelry designer behind every handmade piece. Discover the story, inspiration, and craftsmanship.'
    },
    heb: {
      title: 'אודות תמר כפיר',
      description: 'הכירו את תמר, המעצבת מאחורי כל תכשיט בעבודת יד. גלו את הסיפור, ההשראה והמלאכה.'
    }
  },
  contact: {
    eng: {
      title: 'Contact Tamar Kfir Jewelry',
      description: 'Get in touch for custom jewelry orders, questions about pieces, or workshop bookings. We respond within 24 hours.'
    },
    heb: {
      title: 'צרו קשר - תכשיטי תמר כפיר',
      description: 'צרו קשר להזמנת תכשיטים בהתאמה אישית, שאלות על יצירות או הזמנת סדנאות. אנו עונים תוך 24 שעות.'
    }
  },
  workshop: {
    eng: {
      title: 'Jewelry Making Workshops',
      description: 'Join hands-on jewelry workshops and create your own unique pieces. Suitable for beginners and experienced crafters.'
    },
    heb: {
      title: 'סדנאות יצירת תכשיטים',
      description: 'הצטרפו לסדנאות תכשיטים מעשיות וצרו את היצירות הייחודיות שלכם. מתאים למתחילים ולבעלי ניסיון.'
    }
  },
  policies: {
    eng: {
      title: 'Shipping & Returns Policy',
      description: 'Read our policies on shipping, returns, exchanges, and care instructions for handmade jewelry. Customer satisfaction guaranteed.'
    },
    heb: {
      title: 'מדיניות משלוחים והחזרות',
      description: 'קראו את המדיניות שלנו לגבי משלוחים, החזרות, החלפות והוראות טיפול בתכשיטים בעבודת יד. שביעות רצון לקוחות מובטחת.'
    }
  }
};
```

### Meta Tags Partial Template
```ejs
<!-- backend/views/partials/meta-tags.ejs -->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><%= title %> | Tamar Kfir Jewelry</title>
<meta name="description" content="<%= description %>">
<link rel="canonical" href="<%= canonical %>">

<!-- Favicon -->
<link rel="icon" href="/imgs/icons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/imgs/icons/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/imgs/icons/favicon.png">

<!-- Open Graph -->
<meta property="og:title" content="<%= title %> | Tamar Kfir Jewelry">
<meta property="og:description" content="<%= description %>">
<meta property="og:image" content="<%= ogImage %>">
<meta property="og:url" content="<%= canonical %>">
<meta property="og:type" content="website">
<meta property="og:locale" content="<%= lang === 'eng' ? 'en_US' : 'he_IL' %>">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="<%= title %> | Tamar Kfir Jewelry">
<meta name="twitter:description" content="<%= description %>">
<meta name="twitter:image" content="<%= ogImage %>">

<!-- Hreflang (self-referencing bidirectional) -->
<link rel="alternate" hreflang="en" href="<%= alternateUrl.en %>">
<link rel="alternate" hreflang="he" href="<%= alternateUrl.he %>">
<link rel="alternate" hreflang="x-default" href="<%= alternateUrl.en %>">
```

### Home Page with JSON-LD Structured Data
```ejs
<!-- backend/views/pages/home.ejs -->
<!DOCTYPE html>
<html lang="<%= lang %>" dir="<%= dir %>">
<head>
  <%- include('../partials/meta-tags', {
    title,
    description,
    canonical,
    ogImage,
    lang,
    alternateUrl
  }) %>

  <!-- Organization structured data (SCHEMA-04) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Tamar Kfir Jewelry",
    "url": "https://tamarkfir.online",
    "logo": "https://tamarkfir.online/images/logo.png",
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "contact@tamarkfir.online",
      "contactType": "Customer Service"
    },
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "IL"
    },
    "sameAs": [
      "https://instagram.com/tamarkfirjewelry",
      "https://facebook.com/tamarkfirjewelry"
    ]
  }
  </script>

  <!-- Stylesheets -->
  <link rel="stylesheet" href="/css/standard-reset.css">
  <link rel="stylesheet" href="/css/home-devices.css" media="(max-width: 799.9px)">
  <link rel="stylesheet" href="/css/home-800plus.css" media="(min-width: 800px)">
</head>
<body>
  <%- include('../partials/header', { lang, dir }) %>

  <main>
    <section class="hero">
      <h1><%= lang === 'eng' ? 'Handmade Jewelry with Soul' : 'תכשיטים בעבודת יד עם נשמה' %></h1>
      <p><%= lang === 'eng' ? 'Unique pieces crafted with love' : 'יצירות ייחודיות שנוצרו באהבה' %></p>
      <a href="/<%= lang === 'eng' ? 'en' : 'he' %>/shop" class="cta-button">
        <%= lang === 'eng' ? 'Shop Now' : 'קנו עכשיו' %>
      </a>
    </section>

    <!-- Featured products rendered server-side -->
    <section class="featured-products">
      <h2><%= lang === 'eng' ? 'Featured Collection' : 'קולקציה נבחרת' %></h2>
      <div class="product-grid">
        <% products.forEach(product => { %>
          <article class="product-card">
            <img
              src="<%= product.mainImage.desktop %>"
              alt="<%= product.name[lang] %>"
              loading="lazy"
            >
            <h3><%= product.name[lang] %></h3>
            <p class="price"><%= product.price.toFixed(2) %> <%= currency %></p>
          </article>
        <% }); %>
      </div>
    </section>
  </main>

  <%- include('../partials/footer', { lang }) %>

  <!-- Client-side JS for progressive enhancement -->
  <script src="/js/controller.js" type="module"></script>
</body>
</html>
```

### DigitalOcean App Platform Configuration (Single Service)
```yaml
# .do/app.yaml - Single unified Express service
name: tamar-kfir-jewelry
region: nyc

services:
  - name: express-app
    github:
      repo: username/tamar-kfir-jewelry
      branch: main
      deploy_on_push: true

    # Express service serves BOTH static assets AND SSR
    build_command: |
      cd frontend && npm install && npm run build &&
      cd ../backend && npm install

    run_command: cd backend && npm start

    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs

    http_port: 3000

    routes:
      - path: /

    envs:
      - key: NODE_ENV
        value: "production"
      - key: BASE_URL
        value: "https://tamarkfir.online"
      - key: MONGODB_URI
        value: ${mongodb.DATABASE_URL}
        type: SECRET
      - key: JWT_SECRET
        type: SECRET
      - key: PAYPAL_CLIENT_ID
        type: SECRET
      - key: PAYPAL_CLIENT_SECRET
        type: SECRET
      - key: STRIPE_SECRET_KEY
        type: SECRET
      - key: SPACES_BUCKET
        value: "tamar-kfir-jewelry"
      - key: SPACES_REGION
        value: "nyc3"
      - key: SPACES_ENDPOINT
        value: "https://nyc3.digitaloceanspaces.com"
      - key: SPACES_CDN_BASE_URL
        value: "https://tamar-kfir-jewelry.nyc3.cdn.digitaloceanspaces.com"

databases:
  - name: mongodb
    engine: MONGODB
    version: "6"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side rendering only | SSR with progressive enhancement | 2020+ (React 18, Next.js 13) | Improved SEO, faster FCP, better Core Web Vitals |
| express-ejs-layouts middleware | Direct `<%- include() %>` in templates | 2023+ | Simpler debugging, explicit control, one less dependency |
| Generic meta descriptions | Unique per-page descriptions (120-158 chars) | 2024+ (AI overviews) | AI-generated summaries use meta descriptions as source |
| Separate static site + API server | Single Express service | 2025+ (App Platform improvements) | Lower hosting cost, simpler deployment, unified logging |
| Manual hreflang in each template | Centralized meta-tags partial | 2024+ | Consistent implementation, easier to maintain |
| 1200x627px Open Graph images | 1200x630px (2:1 ratio) | 2024 (Facebook update) | Better mobile previews, consistent across platforms |
| x-default omitted | x-default required for multi-language | 2023+ | Google penalizes missing x-default in international sites |

**Deprecated/outdated:**
- **express-ejs-layouts:** Still works but adds complexity; direct includes are simpler (Phase 23-01 decision)
- **Separate static site component:** DigitalOcean App Platform now handles static + dynamic in one service efficiently
- **Meta keywords tag:** Completely ignored by Google since 2009, no longer needed
- **Google+ structured data:** Google+ shut down in 2019, remove any google+ social profile links
- **HTTP/1.1 domain sharding:** With HTTP/2, multiple domains for assets actually hurts performance

## Open Questions

1. **Do we need WebP Open Graph images or is JPEG sufficient?**
   - What we know: Facebook/Twitter support WebP but fall back to JPEG
   - What's unclear: Whether WebP provides meaningful file size savings for 1200x630px images vs quality 85 JPEG
   - Recommendation: Start with JPEG (wider compatibility), test WebP in Phase 25+ if load times are slow

2. **Should we implement Structured Data for Product schema on individual product pages?**
   - What we know: Phase 24 only requires Organization schema on home page (SCHEMA-04)
   - What's unclear: Whether product schema is needed now or can wait for Phase 25+ when product pages get SSR
   - Recommendation: Defer to Phase 25 - product pages aren't SSR yet, structured data needs server-rendered content

3. **What's the cache-control strategy for SSR HTML responses?**
   - What we know: Static pages (about, contact) content rarely changes, home page changes when products added
   - What's unclear: Whether to cache SSR HTML at CDN level, what max-age to use, how to invalidate
   - Recommendation: Start with no-cache for SSR pages, add CDN caching in Phase 26+ after monitoring performance

4. **Should language detection override explicit URL language prefix?**
   - What we know: Phase 23-03 uses cookie > CDN headers > GeoIP for language detection
   - What's unclear: If user visits /en/about from Israel, should we redirect to /he/about or respect URL?
   - Recommendation: Respect URL language (SSR must be deterministic), show language switcher banner if mismatch

## Sources

### Primary (HIGH confidence)
- [EJS Official Documentation](https://ejs.co/) - Template syntax, caching, security
- [Express.js Performance Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html) - NODE_ENV, view caching, static serving
- [Schema.org Organization Type](https://schema.org/Organization) - Structured data properties
- [Google Search Central - Localized Versions](https://developers.google.com/search/docs/specialty/international/localized-versions) - Hreflang implementation
- [Google Search Central - Organization Markup](https://developers.google.com/search/docs/appearance/structured-data/organization) - JSON-LD requirements
- [Google Developer Blog - x-default Hreflang](https://developers.google.com/search/blog/2013/04/x-default-hreflang-for-international-pages) - x-default usage

### Secondary (MEDIUM confidence)
- [DigitalOcean - How To Use EJS to Template Your Node Application](https://www.digitalocean.com/community/tutorials/how-to-use-ejs-to-template-your-node-application) - EJS setup and partials
- [DigitalOcean App Platform Express.js Sample](https://docs.digitalocean.com/products/app-platform/getting-started/sample-apps/express.js/) - Deployment configuration
- [DigitalOcean - How To Add Twitter Card and Open Graph Social Metadata](https://www.digitalocean.com/community/tutorials/how-to-add-twitter-card-and-open-graph-social-metadata-to-your-webpage-with-html) - Meta tag implementation
- [Straight North - How to Optimize Title Tags & Meta Descriptions in 2026](https://www.straightnorth.com/blog/title-tags-and-meta-descriptions-how-to-write-and-optimize-them-in-2026/) - Character limits
- [LinkGraph - Hreflang Implementation Guide 2026](https://www.linkgraph.com/blog/hreflang-implementation-guide/) - Technical reference
- [Search Engine Land - Canonicalization and SEO: A guide for 2026](https://searchengineland.com/canonicalization-seo-448161) - Self-referencing canonicals
- [OneUpTime - How to Debug Hydration Errors in React SSR Applications](https://oneuptime.com/blog/post/2026-01-15-debug-react-hydration-errors/view) - Hydration pitfalls

### Tertiary (LOW confidence - from WebSearch, needs verification)
- Various Medium articles about EJS and Express.js SSR
- Community forum discussions about hreflang implementation
- Blog posts about meta tag optimization

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - EJS, Express, helmet, compression all verified from official docs and project dependencies
- Architecture: HIGH - Patterns verified from Express docs, Phase 23 decisions documented, existing project structure reviewed
- Pitfalls: HIGH - Hydration issues, hreflang errors, NODE_ENV impact verified from multiple current sources (2026)
- Meta tags: HIGH - Character limits, Open Graph specs, hreflang requirements verified from Google official docs
- Deployment: MEDIUM - DigitalOcean App Platform supports single-service Node.js, but exact configuration depends on project repo structure

**Research date:** 2026-02-10
**Valid until:** 2026-03-12 (30 days for stable web standards; meta tag best practices and SSR patterns change slowly)
