const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { Product } = require('../models');
const { detectLanguage } = require('../middleware/language');

const isProd = process.env.NODE_ENV === 'production';

const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15m
  limit: Number(process.env.RATE_LIMIT_PAYMENT_MAX || 60),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
});

// =============================================
// Stripe Setup
// =============================================
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function handleCheckoutSession(session) {
  const productIdRaw = session?.metadata?.productId;
  const productId = Number(productIdRaw);
  if (!Number.isFinite(productId)) {
    console.error('Webhook missing/invalid productId:', productIdRaw);
    return;
  }

  // Atomic decrement to prevent negative inventory and race conditions
  const updated = await Product.findOneAndUpdate(
    { id: productId, quantity: { $gt: 0 } },
    { $inc: { quantity: -1 } },
    { new: true }
  );

  if (!updated) {
    console.warn(
      `No inventory update applied for product ${productId} (missing or out of stock)`
    );
    return;
  }

  if (!isProd) console.log(
    `Product ${productId} quantity reduced. New quantity: ${updated.quantity}`
  );

  // IMPORTANT:
  // Do not delete products when inventory reaches 0.
  // Out-of-stock items should be temporarily hidden from the storefront but remain editable/restockable in admin.
  if (updated.quantity === 0) {
    if (!isProd) console.log(
      `Product ${productId} is now out of stock (quantity=0). It will be hidden from storefront listings.`
    );
  }
}

// =============================================
// PayPal Setup
// =============================================
const PAYPAL_CLIENT_ID = (process.env.PAYPAL_CLIENT_ID || '').trim();
const PAYPAL_CLIENT_SECRET = (process.env.PAYPAL_CLIENT_SECRET || '').trim();
const baseUrl = (
  process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com'
)
  .trim()
  .replace(/\/+$/, '');

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handleResponse(response) {
  const text = await response.text();
  let jsonResponse;
  try {
    jsonResponse = text ? JSON.parse(text) : null;
  } catch {
    jsonResponse = null;
  }

  if (!response.ok) {
    const debugId = jsonResponse?.debug_id || null;
    const details = Array.isArray(jsonResponse?.details)
      ? jsonResponse.details.map(d => ({
          issue: d?.issue || null,
          description: d?.description || null,
        }))
      : null;

    // Log a compact, safe summary even in prod so we can diagnose 4xx like 422.
    console.error('PayPal API error:', {
      httpStatusCode: response.status,
      debugId,
      firstIssue: details?.[0]?.issue || null,
    });

    if (!isProd) {
      console.error(
        'PayPal API error full body:',
        response.status,
        jsonResponse || text
      );
    }
    const err = new Error('PAYPAL_API_ERROR');
    err.code = 'PAYPAL_API_ERROR';
    // Map PayPal 4xx to client errors; PayPal 5xx to a 502.
    err.statusCode = response.status >= 500 ? 502 : response.status;
    err.httpStatusCode = response.status;
    err.paypalDebugId = debugId;
    err.paypalDetails = details;
    throw err;
  }

  return {
    jsonResponse: jsonResponse ?? {},
    httpStatusCode: response.status,
  };
}

