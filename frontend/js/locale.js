const LANGUAGE_KEY = 'language'; // existing app key: 'eng' | 'heb'
const CURRENCY_KEY = 'currency'; // existing app key: 'usd' | 'ils'

function normalizeAppLanguage(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'eng' || v === 'heb') return v;
  return null;
}

function normalizeAppCurrency(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'usd' || v === 'ils') return v;
  return null;
}

function mapIsoToApp({ lang, currency, appLang, appCurrency }) {
  // Prefer explicit app keys when backend sends them
  const mappedLang =
    normalizeAppLanguage(appLang) ||
    (String(lang || '').toLowerCase().startsWith('he') ? 'heb' : 'eng');

  const mappedCurrency =
    normalizeAppCurrency(appCurrency) ||
    (String(currency || '').toUpperCase() === 'ILS' ? 'ils' : 'usd');

  return { appLang: mappedLang, appCurrency: mappedCurrency };
}

function guessLocaleFromBrowser() {
  try {
    const navLang = String(navigator?.language || '').toLowerCase();
    const tz = String(
      Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || ''
    );

    // Strong Israel signals
    const isHebrew = navLang.startsWith('he');
    const isIsraelTz = tz === 'Asia/Jerusalem';

    if (isHebrew || isIsraelTz) return { appLang: 'heb', appCurrency: 'ils' };
  } catch {
    // ignore
  }

  return { appLang: 'eng', appCurrency: 'usd' };
}

function setDocumentLanguage(appLang) {
  try {
    const html = document.documentElement;
    if (!html) return;
    if (appLang === 'heb') {
      html.lang = 'he';
      html.dir = 'rtl';
    } else {
      html.lang = 'en';
      html.dir = 'ltr';
    }
  } catch {
    // ignore
  }
}

function getApiBase() {
  // Prefer same-origin when available (best performance + no CORS when site and API share a domain).
  // Example: tamarkfir.com + tamarkfir.com/api
  try {
    const origin = window?.location?.origin;
    if (origin && typeof origin === 'string') return origin;
  } catch {
    // ignore
  }

  // Fallback to Parcel-injected env var (used elsewhere in this codebase)
  try {
    const envUrl = process?.env?.API_URL;
    if (envUrl && typeof envUrl === 'string') return envUrl;
  } catch {
    // ignore
  }

  // Last resort
  return '';
}

async function fetchLocaleFromBackend(timeoutMs = 900) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const base = getApiBase();
    // Try /api/locale first (preferred), then /locale for compatibility.
    const primary = new URL('/api/locale', base).toString();
    const fallback = new URL('/locale', base).toString();

    const tryOnce = async url => {
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`LOCALE_HTTP_${res.status}`);
      return await res.json();
    };

    try {
      return await tryOnce(primary);
    } catch {
      return await tryOnce(fallback);
    }
  } finally {
    clearTimeout(t);
  }
}

/**
 * Run as early as possible (before heavy view modules read localStorage).
 * - If user already has prefs, we keep them.
 * - If missing, we set a quick browser-based guess to avoid flashes.
 */
export function bootstrapLocaleSync() {
  const existingLang = normalizeAppLanguage(localStorage.getItem(LANGUAGE_KEY));
  const existingCurrency = normalizeAppCurrency(
    localStorage.getItem(CURRENCY_KEY)
  );

  const missingLang = !existingLang;
  const missingCurrency = !existingCurrency;

  if (missingLang || missingCurrency) {
    const guess = guessLocaleFromBrowser();
    if (missingLang) localStorage.setItem(LANGUAGE_KEY, guess.appLang);
    if (missingCurrency) localStorage.setItem(CURRENCY_KEY, guess.appCurrency);

    // Track if we auto-filled (so backend can override once this load).
    window.__localeAuto = {
      ...(window.__localeAuto || {}),
      langWasMissing: missingLang,
      currencyWasMissing: missingCurrency,
    };
  }

  setDocumentLanguage(
    normalizeAppLanguage(localStorage.getItem(LANGUAGE_KEY)) || 'eng'
  );
}

/**
 * Hydrate from backend geo detection.
 * Only overrides values that were missing at page start (to avoid clobbering user preference).
 */
export async function hydrateLocaleFromBackend() {
  const auto = window.__localeAuto || {};
  const shouldOverrideLang = !!auto.langWasMissing;
  const shouldOverrideCurrency = !!auto.currencyWasMissing;

  if (!shouldOverrideLang && !shouldOverrideCurrency) {
    // User already had prefs; nothing to do.
    return;
  }

  try {
    const payload = await fetchLocaleFromBackend();
    if (!payload || payload.ok !== true) return;

    const mapped = mapIsoToApp(payload);

    if (shouldOverrideLang && mapped.appLang) {
      localStorage.setItem(LANGUAGE_KEY, mapped.appLang);
      setDocumentLanguage(mapped.appLang);
    }
    if (shouldOverrideCurrency && mapped.appCurrency) {
      localStorage.setItem(CURRENCY_KEY, mapped.appCurrency);
      // Notify existing currency listeners (View.js listens for this)
      window.dispatchEvent(
        new CustomEvent('currency-changed', {
          detail: { currency: mapped.appCurrency },
        })
      );
    }
  } catch (err) {
    // Fail closed: keep defaults; never crash UI.
    if (process?.env?.NODE_ENV !== 'production') {
      console.warn('[locale] backend hydration failed:', err);
    }
  } finally {
    // Prevent repeated overrides within the same load.
    window.__localeAuto = { langWasMissing: false, currencyWasMissing: false };
  }
}

export function applyDocumentLanguageFromStorage() {
  setDocumentLanguage(
    normalizeAppLanguage(localStorage.getItem(LANGUAGE_KEY)) || 'eng'
  );
}


