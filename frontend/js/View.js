import closeSvg from '../imgs/svgs/x-solid.svg';
import barsSvg from '../imgs/svgs/bars-solid.svg';
import shoppingCartIcon from '../imgs/svgs/shopping-bag-outline.svg';
import * as model from './model.js';

// ------------------------------------------------------------
// Currency preference persistence (USD/ILS) across pages
// ------------------------------------------------------------
const CURRENCY_STORAGE_KEY = 'currency';
const CURRENCY_EVENT_NAME = 'currency-changed';

function normalizeCurrency(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'usd' || v === 'ils') return v;
  return null;
}

function getSavedCurrency() {
  return normalizeCurrency(localStorage.getItem(CURRENCY_STORAGE_KEY)) || 'usd';
}

function setSavedCurrency(currency) {
  const c = normalizeCurrency(currency);
  if (!c) return;
  localStorage.setItem(CURRENCY_STORAGE_KEY, c);
}

function syncCurrencySelectors(currency) {
  const c = normalizeCurrency(currency) || getSavedCurrency();
  document
    .querySelectorAll('select.header-currency-selector[name="currency"]')
    .forEach(el => {
      try {
        // Some pages may temporarily render a "default" option; force the saved value.
        el.value = c;
      } catch (e) {
        void e;
      }
    });
}

function initCurrencyPersistence() {
  if (window.__currencyPersistenceInitialized) return;
  window.__currencyPersistenceInitialized = true;

  // Ensure current selects reflect saved currency on initial render.
  const applySaved = () => syncCurrencySelectors(getSavedCurrency());
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySaved, { once: true });
  } else {
    applySaved();
  }

  // Event delegation: works even if header/menu re-renders or elements are replaced.
  document.addEventListener('change', e => {
    const target = e.target;
    if (
      !target ||
      !target.matches ||
      !target.matches('select.header-currency-selector[name="currency"]')
    )
      return;

    const chosen = normalizeCurrency(target.value);
    if (!chosen) return; // ignore "default"

    setSavedCurrency(chosen);
    syncCurrencySelectors(chosen);
    window.dispatchEvent(
      new CustomEvent(CURRENCY_EVENT_NAME, { detail: { currency: chosen } })
    );
  });
}

// Initialize once per page load (module is imported by all views).
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initCurrencyPersistence();
}

export default class View {
  _data;
  _goToTop = document.querySelector('.go-to-top');
  _header = document.querySelector('header');
  _menu = document.querySelector('.menu');
  _menuHeb = document.querySelector('.ul-heb');
  _menuEng = document.querySelector('.ul-eng');
  _categoriesHeb = document.querySelector('.categories-container_heb');
  _categoriesEng = document.querySelector('.categories-container_eng');

  _footerHeb = document.querySelector('.footer_heb');
  _footerEng = document.querySelector('.footer_eng');
  _categoriesTab = document.querySelector('.categories-tab');
  _categoriesList = document.querySelector('.categories-list');
  _cartNumber = document.querySelectorAll('.cart-number');
  _cartNewValue = 0;
  _loginBtn = document.querySelector('.login-btn');
  _hebLng = document.querySelector('.heb-lng');
  _engLng = document.querySelector('.eng-lng');

  // Store the reference to the imported SVG
  CART_ICON_PATH = shoppingCartIcon;

  /**
   * * --Mobile View Categories Reveal--
   */
  toggleCategoriesList(e) {
    // console.log('toggleCategoriesList - start');

    // Find the categories tab
    const categoriesTab =
      e.currentTarget || document.querySelector('.categories-tab');

    if (!categoriesTab) {
      console.error('Categories tab element not found');
      return;
    }

    // Check if we're already handling this click
    if (categoriesTab.dataset.processing) {
      // console.log('toggleCategoriesList - already processing click');
      return;
    }

    // Mark as processing
    categoriesTab.dataset.processing = 'true';

    // Handle differently based on viewport size
    const isMobile = window.matchMedia('(max-width: 699.99px)').matches;

    if (isMobile) {
      try {
        // Ensure this is properly bound
        const boundHandleMobileDropdown = this.handleMobileDropdown.bind(this);

        // Call the function directly
        boundHandleMobileDropdown(categoriesTab);
      } catch (error) {
        console.error('Error in toggleCategoriesList:', error);
        console.error('Error stack:', error.stack);
      }
    }

    // Clear processing flag after a short delay
    setTimeout(() => {
      delete categoriesTab.dataset.processing;
    }, 100);
  }

