import emailjs, { EmailJSResponseStatus } from '@emailjs/browser';
import View from '../View.js';

class ContactMeView extends View {
  _submitBtn = document.getElementById('submit');
  // ANTI-SPAM: Track when form was loaded
  _formLoadTime = null;

  addContactMeHandler(handler) {
    window.addEventListener('load', () => {
      let lng = localStorage.getItem('language');
      if (!lng) {
        localStorage.setItem('language', 'eng');
        lng = 'eng';
      }

      // ANTI-SPAM: Record form load time
      this._formLoadTime = Date.now();
      const formLoadedAtField = document.getElementById('formLoadedAt');
      if (formLoadedAtField) {
        formLoadedAtField.value = this._formLoadTime;
      }

      handler(lng);
    });
  }

  // ANTI-SPAM: Validate submission is not from a bot
  _validateNotBot() {
    // Check 1: Honeypot field should be empty
    const honeypot = document.getElementById('website');
    if (honeypot && honeypot.value.trim() !== '') {
      console.log('ANTI-SPAM: Honeypot triggered');
      return { valid: false, reason: 'honeypot' };
    }

    // Check 2: Time-based validation (minimum 3 seconds to fill form)
    const formLoadedAt = this._formLoadTime || parseInt(document.getElementById('formLoadedAt')?.value || '0');
    const timeElapsed = Date.now() - formLoadedAt;
    const MIN_FILL_TIME = 3000; // 3 seconds minimum
    if (formLoadedAt && timeElapsed < MIN_FILL_TIME) {
      console.log('ANTI-SPAM: Form submitted too quickly');
      return { valid: false, reason: 'too_fast' };
    }

    return { valid: true };
  }

  // ANTI-SPAM: Validate input content quality
  _validateContent(name, lastname, email, message) {
    // Check for excessive URLs in message (common spam indicator)
    const urlPattern = /https?:\/\/[^\s]+/gi;
    const urlMatches = message.match(urlPattern) || [];
    if (urlMatches.length > 2) {
      console.log('ANTI-SPAM: Too many URLs in message');
      return { valid: false, reason: 'too_many_urls' };
    }

    // Check for very short or suspicious names (single character, numbers only)
    const namePattern = /^[a-zA-Z\u0590-\u05FF\s'-]{2,}$/; // Letters (including Hebrew), spaces, hyphens, apostrophes
    if (!namePattern.test(name) || !namePattern.test(lastname)) {
      console.log('ANTI-SPAM: Invalid name format');
      return { valid: false, reason: 'invalid_name' };
    }

    // Check message has reasonable content (at least 10 characters of actual text)
    const cleanMessage = message.replace(/\s+/g, '').replace(urlPattern, '');
    if (cleanMessage.length < 10) {
      console.log('ANTI-SPAM: Message too short or empty');
      return { valid: false, reason: 'message_too_short' };
    }

    // Check for common spam patterns
    const spamPatterns = [
      /\b(viagra|cialis|casino|lottery|winner|click here|buy now|free money)\b/i,
      /(.)\1{5,}/,  // Same character repeated 6+ times
      /^[^a-zA-Z\u0590-\u05FF]*$/,  // No letters at all
    ];
    for (const pattern of spamPatterns) {
      if (pattern.test(message)) {
        console.log('ANTI-SPAM: Spam pattern detected');
        return { valid: false, reason: 'spam_pattern' };
      }
    }

    // Basic email format validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      console.log('ANTI-SPAM: Invalid email format');
      return { valid: false, reason: 'invalid_email' };
    }

    return { valid: true };
  }

  async sendEmail() {
    const name = document.getElementById('name').value.trim();
    const lastname = document.getElementById('lastname').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const message = document.getElementById('message').value.trim();

    // ANTI-SPAM: Run bot detection checks
    const botCheck = this._validateNotBot();
    if (!botCheck.valid) {
      // Silently fail for bots - don't give feedback
      console.log('Submission blocked:', botCheck.reason);
      // Clear form to make it look like it worked (confuse bots)
      document.getElementById('name').value = '';
      document.getElementById('lastname').value = '';
      document.getElementById('contact-email').value = '';
      document.getElementById('message').value = '';
      alert('Message Sent Successfully!');
      return;
    }

    // ANTI-SPAM: Validate content quality
    const contentCheck = this._validateContent(name, lastname, email, message);
    if (!contentCheck.valid) {
      // For content issues, give user feedback so legitimate users can fix
      const lng = localStorage.getItem('language') || 'eng';
      let errorMsg = lng === 'heb'
        ? 'אנא בדוק את הפרטים שהזנת ונסה שוב.'
        : 'Please check your input and try again.';

      if (contentCheck.reason === 'message_too_short') {
        errorMsg = lng === 'heb'
          ? 'אנא כתוב הודעה מפורטת יותר.'
          : 'Please write a more detailed message.';
      } else if (contentCheck.reason === 'invalid_name') {
        errorMsg = lng === 'heb'
          ? 'אנא הזן שם תקין.'
          : 'Please enter a valid name.';
      } else if (contentCheck.reason === 'invalid_email') {
        errorMsg = lng === 'heb'
          ? 'אנא הזן כתובת דואר אלקטרוני תקינה.'
          : 'Please enter a valid email address.';
      }

      alert(errorMsg);
      return;
    }

    const params = {
      name: name,
      lastname: lastname,
      email: email,
      message: message,
    };

    try {
      await emailjs.send('service_t4qcx4j', 'template_kwezl8a', params, {
        publicKey: 'dyz9UzngEOQUHFgv3',
      });
      document.getElementById('name').value = '';
      document.getElementById('lastname').value = '';
      document.getElementById('contact-email').value = '';
      document.getElementById('message').value = '';
      // ANTI-SPAM: Reset honeypot field too
      const honeypot = document.getElementById('website');
      if (honeypot) honeypot.value = '';
      alert('Message Sent Successfully!');
    } catch (err) {
      if (err instanceof EmailJSResponseStatus) {
        console.error('EMAILJS FAILED...', err);
        return;
      }

      console.error('ERROR', err);
    }
  }

  sendHandler() {
    // ANTI-SPAM: Bind this context so validation methods work
    this._submitBtn.addEventListener('click', this.sendEmail.bind(this));
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
    // ANTI-SPAM: Common honeypot and timestamp fields for both languages
    const antiSpamFields = `
      <!-- ANTI-SPAM: Honeypot field - hidden from humans, bots will fill it -->
      <div style="position: absolute; left: -9999px;" aria-hidden="true">
        <input type="text" name="website" id="website" tabindex="-1" autocomplete="off" />
      </div>
      <!-- ANTI-SPAM: Hidden timestamp for time-based validation -->
      <input type="hidden" name="form_loaded_at" id="formLoadedAt" value="${this._formLoadTime || Date.now()}" />
    `;

    if (lng === 'eng') {
      formContainer.style.direction = 'ltr';
      return `
        ${antiSpamFields}
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
        ${antiSpamFields}
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

    // ANTI-SPAM: Re-attach submit handler after form regeneration
    this._submitBtn = document.getElementById('submit');
    if (this._submitBtn) {
      this._submitBtn.addEventListener('click', this.sendEmail.bind(this));
    }

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
