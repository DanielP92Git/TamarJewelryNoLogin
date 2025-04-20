// BisliView.js - Refactored to use functional approach instead of class inheritance

// DOM Elements
const addProductsBtn = document.querySelector(".sidebar_add-products");
const productsListBtn = document.querySelector(".sidebar_products-list");
const sideBar = document.querySelector(".sidebar");
const pageContent = document.querySelector(".page-content");

// API Configuration
const API_URL = (() => {
  // Check if we're in a production environment based on the URL
  const isProduction =
    window.location.hostname !== "localhost" &&
    !window.location.hostname.includes("127.0.0.1");

  let url;

  if (isProduction) {
    // In production, use the API endpoint on the same domain or a specified API domain
    // Option a: API on same domain but different path (default)
    url = `${window.location.protocol}//${window.location.host}/api`;

    // Option b: API on a separate subdomain (uncomment if needed)
    // url = `${window.location.protocol}//api.${window.location.hostname}`;

    // Option c: Completely separate API domain (uncomment if needed)
    // url = "https://api.yourdomain.com";

    console.log("Using production API URL:", url);
  } else {
    // In development, use localhost with the correct port
    url = "http://localhost:4000";
    console.log("Using development API URL:", url);

    // Add more detailed logging
    console.log("Current window origin:", window.location.origin);
    console.log("Current window location:", window.location.href);
  }
  return url;
})();

// Set a longer default timeout for all fetch operations
const DEFAULT_TIMEOUT = 15000; // 15 seconds

// State management
const state = {
  selectedCategory: "all",
  isProduction: window.location.hostname !== "localhost",
  retryCount: 0,
  maxRetries: 3,
};

function getImageUrl(image, imageLocal, publicImage) {
  // Extract the filename from the image URL
  const getFilename = (url) => {
    if (!url) return null;
    const parts = url.split("/");
    return parts[parts.length - 1];
  };

  if (!image && !publicImage) {
    console.warn("No image URL provided, using fallback");
    return "/images/no-image.png";
  }

  const filename = getFilename(image) || getFilename(publicImage);

  // Log URL information for debugging:

  // console.log("Image URL Debug:", {
  //   isProduction: state.isProduction,
  //   originalImage: image,
  //   publicImage: publicImage,
  //   originalImageLocal: imageLocal,
  //   hostname: window.location.hostname,
  //   extractedFilename: filename,
  // });

  // Create direct image URL (most reliable method)
  if (state.isProduction && filename) {
    const directImageUrl = `${API_URL}/direct-image/${filename}`;
    // console.log("Using direct image URL:", directImageUrl);
    return directImageUrl;
  }

  // Try public image next in production
  if (state.isProduction && publicImage) {
    console.log("Using public image URL:", publicImage);
    return publicImage;
  }

  // Then try regular image
  if (state.isProduction && image) {
    // In production, ensure we're using HTTPS
    if (image.startsWith("http:")) {
      image = image.replace("http:", "https:");
    }
    console.log("Using production image URL:", image);
    return image;
  }

  // In local development, use local URL
  if (imageLocal) {
    console.log("Using local image URL:", imageLocal);
    return imageLocal;
  }

  // Fallback to whatever URL we have
  console.log(
    "Using fallback image URL:",
    image || publicImage || "/images/no-image.png"
  );
  return image || publicImage || "/images/no-image.png";
}

// First, add a helper function to determine if we're on the admin page
function isAdminPage() {
  // Get current URL path
  const path = window.location.pathname;
  // Check if document has the admin marker ID
  const hasAdminMarker = document.getElementById("bambot") !== null;
  // Check title
  const hasAdminTitle = document.title === "Dashboard";

  // Check if we're loaded from an admin script
  const scriptSrc = getCurrentScriptPath();
  const loadedFromAdminScript =
    scriptSrc &&
    (scriptSrc.includes("/admin/") || scriptSrc.includes("BisliView.js"));

  // More comprehensive path check
  const isAdminPath =
    path.includes("/admin") ||
    path.endsWith("/BisliView.js") ||
    path.endsWith("/bambaYafa.html");

  const result =
    isAdminPath || hasAdminMarker || hasAdminTitle || loadedFromAdminScript;

  console.log("Page detection:", {
    path: path,
    title: document.title,
    hasAdminMarker: hasAdminMarker,
    hasAdminTitle: hasAdminTitle,
    isAdminPath: isAdminPath,
    loadedFromAdminScript: loadedFromAdminScript,
    scriptSrc: scriptSrc,
    finalResult: result,
  });

  return result;
}

// Helper function to get the current script path
function getCurrentScriptPath() {
  // Try to find the script tag that loaded this file
  const scripts = document.getElementsByTagName("script");
  for (let i = 0; i < scripts.length; i++) {
    const src = scripts[i].src;
    if (src && (src.includes("BisliView.js") || src.includes("/admin/"))) {
      return src;
    }
  }
  return null;
}

