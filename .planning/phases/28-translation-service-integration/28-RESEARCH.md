# Phase 28: Translation Service Integration - Research

**Researched:** 2026-02-15
**Domain:** Google Cloud Translation API v3 integration for bilingual product content
**Confidence:** HIGH

## Summary

Phase 28 integrates Google Cloud Translation API v3 as a backend service to translate product content (name, description) between Hebrew and English on demand. The translation service will provide manual translation endpoints for admin forms and bulk translation for migrating existing products. The codebase already has established patterns for external API integration (exchange rate service with fallback chains), in-memory caching (node-cache for page caching), and admin authentication (JWT with role-based access control).

Google Cloud Translation API v3 uses the @google-cloud/translate npm package with service account authentication. The API has generous free tier quotas (500,000 characters/month free, then $20/million characters) and rate limits (6,000 requests per minute, 6 million characters per minute). Character limits are 5K recommended per request, with a hard ceiling of 30K code points. The service supports automatic language detection and bidirectional translation between Hebrew and English.

Key architectural decisions: (1) In-memory cache using node-cache (already in project) to avoid duplicate API calls during editing sessions, (2) Service account authentication via GOOGLE_APPLICATION_CREDENTIALS environment variable, (3) Admin-only endpoint protection using existing fetchUser + requireAdmin middleware, (4) Server-Sent Events for real-time bulk translation progress, (5) Exponential backoff with jitter for API error retry strategy, (6) Save-as-you-go for bulk operations to prevent data loss on interruption.

**Primary recommendation:** Use @google-cloud/translate v3 with TranslationServiceClient, authenticate via service account JSON, cache translations in node-cache with 1-hour TTL, implement POST /admin/translate endpoint for single-field translation, implement POST /admin/translate/bulk for batch operations with SSE progress streaming, and follow existing exchangeRateService.js patterns for API integration and error handling.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Translation trigger:**
- Manual "Translate" button next to each field (name, description) — no auto-translate on blur
- Both directions supported: Hebrew-to-English AND English-to-Hebrew — button adapts based on which field has content
- Translation fills the target field directly — admin can edit before saving the product
- No preview/confirmation step for translation result — admin reviews visually in the form

**Failure & fallback:**
- Inline error next to the translate button when Google API fails: "Translation failed, try again or enter manually"
- Spinner on the translate button while waiting for API response
- Admin can save product with only one language filled — other language shows as "needs translation" in product list
- No automatic translation quality checks — admin reviews and edits translated text visually
- Translation errors never block product saving — manual entry always possible

**Caching:**
- In-memory cache for Google API responses — keyed on exact input text + direction
- Cache is an admin-workflow optimization only — real persistence is the saved bilingual product fields
- Same input text returns cached result instantly (avoids duplicate API calls during editing sessions)
- Cache resets on server restart — acceptable since translations are saved to product documents

**Bulk translation:**
- "Translate All Missing" button on the product list page — runs inline with progress
- Translates only untranslated products — existing translations never overwritten
- Auto-detect direction: if Hebrew exists but not English, translate to English, and vice versa
- Confirmation step before starting: "About to translate X products. Continue?"
- Real-time progress: shows current product name + counter ("Translating: Gold Ring (23/94)")
- Continue on failure — skip failed products, translate the rest, show summary at end
- "Retry failed" button after completion for failed products
- Cancellable mid-operation — already-translated products stay saved
- Notification when navigating away: Claude's discretion based on SPA architecture

### Claude's Discretion

- Endpoint design: whether to accept single field or batch multiple fields per request
- Bulk save strategy: save-as-you-go vs batch save (pick based on reliability)
- Notification mechanism when admin navigates away during bulk translation
- Rate limiting implementation: batch sizes, delays between Google API calls
- In-memory cache TTL and eviction strategy
- Translation API client library choice and authentication setup

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core Translation Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @google-cloud/translate | ^9.3.0 | Google Cloud Translation API v3 client | Official Google library, supports v3 API with advanced features, actively maintained |
| node-cache | ^5.1.2 | In-memory translation caching | Already in project (used for page caching), simple TTL-based eviction, zero dependencies |

### Supporting Infrastructure (Already Installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsonwebtoken | ^9.0.2 | JWT authentication | Existing admin authentication via fetchUser + requireAdmin middleware |
| mongoose | ^8.6.1 | Product model access | Save translated bilingual fields to products |
| express-rate-limit | ^7.5.1 | Rate limiting | Potential use for translation endpoint throttling (optional) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @google-cloud/translate v3 | DeepL API | DeepL has better translation quality for European languages but worse for Hebrew, costs more ($25/million chars), no free tier |
| @google-cloud/translate v3 | Microsoft Translator | Similar pricing but less mature Node.js SDK, smaller Hebrew corpus |
| node-cache | lru-cache | lru-cache has LRU eviction (better for bounded memory) but node-cache is already in project and simpler for TTL-based caching |
| Service account auth | API keys | API keys not supported by Translation API v3 — service accounts are required |

