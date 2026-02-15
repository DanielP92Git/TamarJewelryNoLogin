// Translation cache instance using node-cache for in-memory caching
const NodeCache = require('node-cache');

// Create cache instance with production-ready configuration
// stdTTL: default TTL in seconds (1 hour — translations are static text, long TTL is fine)
// checkperiod: interval to check for expired keys (10 minutes)
// useClones: false for performance (we only store simple {translatedText, detectedSourceLanguage} objects)
// maxKeys: maximum number of keys (limit memory — ~200KB total at ~200 bytes per cached translation)
const translationCache = new NodeCache({
  stdTTL: 3600,           // 1 hour default TTL
  checkperiod: 600,       // cleanup every 10 minutes
  useClones: false,       // performance: we only store simple objects
  maxKeys: 1000,          // limit to ~1000 translations (~200KB total)
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