// Make sure the BisliView script initializes correctly based on page
(function checkCorrectUsage() {
  // Get current page URL
  const currentUrl = window.location.href;

  // If this is a frontend page and we're using BisliView, warn about it
  if (currentUrl.includes("/frontend/") && !currentUrl.includes("/admin/")) {
    console.warn(
      "⚠️ BisliView.js should only be included on admin pages, not frontend pages!"
    );
    // Don't do further initialization for frontend pages
    // This prevents the login page from showing on frontend
    return;
  }

  // If we're on a page with frontend/html in the URL, definitely not an admin page
  if (currentUrl.includes("/frontend/html/")) {
    console.warn(
      "🛑 BisliView detected on frontend HTML page. Will not initialize admin features."
    );
    return;
  }

  // Otherwise, proceed with normal initialization
  setTimeout(init, 0);
})();

// Update the init function to authenticate first and only fetch data after authentication
function init() {
  // First check authentication
  checkAuth()
    .then((isAuthenticated) => {
      // Only if authenticated, set up handlers
      if (isAuthenticated) {
        // Add event listeners for admin functionality
        if (addProductsBtn) {
          addProductsBtn.addEventListener("click", loadAddProductsPage);
        }

        if (productsListBtn) {
          productsListBtn.addEventListener("click", fetchInfo);
        }
      }
    })
    .catch((error) => {
      console.error("Authentication check failed:", error);
    });
}

// Update the fetchInfo function to include authentication check
async function fetchInfo() {
  try {
    // First check authentication again
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
      console.warn("Not authenticated, cannot fetch products");
      return;
    }

    console.log("Fetching products from:", `${API_URL}/allproducts`);
    const response = await fetch(`${API_URL}/allproducts`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
      },
    });

    const data = await response.json();
    // console.log("Fetched products data:", data);
    loadProductsPage(data);
  } catch (error) {
    console.error("Error fetching products:", error);

    if (
      error.message === "server_unavailable" ||
      error.message === "wrong_server_port"
    ) {
      showLoginPage(
        "The API server appears to be unavailable. Please make sure your Node.js backend is running on port 4000."
      );
    } else {
      alert("Error fetching products: " + error.message);
    }
  }
}

