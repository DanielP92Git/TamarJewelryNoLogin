// SSR route handlers for dynamic pages (categories, products)
const Product = require('../models/Product');
const { buildPageData } = require('./ssr');
const { generateProductSchema, generateBreadcrumbSchema } = require('../helpers/schemaHelpers');
const metaConfig = require('../config/meta');
const { categoryDisplayNames } = metaConfig;

/**
 * Map URL slugs to MongoDB category field values
 * URL slugs use hyphens, MongoDB uses camelCase for some categories
 */
const URL_TO_DB_CATEGORY = {
  'necklaces': 'necklaces',
  'crochet-necklaces': 'crochetNecklaces',
  'hoops': 'hoops',
  'dangle': 'dangle',
  'bracelets': 'bracelets',
  'unisex': 'unisex',
};

/**
 * Render category page with SSR product grid
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function renderCategoryPage(req, res) {
  const { lang, category } = req.params; // e.g., /en/necklaces
  const langKey = lang === 'he' ? 'heb' : 'eng';
  const urlLang = lang;
  const baseUrl = process.env.BASE_URL || 'https://tamarkfir.online';

  try {
    // Validate category slug
    if (!URL_TO_DB_CATEGORY[category]) {
      return res.status(404).render('pages/404', buildPageData(req, '404', []));
    }

    // Map URL slug to MongoDB category value
    const dbCategory = URL_TO_DB_CATEGORY[category];

    // Query products for this category
    const products = await Product.find({
      category: dbCategory,
      available: true,
    })
      .sort({ displayOrder: 1 })
      .limit(20)
      .select('id name slug images mainImage description quantity ils_price usd_price category sku discount_percentage original_ils_price original_usd_price')
      .lean();

    // If no products found, return 404
    if (!products || products.length === 0) {
      return res.status(404).render('pages/404', buildPageData(req, '404', []));
    }

    // Build page data
    const pageData = buildPageData(req, category, [
      { href: '/css/standard-reset.css' },
      { href: '/css/desktop-menu.css' },
      { href: '/css/categories-devices.css', media: '(max-width: 799.9px)' },
      { href: '/css/categories-800plus.css', media: '(min-width: 800px)' },
      { href: '/css/footer-desktop.css', media: '(min-width: 800px)' },
      { href: '/css/footer-mobile.css', media: '(max-width: 799.9px)' },
      { href: '/css/mobile-menu.css', media: '(max-width: 799.9px)' },
    ]);

    // Override canonical and alternateUrl for category-specific URLs
    const pagePath = `/${category}`;
    pageData.canonical = `${baseUrl}/${urlLang}${pagePath}`;
    pageData.alternateUrl = {
      en: `${baseUrl}/en${pagePath}`,
      he: `${baseUrl}/he${pagePath}`,
    };

    // Add category-specific data
    pageData.category = category; // URL slug
    pageData.categoryDisplayName = categoryDisplayNames[category]?.[langKey] || category;
    pageData.products = products;
    pageData.ssrFlag = true;

    // Generate Product schema for each product
    const schemaItems = products.map(product => generateProductSchema(product, langKey, baseUrl));
    pageData.schemaItems = schemaItems;

    // Generate BreadcrumbList schema
    const breadcrumbItems = [
      {
        name: langKey === 'eng' ? 'Home' : 'בית',
        url: `/${urlLang}`,
      },
      {
        name: categoryDisplayNames[category]?.[langKey] || category,
        // Current page - no URL
      },
    ];
    pageData.breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems, baseUrl);

    res.render('pages/category', pageData);
  } catch (err) {
    console.error('Category SSR error:', err);
    res.status(500).render('pages/error', buildPageData(req, 'error', []));
  }
}

module.exports = {
  renderCategoryPage,
};
