import emailjs, { EmailJSResponseStatus } from '@emailjs/browser';
import View from '../View.js';

class ContactMeView extends View {
  _submitBtn = document.getElementById('submit');

  addContactMeHandler(handler) {
    window.addEventListener('load', () => {
      let lng = localStorage.getItem('language');
      if (!lng) {
        localStorage.setItem('language', 'eng');
        lng = 'eng';
      }

      handler(lng);
    });
  }

  async sendEmail() {
    const params = {
      name: document.getElementById('name').value,
      lastname: document.getElementById('lastname').value,
      email: document.getElementById('email').value,
      message: document.getElementById('message').value,
    };

    try {
      await emailjs.send('service_t4qcx4j', 'template_kwezl8a', params, {
        publicKey: 'dyz9UzngEOQUHFgv3',
      });
      (document.getElementById('name').value = ''),
        (document.getElementById('lastname').value = ''),
        (document.getElementById('email').value = ''),
        (document.getElementById('message').value = ''),
        alert('Message Sent Successfully!');
    } catch (err) {
      if (err instanceof EmailJSResponseStatus) {
        console.log('EMAILJS FAILED...', err);
        return;
      }

      console.log('ERROR', err);
    }
  }

  sendHandler() {
    this._submitBtn.addEventListener('click', this.sendEmail);
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
    this.setFormLng(`heb`);
    this.setLanguage('heb');
    this.setFooterLng('heb');
  };

  changeToEng = function () {
    localStorage.setItem('language', `eng`);
    this.setFormLng('eng');
    this.setLanguage('eng');
    this.setFooterLng('eng');
  };

  generateFormLanguage(lng) {
    const formContainer = document.querySelector('.contact-form');
    if (lng === 'eng') {
      formContainer.style.direction = 'ltr';
      return `<h1>Contact Me</h1>
        <input
          type="text"
          id="name"
          placeholder="First Name*"
          required
          autofocus
        />
        <input type="text" id="lastname" placeholder="Last Name*" required />
        <input type="email" id="email" placeholder="Email Address*" required />
        <textarea
          type="text"
          id="message"
          rows="3"
          placeholder="Your Message*"
        ></textarea>
        <input type="submit" id="submit" />`;
    } else if (lng === 'heb') {
      formContainer.style.direction = 'rtl';

      return `<h1>צרו קשר</h1>
        <input
          type="text"
          id="name"
          placeholder="שם פרטי*"
          required
          autofocus
        />
        <input type="text" id="lastname" placeholder="שם משפחה*" required />
        <input type="email" id="email" placeholder="כתובת דוא"ל*" required />
        <textarea
          type="text"
          id="message"
          rows="3"
          placeholder="הודעתך*"
        ></textarea>
        <input type="submit" id="submit" value="שלח"/>`;
    }
  }

  setFormLng(lng) {
    const formContainer = document.querySelector('.contact-form');
    formContainer.innerHTML = '';
    const markup = this.generateFormLanguage(lng);
    formContainer.insertAdjacentHTML('afterbegin', markup);

    this._categoriesTab = document.querySelector('.categories-tab');
    this._categoriesList = document.querySelector('.categories-list');
  }
}

export default new ContactMeView();
