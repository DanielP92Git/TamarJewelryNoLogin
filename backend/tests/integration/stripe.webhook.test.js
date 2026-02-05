/**
 * Integration tests for Stripe webhook endpoint (/webhook).
 *
 * Tests signature validation and event processing for Stripe webhooks.
 * Stripe requires HMAC-SHA256 signature verification for webhook security.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { validateTestEnvironment } from '../helpers/envGuard.js';
import { disableNetConnect, cleanAllMocks } from '../helpers/mocks/index.js';

let app;
const TEST_WEBHOOK_SECRET = 'whsec_test_secret_123';

/**
 * Generate a valid Stripe webhook signature.
 * Stripe signature format: t=timestamp,v1=signature
 * where signature = HMAC-SHA256(timestamp.payload, secret)
 *
 * @param {string} payload - JSON payload
 * @param {string} secret - Webhook secret
 * @param {number} timestamp - Unix timestamp (optional, defaults to now)
 * @returns {string} Stripe signature header value
 */
function generateStripeSignature(payload, secret, timestamp = null) {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return `t=${ts},v1=${signature}`;
}

beforeAll(async () => {
  validateTestEnvironment();
  disableNetConnect();

  // Set webhook secret for tests
  process.env.WEBHOOK_SEC = TEST_WEBHOOK_SECRET;

  const appModule = await import('../../index.js');
  app = appModule.app;
});

afterAll(() => {
  delete process.env.WEBHOOK_SEC;
});

beforeEach(() => {
  cleanAllMocks();
});

describe('POST /webhook - Signature Validation', () => {
  it('should return 400 for missing stripe-signature header', async () => {
    const payload = JSON.stringify({
      id: 'evt_test_123',
      type: 'checkout.session.completed'
    });

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(response.status).toBe(400);
    expect(response.text).toContain('Missing webhook signature or payload');
  });

  it('should return 400 for missing payload', async () => {
    const signature = generateStripeSignature('', TEST_WEBHOOK_SECRET);

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send('');

    expect(response.status).toBe(400);
  });

  it('should return 400 for invalid signature', async () => {
    const payload = JSON.stringify({
      id: 'evt_test_123',
      type: 'checkout.session.completed'
    });

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=123456789,v1=invalid_signature_abc123')
      .send(payload);

    expect(response.status).toBe(400);
  });

  it('should return 400 for tampered payload', async () => {
    const originalPayload = JSON.stringify({
      id: 'evt_test_123',
      type: 'checkout.session.completed',
      data: { amount: 1000 }
    });
    const tamperedPayload = JSON.stringify({
      id: 'evt_test_123',
      type: 'checkout.session.completed',
      data: { amount: 9999 } // Tampered amount
    });

    // Generate signature for original payload
    const signature = generateStripeSignature(originalPayload, TEST_WEBHOOK_SECRET);

    // Send tampered payload with original signature
    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send(tamperedPayload);

    expect(response.status).toBe(400);
  });

  it('should return 400 for wrong webhook secret', async () => {
    const payload = JSON.stringify({
      id: 'evt_test_123',
      type: 'checkout.session.completed'
    });

    // Generate signature with wrong secret
    const wrongSecret = 'whsec_wrong_secret_456';
    const signature = generateStripeSignature(payload, wrongSecret);

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send(payload);

    expect(response.status).toBe(400);
  });
});