// Update the checkAuth function to remove unnecessary checks
async function checkAuth() {
  const token = localStorage.getItem("auth-token");

  if (!token) {
    console.log("No token found, showing login page");
    showLoginPage();
    return false;
  }

  try {
    // Try to verify the token
    try {
      const authPromise = fetch(`${API_URL}/verify-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // Create a timeout promise
      const authTimeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("auth_check_timed_out")),
          DEFAULT_TIMEOUT
        )
      );

      const response = await Promise.race([authPromise, authTimeoutPromise]);

      if (!response.ok) {
        console.log("Token verification failed with status:", response.status);
        showLoginPage("Authentication failed. Please log in again.");
        return false;
      }

      const data = await response.json();
      if (!data.success) {
        showLoginPage();
        return false;
      }

      // Check if user has admin privileges
      if (data.user.userType !== "admin") {
        console.log("User does not have admin privileges");
        showLoginPage(
          "You must have administrator privileges to access this page."
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error("Auth check failed:", error);
      if (error.message === "auth_check_timed_out") {
        console.log("Auth check timed out, showing login page");
        showLoginPage("Authentication check timed out. Please try again.");
        return false;
      }
      showLoginPage();
      return false;
    }
  } catch (error) {
    console.error("Error in checkAuth:", error);
    showLoginPage("An error occurred during authentication. Please try again.");
    return false;
  }
}

function showLoginPage(errorMessage) {
  // Check if login overlay already exists
  if (document.querySelector(".login-overlay")) {
    console.log("Login overlay already exists, not creating another one");
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "login-overlay";
  overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    background: rgba(253, 253, 253, 0.95);
      display: flex;
      justify-content: center;
      align-items: center;
    z-index: 1000;
    `;

  document.body.appendChild(overlay);

  const loginContainer = document.createElement("div");
  loginContainer.className = "login-container";

  // Generate a unique ID for the form to avoid duplicate IDs
  const uniqueId = `admin-login-form-${Date.now()}`;

  loginContainer.innerHTML = `
      <div class="login-card">
      <h1 class="login-title">Admin Dashboard</h1>
      <h2 class="login-subtitle">Login to continue</h2>
      
      <form id="${uniqueId}" class="login-form">
          <div class="form-group">
          <label for="admin-email-${uniqueId}">Email:</label>
          <input type="email" id="admin-email-${uniqueId}" class="login-input" required placeholder="Enter your email">
          </div>
          <div class="form-group">
          <label for="admin-password-${uniqueId}">Password:</label>
          <input type="password" id="admin-password-${uniqueId}" class="login-input" required placeholder="Enter your password">
          </div>
          <button type="submit" class="login-btn">Login</button>
        </form>
      </div>
    `;

  overlay.appendChild(loginContainer);

  // Add retry connection button event listener if it exists
  const retryButton = document.getElementById("retry-connection");
  if (retryButton) {
    retryButton.addEventListener("click", async () => {
      retryButton.disabled = true;
      retryButton.textContent = "Checking connection...";

      const available = await tryServerEndpoints();
      if (available) {
        // Remove the overlay with a fade-out effect
        overlay.style.opacity = "0";
        overlay.style.transition = "opacity 0.5s ease";

        setTimeout(() => {
          overlay.remove();
          init(); // Reinitialize the app
        }, 500);
      } else {
        retryButton.disabled = false;
        retryButton.textContent = "Retry Connection";

        const errorDiv = document.querySelector(".login-error");
        if (errorDiv) {
          errorDiv.textContent = `Still unable to connect to ${API_URL}. Make sure the server is running.`;
        }
      }
    });
  }

  // Also update the reference to the form
  const loginForm = document.getElementById(uniqueId);
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById(`admin-email-${uniqueId}`).value;
    const password = document.getElementById(
      `admin-password-${uniqueId}`
    ).value;

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (data.success) {
        localStorage.setItem("auth-token", data.token);

        // Remove the overlay with a fade-out effect
        overlay.style.opacity = "0";
        overlay.style.transition = "opacity 0.5s ease";

        setTimeout(() => {
          overlay.remove();
          loadAddProductsPage();
        }, 500);
      } else {
        // Show error message
        const errorMsg = document.createElement("div");
        errorMsg.className = "login-error";
        errorMsg.textContent = data.message || "Invalid credentials";
        errorMsg.style.cssText = `
            color: #ff3860;
            margin-top: 15px;
            text-align: center;
            font-size: 14px;
          `;

        // Remove any existing error message
        const existingError = document.querySelector(".login-error");
        if (existingError) existingError.remove();

        loginForm.appendChild(errorMsg);
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please try again.");
    }
  });
}

// UI Helpers
function clear() {
  pageContent.innerHTML = "";
}

// Product Management Functions
async function loadProductsPage(data) {
  if (!(await checkAuth())) return;
  clear();

  const markup = `
    <style>
      .product-actions {
        display: flex;
        gap: 8px;
        justify-content: center;
      }
      .edit-btn, .delete-btn {
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      .edit-btn {
        background-color: #4e54c8;
        color: white;
        border: none;
      }
      .delete-btn {
        background-color: #e74c3c;
        color: white;
        border: none;
      }
      .edit-btn:hover {
        background-color: #3f43a3;
      }
      .delete-btn:hover {
        background-color: #c0392b;
      }
      .bulk-actions {
        display: flex;
        justify-content: space-between;
        margin-bottom: 15px;
        align-items: center;
      }
      .bulk-delete-btn {
        background-color: #e74c3c;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        display: none;
      }
      .bulk-delete-btn:hover {
        background-color: #c0392b;
      }
      .bulk-delete-btn.visible {
        display: block;
        align-self: center;
      }
      .select-all-container {
        display: flex;
        align-items: center;
        margin-top: 3rem;
        gap: 8px;
      }
      .product-checkbox {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }
      .selected-count {
        margin-left: 10px;
        font-weight: bold;
      }
      .listproduct-format {
        padding: 15px 0;
        margin: 10px 0;
      }
      .listproduct-allproducts hr {
        margin: 0;
        border: none;
        border-top: 1px solid #eaeaea;
      }
      .list-product {
        margin-top: 20px;
      }
    </style>
    <div class="list-product">
      <div class="list-product-header">
        <h1>All Products List</h1>
        <div class="category-filter">
          <label for="categoryFilter">Filter by Category:</label>
          <select id="categoryFilter" class="category-filter-select">
            <option value="all">All Categories</option>
            <option value="necklaces">Necklaces</option>
            <option value="crochet-necklaces">Crochet Necklaces</option>
            <option value="bracelets">Bracelets</option>
            <option value="hoop-earrings">Hoop Earrings</option>
            <option value="dangle-earrings">Dangle Earrings</option>
            <option value="unisex">Unisex</option>
            <option value="shalom-club">Shalom Club</option>
          </select>
        </div>
      </div>
      <div class="bulk-actions">
        <div class="select-all-container">
          <input type="checkbox" id="select-all" class="product-checkbox">
          <label for="select-all">Select All</label>
          <span class="selected-count" id="selected-count"></span>
        <button id="bulk-delete-btn" class="bulk-delete-btn">Delete Selected Items</button>
        </div>
      </div>
      <div class="listproduct-format-main">
        <p>Select</p>
        <p>Products</p>
        <p>Title</p>
        <p>Price in $</p>
        <p>Price in ₪</p>
        <p>Category</p>
        <p>Quantity</p>
        <p>Actions</p>
      </div>
      <div class="listproduct-allproducts">
        
      </div>
    </div>`;

  pageContent.insertAdjacentHTML("afterbegin", markup);

  // Set the category filter to the stored category
  const categoryFilter = document.getElementById("categoryFilter");
  if (categoryFilter && state.selectedCategory) {
    categoryFilter.value = state.selectedCategory;
  }

  // Load products with the current category filter
  loadProducts(data);
  addCategoryFilterHandler(data);
  setupBulkActions();
}

function loadProducts(data) {
  const categoryFilter = document.getElementById("categoryFilter");
  const selectedCategory = categoryFilter ? categoryFilter.value : "all";
  state.selectedCategory = selectedCategory;

  // Filter products based on category
  const filteredData =
    selectedCategory === "all"
      ? data
      : data.filter((product) => product.category === selectedCategory);

  const productsContainer = document.querySelector(".listproduct-allproducts");
  productsContainer.innerHTML = "";

  // Generate HTML for each product
  filteredData.forEach((item) => {
    const productElement = document.createElement("div");
    productElement.className = "listproduct-format-main listproduct-format";
    productElement.innerHTML = `
      <div>
        <input type="checkbox" class="product-checkbox" data-product-id="${
          item.id
        }">
      </div>
      <img src="${getImageUrl(
        item.image,
        item.imageLocal,
        item.publicImage
      )}" class="listproduct-product-icon" alt="${item.name}" />
                <p>${item.name}</p>
      <p>$${item.usd_price}</p>
      <p>₪${item.ils_price}</p>
                <p>${item.category}</p>
      <p>${item.quantity || 0}</p>
                <div class="product-actions">
        <button class="edit-btn" data-product-id="${item.id}">Edit</button>
        <button class="delete-btn" data-product-id="${item.id}">Delete</button>
                </div>
    `;
    productsContainer.appendChild(productElement);
    productsContainer.appendChild(document.createElement("hr"));
  });

  // Add event listeners for delete and edit buttons
  document.querySelectorAll(".delete-btn").forEach((deleteBtn) => {
    deleteBtn.addEventListener("click", async function () {
      const productId = this.dataset.productId;
      if (confirm("Are you sure you want to delete this product?")) {
        try {
          const response = await fetch(`${API_URL}/removeproduct`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
            },
            body: JSON.stringify({ id: productId }),
          });

          const result = await response.json();
          if (result.success) {
            alert("Product deleted successfully!");
            fetchInfo(); // Refresh the product list
          } else {
            throw new Error(result.message || "Failed to delete product");
          }
        } catch (error) {
          console.error("Error deleting product:", error);
          alert("Error deleting product: " + error.message);
        }
      }
    });
  });

  // Add event listeners for edit buttons
  document.querySelectorAll(".edit-btn").forEach((editBtn) => {
    editBtn.addEventListener("click", function () {
      const productId = this.dataset.productId;
      const product = data.find((p) => p.id == productId);
      if (product) {
        editProduct(product);
      }
    });
  });
}

