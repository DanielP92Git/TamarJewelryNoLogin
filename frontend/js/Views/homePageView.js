import View from '../View.js';
import shoppingCartIcon from '../../imgs/svgs/cart-shopping-solid.svg';
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
  }

  changeToEng() {
    localStorage.setItem('language', 'eng');
    // Call base class method first
    super.changeToEng();
    // Then do homepage-specific updates
    this.setHomeLanguage('eng');
    this.setFooterLng('eng');
  }

  setHomeLanguage(lng) {
    // Page-specific language setup
    this.setCategoriesLng(lng);
    this.handleFooterMarkup(lng);

    // Update hero section text
    const heroText = document.querySelector('.hero-section h3');
    if (heroText) {
      if (lng === 'eng') {
        heroText.innerHTML = `
          The Beauty <br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Of
          <span>Colors</span>
        `;
      } else if (lng === 'heb') {
        heroText.innerHTML = `
          <span>היופי</span> <br />
          <span>&nbsp;&nbsp;&nbsp;שבצבעים</span>
        `;
        heroText.style.direction = 'rtl';
        heroText.style.textAlign = 'right';
      }
    }
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

  // Image Slider

  _imageSlider() {
    const images = document.querySelectorAll('.slider-image-item');
    const sliderBtnRight = document.querySelector('.slider-btn--right');
    const sliderBtnLeft = document.querySelector('.slider-btn--left');

    let curSlide = 0;
    const maxSlide = images.length;

    const goToImage = function (slide) {
      images.forEach(
        img => (img.style.transform = `translateX(${-100 * slide}%)`)
      );
    };

    const nextImage = function () {
      if (curSlide === maxSlide - 4) {
        curSlide = 0;
      } else {
        curSlide++;
      }
      goToImage(curSlide);
    };

    const prevImage = function () {
      if (curSlide === 0) {
        curSlide = maxSlide - 4;
      } else {
        curSlide--;
      }
      goToImage(curSlide);
    };
    sliderBtnRight.addEventListener('click', nextImage);
    sliderBtnLeft.addEventListener('click', prevImage);
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
    // Footer seems to be handled separately in controller/base View?
    // this.setFooterLng(lng);
  }
}

export default new HomePageView();
