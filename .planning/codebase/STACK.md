# Technology Stack

**Analysis Date:** 2026-01-31

## Languages

**Primary:**
- JavaScript (ES6+) - Used throughout frontend and backend
- HTML5 - Frontend markup
- CSS3 - Responsive design with mobile/desktop breakpoints

**Secondary:**
- Node.js runtime (version not specified; recommend checking runtime in deployment)

## Runtime

**Environment:**
- Node.js (version unspecified; no .nvmrc or .node-version file)

**Package Manager:**
- npm
- Lockfile: present (`package-lock.json` in both `/backend` and `/frontend`)

## Frameworks

**Core Backend:**
- Express.js 4.20.0 - REST API server

**Core Frontend:**
- Parcel 2.14.4 - Module bundler and development server
- Vanilla JavaScript (no framework like React/Vue)

**Build/Dev Tools:**
- @babel/core 7.24.7 - JavaScript transpilation
- Sharp 0.32.6 - Image processing for responsive images
- Multer 1.4.5-lts.1 - File upload middleware
- Node-cron 3.0.3 - Scheduled jobs (exchange rate updates)

**Testing:**
- @testing-library/jest-dom 5.17.0 - DOM testing utilities
- @testing-library/user-event 13.5.0 - User event simulation
- No test runner detected (config missing)

**Linting:**
- ESLint (both frontend and backend)
  - Config: `eslint.config.mjs` in both directories
  - Dependencies: @eslint/js, globals

## Key Dependencies

**Critical - Backend:**
- mongoose 8.6.1 - MongoDB ORM
- jsonwebtoken 9.0.2 - JWT authentication
- bcrypt 5.1.1 - Password hashing
- express-rate-limit 7.5.1 - API rate limiting
- helmet 8.1.0 - Security headers middleware
- cookie-parser 1.4.6 - Cookie parsing middleware
- cors 2.8.5 - Cross-origin resource sharing
- stripe 16.10.0 - Stripe payment processing
- @paypal/checkout-server-sdk 1.0.3 - PayPal server SDK
- geoip-lite 1.4.10 - IP-based geolocation (for locale detection)
- sharp 0.32.6 - Image optimization and responsive image generation
- aws-sdk 2.1693.0 - DigitalOcean Spaces (S3-compatible) file storage

**Critical - Frontend:**
- @emailjs/browser 4.3.3 - EmailJS for contact form submissions
- @babel/preset-env 7.24.7 - Babel preset for modern JavaScript
- dotenv 16.4.5 - Environment variable loading
- regenerator-runtime 0.14.1 - Promise polyfill
- web-vitals 2.1.4 - Web performance metrics

**Infrastructure:**
- dotenv 16.4.5 - Environment variable management (both projects)
- core-js 3.38.1 (backend), 3.37.1 (frontend) - Polyfills for older browsers/Node

**Frontend Polyfills (for browser compatibility):**
- buffer 6.0.3, crypto-browserify 3.12.0, events 3.3.0, path-browserify 1.0.1
- os-browserify 0.3.0, process 0.11.10, stream-browserify 3.0.0, vm-browserify 1.1.2
- string_decoder 1.3.0 - Node.js modules polyfilled for browser

## Configuration

**Environment:**
- Configuration via `.env` file (not committed; see `env.example`)
- Required variables documented in `/backend/env.example`
- Supports development and production environments via `NODE_ENV`

**Build:**
- Parcel config: `package.json` scripts in frontend
- ESLint config: `eslint.config.mjs` in both directories
- Prettier config: `.prettierrc` in both directories
- Babel config: Implicit via @babel/preset-env and Parcel

**Database:**
- MongoDB connection via Mongoose (connection string in `MONGO_URL` env var)
- Connection managed in `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\config\db.js`

## Platform Requirements

**Development:**
- Node.js (version unspecified)
- npm package manager
- MongoDB instance (local or remote)
- For image processing: system libraries required by Sharp (libpng, libjpeg, etc.)

**Production:**
- Deployment target: DigitalOcean (App Platform or Droplets)
- Node.js runtime (version unspecified)
- Environment variables configured (see env.example)
- DigitalOcean Spaces bucket for file storage
- SSL/TLS certificates (for HTTPS)

---

*Stack analysis: 2026-01-31*
