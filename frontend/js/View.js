import closeSvg from '../imgs/svgs/x-solid.svg';
import barsSvg from '../imgs/svgs/bars-solid.svg';
import shoppingCartIcon from '../imgs/svgs/cart-shopping-solid.svg';
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

  /**
   * * --Mobile View Categories Reveal--
   */
  mobileCategories(e) {
    if (e.target.closest('.categories-tab')) {
      this._categoriesList.classList.toggle('reveal');
    }
  }

  addMobileHandler() {
    const x = window.matchMedia('(max-width: 699.99px)');
    if (!x.matches) return;
    this._categoriesTab.addEventListener(
      'click',
      this.mobileCategories.bind(this)
    );
  }

  // addMobileHandler() {
  //   const x = window.matchMedia('(max-width: 699.99px)');
  //   // Listen to resize to adapt event listeners dynamically
  //   x.addEventListener('change', e => {
  //     if (e.matches) {
  //       // If it's in mobile view
  //       this._categoriesTab.addEventListener(
  //         'click', (e)=>
  //         this.mobileCategories(e).bind(this)
  //       );
  //     } else {
  //       // Remove event listener on larger screens
  //       this._categoriesTab.removeEventListener(
  //         'click',
  //         this.mobileCategories.bind(this)
  //       );
  //     }
  //   });

  //   // Initial check when the page is first loaded
  //   if (x.matches) {
  //     this._categoriesTab.addEventListener(
  //       'click',
  //       this.mobileCategories.bind(this)
  //     );
  //   }
  // }

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
    this._cartNumber.forEach(cartNum => {
      this._cartNewValue = +cartNum.textContent + 1;
      cartNum.textContent = this._cartNewValue;
    });
  }

  decreaseCartNumber() {
    this._cartNumber.forEach(cartNum => {
      this._cartNewValue = +cartNum.textContent - 1;
      cartNum.textContent = this._cartNewValue;
    });
  }

  persistCartNumber(num) {
    this._cartNumber.forEach(cartNum => {
      cartNum.textContent = num;
    });
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
  revealCategories = function () {
    const categoriesList = document.querySelector('.categories-list');
    categoriesList.classList.add('categories-list--active');
  };

  hideCategories = function () {
    const categoriesList = document.querySelector('.categories-list');
    categoriesList.classList.remove('categories-list--active');
  };

  addRevealHandler = function () {
    const x = window.matchMedia('(min-width: 700px)');
    if (!x.matches || this._categoriesTab === null) return;
    if (this._categoriesTab) {
      this._categoriesTab.addEventListener('mouseover', this.revealCategories);
      this._categoriesTab.addEventListener('mouseleave', this.hideCategories);
    } else {
      console.error('Categories tab not found in the DOM');
    }
  };

  // Categories reveal END
  // `````````````````````````````````````````````````````

  /**
   * * --Switch SVG-icon menu button on mobile mode--
   */

  svgHandler() {
    const menuBars = document.querySelector('.menubars-svg');
    const categoriesList = document.querySelector('.categories-list');

    const changeSVG = function () {
      const parent = document.querySelector('.menubars-toggle');
      parent.classList.toggle('close');
      const checkIcon = parent.classList.contains('close');
      let icon = !checkIcon ? `${closeSvg}` : `${barsSvg}`;

      menuBars.setAttribute('src', `${icon}`);

      if (icon !== 'close-svg') {
        if (categoriesList.classList.contains('reveal')) {
          categoriesList.classList.remove('reveal');
        }
      }
    };

    const revealMenu = function () {
      const menu = document.querySelector('.menu');
      menu.style.transform = 'translateX(200px)';
    };
    const hideMenu = function () {
      const menu = document.querySelector('.menu');
      menu.style.transform = 'translateX(-200px)';
    };

    const toggleMenu = function () {
      const parent = document.querySelector('.menubars-toggle');

      const checkIcon = parent.classList.contains('close');
      checkIcon ? hideMenu() : revealMenu();
    };

    menuBars.addEventListener('click', () => {
      changeSVG();
      toggleMenu();
    });
  }

  handleLanguage() {
    const hebLng = document.querySelector('.heb-lng');
    const engLng = document.querySelector('.eng-lng');

    if (hebLng && engLng) {
      hebLng.addEventListener('click', () => this.changeToHeb());
      engLng.addEventListener('click', () => this.changeToEng());
    }
  }

  changeToHeb = function () {
    localStorage.setItem('language', `heb`);
    this.setLanguage(`heb`);
  };

  changeToEng = function () {
    localStorage.setItem('language', `eng`);
    this.setLanguage('eng');
  };

  handleMenuLanguage(lng) {
    if (lng === 'eng') {
      return `<ul class="menu__ul ul-eng">
          <li class="main-nav-tab">
            <a class="attrib" href="/index.html">Home</a>
          </li>
          <li class="main-nav-tab categories-tab">
            <a class="attrib" href="#">Shop ▾</a>
            <ul class="categories-list">
              <li class="category-item category-item--necklace">
                <a class="attrib" href="/html/categories/necklaces.html"
                  >Necklaces</a
                >
              </li>
              <li class="category-item category-item--crochet-necklace">
                <a class="attrib" href="/html/categories/crochetNecklaces.html"
                  >Crochet Necklaces</a
                >
              </li>
              <li class="category-item category-item--hoops">
                <a class="attrib" href="/html/categories/hoops.html"
                  >Hoop Earrings</a
                >
              </li>
              <li class="category-item category-item--dangle">
                <a class="attrib" href="/html/categories/dangle.html"
                  >Dangle Earrings</a
                >
              </li>

              <li class="category-item category-item--bracelets">
                <a class="attrib" href="/html/categories/bracelets.html"
                  >Bracelets</a
                >
              </li>
              <li class="category-item category-item--unisex">
                <a class="attrib" href="/html/categories/unisex.html"
                  >Unisex Jewelry</a
                >
              </li>
            </ul>
          </li>
          <li class="main-nav-tab">
            <a class="attrib" href="/html/jewelry-workshop.html"
              >Jewelry Workshop</a
            >
          </li>
          <li class="main-nav-tab">
            <a class="attrib" href="/html/about.html">About</a>
          </li>
          <li class="main-nav-tab contact">
            <a class="attrib" href="/html/contact-me.html">Contact Me</a>
          </li>
          <!-- <li class="main-nav-tab login" id="login-tab">
            <a class="attrib login-btn" href="/html/login.html">Login</a>
          </li> -->
          <!-- <li class="main-nav-tab login" id="login-tab">
            <a class="attrib login-btn" href="/html/bambaYafa.html">Dashboard</a>
          </li> -->
          <a class="attrib-cart" href="/html/cart.html">
            <div class="cart-container">
              <img
                src=${shoppingCartIcon}
                alt="shopping cart icon"
                class="shoppingcart-svg"
              />
              <span class="cart-number">0</span>
            </div>
          </a>
        </ul>
        <div class="languages-container">
          <button class="heb-lng">עב</button>
          <button class="eng-lng">EN</button>
        </div>
        `;
    } else if (lng === 'heb') {
      return `<ul class="menu__ul ul-heb">
          <li class="main-nav-tab">
            <a class="attrib" href="/index.html">בית </a>
          </li>
          <li class="main-nav-tab categories-tab">
            <a class="attrib" href="#">חנות ▾</a>
            <ul class="categories-list">
              <li class="category-item category-item--necklace">
                <a class="attrib" href="/html/categories/necklaces.html"
                  >שרשראות</a
                >
              </li>
              <li class="category-item category-item--crochet-necklace">
                <a class="attrib" href="/html/categories/crochetNecklaces.html"
                  >שרשראות סרוגות</a
                >
              </li>
              <li class="category-item category-item--hoops">
                <a class="attrib" href="/html/categories/hoops.html"
                  >עגילי חישוק</a
                >
              </li>
              <li class="category-item category-item--dangle">
                <a class="attrib" href="/html/categories/dangle.html"
                  >עגילים תלויים</a
                >
              </li>

              <li class="category-item category-item--bracelets">
                <a class="attrib" href="/html/categories/bracelets.html"
                  >צמידים</a
                >
              </li>
              <li class="category-item category-item--unisex">
                <a class="attrib" href="/html/categories/unisex.html"
                  >תכשיטי יוניסקס</a
                >
              </li>
            </ul>
          </li>
          <li class="main-nav-tab">
            <a class="attrib" href="/html/jewelry-workshop.html"
              >סדנאת תכשיטים</a
            >
          </li>
          <li class="main-nav-tab">
            <a class="attrib" href="/html/about.html">אודות</a>
          </li>
          <li class="main-nav-tab contact">
            <a class="attrib" href="/html/contact-me.html">צרו קשר</a>
          </li>
          <!-- <li class="main-nav-tab login" id="login-tab">
            <a class="attrib login-btn" href="/html/login.html">Login</a>
          </li> -->
          <!-- <li class="main-nav-tab login" id="login-tab">
            <a class="attrib login-btn" href="/html/bambaYafa.html">Dashboard</a>
          </li> -->
          <a class="attrib-cart" href="/html/cart.html">
            <div class="cart-container">
              <img
                src=${shoppingCartIcon}
                alt=""
                class="shoppingcart-svg"
              />
              <span class="cart-number">0</span>
            </div>
          </a>
        </ul>
        <div class="languages-container">
          <button class="heb-lng">עב</button>
          <button class="eng-lng">EN</button>
        </div>
        `;
    }
  }

  setLanguage(lng) {
    this._menu.innerHTML = '';

    // 1) Render menu
    const markup = this.handleMenuLanguage(lng);
    this._menu.insertAdjacentHTML('afterbegin', markup);

    this._categoriesTab = document.querySelector('.categories-tab');
    this._categoriesList = document.querySelector('.categories-list');

    this.handleFooterMarkup(lng);
    this.svgHandler();
    this.addMobileHandler();
    this.addRevealHandler();
    this.handleLanguage();
  }

  setFooterLng(lng) {
    if (lng === 'eng') {
      return ` 
      <div class="columns-container">
        <div class="footer-left-column">
          <a class="attrib-footer" href="/">Home</a>
          <a class="attrib-footer" href="./html/categories/necklaces.html"
            >Necklaces</a
          >
          <a
            class="attrib-footer"
            href="./html/categories/crochetNecklaces.html"
            >Crochet Necklaces</a
          >
          <a class="attrib-footer" href="./html/categories/hoops.html"
            >Hoop Earrings</a
          >
          <a class="attrib-footer" href="./html/categories/dangle.html"
            >Dangle Earrings</a
          >
          <a class="attrib-footer" href="./html/categories/bracelets.html"
            >Bracelets</a
          >
        </div>

        <div class="footer-middle-column">
          <a class="attrib-footer" href="./html/policies.html"
            >Shipping & Cancellation Policy</a
          >
          <a class="attrib-footer" href="./html/contact-me.html">Contact Me</a>
        </div>
        <div class="footer-right-column">
          <a class="attrib-footer" href="./html/jewelry-workshop.html"
            >Jewelry Workshop</a
          >
          <a class="attrib-footer" href="./html/about.html">About</a>
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
      <div class="columns-container columns-container_heb" style=" direction:rtl;">
        <div class="footer-left-column">
          <a class="attrib-footer" href="#">בית</a>
          <a class="attrib-footer" href="./html/categories/necklaces.html"
            >שרשראות</a
          >
          <a
            class="attrib-footer"
            href="./html/categories/crochetNecklaces.html"
            >שרשראות שרוגות</a
          >
          <a class="attrib-footer" href="./html/categories/hoops.html"
            >עגילי חשיוק</a
          >
          <a class="attrib-footer" href="./html/categories/dangle.html"
            >עגילים תלויים</a
          >
          <a class="attrib-footer" href="./html/categories/bracelets.html"
            >צמידים</a
          >
        </div>

        <div class="footer-middle-column">
          <a class="attrib-footer" href="./html/policies.html"
            >מדיניות משלוחים וביטולים</a
          >
          <a class="attrib-footer" href="./html/contact-me.html">צרו קשר</a>
        </div>
        <div class="footer-right-column">
          <a class="attrib-footer" href="./html/jewelry-workshop.html"
            >סדנאות תכשיטים</a
          >
          <a class="attrib-footer" href="./html/about.html">אודות</a>
        </div>
      </div>
      <div class="rights-container">
        <span class="rights-text"
          >© 2024 Tamar Kfir Jewelry. כל הזכויות שמורות.</span
        >
      </div>
    `;
    }
  }

  handleFooterMarkup(lng) {
    const markup = this.setFooterLng(lng);
    let footer = document.querySelector('.footer');
    footer.innerHTML = '';
    footer.insertAdjacentHTML('afterbegin', markup);
  }
}