**Installation:**
```bash
cd backend
npm install --save @google-cloud/translate@^9.3.0
# node-cache already installed (package.json shows ^5.1.2)
```

**Service Account Setup:**
```bash
# 1. Create service account in Google Cloud Console
gcloud iam service-accounts create tamarkfir-translator \
  --display-name="Tamar Kfir Translation Service"

# 2. Grant Cloud Translation User role
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:tamarkfir-translator@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudtranslate.user"

# 3. Download service account key JSON
gcloud iam service-accounts keys create tamarkfir-translator-key.json \
  --iam-account=tamarkfir-translator@PROJECT_ID.iam.gserviceaccount.com

# 4. Add to .env (backend/.env)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/tamarkfir-translator-key.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# 5. SECURITY: Add key file to .gitignore
echo "backend/tamarkfir-translator-key.json" >> .gitignore
```

## Architecture Patterns

### Recommended Project Structure

```
backend/
├── services/
│   ├── translationService.js           # New: Google Translate API integration
│   └── exchangeRateService.js          # Existing: Pattern to follow for API integration
├── cache/
│   ├── translationCache.js             # New: Translation cache instance (follows pageCache.js pattern)
│   └── pageCache.js                    # Existing: Pattern to follow for node-cache setup
├── middleware/
│   └── auth.js                         # Existing: fetchUser + requireAdmin for admin endpoints
├── models/
│   └── Product.js                      # Existing: Bilingual fields added in Phase 27
├── index.js                            # Existing: Add translation endpoints here
└── .env.example                        # Update: Add GOOGLE_APPLICATION_CREDENTIALS
```

### Pattern 1: Translation Service with Fallback and Caching

**What:** Centralized service for Google Translate API calls with in-memory caching and graceful error handling

**When to use:** Any translation operation (single-field or bulk)

**Example:**
```javascript
// backend/services/translationService.js
// Source: Adapted from exchangeRateService.js + official Google Cloud docs
const { TranslationServiceClient } = require('@google-cloud/translate').v3;
const { translationCache } = require('../cache/translationCache');

// Initialize Translation API client
// Authentication: Uses GOOGLE_APPLICATION_CREDENTIALS env var automatically
const translationClient = new TranslationServiceClient();
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

/**
 * Generates cache key for translation request
 * @param {string} text - Text to translate
 * @param {string} sourceLang - Source language code (en or he)
 * @param {string} targetLang - Target language code (en or he)
 * @returns {string} Cache key
 */
function getCacheKey(text, sourceLang, targetLang) {
  // Use source and target to handle bidirectional caching
  return `${sourceLang}-${targetLang}:${text}`;
}

/**
 * Translates text using Google Cloud Translation API v3
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (en or he)
 * @param {string} [sourceLang] - Source language code (optional, auto-detected if omitted)
 * @returns {Promise<{translatedText: string, detectedSourceLanguage?: string}>}
 */
async function translateText(text, targetLang, sourceLang = null) {
  // Validation
  if (!text || typeof text !== 'string' || text.trim() === '') {
    throw new Error('Text to translate is required and must be a non-empty string');
  }

  if (!['en', 'he'].includes(targetLang)) {
    throw new Error('Target language must be "en" or "he"');
  }

  const trimmedText = text.trim();

  // Check cache first
  const cacheKey = getCacheKey(trimmedText, sourceLang || 'auto', targetLang);
  const cached = translationCache.get(cacheKey);
  if (cached) {
    console.log('Translation cache hit:', cacheKey);
    return cached;
  }

  try {
    // Construct request
    // Parent format: projects/{project-id}/locations/{location}
    // Use 'global' location for general translation (not model-specific)
    const request = {
      parent: `projects/${projectId}/locations/global`,
      contents: [trimmedText],
      targetLanguageCode: targetLang,
      mimeType: 'text/plain',
    };

    // Add source language if provided (otherwise auto-detect)
    if (sourceLang) {
      request.sourceLanguageCode = sourceLang;
    }

    // Call Google Translate API
    const [response] = await translationClient.translateText(request);

    if (!response.translations || response.translations.length === 0) {
      throw new Error('API returned empty translation response');
    }

    const translation = response.translations[0];
    const result = {
      translatedText: translation.translatedText,
    };

    // Include detected source language if auto-detected
    if (translation.detectedLanguageCode) {
      result.detectedSourceLanguage = translation.detectedLanguageCode;
    }

    // Cache result (TTL set in translationCache.js)
    translationCache.set(cacheKey, result);
    console.log('Translation cached:', cacheKey);

    return result;
  } catch (error) {
    console.error('Translation API error:', error.message);

    // Distinguish between API errors and network errors
    if (error.code) {
      // Google API error codes: https://cloud.google.com/apis/design/errors
      throw new Error(`Translation API error (${error.code}): ${error.message}`);
    } else {
      throw new Error(`Translation failed: ${error.message}`);
    }
  }
}

/**
 * Translates product fields (name and/or description) with bidirectional auto-detection
 * @param {Object} fields - Fields to translate
 * @param {string} [fields.name_en] - English name
 * @param {string} [fields.name_he] - Hebrew name
 * @param {string} [fields.description_en] - English description
 * @param {string} [fields.description_he] - Hebrew description
 * @returns {Promise<Object>} Translated fields
 */
async function translateProductFields(fields) {
  const translations = {};

  try {
    // Translate name
    if (fields.name_en && !fields.name_he) {
      // English exists, translate to Hebrew
      const result = await translateText(fields.name_en, 'he', 'en');
      translations.name_he = result.translatedText;
    } else if (fields.name_he && !fields.name_en) {
      // Hebrew exists, translate to English
      const result = await translateText(fields.name_he, 'en', 'he');
      translations.name_en = result.translatedText;
    }

    // Translate description
    if (fields.description_en && !fields.description_he) {
      const result = await translateText(fields.description_en, 'he', 'en');
      translations.description_he = result.translatedText;
    } else if (fields.description_he && !fields.description_en) {
      const result = await translateText(fields.description_he, 'en', 'he');
      translations.description_en = result.translatedText;
    }

    return translations;
  } catch (error) {
    console.error('Product field translation error:', error.message);
    throw error;
  }
}

/**
 * Clears translation cache (useful for testing or manual cache reset)
 */
function clearCache() {
  translationCache.flushAll();
  console.log('Translation cache cleared');
}

module.exports = {
  translateText,
  translateProductFields,
  clearCache,
  getCacheKey,
};
```

