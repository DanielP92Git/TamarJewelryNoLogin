require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const { connectDb } = require('./config/db');
const { Users, Product, Settings } = require('./models');
const {
  getTokenFromRequest,
  authUser,
  fetchUser,
  requireAdmin,
} = require('./middleware/auth');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const sharp = require('sharp');
const AWS = require('aws-sdk');
const { resolveRequestLocale } = require('./config/locale');
const exchangeRateService = require('./services/exchangeRateService');
const {
  startExchangeRateJob,
  runExchangeRateUpdate,
} = require('./jobs/exchangeRateJob');

// #region agent log
function agentLog(hypothesisId, location, message, data) {
  try {
    const payload = {
      sessionId: 'debug-session',
      runId: process.env.DEBUG_RUN_ID || 'pre-fix',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    };
    const url =
      'http://127.0.0.1:7243/ingest/eb432dfa-49d6-4ed3-b785-ea960658995f';
    const body = JSON.stringify(payload);

    // Prefer fetch when available (Node 18+)
    if (typeof globalThis.fetch === 'function') {
      globalThis
        .fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        })
        .catch(() => {});
      return;
    }

    // Fallback for older Node versions without global fetch
    const http = require('http');
    const req = http.request(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      () => {}
    );
    req.on('error', () => {});
    req.write(body);
    req.end();
  } catch {
    // ignore
  }
}
// #endregion

const PAYPAL_CLIENT_ID = (process.env.PAYPAL_CLIENT_ID || '').trim();
const PAYPAL_CLIENT_SECRET = (process.env.PAYPAL_CLIENT_SECRET || '').trim();
const baseUrl = (
  process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com'
)
  .trim()
  .replace(/\/+$/, '');

// =============================================
// DigitalOcean Spaces (S3-compatible) client
// =============================================
const isProdEnv = process.env.NODE_ENV === 'production';
const SPACES_BUCKET = process.env.SPACES_BUCKET || null;
const SPACES_REGION = process.env.SPACES_REGION || null;
const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT || null; // e.g. https://fra1.digitaloceanspaces.com
const SPACES_CDN_BASE_URL = process.env.SPACES_CDN_BASE_URL || null; // optional

function normalizeBaseUrl(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed || null;
}

function getSpacesPublicBaseUrl() {
  // Prefer CDN base if provided; otherwise use the standard Spaces virtual-host URL
  const cdn = normalizeBaseUrl(SPACES_CDN_BASE_URL);
  if (cdn) return cdn;

  if (SPACES_BUCKET && SPACES_REGION) {
    // https://<bucket>.<region>.digitaloceanspaces.com
    return `https://${SPACES_BUCKET}.${SPACES_REGION}.digitaloceanspaces.com`;
  }

  // Fallback to endpoint + bucket (path-style). Works but CDN/virtual-host is preferred.
  const ep = normalizeBaseUrl(SPACES_ENDPOINT);
  if (ep && SPACES_BUCKET) return `${ep}/${SPACES_BUCKET}`;
  return null;
}

const spacesPublicBaseUrl = getSpacesPublicBaseUrl();

const s3 =
  SPACES_ENDPOINT && process.env.SPACES_KEY && process.env.SPACES_SECRET
    ? new AWS.S3({
        endpoint: new AWS.Endpoint(SPACES_ENDPOINT),
        accessKeyId: process.env.SPACES_KEY,
        secretAccessKey: process.env.SPACES_SECRET,
        region: SPACES_REGION || undefined,
      })
    : null;

async function uploadFileToSpaces(key, filePath, contentType) {
  // In dev/local, allow running without Spaces configured.
  // In production, Spaces must be configured (App Platform filesystem is ephemeral).
  if (!s3 || !SPACES_BUCKET || !spacesPublicBaseUrl) {
    if (!isProdEnv) return null;
    const err = new Error('SPACES_NOT_CONFIGURED');
    err.code = 'SPACES_NOT_CONFIGURED';
    err.statusCode = 500;
    throw err;
  }

  const body = fs.createReadStream(filePath);

  await s3
    .upload({
      Bucket: SPACES_BUCKET,
      Key: key,
      Body: body,
      ACL: 'public-read',
      ContentType: contentType || 'application/octet-stream',
    })
    .promise();

  return `${spacesPublicBaseUrl}/${key}`;
}

// Log PayPal configuration for debugging (dev only; avoid leaking in prod)
if (process.env.NODE_ENV !== 'production') {
  console.log('PayPal Configuration:');
  console.log('  API URL:', baseUrl);
  console.log('  Client ID exists:', !!PAYPAL_CLIENT_ID);
  console.log('  Client Secret exists:', !!PAYPAL_CLIENT_SECRET);
}

// =============================================
// Initial Setup & Configuration
// =============================================
const app = express();

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

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15m
  limit: Number(process.env.RATE_LIMIT_AUTH_MAX || 20), // per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
});

const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15m
  limit: Number(process.env.RATE_LIMIT_PAYMENT_MAX || 60),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
});

// Admin-heavy endpoints (uploads/product management)
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15m
  limit: Number(process.env.RATE_LIMIT_ADMIN_MAX || 120),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
});

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

