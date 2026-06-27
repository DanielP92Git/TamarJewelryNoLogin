/* =========================================================
   Tamar Kfir Jewelry — Homepage interactions (vanilla JS)
   No framework. Renders the featured grid price hydration,
   nav smooth-scroll, newsletter submit, and toast feedback.

   Cart integration (Phase 43 Plan 04):
   The demo cart array and drawer machinery (renderCart,
   openCart/closeCart, addToCart, etc.) have been retired.
   The featured grid Add-to-Cart now calls window.tkAddToCart
   (registered by the bundled View.js _bindCartDrawer), which
   calls the real model.handleAddToCart and dispatches the
   global cart:item-added event to auto-open the drawer (D-04).
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

  /* ---------- helpers ---------- */
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

    // Featured grid: delegated card-click navigation + Add-to-Cart binding.
    // Guarded so the script no-ops when the grid is absent (empty-state band).
    const grid = document.getElementById('tk-prod-grid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        if (e.target.closest('.tk-prod__add')) return; // let Add-to-Cart handle it
        const card = e.target.closest('.tk-prod');
        if (!card || !card.dataset.slug) return;
        const lang = document.documentElement.lang || 'en';
        window.location.href = '/' + lang + '/product/' + card.dataset.slug;
      });
      // D-04: re-pointed at the real model via window.tkAddToCart (wired by
      // View.js _bindCartDrawer). Dispatches cart:item-added to auto-open the
      // global drawer (View.js cart:item-added listener, Phase 43 Plan 04).
      grid.querySelectorAll('.tk-prod__add').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          const card = btn.closest('.tk-prod');
          if (window.tkAddToCart) {
            window.tkAddToCart(card);
          }
        });
      });
    }

    // Re-price the grid when the shared currency selector changes.
    // The global cart drawer re-prices itself via the View.js currency-changed
    // listener (_bindCartDrawer) — homepage.js must NOT re-render the drawer.
    window.addEventListener('currency-changed', function (e) {
      const next = e && e.detail && e.detail.currency;
      if (next !== 'usd' && next !== 'ils') return;
      renderProducts();
    });

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

    // WhatsApp is a real wa.me link (target=_blank) — let it open; no toast stub.
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