### Pattern 2: Translation Cache Instance (Following pageCache.js)

**What:** Dedicated node-cache instance for translation results with TTL and monitoring

**When to use:** All translation operations

**Example:**
```javascript
// backend/cache/translationCache.js
// Source: Adapted from backend/cache/pageCache.js
const NodeCache = require('node-cache');

// Create cache instance with translation-specific configuration
// stdTTL: 1 hour (translations are static, longer TTL acceptable)
// checkperiod: 10 minutes (cleanup interval)
// useClones: false (performance - we only store simple objects)
// maxKeys: 1000 (limit memory - ~100 chars avg per translation = ~200KB total)
const translationCache = new NodeCache({
  stdTTL: 3600,           // 1 hour TTL (translations don't change)
  checkperiod: 600,       // cleanup every 10 minutes
  useClones: false,       // performance: simple objects only
  maxKeys: 1000,          // prevent memory bloat (~200KB max)
});

// Log cache stats every hour in production for monitoring
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    const stats = translationCache.getStats();
    const totalRequests = stats.hits + stats.misses;
    const hitRate = totalRequests > 0 ? (stats.hits / totalRequests * 100).toFixed(2) : 0;

    console.log('Translation cache stats:', {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: hitRate + '%',
    });
  }, 3600000); // 1 hour
}

module.exports = { translationCache };
```

### Pattern 3: Admin Translation Endpoint with Authentication

**What:** POST /admin/translate endpoint for single-field translation with JWT + role-based auth

**When to use:** Admin form "Translate" button clicks

**Example:**
```javascript
// backend/index.js - Add to existing admin routes section
const { fetchUser, requireAdmin } = require('./middleware/auth');
const { translateText } = require('./services/translationService');

/**
 * POST /admin/translate
 * Translates a single text field between English and Hebrew
 *
 * Body: {
 *   text: string,
 *   targetLang: 'en' | 'he',
 *   sourceLang?: 'en' | 'he' (optional, auto-detected if omitted)
 * }
 *
 * Response: {
 *   success: true,
 *   translatedText: string,
 *   detectedSourceLanguage?: string
 * }
 */
app.post('/admin/translate', fetchUser, requireAdmin, async (req, res) => {
  try {
    const { text, targetLang, sourceLang } = req.body;

    // Validation
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a non-empty string',
      });
    }

    if (!['en', 'he'].includes(targetLang)) {
      return res.status(400).json({
        success: false,
        error: 'Target language must be "en" or "he"',
      });
    }

    // Check character limit (5K recommended, 30K hard limit)
    if (text.length > 5000) {
      console.warn(`Translation request exceeds recommended 5K chars: ${text.length} chars`);
    }

    if (text.length > 30000) {
      return res.status(400).json({
        success: false,
        error: 'Text exceeds maximum 30,000 character limit',
      });
    }

    // Translate
    const result = await translateText(text, targetLang, sourceLang);

    res.json({
      success: true,
      translatedText: result.translatedText,
      ...(result.detectedSourceLanguage && {
        detectedSourceLanguage: result.detectedSourceLanguage,
      }),
    });
  } catch (error) {
    console.error('Translation endpoint error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Translation failed. Please try again or enter manually.',
    });
  }
});
```

### Pattern 4: Bulk Translation with Server-Sent Events (SSE) Progress

