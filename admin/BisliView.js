// BisliView.js - Refactored to use functional approach instead of class inheritance

// DOM Elements
const addProductsBtn = document.querySelector(".sidebar_add-products");
const productsListBtn = document.querySelector(".sidebar_products-list");
const sideBar = document.querySelector(".sidebar");
const pageContent = document.querySelector(".page-content");
const breadcrumbEl = document.getElementById("page-breadcrumb");

function setActiveNav(active) {
  // active: "products-list" | "add-product" | "edit-product"
  const all = document.querySelectorAll(".nav__item");
  all.forEach((el) => el.classList.remove("is-active"));

  if (active === "products-list") {
    productsListBtn?.classList.add("is-active");
    if (breadcrumbEl) breadcrumbEl.textContent = "Products";
  } else if (active === "add-product") {
    addProductsBtn?.classList.add("is-active");
    if (breadcrumbEl) breadcrumbEl.textContent = "Products / New Product";
  } else if (active === "edit-product") {
    addProductsBtn?.classList.add("is-active");
    if (breadcrumbEl) breadcrumbEl.textContent = "Products / Edit Product";
  }
}

// API Configuration
const IS_PRODUCTION =
  window.location.hostname !== "localhost" &&
  !window.location.hostname.includes("127.0.0.1");

const API_URL = (() => {
  // Check if we're in a production environment based on the URL
  let url;

  if (IS_PRODUCTION) {
    // In production, use the API endpoint on the same domain or a specified API domain
    // Option a: API on same domain but different path (default)
    url = `https://lobster-app-jipru.ondigitalocean.app/api`;

    // Option b: API on a separate subdomain (uncomment if needed)
    // url = `${window.location.protocol}//api.${window.location.hostname}`;

    // Option c: Completely separate API domain (uncomment if needed)
    // url = "https://api.yourdomain.com";
  } else {
    // In development, use localhost with the correct port
    // Prefer matching loopback host to avoid odd browser/network edge cases
    url = window.location.hostname.includes("127.0.0.1")
      ? "http://127.0.0.1:4000"
      : "http://localhost:4000";
  }
  return url;
})();

// Set a longer default timeout for all fetch operations
const DEFAULT_TIMEOUT = 15000; // 15 seconds

// State management
const state = {
  selectedCategory: "all",
  isProduction: IS_PRODUCTION,
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
    if (!url || typeof url !== "string") return null;
    const parts = url.split("/");
    return parts.length > 1 ? parts[parts.length - 1] : null; // Ensure there was a split
  };

  // Helper to ensure URLs use production API in production environment
  const ensureProductionUrl = (url) => {
    if (!url) return "";

    if (
      state.isProduction &&
      (url.includes("localhost") || url.includes("127.0.0.1"))
    ) {
      const filename = getFilename(url);
      if (!filename) return ""; // If filename is null, return empty string

      let pathPart = "images";
      if (url.includes("/uploads/")) {
        pathPart = "uploads";
      } else if (url.includes("/smallImages/")) {
        pathPart = "smallImages";
      }
      return `${API_URL}/${pathPart}/${filename}`;
    }

    if (state.isProduction && url.startsWith("http:")) {
      return url.replace("http:", "https:");
    }
    return url;
  };

  // Try mainImage structure
  if (mainImage) {
    let resolvedUrl;
    if (state.isProduction) {
      resolvedUrl = ensureProductionUrl(
        mainImage.publicDesktop || mainImage.desktop
      );
    } else {
      resolvedUrl = mainImage.desktopLocal || mainImage.desktop;
      if (!resolvedUrl) resolvedUrl = ""; // Convert null to empty string
    }
    if (
      resolvedUrl &&
      typeof resolvedUrl === "string" &&
      resolvedUrl.trim() !== ""
    )
      return resolvedUrl;
  }

  // Fallback to legacy fields, processed by ensureProductionUrl
  let legacyUrl =
    ensureProductionUrl(image) || ensureProductionUrl(publicImage);
  if (legacyUrl && typeof legacyUrl === "string" && legacyUrl.trim() !== "")
    return legacyUrl;

  // Fallback to imageLocal (should be a direct path or already a full URL)
  if (imageLocal) {
    // If imageLocal itself is a full URL, use it; otherwise, it might be a relative path needing API_URL.
    // However, typically imageLocal was for local dev and might not need full processing.
    // For safety, ensure it's a non-empty string.
    if (typeof imageLocal === "string" && imageLocal.trim() !== "")
      return imageLocal;
  }

  console.warn(
    "[BisliView Global getImageUrl] No valid image URL found, returning empty string."
  );
  return "";
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

  return (
    isAdminPath || hasAdminMarker || hasAdminTitle || loadedFromAdminScript
  );
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
        setActiveNav("products-list");
        fetchInfo();
      }
    })
    .catch((error) => {
      console.error("Authentication check failed:", error);
    });
}

