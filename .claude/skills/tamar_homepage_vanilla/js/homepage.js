/* =========================================================
   Tamar Kfir Jewelry — Homepage interactions (vanilla JS)
   No framework. Renders the featured grid, runs the cart
   drawer (add / remove / subtotal), nav smooth-scroll,
   newsletter submit and toast feedback.

   INTEGRATION NOTE (for the production MVC site):
   The featured products are demo data below. In the real
   store, replace `PRODUCTS` with your catalogue model and
   replace `addToCart`/`renderCart` with calls into the
   site's existing cart controller. The DOM structure and
   class names are the design contract — keep them.
   ========================================================= */
(function () {
  'use strict';

  var CURRENCY = 'ILS'; // 'ILS' -> ₪, 'USD' -> $
  function symbol() { return CURRENCY === 'USD' ? '$' : '\u20AA'; }
  function money(n) { return symbol() + n; }

  /* ---- Demo catalogue (replace with real data on the live site) ---- */
  var PRODUCTS = [
    { id: 'p1',  name: 'True Colors',     price: 450,                 image: 'assets/products/crochet-01.jpg',  badge: 'Handmade' },
    { id: 'p6',  name: 'Crystal Hoop',    price: 96,  original: 120,  image: 'assets/products/hoop-02.jpg',     badge: 'Sale' },
    { id: 'p3',  name: 'Howlite Stone',   price: 120,                 image: 'assets/products/necklace-01.jpg' },
    { id: 'p5',  name: 'Jade Whisper',    price: 165,                 image: 'assets/products/necklace-jade.jpg' },
    { id: 'p2',  name: 'Blue Moon',       price: 120,                 image: 'assets/products/crochet-02.jpg' },
    { id: 'p4',  name: 'Green Boulevard', price: 150, original: 180,  image: 'assets/products/necklace-02.jpg', badge: 'Sale' },
    { id: 'p9',  name: 'Sweet Drop',      price: 90,                  image: 'assets/products/earring-01.jpg' },
    { id: 'p10', name: 'ALE Dangle',      price: 240,                 image: 'assets/products/earring-02.jpg',  badge: 'Handmade' }
  ];

  var cart = [];  // [{ id, name, price, image, qty }]

  /* ---------- helpers ---------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function $(id) { return document.getElementById(id); }

  /* ---------- PriceTag markup ---------- */
  function priceHTML(p) {
    var onSale = p.original != null && p.original > p.price;
    return '<div class="tk-price">' +
      '<span class="tk-price__now' + (onSale ? ' is-sale' : '') + '">' + money(p.price) + '</span>' +
      (onSale ? '<span class="tk-price__was">' + money(p.original) + '</span>' : '') +
      '</div>';
  }

  /* ---------- ProductCard markup ---------- */
  function renderProducts() {
    var grid = $('tk-prod-grid');
    if (!grid) return;
    grid.innerHTML = '';
    PRODUCTS.forEach(function (p) {
      var card = el('div', 'tk-prod');
      var badge = p.badge
        ? '<div class="tk-prod__badge"><span class="tk-badge tk-badge--gold">' + p.badge + '</span></div>'
        : '';
      card.innerHTML =
        '<div class="tk-prod__media">' +
          '<img src="' + p.image + '" alt="' + p.name + '" />' + badge +
        '</div>' +
        '<div class="tk-prod__title-wrap"><h3 class="tk-prod__title">' + p.name + '</h3></div>' +
        '<div class="tk-prod__price">' + priceHTML(p) + '</div>' +
        '<button class="tk-prod__add" type="button">Add to Cart</button>';
      card.querySelector('.tk-prod__add').addEventListener('click', function (e) {
        e.stopPropagation();
        addToCart(p);
      });
      grid.appendChild(card);
    });
  }

  /* ---------- Cart ---------- */
  function addToCart(p) {
    var found = cart.filter(function (x) { return x.id === p.id; })[0];
    if (found) found.qty += 1;
    else cart.push({ id: p.id, name: p.name, price: p.price, image: p.image, qty: 1 });
    renderCart();
    openCart();
  }
  function removeItem(id) {
    cart = cart.filter(function (x) { return x.id !== id; });
    renderCart();
  }
  function renderCart() {
    var body = $('tk-drawer-body');
    var count = cart.reduce(function (s, it) { return s + it.qty; }, 0);
    var subtotal = cart.reduce(function (s, it) { return s + it.price * it.qty; }, 0);

    $('tk-cart-count').textContent = count;
    $('tk-subtotal').textContent = money(subtotal);
    $('tk-checkout').disabled = cart.length === 0;

    body.innerHTML = '';
    if (cart.length === 0) {
      body.appendChild(el('p', 'tk-drawer__empty', 'Your cart is empty.'));
      return;
    }
    cart.forEach(function (it) {
      var line = el('div', 'tk-line');
      line.innerHTML =
        '<div class="tk-line__media"><img src="' + it.image + '" alt="' + it.name + '" /></div>' +
        '<div class="tk-line__main">' +
          '<div class="tk-line__row">' +
            '<span class="tk-line__name">' + it.name + '</span>' +
            '<span class="tk-line__total">' + money(it.price * it.qty) + '</span>' +
          '</div>' +
          '<div class="tk-line__meta">' +
            '<span class="tk-line__qty">Qty ' + it.qty + '</span>' +
            '<button class="tk-line__remove" type="button">Remove</button>' +
          '</div>' +
        '</div>';
      line.querySelector('.tk-line__remove').addEventListener('click', function () { removeItem(it.id); });
      body.appendChild(line);
    });
  }
  function openCart() {
    $('tk-overlay').classList.add('is-open');
    $('tk-drawer').classList.add('is-open');
  }
  function closeCart() {
    $('tk-overlay').classList.remove('is-open');
    $('tk-drawer').classList.remove('is-open');
  }

  /* ---------- Toast ---------- */
  var toastTimer;
  function flash(msg) {
    var t = $('tk-toast');
    t.textContent = msg;
    t.classList.add('is-open');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-open'); }, 2200);
  }

  /* ---------- Smooth scroll ---------- */
  function scrollToShop() {
    var shop = $('tk-shop');
    if (shop) window.scrollTo({ top: shop.getBoundingClientRect().top + window.scrollY - 20, behavior: 'smooth' });
  }
  function onNavigate(label) {
    if (label === 'Home') window.scrollTo({ top: 0, behavior: 'smooth' });
    else if (label === 'Shop') scrollToShop();
    else flash(label + ' \u2014 coming soon');
  }

  /* ---------- Wire up ---------- */
  function init() {
    renderProducts();
    renderCart();

    $('tk-cart-open').addEventListener('click', openCart);
    $('tk-cart-close').addEventListener('click', closeCart);
    $('tk-overlay').addEventListener('click', closeCart);

    $('tk-hero-cta').addEventListener('click', function (e) { e.preventDefault(); scrollToShop(); });

    // nav links, footer links, "read my story", "view all"
    [].forEach.call(document.querySelectorAll('[data-nav]'), function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); onNavigate(a.getAttribute('data-nav')); });
    });
    // category tiles
    [].forEach.call(document.querySelectorAll('[data-category]'), function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); flash(a.getAttribute('data-category') + ' \u2014 coming soon'); });
    });

    // newsletter
    $('tk-news-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('tk-news-email').value.trim();
      if (email) { $('tk-news-submit').textContent = 'Thank you'; flash('You\u2019re on the list \u2014 thank you'); }
    });

    $('tk-checkout').addEventListener('click', function () { flash('Checkout \u2014 coming soon'); });
    $('tk-whatsapp').addEventListener('click', function (e) { e.preventDefault(); flash('Opening WhatsApp\u2026'); });

    // Escape closes the drawer
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCart(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
