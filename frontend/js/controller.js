import 'core-js/actual';
import 'regenerator-runtime/runtime.js';
import * as model from './model.js';
// import { loadMenu } from './menuLoader.js'; // Removed
import homePageView from './Views/homePageView.js';
import WorkshopView from './Views/workshopView.js';
import AboutView from './Views/aboutView.js';
import ContactMeView from './Views/contactMeView.js';
import categoriesView from './Views/categoriesView.js';
import CartView from './Views/cartView.js';
// User login functionality has been removed

//----------------------------------------------------

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

  // Ensure cart icon is visible in desktop view
  setTimeout(() => {
    // For desktop view shopping cart in nav menu
    const cartTab = document.querySelector('.main-nav-tab.cart-tab');
    const cartContainer = document.querySelector('.cart-container');

    if (window.matchMedia('(min-width: 800px)').matches) {
      if (cartTab) {
        cartTab.style.display = 'flex';
        cartTab.style.visibility = 'visible';
      }

      if (cartContainer) {
        cartContainer.style.display = 'flex';
        cartContainer.style.visibility = 'visible';
      }

      // Ensure the SVG is properly visible
      const cartIcon = document.querySelector('.shoppingcart-svg');
      if (cartIcon) {
        cartIcon.style.display = 'inline-block';
        cartIcon.style.visibility = 'visible';
        cartIcon.style.opacity = '1';
        cartIcon.style.fill = '#000000';
      }

      // Also ensure cart number is visible
      const cartNumber = document.querySelector('.cart-number');
      if (cartNumber) {
        cartNumber.style.display = 'inline-block';
        cartNumber.style.visibility = 'visible';
      }
    }
  }, 500);

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
};

const controlContactMePage = async function (lng) {
  await model.handleLoadStorage();
  const cartNum = await model.checkCartNumber();

  ContactMeView.sendHandler();

  ContactMeView.setLanguage(lng, cartNum);
  ContactMeView.setFormLng(lng);
};

const controlCategoriesPage = async function () {
  try {
    const body = document.querySelector('body');
    // Get category from class instead of ID
    const categoryName = body.className;
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
    CartView._renderSummary(cartNum, lng);

    const cartData = model.cart;
    CartView._addHandlerCheckout(cartData);
    CartView.paypalCheckout(cartData);
    CartView._addHandlerDeleteAll(controlDeleteAll);

    CartView.setCartLng(lng);
    CartView.handleCartLanguage();
  } catch (err) {
    console.log(err);
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
  // Don't use BisliView directly in the frontend controller
  // The bamba page should be handled by the admin controller
  console.log('Bamba page should be handled by admin controller');
};

const init = async function () {
  // Load menu for all pages // Removed
  // await loadMenu(); // Removed

  // Check if we're on a categories page and initialize directly
  if (document.body.id.includes('categories')) {
    // Direct initialization approach
    const body = document.querySelector('body');
    // Get category from class instead of ID parts
    const categoryName = body.className;
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