// =============================================
// URL helpers (store relative paths in DB; return absolute URLs to clients)
// =============================================
function isAbsoluteHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function joinUrl(base, pathname) {
  if (!base || typeof base !== 'string') return pathname;
  if (!pathname || typeof pathname !== 'string') return pathname;
  const b = base.replace(/\/+$/, '');
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${b}${p}`;
}

function toAbsoluteApiUrl(value) {
  if (!value || typeof value !== 'string') return value;
  // In development, rewrite known asset URLs from any host to this API base.
  // This prevents browsers from blocking cross-site images due to CORP (NotSameSite)
  // when the admin UI runs on localhost/127.0.0.1 but the DB contains prod URLs.
  if (isAbsoluteHttpUrl(value)) {
    if (process.env.NODE_ENV !== 'production') {
      const rel = toRelativeApiPath(value);
      if (
        typeof rel === 'string' &&
        rel.startsWith('/') &&
        (rel.startsWith('/uploads/') ||
          rel.startsWith('/smallImages/') ||
          rel.startsWith('/public/uploads/') ||
          rel.startsWith('/public/smallImages/') ||
          rel.startsWith('/direct-image/') ||
          rel.startsWith('/images/'))
      ) {
        return joinUrl(process.env.API_URL, rel);
      }
    }
    return value;
  }
  // Only prefix relative paths
  if (!value.startsWith('/')) return value;
  return joinUrl(process.env.API_URL, value);
}

function toRelativeApiPath(value) {
  if (!value || typeof value !== 'string') return value;
  if (value.startsWith('/')) {
    // Strip accidental /api prefix if present
    return value.replace(/^\/api\//, '/');
  }
  if (!isAbsoluteHttpUrl(value)) return value;

  try {
    const url = new URL(value);
    return url.pathname.replace(/^\/api\//, '/');
  } catch {
    // Fallback: try to find known asset path segments
    const match = value.match(
      /(\/api)?(\/uploads\/|\/smallImages\/|\/public\/uploads\/|\/public\/smallImages\/|\/direct-image\/).+$/i
    );
    if (match && match[0]) return match[0].replace(/^\/api\//, '/');
    return value;
  }
}

function omitLocalImageFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  // Top-level locals
  delete obj.imageLocal;
  delete obj.smallImagesLocal;

  // mainImage locals
  if (obj.mainImage && typeof obj.mainImage === 'object') {
    delete obj.mainImage.desktopLocal;
    delete obj.mainImage.mobileLocal;
  }

  // smallImages locals (new object shape)
  if (Array.isArray(obj.smallImages)) {
    obj.smallImages = obj.smallImages.map(si => {
      if (!si || typeof si !== 'object' || Array.isArray(si)) return si;
      const copy = { ...si };
      delete copy.desktopLocal;
      delete copy.mobileLocal;
      return copy;
    });
  }

  return obj;
}

function normalizeProductForClient(productDoc) {
  const obj =
    productDoc && typeof productDoc.toObject === 'function'
      ? productDoc.toObject()
      : { ...(productDoc || {}) };

  const fallbackNoImage = () => toAbsoluteApiUrl('/images/no-image.svg');

  const localAssetExistsForUrl = urlValue => {
    if (!urlValue || typeof urlValue !== 'string') return true;
    // We can only validate local (relative-to-API) assets
    const rel = toRelativeApiPath(urlValue);
    if (!rel || typeof rel !== 'string' || !rel.startsWith('/')) return true;

    // Check uploads/public uploads/smallImages/public smallImages
    const filename = path.basename(rel);
    if (!filename) return true;

    // NOTE: Newly uploaded images can exist in either the private dirs (backend/uploads, backend/smallImages)
    // or the public dirs (public/uploads, public/smallImages). Treat the asset as existing if it exists in
    // either location to avoid spurious fallbacks to no-image when only one copy is present.
    if (rel.startsWith('/uploads/') || rel.startsWith('/public/uploads/')) {
      const fpPrivate = safeResolveUnder(uploadsDir, filename);
      const fpPublic = safeResolveUnder(publicUploadsDir, filename);
      const existsPrivate = fpPrivate ? fs.existsSync(fpPrivate) : false;
      const existsPublic = fpPublic ? fs.existsSync(fpPublic) : false;
      return existsPrivate || existsPublic;
    }
    if (
      rel.startsWith('/smallImages/') ||
      rel.startsWith('/public/smallImages/')
    ) {
      const fpPrivate = safeResolveUnder(smallImagesDir, filename);
      const fpPublic = safeResolveUnder(publicSmallImagesDir, filename);
      const existsPrivate = fpPrivate ? fs.existsSync(fpPrivate) : false;
      const existsPublic = fpPublic ? fs.existsSync(fpPublic) : false;
      return existsPrivate || existsPublic;
    }

    return true;
  };

  // #region agent log
  agentLog(
    'A',
    'backend/index.js:normalizeProductForClient',
    'normalize image urls',
    {
      hasApiUrl: !!process.env.API_URL,
      apiUrlPrefix:
        typeof process.env.API_URL === 'string'
          ? process.env.API_URL.slice(0, 60)
          : null,
      imageIn: obj?.image,
      publicImageIn: obj?.publicImage,
      directImageUrlIn: obj?.directImageUrl,
      mainImageDesktopIn: obj?.mainImage?.desktop,
    }
  );
  // #endregion

  // Normalize core image fields
  obj.image = toAbsoluteApiUrl(obj.image);
  obj.publicImage = toAbsoluteApiUrl(obj.publicImage);
  obj.directImageUrl = toAbsoluteApiUrl(obj.directImageUrl);

  // mainImage object
  if (obj.mainImage && typeof obj.mainImage === 'object') {
    obj.mainImage = { ...obj.mainImage };
    obj.mainImage.desktop = toAbsoluteApiUrl(obj.mainImage.desktop);
    obj.mainImage.mobile = toAbsoluteApiUrl(obj.mainImage.mobile);
    obj.mainImage.publicDesktop = toAbsoluteApiUrl(obj.mainImage.publicDesktop);
    obj.mainImage.publicMobile = toAbsoluteApiUrl(obj.mainImage.publicMobile);
    // keep locals out of responses
    delete obj.mainImage.desktopLocal;
    delete obj.mainImage.mobileLocal;
  }

  // If the referenced local file isn't on disk, return a safe placeholder instead of a broken icon
  try {
    if (!localAssetExistsForUrl(obj.image)) obj.image = fallbackNoImage();
    if (obj.mainImage && typeof obj.mainImage === 'object') {
      if (!localAssetExistsForUrl(obj.mainImage.desktop))
        obj.mainImage.desktop = fallbackNoImage();
      if (!localAssetExistsForUrl(obj.mainImage.mobile))
        obj.mainImage.mobile = fallbackNoImage();
      if (!localAssetExistsForUrl(obj.mainImage.publicDesktop))
        obj.mainImage.publicDesktop = fallbackNoImage();
      if (!localAssetExistsForUrl(obj.mainImage.publicMobile))
        obj.mainImage.publicMobile = fallbackNoImage();
    }
  } catch {
    // ignore
  }

  // smallImages can be array of strings or objects
  if (Array.isArray(obj.smallImages)) {
    obj.smallImages = obj.smallImages.map(si => {
      if (typeof si === 'string') return toAbsoluteApiUrl(si);
      if (si && typeof si === 'object' && !Array.isArray(si)) {
        const normalized = { ...si };
        normalized.desktop = toAbsoluteApiUrl(normalized.desktop);
        normalized.mobile = toAbsoluteApiUrl(normalized.mobile);
        delete normalized.desktopLocal;
        delete normalized.mobileLocal;
        return normalized;
      }
      return si;
    });
  }

  // Remove local-only fields from responses
  omitLocalImageFields(obj);

  // #region agent log
  agentLog(
    'A',
    'backend/index.js:normalizeProductForClient:exit',
    'normalized image urls',
    {
      imageOut: obj?.image,
      publicImageOut: obj?.publicImage,
      directImageUrlOut: obj?.directImageUrl,
      mainImageDesktopOut: obj?.mainImage?.desktop,
    }
  );
  // #endregion

  return obj;
}

// =============================================
// Filesystem safety helpers
// =============================================
const ALLOWED_IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
]);

function validateImageFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return { ok: false, error: 'Missing filename' };
  }
  if (filename.length > 200) {
    return { ok: false, error: 'Filename too long' };
  }
  // Disallow traversal / separators / null bytes
  if (
    filename.includes('..') ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('\0')
  ) {
    return { ok: false, error: 'Invalid filename' };
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return { ok: false, error: 'Invalid filename' };
  }
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return { ok: false, error: 'Unsupported file extension' };
  }
  return { ok: true };
}

function safeResolveUnder(baseDir, filename) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedPath = path.resolve(baseDir, filename);
  const prefix = resolvedBase.endsWith(path.sep)
    ? resolvedBase
    : `${resolvedBase}${path.sep}`;
  if (!resolvedPath.startsWith(prefix)) return null;
  return resolvedPath;
}

// =============================================
// CORS (single source of truth)
// =============================================
function toOrigin(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      return new URL(trimmed).origin;
    } catch {
      return null;
    }
  }
  return trimmed; // already origin-like (e.g. http://localhost:1234)
}

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

if (!isProd) {
  console.log('Allowed origins:', [...allowedOriginsSet]);
}

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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'auth-token',
    'X-Requested-With',
  ],
};

app.use(cors(corsOptions));
app.use(cookieParser());
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
    console.log('Initializing exchange rate...');
    // Check if we have a stored rate
    const storedRate = await exchangeRateService.getStoredRate();
    const isStale = await exchangeRateService.isRateStale(24);

    if (!storedRate || isStale) {
      // Fetch fresh rate from API
      console.log('Fetching current exchange rate from API...');
      try {
        const { rate, source } = await exchangeRateService.fetchCurrentRate();
        await exchangeRateService.updateRate(rate, source);
        console.log(`✓ Exchange rate initialized: ${rate} (source: ${source})`);
      } catch (error) {
        console.warn(
          'Failed to fetch exchange rate from API, using fallback:',
          error.message
        );
        // Will use fallback from getExchangeRate
        const fallbackRate = await exchangeRateService.getExchangeRate();
        console.log(`✓ Using fallback exchange rate: ${fallbackRate}`);
      }
    } else {
      console.log(`✓ Using stored exchange rate: ${storedRate}`);
    }

    // Start the daily job
    startExchangeRateJob();
  } catch (error) {
    console.error('Error initializing exchange rate:', error.message);
    // Still start the job even if initialization fails
    startExchangeRateJob();
  }
}

connectDb()
  .then(() => {
    // Initialize exchange rate after database connection
    initializeExchangeRate();
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err?.message || err);
  });

// =============================================
// File Upload Configuration
// =============================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'mainImage') {
      cb(null, './uploads');
    }
    if (file.fieldname === 'smallImages') {
      cb(null, './smallImages');
    }
  },
  filename: function (req, file, cb) {
    return cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const UPLOAD_ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Some cameras/browsers may send non-standard types for RAW
  'image/x-canon-cr2',
  'image/x-sony-arw',
]);

const UPLOAD_ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.cr2',
  '.arw',
]);

const UPLOAD_MAX_FILE_SIZE_BYTES =
  Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 50) * 1024 * 1024; // default 50MB
const UPLOAD_MAX_FILES = Number(process.env.UPLOAD_MAX_FILES || 11); // 1 main + up to 10 small

// Tight file filter: allow only safe image types (+ RAW by extension)
const fileFilter = (req, file, cb) => {
  const original = (file.originalname || '').toLowerCase();
  const ext = path.extname(original);

  // Extension must be in allowlist
  if (!UPLOAD_ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error('File type not supported'), false);
  }

  // MIME must be a known safe image type, OR octet-stream for RAW extensions only
  const mime = (file.mimetype || '').toLowerCase();
  const isRawExt = ext === '.cr2' || ext === '.arw';

  if (UPLOAD_ALLOWED_IMAGE_MIME_TYPES.has(mime)) return cb(null, true);
  if (mime === 'application/octet-stream' && isRawExt) return cb(null, true);

  return cb(new Error('File type not supported'), false);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: UPLOAD_MAX_FILE_SIZE_BYTES,
    files: UPLOAD_MAX_FILES,
  },
});

// =============================================
// Static File Serving
// =============================================
const uploadsDir = path.join(__dirname, 'uploads');
const smallImagesDir = path.join(__dirname, 'smallImages');
const publicUploadsDir = path.join(__dirname, '../public/uploads');
const publicSmallImagesDir = path.join(__dirname, '../public/smallImages');
const noImageSvgPath = path.join(__dirname, 'public/images/no-image.svg');

// Ensure all directories exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

if (!fs.existsSync(smallImagesDir)) {
  fs.mkdirSync(smallImagesDir, { recursive: true });
  console.log('Created smallImages directory:', smallImagesDir);
}

if (!fs.existsSync(publicUploadsDir)) {
  fs.mkdirSync(publicUploadsDir, { recursive: true });
  console.log('Created public uploads directory:', publicUploadsDir);
}

if (!fs.existsSync(publicSmallImagesDir)) {
  fs.mkdirSync(publicSmallImagesDir, { recursive: true });
  console.log('Created public smallImages directory:', publicSmallImagesDir);
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

// =============================================
// Payment Processing Setup
// =============================================
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function handleCheckoutSession(session) {
  const productIdRaw = session?.metadata?.productId;
  const productId = Number(productIdRaw);
  if (!Number.isFinite(productId)) {
    console.error('Webhook missing/invalid productId:', productIdRaw);
    return;
  }

  // Atomic decrement to prevent negative inventory and race conditions
  const updated = await Product.findOneAndUpdate(
    { id: productId, quantity: { $gt: 0 } },
    { $inc: { quantity: -1 } },
    { new: true }
  );

  if (!updated) {
    console.warn(
      `No inventory update applied for product ${productId} (missing or out of stock)`
    );
    return;
  }

  console.log(
    `Product ${productId} quantity reduced. New quantity: ${updated.quantity}`
  );

  // IMPORTANT:
  // Do not delete products when inventory reaches 0.
  // Out-of-stock items should be temporarily hidden from the storefront but remain editable/restockable in admin.
  if (updated.quantity === 0) {
    console.log(
      `Product ${productId} is now out of stock (quantity=0). It will be hidden from storefront listings.`
    );
  }
}

const generateAccessToken = async () => {
  try {
    if (!isProd) {
      console.log('========= PAYPAL AUTH DEBUG =========');
      console.log(
        'Client ID length:',
        PAYPAL_CLIENT_ID ? PAYPAL_CLIENT_ID.length : 'missing'
      );
      console.log(
        'Client Secret length:',
        PAYPAL_CLIENT_SECRET ? PAYPAL_CLIENT_SECRET.length : 'missing'
      );
      console.log('Base URL:', baseUrl);
    }

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      if (!isProd) {
        console.error('Missing PayPal credentials:', {
          clientIdExists: !!PAYPAL_CLIENT_ID,
          clientSecretExists: !!PAYPAL_CLIENT_SECRET,
        });
      }
      const err = new Error('PAYPAL_MISSING_CREDENTIALS');
      err.code = 'PAYPAL_MISSING_CREDENTIALS';
      err.statusCode = 500;
      throw err;
    }

    // In Node.js, btoa is not available directly, so we use Buffer
    const auth = Buffer.from(
      `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
    ).toString('base64');
    if (!isProd) {
      console.log('Auth token generated. Requesting PayPal access token...');
    }

    const tokenUrl = `${baseUrl}/v1/oauth2/token`;
    if (!isProd) console.log('Token URL:', tokenUrl);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!isProd) console.log('PayPal token response status:', response.status);

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      // Don't leak response body to clients; keep details in dev logs only
      if (!isProd) {
        console.error(
          'PayPal token request failed:',
          response.status,
          data || text
        );
      }
      const err = new Error('PAYPAL_TOKEN_REQUEST_FAILED');
      err.code = 'PAYPAL_TOKEN_REQUEST_FAILED';
      err.statusCode = 502;
      err.httpStatusCode = response.status;
      throw err;
    }

    if (!data || !data.access_token) {
      if (!isProd) console.error('No access_token received from PayPal:', data);
      const err = new Error('PAYPAL_TOKEN_RESPONSE_INVALID');
      err.code = 'PAYPAL_TOKEN_RESPONSE_INVALID';
      err.statusCode = 502;
      throw err;
    }

    if (!isProd) console.log('PayPal access token obtained successfully');
    return data.access_token;
  } catch (error) {
    // Throw so callers can return consistent responses; avoid leaking internals in prod.
    if (!isProd) console.error('Failed to generate Access Token:', error);
    throw error;
  }
};

