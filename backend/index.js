// Skip dotenv in test environment (tests set env vars directly)
if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config();
}
const express = require('express');
const multer = require('multer');
const path = require('path');
const { connectDb } = require('./config/db');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const fs = require('fs');
const { resolveRequestLocale } = require('./config/locale');
const exchangeRateService = require('./services/exchangeRateService');
const {
  startExchangeRateJob,
} = require('./jobs/exchangeRateJob');
const { startBackupJob } = require('./jobs/backupJob');
const { detectLanguage, languageMiddleware, trailingSlashRedirect } = require('./middleware/language');
const { legacyRedirectMiddleware } = require('./middleware/legacy');
const {
  renderHomePage,
  renderAboutPage,
  renderContactPage,
  renderWorkshopPage,
  renderPoliciesPage,
} = require('./routes/ssr');
const { renderCategoryPage, renderProductPage, renderCartPage } = require('./routes/ssrDynamic');
const { serveSitemap } = require('./routes/sitemap');
const backupRoutes = require('./routes/backup');
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/cart');
const paymentRoutes = require('./routes/payments');
const productRoutes = require('./routes/products');
const { router: adminRoutes } = require('./routes/admin');
const { cacheMiddleware } = require('./middleware/cacheMiddleware');
const { agentLog } = require('./utils/agentLog');
const { toOrigin, toAbsoluteApiUrl } = require('./utils/urlHelpers');
const {
  uploadsDir,
  smallImagesDir,
  publicUploadsDir,
  publicSmallImagesDir,
  noImageSvgPath,
  validateImageFilename,
  safeResolveUnder,
} = require('./utils/imageHelpers');

// PayPal config moved to routes/payments.js

// DigitalOcean Spaces client extracted to utils/spaces.js


// =============================================
// Initial Setup & Configuration
// =============================================
const app = express();

// Configure EJS view engine for server-side rendering
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
if (process.env.NODE_ENV === 'production') {
  app.set('view cache', true);
}

// Extract Parcel bundle script tags from dist/index.html for EJS templates
// Parcel outputs content-hashed filenames, so we read them dynamically at startup
let bundleScripts = '';
const distIndexPaths = [
  path.join(__dirname, 'public', 'index.html'),      // DO production (copied by build)
  path.join(__dirname, '..', 'frontend', 'dist', 'index.html'), // Local development
];
for (const distPath of distIndexPaths) {
  if (fs.existsSync(distPath)) {
    const distHtml = fs.readFileSync(distPath, 'utf-8');
    const importMapMatch = distHtml.match(/<script type="importmap">[\s\S]*?<\/script>/);
    const bundleMatch = distHtml.match(/<script type="module" src="[^"]*" defer(?:="")?\s*><\/script>/);
    const nomoduleMatch = distHtml.match(/<script src="[^"]*" defer(?:="")? nomodule\s*><\/script>/);
    bundleScripts = (importMapMatch ? importMapMatch[0] : '') + (bundleMatch ? bundleMatch[0] : '') + (nomoduleMatch ? nomoduleMatch[0] : '');
    break;
  }
}
// Make bundleScripts available to all EJS templates
app.locals.bundleScripts = bundleScripts;

// #region agent log
// Request-level probe for upload/addproduct issues (CORS/network vs route failures)
app.use((req, res, next) => {
  try {
    if (req.path === '/upload' || req.path === '/addproduct') {
      agentLog('C', 'backend/index.js:probe', 'incoming', {
        path: req.path,
        method: req.method,
        origin: req.headers.origin || null,
        host: req.headers.host || null,
        acrMethod: req.headers['access-control-request-method'] || null,
        acrHeaders: req.headers['access-control-request-headers'] || null,
        hasAuthHeader: typeof req.headers.authorization === 'string',
        hasAuthTokenHeader: typeof req.headers['auth-token'] === 'string',
      });
      res.on('finish', () => {
        agentLog('C', 'backend/index.js:probe:finish', 'outgoing', {
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
        });
      });
      res.on('close', () => {
        agentLog('C', 'backend/index.js:probe:close', 'connection closed', {
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          writableEnded: res.writableEnded,
        });
      });
      req.on('aborted', () => {
        agentLog('C', 'backend/index.js:probe:aborted', 'request aborted', {
          path: req.path,
          method: req.method,
        });
      });
    }
  } catch {
    // ignore
  }
  next();
});
// #endregion