**What:** POST /admin/translate/bulk endpoint with real-time progress streaming via SSE

**When to use:** "Translate All Missing" button on product list page

**Why SSE over WebSocket:** SSE is simpler for unidirectional server-to-client updates, works over HTTP/1.1 without additional protocol overhead, automatically reconnects on connection loss, and is natively supported by EventSource API in browsers. WebSockets are overkill for progress streaming where client doesn't send updates back.

**Example:**
```javascript
// backend/index.js - Bulk translation with SSE progress
const { Product } = require('./models');
const { translateProductFields } = require('./services/translationService');

/**
 * POST /admin/translate/bulk
 * Translates all products with missing bilingual fields
 * Streams progress via Server-Sent Events
 *
 * Response: text/event-stream (SSE format)
 * Events:
 *   - progress: { current: number, total: number, productName: string, productId: number }
 *   - success: { productId: number, translations: object }
 *   - error: { productId: number, productName: string, error: string }
 *   - complete: { translated: number, failed: number, skipped: number }
 */
app.post('/admin/translate/bulk', fetchUser, requireAdmin, async (req, res) => {
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  /**
   * Helper to send SSE event
   * @param {string} event - Event type
   * @param {object} data - Event data
   */
  function sendEvent(event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    // Find products needing translation
    const productsNeedingTranslation = await Product.find({
      $or: [
        // English exists but Hebrew missing
        { name_en: { $ne: '' }, name_he: '' },
        { description_en: { $ne: '' }, description_he: '' },
        // Hebrew exists but English missing
        { name_he: { $ne: '' }, name_en: '' },
        { description_he: { $ne: '' }, description_en: '' },
      ],
    }).lean();

    const total = productsNeedingTranslation.length;

    if (total === 0) {
      sendEvent('complete', { translated: 0, failed: 0, skipped: 0 });
      res.end();
      return;
    }

    let translated = 0;
    let failed = 0;
    let skipped = 0;
    const failedProducts = [];

    // Process each product
    for (let i = 0; i < productsNeedingTranslation.length; i++) {
      const product = productsNeedingTranslation[i];
      const current = i + 1;

      // Send progress event
      sendEvent('progress', {
        current,
        total,
        productName: product.name || product.name_en || product.name_he,
        productId: product.id,
      });

      try {
        // Determine which fields to translate
        const fieldsToTranslate = {
          name_en: product.name_en,
          name_he: product.name_he,
          description_en: product.description_en,
          description_he: product.description_he,
        };

        // Translate missing fields
        const translations = await translateProductFields(fieldsToTranslate);

        if (Object.keys(translations).length === 0) {
          // No translations needed (both languages already filled)
          skipped++;
          continue;
        }

        // Save translations to database (save-as-you-go strategy)
        await Product.updateOne(
          { _id: product._id },
          { $set: translations }
        );

        translated++;

        // Send success event
        sendEvent('success', {
          productId: product.id,
          translations,
        });

        // Rate limiting: delay between translations to avoid hitting API limits
        // 6000 requests/min = 100 requests/sec = 10ms min between requests
        // Use 100ms delay to be conservative (max 600 products/min)
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        failed++;
        failedProducts.push({
          id: product.id,
          name: product.name || product.name_en || product.name_he,
          error: error.message,
        });

        // Send error event
        sendEvent('error', {
          productId: product.id,
          productName: product.name || product.name_en || product.name_he,
          error: error.message,
        });

        // Continue processing other products (don't abort on failure)
        continue;
      }
    }

    // Send completion event
    sendEvent('complete', {
      translated,
      failed,
      skipped,
      failedProducts,
    });

    res.end();

  } catch (error) {
    console.error('Bulk translation error:', error.message);
    sendEvent('error', {
      error: 'Bulk translation failed: ' + error.message,
    });
    res.end();
  }
});
```

**Frontend SSE consumption (admin/BisliView.js):**
```javascript
// Admin frontend - consuming bulk translation SSE
function startBulkTranslation() {
  const eventSource = new EventSource('/admin/translate/bulk', {
    headers: {
      'auth-token': localStorage.getItem('auth-token'),
    },
  });

  eventSource.addEventListener('progress', (event) => {
    const data = JSON.parse(event.data);
    updateProgressUI(data.current, data.total, data.productName);
  });

  eventSource.addEventListener('success', (event) => {
    const data = JSON.parse(event.data);
    console.log('Translated product:', data.productId);
  });

  eventSource.addEventListener('error', (event) => {
    const data = JSON.parse(event.data);
    console.error('Translation failed:', data.productName, data.error);
  });

  eventSource.addEventListener('complete', (event) => {
    const data = JSON.parse(event.data);
    showCompletionSummary(data);
    eventSource.close();
  });

  // Handle connection errors
  eventSource.onerror = () => {
    console.error('SSE connection error');
    eventSource.close();
  };

  // Store eventSource for cancellation
  window.currentBulkTranslation = eventSource;
}

function cancelBulkTranslation() {
  if (window.currentBulkTranslation) {
    window.currentBulkTranslation.close();
    window.currentBulkTranslation = null;
  }
}
```

