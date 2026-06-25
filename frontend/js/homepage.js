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
    const c = (localStorage.getItem('currency') || 'ils').toLowerCase();
    return (c === 'usd' || c === 'ils') ? c : 'ils';
  }
  function symbol(cur) { return (cur || getCurrency()) === 'usd' ? '$' : '₪'; }
  function money(n, cur) { return symbol(cur) + n; }

  let cart = [];  // [{ id, name, image, qty, usd_price, ils_price }]

  /* ---------- helpers ---------- */
  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function $(id) { return document.getElementById(id); }

  /* ---------- PriceTag markup ---------- */
  function priceHTML(p, cur) {
    const onSale = p.original != null && p.original > p.price;
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
    const cur = getCurrency();
    const cards = document.querySelectorAll('#tk-prod-grid .tk-prod');
    cards.forEach(function (card) {
      const usdP = parseInt(card.dataset.usdPrice, 10) || 0;
      const ilsP = parseInt(card.dataset.ilsPrice, 10) || 0;
      const oUsd = parseInt(card.dataset.originalUsdPrice, 10) || usdP;
      const oIls = parseInt(card.dataset.originalIlsPrice, 10) || ilsP;
      const price = cur === 'usd' ? usdP : ilsP;
      const orig  = cur === 'usd' ? oUsd : oIls;
      const onSale = orig > price && orig > 0;
      const priceEl = card.querySelector('.tk-prod__price');
      if (priceEl) priceEl.innerHTML = priceHTML({ price: price, original: onSale ? orig : null }, cur);
    });
  }

  /* ---------- Cart ---------- */
  // D-08: store BOTH prices on the line so the drawer can re-price on a
  // currency change without re-querying. Reads from the SSR card's dataset.
  function addToCart(card) {
    if (!card) return;
    const id = card.dataset.id;
    const found = cart.filter(function (x) { return x.id === id; })[0];
    if (found) { found.qty += 1; }
    else {
      cart.push({
        id: id,
        name: card.dataset.nameEn || card.dataset.nameHe || '',
        image: card.querySelector('img') ? card.querySelector('img').src : '',
        qty: 1,
        usd_price: parseInt(card.dataset.usdPrice, 10) || 0,
        ils_price: parseInt(card.dataset.ilsPrice, 10) || 0,
      });
    }
    renderCart();
    openCart();
  }
  function removeItem(id) {
    cart = cart.filter(function (x) { return x.id !== id; });
    renderCart();
  }
  function renderCart() {
    const cur = getCurrency();
    const body = $('tk-drawer-body');
    const count = cart.reduce(function (s, it) { return s + it.qty; }, 0);
    const subtotal = cart.reduce(function (s, it) {
      return s + (cur === 'usd' ? it.usd_price : it.ils_price) * it.qty;
    }, 0);

    $('tk-cart-count').textContent = count;
    $('tk-subtotal').textContent = money(subtotal, cur);
    $('tk-checkout').disabled = cart.length === 0;

    body.innerHTML = '';
    if (cart.length === 0) {
      body.appendChild(el('p', 'tk-drawer__empty', 'Your cart is empty.'));
      return;
    }
    cart.forEach(function (it) {
      const lineTotal = (cur === 'usd' ? it.usd_price : it.ils_price) * it.qty;
      const line = el('div', 'tk-line');

      // Build with DOM nodes (textContent / setAttribute) rather than innerHTML so
      // admin-sourced product names/images can't break markup or inject (WR-01).
      const media = el('div', 'tk-line__media');
      const img = document.createElement('img');
      img.setAttribute('src', it.image || '');
      img.setAttribute('alt', it.name || '');
      media.appendChild(img);

      const name = el('span', 'tk-line__name');
      name.textContent = it.name || '';
      const total = el('span', 'tk-line__total');
      total.textContent = money(lineTotal, cur);
      const row = el('div', 'tk-line__row');
      row.appendChild(name);
      row.appendChild(total);

      const qty = el('span', 'tk-line__qty');
      qty.textContent = 'Qty ' + it.qty;
      const remove = el('button', 'tk-line__remove');
      remove.setAttribute('type', 'button');
      remove.textContent = 'Remove Item';
      const meta = el('div', 'tk-line__meta');
      meta.appendChild(qty);
      meta.appendChild(remove);

      const main = el('div', 'tk-line__main');
      main.appendChild(row);
      main.appendChild(meta);

      line.appendChild(media);
      line.appendChild(main);
      remove.addEventListener('click', function () { removeItem(it.id); });
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
  let toastTimer;
  function flash(msg) {
    const t = $('tk-toast');
    t.textContent = msg;
    t.classList.add('is-open');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-open'); }, 2200);
  }

  /* ---------- Smooth scroll ---------- */
  function scrollToShop() {
    const shop = $('tk-shop');
    if (shop) window.scrollTo({ top: shop.getBoundingClientRect().top + window.scrollY - 20, behavior: 'smooth' });
  }
  function onNavigate(label) {
    if (label === 'Home') window.scrollTo({ top: 0, behavior: 'smooth' });
    else if (label === 'Shop') scrollToShop();
    else flash(label + ' — coming soon');
  }

  /* ---------- Wire up ---------- */
  function init() {
    renderProducts();
    renderCart();

    // Featured grid: delegated card-click navigation (D-06) + Add-to-Cart binding.
    // Guarded so the script no-ops when the grid is absent (empty-state band, D-04).
    const grid = document.getElementById('tk-prod-grid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        if (e.target.closest('.tk-prod__add')) return; // let Add-to-Cart handle it
        const card = e.target.closest('.tk-prod');
        if (!card || !card.dataset.slug) return;
        const lang = document.documentElement.lang || 'en';
        window.location.href = '/' + lang + '/product/' + card.dataset.slug;
      });
      grid.querySelectorAll('.tk-prod__add').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          addToCart(btn.closest('.tk-prod'));
        });
      });
    }

    // Re-price the grid AND the (open or closed) cart drawer when the shared
    // currency selector changes — mirrors cartView.js / categoriesView.js.
    window.addEventListener('currency-changed', function (e) {
      const next = e && e.detail && e.detail.currency;
      if (next !== 'usd' && next !== 'ils') return;
      renderProducts();
      renderCart();
    });

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
      a.addEventListener('click', function (e) { e.preventDefault(); flash(a.getAttribute('data-category') + ' — coming soon'); });
    });

    // newsletter
    $('tk-news-form').addEventListener('submit', function (e) {
      e.preventDefault();
      const email = $('tk-news-email').value.trim();
      if (email) { $('tk-news-submit').textContent = 'Thank you'; flash('You’re on the list — thank you'); }
    });

    $('tk-checkout').addEventListener('click', function () { flash('Checkout — coming soon'); });
    // WhatsApp is a real wa.me link (target=_blank) — let it open; no toast stub.

    // Escape closes the drawer
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCart(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
