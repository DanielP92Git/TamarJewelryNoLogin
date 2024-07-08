import "core-js/actual";
import "regenerator-runtime/runtime.js";
import * as model from "./model.js";
import CategoriesView from "./Views/categoriesView.js";
import homePageView from "./Views/homePageView.js";
import WorkshopView from "./Views/workshopView.js";
import AboutView from "./Views/aboutView.js";
import ContactMeView from "./Views/contactMeView.js";
import CartView from "./Views/cartView.js";
import LoginView from "./Views/NEWloginView.js";
import BisliView from "./Views/BisliView.js";

//----------------------------------------------------

// const menuBars = document.querySelector(".menubars-svg");

// const changeSVG = function () {
//   const parent = document.querySelector(".menubars-toggle");
//   parent.classList.toggle("close");
//   const checkIcon = parent.classList.contains("close");
//   let icon = "-svg";
//   icon = (!checkIcon ? "close" : "menubars") + icon;
//   document.querySelector("use").setAttribute("href", `#${icon}`);
// };
// menuBars.addEventListener("click", changeSVG);

/////////////////////////////////////////////////////

const controlHomePage = async function () {
  // await homePageView._addHandlerOpenModal();
  await model.handleLoadStorage();

  // homePageView.login()
  // homePageView.logInOutHandler(controlLoginPage);
  homePageView._addHandlerCloseModal();
  homePageView.addMobileHandler();
  homePageView._addHandlerCloseSubscribe();
  homePageView._addHandlerCloseThanks();
  homePageView._imageSlider();
  homePageView.svgHandler();
  homePageView._moveToTopHandler();
  homePageView.addRevealHandler();
  homePageView.persistCartNumber(await model.checkCartNumber());
};

const controlWorkshopPage = async function () {
  await model.handleLoadStorage();

  WorkshopView.svgHandler();
  // WorkshopView.logInOutHandler(controlLoginPage);
  WorkshopView.persistCartNumber(await model.checkCartNumber());
  WorkshopView._moveToTopHandler();
  WorkshopView.addRevealHandler();
  WorkshopView._imageSlider();
  WorkshopView.addMobileHandler();
};

const controlAboutPage = async function () {
  await model.handleLoadStorage();

  AboutView.svgHandler();
  AboutView.persistCartNumber(await model.checkCartNumber());
  // AboutView.stickyMenuFn();
  AboutView.addRevealHandler();
  AboutView.addMobileHandler();
  // AboutView.logInOutHandler(controlLoginPage);
};

const controlContactMePage = async function () {
  await model.handleLoadStorage();

  ContactMeView.svgHandler();
  ContactMeView.persistCartNumber(await model.checkCartNumber());
  ContactMeView.sendHandler();
  ContactMeView.addRevealHandler();
  ContactMeView.addMobileHandler();
  // ContactMeView.logInOutHandler(controlLoginPage);
};

const controlCategoriesPage = async function () {
  try {
    const categoriesView = new CategoriesView(
      document.getElementById("categories")
    );

    await model.handleLoadStorage();

    categoriesView.svgHandler();
    categoriesView._moveToTopHandler();
    // catecategoriesView.logInOutHandler(controlLoginPage);
    // categoriesView.stickyMenuFn();
    categoriesView._imageFlipper();
    categoriesView.addRevealHandler();
    categoriesView.addMobileHandler();
    categoriesView.persistCartNumber(await model.checkCartNumber());

    // 1) Load products from API
    const chunkData = await model.getAPI();
    // 2) Render products
    model.setPreviewItem(chunkData);
    categoriesView.addHandlerPreview(chunkData);
    // categoriesView.infiniteScrolling()
  } catch (err) {
    console.error(err);
  }
};

const controlCartPage = async function () {
  try {
    await model.handleLoadStorage();
    const cartNum = await model.checkCartNumber();
    CartView.persistCartNumber(cartNum);
    CartView.render(cartNum);
    CartView._renderSummary(cartNum);

    const cartData = model.cart;
    CartView._addHandlerCheckout(cartData);
    CartView.paypalCheckout(cartData);
    CartView.svgHandler();
    CartView.addRevealHandler();
    CartView.addMobileHandler();
    CartView._addHandlerDeleteAll(controlDeleteAll);
    // CartView.logInOutHandler(controlLoginPage);
  } catch (err) {
    console.log(err);
  }
};

const controlLoginPage = async function () {
  await model.handleLoadStorage();

  LoginView.svgHandler();
  LoginView.changeMode();
  LoginView.continueHandler();
  LoginView.addRevealHandler();
  LoginView.addMobileHandler();
  LoginView.persistCartNumber(await model.checkCartNumber());
};

// export const controlAddToCart = function (data) {
//   // 1) Update cart number
//   categoriesView.increaseCartNumber();

//     // 2) Pass data from clicked item and add it to model.cart
//     model.handleAddToCart(data);
// };

const controlDeleteFromCart = async function (id) {
  // 1) Remove from database
  await model.removeFromUserCart(id);

  // 2) Update cart number
  const cartNum = await model.checkCartNumber();
  CartView.persistCartNumber(cartNum);

  // 3) Remove item from cart page
  CartView._removeItem(cartNum);

  // 4) Update new summary
  CartView._renderSummary(cartNum);
};

const controlDeleteAll = async function () {
  //1) Delete from cart
  await model.deleteAll();

  //2) Update number
  const cartNum = await model.checkCartNumber();
  CartView.persistCartNumber(cartNum);

  // 3) Remove item from cart page
  CartView._removeAll(cartNum);

  // 4) Update new summary
  CartView._renderSummary(cartNum);
};

const controlBambaPage = function () {
  // BisliView.pageAuth();
  BisliView.modeHandler();
};

const init = async function () {
  if (document.body.id.includes("home")) {
    homePageView.addHomePageHandler(controlHomePage);
  }
  if (document.body.id.includes("workshop")) {
    WorkshopView.addWorkshopHandler(controlWorkshopPage);
  }
  if (document.body.id.includes("about")) {
    AboutView.addAboutHandler(controlAboutPage);
  }
  if (document.body.id.includes("contact-me")) {
    ContactMeView.addContactMeHandler(controlContactMePage);
  }
  if (document.body.id.includes("categories")) {
    // const categoriesView = new CategoriesView(document.getElementById('categories'));
    controlCategoriesPage();

    /**
     * ! User clicks add to cart:
     **/
    // categoriesView.addHandlerAddToCart(controlAddToCart);
  }

  if (document.body.id.includes("cart")) {
    CartView.addCartViewHandler(controlCartPage);
    /**
     * ! User clicks delete item:
     **/
    CartView._addHandlerDelete(controlDeleteFromCart);
  }
  if (document.body.id.includes("login")) {
    LoginView.addLoginViewHandler(controlLoginPage);
  }
  if (document.body.id.includes("bambot")) {
    BisliView.addBambaViewHandler(controlBambaPage);
  }
};
init();