  addMobileHandler(categoriesTabElement) {
    if (!categoriesTabElement) {
      // Try to find it if not provided
      categoriesTabElement = document.querySelector('.categories-tab');

      if (!categoriesTabElement) {
        console.error('Categories tab element not found');
        return;
      }
    }

    // Remove any existing event listeners to avoid duplicates
    const clonedElement = categoriesTabElement.cloneNode(true);
    categoriesTabElement.parentNode.replaceChild(
      clonedElement,
      categoriesTabElement
    );
    categoriesTabElement = clonedElement;

    // Create a bound version of the handler
    const boundToggleCategoriesList = this.toggleCategoriesList.bind(this);

    // Add the event listener with the bound handler
    categoriesTabElement.addEventListener('click', e => {
      // console.log('Categories tab clicked');
      boundToggleCategoriesList(e);
    });
  }
  // Specialized handler for mobile dropdown
  handleMobileDropdown(categoriesTab) {
    // Toggle active state
    // console.log('handleMobileDropdown - start');
    const categoriesList = document.querySelector('.categories-list');
    const isActive = categoriesList.classList.contains(
      'categories-list--active'
    );
    // First, clean up any existing dropdown
    this.cleanupMobileDropdowns();

    if (!isActive) {
      // Open the dropdown
      // console.log('handleMobileDropdown - opening dropdown');
      categoriesList.classList.add('categories-list--active');
      // Add active class to the categories tab to change the arrow direction
      categoriesTab.classList.add('categories-tab--active');
    } else {
      // Just remove active class
      // console.log('handleMobileDropdown - closing dropdown');
      categoriesList.classList.remove('categories-list--active');
      // Remove active class from the categories tab
      categoriesTab.classList.remove('categories-tab--active');
    }
  }

  // Cleanup method to remove any existing mobile dropdowns
  cleanupMobileDropdowns() {
    // console.log('cleanupMobileDropdowns - start');
    const dropdowns = document.querySelectorAll(
      '[data-mobile-dropdown="true"]'
    );
    dropdowns.forEach(dropdown => {
      dropdown.parentNode.removeChild(dropdown);
    });

    // Also remove active class from all tabs
    const activeTabs = document.querySelectorAll('.categories-tab.active');
    activeTabs.forEach(tab => {
      tab.classList.remove('active');
    });

    // Remove the categories-tab--active class as well
    const activeDropdownTabs = document.querySelectorAll(
      '.categories-tab--active'
    );
    activeDropdownTabs.forEach(tab => {
      tab.classList.remove('categories-tab--active');
    });
  }
  /**
   * * --Sticky Menu--
   */

  stickyMenuFn = function () {
    const menu = document.querySelector('.menu');
    const stickyMenu = function (entries) {
      const [entry] = entries;
      if (!entry.isIntersecting)
        menu.classList.add('sticky') + menu.classList.remove('hidden');
      else menu.classList.remove('sticky');
    };

    const headerObserver = new IntersectionObserver(stickyMenu, {
      root: null,
      threshold: 0,
    });
    headerObserver.observe(this._header);

    //Sticky navigation end
    //////////////////////////////////////////////////

    /**
     * * --Reveal Sticky Menu--
     */
    //////////////////////////////////////////////////
    const hideMenu = function (entries) {
      const [entry] = entries;

      if (!entry.isIntersecting)
        menu.classList.add('hidden') + menu.classList.remove('sticky');
    };

    const headerObserverTwo = new IntersectionObserver(hideMenu, {
      root: null,
      threshold: 0.2,
    });

    headerObserverTwo.observe(this._header);
  };

  // Reveal end
  //////////////////////////////////////////////////

  /**
   * * --Go To Top--
   */
  //////////////////////////////////////////////////
  _moveToTopHandler = function () {
    this._goToTop.addEventListener('click', this.movePageTop.bind(this));
  };

  movePageTop = function () {
    this._header.scrollIntoView({ behavior: 'smooth' });
  };

  // Go to top END
  ////////////////////////////

  increaseCartNumber() {
    // Get fixed cart count elements
    const cartNumberElements = document.querySelectorAll('.cart-number-mobile');

    cartNumberElements.forEach(cartNum => {
      this._cartNewValue = +cartNum.textContent + 1;
      cartNum.textContent = this._cartNewValue;
      // cartNum.style.display = 'flex';
    });
  }

  decreaseCartNumber() {
    // Get fixed cart count elements
    const cartNumberElements = document.querySelectorAll('.cart-number-mobile');

    cartNumberElements.forEach(cartNum => {
      this._cartNewValue = +cartNum.textContent - 1;
      cartNum.textContent = this._cartNewValue;
      // cartNum.style.display = this._cartNewValue > 0 ? 'flex' : 'none';
    });
  }

  persistCartNumber(num) {
    // Select the fixed cart count elements
    const cartNumberElements = document.querySelectorAll('.cart-number-mobile');

    if (cartNumberElements.length === 0) {
      return;
    }

    cartNumberElements.forEach(cartNumEl => {
      cartNumEl.textContent = num; // Set text content to the actual number
    });

    // Ensure body has show-cart-icon class for visibility
    document.body.classList.add('show-cart-icon');
  }

  // async logInOutHandler() {
  //   const checkAuth = await localStorage.getItem("auth-token");

  //   if (checkAuth == null) {
  //     this._loginBtn.textContent = "Login";
  //     // this._loginBtn.addEventListener("click", this.login);
  //   } else {
  //     this._loginBtn.textContent = "Logout";
  //     this._loginBtn.addEventListener("click", this.logout.bind(this));
  //   }
  // }

  // login() {
  //   window.location.replace("../html/login.html");
  // }