// =============================================
// Basic request hardening
// =============================================
app.set('trust proxy', 1); // required on DO / reverse proxies for correct client IP in rate limiting

// Rate limiters moved to route modules (auth.js, payments.js, admin.js)

// Basic security headers (API-oriented)
app.use(
  helmet({
    // This is an API + static assets server, not an HTML app
    contentSecurityPolicy: false,
    // We serve images to other origins (e.g. admin subdomain). We'll control CORP/CORS on those routes.
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// URL helpers extracted to utils/urlHelpers.js
// Image helpers extracted to utils/imageHelpers.js

// =============================================
// CORS (single source of truth)
// =============================================
// toOrigin imported from utils/urlHelpers.js
const isProd = process.env.NODE_ENV === 'production';
const allowedOriginList = [
  toOrigin(process.env.HOST),
  toOrigin(process.env.ADMIN_URL),
  toOrigin(process.env.FULLHOST),
  toOrigin(process.env.API_URL), // if API_URL includes /api, we still capture the origin
  // Local/dev
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://localhost:1234',
].filter(Boolean);

const allowedOriginsSet = new Set(allowedOriginList);

if (!isProd) console.log('Allowed origins:', [...allowedOriginsSet]);

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser clients (no Origin header)
    if (!origin) return callback(null, true);

    const normalized = toOrigin(origin);
    // In development, allow any localhost/127.0.0.1 port (Live Server ports vary)
    if (
      !isProd &&
      typeof normalized === 'string' &&
      /^http:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(normalized)
    ) {
      return callback(null, true);
    }

    const allowed = normalized && allowedOriginsSet.has(normalized);

    if (!allowed) {
      if (!isProd) console.warn('Origin not allowed by CORS:', origin);
      return callback(new Error('Not allowed by CORS'));
    }

    return callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 204,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'auth-token',
    'X-Requested-With',
  ],
};

app.use(cors(corsOptions));
app.use(cookieParser());

// Strip /api prefix so frontend calls like /api/orders hit /orders
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    req.url = req.url.replace(/^\/api/, '');
  }
  next();
});

app.use(trailingSlashRedirect);

// Legacy .html redirects (must be before SSR routes)
app.use(legacyRedirectMiddleware);

app.use(mongoSanitize());
app.use(express.urlencoded({ extended: false }));
app.use(
  express.json({
    limit: '50mb',
    verify: (req, res, buf) => {
      // Stripe requires the exact raw bytes for webhook signature verification.
      // Capture the raw body before JSON parsing mutates it.
      const url = typeof req.originalUrl === 'string' ? req.originalUrl : '';
      const pathname = url.split('?')[0];
      if (pathname === '/webhook') {
        req.rawBody = buf;
      }
    },
  })
);

// =============================================
// Database Models
// =============================================
// Initialize exchange rate on database connection
async function initializeExchangeRate() {
  try {
    if (!isProd) console.log('Initializing exchange rate...');
    // Check if we have a stored rate
    const storedRate = await exchangeRateService.getStoredRate();
    const isStale = await exchangeRateService.isRateStale(24);

    if (!storedRate || isStale) {
      // Fetch fresh rate from API
      if (!isProd) console.log('Fetching current exchange rate from API...');
      try {
        const { rate, source } = await exchangeRateService.fetchCurrentRate();
        await exchangeRateService.updateRate(rate, source);
        if (!isProd) console.log(`✓ Exchange rate initialized: ${rate} (source: ${source})`);
      } catch (error) {
        console.warn(
          'Failed to fetch exchange rate from API, using fallback:',
          error.message
        );
        // Will use fallback from getExchangeRate
        const fallbackRate = await exchangeRateService.getExchangeRate();
        if (!isProd) console.log(`✓ Using fallback exchange rate: ${fallbackRate}`);
      }
    } else {
      if (!isProd) console.log(`✓ Using stored exchange rate: ${storedRate}`);
    }

    // Start the daily job
    startExchangeRateJob();
  } catch (error) {
    console.error('Error initializing exchange rate:', error.message);
    // Still start the job even if initialization fails
    startExchangeRateJob();
  }
}

