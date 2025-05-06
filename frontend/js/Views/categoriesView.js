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
    this.exchangeRate = 3.7;
    this.isProduction =
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';
    this.apiUrl = this.isProduction
      ? 'https://lobster-app-jipru.ondigitalocean.app/api'
      : 'http://localhost:4000';

    // Add resize observer for debugging
    if (process.env.NODE_ENV !== 'production') {
      this.setupImageSourceDebugger();
    }

    // Make sure we detect when the DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
      this.checkAndInitialize();
    });

    // Also check on window load for safety
    window.addEventListener('load', () => {
      this.checkAndInitialize();
    });

    // IMPORTANT: Direct initialization with a timer as a fail-safe
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

    // Initialize currency and sort toggles
    this.setCurSortLng(this.lang);
    this.setupCurrencyHandler();
    this.setupSortHandler();
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

    // Create a complete object with all necessary data
    const mockElement = {
      dataset: {
        id: data.dataset.id,
        quant: data.dataset.quant,
        price: data.dataset.price,
        currency: this.selectedCurrency,
      },
      getAttribute: function (attr) {
        switch (attr) {
          case 'data-id':
            return this.dataset.id;
          case 'data-quant':
            return this.dataset.quant;
          case 'data-price':
            return this.dataset.price;
          default:
            return null;
        }
      },
      querySelector: function (selector) {
        const modalElement = document.querySelector('.modal');
        if (!modalElement) return null;

        switch (selector) {
          case '.front-image':
            return { src: modalElement.querySelector('.big-image')?.src };
          case '.item-title':
            return {
              textContent:
                modalElement.querySelector('.item-title_modal')?.textContent,
            };
          case '.item-price':
            return {
              textContent:
                modalElement.querySelector('.price-text')?.textContent,
            };
          default:
            return null;
        }
      },
    };

    model.handleAddToCart(mockElement);

    // Update button text
    const addToCartBtn = document.querySelector('.add-to-cart-btn_modal');
    if (addToCartBtn) {
      const originalText = addToCartBtn.textContent;
      addToCartBtn.textContent =
        this.lang === 'eng' ? 'Added to Cart!' : 'נוסף לסל!';
      addToCartBtn.style.backgroundColor = '#4caf50'; // Change to success color

      setTimeout(() => {
        addToCartBtn.textContent = originalText;
        addToCartBtn.style.backgroundColor = '#4a90e2'; // Restore original color
      }, 2000);
    }
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
    const title = data.querySelector('.item-title').textContent;
    const product = this.products.find(prod => prod.id == id);
    const description = (
      product?.description ||
      data.querySelector('.item-description')?.innerHTML ||
      ''
    )
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Replace multiple line breaks with double line breaks
      .trim(); // Remove extra whitespace
    const price = data.querySelector('.item-price').textContent;
    const currency = data.dataset.currency;

    // Get the image URL directly from the clicked item and ensure HTTPS
    const clickedImageUrl = this.ensureHttps(
      data.querySelector('.front-image')?.src
    );

    // Helper function to get the appropriate image URL based on structure
    const getImageUrl = (imageData, preferDesktop = true) => {
      if (!imageData) return '';

      // If it's a string, return it directly with HTTPS
      if (typeof imageData === 'string') {
        return imageData.includes('http') ? this.ensureHttps(imageData) : '';
      }

      // New structure with desktop/mobile properties
      if (typeof imageData === 'object') {
        // Check if it's the new format with specific properties
        if (imageData.desktop || imageData.mobile || imageData.publicDesktop) {
          // Try public URLs first
          if (imageData.publicDesktop && preferDesktop)
            return this.ensureHttps(imageData.publicDesktop);
          if (imageData.publicMobile && !preferDesktop)
            return this.ensureHttps(imageData.publicMobile);

          // Then try regular URLs
          if (imageData.desktop && preferDesktop)
            return this.ensureHttps(imageData.desktop);
          if (imageData.mobile && !preferDesktop)
            return this.ensureHttps(imageData.mobile);

          // Then try local URLs
          if (imageData.desktopLocal && preferDesktop)
            return this.ensureHttps(imageData.desktopLocal);
          if (imageData.mobileLocal && !preferDesktop)
            return this.ensureHttps(imageData.mobileLocal);
        }

        // If it's the old format with direct URLs
        if (imageData.url) return this.ensureHttps(imageData.url);
        if (imageData.imageUrl) return this.ensureHttps(imageData.imageUrl);

        // If we have a string property that looks like a URL
        const values = Object.values(imageData);
        const validUrl = values.find(
          val =>
            typeof val === 'string' &&
            val.includes('http') &&
            (val.includes('/uploads/') || val.includes('/smallImages/'))
        );
        if (validUrl) return this.ensureHttps(validUrl);
      }

      return '';
    };

    // Get main image URLs with fallbacks and ensure HTTPS
    const mainDesktopImage = this.ensureHttps(
      clickedImageUrl ||
        getImageUrl(product?.mainImage, true) ||
        product?.image ||
        ''
    );

    const mainMobileImage = this.ensureHttps(
      getImageUrl(product?.mainImage, false) ||
        product?.image ||
        mainDesktopImage
    );

    // Process small images - ensure we get the actual URLs
    let smallImagesArray = [];

    // Get the base API URL based on environment
    const apiBaseUrl =
      process.env.NODE_ENV === 'production'
        ? 'https://lobster-app-jipru.ondigitalocean.app/api'
        : 'http://localhost:4000';

    // Handle old format (array of strings)
    if (Array.isArray(product?.smallImagesLocal)) {
      smallImagesArray = product.smallImagesLocal.map(url => {
        // If it's a full URL, ensure HTTPS
        if (url.includes('http')) {
          return this.ensureHttps(url);
        }
        // If it's a relative path, construct the full URL
        return `${apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
      });
    }
    // Handle old format (array of URLs)
    else if (Array.isArray(product?.smallImages)) {
      smallImagesArray = product.smallImages.map(img => {
        if (typeof img === 'string') {
          if (img.includes('http')) {
            return this.ensureHttps(img);
          }
          // If it's a relative path, construct the full URL
          return `${apiBaseUrl}${img.startsWith('/') ? '' : '/'}${img}`;
        }
        return getImageUrl(img, true) || getImageUrl(img, false) || '';
      });
    }

    // Filter out any invalid URLs and ensure HTTPS
    smallImagesArray = smallImagesArray
      .filter(url => typeof url === 'string' && url.length > 0)
      .map(url => this.ensureHttps(url));

    // Close the previous modal if open
    if (this.isModalOpen) {
      this.closeModal();
    }

    // Create modal content
    const modal = document.querySelector('.modal');
    const addToCartText = this.lang === 'eng' ? 'Add to Cart' : 'הוסף לסל';

    const modalContent = `
      <div class="item-overlay">
        <div class="modal-content">
          <div class="images-container">
            <div class="magnifier-container">
              <img 
                class="big-image" 
                src="${mainDesktopImage}"
                alt="${title}"
                loading="lazy"
                crossorigin="anonymous"
                onerror="this.onerror=null; this.crossOrigin=''; this.src='${mainDesktopImage}';"
              />
              <div class="loading-indicator">Loading...</div>
            </div>
            ${
              smallImagesArray && smallImagesArray.length > 0
                ? `<div class="small-images-container">
                    ${smallImagesArray
                      .map(
                        (imgUrl, index) => `
                        <div class="small-image-div${
                          index === 0 ? ' active' : ''
                        }" data-index="${index}">
                          <img 
                            class="small-image" 
                            src="${imgUrl}" 
                            alt="Product view ${index + 1}"
                            loading="lazy"
                            crossorigin="anonymous"
                            onerror="this.onerror=null; this.crossOrigin=''; this.src='${imgUrl}';"
                          />
                        </div>
                      `
                      )
                      .join('')}
                  </div>`
                : ''
            }
            </div>
          <div class="item-specs" dir="${this.lang === 'heb' ? 'rtl' : 'ltr'}">
            <h2 class="item-title_modal" style="text-align: ${
              this.lang === 'heb' ? 'right' : 'left'
            }">${title}</h2>
            ${
              description
                ? `<div class="item-description_modal" style="text-align: ${
                    this.lang === 'heb' ? 'right' : 'left'
                  }">${description.replace(/\n/g, '<br>')}</div>`
                : ''
            }
            <div class="price-container">
              <span class="price-label">${
                this.lang === 'eng' ? 'Price:' : 'מחיר:'
              }</span>
              <span class="price-text">${price}</span>
            </div>
            <button class="add-to-cart-btn_modal" data-id="${id}" data-quant="${quantity}" data-price="${price}">
              ${addToCartText}
            </button>
          </div>
          <button class="close-modal-btn">✕</button>
        </div>
      </div>
      <div class="fullscreen-gallery">
        <button class="close-gallery">✕</button>
        <button class="prev-image">❮</button>
        <button class="next-image">❯</button>
        <div class="gallery-container">
          <img 
            class="gallery-image" 
            src="${mainDesktopImage}" 
            alt="${title}"
            crossorigin="anonymous"
            onerror="this.onerror=null; this.crossOrigin=''; this.src='${mainDesktopImage}';"
          />
        </div>
      </div>
    `;

    modal.innerHTML = modalContent;
    this.isModalOpen = true;
    this._setupModalEventListeners();
  }

  setupCurrencyHandler() {
    const currencySelector = document.getElementById('currency');

    currencySelector.addEventListener('change', async () => {
      const spinner = this.outerProductsContainer.querySelector('.loader');
      spinner.classList.remove('spinner-hidden');

      try {
        this.selectedCurrency = currencySelector.value;

        // If we have a sort order active, fetch all products and sort them
        if (this.sortedByPrice !== '') {
          const apiUrl = `${process.env.API_URL}`;
          const response = await fetch(`${apiUrl}/getAllProductsByCategory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: this.category }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          if (!data || !data.products) {
            console.error(
              '[CategoriesView] Invalid data format received:',
              data
            );
            return;
          }

          // Store all products and sort them
          this.products = data.products;
          this.totalProducts = data.total;
          this.allProductsFetched = true;

          // Sort products by price
          this.products.sort((a, b) => {
            // Convert prices to the selected currency
            const priceA =
              this.selectedCurrency === 'usd'
                ? a.ils_price / this.exchangeRate
                : a.ils_price;
            const priceB =
              this.selectedCurrency === 'usd'
                ? b.ils_price / this.exchangeRate
                : b.ils_price;

            // Sort based on the converted prices
            return this.sortedByPrice === 'low-to-high'
              ? priceA - priceB
              : priceB - priceA;
          });

          // Display sorted products
          this.displayProducts();
        } else {
          // If no sort order, just fetch paginated products
          this.page = 1;
          await this.fetchProductsByCategory();
        }
      } catch (err) {
        console.error('[CategoriesView] Error in currency handler:', err);
      } finally {
        if (spinner) {
          spinner.classList.add('spinner-hidden');
        }
      }
    });
  }

  setupSortHandler() {
    const sortSelector = document.getElementById('sort');
    sortSelector.addEventListener('change', async () => {
      const spinner = this.outerProductsContainer?.querySelector('.loader');
      if (spinner) {
        spinner.classList.remove('spinner-hidden');
      }

      try {
        this.sortedByPrice = sortSelector.value;

        if (this.sortedByPrice === 'default') {
          // Reset to initial state and fetch with pagination
          this.page = 1;
          this.products = [];
          this.allProductsFetched = false;
          await this.fetchProductsByCategory();
        } else {
          // Always fetch all products for sorting
          const response = await fetch(
            `${this.apiUrl}/getAllProductsByCategory`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ category: this.category }),
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          if (!data || !data.products) {
            console.error(
              '[CategoriesView] Invalid data format received:',
              data
            );
            return;
          }

          // Store all products and sort them
          this.products = data.products;
          this.totalProducts = data.total;
          this.allProductsFetched = true;

          // Sort products by price
          this.products.sort((a, b) => {
            // Convert prices to the selected currency
            const priceA =
              this.selectedCurrency === 'usd'
                ? a.ils_price / this.exchangeRate
                : a.ils_price;
            const priceB =
              this.selectedCurrency === 'usd'
                ? b.ils_price / this.exchangeRate
                : b.ils_price;

            // Sort based on the converted prices
            return this.sortedByPrice === 'low-to-high'
              ? priceA - priceB
              : priceB - priceA;
          });

          // Display sorted products
          this.displayProducts();
        }
      } catch (err) {
        console.error('[CategoriesView] Error in sort handler:', err);
      } finally {
        if (spinner) {
          spinner.classList.add('spinner-hidden');
        }
      }
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
      const fetchUrl = `${this.apiUrl}/productsByCategory`;

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
      // console.log('[DEBUG] Fetching more products from:', fetchUrl);
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, page }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // console.log('[DEBUG] Fetched data:', data);

      if (!data) {
        this.allProductsFetched = true;
        return;
      }

      const newProducts = Array.isArray(data) ? data : [];

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
    this.innerProductsContainer.innerHTML = '';

    const productsToShow = this.products;
    // console.log('[DEBUG] Products to show:', productsToShow);

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
        ? Number((ils_price / this.exchangeRate).toFixed(0))
        : ils_price;

    // Format description
    const formattedDescription = description
      ? description.replace(/\n/g, '<br>')
      : '';

    // Get desktop and mobile image URLs with proper fallbacks and ensure HTTPS
    const desktopImage = this.ensureHttps(
      item.mainImage?.desktop ||
        item.mainImage?.publicDesktop ||
        item.publicImage ||
        item.image
    );
    const mobileImage = this.ensureHttps(
      item.mainImage?.mobile ||
        item.mainImage?.publicMobile ||
        item.mainImage?.desktop ||
        item.image
    );

    return `
      <div class="item-container" data-id="${id}" data-quant="${quantity}" data-currency="${curSign}">
        <div class="product-image-container">
          <div class="loading-spinner"></div>
          <picture>
            <source
              media="(min-width: 768px)"
              srcset="${desktopImage}"
              type="image/webp"
              crossorigin="anonymous"
            />
            <source
              media="(max-width: 767px)"
              srcset="${mobileImage}"
              type="image/webp"
              crossorigin="anonymous"
            />
            <img 
              class="image-item front-image" 
              src="${desktopImage}"
              alt="${name}"
              loading="lazy"
              crossorigin="anonymous"
              onload="this.parentElement.parentElement.querySelector('.loading-spinner').style.display = 'none'; this.classList.add('loaded');"
              onerror="this.onerror=null; this.crossOrigin=''; this.src='${desktopImage}';"
            />
          </picture>
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

  _setupModalEventListeners() {
    const modal = document.querySelector('.modal');
    const closeBtn = modal.querySelector('.close-modal-btn');
    const overlay = modal.querySelector('.item-overlay');
    const addToCartBtn = modal.querySelector('.add-to-cart-btn_modal');
    const magnifierContainer = modal.querySelector('.magnifier-container');
    const magnifierGlass = modal.querySelector('.magnifier-glass');
    const bigImage = modal.querySelector('.big-image');
    const tapToMagnify = modal.querySelector('.tap-to-magnify');
    const magnifierIcon = modal.querySelector('.magnifier-icon');
    const loadingIndicator = modal.querySelector('.loading-indicator');
    const isMobile = window.matchMedia('(max-width: 699.99px)').matches;

    // Handle main image loading - only for initial load
    if (bigImage && !bigImage.complete) {
      if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
      }

      bigImage.onload = () => {
        bigImage.classList.add('loaded');
        if (loadingIndicator) {
          loadingIndicator.style.display = 'none';
        }
      };

      bigImage.onerror = () => {
        if (loadingIndicator) {
          loadingIndicator.textContent = 'Error loading image';
          loadingIndicator.style.display = 'block';
        }
      };
    } else if (bigImage) {
      // Image is already loaded
      bigImage.classList.add('loaded');
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
    }

    // Handle small images click
    const smallImages = modal.querySelectorAll('.small-image-div');
    if (smallImages.length > 0) {
      smallImages.forEach(imgDiv => {
        imgDiv.addEventListener('click', () => {
          // Remove active class from all thumbnails
          smallImages.forEach(div => div.classList.remove('active'));

          // Add active class to clicked thumbnail
          imgDiv.classList.add('active');

          // Get the image source from the clicked thumbnail
          const smallImg = imgDiv.querySelector('.small-image');
          if (!smallImg) return;

          // Update main image without showing loading indicator
          if (bigImage) {
            // Cache the new image first
            const tempImg = new Image();
            tempImg.onload = () => {
              bigImage.src = smallImg.src;
              bigImage.classList.add('loaded');

              // Update gallery image if it exists
              const galleryImage = modal.querySelector('.gallery-image');
              if (galleryImage) {
                galleryImage.src = smallImg.src;
              }
            };
            tempImg.src = smallImg.src;
          }
        });

        // Add hover effect
        imgDiv.addEventListener('mouseenter', () => {
          if (!imgDiv.classList.contains('active')) {
            imgDiv.style.borderColor = '#ddd';
          }
        });

        imgDiv.addEventListener('mouseleave', () => {
          if (!imgDiv.classList.contains('active')) {
            imgDiv.style.borderColor = 'transparent';
          }
        });
      });
    }

    // Fullscreen gallery elements
    const fullscreenGallery = modal.querySelector('.fullscreen-gallery');
    const galleryImage = modal.querySelector('.gallery-image');
    const closeGallery = modal.querySelector('.close-gallery');
    const prevButton = modal.querySelector('.prev-image');
    const nextButton = modal.querySelector('.next-image');
    let currentImageIndex = 0;
    let touchStartX = 0;
    let touchEndX = 0;

    // Function to close gallery and clean up
    const closeFullscreenGallery = () => {
      fullscreenGallery.style.display = 'none';
      document.body.style.overflow = ''; // Restore scrolling
      // Remove the gallery state from history
      if (window.history.state?.isGalleryOpen) {
        window.history.back();
      }
    };

    // Function to update gallery image
    const updateGalleryImage = index => {
      const images = Array.from(modal.querySelectorAll('.small-image')).map(
        img => img.src
      );
      if (images.length === 0) return;
      currentImageIndex =
        ((index % images.length) + images.length) % images.length;
      galleryImage.src = images[currentImageIndex];
    };

    // Open fullscreen gallery on main image click
    magnifierContainer.addEventListener('click', () => {
      fullscreenGallery.style.display = 'block';
      document.body.style.overflow = 'hidden'; // Prevent scrolling
      updateGalleryImage(currentImageIndex);

      // Add a history entry to handle back button
      window.history.pushState({ isGalleryOpen: true }, '');
    });

    // Close gallery
    closeGallery.addEventListener('click', closeFullscreenGallery);

    // Handle phone's back button and browser back button
    window.addEventListener('popstate', e => {
      if (fullscreenGallery.style.display === 'block') {
        closeFullscreenGallery();
      }
    });

    // Navigation buttons
    prevButton.addEventListener('click', () => {
      updateGalleryImage(currentImageIndex - 1);
    });

    nextButton.addEventListener('click', () => {
      updateGalleryImage(currentImageIndex + 1);
    });

    // Touch events for mobile swipe
    fullscreenGallery.addEventListener(
      'touchstart',
      e => {
        touchStartX = e.touches[0].clientX;
      },
      { passive: true }
    );

    fullscreenGallery.addEventListener(
      'touchmove',
      e => {
        touchEndX = e.touches[0].clientX;
      },
      { passive: true }
    );

    fullscreenGallery.addEventListener('touchend', () => {
      const swipeThreshold = 50; // minimum distance for a swipe
      const swipeDistance = touchEndX - touchStartX;

      if (Math.abs(swipeDistance) > swipeThreshold) {
        if (swipeDistance > 0) {
          // Swiped right - show previous image
          updateGalleryImage(currentImageIndex - 1);
        } else {
          // Swiped left - show next image
          updateGalleryImage(currentImageIndex + 1);
        }
      }
    });

    // Double tap to close gallery on mobile
    let lastTap = 0;
    fullscreenGallery.addEventListener('touchend', e => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      if (tapLength < 500 && tapLength > 0) {
        // Double tap detected
        closeFullscreenGallery();
        e.preventDefault();
      }
      lastTap = currentTime;
    });

    // Keyboard navigation
    document.addEventListener('keydown', e => {
      if (fullscreenGallery.style.display === 'block') {
        if (e.key === 'ArrowLeft') {
          updateGalleryImage(currentImageIndex - 1);
        } else if (e.key === 'ArrowRight') {
          updateGalleryImage(currentImageIndex + 1);
        } else if (e.key === 'Escape') {
          closeFullscreenGallery();
        }
      }
    });

    // Close gallery when clicking outside the image
    fullscreenGallery.addEventListener('click', e => {
      // Check if the click was on the gallery container but not on the image or navigation buttons
      if (
        e.target === fullscreenGallery ||
        (e.target !== galleryImage &&
          e.target !== prevButton &&
          e.target !== nextButton &&
          e.target !== closeGallery)
      ) {
        closeFullscreenGallery();
      }
    });

    // Prevent click events on the image from bubbling up
    galleryImage.addEventListener('click', e => {
      e.stopPropagation();
    });

    // Close button event
    closeBtn.addEventListener('click', this.closeModal.bind(this));

    // Close on overlay click
    if (overlay) {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) {
          this.closeModal();
        }
      });
    }

    // Add to cart functionality
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', () => {
        const dataObj = {
          dataset: {
            id: addToCartBtn.dataset.id,
            quant: addToCartBtn.dataset.quant,
            price: addToCartBtn.dataset.price,
          },
        };
        this.addFromPrev(dataObj);
      });
    }

    // Setup magnifier functionality
    if (magnifierContainer && magnifierGlass && bigImage) {
      this._setupMagnifier(
        magnifierContainer,
        magnifierGlass,
        bigImage,
        tapToMagnify,
        magnifierIcon,
        isMobile
      );
    }

    // Show modal
    modal.classList.add('show');
  }

  _setupMagnifier(
    container,
    glass,
    image,
    tapToMagnify,
    magnifierIcon,
    isMobile
  ) {
    // Initial setup
    glass.style.backgroundImage = `url('${image.src}')`;
    glass.style.display = 'none';

    // Preload image
    const preloadImg = new Image();
    preloadImg.src = image.src;
    preloadImg.onload = () => {
      glass.style.backgroundImage = `url('${image.src}')`;
      glass.style.backgroundSize = `${300}%`;
      glass.style.imageRendering = 'high-quality';
      glass.style.backfaceVisibility = 'hidden';
      glass.style.transform = 'translateZ(0)';
      image.dataset.naturalWidth = preloadImg.naturalWidth;
      image.dataset.naturalHeight = preloadImg.naturalHeight;
    };

    const calculateImagePosition = (
      imgElement,
      containerRect,
      mouseX,
      mouseY
    ) => {
      const imgRect = imgElement.getBoundingClientRect();
      const imgAspectRatio =
        imgElement.dataset.naturalWidth / imgElement.dataset.naturalHeight;
      const containerAspectRatio = containerRect.width / containerRect.height;

      let visibleImgWidth, visibleImgHeight, offsetX, offsetY;

      if (imgAspectRatio > containerAspectRatio) {
        visibleImgWidth = containerRect.width;
        visibleImgHeight = containerRect.width / imgAspectRatio;
        offsetX = 0;
        offsetY = (containerRect.height - visibleImgHeight) / 2;
      } else {
        visibleImgHeight = containerRect.height;
        visibleImgWidth = containerRect.height * imgAspectRatio;
        offsetX = (containerRect.width - visibleImgWidth) / 2;
        offsetY = 0;
      }

      const buffer = 5;
      if (
        mouseX < offsetX - buffer ||
        mouseX > offsetX + visibleImgWidth + buffer ||
        mouseY < offsetY - buffer ||
        mouseY > offsetY + visibleImgHeight + buffer
      ) {
        return { inBounds: false };
      }

      let xPercent = ((mouseX - offsetX) / visibleImgWidth) * 100;
      let yPercent = ((mouseY - offsetY) / visibleImgHeight) * 100;

      xPercent = Math.max(0, Math.min(100, xPercent));
      yPercent = Math.max(0, Math.min(100, yPercent));

      return { inBounds: true, xPercent, yPercent };
    };

    if (isMobile) {
      this._setupMobileMagnifier(
        container,
        glass,
        image,
        tapToMagnify,
        calculateImagePosition
      );
    } else {
      this._setupDesktopMagnifier(
        container,
        glass,
        image,
        magnifierIcon,
        calculateImagePosition
      );
    }
  }

  _setupMobileMagnifier(
    container,
    glass,
    image,
    tapToMagnify,
    calculatePosition
  ) {
    const handleTouch = e => {
      const touch = e.touches[0];
      const rect = container.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const position = calculatePosition(image, rect, x, y);
      if (!position.inBounds) {
        glass.style.display = 'none';
        return;
      }

      const glassWidth = glass.offsetWidth / 2;
      const glassHeight = glass.offsetHeight / 2;
      const touchOffset = 100;
      let offsetX = x - glassWidth;
      let offsetY = y - glassHeight - touchOffset;

      const bottomBuffer = 20;
      const rightBuffer = 20;

      offsetX = Math.max(
        0,
        Math.min(rect.width - glass.offsetWidth - rightBuffer, offsetX)
      );
      offsetY = Math.max(
        0,
        Math.min(rect.height - glass.offsetHeight - bottomBuffer, offsetY)
      );

      glass.style.left = `${offsetX}px`;
      glass.style.top = `${offsetY}px`;

      const zoomFactor = 3.5;
      glass.style.backgroundImage = `url('${image.src}')`;
      glass.style.backgroundPosition = `${position.xPercent}% ${position.yPercent}%`;
      glass.style.backgroundSize = `${zoomFactor * 100}%`;
      glass.style.imageRendering = 'high-quality';
    };

    container.addEventListener('touchstart', e => {
      if (tapToMagnify) tapToMagnify.style.display = 'none';
      glass.style.display = 'block';
      handleTouch(e);
    });

    container.addEventListener('touchmove', e => {
      e.preventDefault();
      handleTouch(e);
    });

    container.addEventListener('touchend', () => {
      glass.style.display = 'none';
      if (tapToMagnify) {
        setTimeout(() => {
          tapToMagnify.style.display = 'block';
        }, 500);
      }
    });
  }

  _setupDesktopMagnifier(
    container,
    glass,
    image,
    magnifierIcon,
    calculatePosition
  ) {
    if (magnifierIcon) magnifierIcon.style.opacity = '1';

    container.addEventListener('mouseenter', () => {
      if (magnifierIcon) magnifierIcon.style.opacity = '0';
    });

    container.addEventListener('mousemove', e => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const position = calculatePosition(image, rect, x, y);
      if (!position.inBounds) {
        glass.style.display = 'none';
        return;
      }

      glass.style.display = 'block';
      const glassWidth = glass.offsetWidth / 2;
      const glassHeight = glass.offsetHeight / 2;
      const bottomBuffer = 20;
      const rightBuffer = 20;

      let glassX = Math.max(
        0,
        Math.min(rect.width - glass.offsetWidth - rightBuffer, x - glassWidth)
      );
      let glassY = Math.max(
        0,
        Math.min(
          rect.height - glass.offsetHeight - bottomBuffer,
          y - glassHeight
        )
      );

      glass.style.left = `${glassX}px`;
      glass.style.top = `${glassY}px`;

      const zoomFactor = 3;
      glass.style.backgroundImage = `url('${image.src}')`;
      glass.style.backgroundPosition = `${position.xPercent}% ${position.yPercent}%`;
      glass.style.backgroundSize = `${zoomFactor * 100}%`;
      glass.style.imageRendering = 'high-quality';
    });

    container.addEventListener('mouseleave', () => {
      glass.style.display = 'none';
      if (magnifierIcon) magnifierIcon.style.opacity = '1';
    });
  }

  // Add this new method
  setupImageSourceDebugger() {
    let timeout;
    window.addEventListener('resize', () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        const images = document.querySelectorAll('.front-image');
        images.forEach(img => {
          const isMobile = window.matchMedia('(max-width: 767px)').matches;
          // console.log(
          //   `Image source after resize (${
          //     isMobile ? 'mobile' : 'desktop'
          //   } view):`,
          //   {
          //     productId: img.closest('.item-container')?.dataset.id,
          //     currentSrc: img.currentSrc,
          //     originalSrc: img.src,
          //     width: window.innerWidth,
          //   }
          // );
        });
      }, 100);
    });
  }

  // Update the ensureHttps method to handle API URLs
  ensureHttps(url) {
    if (!url || typeof url !== 'string') return '';

    // Get the base API URL based on environment
    const apiBaseUrl =
      process.env.NODE_ENV === 'production'
        ? 'https://lobster-app-jipru.ondigitalocean.app/api'
        : 'http://localhost:4000';

    // If it's a relative path, construct the full URL with the appropriate base
    if (!url.startsWith('http')) {
      return `${apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    // If it's a localhost URL and we're in production, replace with production URL
    if (
      process.env.NODE_ENV === 'production' &&
      url.includes('localhost:4000')
    ) {
      return url.replace(
        'http://localhost:4000',
        'https://lobster-app-jipru.ondigitalocean.app/api'
      );
    }

    // Convert HTTP to HTTPS for production
    if (process.env.NODE_ENV === 'production' && url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }

    return url;
  }
}

// Create a singleton instance and export it
const categoriesView = new CategoriesView();
export default categoriesView;
