import View from "../View.js";
import closeSvg from "../../imgs/svgs/x-solid.svg";
import * as model from "../model.js";
//////////////////////////////////////////////////////////
/**
 *!This javascript file is for all of the categories pages
 **/
/////////////////////////////////////////////////////////

class CategoriesView extends View {
  constructor(parentElement, category) {
    super(parentElement, category);
    this.page = 1;
    this.limit = 6;
    this.isLoading = false;
    this.selectedCurrency = "usd"; // Default currency;
    this.sortedByPrice = "";
    this.products = [];
    this.productsContainer = document.querySelector(".products-container");
    this.modal = document.querySelector(".modal");
    this.category = category; // Category passed when navigating to the page

    // Initial fetch and setup
    this.fetchProductsByCategory();
    this.setupScrollListener();
    this.setupCurrencyHandler();
    this.setupSortHandler();
    this.addHandlerAddToCart();
  }

  increaseCartNumber() {
    this._cartNumber.forEach((cartNum) => {
      this._cartNewValue = +cartNum.textContent + 1;
      cartNum.textContent = this._cartNewValue;
    });
  }

  decreaseCartNumber() {
    this._cartNumber.forEach((cartNum) => {
      this._cartNewValue = +cartNum.textContent - 1;
      cartNum.textContent = this._cartNewValue;
    });
  }

  persistCartNumber(num) {
    this._cartNumber.forEach((cartNum) => {
      cartNum.textContent = num;
    });
  }
  addCategoriesHandler = function (handler) {
    window.addEventListener("load", handler);
  };

  /**
   * * --Image Flipper--
   */
  _imageFlipper() {
    const frontImages = document.querySelectorAll(".front-image");
    const rearImages = document.querySelectorAll(".rear-image");

    frontImages.forEach((img) =>
      img.addEventListener("mouseover", function () {
        img.style.opacity = 0;
        rearImages.forEach((img) => (img.style.opacity = 1));
      })
    );

    frontImages.forEach((img) =>
      img.addEventListener("mouseleave", function () {
        img.style.opacity = 1;
        rearImages.forEach((img) => (img.style.opacity = 0));
      })
    );
  }

  //////////////////////////////////////////////////

  addHandlerAddToCart() {
    document.addEventListener("click", this.addToCart.bind(this));
  }

  addToCart(e) {
    const btn = e.target.closest(".add-to-cart-btn");

    if (!btn) return;
    const item = btn.closest(".item-container");
    // console.log(item);
    this.increaseCartNumber();
    model.handleAddToCart(item);
  }

  addFromPrev(data) {
    this.increaseCartNumber();
    model.handleAddToCart(data);

    let addedMsg = document.querySelector('.added-message')
    addedMsg.classList.remove('hide')
    setTimeout(() => {
      addedMsg.classList.add('hide')
    }, 3000);
  }

  //////////////////////////////////////////////////

  addHandlerPreview(data) {
    const _openItemModal = function (e) {
      // console.log(data);
      const clicked = e.target.closest(".item-container");
      const id = clicked.dataset.id;
      const filtered = data.find((prod) => prod.id == id);
      const addToCart = e.target.closest(".add-to-cart-btn");
      const smallImage = filtered.smallImages;
      // console.log(smallImage);
      const imageMarkup = smallImage
        .map(
          (img) => `
        <img class="small-image" src="${img}" alt="">
      `
        )
        .join("");

      if (!clicked) return;
      if (addToCart) return;
      this.generatePreview(clicked, imageMarkup);
    };
    this.productsContainer.addEventListener("click", _openItemModal.bind(this));
  }

  _closeItemModal(e) {
    const modal = document.querySelector(".modal");

    if (!e.target) return;

    modal.innerHTML = "";
  }

  generatePreview(data, imgMrk) {
    const image = data.querySelector(".front-image").src;
    const title = data.querySelector(".item-title").textContent;
    const description = data.querySelector(".item-description").innerHTML;
    const checkCurrency = data.dataset.currency;

    let selectedUsd = checkCurrency == "$";
    let curSign = selectedUsd ? "$" : "₪";

    let price = data
      .querySelector(".item-price")
      .textContent.replace(/[$₪]/g, "");

    const markup = `<div class="item-overlay">
    <div class="modal-item-container">
      <img class="close-modal-btn" src="${closeSvg}" alt="">
      <div class="images-container">
      <img class="big-image" src="${image}" alt="">
      
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
        <div class="added-message hide">
          <span class="added-span"></span>
            Item added to cart!
        </div>
      </div>
    </div>
  </div>`;

    this.modal.insertAdjacentHTML("afterbegin", markup);

    const smallImgsContainer = document.querySelector(
      ".small-images-container"
    );
    const closeBtn = document.querySelector(".close-modal-btn");
    const addToCartModal = document.querySelector(".add-to-cart-btn_modal");
    let bigImg = document.querySelector(".big-image");

    smallImgsContainer.addEventListener("click", (e) => {
      bigImg.src = e.target.closest(".small-image").src;
    });

    closeBtn.addEventListener("click", this._closeItemModal.bind(this));

    addToCartModal.addEventListener("click", () => {
      this.addFromPrev(data);
    });
  }