// =============================================
// Backup Binary Verification (Phase 33)
// =============================================
// Scheduling decision (D-01): Use in-process node-cron for backup scheduling,
// consistent with exchangeRateJob.js pattern. No separate worker or App Platform
// Scheduled Job needed.
// Concurrency (D-02): No distributed lock needed — single App Platform instance.

// verifyMongodumpBinary is extracted to utils/backupBinaryCheck.js for testability (Phase 33, Plan 02).
const { verifyMongodumpBinary } = require('./utils/backupBinaryCheck');

// Skip database connection in test environment (setup.js handles it)
if (process.env.NODE_ENV !== 'test') {
  connectDb()
    .then(() => {
      // Initialize exchange rate after database connection
      initializeExchangeRate();
      // Verify backup binaries are available (Phase 33, D-06)
      verifyMongodumpBinary();
      // Start daily backup cron job (Phase 34, D-04)
      startBackupJob();
    })
    .catch(err => {
      console.error('MongoDB connection failed:', err?.message || err);
      process.exit(1);
    });
}

// File upload configuration extracted to routes/products.js
// Directory paths imported from utils/imageHelpers.js

// =============================================
// Static File Serving
// =============================================

// Ensure all directories exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  if (!isProd) console.log('Created uploads directory:', uploadsDir);
}

if (!fs.existsSync(smallImagesDir)) {
  fs.mkdirSync(smallImagesDir, { recursive: true });
  if (!isProd) console.log('Created smallImages directory:', smallImagesDir);
}

if (!fs.existsSync(publicUploadsDir)) {
  fs.mkdirSync(publicUploadsDir, { recursive: true });
  if (!isProd) console.log('Created public uploads directory:', publicUploadsDir);
}

if (!fs.existsSync(publicSmallImagesDir)) {
  fs.mkdirSync(publicSmallImagesDir, { recursive: true });
  if (!isProd) console.log('Created public smallImages directory:', publicSmallImagesDir);
}

// Enhanced static file serving options with better CORS support
const staticOptions = {
  setHeaders: (res, path) => {
    // Set long cache time for static assets
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    // Allow images to be embedded from other origins (e.g. frontend domain
    // consuming images from the API domain). CORS still controls who can
    // request these, but CORP is relaxed so browsers don't block them as
    // NotSameSite.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Set content type header based on file extension
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    }
  },
  maxAge: 31536000, // 1 year in seconds
};

// Static CORS: allow only known Origins (needed for <img crossorigin="anonymous">, canvas, etc.)
function applyStaticCors(req, res, next) {
  const origin = req.headers.origin;
  if (!origin) return next();
  const normalized = toOrigin(origin);
  // In development, allow any localhost/127.0.0.1 port (Live Server ports vary)
  if (
    !isProd &&
    typeof normalized === 'string' &&
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(normalized)
  ) {
    res.setHeader('Access-Control-Allow-Origin', normalized);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, Range');
    if (req.method === 'OPTIONS') return res.status(204).end();
    return next();
  }

  if (!normalized || !allowedOriginsSet.has(normalized)) return next();

  res.setHeader('Access-Control-Allow-Origin', normalized);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, Range');

  if (req.method === 'OPTIONS') return res.status(204).end();
  return next();
}

