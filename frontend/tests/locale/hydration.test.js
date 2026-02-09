/**
 * hydrateLocaleFromBackend() tests.
 *
 * Verifies async GeoIP-based locale detection:
 * - Skips fetch when user already has preferences (__localeAuto flags)
 * - Fetches /api/locale with fallback to /locale
 * - Maps backend response to app locale keys
 * - Only overrides auto-filled values, preserving user choices
 * - Dispatches currency-changed event when currency updates
 * - Handles timeout (900ms AbortController) and network failures gracefully
 * - Resets __localeAuto flags after completion
 *
 * Requirements: LOCALE-11, LOCALE-12
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hydrateLocaleFromBackend } from '../../js/locale.js';

// Fetch mock helpers
function mockFetchResponse(data) {
  return vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data),
    })
  );
}

function mockFetchError(status = 500) {
  return vi.fn(() =>
    Promise.resolve({
      ok: false,
      status,
      json: () => Promise.reject(new Error('Not JSON')),
    })
  );
}

function mockFetchNetworkError() {
  return vi.fn(() => Promise.reject(new Error('Network error')));
}

function mockFetchSequence(...responses) {
  const fn = vi.fn();
  responses.forEach(resp => {
    fn.mockImplementationOnce(resp);
  });
  return fn;
}

describe('hydrateLocaleFromBackend', () => {
  let originalFetch;
  let currencyChangedSpy;

  beforeEach(() => {
    // Setup window.location.origin for getApiBase()
    window.location.origin = 'http://localhost:3000';

    // Clear localStorage
    localStorage.clear();

    // Clear __localeAuto flags
    delete window.__localeAuto;

    // Save original fetch
    originalFetch = global.fetch;

    // Setup currency-changed event spy
    currencyChangedSpy = vi.fn();
    window.addEventListener('currency-changed', currencyChangedSpy);
  });

  afterEach(() => {
    // Restore fetch
    global.fetch = originalFetch;

    // Cleanup event listener
    window.removeEventListener('currency-changed', currencyChangedSpy);

    // Clear __localeAuto
    delete window.__localeAuto;

    // Clear timers
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Early return when user has preferences', () => {
    it('skips fetch when __localeAuto is undefined', async () => {
      const fetchMock = mockFetchResponse({ ok: true });
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('skips fetch when both langWasMissing and currencyWasMissing are false', async () => {
      window.__localeAuto = {
        langWasMissing: false,
        currencyWasMissing: false,
      };

      const fetchMock = mockFetchResponse({ ok: true });
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('skips fetch when user already had both preferences', async () => {
      localStorage.setItem('language', 'eng');
      localStorage.setItem('currency', 'usd');
      window.__localeAuto = {
        langWasMissing: false,
        currencyWasMissing: false,
      };

      const fetchMock = mockFetchResponse({ ok: true });
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(localStorage.getItem('language')).toBe('eng');
      expect(localStorage.getItem('currency')).toBe('usd');
    });
  });

  describe('LOCALE-11: Successful GeoIP detection', () => {
    it('fetches and applies Israeli locale when both language and currency missing', async () => {
      window.__localeAuto = {
        langWasMissing: true,
        currencyWasMissing: true,
      };

      const fetchMock = mockFetchResponse({
        ok: true,
        country: 'IL',
        appLang: 'heb',
        appCurrency: 'ils',
      });
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/locale',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
      );

      expect(localStorage.getItem('language')).toBe('heb');
      expect(localStorage.getItem('currency')).toBe('ils');
      expect(document.documentElement.lang).toBe('he');
      expect(document.documentElement.dir).toBe('rtl');
    });

    it('dispatches currency-changed event when currency is updated', async () => {
      window.__localeAuto = {
        langWasMissing: true,
        currencyWasMissing: true,
      };

      const fetchMock = mockFetchResponse({
        ok: true,
        country: 'IL',
        appLang: 'heb',
        appCurrency: 'ils',
      });
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      expect(currencyChangedSpy).toHaveBeenCalledTimes(1);
      const event = currencyChangedSpy.mock.calls[0][0];
      expect(event.detail.currency).toBe('ils');
    });

    it('updates only language when currency was not missing', async () => {
      localStorage.setItem('currency', 'usd');
      window.__localeAuto = {
        langWasMissing: true,
        currencyWasMissing: false,
      };

      const fetchMock = mockFetchResponse({
        ok: true,
        country: 'IL',
        appLang: 'heb',
        appCurrency: 'ils',
      });
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      expect(localStorage.getItem('language')).toBe('heb');
      expect(localStorage.getItem('currency')).toBe('usd'); // Preserved
      expect(currencyChangedSpy).not.toHaveBeenCalled();
    });

    it('updates only currency when language was not missing', async () => {
      localStorage.setItem('language', 'eng');
      window.__localeAuto = {
        langWasMissing: false,
        currencyWasMissing: true,
      };

      const fetchMock = mockFetchResponse({
        ok: true,
        country: 'IL',
        appLang: 'heb',
        appCurrency: 'ils',
      });
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      expect(localStorage.getItem('language')).toBe('eng'); // Preserved
      expect(localStorage.getItem('currency')).toBe('ils');
      expect(currencyChangedSpy).toHaveBeenCalledTimes(1);
    });

    it('maps ISO codes to app locale keys (he -> heb, ILS -> ils)', async () => {
      window.__localeAuto = {
        langWasMissing: true,
        currencyWasMissing: true,
      };

      const fetchMock = mockFetchResponse({
        ok: true,
        lang: 'he',
        currency: 'ILS',
      });
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      expect(localStorage.getItem('language')).toBe('heb');
      expect(localStorage.getItem('currency')).toBe('ils');
    });
  });

  describe('LOCALE-12: Fallback chain', () => {
    it('falls back to /locale when /api/locale fails', async () => {
      window.__localeAuto = {
        langWasMissing: true,
        currencyWasMissing: true,
      };

      const fetchMock = mockFetchSequence(
        // First call to /api/locale fails
        () =>
          Promise.resolve({
            ok: false,
            status: 404,
          }),
        // Second call to /locale succeeds
        () =>
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
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toContain('/api/locale');
      expect(fetchMock.mock.calls[1][0]).toContain('/locale');
      expect(localStorage.getItem('language')).toBe('heb');
      expect(localStorage.getItem('currency')).toBe('ils');
    });

    it('handles complete network failure gracefully', async () => {
      window.__localeAuto = {
        langWasMissing: true,
        currencyWasMissing: true,
      };

      // Set initial values from browser guess
      localStorage.setItem('language', 'eng');
      localStorage.setItem('currency', 'usd');

      const fetchMock = mockFetchSequence(
        mockFetchNetworkError(),
        mockFetchNetworkError()
      );
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      // Should not crash, preserve existing values
      expect(localStorage.getItem('language')).toBe('eng');
      expect(localStorage.getItem('currency')).toBe('usd');
    });

    it('treats ok:false response as failure', async () => {
      window.__localeAuto = {
        langWasMissing: true,
        currencyWasMissing: true,
      };

      localStorage.setItem('language', 'eng');
      localStorage.setItem('currency', 'usd');

      const fetchMock = mockFetchResponse({
        ok: false, // Backend returns ok:false
      });
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      // Should not update
      expect(localStorage.getItem('language')).toBe('eng');
      expect(localStorage.getItem('currency')).toBe('usd');
    });

    it('handles null/undefined payload gracefully', async () => {
      window.__localeAuto = {
        langWasMissing: true,
        currencyWasMissing: true,
      };

      localStorage.setItem('language', 'eng');
      localStorage.setItem('currency', 'usd');

      const fetchMock = mockFetchResponse(null);
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      // Should not crash, preserve existing values
      expect(localStorage.getItem('language')).toBe('eng');
      expect(localStorage.getItem('currency')).toBe('usd');
    });
  });

  describe('Timeout and abort handling', () => {
    it('handles aborted fetch gracefully', async () => {
      window.__localeAuto = {
        langWasMissing: true,
        currencyWasMissing: true,
      };

      localStorage.setItem('language', 'eng');
      localStorage.setItem('currency', 'usd');

      // Create a fetch that simulates abort error
      const fetchMock = vi.fn(() =>
        Promise.reject(new Error('AbortError'))
      );
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      // Should complete without crash, preserve values, reset flags
      expect(localStorage.getItem('language')).toBe('eng');
      expect(localStorage.getItem('currency')).toBe('usd');
      expect(window.__localeAuto).toEqual({
        langWasMissing: false,
        currencyWasMissing: false,
      });
    });
  });

  describe('__localeAuto flag reset', () => {
    it('resets flags after successful hydration', async () => {
      window.__localeAuto = {
        langWasMissing: true,
        currencyWasMissing: true,
      };

      const fetchMock = mockFetchResponse({
        ok: true,
        appLang: 'heb',
        appCurrency: 'ils',
      });
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      expect(window.__localeAuto).toEqual({
        langWasMissing: false,
        currencyWasMissing: false,
      });
    });

    it('resets flags after failed hydration', async () => {
      window.__localeAuto = {
        langWasMissing: true,
        currencyWasMissing: true,
      };

      const fetchMock = mockFetchNetworkError();
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      expect(window.__localeAuto).toEqual({
        langWasMissing: false,
        currencyWasMissing: false,
      });
    });

    it('prevents repeated override attempts within same page load', async () => {
      window.__localeAuto = {
        langWasMissing: true,
        currencyWasMissing: true,
      };

      const fetchMock = mockFetchResponse({
        ok: true,
        appLang: 'heb',
        appCurrency: 'ils',
      });
      global.fetch = fetchMock;

      // First call
      await hydrateLocaleFromBackend();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call should skip
      await hydrateLocaleFromBackend();
      expect(fetchMock).toHaveBeenCalledTimes(1); // Still 1
    });
  });

  describe('Backend response variations', () => {
    it('handles English locale (en -> eng, USD -> usd)', async () => {
      window.__localeAuto = {
        langWasMissing: true,
        currencyWasMissing: true,
      };

      const fetchMock = mockFetchResponse({
        ok: true,
        lang: 'en',
        currency: 'USD',
      });
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      expect(localStorage.getItem('language')).toBe('eng');
      expect(localStorage.getItem('currency')).toBe('usd');
      expect(document.documentElement.lang).toBe('en');
      expect(document.documentElement.dir).toBe('ltr');
    });

    it('prefers appLang/appCurrency over ISO codes when both provided', async () => {
      window.__localeAuto = {
        langWasMissing: true,
        currencyWasMissing: true,
      };

      const fetchMock = mockFetchResponse({
        ok: true,
        lang: 'en',
        currency: 'USD',
        appLang: 'heb', // Explicit app key takes precedence
        appCurrency: 'ils',
      });
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      expect(localStorage.getItem('language')).toBe('heb');
      expect(localStorage.getItem('currency')).toBe('ils');
    });

    it('handles response with only language data', async () => {
      window.__localeAuto = {
        langWasMissing: true,
        currencyWasMissing: true,
      };

      const fetchMock = mockFetchResponse({
        ok: true,
        appLang: 'heb',
        // No currency data
      });
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      expect(localStorage.getItem('language')).toBe('heb');
      // Currency should still update with fallback from mapIsoToApp
      expect(localStorage.getItem('currency')).toBeTruthy();
    });
  });

  describe('AbortController signal propagation', () => {
    it('includes abort signal in fetch options', async () => {
      window.__localeAuto = {
        langWasMissing: true,
        currencyWasMissing: true,
      };

      const fetchMock = vi.fn((url, options) => {
        // Verify signal is present
        expect(options.signal).toBeInstanceOf(AbortSignal);
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ok: true,
              appLang: 'eng',
              appCurrency: 'usd',
            }),
        });
      });
      global.fetch = fetchMock;

      await hydrateLocaleFromBackend();

      expect(fetchMock).toHaveBeenCalled();
    });
  });
});