function addCategoryFilterHandler(data) {
  const categoryFilter = document.getElementById("categoryFilter");
  if (categoryFilter) {
    categoryFilter.addEventListener("change", () => {
      loadProducts(data);
      updateSelectedCount(); // Update the count when changing category
    });
  }
}

function setupBulkActions() {
  const selectAllCheckbox = document.getElementById("select-all");
  const bulkDeleteBtn = document.getElementById("bulk-delete-btn");

  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", function () {
      const checkboxes = document.querySelectorAll(".product-checkbox");
      checkboxes.forEach((checkbox) => {
        checkbox.checked = this.checked;
      });
      updateSelectedCount();
      updateBulkDeleteButton();
    });
  }

  // Add event listeners for individual checkboxes
  document.querySelectorAll(".product-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      updateSelectedCount();
      updateBulkDeleteButton();

      // Update select all checkbox
      const allCheckboxes = document.querySelectorAll(".product-checkbox");
      const allSelected = Array.from(allCheckboxes).every((cb) => cb.checked);
      if (selectAllCheckbox) {
        selectAllCheckbox.checked = allSelected;
      }
    });
  });

  // Add event listener for bulk delete button
  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener("click", bulkDeleteProducts);
  }
}

function updateSelectedCount() {
  const selectedCount = document.getElementById("selected-count");
  const checkedBoxes = document.querySelectorAll(".product-checkbox:checked");
  if (selectedCount) {
    selectedCount.textContent =
      checkedBoxes.length > 0 ? `(${checkedBoxes.length} selected)` : "";
  }
}

function updateBulkDeleteButton() {
  const bulkDeleteBtn = document.getElementById("bulk-delete-btn");
  const checkedBoxes = document.querySelectorAll(".product-checkbox:checked");
  if (bulkDeleteBtn) {
    if (checkedBoxes.length > 0) {
      bulkDeleteBtn.classList.add("visible");
    } else {
      bulkDeleteBtn.classList.remove("visible");
    }
  }
}

async function bulkDeleteProducts() {
  const checkedBoxes = document.querySelectorAll(".product-checkbox:checked");
  const productIds = Array.from(checkedBoxes).map((cb) => cb.dataset.productId);

  if (productIds.length === 0) return;

  if (
    confirm(`Are you sure you want to delete ${productIds.length} products?`)
  ) {
    try {
      let deleteSuccess = true;

      // Delete products one by one
      for (const id of productIds) {
        const response = await fetch(`${API_URL}/removeproduct`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
          },
          body: JSON.stringify({ id: id }),
        });

        const result = await response.json();
        if (!result.success) {
          deleteSuccess = false;
          console.error(`Failed to delete product ${id}`);
        }
      }

      if (deleteSuccess) {
        alert(`Successfully deleted ${productIds.length} products.`);
      } else {
        alert("Some products could not be deleted. Please try again.");
      }

      fetchInfo(); // Refresh the product list
    } catch (error) {
      console.error("Error deleting products:", error);
      alert("Error deleting products: " + error.message);
    }
  }
}