// Configure static file serving for all directories with custom middleware
app.use('/uploads', (req, res, next) => {
  if (!isProd) console.log(`[Static] Accessing: ${req.path} from uploads dir`);
  // #region agent log
  try {
    const raw = req.path || '';
    const reqFile = raw.startsWith('/') ? raw.slice(1) : raw;
    const ext = path.extname(reqFile).toLowerCase();
    if (ext) {
      const resolved = safeResolveUnder(uploadsDir, reqFile);
      agentLog('B', 'backend/index.js:/uploads', 'static request', {
        reqPath: raw,
        ext,
        resolvedOk: !!resolved,
        exists: resolved ? fs.existsSync(resolved) : false,
      });

      // Serve a placeholder instead of 404 for missing images (prevents broken icons)
      if (resolved && !fs.existsSync(resolved)) {
        // If the file exists in the public uploads directory (but not private), serve it from there.
        const fallbackResolved = safeResolveUnder(publicUploadsDir, reqFile);
        if (fallbackResolved && fs.existsSync(fallbackResolved)) {
          agentLog(
            'B',
            'backend/index.js:/uploads:fallback-public',
            'missing in uploadsDir; serving from publicUploadsDir',
            { reqPath: raw }
          );
          applyStaticCors(req, res, () => {});
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          return res.status(200).sendFile(fallbackResolved);
        }
        agentLog(
          'B',
          'backend/index.js:/uploads:fallback',
          'missing upload file -> no-image',
          {
            reqPath: raw,
          }
        );
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        return res.status(200).type('image/svg+xml').sendFile(noImageSvgPath);
      }
    }
  } catch {
    // ignore
  }
  // #endregion
  applyStaticCors(req, res, () =>
    express.static(uploadsDir, staticOptions)(req, res, next)
  );
});

app.use('/api/uploads', (req, res, next) => {
  if (!isProd) console.log(`[Static] Accessing: ${req.path} from api/uploads`);
  // #region agent log
  try {
    const raw = req.path || '';
    const reqFile = raw.startsWith('/') ? raw.slice(1) : raw;
    const ext = path.extname(reqFile).toLowerCase();
    if (ext) {
      const resolved = safeResolveUnder(uploadsDir, reqFile);
      agentLog('B', 'backend/index.js:/api/uploads', 'static request', {
        reqPath: raw,
        ext,
        resolvedOk: !!resolved,
        exists: resolved ? fs.existsSync(resolved) : false,
      });

      if (resolved && !fs.existsSync(resolved)) {
        const fallbackResolved = safeResolveUnder(publicUploadsDir, reqFile);
        if (fallbackResolved && fs.existsSync(fallbackResolved)) {
          agentLog(
            'B',
            'backend/index.js:/api/uploads:fallback-public',
            'missing in uploadsDir; serving from publicUploadsDir',
            { reqPath: raw }
          );
          applyStaticCors(req, res, () => {});
          res.setHeader(
            'Cross-Origin-Resource-Policy',
            isProd ? 'same-site' : 'cross-origin'
          );
          return res.status(200).sendFile(fallbackResolved);
        }
        agentLog(
          'B',
          'backend/index.js:/api/uploads:fallback',
          'missing upload file -> no-image',
          { reqPath: raw }
        );
        res.setHeader(
          'Cross-Origin-Resource-Policy',
          isProd ? 'same-site' : 'cross-origin'
        );
        return res.status(200).type('image/svg+xml').sendFile(noImageSvgPath);
      }
    }
  } catch {
    // ignore
  }
  // #endregion
  applyStaticCors(req, res, () =>
    express.static(uploadsDir, staticOptions)(req, res, next)
  );
});

app.use('/api/smallImages', (req, res, next) => {
  if (!isProd)
    console.log(`[Static] Accessing: ${req.path} from api/smallImages`);
  applyStaticCors(req, res, () =>
    express.static(smallImagesDir, staticOptions)(req, res, next)
  );
});

app.use('/smallImages', (req, res, next) => {
  applyStaticCors(req, res, () =>
    express.static(smallImagesDir, staticOptions)(req, res, next)
  );
});