  // controlAddToCart = function (data) {
  //   // 1) Update cart number
  //   this.increaseCartNumber();

  //   // 2) Pass data from clicked item and add it to model.cart
  //   model.handleAddToCart(data);
  // };

  setupCurrencyHandler() {
    const currencySelector = document.getElementById("currency");

    currencySelector.addEventListener("change", () => {
      const spinner = this.productsContainer.querySelector(".loader");
      spinner.classList.remove("spinner-hidden");

      this.selectedCurrency = currencySelector.value;
      this.page = 1; // Reset page when currency changes
      this.fetchProductsByCategory();
    });
  }

  setupSortHandler() {
    const sortSelector = document.getElementById("sort");

    sortSelector.addEventListener("change", () => {
      this.sortedByPrice = sortSelector.value;
      this.sortAndDisplayProducts();
    });
  }

  async fetchProductsByCategory() {
    if (this.isLoading) return;
    this.isLoading = true;

    const category = this.category;
    const spinner = this.productsContainer.querySelector(".loader");
    spinner.classList.remove("spinner-hidden");

    try {
      const response = await fetch(
        `${process.env.API_URL}/productsByCategory`, // Adjust endpoint to fetch all products
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category }),
        }
      );
      const data = await response.json();
      this.products = data;

      this.sortAndDisplayProducts();
    } catch (err) {
      console.error("Failed to fetch products", err);
    } finally {
      this.isLoading = false;
      spinner.classList.add("spinner-hidden");
    }
  }

  sortAndDisplayProducts() {
    // Sort products by price
    this.products.sort((a, b) => {
      const priceA =
        this.selectedCurrency === "usd" ? a.ils_price / 3.7 : a.ils_price;
      const priceB =
        this.selectedCurrency === "usd" ? b.ils_price / 3.7 : b.ils_price;
      return this.sortedByPrice === "low-to-high"
        ? priceA - priceB
        : priceB - priceA;
    });

    this.page = 1;
    this.displayProducts();
  }

  displayProducts() {
    this.productsContainer.innerHTML = "";
    const spinnerMarkup = `<span class="loader spinner-hidden"></span>`;
    this.productsContainer.insertAdjacentHTML("afterbegin", spinnerMarkup);

    const productsToShow = this.products.slice(0, this.limit);

    const markup = productsToShow
      .map((item) => this.getProductMarkup(item))
      .join("");

    this.productsContainer.insertAdjacentHTML("beforeend", markup);
  }

  setupScrollListener() {
    window.addEventListener(
      "scroll",
      (this.scrollHandler = () => {
        if (
          window.innerHeight + window.scrollY >=
            document.body.offsetHeight - 200 &&
          !this.isLoading
        ) {
          this.page++;
          this.displayMoreProducts();
        }
      })
    );
  }

  getProductMarkup(item) {
    const { id, quantity, image, name, description, ils_price } = item;
    const curSign = this.selectedCurrency === "usd" ? "$" : "₪";
    const price =
      this.selectedCurrency === "usd"
        ? Number((ils_price / 3.7).toFixed(0))
        : ils_price;

    return `
      <div class="item-container" data-id="${id}" data-quant="${quantity}" data-currency="${curSign}">
        <img class="image-item front-image" src="${image}" />
        <img class="image-item rear-image" src="${image}" />
        <button class="add-to-cart-btn">Add to Cart</button>
        <div class="item-title">${name}</div>
        <div class="item-description">${description}</div>
        <div class="item-price">${curSign}${price}</div>
      </div>`;
  }

  displayMoreProducts() {
    const start = this.page * this.limit;
    const end = start + this.limit;
    const productsToShow = this.products.slice(start, end);

    const markup = productsToShow
      .map((item) => this.getProductMarkup(item))
      .join("");

    this.productsContainer.insertAdjacentHTML("beforeend", markup);
  }
}
export default CategoriesView;
