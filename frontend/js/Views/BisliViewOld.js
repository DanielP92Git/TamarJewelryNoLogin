import View from "../View.js";
require("dotenv").config();

const addProductsBtn = document.querySelector(".sidebar_add-products");
const productsListBtn = document.querySelector(".sidebar_products-list");
const sideBar = document.querySelector(".sidebar");
const pageContent = document.querySelector(".page-content");
const host = process.env.API_URL;

class BisliView extends View {
  addBambaViewHandler = function (handler) {
    window.addEventListener("load", handler);
  };

  pageAuth = function () {

    const continueBtn = document.querySelector(".continue-button");

    continueBtn.addEventListener("click", (e) => {
      const userEmail = document.getElementById("email-input").value;
      const userPassword = document.getElementById("password-input").value;
      const data = {
        email: userEmail,
        password: userPassword,
      };
      this.loginHandler(data);
    });
  };

  // Previous option;

  loginHandler = async function (formData) {
    await fetch(`${host}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((response) => response.json())
      .then((responseData) => {
        console.log(responseData);
        if (responseData.success && responseData.adminCheck === "admin") {
          localStorage.setItem("auth-token", responseData.token);
          alert("Login Successfuly!");
          this.modeHandler();
        } else {
          alert("Access Denied!");
        }
      });
  };

  modeHandler = function () {
    addProductsBtn.addEventListener(
      "click",
      this.loadAddProductsPage.bind(this)
    );
    productsListBtn.addEventListener("click", this.fetchInfo.bind(this));
  };

  clear = function () {
    pageContent.innerHTML = "";
  };

  fetchInfo = async () => {
    await fetch(`${host}/allproducts`)
      .then((res) => res.json())
      .then((data) => {
        this.loadProductsPage(data);
      });
  };

  addProduct = async (e, productDetails) => {
    try {
      e.preventDefault();

      let product = productDetails;
      let image = product.image;
      let smallImages = product.multiImages;

      let formData = new FormData();
      formData.append("mainImage", image);

      smallImages.forEach((sImage) => {
        formData.append("smallImages", sImage);
      });

      let responseData = await fetch(`${host}/upload`, {
        method: "POST",
        headers: {
          Accept: "multipart/form-data",
        },
        body: formData,
      });

      let data = await responseData.json();

      data.success ? alert("Image Uploded!") : alert("Something went wrong");
      product.image = data.mainImageUrl;
      product.multiImages = data.smallImagesUrl;

      if (data.success) {
        await fetch(`${host}/addproduct`, {
          method: "POST",
          headers: {
            Accept: "multipart/form-data",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(product),
        })
          .then((resp) => resp.json())
          .then((respData) => {
            respData.success ? alert("Product Added!") : alert("Failed");
          });
      }
    } catch (err) {
      console.log(err);
    }
  };

  addProductHandler = function () {
    const addProductBtn = document.querySelector(".addproduct-btn");
    const form = document.getElementById("form");

    addProductBtn.addEventListener("click", (e) => {
      const prodName = document.getElementById("name").value;
      const prodOldPrice = document.getElementById("old-price").value;
      const prodNewPrice = document.getElementById("new-price").value;
      const prodDescription = document.getElementById("description").value;
      const prodCategory = document.getElementById("category").value;
      const prodImage = document.querySelector(".file-input").files[0];
      const multiProdImage = Array.from(
        document.querySelector(".multi-file-input").files
      );

      const data = {
        name: prodName,
        image: prodImage,
        multiImages: multiProdImage,
        category: prodCategory,
        description: prodDescription,
        oldPrice: +prodOldPrice,
        newPrice: +prodNewPrice,
      };

      this.addProduct(e, data);
      // console.log(e, data);
    });
  };

  removeProduct = async function (id) {
    await fetch(`${host}/removeproduct`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: id }),
    });
    await this.fetchInfo();
  };

  loadAddProductsPage = function () {
    this.clear();

    const markup = `<div class="add-product">
    <div class="addproduct-itemfield">
      <p>Product Title</p>
      <input 
        type="text"
        name="name"
        id="name"
        placeholder="Type here"
      />
    </div>
    <div class="addproduct-price">
      <div class="addproduct-itemfield">
        <p>Price</p>
        <input
          type="text"
          name="old_price"
          id="old-price"
          placeholder="Type here"
        />
      </div>
      <div class="addproduct-itemfield">
        <p>Offer Price</p>
        <input
          type="text"
          name="new_price"
          id="new-price"
          placeholder="Type here"
        />
      </div>
    </div>
    <div class="addproduct-itemfield">
      <p>Product Description</p>
      <input
        type="text"
        name="description"
        id="description"
        placeholder="Type here"
      />
    </div>
    <div class="addproduct-itemfield">
      <p>Product Category</p>
      <select
        name="category"
        id="category"
        class="add-product-selector"
      >
        <option value="necklaces">Necklaces</option>
        <option value="crochet-necklaces">Crochet Necklaces</option>
        <option value="bracelets">Bracelets</option>
        <option value="hoop-earrings">Hoop Earrings</option>
      </select>
    </div>
    <div class="addproduct-itemfield">
    Main Image:
  <!--<label htmlFor="file-input">
        <img
          src="../../imgs/svgs/upload.svg"
          class="addproduct-thumbnail-img"
          alt=""/>
      </label>-->
        <form id="form" enctype="multipart/form-data">
          <input
            type="file"
            name="mainImage"
            class="file-input"
            required/>
          <!--<button
            type="submit"
            class="addproduct-btn">
            Submit
          </button>-->
        </form>
        Small Images:
        <!--<label htmlFor="file-input">
              <img
                src="../../imgs/svgs/plus-solid.svg"
                class="addproduct-thumbnail-img"
                alt=""/>
            </label> -->
              <form id="small-images-form" enctype="multipart/form-data">
                <input
                  type="file"
                  name="smallImages"
                  class="multi-file-input"
                  multiple/>
                  </form>
                  </div>
                  <button
                    class="addproduct-btn">
                    Submit
                  </button>
    
  `;

    pageContent.insertAdjacentHTML("afterbegin", markup);
    this.addProductHandler();
  };

  loadProductsPage = function (data) {
    this.clear();
    const markup = `<div class="list-product">
    <h1>All Products List</h1>
    <div class="listproduct-format-main">
      <p>Products</p>
      <p>Title</p>
      <p>Old Price</p>
      <p>New Price</p>
      <p>Category</p>
      <p>Remove</p>
    </div>
    <div class="listproduct-allproducts">
      <hr />
`;
    pageContent.insertAdjacentHTML("afterbegin", markup);
    this.loadProducts(data);
  };

  loadProducts = function (data) {
    const markup = data
      .map((item) => {
        return ` 
      <div data-id="${item.id}" class="listproduct-format-main listproduct-format">
        <img
        src="${item.image}"
        alt=""
        class="listproduct-product-icon"/>
        <p>${item.name}</p>
        <p>${item.old_price}</p>
        <p>${item.new_price}</p>
        <p>${item.category}</p>
        <svg class="delete-svg">
          <use xlink:href="#delete-svg"></use>
        </svg>
       </div>
       <hr/>
        `;
      })
      .join("");

    const productList = document.querySelector(".listproduct-allproducts");

    productList.insertAdjacentHTML("afterbegin", markup);

    productList.addEventListener("click", (e) => {
      const deleteBtn = e.target.closest(".delete-svg");
      const productId = e.target.closest(".listproduct-format").dataset.id;
      if (!deleteBtn) return;
      this.removeProduct(+productId);
    });
  };
}
export default new BisliView();
