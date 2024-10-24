import View from '../View.js';
import closeSvg from '../../imgs/svgs/x-solid.svg';
import * as model from '../model.js';
//////////////////////////////////////////////////////////
/**
 *!This javascript file is for all of the categories pages
 **/
/////////////////////////////////////////////////////////

class CategoriesView extends View {
  constructor(parentElement, category, categoryNameHebrew, lang) {
    super(parentElement, category, categoryNameHebrew, lang);
    this.page = 1;
    this.limit = 6;
    this.isLoading = false;
    this.selectedCurrency = 'usd'; // Default currency;
    this.sortedByPrice = '';
    this.products = [];
    this.totalProducts = 0;
    this.allProductsFetched = false;
    this.outerProductsContainer = document.querySelector(
      '.outer-products-container'
    );
    this.innerProductsContainer = document.querySelector(
      '.inner-products-container'
    );
    this.modal = document.querySelector('.modal');
    this.category = category; // Category passed when navigating to the page
    this.categoryNameHebrew = categoryNameHebrew;
    this.lang = 'eng';

    // Initial fetch and setup
    window.addEventListener('load', () => {
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
      this.setCategoriesLanguage(this.lang);
    });
  }

  handleCategoriesLanguage() {
    const hebLng = document.querySelector('.heb-lng');
    const engLng = document.querySelector('.eng-lng');

    if (hebLng && engLng) {
      hebLng.addEventListener('click', () => this.changeToHeb());
      engLng.addEventListener('click', () => this.changeToEng());
    }
  }

  changeToHeb = function () {
    localStorage.setItem('language', `heb`);
    this.lang = 'heb';
    this.setCategoriesLanguage(`heb`);
  };

  changeToEng = function () {
    localStorage.setItem('language', `eng`);
    this.lang = 'eng';
    this.setCategoriesLanguage('eng');
  };