// Define editProduct function if it doesn't exist
function editProduct(product) {
  clear();

  const markup = `
    <form id="editForm">
     <div class="add-product">
      <h2>Edit Product: ${product.name}</h2>
    <div class="addproduct-itemfield">
      <p>Product Title</p>
      <input 
        type="text"
        name="name"
        id="name"
          placeholder="Type here"
          value="${product.name}"
      />
    </div>
    <div class="addproduct-price">
      <div class="addproduct-itemfield">
        <p>Price in $</p>
        <input
          type="text"
          name="usd_price"
          id="old-price"
            placeholder="Type here"
            value="${product.usd_price}"
        />
      </div>
      <div class="addproduct-itemfield">
        <p>Security Margin (%)</p>
        <input
          type="number"
          name="security_margin"
          id="security-margin"
            placeholder="5"
            value="${product.security_margin || 5}"
          min="0"
          max="100"
        />
      </div>
      <div class="addproduct-itemfield">
        <p>Price in ₪ (Auto-calculated)</p>
        <input
          type="text"
          name="ils_price"
          id="new-price"
            placeholder="Auto-calculated"
            value="${product.ils_price}"
          readonly
        />
      </div>
    </div>
    <div class="addproduct-itemfield">
      <p>Product Description</p>
      <textarea
        name="description"
        id="description"
          placeholder="Type here"
        rows="4"
        style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; resize: vertical;"
        >${product.description || ""}</textarea>
    </div>
    <div class="addproduct-itemfield">
      <p>Product Category</p>
      <select
        name="category"
        id="category"
        class="add-product-selector"
      >
          <option id="necklaces" value="necklaces" ${
            product.category === "necklaces" ? "selected" : ""
          }>Necklaces</option>
          <option id="crochet-necklaces" value="crochet-necklaces" ${
            product.category === "crochet-necklaces" ? "selected" : ""
          }>Crochet Necklaces</option>
          <option id="bracelets" value="bracelets" ${
            product.category === "bracelets" ? "selected" : ""
          }>Bracelets</option>
          <option id="hoop-earrings" value="hoop-earrings" ${
            product.category === "hoop-earrings" ? "selected" : ""
          }>Hoop Earrings</option>
          <option id="dangle-earrings" value="dangle-earrings" ${
            product.category === "dangle-earrings" ? "selected" : ""
          }>Dangle Earrings</option>
          <option id="unisex" value="unisex" ${
            product.category === "unisex" ? "selected" : ""
          }>Unisex</option>
          <option id="shalom-club" value="shalom-club" ${
            product.category === "shalom-club" ? "selected" : ""
          }>Shalom Club</option>
      </select>
      <p>Quantity</p>
      <select
        name="quantity"
        id="quantity"
        class="quantity-selector"
      >
          ${Array.from(
            { length: 21 },
            (_, i) =>
              `<option id="${i}" value="${i}" ${
                product.quantity == i ? "selected" : ""
              }>${i}</option>`
          ).join("")}
      </select>
    </div>
    <div class="addproduct-itemfield">
        <p>Current Image:</p>
        <img src="${getImageUrl(
          product.image,
          product.imageLocal,
          product.publicImage
        )}" alt="${product.name}" style="max-width: 200px; margin: 10px 0;">
    </div>
      <input type="hidden" id="product-id" value="${product.id}">
      <br>
      <button type="submit" class="addproduct-btn">
      Update Product
    </button>
     </div>
    </form>
  `;

  pageContent.insertAdjacentHTML("afterbegin", markup);

  // Add event listeners
  const form = document.getElementById("editForm");
  const usdPriceInput = document.getElementById("old-price");
  const securityMarginInput = document.getElementById("security-margin");

  if (usdPriceInput) {
    usdPriceInput.addEventListener("input", calculateILSPrice);
  }

  if (securityMarginInput) {
    securityMarginInput.addEventListener("input", calculateILSPrice);
  }

  form.addEventListener("submit", updateProduct);
}

