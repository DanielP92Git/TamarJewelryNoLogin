export default class View {
  _data;
  _goToTop = document.querySelector(".go-to-top");
  _header = document.querySelector("header");
  _menu = document.querySelector(".menu");
  _categoriesTab = document.querySelector(".categories-tab");
  _categoriesList = document.querySelector(".categories-list");
  _cartNumber = document.querySelector(".cart-number");
  _cartNewValue = 0;
  _loginBtn = document.querySelector(".login-btn");

  /**
   * * --Categories reveal--
   */
  //////////////////////////////////////////////////
  revealCategories = function () {
    const categoriesList = document.querySelector(".categories-list");
    categoriesList.classList.add("categories-list--active");
  };

  hideCategories = function () {
    const categoriesList = document.querySelector(".categories-list");
    categoriesList.classList.remove("categories-list--active");
  };

  addRevealHandler = function () {
    const x = window.matchMedia("(min-width: 700px)");
    if (!x.matches) return;
    this._categoriesTab.addEventListener("mouseover", this.revealCategories);
    this._categoriesTab.addEventListener("mouseleave", this.hideCategories);
  };
  // Categories reveal END
  // `````````````````````````````````````````````````````

  /**
   * * --Mobile View Categories Reveal--
   */
  mobileCategories(e) {
    if (e.target.closest(".categories-tab")) {
      this._categoriesList.classList.toggle("reveal");
    }
  }

  addMobileHandler() {
    const x = window.matchMedia("(max-width: 699.99px)");
    if (!x.matches) return;
    this._categoriesTab.addEventListener(
      "click",
      this.mobileCategories.bind(this)
    );
  }

  /**
   * * --Sticky Menu--
   */

  stickyMenuFn = function () {
    const menu = document.querySelector(".menu");
    const stickyMenu = function (entries) {
      const [entry] = entries;
      console.log(entry);
      if (!entry.isIntersecting)
        menu.classList.add("sticky") + menu.classList.remove("hidden");
      else menu.classList.remove("sticky");
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
        menu.classList.add("hidden") + menu.classList.remove("sticky");
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
   * * --Switch SVG menu button on mobile mode--
   */

  svgHandler() {
    const menuBars = document.querySelector(".menubars-svg");
    const categoriesList = document.querySelector(".categories-list");

    const changeSVG = function () {
      const parent = document.querySelector(".menubars-toggle");
      parent.classList.toggle("close");
      const checkIcon = parent.classList.contains("close");
      let icon = "-svg";
      icon = (!checkIcon ? "close" : "menubars") + icon;

      document.querySelector(".menubars-use").setAttribute("href", `#${icon}`);

      if (icon !== "close-svg") {
        if (categoriesList.classList.contains("reveal")) {
          categoriesList.classList.remove("reveal");
        }
      }
    };

    const revealMenu = function () {
      const menu = document.querySelector(".menu");
      menu.style.transform = "translateX(200px)";
    };
    const hideMenu = function () {
      const menu = document.querySelector(".menu");
      menu.style.transform = "translateX(-200px)";
    };

    const toggleMenu=function() {
      const parent = document.querySelector(".menubars-toggle");

      const checkIcon = parent.classList.contains("close");
      checkIcon ? hideMenu() : revealMenu()
    }

    menuBars.addEventListener("click", () => {
      changeSVG();
      toggleMenu()
    });
  }

  /**
   * * --Go To Top--
   */
  //////////////////////////////////////////////////
  _moveToTopHandler = function () {
    this._goToTop.addEventListener("click", this.movePageTop.bind(this));
  };

  movePageTop = function () {
    this._header.scrollIntoView({ behavior: "smooth" });
  };

  // Go to top END
  ////////////////////////////

  increaseCartNumber() {
    this._cartNewValue = +this._cartNumber.textContent + 1;
    this._cartNumber.textContent = this._cartNewValue;
  }

  decreaseCartNumber() {
    this._cartNewValue = +this._cartNumber.textContent - 1;
    this._cartNumber.textContent = this._cartNewValue;
  }

  persistCartNumber(num) {
    this._cartNumber.textContent = num;
  }

  async logInOutHandler() {
    const checkAuth = await localStorage.getItem("auth-token");

    if (checkAuth == null) {
      this._loginBtn.textContent = "Login";
      // this._loginBtn.addEventListener("click", this.login);
    } else {
      this._loginBtn.textContent = "Logout";
      this._loginBtn.addEventListener("click", this.logout.bind(this));
    }
  }

  // login() {
  //   window.location.replace("../html/login.html");
  // }

  logout() {
    localStorage.removeItem("auth-token");
    window.location.reload();
    this._loginBtn.textContent = "Login";
  }
}
