import 'core-js/actual';
import 'regenerator-runtime/runtime.js';
import * as model from './model.js';
// import { loadMenu } from './menuLoader.js'; // Removed
import CategoriesView from './Views/categoriesView.js';
import homePageView from './Views/homePageView.js';
import WorkshopView from './Views/workshopView.js';
import AboutView from './Views/aboutView.js';
import ContactMeView from './Views/contactMeView.js';
import CartView from './Views/cartView.js';
import LoginView from './Views/NEWloginView.js';
import BisliView from './Views/BisliView.js';

//----------------------------------------------------

const controlHomePage = async function (lng) {
  await model.handleLoadStorage();

  homePageView.setHomeLanguage(lng);
  homePageView.handleHomeLanguage();

  homePageView._imageSlider();
  homePageView._moveToTopHandler();
  homePageView.persistCartNumber(await model.checkCartNumber());

  // await homePageView._addHandlerOpenModal();
  // homePageView._addHandlerCloseModal();
  // homePageView._addHandlerCloseSubscribe();
  // homePageView._addHandlerCloseThanks();
};

const controlWorkshopPage = async function (lng) {
  await model.handleLoadStorage();

  WorkshopView._moveToTopHandler();
  WorkshopView._imageSlider();
  WorkshopView.setWorkshopLng(lng);
  WorkshopView.handleLanguage();
  WorkshopView.persistCartNumber(await model.checkCartNumber());
};

const controlAboutPage = async function (lng) {
  await model.handleLoadStorage();

  AboutView.setLanguage(lng);
  AboutView.setAboutDesc(lng);
  AboutView.handleLanguage();
  AboutView.persistCartNumber(await model.checkCartNumber());
};

const controlContactMePage = async function (lng) {
  await model.handleLoadStorage();

  ContactMeView.sendHandler();

  ContactMeView.setLanguage(lng);
  ContactMeView.setFormLng(lng);
  ContactMeView.persistCartNumber(await model.checkCartNumber());
};

const controlCategoriesPage = async function () {
  try {
    const body = document.querySelector('body');
    const idAttributeValue = body.id; // Assuming body id is "categories bracelets"
    const idParts = idAttributeValue.split(' ');
    const categoryName = idParts[idParts.length - 1]; // Extracted category name "bracelets"
    const categoryNameHebrew = body.dataset.hebrew; // Extracted category name "bracelets"
    const parentElement = document.querySelector('.parent-element');
    await model.handleLoadStorage();
    const cartNum = await model.checkCartNumber();
    let lng = 'eng';
    const categoriesView = new CategoriesView(
      parentElement,
      categoryName,
      categoryNameHebrew,
      lng,
      cartNum
    );

    console.log(cartNum);

    categoriesView._moveToTopHandler();
    categoriesView._imageFlipper();

    categoriesView.handleCategoriesLanguage();
  } catch (err) {
    console.error(err);
  }
};

const controlCartPage = async function (lng) {
  try {
    await model.handleLoadStorage();
    const cartNum = await model.checkCartNumber();
    CartView.render(cartNum);
    CartView._renderSummary(cartNum, lng);

    const cartData = model.cart;
    CartView._addHandlerCheckout(cartData);
    CartView.paypalCheckout(cartData);
    CartView._addHandlerDeleteAll(controlDeleteAll);

    CartView.setCartLng(lng);
    CartView.handleCartLanguage();
    CartView.persistCartNumber(cartNum);
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
  LoginView.setLanguage(lng);
  LoginView.handleLanguage();
  LoginView.persistCartNumber(await model.checkCartNumber());
};

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
  // Load menu for all pages // Removed
  // await loadMenu(); // Removed

  if (document.body.id.includes('home')) {
    homePageView.addHomePageHandler(controlHomePage);
  }
  if (document.body.id.includes('workshop')) {
    WorkshopView.addWorkshopHandler(controlWorkshopPage);
  }
  if (document.body.id.includes('about')) {
    AboutView.addAboutHandler(controlAboutPage);
  }
  if (document.body.id.includes('contact-me')) {
    ContactMeView.addContactMeHandler(controlContactMePage);
  }
  if (document.body.id.includes('categories')) {
    // const categoriesView = new CategoriesView(document.getElementById('categories'));
    controlCategoriesPage();

    /**
     * ! User clicks add to cart:
     **/
    // categoriesView.addHandlerAddToCart(controlAddToCart);
  }

  if (document.body.id.includes('cart')) {
    CartView.addCartViewHandler(controlCartPage);
    /**
     * ! User clicks delete item:
     **/
    CartView._addHandlerDelete(controlDeleteFromCart);
  }
  if (document.body.id.includes('login')) {
    LoginView.addLoginViewHandler(controlLoginPage);
  }
  if (document.body.id.includes('bambot')) {
    BisliView.addBambaViewHandler(controlBambaPage);
  }
};
init();
