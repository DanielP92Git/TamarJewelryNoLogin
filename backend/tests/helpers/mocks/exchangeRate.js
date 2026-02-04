/**
 * Exchange rate API mock patterns.
 * Mocks both primary (exchangerate-api.com) and fallback (exchangerate.host) APIs.
 */
import nock from 'nock';

const PRIMARY_API = 'https://api.exchangerate-api.com';
const FALLBACK_API = 'https://api.exchangerate.host';

/**
 * Mock primary exchange rate API with configurable rate.
 * @param {number} ilsRate - USD to ILS exchange rate
 */
export function mockExchangeRateAPI(ilsRate = 3.70) {
  return nock(PRIMARY_API)
    .get('/v4/latest/USD')
    .reply(200, {
      base: 'USD',
      date: new Date().toISOString().split('T')[0],
      rates: {
        ILS: ilsRate,
        EUR: 0.92,
        GBP: 0.79
      }
    });
}

/**
 * Mock fallback exchange rate API.
 * @param {number} ilsRate - USD to ILS exchange rate
 */
export function mockExchangeRateFallback(ilsRate = 3.70) {
  return nock(FALLBACK_API)
    .get('/latest')
    .query({ base: 'USD', symbols: 'ILS' })
    .reply(200, {
      base: 'USD',
      date: new Date().toISOString().split('T')[0],
      rates: {
        ILS: ilsRate
      }
    });
}

/**
 * Mock exchange rate API error (both APIs fail).
 */
export function mockExchangeRateError() {
  nock(PRIMARY_API)
    .get('/v4/latest/USD')
    .reply(500, { error: 'Service unavailable' });

  return nock(FALLBACK_API)
    .get('/latest')
    .query({ base: 'USD', symbols: 'ILS' })
    .reply(500, { error: 'Service unavailable' });
}

/**
 * Mock exchange rate API with network timeout.
 */
export function mockExchangeRateTimeout() {
  return nock(PRIMARY_API)
    .get('/v4/latest/USD')
    .delay(30000) // 30 second delay (longer than typical timeout)
    .reply(200, {});
}
