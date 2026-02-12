// Schema.org JSON-LD generation helpers for SEO structured data

/**
 * Generate Product schema JSON-LD
 * @param {Object} product - Product document from MongoDB
 * @param {string} langKey - 'eng' or 'heb'
 * @param {string} baseUrl - Site base URL
 * @returns {Object} Product schema JSON-LD object
 */
function generateProductSchema(product, langKey, baseUrl) {
  const mainImg = (Array.isArray(product.images) && product.images.length > 0)
    ? product.images[0]
    : product.mainImage;
  const image = (mainImg && typeof mainImg === 'object')
    ? (mainImg.publicDesktop || mainImg.desktop || mainImg.publicMobile || mainImg.mobile || '')
    : (product.publicImage || product.image || '');
  const price = langKey === 'heb' ? product.ils_price : product.usd_price;
  const currency = langKey === 'heb' ? 'ILS' : 'USD';
  const urlLang = langKey === 'heb' ? 'he' : 'en';
  const availability = product.quantity > 0
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || '',
    offers: {
      '@type': 'Offer',
      url: `${baseUrl}/${urlLang}/product/${product.slug}`,
      priceCurrency: currency,
      price: price ? price.toFixed(2) : '0.00',
      availability: availability,
    },
  };

  // Only include image if a valid URL exists
  if (image) {
    schema.image = image;
  }

  // Only include SKU if it has a value
  if (product.sku && product.sku.trim() !== '') {
    schema.sku = product.sku;
  }

  return schema;
}

/**
 * Generate BreadcrumbList schema JSON-LD
 * @param {Array} items - Array of {name, url} objects
 * @param {string} baseUrl - Site base URL
 * @returns {Object} BreadcrumbList schema JSON-LD object
 */
function generateBreadcrumbSchema(items, baseUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => {
      const listItem = {
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
      };

      // Last item (current page) should not have "item" property
      if (item.url) {
        listItem.item = `${baseUrl}${item.url}`;
      }

      return listItem;
    }),
  };
}

module.exports = {
  generateProductSchema,
  generateBreadcrumbSchema,
};
