import { cart } from './js/model.js';

// Add cart item
cart.push({
  id: 'product-123',
  title: 'Gold Necklace',
  price: 185,
  usdPrice: 50,
  ilsPrice: 185,
  originalPrice: 185,
  originalUsdPrice: 50,
  originalIlsPrice: 185,
  discountedPrice: null,
  amount: 1,
  quantity: 10,
  currency: '₪'
});

console.log('Cart:', cart);
console.log('Cart length:', cart.length);
