// Cache invalidation utilities for SSR pages
const { pageCache } = require('./pageCache');

/**
 * Invalidate category page cache in both languages
 * Also invalidates home page since it displays category grid
 * @param {string} categorySlug - URL slug (e.g., 'necklaces', 'crochet-necklaces')
 */
function invalidateCategory(categorySlug) {
  // Delete category pages in both languages and currencies
  const cacheKeys = [
    `/en/${categorySlug}:en:USD`,
    `/en/${categorySlug}:en:ILS`,
    `/he/${categorySlug}:he:USD`,
    `/he/${categorySlug}:he:ILS`,
    // Home page shows category grid
    '/en:en:USD',
    '/en:en:ILS',
    '/he:he:USD',
    '/he:he:ILS',
  ];

  cacheKeys.forEach(key => pageCache.del(key));
  console.log('Cache invalidated for category:', categorySlug);
}

/**
 * Invalidate product detail page cache in both languages
 * Also invalidates category page if provided
 * @param {string} productSlug - Product URL slug (e.g., 'beaded-necklace')
 * @param {string} categorySlug - Category URL slug (optional)
 */
function invalidateProduct(productSlug, categorySlug) {
  // Delete product detail pages in both languages and currencies
  const cacheKeys = [
    `/en/product/${productSlug}:en:USD`,
    `/en/product/${productSlug}:en:ILS`,
    `/he/product/${productSlug}:he:USD`,
    `/he/product/${productSlug}:he:ILS`,
  ];

  cacheKeys.forEach(key => pageCache.del(key));
  console.log('Cache invalidated for product:', productSlug);

  // Product changes affect category page (product appears in category grid)
  if (categorySlug) {
    invalidateCategory(categorySlug);
  }
}

/**
 * Invalidate all cached pages
 * Used when changes affect all pages (e.g., exchange rate update changes all prices)
 */
function invalidateAll() {
  pageCache.flushAll();
  console.log('All page cache invalidated');
}

module.exports = {
  invalidateProduct,
  invalidateCategory,
  invalidateAll,
};
