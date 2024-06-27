// import React, { useEffect, useState, useContext } from "react";
import View from "../View.js";
import { controlAddToCart } from "../controller.js";
// import { createRoot } from "react-dom/client";
// import all_product from "../../Assets/all_product.js";

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
      console.log(data);
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
      // this.generatePreview(clicked, handler, data);
      this.generatePreview(clicked, filtered, imageMarkup);
    };

    this._parentElement.addEventListener("click", _openItemModal.bind(this));
  }

  _closeItemModal(e) {
    const modal = document.querySelector(".modal");

    if (!e.target) return;

    modal.innerHTML = "";
  }

  generatePreview(data, itemInfo, imgMrk) {
    const image = data.querySelector(".front-image").src;
    const title = data.querySelector(".item-title").textContent;
    const smallImage = itemInfo.smallImages;
    console.log(smallImage);
    const id = data.id;
    const description = data.querySelector(".item-description").innerHTML;

    let price = data.querySelector(".item-price").textContent.replace("$", "");

    const markup = `<div class="item-overlay">
    <div class="modal-item-container">
      <svg class="close-modal-btn"><use xlink:href="#close-svg"></use></svg>
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
        <div class="item-price_modal">${price}$</div>
        <button class="add-to-cart-btn_modal">Add to Cart</button>
      </div>
    </div>
  </div>`;

    this._modal.insertAdjacentHTML("afterbegin", markup);

    const closeBtn = document.querySelector(".close-modal-btn");
    const addToCartModal = document.querySelector(".add-to-cart-btn_modal");

    closeBtn.addEventListener("click", this._closeItemModal.bind(this));

    addToCartModal.addEventListener("click", function () {
      controlAddToCart(data);
    });
  }

  generateProduct(data) {
    const checkCategory = document.body.dataset.category;
    const filtered = data.filter((item) => item.category === checkCategory);
    // console.log(filtered);
    return filtered
      .map(
        (item) => `<div class="item-container" data-id="${item.id}">
       <img class="image-item front-image" src=${item.image} />
       <img class="image-item rear-image" src=${item.image} />
       <button class="add-to-cart-btn">Add to Cart</button>
       <div class="item-title">${item.name}</div>
      <div class="item-description">
        ${item.description}
       </div>
       <div class="item-price">$${item.new_price}</div>
     </div>`
      )
      .join("");
  }

  renderProducts(data) {
    const markup = this.generateProduct(data);
    this._parentElement.insertAdjacentHTML("afterbegin", markup);
  }
}

export default new CategoriesView();
