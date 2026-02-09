import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from './tests/helpers/dom.js';
import * as model from './js/model.js';

describe('Debug', () => {
  it('should render summary', async () => {
    process.env.API_URL = 'http://localhost:4000';
    
    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>
      <div class="cart-items-container">
        <div class="added-items"></div>
        <div class="cart-empty">Your Cart Is Empty</div>
        <h2 class="cart-title">Your Cart</h2>
        <h3 class="summary-title">Order Summary</h3>
        <div class="summary-details"></div>
        <button id="stripe-checkout-btn">Checkout</button>
        <button class="delete-all">Delete All</button>
        <div class="check-me-out">Check Me Out With:</div>
        <div class="summary"></div>
      </div>
    `);

    model.cart.length = 0;
    vi.spyOn(model, 'checkCartNumber').mockImplementation(() => model.cart.length);
    vi.spyOn(model, 'getGlobalDiscount').mockResolvedValue({ active: false, percentage: 0 });

    vi.resetModules();
    const module = await import('./js/Views/cartView.js');
    const cartView = module.default;

    model.cart.push({
      id: 'product-123',
      title: 'Gold Necklace',
      usdPrice: 50,
      ilsPrice: 185,
      price: 185,
      originalPrice: 185,
      originalUsdPrice: 50,
      originalIlsPrice: 185,
      amount: 1,
      currency: '₪'
    });

    localStorage.setItem('currency', 'ils');

    console.log('Before render, cart length:', model.cart.length);
    console.log('Cart item:', model.cart[0]);
    
    await cartView.render(1);
    console.log('After cart render');
    
    await cartView._renderSummary(1, 'eng');
    console.log('After summary render');
    
    const summaryDetails = document.querySelector('.summary-details');
    console.log('Summary details innerHTML:', summaryDetails.innerHTML);
  });
});