// Add a new function to show and hide the loading animation
function showLoadingAnimation() {
  // Remove any existing loader first
  const existingLoader = document.querySelector(".products-loader-container");
  if (existingLoader) {
    existingLoader.remove();
  }

  // Create a new loader element
  const loaderContainer = document.createElement("div");
  loaderContainer.className = "products-loader-container";
  loaderContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(15, 16, 34, 0.82);
    z-index: 999;
    backdrop-filter: blur(5px);
    transition: opacity 0.3s ease;
  `;

  // Create the loader animation
  const loader = document.createElement("div");
  loader.className = "products-loader";

  // Use a jewelry-themed loader design
  loader.innerHTML = `
    <style>
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
      }
      
      .loader-ring {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        border: 3px solid transparent;
        border-top-color: #4e54c8;
        border-bottom-color: #e74c3c;
        animation: spin 1.5s linear infinite;
        position: relative;
      }
      
      .loader-ring:before, .loader-ring:after {
        content: '';
        position: absolute;
        border-radius: 50%;
      }
      
      .loader-ring:before {
        top: 5px;
        left: 5px;
        right: 5px;
        bottom: 5px;
        border: 3px solid transparent;
        border-left-color: #f0c419;
        border-right-color: #4ade80;
        animation: spin 1s linear infinite reverse;
      }
      
      .loader-ring:after {
        top: 15px;
        left: 15px;
        right: 15px;
        bottom: 15px;
        border: 3px solid transparent;
        border-top-color: #4ade80;
        border-bottom-color: #f0c419;
        animation: spin 1.2s linear infinite;
      }
      
      .loader-text {
        margin-top: 20px;
        font-family: Arial, sans-serif;
        color: rgba(255, 255, 255, 0.88);
        font-size: 16px;
        letter-spacing: 1px;
        text-align: center;
      }
      
      .loader-text span {
        display: inline-block;
        animation: pulse 1.5s infinite;
      }
      
      .loader-text span:nth-child(2) {
        animation-delay: 0.2s;
      }
      
      .loader-text span:nth-child(3) {
        animation-delay: 0.4s;
      }
      
      .shimmer {
        background: linear-gradient(90deg, 
          rgba(255,255,255,0) 0%, 
          rgba(255,255,255,0.8) 50%, 
          rgba(255,255,255,0) 100%);
        background-size: 200% 100%;
        animation: shimmer 2s infinite;
        background-repeat: no-repeat;
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        border-radius: 50%;
        pointer-events: none;
      }
      
      .product-card-placeholder {
        height: 100px;
        background: #f0f0f0;
        margin-bottom: 10px;
        border-radius: 8px;
        overflow: hidden;
        position: relative;
      }
    </style>
    <div class="loader-ring">
      <div class="shimmer"></div>
    </div>
    <div class="loader-text">
      <span>L</span><span>o</span><span>a</span><span>d</span><span>i</span><span>n</span><span>g</span>
      <span>.</span><span>.</span><span>.</span>
    </div>
  `;

  loaderContainer.appendChild(loader);
  document.body.appendChild(loaderContainer);

  return loaderContainer;
}

function hideLoadingAnimation() {
  const loader = document.querySelector(".products-loader-container");
  if (loader) {
    // Fade out animation
    loader.style.opacity = "0";

    // Remove after fade completes
    setTimeout(() => {
      loader.remove();
    }, 300);
  }
}

// Update the fetchInfo function to include the loading animation
async function fetchInfo() {
  try {
    // First check authentication again
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
      return;
    }

    // Show the loading animation
    const loader = showLoadingAnimation();

    // Add a minimum delay to ensure animation is visible even for fast loads
    const minDelay = new Promise((resolve) => setTimeout(resolve, 800));

    const response = await fetch(`${API_URL}/allproducts`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
      },
    });

    const data = await response.json();

    // Wait for minimum delay to complete
    await minDelay;

    // Hide the loading animation
    hideLoadingAnimation();

    // Load the products page with the fetched data
    loadProductsPage(data);
  } catch (error) {
    // Hide loading animation in case of error
    hideLoadingAnimation();

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
        showLoginPage(
          "You must have administrator privileges to access this page."
        );
        return false;
      }

      return true;
    } catch (error) {
      if (error.message === "auth_check_timed_out") {
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
    background: rgba(15, 16, 34, 0.86);
      display: flex;
      justify-content: center;
      align-items: center;
    z-index: 1000;
    backdrop-filter: blur(12px);
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
  // Add event listeners for admin functionality
  if (addProductsBtn) {
    // Remove any existing listeners first to prevent duplicates
    addProductsBtn.removeEventListener("click", loadAddProductsPage);

    // Add fresh event listener
    addProductsBtn.addEventListener("click", () => {
      setActiveNav("add-product");
      loadAddProductsPage();
    });
  }

  if (productsListBtn) {
    // Remove any existing listeners first to prevent duplicates
    productsListBtn.removeEventListener("click", fetchInfo);

    // Add fresh event listener
    productsListBtn.addEventListener("click", () => {
      setActiveNav("products-list");
      fetchInfo();
    });
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

  setActiveNav("products-list");

  const markup = `
    <div class="page">
      <div class="page__header">
        <div>
          <h2 class="page__title">Product Inventory List</h2>
          <p class="page__subtitle">Monitor stock levels, track reorder points, and manage product availability.</p>
        </div>
        <div class="page__actions">
          <button type="button" class="btn" id="export-products-btn">Export</button>
          <button type="button" class="btn btn--primary" id="go-add-product-btn">Add Product</button>
        </div>
      </div>

      <div class="toolbar">
        <div class="control">
          <input id="productSearch" class="input" type="text" placeholder="Search by product name, ID..." />
        </div>
        <div class="control" style="min-width: 220px; flex: 0 0 auto;">
          <select id="categoryFilter" class="select">
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
        <div class="control" style="min-width: 180px; flex: 0 0 auto;">
          <div class="badge" id="resultsBadge">0 items</div>
        </div>
      </div>

      <div class="card">
        <div class="card__header">
          <div class="card__meta">
            <label class="badge" style="cursor:pointer; flex-shrink: 0;">
              <input type="checkbox" id="select-all" class="product-checkbox" style="margin-right:8px;" />
              Select all
            </label>
            <span class="badge" id="selected-count" style="flex-shrink: 0; display: none;"></span>
            <button id="bulk-delete-btn" class="btn btn--danger" style="height:34px; padding:0 12px;">Delete selected</button>
          </div>
        </div>
        <div class="table">
          <div class="listproduct-format-main">
            <p>Select</p>
            <p>Product</p>
            <p class="hide-sm">Category</p>
            <p>Stock Qty</p>
            <p class="hide-sm">USD</p>
            <p class="hide-sm">ILS</p>
            <p>Status</p>
            <p style="text-align:right;">Actions</p>
          </div>
          <div class="listproduct-allproducts"></div>
        </div>
      </div>
    </div>`;

  pageContent.insertAdjacentHTML("afterbegin", markup);

  // Buttons
  const goAddBtn = document.getElementById("go-add-product-btn");
  if (goAddBtn) {
    goAddBtn.addEventListener("click", () => {
      setActiveNav("add-product");
      loadAddProductsPage();
    });
  }

  const exportBtn = document.getElementById("export-products-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => exportProductsCSV(data));
  }

  // Set the category filter to the stored category
  const categoryFilter = document.getElementById("categoryFilter");
  console.log(
    "[BisliView loadProductsPage] Current state.selectedCategory BEFORE setting filter:",
    state.selectedCategory
  );
  if (categoryFilter && state.selectedCategory) {
    categoryFilter.value = state.selectedCategory;
    console.log(
      `[BisliView loadProductsPage] Set categoryFilter.value to: ${categoryFilter.value}. Expected: ${state.selectedCategory}`
    );
  } else {
    console.warn(
      "[BisliView loadProductsPage] Category filter or state.selectedCategory not available. Filter might default to 'all'.",
      { hasFilter: !!categoryFilter, selectedCat: state.selectedCategory }
    );
    if (categoryFilter) categoryFilter.value = "all"; // Ensure it defaults visibly if state is messy
  }

  // Load products with the current category filter
  loadProducts(data);
  addCategoryFilterHandler(data);
  setupBulkActions();

  const search = document.getElementById("productSearch");
  if (search && search.dataset.bound !== "true") {
    search.addEventListener("input", () => {
      loadProducts(data);
      updateSelectedCount();
      setupBulkActions();
    });
    search.dataset.bound = "true";
  }
}

function loadProducts(data) {
  const categoryFilterDOM = document.getElementById("categoryFilter");
  const selectedCategoryFromDOM = categoryFilterDOM
    ? categoryFilterDOM.value
    : "all";

  const searchTermRaw = document.getElementById("productSearch")?.value || "";
  const searchTerm = searchTermRaw.trim().toLowerCase();

  // The category for filtering should primarily come from what was set in the DOM by loadProductsPage
  state.selectedCategory = selectedCategoryFromDOM;

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
  let filteredData =
    state.selectedCategory === "all"
      ? data
      : data.filter((product) => product.category === state.selectedCategory);

  if (searchTerm) {
    filteredData = filteredData.filter((product) => {
      const name = (product.name || "").toLowerCase();
      const id = String(product.id ?? "").toLowerCase();
      return name.includes(searchTerm) || id.includes(searchTerm);
    });
  }

  const productsContainer = document.querySelector(".listproduct-allproducts");
  if (!productsContainer) {
    console.error("Products container not found");
    return;
  }

  productsContainer.innerHTML = "";

  // Generate HTML for each product
  filteredData.forEach((item) => {
    const productElement = document.createElement("div");
    productElement.className = "row listproduct-format";

    // Safely get image URLs for srcset, defaulting to empty string if null/undefined
    const desktopSrc = item.mainImage?.desktop || item.image || "";
    const mobileSrc = item.mainImage?.mobile || item.image || "";
    // The main img src will use the full getImageUrl logic
    const mainImgSrc = getImageUrl(
      item.image,
      item.imageLocal,
      item.publicImage,
      item.mainImage
    );

    const qty = Number(item.quantity || 0);
    let statusClass = "badge--success";
    let statusText = "In Stock";
    if (qty <= 0) {
      statusClass = "badge--danger";
      statusText = "Out of Stock";
    } else if (qty <= 5) {
      statusClass = "badge--warning";
      statusText = "Low Stock";
    }

    productElement.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:center;">
        <input type="checkbox" class="product-checkbox" data-product-id="${
          item.id
        }">
      </div>
      <div class="row__name">
        <picture>
          <source media="(min-width: 768px)" srcset="${desktopSrc}" type="image/webp" />
          <source media="(max-width: 767px)" srcset="${mobileSrc}" type="image/webp" />
          <img src="${mainImgSrc}" class="listproduct-product-icon" alt="${
      item.name
    }" loading="lazy" />
        </picture>
        <div style="min-width:0;">
          <div class="row__title">${item.name}</div>
          <div class="mono">${String(item.id ?? "")}</div>
        </div>
      </div>
      <div class="mono hide-sm">${item.category ?? ""}</div>
      <div class="mono">${qty}</div>
      <div class="mono hide-sm">$${item.usd_price ?? ""}</div>
      <div class="mono hide-sm">₪${item.ils_price ?? ""}</div>
      <div>
        <span class="badge ${statusClass}">${statusText}</span>
      </div>
      <div class="actions">
        <button class="icon-action icon-action--primary edit-btn" title="Edit Product" data-product-id="${
          item.id
        }">
          <span style="font-weight:900;">✎</span>
        </button>
        <button class="icon-action icon-action--danger delete-btn" title="Delete Product" data-product-id="${
          item.id
        }">
          <span style="font-weight:900;">✕</span>
        </button>
      </div>
    `;
    productsContainer.appendChild(productElement);
  });

  const resultsBadge = document.getElementById("resultsBadge");
  if (resultsBadge) {
    resultsBadge.textContent = `${filteredData.length} items`;
  }

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
        setActiveNav("edit-product");
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
      setupBulkActions(); // Re-bind after list re-render
    });
  }
}

