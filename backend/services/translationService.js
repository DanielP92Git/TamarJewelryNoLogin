/**
 * Translation Service
 * Handles text translation between Hebrew and English using Google Cloud Translation API v3
 * Features: caching, retry logic with exponential backoff, bidirectional support
 */

const { v3 } = require('@google-cloud/translate');
const { translationCache } = require('../cache/translationCache');

// Initialize Google Cloud Translation API v3 client
// SDK auto-reads GOOGLE_APPLICATION_CREDENTIALS env var
const translationClient = new v3.TranslationServiceClient();
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

// Graceful degradation: warn if credentials are not set, but don't crash at load time
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.warn('WARNING: GOOGLE_APPLICATION_CREDENTIALS not set. Translation API calls will fail.');
}
if (!projectId) {
  console.warn('WARNING: GOOGLE_CLOUD_PROJECT_ID not set. Translation API calls will fail.');
}

/**
 * Generate cache key for translation results
 * Includes source and target language to prevent bidirectional cache collisions
 * @param {string} text - Text to translate
 * @param {string} sourceLang - Source language code ('en' or 'he')
 * @param {string} targetLang - Target language code ('en' or 'he')
 * @returns {string} Cache key
 */
function getCacheKey(text, sourceLang, targetLang) {
  return `${sourceLang}-${targetLang}:${text}`;
}

/**
 * Retry function with exponential backoff and jitter
 * Only retries transient errors (429, 500, 503, network errors)
 * @param {Function} fn - Async function to retry
 * @param {number} maxAttempts - Maximum retry attempts (default: 3)
 * @param {number} baseDelay - Base delay in milliseconds (default: 1000)
 * @returns {Promise} Result of the function
 */
async function retryWithBackoff(fn, maxAttempts = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is transient (should retry)
      const isTransient =
        error.code === 429 || // Too Many Requests
        error.code === 500 || // Internal Server Error
        error.code === 503 || // Service Unavailable
        error.code === 'ECONNRESET' || // Network error
        error.code === 'ETIMEDOUT' || // Network timeout
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('ETIMEDOUT');

      // Don't retry non-transient errors (400, 401, 403, etc.)
      if (!isTransient) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      // Formula: min((2^attempt + random(0-1)) * baseDelay, 30000)
      const exponentialDelay = Math.pow(2, attempt) * baseDelay;
      const jitter = Math.random() * baseDelay;
      const delay = Math.min(exponentialDelay + jitter, 30000);

      console.warn(`Translation API retry attempt ${attempt}/${maxAttempts} after ${delay}ms. Error: ${error.message}`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Translate text from one language to another
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code ('en' or 'he')
 * @param {string|null} sourceLang - Source language code ('en' or 'he'), or null for auto-detect
 * @returns {Promise<{translatedText: string, detectedSourceLanguage?: string}>}
 */
async function translateText(text, targetLang, sourceLang = null) {
  // Validate input
  if (!text || typeof text !== 'string') {
    throw new Error('Translation text must be a non-empty string');
  }

  if (!['en', 'he'].includes(targetLang)) {
    throw new Error('Target language must be "en" or "he"');
  }

  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error('Translation text cannot be empty or whitespace only');
  }

  // Check credentials before attempting API call
  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is not set');
  }

  // Build cache key (use sourceLang or 'auto' for auto-detect)
  const cacheSourceLang = sourceLang || 'auto';
  const cacheKey = getCacheKey(trimmedText, cacheSourceLang, targetLang);

  // Check cache first
  const cachedResult = translationCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Call API with retry logic
  try {
    const result = await retryWithBackoff(async () => {
      // Build request
      const request = {
        parent: `projects/${projectId}/locations/global`,
        contents: [trimmedText],
        targetLanguageCode: targetLang,
        mimeType: 'text/plain',
      };

      // Add source language only if specified (otherwise auto-detect)
      if (sourceLang) {
        request.sourceLanguageCode = sourceLang;
      }

      // Call Google Cloud Translation API v3
      const [response] = await translationClient.translateText(request);

      // Validate response
      if (!response.translations || response.translations.length === 0) {
        throw new Error('Translation API returned empty response');
      }

      const translation = response.translations[0];

      // Build result
      const result = {
        translatedText: translation.translatedText,
      };

      // Include detected source language if present (from auto-detect)
      if (translation.detectedLanguageCode) {
        result.detectedSourceLanguage = translation.detectedLanguageCode;
      }

      return result;
    });

    // Cache the result
    translationCache.set(cacheKey, result);

    return result;
  } catch (error) {
    // Distinguish between API errors and network errors
    const errorType = error.code ? 'API error' : 'Network error';
    const errorMessage = `Translation failed (${errorType}): ${error.message}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Translate product fields (name and/or description) bidirectionally
 * Auto-detects which direction to translate based on which fields are populated
 * @param {Object} fields - Product fields object
 * @param {string} [fields.name_en] - English name
 * @param {string} [fields.name_he] - Hebrew name
 * @param {string} [fields.description_en] - English description
 * @param {string} [fields.description_he] - Hebrew description
 * @returns {Promise<Object>} Object with newly translated fields only
 */
async function translateProductFields(fields) {
  const result = {};

  try {
    // Translate name: en -> he
    if (fields.name_en && (!fields.name_he || fields.name_he.trim() === '')) {
      const translation = await translateText(fields.name_en, 'he', 'en');
      result.name_he = translation.translatedText;
    }

    // Translate name: he -> en
    if (fields.name_he && (!fields.name_en || fields.name_en.trim() === '')) {
      const translation = await translateText(fields.name_he, 'en', 'he');
      result.name_en = translation.translatedText;
    }

    // Translate description: en -> he
    if (fields.description_en && (!fields.description_he || fields.description_he.trim() === '')) {
      const translation = await translateText(fields.description_en, 'he', 'en');
      result.description_he = translation.translatedText;
    }

    // Translate description: he -> en
    if (fields.description_he && (!fields.description_en || fields.description_en.trim() === '')) {
      const translation = await translateText(fields.description_he, 'en', 'he');
      result.description_en = translation.translatedText;
    }

    return result;
  } catch (error) {
    console.error('Error translating product fields:', error.message);
    throw error;
  }
}

/**
 * Clear all cached translations
 * Useful for testing or manual cache reset
 */
function clearCache() {
  translationCache.flushAll();
}

module.exports = {
  translateText,
  translateProductFields,
  clearCache,
  getCacheKey,
};