### Pattern 5: Exponential Backoff with Jitter for API Retries

**What:** Retry failed translation API calls with exponential backoff and random jitter

**When to use:** translateText function error handling for transient failures

**Example:**
```javascript
// backend/services/translationService.js - Retry logic
/**
 * Retries a function with exponential backoff and jitter
 * @param {Function} fn - Async function to retry
 * @param {number} maxAttempts - Maximum retry attempts (default: 3)
 * @param {number} baseDelay - Base delay in ms (default: 1000)
 * @returns {Promise<any>} Function result
 */
async function retryWithBackoff(fn, maxAttempts = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts - 1;

      // Only retry transient errors (5xx, 429, network errors)
      const isRetryable =
        error.code === 429 || // Rate limit
        error.code === 503 || // Service unavailable
        error.code === 500 || // Internal server error
        error.code === 'ECONNRESET' || // Network error
        error.code === 'ETIMEDOUT'; // Timeout

      if (!isRetryable || isLastAttempt) {
        throw error;
      }

      // Calculate backoff with jitter
      // wait = min((2^attempt + random(0-1)) * baseDelay, maxDelay)
      const exponentialDelay = Math.pow(2, attempt) * baseDelay;
      const jitter = Math.random() * baseDelay;
      const delay = Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds

      console.warn(
        `Translation attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`,
        error.message
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Modified translateText to use retry logic
async function translateText(text, targetLang, sourceLang = null) {
  // ... validation code (same as before)

  // Wrap API call in retry logic
  return await retryWithBackoff(async () => {
    try {
      const request = {
        parent: `projects/${projectId}/locations/global`,
        contents: [text.trim()],
        targetLanguageCode: targetLang,
        mimeType: 'text/plain',
      };

      if (sourceLang) {
        request.sourceLanguageCode = sourceLang;
      }

      const [response] = await translationClient.translateText(request);

      if (!response.translations || response.translations.length === 0) {
        throw new Error('API returned empty translation response');
      }

      const translation = response.translations[0];
      const result = {
        translatedText: translation.translatedText,
      };

      if (translation.detectedLanguageCode) {
        result.detectedSourceLanguage = translation.detectedLanguageCode;
      }

      // Cache result
      const cacheKey = getCacheKey(text.trim(), sourceLang || 'auto', targetLang);
      translationCache.set(cacheKey, result);

      return result;
    } catch (error) {
      // Enhance error with Google API error code if available
      if (error.code) {
        error.isRetryable = [429, 500, 503].includes(error.code);
      }
      throw error;
    }
  });
}
```

### Anti-Patterns to Avoid

- **Don't auto-translate on blur:** User decision is manual "Translate" button only. Auto-translation on field blur would generate excessive API calls and confuse admin workflow.

- **Don't use API keys for authentication:** Cloud Translation API v3 requires service account authentication. API keys are not supported and will fail.

- **Don't store service account JSON in git:** Always add service account key files to .gitignore. Use environment variable to point to key file location.

- **Don't batch-save in bulk translation:** Use save-as-you-go strategy so already-translated products persist even if bulk operation is cancelled or errors mid-way.

- **Don't retry non-transient errors:** Only retry 429 (rate limit), 500 (server error), 503 (unavailable), and network errors. Don't retry 400 (bad request), 401 (unauthorized), or 403 (forbidden).

- **Don't translate without caching:** In-memory cache prevents duplicate API calls for identical text during editing sessions. Always check cache before calling API.

- **Don't use WebSockets for progress tracking:** SSE is simpler, more efficient, and sufficient for unidirectional progress updates. WebSockets add unnecessary bidirectional complexity.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Translation API client | Custom HTTP requests to Google Translate REST API | @google-cloud/translate SDK | SDK handles authentication, retries, request formatting, response parsing, and API versioning automatically |
| In-memory caching | Custom Map with setTimeout for TTL | node-cache | Already in project, handles TTL, automatic cleanup, max keys, stats tracking, battle-tested |
| Retry logic | Manual retry loops with counters | Exponential backoff pattern with jitter | Prevents thundering herd, aligns with Google Cloud best practices, handles cascading failures |
| Progress streaming | Polling endpoints for status | Server-Sent Events (SSE) | Native browser support, auto-reconnect, simpler than WebSockets, lower overhead |
| Admin authentication | Custom JWT verification | Existing fetchUser + requireAdmin middleware | Already in project, tested, follows established patterns |

**Key insight:** Google Cloud APIs have complex authentication flows (service account impersonation, ADC, token refresh). The official SDK handles these edge cases automatically. Custom HTTP implementations are error-prone and require ongoing maintenance for API changes.

## Common Pitfalls

### Pitfall 1: Missing GOOGLE_APPLICATION_CREDENTIALS Environment Variable