const createOrder = async cart => {
  try {
    if (!isProd) {
      console.log(
        'shopping cart information passed from the frontend createOrder() callback:',
        cart
      );
    }

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      throw new Error('Invalid cart data received');
    }

    const toTwoDecimalString = value => {
      const num = Number(value);
      if (!Number.isFinite(num)) return null;
      return num.toFixed(2);
    };

    // Use integer cents to avoid floating point mismatches between item totals and order total.
    const totalCents = cart.reduce((total, item) => {
      const unit = Number(item?.unit_amount?.value);
      const qty = Number.parseInt(item?.quantity, 10);
      if (!Number.isFinite(unit) || !Number.isFinite(qty) || qty <= 0) {
        throw new Error('Invalid item amount or quantity');
      }
      const cents = Math.round(unit * 100);
      return total + cents * qty;
    }, 0);
    const totalAmount = (totalCents / 100).toFixed(2);
    const currencyData = cart[0].unit_amount.currency_code;

    // Guardrail: PayPal orders must use a single currency.
    const currencies = new Set(
      cart.map(item => item?.unit_amount?.currency_code).filter(Boolean)
    );
    if (currencies.size > 1) {
      const err = new Error('Mixed currencies in cart are not supported');
      err.code = 'MIXED_CURRENCY_CART';
      err.statusCode = 400;
      throw err;
    }
    if (currencies.size === 1 && !currencies.has(currencyData)) {
      // Shouldn't happen, but keep the intent explicit
      const err = new Error('Invalid cart currency');
      err.code = 'INVALID_CART_CURRENCY';
      err.statusCode = 400;
      throw err;
    }

    const accessToken = await generateAccessToken();
    if (!isProd) console.log('PayPal access token received: Success');

    const url = `${baseUrl}/v2/checkout/orders`;
    if (!isProd) console.log('PayPal API URL:', url);

    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currencyData,
            value: totalAmount,
            breakdown: {
              item_total: {
                currency_code: currencyData,
                value: totalAmount,
              },
            },
          },
          items: cart.map(item => ({
            name: item.name,
            unit_amount: {
              currency_code: item.unit_amount.currency_code,
              value: toTwoDecimalString(item.unit_amount.value),
            },
            quantity: String(Number.parseInt(item.quantity, 10)),
          })),
        },
      ],
      application_context: {
        return_url: `${process.env.API_URL}/complete-order`,
        cancel_url: `${process.env.HOST}/html/cart.html`,
        user_action: 'PAY_NOW',
        brand_name: 'Tamar Kfir Jewelry',
      },
    };

    if (!isProd)
      console.log('PayPal order payload:', JSON.stringify(payload, null, 2));

    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'POST',
        body: JSON.stringify(payload),
      },
      20000
    );

    return handleResponse(response);
  } catch (error) {
    if (error?.name === 'AbortError') {
      const err = new Error('PayPal request timed out');
      err.code = 'PAYPAL_TIMEOUT';
      err.statusCode = 504;
      throw err;
    }
    if (!isProd) console.error('Error creating PayPal order:', error);
    throw error;
  }
};

const captureOrder = async orderID => {
  try {
    const accessToken = await generateAccessToken();
    const url = `${baseUrl}/v2/checkout/orders/${orderID}/capture`;
    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      },
      20000
    );
    return handleResponse(response);
  } catch (error) {
    if (error?.name === 'AbortError') {
      const err = new Error('PayPal request timed out');
      err.code = 'PAYPAL_TIMEOUT';
      err.statusCode = 504;
      throw err;
    }
    throw error;
  }
};

async function handleResponse(response) {
  const text = await response.text();
  let jsonResponse;
  try {
    jsonResponse = text ? JSON.parse(text) : null;
  } catch {
    jsonResponse = null;
  }

  if (!response.ok) {
    const debugId = jsonResponse?.debug_id || null;
    const details = Array.isArray(jsonResponse?.details)
      ? jsonResponse.details.map(d => ({
          issue: d?.issue || null,
          description: d?.description || null,
        }))
      : null;

    // Log a compact, safe summary even in prod so we can diagnose 4xx like 422.
    console.error('PayPal API error:', {
      httpStatusCode: response.status,
      debugId,
      firstIssue: details?.[0]?.issue || null,
    });

    if (!isProd) {
      console.error(
        'PayPal API error full body:',
        response.status,
        jsonResponse || text
      );
    }
    const err = new Error('PAYPAL_API_ERROR');
    err.code = 'PAYPAL_API_ERROR';
    // Map PayPal 4xx to client errors; PayPal 5xx to a 502.
    err.statusCode = response.status >= 500 ? 502 : response.status;
    err.httpStatusCode = response.status;
    err.paypalDebugId = debugId;
    err.paypalDetails = details;
    throw err;
  }

  return {
    jsonResponse: jsonResponse ?? {},
    httpStatusCode: response.status,
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================
// API Endpoints
// =============================================

// Authentication Endpoints
app.post('/verify-token', async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded?.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const user = await Users.findById(userId);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

app.post(
  '/login',
  authRateLimiter,
  (req, res, next) => {
    if (
      !req.body ||
      typeof req.body.email !== 'string' ||
      typeof req.body.password !== 'string'
    ) {
      return res
        .status(400)
        .json({ success: false, errors: 'Invalid login payload' });
    }
    return next();
  },
  authUser,
  async (req, res) => {
    try {
      const adminCheck = req.user.userType;
      const data = {
        user: {
          id: req.user._id.toString(),
          email: req.user.email,
          userType: req.user.userType,
        },
      };
      const token = jwt.sign(data, process.env.JWT_KEY, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      });
      if (token) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Token created for user:', req.user.email);
        }
        res.json({
          success: true,
          token,
          adminCheck,
          message: 'Login successful',
        });
      }
    } catch (err) {
      console.error('Login Error🔥 :', err);
      res.status(500).json({
        success: false,
        errors: 'Login - Internal Server Error',
        message: err.message,
      });
    }
  }
);

app.post('/signup', authRateLimiter, async (req, res) => {
  // lightweight validation (keeps behavior predictable)
  if (
    !req.body ||
    typeof req.body.email !== 'string' ||
    typeof req.body.password !== 'string' ||
    typeof req.body.username !== 'string'
  ) {
    return res
      .status(400)
      .json({ success: false, errors: 'Invalid signup payload' });
  }

  let findUser = await Users.findOne({ email: req.body.email });
  if (findUser) {
    return res.status(400).json({
      success: false,
      errors: 'Existing user found with the same Email address',
    });
  }

  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }

  bcrypt.hash(req.body.password, 10, (err, hash) => {
    if (err) {
      return res.status(500).json({
        errors: err,
      });
    } else {
      const user = new Users({
        name: req.body.username,
        email: req.body.email,
        password: hash,
        cartData: cart,
      });
      user
        .save()
        .then(() => {
          res.status(201).json({
            message: 'User Created!',
          });
        })
        .catch(err => {
          res.status(500).json({
            errors: err,
          });
        });
    }
  });
});

