function normalizeCountryCode(value) {
  if (!value || typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  if (code === 'XX') return null;
  return code;
}

function normalizeIp(ip) {
  if (!ip || typeof ip !== 'string') return null;
  let s = ip.trim();
  // x-forwarded-for may include multiple IPs; the left-most is the original client.
  if (s.includes(',')) s = s.split(',')[0].trim();
  // Remove port if present
  if (s.includes(':') && s.includes('.')) {
    // likely IPv4 with port, e.g. 1.2.3.4:5678
    s = s.replace(/:\d+$/, '');
  }
  // IPv4-mapped IPv6
  s = s.replace(/^::ffff:/i, '');
  return s || null;
}

function getClientIp(req) {
  try {
    const xff = req?.headers?.['x-forwarded-for'];
    const fromXff = typeof xff === 'string' ? normalizeIp(xff) : null;
    if (fromXff) return fromXff;
    return normalizeIp(req?.ip || null);
  } catch {
    return null;
  }
}

function getCountryFromTrustedHeaders(req) {
  // Prefer CDN/proxy-provided country header when available (fast and accurate).
  const candidates = [
    req?.headers?.['cf-ipcountry'], // Cloudflare
    req?.headers?.['x-vercel-ip-country'], // Vercel
    req?.headers?.['x-appengine-country'], // GAE
    req?.headers?.['cloudfront-viewer-country'], // CloudFront
    req?.headers?.['fastly-client-country'], // Fastly
    req?.headers?.['x-country-code'],
    req?.headers?.['x-geo-country'],
  ];

  for (const v of candidates) {
    const code =
      typeof v === 'string'
        ? normalizeCountryCode(v)
        : Array.isArray(v)
          ? normalizeCountryCode(v[0])
          : null;
    if (code) return code;
  }
  return null;
}

function getCountryFromGeoip(ip) {
  if (!ip) return null;
  try {
    // Optional dependency: if not installed, we safely fall back.
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const geoip = require('geoip-lite');
    const lookup = geoip.lookup(ip);
    return normalizeCountryCode(lookup?.country || null);
  } catch {
    return null;
  }
}

function mapCountryToLocale(countryCode) {
  const isIsrael = countryCode === 'IL';
  const isoLang = isIsrael ? 'he' : 'en';
  const isoCurrency = isIsrael ? 'ILS' : 'USD';

  // App/UI uses these keys today
  const appLang = isIsrael ? 'heb' : 'eng';
  const appCurrency = isIsrael ? 'ils' : 'usd';

  return {
    country: countryCode || null,
    lang: isoLang,
    currency: isoCurrency,
    appLang,
    appCurrency,
  };
}

function resolveRequestLocale(req) {
  // If a user has a persisted locale cookie, prefer it (non-breaking; optional).
  try {
    const raw = req?.cookies?.locale_pref;
    if (typeof raw === 'string' && raw) {
      const parsed = JSON.parse(raw);
      const country = normalizeCountryCode(parsed?.country || null);
      if (country) return mapCountryToLocale(country);
    }
  } catch {
    // ignore cookie parse issues
  }

  const headerCountry = getCountryFromTrustedHeaders(req);
  if (headerCountry) return mapCountryToLocale(headerCountry);

  const ip = getClientIp(req);
  const geoCountry = getCountryFromGeoip(ip);
  if (geoCountry) return mapCountryToLocale(geoCountry);

  // Safe default
  return mapCountryToLocale(null);
}

module.exports = {
  resolveRequestLocale,
  // exported for tests / future use
  normalizeCountryCode,
  getClientIp,
};


