import View from '../View.js';
import closeSvg from '../../imgs/svgs/x-solid.svg';
import * as model from '../model.js';
//////////////////////////////////////////////////////////
/**
 *!This javascript file is for all of the categories pages
 **/
/////////////////////////////////////////////////////////

// Create a singleton instance
class CategoriesView extends View {
  constructor() {
    super();
    this.page = 1;
    this.limit = 6;
    this.isLoading = false;
    this.selectedCurrency = 'usd';
    this.sortedByPrice = '';
    this.products = [];
    this.totalProducts = 0;
    this.allProductsFetched = false;
    this.outerProductsContainer = null;
    this.innerProductsContainer = null;
    this.modal = null;
    this.category = null;
    this._categoryName = null;
    this._categoryNameHebrew = null;
    this.lang = 'eng';
    this.initialized = false;
    this.isModalOpen = false;

    // Make sure we detect when the DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
      this.checkAndInitialize();
    });

    // Also check on window load for safety
    window.addEventListener('load', () => {
      this.checkAndInitialize();
    });

    // IMPORTANT: Direct initialization with a timer as a fail-safe
    // This will try to initialize after 1 second, but only if we're on a categories page and not already initialized
    setTimeout(() => {
      if (
        !this.initialized &&
        document.body &&
        document.body.id &&
        document.body.id.includes('categories')
      ) {
        this.checkAndInitialize();

        // If still not initialized, try one more time with direct category detection
        if (!this.initialized) {
          try {
            const body = document.querySelector('body');
            const idParts = body.id.split(' ');
            const categoryName = idParts[idParts.length - 1];
            const categoryNameHebrew = body.dataset.hebrew;

            this.directInitialize(categoryName, categoryNameHebrew);
          } catch (err) {
            console.error('Error in direct initialization:', err);
          }
        }
      }
    }, 1000);
  }

  // Direct initialization method that bypasses checks
  directInitialize(category, categoryNameHebrew) {
    if (!category) {
      console.error('Cannot directly initialize without a category');
      return;
    }

    // Force initialization
    this.outerProductsContainer = document.querySelector(
      '.outer-products-container'
    );
    this.innerProductsContainer = document.querySelector(
      '.inner-products-container'
    );
    this.modal = document.querySelector('.modal');
    this.category = category;
    this._categoryName = category;
    this._categoryNameHebrew = categoryNameHebrew;
    this.lang = localStorage.getItem('language') || 'eng';

    this.initialSetup();
    this.initialized = true;

    // Force a products fetch to be sure
    setTimeout(() => {
      this.fetchProductsByCategory();
    }, 500);
  }

  // New method to check if we're on a categories page and initialize if needed
  checkAndInitialize() {
    if (this.initialized) {
      return;
    }

    const body = document.querySelector('body');

    if (!body || !body.id || !body.id.includes('categories')) {
      return;
    }

    const idParts = body.id.split(' ');
    const categoryName = idParts[idParts.length - 1];
    const categoryNameHebrew = body.dataset.hebrew;

    this.initialize(null, categoryName, categoryNameHebrew);
  }

  initialize(parentElement, category, categoryNameHebrew, lang) {
    // Only do the full initialization once
    if (!this.initialized) {
      this.outerProductsContainer = document.querySelector(
        '.outer-products-container'
      );

      this.innerProductsContainer = document.querySelector(
        '.inner-products-container'
      );

      this.modal = document.querySelector('.modal');

      this.category = category;
      this._categoryName = category;
      this._categoryNameHebrew = categoryNameHebrew;
      this.lang = lang || localStorage.getItem('language') || 'eng';

      // Initial fetch and setup
      if (
        document.readyState === 'complete' ||
        document.readyState === 'interactive'
      ) {
        this.initialSetup();
      } else {
        window.addEventListener('load', () => {
          this.initialSetup();
        });
      }
      this.initialized = true;
    }
  }

  initialSetup() {
    this.fetchProductsByCategory();
    this.setupScrollListener();
    this.addHandlerAddToCart();
    this.addHandlerPreview();

    let lng = localStorage.getItem('language');
    if (!lng) {
      localStorage.setItem('language', 'eng');
      lng = 'eng';
    }
    this.lang = lng;
    this.setHeaderLng(this.lang);
  }

  // Updated method for page-specific LANGUAGE updates only
  setPageSpecificLanguage(lng, cartNum) {
    // Temporarily disable scroll listener during language change
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
    }

    this.lang = lng; // Update internal language state

    // 1. Update Category Header
    this.setHeaderLng(lng);

    // 2. Update Sort/Currency Dropdown Option TEXT
    this.updateCurSortOptionText(lng);

    // 3. Update all product-related text
    const products =
      this.innerProductsContainer?.querySelectorAll('.item-container');
    if (products) {
      products.forEach(product => {
        // Update "Add to Cart" button text
        const addToCartBtn = product.querySelector('.add-to-cart-btn');
        if (addToCartBtn) {
          const isAdded =
            addToCartBtn.textContent.includes('Added') ||
            addToCartBtn.textContent.includes('נוסף');
          addToCartBtn.textContent = isAdded
            ? lng === 'eng'
              ? 'Added to Cart'
              : 'נוסף לסל'
            : lng === 'eng'
            ? 'Add to Cart'
            : 'הוסף לסל';
        }

        // Update price label if it exists
        const priceLabel = product.querySelector('.price-text');
        if (priceLabel) {
          priceLabel.textContent = lng === 'eng' ? 'Price:' : 'מחיר:';
        }
      });
    }

    // Re-enable scroll listener after language change
    if (this.scrollHandler) {
      window.addEventListener('scroll', this.scrollHandler);
    }
  }

  // New helper method to update only the text of dropdown options
  updateCurSortOptionText(lng) {
    const currencySelect = document.getElementById('currency');
    const sortSelect = document.getElementById('sort');

    if (currencySelect) {
      currencySelect.options[0].text = lng === 'eng' ? 'Currency' : 'מטבע';
      currencySelect.options[1].text = lng === 'eng' ? 'USD' : 'דולר';
      currencySelect.options[2].text = lng === 'eng' ? 'ILS' : 'שקל';
    }
    if (sortSelect) {
      sortSelect.options[0].text = lng === 'eng' ? 'Sort by:' : 'מיין לפי:';
      sortSelect.options[1].text =
        lng === 'eng' ? 'Price (Low to High)' : 'מחיר (מנמוך לגבוה)';
      sortSelect.options[2].text =
        lng === 'eng' ? 'Price (High to Low)' : 'מחיר (מגבוה לנמוך)';
    }
  }

  // New helper method to update button text
  updateAddToCartButtonText(lng) {
    const buttons =
      this.innerProductsContainer.querySelectorAll('.add-to-cart-btn');
    const buttonText = lng === 'eng' ? 'Add to Cart' : 'הוסף לסל';
    buttons.forEach(btn => {
      // Avoid changing if it currently says "Added..."
      if (
        !btn.textContent.includes('Added') &&
        !btn.textContent.includes('נוסף')
      ) {
        btn.textContent = buttonText;
      }
    });
  }

  setCurSortLng(lng) {
    const curSortContainer = document.querySelector('.currency-sort-container');
    curSortContainer.innerHTML = '';
    const markup = this.handleCurSortLng(lng);
    curSortContainer.insertAdjacentHTML('afterbegin', markup);
  }

  handleCurSortLng(lng) {
    const curSortContainer = document.querySelector('.currency-sort-container');
    curSortContainer.style.direction = 'ltr';

    if (lng === 'eng') {
      return `<select name="currency" id="currency">
        <option value="default" class="currency-option">Currency</option>
        <option value="usd" class="currency-option">USD</option>
        <option value="ils" class="currency-option">ILS</option>
      </select>
      <select name="sort" id="sort">
        <option value="default" class="sort-option">Sort by:</option>
        <option value="low-to-high" class="sort-option">
          Price (Low to High)
        </option>
        <option value="high-to-low" class="sort-option">
          Price (High to Low)
        </option>
      </select>`;
    } else if (lng === 'heb') {
      curSortContainer.style.direction = 'rtl';

      return `<select name="currency" id="currency">
        <option value="default" class="currency-option">מטבע</option>
        <option value="usd" class="currency-option">דולר</option>
        <option value="ils" class="currency-option">שקל</option>
      </select>
      <select name="sort" id="sort">
        <option value="default" class="sort-option">מיין לפי:</option>
        <option value="low-to-high" class="sort-option">
          מחיר (מנמוך לגבוה)
        </option>
        <option value="high-to-low" class="sort-option">
          מחיר (מגבוה לנמוך)
        </option>
      </select>`;
    }
  }

  setHeaderLng(lng) {
    const categoryTitle = document.querySelector('.category-title');
    if (lng === 'eng') {
      categoryTitle.style.fontFamily = 'Raleway, sans-serif';
      categoryTitle.style.fontSize = '1.5rem';
      categoryTitle.textContent = this.category.toUpperCase();
    }
    if (lng === 'heb') {
      categoryTitle.style.fontFamily = `'Amatic SC', sans-serif`;
      categoryTitle.style.fontSize = '2.3rem';
      categoryTitle.textContent = this._categoryNameHebrew;
    }
  }

  increaseCartNumber() {
    this._cartNumber.forEach(cartNum => {
      this._cartNewValue = +cartNum.textContent + 1;
      cartNum.textContent = this._cartNewValue;
    });
  }

  decreaseCartNumber() {
    this._cartNumber.forEach(cartNum => {
      this._cartNewValue = +cartNum.textContent - 1;
      cartNum.textContent = this._cartNewValue;
    });
  }

  //   persistCartNumber(num) {
  //     console.log(num)
  //     this._cartNumber = document.querySelectorAll('.cart-number');
  // console.log('here')
  //     this._cartNumber.forEach(cartNum => {
  //       cartNum.textContent = num;
  //     });
  //   }

  addCategoriesHandler = function (handler) {
    window.addEventListener('load', handler);
  };

  /**
   * * --Image Flipper--
   */
  _imageFlipper() {
    const frontImages = document.querySelectorAll('.front-image');
    const rearImages = document.querySelectorAll('.rear-image');

    frontImages.forEach(img =>
      img.addEventListener('mouseover', function () {
        img.style.opacity = 0;
        rearImages.forEach(img => (img.style.opacity = 1));
      })
    );

    frontImages.forEach(img =>
      img.addEventListener('mouseleave', function () {
        img.style.opacity = 1;
        rearImages.forEach(img => (img.style.opacity = 0));
      })
    );
  }

  //////////////////////////////////////////////////

  addHandlerAddToCart() {
    document.addEventListener('click', this.addToCart.bind(this));
  }

  addToCart(e) {
    let btn = e.target.closest('.add-to-cart-btn');

    if (!btn) return;
    const item = btn.closest('.item-container');
    this._cartNumber = document.querySelectorAll('.cart-number');

    this.increaseCartNumber();

    btn.textContent =
      this.lang === 'eng' ? 'Added to Your Cart!' : 'המוצר נוסף לסל הקניות';

    setTimeout(() => {
      btn.textContent = this.lang === 'eng' ? 'Added to Cart' : 'הוסף לסל';
      btn.style.backgroundColor = '#e8a58a8f';
    }, 2000);

    model.handleAddToCart(item);
  }

  addFromPrev(data) {
    this.increaseCartNumber();
    model.handleAddToCart(data);

    let addedMsg = document.querySelector('.added-message');
    addedMsg.classList.remove('hide');
    setTimeout(() => {
      addedMsg.classList.add('hide');
    }, 3000);
  }

  //////////////////////////////////////////////////

  addHandlerPreview() {
    const _openItemModal = function (e) {
      const clicked = e.target.closest('.item-container');
      if (!clicked) return;

      const id = clicked.dataset.id;
      const filtered = this.products.find(prod => prod.id == id);
      if (!filtered) return; // Add check if product not found

      const addToCart = e.target.closest('.add-to-cart-btn');
      if (addToCart) return;

      const smallImages = filtered.smallImages || [];
      const hasMultipleImages = smallImages.length > 1;

      const imageMarkup = smallImages
        .map(
          img => `
          <div class="small-image-div">
        <img class="small-image" src="${img}" alt="" loading="lazy">
        </div>
      `
        )
        .join('');

      this.generatePreview(clicked, imageMarkup, hasMultipleImages);
    };
    this.innerProductsContainer.addEventListener(
      'click',
      _openItemModal.bind(this)
    );
  }

  _closeItemModal(e) {
    const modal = document.querySelector('.modal');

    if (!e.target) return;

    modal.innerHTML = '';
  }

  closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
      modal.innerHTML = '';
      this.isModalOpen = false;
    }
  }

  generatePreview(item, imageMarkup, hasMultipleImages) {
    const data = item;
    if (!data) return;

    const id = data.dataset.id;
    const quantity = data.dataset.quant;
    const image = data.querySelector('.image-item').src;
    const title = data.querySelector('.item-title').textContent;
    const description = data.querySelector('.item-description').innerHTML;
    const price = data.querySelector('.item-price').textContent;
    const currency = data.dataset.currency;

    // We already converted newlines to <br> tags in getProductMarkup
    // No need to reprocess as we're using innerHTML directly

    // Close the previous modal if open
    if (this.isModalOpen) {
      this.closeModal();
    }

    // Create modal content
    const modal = document.querySelector('.modal');
    const addToCartText = this.lang === 'eng' ? 'Add to Cart' : 'הוסף לסל';
    const addedText =
      this.lang === 'eng' ? 'Added to Cart!' : 'נוסף לסל הקניות';

    const modalMarkup = `
      <div class="item-overlay">
        <div class="modal-item-container">
          <img src="${closeSvg}" alt="close-icon" class="close-modal-btn" />
          <div class="images-container">
            <img src="${image}" alt="${title}" class="big-image" />
            ${
              hasMultipleImages
                ? `<div class="small-images-container">${imageMarkup}</div>`
                : ''
            }
          </div>
          <div class="item-specs">
            <h2 class="item-title_modal">${title}</h2>
            <p class="item-description_modal">${description}</p>
            <span class="price-text">${
              this.lang === 'eng' ? 'Price:' : 'מחיר:'
            }</span>
            <p class="item-price_modal">${price}</p>
            <button class="add-to-cart-btn_modal" data-id="${id}" data-quant="${quantity}">${addToCartText}</button>
            <p class="added-message hide">${addedText}</p>
          </div>
        </div>
      </div>
    `;

    modal.innerHTML = modalMarkup;
    this.isModalOpen = true;

    // Add event listeners
    const closeBtn = modal.querySelector('.close-modal-btn');
    closeBtn.addEventListener('click', this.closeModal.bind(this));

    // Close modal when clicking outside the modal content
    const overlay = modal.querySelector('.item-overlay');
    if (overlay) {
      overlay.addEventListener('click', e => {
        // Only close if clicking directly on the overlay, not on its children
        if (e.target === overlay) {
          this.closeModal();
        }
      });
    }

    const addToCartBtn = modal.querySelector('.add-to-cart-btn_modal');
    addToCartBtn.addEventListener('click', () => {
      const dataObj = {
        dataset: {
          id: addToCartBtn.dataset.id,
          quant: addToCartBtn.dataset.quant,
        },
      };

      this.addFromPrev(dataObj);
    });

    // Handle small images if present
    if (hasMultipleImages) {
      const smallImages = modal.querySelectorAll('.small-image');
      const bigImage = modal.querySelector('.big-image');

      smallImages.forEach(img => {
        img.addEventListener('click', () => {
          bigImage.src = img.src;
        });
      });
    }
  }

  setupCurrencyHandler() {
    const currencySelector = document.getElementById('currency');

    currencySelector.addEventListener('change', () => {
      const spinner = this.outerProductsContainer.querySelector('.loader');
      spinner.classList.remove('spinner-hidden');

      this.selectedCurrency = currencySelector.value;
      this.page = 1; // Reset page when currency changes
      this.fetchProductsByCategory();
    });
  }

  setupSortHandler() {
    const sortSelector = document.getElementById('sort');
    sortSelector.addEventListener('change', () => {
      this.sortedByPrice = sortSelector.value;
      this.sortAndDisplayProducts();
    });
  }

  async fetchProductsByCategory() {
    if (this.isLoading) {
      return;
    }

    if (!this.category) {
      console.error('[CategoriesView] No category specified, cannot fetch');
      return;
    }

    this.isLoading = true;

    const spinner = this.outerProductsContainer?.querySelector('.loader');
    if (spinner) {
      spinner.classList.remove('spinner-hidden');
    }

    try {
      const apiUrl = `${process.env.API_URL}`;
      const fetchUrl = `${apiUrl}/productsByCategory`;

      const payload = { category: this.category, page: this.page };

      // Create the request with proper error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'same-origin',
      };

      try {
        const response = await fetch(fetchUrl, requestOptions);
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[CategoriesView] Error response:', errorText);
          throw new Error(
            `HTTP error! status: ${response.status}, details: ${errorText}`
          );
        }

        const data = await response.json();

        // Check for the updated response format
        if (!data || (!data.products && !Array.isArray(data))) {
          console.error('[CategoriesView] Invalid data format received:', data);
          return;
        }

        // Handle both old and new response formats
        if (Array.isArray(data)) {
          // Old format - direct array of products
          this.products = data;
          this.totalProducts = data.length;
        } else {
          // New format - object with products array and metadata
          this.products = Array.isArray(data.products) ? data.products : [];
          this.totalProducts = data.total || 0;

          // Check if we've reached the end
          if (data.hasMore === false) {
            this.allProductsFetched = true;
          }
        }

        // Only display if we have products
        if (this.products.length > 0) {
          this.displayProducts();
        } else {
          this.allProductsFetched = true;
        }
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          console.error('[CategoriesView] Fetch request timed out');
        } else {
          console.error('[CategoriesView] Fetch error:', fetchError);
        }

        // Fall back to XMLHttpRequest for maximum compatibility
        this.fallbackXhrRequest(fetchUrl, payload);
      }
    } catch (err) {
      console.error('[CategoriesView] Failed to fetch products:', err);
    } finally {
      this.isLoading = false;
      if (spinner) {
        spinner.classList.add('spinner-hidden');
      }
    }
  }

  // Fallback method using XMLHttpRequest
  fallbackXhrRequest(url, payload) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 10000; // 10 second timeout

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);

          if (!data || !data.products) {
            console.error('[CategoriesView] XHR invalid data format');
            return;
          }

          // Store the products array
          this.products = Array.isArray(data.products) ? data.products : [];
          this.totalProducts = data.total || 0;

          // Only display if we have products
          if (this.products.length > 0) {
            this.displayProducts();
          } else {
            this.allProductsFetched = true;
          }
        } catch (parseError) {
          console.error('[CategoriesView] XHR JSON parse error:', parseError);
        }
      } else {
        console.error('[CategoriesView] XHR error with status:', xhr.status);
      }
    };

    xhr.onerror = () => {
      console.error('[CategoriesView] XHR network error');
    };

    xhr.ontimeout = () => {
      console.error('[CategoriesView] XHR request timed out');
    };

    xhr.send(JSON.stringify(payload));
  }

  async fetchMoreProducts() {
    if (this.isLoading || this.allProductsFetched || !this.initialized) return;
    this.isLoading = true;

    try {
      const page = this.page;
      const category = this.category;
      const spinner = this.outerProductsContainer?.querySelector('.loader');

      if (spinner) {
        spinner.classList.remove('spinner-hidden');
      }

      const apiUrl = `${process.env.API_URL}`;
      const fetchUrl = `${apiUrl}/productsByCategory`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, page }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.products) {
        this.allProductsFetched = true;
        return;
      }

      const newProducts = Array.isArray(data.products) ? data.products : [];

      if (newProducts.length === 0) {
        this.allProductsFetched = true;
        return;
      }

      // Append new products to existing array
      this.products = [...this.products, ...newProducts];
      this.displayMoreProducts();
    } catch (err) {
      console.error('[CategoriesView] Failed to fetch more products:', err);
      this.allProductsFetched = true;
    } finally {
      this.isLoading = false;
      const spinner = this.outerProductsContainer?.querySelector('.loader');
      if (spinner) {
        spinner.classList.add('spinner-hidden');
      }
    }
  }

  sortAndDisplayProducts() {
    // Sort products by price
    this.products.sort((a, b) => {
      const priceA =
        this.selectedCurrency === 'usd' ? a.ils_price / 3.7 : a.ils_price;
      const priceB =
        this.selectedCurrency === 'usd' ? b.ils_price / 3.7 : b.ils_price;
      return this.sortedByPrice === 'low-to-high'
        ? priceA - priceB
        : priceB - priceA;
    });

    this.page = 1;
    this.displayProducts();
  }

  displayProducts() {
    if (!this.innerProductsContainer) {
      console.error('[CategoriesView] No inner products container found');
      return;
    }

    this.innerProductsContainer.innerHTML = '';
    const markup = this.products
      .map(item => this.getProductMarkup(item))
      .join('');
    this.innerProductsContainer.insertAdjacentHTML('beforeend', markup);
  }

  displayMoreProducts() {
    // this.innerProductsContainer.innerHTML = '';

    const productsToShow = this.products.slice(this.page, this.limit);

    const markup = productsToShow
      .map(item => this.getProductMarkup(item))
      .join('');

    this.innerProductsContainer.insertAdjacentHTML('beforeend', markup);
  }

  setupScrollListener() {
    let timeout;

    this.scrollHandler = () => {
      if (timeout) clearTimeout(timeout);
      if (this.isLoading || !this.initialized) return;

      timeout = setTimeout(() => {
        const scrollTop = window.scrollY;
        const windowHeight = window.innerHeight;
        const productsContainerBottom =
          this.outerProductsContainer?.getBoundingClientRect()?.bottom;

        if (!productsContainerBottom) return;

        if (
          productsContainerBottom <= windowHeight + 100 &&
          !this.allProductsFetched
        ) {
          this.page++;
          this.fetchMoreProducts();
        }
      }, 100);
    };

    window.addEventListener('scroll', this.scrollHandler);
  }

  getProductMarkup(item) {
    const { id, quantity, image, name, description, ils_price } = item;
    const curSign = this.selectedCurrency === 'usd' ? '$' : '₪';
    const price =
      this.selectedCurrency === 'usd'
        ? Number((ils_price / 3.7).toFixed(0))
        : ils_price;

    // Convert newlines in description to <br> tags
    const formattedDescription = description
      ? description.replace(/\n/g, '<br>')
      : '';

    return `
      <div class="item-container" data-id="${id}" data-quant="${quantity}" data-currency="${curSign}">
        <div class="product-image-container">
          <div class="loading-spinner"></div>
          <img class="image-item front-image" src="${image}" loading="lazy" 
               onload="
                 // Hide spinner
                 this.parentElement.querySelector('.loading-spinner').style.display = 'none';
                 // Add loaded class to image
                 this.classList.add('loaded');
               "
          />
        </div>
        <button class="add-to-cart-btn">${
          this.lang === 'eng' ? 'Add to Cart' : 'הוסף לסל'
        }</button>
        <div class="item-title">${name}</div>
        <div class="item-description">${formattedDescription}</div>
        <div class="item-price">${curSign}${price}</div>
      </div>`;
  }

  async changeToHeb() {
    try {
      localStorage.setItem('language', 'heb');
      // First call the base class setLanguage
      await super.setLanguage('heb', 0);
      // Then handle category-specific language changes
      this.setPageSpecificLanguage('heb', 0);
      // Update existing product text without refetching
      this.updateExistingProductText('heb');
    } catch (error) {
      console.error('[CategoriesView] Error in changeToHeb:', error);
    }
  }

  async changeToEng() {
    try {
      localStorage.setItem('language', 'eng');
      // First call the base class setLanguage
      await super.setLanguage('eng', 0);
      // Then handle category-specific language changes
      this.setPageSpecificLanguage('eng', 0);
      // Update existing product text without refetching
      this.updateExistingProductText('eng');
    } catch (error) {
      console.error('[CategoriesView] Error in changeToEng:', error);
    }
  }

  // New method to update text content of existing products
  updateExistingProductText(lng) {
    if (!this.innerProductsContainer) {
      console.error('[CategoriesView] No inner products container found');
      return;
    }

    const products =
      this.innerProductsContainer.querySelectorAll('.item-container');

    products.forEach(product => {
      // Update "Add to Cart" button text
      const addToCartBtn = product.querySelector('.add-to-cart-btn');
      if (addToCartBtn) {
        addToCartBtn.textContent = lng === 'eng' ? 'Add to Cart' : 'הוסף לסל';
      }

      // Update "Added to Cart" message if present
      const addedMessage = product.querySelector('.added-message');
      if (addedMessage) {
        addedMessage.textContent = lng === 'eng' ? 'Added to Cart' : 'נוסף לסל';
      }

      // Update "Price" text
      const priceText = product.querySelector('.price-text');
      if (priceText) {
        priceText.textContent = lng === 'eng' ? 'Price:' : 'מחיר:';
      }
    });
  }
}

// Create a singleton instance and export it
const categoriesView = new CategoriesView();
export default categoriesView;