**What goes wrong:** TranslationServiceClient initialization fails with "Could not load the default credentials" error

**Why it happens:** Google Cloud SDK requires GOOGLE_APPLICATION_CREDENTIALS to point to service account JSON file

**How to avoid:**
```javascript
// backend/index.js - Startup validation
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.warn('GOOGLE_APPLICATION_CREDENTIALS not set - translation features will be disabled');
}

if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
  console.warn('GOOGLE_CLOUD_PROJECT_ID not set - translation features will be disabled');
}
```

**Warning signs:** Server logs show "Could not load the default credentials" or "Unable to detect a Project Id in the current environment"

### Pitfall 2: Character Limit Violations (5K Recommendation, 30K Hard Limit)

**What goes wrong:** API returns 400 INVALID_ARGUMENT error for text exceeding 30K code points

**Why it happens:** Product descriptions can be long, especially when translated with HTML formatting

**How to avoid:**
```javascript
// Validate before calling API
if (text.length > 30000) {
  throw new Error('Text exceeds maximum 30,000 character limit');
}

if (text.length > 5000) {
  console.warn(`Translation request exceeds recommended 5K chars: ${text.length} chars`);
  // Still allow, but log warning for monitoring
}
```

**Warning signs:** API errors with "Request payload size exceeds the limit"

**Codebase status:** ✅ Low risk - product descriptions in current schema are typically <1000 characters

### Pitfall 3: Rate Limit Exhaustion (6000 Requests/Min, 6M Chars/Min)

**What goes wrong:** Bulk translation hits rate limit, causes 429 errors and failed translations

**Why it happens:** 94 products translated in quick succession without delays

**How to avoid:**
```javascript
// In bulk translation loop
await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay = max 600 products/min
```

**Warning signs:** 429 "Resource exhausted" errors during bulk translation

**Codebase status:** ✅ Low risk with 100ms delays - 94 products takes ~10 seconds, well under rate limits

### Pitfall 4: Cache Key Collisions for Bidirectional Translation

**What goes wrong:** Translating "Gold" from English to Hebrew caches result, then translating "זהב" (Gold in Hebrew) from Hebrew to English returns cached English "Gold" instead of translating

**Why it happens:** Cache key doesn't distinguish between source and target languages

**How to avoid:**
```javascript
// WRONG: Cache key missing direction
function getCacheKey(text) {
  return text; // "Gold" collides for both directions
}

// CORRECT: Cache key includes both source and target
function getCacheKey(text, sourceLang, targetLang) {
  return `${sourceLang}-${targetLang}:${text}`; // "en-he:Gold" vs "he-en:זהב"
}
```

**Warning signs:** Translation returns same text as input, or returns unexpected language

### Pitfall 5: SSE Connection Timeout on Long Bulk Operations

**What goes wrong:** SSE connection drops after 2 minutes, progress UI freezes even though backend continues translating

**Why it happens:** Default HTTP/proxy timeouts kill idle SSE connections

**How to avoid:**
```javascript
// Send keepalive comment every 30 seconds during bulk translation
let lastKeepAlive = Date.now();

// In bulk translation loop
const now = Date.now();
if (now - lastKeepAlive > 30000) {
  res.write(': keepalive\n\n'); // SSE comment (ignored by EventSource)
  lastKeepAlive = now;
}
```

**Warning signs:** Frontend shows "SSE connection error" after 2 minutes, backend logs show translations continuing

### Pitfall 6: Service Account Permission Denied (403 Errors)

**What goes wrong:** API calls fail with "Permission 'cloudtranslate.translations.translate' denied"

**Why it happens:** Service account doesn't have roles/cloudtranslate.user role

**How to avoid:**
```bash
# Verify service account has correct role
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:tamarkfir-translator@*" \
  --format="table(bindings.role)"

# Should show: roles/cloudtranslate.user
```

**Warning signs:** 403 errors with "Permission denied" in logs

### Pitfall 7: Hebrew Text Encoding Issues

**What goes wrong:** Hebrew text appears as question marks or mojibake in translated output

**Why it happens:** Response encoding mismatch or improper UTF-8 handling

**How to avoid:**
```javascript
// Ensure UTF-8 encoding in API request
const request = {
  parent: `projects/${projectId}/locations/global`,
  contents: [text.trim()],
  targetLanguageCode: targetLang,
  mimeType: 'text/plain', // Explicitly plain text, not HTML
};

// Mongoose saves UTF-8 by default, but verify schema doesn't override
// Product.js schema should NOT have { type: String, encoding: 'ascii' }
```

**Warning signs:** Hebrew characters display as ??? or garbled text in database or admin UI

**Codebase status:** ✅ Low risk - Mongoose defaults to UTF-8, no custom encoding in Product schema

## Code Examples

Verified patterns from official sources and codebase conventions:

### Example 1: Translation Service Initialization

