// SSR route handlers for static pages
const metaConfig = require('../config/meta');
const workshops = require('../config/workshops');
const Product = require('../models/Product');

/**
 * Build common pageData for SSR rendering
 * @param {object} req - Express request object (expects req.params.lang)
 * @param {string} pageKey - Key in metaConfig (e.g., 'about', 'contact')
 * @param {array} pageStyles - Array of CSS file objects with { href, media }
 * @returns {object} pageData for EJS template
 */
function buildPageData(req, pageKey, pageStyles) {
  const urlLang = req.params.lang; // 'en' or 'he' from URL
  const langKey = urlLang === 'he' ? 'heb' : 'eng'; // 'eng' or 'heb' for content
  const dir = langKey === 'heb' ? 'rtl' : 'ltr';
  const baseUrl = process.env.BASE_URL || 'https://tamarkfir.com';

  const meta = metaConfig[pageKey][langKey];
  const title = meta.title;
  const description = meta.description;

  // Build canonical URL (current page in current language)
  const pagePath = pageKey === 'home' ? '' : `/${pageKey}`;
  const canonical = `${baseUrl}/${urlLang}${pagePath}`;

  // Build alternate URLs for hreflang
  const alternateUrl = {
    en: `${baseUrl}/en${pagePath}`,
    he: `${baseUrl}/he${pagePath}`,
  };

  // The prototype chrome (header/footer) is global, so its stylesheet loads on
  // every page (tokens.css is linked separately, site-wide, in meta-tags.ejs).
  const styles = [...(pageStyles || []), { href: '/css/homepage.css' }];

  // Drive the prototype header: transparent nav over the hero on home, solid
  // elsewhere; highlight the active top-level nav item.
  const CATEGORY_KEYS = [
    'necklaces',
    'crochet-necklaces',
    'hoops',
    'dangle',
    'bracelets',
    'unisex',
  ];
  const NAV_BY_PAGEKEY = {
    home: 'Home',
    workshop: 'Jewelry Workshop',
    about: 'About',
    contact: 'Contact Me',
  };
  const activeNav =
    NAV_BY_PAGEKEY[pageKey] ||
    (CATEGORY_KEYS.includes(pageKey) ? 'Shop' : '');

  return {
    lang: langKey, // 'eng' or 'heb' for content conditionals
    urlLang, // 'en' or 'he' for URLs
    dir,
    title,
    description,
    canonical,
    ogImage: null, // Use default from meta-tags partial
    baseUrl,
    alternateUrl,
    pageStyles: styles,
    heroNav: pageKey === 'home',
    activeNav,
    googleSiteVerification: process.env.GOOGLE_SITE_VERIFICATION || '',
  };
}

/**
 * Render About page
 */
function renderAboutPage(req, res) {
  const pageData = buildPageData(req, 'about', [
    { href: '/css/standard-reset.css' },
    { href: '/css/desktop-menu.css' },
    { href: '/css/about-devices.css', media: '(max-width: 799.9px)' },
    { href: '/css/about-800plus.css', media: '(min-width: 800px)' },
    { href: '/css/footer-desktop.css', media: '(min-width: 800px)' },
    { href: '/css/footer-mobile.css', media: '(max-width: 799.9px)' },
    { href: '/css/mobile-menu.css', media: '(max-width: 799.9px)' },
  ]);

  res.render('pages/about', pageData);
}

/**
 * Render Contact page
 */
function renderContactPage(req, res) {
  const pageData = buildPageData(req, 'contact', [
    { href: '/css/standard-reset.css' },
    { href: '/css/desktop-menu.css' },
    { href: '/css/contact-me-devices.css', media: '(max-width: 799.9px)' },
    { href: '/css/contact-me-800plus.css', media: '(min-width: 800px)' },
    { href: '/css/footer-desktop.css', media: '(min-width: 800px)' },
    { href: '/css/footer-mobile.css', media: '(max-width: 799.9px)' },
    { href: '/css/mobile-menu.css', media: '(max-width: 799.9px)' },
  ]);

  res.render('pages/contact', pageData);
}

/**
 * Render Workshop page
 */
function renderWorkshopPage(req, res) {
  const pageData = buildPageData(req, 'workshop', [
    { href: '/css/standard-reset.css' },
    { href: '/css/desktop-menu.css' },
    { href: '/css/jewelry-workshop-devices.css', media: '(max-width: 799.9px)' },
    { href: '/css/jewelry-workshop-800plus.css', media: '(min-width: 800px)' },
    { href: '/css/footer-desktop.css', media: '(min-width: 800px)' },
    { href: '/css/footer-mobile.css', media: '(max-width: 799.9px)' },
    { href: '/css/mobile-menu.css', media: '(max-width: 799.9px)' },
  ]);

  pageData.workshops = workshops;
  res.render('pages/workshop', pageData);
}

/**
 * Render Policies page
 */
function renderPoliciesPage(req, res) {
  const pageData = buildPageData(req, 'policies', [
    { href: '/css/standard-reset.css' },
    { href: '/css/desktop-menu.css' },
    { href: '/css/policies-mobile.css', media: '(max-width: 799.9px)' },
    { href: '/css/policies-desktop.css', media: '(min-width: 800px)' },
    { href: '/css/footer-desktop.css', media: '(min-width: 800px)' },
    { href: '/css/footer-mobile.css', media: '(max-width: 799.9px)' },
    { href: '/css/mobile-menu.css', media: '(max-width: 799.9px)' },
  ]);

  res.render('pages/policies', pageData);
}

/**
 * Render Home page
 */
async function renderHomePage(req, res) {
  // Home renders the prototype design end-to-end: only tokens.css (global) +
  // homepage.css (appended by buildPageData). The legacy home/menu/footer
  // stylesheets are intentionally dropped here.
  try {
    const pageData = buildPageData(req, 'home', []);

    // Featured Pieces grid: top 8 in-stock featured products by featuredOrder.
    // Filter (available/quantity) implements D-03 (skip out-of-stock); .limit(8)
    // implements D-02; .sort({ featuredOrder: 1 }) implements D-01 ordering.
    // .select() MUST include `id` (real numeric field) so data-id is non-empty
    // under .lean(). Source: ssrDynamic.js renderCategoryPage lines 65-72.
    const featuredProducts = await Product.find({
      isFeatured: true,
      available: { $ne: false },
      quantity: { $gt: 0 },
    })
      .sort({ featuredOrder: 1 })
      .limit(8)
      .select('id name slug quantity images mainImage smallImages ils_price usd_price discount_percentage original_ils_price original_usd_price name_en name_he')
      .lean();

    pageData.featuredProducts = featuredProducts;

    res.render('pages/home', pageData);
  } catch (err) {
    // Fall back to an empty featured list (NOT a 500) so the rest of the
    // homepage still renders. Source: ssrDynamic.js try/catch lines 123-126.
    console.error('Home SSR error:', err);
    const pageData = buildPageData(req, 'home', []);
    pageData.featuredProducts = [];
    res.render('pages/home', pageData);
  }
}

module.exports = {
  renderAboutPage,
  renderContactPage,
  renderWorkshopPage,
  renderPoliciesPage,
  renderHomePage,
  buildPageData,
};
