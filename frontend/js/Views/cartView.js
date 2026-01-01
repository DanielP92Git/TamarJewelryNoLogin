import View from '../View.js';
import * as model from '../model.js';
import deleteSvg from '../../imgs/svgs/x-solid.svg';
require('dotenv').config();

class CartView extends View {
  _parentElement = document.querySelector('.cart-items-container');
  _cartEmpty = document.querySelector('.cart-empty');
  _cartTitle = document.querySelector('.cart-title');
  _summaryTitle = document.querySelector('.summary-title');
  _itemsBox = document.querySelector('.added-items');
  _summaryDetails = document.querySelector('.summary-details');
  _checkoutBtn = document.querySelector('#stripe-checkout-btn');
  _deleteAllBtn = document.querySelector('.delete-all');
  _checkMeOut = document.querySelector('.check-me-out');
  _orderSummaryContainer = document.querySelector('.summary');
  _host = process.env.API_URL;
  _rate = process.env.USD_ILS_RATE || 3.7;

  // Get current selected currency
  _getCurrentCurrency() {
    const saved = localStorage.getItem('currency') || 'usd';
    return saved === 'ils' ? 'ils' : 'usd';
  }

  // Get price for cart item based on current currency (uses stored prices)
  _getItemPrice(item, useOriginal = false) {
    const currency = this._getCurrentCurrency();
    if (currency === 'usd') {
      return useOriginal
        ? Math.round(
            item.originalUsdPrice ||
              item.originalPrice ||
              item.usdPrice ||
              item.price ||
              0
          )
        : Math.round(item.usdPrice || item.price || 0);
    } else {
      return useOriginal
        ? Math.round(
            item.originalIlsPrice ||
              item.originalPrice ||
              item.ilsPrice ||
              item.price ||
              0
          )
        : Math.round(item.ilsPrice || item.price || 0);
    }
  }

  // Get currency symbol based on current selection
  _getCurrencySymbol() {
    return this._getCurrentCurrency() === 'usd' ? '$' : '₪';
  }

  addCartViewHandler(handler) {
    window.addEventListener('load', () => {
      let lng = localStorage.getItem('language');
      if (!lng) {
        localStorage.setItem('language', 'eng');
        lng = 'eng';
      }

      handler(lng);
    });

    // Listen for currency changes and re-render cart
    if (!this._currencyListenerAdded) {
      this._currencyListenerAdded = true;
      window.addEventListener('currency-changed', async e => {
        const next = e?.detail?.currency;
        if (next !== 'usd' && next !== 'ils') return;

        try {
          // Re-render cart with new currency
          const cartNum = await model.checkCartNumber();
          const lng = localStorage.getItem('language') || 'eng';
          await this._render(cartNum, lng);
          await this._renderSummary(cartNum, lng);
        } catch (err) {
          console.error('[CartView] Error handling currency change:', err);
        }
      });
    }
  }

  handleCartLanguage() {
    const hebLng = document.querySelector('.heb-lng');
    const engLng = document.querySelector('.eng-lng');

    if (hebLng && engLng) {
      hebLng.addEventListener('click', () => this.changeToHeb());
      engLng.addEventListener('click', () => this.changeToEng());
    }
  }

  setCartLng(lng) {
    // this.setLanguage(lng); // REMOVED: Base setLanguage is called by controller

    if (lng === 'eng') {
      this._cartTitle.textContent = 'Your Cart';
      this._cartEmpty.textContent = 'Your Cart Is Empty';
      this._deleteAllBtn.textContent = 'Delete All';
      this._summaryTitle.textContent = 'Order Summary';
      this._checkMeOut.textContent = 'Check Me Out With:';
    }
    if (lng === 'heb') {
      this._cartTitle.textContent = 'העגלה שלי';
      this._cartEmpty.textContent = 'עגלת הקניות שלך ריקה';
      this._deleteAllBtn.textContent = 'מחק הכל';
      this._summaryTitle.textContent = 'סיכום הזמנה';
      this._checkMeOut.style.direction = 'rtl';
      this._checkMeOut.textContent = 'שלם באמצעות:';
    }
  }

