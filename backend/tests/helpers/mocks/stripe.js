/**
 * Stripe API mock patterns.
 * Mocks Stripe API endpoints for payment intents and webhooks.
 */
import nock from 'nock';

const STRIPE_API_URL = 'https://api.stripe.com';

/**
 * Mock Stripe create payment intent endpoint.
 * @param {Object} options - Payment intent options
 */
export function mockStripePaymentIntent({
  id = 'pi_test_123',
  clientSecret = 'pi_test_123_secret_abc',
  status = 'requires_payment_method',
  amount = 10000,
  currency = 'usd'
} = {}) {
  return nock(STRIPE_API_URL)
    .post('/v1/payment_intents')
    .reply(200, {
      id,
      object: 'payment_intent',
      amount,
      currency,
      status,
      client_secret: clientSecret
    });
}

/**
 * Mock Stripe confirm payment intent.
 * @param {string} paymentIntentId - The payment intent ID
 */
export function mockStripeConfirmPayment(paymentIntentId = 'pi_test_123') {
  return nock(STRIPE_API_URL)
    .post(`/v1/payment_intents/${paymentIntentId}/confirm`)
    .reply(200, {
      id: paymentIntentId,
      object: 'payment_intent',
      status: 'succeeded'
    });
}

/**
 * Mock Stripe retrieve payment intent.
 * @param {string} paymentIntentId - The payment intent ID
 * @param {string} status - Payment status
 */
export function mockStripeRetrievePayment(paymentIntentId = 'pi_test_123', status = 'succeeded') {
  return nock(STRIPE_API_URL)
    .get(`/v1/payment_intents/${paymentIntentId}`)
    .reply(200, {
      id: paymentIntentId,
      object: 'payment_intent',
      status
    });
}

/**
 * Mock Stripe error response.
 * @param {string} errorType - Stripe error type
 * @param {string} errorCode - Stripe error code
 */
export function mockStripeError(errorType = 'card_error', errorCode = 'card_declined') {
  return nock(STRIPE_API_URL)
    .post('/v1/payment_intents')
    .reply(400, {
      error: {
        type: errorType,
        code: errorCode,
        message: 'Your card was declined.'
      }
    });
}

/**
 * Create a mock Stripe webhook event payload.
 * Note: This doesn't mock HTTP - it returns event data for testing webhook handlers.
 * @param {string} type - Event type (e.g., 'payment_intent.succeeded')
 * @param {Object} data - Event data object
 */
export function createStripeWebhookEvent(type, data) {
  return {
    id: 'evt_test_123',
    object: 'event',
    type,
    data: { object: data },
    created: Math.floor(Date.now() / 1000)
  };
}