// Product Management Endpoints
app.post(
  '/addproduct',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      // #region agent log
      agentLog('A', 'backend/index.js:/addproduct:entry', 'addproduct entry', {
        hasBody: !!req.body,
        contentType: req.headers['content-type'] || null,
        hasMainImage: !!req.body?.mainImage,
        mainImageDesktop: req.body?.mainImage?.desktop || null,
        smallImagesType: Array.isArray(req.body?.smallImages)
          ? 'array'
          : typeof req.body?.smallImages,
        category: req.body?.category || null,
        name: req.body?.name || null,
      });
      // #endregion

      // Input guards (fail fast with actionable 400s)
      if (!req.body || typeof req.body !== 'object') {
        return res
          .status(400)
          .json({ success: false, error: 'Missing JSON body' });
      }
      if (!req.body.name || typeof req.body.name !== 'string') {
        return res
          .status(400)
          .json({ success: false, error: 'Missing product name' });
      }
      if (!req.body.category || typeof req.body.category !== 'string') {
        return res
          .status(400)
          .json({ success: false, error: 'Missing product category' });
      }
      if (!req.body.mainImage || typeof req.body.mainImage !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Missing mainImage data from upload.',
        });
      }

      const products = await Product.find({}).sort({ id: -1 }).limit(1);
      const nextId = products.length > 0 ? Number(products[0].id) + 1 : 1;

      // Get ILS price as input (primary currency)
      const ilsPriceRaw = req.body.ils_price;
      const ilsPrice = Math.round(Number(ilsPriceRaw) || 0);

      if (ilsPrice <= 0) {
        console.error('ILS price validation failed:', ilsPrice);
        return res.status(400).json({
          success: false,
          error: 'ILS price is required and must be greater than 0',
        });
      }

      // Get current exchange rate and calculate USD price
      const exchangeRate = await exchangeRateService.getExchangeRate();
      const usdPrice = Math.round(ilsPrice / exchangeRate);

      // Security margin is stored but not used in price calculation anymore
      const securityMargin = parseFloat(req.body.security_margin) || 5;

      // Determine if we should apply the current global store discount
      const applyGlobalDiscountFlag =
        req.body.apply_global_discount === true ||
        req.body.apply_global_discount === 'true';

      const settings = await Settings.getSettings();
      const hasActiveGlobalDiscount =
        settings.discount_active &&
        settings.global_discount_percentage &&
        settings.global_discount_percentage > 0;

      let finalIlsPrice = ilsPrice;
      let finalUsdPrice = usdPrice;
      let originalIlsPrice = ilsPrice;
      let originalUsdPrice = usdPrice;
      let discountPercentage = 0;

      if (applyGlobalDiscountFlag && hasActiveGlobalDiscount) {
        discountPercentage = settings.global_discount_percentage;
        const ratio = 1 - discountPercentage / 100;

        // Ensure original prices represent the full (pre-discount) price
        originalIlsPrice = ilsPrice;
        originalUsdPrice = usdPrice;

        // Apply discount to get the final prices that will be used on the storefront
        finalIlsPrice = Math.round(originalIlsPrice * ratio);
        finalUsdPrice = Math.round(originalUsdPrice * ratio);
      }

      // Get image URLs from the upload response.
      // - Absolute (Spaces/CDN) URLs should be stored as-is.
      // - Legacy local URLs (/uploads/...) are stored as relative paths.
      const mainImageInput = req.body.mainImage || {};
      const smallImageInput = req.body.smallImages || [];

      const maybeRelative = value =>
        isAbsoluteHttpUrl(value) ? value : toRelativeApiPath(value);

      const mainImageUrls = {
        desktop: maybeRelative(mainImageInput.desktop),
        mobile: maybeRelative(mainImageInput.mobile),
        publicDesktop: maybeRelative(mainImageInput.publicDesktop),
        publicMobile: maybeRelative(mainImageInput.publicMobile),
      };

      const smallImageUrls = Array.isArray(smallImageInput)
        ? smallImageInput.filter(Boolean).map(img => {
            if (typeof img === 'string') return maybeRelative(img);
            if (img && typeof img === 'object' && !Array.isArray(img)) {
              return {
                desktop: maybeRelative(img.desktop),
                mobile: maybeRelative(img.mobile),
              };
            }
            return img;
          })
        : [];

      // #region agent log
      agentLog(
        'A',
        'backend/index.js:/addproduct',
        'computed image fields for product',
        {
          hasApiUrl: !!process.env.API_URL,
          mainImageInputDesktop: mainImageInput?.desktop,
          mainImageUrlsDesktop: mainImageUrls?.desktop,
          mainImageUrlsPublicDesktop: mainImageUrls?.publicDesktop,
          smallImagesCount: Array.isArray(smallImageUrls)
            ? smallImageUrls.length
            : null,
        }
      );
      // #endregion

      // Guard: don't store a product that references non-existent LOCAL upload files.
      // If using Spaces/CDN (absolute URLs), skip this local filesystem guard.
      try {
        const desktopUrl = mainImageUrls?.desktop || null;
        const shouldValidateLocal =
          typeof desktopUrl === 'string' &&
          desktopUrl.startsWith('/') &&
          (desktopUrl.startsWith('/uploads/') ||
            desktopUrl.startsWith('/public/uploads/'));

        if (shouldValidateLocal) {
          const mainDesktopFn = path.basename(String(desktopUrl));
          const fp = safeResolveUnder(uploadsDir, mainDesktopFn);
          const exists =
            (fp ? fs.existsSync(fp) : false) ||
            (() => {
              const fpPublic = safeResolveUnder(
                publicUploadsDir,
                mainDesktopFn
              );
              return fpPublic ? fs.existsSync(fpPublic) : false;
            })();

          // #region agent log
          agentLog(
            'A',
            'backend/index.js:/addproduct:upload-file-check',
            'checked upload file exists',
            {
              mainDesktopUrl: desktopUrl,
              mainDesktopFilename: mainDesktopFn,
              resolvedOk: !!fp,
              exists,
            }
          );
          // #endregion

          if (!exists) {
            return res.status(400).json({
              success: false,
              error:
                'Uploaded main image file was not found on the server. Please retry the upload.',
            });
          }
        } else if (!desktopUrl) {
          return res.status(400).json({
            success: false,
            error: 'mainImage.desktop missing from upload response.',
          });
        }
      } catch (e) {
        console.error('[addproduct] upload file validation failed:', e);
        return res.status(500).json({
          success: false,
          error: 'Server failed while validating uploaded image files.',
        });
      }

      // Create the product with new image structure
      const isSpacesDesktop = isAbsoluteHttpUrl(mainImageUrls.desktop);

      const product = new Product({
        id: nextId,
        name: req.body.name,
        // Legacy image field (using desktop version as default)
        image: mainImageUrls.desktop || mainImageUrls.publicDesktop || '',
        publicImage: mainImageUrls.publicDesktop || '',
        // Store all image variations
        mainImage: mainImageUrls,
        // Store small images with all variations
        smallImages: smallImageUrls,
        // Store relative direct image URL for better accessibility (absolute is built at response time)
        directImageUrl: mainImageUrls.desktop
          ? isSpacesDesktop
            ? mainImageUrls.desktop
            : `/direct-image/${String(mainImageUrls.desktop).split('/').pop()}`
          : null,
        // Product details
        category: req.body.category,
        quantity: Math.max(0, Number(req.body.quantity) || 0),
        description: req.body.description || '',
        ils_price: finalIlsPrice,
        usd_price: finalUsdPrice,
        original_ils_price: originalIlsPrice,
        original_usd_price: originalUsdPrice,
        discount_percentage: discountPercentage,
        security_margin: securityMargin,
      });

      if (!isProd) {
        console.log('\n=== Product Data Before Save ===');
        console.log(
          JSON.stringify(
            {
              id: product.id,
              name: product.name,
              ils_price: product.ils_price,
              usd_price: product.usd_price,
              original_ils_price: product.original_ils_price,
              original_usd_price: product.original_usd_price,
              image: product.image,
              publicImage: product.publicImage,
              mainImage: product.mainImage,
              smallImages: product.smallImages,
              directImageUrl: product.directImageUrl,
              category: product.category,
            },
            null,
            2
          )
        );
      }

      await product.save();

      if (!isProd) {
        console.log('\n=== Product Saved Successfully ===');
      }

      // #region agent log
      agentLog('A', 'backend/index.js:/addproduct:save', 'product saved', {
        productId: nextId,
        imageStored: product?.image,
        publicImageStored: product?.publicImage,
        directImageUrlStored: product?.directImageUrl,
      });
      // #endregion

      res.json({
        success: true,
        id: nextId,
        name: req.body.name,
      });
    } catch (error) {
      if (!isProd) {
        console.error('\n=== Product Creation Error ===');
        console.error(error);
      } else {
        console.error('Product creation failed:', {
          message: error?.message || null,
          code: error?.code || null,
        });
      }
      // #region agent log
      agentLog('A', 'backend/index.js:/addproduct:catch', 'addproduct error', {
        message: error?.message || null,
        name: error?.name || null,
      });
      // #endregion
      res.status(500).json({
        success: false,
        error: 'Failed to create product',
        ...(isProd ? {} : { message: error?.message }),
      });
    }
  }
);