  setCategoriesLanguage(lng) {
    this._menu.innerHTML = '';

    const markup = this.handleMenuLanguage(lng);
    this._menu.insertAdjacentHTML('afterbegin', markup);

    this._categoriesTab = document.querySelector('.categories-tab');
    this._categoriesList = document.querySelector('.categories-list');

    this.setHeaderLng(lng);
    this.handleFooterMarkup(lng);
    this.setLanguage(lng);
    this.displayProducts();
    this.setCurSortLng(lng);
    this.setupSortHandler();
    this.setupCurrencyHandler();

    this.handleLanguage();
    this.addMobileHandler();
    this.addRevealHandler();
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
    if (lng === 'eng') categoryTitle.textContent = this.category.toUpperCase();
    if (lng === 'heb') categoryTitle.textContent = this.categoryNameHebrew;
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

  persistCartNumber(num) {
    this._cartNumber.forEach(cartNum => {
      cartNum.textContent = num;
    });
  }
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
      const id = clicked.dataset.id;
      const filtered = this.products.find(prod => prod.id == id);
      const addToCart = e.target.closest('.add-to-cart-btn');
      const smallImage = filtered.smallImages;
      // console.log(smallImage);
      const imageMarkup = smallImage
        .map(
          img => `
          <div class="small-image-div">
        <img class="small-image" src="${img}" alt="" loading="lazy">
        </div>
      `
        )
        .join('');

      if (!clicked) return;
      if (addToCart) return;
      this.generatePreview(clicked, imageMarkup);
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

  generatePreview(data, imgMrk) {
    const image = data.querySelector('.front-image').src;
    const title = data.querySelector('.item-title').textContent;
    const description = data.querySelector('.item-description').innerHTML;
    const checkCurrency = data.dataset.currency;

    let selectedUsd = checkCurrency == '$';
    let curSign = selectedUsd ? '$' : '₪';

    let price = data
      .querySelector('.item-price')
      .textContent.replace(/[$₪]/g, '');

    const markup = `<div class="item-overlay">
    <div class="modal-item-container">
      <img class="close-modal-btn" src="${closeSvg}" alt="">
      <div class="images-container">
      <img class="big-image" src="${image}" alt="" loading="lazy">
      
      <div class="small-images-container">
      ${imgMrk}
      </div>
    </div>
      <div class="item-specs">
        <div class="item-title_modal">${title}</div>

        <div class="item-description_modal">${description}
        </div>
        <div class="price-text">Price:</div>
        <div class="item-price_modal">${curSign}${price}</div>
        <button class="add-to-cart-btn_modal">${
          this.lang === 'eng' ? 'Add to Cart' : ' הוסף לסל'
        }</button>
        <div class="added-message hide"><span class="added-span"></span>${
          this.lang === 'eng' ? 'Item added to cart!' : 'המוצר נוסף לסל הקניות!'
        }</div>
      </div>
    </div>
  </div>`;

    this.modal.insertAdjacentHTML('afterbegin', markup);

    const smallImgsContainer = document.querySelector(
      '.small-images-container'
    );
    const closeBtn = document.querySelector('.close-modal-btn');
    const addToCartModal = document.querySelector('.add-to-cart-btn_modal');
    let bigImg = document.querySelector('.big-image');

    smallImgsContainer.addEventListener('click', e => {
      bigImg.src = e.target.closest('.small-image').src;
    });

    closeBtn.addEventListener('click', this._closeItemModal.bind(this));

    addToCartModal.addEventListener('click', () => {
      this.addFromPrev(data);
    });
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
    console.log('selector')
      this.sortAndDisplayProducts();
    });
  }

  async fetchProductsByCategory() {
    if (this.isLoading) return;
    this.isLoading = true;
    let page = this.page;
    const category = this.category;
    const spinner = this.outerProductsContainer.querySelector('.loader');
    spinner.classList.remove('spinner-hidden');

    try {
      const response = await fetch(
        `${process.env.API_URL}/productsByCategory`, // Adjust endpoint to fetch all products
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, page }),
        }
      );
      const data = await response.json();
      // console.log(data);
      this.products = data.products;
      this.displayProducts();
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      this.isLoading = false;
      spinner.classList.add('spinner-hidden');
    }
  }

  async fetchMoreProducts() {
    // console.log(this.allProductsFetched);
    if (this.isLoading || this.allProductsFetched) return;
    this.isLoading = true;

    let page = this.page;
    // console.log(page);
    const category = this.category;
    const spinner = this.outerProductsContainer.querySelector('.loader');
    spinner.classList.remove('spinner-hidden');

    try {
      const response = await fetch(
        `${process.env.API_URL}/productsByCategory`, // Adjust endpoint to fetch all products
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, page }),
        }
      );
      const data = await response.json();
      // console.log(data.totalProducts);
      // console.log(this.products.length);
      this.totalProducts = data.totalProducts;
      // Check if the products array is empty or if all products have been fetched
      const noMoreData = this.products.length >= this.totalProducts;

      if (noMoreData) {
        this.allProductsFetched = true;
      } else {
        this.products.push(...data.products); // Append new products to the list
        this.displayMoreProducts(data.products); // Pass only the newly fetched products
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      this.isLoading = false;
      spinner.classList.add('spinner-hidden');
    }
  }

  sortAndDisplayProducts() {
  console.log('sort')
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
    this.innerProductsContainer.innerHTML = '';

    const productsToShow = this.products.slice(0, this.limit);

    const markup = productsToShow
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

    window.addEventListener(
      'scroll',
      (this.scrollHandler = () => {
        if (timeout) clearTimeout(timeout);

        timeout = setTimeout(() => {
          const scrollTop = window.scrollY; // Current scroll position
          const windowHeight = window.innerHeight; // Height of the visible window
          const productsContainerBottom =
            this.outerProductsContainer.getBoundingClientRect().bottom; // Bottom of the products container

          // Check if the bottom of the products container is within the viewport
          if (
            productsContainerBottom <= windowHeight + 100 && // 100px before reaching the bottom of the container
            !this.isLoading &&
            !this.allProductsFetched
          ) {
            this.page++;
            this.fetchMoreProducts();
          }
        }, 100); // Debounce the scroll event to avoid excessive function calls
      })
    );
  }

  // setupScrollListener() {
  //   let timeout;
  //   window.addEventListener(
  //     'scroll',
  //     (this.scrollHandler = () => {
  //       if (timeout) clearTimeout(timeout);
  //       timeout = setTimeout(() => {
  //         const scrollOffset = window.innerHeight * 0.5; // 50% of screen height
  //         if (
  //           window.innerHeight + window.scrollY >=
  //             document.body.offsetHeight - scrollOffset &&
  //           !this.isLoading &&
  //           !this.allProductsFetched
  //         ) {
  //           this.page++;
  //           this.fetchMoreProducts();
  //         }
  //       }, 100); // Adjust debounce timing as needed
  //     })
  //   );
  // }

  getProductMarkup(item) {
    const { id, quantity, image, name, description, ils_price } = item;
    const curSign = this.selectedCurrency === 'usd' ? '$' : '₪';
    const price =
      this.selectedCurrency === 'usd'
        ? Number((ils_price / 3.7).toFixed(0))
        : ils_price;

    return `
      <div class="item-container" data-id="${id}" data-quant="${quantity}" data-currency="${curSign}">
        <img class="image-item front-image" src="${image}" loading="lazy"/>
        <button class="add-to-cart-btn">${
          this.lang === 'eng' ? 'Add to Cart' : 'הוסף לסל'
        }</button>
        <div class="item-title">${name}</div>
        <div class="item-description">${description}</div>
        <div class="item-price">${curSign}${price}</div>
      </div>`;
  }

  displayMoreProducts() {
    const start = (this.page - 1) * this.limit;
    const end = start + this.limit;
    const productsToShow = this.products.slice(start, end);

    const markup = productsToShow
      .map(item => this.getProductMarkup(item))
      .join('');

    this.innerProductsContainer.insertAdjacentHTML('beforeend', markup);
  }
}
export default CategoriesView;
