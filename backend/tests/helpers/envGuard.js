/**
 * Environment Guard for Test Safety
 *
 * Prevents tests from accidentally running with production credentials.
 * Validates environment variables before any tests execute to ensure:
 * - No production MongoDB connections (Atlas, cloud hosts)
 * - No live PayPal credentials (non-sandbox)
 * - No live Stripe credentials (sk_live_*)
 *
 * If production credentials are detected, tests abort with clear error messages.
 */

/**
 * Check if MongoDB URL points to production database
 *
 * @param {string} url - MongoDB connection string
 * @returns {boolean} true if production URL detected
 *
 * Production indicators:
 * - mongodb+srv:// (Atlas)
 * - mongodb.net (Atlas domain)
 * - cloud.mongodb.com (cloud hosting)
 *
 * Safe (test) indicators:
 * - localhost or 127.0.0.1 (local/memory server)
 * - undefined/empty (will use memory server)
 */
export function isProductionMongoUrl(url) {
  if (!url || url.trim() === '') {
    return false; // Empty = will use memory server
  }

  const urlLower = url.toLowerCase();

  // Atlas URLs
  if (urlLower.includes('mongodb.net')) return true;
  if (urlLower.includes('mongodb+srv://')) return true;
  if (urlLower.includes('cloud.mongodb.com')) return true;

  // Allow localhost and 127.0.0.1 (memory server)
  if (urlLower.includes('localhost')) return false;
  if (urlLower.includes('127.0.0.1')) return false;

  // If URL contains any domain other than localhost/127.0.0.1, consider it production
  // Match pattern like mongodb://some.host.com or mongodb://192.168.x.x
  const hasDomain = /mongodb:\/\/[^\/]+\./i.test(url);
  if (hasDomain) return true;

  return false;
}

/**
 * Check if PayPal credentials are for live environment
 *
 * @param {string} clientId - PayPal client ID
 * @param {string} baseUrl - PayPal API base URL
 * @returns {boolean} true if live credentials detected
 *
 * Production indicators:
 * - baseUrl contains 'api-m.paypal.com' (not sandbox)
 * - clientId exists with non-sandbox URL
 *
 * Safe (test) indicators:
 * - Empty clientId (mocking in use)
 * - Sandbox URL: api-m.sandbox.paypal.com
 */
export function isProductionPayPal(clientId, baseUrl) {
  // No credentials = safe (will use mocking)
  if (!clientId || clientId.trim() === '') {
    return false;
  }

  if (!baseUrl || baseUrl.trim() === '') {
    return false; // No URL = no API calls
  }

  const urlLower = baseUrl.toLowerCase();

  // Live PayPal API
  if (urlLower.includes('api-m.paypal.com') && !urlLower.includes('sandbox')) {
    return true;
  }

  return false;
}

/**
 * Check if Stripe secret key is for live environment
 *
 * @param {string} secretKey - Stripe secret key
 * @returns {boolean} true if live key detected
 *
 * Production indicators:
 * - Key starts with 'sk_live_'
 *
 * Safe (test) indicators:
 * - Key starts with 'sk_test_' (test mode)
 * - Empty/undefined key (mocking in use)
 *
 * How to fix:
 * - Use test key from Stripe dashboard: sk_test_...
 * - Or remove key entirely to use mocking
 */
export function isProductionStripe(secretKey) {
  if (!secretKey || secretKey.trim() === '') {
    return false; // Empty = will use mocking
  }

  // Live Stripe keys start with sk_live_
  if (secretKey.startsWith('sk_live_')) {
    return true;
  }

  return false;
}

/**
 * Validate test environment before any tests run
 *
 * Checks all critical environment variables for production credentials.
 * Throws error with detailed instructions if any production credentials found.
 *
 * @throws {Error} if production credentials detected
 *
 * Usage:
 * Import and call at top of test setup file (setup.js) to validate
 * environment before mongodb-memory-server starts and before any tests run.
 */
export function validateTestEnvironment() {
  const errors = [];

  // Check MongoDB
  const mongoUrl = process.env.MONGO_URL;
  if (isProductionMongoUrl(mongoUrl)) {
    errors.push(
      `PRODUCTION MONGODB DETECTED: ${mongoUrl}\n` +
      '  → Tests must use mongodb-memory-server (127.0.0.1)\n' +
      '  → Remove MONGO_URL env var or set to localhost URL'
    );
  }

  // Check PayPal
  const paypalClientId = process.env.PAYPAL_CLIENT_ID;
  const paypalBaseUrl = process.env.PAYPAL_BASE_URL;
  if (isProductionPayPal(paypalClientId, paypalBaseUrl)) {
    errors.push(
      `LIVE PAYPAL CREDENTIALS DETECTED: ${paypalBaseUrl}\n` +
      '  → Tests must use sandbox (api-m.sandbox.paypal.com) or mocking\n' +
      '  → Remove PAYPAL_CLIENT_ID or set PAYPAL_BASE_URL to sandbox'
    );
  }

  // Check Stripe
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (isProductionStripe(stripeKey)) {
    errors.push(
      `LIVE STRIPE KEY DETECTED: ${stripeKey.substring(0, 12)}...\n` +
      '  → Tests must use test key (sk_test_...) or mocking\n' +
      '  → Remove STRIPE_SECRET_KEY or use test key from Stripe dashboard'
    );
  }

  // If any production credentials found, abort immediately
  if (errors.length > 0) {
    throw new Error(
      '\n' +
      '╔════════════════════════════════════════════════════════════╗\n' +
      '║  PRODUCTION CREDENTIALS DETECTED IN TEST ENVIRONMENT       ║\n' +
      '╚════════════════════════════════════════════════════════════╝\n\n' +
      errors.join('\n\n') +
      '\n\n' +
      '⚠️  Tests ABORTED to prevent production contamination.\n' +
      '💡 Fix: Unset production env vars before running tests.\n'
    );
  }
}
