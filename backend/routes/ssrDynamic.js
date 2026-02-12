// SSR route handlers for dynamic pages (categories, products)
const Product = require('../models/Product');
const { buildPageData } = require('./ssr');
const { generateProductSchema, generateBreadcrumbSchema } = require('../helpers/schemaHelpers');
const metaConfig = require('../config/meta');
const { categoryDisplayNames } = metaConfig;

// Base CSS for error/404 pages (header + footer styling)
const ERROR_PAGE_STYLES = [
  { href: '/css/standard-reset.css' },
  { href: '/css/desktop-menu.css' },
  { href: '/css/footer-desktop.css', media: '(min-width: 800px)' },
  { href: '/css/footer-mobile.css', media: '(max-width: 799.9px)' },
  { href: '/css/mobile-menu.css', media: '(max-width: 799.9px)' },
];

/**
 * Map URL slugs to MongoDB category field values
 * URL slugs use hyphens, MongoDB uses camelCase for some categories
 */
const URL_TO_DB_CATEGORY = {
  'necklaces': 'necklaces',
  'crochet-necklaces': 'crochet-necklaces',
  'hoops': 'hoop-earrings',
  'dangle': 'dangle-earrings',
  'bracelets': 'bracelets',
  'unisex': 'unisex',
};

/**
 * Reverse map: MongoDB category values to URL slugs
 * Used for breadcrumb links from product detail pages
 */
