import View from '../View.js';

class PoliciesView extends View {
  addPoliciesHandler(handler) {
    window.addEventListener('load', () => {
      let lng = localStorage.getItem('language');
      if (!lng) {
        localStorage.setItem('language', 'eng');
        lng = 'eng';
      }

      handler(lng);
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
    localStorage.setItem('language', 'heb');
    this.setLanguage('heb');
    this.setFooterLng('heb');
  };

  changeToEng = function () {
    localStorage.setItem('language', 'eng');
    this.setLanguage('eng');
    this.setFooterLng('eng');
  };
}

export default new PoliciesView();