// Update the old updateproduct endpoint to handle formdata and file uploads
app.post(
  '/updateproduct/:id',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'smallImages', maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const productId = req.params.id;
      if (!isProd) {
        console.log(`Updating product ${productId}`);
        console.log('Form data:', req.body);
      }

      // Find the product
      const product = await Product.findOne({ id: Number(productId) });
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      // Extract form data
      const {
        name,
        ils_price,
        description,
        category,
        quantity,
        security_margin,
      } = req.body;

      // Update basic product information
      product.name = name;

      // Get ILS price as input (primary currency)
      const newIlsPrice = Math.round(Number(ils_price) || 0);

      if (newIlsPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ILS price is required and must be greater than 0',
        });
      }

      // Get current exchange rate and calculate USD price
      const exchangeRate = await exchangeRateService.getExchangeRate();
      const newUsdPrice = Math.round(newIlsPrice / exchangeRate);

      // Preserve original prices if they don't exist or if discount is not active
      // Only update original prices if discount is 0 (no active discount)
      if (!product.original_usd_price || product.discount_percentage === 0) {
        product.original_usd_price = newUsdPrice;
      }
      if (!product.original_ils_price || product.discount_percentage === 0) {
        product.original_ils_price = newIlsPrice;
      }

      product.usd_price = newUsdPrice;
      product.ils_price = newIlsPrice;
      product.description = description || '';
      product.category = category;
      product.quantity = Math.max(0, Number(quantity) || 0);
      product.security_margin = Math.max(0, Number(security_margin) || 5);

      // Handle file uploads if present
      let mainImageUpdated = false;
      let smallImagesUpdated = false;

      // Process main image if uploaded
      if (req.files && req.files.mainImage && req.files.mainImage.length > 0) {
        console.log('Processing new main image');
        const mainImage = req.files.mainImage[0];

        try {
          const mainImageResults = await processImage(
            mainImage.path,
            mainImage.filename,
            true
          );

          const desktopUrl =
            mainImageResults?.desktop?.spacesUrl ||
            `/uploads/${mainImageResults.desktop.filename}`;
          const mobileUrl =
            mainImageResults?.mobile?.spacesUrl ||
            `/uploads/${mainImageResults.mobile.filename}`;

          // Update main image URLs
          // - Prefer Spaces/CDN absolute URLs when available (durable on App Platform)
          // - Fall back to local relative paths in dev
          product.mainImage = {
            desktop: desktopUrl,
            mobile: mobileUrl,
            publicDesktop:
              mainImageResults?.desktop?.spacesUrl ||
              `/public/uploads/${mainImageResults.desktop.filename}`,
            publicMobile:
              mainImageResults?.mobile?.spacesUrl ||
              `/public/uploads/${mainImageResults.mobile.filename}`,
          };

          // Update legacy fields
          product.image = desktopUrl;
          product.publicImage = product.mainImage.publicDesktop || desktopUrl;

          // directImageUrl: only use /direct-image for local files
          product.directImageUrl = isAbsoluteHttpUrl(desktopUrl)
            ? desktopUrl
            : `/direct-image/${mainImageResults.desktop.filename}`;

          // Clear any old local-only fields that may exist in DB
          product.imageLocal = undefined;
          if (product.mainImage) {
            product.mainImage.desktopLocal = undefined;
            product.mainImage.mobileLocal = undefined;
          }

          mainImageUpdated = true;
          console.log('Main image updated');
        } catch (error) {
          console.error('Error processing main image:', error);
          // Continue without updating image if processing fails
        }
      }

      // Process small images if uploaded
      if (
        req.files &&
        req.files.smallImages &&
        req.files.smallImages.length > 0
      ) {
        console.log(
          `Processing ${req.files.smallImages.length} new small images`
        );

        try {
          const smallImagesResults = await Promise.all(
            req.files.smallImages.map(async image => {
              return await processImage(image.path, image.filename, false);
            })
          );

          const existingIsString =
            Array.isArray(product.smallImages) &&
            typeof product.smallImages[0] === 'string';

          const newSmallImages = existingIsString
            ? smallImagesResults.map(
                result =>
                  result?.desktop?.spacesUrl ||
                  `/smallImages/${result.desktop.filename}`
              )
            : smallImagesResults.map(result => ({
                desktop:
                  result?.desktop?.spacesUrl ||
                  `/smallImages/${result.desktop.filename}`,
                mobile:
                  result?.mobile?.spacesUrl ||
                  `/smallImages/${result.mobile.filename}`,
              }));

          // Append new small images to existing ones
          if (!product.smallImages) {
            product.smallImages = [];
          }

          product.smallImages = [...product.smallImages, ...newSmallImages];

          smallImagesUpdated = true;
          console.log('Small images updated');
        } catch (error) {
          console.error('Error processing small images:', error);
          // Continue without updating small images if processing fails
        }
      }

      // Save the updated product
      await product.save();
      console.log('Product updated successfully');

      res.json({
        success: true,
        message: 'Product updated successfully',
        mainImageUpdated,
        smallImagesUpdated,
      });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// Keep the old endpoint for backward compatibility
app.post(
  '/updateproduct',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.body.id);
      if (!Number.isFinite(id)) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid product id' });
      }

      // Get ILS price as input (primary currency)
      const ilsPrice = Math.round(Number(req.body.ils_price) || 0);

      if (ilsPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ILS price is required and must be greater than 0',
        });
      }

      // Get current exchange rate and calculate USD price
      const exchangeRate = await exchangeRateService.getExchangeRate();
      const usdPrice = Math.round(ilsPrice / exchangeRate);

      const updatedFields = {
        name: req.body.name,
        ils_price: ilsPrice,
        usd_price: usdPrice,
        security_margin: parseFloat(req.body.security_margin) || 5,
        description: req.body.description,
        quantity: Math.max(0, Number(req.body.quantity) || 0),
        category: req.body.category,
      };

      let product = await Product.findOne({ id });
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: 'Product not found' });
      }

      product.name = updatedFields.name;

      // Preserve original prices if they don't exist or if discount is not active
      if (!product.original_usd_price || product.discount_percentage === 0) {
        product.original_usd_price = updatedFields.usd_price;
      }
      if (!product.original_ils_price || product.discount_percentage === 0) {
        product.original_ils_price = updatedFields.ils_price;
      }

      product.usd_price = updatedFields.usd_price;
      product.ils_price = updatedFields.ils_price;
      product.security_margin = updatedFields.security_margin;
      product.description = updatedFields.description;
      product.quantity = updatedFields.quantity;
      product.category = updatedFields.category;

      await product.save();

      res.json({
        success: true,
      });
    } catch (error) {
      console.error('Error in legacy updateproduct:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

app.post(
  '/removeproduct',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    const id = Number(req.body.id);
    if (!Number.isFinite(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid product id' });
    }

    const deleted = await Product.findOneAndDelete({ id });
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: 'Product not found' });
    }

    if (!isProd) console.log('Removed');
    res.json({
      success: true,
      id,
      name: deleted.name,
    });
  }
);

// Discount Management Endpoints
// Public endpoint for frontend to fetch discount settings
app.get('/discount-settings', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json({
      success: true,
      global_discount_percentage: settings.global_discount_percentage,
      discount_active: settings.discount_active,
      discount_label: settings.discount_label,
    });
  } catch (error) {
    console.error('Error fetching discount settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch discount settings',
    });
  }
});

app.post(
  '/batch-update-discount',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      const discountPercentage = parseFloat(req.body.discountPercentage);

      if (
        isNaN(discountPercentage) ||
        discountPercentage < 0 ||
        discountPercentage > 100
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid discount percentage. Must be between 0 and 100',
        });
      }

      // Get or create settings
      const settings = await Settings.getSettings();
      settings.global_discount_percentage = discountPercentage;
      settings.discount_active = discountPercentage > 0;
      settings.updatedAt = new Date();
      await settings.save();

      // Fetch all products
      const products = await Product.find({});
      let updatedCount = 0;

      // Update each product
      for (const product of products) {
        // If original prices don't exist, save current prices as original
        if (!product.original_ils_price && product.ils_price) {
          product.original_ils_price = product.ils_price;
        }
        if (!product.original_usd_price && product.usd_price) {
          product.original_usd_price = product.usd_price;
        }

        // Calculate discounted prices
        if (product.original_ils_price) {
          product.ils_price = Math.round(
            product.original_ils_price * (1 - discountPercentage / 100)
          );
        }
        if (product.original_usd_price) {
          product.usd_price = Math.round(
            product.original_usd_price * (1 - discountPercentage / 100)
          ); // Round to whole number for USD
        }

        product.discount_percentage = discountPercentage;
        await product.save();
        updatedCount++;
      }

      if (!isProd) {
        console.log(
          `Batch update completed: ${updatedCount} products updated with ${discountPercentage}% discount`
        );
      }

      res.json({
        success: true,
        message: `Successfully updated ${updatedCount} products with ${discountPercentage}% discount`,
        updatedCount,
        discountPercentage,
      });
    } catch (error) {
      console.error('Error in batch update discount:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to batch update discount',
        error: isProd ? undefined : error.message,
      });
    }
  }
);

app.post(
  '/remove-discount',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      // Update settings
      const settings = await Settings.getSettings();
      settings.global_discount_percentage = 0;
      settings.discount_active = false;
      settings.updatedAt = new Date();
      await settings.save();

      // Fetch all products
      const products = await Product.find({});
      let updatedCount = 0;

      // Revert prices to original
      for (const product of products) {
        // Ensure original prices are set (for old products that might not have them)
        if (!product.original_ils_price && product.ils_price) {
          product.original_ils_price = product.ils_price;
        }
        if (!product.original_usd_price && product.usd_price) {
          product.original_usd_price = product.usd_price;
        }

        // Restore prices from original
        if (product.original_ils_price) {
          product.ils_price = product.original_ils_price;
        }
        if (product.original_usd_price) {
          product.usd_price = product.original_usd_price;
        }
        product.discount_percentage = 0;
        await product.save();
        updatedCount++;
      }

      if (!isProd) {
        console.log(
          `Discount removal completed: ${updatedCount} products reverted to original prices`
        );
      }

      res.json({
        success: true,
        message: `Successfully removed discount from ${updatedCount} products`,
        updatedCount,
      });
    } catch (error) {
      console.error('Error removing discount:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove discount',
        error: isProd ? undefined : error.message,
      });
    }
  }
);

