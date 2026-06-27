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
  // HTML-escape user/content strings before innerHTML injection.
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- PriceTag markup ---------- */
  function priceHTML(p, cur) {
    const onSale = p.original != null && p.original > p.price;
    return '<div class="tk-price">' +
      '<span class="tk-price__now' + (onSale ? ' is-sale' : '') + '">' + money(p.price, cur) + '</span>' +
      (onSale ? '<span class="tk-price__was">' + money(p.original, cur) + '</span>' : '') +
      '</div>';
  }

  /* ---------- Product modal ----------
     Self-contained product detail modal for featured-grid cards, matching the
     category-page modal (categoriesView.generatePreview) for consistency. All
     data is read from the clicked .tk-prod card's dataset — no API call. Styled
     by homepage.css (.tk-modal*). Add-to-Cart reuses window.tkAddToCart. */
  let modalScrollY = 0;

  // Best available URL for a gallery image entry {desktop, mobile, public*}.
  function bestImg(img) {
    if (!img) return '';
    return img.publicDesktop || img.desktop || img.publicMobile || img.mobile || '';
  }

  function lockBodyScroll() {
    modalScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + modalScrollY + 'px';
    document.body.style.width = '100%';
  }
  function unlockBodyScroll() {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, modalScrollY);
  }

  function escClose(e) { if (e.key === 'Escape') closeProductModal(); }

  function closeProductModal() {
    const modal = $('tk-modal');
    if (!modal || !modal.innerHTML) return;
    modal.innerHTML = '';
    modal.classList.remove('is-open');
    document.removeEventListener('keydown', escClose);
    unlockBodyScroll();
  }

  function openProductModal(card) {
    const modal = $('tk-modal');
    if (!modal) return;

    const isHe = (document.documentElement.lang || 'en') === 'he';
    const dir = isHe ? 'rtl' : 'ltr';
    const title = (isHe ? card.dataset.nameHe : card.dataset.nameEn) ||
      card.dataset.nameEn || card.dataset.nameHe || '';
    const desc = (isHe ? card.dataset.descriptionHe : card.dataset.descriptionEn) ||
      card.dataset.descriptionEn || '';
    const sku = card.dataset.sku || '';

    // Gallery images (same JSON shape as category cards; index 0 = main).
    let images = [];
    try { images = JSON.parse(card.dataset.images || '[]'); } catch (err) { images = []; }
    const urls = images.map(bestImg).filter(Boolean);
    const mainUrl = urls[0] || '';

    // Price (reuse grid helpers so formatting/sale matches the card).
    const cur = getCurrency();
    const usdP = parseInt(card.dataset.usdPrice, 10) || 0;
    const ilsP = parseInt(card.dataset.ilsPrice, 10) || 0;
    const oUsd = parseInt(card.dataset.originalUsdPrice, 10) || usdP;
    const oIls = parseInt(card.dataset.originalIlsPrice, 10) || ilsP;
    const price = cur === 'usd' ? usdP : ilsP;
    const orig = cur === 'usd' ? oUsd : oIls;
    const onSale = orig > price && orig > 0;
    const priceMarkup = priceHTML({ price: price, original: onSale ? orig : null }, cur);

    const priceLabel = isHe ? 'מחיר:' : 'Price:';
    const addText = isHe ? 'הוסף לעגלה' : 'Add to Cart';
    const skuLabel = isHe ? 'מק״ט:' : 'SKU:';

    const thumbsHTML = urls.length > 1
      ? '<div class="tk-modal__thumbs">' + urls.map(function (u, i) {
          return '<button type="button" class="tk-modal__thumb' + (i === 0 ? ' is-active' : '') +
            '" data-index="' + i + '"><img src="' + u + '" alt="' + esc(title) + ' ' + (i + 1) +
            '" loading="lazy" /></button>';
        }).join('') + '</div>'
      : '';

    const mediaHTML = mainUrl
      ? '<img class="tk-modal__big" src="' + mainUrl + '" alt="' + esc(title) + '" />'
      : '<div class="tk-modal__noimg">' + (isHe ? 'אין תמונה' : 'No image') + '</div>';

    const descHTML = desc
      ? '<div class="tk-modal__desc" dir="' + dir + '">' + esc(desc).replace(/\n/g, '<br>') + '</div>'
      : '';
    const skuHTML = sku
      ? '<div class="tk-modal__sku"><span class="tk-modal__sku-label">' + skuLabel +
        '</span> <span class="tk-modal__sku-value" dir="ltr">' + esc(sku) + '</span></div>'
      : '';

    modal.innerHTML =
      '<div class="tk-modal__overlay">' +
        '<div class="tk-modal__content" dir="' + dir + '">' +
          '<button type="button" class="tk-modal__close" aria-label="Close">&times;</button>' +
          '<div class="tk-modal__layout">' +
            thumbsHTML +
            '<div class="tk-modal__media">' + mediaHTML + '</div>' +
            '<div class="tk-modal__specs" dir="' + dir + '">' +
              '<h2 class="tk-modal__title">' + esc(title) + '</h2>' +
              (descHTML || skuHTML ? '<div class="tk-modal__details">' + descHTML + skuHTML + '</div>' : '') +
              '<div class="tk-modal__actions">' +
                '<div class="tk-modal__price"><span class="tk-modal__price-label">' + priceLabel + '</span>' + priceMarkup + '</div>' +
                '<button type="button" class="tk-modal__add">' + addText + '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';

    modal.classList.add('is-open');
    lockBodyScroll();
    document.addEventListener('keydown', escClose);

    // Close: X button + backdrop click.
    modal.querySelector('.tk-modal__close').addEventListener('click', closeProductModal);
    modal.querySelector('.tk-modal__overlay').addEventListener('click', function (e) {
      if (e.target === e.currentTarget) closeProductModal();
    });

    // Thumbnail swap.
    const big = modal.querySelector('.tk-modal__big');
    modal.querySelectorAll('.tk-modal__thumb').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        const idx = parseInt(thumb.dataset.index, 10) || 0;
        if (big && urls[idx]) big.src = urls[idx];
        modal.querySelectorAll('.tk-modal__thumb').forEach(function (t) { t.classList.remove('is-active'); });
        thumb.classList.add('is-active');
      });
    });

    // Add to Cart — reuse the same global the grid button uses, then close
    // (the cart drawer auto-opens via the cart:item-added event).
    modal.querySelector('.tk-modal__add').addEventListener('click', function () {
      if (window.tkAddToCart) window.tkAddToCart(card);
      closeProductModal();
    });
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
        // Open the product modal (replaces the old hard-nav to /lang/product/slug)
        // for parity with the category page. Source card carries all data the
        // modal needs (data-images / names / descriptions / sku / prices).
        openProductModal(card);
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
