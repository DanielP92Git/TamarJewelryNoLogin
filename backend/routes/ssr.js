// SSR route handlers for static pages
const metaConfig = require('../config/meta');

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
  const baseUrl = process.env.BASE_URL || 'https://tamarkfir.online';

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
    pageStyles,
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
function renderHomePage(req, res) {
  const pageData = buildPageData(req, 'home', [
    { href: '/css/standard-reset.css' },
    { href: '/css/desktop-menu.css' },
    { href: '/css/home-mobile.css', media: '(max-width: 799.9px)' },
    { href: '/css/home-800plus.css', media: '(min-width: 800px)' },
    { href: '/css/footer-desktop.css', media: '(min-width: 800px)' },
    { href: '/css/footer-mobile.css', media: '(max-width: 799.9px)' },
    { href: '/css/mobile-menu.css', media: '(max-width: 799.9px)' },
  ]);

  res.render('pages/home', pageData);
}

module.exports = {
  renderAboutPage,
  renderContactPage,
  renderWorkshopPage,
  renderPoliciesPage,
  renderHomePage,
  buildPageData,
};
