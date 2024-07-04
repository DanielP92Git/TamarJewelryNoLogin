import View from "../View.js";
import { controlAddToCart } from "../controller.js";
import closeSvg from '../../imgs/svgs/x-solid.svg'

//////////////////////////////////////////////////////////
/**
 *!This javascript file is for all of the categories pages
 **/
/////////////////////////////////////////////////////////

class CategoriesView extends View {
  _parentElement = document.querySelector(".products-container");
  _main = document.querySelector(".main");
  _modal = document.querySelector(".modal");

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

  addHandlerAddToCart(handler) {
    this._parentElement.addEventListener("click", function (e) {
      const btn = e.target.closest(".add-to-cart-btn");

      if (!btn) return;
      const item = btn.closest(".item-container");
      handler(item);
    });
  }

  //////////////////////////////////////////////////

  addHandlerPreview(handler, data) {
    const _openItemModal = function (e) {
      const clicked = e.target.closest(".item-container");
      const id = clicked.dataset.id;
      const filtered = data.find((prod) => prod.id == id);
      const addToCart = e.target.closest(".add-to-cart-btn");
      const smallImage = filtered.smallImages;
      const imageMarkup = smallImage
        .map(
          (x) => `
        <img class="small-image" src="${x}" alt="">
      `
        )
        .join("");

      if (!clicked) return;
      if (addToCart) return;
      this.generatePreview(clicked, imageMarkup);
    };

    this._parentElement.addEventListener("click", _openItemModal.bind(this));
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
    const checkCurrency = data.dataset.currency
    let selectedUsd = checkCurrency == "$";
    let curSign = selectedUsd ? "$" : "₪";

    let price = data.querySelector(".item-price").textContent.replace(/[$₪]/g, "");
   
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
        <button class="add-to-cart-btn_modal">Add to Cart</button>
      </div>
    </div>
  </div>`;

    this._modal.insertAdjacentHTML("afterbegin", markup);

    const smallImgsContainer = document.querySelector(
      ".small-images-container"
    );
    const closeBtn = document.querySelector(".close-modal-btn");
    const addToCartModal = document.querySelector(".add-to-cart-btn_modal");

    smallImgsContainer.addEventListener("mouseover", (e) => {
      const bigImg = document.querySelector(".big-image");
      bigImg.src = e.target.closest(".small-image").src;
    });
    smallImgsContainer.addEventListener("mouseout", (e) => {
      const bigImg = document.querySelector(".big-image");
      bigImg.src = image;
    });

    closeBtn.addEventListener("click", this._closeItemModal.bind(this));

    addToCartModal.addEventListener("click", function () {
      controlAddToCart(data);
    });
  }
  sortedProduct(data, sort = "default") {
    const checkCategory = document.body.dataset.category;
    const filtered = data.filter((item) => item.category === checkCategory);
    let sortedByPrice
    if (sort == "low-to-high") {
      sortedByPrice = filtered.sort((a, b) => a.ils_price - b.ils_price);
    } else {
      sortedByPrice = filtered.sort((a, b) => b.ils_price - a.ils_price);
    }
      let selectedUsd = currency == "usd";
      let curSign = selectedUsd ? "$" : "₪";

      const markup = sortedByPrice
        .map(
          (item) =>
            `
        <div class="item-container" data-id="${item.id}" data-quant="${
              item.quantity
            }" data-currency=${curSign}>
       <img class="image-item front-image" src=${item.image} />
       <img class="image-item rear-image" src=${item.image} />
       <button class="add-to-cart-btn">Add to Cart</button>
       <div class="item-title">${item.name}</div>
      <div class="item-description">
        ${item.description}
       </div>
       <div class="item-price">${curSign}${
              selectedUsd
                ? Number((item.ils_price / 3.7).toFixed(0))
                : item.ils_price
            }</div>
     </div>`
        )
        .join("");

      const spinner = document.querySelector(".loader");
      if (data) {
        spinner.classList.toggle("spinner-hidden");
        this._parentElement.insertAdjacentHTML("afterbegin", markup);
      }
    
  }

  generateProduct(data, currency = "usd") {
    const checkCategory = document.body.dataset.category;
    const filtered = data.filter((item) => item.category === checkCategory);

    let selectedUsd = currency == "usd";
    let curSign = selectedUsd ? "$" : "₪";

    const markup = filtered
      .map(
        (item) =>
          `
        <div class="item-container" data-id="${item.id}" data-quant="${item.quantity}" data-currency=${curSign}>
       <img class="image-item front-image" src=${item.image} />
       <img class="image-item rear-image" src=${item.image} />
       <button class="add-to-cart-btn">Add to Cart</button>
       <div class="item-title">${item.name}</div>
      <div class="item-description">
        ${item.description}
       </div>
       <div class="item-price">${curSign}${
            selectedUsd ? Number((item.ils_price / 3.7).toFixed(0)) : item.ils_price
          }</div>
     </div>`
      )
      .join("");

    const spinner = document.querySelector(".loader");
    if (data) {
      spinner.classList.toggle("spinner-hidden");
      this._parentElement.insertAdjacentHTML("afterbegin", markup);
    }
  }

  currencyHandler(data) {
    let currencySelector = document.getElementById("currency");

    currencySelector.addEventListener("change", () => {
      let currency = currencySelector.value;
      this.generateProduct(data, currency);
    });
  }

  sortHandler(data) {
    let sortSelector = document.getElementById("sort");

    sortSelector.addEventListener("change", () => {
      let sort = sortSelector.value;
      this.sortedProduct(data, sort);
    });
  }
}

export default new CategoriesView();
