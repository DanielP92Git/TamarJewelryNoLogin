// Cache key generation logic with language/currency awareness

/**
 * Generate cache key with URL path, language, and currency
 * Format: "normalizedPath:lang:currency"
 *
 * @param {object} req - Express request object
 * @returns {string} Cache key (e.g., "/en/necklaces:en:USD")
 */
function generateCacheKey(req) {
  // Extract language from URL parameters (default to 'en')
  const urlLang = req.params.lang || 'en';

  // Derive currency from language (he -> ILS, else USD)
  const currency = urlLang === 'he' ? 'ILS' : 'USD';

  // Normalize path: lowercase, remove trailing slashes
  const normalizedPath = req.path.toLowerCase().replace(/\/+$/, '') || '/';

  // Include query params if present (sorted for consistency)
  let queryString = '';
  if (Object.keys(req.query).length > 0) {
    const sortedQuery = Object.keys(req.query)
      .sort()
      .map(k => `${k}=${req.query[k]}`)
      .join('&');
    queryString = '?' + sortedQuery;
  }

  return `${normalizedPath}:${urlLang}:${currency}${queryString}`;
}

module.exports = { generateCacheKey };
