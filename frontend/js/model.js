require("dotenv").config();
export const cart = [];
const host = process.env.API_URL;

export const getAPI = async function () {
  const response = await fetch(`${host}/allproducts`);
  const data = await response.json();
  return data;
};

const fetchUserCartAPI = async function () {
  const response = await fetch(`${host}/getcart`, {
    method: "POST",
    headers: {
      Accept: "application/form-data",
      "auth-token": `${localStorage.getItem("auth-token")}`,
      "Content-Type": "application/json",
    },
    body: "",
  });
  const data = await response.json();
  return data;
};

export const handleLoadStorage = async function () {
  try {
    // get cart if user is not logged in
    if (!localStorage.getItem("auth-token")) {
      const data = await JSON.parse(localStorage.getItem("cart"));
      if (!data) return;
      cart.push(...data);
    } else {
      const userData = await fetchUserCartAPI();
      if (!userData) return;
      // setItems(data);

      // const userStorage = await handleLoadStorage()
      if (userData) {
        const allProducts = await getAPI();

        const filtered = Object.entries(userData).filter(([id, amount]) => {
          if (amount > 0) return id;
        });
        const filteredId = filtered.map((arr) => +arr[0]);

        allProducts.filter((product) => {
          filteredId.forEach((cartId) => {
            if (cartId == product.id) {
              cart.push({
                title: product.name,
                description: product.description,
                image: product.image,
                price: product.new_price,
                id: product.id,
                quantity: product.quantity,
                amount: 1,
              });
            }
          });
        });
      }
    } // Here the 'data' is ALL users cartdata
  } catch (err) {
    console.error(err);
  }
};

export const setItems = async function (data) {
  // const userStorage = await handleLoadStorage()
  const allProducts = await getAPI();

  const filtered = Object.entries(data).filter(([id, amount]) => {
    if (amount > 0) return id;
  });
  const filteredId = filtered.map((arr) => +arr[0]);

  allProducts.filter((product) => {
    filteredId.forEach((cartId) => {
      if (cartId == product.id) {
        cart.push({
          title: product.name,
          description: product.description,
          image: product.image,
          price: product.new_price,
          qauntity: product.qauntity,
          id: product.id,
          amount: 1,
        });
      }
    });
  });
};

export const setPreviewItem = async function (data) {
  const allProducts = data;
  const filtered = Object.entries(data).filter(([id, amount]) => {
    if (amount > 0) return id;
  });
  const filteredId = filtered.map((arr) => +arr[0]);

  allProducts.filter((product) => {
    filteredId.forEach((cartId) => {
      if (cartId == product.id) {
        cart.push({
          title: product.name,
          description: product.description,
          image: product.image,
          price: product.new_price,
          quantity: product.qauntity,
          id: product.id,
          amount: 1,
        });
      }
    });
  });

  // console.log('Cart items:',cart);
};

//////////////////////
/**
 * * ADD TO CART FUNCTIONS
 */

export const handleAddToCart = function (data) {
  // If NOT logged in:
  if (!localStorage.getItem("auth-token")) {
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

export const addToUserStorage = (data) => {
  const itemId = data.dataset.id;
  fetch(`${host}/addtocart`, {
    method: "POST",
    headers: {
      Accept: "application/form-data",
      "auth-token": `${localStorage.getItem("auth-token")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ itemId: itemId }),
  })
    .then((response) => response.json())
    .then((idData) => console.log(idData)); // Here 'data' is the item's id number
};

/////////////////////////////////
// If NOT LOGGED:
/////////////////////////////////

const createLocalStorage = function () {
  localStorage.setItem("cart", JSON.stringify(cart));
};

export const addToLocalStorage = async function (data) {
  const allProducts = await getAPI();
  const itemId = data.getAttribute("data-id");
  let prodQuantity;
  const quant = allProducts.filter((product) => {
    if (product.id == itemId) {
      prodQuantity = product.quantity;
    }
  });
  // console.log(prodQuantity);
  // console.log(itemId);
  const itemImage = data.querySelector(".front-image").src;
  const itemTitle = data.querySelector(".item-title").textContent;
  let itemPrice = data
    .querySelector(".item-price")
    .textContent.replace("₪", "");

  // 1) Generate data:
  const itemData = {
    title: itemTitle,
    image: itemImage,
    price: itemPrice,
    quantity: +quant,
    id: +itemId,
  };
  // console.log(itemData.id)
  // 2) Update item to cart
  addToLocalCart(itemData);
};

const addToLocalCart = function (data) {
  // console.log('2',data.quantity);
  cart.push({
    title: data.title,
    image: data.image,
    price: data.price,
    id: +data.id,
    quantity: data.qauntity,
    amount: 1,
  });
  createLocalStorage();
  // console.log(cart);
};

export const checkCartNumber = async function () {
  if (!localStorage.getItem("auth-token")) {
    const numberItems = cart
      .map((item) => item.amount)
      .reduce((item, itemNext) => item + itemNext, 0);
    return numberItems;
  } else {
    const data = await fetchUserCartAPI();
    const filtered = Object.entries(data).filter(([id, amount]) => {
      if (amount > 0) return amount;
    });
    const itemsAmount = filtered
      .map((arr) => +arr[1])
      .reduce((x, y) => x + y, 0);
    return itemsAmount;
  }
};

export const removeFromUserCart = async function (itemId) {
  if (!localStorage.getItem("auth-token")) {
    const search = cart.findIndex((el) => el.id == itemId);
    cart.splice(search, 1);
    createLocalStorage();
  }
  if (localStorage.getItem("auth-token")) {
    const search = cart.findIndex((el) => el.id == itemId);
    cart.splice(search, 1);
    const response = await fetch(`${host}/removefromcart`, {
      method: "POST",
      headers: {
        Accept: "application/form-data",
        "auth-token": `${localStorage.getItem("auth-token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ itemId: itemId }),
    });
    response.json();
  }
};

export const deleteAll = async function () {
  if (!localStorage.getItem("auth-token")) {
    cart.length = 0;
    createLocalStorage();
  }

  if (localStorage.getItem("auth-token")) {
    await fetch(`${host}/removeAll`, {
      method: "POST",
      headers: {
        Accept: "application/form-data",
        "auth-token": `${localStorage.getItem("auth-token")}`,
        "Content-Type": "application/json",
      },
      body: "",
    });
  }
};