  logout() {
    localStorage.removeItem('auth-token');
    window.location.reload();
    this._loginBtn.textContent = 'Login';
  }
  /**
   * * --Categories reveal--
   */
  //////////////////////////////////////////////////
  revealCategories = function (e) {
    // Get the tab that's being hovered
    const categoriesTab = e.currentTarget;

    // Find the categories list within this tab or relative to it
    const categoriesList =
      categoriesTab.querySelector('.categories-list') ||
      document.querySelector('.categories-list');

    if (!categoriesList) return;

    // Desktop view uses CSS hover effect, only handle mobile explicitly
    const isMobile = window.matchMedia('(max-width: 699.99px)').matches;
    if (isMobile) {
      categoriesList.classList.add('categories-list--active');
    }
  };

  hideCategories = function (e) {
    // Get the tab from which hover is removed
    const categoriesTab = e.currentTarget;

    // Find the categories list within this tab or relative to it
    const categoriesList =
      categoriesTab.querySelector('.categories-list') ||
      document.querySelector('.categories-list');

    if (!categoriesList) return;

    // Desktop view uses CSS hover effect, only handle mobile explicitly
    const isMobile = window.matchMedia('(max-width: 699.99px)').matches;
    if (isMobile) {
      // Add a delay to allow cursor to move to dropdown
      setTimeout(() => {
        // Check if cursor is still not over dropdown
        if (
          !categoriesList.matches(':hover') &&
          !categoriesTab.matches(':hover')
        ) {
          categoriesList.classList.remove('categories-list--active');
        }
      }, 300);
    }
  };

  addRevealHandler = function (categoriesTabElement) {
    if (!categoriesTabElement) {
      categoriesTabElement = document.querySelector('.categories-tab');
      if (!categoriesTabElement) return;
    }

    // Check if element has a parent node before attempting to replace
    if (!categoriesTabElement.parentNode) {
      console.warn('Categories tab element is not attached to the DOM');
      return;
    }

    // Remove existing listeners to prevent duplicates
    const clonedElement = categoriesTabElement.cloneNode(true);
    categoriesTabElement.parentNode.replaceChild(
      clonedElement,
      categoriesTabElement
    );
    categoriesTabElement = clonedElement;

    // Create bound versions of our handlers
    const boundRevealHandler = this.revealCategories.bind(this);
    const boundHideHandler = this.hideCategories.bind(this);

    // Add mouse events for desktop
    const isMobile = window.matchMedia('(max-width: 699.99px)').matches;

    // For desktop, use mouseenter/mouseleave for hover effects
    if (!isMobile) {
      categoriesTabElement.addEventListener('mouseenter', boundRevealHandler);
      categoriesTabElement.addEventListener('mouseleave', boundHideHandler);

      // Also add listener to the categories list itself
      const categoriesList = document.querySelector('.categories-list');
      if (categoriesList) {
        categoriesList.addEventListener('mouseleave', e => {
          // Only hide if mouse isn't over the parent tab
          if (!categoriesTabElement.matches(':hover')) {
            categoriesList.classList.remove('categories-list--active');
          }
        });
      }
    } else {
      // Mobile uses click events
      categoriesTabElement.addEventListener(
        'click',
        this.toggleCategoriesList.bind(this)
      );
    }

    return categoriesTabElement;
  };

  // Categories reveal END
  // `````````````````````````````````````````````````````

  /**
   * * --Switch SVG-icon menu button on mobile mode--
   */

