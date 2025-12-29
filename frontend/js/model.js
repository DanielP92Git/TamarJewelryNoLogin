require('dotenv').config();
export const cart = [];
const host = process.env.API_URL;

// export const getAPI = async function () {
//   const response = await fetch(`${host}/allproducts`);
//   const data = await response.json();
//   return data;
// };

// export const fetchProductsByCategory = async function (categoryName) {
//   const category = categoryName;
//   const spinner = document.querySelector(".loader");
//   spinner.classList.remove("spinner-hidden");

//   try {
//     const response = await fetch(
//       `${process.env.API_URL}/productsByCategory`, // Adjust endpoint to fetch all products
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ category }),
//       }
//     );
//     const data = await response.json();
//     return data;
//   } catch (err) {
//     console.error("Failed to fetch products", err);
//   } finally {
//     // this.isLoading = false;
//     spinner.classList.add("spinner-hidden");
//   }
// };
// export const chunkProducts = async function () {
//   const response = await fetch(`${host}/chunkProducts`);
//   const data = await response.json();
//   return data;
// };

const fetchUserCartAPI = async function () {
  const response = await fetch(`${host}/getcart`, {
    method: 'POST',
    headers: {
      Accept: 'application/form-data',
      'auth-token': `${localStorage.getItem('auth-token')}`,
      'Content-Type': 'application/json',
    },
    body: '',
  });
  const data = await response.json();
  return data;
};

export const handleLoadStorage = async function () {
  try {
    // get cart if user is not logged in
    if (!localStorage.getItem('auth-token')) {
      const data = await JSON.parse(localStorage.getItem('cart'));
      if (!data) return;
      cart.push(...data);
    } else {
      const userData = await fetchUserCartAPI();
      if (!userData) return;
      // setItems(data);

      // if (userData) {
      //   const allProducts = await getAPI();

      //   const filtered = Object.entries(userData).filter(([id, amount]) => {
      //     if (amount > 0) return id;
      //   });
      //   const filteredId = filtered.map((arr) => +arr[0]);

      //   allProducts.filter((product) => {
      //     filteredId.forEach((cartId) => {
      //       if (cartId == product.id) {
      //         cart.push({
      //           title: product.name,
      //           description: product.description,
      //           image: product.image,
      //           price: product.ils_price,
      //           id: product.id,
      //           quantity: product.quantity,
      //           amount: 1,
      //         });
      //       }
      //     });
      //   });
      // }
    } // Here the 'data' is ALL users cartdata
  } catch (err) {
    console.error(err);
  }
};

// export const setItems = async function (data) {
//   const allProducts = await getAPI();

//   const filtered = Object.entries(data).filter(([id, amount]) => {
//     if (amount > 0) return id;
//   });
//   const filteredId = filtered.map((arr) => +arr[0]);

//   allProducts.filter((product) => {
//     filteredId.forEach((cartId) => {
//       if (cartId == product.id) {
//         cart.push({
//           title: product.name,
//           description: product.description,
//           image: product.image,
//           price: product.ils_price,
//           quantity: product.quantity,
//           id: product.id,
//           amount: 1,
//         });
//       }
//     });
//   });
// };

export const setPreviewItem = async function (data) {
  const allProducts = data;
  const filtered = Object.entries(data).filter(([id, amount]) => {
    if (amount > 0) return id;
  });
  const filteredId = filtered.map(arr => +arr[0]);

  allProducts.filter(product => {
    filteredId.forEach(cartId => {
      if (cartId == product.id) {
        cart.push({
          title: product.name,
          description: product.description,
          image: product.image,
          price: product.ils_price,
          quantity: product.quantity,
          id: product.id,
          amount: 1,
        });
      }
    });
  });
};

//////////////////////
/**
 * * ADD TO CART FUNCTIONS
 */

export const handleAddToCart = function (data) {
  // If NOT logged in:
  if (!localStorage.getItem('auth-token')) {
    addToLocalStorage(data);
  }
  // If logged in and there is a token:
  else {
    addToUserStorage(data);
  }
};

///////////////////////////
// Add to cart if USER LOGGED
///////////////////////////