function setupBulkActions() {
  const selectAllCheckbox = document.getElementById("select-all");
  const bulkDeleteBtn = document.getElementById("bulk-delete-btn");

  if (selectAllCheckbox) {
    // Avoid duplicate bindings when setupBulkActions runs multiple times.
    if (selectAllCheckbox.dataset.bulkActionsBound !== "true") {
      selectAllCheckbox.addEventListener("change", function () {
        const checkboxes = document.querySelectorAll(".product-checkbox");
        checkboxes.forEach((checkbox) => {
          checkbox.checked = this.checked;
        });
        updateSelectedCount();
        updateBulkDeleteButton();
      });
      selectAllCheckbox.dataset.bulkActionsBound = "true";
    }
  }

  // Add event listeners for individual checkboxes
  document.querySelectorAll(".product-checkbox").forEach((checkbox) => {
    // Skip wiring if already bound on this element.
    if (checkbox.dataset.bulkActionsBound === "true") return;

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
    checkbox.dataset.bulkActionsBound = "true";
  });

  // Add event listener for bulk delete button
  if (bulkDeleteBtn) {
    if (bulkDeleteBtn.dataset.bulkActionsBound !== "true") {
      bulkDeleteBtn.addEventListener("click", bulkDeleteProducts);
      bulkDeleteBtn.dataset.bulkActionsBound = "true";
    }
  }

  // Ensure UI is consistent after (re)binding.
  updateSelectedCount();
  updateBulkDeleteButton();
}