```javascript
// backend/services/translationService.js
// Source: Official Google Cloud Node.js samples
const { TranslationServiceClient } = require('@google-cloud/translate').v3;

// Initialize client
// Automatically uses GOOGLE_APPLICATION_CREDENTIALS env var for auth
const translationClient = new TranslationServiceClient();

// Project ID from environment
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

// Construct parent path (global location for general translation)
const parent = `projects/${projectId}/locations/global`;
```

### Example 2: Single Text Translation with Cache

```javascript
// backend/services/translationService.js
// Source: Adapted from official samples + codebase cache patterns
async function translateText(text, targetLang, sourceLang = null) {
  // Check cache first
  const cacheKey = getCacheKey(text.trim(), sourceLang || 'auto', targetLang);
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Construct request
  const request = {
    parent: `projects/${projectId}/locations/global`,
    contents: [text.trim()],
    targetLanguageCode: targetLang,
    mimeType: 'text/plain',
  };

  if (sourceLang) {
    request.sourceLanguageCode = sourceLang;
  }

  // Call API
  const [response] = await translationClient.translateText(request);

  const result = {
    translatedText: response.translations[0].translatedText,
    detectedSourceLanguage: response.translations[0].detectedLanguageCode,
  };

  // Cache result
  translationCache.set(cacheKey, result);

  return result;
}
```

### Example 3: Admin Endpoint with Authentication

```javascript
// backend/index.js
// Source: Existing admin route patterns in codebase
const { fetchUser, requireAdmin } = require('./middleware/auth');

app.post('/admin/translate', fetchUser, requireAdmin, async (req, res) => {
  try {
    const { text, targetLang, sourceLang } = req.body;

    // Validation
    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
      });
    }

    if (!['en', 'he'].includes(targetLang)) {
      return res.status(400).json({
        success: false,
        error: 'Target language must be "en" or "he"',
      });
    }

    // Translate
    const result = await translateText(text, targetLang, sourceLang);

    res.json({
      success: true,
      translatedText: result.translatedText,
    });
  } catch (error) {
    console.error('Translation error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Translation failed. Please try again or enter manually.',
    });
  }
});
```

### Example 4: Bulk Translation with SSE Progress

```javascript
// backend/index.js
// Source: SSE best practices + codebase async patterns
app.post('/admin/translate/bulk', fetchUser, requireAdmin, async (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  function sendEvent(event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    const products = await Product.find({
      $or: [
        { name_en: { $ne: '' }, name_he: '' },
        { name_he: { $ne: '' }, name_en: '' },
      ],
    }).lean();

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      // Send progress
      sendEvent('progress', {
        current: i + 1,
        total: products.length,
        productName: product.name_en || product.name_he,
      });

      try {
        // Translate
        const translations = await translateProductFields({
          name_en: product.name_en,
          name_he: product.name_he,
        });

        // Save immediately (save-as-you-go)
        await Product.updateOne({ _id: product._id }, { $set: translations });

        sendEvent('success', { productId: product.id });

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        sendEvent('error', {
          productId: product.id,
          error: error.message,
        });
      }
    }

    sendEvent('complete', { translated: products.length });
    res.end();
  } catch (error) {
    sendEvent('error', { error: error.message });
    res.end();
  }
});
```

### Example 5: Frontend SSE Consumption