// Admin endpoint to manually trigger exchange rate update
app.post(
  '/admin/update-exchange-rate',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      await runExchangeRateUpdate();
      res.json({
        success: true,
        message: 'Exchange rate and product prices updated successfully',
      });
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

app.get('/allproducts', async (req, res) => {
  let products = await Product.find({}).lean();
  if (!isProd) console.log('All Products Fetched');
  res.send(products.map(normalizeProductForClient));
});

app.post('/productsByCategory', async (req, res) => {
  const category = req.body.category;
  const page = req.body.page;
  const limit = 6;

  try {
    if (!isProd) console.log('Fetching products for category:', category);
    const skip = (page - 1) * limit;

    // Storefront listing: hide out-of-stock and unavailable items
    let products = await Product.find({
      category: category,
      quantity: { $gt: 0 },
      available: { $ne: false },
    })
      .lean()
      .skip(skip)
      .limit(limit);

    if (!products || products.length === 0) {
      return res.json([]);
    }

    res.json(products.map(normalizeProductForClient));
  } catch (err) {
    if (!isProd) console.error('Error fetching products by category:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/chunkProducts', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  let category = req.body.checkCategory;
  try {
    // Storefront listing: hide out-of-stock and unavailable items
    const products = await Product.find({
      category: category,
      quantity: { $gt: 0 },
      available: { $ne: false },
    })
      .lean()
      .skip(skip)
      .limit(limit);
    res.json(products.map(normalizeProductForClient));
  } catch (err) {
    if (!isProd) console.error('Error fetching chunkProducts:', err);
    res.status(500).json({
      error: 'Failed to fetch products',
      ...(isProd ? {} : { message: err?.message }),
    });
  }
});

app.post('/getAllProductsByCategory', async (req, res) => {
  const category = req.body.category;

  try {
    if (!isProd) console.log('Fetching all products for category:', category);

    // Get all products for the category without pagination
    // Storefront listing: hide out-of-stock and unavailable items
    const products = await Product.find({
      category: category,
      quantity: { $gt: 0 },
      available: { $ne: false },
    }).lean();
    const total = products.length;

    if (!products || products.length === 0) {
      return res.json({
        products: [],
        total: 0,
      });
    }

    res.json({
      products: products.map(normalizeProductForClient),
      total,
    });
  } catch (err) {
    if (!isProd) console.error('Error fetching all products by category:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Cart Management Endpoints
app.post('/getcart', fetchUser, async (req, res) => {
  let userData = await Users.findOne({ _id: req.user.id });
  res.json(userData.cartData);
});

app.post('/addtocart', fetchUser, async (req, res) => {
  let userData = await Users.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemId] += 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send('Added!');
});

app.post('/removefromcart', fetchUser, async (req, res) => {
  let userData = await Users.findOne({ _id: req.user.id });
  if (userData.cartData[req.body.itemId] > 0)
    userData.cartData[req.body.itemId] -= 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send('Removed!');
});

app.post('/removeAll', fetchUser, async (req, res) => {
  let userData = await Users.findOne({ _id: req.user.id });
  for (let i = 0; i < 300; i++) {
    userData.cartData[i] = 0;
  }
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send('Removed All!');
});

// File Upload Endpoint
app.post(
  '/upload',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  (req, res, next) => {
    // IMPORTANT:
    // Do not send/flush headers before multer completes.
    // If we commit a 200 early and later need to return 400/500, Node can throw
    // "ERR_HTTP_HEADERS_SENT" and potentially crash the process, surfacing as
    // "ERR_CONNECTION_RESET"/"ERR_CONNECTION_REFUSED" in the browser.
    //
    // Instead, extend timeouts for long uploads + server-side processing.
    try {
      req.setTimeout(120000);
      res.setTimeout(120000);
    } catch {
      // ignore
    }
    next();
  },
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'smallImages', maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      // #region agent log
      agentLog('B', 'backend/index.js:/upload:entry', 'upload received', {
        hasFiles: !!req.files,
        mainImageCount: Array.isArray(req.files?.mainImage)
          ? req.files.mainImage.length
          : 0,
        smallImagesCount: Array.isArray(req.files?.smallImages)
          ? req.files.smallImages.length
          : 0,
        mainImageFilename: req.files?.mainImage?.[0]?.filename || null,
      });
      // #endregion

      // Check if we received any files
      if (!req.files || Object.keys(req.files).length === 0) {
        console.error('No files were uploaded.');
        return res.status(400).json({
          error: 'No files were uploaded',
          success: false,
        });
      }

      const mainImage = req.files.mainImage ? req.files.mainImage[0] : null;
      const smallImages = req.files.smallImages || [];

      if (!mainImage) {
        console.error('No main image provided');
        return res.status(400).json({
          error: 'No main image provided',
          success: false,
        });
      }

      // Process main image
      const mainImageResults = await processImage(
        mainImage.path,
        mainImage.filename,
        true
      );
      // Process small images
      const smallImagesResults = await Promise.all(
        smallImages.map(async image => {
          return await processImage(image.path, image.filename, false);
        })
      );

      // Construct URLs for main image
      const mainImageUrls = {
        desktop:
          mainImageResults?.desktop?.spacesUrl ||
          `/uploads/${mainImageResults.desktop.filename}`,
        mobile:
          mainImageResults?.mobile?.spacesUrl ||
          `/uploads/${mainImageResults.mobile.filename}`,
        // Treat Spaces/CDN URLs as public variants
        publicDesktop:
          mainImageResults?.desktop?.spacesUrl ||
          `/public/uploads/${mainImageResults.desktop.filename}`,
        publicMobile:
          mainImageResults?.mobile?.spacesUrl ||
          `/public/uploads/${mainImageResults.mobile.filename}`,
      };

      // Construct URLs for small images
      const smallImageUrlSets = smallImagesResults.map(result => ({
        desktop:
          result?.desktop?.spacesUrl ||
          `/smallImages/${result.desktop.filename}`,
        mobile:
          result?.mobile?.spacesUrl || `/smallImages/${result.mobile.filename}`,
      }));

      // Send response with all URL formats
      const response = {
        success: true,
        mainImage: mainImageUrls,
        smallImages: smallImageUrlSets,
        fileDetails: {
          mainImage: {
            desktop: mainImageResults.desktop,
            mobile: mainImageResults.mobile,
          },
          smallImages: smallImagesResults,
        },
      };

      // #region agent log
      agentLog('B', 'backend/index.js:/upload:exit', 'upload response urls', {
        mainDesktopUrl: response?.mainImage?.desktop,
        mainPublicDesktopUrl: response?.mainImage?.publicDesktop,
        smallImagesCount: Array.isArray(response?.smallImages)
          ? response.smallImages.length
          : 0,
      });
      // #endregion

      // #region agent log
      agentLog(
        'B',
        'backend/index.js:/upload:before-send',
        'calling res.json',
        {
          responseSize: JSON.stringify(response).length,
          headersSent: res.headersSent,
          writableEnded: res.writableEnded,
        }
      );
      // #endregion

      res.on('error', err => {
        // #region agent log
        agentLog(
          'B',
          'backend/index.js:/upload:res-error',
          'response stream error',
          {
            error: err.message,
            stack: err.stack,
          }
        );
        // #endregion
      });

      // Send response body (headers already sent early to keep connection alive)
      const responseBody = JSON.stringify(response);
      if (res.headersSent) {
        // Headers were sent early, send body directly
        // Use write + end to ensure proper chunked encoding if needed
        res.write(responseBody);
        res.end();
      } else {
        // Headers weren't sent early (shouldn't happen), use normal res.json
        res.json(response);
      }

      // #region agent log
      agentLog('B', 'backend/index.js:/upload:after-send', 'res.end called', {
        headersSent: res.headersSent,
        writableEnded: res.writableEnded,
      });
      // #endregion
    } catch (error) {
      if (!isProd) console.error('Upload error:', error);
      else {
        console.error('Upload error:', {
          message: error?.message || null,
          code: error?.code || null,
        });
      }
      return res.status(500).json({
        error: isProd
          ? 'Server error during upload'
          : 'Server error during upload: ' + error.message,
        success: false,
        ...(isProd ? {} : { message: error?.message }),
      });
    }
  }
);

// NOTE: Error-handling middleware is registered near the end of the file (after all routes),
// so that errors from any route can be handled consistently as JSON.

// Payment Processing Endpoints
app.post('/webhook', (request, response) => {
  const sig = request.headers['stripe-signature'];
  const payload = request.rawBody;
  let event;

  try {
    if (!sig || !payload) {
      return response.status(400).send('Missing webhook signature or payload');
    }
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      `${process.env.WEBHOOK_SEC}`
    );
  } catch (err) {
    console.warn(
      `⚠️ Stripe webhook signature verification failed: ${err?.message || err}`
    );
    return response.sendStatus(400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (process.env.NODE_ENV !== 'production') {
      console.log('2. From webhook:', session.metadata.productId);
    }
    void handleCheckoutSession(session).catch(err => {
      console.error('Error handling checkout.session.completed:', err);
    });
  }

  response.json({ received: true });
});

app.post('/create-checkout-session', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) {
      return res.status(400).json({ error: 'Missing items' });
    }

    const firstItem = items[0];
    const requestedProductId = Number(firstItem?.id);
    if (!Number.isFinite(requestedProductId)) {
      return res.status(400).json({ error: 'Invalid product id' });
    }

    const product = await Product.findOne({ id: requestedProductId });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!product.quantity || product.quantity <= 0) {
      return res.status(400).json({ error: 'Product is out of stock' });
    }

    const reqCurrency = req.body.currency;

    // Debug logging: Log incoming cart items
    if (!isProd) {
      console.log('=== Stripe Checkout Debug ===');
      console.log('Request currency:', reqCurrency);
      console.log('Cart items received:', JSON.stringify(items, null, 2));
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: await Promise.all(
        items.map(async item => {
          // Debug logging: Log price fields for each item
          if (!isProd) {
            console.log(`\nProcessing item ${item.id} (${item.title}):`);
            console.log(
              '  - item.price:',
              item.price,
              'type:',
              typeof item.price
            );
            console.log(
              '  - item.discountedPrice:',
              item.discountedPrice,
              'type:',
              typeof item.discountedPrice
            );
            console.log(
              '  - item.originalPrice:',
              item.originalPrice,
              'type:',
              typeof item.originalPrice
            );
            console.log(
              '  - item.usdPrice:',
              item.usdPrice,
              'type:',
              typeof item.usdPrice
            );
            console.log('  - item.currency:', item.currency);
          }

          // Fetch product from database to get stored USD price
          const dbProduct = await Product.findOne({ id: item.id });
          if (!dbProduct) {
            throw new Error(`Product ${item.id} not found in database`);
          }

          // Use stored USD price from database (always use USD for Stripe)
          // The database already has the correct USD price (discounted if discount is active)
          let itemPriceUSD = Math.round(Number(dbProduct.usd_price) || 0);

          if (!isProd) {
            console.log('  - Product USD price from database:', itemPriceUSD);
            console.log(
              '  - Product discount_percentage:',
              dbProduct.discount_percentage
            );
            if (dbProduct.original_usd_price) {
              console.log(
                '  - Product original USD price:',
                dbProduct.original_usd_price
              );
            }
          }

          // Validate the price is a valid number
          if (
            !Number.isFinite(itemPriceUSD) ||
            itemPriceUSD <= 0 ||
            itemPriceUSD > 1000000
          ) {
            const errorMsg = `Invalid USD price for item ${item.id}: usd_price=${dbProduct.usd_price}, parsed=${itemPriceUSD}`;
            console.error('Price validation failed:', errorMsg);
            throw new Error(errorMsg);
          }

          // Convert USD price to cents (Stripe uses cents)
          const inCents = Math.round(itemPriceUSD * 100);

          if (!isProd) {
            console.log(`  - Price in USD: $${itemPriceUSD}`);
            console.log(
              `  - Converted to cents: ${inCents} ($${(inCents / 100).toFixed(
                2
              )})`
            );
          }

          const myItem = {
            name: item.title,
            price: inCents,
            quantity: item.amount,
            productId: item.id,
          };

          if (!isProd) {
            console.log(
              `  - Final Stripe amount: ${inCents} cents ($${(
                inCents / 100
              ).toFixed(2)}) for quantity ${item.amount}`
            );
          }

          return {
            price_data: {
              currency: 'usd',
              product_data: {
                name: myItem.name,
              },
              unit_amount: myItem.price,
            },
            quantity: myItem.quantity,
          };
        })
      ),
      shipping_address_collection: {
        allowed_countries: ['US', 'IL'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 1500,
              currency: 'usd',
            },
            display_name: 'Standard Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'week',
                value: 2,
              },
              maximum: {
                unit: 'week',
                value: 4,
              },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 2000,
              currency: 'usd',
            },
            display_name: 'Expedited Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 10,
              },
              maximum: {
                unit: 'business_day',
                value: 12,
              },
            },
          },
        },
      ],
      success_url: `${process.env.HOST}/index.html`,
      cancel_url: `${process.env.HOST}/html/cart.html`,
      metadata: {
        productId: requestedProductId.toString(),
      },
    });

    // Debug logging: Log the actual session data sent to Stripe
    if (!isProd) {
      console.log('\n=== Stripe Session Created ===');
      console.log('Session ID:', session.id);
      console.log('Session URL:', session.url);
      console.log('Currency:', session.currency);
      console.log(
        'Amount total (from session):',
        session.amount_total,
        'cents = $' + ((session.amount_total || 0) / 100).toFixed(2)
      );
      console.log(
        'Amount subtotal (from session):',
        session.amount_subtotal,
        'cents = $' + ((session.amount_subtotal || 0) / 100).toFixed(2)
      );

      // Try to retrieve the session with line items expanded
      try {
        const expandedSession = await stripe.checkout.sessions.retrieve(
          session.id,
          {
            expand: ['line_items', 'line_items.data.price'],
          }
        );
        console.log('\n=== Expanded Session Details ===');
        console.log('Currency:', expandedSession.currency);
        console.log(
          'Amount total:',
          expandedSession.amount_total,
          'cents = $' + (expandedSession.amount_total / 100).toFixed(2)
        );
        console.log(
          'Amount subtotal:',
          expandedSession.amount_subtotal,
          'cents = $' + (expandedSession.amount_subtotal / 100).toFixed(2)
        );
        console.log('Display items:', expandedSession.display_items);

        if (expandedSession.line_items && expandedSession.line_items.data) {
          expandedSession.line_items.data.forEach((lineItem, index) => {
            console.log(`\nLine Item ${index + 1}:`);
            console.log('  - Description:', lineItem.description);
            console.log(
              '  - Amount total:',
              lineItem.amount_total,
              'cents = $' + (lineItem.amount_total / 100).toFixed(2)
            );
            console.log('  - Quantity:', lineItem.quantity);
            if (lineItem.price) {
              console.log(
                '  - Unit amount:',
                lineItem.price.unit_amount,
                'cents = $' +
                  ((lineItem.price.unit_amount || 0) / 100).toFixed(2)
              );
              console.log('  - Currency:', lineItem.price.currency);
              console.log('  - Product:', lineItem.price.product);
            }
          });
        }

        // Calculate what it should be in ILS (for debug purposes)
        const totalUSD = expandedSession.amount_subtotal / 100;
        const exchangeRate = await exchangeRateService.getExchangeRate();
        const totalILS = Math.round(totalUSD * exchangeRate);
        console.log(`\n=== Currency Conversion Check ===`);
        console.log(`Total in USD: $${totalUSD.toFixed(2)}`);
        console.log(`Exchange rate: ${exchangeRate}`);
        console.log(`Expected in ILS: ₪${totalILS.toFixed(2)}`);
        console.log(`You're seeing on Stripe: ₪95.86`);
        console.log(`Difference: ₪${(totalILS - 95.86).toFixed(2)}`);
      } catch (expandError) {
        console.log('Could not expand session:', expandError.message);
        console.log('Error details:', expandError);
      }
    }

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

