const { detectLanguage } = require('./language');

/**
 * Legacy URL map: old .html paths to new clean URLs
 * Maps all 13 known routes from frontend/html/ structure
 */
const legacyUrlMap = {
  // Home page (index.html at root or /html/)
  '/index.html': '/',
  '/html/index.html': '/',

  // Static pages
  '/html/about.html': '/about',
  '/html/cart.html': '/cart',
  '/html/contact-me.html': '/contact',
  '/html/policies.html': '/policies',
  '/html/jewelry-workshop.html': '/workshop',

  // Category pages (top-level URLs for cleaner paths)
  '/html/categories/necklaces.html': '/necklaces',
  '/html/categories/crochetnecklaces.html': '/crochet-necklaces',
  '/html/categories/hoops.html': '/hoops',
  '/html/categories/dangle.html': '/dangle',
  '/html/categories/bracelets.html': '/bracelets',
  '/html/categories/unisex.html': '/unisex',
  '/html/categories/shalom-club.html': '/shalom-club',
};

/**
 * Legacy redirect middleware
 * Handles 301 permanent redirects from old .html paths to new clean bilingual URLs
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
function legacyRedirectMiddleware(req, res, next) {
  // Only process paths ending in .html
  if (!req.path.endsWith('.html')) {
    return next();
  }

  // Normalize to lowercase for case-insensitive matching
  const normalizedPath = req.path.toLowerCase();

  // Check if this is a known legacy path
  const cleanPath = legacyUrlMap[normalizedPath];

  if (cleanPath) {
    // Known legacy path — redirect with language prefix
    const lang = detectLanguage(req);

    // For home page, redirect to /{lang}
    if (cleanPath === '/') {
      return res.redirect(301, `/${lang}`);
    }

    // For other pages, redirect to /{lang}{cleanPath}
    return res.redirect(301, `/${lang}${cleanPath}`);
  }

  // Unknown .html path — fall through to eventual 404 handler
  // Do NOT redirect to avoid infinite loops
  next();
}

module.exports = {
  legacyRedirectMiddleware,
};
