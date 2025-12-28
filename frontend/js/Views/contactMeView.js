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
      email: document.getElementById('contact-email').value,
      message: document.getElementById('message').value,
    };

    try {
      await emailjs.send('service_t4qcx4j', 'template_kwezl8a', params, {
        publicKey: 'dyz9UzngEOQUHFgv3',
      });
      (document.getElementById('name').value = ''),
        (document.getElementById('lastname').value = ''),
        (document.getElementById('contact-email').value = ''),
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
    this.setContactTitleLng('heb');
  };

  changeToEng = function () {
    localStorage.setItem('language', `eng`);
    this.setFormLng('eng');
    this.setLanguage('eng');
    this.setFooterLng('eng');
    this.setContactTitleLng('eng');
  };

  generateFormLanguage(lng) {
    const formContainer = document.querySelector('.contact-form');
    if (lng === 'eng') {
      formContainer.style.direction = 'ltr';
      return `
        <div class="form-group">
          <div class="input-group">
            <input
              type="text"
              id="name"
              name="name"
              placeholder="First Name"
              required
              autofocus
            />
            <label for="name">First Name</label>
            <div class="input-highlight"></div>
          </div>

          <div class="input-group">
            <input
              type="text"
              id="lastname"
              name="lastname"
              placeholder="Last Name"
              required
            />
            <label for="lastname">Last Name</label>
            <div class="input-highlight"></div>
          </div>
        </div>

        <div class="input-group">
          <input
            type="email"
            id="contact-email"
            name="email"
            placeholder="Email Address"
            required
          />
          <label for="contact-email">Email Address</label>
          <div class="input-highlight"></div>
        </div>

        <div class="input-group full-width">
          <textarea
            id="message"
            name="message"
            placeholder="Your Message"
            required
          ></textarea>
          <label for="message">Your Message</label>
          <div class="input-highlight"></div>
        </div>

        <button type="submit" class="submit-button" id="submit">
          Send Message
          <svg class="button-arrow" viewBox="0 0 24 24">
            <path
              d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"
            />
          </svg>
        </button>
      `;
    } else if (lng === 'heb') {
      formContainer.style.direction = 'rtl';

      return `
        <div class="form-group">
          <div class="input-group">
            <input
              type="text"
              id="name"
              name="name"
              placeholder="שם פרטי"
              required
              autofocus
            />
            <label for="name">שם פרטי</label>
            <div class="input-highlight"></div>
          </div>

          <div class="input-group">
            <input
              type="text"
              id="lastname"
              name="lastname"
              placeholder="שם משפחה"
              required
            />
            <label for="lastname">שם משפחה</label>
            <div class="input-highlight"></div>
          </div>
        </div>

        <div class="input-group">
          <input
            type="email"
            id="contact-email"
            name="email"
            placeholder="כתובת דואר אלקטרוני"
            required
          />
          <label for="contact-email">כתובת דואר אלקטרוני</label>
          <div class="input-highlight"></div>
        </div>

        <div class="input-group full-width">
          <textarea
            id="message"
            name="message"
            placeholder="הודעתך"
            required
          ></textarea>
          <label for="message">הודעתך</label>
          <div class="input-highlight"></div>
        </div>

        <button type="submit" class="submit-button submit-heb" id="submit">
          שלח/י
          <svg class="button-arrow" viewBox="0 0 24 24">
            <path
              d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"
            />
          </svg>
        </button>
      `;
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

  setContactTitleLng(lng) {
    const contactTitle = document.querySelector('.contact-title');
    const contactSubtitle = document.querySelector('.contact-subtitle');

    if (contactTitle) {
      contactTitle.textContent = lng === 'heb' ? 'צרו קשר' : 'Get in Touch';
    }

    if (contactSubtitle) {
      contactSubtitle.textContent =
        lng === 'heb'
          ? 'יש לך שאלה או רוצה לשתף פעולה? אשמח לשמוע ממך.'
          : "Have a question or want to collaborate? I'd love to hear from you.";
    }
  }
}

export default new ContactMeView();