const generateAccessToken = async () => {
  try {
    if (!isProd) {
      console.log('========= PAYPAL AUTH DEBUG =========');
      console.log(
        'Client ID length:',
        PAYPAL_CLIENT_ID ? PAYPAL_CLIENT_ID.length : 'missing'
      );
      console.log(
        'Client Secret length:',
        PAYPAL_CLIENT_SECRET ? PAYPAL_CLIENT_SECRET.length : 'missing'
      );
      console.log('Base URL:', baseUrl);
    }

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      if (!isProd) {
        console.error('Missing PayPal credentials:', {
          clientIdExists: !!PAYPAL_CLIENT_ID,
          clientSecretExists: !!PAYPAL_CLIENT_SECRET,
        });
      }
      const err = new Error('PAYPAL_MISSING_CREDENTIALS');
      err.code = 'PAYPAL_MISSING_CREDENTIALS';
      err.statusCode = 500;
      throw err;
    }

    const auth = Buffer.from(
      `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
    ).toString('base64');
    if (!isProd) {
      console.log('Auth token generated. Requesting PayPal access token...');
    }

    const tokenUrl = `${baseUrl}/v1/oauth2/token`;
    if (!isProd) console.log('Token URL:', tokenUrl);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!isProd) console.log('PayPal token response status:', response.status);

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      if (!isProd) {
        console.error(
          'PayPal token request failed:',
          response.status,
          data || text
        );
      }
      const err = new Error('PAYPAL_TOKEN_REQUEST_FAILED');
      err.code = 'PAYPAL_TOKEN_REQUEST_FAILED';
      err.statusCode = 502;
      err.httpStatusCode = response.status;
      throw err;
    }

    if (!data || !data.access_token) {
      if (!isProd) console.error('No access_token received from PayPal:', data);
      const err = new Error('PAYPAL_TOKEN_RESPONSE_INVALID');
      err.code = 'PAYPAL_TOKEN_RESPONSE_INVALID';
      err.statusCode = 502;
      throw err;
    }

    if (!isProd) console.log('PayPal access token obtained successfully');
    return data.access_token;
  } catch (error) {
    if (!isProd) console.error('Failed to generate Access Token:', error);
    throw error;
  }
};

const createOrder = async (cart, lang = 'en') => {
  try {
    if (!isProd) {
      console.log(
        'shopping cart information passed from the frontend createOrder() callback:',
        cart
      );
    }

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      throw new Error('Invalid cart data received');
    }

    // Use integer cents to avoid floating point mismatches between item totals and order total.
    const totalCents = cart.reduce((total, item) => {
      const unit = Number(item?.unit_amount?.value);
      const qty = Number.parseInt(item?.quantity, 10);
      if (!Number.isFinite(unit) || !Number.isFinite(qty) || qty <= 0) {
        throw new Error('Invalid item amount or quantity');
      }
      const cents = Math.round(unit * 100);
      return total + cents * qty;
    }, 0);
    const totalAmount = (totalCents / 100).toFixed(2);
    const currencyData = cart[0].unit_amount.currency_code;

    // Guardrail: PayPal orders must use a single currency.
    const currencies = new Set(
      cart.map(item => item?.unit_amount?.currency_code).filter(Boolean)
    );
    if (currencies.size > 1) {
      const err = new Error('Mixed currencies in cart are not supported');
      err.code = 'MIXED_CURRENCY_CART';
      err.statusCode = 400;
      throw err;
    }
    if (currencies.size === 1 && !currencies.has(currencyData)) {
      const err = new Error('Invalid cart currency');
      err.code = 'INVALID_CART_CURRENCY';
      err.statusCode = 400;
      throw err;
    }

    const accessToken = await generateAccessToken();
    if (!isProd) console.log('PayPal access token received: Success');

    const url = `${baseUrl}/v2/checkout/orders`;
    if (!isProd) console.log('PayPal API URL:', url);

    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currencyData,
            value: totalAmount,
            breakdown: {
              item_total: {
                currency_code: currencyData,
                value: totalAmount,
              },
            },
          },
          items: cart.map(item => {
            const rawValue = Number(item.unit_amount.value);
            const centsValue = Math.round(rawValue * 100);
            const roundedValue = (centsValue / 100).toFixed(2);

            return {
              name: item.name,
              unit_amount: {
                currency_code: item.unit_amount.currency_code,
                value: roundedValue,
              },
              quantity: String(Number.parseInt(item.quantity, 10)),
            };
          }),
        },
      ],
      application_context: {
        return_url: `${process.env.API_URL}/${lang}/?success=true`,
        cancel_url: `${process.env.API_URL}/${lang}/cart`,
        user_action: 'PAY_NOW',
        brand_name: 'Tamar Kfir Jewelry',
      },
    };

    if (!isProd)
      console.log('PayPal order payload:', JSON.stringify(payload, null, 2));

    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'POST',
        body: JSON.stringify(payload),
      },
      20000
    );

    return handleResponse(response);
  } catch (error) {
    if (error?.name === 'AbortError') {
      const err = new Error('PayPal request timed out');
      err.code = 'PAYPAL_TIMEOUT';
      err.statusCode = 504;
      throw err;
    }
    if (!isProd) console.error('Error creating PayPal order:', error);
    throw error;
  }
};

const captureOrder = async orderID => {
  try {
    const accessToken = await generateAccessToken();
    const url = `${baseUrl}/v2/checkout/orders/${orderID}/capture`;
    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      },
      20000
    );
    return handleResponse(response);
  } catch (error) {
    if (error?.name === 'AbortError') {
      const err = new Error('PayPal request timed out');
      err.code = 'PAYPAL_TIMEOUT';
      err.statusCode = 504;
      throw err;
    }
    throw error;
  }
};

// =============================================
// Route Handlers
// =============================================

// Stripe webhook
router.post('/webhook', (request, response) => {
  const sig = request.headers['stripe-signature'];
  const payload = request.rawBody;
  let event;

  try {
    if (!sig || !payload) {
      return response.status(400).send('Missing webhook signature or payload');
    }
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      `${process.env.WEBHOOK_SEC}`
    );
  } catch (err) {
    console.warn(
      `Stripe webhook signature verification failed: ${err?.message || err}`
    );
    return response.sendStatus(400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (process.env.NODE_ENV !== 'production') {
      console.log('2. From webhook:', session.metadata?.productId);
    }
    void handleCheckoutSession(session).catch(err => {
      console.error(
        `Error handling checkout.session.completed (session=${session?.id}, product=${session?.metadata?.productId}):`,
        err
      );
    });
  }

  response.json({ received: true });
});

// Stripe checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) {
      return res.status(400).json({ error: 'Missing items' });
    }

    const firstItem = items[0];
    const requestedProductId = Number(firstItem?.id);
    if (!Number.isFinite(requestedProductId)) {
      return res.status(400).json({ error: 'Invalid product id' });
    }

    const product = await Product.findOne({ id: requestedProductId });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!product.quantity || product.quantity <= 0) {
      return res.status(400).json({ error: 'Product is out of stock' });
    }

    const reqCurrency = req.body.currency;
    const stripeCurrency = reqCurrency === 'ils' ? 'ils' : 'usd';
    const currencySymbol = stripeCurrency === 'ils' ? '₪' : '$';

    if (!isProd) {
      console.log('=== Stripe Checkout Debug ===');
      console.log('Request currency:', reqCurrency, '→ Stripe currency:', stripeCurrency);
      console.log('Cart items received:', JSON.stringify(items, null, 2));
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: await Promise.all(
        items.map(async item => {
          const dbProduct = await Product.findOne({ id: item.id });
          if (!dbProduct) {
            throw new Error(`Product ${item.id} not found in database`);
          }

          let itemPrice;
          if (stripeCurrency === 'ils') {
            itemPrice = Math.round(Number(dbProduct.ils_price) || 0);
            if (!itemPrice || itemPrice <= 0) {
              throw new Error(
                `Product ${item.id} does not have a valid ILS price`
              );
            }
          } else {
            itemPrice = Math.round(Number(dbProduct.usd_price) || 0);
          }

          if (!isProd) {
            console.log(`\nProcessing item ${item.id} (${item.title}):`);
            console.log(`  - DB ${stripeCurrency.toUpperCase()} price: ${currencySymbol}${itemPrice}`);
            console.log('  - discount_percentage:', dbProduct.discount_percentage);
          }

          if (
            !Number.isFinite(itemPrice) ||
            itemPrice <= 0 ||
            itemPrice > 1000000
          ) {
            const errorMsg = `Invalid ${stripeCurrency.toUpperCase()} price for item ${item.id}: ${itemPrice}`;
            console.error('Price validation failed:', errorMsg);
            throw new Error(errorMsg);
          }

          const inSmallestUnit = Math.round(itemPrice * 100);

          if (!isProd) {
            console.log(`  - Price: ${currencySymbol}${itemPrice}`);
            console.log(`  - Smallest unit: ${inSmallestUnit} for quantity ${item.amount}`);
          }

          return {
            price_data: {
              currency: stripeCurrency,
              product_data: {
                name: item.title,
              },
              unit_amount: inSmallestUnit,
            },
            quantity: item.amount,
          };
        })
      ),
      shipping_address_collection: {
        allowed_countries: ['US', 'IL'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: stripeCurrency === 'ils' ? 5500 : 1500,
              currency: stripeCurrency,
            },
            display_name: 'Standard Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'week',
                value: 2,
              },
              maximum: {
                unit: 'week',
                value: 4,
              },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: stripeCurrency === 'ils' ? 7500 : 2000,
              currency: stripeCurrency,
            },
            display_name: 'Expedited Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 10,
              },
              maximum: {
                unit: 'business_day',
                value: 12,
              },
            },
          },
        },
      ],
      success_url: `${req.protocol}://${req.get('host')}/${detectLanguage(req)}/?success=true`,
      cancel_url: `${req.protocol}://${req.get('host')}/${detectLanguage(req)}/cart`,
      metadata: {
        productId: requestedProductId.toString(),
        currency: stripeCurrency,
      },
    });

    if (!isProd) {
      console.log('\n=== Stripe Session Created ===');
      console.log('Session ID:', session.id);
      console.log('Currency:', session.currency);
      console.log(
        `Amount total: ${(session.amount_total || 0)} (${currencySymbol}${((session.amount_total || 0) / 100).toFixed(2)})`
      );
    }

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// PayPal create order
router.post('/orders', paymentRateLimiter, async (req, res) => {
  try {
    const { cart } = req.body;
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res
        .status(400)
        .json({ error: 'Invalid cart data. Cart must be a non-empty array.' });
    }

    if (!isProd) {
      console.log(
        'Creating PayPal order with cart:',
        JSON.stringify(cart, null, 2)
      );
    }

    const lang = detectLanguage(req);
    const result = await createOrder(cart, lang);
    if (!isProd)
      console.log('PayPal order creation successful:', result.httpStatusCode);
    res.status(result.httpStatusCode).json(result.jsonResponse);
  } catch (error) {
    if (!isProd) {
      console.error(
        'Failed to create PayPal order:',
        error?.code || error?.message || error
      );
    } else {
      console.error('Failed to create PayPal order:', {
        code: error?.code || null,
        statusCode: error?.statusCode || null,
        httpStatusCode: error?.httpStatusCode || null,
      });
    }
    const status =
      error?.statusCode && Number.isInteger(error.statusCode)
        ? error.statusCode
        : 500;
    res.status(status).json({
      error: 'Failed to create order.',
      code: error?.code || 'ORDER_CREATE_FAILED',
      ...(error?.paypalDebugId ? { paypalDebugId: error.paypalDebugId } : {}),
      ...(error?.paypalDetails ? { paypalDetails: error.paypalDetails } : {}),
      ...(isProd
        ? {}
        : { message: error?.message }),
    });
  }
});

// PayPal capture order
router.post('/orders/:orderID/capture', paymentRateLimiter, async (req, res) => {
  try {
    const { orderID } = req.params;
    const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    if (!isProd) {
      console.error('Failed to capture PayPal order:', error);
    } else {
      console.error('Failed to capture PayPal order:', {
        code: error?.code || null,
        statusCode: error?.statusCode || null,
        httpStatusCode: error?.httpStatusCode || null,
      });
    }
    const status =
      error?.statusCode && Number.isInteger(error.statusCode)
        ? error.statusCode
        : 500;
    res.status(status).json({
      error: 'Failed to capture order.',
      code: error?.code || 'ORDER_CAPTURE_FAILED',
      ...(isProd ? {} : { message: error?.message }),
    });
  }
});

module.exports = router;