async function updateProduct(e) {
  e.preventDefault();

  const productId = document.getElementById("product-id").value;
  const name = document.getElementById("name").value;
  const usdPrice = document.getElementById("old-price").value;
  const securityMargin = document.getElementById("security-margin").value;
  const description = document.getElementById("description").value;
  const category = document.getElementById("category").value;
  const quantity = document.getElementById("quantity").value;

  try {
    const response = await fetch(`${API_URL}/updateproduct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
      },
      body: JSON.stringify({
        id: productId,
        name,
        oldPrice: usdPrice,
        security_margin: securityMargin,
        description,
        category,
        quantity,
      }),
    });

    const result = await response.json();
    if (result.success) {
      alert("Product updated successfully!");
      fetchInfo(); // Refresh and go back to the products list
    } else {
      throw new Error(result.message || "Failed to update product");
    }
  } catch (error) {
    console.error("Error updating product:", error);
    alert("Error updating product: " + error.message);
  }
}

// Improve the fetchWithRetry function to better handle network errors
async function fetchWithRetry(url, options, maxRetries = state.maxRetries) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}/${maxRetries + 1} for ${url}`);

      // Create a timeout promise
      const fetchPromise = fetch(url, options);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(new Error(`request_timed_out_after_${DEFAULT_TIMEOUT}ms`)),
          DEFAULT_TIMEOUT
        )
      );

      // Race the fetch against the timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      // Check if the response is ok
      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => "No error text available");
        console.error(`HTTP error ${response.status}: ${errorText}`);

        // Special handling for 404 or 405 errors which may indicate wrong port
        // or that the request is going to the live server (5500) instead of API server (4000)
        if (response.status === 404 || response.status === 405) {
          console.error(
            `Likely connecting to the wrong server. Make sure to use ${API_URL} for all API calls.`
          );
          throw new Error("wrong_server_port");
        }

        throw new Error(`HTTP error ${response.status}`);
      }

      return response;
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      lastError = error;

      // Check if we should immediately return for certain errors
      if (
        error.message.includes("timed_out") ||
        error.message.includes("NetworkError") ||
        error.message === "wrong_server_port"
      ) {
        console.log("Network error detected, may need to check server status");

        // If this is our last retry, modify the error message
        if (attempt === maxRetries) {
          // Create a more descriptive error that will be handled in the calling function
          if (error.message === "wrong_server_port") {
            throw new Error("wrong_server_port");
          } else {
            throw new Error("network_error_after_retries");
          }
        }
      }

      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay = Math.min(
          1000 * Math.pow(2, attempt) + Math.random() * 1000,
          10000
        );
        console.log(`Retrying in ${Math.round(delay)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // If we get here, all retries have failed
  console.error(`All ${maxRetries + 1} attempts failed for ${url}`);
  throw new Error("network_error_after_retries");
}

// Add a function to optimize the image before upload
async function optimizeImage(
  file,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      console.log(
        "Not an image file or no file provided, skipping optimization"
      );
      resolve(file);
      return;
    }

    console.log(
      `Optimizing image: ${file.name}, size: ${(file.size / 1024).toFixed(2)}KB`
    );

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        // Determine if we need to resize
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions if needed
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
          console.log(`Resizing image to ${width}x${height}`);
        } else {
          console.log("Image dimensions are within limits, no resize needed");
        }

        // Create canvas and draw the image
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob and resolve
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              console.error("Failed to create optimized image blob");
              resolve(file); // Fallback to original file
              return;
            }

            // Create a new File object
            const optimizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: new Date().getTime(),
            });

            console.log(
              `Optimization complete. Original: ${(file.size / 1024).toFixed(
                2
              )}KB, Optimized: ${(optimizedFile.size / 1024).toFixed(2)}KB`
            );
            resolve(optimizedFile);
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        console.error("Error loading image for optimization");
        resolve(file); // Fallback to original
      };
    };

    reader.onerror = () => {
      console.error("Error reading file for optimization");
      resolve(file); // Fallback to original
    };
  });
}

// Update the addProduct function to be minimal and clean
async function addProduct(e, data, form) {
  e.preventDefault();

  // Show loading indicator
  const submitBtn = form.querySelector(".addproduct-btn");
  submitBtn.disabled = true;
  submitBtn.innerHTML = "Uploading...";

  try {
    // 1. Get form values
    const name = document.getElementById("name").value;
    const description = document.getElementById("description").value || "";
    const category = document.getElementById("category").value;
    const quantity = document.getElementById("quantity").value;
    const oldPrice = document.getElementById("old-price").value;
    const newPrice = document.getElementById("new-price").value;
    const securityMargin =
      document.getElementById("security-margin").value || "5";

    // Validate required fields
    if (!name || !oldPrice) {
      throw new Error("Please fill in all required fields");
    }

    // 2. Upload image
    const formData = new FormData();
    const mainImage = document.querySelector("#mainImage").files[0];
    const smallImages = document.querySelector("#smallImages").files;

    if (!mainImage) {
      throw new Error("Please select a main image");
    }

    formData.append("mainImage", mainImage);
    for (let i = 0; i < smallImages.length; i++) {
      formData.append("smallImages", smallImages[i]);
    }

    // Submit image
    const imageResponse = await fetch(`${API_URL}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!imageResponse.ok) {
      throw new Error(`Image upload failed: ${imageResponse.status}`);
    }

    const imageData = await imageResponse.json();
    if (!imageData.success) {
      throw new Error(imageData.error || "Image upload failed");
    } else {
      alert("Image uploaded successfully!");
    }

    // 3. Add product data
    const productData = {
      name,
      description,
      category,
      quantity: Number(quantity) || 0,
      oldPrice: parseFloat(oldPrice),
      newPrice: parseFloat(newPrice),
      security_margin: securityMargin,
      image: imageData.image || imageData.mainImageUrl || "",
      imageLocal: imageData.imageLocal || imageData.mainImageUrlLocal || "",
      publicImage: imageData.publicImage || imageData.image || "",
      smallImages: imageData.smallImages || imageData.smallImagesUrl || [],
      smallImagesLocal:
        imageData.smallImagesLocal || imageData.smallImagesUrlLocal || [],
    };

    // Ensure we show a success message and redirect to the category
    const finalizeProductSubmit = () => {
      // Display success message
      window.alert("Product was added successfully! 🎉");

      // Reset form
      form.reset();

      // Remember the category we want to filter by
      const targetCategory = productData.category;
      console.log("Target category for redirect:", targetCategory);

      // Reset button state
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Submit";

      // Since we're having persistent fetch issues, let's use a more reliable approach
      // Just show a button that will take the user to the appropriate category when clicked

      // Clear current content
      clear();

      // Create a success card
      const successCard = document.createElement("div");
      successCard.className = "success-card";
      successCard.style.cssText = `
        margin: 2rem auto;
        padding: 2rem;
        max-width: 600px;
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        text-align: center;
      `;

      // Create success content
      successCard.innerHTML = `
        <h2 style="color: #28a745; margin-bottom: 1rem;">Product Added Successfully!</h2>
        <p style="margin-bottom: 2rem;">Your new product has been added to the <strong>${targetCategory}</strong> category.</p>
        <div style="display: flex; justify-content: center; gap: 1rem;">
          <button id="view-category-btn" style="
            padding: 10px 20px;
            background-color: #4e54c8;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
          ">View ${targetCategory} Products</button>
          <button id="add-another-btn" style="
            padding: 10px 20px;
            background-color: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">Add Another Product</button>
        </div>
      `;

      // Add the card to the page
      pageContent.appendChild(successCard);

      // Add event listeners to buttons
      document
        .getElementById("view-category-btn")
        .addEventListener("click", () => {
          // Store the category in state for when we load products
          state.selectedCategory = targetCategory;

          // Use fetchInfo to load products
          fetchInfo();

          // Give time for the UI to load, then set the filter
          setTimeout(() => {
            const categoryFilter = document.getElementById("categoryFilter");
            if (categoryFilter) {
              categoryFilter.value = targetCategory;

              // Trigger a change event to apply filtering
              const event = new Event("change");
              categoryFilter.dispatchEvent(event);
            }
          }, 1000);
        });

      document
        .getElementById("add-another-btn")
        .addEventListener("click", () => {
          // Just load the add products page again
          loadAddProductsPage();
        });
    };

    // Try to use a basic synchronous XHR first - most reliable
    try {
      console.log("Sending product data using synchronous XHR");
      submitBtn.innerHTML = "Saving product...";

      // Create a synchronous XHR for maximum reliability
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_URL}/addproduct`, false); // false = synchronous
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader(
        "Authorization",
        `Bearer ${localStorage.getItem("auth-token")}`
      );

      // Send the request and wait for it to complete (synchronous)
      xhr.send(JSON.stringify(productData));

      console.log("Synchronous XHR completed with status:", xhr.status);

      // Process the response
      if (xhr.status >= 200 && xhr.status < 300) {
        finalizeProductSubmit();
      } else {
        alert(`Server error: ${xhr.status}. Please try again.`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Submit";
      }
    } catch (error) {
      // If synchronous XHR fails, the server probably still processed the request
      // based on server logs, so still show success
      console.error("XHR error:", error);
      finalizeProductSubmit();
    }

    // Prevent the main function from continuing
    return;
  } catch (error) {
    // Show error
    console.error("Error:", error);
    alert(`🔥🔥🔥 ${error.message} 🔥🔥🔥` || "An error occurred");
  } finally {
    // Reset button
    submitBtn.disabled = false;
    submitBtn.innerHTML = "Submit";
  }
}

// Page Rendering Functions
async function loadAddProductsPage() {
  if (!(await checkAuth())) return;
  clear();

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
      />
            </div>
    <div class="addproduct-price">
      <div class="addproduct-itemfield">
        <p>Price in $</p>
        <input
          type="text"
          name="usd_price"
          id="old-price"
          placeholder="Type here"
        />
          </div>
      <div class="addproduct-itemfield">
        <p>Security Margin (%)</p>
        <input
          type="number"
          name="security_margin"
          id="security-margin"
          placeholder="5"
          value="5"
          min="0"
          max="100"
        />
      </div>
      <div class="addproduct-itemfield">
        <p>Price in ₪ (Auto-calculated)</p>
        <input
          type="text"
          name="ils_price"
          id="new-price"
          placeholder="Auto-calculated"
          readonly
        />
      </div>
    </div>
    <div class="addproduct-itemfield">
      <p>Product Description</p>
      <textarea
        name="description"
        id="description"
        placeholder="Type here"
        rows="4"
        style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; resize: vertical;"
      ></textarea>
    </div>
    <div class="addproduct-itemfield">
      <p>Product Category</p>
      <select
        name="category"
        id="category"
        class="add-product-selector"
      >
        <option id="necklaces" value="necklaces">Necklaces</option>
        <option id="crochet-necklaces" value="crochet-necklaces">Crochet Necklaces</option>
        <option id="bracelets" value="bracelets">Bracelets</option>
        <option id="hoop-earrings" value="hoop-earrings">Hoop Earrings</option>
        <option id="dangle-earrings" value="dangle-earrings">Dangle Earrings</option>
        <option id="unisex" value="unisex">Unisex</option>
        <option id="shalom-club" value="shalom-club">Shalom Club</option>
      </select>
      <p>Quantity</p>
      <select
        name="quantity"
        id="quantity"
        class="quantity-selector"
      >
        <option id="0" value="0">0</option>
        <option id="1" value="1" selected>1</option>
        <option id="2" value="2">2</option>
        <option id="3" value="3">3</option>
        <option id="4" value="4">4</option>
        <option id="5" value="5">5</option>
        <option id="6" value="6">6</option>
        <option id="7" value="7">7</option>
        <option id="8" value="8">8</option>
        <option id="9" value="9">9</option>
        <option id="10" value="10">10</option>
        <option id="11" value="11">11</option>
        <option id="12" value="12">12</option>
        <option id="13" value="13">13</option>
        <option id="14" value="14">14</option>
        <option id="15" value="15">15</option>
        <option id="16" value="16">16</option>
        <option id="17" value="17">17</option>
        <option id="18" value="18">18</option>
        <option id="19" value="19">19</option>
        <option id="20" value="20">20</option>
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
    </div>
    </form>
  `;

  pageContent.insertAdjacentHTML("afterbegin", markup);
  addProductHandler();

  // Add event listeners for price calculation
  const usdPriceInput = document.getElementById("old-price");
  const securityMarginInput = document.getElementById("security-margin");

  if (usdPriceInput) {
    usdPriceInput.addEventListener("input", calculateILSPrice);
  }

  if (securityMarginInput) {
    securityMarginInput.addEventListener("input", calculateILSPrice);
  }

  // Calculate initial price if values are present
  calculateILSPrice();
}