app.post('/orders', paymentRateLimiter, async (req, res) => {
  try {
    const { cart } = req.body;
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res
        .status(400)
        .json({ error: 'Invalid cart data. Cart must be a non-empty array.' });
    }

    if (!isProd) {
      console.log(
        'Creating PayPal order with cart:',
        JSON.stringify(cart, null, 2)
      );
    }

    const result = await createOrder(cart);
    if (!isProd)
      console.log('PayPal order creation successful:', result.httpStatusCode);
    res.status(result.httpStatusCode).json(result.jsonResponse);
  } catch (error) {
    if (!isProd) {
      console.error(
        'Failed to create PayPal order:',
        error?.code || error?.message || error
      );
    } else {
      console.error('Failed to create PayPal order:', {
        code: error?.code || null,
        statusCode: error?.statusCode || null,
        httpStatusCode: error?.httpStatusCode || null,
      });
    }
    const status =
      error?.statusCode && Number.isInteger(error.statusCode)
        ? error.statusCode
        : 500;
    res.status(status).json({
      error: 'Failed to create order.',
      code: error?.code || 'ORDER_CREATE_FAILED',
      // Include PayPal debug_id in all environments so production issues can be diagnosed.
      ...(error?.paypalDebugId ? { paypalDebugId: error.paypalDebugId } : {}),
      ...(isProd
        ? {}
        : { message: error?.message, paypalDetails: error?.paypalDetails }),
    });
  }
});

app.post('/orders/:orderID/capture', paymentRateLimiter, async (req, res) => {
  try {
    const { orderID } = req.params;
    const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    if (!isProd) {
      console.error('Failed to capture PayPal order:', error);
    } else {
      console.error('Failed to capture PayPal order:', {
        code: error?.code || null,
        statusCode: error?.statusCode || null,
        httpStatusCode: error?.httpStatusCode || null,
      });
    }
    const status =
      error?.statusCode && Number.isInteger(error.statusCode)
        ? error.statusCode
        : 500;
    res.status(status).json({
      error: 'Failed to capture order.',
      code: error?.code || 'ORDER_CAPTURE_FAILED',
      ...(isProd ? {} : { message: error?.message }),
    });
  }
});

