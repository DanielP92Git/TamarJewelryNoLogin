# External Integrations

**Analysis Date:** 2026-01-31

## APIs & External Services

**Payment Processing:**
- **Stripe** - Credit/debit card payments
  - SDK/Client: `stripe` npm package (v16.10.0)
  - Auth: `STRIPE_SECRET_KEY` environment variable
  - Webhook: `/webhook` endpoint in `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\index.js` (line 606)
  - Webhook secret: `WEBHOOK_SEC` environment variable

- **PayPal** - Alternative payment method
  - SDK/Client: `@paypal/checkout-server-sdk` npm package (v1.0.3)
  - Auth: `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` environment variables
  - API Base URL: `PAYPAL_BASE_URL` (defaults to sandbox: https://api-m.sandbox.paypal.com)
  - Credentials handled in `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\index.js` (lines 73-79)

**Email Service:**
- **EmailJS** - Contact form email submissions
  - SDK/Client: `@emailjs/browser` npm package (v4.3.3)
  - Implementation: `C:\Users\pagis\OneDrive\WebDev\Projects\Online\frontend\js\Views\contactMeView.js` (line 1, 151)
  - Service ID: `service_t4qcx4j`
  - Template ID: `template_kwezl8a`
  - Public key: Embedded in frontend code (no auth token stored in env)

**Geolocation & Locale:**
- **GeoIP Lite** - IP-based country detection
  - SDK/Client: `geoip-lite` npm package (v1.4.10)
  - Purpose: Detect user location for automatic language/currency selection (Hebrew/English, ILS/USD)
  - Implementation: `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\config\locale.js`
  - Falls back to CDN headers if available (Cloudflare, Vercel, GAE, CloudFront, Fastly)

**Exchange Rate Conversion:**
- **exchangerate-api.com** - USD to ILS conversion (Primary)
  - Endpoint: `https://api.exchangerate-api.com/v4/latest/USD`
  - Purpose: Real-time exchange rates for currency conversion
  - Implementation: `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\services\exchangeRateService.js`

- **exchangerate.host** - USD to ILS conversion (Fallback)
  - Endpoint: `https://api.exchangerate.host/latest?base=USD&symbols=ILS`
  - Purpose: Backup exchange rate source if primary fails
  - Implementation: `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\services\exchangeRateService.js`

**Analytics:**
- **Microsoft Clarity** - User analytics and session recording
  - Implementation: Embedded script in `C:\Users\pagis\OneDrive\WebDev\Projects\Online\frontend\index.html` (lines 71-85)
  - Tracking ID: `urnhsmmp4u`
  - Script loaded from: `https://www.clarity.ms/tag/`

## Data Storage

**Databases:**
- **MongoDB** - Primary database for users, products, settings
  - Connection: `MONGO_URL` environment variable
  - Client: Mongoose ORM (v8.6.1)
  - Models:
    - `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\models\User.js` - User accounts, cart data
    - `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\models\Product.js` - Product catalog with pricing, images
    - `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\models\Settings.js` - Global settings, exchange rates

**File Storage:**
- **DigitalOcean Spaces** (S3-compatible)
  - Configuration: `SPACES_BUCKET`, `SPACES_REGION`, `SPACES_ENDPOINT`, `SPACES_KEY`, `SPACES_SECRET`
  - Optional CDN URL: `SPACES_CDN_BASE_URL`
  - Purpose: Store product images (responsive versions)
  - Client: AWS SDK (`aws-sdk` npm package)
  - Implementation: Image upload/processing in `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\index.js`
  - Image processing: Sharp for responsive image generation (desktop/mobile versions)

**Frontend Storage:**
- **localStorage** - Client-side cart state and user preferences
  - Implementation: `C:\Users\pagis\OneDrive\WebDev\Projects\Online\frontend\js\model.js`

**Caching:**
- None detected. Exchange rates cached in MongoDB Settings collection

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\middleware\auth.js`
  - JWT library: jsonwebtoken (v9.0.2)
  - JWT secret: `JWT_KEY` environment variable
  - Token expiry: `JWT_EXPIRES_IN` environment variable (default: 1h)
  - Password hashing: bcrypt (v5.1.1)
  - User model: `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\models\User.js`
  - Role-based access control: admin vs user roles

**Token Format:**
- Bearer token in Authorization header or `auth-token` header
- Extracted in `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\middleware\auth.js` (lines 6-14)

## Monitoring & Observability

**Error Tracking:**
- None detected. No Sentry, Rollbar, or similar error tracking service.

**Logs:**
- Console logging only
- Development mode: verbose logging in `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\index.js`
- Production mode: minimal logging

**Debug/Telemetry:**
- Custom agent logging (internal debug system)
  - `agentLog` function in `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\index.js` (lines 29-70)
  - Sends to internal endpoint when `DEBUG_RUN_ID` env var is set
  - Used for development hypothesis testing

## CI/CD & Deployment

**Hosting:**
- DigitalOcean (App Platform or Droplets)
- Configuration documented in `DIGITALOCEAN_SETUP.md`
- Clean URL rewriting setup required (see DIGITALOCEAN_SETUP.md)

**CI Pipeline:**
- None detected. No GitHub Actions, GitLab CI, or similar automation.

**Build Process:**
- Frontend: Parcel bundler (`npm run build` creates `./dist`)
- Post-build script: `C:\Users\pagis\OneDrive\WebDev\Projects\Online\frontend\postbuild.js` (generates favicon)
- Backend: Node.js runs directly without build step

## Environment Configuration

**Required env vars:**

Backend (from `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\env.example`):
- `NODE_ENV` - development or production
- `SERVER_PORT` - server port (default: 4000)
- `MONGO_URL` - MongoDB connection string
- `JWT_KEY` - JWT signing secret (min 32 chars)
- `JWT_EXPIRES_IN` - Token expiry (default: 1h)
- `HOST` - Frontend origin for CORS
- `ADMIN_URL` - Admin site origin
- `API_URL` - API base URL
- `STRIPE_SECRET_KEY` - Stripe secret key
- `WEBHOOK_SEC` - Stripe webhook signing secret
- `PAYPAL_CLIENT_ID` - PayPal client ID
- `PAYPAL_CLIENT_SECRET` - PayPal client secret
- `PAYPAL_BASE_URL` - PayPal API base (sandbox or live)
- `USD_ILS_RATE` - Fallback exchange rate
- `SPACES_BUCKET`, `SPACES_REGION`, `SPACES_ENDPOINT`, `SPACES_KEY`, `SPACES_SECRET` - DigitalOcean Spaces
- `SPACES_CDN_BASE_URL` - Optional CDN URL for image delivery
- `RATE_LIMIT_AUTH_MAX` - Max auth requests per 15min (default: 20)
- `RATE_LIMIT_PAYMENT_MAX` - Max payment requests per 15min (default: 60)
- `RATE_LIMIT_ADMIN_MAX` - Max admin requests per 15min (default: 120)
- `UPLOAD_MAX_FILE_SIZE_MB` - Max file size (default: 50)
- `UPLOAD_MAX_FILES` - Max files per request (default: 11)
- `DEBUG_RUN_ID` - Optional debug session ID

**Secrets location:**
- `.env` file (not committed; .gitignore includes .env)
- Example: `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\env.example`

**Frontend config:**
- `.env` file in frontend (uses dotenv package)
- No critical env vars required (EmailJS keys embedded in code)

## Webhooks & Callbacks

**Incoming Webhooks:**
- **Stripe Webhook** - Payment processing events
  - Endpoint: `POST /webhook`
  - Location: `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\index.js` (line 606)
  - Uses raw request body for signature verification (required by Stripe)
  - Signing secret: `WEBHOOK_SEC` environment variable

**Outgoing Webhooks:**
- None detected. Application does not appear to send webhooks to external services.

**Third-party Callbacks:**
- EmailJS form submission callbacks (handled in `contactMeView.js`)
- PayPal order creation/validation (handled in payment endpoint)

---

*Integration audit: 2026-01-31*
