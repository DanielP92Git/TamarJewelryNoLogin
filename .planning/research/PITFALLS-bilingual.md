# Domain Pitfalls

**Domain:** Bilingual Product Content Migration
**Researched:** 2026-02-13

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Non-Idempotent Migration Script
**What goes wrong:** Migration script runs twice (deployment error, rollback), corrupts data or throws errors
**Why it happens:** Migration assumes clean state, doesn't check if fields already exist
**Consequences:**
- Lost translations (overwrites existing Hebrew text with re-translation)
- Migration failures block deployments
- Data corruption requires manual DB fix or restore from backup
**Prevention:**
```javascript
// BAD: Assumes name is always String
const nameHe = await translate(product.name, 'he');
product.name = { en: product.name, he: nameHe };

// GOOD: Check existing state first
if (typeof product.name === 'string') {
  // Old schema - migrate
  const nameHe = await translate(product.name, 'he');
  product.name = { en: product.name, he: nameHe };
} else if (product.name?.en && !product.name?.he) {
  // Partially migrated - only add Hebrew
  product.name.he = await translate(product.name.en, 'he');
}
// else: already migrated, skip
```
**Detection:** Test migration script locally 2-3 times on same data, verify no errors/duplicates

### Pitfall 2: Breaking Frontend Before Backend Migration
**What goes wrong:** Deploy frontend expecting `product.name.en` before DB has bilingual fields
**Why it happens:** Coordinating frontend/backend/DB changes across deployments
**Consequences:**
- Product pages crash (`Cannot read property 'en' of undefined`)
- Cart, checkout, admin dashboard all broken
- Emergency rollback required
**Prevention:**
1. **Migration phase:** Add bilingual fields, populate, keep legacy fields
2. **Backend phase:** Update API to return both legacy and bilingual (supports old + new frontend)
3. **Frontend phase:** Update to use bilingual fields, with fallback to legacy
4. **Cleanup phase:** Remove legacy fields after verification
**Detection:** Run frontend against staging DB with mixed schema states (old products, new products)

### Pitfall 3: Translation API Rate Limiting During Migration
**What goes wrong:** Migration script translates 94 products sequentially, hits rate limits (429 errors)
**Why it happens:** Google Cloud Translation API has quotas (characters/minute, requests/second)
**Consequences:**
- Migration takes hours instead of minutes
- Partial migration (some products translated, others fail)
- Retry logic compounds rate limit issues
**Prevention:**
```javascript
// BAD: Translate all products in parallel
const promises = products.map(p => translateAndUpdate(p));
await Promise.all(promises); // Instant rate limit

// GOOD: Batch with delay
for (const batch of chunk(products, 10)) {
  await Promise.all(batch.map(p => translateAndUpdate(p)));
  await sleep(2000); // 2-second delay between batches
}
```
**Default limits:** 1M characters/month free tier, then 500K chars/100 seconds
**Detection:** Monitor translation API quota in Google Cloud Console during migration

### Pitfall 4: Hebrew RTL Text Corruption (Unicode Issues)
**What goes wrong:** Hebrew text stored/displayed with incorrect directionality or garbled characters
**Why it happens:** Missing UTF-8 encoding headers, database charset issues, HTML missing `dir="rtl"`
**Consequences:**
- Hebrew text displays backwards or as question marks
- Mixed English/Hebrew text (e.g., "Gold צמיד") renders incorrectly
- Customer complaints about unreadable product names
**Prevention:**
- MongoDB: Default UTF-8 encoding (verify connection string has `?charset=utf8`)
- Express: `app.use(express.json({ charset: 'utf-8' }))`
- Frontend: `<meta charset="UTF-8">` in HTML
- Display: `<div dir="rtl" lang="he">` for Hebrew content (already implemented in codebase)
**Detection:** Test Hebrew special characters (ש, ץ, ך) in product names, verify in DB and browser

## Moderate Pitfalls

### Pitfall 5: Slug Conflicts with Bilingual Names
**What goes wrong:** Product has English slug `gold-bracelet`, Hebrew name changes, slug becomes stale
**Why it happens:** Slug generated from English name only, doesn't account for locale-specific slugs
**Consequences:**
- SEO: Hebrew URLs still show English slug (`/he/products/gold-bracelet` instead of `/he/products/צמיד-זהב`)
- User confusion: URL doesn't match product name
**Prevention:** Two approaches:
1. **Single slug (English-based):** Keep slug in English for both locales (simpler, current pattern)
2. **Bilingual slugs:** Generate slug.en and slug.he, route accordingly (better SEO, more complex)
**Recommendation:** Use single English slug for MVP (already implemented in codebase), defer bilingual slugs

