// Page cache instance using node-cache for in-memory caching
const NodeCache = require('node-cache');

// Create cache instance with production-ready configuration
// stdTTL: default TTL in seconds (1 hour)
// checkperiod: interval to check for expired keys (10 minutes)
// useClones: false for performance (we only store strings)
// maxKeys: maximum number of keys (prevents memory bloat, ~50MB limit)
const pageCache = new NodeCache({
  stdTTL: 3600,           // 1 hour default TTL
  checkperiod: 600,       // cleanup every 10 minutes
  useClones: false,       // performance: we only store strings
  maxKeys: 500,           // limit to ~500 pages (~50MB if 100KB per page)
});

// Log cache stats every hour in production for monitoring
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    const stats = pageCache.getStats();
    const totalRequests = stats.hits + stats.misses;
    const hitRate = totalRequests > 0 ? (stats.hits / totalRequests * 100).toFixed(2) : 0;

    console.log('Page cache stats:', {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: hitRate + '%',
    });
  }, 3600000); // 1 hour
}

module.exports = { pageCache };
