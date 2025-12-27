import View from '../View.js';
class HomePageView extends View {
  // Modal window:
  // _modal = document.querySelector(".modal");
  // _overlay = document.querySelector(".overlay");
  // _modalReveal = document.querySelector(".modal-reveal");
  // _btnCloseThanks = document.querySelector('.close-thanks');

  addHomePageHandler = function (handler) {
    window.addEventListener('load', () => {
      let lng = localStorage.getItem('language');
      if (!lng) {
        localStorage.setItem('language', 'eng');
        lng = 'eng';
      }

      handler(lng);

      // Initialize the base View's menu handlers
      // this.setupGlobalMenuHandler();

      // Add mobile/desktop handlers for categories tab
      const categoriesTab = document.querySelector('.categories-tab');
      if (categoriesTab) {
        this.addMobileHandler(categoriesTab);
        this.addRevealHandler(categoriesTab);
      }

      // Ensure the cart icon is visible on the home page
      setTimeout(() => {
        this.ensureCartIconVisibility();
      }, 300);
    });
  };

  /**
   * * --Change Language--
   */

  handleHomeLanguage() {
    const hebLng = document.querySelector('.heb-lng');
    const engLng = document.querySelector('.eng-lng');

    if (hebLng && engLng) {
      hebLng.addEventListener('click', () => this.changeToHeb());
      engLng.addEventListener('click', () => this.changeToEng());
    }
  }

  changeToHeb() {
    localStorage.setItem('language', 'heb');
    // Call base class method first
    super.changeToHeb();
    // Then do homepage-specific updates
    this.setHomeLanguage('heb');
    this.setFooterLng('heb');
    // Ensure cart icon is visible after language change
    setTimeout(() => {
      this.ensureCartIconVisibility();
    }, 100);
  }

  changeToEng() {
    localStorage.setItem('language', 'eng');
    // Call base class method first
    super.changeToEng();
    // Then do homepage-specific updates
    this.setHomeLanguage('eng');
    this.setFooterLng('eng');
    // Ensure cart icon is visible after language change
    setTimeout(() => {
      this.ensureCartIconVisibility();
    }, 100);
  }

  // Override the ensureCartIconVisibility method to handle home page specific cart icon
  ensureCartIconVisibility() {
    // Additional home-page specific fixes
    if (window.matchMedia('(min-width: 800px)').matches) {
      // Select cart elements
      const cartIcon = document.querySelector('.shoppingcart-svg');
      const cartTab = document.querySelector('.main-nav-tab.cart-tab');
      const cartContainer = document.querySelector('.cart-container');
      const cartNumber = document.querySelector('.cart-number');

      // Force visibility on SVG with !important inline styles
      if (cartIcon) {
        cartIcon.setAttribute(
          'style',
          `
          display: inline-block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 25px !important;
          height: 25px !important;
          fill: #000000 !important;
        `
        );
      }

      // Force visibility on cart tab
      if (cartTab) {
        cartTab.setAttribute(
          'style',
          `
          display: flex !important;
          visibility: visible !important;
        `
        );
      }

      // Force visibility on cart container
      if (cartContainer) {
        cartContainer.setAttribute(
          'style',
          `
          display: flex !important;
          visibility: visible !important;
        `
        );
      }

      // Force visibility on cart number
      if (cartNumber) {
        cartNumber.setAttribute(
          'style',
          `
          display: inline-block !important;
          visibility: visible !important;
        `
        );
      }
    }
  }

  setHomeLanguage(lng) {
    // Page-specific language setup
    this.setCategoriesLng(lng);
    this.handleFooterMarkup(lng);
  }

  setCategoriesLng(lng) {
    const categoryName = document.querySelectorAll('.category-name');

    let necklacesCategory = document.querySelector('.category-name_necklaces');
    let crochetNecklacesCategory = document.querySelector(
      '.category-name_crochet-necklaces'
    );
    let hoopsCategory = document.querySelector('.category-name_hoops');
    let braceletsCategory = document.querySelector('.category-name_bracelets');
    let dangleCategory = document.querySelector('.category-name_dangle');
    let unisexCategory = document.querySelector('.category-name_unisex');
    if (lng === 'eng') {
      categoryName.forEach(name => {
        name.style.fontSize = '1.3rem';
      });
      necklacesCategory.textContent = 'Necklaces';
      crochetNecklacesCategory.textContent = 'Crochet Necklaces';
      hoopsCategory.textContent = 'Hoop Earrings';
      braceletsCategory.textContent = 'Bracelets';
      dangleCategory.textContent = 'Dangle Earrings';
      unisexCategory.textContent = 'Unisex Jewelry';
    } else {
      categoryName.forEach(name => {
        name.style.fontFamily = "'Amatic SC', sans-serif";
        name.style.fontSize = '1.3rem';
      });
      necklacesCategory.textContent = 'שרשראות';
      crochetNecklacesCategory.textContent = 'שרשראות סרוגות';
      hoopsCategory.textContent = 'עגילי חישוק';
      braceletsCategory.textContent = 'צמידים';
      dangleCategory.textContent = 'עגילים תלויים';
      unisexCategory.textContent = 'תכשיטי יוניסקס';
    }
  }

  // Image Slider (removed - slider container no longer exists)

  _imageSlider() {
    // Slider has been removed from homepage
    // This method is kept for compatibility but does nothing
    return;
  }

  // Image slider END
  // ````````````````````````````````````````````````````````````

  continueLogin() {
    const continueBtn = document.querySelector('.continue-button');
    continueBtn.addEventListener('click', e => {
      const userEmail = document.getElementById('email-input').value;
      const userPassword = document.getElementById('password-input').value;
      const data = {
        email: userEmail,
        password: userPassword,
      };
      this.loginHandler(data);
    });
  }

  // Override the placeholder from View.js
  setPageSpecificLanguage(lng, cartNum) {
    this.setHomeLanguage(lng);
    // Ensure cart icon is visible after setting language
    setTimeout(() => {
      this.ensureCartIconVisibility();
    }, 100);
  }
}

export default new HomePageView();
