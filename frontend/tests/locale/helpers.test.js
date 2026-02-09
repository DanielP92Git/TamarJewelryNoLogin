/**
 * Locale helper function tests.
 *
 * Tests internal locale.js functions (normalizeAppLanguage, normalizeAppCurrency,
 * mapIsoToApp, guessLocaleFromBrowser, setDocumentLanguage) via their effects on
 * exported functions.
 *
 * LOCALE-03 note: Happy-DOM does not apply CSS, so flex-direction cannot be verified
 * in unit tests. We test dir="rtl" attribute as the trigger. Visual RTL verification
 * requires Playwright or manual testing.
 *
 * LOCALE-06 note: The app uses Math.round() for all prices - integers only, no decimal
 * places. This is a known deviation from the "2 decimal places" requirement.
 * Tests verify integer behavior as the actual implementation.
 *
 * Requirements: LOCALE-03 (partial), LOCALE-06 (deviation documented)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  bootstrapLocaleSync,
  hydrateLocaleFromBackend,
  applyDocumentLanguageFromStorage,
} from '../../js/locale.js';

describe('Locale helper functions', () => {
  let originalIntl;
  let originalNavigator;

  beforeEach(() => {
    localStorage.clear();
    delete window.__localeAuto;
    // Mock fetch to prevent actual network calls
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    // Save originals
    originalIntl = global.Intl;
    originalNavigator = global.navigator;
  });

  afterEach(() => {
    localStorage.clear();
    delete window.__localeAuto;
    vi.restoreAllMocks();

    // Restore globals
    global.Intl = originalIntl;
    global.navigator = originalNavigator;
  });

  describe('normalizeAppLanguage (via bootstrapLocaleSync)', () => {
    it('preserves valid "eng" in localStorage after bootstrap', () => {
      localStorage.setItem('language', 'eng');
      bootstrapLocaleSync();
      expect(localStorage.getItem('language')).toBe('eng');
    });

    it('preserves valid "heb" in localStorage after bootstrap', () => {
      localStorage.setItem('language', 'heb');
      bootstrapLocaleSync();
      expect(localStorage.getItem('language')).toBe('heb');
    });

    it('treats invalid value as missing and sets browser guess', () => {
      localStorage.setItem('language', 'french');
      vi.stubGlobal('navigator', { language: 'en-US' });

      bootstrapLocaleSync();

      const stored = localStorage.getItem('language');
      expect(stored === 'eng' || stored === 'heb').toBe(true);
      expect(window.__localeAuto.langWasMissing).toBe(true);
    });

    it('treats empty string as missing', () => {
      localStorage.setItem('language', '');
      vi.stubGlobal('navigator', { language: 'en-US' });

      bootstrapLocaleSync();

      expect(localStorage.getItem('language')).toBeTruthy();
      expect(window.__localeAuto.langWasMissing).toBe(true);
    });

    it('treats null as missing', () => {
      // localStorage returns null for missing keys
      vi.stubGlobal('navigator', { language: 'en-US' });

      bootstrapLocaleSync();

      expect(localStorage.getItem('language')).toBeTruthy();
      expect(window.__localeAuto.langWasMissing).toBe(true);
    });

    it('accepts case insensitive "ENG" as valid', () => {
      localStorage.setItem('language', 'ENG');
      localStorage.setItem('currency', 'usd'); // Set both to avoid triggering __localeAuto
      bootstrapLocaleSync();
      // normalizeAppLanguage recognizes 'ENG' as valid and returns 'eng'
      // bootstrapLocaleSync doesn't overwrite valid values, so 'ENG' stays
      expect(localStorage.getItem('language')).toBe('ENG');
      // __localeAuto is only set when something is missing
      expect(window.__localeAuto).toBeUndefined();
    });

    it('accepts case insensitive "HEB" as valid', () => {
      localStorage.setItem('language', 'HEB');
      localStorage.setItem('currency', 'ils'); // Set both to avoid triggering __localeAuto
      bootstrapLocaleSync();
      expect(localStorage.getItem('language')).toBe('HEB');
      expect(window.__localeAuto).toBeUndefined();
    });
  });

  describe('normalizeAppCurrency (via bootstrapLocaleSync)', () => {
    it('preserves valid "usd" in localStorage', () => {
      localStorage.setItem('currency', 'usd');
      bootstrapLocaleSync();
      expect(localStorage.getItem('currency')).toBe('usd');
    });

    it('preserves valid "ils" in localStorage', () => {
      localStorage.setItem('currency', 'ils');
      bootstrapLocaleSync();
      expect(localStorage.getItem('currency')).toBe('ils');
    });

    it('treats invalid value as missing and sets browser guess', () => {
      localStorage.setItem('currency', 'eur');
      vi.stubGlobal('navigator', { language: 'en-US' });

      bootstrapLocaleSync();

      const stored = localStorage.getItem('currency');
      expect(stored === 'usd' || stored === 'ils').toBe(true);
      expect(window.__localeAuto.currencyWasMissing).toBe(true);
    });

    it('accepts case insensitive "USD" as valid', () => {
      localStorage.setItem('language', 'eng'); // Set both to avoid triggering __localeAuto
      localStorage.setItem('currency', 'USD');
      bootstrapLocaleSync();
      // normalizeAppCurrency recognizes 'USD' as valid
      // bootstrapLocaleSync doesn't overwrite valid values
      expect(localStorage.getItem('currency')).toBe('USD');
      expect(window.__localeAuto).toBeUndefined();
    });

    it('accepts case insensitive "ILS" as valid', () => {
      localStorage.setItem('language', 'heb'); // Set both to avoid triggering __localeAuto
      localStorage.setItem('currency', 'ILS');
      bootstrapLocaleSync();
      expect(localStorage.getItem('currency')).toBe('ILS');
      expect(window.__localeAuto).toBeUndefined();
    });
  });

  describe('mapIsoToApp (via hydrateLocaleFromBackend)', () => {
    beforeEach(() => {
      // Set window.location.origin for getApiBase()
      window.location.origin = 'http://localhost:3000';
    });

    it('prefers appLang and appCurrency when present', async () => {
      // Set up auto-filled state
      localStorage.setItem('language', 'eng');
      localStorage.setItem('currency', 'usd');
      window.__localeAuto = { langWasMissing: true, currencyWasMissing: true };

      // Mock fetch with appLang/appCurrency keys
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ok: true,
              appLang: 'heb',
              appCurrency: 'ils',
            }),
        })
      );

      await hydrateLocaleFromBackend();

      expect(localStorage.getItem('language')).toBe('heb');
      expect(localStorage.getItem('currency')).toBe('ils');
    });

    it('maps ISO lang="he" to appLang="heb"', async () => {
      localStorage.setItem('language', 'eng');
      window.__localeAuto = { langWasMissing: true, currencyWasMissing: false };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ok: true,
              lang: 'he',
            }),
        })
      );

      await hydrateLocaleFromBackend();

      expect(localStorage.getItem('language')).toBe('heb');
    });

    it('maps ISO lang="en" to appLang="eng"', async () => {
      localStorage.setItem('language', 'heb');
      window.__localeAuto = { langWasMissing: true, currencyWasMissing: false };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ok: true,
              lang: 'en',
            }),
        })
      );

      await hydrateLocaleFromBackend();

      expect(localStorage.getItem('language')).toBe('eng');
    });

    it('maps ISO currency="ILS" to appCurrency="ils"', async () => {
      localStorage.setItem('currency', 'usd');
      window.__localeAuto = { langWasMissing: false, currencyWasMissing: true };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ok: true,
              currency: 'ILS',
            }),
        })
      );

      await hydrateLocaleFromBackend();

      expect(localStorage.getItem('currency')).toBe('ils');
    });

    it('maps ISO currency="USD" to appCurrency="usd"', async () => {
      localStorage.setItem('currency', 'ils');
      window.__localeAuto = { langWasMissing: false, currencyWasMissing: true };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ok: true,
              currency: 'USD',
            }),
        })
      );

      await hydrateLocaleFromBackend();

      expect(localStorage.getItem('currency')).toBe('usd');
    });

    it('prefers appLang when mixed with ISO currency', async () => {
      localStorage.setItem('language', 'eng');
      localStorage.setItem('currency', 'ils');
      window.__localeAuto = { langWasMissing: true, currencyWasMissing: true };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ok: true,
              appLang: 'heb',
              currency: 'USD',
            }),
        })
      );

      await hydrateLocaleFromBackend();

      expect(localStorage.getItem('language')).toBe('heb');
      expect(localStorage.getItem('currency')).toBe('usd');
    });
  });

  describe('guessLocaleFromBrowser (via bootstrapLocaleSync)', () => {
    beforeEach(() => {
      // Ensure Intl has a non-Jerusalem timezone by default
      global.Intl = {
        ...originalIntl,
        DateTimeFormat: function () {
          return {
            resolvedOptions: () => ({ timeZone: 'America/New_York' }),
          };
        },
      };
    });

    it('returns Hebrew/ILS for navigator.language="he"', () => {
      vi.stubGlobal('navigator', { language: 'he' });
      bootstrapLocaleSync();

      expect(localStorage.getItem('language')).toBe('heb');
      expect(localStorage.getItem('currency')).toBe('ils');
    });

    it('returns Hebrew/ILS for navigator.language="he-IL"', () => {
      vi.stubGlobal('navigator', { language: 'he-IL' });
      bootstrapLocaleSync();

      expect(localStorage.getItem('language')).toBe('heb');
      expect(localStorage.getItem('currency')).toBe('ils');
    });

    it('returns Hebrew/ILS for Asia/Jerusalem timezone', () => {
      vi.stubGlobal('navigator', { language: 'en-US' });
      // Mock Intl.DateTimeFormat to return Jerusalem
      global.Intl = {
        ...originalIntl,
        DateTimeFormat: function () {
          return {
            resolvedOptions: () => ({ timeZone: 'Asia/Jerusalem' }),
          };
        },
      };

      bootstrapLocaleSync();

      expect(localStorage.getItem('language')).toBe('heb');
      expect(localStorage.getItem('currency')).toBe('ils');
    });

    it('returns English/USD for navigator.language="en-US" (default)', () => {
      vi.stubGlobal('navigator', { language: 'en-US' });
      // Restore default non-Jerusalem timezone
      global.Intl = {
        ...originalIntl,
        DateTimeFormat: function () {
          return {
            resolvedOptions: () => ({ timeZone: 'America/New_York' }),
          };
        },
      };
      bootstrapLocaleSync();

      expect(localStorage.getItem('language')).toBe('eng');
      expect(localStorage.getItem('currency')).toBe('usd');
    });

    it('returns English/USD for non-Hebrew language (default fallback)', () => {
      vi.stubGlobal('navigator', { language: 'fr' });
      // Restore default non-Jerusalem timezone
      global.Intl = {
        ...originalIntl,
        DateTimeFormat: function () {
          return {
            resolvedOptions: () => ({ timeZone: 'America/New_York' }),
          };
        },
      };
      bootstrapLocaleSync();

      expect(localStorage.getItem('language')).toBe('eng');
      expect(localStorage.getItem('currency')).toBe('usd');
    });
  });

  describe('setDocumentLanguage (via applyDocumentLanguageFromStorage)', () => {
    it('sets lang="he" and dir="rtl" for Hebrew', () => {
      localStorage.setItem('language', 'heb');
      applyDocumentLanguageFromStorage();

      expect(document.documentElement.lang).toBe('he');
      expect(document.documentElement.dir).toBe('rtl');
    });

    it('sets lang="en" and dir="ltr" for English', () => {
      localStorage.setItem('language', 'eng');
      applyDocumentLanguageFromStorage();

      expect(document.documentElement.lang).toBe('en');
      expect(document.documentElement.dir).toBe('ltr');
    });

    it('defaults to English when no language in localStorage', () => {
      applyDocumentLanguageFromStorage();

      expect(document.documentElement.lang).toBe('en');
      expect(document.documentElement.dir).toBe('ltr');
    });

    it('sets dir="rtl" as trigger for CSS flex-direction (LOCALE-03)', () => {
      // LOCALE-03: Document that dir="rtl" triggers flex-direction in CSS.
      // Happy-DOM cannot verify computed styles, so we only test the attribute.
      localStorage.setItem('language', 'heb');
      applyDocumentLanguageFromStorage();

      expect(document.documentElement.dir).toBe('rtl');
      // Visual verification of flex-direction: row-reverse requires Playwright or manual testing
    });
  });

  describe('getApiBase (via hydrateLocaleFromBackend)', () => {
    it('uses window.location.origin when available', async () => {
      window.location.origin = 'http://localhost:3000';
      localStorage.setItem('language', 'eng');
      window.__localeAuto = { langWasMissing: true, currencyWasMissing: false };

      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, lang: 'en' }),
        })
      );
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      expect(fetchMock).toHaveBeenCalled();
      const callUrl = fetchMock.mock.calls[0][0];
      expect(callUrl).toContain('http://localhost:3000/api/locale');
    });

    it('falls back to process.env.API_URL when origin unavailable', async () => {
      // Remove window.location.origin
      delete window.location.origin;
      process.env.API_URL = 'https://api.example.com';

      localStorage.setItem('language', 'eng');
      window.__localeAuto = { langWasMissing: true, currencyWasMissing: false };

      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, lang: 'en' }),
        })
      );
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      expect(fetchMock).toHaveBeenCalled();
      const callUrl = fetchMock.mock.calls[0][0];
      expect(callUrl).toContain('https://api.example.com/api/locale');

      // Cleanup
      delete process.env.API_URL;
      window.location.origin = '';
    });
  });
});