  _addHandlerDelete(handler) {
    this._parentElement.addEventListener('click', function (e) {
      const btn = e.target.closest('.delete-item');
      if (!btn) return;
      const idNum = btn.closest('.cart-item');
      handler(idNum.id);
    });
  }

  _addHandlerDeleteAll(handler) {
    this._parentElement.addEventListener('click', function (e) {
      const btn = e.target.closest('.delete-all');
      if (!btn) return;

      handler();
    });
  }

  _addHandlerCheckout(data) {
    this._checkoutBtn.addEventListener('click', async e => {
      e.preventDefault();

      // Prepare items for checkout - always use USD prices for Stripe
      // Map cart items to include USD prices (from stored usdPrice or calculated)
      const checkoutItems = data.map(item => {
        // Use stored USD price if available, otherwise use current price if already USD
        const usdPrice =
          item.usdPrice || (item.currency === '$' ? item.price : null);
        const usdOriginalPrice =
          item.originalUsdPrice ||
          (item.currency === '$' ? item.originalPrice : null);
        const usdDiscountedPrice =
          item.discountedPrice && item.currency === '$'
            ? item.discountedPrice
            : item.discountedPrice
            ? null
            : null; // If discounted but not USD, we'll use usdPrice

        return {
          ...item,
          price: usdPrice || item.price, // Fallback to current price if no USD price stored
          originalPrice: usdOriginalPrice || item.originalPrice,
          discountedPrice: usdDiscountedPrice,
          currency: '$', // Always send as USD for Stripe
        };
      });

      await fetch(`${this._host}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: checkoutItems,
          currency: '$', // Stripe always uses USD
        }),
      })
        .then(async res => {
          if (res.ok) return res.json();
          const json = await res.json();
          return await Promise.reject(json);
        })
        .then(({ url }) => {
          window.location = url;
        })
        .catch(e => {
          console.error(e);
        });
    });
  }

  _generateMarkup(cartNum) {
    if (cartNum === 0) {
      this._itemsBox.classList.add('remove');
      this._deleteAllBtn.classList.add('remove');
      this._deleteAllBtn.classList.remove('delete-all-active');
      return ''; // Return empty string for empty cart
    } else {
      this._itemsBox.classList.remove('remove');
      this._cartEmpty.classList.add('remove');
      this._deleteAllBtn.classList.add('delete-all-active');
      this._deleteAllBtn.classList.remove('remove');

      // Check if cart is empty before accessing currency
      if (!model.cart || model.cart.length === 0) {
        return ''; // Return empty string if no items in cart
      }

      // Use current selected currency, not the stored currency in cart items
      const currencySymbol = this._getCurrencySymbol();
      const currentCurrency = this._getCurrentCurrency();

      return model.cart
        .map(item => {
          // Get prices based on current currency selection (use stored USD/ILS prices)
          const itemPrice = this._getItemPrice(item, false);
          const itemOriginalPrice = this._getItemPrice(item, true);
          const hasDiscount = itemOriginalPrice > itemPrice;

          return `     
          <div class="cart-item" id="${item.id}">
            <div class="cart-item__media">
              <img src='${item.image}' class="item-img" alt="${
            item.title || ''
          }" />
            </div>
            <div class="cart-item__content">
              <div class="cart-item__title">
                <h2 class="item-title">${item.title}</h2>
              </div>
              <div class="cart-item__right">
                ${
                  hasDiscount
                    ? `<div class="cart-item-price-container">
                      <span class="item-price-original">${currencySymbol}${itemOriginalPrice}</span>
                      <span class="item-price-discounted">${currencySymbol}${itemPrice}</span>
                    </div>`
                    : `<span class="item-price">${currencySymbol}${itemPrice}</span>`
                }
                ${
                  Number(item.quantity) > 1
                    ? `<div class="cart-qty" aria-label="Quantity">
                        <button class="cart-qty__btn cart-qty__btn--minus" type="button" disabled>-</button>
                        <input class="cart-qty__input" type="number" readonly value="${
                          Number(item.amount) || 1
                        }" />
                        <button class="cart-qty__btn cart-qty__btn--plus" type="button" disabled>+</button>
                      </div>`
                    : `<div class="cart-qty cart-qty--static" aria-label="Quantity">
                        <input class="cart-qty__input" type="number" readonly value="${
                          Number(item.amount) || 1
                        }" />
                      </div>`
                }
                <button class="delete-item cart-remove" type="button" aria-label="Remove item">Remove</button>
              </div>
            </div>
          </div>`;
        })
        .join('');
    }
  }

  async _generateSummaryMarkup(cartNum, price, ship = 30, lng) {
    if (cartNum === 0) return '';

    // Check if cart is empty before accessing currency
    if (!model.cart || model.cart.length === 0) {
      return '';
    }

    // Use current selected currency, not the stored currency in cart items
    const currentCurrency = this._getCurrentCurrency();
    const currency = this._getCurrencySymbol();

    // Calculate totals
    const originalTotal = this._calculateOriginalTotal();
    const discountedTotal = this._calculateTotal();
    const discountAmount = originalTotal - discountedTotal;

    // Get global discount settings
    const discountSettings = await model.getGlobalDiscount();
    const hasDiscount = discountSettings.active && discountAmount > 0;

    // Determine labels and styling based on language
    const labels =
      lng === 'heb'
        ? {
            subtotal: 'סכום ביניים:',
            discount: 'הנחה:',
            shipping: 'משלוח:',
            shippingValue: 'מחושב בקופה',
            total: 'סה"כ:',
            shippingNote:
              '(ייתכנו עלויות משלוח. אנא התקדמו לתשלום לבחירת אפשרות המשלוח)',
          }
        : {
            subtotal: 'Subtotal:',
            discount: 'Discount:',
            shipping: 'Shipping:',
            shippingValue: 'Calculated at checkout',
            total: 'Total:',
            shippingNote:
              '(Shipping costs may apply. Please proceed to checkout for options)',
          };

    const rtlWrap = lng === 'heb' ? 'style="direction: rtl;"' : '';

    return `
    <div class="price-summary-container">
          ${
            hasDiscount
              ? `
          <div class="total-container subtotal" ${rtlWrap}>
            <span class="total-text">${labels.subtotal}</span>
            <span class="total-price">${currency}${originalTotal}</span>
          </div>
          <div class="total-container discount-line" ${rtlWrap}>
            <span class="total-text">${labels.discount} -${discountSettings.percentage}%</span>
            <span class="total-price discount-amount">-${currency}${discountAmount}</span>
          </div>
          <div class="total-container after-discount" ${rtlWrap}>
            <span class="total-text">${labels.total}</span>
            <span class="total-price discounted-price">${currency}${discountedTotal}</span>
          </div>
          `
              : `
          <div class="total-container subtotal" ${rtlWrap}>
            <span class="total-text">${labels.subtotal}</span>
            <span class="total-price">${currency}${discountedTotal}</span>
          </div>
          `
          }
          <div class="total-container shipping" ${rtlWrap}>
            <span class="total-text">${labels.shipping}</span>
            <span class="total-price">${labels.shippingValue}</span>
          </div>
          <span class="shipping-text">${labels.shippingNote}</span>
        </div>`;
  }

  render(cartNum) {
    const markup = this._generateMarkup(cartNum);
    this._itemsBox.insertAdjacentHTML('beforeend', markup);

    // Hide/show delete all button and order summary container if cart is empty
    if (cartNum === 0) {
      this._deleteAllBtn.classList.add('remove');
      this._deleteAllBtn.classList.remove('delete-all-active');
      if (this._orderSummaryContainer)
        this._orderSummaryContainer.classList.add('remove');
    } else {
      this._deleteAllBtn.classList.remove('remove');
      this._deleteAllBtn.classList.add('delete-all-active');
      if (this._orderSummaryContainer)
        this._orderSummaryContainer.classList.remove('remove');
    }
  }

  async _renderSummary(cartNum, lng) {
    if (cartNum !== 0) {
      this._summaryDetails.innerHTML = '';
      const num = this._calculateTotal();
      const markup = await this._generateSummaryMarkup(
        cartNum,
        num,
        undefined,
        lng
      );
      this._summaryDetails.insertAdjacentHTML('afterbegin', markup);
      if (this._orderSummaryContainer)
        this._orderSummaryContainer.classList.remove('remove');
    }
    if (cartNum === 0) {
      this._summaryDetails.innerHTML = '';
      this._checkoutBtn.classList.add('remove');
      if (this._orderSummaryContainer)
        this._orderSummaryContainer.classList.add('remove');
    }
  }

  _removeItem(cartNum) {
    if (cartNum !== 0) {
      this._itemsBox.innerHTML = '';
      this.render(cartNum);
    } else {
      // cartNum is now 0
      this._itemsBox.innerHTML = '';
      this._cartEmpty.classList.remove('remove');
      this._deleteAllBtn.classList.add('remove');
      this._deleteAllBtn.classList.remove('delete-all-active');
      if (this._orderSummaryContainer)
        this._orderSummaryContainer.classList.add('remove');
    }
  }

  _removeAll() {
    this._itemsBox.innerHTML = '';
    this._cartEmpty.classList.remove('remove');
    this._deleteAllBtn.classList.add('remove');
    this._deleteAllBtn.classList.remove('delete-all-active');
    if (this._orderSummaryContainer)
      this._orderSummaryContainer.classList.add('remove');
  }

  _clear() {
    this._parentElement.innerHTML = '';
  }

  _calculateTotal() {
    if (model.checkCartNumber() === 0) return 0;

    // Check if cart is empty before accessing currency
    if (!model.cart || model.cart.length === 0) {
      return 0;
    }

    let checkCurrency = model.cart[0].currency;

    // Calculate total using stored prices (already in correct currency)
    // Prices are stored as whole numbers from the database
    const total = model.cart
      .map(itm => {
        // Use discounted price if available, otherwise use regular price
        const price = itm.discountedPrice || itm.price;
        return Math.round(Number(price) || 0);
      })
      .reduce((x, y) => x + y, 0);

    return Math.round(total);
  }

  _calculateOriginalTotal() {
    if (model.checkCartNumber() === 0) return 0;

    // Check if cart is empty before accessing currency
    if (!model.cart || model.cart.length === 0) {
      return 0;
    }

    // Calculate original total using stored prices based on current currency
    const total = model.cart
      .map(itm => {
        // Use stored original price for current currency
        return this._getItemPrice(itm, true);
      })
      .reduce((x, y) => x + y, 0);

    return Math.round(total);
  }

  paypalCheckout(cartData) {
    if (!cartData || cartData.length === 0) return;

    // console.log(
    //   'Initializing PayPal checkout with cart data:',
    //   cartData.length,
    //   'items'
    // );

    // PayPal orders must use a single currency across the entire order.
    const currencyVariable = cartData[0].currency == '$' ? 'USD' : 'ILS';
    const distinctCurrencies = new Set(
      cartData.map(item => (item.currency == '$' ? 'USD' : 'ILS'))
    );
    if (distinctCurrencies.size > 1) {
      console.error(
        'Mixed currencies detected in cart. Cannot initiate PayPal checkout.',
        Array.from(distinctCurrencies)
      );
      alert(
        'Your cart contains items in multiple currencies. Please change them to a single currency before checkout.'
      );
      return;
    }

    // Remove any existing PayPal script to avoid conflicts
    const existingScript = document.querySelector(
      'script[src*="paypal.com/sdk/js"]'
    );
    if (existingScript) {
      // console.log('Removing existing PayPal script');
      existingScript.remove();
    }

    // Add RTL styles for PayPal form inputs
    const rtlStyles = document.createElement('style');
    rtlStyles.textContent = `
      .paypal-button-container .paypal-card-form .card-field-input {
        direction: rtl;
        text-align: right;
      }
      .paypal-button-container input::placeholder,
      .paypal-button-container .card-field-placeholder {
        direction: rtl !important;
        text-align: right !important;
        right: 0 !important;
        left: auto !important;
        padding-right: 10px !important;
        position: absolute !important;
      }
      .paypal-button-container .paypal-card-form .field-wrapper {
        direction: rtl;
      }
      .paypal-button-container .card-field-container,
      .paypal-button-container .card-billing-address-container,
      .paypal-button-container .card-field-frame {
        direction: rtl;
      }
      .paypal-button-container .card-field-label {
        text-align: right;
        direction: rtl;
      }
    `;
    document.head.appendChild(rtlStyles);

    // Create new script element
    let paypalScript = document.createElement('script');
    paypalScript.src = `https://www.paypal.com/sdk/js?client-id=AQ_Op8cY6HHktDWw0X4y73ydkfGKeN-Tm3T20iWIDPIo4M7OpehX2QYZD0_gpDgtg7RkdRKL51foMNP7&currency=${currencyVariable}`;
    paypalScript.async = true;
    paypalScript.className = 'paypal-script';

    // Add load and error event handlers
    paypalScript.addEventListener('load', () => {
      this._initializePayPalButtons(cartData);
    });

    paypalScript.addEventListener('error', error => {
      console.error('Failed to load PayPal SDK:', error);
      alert('Failed to load PayPal checkout. Please try again later.');
    });

    // Add the script to the page
    document.head.appendChild(paypalScript);
  }

  _initializePayPalButtons(cartData) {
    if (!window.paypal) {
      console.error('PayPal SDK not loaded');
      return;
    }

    const paypalContainer = document.querySelector('#paypal');
    if (!paypalContainer) {
      console.error('PayPal container not found');
      return;
    }

    // Clear the container first
    paypalContainer.innerHTML = '';

    try {
      window.paypal
        .Buttons({
          // Use the existing createOrder and onApprove methods
          createOrder: async () => {
            try {
              const cartDetails = cartData.map(item => {
                const data = {
                  name: item.title,
                  unit_amount: {
                    currency_code: item.currency == '$' ? 'USD' : 'ILS',
                    value: item.price,
                  },
                  quantity: item.quantity,
                };
                return data;
              });

              // Extra safety: PayPal orders must use a single currency.
              const distinctCurrencies = new Set(
                cartDetails.map(itm => itm.unit_amount.currency_code)
              );
              if (distinctCurrencies.size > 1) {
                throw new Error(
                  'Your cart contains items in multiple currencies. Please change them to a single currency before checkout.'
                );
              }

              // Check if cart is valid
              if (!cartDetails || cartDetails.length === 0) {
                throw new Error(
                  'Cart is empty. Please add items to your cart.'
                );
              }

              const response = await fetch(`${process.env.API_URL}/orders`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  cart: cartDetails,
                }),
              });

              // IMPORTANT:
              // Some browser tooling/extensions will try to read the same Response body
              // for debugging/inspection. To avoid "body stream already read" errors,
              // always consume a CLONED response body here and leave the original
              // response object untouched for any other listeners.
              const clonedResponse = response.clone();
              const text = await clonedResponse.text();
              let responseData = null;
              try {
                responseData = text ? JSON.parse(text) : null;
              } catch (parseError) {
                console.error('Error parsing response as JSON:', parseError);
                responseData = null;
              }

              if (!response.ok) {
                const statusInfo = `HTTP ${response.status}`;
                const structuredMessage =
                  responseData?.message ||
                  responseData?.error ||
                  responseData?.code;

                // If we got an HTML error page (e.g. 504 from a gateway), avoid showing it to users.
                if (!structuredMessage && text && text.trim().startsWith('<')) {
                  const friendly =
                    response.status === 504 || response.status === 502
                      ? 'The payment service is temporarily unavailable. Please try again in a few minutes.'
                      : 'The server returned an invalid response. Please try again later.';
                  throw new Error(`${friendly} (${statusInfo})`);
                }

                const fallbackText =
                  text && text.trim()
                    ? text.trim().slice(0, 300)
                    : 'Unknown error';
                const errorMessage = structuredMessage || fallbackText;
                throw new Error(
                  `Failed to create order: ${errorMessage} (${statusInfo})`
                );
              }

              if (responseData.jsonResponse && responseData.jsonResponse.id) {
                return responseData.jsonResponse.id;
              } else if (responseData.id) {
                return responseData.id;
              } else {
                console.error('No order ID in response:', responseData);
                const errorDetail =
                  responseData?.details?.[0] ||
                  responseData?.jsonResponse?.details?.[0];

                const errorMessage = errorDetail
                  ? `${errorDetail.issue} ${errorDetail.description}`
                  : 'Failed to get order ID from PayPal';

                throw new Error(errorMessage);
              }
            } catch (error) {
              console.error('PayPal createOrder error:', error);
              alert(`Could not initiate PayPal Checkout: ${error.message}`);
              throw error;
            }
          },

          onApprove: async (data, actions) => {
            try {
              const response = await fetch(
                `${process.env.API_URL}/orders/${data.orderID}/capture`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to capture order: ${errorText}`);
              }

              const orderData = await response.json();

              // Get the actual order data from the response
              const actualOrderData = orderData.jsonResponse || orderData;

              // Three cases to handle:
              //   (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
              //   (2) Other non-recoverable errors -> Show a failure message
              //   (3) Successful transaction -> Show confirmation or thank you message

              const errorDetail = actualOrderData?.details?.[0];

              if (errorDetail?.issue === 'INSTRUMENT_DECLINED') {
                // (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
                // recoverable state, per https://developer.paypal.com/docs/checkout/standard/customize/handle-funding-failures/
                return actions.restart();
              } else if (errorDetail) {
                // (2) Other non-recoverable errors -> Show a failure message
                throw new Error(
                  `${errorDetail.description} (${actualOrderData.debug_id})`
                );
              } else if (!actualOrderData.purchase_units) {
                throw new Error(JSON.stringify(actualOrderData));
              } else {
                // (3) Successful transaction -> Show confirmation or thank you message
                // Or go to another URL:  actions.redirect('thank_you.html');
                const transaction =
                  actualOrderData?.purchase_units?.[0]?.payments
                    ?.captures?.[0] ||
                  actualOrderData?.purchase_units?.[0]?.payments
                    ?.authorizations?.[0];

                // Redirect to success page or show confirmation
                window.location = `${process.env.HOST}/index.html?success=true`;
              }
            } catch (error) {
              console.error('PayPal capture error:', error);
              alert(
                `Sorry, your transaction could not be processed: ${error.message}`
              );
            }
          },

          onError: err => {
            console.error('PayPal button error:', err);
            alert(
              'There was an error with the PayPal checkout. Please try again later.'
            );
          },
        })
        .render('#paypal');
    } catch (error) {
      console.error('Error setting up PayPal buttons:', error);
      alert('Failed to initialize PayPal checkout. Please try again later.');
    }
  }

  // Override the placeholder from View.js
  setPageSpecificLanguage(lng, cartNum) {
    this.setCartLng(lng);
    // Re-render summary with the new language (now handled correctly)
    // const cartNum = await model.checkCartNumber(); // No need to fetch again
    // this._renderSummary(cartNum, lng);
  }
}
export default new CartView();
