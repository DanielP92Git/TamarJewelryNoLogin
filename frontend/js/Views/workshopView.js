import View from "../View.js";

class WorkshopView extends View {
  addWorkshopHandler(handler) {
    window.addEventListener("load", handler);
  }

  /**
  * * --Workshop page images slider--
  */
  _imageSlider() {
    const images = document.querySelectorAll(".workshop-image");

    let curImg = 0;
    const maxImages = images.length;

    const goToImage = function (slide) {
      images.forEach(
        (img) => (img.style.transform = `translateX(${-100 * slide}%)`)
      );
      setTimeout(() => {
        nextImage();
      }, 6000);
    };

    const nextImage = function () {
      if (curImg === maxImages - 1) {
        curImg = 0;
      } else {
        curImg++;
      }
      goToImage(curImg);
    };

    const timeOut = function () {
      setTimeout(() => {
        goToImage();
      }, 1000);
    };
    timeOut();
  }

  // Workshop END
  ///////////////////////////////////////
}

export default new WorkshopView();
