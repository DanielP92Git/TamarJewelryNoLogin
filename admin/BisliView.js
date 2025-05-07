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
    url = `https://lobster-app-jipru.ondigitalocean.app/api`;

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

// Function to calculate ILS price based on USD price and security margin
function calculateILSPrice() {
  const usdPriceInput = document.getElementById("old-price");
  const securityMarginInput = document.getElementById("security-margin");
  const ilsPriceInput = document.getElementById("new-price");

  if (usdPriceInput && ilsPriceInput) {
    const usdPrice = parseFloat(usdPriceInput.value) || 0;
    // Default to 5% if no security margin is provided
    const securityMargin = securityMarginInput
      ? parseFloat(securityMarginInput.value) || 5
      : 5;

    // Current conversion rate (update as needed)
    const usdToIlsRate = 3.75;

    // Calculate ILS price with security margin
    const ilsPrice = usdPrice * usdToIlsRate * (1 + securityMargin / 100);

    // Round to 2 decimal places
    ilsPriceInput.value = ilsPrice.toFixed(2);
  }
}

function getImageUrl(image, imageLocal, publicImage, mainImage) {
  // Extract the filename from the image URL
  const getFilename = (url) => {
    if (!url) return null;
    const parts = url.split("/");
    return parts[parts.length - 1];
  };

  // Helper to ensure URLs use production API in production environment
  const ensureProductionUrl = (url) => {
    if (!url) return url;

    // If we're in production and URL contains localhost, convert it to use production API_URL
    if (
      state.isProduction &&
      (url.includes("localhost") || url.includes("127.0.0.1"))
    ) {
      // Get the filename
      const filename = getFilename(url);

      // Determine the path part (uploads, smallImages, etc.)
      let pathPart = "images";
      if (url.includes("/uploads/")) {
        pathPart = "uploads";
      } else if (url.includes("/smallImages/")) {
        pathPart = "smallImages";
      }

      // Construct new URL using production API URL
      return `${API_URL}/${pathPart}/${filename}`;
    }

    // Make sure URLs use HTTPS in production
    if (state.isProduction && url.startsWith("http:")) {
      return url.replace("http:", "https:");
    }

    return url;
  };

  // First try the new mainImage structure
  if (mainImage) {
    if (state.isProduction) {
      const url = mainImage.publicDesktop || mainImage.desktop;
      return ensureProductionUrl(url);
    }
    return mainImage.desktopLocal || mainImage.desktop;
  }

  // Fallback to legacy fields
  if (!image && !publicImage) {
    console.warn("No image URL provided, using fallback");
    // Use API_URL for the fallback image
    return `${API_URL}/images/no-image.png`;
  }

  const filename = getFilename(image) || getFilename(publicImage);

  // Create direct image URL (most reliable method)
  if (state.isProduction && filename) {
    const directImageUrl = `${API_URL}/direct-image/${filename}`;
    return directImageUrl;
  }

  // Try public image next in production
  if (state.isProduction && publicImage) {
    return ensureProductionUrl(publicImage);
  }

  // Then try regular image
  if (state.isProduction && image) {
    return ensureProductionUrl(image);
  }

  // In local development, use local URL
  if (imageLocal) {
    return imageLocal;
  }

  // Fallback to whatever URL we have
  let fallbackUrl = image || publicImage || `${API_URL}/images/no-image.png`;
  if (state.isProduction) {
    fallbackUrl = ensureProductionUrl(fallbackUrl);
  }

  return fallbackUrl;
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
        // Initialize event handlers for all buttons
        initializeEventHandlers();

        // Show the products list by default
        fetchInfo();
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

// Update the showLoginPage function to properly initialize the app after login
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

          // Important: Set up all event handlers before showing any content
          initializeEventHandlers();

          // Show products list instead of add products form immediately after login
          fetchInfo();
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

// Add a new function to specifically initialize event handlers
function initializeEventHandlers() {
  console.log("Initializing event handlers for admin navigation");

  // Add event listeners for admin functionality
  if (addProductsBtn) {
    // Remove any existing listeners first to prevent duplicates
    addProductsBtn.removeEventListener("click", loadAddProductsPage);

    // Add fresh event listener
    addProductsBtn.addEventListener("click", loadAddProductsPage);
    console.log("Add Products button handler initialized");
  } else {
    console.warn("Add Products button not found in the DOM");
  }

  if (productsListBtn) {
    // Remove any existing listeners first to prevent duplicates
    productsListBtn.removeEventListener("click", fetchInfo);

    // Add fresh event listener
    productsListBtn.addEventListener("click", fetchInfo);
    console.log("Products List button handler initialized");
  } else {
    console.warn("Products List button not found in the DOM");
  }
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

  // Check if data is valid before proceeding
  if (!data || !Array.isArray(data)) {
    console.error("Invalid product data received:", data);
    const productsContainer = document.querySelector(
      ".listproduct-allproducts"
    );
    if (productsContainer) {
      productsContainer.innerHTML =
        "<p>No products available or error loading products.</p>";
    }
    return;
  }

  // Filter products based on category
  const filteredData =
    selectedCategory === "all"
      ? data
      : data.filter((product) => product.category === selectedCategory);

  const productsContainer = document.querySelector(".listproduct-allproducts");
  if (!productsContainer) {
    console.error("Products container not found");
    return;
  }

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
      <picture>
        <source 
          media="(min-width: 768px)" 
          srcset="${item.mainImage?.desktop || item.image}" 
          type="image/webp"
        />
        <source 
          media="(max-width: 767px)" 
          srcset="${item.mainImage?.mobile || item.image}" 
          type="image/webp"
        />
        <img 
          src="${getImageUrl(
            item.image,
            item.imageLocal,
            item.publicImage,
            item.mainImage
          )}" 
          class="listproduct-product-icon" 
          alt="${item.name}"
          loading="lazy"
        />
      </picture>
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

  // Helper to get all main image URLs (desktop, mobile, public, legacy)
  function getAllMainImageUrls(product) {
    // Extract the filename from the image URL
    const getFilename = (url) => {
      if (!url) return null;
      const parts = url.split("/");
      return parts[parts.length - 1];
    };

    // Helper to ensure production URLs
    const ensureProductionUrl = (url) => {
      if (!url) return url;

      // Convert localhost URLs to production URLs
      if (
        state.isProduction &&
        (url.includes("localhost") || url.includes("127.0.0.1"))
      ) {
        const filename = getFilename(url);

        // Determine the path part
        let pathPart = "images";
        if (url.includes("/uploads/")) {
          pathPart = "uploads";
        } else if (url.includes("/smallImages/")) {
          pathPart = "smallImages";
        }

        return `${API_URL}/${pathPart}/${filename}`;
      }

      // Ensure HTTPS in production
      if (state.isProduction && url.startsWith("http:")) {
        return url.replace("http:", "https:");
      }

      return url;
    };

    const urls = [];

    // Collect and fix all URLs
    if (product.mainImage) {
      if (product.mainImage.desktop)
        urls.push(ensureProductionUrl(product.mainImage.desktop));
      if (product.mainImage.mobile)
        urls.push(ensureProductionUrl(product.mainImage.mobile));
      if (product.mainImage.publicDesktop)
        urls.push(ensureProductionUrl(product.mainImage.publicDesktop));
      if (product.mainImage.publicMobile)
        urls.push(ensureProductionUrl(product.mainImage.publicMobile));
      if (product.mainImage.desktopLocal)
        urls.push(ensureProductionUrl(product.mainImage.desktopLocal));
      if (product.mainImage.mobileLocal)
        urls.push(ensureProductionUrl(product.mainImage.mobileLocal));
    }

    if (product.image) urls.push(ensureProductionUrl(product.image));
    if (product.publicImage)
      urls.push(ensureProductionUrl(product.publicImage));
    if (product.imageLocal) urls.push(ensureProductionUrl(product.imageLocal));

    // Remove duplicates and falsy values
    return [...new Set(urls.filter(Boolean))];
  }

  // Helper to get all small image URLs (handle both new and legacy)
  function getAllSmallImageUrls(product) {
    // Function to extract filename from URL
    const getFilename = (url) => {
      if (!url) return "";
      // Get the last part of the URL (filename)
      const parts = url.split("/");
      return parts[parts.length - 1];
    };

    // Helper to ensure production URLs
    const ensureProductionUrl = (url) => {
      if (!url) return url;

      // Convert localhost URLs to production URLs
      if (
        state.isProduction &&
        (url.includes("localhost") || url.includes("127.0.0.1"))
      ) {
        const filename = getFilename(url);

        // Determine the path part
        let pathPart = "images";
        if (url.includes("/uploads/")) {
          pathPart = "uploads";
        } else if (url.includes("/smallImages/")) {
          pathPart = "smallImages";
        }

        return `${API_URL}/${pathPart}/${filename}`;
      }

      // Ensure HTTPS in production
      if (state.isProduction && url.startsWith("http:")) {
        return url.replace("http:", "https:");
      }

      return url;
    };

    // Store unique URLs by filename
    const uniqueUrls = new Map();

    // Process smallImages array
    if (Array.isArray(product.smallImages)) {
      product.smallImages.forEach((img) => {
        // Handle string URLs
        if (typeof img === "string" && img) {
          const fixedUrl = ensureProductionUrl(img);
          const filename = getFilename(fixedUrl);
          uniqueUrls.set(filename, fixedUrl);
        }
        // Handle object URLs
        else if (typeof img === "object" && img !== null) {
          // Process object with URL properties
          if (img.desktop) {
            const fixedUrl = ensureProductionUrl(img.desktop);
            const filename = getFilename(fixedUrl);
            uniqueUrls.set(filename, fixedUrl);
          } else if (img.mobile) {
            const fixedUrl = ensureProductionUrl(img.mobile);
            const filename = getFilename(fixedUrl);
            uniqueUrls.set(filename, fixedUrl);
          }
        }
      });
    }

    // Also add from legacy fields if not already present
    if (Array.isArray(product.smallImagesLocal)) {
      product.smallImagesLocal.forEach((url) => {
        if (url) {
          const fixedUrl = ensureProductionUrl(url);
          const filename = getFilename(fixedUrl);
          if (!uniqueUrls.has(filename)) {
            uniqueUrls.set(filename, fixedUrl);
          }
        }
      });
    }

    // Return just the unique URLs as an array
    return Array.from(uniqueUrls.values());
  }

  const mainImageUrls = getAllMainImageUrls(product);
  const smallImageUrls = getAllSmallImageUrls(product);

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
        class="product-description-textarea"
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
    <div class="current-images">
      <h3>Current Images</h3>
      <div class="main-image-section">
        <p>Main Image</p>
        <div class="main-image">
          ${
            mainImageUrls[0]
              ? `
          <img src="${mainImageUrls[0]}" alt="Main Image" loading="lazy" />
          <button type="button" class="delete-image-btn" data-image-type="main" data-image-url="${encodeURIComponent(
            mainImageUrls[0]
          )}" data-product-id="${product.id}">&#10005;</button>
          `
              : `<p>No main image</p>`
          }
        </div>
      </div>
      
      <div class="small-images-section">
        <p>Small Images</p>
        <div class="small-images">
          ${smallImageUrls
            .map(
              (url, idx) => `
          <div class="small-image">
            <img src="${url}" alt="Small Image ${idx + 1}" loading="lazy" />
            <button type="button" class="delete-image-btn" data-image-type="small" data-image-url="${encodeURIComponent(
              url
            )}" data-product-id="${product.id}">&#10005;</button>
          </div>
        `
            )
            .join("")}
        </div>
      </div>
    </div>
    
    <div class="file-upload-container">
      <h3>Add New Images</h3>
      
      <div class="file-upload-field">
        <label class="file-upload-label">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          New Main Image
        </label>
        <div class="file-upload-input">
          <input
            type="file"
            name="mainImage"
            id="mainImage"
            accept="image/*"
          />
        </div>
        <p class="file-upload-help">This will replace the current main image. Max size: 5MB</p>
      </div>
      
      <div class="file-upload-field">
        <label class="file-upload-label">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
            <polyline points="21 11 14 4 7 11"></polyline>
          </svg>
          Additional Product Images
        </label>
        <div class="file-upload-input">
          <input
            type="file"
            name="smallImages"
            id="smallImages"
            multiple
            accept="image/*"
          />
        </div>
        <p class="file-upload-help">Select multiple images to add to existing gallery. Max size per image: 5MB</p>
      </div>
    </div>
    
    <input type="hidden" id="product-id" value="${product.id}">
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

  // Add event listeners for delete image buttons
  document.querySelectorAll(".delete-image-btn").forEach((btn) => {
    btn.addEventListener("click", async function () {
      const imageType = this.dataset.imageType;
      const productId = this.dataset.productId;
      const imageUrl = decodeURIComponent(this.dataset.imageUrl);

      if (confirm(`Are you sure you want to delete this ${imageType} image?`)) {
        try {
          console.log(`Deleting ${imageType} image: ${imageUrl}`);

          const response = await fetch(`${API_URL}/deleteproductimage`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
            },
            body: JSON.stringify({
              productId,
              imageType,
              imageUrl,
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          if (result.success) {
            alert("Image deleted successfully!");
            // Fetch the product again and refresh the page
            try {
              // Fetch fresh data after deletion
              const refreshedProduct = await fetchProduct(productId);
              if (refreshedProduct) {
                // If successful, update the edit form with fresh data
                editProduct(refreshedProduct);
              } else {
                // If product fetch fails, reload the whole product list
                fetchInfo();
              }
            } catch (fetchError) {
              console.error("Error fetching updated product:", fetchError);
              // Fallback to reload all products if fetching the single product fails
              fetchInfo();
            }
          } else {
            throw new Error(result.message || "Failed to delete image");
          }
        } catch (error) {
          console.error("Error deleting image:", error);
          alert("Error deleting image: " + error.message);
        }
      }
    });
  });

  form.addEventListener("submit", updateProduct);
}

// Helper function to fetch a single product
async function fetchProduct(productId) {
  try {
    const response = await fetch(`${API_URL}/getproduct/${productId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching product:", error);
    throw error;
  }
}

async function updateProduct(e) {
  e.preventDefault();

  const productId = document.getElementById("product-id").value;
  const name = document.getElementById("name").value;
  const usdPrice = document.getElementById("old-price").value;
  const ilsPrice = document.getElementById("new-price").value;
  const description = document.getElementById("description").value;
  const category = document.getElementById("category").value;
  const quantity = document.getElementById("quantity").value;
  const securityMargin = document.getElementById("security-margin").value;

  // Get new image files
  const mainImageFile = document.getElementById("mainImage").files[0];
  const smallImageFiles = document.getElementById("smallImages").files;

  // Create FormData object for multipart/form-data
  const formData = new FormData();
  formData.append("name", name);
  formData.append("usd_price", usdPrice);
  formData.append("ils_price", ilsPrice);
  formData.append("description", description);
  formData.append("category", category);
  formData.append("quantity", quantity);
  formData.append("security_margin", securityMargin);

  // Append new images if they exist
  if (mainImageFile) {
    formData.append("mainImage", mainImageFile);
  }
  if (smallImageFiles.length > 0) {
    Array.from(smallImageFiles).forEach((file, index) => {
      formData.append(`smallImages`, file);
    });
  }

  try {
    const response = await fetch(`${API_URL}/updateproduct/${productId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      alert("Product updated successfully!");

      // Save the updated product's category
      const targetCategory = category;
      console.log("Target category for redirect:", targetCategory);

      // Store it in state
      state.selectedCategory = targetCategory;

      // Clear the current content
      clear();

      try {
        // Fetch products directly here instead of relying on fetchInfo flow
        console.log("Fetching products for category redirect");
        const productsResponse = await fetch(`${API_URL}/allproducts`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
          },
        });

        if (!productsResponse.ok) {
          throw new Error(`HTTP error! status: ${productsResponse.status}`);
        }

        const productsData = await productsResponse.json();

        // Create the products page with the data we just fetched
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

        // Set the category filter to our target category immediately
        const categoryFilter = document.getElementById("categoryFilter");
        if (categoryFilter) {
          categoryFilter.value = targetCategory;
        }

        // Load products with our data and set up event handlers
        loadProducts(productsData);
        addCategoryFilterHandler(productsData);
        setupBulkActions();

        // Highlight success message
        const successMsg = document.createElement("div");
        successMsg.className = "success-message";
        successMsg.style.cssText = `
          background-color: #d4edda;
          color: #155724;
          padding: 10px 15px;
          border-radius: 4px;
          margin-bottom: 15px;
          font-weight: bold;
        `;
        successMsg.textContent = `Product updated successfully and moved to ${targetCategory} category!`;

        // Insert at the top of the product list
        const listProductHeader = document.querySelector(
          ".list-product-header"
        );
        if (listProductHeader) {
          listProductHeader.after(successMsg);

          // Auto-remove after 5 seconds
          setTimeout(() => {
            successMsg.style.opacity = "0";
            successMsg.style.transition = "opacity 0.5s ease";
            setTimeout(() => successMsg.remove(), 500);
          }, 5000);
        }

        // Scroll to the product list
        const listProduct = document.querySelector(".list-product");
        if (listProduct) {
          listProduct.scrollIntoView({ behavior: "smooth" });
        }
      } catch (error) {
        console.error("Error in custom category redirect:", error);
        // Fallback to original approach if our custom loading fails
        fetchInfo();
      }
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

    console.log("Uploading images...");
    submitBtn.innerHTML = "Uploading images...";

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
    }

    console.log("Image upload response:", imageData);
    submitBtn.innerHTML = "Saving product...";

    // 3. Add product data with correct image structure
    const productData = {
      name,
      description,
      category,
      quantity: Number(quantity) || 0,
      oldPrice: parseFloat(oldPrice),
      newPrice: parseFloat(newPrice),
      security_margin: securityMargin,
      // Include all image data from the upload response
      mainImage: imageData.mainImage,
      smallImages: imageData.smallImages,
      // Legacy fields for backward compatibility
      image: imageData.mainImage?.desktop || "",
      imageLocal: imageData.mainImage?.desktopLocal || "",
      publicImage: imageData.mainImage?.publicDesktop || "",
    };

    console.log(
      "Sending product data to server:",
      JSON.stringify(productData, null, 2)
    );

    // Send product data to server
    const productResponse = await fetch(`${API_URL}/addproduct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
      },
      body: JSON.stringify(productData),
    });

    if (!productResponse.ok) {
      const errorText = await productResponse.text();
      throw new Error(`Failed to create product: ${errorText}`);
    }

    const productResult = await productResponse.json();
    if (!productResult.success) {
      throw new Error(productResult.error || "Failed to create product");
    }

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

    // Clear current content
    clear();

    // Create success card
    const successCard = document.createElement("div");
    successCard.className = "success-card";

    // Create success content
    successCard.innerHTML = `
      <h2 class="success-title">Product Added Successfully!</h2>
      <p class="success-message">Your new product has been added to the <strong>${targetCategory}</strong> category.</p>
      <div class="success-actions">
        <button id="view-category-btn" class="view-category-btn">View ${targetCategory} Products</button>
        <button id="add-another-btn" class="add-another-btn">Add Another Product</button>
      </div>
    `;

    // Add the card to the page
    pageContent.appendChild(successCard);

    // Add event listeners to buttons
    document
      .getElementById("view-category-btn")
      .addEventListener("click", () => {
        state.selectedCategory = targetCategory;
        fetchInfo();
        setTimeout(() => {
          const categoryFilter = document.getElementById("categoryFilter");
          if (categoryFilter) {
            categoryFilter.value = targetCategory;
            const event = new Event("change");
            categoryFilter.dispatchEvent(event);
          }
        }, 1000);
      });

    document.getElementById("add-another-btn").addEventListener("click", () => {
      loadAddProductsPage();
    });
  } catch (error) {
    console.error("Error:", error);
    alert(`Error: ${error.message}`);
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
         class="product-description-textarea"
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
     <div class="file-upload-container">
       <h3>Product Images</h3>
       
       <div class="file-upload-field">
         <label class="file-upload-label">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
             <circle cx="8.5" cy="8.5" r="1.5"></circle>
             <polyline points="21 15 16 10 5 21"></polyline>
           </svg>
           Main Product Image
         </label>
         <div class="file-upload-input">
           <input
             type="file"
             name="mainImage"
             id="mainImage"
             accept="image/*"
             required
           />
         </div>
         <p class="file-upload-help">This will be the primary image shown for your product. Max size: 5MB</p>
       </div>
       
       <div class="file-upload-field">
         <label class="file-upload-label">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
             <circle cx="8.5" cy="8.5" r="1.5"></circle>
             <polyline points="21 15 16 10 5 21"></polyline>
             <polyline points="21 11 14 4 7 11"></polyline>
           </svg>
           Additional Product Images
         </label>
         <div class="file-upload-input">
           <input
             type="file"
             name="smallImages"
             id="smallImages"
             multiple
             accept="image/*"
           />
         </div>
         <p class="file-upload-help">Select multiple images to show different angles or details. Max size per image: 5MB</p>
       </div>
     </div>
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
    const securityMargin =
      document.getElementById("security-margin").value || "5";

    const prodImage = document.getElementById("mainImage").files[0];
    if (!prodImage) {
      alert("Please select a main product image");
      return;
    }

    // Check file type
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/cr2",
      "image/arw",
      "application/octet-stream",
    ];
    const isCR2 = prodImage.name.toLowerCase().endsWith(".cr2");
    if (!validTypes.includes(prodImage.type) && !isCR2) {
      alert("Please select a valid image file (JPEG, PNG, GIF, WEBP, or CR2)");
      return;
    }

    // Check file size (limit to 50MB for RAW files, 5MB for others)
    const isRAW = isCR2 || prodImage.name.toLowerCase().endsWith(".arw");
    const maxSize = isRAW ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (prodImage.size > maxSize) {
      alert(
        isRAW
          ? "RAW image file is too large. Please select an image smaller than 50MB."
          : "Image file is too large. Please select an image smaller than 5MB."
      );
      return;
    }

    const multiProdImage = Array.from(
      document.getElementById("smallImages").files
    );

    const data = {
      name: prodName,
      description: prodDescription,
      category: prodCategory,
      quantity: Number(quantity) || 0,
      oldPrice: parseFloat(prodOldPrice),
      newPrice: parseFloat(prodNewPrice),
      security_margin: securityMargin,
      // Image data for upload
      mainImage: prodImage,
      smallImages: multiProdImage,
    };
    console.log("Form data:", data);

    addProduct(e, data, form);
  });
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