function updateSelectedCount() {
  const selectedCount = document.getElementById("selected-count");
  const checkedBoxes = document.querySelectorAll(".product-checkbox:checked");
  if (selectedCount) {
    if (checkedBoxes.length > 0) {
      selectedCount.textContent = `(${checkedBoxes.length} selected)`;
      selectedCount.style.display = "inline-flex";
    } else {
      selectedCount.textContent = "";
      selectedCount.style.display = "none";
    }
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

function exportProductsCSV(data) {
  try {
    if (!Array.isArray(data)) return;
    const rows = [
      ["id", "name", "category", "usd_price", "ils_price", "quantity"].join(
        ","
      ),
      ...data.map((p) =>
        [
          JSON.stringify(p.id ?? ""),
          JSON.stringify(p.name ?? ""),
          JSON.stringify(p.category ?? ""),
          JSON.stringify(p.usd_price ?? ""),
          JSON.stringify(p.ils_price ?? ""),
          JSON.stringify(p.quantity ?? 0),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Export failed:", e);
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
  setActiveNav("edit-product");

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
      if (!url) return ""; // Return empty string instead of null/undefined

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
      if (!url) return "";

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
          if (fixedUrl && filename) uniqueUrls.set(filename, fixedUrl);
        }
        // Handle object URLs
        else if (typeof img === "object" && img !== null) {
          // Process object with URL properties
          if (img.desktop) {
            const fixedUrl = ensureProductionUrl(img.desktop);
            const filename = getFilename(fixedUrl);
            if (fixedUrl && filename) uniqueUrls.set(filename, fixedUrl);
          } else if (img.mobile) {
            const fixedUrl = ensureProductionUrl(img.mobile);
            const filename = getFilename(fixedUrl);
            if (fixedUrl && filename) uniqueUrls.set(filename, fixedUrl);
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
          if (fixedUrl && filename && !uniqueUrls.has(filename)) {
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
    <form id="editForm" class="page">
      <div class="page__header">
        <div>
          <h2 class="page__title">Edit Product</h2>
          <p class="page__subtitle">${product.name}</p>
        </div>
        <div class="page__actions">
          <button type="button" class="btn" id="cancel-edit-product">Cancel</button>
          <button type="submit" class="btn btn--primary addproduct-btn">Save Changes</button>
        </div>
      </div>

      <div class="split">
        <div style="display:flex; flex-direction:column; gap:14px;">
          <div class="card">
            <div class="card__header">
              <h3 class="card__title">Basic Information</h3>
            </div>
            <div class="card__body" style="display:flex; flex-direction:column; gap:14px;">
              <div class="field">
                <div class="label">Product Name</div>
                <input class="input" type="text" name="name" id="name" value="${
                  product.name
                }" />
              </div>
              <div class="field">
                <div class="label">Description</div>
                <textarea class="textarea" name="description" id="description">${
                  product.description || ""
                }</textarea>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card__header">
              <h3 class="card__title">Organization</h3>
            </div>
            <div class="card__body">
              <div class="grid-2">
                <div class="field">
                  <div class="label">Category</div>
                  <select class="select" name="category" id="category">
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
                </div>
                <div class="field">
                  <div class="label">Quantity</div>
                  <select class="select" name="quantity" id="quantity">
                    ${Array.from(
                      { length: 21 },
                      (_, i) =>
                        `<option id="${i}" value="${i}" ${
                          product.quantity == i ? "selected" : ""
                        }>${i}</option>`
                    ).join("")}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card__header">
              <h3 class="card__title">Pricing</h3>
            </div>
            <div class="card__body">
              <div class="grid-2">
                <div class="field">
                  <div class="label">Price in $</div>
                  <input class="input" type="text" name="usd_price" id="old-price" value="${
                    product.usd_price
                  }" />
                </div>
                <div class="field">
                  <div class="label">Security Margin (%)</div>
                  <input class="input" type="number" name="security_margin" id="security-margin" value="${
                    product.security_margin || 5
                  }" min="0" max="100" />
                </div>
              </div>
              <div class="field" style="margin-top:12px;">
                <div class="label">Price in ₪ (Auto-calculated)</div>
                <input class="input" type="text" name="ils_price" id="new-price" value="${
                  product.ils_price
                }" readonly />
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:14px;">
          <div class="card">
            <div class="card__header">
              <h3 class="card__title">Media</h3>
              <div class="card__meta">Current + Upload</div>
            </div>
            <div class="card__body" style="display:flex; flex-direction:column; gap:14px;">
              <div class="field">
                <div class="label">Current Main Image</div>
                <div class="thumbs">
                  ${
                    mainImageUrls[0]
                      ? `
                    <div class="thumb" style="width:88px;height:88px; position:relative;">
                      <img src="${
                        mainImageUrls[0]
                      }" alt="Main Image" loading="lazy" />
                      <button type="button" class="delete-image-btn" data-image-type="main" data-image-url="${encodeURIComponent(
                        mainImageUrls[0]
                      )}" data-product-id="${
                          product.id
                        }" style="position:absolute; top:-10px; right:-10px; width:28px; height:28px; border-radius:999px; border:1px solid rgba(239,68,68,.35); background: rgba(239,68,68,.18); color: rgba(239,68,68,.95); cursor:pointer; font-weight:900;">✕</button>
                    </div>`
                      : `<span class="help">No main image</span>`
                  }
                </div>
              </div>

              <div class="field">
                <div class="label">Current Gallery</div>
                <div class="thumbs">
                  ${smallImageUrls
                    .map(
                      (url, idx) => `
                    <div class="thumb" style="width:72px;height:72px; position:relative;">
                      <img src="${url}" alt="Small Image ${
                        idx + 1
                      }" loading="lazy" />
                      <button type="button" class="delete-image-btn" data-image-type="small" data-image-url="${encodeURIComponent(
                        url
                      )}" data-product-id="${
                        product.id
                      }" style="position:absolute; top:-10px; right:-10px; width:26px; height:26px; border-radius:999px; border:1px solid rgba(239,68,68,.35); background: rgba(239,68,68,.18); color: rgba(239,68,68,.95); cursor:pointer; font-weight:900;">✕</button>
                    </div>`
                    )
                    .join("")}
                </div>
              </div>

              <div class="field">
                <div class="label">Replace Main Image</div>
                <label class="dropzone" for="mainImage">
                  <div class="dropzone__title">Click to upload image</div>
                  <div class="dropzone__sub">Replaces the current main image</div>
                  <div class="thumbs" id="editMainThumbs"></div>
                </label>
                <input type="file" name="mainImage" id="mainImage" accept="image/*" style="display:none;" />
              </div>

              <div class="field">
                <div class="label">Add Gallery Images</div>
                <label class="dropzone" for="smallImages" style="min-height:140px;">
                  <div class="dropzone__title">Add more photos</div>
                  <div class="dropzone__sub">Adds to existing gallery</div>
                  <div class="thumbs" id="editSmallThumbs"></div>
                </label>
                <input type="file" name="smallImages" id="smallImages" multiple accept="image/*" style="display:none;" />
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card__header">
              <h3 class="card__title">Product</h3>
            </div>
            <div class="card__body">
              <div class="help">ID</div>
              <div class="mono" style="margin-top:6px;">${product.id}</div>
            </div>
          </div>
        </div>
      </div>

      <input type="hidden" id="product-id" value="${product.id}">
    </form>
  `;

  pageContent.insertAdjacentHTML("afterbegin", markup);

  // Cancel -> back to products list
  const cancelBtn = document.getElementById("cancel-edit-product");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      setActiveNav("products-list");
      fetchInfo();
    });
  }

  // Local previews for newly selected images (purely visual)
  const editMainInput = document.getElementById("mainImage");
  const editSmallInput = document.getElementById("smallImages");
  const editMainThumbs = document.getElementById("editMainThumbs");
  const editSmallThumbs = document.getElementById("editSmallThumbs");

  const renderThumbs = (files, container, max = 5) => {
    if (!container) return;
    container.innerHTML = "";
    const list = Array.from(files || []).slice(0, max);
    list.forEach((file) => {
      const wrap = document.createElement("div");
      wrap.className = "thumb";
      const img = document.createElement("img");
      img.alt = file.name;
      img.loading = "lazy";
      img.src = URL.createObjectURL(file);
      wrap.appendChild(img);
      container.appendChild(wrap);
    });
  };

  editMainInput?.addEventListener("change", () => {
    renderThumbs(editMainInput.files, editMainThumbs, 1);
  });

  editSmallInput?.addEventListener("change", () => {
    renderThumbs(editSmallInput.files, editSmallThumbs, 5);
  });

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
    btn.addEventListener("click", async function (e) {
      // Defensive: keep this action from triggering any other handlers
      e.preventDefault();
      e.stopPropagation();

      const imageType = this.dataset.imageType;
      const productId = this.dataset.productId;
      const imageUrl = decodeURIComponent(this.dataset.imageUrl);
      console.log(imageUrl, imageType, productId);
      if (confirm(`Are you sure you want to delete this ${imageType} image?`)) {
        try {
          console.log(`Deleting ${imageType} image: ${imageUrl}`);

          const clickedBtn = this;
          const thumbEl = clickedBtn.closest(".thumb");
          const thumbsContainer = thumbEl ? thumbEl.parentElement : null;
          clickedBtn.disabled = true;

          const requestUrl = `${API_URL}/deleteproductimage`;
          const requestOptions = {
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
          };

          console.log("[BisliView deleteProductImage] Attempting fetch with:", {
            url: requestUrl,
            options: requestOptions,
          });

          const response = await fetch(requestUrl, requestOptions);

          // Check if the response was not OK (e.g., 4xx or 5xx status)
          if (!response.ok) {
            let errorText = await response
              .text()
              .catch(() => "Could not retrieve error text from server.");
            console.error(
              `HTTP error! status: ${response.status}, body: ${errorText}`
            );
            // Ensure errorText is a string
            errorText =
              typeof errorText === "string"
                ? errorText
                : JSON.stringify(errorText);
            throw new Error(
              `Server error: ${response.status}. Details: ${errorText.substring(
                0,
                200
              )}`
            );
          }

          const result = await response.json();
          if (result.success) {
            // Update UI in-place: remove the thumbnail and keep the user on the edit page.
            if (thumbEl) {
              thumbEl.remove();
            }

            if (imageType === "main") {
              // If we removed the only thumb, show the "No main image" helper
              if (thumbsContainer && thumbsContainer.children.length === 0) {
                thumbsContainer.innerHTML = `<span class="help">No main image</span>`;
              }
            }

            // Optionally keep the product object consistent (editProduct closure)
            try {
              if (imageType === "main" && product) {
                product.image = null;
                product.publicImage = null;
                product.imageLocal = null;
                if (product.mainImage) {
                  product.mainImage.desktop = null;
                  product.mainImage.mobile = null;
                  product.mainImage.publicDesktop = null;
                  product.mainImage.publicMobile = null;
                }
              }
            } catch {
              // ignore
            }
          } else {
            // Ensure result.message is a string before throwing
            const serverMessage =
              typeof result.message === "string"
                ? result.message
                : JSON.stringify(result.message);
            throw new Error(serverMessage || "Failed to delete image");
          }
        } catch (error) {
          console.error("Error deleting image:", error); // Original console log
          // Ensure error.message is always a string for the alert
          const alertMessage =
            typeof error.message === "string"
              ? error.message
              : "An unexpected error occurred.";
          alert("Error deleting image: " + alertMessage);
        } finally {
          try {
            this.disabled = false;
          } catch {
            // ignore
          }
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
  // Include fields for backward-compatible legacy update endpoints
  formData.append("id", productId);
  formData.append("oldPrice", usdPrice);
  formData.append("newPrice", ilsPrice);

  // Append new images if they exist
  if (mainImageFile) {
    formData.append("mainImage", mainImageFile);
  }
  if (smallImageFiles.length > 0) {
    Array.from(smallImageFiles).forEach((file, index) => {
      formData.append(`smallImages`, file);
    });
  }

  // Show spinner in button
  const submitBtn = document.querySelector("#editForm .addproduct-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="button-spinner"></span>';
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
        try {
          await fetchInfo();
          alert("Product updated successfully!");
        } catch (fallbackError) {
          console.error(
            "Error during fallback fetchInfo after product update:",
            fallbackError
          );
          alert(
            "Product was updated, but reloading the product list failed. Please refresh the page."
          );
        }
      }
    } else {
      throw new Error(result.message || "Failed to update product");
    }
  } catch (error) {
    console.error("Error updating product:", error);
    alert("Error updating product: " + error.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Update Product";
    }
  }
}

// Improve the fetchWithRetry function to better handle network errors
async function fetchWithRetry(url, options, maxRetries = state.maxRetries) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
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
        if (response.status === 404 || response.status === 405) {
          throw new Error("wrong_server_port");
        }

        throw new Error(`HTTP error ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error;

      // Check if we should immediately return for certain errors
      if (
        error.message.includes("timed_out") ||
        error.message.includes("NetworkError") ||
        error.message === "wrong_server_port"
      ) {
        // If this is our last retry, modify the error message
        if (attempt === maxRetries) {
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
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

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
      resolve(file);
      return;
    }

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
              resolve(file); // Fallback to original file
              return;
            }

            // Create a new File object
            const optimizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: new Date().getTime(),
            });

            resolve(optimizedFile);
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        resolve(file); // Fallback to original
      };
    };

    reader.onerror = () => {
      resolve(file); // Fallback to original
    };
  });
}

