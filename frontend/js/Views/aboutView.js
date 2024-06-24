import View from "../View.js";

class AboutView extends View {
  addAboutHandler(handler) {
    window.addEventListener("load", handler);
  }
}

export default new AboutView();