app.post(
  '/deleteproductimage',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      const { productId, imageType, imageUrl } = req.body || {};
      const id = Number(productId);

      if (!Number.isFinite(id)) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid productId' });
      }
      if (imageType !== 'main' && imageType !== 'small') {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid imageType' });
      }

      const product = await Product.findOne({ id });
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: 'Product not found' });
      }

      const extractFilename = url => {
        if (!url || typeof url !== 'string') return '';
        const rel = toRelativeApiPath(url);
        return rel ? path.basename(rel) : '';
      };

      const unlinkIfExists = async filePath => {
        try {
          await fs.promises.unlink(filePath);
        } catch {
          // ignore
        }
      };

      if (imageType === 'main') {
        const candidates = [
          product.image,
          product.publicImage,
          product.directImageUrl,
          product.mainImage?.desktop,
          product.mainImage?.mobile,
          product.mainImage?.publicDesktop,
          product.mainImage?.publicMobile,
        ]
          .map(extractFilename)
          .filter(Boolean);

        await Promise.all(
          candidates.flatMap(fn => [
            unlinkIfExists(path.join(uploadsDir, fn)),
            unlinkIfExists(path.join(publicUploadsDir, fn)),
          ])
        );

        product.image = null;
        product.publicImage = null;
        product.directImageUrl = null;
        product.imageLocal = null;

        if (product.mainImage) {
          product.mainImage.desktop = null;
          product.mainImage.mobile = null;
          product.mainImage.publicDesktop = null;
          product.mainImage.publicMobile = null;
          product.mainImage.desktopLocal = null;
          product.mainImage.mobileLocal = null;
        }

        await product.save();
        return res.json({
          success: true,
          message: 'Main image deleted successfully',
        });
      }

      // small image deletion
      const target = extractFilename(imageUrl);
      if (!target) {
        return res
          .status(400)
          .json({ success: false, message: 'Missing imageUrl' });
      }
      const validation = validateImageFilename(target);
      if (!validation.ok) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid imageUrl' });
      }

      const base = target.replace(/-(desktop|mobile)\.webp$/i, '');
      const variantDesktop = `${base}-desktop.webp`;
      const variantMobile = `${base}-mobile.webp`;

      if (Array.isArray(product.smallImages)) {
        product.smallImages = product.smallImages.filter(si => {
          if (typeof si === 'string') {
            const fn = extractFilename(si);
            return (
              fn !== target && fn !== variantDesktop && fn !== variantMobile
            );
          }
          if (si && typeof si === 'object') {
            const fnD = extractFilename(si.desktop);
            const fnM = extractFilename(si.mobile);
            return (
              fnD !== target &&
              fnM !== target &&
              fnD !== variantDesktop &&
              fnM !== variantDesktop &&
              fnD !== variantMobile &&
              fnM !== variantMobile
            );
          }
          return true;
        });
      }

      if (Array.isArray(product.smallImagesLocal)) {
        product.smallImagesLocal = product.smallImagesLocal.filter(u => {
          const fn = extractFilename(u);
          return fn !== target && fn !== variantDesktop && fn !== variantMobile;
        });
      }

      await product.save();

      await Promise.all([
        unlinkIfExists(path.join(smallImagesDir, variantDesktop)),
        unlinkIfExists(path.join(smallImagesDir, variantMobile)),
        unlinkIfExists(path.join(publicSmallImagesDir, variantDesktop)),
        unlinkIfExists(path.join(publicSmallImagesDir, variantMobile)),
        unlinkIfExists(path.join(smallImagesDir, target)),
        unlinkIfExists(path.join(publicSmallImagesDir, target)),
      ]);

      return res.json({
        success: true,
        message: 'Small image deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete image',
        ...(isProd ? {} : { details: error?.message }),
      });
    }
  }
);

// Fetch a single product by id
app.get('/getproduct/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ id: Number(req.params.id) });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

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
app.listen(process.env.SERVER_PORT || 4000, error => {
  if (!error) {
    console.log('Server Running on Port ' + (process.env.SERVER_PORT || 4000));
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
    console.log('Error : ' + error);
  }
});

// Image processing function
const processImage = async (inputPath, filename, isMainImage = true) => {
  const outputDir = isMainImage ? uploadsDir : smallImagesDir;
  const publicDir = isMainImage ? publicUploadsDir : publicSmallImagesDir;
  const results = {};

  try {
    const baseName = path.parse(filename).name;
    const lowerFilename = filename.toLowerCase();
    const isRAW =
      lowerFilename.endsWith('.cr2') || lowerFilename.endsWith('.arw');

    // Create WebP versions for both desktop and mobile
    const desktopFilename = `${baseName}-desktop.webp`;
    const mobileFilename = `${baseName}-mobile.webp`;

    const desktopPath = path.join(outputDir, desktopFilename);
    const mobilePath = path.join(outputDir, mobileFilename);
    const publicDesktopPath = path.join(publicDir, desktopFilename);
    const publicMobilePath = path.join(publicDir, mobileFilename);

    // Enhanced Sharp configuration for RAW files
    const sharpOptions = {
      failOnError: false,
      raw: isRAW
        ? {
            width: 5000,
            height: 4000,
            channels: 3,
            density: 300, // Add DPI setting for better quality
          }
        : undefined,
    };

    const safeUnlink = async filePath => {
      if (!filePath) return;
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // ignore
      }
    };

    // Function to process image with fallback
    const processWithFallback = async (
      inputPath,
      options,
      outputPath,
      size
    ) => {
      try {
        // First attempt: Direct RAW processing
        await sharp(inputPath, options)
          .rotate() // Auto-rotate based on EXIF
          .resize({
            width: size,
            withoutEnlargement: true,
            fit: 'inside',
          })
          .webp({
            quality: 85,
            effort: 6, // Higher compression effort for better quality
            smartSubsample: true, // Enable smart subsampling
            nearLossless: true, // Use near-lossless compression
          })
          .toFile(outputPath);
      } catch (error) {
        console.warn(
          `First attempt failed for ${filename}, trying fallback method:`,
          error.message
        );

        try {
          // Second attempt: Convert to TIFF first for RAW files
          if (isRAW) {
            const tiffPath = path.join(outputDir, `${baseName}-temp.tiff`);
            await sharp(inputPath, options)
              .rotate()
              .toFormat('tiff')
              .toFile(tiffPath);

            // Then convert TIFF to WebP
            await sharp(tiffPath)
              .resize({
                width: size,
                withoutEnlargement: true,
                fit: 'inside',
              })
              .webp({
                quality: 85,
                effort: 6,
                smartSubsample: true,
                nearLossless: true,
              })
              .toFile(outputPath);

            // Clean up temporary TIFF file
            await safeUnlink(tiffPath);
          } else {
            throw error; // Re-throw if not RAW file
          }
        } catch (fallbackError) {
          console.error(
            `Both attempts failed for ${filename}:`,
            fallbackError.message
          );
          throw fallbackError;
        }
      }
    };

    // Process desktop version
    await processWithFallback(inputPath, sharpOptions, desktopPath, 1200);

    // Process mobile version
    await processWithFallback(inputPath, sharpOptions, mobilePath, 600);

    // Copy to public directory if successful
    await fs.promises.copyFile(desktopPath, publicDesktopPath);
    await fs.promises.copyFile(mobilePath, publicMobilePath);

    // Upload variants to Spaces (durable storage for App Platform)
    const keyPrefix = isMainImage ? 'products/main' : 'products/small';
    const keyStamp = Date.now();
    const desktopKey = `${keyPrefix}/${keyStamp}-${desktopFilename}`;
    const mobileKey = `${keyPrefix}/${keyStamp}-${mobileFilename}`;

    const desktopSpacesUrl = await uploadFileToSpaces(
      desktopKey,
      desktopPath,
      'image/webp'
    );
    const mobileSpacesUrl = await uploadFileToSpaces(
      mobileKey,
      mobilePath,
      'image/webp'
    );

    // #region agent log
    agentLog(
      'B',
      'backend/index.js:processImage',
      'processed & copied image variants',
      {
        isMainImage,
        desktopFilename,
        mobileFilename,
        desktopExists: fs.existsSync(desktopPath),
        mobileExists: fs.existsSync(mobilePath),
        publicDesktopExists: fs.existsSync(publicDesktopPath),
        publicMobileExists: fs.existsSync(publicMobilePath),
        spacesEnabled: !!desktopSpacesUrl && !!mobileSpacesUrl,
      }
    );
    // #endregion

    // Return results
    results.desktop = {
      filename: desktopFilename,
      path: desktopPath,
      publicPath: publicDesktopPath,
      spacesKey: desktopKey,
      spacesUrl: desktopSpacesUrl,
    };
    results.mobile = {
      filename: mobileFilename,
      path: mobilePath,
      publicPath: publicMobilePath,
      spacesKey: mobileKey,
      spacesUrl: mobileSpacesUrl,
    };

    // Best-effort cleanup of the original uploaded file to save disk
    await safeUnlink(inputPath);

    return results;
  } catch (error) {
    // Best-effort cleanup of partially created outputs
    try {
      const baseName = path.parse(filename).name;
      const desktopFilename = `${baseName}-desktop.webp`;
      const mobileFilename = `${baseName}-mobile.webp`;
      await fs.promises
        .unlink(path.join(outputDir, desktopFilename))
        .catch(() => {});
      await fs.promises
        .unlink(path.join(outputDir, mobileFilename))
        .catch(() => {});
      await fs.promises
        .unlink(path.join(publicDir, desktopFilename))
        .catch(() => {});
      await fs.promises
        .unlink(path.join(publicDir, mobileFilename))
        .catch(() => {});
    } catch {
      // ignore
    }
    if (process.env.NODE_ENV !== 'production') {
      console.error(`Error processing image ${filename}:`, error);
    } else {
      console.error('Error processing image:', {
        filename,
        message: error?.message || null,
      });
    }
    throw error;
  }
};