```javascript
// admin/BisliView.js (admin frontend)
// Source: EventSource API standard + SSE best practices
function startBulkTranslation() {
  const eventSource = new EventSource('/admin/translate/bulk', {
    withCredentials: true,
  });

  eventSource.addEventListener('progress', (event) => {
    const { current, total, productName } = JSON.parse(event.data);
    updateProgressBar(current, total);
    updateStatusText(`Translating: ${productName} (${current}/${total})`);
  });

  eventSource.addEventListener('success', (event) => {
    const { productId } = JSON.parse(event.data);
    console.log('Translated product:', productId);
  });

  eventSource.addEventListener('error', (event) => {
    const { productId, error } = JSON.parse(event.data);
    addFailedProduct(productId, error);
  });

  eventSource.addEventListener('complete', (event) => {
    const { translated } = JSON.parse(event.data);
    showSuccessMessage(`Translated ${translated} products`);
    eventSource.close();
  });

  eventSource.onerror = () => {
    console.error('SSE connection error');
    eventSource.close();
  };

  // Store for cancellation
  window.currentBulkTranslation = eventSource;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Google Cloud Translation API v2 (Basic) | API v3 (Advanced) | 2019 | v3 adds AutoML custom models, batch translation, glossaries. Same pricing as v2. Required for new projects. |
| API key authentication | Service account authentication | 2020 (v3 requirement) | Better security, IAM role-based access control, required for v3 API |
| Polling for bulk operation status | Server-Sent Events (SSE) | 2020+ | Real-time updates, lower latency, simpler than WebSockets for unidirectional streaming |
| WebSockets for progress tracking | SSE for progress tracking | 2022+ best practice | SSE is more efficient for server-to-client updates, native browser support, auto-reconnect |
| Synchronous bulk operations | Asynchronous bulk with streaming progress | Modern pattern | Better UX, cancellable operations, doesn't block server thread |

**Deprecated/outdated:**
- **API v2:** Still supported but v3 is recommended for new integrations (same pricing, more features)
- **API keys for authentication:** Not supported in v3 — service accounts are required
- **Long-polling for progress:** Replaced by SSE for real-time updates

## Open Questions

1. **Translation quality for Hebrew:**
   - What we know: Google Translate supports Hebrew-English bidirectional translation
   - What's unclear: Whether translation quality is acceptable for product names and descriptions (marketing copy)
   - Recommendation: Test sample translations manually before deploying to production. Google Translate is strongest for general text, may struggle with jewelry-specific terminology. Consider creating custom glossary in Phase 32 if quality issues arise.

2. **Service account key rotation:**
   - What we know: Service account keys should be rotated periodically for security
   - What's unclear: Rotation frequency and process for production deployment
   - Recommendation: Start with manual key rotation (download new key, update env var, restart server). Consider Google Cloud Secret Manager for automatic rotation in future phases.

3. **Cache invalidation strategy:**
   - What we know: Cache uses 1-hour TTL, resets on server restart
   - What's unclear: Whether admin should have manual "clear cache" button or if TTL is sufficient
   - Recommendation: Start with TTL-only approach. Add manual cache clearing in admin UI (Phase 29) if admin reports stale translations.

4. **Bulk translation interruption handling:**
   - What we know: SSE connections can drop due to network issues or server restarts
   - What's unclear: Whether to implement resumable bulk translation (track progress in DB)
   - Recommendation: Skip resumable logic for v1. Since save-as-you-go is used, admin can simply re-run bulk translation and already-translated products will be skipped. Add resumable logic if admin reports frustration with re-running.

## Sources

### Primary (HIGH confidence)

- [Google Cloud Translation API - Official Node.js Documentation](https://googleapis.dev/nodejs/translate/latest/index.html) - Official SDK reference
- [Cloud Translation Authentication](https://cloud.google.com/translate/docs/authentication) - Service account setup
- [Cloud Translation Quotas and Limits](https://docs.cloud.google.com/translate/quotas) - Rate limits, character limits, pricing
- [TranslationServiceClient Sample Code](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-translate/samples/generated/v3/translation_service.translate_text.js) - Official v3 translateText example
- [@google-cloud/translate npm Package](https://www.npmjs.com/package/@google-cloud/translate) - Package versions, installation
- [node-cache npm Package](https://www.npmjs.com/package/node-cache) - Caching library documentation
- [Top 5 node-cache Code Examples | Snyk](https://snyk.io/advisor/npm-package/node-cache/example) - Production usage patterns

**Codebase inspection:**
- `backend/cache/pageCache.js` - Existing node-cache instance pattern
- `backend/services/exchangeRateService.js` - External API integration pattern with fallbacks
- `backend/middleware/auth.js` - Admin authentication (fetchUser + requireAdmin)
- `backend/models/Product.js` - Bilingual fields schema (Phase 27)

### Secondary (MEDIUM confidence)

- [Why Server-Sent Events Beat WebSockets for 95% of Real-Time Cloud Applications](https://medium.com/codetodeploy/why-server-sent-events-beat-websockets-for-95-of-real-time-cloud-applications-830eff5a1d7c) - SSE vs WebSocket comparison (Jan 2026)
- [How To Use Server-Sent Events in Node.js | DigitalOcean](https://www.digitalocean.com/community/tutorials/nodejs-server-sent-events-build-realtime-app) - SSE implementation patterns
- [Google Cloud Retry Strategy](https://docs.cloud.google.com/storage/docs/retry-strategy) - Exponential backoff best practices
- [Google Translate API Pricing Calculator](https://costgoat.com/pricing/google-translate) - Pricing verification (Feb 2026)
- [How to Implement Role-Based Access Control in Express.js](https://www.makeuseof.com/role-based-access-control-expressjs-rest-api-passportjs-jwt/) - RBAC patterns

### Tertiary (LOW confidence)

- Community discussions on translation API best practices (various forums) - General patterns, not Google-specific
- Medium articles on caching strategies - General Node.js patterns, not translation-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @google-cloud/translate is official SDK, node-cache already in project
- Authentication: HIGH - Service account auth is required and documented by Google Cloud
- Architecture patterns: HIGH - SSE for progress is modern best practice, verified in 2026 sources
- Rate limiting: HIGH - Official quotas documentation, straightforward 100ms delay calculation
- Caching strategy: HIGH - node-cache already proven in pageCache.js, pattern is established
- Error handling: MEDIUM - Exponential backoff pattern is Google Cloud standard, but translation-specific error codes need testing
- Hebrew support: MEDIUM - Google Translate supports Hebrew, but quality for jewelry terminology is unverified

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days - stable domain, Google Cloud APIs don't change rapidly)
