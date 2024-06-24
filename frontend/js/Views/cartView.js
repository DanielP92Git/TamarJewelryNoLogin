import View from "../View.js";
import * as model from "../model.js";
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
  _host = process.env.API_URL

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
        .then((res) => {
          if (res.ok) return res.json();
          return res.json().then((json) => Promise.reject(json));
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
    if (cartNum !== 0) {
      this._cartEmpty.classList.add("remove");
      this._deleteAllBtn.classList.add("delete-all-active");
      return model.cart
      .map(
        (x) =>
          `     
          <div class="cart-item" id="${x.id}">
            <img src='${x.image}' class="item-img" alt="" />
            <div class="item-title">${x.title}</div>
            <div class="item-description">${x.description}</div>
            <div class="item-price">${x.price}$</div>
            <div class="delete-item">X</div>
            </div>`
          )
          .join("");
        }
        }

  _generateSummaryMarkup(cartNum, num, ship = 10) {
    if (cartNum === 0) return;
    return `
    <div class="price-summary-container">
          <div class="total-container subtotal">
            <span class="total-text">Subtotal:</span>
            <span class="total-price">${num}$</span>
          </div>
          <div class="total-container shipping">
            <span class="total-text">Shipping:</span>
            <span class="total-price">${ship}$</span>
          </div>
          <div class="total-container total">
            <span class="total-text">Total:</span>
            <span class="total-price">${num + ship}$</span>
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
    const num = model.cart.map((x) => +x.price).reduce((x, y) => x + y, 0);
    return Number(num.toFixed(2));
  }
}
export default new CartView();
