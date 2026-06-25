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

  // Currency is read live from localStorage (set by View.js / Phase 40 currency
  // wiring). Returns 'usd' or 'ils' (lowercase), defaulting to 'ils'.
  function getCurrency() {
    var c = (localStorage.getItem('currency') || 'ils').toLowerCase();
    return (c === 'usd' || c === 'ils') ? c : 'ils';
  }
  function symbol(cur) { return (cur || getCurrency()) === 'usd' ? '$' : '\u20AA'; }
  function money(n, cur) { return symbol(cur) + n; }

  var cart = [];  // [{ id, name, image, qty, usd_price, ils_price }]

  /* ---------- helpers ---------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function $(id) { return document.getElementById(id); }

  /* ---------- PriceTag markup ---------- */
  function priceHTML(p, cur) {
    var onSale = p.original != null && p.original > p.price;
    return '<div class="tk-price">' +
      '<span class="tk-price__now' + (onSale ? ' is-sale' : '') + '">' + money(p.price, cur) + '</span>' +
      (onSale ? '<span class="tk-price__was">' + money(p.original, cur) + '</span>' : '') +
      '</div>';
  }

  /* ---------- Grid hydration ----------
     SSR (home.ejs) renders the real .tk-prod cards with dual usd/ils data-*
     attributes and an empty .tk-prod__price. We only fill the price in the
     saved currency — we must NOT rebuild the grid (CLAUDE.md dual-render rule). */
  function renderProducts() {
    var cur = getCurrency();
    var cards = document.querySelectorAll('#tk-prod-grid .tk-prod');
    cards.forEach(function (card) {
      var usdP = parseInt(card.dataset.usdPrice, 10) || 0;
      var ilsP = parseInt(card.dataset.ilsPrice, 10) || 0;
      var oUsd = parseInt(card.dataset.originalUsdPrice, 10) || usdP;
      var oIls = parseInt(card.dataset.originalIlsPrice, 10) || ilsP;
      var price = cur === 'usd' ? usdP : ilsP;
      var orig  = cur === 'usd' ? oUsd : oIls;
      var onSale = orig > price && orig > 0;
      var priceEl = card.querySelector('.tk-prod__price');
      if (priceEl) priceEl.innerHTML = priceHTML({ price: price, original: onSale ? orig : null }, cur);
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

    // Featured grid: delegated card-click navigation (D-06) + Add-to-Cart binding.
    // Guarded so the script no-ops when the grid is absent (empty-state band, D-04).
    var grid = document.getElementById('tk-prod-grid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        if (e.target.closest('.tk-prod__add')) return; // let Add-to-Cart handle it
        var card = e.target.closest('.tk-prod');
        if (!card || !card.dataset.slug) return;
        var lang = document.documentElement.lang || 'en';
        window.location.href = '/' + lang + '/product/' + card.dataset.slug;
      });
      grid.querySelectorAll('.tk-prod__add').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          addToCart(btn.closest('.tk-prod'));
        });
      });
    }

    // The cart control is an <a href="/{lang}/cart"> so it routes to the real
    // cart page on pages without this script; here on the home page we intercept
    // it to open the demo drawer instead.
    $('tk-cart-open').addEventListener('click', function (e) { e.preventDefault(); openCart(); });
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
    // WhatsApp is a real wa.me link (target=_blank) \u2014 let it open; no toast stub.

    // Escape closes the drawer
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCart(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
