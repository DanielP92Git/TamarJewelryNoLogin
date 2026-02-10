const { resolveRequestLocale } = require('../config/locale');

/**
 * Detect language from cookie > CDN headers > GeoIP > Accept-Language > default (en)
 * @param {object} req - Express request object
 * @returns {string} - Language code ('en' or 'he')
 */
function detectLanguage(req) {
  // Priority 1: Check cookie preference
  try {
    const localePref = req.cookies?.locale_pref;
    if (localePref) {
      const parsed = JSON.parse(localePref);
      const lang = parsed?.lang;
      if (lang === 'en' || lang === 'he') {
        return lang;
      }
    }
  } catch (err) {
    // Invalid JSON in cookie, continue to next detection method
  }

  // Priority 2-4: CDN headers > GeoIP > Accept-Language via resolveRequestLocale
  try {
    const locale = resolveRequestLocale(req);
    if (locale?.lang === 'he' || locale?.lang === 'en') {
      return locale.lang;
    }
  } catch (err) {
    // resolveRequestLocale failed, fall through to default
  }

  // Priority 5: Default to English
  return 'en';
}

/**
 * Middleware to normalize trailing slashes (redirect /about/ to /about)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
function trailingSlashRedirect(req, res, next) {
  if (req.path !== '/' && req.path.endsWith('/')) {
    const pathWithoutSlash = req.path.slice(0, -1);
    const queryString = req.url.slice(req.path.length); // preserve query string
    return res.redirect(301, pathWithoutSlash + queryString);
  }
  next();
}

/**
 * Middleware for /:lang/* routes
 * Extracts language from URL, sets req.lang and req.dir, manages cookie preferences
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
function languageMiddleware(req, res, next) {
  // Extract language from URL path
  const match = req.path.match(/^\/(en|he)(?:\/|$)/);

  // If path starts with invalid 2-letter language prefix (not en/he), redirect to /en
  if (!match) {
    const invalidLangMatch = req.path.match(/^\/([a-z]{2})(?:\/|$)/);
    if (invalidLangMatch) {
      const restOfPath = req.path.slice(3); // Remove the /XX prefix
      return res.redirect(301, `/en${restOfPath}`);
    }
    // No language prefix at all - this shouldn't happen for routes using this middleware
    return next();
  }

  const urlLang = match[1];
  req.lang = urlLang;
  req.dir = urlLang === 'he' ? 'rtl' : 'ltr';

  // Update cookie preference when user navigates to a language URL
  // Only update if no cookie exists OR if cookie has different language
  let shouldUpdateCookie = false;
  let existingCurrency = urlLang === 'he' ? 'ILS' : 'USD'; // default

  try {
    const localePref = req.cookies?.locale_pref;
    if (!localePref) {
      // No cookie exists, create one
      shouldUpdateCookie = true;
    } else {
      const parsed = JSON.parse(localePref);
      if (parsed?.lang !== urlLang) {
        // Language changed, update cookie
        shouldUpdateCookie = true;
        // Preserve existing currency if it exists
        if (parsed?.currency) {
          existingCurrency = parsed.currency;
        }
      }
    }
  } catch (err) {
    // Invalid cookie, recreate it
    shouldUpdateCookie = true;
  }

  if (shouldUpdateCookie) {
    const currency = urlLang === 'he' ? 'ILS' : 'USD';
    const cookieValue = JSON.stringify({ lang: urlLang, currency });
    res.cookie('locale_pref', cookieValue, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: false, // Client JS needs access for currency switching
      sameSite: 'lax',
    });
  }

  next();
}

module.exports = {
  detectLanguage,
  trailingSlashRedirect,
  languageMiddleware,
};
