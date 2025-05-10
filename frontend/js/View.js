import closeSvg from '../imgs/svgs/x-solid.svg';
import barsSvg from '../imgs/svgs/bars-solid.svg';
import shoppingCartIcon from '../imgs/svgs/cart-shopping-solid.svg';
import * as model from './model.js';

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
    // Determine if we're on mobile or desktop
    const isMobile = window.matchMedia('(max-width: 699.99px)').matches;

    // Cart markup as a normal navbar item using CSS classes instead of inline styles
    const cartMarkup = `
      <li class="main-nav-tab">
        <a class="attrib-cart" href="/html/cart.html">
          <div class="cart-container">
            <svg class="shoppingcart-svg" viewBox="0 0 100 100">
              <path d="m 4.9999998,9.2183795 c 0,-2.3378112 1.6861769,-4.2186005 3.7820788,-4.2186005 h 7.1701734 c 3.466899,0 6.539832,2.2499202 7.973874,5.624801 h 64.767975 c 4.144527,0 7.170176,4.394373 6.082839,8.859061 l -6.461046,26.770533 c -1.339479,5.519343 -5.830695,9.368813 -10.952243,9.368813 h -45.46366 l 0.850968,5.009591 c 0.346689,1.986257 1.906794,3.42761 3.719034,3.42761 h 45.432141 c 2.095893,0 3.78207,1.880789 3.78207,4.218601 0,2.337811 -1.686177,4.2186 -3.78207,4.2186 H 36.469993 c -5.452488,0 -10.132803,-4.324068 -11.141352,-10.282838 L 17.197186,14.579517 C 17.086873,13.911579 16.566844,13.43698 15.952252,13.43698 H 8.7820786 c -2.0959019,0 -3.7820788,-1.880789 -3.7820788,-4.2186005 z M 25.171051,86.559389 a 7.5641447,8.4372024 0 1 1 15.128288,0 7.5641447,8.4372024 0 1 1 -15.128288,0 z M 78.120065,78.12219 a 7.5641446,8.4372022 0 1 1 0,16.874404 7.5641446,8.4372022 0 1 1 0,-16.874404 z" />
            </svg>
            <span class="cart-number-mobile">0</span>
          </div>
        </a>
      </li>
    `;

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

    // Create the desktop flag selector HTML - for English version with the english-lng-selector class
    const engDesktopFlagSelector = `
    <li class="main-nav-tab desktop-lang-selector english-lng-selector">
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
    </li>`;

    // Create the desktop flag selector HTML - for Hebrew version without the english-lng-selector class
    const hebDesktopFlagSelector = `
    <li class="main-nav-tab desktop-lang-selector">
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
    </li>`;

    if (lng === 'eng') {
      return `<ul class="menu__ul ul-eng">
          <li class="main-nav-tab">
            <a class="attrib" href="/index.html">Home</a>
          </li>
          <li class="main-nav-tab categories-tab">
            <a class="attrib" href="#">Shop <span class="arrow-indicator">▼</span></a>
            <ul class="categories-list">
              <li class="category-item category-item--necklace">
                <a class="attrib" href="/html/categories/necklaces.html">
                  Necklaces</a>
              </li>
              <li class="category-item category-item--crochet-necklace">
                <a class="attrib" href="/html/categories/crochetNecklaces.html">
                  Crochet Necklaces</a>
              </li>
              <li class="category-item category-item--hoops">
                <a class="attrib" href="/html/categories/hoops.html">
                  Hoop Earrings</a>
              </li>
              <li class="category-item category-item--dangle">
                <a class="attrib" href="/html/categories/dangle.html">
                  Dangle Earrings</a>
              </li>
              <li class="category-item category-item--bracelets">
                <a class="attrib" href="/html/categories/bracelets.html">
                  Bracelets</a>
              </li>
              <li class="category-item category-item--unisex">
                <a class="attrib" href="/html/categories/unisex.html">
                  Unisex Jewelry</a>
              </li>
              <li class="category-item category-item--shalom-club">
                <a class="attrib" href="/html/categories/shalom-club.html">
                  Shalom Club</a>
              </li>
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
          ${engDesktopFlagSelector}
          ${cartMarkup}
        </ul>
        `;
    } else if (lng === 'heb') {
      return `<ul class="menu__ul ul-heb" >
          <li class="main-nav-tab">
            <a class="attrib attrib-heb" href="/index.html">בית </a>
          </li>
          <li class="main-nav-tab categories-tab">
            <a class="attrib attrib-heb shop-link" href="#">חנות <span class="arrow-indicator">▼</span></a>
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
              <li class="category-item category-item--bracelets">
                <a class="attrib attrib-heb" href="/html/categories/bracelets.html">
                  צמידים</a>
              </li>
              <li class="category-item category-item--unisex">
                <a class="attrib attrib-heb" href="/html/categories/unisex.html">
                  תכשיטי יוניסקס</a>
              </li>
              <li class="category-item category-item--shalom-club" style="direction: rtl;">
                <a class="attrib attrib-heb" href="/html/categories/shalom-club.html">
                  מועדון "שלום"</a>
              </li>
            </ul>
          </li>
          <li class="main-nav-tab">
            <a class="attrib attrib-heb" href="/html/jewelry-workshop.html">סדנאת תכשיטים</a>
          </li>
          <li class="main-nav-tab">
            <a class="attrib attrib-heb" href="/html/about.html">אודות</a>
          </li>
          <li class="main-nav-tab contact">
            <a class="attrib attrib-heb" href="/html/contact-me.html">צרו קשר</a>
          </li>
          ${hebDesktopFlagSelector}
          ${cartMarkup}
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

    // Add mobile language selector if it doesn't exist
    if (!document.querySelector('.mobile-lang-selector')) {
      const mobileLangSelector = document.createElement('div');
      mobileLangSelector.className = 'mobile-lang-selector';
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
      `;
      const header = document.querySelector('header');
      if (header) {
        header.appendChild(mobileLangSelector);
      } else {
        document.body.appendChild(mobileLangSelector);
      }

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
    } else {
      // Update the selected option if the selector already exists
      const select = document.getElementById('mobile-lang-select');
      if (select) {
        select.value = lng;
      }
    }

    // Update menu innerHTML
    const menu = document.querySelector('.menu');
    if (!menu) {
      console.error('[DEBUG] Menu element not found');
      return;
    }

    // Check if menu was open before language change
    const wasMenuOpen = menu.classList.contains('menu-open');

    // Update menu content
    menu.innerHTML = this.handleMenuLanguage(lng);

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
          <a class="attrib-footer" href="/html/categories/bracelets.html"
            >Bracelets</a
          >
          <a class="attrib-footer" href="/html/categories/unisex.html"
            >Unisex Jewelry</a
          >
          <a class="attrib-footer" href="/html/categories/shalom-club.html"
            >Shalom Club</a
          >
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
          <a class="attrib-footer" href="/">בית</a>
          <a class="attrib-footer" href="/html/categories/necklaces.html"
            >שרשראות</a
          >
          <a
            class="attrib-footer"
            href="/html/categories/crochetNecklaces.html"
            >שרשראות סרוגות</a
          >
          <a class="attrib-footer" href="/html/categories/hoops.html"
            >עגילי חישוק</a
          >
          <a class="attrib-footer" href="/html/categories/dangle.html"
            >עגילים תלויים</a
          >
          <a class="attrib-footer" href="/html/categories/bracelets.html"
            >צמידים</a
          >
          <a class="attrib-footer" href="/html/categories/unisex.html"
            >תכשיטי יוניסקס</a
          >
          <a class="attrib-footer" href="/html/categories/shalom-club.html"
            >מועדון "שלום"</a
          >
        </div>

        <div class="footer-middle-column">
          <a class="attrib-footer" href="/html/policies.html"
            >מדיניות משלוח וביטול</a
          >
          <a class="attrib-footer" href="/html/contact-me.html">צרו קשר</a>
        </div>
        <div class="footer-right-column">
          <a class="attrib-footer" href="/html/jewelry-workshop.html"
            >סדנאת תכשיטים</a
          >
          <a class="attrib-footer" href="/html/about.html">אודות</a>
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