  svgHandler() {
    // Target the img element with class menubars-svg
    const menuBars = document.querySelector('.menubars-svg');
    const menu = document.querySelector('.menu');
    const body = document.body;
    let currentCloseIcon = null;

    // Function to handle closing (called by toggle button & new close icon)
    const closeMenu = () => {
      if (currentCloseIcon) {
        currentCloseIcon.remove();
        currentCloseIcon = null;
      }
      menu.classList.remove('menu-open');
      body.classList.remove('menu-active');
    };

    const toggleMenu = function (e) {
      const isOpen = menu.classList.contains('menu-open');

      if (isOpen) {
        // --- Closing ---
        closeMenu();
      } else {
        // --- Opening ---
        menu.classList.add('menu-open');
        body.classList.add('menu-active');

        // Create and add the new close icon
        if (!currentCloseIcon) {
          currentCloseIcon = document.createElement('div');
          currentCloseIcon.innerHTML = `<svg class="menu-close-icon" viewBox="0 0 100 100">
            <path d="M 95.664918,13.635782 C 98.460227,10.752089 98.014956,6.4689567 94.650692,4.0729473 91.286428,1.6769369 86.28951,2.0586028 83.494202,4.9422952 L 49.999999,39.398187 16.505794,4.9422952 C 13.710488,2.0586028 8.713569,1.6769369 5.3493062,4.0729473 1.9850435,6.4689567 1.5397734,10.752089 4.3350801,13.635782 L 39.684575,50 4.3350801,86.364219 c -2.7953067,2.883692 -2.3500366,7.166829 1.0142261,9.562835 3.3642628,2.39601 8.3611818,2.01434 11.1564878,-0.869346 L 49.999999,60.601813 83.494202,95.057708 c 2.795308,2.883686 7.792226,3.265356 11.15649,0.869346 3.364264,-2.396006 3.809535,-6.679143 1.014226,-9.562835 L 60.315422,50 Z" />
          </svg>`;
          currentCloseIcon.classList.add('menu-close-container');
          currentCloseIcon.addEventListener('click', e => {
            e.stopPropagation();
            closeMenu();
          });
          menu.prepend(currentCloseIcon);
        }
      }
    };

    if (menuBars) {
      // Remove any existing listeners by replacing the element
      const oldMenuBars = menuBars.cloneNode(true);
      menuBars.parentNode.replaceChild(oldMenuBars, menuBars);

      // Directly add inline style to ensure visibility
      // oldMenuBars.style.display = 'block';
      // oldMenuBars.style.visibility = 'visible';
      // oldMenuBars.style.cursor = 'pointer';

      // Add the new click handler
      oldMenuBars.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu(e);
      });
    } else {
      console.error('[View] Menu bars button not found');
    }

    // Close menu when clicking outside (overlay)
    document.addEventListener('click', e => {
      if (body.classList.contains('menu-active')) {
        const isClickInsideMenu = menu && menu.contains(e.target);
        const isClickOnToggleButton = menuBars && menuBars.contains(e.target);
        const isClickOnCloseButton =
          currentCloseIcon && currentCloseIcon.contains(e.target);

        if (
          !isClickInsideMenu &&
          !isClickOnToggleButton &&
          !isClickOnCloseButton
        ) {
          closeMenu();
        }
      }
    });

    // Prevent clicks inside the menu from propagating to the document listener
    if (menu) {
      menu.addEventListener('click', e => {
        e.stopPropagation();
      });
    }
  }

  // Remove event listener logic from here
  handleLanguage() {
    // console.log("handleLanguage: (No longer attaching direct listeners here)");
  }

  // Base language change handlers - triggered by menu buttons via delegation
  changeToHeb = function () {
    // console.log('[View.js] changeToHeb: START');
    try {
      // console.log('[View.js] changeToHeb: Setting localStorage');
      localStorage.setItem('language', 'heb');
      try {
        document.documentElement.lang = 'he';
        document.documentElement.dir = 'rtl';
      } catch {
        // ignore
      }

      // console.log('[View.js] changeToHeb: About to call setLanguage');
      this.setLanguage('heb', 0);

      // console.log('[View.js] changeToHeb: Completed successfully');
    } catch (err) {
      console.error('[View.js] changeToHeb ERROR:', err);
      console.error('Stack trace:', err.stack);
      throw err; // Re-throw to see in console
    }
  };

  changeToEng = function () {
    // console.log('[View.js] changeToEng: START');
    try {
      // console.log('[View.js] changeToEng: Setting localStorage');
      localStorage.setItem('language', 'eng');
      try {
        document.documentElement.lang = 'en';
        document.documentElement.dir = 'ltr';
      } catch {
        // ignore
      }

      // console.log('[View.js] changeToEng: About to call setLanguage');
      this.setLanguage('eng', 0);

      // console.log('[View.js] changeToEng: Completed successfully');
    } catch (err) {
      console.error('[View.js] changeToEng ERROR:', err);
      console.error('Stack trace:', err.stack);
      throw err; // Re-throw to see in console
    }
  };

  // Placeholder for page-specific language updates - to be overridden by subclasses
  setPageSpecificLanguage(lng, cartNum) {
    // console.log(`Base setPageSpecificLanguage called for ${lng}. Subclass should override this.`);
  }

  handleMenuLanguage(lng) {
    if (lng === 'eng') {
      return `<ul class="menu__ul ul-eng">
          <li class="main-nav-tab">
            <a class="attrib" href="/index.html">Home</a>
          </li>
          <li class="main-nav-tab categories-tab">
            <a class="attrib" href="#">Shop <span class="arrow-indicator">▼</span></a>
            <ul class="categories-list">
              <li class="category-item category-item--necklace">
                <a class="attrib attrib-eng" href="/html/categories/necklaces.html">
                  Necklaces</a>
              </li>
              <li class="category-item category-item--crochet-necklace">
                <a class="attrib attrib-eng" href="/html/categories/crochetNecklaces.html">
                  Crochet Necklaces</a>
              </li>
              <li class="category-item category-item--hoops">
                <a class="attrib attrib-eng" href="/html/categories/hoops.html">
                  Hoop Earrings</a>
              </li>
              <li class="category-item category-item--dangle">
                <a class="attrib attrib-eng" href="/html/categories/dangle.html">
                  Dangle Earrings</a>
              </li>
              <!-- HIDDEN: Shalom Club - uncomment to restore
              <li class="category-item category-item--shalom-club">
                <a class="attrib attrib-eng" href="/html/categories/shalom-club.html">
                  Shalom Club</a>
              </li>
              -->
            </ul>
          </li>
          <li class="main-nav-tab">
            <a class="attrib" href="/html/jewelry-workshop.html">Jewelry Workshop</a>
          </li>
          <li class="main-nav-tab">
            <a class="attrib" href="/html/about.html">About</a>
          </li>
          <li class="main-nav-tab contact">
            <a class="attrib" href="/html/contact-me.html">Contact Me</a>
          </li>
        </ul>
        `;
    } else if (lng === 'heb') {
      // Keep same order as English for mobile (Home at top)
      // Desktop will reverse via CSS flex-direction: row-reverse
      return `<ul class="menu__ul ul-heb" >
          <li class="main-nav-tab">
            <a class="attrib" href="/index.html">בית </a>
          </li>
          <li class="main-nav-tab categories-tab">
            <a class="attrib shop-link" href="#">חנות <span class="arrow-indicator">▼</span></a>
            <ul class="categories-list">
              <li class="category-item category-item--necklace">
                <a class="attrib attrib-heb" href="/html/categories/necklaces.html">
                  שרשראות</a>
              </li>
              <li class="category-item category-item--crochet-necklace">
                <a class="attrib attrib-heb" href="/html/categories/crochetNecklaces.html">
                  שרשראות סרוגות</a>
              </li>
              <li class="category-item category-item--hoops">
                <a class="attrib attrib-heb" href="/html/categories/hoops.html">
                  עגילי חישוק</a>
              </li>
              <li class="category-item category-item--dangle">
                <a class="attrib attrib-heb" href="/html/categories/dangle.html">
                  עגילים תלויים</a>
              </li>
              <!-- HIDDEN: Shalom Club - uncomment to restore
              <li class="category-item category-item--shalom-club" style="direction: rtl;">
                <a class="attrib attrib-heb" href="/html/categories/shalom-club.html">
                  מועדון "שלום"</a>
              </li>
              -->
            </ul>
          </li>
          <li class="main-nav-tab">
            <a class="attrib" href="/html/jewelry-workshop.html">סדנאת תכשיטים</a>
          </li>
          <li class="main-nav-tab">
            <a class="attrib" href="/html/about.html">אודות</a>
          </li>
          <li class="main-nav-tab contact">
            <a class="attrib" href="/html/contact-me.html">צרו קשר</a>
          </li>
        </ul>
        `;
    }
  }

  async setLanguage(lng, cartNum) {
    this.lang = lng;

    const ilFlag = `<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-il" viewBox="0 0 512 512" preserveAspectRatio="xMidYMid meet">
  <defs>
    <clipPath id="il-a">
      <path fill-opacity=".7" d="M0 0h512v512H0z"/>
    </clipPath>
  </defs>
  <g fill-rule="evenodd" clip-path="url(#il-a)">
    <path fill="#fff" d="M619.4 512H-112V0h731.4z"/>
    <path fill="#0038b8" d="M619.4 115.2H-112V48h731.4zm0 350.5H-112v-67.2h731.4zm-483-275 110.1 191.6L359 191.6z"/>
    <path fill="#fff" d="m225.8 317.8 20.9 35.5 21.4-35.3z"/>
    <path fill="#0038b8" d="M136 320.6 246.2 129l112.4 190.8z"/>
    <path fill="#fff" d="m225.8 191.6 20.9-35.5 21.4 35.4zM182 271.1l-21.7 36 41-.1-19.3-36zm-21.3-66.5 41.2.3-19.8 36.3zm151.2 67 20.9 35.5-41.7-.5zm20.5-67-41.2.3 19.8 36.3zm-114.3 0L189.7 256l28.8 50.3 52.8 1.2 32-51.5-29.6-52z"/>
  </g>
</svg>
`;

    const usFlag = `<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-us" viewBox="0 0 512 512" preserveAspectRatio="xMidYMid meet">
  <path fill="#bd3d44" d="M0 0h512v512H0"/>
  <path stroke="#fff" stroke-width="40" d="M0 58h512M0 137h512M0 216h512M0 295h512M0 374h512M0 453h512"/>
  <path fill="#192f5d" d="M0 0h390v275H0z"/>
  <marker id="us-a" markerHeight="30" markerWidth="30">
    <path fill="#fff" d="m15 0 9.3 28.6L0 11h30L5.7 28.6"/>
  </marker>
  <path fill="none" marker-mid="url(#us-a)" d="m0 0 18 11h65 65 65 65 66L51 39h65 65 65 65L18 66h65 65 65 65 66L51 94h65 65 65 65L18 121h65 65 65 65 66L51 149h65 65 65 65L18 177h65 65 65 65 66L51 205h65 65 65 65L18 232h65 65 65 65 66z"/>
</svg>
`;

    // Update menu innerHTML first
    const menu = document.querySelector('.menu');
    if (!menu) {
      console.error('[DEBUG] Menu element not found');
      return;
    }

    // Check if menu was open before language change
    const wasMenuOpen = menu.classList.contains('menu-open');

    // Update menu content
    menu.innerHTML = this.handleMenuLanguage(lng);

    // Render desktop utilities (language + currency + cart) into the header right container.
    // Keep utilities OUT of the main nav list for correct centering and responsiveness.
    const headerUtilitiesHost = document.querySelector(
      '[data-purpose="header-utilities"]'
    );
    if (headerUtilitiesHost) {
      let desktopUtilitiesEl =
        headerUtilitiesHost.querySelector('.header-utilities');
      if (!desktopUtilitiesEl) {
        desktopUtilitiesEl = document.createElement('div');
        desktopUtilitiesEl.className = 'header-utilities';
        headerUtilitiesHost.prepend(desktopUtilitiesEl);
      }

      desktopUtilitiesEl.innerHTML = `
        <div class="desktop-lang-selector${
          lng === 'eng' ? ' english-lng-selector' : ''
        }">
          <div class="flag-dropdown">
            <div class="flag-icon flag-eng${
              lng === 'eng' ? ' selected' : ''
            }" data-lang="eng">
              ${usFlag}
            </div>
            <div class="flag-icon flag-heb${
              lng === 'heb' ? ' selected' : ''
            }" data-lang="heb">
              ${ilFlag}
            </div>
          </div>
          ${this.getCurrencySelectorMarkup(lng, 'currency-desktop')}
        </div>
        <a class="header-cart attrib-cart" href="/html/cart.html" aria-label="Cart">
          <div class="cart-container">
            <svg class="shoppingcart-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M16.5285 6C16.5098 5.9193 16.4904 5.83842 16.4701 5.75746C16.2061 4.70138 15.7904 3.55383 15.1125 2.65C14.4135 1.71802 13.3929 1 12 1C10.6071 1 9.58648 1.71802 8.88749 2.65C8.20962 3.55383 7.79387 4.70138 7.52985 5.75747C7.50961 5.83842 7.49016 5.9193 7.47145 6H5.8711C4.29171 6 2.98281 7.22455 2.87775 8.80044L2.14441 19.8004C2.02898 21.532 3.40238 23 5.13777 23H18.8622C20.5976 23 21.971 21.532 21.8556 19.8004L21.1222 8.80044C21.0172 7.22455 19.7083 6 18.1289 6H16.5285ZM8 11C8.57298 11 8.99806 10.5684 9.00001 9.99817C9.00016 9.97438 9.00044 9.9506 9.00084 9.92682C9.00172 9.87413 9.00351 9.79455 9.00718 9.69194C9.01451 9.48652 9.0293 9.18999 9.05905 8.83304C9.08015 8.57976 9.10858 8.29862 9.14674 8H14.8533C14.8914 8.29862 14.9198 8.57976 14.941 8.83305C14.9707 9.18999 14.9855 9.48652 14.9928 9.69194C14.9965 9.79455 14.9983 9.87413 14.9992 9.92682C14.9996 9.95134 14.9999 9.97587 15 10.0004C15 10.0004 15 11 16 11C17 11 17 9.99866 17 9.99866C16.9999 9.9636 16.9995 9.92854 16.9989 9.89349C16.9978 9.829 16.9957 9.7367 16.9915 9.62056C16.9833 9.38848 16.9668 9.06001 16.934 8.66695C16.917 8.46202 16.8953 8.23812 16.8679 8H18.1289C18.6554 8 19.0917 8.40818 19.1267 8.93348L19.86 19.9335C19.8985 20.5107 19.4407 21 18.8622 21H5.13777C4.55931 21 4.10151 20.5107 4.13998 19.9335L4.87332 8.93348C4.90834 8.40818 5.34464 8 5.8711 8H7.13208C7.10465 8.23812 7.08303 8.46202 7.06595 8.66696C7.0332 9.06001 7.01674 9.38848 7.00845 9.62056C7.0043 9.7367 7.00219 9.829 7.00112 9.89349C7.00054 9.92785 7.00011 9.96221 7 9.99658C6.99924 10.5672 7.42833 11 8 11ZM9.53352 6H14.4665C14.2353 5.15322 13.921 4.39466 13.5125 3.85C13.0865 3.28198 12.6071 3 12 3C11.3929 3 10.9135 3.28198 10.4875 3.85C10.079 4.39466 9.76472 5.15322 9.53352 6Z" fill="#0F0F0F"/>
            </svg>
            <span class="cart-number-mobile">0</span>
          </div>
        </a>
      `;
    }

    // Add mobile language and currency selector to side menu (at bottom)
    let mobileLangSelector = menu.querySelector('.mobile-lang-selector');
    if (!mobileLangSelector) {
      mobileLangSelector = document.createElement('div');
      mobileLangSelector.className = 'mobile-lang-selector';
      menu.appendChild(mobileLangSelector);
    }

    mobileLangSelector.innerHTML = `
      <div class="flag-dropdown">
        <div class="flag-icon flag-eng${
          lng === 'eng' ? ' selected' : ''
        }" data-lang="eng">
          ${usFlag}
        </div>
        <div class="flag-icon flag-heb${
          lng === 'heb' ? ' selected' : ''
        }" data-lang="heb">
          ${ilFlag}
        </div>
      </div>
      ${this.getCurrencySelectorMarkup(lng, 'currency-mobile')}
    `;

    // Add event listeners for flag clicks
    const flagIcons = mobileLangSelector.querySelectorAll('.flag-icon');
    flagIcons.forEach(flag => {
      flag.addEventListener('click', e => {
        const newLang = flag.getAttribute('data-lang');
        if (newLang === 'heb') {
          this.changeToHeb();
        } else {
          this.changeToEng();
        }
      });
    });

    // Add event listeners for desktop language flags
    const desktopFlagIcons = document.querySelectorAll(
      '.desktop-lang-selector .flag-icon'
    );
    desktopFlagIcons.forEach(flag => {
      flag.addEventListener('click', e => {
        const newLang = flag.getAttribute('data-lang');
        if (newLang === 'heb') {
          this.changeToHeb();
        } else {
          this.changeToEng();
        }
      });
    });

    // Update currency selector text based on language (there may be multiple selectors: mobile + desktop)
    document
      .querySelectorAll('select.header-currency-selector[name="currency"]')
      .forEach(currencySelect => {
        this.updateCurrencySelectorText(currencySelect, lng);
      });

    // Ensure cart icon is visible after DOM update
    // this.ensureCartIconVisibility();

    // Add mobile/desktop handlers only if we have the elements
    const categoriesTab = document.querySelector('.categories-tab');

    if (categoriesTab) {
      // Check viewport
      const isDesktop = window.matchMedia('(min-width: 700px)').matches;

      if (isDesktop) {
        try {
          // First remove any existing listeners to prevent duplicates
          const oldTab = categoriesTab.cloneNode(true);
          categoriesTab.parentNode.replaceChild(oldTab, categoriesTab);
          const newCategoriesTab = document.querySelector('.categories-tab');

          // Ensure desktop classes are applied
          newCategoriesTab.classList.add('desktop-view');
          const categoriesList =
            newCategoriesTab.querySelector('.categories-list');
          if (categoriesList) {
            categoriesList.classList.add('desktop-view');
          }

          // Define hover handlers
          const onEnter = e => {
            const tab = e.currentTarget;
            const list = tab.querySelector('.categories-list');

            if (list) {
              // Add active classes to both tab and list
              tab.classList.add('active');
              list.classList.add('categories-list--active');
            }
          };

          const onLeave = e => {
            const tab = e.currentTarget;
            const list = tab.querySelector('.categories-list');

            if (list) {
              // Remove active classes from both tab and list
              tab.classList.remove('active');
              list.classList.remove('categories-list--active');
            }
          };

          // Add event listeners
          newCategoriesTab.addEventListener('mouseenter', onEnter);
          newCategoriesTab.addEventListener('mouseleave', onLeave);
        } catch (err) {
          console.error('[DEBUG] Error in hover setup:', err);
        }
      } else {
        this.addMobileHandler(categoriesTab);
      }
    }

    // Update footer and handle other elements
    this.handleFooterMarkup(lng);

    // Add event listeners for language buttons
    const hebBtn = document.querySelector('.heb-lng');
    const engBtn = document.querySelector('.eng-lng');
    if (hebBtn && engBtn) {
      hebBtn.addEventListener('click', this.changeToHeb.bind(this));
      engBtn.addEventListener('click', this.changeToEng.bind(this));
    }

    // Update cart numbers if they exist
    if (typeof cartNum === 'number') {
      this.persistCartNumber(cartNum);
    }

    // Reinitialize the mobile menu toggle after language change
    setTimeout(() => {
      this.svgHandler();

      // Restore menu open state if it was open before
      if (wasMenuOpen) {
        const menu = document.querySelector('.menu');
        const body = document.body;

        // Add open classes
        menu.classList.add('menu-open');
        body.classList.add('menu-active');

        // Add close icon again
        const currentCloseIcon = document.createElement('div');
        currentCloseIcon.innerHTML = `<svg class="menu-close-icon" viewBox="0 0 100 100">
          <path d="M 95.664918,13.635782 C 98.460227,10.752089 98.014956,6.4689567 94.650692,4.0729473 91.286428,1.6769369 86.28951,2.0586028 83.494202,4.9422952 L 49.999999,39.398187 16.505794,4.9422952 C 13.710488,2.0586028 8.713569,1.6769369 5.3493062,4.0729473 1.9850435,6.4689567 1.5397734,10.752089 4.3350801,13.635782 L 39.684575,50 4.3350801,86.364219 c -2.7953067,2.883692 -2.3500366,7.166829 1.0142261,9.562835 3.3642628,2.39601 8.3611818,2.01434 11.1564878,-0.869346 L 49.999999,60.601813 83.494202,95.057708 c 2.795308,2.883686 7.792226,3.265356 11.15649,0.869346 3.364264,-2.396006 3.809535,-6.679143 1.014226,-9.562835 L 60.315422,50 Z" />
        </svg>`;
        currentCloseIcon.classList.add('menu-close-container');
        currentCloseIcon.addEventListener('click', e => {
          e.stopPropagation();
          menu.classList.remove('menu-open');
          body.classList.remove('menu-active');
          currentCloseIcon.remove();
        });
        menu.prepend(currentCloseIcon);
      }
    }, 0);

    // Call page-specific language updates if the method exists
    if (typeof this.setPageSpecificLanguage === 'function') {
      await this.setPageSpecificLanguage(lng, cartNum);
    }
  }

  getCurrencySelectorMarkup(lng, id) {
    // Get saved currency preference or default to 'usd'
    const savedCurrency = localStorage.getItem('currency') || 'usd';
    const safeId = id || 'currency';

    if (lng === 'eng') {
      return `<select name="currency" id="${safeId}" class="header-currency-selector">
        <option value="default" class="currency-option">Currency</option>
        <option value="usd" class="currency-option" ${
          savedCurrency === 'usd' ? 'selected' : ''
        }>USD</option>
        <option value="ils" class="currency-option" ${
          savedCurrency === 'ils' ? 'selected' : ''
        }>ILS</option>
      </select>`;
    } else if (lng === 'heb') {
      return `<select name="currency" id="${safeId}" class="header-currency-selector" dir="rtl">
        <option value="default" class="currency-option">מטבע</option>
        <option value="usd" class="currency-option" ${
          savedCurrency === 'usd' ? 'selected' : ''
        }>דולר</option>
        <option value="ils" class="currency-option" ${
          savedCurrency === 'ils' ? 'selected' : ''
        }>שקל</option>
      </select>`;
    }
    return '';
  }

  updateCurrencySelectorText(currencySelect, lng) {
    if (currencySelect && currencySelect.options.length >= 3) {
      // Preserve the current selected value
      const currentValue = currencySelect.value;
      const savedCurrency = getSavedCurrency();

      if (lng === 'eng') {
        currencySelect.options[0].text = 'Currency';
        currencySelect.options[1].text = 'USD';
        currencySelect.options[2].text = 'ILS';
        currencySelect.removeAttribute('dir');
      } else if (lng === 'heb') {
        currencySelect.options[0].text = 'מטבע';
        currencySelect.options[1].text = 'דולר';
        currencySelect.options[2].text = 'שקל';
        currencySelect.setAttribute('dir', 'rtl');
      }

      // Restore the selected value; if it was "default", force the saved currency.
      currencySelect.value =
        currentValue && currentValue !== 'default'
          ? currentValue
          : savedCurrency;
    }
  }

  setFooterLng(lng) {
    if (lng === 'eng') {
      return ` 
      <div class="columns-container">
        <div class="footer-left-column">
          <a class="attrib-footer" href="/">Home</a>
          <a class="attrib-footer" href="/html/categories/necklaces.html"
            >Necklaces</a
          >
          <a
            class="attrib-footer"
            href="/html/categories/crochetNecklaces.html"
            >Crochet Necklaces</a
          >
          <a class="attrib-footer" href="/html/categories/hoops.html"
            >Hoop Earrings</a
          >
          <a class="attrib-footer" href="/html/categories/dangle.html"
            >Dangle Earrings</a
          >
          <!-- HIDDEN: Shalom Club - uncomment to restore
          <a class="attrib-footer" href="/html/categories/shalom-club.html"
            >Shalom Club</a
          >
          -->
        </div>

        <div class="footer-middle-column">
          <a class="attrib-footer" href="/html/policies.html"
            >Shipping & Cancellation Policy</a
          >
          <a class="attrib-footer" href="/html/contact-me.html">Contact Me</a>
        </div>
        <div class="footer-right-column">
          <a class="attrib-footer" href="/html/jewelry-workshop.html"
            >Jewelry Workshop</a
          >
          <a class="attrib-footer" href="/html/about.html">About</a>
        </div>
      </div>
      <div class="rights-container">
        <span class="rights-text"
          >© 2024 Tamar Kfir Jewelry. All Rights Reserved.</span
        >
      </div>
    `;
    } else if (lng === 'heb') {
      return `
      <div class="columns-container columns-container_heb" style=" direction: rtl;">
        <div class="footer-left-column">
          <a class="attrib-footer-heb" href="/">בית</a>
          <a class="attrib-footer-heb" href="/html/categories/necklaces.html"
            >שרשראות</a
          >
          <a
            class="attrib-footer-heb"
            href="/html/categories/crochetNecklaces.html"
            >שרשראות סרוגות</a
          >
          <a class="attrib-footer-heb" href="/html/categories/hoops.html"
            >עגילי חישוק</a
          >
          <a class="attrib-footer-heb" href="/html/categories/dangle.html"
            >עגילים תלויים</a
          >
          <!-- HIDDEN: Shalom Club - uncomment to restore
          <a class="attrib-footer-heb" href="/html/categories/shalom-club.html"
            >מועדון "שלום"</a
          >
          -->
        </div>

        <div class="footer-middle-column">
          <a class="attrib-footer-heb" href="/html/policies.html"
            >מדיניות משלוח וביטול</a
          >
          <a class="attrib-footer-heb" href="/html/contact-me.html">צרו קשר</a>
        </div>
        <div class="footer-right-column">
          <a class="attrib-footer-heb" href="/html/jewelry-workshop.html"
            >סדנאת תכשיטים</a
          >
          <a class="attrib-footer-heb" href="/html/about.html">אודות</a>
        </div>
      </div>
      <div class="rights-container">
        <span class="rights-text"
          >© 2024 תמר כפיר תכשיטים. כל הזכויות שמורות.</span
        >
      </div>
    `;
    }
  }

  handleFooterMarkup(lng) {
    const footer = document.querySelector('.footer');
    if (footer) {
      footer.innerHTML = this.setFooterLng(lng);
    }
  }

  // Method to generate the categories list markup (example)
  _generateCategoriesListMarkup(lng) {
    // This should return the HTML string for the categories list
    // based on the language. Example structure:
    const categories = [
      { name: 'Bracelets', nameHeb: 'צמידים', link: './bracelets.html' },
      { name: 'Necklaces', nameHeb: 'שרשראות', link: './necklaces.html' },
      { name: 'Earrings', nameHeb: 'עגילים', link: './earrings.html' },
      { name: 'Rings', nameHeb: 'טבעות', link: './rings.html' },
    ];
    const listItems = categories
      .map(
        cat => `
      <li class="category-item">
        <a href="${cat.link}" class="attrib">${
          lng === 'eng' ? cat.name : cat.nameHeb
        }</a>
      </li>`
      )
      .join('');
    return `<ul class="categories-list">${listItems}</ul>`;
  }
}
