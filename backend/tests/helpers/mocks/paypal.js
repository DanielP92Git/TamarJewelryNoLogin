/**
 * PayPal API mock patterns.
 * Mocks PayPal REST API endpoints used for order creation and capture.
 */
import nock from 'nock';

const PAYPAL_SANDBOX_URL = 'https://api-m.sandbox.paypal.com';

/**
 * Mock PayPal OAuth token endpoint.
 * PayPal requires token before any API call.
 */
export function mockPayPalAuth(accessToken = 'test-access-token') {
  return nock(PAYPAL_SANDBOX_URL)
    .post('/v1/oauth2/token')
    .reply(200, {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 32400
    });
}

/**
 * Mock PayPal create order endpoint.
 * @param {string} orderId - The order ID to return
 * @param {string} status - Order status (CREATED, APPROVED, etc.)
 */
export function mockPayPalCreateOrder(orderId = 'PAYPAL-ORDER-123', status = 'CREATED') {
  return nock(PAYPAL_SANDBOX_URL)
    .post('/v2/checkout/orders')
    .reply(201, {
      id: orderId,
      status: status,
      links: [
        { rel: 'approve', href: `https://sandbox.paypal.com/checkoutnow?token=${orderId}` },
        { rel: 'capture', href: `${PAYPAL_SANDBOX_URL}/v2/checkout/orders/${orderId}/capture` }
      ]
    });
}

/**
 * Mock PayPal capture order endpoint.
 * @param {string} orderId - The order ID being captured
 */
export function mockPayPalCaptureOrder(orderId = 'PAYPAL-ORDER-123') {
  return nock(PAYPAL_SANDBOX_URL)
    .post(`/v2/checkout/orders/${orderId}/capture`)
    .reply(200, {
      id: orderId,
      status: 'COMPLETED',
      purchase_units: [{
        payments: {
          captures: [{
            id: 'CAPTURE-123',
            status: 'COMPLETED',
            amount: { value: '100.00', currency_code: 'USD' }
          }]
        }
      }]
    });
}

/**
 * Mock PayPal error response.
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - PayPal error code
 */
export function mockPayPalError(statusCode = 400, errorCode = 'INVALID_REQUEST') {
  return nock(PAYPAL_SANDBOX_URL)
    .post(/\/v2\/checkout\/orders/)
    .reply(statusCode, {
      name: errorCode,
      message: 'Test error message',
      debug_id: 'debug-123'
    });
}
