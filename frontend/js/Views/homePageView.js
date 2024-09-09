import View from "../View.js";

class HomePageView extends View {
  // Modal window:
  // _modal = document.querySelector(".modal");
  // _overlay = document.querySelector(".overlay");
  // _modalReveal = document.querySelector(".modal-reveal");
  // _btnCloseThanks = document.querySelector('.close-thanks');

  addHomePageHandler = function (handler) {
    window.addEventListener("load", handler);
  };

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
    const images = document.querySelectorAll(".slider-image-item");
    const sliderBtnRight = document.querySelector(".slider-btn--right");
    const sliderBtnLeft = document.querySelector(".slider-btn--left");

    let curSlide = 0;
    const maxSlide = images.length;

    const goToImage = function (slide) {
      images.forEach(
        (img) => (img.style.transform = `translateX(${-100 * slide}%)`)
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
    sliderBtnRight.addEventListener("click", nextImage);
    sliderBtnLeft.addEventListener("click", prevImage);
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
    const continueBtn = document.querySelector(".continue-button");
    continueBtn.addEventListener("click", (e) => {
      const userEmail = document.getElementById("email-input").value;
      const userPassword = document.getElementById("password-input").value;
      const data = {
        email: userEmail,
        password: userPassword,
      };
      this.loginHandler(data);
    });
  }
}

export default new HomePageView();
