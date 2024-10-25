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
    });
  };

  /**
   * * --Change Language--
   */

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
    this.setHomeLanguage('heb');
    this.setLanguage('heb');
    this.setFooterLng('heb');
    this.addMobileHandler()

  };

  changeToEng = function () {
    localStorage.setItem('language', `eng`);
    this.setHomeLanguage('eng');
    this.setLanguage('eng');
    this.setFooterLng('eng');
    this.addMobileHandler()

  };

  setHomeLanguage(lng) {
    this._menu.innerHTML = '';

    const markup = this.handleMenuLanguage(lng);
    this._menu.insertAdjacentHTML('afterbegin', markup);

    this._categoriesTab = document.querySelector('.categories-tab');
    this._categoriesList = document.querySelector('.categories-list');

    
    this.setCategoriesLng(lng);
    this.handleFooterMarkup(lng);
    this.handleLanguage();

    this.addRevealHandler();
    this.addMobileHandler()
    this.svgHandler();
  }

  // handleMenuLanguage(lng) {
  //   if (lng === 'eng') {
  //     return `<ul class="menu__ul ul-eng">
  //         <li class="main-nav-tab">
  //           <a class="attrib" href="./index.html">Home</a>
  //         </li>
  //         <li class="main-nav-tab categories-tab">
  //           <a class="attrib" href="#">Shop ▾</a>
  //           <ul class="categories-list">
  //             <li class="category-item category-item--necklace">
  //               <a class="attrib" href="./html/categories/necklaces.html"
  //                 >Necklaces</a
  //               >
  //             </li>
  //             <li class="category-item category-item--crochet-necklace">
  //               <a class="attrib" href="./html/categories/crochetNecklaces.html"
  //                 >Crochet Necklaces</a
  //               >
  //             </li>
  //             <li class="category-item category-item--hoops">
  //               <a class="attrib" href="./html/categories/hoops.html"
  //                 >Hoop Earrings</a
  //               >
  //             </li>
  //             <li class="category-item category-item--dangle">
  //               <a class="attrib" href="./html/categories/dangle.html"
  //                 >Dangle Earrings</a
  //               >
  //             </li>

  //             <li class="category-item category-item--bracelets">
  //               <a class="attrib" href="./html/categories/bracelets.html"
  //                 >Bracelets</a
  //               >
  //             </li>
  //             <li class="category-item category-item--unisex">
  //               <a class="attrib" href="./html/categories/unisex.html"
  //                 >Unisex Jewelry</a
  //               >
  //             </li>
  //           </ul>
  //         </li>
  //         <li class="main-nav-tab">
  //           <a class="attrib" href="./html/jewelry-workshop.html"
  //             >Jewelry Workshop</a
  //           >
  //         </li>
  //         <li class="main-nav-tab">
  //           <a class="attrib" href="./html/about.html">About</a>
  //         </li>
  //         <li class="main-nav-tab contact">
  //           <a class="attrib" href="./html/contact-me.html">Contact Me</a>
  //         </li>
  //         <!-- <li class="main-nav-tab login" id="login-tab">
  //           <a class="attrib login-btn" href="./html/login.html">Login</a>
  //         </li> -->
  //         <!-- <li class="main-nav-tab login" id="login-tab">
  //           <a class="attrib login-btn" href="./html/bambaYafa.html">Dashboard</a>
  //         </li> -->
  //         <a class="attrib-cart" href="./html/cart.html">
  //           <div class="cart-container">
  //             <img
  //               src=${shoppingCartIcon}
  //               alt="shopping cart icon"
  //               class="shoppingcart-svg"
  //             />
  //             <span class="cart-number">0</span>
  //           </div>
  //         </a>
  //       </ul>
  //       <div class="languages-continer">
  //         <button class="heb-lng">עב</button>
  //         <button class="eng-lng">EN</button>
  //       </div>
  //       `;
  //   } else if (lng === 'heb') {
  //     return `<ul class="menu__ul ul-heb">
  //         <li class="main-nav-tab">
  //           <a class="attrib" href="./index.html">בית </a>
  //         </li>
  //         <li class="main-nav-tab categories-tab">
  //           <a class="attrib" href="#">חנות ▾</a>
  //           <ul class="categories-list">
  //             <li class="category-item category-item--necklace">
  //               <a class="attrib" href="./html/categories/necklaces.html"
  //                 >שרשראות</a
  //               >
  //             </li>
  //             <li class="category-item category-item--crochet-necklace">
  //               <a class="attrib" href="./html/categories/crochetNecklaces.html"
  //                 >שרשראות סרוגות</a
  //               >
  //             </li>
  //             <li class="category-item category-item--hoops">
  //               <a class="attrib" href="./html/categories/hoops.html"
  //                 >עגילי חישוק</a
  //               >
  //             </li>
  //             <li class="category-item category-item--dangle">
  //               <a class="attrib" href="./html/categories/dangle.html"
  //                 >עגילים תלויים</a
  //               >
  //             </li>

  //             <li class="category-item category-item--bracelets">
  //               <a class="attrib" href="./html/categories/bracelets.html"
  //                 >צמידים</a
  //               >
  //             </li>
  //             <li class="category-item category-item--unisex">
  //               <a class="attrib" href="./html/categories/unisex.html"
  //                 >תכשיטי יוניסקס</a
  //               >
  //             </li>
  //           </ul>
  //         </li>
  //         <li class="main-nav-tab">
  //           <a class="attrib" href="./html/jewelry-workshop.html"
  //             >סדנאת תכשיטים</a
  //           >
  //         </li>
  //         <li class="main-nav-tab">
  //           <a class="attrib" href="./html/about.html">אודות</a>
  //         </li>
  //         <li class="main-nav-tab contact">
  //           <a class="attrib" href="./html/contact-me.html">צרו קשר</a>
  //         </li>
  //         <!-- <li class="main-nav-tab login" id="login-tab">
  //           <a class="attrib login-btn" href="./html/login.html">Login</a>
  //         </li> -->
  //         <!-- <li class="main-nav-tab login" id="login-tab">
  //           <a class="attrib login-btn" href="./html/bambaYafa.html">Dashboard</a>
  //         </li> -->
  //         <a class="attrib-cart" href="./html/cart.html">
  //           <div class="cart-container">
  //             <img
  //               src=${shoppingCartIcon}
  //               alt=""
  //               class="shoppingcart-svg"
  //             />
  //             <span class="cart-number">0</span>
  //           </div>
  //         </a>
  //       </ul>
  //       <div class="languages-continer">
  //         <button class="heb-lng">עב</button>
  //         <button class="eng-lng">EN</button>
  //       </div>
  //       `;
  //   }
  // }

  setCategoriesLng(lng) {
    let necklacesCategory = document.querySelector('.category-name_necklaces');
    let crochetNecklacesCategory = document.querySelector(
      '.category-name_crochet-necklaces'
    );
    let hoopsCategory = document.querySelector('.category-name_hoops');
    let braceletsCategory = document.querySelector('.category-name_bracelets');
    let dangleCategory = document.querySelector('.category-name_dangle');
    let unisexCategory = document.querySelector('.category-name_unisex');
    if (lng === 'eng') {
      necklacesCategory.textContent = 'Necklaces';
      crochetNecklacesCategory.textContent = 'Crochet Necklaces';
      hoopsCategory.textContent = 'Hoop Earrings';
      braceletsCategory.textContent = 'Bracelets';
      dangleCategory.textContent = 'Dangle Earrings';
      unisexCategory.textContent = 'Unisex Jewelry';
    } else {
      necklacesCategory.textContent = 'שרשראות';
      crochetNecklacesCategory.textContent = 'שרשראות סרוגות';
      hoopsCategory.textContent = 'עגילי חישוק';
      braceletsCategory.textContent = 'צמידים';
      dangleCategory.textContent = 'עגילים תלויים';
      unisexCategory.textContent = 'תכשיטי יוניסקס';
    }
  }

  // _addHandlerOpenModal = async function () {
  //   try {
  //     const timeoutModal = function (modal, overlay) {
  //       setTimeout(() => {
  //         modal.classList.add("modal-reveal");
  //         modal.style.display = "flex";
  //         overlay.classList.add("overlay-reveal");
  //       }, 1000);
  //     };
  //     await window.addEventListener(
  //       "load",
  //       timeoutModal(this._modal, this._overlay)
  //     );
  //   } catch (err) {
  //     console.error(err);
  //   }
  // };

  // _addHandlerCloseModal = function () {
  //   const btnCloseModal = document.querySelector(".close-modal");
  //   btnCloseModal.addEventListener("click", this._closeModal.bind(this));
  // };

  // _closeModal = function () {
  //   const modalReveal = document.querySelector(".modal-reveal");

  //   modalReveal.style.display = "none";
  //   this._modal.style.display = "none";
  //   this._overlay.classList.remove("overlay-reveal");
  // };

  // _addHandlerCloseSubscribe = function () {
  //   const submitSubscribe = document.querySelector("#submit-subscribe");
  //   submitSubscribe.addEventListener("click", this._closeSubscribe.bind(this));
  // };

  // _closeSubscribe = function () {
  //   const modalReveal = document.querySelector(".modal-reveal");
  //   const thanksHide = document.querySelector(".hide");
  //   this._modal.style.display = "none";
  //   modalReveal.style.display = "none";
  //   thanksHide.classList.remove("hide");
  // };

  // _addHandlerCloseThanks = function () {
  //   const btnCloseThanks = document.querySelector(".close-thanks");
  //   btnCloseThanks.addEventListener("click", this._closeThanks.bind(this));
  // };

  // _closeThanks = function () {
  //   const modalReveal = document.querySelector(".modal-reveal");
  //   const thanksMsg = document.querySelector(".thanks");
  //   modalReveal.style.display - "none";
  //   this._modal.style.display = "none";
  //   this._overlay.style.display = "none";
  //   thanksMsg.style.display = "none";
  // };
  // Modal window END
  //````````````````````````````````````````````````````````

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

  // _checkId = function () {
  //   const bodyCheck = document.body.id.includes('home');

  //   const btnCloseModal = document.querySelector('.close-modal');
  //   if (!bodyCheck) return;

  //   btnCloseThanks.addEventListener('click', closeThanks);
  //   overlay.addEventListener('click', closeModal);
  //   goToTop.addEventListener('click', movePageTop);
  //   openModal();
  // };

  // renderDashboardTab(){
  //   const markup = `<li class="main-nav-tab login" id="login-tab">
  //   <a class="attrib login-btn" href="./html/bambaYafa.html">Dashboard</a>
  // </li>`

  // const setEl = document.querySelector('.login')
  // setEl.insertAdjacentHTML('afterbegin', markup)
  // }

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
}

export default new HomePageView();
