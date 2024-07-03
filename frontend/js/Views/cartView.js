import View from "../View.js";
import * as model from "../model.js";
import deleteSvg from "../../imgs/svgs/x-solid.svg";
require("dotenv").config();

class CartView extends View {
  _parentElement = document.querySelector(".cart-items-container");
  _cartEmpty = document.querySelector(".cart-empty");
  _cartTitle = document.querySelector(".cart-title");
  _summaryTitle = document.querySelector(".summary-title");
  _itemsBox = document.querySelector(".added-items");
  _summaryDetails = document.querySelector(".summary-details");
  _checkoutBtn = document.querySelector(".checkout-btn");
  _deleteAllBtn = document.querySelector(".delete-all");
  _host = process.env.API_URL;

  addCartViewHandler(handler) {
    handler();
  }

  _addHandlerDelete(handler) {
    this._parentElement.addEventListener("click", function (e) {
      const btn = e.target.closest(".delete-item");
      if (!btn) return;
      const idNum = btn.closest(".cart-item");
      handler(idNum.id);
    });
  }

  _addHandlerDeleteAll(handler) {
    this._parentElement.addEventListener("click", function (e) {
      const btn = e.target.closest(".delete-all");
      if (!btn) return;

      handler();
    });
  }

  _addHandlerCheckout(data) {
    this._checkoutBtn.addEventListener("click", () => {
      fetch(`${this._host}/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [...data],
        }),
      })
        .then(async (res) => {
          if (res.ok) return res.json();
          const json = await res.json();
          return await Promise.reject(json);
        })
        .then(({ url }) => {
          window.location = url;
        })
        .catch((e) => {
          console.error(e.error);
        });
    });
  }

  _generateMarkup(cartNum) {
    if (cartNum === 0) {
      this._itemsBox.classList.add("remove");
    } else {
      this._itemsBox.classList.remove("remove");
      this._cartEmpty.classList.add("remove");
      this._deleteAllBtn.classList.add("delete-all-active");
      let checkCurrency = model.cart[0].currency;
      if (checkCurrency == "$") {
        return model.cart
          .map(
            (item) =>
              `     
          <div class="cart-item" id="${item.id}">
            <img src='${item.image}' class="item-img" alt="" />
            <div class="item-title">${item.title}</div>
            <div class="item-price">${
              item.currency == "$"
                ? `$${item.price}`
                : `$${Number((item.price / 3).toFixed(0))}`
            }</div>
            <img src="${deleteSvg}" class="delete-item"/>
            </div>`
          )
          .join("");
      } else {
        return model.cart
          .map(
            (item) =>
              `     
        <div class="cart-item" id="${item.id}">
          <img src='${item.image}' class="item-img" alt="" />
          <div class="item-title">${item.title}</div>
          <div class="item-price">${
            item.currency == "$"
              ? `₪${Number((item.price * 4).toFixed(0))}`
              : `₪${item.price}`
          }</div>
          <div class="delete-item">X</div>
          <!-- <img src="${deleteSvg}" class="delete-item"/> -->
          </div>`
          )
          .join("");
      }
    }
  }

  _generateSummaryMarkup(cartNum, price, ship = 30) {
    if (cartNum === 0) return;
    let checkCurrency = model.cart[0].currency;
    let isInUsd = checkCurrency == "$";
    let currency = isInUsd ? "$" : "₪";
    return `
    <div class="price-summary-container">
          <!--<div class="total-container subtotal">
            <span class="total-text">Subtotal:</span>
            <span class="total-price">₪${price}</span>
          </div>-->
          <!--<div class="total-container shipping">
            <span class="total-text">Shipping:</span>
            <span class="total-price">₪${ship}</span>
          </div>-->
          <div class="total-container total">
            <span class="total-text">Total:</span>
            <span class="total-price">${currency}${price}</span>
          </div>
        </div>`;
  }

  render(cartNum) {
    const markup = this._generateMarkup(cartNum);
    this._itemsBox.insertAdjacentHTML("beforeend", markup);
  }

  _renderSummary(cartNum) {
    if (cartNum !== 0) {
      this._summaryDetails.innerHTML = "";
      const num = this._calculateTotal();
      const markup = this._generateSummaryMarkup(cartNum, num);
      this._summaryDetails.insertAdjacentHTML("afterbegin", markup);
    }
    if (cartNum === 0) {
      this._summaryDetails.innerHTML = "";
      this._checkoutBtn.classList.add("remove");
    }
  }

  _removeItem(cartNum) {
    console.log(cartNum);
    if (cartNum !== 0) {
      this._itemsBox.innerHTML = "";
      this.render(cartNum);
    }
    if (cartNum === 0) {
      this._itemsBox.innerHTML = "";
      this._cartEmpty.classList.remove("remove");
      this._deleteAllBtn.classList.remove("delete-all-active");
    }
  }

  _removeAll() {
    this._itemsBox.innerHTML = "";
    this._cartEmpty.classList.remove("remove");
    this._deleteAllBtn.classList.remove("delete-all-active");
  }

  _clear() {
    this._parentElement.innerHTML = "";
  }

  _calculateTotal() {
    if (model.checkCartNumber() === 0) return;
    console.log(model.cart);

    let checkCurrency = model.cart[0].currency;

    if (checkCurrency == "₪") {
      const convertPrice = model.cart
        .map((itm) => {
          if (itm.currency == "$") {
            return itm.price * 4;
          }
          return +itm.price;
        })
        .reduce((x, y) => x + y, 0);
      console.log(convertPrice);

      return Number(convertPrice.toFixed(0));
    }
    if (checkCurrency == "$") {
      const convertPrice = model.cart
        .map((itm) => {
          if (itm.currency == "₪") {
            return itm.price / 3;
          }
          return +itm.price;
        })
        .reduce((x, y) => x + y, 0);
      console.log(convertPrice);

      return Number(convertPrice.toFixed(0));
    }
  }
}
export default new CartView();