// Add public directory routes
app.use('/public/uploads', (req, res, next) => {
  applyStaticCors(req, res, () =>
    express.static(publicUploadsDir, staticOptions)(req, res, next)
  );
});
app.use('/api/public/uploads', (req, res, next) => {
  applyStaticCors(req, res, () =>
    express.static(publicUploadsDir, staticOptions)(req, res, next)
  );
});
app.use('/public/smallImages', (req, res, next) => {
  applyStaticCors(req, res, () =>
    express.static(publicSmallImagesDir, staticOptions)(req, res, next)
  );
});
app.use('/api/public/smallImages', (req, res, next) => {
  applyStaticCors(req, res, () =>
    express.static(publicSmallImagesDir, staticOptions)(req, res, next)
  );
});

// Also serve from root path
// Prefer backend's bundled images directory first (contains no-image.png)
app.use(
  '/images',
  express.static(path.join(__dirname, 'public/images'), staticOptions)
);
app.use(
  '/api/images',
  express.static(path.join(__dirname, 'public/images'), staticOptions)
);

app.use(
  '/images',
  express.static(path.join(__dirname, '../public/images'), staticOptions)
);
app.use(
  '/api/images',
  express.static(path.join(__dirname, '../public/images'), staticOptions)
);

// =============================================
// Frontend Static Assets
// =============================================
// Serve public assets (robots.txt, etc.)
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  index: false,  // Don't serve index.html from public/
  setHeaders: (res, filePath) => {
    // Ensure robots.txt is served with correct content type
    if (filePath.endsWith('robots.txt')) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    }
  }
}));

// Serve Parcel-built dist at /dist (legacy references)
app.use('/dist', express.static(path.join(__dirname, '..', 'frontend', 'dist'), {
  maxAge: '7d',
  immutable: true
}));

// Serve Parcel-built dist at root (Parcel outputs root-relative asset URLs)
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist'), {
  maxAge: '7d',
  index: false  // Don't serve index.html from dist
}));

// Serve frontend CSS (referenced by EJS templates as /css/...)
app.use('/css', express.static(path.join(__dirname, '..', 'frontend', 'css'), {
  maxAge: '7d'
}));

// Serve frontend images
app.use('/imgs', express.static(path.join(__dirname, '..', 'frontend', 'imgs'), {
  maxAge: '7d'
}));

// Serve favicon
app.use('/favicon.ico', express.static(path.join(__dirname, '..', 'frontend', 'favicon.ico')));

// =============================================
// Health & client config endpoints (dev-friendly)
// =============================================
// Used by the admin UI to auto-detect a working API base URL.
app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    status: 'healthy',
    env: process.env.NODE_ENV || 'development',
    port: process.env.SERVER_PORT || 4000,
    now: Date.now(),
  });
});


// Provide minimal, safe config to clients (no secrets).
app.get('/api/client-config', (req, res) => {
  res.status(200).json({
    ok: true,
    apiUrl: process.env.API_URL || null,
    host: process.env.HOST || null,
    env: process.env.NODE_ENV || 'development',
  });
});

// =============================================
// XML Sitemap for SEO
// =============================================
app.get('/sitemap.xml', serveSitemap);

// =============================================
// Root URL redirect — detect language and redirect to /en or /he
// =============================================
app.get('/', (req, res) => {
  const lang = detectLanguage(req);
  const currency = lang === 'he' ? 'ILS' : 'USD';

  // Set cookie for future visits (stores both lang and currency)
  if (!req.cookies.locale_pref) {
    res.cookie('locale_pref', JSON.stringify({ lang, currency }), {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: false,
      sameSite: 'lax'
    });
  }

  // 302 temporary redirect (user preference may change)
  res.redirect(302, `/${lang}`);
});

// =============================================
// Bilingual SSR routes
// =============================================
// SSR test route — validates EJS rendering pipeline
app.get('/:lang(en|he)/test', languageMiddleware, (req, res) => {
  res.render('pages/test', {
    lang: req.lang,
    dir: req.dir,
    title: req.lang === 'en' ? 'Test Page' : 'עמוד בדיקה',
    path: '/test',
  });
});

// Home page (matches /en and /he exactly)
app.get('/:lang(en|he)', languageMiddleware, cacheMiddleware(), renderHomePage);