const DB_TO_URL_CATEGORY = {
  'necklaces': 'necklaces',
  'crochet-necklaces': 'crochet-necklaces',
  'hoop-earrings': 'hoops',
  'dangle-earrings': 'dangle',
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
  const baseUrl = process.env.BASE_URL || 'https://tamarkfir.com';

  try {
    // Validate category slug
    if (!URL_TO_DB_CATEGORY[category]) {
      return res.status(404).render('pages/404', buildPageData(req, '404', ERROR_PAGE_STYLES));
    }

    // Map URL slug to MongoDB category value
    const dbCategory = URL_TO_DB_CATEGORY[category];

    // Query products for this category
    // Use $ne: false to match products where available is true OR undefined (matching SPA behavior)
    const products = await Product.find({
      category: dbCategory,
      available: { $ne: false },
    })
      .sort({ displayOrder: 1 })
      .limit(20)
      .select('id name slug image publicImage images mainImage description quantity ils_price usd_price category sku discount_percentage original_ils_price original_usd_price')
      .lean();

    // If no products found, return 404
    if (!products || products.length === 0) {
      return res.status(404).render('pages/404', buildPageData(req, '404', ERROR_PAGE_STYLES));
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
    pageData.category = category; // URL slug (for CSS class targeting)
    pageData.dbCategory = dbCategory; // DB category value (camelCase, for SPA JS API calls)
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
    res.status(500).render('pages/error', buildPageData(req, 'error', ERROR_PAGE_STYLES));
  }
}

/**
 * Render product detail page with SSR
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function renderProductPage(req, res) {
  const { lang, slug } = req.params; // e.g., /en/product/handmade-necklace
  const langKey = lang === 'he' ? 'heb' : 'eng';
  const urlLang = lang;
  const baseUrl = process.env.BASE_URL || 'https://tamarkfir.com';

  try {
    // Query product by slug
    // Use $ne: false to match products where available is true OR undefined (matching SPA behavior)
    const product = await Product.findOne({
      slug: slug,
      available: { $ne: false },
    }).lean();

    // If product not found, return 404
    if (!product) {
      return res.status(404).render('pages/404', buildPageData(req, '404', ERROR_PAGE_STYLES));
    }

    // Determine currency and price
    const currency = langKey === 'heb' ? 'ILS' : 'USD';
    const price = langKey === 'heb' ? product.ils_price : product.usd_price;
    const originalPrice = langKey === 'heb' ? product.original_ils_price : product.original_usd_price;

    // Truncate description for meta tag (max 158 chars)
    const metaDescription = product.description
      ? (product.description.length > 158
          ? product.description.substring(0, 158).trim() + '...'
          : product.description)
      : `View ${product.name} at Tamar Kfir Jewelry. Handmade with love in Jerusalem.`;

    // Get product image for OG tags
    const mainImg = (Array.isArray(product.images) && product.images.length > 0)
      ? product.images[0]
      : product.mainImage;
    const ogImage = (mainImg && typeof mainImg === 'object')
      ? (mainImg.publicDesktop || mainImg.desktop || mainImg.publicMobile || mainImg.mobile || null)
      : (product.publicImage || product.image || null);

    // Build page data manually (not using buildPageData since we need dynamic product title/description)
    const dir = langKey === 'heb' ? 'rtl' : 'ltr';
    const canonical = `${baseUrl}/${urlLang}/product/${slug}`;
    const alternateUrl = {
      en: `${baseUrl}/en/product/${slug}`,
      he: `${baseUrl}/he/product/${slug}`,
    };

    const pageData = {
      lang: langKey,
      urlLang: urlLang,
      dir: dir,
      title: product.name, // Will get " | Tamar Kfir Jewelry" suffix from meta-tags.ejs
      description: metaDescription,
      canonical: canonical,
      alternateUrl: alternateUrl,
      ogImage: ogImage,
      productPrice: price ? price.toFixed(2) : null,
      productCurrency: currency,
      baseUrl: baseUrl,
      pageStyles: [
        { href: '/css/standard-reset.css' },
        { href: '/css/desktop-menu.css' },
        { href: '/css/categories-devices.css', media: '(max-width: 799.9px)' },
        { href: '/css/categories-800plus.css', media: '(min-width: 800px)' },
        { href: '/css/footer-desktop.css', media: '(min-width: 800px)' },
        { href: '/css/footer-mobile.css', media: '(max-width: 799.9px)' },
        { href: '/css/mobile-menu.css', media: '(max-width: 799.9px)' },
      ],
      product: product,
      price: price,
      originalPrice: originalPrice,
      currency: currency,
      currencySymbol: currency === 'USD' ? '$' : '₪',
      hasDiscount: product.discount_percentage > 0 && originalPrice > 0 && originalPrice > price,
      categoryDisplayName: categoryDisplayNames[DB_TO_URL_CATEGORY[product.category]]?.[langKey] || product.category,
      categorySlug: DB_TO_URL_CATEGORY[product.category] || product.category,
      ssrFlag: true,
      googleSiteVerification: process.env.GOOGLE_SITE_VERIFICATION || '',
    };

    // Generate single product schema
    const schemaItems = [generateProductSchema(product, langKey, baseUrl)];
    pageData.schemaItems = schemaItems;

    // Generate breadcrumb: Home > Category > Product
    const breadcrumbItems = [
      {
        name: langKey === 'eng' ? 'Home' : 'בית',
        url: `/${urlLang}`,
      },
      {
        name: pageData.categoryDisplayName,
        url: `/${urlLang}/${pageData.categorySlug}`,
      },
      {
        name: product.name,
        // Current page - no URL
      },
    ];
    pageData.breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems, baseUrl);

    res.render('pages/product', pageData);
  } catch (err) {
    console.error('Product SSR error:', err);
    res.status(500).render('pages/error', buildPageData(req, 'error', ERROR_PAGE_STYLES));
  }
}

/**
 * Render cart page SSR shell
 * Content is populated by client-side JavaScript (localStorage/API)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
function renderCartPage(req, res) {
  try {
    // Build page data with cart-specific CSS
    const pageData = buildPageData(req, 'cart', [
      { href: '/css/standard-reset.css' },
      { href: '/css/desktop-menu.css' },
      { href: '/css/cart-devices.css', media: '(max-width: 799.9px)' },
      { href: '/css/cart-800plus.css', media: '(min-width: 800px)' },
      { href: '/css/footer-desktop.css', media: '(min-width: 800px)' },
      { href: '/css/footer-mobile.css', media: '(max-width: 799.9px)' },
      { href: '/css/mobile-menu.css', media: '(max-width: 799.9px)' },
    ]);

    res.render('pages/cart', pageData);
  } catch (err) {
    console.error('Cart SSR error:', err);
    res.status(500).render('pages/error', buildPageData(req, 'error', ERROR_PAGE_STYLES));
  }
}

module.exports = {
  renderCategoryPage,
  renderProductPage,
  renderCartPage,
  DB_TO_URL_CATEGORY,
};
