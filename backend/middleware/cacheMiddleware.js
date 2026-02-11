// Express middleware for SSR page caching with HTTP cache headers
const { pageCache } = require('../cache/pageCache');
const { generateCacheKey } = require('../cache/cacheKeys');

/**
 * Cache middleware factory function
 * Serves cached HTML on hit, stores rendered HTML on miss
 * Sets HTTP Cache-Control headers with stale-while-revalidate
 *
 * @param {object} options - Configuration options
 * @param {number} options.ttl - TTL in seconds (default: 3600 = 1 hour)
 * @returns {function} Express middleware
 */
function cacheMiddleware(options = {}) {
  const ttl = options.ttl || 3600; // 1 hour default

  return (req, res, next) => {
    // Skip conditions: only cache GET requests for public pages
    if (req.method !== 'GET') {
      return next();
    }

    if (req.path.startsWith('/admin')) {
      return next();
    }

    if (req.headers.authorization) {
      return next();
    }

    // Skip cache entirely in test environment to avoid test interference
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    // Generate cache key
    const cacheKey = generateCacheKey(req);

    // Check cache for hit
    const cached = pageCache.get(cacheKey);

    if (cached) {
      // Cache HIT: serve cached HTML immediately (sub-50ms TTFB typical)
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      return res.send(cached);
    }

    // Cache MISS: intercept res.send to cache the response
    const originalSend = res.send;

    res.send = function(body) {
      // Only cache successful HTML responses
      if (res.statusCode === 200 && typeof body === 'string') {
        pageCache.set(cacheKey, body, ttl);
      }

      // Set cache headers
      res.set('X-Cache', 'MISS');
      res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');

      // Call original send with preserved context
      return originalSend.call(this, body);
    };

    next();
  };
}

module.exports = { cacheMiddleware };