// Static pages
app.get('/:lang(en|he)/about', languageMiddleware, cacheMiddleware(), renderAboutPage);
app.get('/:lang(en|he)/contact', languageMiddleware, cacheMiddleware(), renderContactPage);
app.get('/:lang(en|he)/workshop', languageMiddleware, cacheMiddleware(), renderWorkshopPage);
app.get('/:lang(en|he)/policies', languageMiddleware, cacheMiddleware(), renderPoliciesPage);

// Category pages (dynamic SSR with product grids)
app.get('/:lang(en|he)/:category(necklaces|crochet-necklaces|hoops|dangle|bracelets|unisex)', languageMiddleware, cacheMiddleware(), renderCategoryPage);

// Product detail pages (dynamic SSR with structured data)
app.get('/:lang(en|he)/product/:slug', languageMiddleware, cacheMiddleware(), renderProductPage);

// Cart page (SSR shell, content populated client-side)
app.get('/:lang(en|he)/cart', languageMiddleware, cacheMiddleware(), renderCartPage);

// =============================================
// Locale auto-detection (Israel => Hebrew/ILS, else English/USD)
// =============================================
function setLocalePrefCookie(res, locale) {
  try {
    // Persist only the minimum needed to avoid cookie bloat.
    const payload = JSON.stringify({ country: locale?.country || null });
    res.cookie('locale_pref', payload, {
      httpOnly: false, // readable by frontend if desired
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  } catch {
    // ignore
  }
}

app.get(['/api/locale', '/locale'], (req, res) => {
  const locale = resolveRequestLocale(req);
  setLocalePrefCookie(res, locale);
  res.status(200).json({ ok: true, ...locale });
});

// Direct file access route for debugging
app.get('/check-file/:filename', (req, res) => {
  if (isProd) {
    return res.status(404).send('Not Found');
  }

  const filename = req.params.filename;
  const validation = validateImageFilename(filename);
  if (!validation.ok) {
    return res.status(400).send(validation.error);
  }

  const filePath = safeResolveUnder(uploadsDir, filename);
  if (!filePath) {
    return res.status(400).send('Invalid filename');
  }

  fs.access(filePath, fs.constants.F_OK, accessErr => {
    if (accessErr) {
      if (!isProd)
        console.log(`File ${filename} does not exist in uploads directory`);
      res.status(404).send({
        exists: false,
        message: `File ${filename} not found`,
      });
    } else {
      if (!isProd) console.log(`File ${filename} exists in uploads directory`);
      fs.stat(filePath, (statErr, stats) => {
        if (statErr)
          return res.status(500).send({ exists: true, error: 'Stat failed' });
        res.send({
          exists: true,
          size: stats.size,
          url: toAbsoluteApiUrl(`/uploads/${filename}`),
        });
      });
    }
  });
});

// Direct image serving endpoint that bypasses static middleware
app.get('/direct-image/:filename', (req, res) => {
  const filename = req.params.filename;
  const validation = validateImageFilename(filename);
  if (!validation.ok) {
    return res.status(400).send('Invalid filename');
  }

  const filePath = safeResolveUnder(uploadsDir, filename);
  if (!filePath) {
    return res.status(400).send('Invalid filename');
  }

  // Apply allowlist-based CORS for cross-origin image access when needed
  applyStaticCors(req, res, () => {});

  // Allow images to be embedded across same-site subdomains in prod;
  // in dev, allow cross-origin for localhost/127.0.0.1 mixes.
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, err => {
    if (err) {
      if (!isProd) {
        console.log(`Direct image access: File ${filename} not found`);
      }
      return res.status(404).send('Image not found');
    }

    if (!isProd) console.log(`Direct image access: Serving ${filename}`);

    // Set content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg')
      res.setHeader('Content-Type', 'image/jpeg');
    else if (ext === '.png') res.setHeader('Content-Type', 'image/png');
    else if (ext === '.gif') res.setHeader('Content-Type', 'image/gif');
    else if (ext === '.webp') res.setHeader('Content-Type', 'image/webp');
    else return res.status(415).send('Unsupported media type');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', err => {
      console.error(`Error streaming file ${filename}:`, err);
      res.status(500).send('Error reading file');
    });

    fileStream.pipe(res);
  });
});