// Update the addProduct function to be minimal and clean
async function addProduct(e, data, form) {
  e.preventDefault();

  // Show loading spinner in button
  const submitBtn =
    form?.querySelector?.("#submit-add-product") ||
    form?.querySelector?.('button[type="submit"]') ||
    document.getElementById("submit-add-product") ||
    document.querySelector("#uploadForm button[type='submit']");

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="button-spinner"></span>';
  }

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

    if (submitBtn) submitBtn.innerHTML = '<span class="button-spinner"></span>';

    // Submit image
    const imageResponse = await fetch(`${API_URL}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
      },
      body: formData,
    });

    if (!imageResponse.ok) {
      throw new Error(`Image upload failed: ${imageResponse.status}`);
    }

    const imageData = await imageResponse.json();
    if (!imageData.success) {
      throw new Error(imageData.error || "Image upload failed");
    }

    if (submitBtn) submitBtn.innerHTML = '<span class="button-spinner"></span>';

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

    // Store it in state
    state.selectedCategory = targetCategory;

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
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Add Product";
    }
  }
}

// Page Rendering Functions
async function loadAddProductsPage() {
  if (!(await checkAuth())) return;
  clear();
  setActiveNav("add-product");

  const markup = `
    <form id="uploadForm" class="page">
      <div class="page__header">
        <div>
          <h2 class="page__title">Add New Product</h2>
          <p class="page__subtitle">Fill in the details to create a new jewelry listing.</p>
        </div>
        <div class="page__actions">
          <button type="button" class="btn" id="cancel-add-product">Cancel</button>
          <button type="submit" class="btn btn--primary" id="submit-add-product">Add Product</button>
        </div>
      </div>

      <div class="split">
        <div style="display:flex; flex-direction:column; gap:14px;">
          <div class="card">
            <div class="card__header">
              <h3 class="card__title">Basic Information</h3>
            </div>
            <div class="card__body" style="display:flex; flex-direction:column; gap:14px;">
              <div class="field">
                <div class="label">Product Name</div>
                <input class="input" type="text" name="name" id="name" placeholder="e.g. 18k Gold Diamond Eternity Ring" />
              </div>

              <div class="field">
                <div class="label">Description</div>
                <textarea class="textarea" name="description" id="description" placeholder="Describe the product details, materials, and craftsmanship..."></textarea>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card__header">
              <h3 class="card__title">Organization</h3>
            </div>
            <div class="card__body">
              <div class="grid-2">
                <div class="field">
                  <div class="label">Category</div>
                  <select class="select" name="category" id="category">
                    <option id="necklaces" value="necklaces">Necklaces</option>
                    <option id="crochet-necklaces" value="crochet-necklaces">Crochet Necklaces</option>
                    <option id="bracelets" value="bracelets">Bracelets</option>
                    <option id="hoop-earrings" value="hoop-earrings">Hoop Earrings</option>
                    <option id="dangle-earrings" value="dangle-earrings">Dangle Earrings</option>
                    <option id="unisex" value="unisex">Unisex</option>
                    <option id="shalom-club" value="shalom-club">Shalom Club</option>
                  </select>
                </div>
                <div class="field">
                  <div class="label">Quantity</div>
                  <select class="select" name="quantity" id="quantity">
                    ${Array.from({ length: 21 }, (_, i) => {
                      const selected = i === 1 ? "selected" : "";
                      return `<option id="${i}" value="${i}" ${selected}>${i}</option>`;
                    }).join("")}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card__header">
              <h3 class="card__title">Pricing</h3>
            </div>
            <div class="card__body">
              <div class="grid-2">
                <div class="field">
                  <div class="label">Price in $</div>
                  <input class="input" type="text" name="usd_price" id="old-price" placeholder="0.00" />
                </div>
                <div class="field">
                  <div class="label">Security Margin (%)</div>
                  <input class="input" type="number" name="security_margin" id="security-margin" placeholder="5" value="5" min="0" max="100" />
                </div>
              </div>
              <div class="field" style="margin-top:12px;">
                <div class="label">Price in ₪ (Auto-calculated)</div>
                <input class="input" type="text" name="ils_price" id="new-price" placeholder="Auto-calculated" readonly />
                <div class="help">ILS is calculated from USD with a security margin.</div>
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:14px;">
          <div class="card">
            <div class="card__header">
              <h3 class="card__title">Media</h3>
              <div class="card__meta"><span id="media-count">0/0 Files</span></div>
            </div>
            <div class="card__body" style="display:flex; flex-direction:column; gap:14px;">
              <div class="field">
                <div class="label">Main Image</div>
                <label class="dropzone" for="mainImage">
                  <div class="dropzone__title">Click to upload image</div>
                  <div class="dropzone__sub">or drag and drop here</div>
                  <div class="thumbs" id="mainImageThumbs"></div>
                </label>
                <input type="file" name="mainImage" id="mainImage" accept="image/*" required style="display:none;" />
                <div class="help">This will be the primary image shown for your product. Max size: 5MB</div>
              </div>

              <div class="field">
                <div class="label">Additional Images</div>
                <label class="dropzone" for="smallImages" style="min-height:140px;">
                  <div class="dropzone__title">Add more photos</div>
                  <div class="dropzone__sub">Multiple files supported</div>
                  <div class="thumbs" id="smallImageThumbs"></div>
                </label>
                <input type="file" name="smallImages" id="smallImages" multiple accept="image/*" style="display:none;" />
                <div class="help">Select multiple images to show different angles or details. Max size per image: 5MB</div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card__header">
              <h3 class="card__title">Inventory</h3>
            </div>
            <div class="card__body">
              <div class="help">Inventory is driven by your Quantity field.</div>
              <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
                <span class="badge" id="invCategoryBadge">Category: —</span>
                <span class="badge" id="invQtyBadge">Qty: —</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  `;

  pageContent.insertAdjacentHTML("afterbegin", markup);
  addProductHandler();

  // Cancel -> back to products list
  const cancelBtn = document.getElementById("cancel-add-product");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      setActiveNav("products-list");
      fetchInfo();
    });
  }

  // Keep small inventory badges in sync (purely visual)
  const categoryEl = document.getElementById("category");
  const qtyEl = document.getElementById("quantity");
  const catBadge = document.getElementById("invCategoryBadge");
  const qtyBadge = document.getElementById("invQtyBadge");
  const updateInvBadges = () => {
    if (catBadge && categoryEl)
      catBadge.textContent = `Category: ${categoryEl.value}`;
    if (qtyBadge && qtyEl) qtyBadge.textContent = `Qty: ${qtyEl.value}`;
  };
  categoryEl?.addEventListener("change", updateInvBadges);
  qtyEl?.addEventListener("change", updateInvBadges);
  updateInvBadges();

  // Media previews + count
  const mainInput = document.getElementById("mainImage");
  const smallInput = document.getElementById("smallImages");
  const mainThumbs = document.getElementById("mainImageThumbs");
  const smallThumbs = document.getElementById("smallImageThumbs");
  const mediaCount = document.getElementById("media-count");

  const renderThumbs = (files, container, max = 5) => {
    if (!container) return;
    container.innerHTML = "";
    const list = Array.from(files || []).slice(0, max);
    list.forEach((file) => {
      const wrap = document.createElement("div");
      wrap.className = "thumb";
      const img = document.createElement("img");
      img.alt = file.name;
      img.loading = "lazy";
      img.src = URL.createObjectURL(file);
      wrap.appendChild(img);
      container.appendChild(wrap);
    });
  };

  const updateMediaCount = () => {
    const mainCount = mainInput?.files?.length || 0;
    const smallCount = smallInput?.files?.length || 0;
    const total = mainCount + smallCount;
    const max = 1 + 5; // visual hint (main + up to 5 thumbs)
    if (mediaCount) mediaCount.textContent = `${total}/${max} Files`;
  };

  if (mainInput) {
    mainInput.addEventListener("change", () => {
      renderThumbs(mainInput.files, mainThumbs, 1);
      updateMediaCount();
    });
  }
  if (smallInput) {
    smallInput.addEventListener("change", () => {
      renderThumbs(smallInput.files, smallThumbs, 5);
      updateMediaCount();
    });
  }
  updateMediaCount();

  // Calculate initial price if values are present
  calculateILSPrice();
}

function addProductHandler() {
  const form = document.getElementById("uploadForm");
  if (!form) return;

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

// NOTE: Initialization is scheduled by the checkCorrectUsage() IIFE near the top of this file.
// Keeping a single scheduling point avoids duplicate auth checks / event handler binding.

// Also add a helpful diagnostic function that users can call from console
window.diagnoseBisliServer = async function () {
  console.log("Diagnosing server connection issues...");
  console.log(`API URL: ${API_URL}`);
  console.log(`Current hostname: ${window.location.hostname}`);
  console.log(`Current port: ${window.location.port}`);
  const token = localStorage.getItem("auth-token");
  console.log(`Has auth-token: ${!!token}`);

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
        headers: (() => {
          const headers = {};
          if (token) headers.Authorization = `Bearer ${token}`;
          if (method === "POST" && endpoint !== "/upload") {
            headers["Content-Type"] = "application/json";
          }
          return Object.keys(headers).length ? headers : undefined;
        })(),
        body:
          method === "POST" && endpoint !== "/upload"
            ? JSON.stringify({})
            : undefined,
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
