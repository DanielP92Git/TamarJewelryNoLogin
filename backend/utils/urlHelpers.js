/**
 * URL manipulation helpers.
 * Store relative paths in DB; return absolute URLs to clients.
 */

function normalizeBaseUrl(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed || null;
}

function isAbsoluteHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function joinUrl(base, pathname) {
  if (!base || typeof base !== 'string') return pathname;
  if (!pathname || typeof pathname !== 'string') return pathname;
  const b = base.replace(/\/+$/, '');
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${b}${p}`;
}

function toAbsoluteApiUrl(value) {
  if (!value || typeof value !== 'string') return value;
  if (isAbsoluteHttpUrl(value)) {
    if (process.env.NODE_ENV !== 'production') {
      const rel = toRelativeApiPath(value);
      if (
        typeof rel === 'string' &&
        rel.startsWith('/') &&
        (rel.startsWith('/uploads/') ||
          rel.startsWith('/smallImages/') ||
          rel.startsWith('/public/uploads/') ||
          rel.startsWith('/public/smallImages/') ||
          rel.startsWith('/direct-image/') ||
          rel.startsWith('/images/'))
      ) {
        return joinUrl(process.env.API_URL, rel);
      }
    }
    return value;
  }
  if (!value.startsWith('/')) return value;
  return joinUrl(process.env.API_URL, value);
}

function toRelativeApiPath(value) {
  if (!value || typeof value !== 'string') return value;
  if (value.startsWith('/')) {
    return value.replace(/^\/api\//, '/');
  }
  if (!isAbsoluteHttpUrl(value)) return value;

  try {
    const url = new URL(value);
    return url.pathname.replace(/^\/api\//, '/');
  } catch {
    const match = value.match(
      /(\/api)?(\/uploads\/|\/smallImages\/|\/public\/uploads\/|\/public\/smallImages\/|\/direct-image\/).+$/i
    );
    if (match && match[0]) return match[0].replace(/^\/api\//, '/');
    return value;
  }
}

function toOrigin(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      return new URL(trimmed).origin;
    } catch {
      return null;
    }
  }
  return trimmed;
}

module.exports = {
  normalizeBaseUrl,
  isAbsoluteHttpUrl,
  joinUrl,
  toAbsoluteApiUrl,
  toRelativeApiPath,
  toOrigin,
};