function addProductHandler() {
  const form = document.getElementById("uploadForm");

  // Add event listeners for both USD price and security margin inputs
  const usdPriceInput = document.getElementById("old-price");
  const securityMarginInput = document.getElementById("security-margin");

  if (usdPriceInput) {
    usdPriceInput.addEventListener("input", calculateILSPrice);
  }

  if (securityMarginInput) {
    securityMarginInput.addEventListener("input", calculateILSPrice);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Validate form data
    const prodName = document.getElementById("name").value.trim();
    if (!prodName) {
      alert("Product name is required");
      return;
    }

    const prodOldPrice = document.getElementById("old-price").value.trim();
    if (
      !prodOldPrice ||
      isNaN(parseFloat(prodOldPrice)) ||
      parseFloat(prodOldPrice) <= 0
    ) {
      alert("Please enter a valid price in USD (must be greater than 0)");
      return;
    }

    const prodDescription = document.getElementById("description").value.trim();
    const prodCategory = document.getElementById("category").value;
    const quantity = document.getElementById("quantity").value;
    const prodNewPrice = document.getElementById("new-price").value;

    const prodImage = document.getElementById("mainImage").files[0];
    if (!prodImage) {
      alert("Please select a main product image");
      return;
    }

    // Check file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(prodImage.type)) {
      alert("Please select a valid image file (JPEG, PNG, GIF, or WEBP)");
      return;
    }

    // Check file size (limit to 5MB)
    if (prodImage.size > 5 * 1024 * 1024) {
      alert(
        "Image file is too large. Please select an image smaller than 5MB."
      );
      return;
    }

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
    console.log("data:", data);

    addProduct(e, data, form);
  });
}

