# Stack Research

**Domain:** Bilingual Product Content with Google Cloud Translation API
**Researched:** 2026-02-13
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @google-cloud/translate | ^9.3.0 | Google Cloud Translation API client | Official Google SDK, supports both v2 (Basic) and v3 (Advanced) APIs, actively maintained, same pricing for v2/v3 NMT ($20/million chars) |
| migrate-mongo | ^14.0.7 | MongoDB schema migrations | Already in devDependencies, proven migration pattern in codebase (3 existing migrations), supports idempotent migrations with up/down rollback |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | - | Admin form handles bilingual fields without additional libraries - vanilla JS is sufficient |

### Schema Design Pattern

**Embedded Bilingual Fields** (recommended for this project)

```javascript
// Product schema modification
{
  name: {
    en: { type: String, required: true },
    he: { type: String, required: true }
  },
  description: {
    en: { type: String },
    he: { type: String }
  }
}
```

**Why embedded over separate collections:**
- Products accessed together with translations (single read vs joins)
- Translation updates are product-scoped (no cross-product translation changes)
- Only 2 languages (embedded doc overhead minimal)
- ~94 products (small dataset, no scaling concerns)
- Existing code expects product.name/description (minimal refactor to product.name[locale])

## Installation

```bash
# Backend only (translation happens server-side)
cd backend
npm install @google-cloud/translate

# migrate-mongo already installed in devDependencies
```

## Migration Approach

**Use migrate-mongo with idempotent pattern** (established in codebase)

Reference: `backend/migrations/20260210000000-add-product-slugs.js`

Migration strategy:
1. Add bilingual fields (name.en, name.he, description.en, description.he)
2. Migrate existing single-language data to `name.en` and `description.en`
3. Auto-translate to Hebrew using Google Cloud Translation API (set `name.he`, `description.he`)
4. Keep legacy `name` and `description` fields for backward compatibility initially
5. Update application code to use bilingual fields
6. Remove legacy fields in future migration (after frontend migrated)

**Critical:** Migration must be idempotent (check field existence before migrating, safe to run multiple times)

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| @google-cloud/translate (official SDK) | google-translate npm package (unofficial) | Never - unofficial package lacks security, support, and v3 API access |
| Embedded bilingual fields | mongoose-intl plugin | If supporting 3+ languages or need per-locale slug variants |
| Embedded bilingual fields | Separate Translation collection | If translations change independently of products or shared across entities |
| Google Cloud Translation v3 | Google Cloud Translation v2 | Both cost same for NMT ($20/million chars), v3 required for glossaries/batch/document translation |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Form validation libraries (Pristine, Just-Validate, etc.) | Admin dashboard uses vanilla JS, adding library bloats bundle for 2 text fields | Native HTML5 validation with custom JavaScript |
| mongoose-intl plugin | Adds complexity for only 2 languages, requires schema refactor beyond project scope | Embedded bilingual fields with explicit en/he keys |
| Translation v2 API | v3 offers identical pricing with more features, better IAM integration | Translation v3 API |
| API keys for authentication | v3 requires service accounts (better security, IAM integration) | Service account with GOOGLE_APPLICATION_CREDENTIALS |

## Integration Points

### Backend API Endpoint (new)

```javascript
// POST /admin/translate-product-description
// Translates English product name/description to Hebrew using Google Cloud Translation API
// Called from admin dashboard when adding/editing products
```

**Authentication:** Reuse existing JWT admin middleware (no changes needed)

**Translation service setup:**
```javascript
const {TranslationServiceClient} = require('@google-cloud/translate').v3;
const translationClient = new TranslationServiceClient();
// Uses GOOGLE_APPLICATION_CREDENTIALS environment variable (service account JSON path)
```

### Admin Form Changes (minimal)

- Add Hebrew text inputs for `name` and `description`
- Add "Auto-translate to Hebrew" button (calls backend API)
- No validation library needed (HTML5 `required` attribute + vanilla JS)

### Schema Access Pattern

```javascript
// Before (current)
product.name
product.description

// After (bilingual)
product.name[locale]  // locale = 'en' | 'he'
product.description[locale]
```

**Frontend impact:** Locale already available from bilingual URL routing (`/en/`, `/he/`)

## Environment Configuration

### Required (.env additions)

```bash
# Google Cloud Translation API
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
GOOGLE_CLOUD_PROJECT=your-project-id
```

### Service Account Setup

1. Create service account in Google Cloud Console (IAM & Admin > Service Accounts)
2. Grant "Cloud Translation API User" role
3. Create JSON key
4. Download to server (DO NOT commit to repository)
5. Set GOOGLE_APPLICATION_CREDENTIALS path in .env
6. Enable Cloud Translation API in Google Cloud Console

**Security:** Service account required for v3 API (API keys not supported), integrates with IAM roles

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @google-cloud/translate@^9.3.0 | Node.js >=18 | Project currently uses Node.js 20+ (verified in backend runtime) |
| migrate-mongo@^14.0.7 | Node.js >=20 | Already in devDependencies, ESM support available but codebase uses CommonJS |
| mongoose@^8.6.1 | Embedded bilingual schema | No compatibility issues, standard nested object schema |

## Cost Analysis

**Google Cloud Translation API Pricing:**
- NMT (Neural Machine Translation): $20 per million characters
- ~94 products × ~100 chars avg (name + description) = ~9,400 chars
- One-time migration cost: $0.19 (negligible)
- Ongoing cost per new product: ~$0.002 per product

**Recommendation:** v3 API provides glossaries, batch translation, and IAM at same NMT price as v2

## Sources

**HIGH Confidence:**
- [@google-cloud/translate npm package](https://www.npmjs.com/package/@google-cloud/translate) - Latest version 9.3.0, Node.js >=18 requirement
- [Google Cloud Translation API Overview](https://docs.cloud.google.com/translate/docs/api-overview) - v2 vs v3 comparison, pricing verification
- [Google Cloud Translation Authentication](https://docs.cloud.google.com/translate/docs/authentication) - Service account requirement for v3
- [migrate-mongo npm package](https://www.npmjs.com/package/migrate-mongo) - Migration tool best practices, Node.js 20+ requirement
- [Google Cloud Translation Node.js package.json](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-translate/package.json) - Node.js >=18 requirement verified

**MEDIUM Confidence:**
- [MongoDB Multilanguage Schema Patterns](http://learnmongodbthehardway.com/schema/multilanguage/) - Embedded vs separate collection tradeoffs
- [Mongoose Subdocuments Documentation](https://mongoosejs.com/docs/subdocs.html) - Schema design patterns for embedded documents

**Verified from codebase:**
- Existing migrate-mongo setup (backend/migrate-mongo-config.js)
- Migration pattern reference (backend/migrations/20260210000000-add-product-slugs.js)
- Current Product schema (backend/models/Product.js) - name/description as String
- Admin dashboard vanilla JS approach (admin/BisliView.js)

---
*Stack research for: Bilingual Product Content with Google Cloud Translation API*
*Researched: 2026-02-13*