export const addToUserStorage = data => {
  const itemId = data.dataset.id;
  fetch(`${host}/addtocart`, {
    method: 'POST',
    headers: {
      Accept: 'application/form-data',
      'auth-token': `${localStorage.getItem('auth-token')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ itemId: itemId }),
  })
    .then(response => response.json())
    .then(idData => idData); // Here 'data' is the item's id number
};

/////////////////////////////////
// If NOT LOGGED:
/////////////////////////////////

const createLocalStorage = function () {
  localStorage.setItem('cart', JSON.stringify(cart));
};

export const addToLocalStorage = async function (data) {
  // const allProducts = await getAPI();
  const itemId = data.getAttribute('data-id');
  let prodQuantity = +data.getAttribute('data-quant');
  // allProducts.find((product) => {
  //   if (product.id == itemId) {
  //     prodQuantity = product.quantity;
  //     return prodQuantity
  //   }
  // });

  // Safely get the image element
  const frontImageEl = data.querySelector('.front-image');
  const itemImage = frontImageEl ? frontImageEl.src : '';

  // Safely get the title element
  const titleEl = data.querySelector('.item-title');
  const itemTitle = titleEl ? titleEl.textContent : '';

  // Get currency from dataset
  const currencyCheck = data.dataset.currency || 'ils';

  // Safely get the price element - check for discounted price first
  const discountedPriceEl = data.querySelector('.item-price-discounted');
  const originalPriceEl = data.querySelector('.item-price-original');
  const priceEl = data.querySelector('.item-price');
  
  let itemPrice = '';
  let originalPrice = null;

  if (discountedPriceEl && discountedPriceEl.textContent) {
    // Has discount - get discounted price
    itemPrice = discountedPriceEl.textContent.replace(/[$₪]/g, '');
    if (originalPriceEl && originalPriceEl.textContent) {
      originalPrice = originalPriceEl.textContent.replace(/[$₪]/g, '');
    }
  } else if (priceEl && priceEl.textContent) {
    // No discount - use regular price
    itemPrice = priceEl.textContent.replace(/[$₪]/g, '');
  } else {
    console.error('Price element not found or has no text content');
    itemPrice = '0'; // Default to zero
  }

  // 1) Generate data:
  const itemData = {
    title: itemTitle,
    image: itemImage,
    price: itemPrice,
    originalPrice: originalPrice,
    discountedPrice: discountedPriceEl ? itemPrice : null,
    currency: currencyCheck,
    quantity: prodQuantity,
    id: +itemId,
  };
  // 2) Update item to cart
  addToLocalCart(itemData);
};

const addToLocalCart = function (data) {
  cart.push({
    title: data.title,
    image: data.image,
    price: data.price,
    originalPrice: data.originalPrice || null,
    discountedPrice: data.discountedPrice || null,
    currency: data.currency,
    id: +data.id,
    quantity: data.quantity,
    amount: 1,
  });
  createLocalStorage();
};

export const checkCartNumber = async function () {
  if (!localStorage.getItem('auth-token')) {
    const numberItems = cart
      .map(item => item.amount)
      .reduce((item, itemNext) => item + itemNext, 0);
    return numberItems;
  } else {
    const data = await fetchUserCartAPI();
    const filtered = Object.entries(data).filter(([id, amount]) => {
      if (amount > 0) return amount;
    });
    const itemsAmount = filtered.map(arr => +arr[1]).reduce((x, y) => x + y, 0);
    return itemsAmount;
  }
};

export const removeFromUserCart = async function (itemId) {
  if (!localStorage.getItem('auth-token')) {
    const search = cart.findIndex(el => el.id == itemId);
    cart.splice(search, 1);
    createLocalStorage();
  }
  if (localStorage.getItem('auth-token')) {
    const search = cart.findIndex(el => el.id == itemId);
    cart.splice(search, 1);
    const response = await fetch(`${host}/removefromcart`, {
      method: 'POST',
      headers: {
        Accept: 'application/form-data',
        'auth-token': `${localStorage.getItem('auth-token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ itemId: itemId }),
    });
    response.json();
  }
};

export const deleteAll = async function () {
  if (!localStorage.getItem('auth-token')) {
    cart.length = 0;
    createLocalStorage();
  }

  if (localStorage.getItem('auth-token')) {
    await fetch(`${host}/removeAll`, {
      method: 'POST',
      headers: {
        Accept: 'application/form-data',
        'auth-token': `${localStorage.getItem('auth-token')}`,
        'Content-Type': 'application/json',
      },
      body: '',
    });
  }
};

// Discount helper methods
let globalDiscountCache = null;
let discountCacheTimestamp = null;
const DISCOUNT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getGlobalDiscount = async function () {
  // Return cached value if still valid
  if (globalDiscountCache && discountCacheTimestamp) {
    const now = Date.now();
    if (now - discountCacheTimestamp < DISCOUNT_CACHE_DURATION) {
      return globalDiscountCache;
    }
  }

  try {
    const response = await fetch(`${host}/discount-settings`);
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        globalDiscountCache = {
          percentage: result.global_discount_percentage || 0,
          active: result.discount_active || false,
          label: result.discount_label || 'End of Year Discount',
        };
        discountCacheTimestamp = Date.now();
        return globalDiscountCache;
      }
    }
  } catch (error) {
    console.error('Error fetching discount settings:', error);
  }

  // Return default if fetch fails
  return {
    percentage: 0,
    active: false,
    label: 'End of Year Discount',
  };
};

export const calculateDiscountedPrice = function (originalPrice, discountPercent) {
  if (!discountPercent || discountPercent <= 0) return originalPrice;
  return Math.round(originalPrice * (1 - discountPercent / 100));
};