describe('POST /webhook - Event Processing', () => {
  it('should return 200 with {received: true} for valid webhook', async () => {
    const checkoutCompleteEvent = {
      id: 'evt_test_123',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          object: 'checkout.session',
          payment_status: 'paid',
          metadata: {
            productId: '1'
          }
        }
      },
      created: Math.floor(Date.now() / 1000)
    };

    const payload = JSON.stringify(checkoutCompleteEvent);
    const signature = generateStripeSignature(payload, TEST_WEBHOOK_SECRET);

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
  });

  it('should process checkout.session.completed event', async () => {
    const checkoutCompleteEvent = {
      id: 'evt_test_456',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_456',
          object: 'checkout.session',
          payment_status: 'paid',
          amount_total: 5000,
          currency: 'usd',
          metadata: {
            productId: '42'
          }
        }
      },
      created: Math.floor(Date.now() / 1000)
    };

    const payload = JSON.stringify(checkoutCompleteEvent);
    const signature = generateStripeSignature(payload, TEST_WEBHOOK_SECRET);

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
  });

  it('should ignore unhandled event types', async () => {
    const paymentIntentEvent = {
      id: 'evt_test_789',
      object: 'event',
      type: 'payment_intent.created',
      data: {
        object: {
          id: 'pi_test_789',
          object: 'payment_intent',
          amount: 2000,
          currency: 'usd'
        }
      },
      created: Math.floor(Date.now() / 1000)
    };

    const payload = JSON.stringify(paymentIntentEvent);
    const signature = generateStripeSignature(payload, TEST_WEBHOOK_SECRET);

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
  });

  it('should handle charge.succeeded event', async () => {
    const chargeSucceededEvent = {
      id: 'evt_test_charge',
      object: 'event',
      type: 'charge.succeeded',
      data: {
        object: {
          id: 'ch_test_123',
          object: 'charge',
          amount: 3000,
          currency: 'usd',
          status: 'succeeded'
        }
      },
      created: Math.floor(Date.now() / 1000)
    };

    const payload = JSON.stringify(chargeSucceededEvent);
    const signature = generateStripeSignature(payload, TEST_WEBHOOK_SECRET);

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
  });
});

describe('POST /webhook - Edge Cases', () => {
  it('should handle expired timestamp in signature', async () => {
    const event = {
      id: 'evt_test_old',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_old',
          payment_status: 'paid'
        }
      },
      created: Math.floor(Date.now() / 1000)
    };

    const payload = JSON.stringify(event);
    // Timestamp from 10 minutes ago (600 seconds)
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
    const signature = generateStripeSignature(payload, TEST_WEBHOOK_SECRET, oldTimestamp);

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send(payload);

    // Stripe tolerates timestamps within 5 minutes by default
    // Timestamp 10 minutes old should fail verification
    expect(response.status).toBe(400);
  });

  it('should handle malformed JSON payload', async () => {
    const malformedPayload = '{ "id": "evt_test", "type": "checkout.session.completed", invalid json }';
    const signature = generateStripeSignature(malformedPayload, TEST_WEBHOOK_SECRET);

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send(malformedPayload);

    // Signature might be valid, but constructEvent should fail parsing
    expect(response.status).toBe(400);
  });

  it('should handle missing event.type field', async () => {
    const eventWithoutType = {
      id: 'evt_test_no_type',
      object: 'event',
      // Missing 'type' field
      data: {
        object: {
          id: 'cs_test',
          payment_status: 'paid'
        }
      },
      created: Math.floor(Date.now() / 1000)
    };

    const payload = JSON.stringify(eventWithoutType);
    const signature = generateStripeSignature(payload, TEST_WEBHOOK_SECRET);

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send(payload);

    // Should still return 200 as webhook was valid, just event type wasn't handled
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
  });

  it('should handle empty event data object', async () => {
    const emptyDataEvent = {
      id: 'evt_test_empty',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {} // Empty object
      },
      created: Math.floor(Date.now() / 1000)
    };

    const payload = JSON.stringify(emptyDataEvent);
    const signature = generateStripeSignature(payload, TEST_WEBHOOK_SECRET);

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
  });

  it('should handle signature with multiple versions', async () => {
    const event = {
      id: 'evt_test_multi',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test',
          payment_status: 'paid'
        }
      },
      created: Math.floor(Date.now() / 1000)
    };

    const payload = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payload}`;
    const signature1 = crypto.createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');
    const signature2 = crypto.createHmac('sha256', TEST_WEBHOOK_SECRET + '_v2')
      .update(signedPayload)
      .digest('hex');

    // Stripe format allows multiple signature versions: t=timestamp,v1=sig1,v0=sig2
    const multiVersionSignature = `t=${timestamp},v1=${signature1},v0=${signature2}`;

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', multiVersionSignature)
      .send(payload);

    // Should succeed if any version matches
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
  });
});
