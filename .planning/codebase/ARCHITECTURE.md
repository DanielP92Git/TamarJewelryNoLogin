# Architecture

**Analysis Date:** 2026-02-01

## Pattern Overview

**Overall:** Multi-tier SPA (Single Page Application) with separate frontend and backend, combining MVC client-side pattern with monolithic Express server API.

**Key Characteristics:**
- Frontend SPA with MVC architecture (controller-driven routing, view classes, model for state/API calls)
- Express/Node.js monolithic backend handling all routes, middleware, and integrations
- Server-side locale detection (GeoIP) with client-side overrides
- Multi-language (English/Hebrew RTL) and multi-currency (USD/ILS) first-class support
- Image processing and CDN integration (DigitalOcean Spaces)
- Payment processing (PayPal, Stripe)
- Admin dashboard functionality co-located with public API

## Layers

**Frontend Presentation (MVC Views):**
- Purpose: Render HTML, handle user interactions, manage DOM
- Location: `frontend/js/Views/` (page-specific view classes)
- Contains: View subclasses (homePageView, cartView, categoriesView, etc.) extending base View
- Depends on: View (base class), model, locale
- Used by: controller

**Frontend State & API (MVC Model):**
- Purpose: Manage cart state, localStorage persistence, API communication with backend
- Location: `frontend/js/model.js`
- Contains: Exported functions for cart management, data fetching
- Depends on: API_URL environment variable
- Used by: Views and controller

**Frontend Routing (MVC Controller):**
- Purpose: Page navigation, event handlers, view instantiation, model coordination
- Location: `frontend/js/controller.js`
- Contains: Control functions (controlHomePage, controlAboutPage, etc.), event delegation
- Depends on: Views, model, locale
- Used by: HTML entry points via addEventListener('load')

**Frontend Localization:**
- Purpose: Language/currency persistence, locale detection, backend sync
- Location: `frontend/js/locale.js` (initialization and utilities)
- Contains: Browser locale guessing, backend API calls to /api/locale, localStorage synchronization
- Depends on: Backend /api/locale endpoint
- Used by: controller, View base class

**Backend API (Express Routes):**
- Purpose: REST endpoints for products, cart, payments, admin operations, images
- Location: `backend/index.js` (monolithic)
- Contains: All route handlers, middleware, payment integrations inline
- Depends on: Mongoose models, auth middleware, external APIs (PayPal, Stripe, DigitalOcean)
- Used by: Frontend, admin dashboard

**Backend Models (Mongoose):**
- Purpose: Database schema definitions, data validation
- Location: `backend/models/` (Product, User, Settings)
- Contains: Schema definitions with validation and indexing
- Depends on: MongoDB via Mongoose
- Used by: Route handlers in index.js

**Backend Authentication:**
- Purpose: JWT token validation, user lookup, role-based access control (RBAC)
- Location: `backend/middleware/auth.js`
- Contains: getTokenFromRequest, authUser, fetchUser, requireAdmin functions
- Depends on: Users model, JWT library, bcrypt
- Used by: Protected routes (admin, cart operations)

**Backend Services (Business Logic):**
- Purpose: Exchange rate fetching, caching, fallback management
- Location: `backend/services/exchangeRateService.js`
- Contains: fetchCurrentRate, getExchangeRate, isRateStale functions
- Depends on: External exchange rate APIs, Settings model
- Used by: Routes that return products with pricing

**Backend Jobs (Scheduled Tasks):**
- Purpose: Periodic exchange rate updates via node-cron
- Location: `backend/jobs/exchangeRateJob.js`
- Contains: Scheduled job initialization and execution
- Depends on: exchangeRateService
- Used by: Server startup (index.js)

**Backend Configuration:**
- Purpose: Database connection, locale/GeoIP detection, environment setup
- Location: `backend/config/` (db.js, locale.js)
- Contains: MongoDB connection, request-level locale resolution via GeoIP/headers
- Depends on: geoip-lite, MongoDB, environment variables
- Used by: Server initialization and route handlers