// Add options handler for the direct image endpoint
app.options('/direct-image/:filename', (req, res) => {
  return applyStaticCors(req, res, () => res.status(204).end());
});

// Payment processing extracted to routes/payments.js

// =============================================
// API Endpoints
// =============================================

// Auth routes extracted to routes/auth.js

// Product management, upload, and query routes extracted to routes/products.js
// =============================================
// Invalid language prefix redirect (e.g., /fr/about -> /en/about)
// =============================================
app.get('/:lang([a-z]{2})/*', (req, res) => {
  const restOfPath = req.params[0] || '';
  res.redirect(301, `/en/${restOfPath}`);
});
app.get('/:lang([a-z]{2})', (req, res) => {
  res.redirect(301, '/en');
});

// Extracted route modules
app.use(authRoutes);
app.use(cartRoutes);
app.use(paymentRoutes);
app.use(productRoutes);
app.use(adminRoutes);

// Phase 35: Backup management routes (manual trigger, listing)
app.use('/admin', backupRoutes);

// =============================================
// Error handling (must be after all routes)
// =============================================
// Multer error handler (keeps responses JSON and avoids default HTML errors)
app.use((err, req, res, next) => {
  if (err && err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      success: false,
      error: 'Upload failed',
      code: err.code,
      ...(isProd ? {} : { message: err.message }),
    });
  }
  if (
    err &&
    typeof err.message === 'string' &&
    err.message.includes('File type not supported')
  ) {
    return res.status(415).json({
      success: false,
      error: 'File type not supported',
    });
  }
  return next(err);
});

// Centralized error handler (final middleware)
// IMPORTANT: must have 4 args for Express to treat as an error-handling middleware
app.use((err, req, res, _next) => {
  void _next;
  const status = err && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const code = err && err.code ? String(err.code) : 'INTERNAL_ERROR';

  console.error('Unhandled error:', {
    status,
    code,
    path: req.originalUrl,
    method: req.method,
    message: err?.message,
  });

  // Extra signal for the specific dev issue (client reports `Failed to fetch`)
  try {
    if (req?.originalUrl === '/addproduct' || req?.path === '/addproduct') {
      agentLog(
        'A',
        'backend/index.js:error-handler',
        'unhandled error while handling /addproduct',
        {
          status,
          code,
          message: err?.message || null,
        }
      );
    }
  } catch {
    // ignore
  }

  return res.status(status).json({
    success: false,
    error: 'Request failed',
    code,
    ...(isProd ? {} : { message: err?.message }),
  });
});

// =============================================
// Server Initialization
// =============================================
// Don't start server in test environment (supertest will handle requests)
if (process.env.NODE_ENV !== 'test') {
  app.listen(process.env.SERVER_PORT || 4000, error => {
    if (!error) {
      if (!isProd) console.log('Server Running on Port ' + (process.env.SERVER_PORT || 4000));
      if (process.env.NODE_ENV !== 'production') {
        console.log('Environment Variables (dev):');
        console.log('  API_URL:', process.env.API_URL);
        console.log('  HOST:', process.env.HOST);
        console.log('  NODE_ENV:', process.env.NODE_ENV);
      }

      // #region agent log
      agentLog('A', 'backend/index.js:app.listen', 'server started', {
        port: process.env.SERVER_PORT || 4000,
        hasApiUrl: !!process.env.API_URL,
        apiUrlPrefix:
          typeof process.env.API_URL === 'string'
            ? process.env.API_URL.slice(0, 60)
            : null,
        nodeEnv: process.env.NODE_ENV || null,
      });
      // #endregion
    } else {
      if (!isProd) console.log('Error : ' + error);
    }
  });
}

// Image processing extracted to utils/imageHelpers.js

// Export app for testing (without starting server)
module.exports = { app };
