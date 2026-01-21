# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

E-commerce application for handmade jewelry sales (Tamar Kfir Jewelry). Full-stack app with:
- Frontend SPA using MVC architecture
- Node.js/Express REST API backend
- Admin dashboard
- Multi-language (English/Hebrew with RTL) and multi-currency (USD/ILS) support

## Development Commands

### Frontend (from /frontend)
```bash
npm run dev          # Development server with cache cleanup
npm run build        # Production build to ./dist
npm run lint         # ESLint
```

### Backend (from /backend)
```bash
npm run devStart     # Development with nodemon auto-reload
npm start            # Production
npm run lint         # ESLint
```

## Architecture

### Frontend MVC Pattern (`/frontend/js/`)
- **model.js**: Data layer - localStorage, cart state, API calls to backend
- **View.js**: Base view class - DOM management, language/currency selectors, header menu
- **controller.js**: Router - page navigation, view instantiation, model method calls
- **Views/**: Page-specific views extending base View class (homePageView, cartView, categoriesView, etc.)

### Backend (`/backend/`)
- **index.js**: Main Express server (monolithic - routes, middleware, payment processing)
- **models/**: Mongoose schemas (User, Product, Settings)
- **middleware/auth.js**: JWT authentication and role-based access control
- **services/exchangeRateService.js**: USD/ILS currency conversion
- **jobs/exchangeRateJob.js**: Scheduled exchange rate updates via node-cron
- **config/locale.js**: GeoIP-based locale detection

### Key Integrations
- **Payments**: PayPal SDK and Stripe API
- **Image Storage**: DigitalOcean Spaces (S3-compatible) with Sharp for processing
- **Email**: EmailJS for contact forms
- **Analytics**: Microsoft Clarity

## Locale System

The app supports dual languages and currencies:
- Languages: English (`eng`) and Hebrew (`heb`) - Hebrew uses RTL styling
- Currencies: USD and ILS with automatic exchange rate conversion
- Detection: GeoIP-based with fallbacks to CDN headers

Frontend locale logic is in `/frontend/js/locale.js` and base View class.

## CSS Organization

Responsive design with 800px breakpoint:
- `*-800plus.css`: Desktop styles (≥800px)
- `*-devices.css`: Mobile/device styles (<800px)
- RTL support via conditional styling for Hebrew

## Environment Variables

See `/backend/env.example` for required configuration including:
- MongoDB connection string
- JWT secret
- DigitalOcean Spaces credentials
- PayPal/Stripe API keys
- Exchange rate API key

## Deployment

Target: DigitalOcean (App Platform or Droplets)
- See `DIGITALOCEAN_SETUP.md` for clean URL rewriting configuration
- Images served from DigitalOcean Spaces CDN