### Pitfall 6: Translation Quality Issues (Machine Translation Errors)
**What goes wrong:** Google Translate produces awkward/incorrect Hebrew (e.g., "14K gold" → "זהב 14 קראט" vs expected "זהב 14K")
**Why it happens:** Machine translation lacks jewelry domain context
**Consequences:**
- Unprofessional product descriptions
- Customer confusion about materials/specifications
- Manual editing of all 94 products post-migration
**Prevention:**
- Admin review workflow: Flag auto-translated products for review before publish
- Glossary (future): Define consistent terms (14K, sterling silver, etc.)
- Test translations on sample products before full migration
**Mitigation:** Mark products as `translationReviewed: false` in migration, filter admin view to show pending reviews

### Pitfall 7: Missing Translation for New Products
**What goes wrong:** Admin adds new product with only English, forgets Hebrew, product invisible to Hebrew users
**Why it happens:** No schema validation requiring both languages
**Consequences:**
- Incomplete catalog for Hebrew locale
- Sales lost from Hebrew-speaking customers
- Manual DB fix required
**Prevention:**
```javascript
// Schema validation
name: {
  en: { type: String, required: true },
  he: { type: String, required: true }  // Require both languages
}

// Admin form validation
if (!nameHe || !descriptionHe) {
  alert('Hebrew translation required. Use Auto-translate button.');
  return;
}
```
**Detection:** Automated test: query products missing `name.he` or `description.he`

## Minor Pitfalls

### Pitfall 8: Cache Invalidation for Bilingual Content
**What goes wrong:** Page cache serves English content to Hebrew users after translation update
**Why it happens:** Existing in-memory cache (node-cache) doesn't account for locale in cache keys
**Consequences:** Stale translations shown until cache expires (15 minutes)
**Prevention:**
```javascript
// BAD: Single cache key
cache.set(`product:${id}`, product);

// GOOD: Locale-specific cache key
cache.set(`product:${id}:${locale}`, product);
```
**Existing implementation:** Check cache keys in backend (uses page-level caching for SSR)

### Pitfall 9: Admin Dashboard Preview Modal Shows Wrong Language
**What goes wrong:** Admin edits Hebrew text, preview modal shows English version
**Why it happens:** Modal hardcoded to show `product.name` (legacy field) instead of bilingual
**Consequences:** Admin can't verify Hebrew translations before publishing
**Prevention:** Update modal template to show both languages side-by-side
**Detection:** Manual testing: edit Hebrew name, open preview, verify both languages visible

### Pitfall 10: Inconsistent Fallback Behavior
**What goes wrong:** Hebrew translation missing for one product, app crashes instead of showing English
**Why it happens:** Code assumes `product.name.he` always exists
**Consequences:** Product page crashes, cart breaks if product added
**Prevention:**
```javascript
// BAD: Assumes he exists
const name = product.name[locale];

// GOOD: Fallback to English
const name = product.name[locale] || product.name.en || product.name;
```
**Testing:** Create test product with missing Hebrew translation, verify graceful fallback

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Schema Migration | Non-idempotent script | Test locally 2-3 times, check existing field state |
| Translation API | Rate limiting | Batch requests with delays, monitor quota |
| Frontend Deployment | Breaking change before backend ready | Deploy backend first, keep legacy fields |
| Admin Dashboard | Missing required translation validation | Schema + form validation for both languages |
| Cache Invalidation | Locale not in cache key | Include locale in cache key pattern |
| Production Rollout | No rollback plan for failed migration | Test migration on staging, have DB backup ready |

## Pre-Deployment Checklist

- [ ] Migration script tested locally on sample data (run 3 times)
- [ ] Translation API quota verified (sufficient for 94 products)
- [ ] UTF-8 encoding verified (MongoDB, Express, HTML meta tag)
- [ ] Schema validation requires both en/he for name (prevent incomplete products)
- [ ] Admin form has "Auto-translate" button and Hebrew text inputs
- [ ] Frontend has fallback logic (`product.name[locale] || product.name.en`)
- [ ] Cache keys include locale (if using product-level caching)
- [ ] Staging environment tested with mixed schema (old + new products)
- [ ] Rollback plan documented (restore from backup, revert migration)
- [ ] Translation review workflow defined (mark auto-translated products for review)

## Sources

- [migrate-mongo Idempotent Patterns](https://github.com/seppevs/migrate-mongo) - Migration best practices
- [Google Cloud Translation Quotas](https://cloud.google.com/translate/quotas) - Rate limits and pricing
- [MongoDB UTF-8 Best Practices](https://www.mongodb.com/docs/manual/reference/connection-string/) - Character encoding
- [Mongoose Schema Validation](https://mongoosejs.com/docs/validation.html) - Required field validation
- Verified from codebase: Existing slug migration (backend/migrations/20260210000000-add-product-slugs.js), cache implementation (node-cache in backend), RTL support (frontend CSS)
