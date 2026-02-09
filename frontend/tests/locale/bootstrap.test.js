/**
 * bootstrapLocaleSync() and applyDocumentLanguageFromStorage() tests.
 *
 * Verifies locale initialization on page load:
 * - Fresh visit: browser-guessed defaults are persisted to localStorage
 * - Returning visit: existing localStorage prefs are preserved (not overwritten)
 * - Partial state: only missing values are filled in
 * - __localeAuto flags track what was auto-filled for backend hydration
 *
 * Requirements: LOCALE-13, LOCALE-14
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  bootstrapLocaleSync,
  applyDocumentLanguageFromStorage,
} from '../../js/locale.js';

describe('bootstrapLocaleSync() and applyDocumentLanguageFromStorage()', () => {
  let originalIntl;

  beforeEach(() => {
    localStorage.clear();
    delete window.__localeAuto;
    // Mock fetch to prevent actual network calls
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));
    // Set default navigator
    vi.stubGlobal('navigator', { language: 'en-US' });

    // Save original Intl and mock with non-Jerusalem timezone
    originalIntl = global.Intl;
    global.Intl = {
      ...originalIntl,
      DateTimeFormat: function () {
        return {
          resolvedOptions: () => ({ timeZone: 'America/New_York' }),
        };
      },
    };
  });

  afterEach(() => {
    localStorage.clear();
    delete window.__localeAuto;
    global.Intl = originalIntl;
    vi.restoreAllMocks();
  });

  describe('Fresh visit (no localStorage)', () => {
    it('sets language in localStorage (browser guess default)', () => {
      vi.stubGlobal('navigator', { language: 'en-US' });
      bootstrapLocaleSync();

      const lang = localStorage.getItem('language');
      expect(lang).toBeTruthy();
      expect(['eng', 'heb']).toContain(lang);
    });

    it('sets currency in localStorage (browser guess default)', () => {
      vi.stubGlobal('navigator', { language: 'en-US' });
      bootstrapLocaleSync();

      const currency = localStorage.getItem('currency');
      expect(currency).toBeTruthy();
      expect(['usd', 'ils']).toContain(currency);
    });

    it('sets window.__localeAuto.langWasMissing = true', () => {
      vi.stubGlobal('navigator', { language: 'en-US' });
      bootstrapLocaleSync();

      expect(window.__localeAuto).toBeDefined();
      expect(window.__localeAuto.langWasMissing).toBe(true);
    });

    it('sets window.__localeAuto.currencyWasMissing = true', () => {
      vi.stubGlobal('navigator', { language: 'en-US' });
      bootstrapLocaleSync();

      expect(window.__localeAuto).toBeDefined();
      expect(window.__localeAuto.currencyWasMissing).toBe(true);
    });

    it('sets document.documentElement.lang and dir based on guessed language', () => {
      vi.stubGlobal('navigator', { language: 'he' });
      bootstrapLocaleSync();

      expect(localStorage.getItem('language')).toBe('heb');
      expect(document.documentElement.lang).toBe('he');
      expect(document.documentElement.dir).toBe('rtl');
    });

    it('defaults to English when no special browser signals', () => {
      vi.stubGlobal('navigator', { language: 'en-US' });
      bootstrapLocaleSync();

      expect(localStorage.getItem('language')).toBe('eng');
      expect(localStorage.getItem('currency')).toBe('usd');
      expect(document.documentElement.lang).toBe('en');
      expect(document.documentElement.dir).toBe('ltr');
    });
  });

  describe('Returning visitor (localStorage has values) - LOCALE-14', () => {
    it('preserves existing language="heb"', () => {
      localStorage.setItem('language', 'heb');
      localStorage.setItem('currency', 'ils');
      vi.stubGlobal('navigator', { language: 'en-US' });

      bootstrapLocaleSync();

      // LOCALE-14: Existing value is NOT overwritten by browser guess
      expect(localStorage.getItem('language')).toBe('heb');
    });

    it('preserves existing currency="ils"', () => {
      localStorage.setItem('language', 'heb');
      localStorage.setItem('currency', 'ils');
      vi.stubGlobal('navigator', { language: 'en-US' });

      bootstrapLocaleSync();

      // LOCALE-14: Existing value is NOT overwritten
      expect(localStorage.getItem('currency')).toBe('ils');
    });

    it('does not set __localeAuto when both values exist', () => {
      localStorage.setItem('language', 'eng');
      localStorage.setItem('currency', 'usd');

      bootstrapLocaleSync();

      // If both exist, nothing was missing, so no flag
      expect(window.__localeAuto).toBeUndefined();
    });

    it('sets document.documentElement.lang/dir from existing localStorage language', () => {
      localStorage.setItem('language', 'heb');
      localStorage.setItem('currency', 'ils');

      bootstrapLocaleSync();

      expect(document.documentElement.lang).toBe('he');
      expect(document.documentElement.dir).toBe('rtl');
    });

    it('preserves English preference when browser would guess Hebrew', () => {
      localStorage.setItem('language', 'eng');
      localStorage.setItem('currency', 'usd');
      vi.stubGlobal('navigator', { language: 'he-IL' }); // Browser is Hebrew

      bootstrapLocaleSync();

      // LOCALE-14: User's saved preference wins over browser
      expect(localStorage.getItem('language')).toBe('eng');
      expect(localStorage.getItem('currency')).toBe('usd');
      expect(document.documentElement.lang).toBe('en');
      expect(document.documentElement.dir).toBe('ltr');
    });
  });

  describe('Partial state (only one value missing)', () => {
    it('only language missing: sets language from guess, preserves existing currency', () => {
      localStorage.setItem('currency', 'ils');
      vi.stubGlobal('navigator', { language: 'en-US' });

      bootstrapLocaleSync();

      expect(localStorage.getItem('language')).toBe('eng');
      expect(localStorage.getItem('currency')).toBe('ils'); // Preserved
    });

    it('only currency missing: sets currency from guess, preserves existing language', () => {
      localStorage.setItem('language', 'heb');
      vi.stubGlobal('navigator', { language: 'en-US' });

      bootstrapLocaleSync();

      expect(localStorage.getItem('language')).toBe('heb'); // Preserved
      expect(localStorage.getItem('currency')).toBe('usd');
    });

    it('sets __localeAuto.langWasMissing=true when only language missing', () => {
      localStorage.setItem('currency', 'ils');

      bootstrapLocaleSync();

      expect(window.__localeAuto.langWasMissing).toBe(true);
      expect(window.__localeAuto.currencyWasMissing).toBe(false);
    });

    it('sets __localeAuto.currencyWasMissing=true when only currency missing', () => {
      localStorage.setItem('language', 'heb');

      bootstrapLocaleSync();

      expect(window.__localeAuto.langWasMissing).toBe(false);
      expect(window.__localeAuto.currencyWasMissing).toBe(true);
    });
  });

  describe('applyDocumentLanguageFromStorage()', () => {
    it('sets lang="he" and dir="rtl" for Hebrew in localStorage', () => {
      localStorage.setItem('language', 'heb');
      applyDocumentLanguageFromStorage();

      expect(document.documentElement.lang).toBe('he');
      expect(document.documentElement.dir).toBe('rtl');
    });

    it('sets lang="en" and dir="ltr" for English in localStorage', () => {
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

    it('handles invalid localStorage value by defaulting to English', () => {
      localStorage.setItem('language', 'invalid');
      applyDocumentLanguageFromStorage();

      expect(document.documentElement.lang).toBe('en');
      expect(document.documentElement.dir).toBe('ltr');
    });
  });

  describe('LOCALE-13: Locale persists to localStorage', () => {
    it('bootstrapLocaleSync writes valid language to localStorage', () => {
      bootstrapLocaleSync();

      const lang = localStorage.getItem('language');
      expect(lang).toBeTruthy();
      expect(['eng', 'heb']).toContain(lang);
    });

    it('bootstrapLocaleSync writes valid currency to localStorage', () => {
      bootstrapLocaleSync();

      const currency = localStorage.getItem('currency');
      expect(currency).toBeTruthy();
      expect(['usd', 'ils']).toContain(currency);
    });

    it('persisted values survive page "reload" (localStorage clear simulation)', () => {
      // First visit
      vi.stubGlobal('navigator', { language: 'he' });
      bootstrapLocaleSync();

      const firstLang = localStorage.getItem('language');
      const firstCurrency = localStorage.getItem('currency');

      // Simulate page reload: clear __localeAuto but NOT localStorage
      delete window.__localeAuto;

      // Second visit
      bootstrapLocaleSync();

      // LOCALE-13: Values from first visit are still there
      expect(localStorage.getItem('language')).toBe(firstLang);
      expect(localStorage.getItem('currency')).toBe(firstCurrency);
      expect(localStorage.getItem('language')).toBe('heb');
      expect(localStorage.getItem('currency')).toBe('ils');
    });
  });
});
