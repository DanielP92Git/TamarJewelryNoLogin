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
  _checkoutBtn = document.querySelector('.stripe-svg');
  _deleteAllBtn = document.querySelector('.delete-all');
  _checkMeOut = document.querySelector('.check-me-out');
  _orderSummaryContainer = document.querySelector('.summary');
  _host = process.env.API_URL;
  _rate = process.env.USD_ILS_RATE || 3.7;

  addCartViewHandler(handler) {
    window.addEventListener('load', () => {
      let lng = localStorage.getItem('language');
      if (!lng) {
        localStorage.setItem('language', 'eng');
        lng = 'eng';
      }

      handler(lng);
    });
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
      let currency = data[0].currency; // data is model.cart
      await fetch(`${this._host}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [...data],
          currency: currency,
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

      let checkCurrency = model.cart[0].currency;
      if (checkCurrency == '$') {
        return model.cart
          .map(
            item =>
              `     
          <div class="cart-item" id="${item.id}">
            <img src='${item.image}' class="item-img" alt="" />
            <div class="item-title">${item.title}</div>
            <div class="item-price">${
              item.currency == '$'
                ? `$${item.price}`
                : `$${Number((item.price / this._rate).toFixed(0))}`
            }</div>
             <img src="${deleteSvg}" class="delete-item"/> 
            </div>`
          )
          .join('');
      } else {
        return model.cart
          .map(
            item =>
              `     
        <div class="cart-item" id="${item.id}">
          <img src='${item.image}' class="item-img" alt="" />
          <div class="item-title">${item.title}</div>
          <div class="item-price">${
            item.currency == '$'
              ? `₪${Number((item.price * this._rate).toFixed(0))}`
              : `₪${item.price}`
          }</div>
          <div class="delete-item">X</div>
          <!-- <img src="${deleteSvg}" class="delete-item"/> -->
          </div>`
          )
          .join('');
      }
    }
  }

  _generateSummaryMarkup(cartNum, price, ship = 30, lng) {
    if (cartNum === 0) return;

    // Check if cart is empty before accessing currency
    if (!model.cart || model.cart.length === 0) {
      return '';
    }

    let checkCurrency = model.cart[0].currency;
    let isInUsd = checkCurrency == '$';
    let currency = isInUsd ? '$' : '₪';

    // Determine total label and styling based on language
    const totalLabel = lng === 'eng' ? 'Total:' : 'סה"כ:';
    const totalContainerStyle =
      lng === 'heb' ? 'style="direction: rtl; padding-right: 5px;"' : '';
    const totalTextStyle = lng === 'heb' ? 'style="margin-right: 0;"' : '';

    return `
    <div class="price-summary-container">
          <!--<div class="total-container subtotal">
            <span class="total-text">Subtotal:</span>
            <span class="total-price">₪${price}</span>
          </div>-->
          <!--<div class="total-container shipping">
            <span class="total-text">Shipping:</span>
            <span class="total-price">₪${ship}</span>
          </div>-->
          
          <!-- Correctly generate total line using variables -->
          <div class="total-container total" ${totalContainerStyle}>
            <span class="total-text" ${totalTextStyle}>${totalLabel}</span>
            <span class="total-price">${currency}${price}</span>
          </div>

          <!-- Remove the potentially problematic commented-out block -->
          <!-- 
          <div class="total-container total">
            <span class="total-text">Total:</span>
            <span class="total-price">${currency}${price}</span>
          </div>
          -->

          ${
            lng === 'eng'
              ? '<span class="shipping-text">(Shipping costs may apply. Please proceed to checkout for options)</span>'
              : '<span class="shipping-text">(ייתכנו עלויות משלוח. אנא התקדמו לתשלום לבחירת אפשרות המשלוח)</span>'
          }
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

  _renderSummary(cartNum, lng) {
    if (cartNum !== 0) {
      this._summaryDetails.innerHTML = '';
      const num = this._calculateTotal();
      const markup = this._generateSummaryMarkup(cartNum, num, undefined, lng);
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

    if (checkCurrency == '₪') {
      const convertPrice = model.cart
        .map(itm => {
          if (itm.currency == '$') {
            return itm.price * this._rate;
          }
          return +itm.price;
        })
        .reduce((x, y) => x + y, 0);

      return Number(convertPrice.toFixed(0));
    }
    if (checkCurrency == '$') {
      const convertPrice = model.cart
        .map(itm => {
          if (itm.currency == '₪') {
            return itm.price / this._rate;
          }
          return +itm.price;
        })
        .reduce((x, y) => x + y, 0);

      return Number(convertPrice.toFixed(0));
    }
  }

  paypalCheckout(cartData) {
    if (!cartData || cartData.length === 0) return;

    console.log(
      'Initializing PayPal checkout with cart data:',
      cartData.length,
      'items'
    );

    const currencyVariable = cartData[0].currency == '$' ? 'USD' : 'ILS';
    console.log('PayPal currency:', currencyVariable);

    // Remove any existing PayPal script to avoid conflicts
    const existingScript = document.querySelector(
      'script[src*="paypal.com/sdk/js"]'
    );
    if (existingScript) {
      console.log('Removing existing PayPal script');
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
      console.log('PayPal SDK loaded successfully');
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

              console.log(
                'Sending cart to PayPal API:',
                JSON.stringify(cartDetails, null, 2)
              );

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

              let responseData;
              try {
                responseData = await response.json();
              } catch (parseError) {
                console.error('Error parsing response:', parseError);
                const errorText = await response.text();
                throw new Error(`Invalid response from server: ${errorText}`);
              }

              console.log('PayPal order API response:', responseData);

              if (!response.ok) {
                const errorMessage =
                  responseData.message || responseData.error || 'Unknown error';
                throw new Error(`Failed to create order: ${errorMessage}`);
              }

              if (responseData.jsonResponse && responseData.jsonResponse.id) {
                console.log('Order ID received:', responseData.jsonResponse.id);
                return responseData.jsonResponse.id;
              } else if (responseData.id) {
                console.log('Direct order ID received:', responseData.id);
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
              console.log('Payment approved, capturing order:', data.orderID);

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
              console.log('Order capture response:', orderData);

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

                console.log(
                  `Transaction ${transaction.status}: ${transaction.id}`
                );

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

      console.log('PayPal buttons rendered successfully');
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