## Data Flow

**Product Display Flow:**
1. Frontend controller routes to page (categories, home, etc.)
2. View class initializes, calls model.handleLoadStorage() to sync cart
3. View renders stored products from localStorage or fetches fresh from /api/products
4. Backend /api/products route queries Product model from MongoDB
5. normalizeProductForClient() transforms image URLs (relative → absolute CDN)
6. Response includes USD/ILS prices based on stored exchange rate in Settings
7. Frontend displays products with current user's selected currency

**Cart Management Flow:**
1. User selects product, view calls model.addToCart() or model.updateCart()
2. Cart array in memory synced to localStorage (cart key)
3. If logged in (auth-token in localStorage), cart also POSTed to backend /getcart endpoint
4. Backend fetchUserCartAPI() returns persisted user cart from User model
5. Controller refreshes cart icon with checkCartNumber()

**Locale Detection Flow:**
1. Frontend loads, controller calls bootstrapLocaleSync() before any views render
2. Locale module tries in order:
   - localStorage (user's previous choice)
   - Backend /api/locale endpoint (GeoIP + headers)
   - Browser navigator.language and Intl timezone
   - Default to English/USD
3. Backend resolveRequestLocale() resolves via:
   - Locale preference cookie (if exists)
   - CDN/proxy headers (cf-ipcountry, x-vercel-ip-country, etc.)
   - GeoIP lookup on client IP
   - Default English/USD
4. Currency/language selectors synchronized via custom localStorage events
5. All subsequent API calls use Accept-Language and store selected currency

**Payment Flow:**
1. User submits order from cart view
2. Frontend calls /api/payments/paypal/orders (POST) or /api/payments/stripe (POST)
3. Backend creates PayPal/Stripe order with items, prices (converted to user's currency)
4. Order returned to frontend with approval URL (PayPal) or clientSecret (Stripe)
5. Frontend redirects to PayPal or opens Stripe modal
6. Payment provider redirects back to /api/payments/paypal/capture (PayPal) or /api/payments/stripe/webhook (Stripe)
7. Backend verifies payment, updates user cart, sends confirmation email

**Image Upload & Processing:**
1. Admin uploads image via /upload endpoint (requires auth + admin role)
2. Multer middleware validates and stores temp file
3. Sharp processes image (resize, format, quality)
4. Image uploaded to DigitalOcean Spaces (S3-compatible)
5. URLs stored in Product model (desktop/mobile variants)
6. Public URLs returned and persisted in database
7. Frontend receives CDN URLs for display

**State Management:**

Frontend:
- localStorage: `language` (eng|heb), `currency` (usd|ils), `cart` (JSON array), `auth-token` (JWT)
- Memory: cart array in model.cart (synced to localStorage)
- View instances: hold DOM references, event listeners

Backend:
- MongoDB: Products, Users (with cart, auth), Settings (exchange rate)
- In-memory: Exchange rate cached in Settings collection with timestamp
- Request context: req.user, req.userDoc populated by fetchUser middleware

## Key Abstractions

**View Base Class:**
- Purpose: Shared DOM management, language switching, header/menu rendering, currency handling
- Examples: `frontend/js/View.js` extended by all view classes
- Pattern: Parent class with virtual methods (setLanguage, setXxxLanguage, handleLanguage) overridden in subclasses
- Provides: Common header, menu, language/currency selectors, cart display

**LocaleManager (implicit):**
- Purpose: Encapsulate locale detection and persistence logic
- Examples: `frontend/js/locale.js` (functions), `backend/config/locale.js` (GeoIP resolution)
- Pattern: Utility functions chained for fallback detection, no classes
- Handles: Mapping between ISO codes (en, ILS) and app codes (eng, ils)

**ExchangeRateService:**
- Purpose: Abstract exchange rate fetching and caching strategy
- Examples: `backend/services/exchangeRateService.js`
- Pattern: Functions with fallback chain (API → stored → env → default)
- Provides: Single source of truth for USD/ILS conversion

**Product Normalization:**
- Purpose: Transform stored relative image URLs to absolute CDN URLs before sending to client
- Examples: normalizeProductForClient() in `backend/index.js`
- Pattern: Post-processing function applied to all product responses
- Ensures: Frontend always receives valid, absolute URLs (not relative paths)

**Multer Middleware (Upload):**
- Purpose: Validate and temporarily store uploaded files before S3 upload
- Examples: Configured in `backend/index.js` for /upload endpoint
- Pattern: Express middleware chaining (validate → process → upload)
- Supports: Image resizing via Sharp for responsive variants

## Entry Points

**Frontend HTML Pages:**
- Location: `frontend/html/*.html` (index.html, about.html, cart.html, etc.)
- Triggers: Browser navigation to route
- Responsibilities: Load Parcel-bundled JS, define DOM structure, include template partials (header, footer)

**Frontend Controller:**
- Location: `frontend/js/controller.js`
- Triggers: window load event in each HTML page
- Responsibilities: Initialize locale, instantiate view for page, wire up event handlers, call model methods

**Backend Server:**
- Location: `backend/index.js` (Express app initialization)
- Triggers: `npm run devStart` (dev) or `npm start` (production)
- Responsibilities: Start Express server, connect to MongoDB, initialize exchange rate job, set up all routes and middleware

**Payment Webhooks:**
- Location: Backend routes /api/payments/paypal/capture, /api/payments/stripe/webhook
- Triggers: External payment provider callbacks (PayPal redirect, Stripe webhook)
- Responsibilities: Verify payment signature, update order status, persist cart changes

**Exchange Rate Job:**
- Location: `backend/jobs/exchangeRateJob.js`
- Triggers: Server startup (startExchangeRateJob) and periodic node-cron schedule
- Responsibilities: Fetch current USD/ILS rate, update Settings collection, maintain fallback chain

## Error Handling

**Strategy:** Try-catch wrapping with fallback defaults; graceful degradation for external services.

**Patterns:**

Frontend:
- Locale detection: Falls back through localStorage → backend → browser hints → English/USD
- Image loading: Placeholder SVG (no-image.svg) returned if file missing
- API calls: Console error logging, user-facing error messages in modals/notifications
- Uncaught errors: May not be reported (no error tracking service configured)

Backend:
- Database errors: 500 response, logged to console
- Authentication: 401/403 responses with error messages
- Rate limiting: 429 response with standard headers
- External API failures (exchange rate, PayPal): Fallback to cached/default values
- File operations: Validate paths with safeResolveUnder() to prevent traversal attacks
- Multer upload errors: Caught and returned as 400/413 responses

## Cross-Cutting Concerns

**Logging:** Console.log/console.error (development) with agentLog() function for hypothesis-driven debugging. No centralized logging service.

**Validation:**
- Frontend: Minimal validation (form state, localStorage data)
- Backend: Path traversal protection (safeResolveUnder), filename validation (validateImageFilename), JWT validation (fetchUser)

**Authentication:**
- Strategy: JWT token stored in localStorage on frontend, sent via auth-token or Authorization header
- Token generation: Issued on login (authUser middleware)
- Token verification: fetchUser middleware decodes JWT, looks up user in database, checks userType (admin/user)
- Role-based access: requireAdmin middleware ensures user.userType === 'admin'

**Security:**
- CORS: Single allowlist defined in index.js, includes localhost (dev), HOST, ADMIN_URL, FULLHOST
- CSRF: Not explicitly handled (assuming same-site tokens used by payment providers)
- Rate limiting: Three tiers (auth 20/15m, payment 60/15m, admin 120/15m) per IP
- Helmet.js: Basic security headers (no CSP due to SPA + cross-origin images)
- HTTPS: Enforced in production (trust proxy = 1 for real IP detection)
- File upload: Extension whitelist, filename validation, path traversal protection

---

*Architecture analysis: 2026-02-01*