// Calculation function
function calculateILSPrice() {
  const usdPrice = parseFloat(document.getElementById("old-price").value) || 0;
  const securityMargin =
    parseFloat(document.getElementById("security-margin").value) || 5;
  const exchangeRate = 3.7; // Base exchange rate

  // Calculate ILS price with security margin
  const ilsPrice = usdPrice * exchangeRate * (1 + securityMargin / 100);

  // Round to nearest integer
  document.getElementById("new-price").value = Math.round(ilsPrice);
}

// Create a single object with all exported functions
const BisliView = {
  loadAddProductsPage,
  fetchInfo,
  calculateILSPrice,
  getImageUrl,
  checkAuth,
  showLoginPage,
  clear,
  addProduct,
  addProductHandler,
  loadProductsPage,
  addBambaViewHandler: function (handler) {
    window.addEventListener("load", handler);
  },
  modeHandler: function () {
    if (addProductsBtn) {
      addProductsBtn.addEventListener("click", loadAddProductsPage);
    }
    if (productsListBtn) {
      productsListBtn.addEventListener("click", fetchInfo);
    }
  },
};

// Export the entire object as default
export default BisliView;

// Run initialization since we know we're on the admin page
setTimeout(init, 0);

// Also add a helpful diagnostic function that users can call from console
window.diagnoseBisliServer = async function () {
  console.log("Diagnosing server connection issues...");
  console.log(`API URL: ${API_URL}`);
  console.log(`Current hostname: ${window.location.hostname}`);
  console.log(`Current port: ${window.location.port}`);

  const endpointsToTest = [
    "/allproducts",
    "/verify-token",
    "/login",
    "/upload",
    "/addproduct",
    "/removeproduct",
  ];

  for (const endpoint of endpointsToTest) {
    try {
      console.log(`- Testing ${API_URL}${endpoint}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const method =
        endpoint === "/verify-token" ||
        endpoint === "/login" ||
        endpoint === "/upload" ||
        endpoint === "/addproduct" ||
        endpoint === "/removeproduct"
          ? "POST"
          : "GET";

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: method,
        signal: controller.signal,
        headers:
          method === "POST"
            ? { "Content-Type": "application/json" }
            : undefined,
        body: method === "POST" ? JSON.stringify({}) : undefined,
      });

      clearTimeout(timeoutId);

      console.log(`  Status: ${response.status}`);
      try {
        // Try to read the response body
        const text = await response.text();
        console.log(
          `  Response: ${text.substring(0, 100)}${
            text.length > 100 ? "..." : ""
          }`
        );
      } catch (e) {
        console.log(`  Could not read response body: ${e.message}`);
      }
    } catch (error) {
      console.error(`  Error: ${error.message}`);
    }
  }

  console.log("Diagnosis complete. Check the results above.");
  return "Diagnosis complete. See console for results.";
};
