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

  addProduct = async (e, productDetails, form) => {
    try {
      e.preventDefault();
      let product = productDetails;
      console.log(product);
      let formData = new FormData(form);

      let responseData = await fetch(`${host}/upload`, {
        method: "POST",
        headers: {
          Accept: "multipart/form-data",
        },
        body: formData,
      });

      let data = await responseData.json();

      console.log(data);
      
      if (data.success) {
        alert("Image Uploded!");
        product.image = data.mainImageUrl;
        product.imageLocal = data.mainImageUrlLocal;
        product.multiImages = data.smallImagesUrl;
        product.multiImagesLocal = data.smallImagesUrlLocal;

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
      } else {
        alert("Something went wrong");
      }
    } catch (err) {
      console.log(err);
    }
  };

  addProductHandler = function () {
    const addProductBtn = document.querySelector(".addproduct-btn");
    const form = document.getElementById("uploadForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault()

      const prodName = document.getElementById("name").value;
      const prodOldPrice = document.getElementById("old-price").value;
      const prodNewPrice = document.getElementById("new-price").value;
      const prodDescription = document.getElementById("description").value;
      const prodCategory = document.getElementById("category").value;
      const quantity = document.getElementById("quantity").value;
      const prodImage = document.getElementById("mainImage").files[0];
      const multiProdImage = Array.from(
        document.getElementById("smallImages").files
      );

      const data = {
        name: prodName,
        image: prodImage,
        multiImages: multiProdImage,
        category: prodCategory,
        quantity: quantity,
        description: prodDescription,
        oldPrice: +prodOldPrice,
        newPrice: +prodNewPrice,
      };
      console.log('data:',data);

      this.addProduct(e, data, form);
      // this.addProduct(e, form);
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

    const markup = `
    <form id="uploadForm">
     <div class="add-product">
     <div class="addproduct-itemfield">
       <p>Product Title</p>
       <input 
        type="text"
        name="name"
        id="name"
        placeholder="Type here"
        value="test123"
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
          value="12"
        />
      </div>
      <div class="addproduct-itemfield">
        <p>Offer Price</p>
        <input
          type="text"
          name="new_price"
          id="new-price"
          placeholder="Type here"
          value=""13
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
        value="test32123"
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
      <p>Quantity</p>
      <select
        name="quantity"
        id="quantity"
        class="quantity-selector"
      >
        <option value="0">0</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        
      </select>
    </div>
    <br>
    <div class="addproduct-itemfield">
      
             <label for="mainImage">Main Image:</label>
              <input
                type="file"
                name="mainImage"
                id="mainImage"
                required/>
              <br>

              <label for="smallImages">Small Images:</label>
              
                <input
                  type="file"
                  name="smallImages"
                  id="smallImages"
                  multiple/>

    </div>
                  <br>
                  <button class="addproduct-btn">
                     Submit
                  </button>
      </form>
    
    
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
      <p>Quantity</p>
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
        src="${item.imageLocal}"
        alt=""
        class="listproduct-product-icon"/>
        <p>${item.name}</p>
        <p>${item.old_price}</p>
        <p>${item.new_price}</p>
        <p>${item.category}</p>
        <p>${item.quantity}</p>
        <svg class="delete-svg">
          <use xlink:href="#delete-svg"></use>
        </svg>
        <button class="edit-btn">Edit</button>
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
    this.testEdit();
  };

  testEdit = async function () {
    const editBtn = document.querySelector(".listproduct-allproducts");

    editBtn.addEventListener("click", async (e) => {
      const productId = e.target.closest(".listproduct-format").dataset.id;
      // const title = product.querySelector('.title').textContent
      const id = +productId;

      const response = await fetch(`${host}/findProduct`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: id }),
      });
      const respData = await response.json();
      console.log(respData.productData);

      this.editProductForm(respData.productData);
    });
  };

  editProductForm(data) {
    this.clear();

    const markup = `<div class="add-product">
    <div class="addproduct-itemfield">
      <p>Product Title</p>
      <input 
        type="text"
        name="name"
        id="name"
        value="${data.name}"
      />
    </div>
    <div class="addproduct-price">
      <div class="addproduct-itemfield">
        <p>Price</p>
        <input
          type="text"
          name="old_price"
          id="old-price"
          value="${data.old_price}"
        />
      </div>
      <div class="addproduct-itemfield">
        <p>Offer Price</p>
        <input
          type="text"
          name="new_price"
          id="new-price"
          value="${data.new_price}"
        />
      </div>
    </div>
    <div class="addproduct-itemfield">
      <p>Product Description</p>
      <input
        type="text"
        name="description"
        id="description"
        value="${data.description}"
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
      <p>Quantity</p>
      <select
        name="quantity"
        id="quantity"
        class="quantity-selector"
      >
        <option value="0">0</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        
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
    this.updateProduct(data.id);
  }

  updateProduct = function (id) {
    const addProductBtn = document.querySelector(".addproduct-btn");

    addProductBtn.addEventListener("click", (e) => {
      const prodName = document.getElementById("name").value;
      const prodOldPrice = document.getElementById("old-price").value;
      const prodNewPrice = document.getElementById("new-price").value;
      const prodDescription = document.getElementById("description").value;
      const prodCategory = document.getElementById("category").value;
      const prodImage = document.querySelector(".file-input").files[0];
      const quantity = document.querySelector('.quantity-selector').value
      const multiProdImage = Array.from(
        document.querySelector(".multi-file-input").files
      );

      const data = {
        id: id,
        name: prodName,
        image: prodImage,
        multiImages: multiProdImage,
        category: prodCategory,
        quantity: +quantity,
        description: prodDescription,
        oldPrice: +prodOldPrice,
        newPrice: +prodNewPrice,
      };
      this.sendUpdatedProduct(e, data);
    });
  };

  sendUpdatedProduct = async function (e, data) {
    e.preventDefault();
    await fetch(`${host}/updateproduct`, {
      method: "POST",
      headers: {
        Accept: "multipart/form-data",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((resp) => resp.json())
      .then((respData) => {
        respData.success ? alert("Product Added!") : alert("Failed");
      });
  };
}
export default new BisliView();
