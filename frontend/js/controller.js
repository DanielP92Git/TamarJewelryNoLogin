import 'core-js/actual';
import 'regenerator-runtime/runtime.js';
import { bootstrapLocaleSync, hydrateLocaleFromBackend } from './locale.js';
import * as model from './model.js';
// import { loadMenu } from './menuLoader.js'; // Removed
import homePageView from './Views/homePageView.js';
import WorkshopView from './Views/workshopView.js';
import AboutView from './Views/aboutView.js';
import ContactMeView from './Views/contactMeView.js';
import categoriesView from './Views/categoriesView.js';
import CartView from './Views/cartView.js';
import PoliciesView from './Views/policiesView.js';
// User login functionality has been removed

//----------------------------------------------------

// Set best-effort locale defaults ASAP (before view modules read localStorage).
bootstrapLocaleSync();

const controlHomePage = async function (lng) {
  await model.handleLoadStorage();
  const cartNum = await model.checkCartNumber();

  // Call base setLanguage first, passing the cart number
  homePageView.setLanguage(lng, cartNum);

  // Then call page-specific language setup
  homePageView.setHomeLanguage(lng);
  homePageView.handleHomeLanguage();

  homePageView._imageSlider();
  homePageView._moveToTopHandler();
  homePageView.stickyMenuFn();

  // Ensure cart icon is visible in desktop view (cart is now in header utilities, not inside nav list)
  setTimeout(() => {
    if (!window.matchMedia('(min-width: 800px)').matches) return;

    const cartLink = document.querySelector('.header-cart');
    const cartContainer = cartLink?.querySelector('.cart-container');
    const cartIcon = cartLink?.querySelector('.shoppingcart-svg');
    const cartNumber = cartLink?.querySelector('.cart-number-mobile');

    if (cartLink) {
      cartLink.style.display = 'inline-flex';
      cartLink.style.visibility = 'visible';
    }

    if (cartContainer) {
      cartContainer.style.display = 'flex';
      cartContainer.style.visibility = 'visible';
    }

    if (cartIcon) {
      cartIcon.style.display = 'inline-block';
      cartIcon.style.visibility = 'visible';
      cartIcon.style.opacity = '1';
    }

    if (cartNumber) {
      cartNumber.style.display = 'inline-flex';
      cartNumber.style.visibility = 'visible';
    }
  }, 100);

  // await homePageView._addHandlerOpenModal();
  // homePageView._addHandlerCloseModal();
  // homePageView._addHandlerCloseSubscribe();
  // homePageView._addHandlerCloseThanks();
};

const controlWorkshopPage = async function (lng) {
  await model.handleLoadStorage();
  const cartNum = await model.checkCartNumber();

  // Call base setLanguage first, passing the cart number
  WorkshopView.setLanguage(lng, cartNum);

  WorkshopView._moveToTopHandler();
  WorkshopView._imageSlider();
  WorkshopView.stickyMenuFn();
  // Then call page-specific language setup
  WorkshopView.setWorkshopLng(lng);
  WorkshopView.handleLanguage();
};

const controlAboutPage = async function (lng) {
  await model.handleLoadStorage();
  const cartNum = await model.checkCartNumber();

  AboutView.setLanguage(lng, cartNum);
  AboutView.setAboutDesc(lng);
  AboutView.handleLanguage();
  AboutView.stickyMenuFn();
};

const controlContactMePage = async function (lng) {
  await model.handleLoadStorage();
  const cartNum = await model.checkCartNumber();

  ContactMeView.sendHandler();

  ContactMeView.setLanguage(lng, cartNum);
  ContactMeView.setFormLng(lng);
  ContactMeView.setContactTitleLng(lng);
  ContactMeView.stickyMenuFn();
};

const controlPoliciesPage = async function (lng) {
  await model.handleLoadStorage();
  const cartNum = await model.checkCartNumber();

  PoliciesView.setLanguage(lng, cartNum);
  PoliciesView.handleLanguage();
};

const controlCategoriesPage = async function () {
  try {
    const body = document.querySelector('body');
    // Prefer data-category (DB value) for API calls, fall back to className
    const categoryName = body.dataset.category || body.className;
    const categoryNameHebrew = body.dataset.hebrew;
    const parentElement = document.querySelector('.parent-element');

    // Determine initial language
    let lng = localStorage.getItem('language') || 'eng';
    if (!localStorage.getItem('language')) {
      localStorage.setItem('language', 'eng');
    }

    // Initialize the singleton instance if not already initialized
    if (!categoriesView.initialized) {
      categoriesView.initialize(
        parentElement,
        categoryName,
        categoryNameHebrew,
        lng
      );
    }

    // Load cart data
    await model.handleLoadStorage();
    const cartNum = await model.checkCartNumber();

    // Set base language/menu (handles cart number persistence)
    categoriesView.setLanguage(lng, cartNum);

    // Set page-specific content
    categoriesView.setPageSpecificLanguage(lng, cartNum);

    // Add specific handlers for this page
    categoriesView._moveToTopHandler();
    categoriesView._imageFlipper();
    categoriesView.stickyMenuFn();
  } catch (err) {
    console.error('Error in controlCategoriesPage:', err);
  }
};

const controlCartPage = async function (lng) {
  try {
    await model.handleLoadStorage();
    const cartNum = await model.checkCartNumber();

    // Set language (which now handles persistCartNumber)
    CartView.setLanguage(lng, cartNum);

    CartView.render(cartNum);
    await CartView._renderSummary(cartNum, lng);

    const cartData = model.cart;
    CartView._addHandlerCheckout(cartData);
    CartView.paypalCheckout(cartData);
    CartView._addHandlerDeleteAll(controlDeleteAll);

    CartView.setCartLng(lng);
    CartView.handleCartLanguage();
    CartView.stickyMenuFn();
  } catch (err) {
    console.error(err);
  }
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
  await CartView._renderSummary(cartNum);
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
  await CartView._renderSummary(cartNum);
};

const controlBambaPage = function () {
  // Don't use BisliView directly in the frontend controller
  // The bamba page should be handled by the admin controller
};

const init = async function () {
  // Hydrate locale from backend geo detection without blocking initial UI.
  // This will only override language/currency if they were missing at page start.
  hydrateLocaleFromBackend();

  // Load menu for all pages // Removed
  // await loadMenu(); // Removed

  // Check if we're on a categories page and initialize directly
  if (document.body.id.includes('categories')) {
    // Direct initialization approach
    const body = document.querySelector('body');
    // Prefer data-category (DB value) for API calls, fall back to className
    const categoryName = body.dataset.category || body.className;
    const categoryNameHebrew = body.dataset.hebrew;

    // Force immediate initialization regardless of document ready state
    categoriesView.directInitialize(categoryName, categoryNameHebrew);

    // Also call the regular control function
    controlCategoriesPage();
  }

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
  if (document.body.id.includes('policies')) {
    PoliciesView.addPoliciesHandler(controlPoliciesPage);
  }
  if (document.body.id.includes('cart')) {
    CartView.addCartViewHandler(controlCartPage);
    /**
     * ! User clicks delete item:
     **/
    CartView._addHandlerDelete(controlDeleteFromCart);
  }
  if (document.body.id.includes('bambot')) {
    BisliView.addBambaViewHandler(controlBambaPage);
  }
};
init();
