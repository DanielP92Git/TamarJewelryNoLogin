import View from '../View.js';

class WorkshopView extends View {
  addWorkshopHandler(handler) {
    window.addEventListener('load', () => {
      let lng = localStorage.getItem('language');
      if (!lng) {
        localStorage.setItem('language', 'eng');
        lng = 'eng';
      }

      handler(lng);
    });
  }

  /**
   * * --Workshop page images slider--
   */
  _imageSlider() {
    const sliderContainer = document.querySelector('.slide-images-container');
    if (!sliderContainer) return;

    const slideContainers = sliderContainer.querySelectorAll('.slide-image');
    if (!slideContainers || slideContainers.length === 0) return;

    const images = sliderContainer.querySelectorAll('.slide-image-img');
    if (!images || images.length === 0) return;

    // Get existing buttons
    const btnLeft = sliderContainer.querySelector('.slider-btn--left');
    const btnRight = sliderContainer.querySelector('.slider-btn--right');

    if (!btnLeft || !btnRight) {
      console.error('Slider buttons not found in the HTML');
      return;
    }

    // Buttons are now styled purely via CSS
    let curImg = 0;
    const maxImages = slideContainers.length;

    const goToImage = function (slide, skipTransition = false) {
      if (skipTransition) {
        // Temporarily disable transitions for instant jump
        slideContainers.forEach(container => {
          container.style.transition = 'none';
        });
      }

      slideContainers.forEach((container, index) => {
        const offset = (index - slide) * 100;
        container.style.transform = `translateX(${offset}%)`;
      });

      if (skipTransition) {
        // Re-enable transitions after a brief moment
        setTimeout(() => {
          slideContainers.forEach(container => {
            container.style.transition = '';
          });
        }, 50);
      }
    };

    const nextSlide = function () {
      const prevImg = curImg;
      curImg = (curImg + 1) % maxImages;

      // If wrapping from last to first, skip transition for instant jump
      const isWrapping = prevImg === maxImages - 1 && curImg === 0;
      goToImage(curImg, isWrapping);
    };

    const prevSlide = function () {
      const prevImg = curImg;
      curImg = (curImg - 1 + maxImages) % maxImages;

      // If wrapping from first to last, skip transition for instant jump
      const isWrapping = prevImg === 0 && curImg === maxImages - 1;
      goToImage(curImg, isWrapping);
    };

    // Initial setup - ensure first image is visible and others are positioned correctly
    // Remove transition temporarily for initial positioning to avoid animation on page load
    slideContainers.forEach(container => {
      container.style.transition = 'none';
    });

    // Position all images correctly without animation
    goToImage(0);

    // Re-enable transitions after a brief moment
    setTimeout(() => {
      slideContainers.forEach(container => {
        container.style.transition = '';
      });
    }, 50);

    // Ensure we clean up previous event listeners to avoid duplicates
    const newBtnLeft = btnLeft.cloneNode(true);
    const newBtnRight = btnRight.cloneNode(true);

    btnLeft.parentNode.replaceChild(newBtnLeft, btnLeft);
    btnRight.parentNode.replaceChild(newBtnRight, btnRight);

    // Add Event Listeners to the new buttons
    newBtnLeft.addEventListener('click', prevSlide);
    newBtnRight.addEventListener('click', nextSlide);
  }

  handleLanguage() {
    const hebLng = document.querySelector('.heb-lng');
    const engLng = document.querySelector('.eng-lng');

    if (hebLng && engLng) {
      hebLng.addEventListener('click', () => this.changeToHeb());
      engLng.addEventListener('click', () => this.changeToEng());
    }
  }

  async changeToHeb() {
    try {
      // First store the language preference
      localStorage.setItem('language', 'heb');

      // Update all the workshop-specific content
      this.setFooterLng('heb');
      this.setWorkshopLng('heb');
      this.setCostsLng('heb');

      // Call the base View's setLanguage method to update the menu
      await this.setLanguage('heb', 0);
    } catch (error) {
      console.error('[WorkshopView] Error in changeToHeb:', error);
    }
  }

  async changeToEng() {
    try {
      // First store the language preference
      localStorage.setItem('language', 'eng');

      // Update all the workshop-specific content
      this.setFooterLng('eng');
      this.setWorkshopLng('eng');
      this.setCostsLng('eng');

      // Call the base View's setLanguage method to update the menu
      await this.setLanguage('eng', 0);
    } catch (error) {
      console.error('[WorkshopView] Error in changeToEng:', error);
    }
  }

  handleWorkshopLng(lng) {
    const descriptionContainer = document.querySelector(
      '.workshop-description',
    );
    if (lng === 'eng') {
      descriptionContainer.style.direction = 'ltr';
      descriptionContainer.style.textAlign = 'left';
      return `I am delighted to invite you to a jewelry workshop for women and
          girls. In this workshop you will make your own unique jewelry. From a
          young age, jewelry design has given me a place for creation, freedom
          and love of working with my hands and making new things. I want to
          share this experience with as many women and girls as I can, so they
          too can create on their own and know that there is no limit to
          creativity. I work with jewelry from a place of belief in our ability
          to cure ourselves through our hands. <br />
          <br /><br />
          In the workshop I will teach and support you in your process of making
          jewelry, and I also share how you can continue making new pieces at
          home. I will teach you which materials you need to buy and how to do
          so cost-effectively. I will give you the knowledge and tools needed to
          continue creating unique piece on your own. In the workshop we will
          create some earrings and a necklace or a bracelet (depends on time),
          and you will learn some techniques of working with several materials,
          including beads and metal. <br /><br /><br />This workshop does not
          require any former knowledge in making jewelry. All materials will be
          provided by me. You can also make a special surprise for someone and
          buy the jewelry workshop as a gift card`;
    } else if (lng === 'heb') {
      descriptionContainer.style.direction = 'rtl';
      descriptionContainer.style.textAlign = 'right';
      return `אני שמחה להזמין אותך לסדנת תכשיטים לנשים ולנערות. בסדנה הזו תכיני תכשיטים ייחודיים משלך. מגיל צעיר, עיצוב תכשיטים נתן לי מקום ליצירה, חופש ואהבה לעבודה עם הידיים וליצירת דברים חדשים. אני רוצה לחלוק את החוויה הזו עם כמה שיותר נשים ונערות, כדי שגם הן יוכלו ליצור בעצמן ולדעת שאין גבול ליצירתיות. אני עובדת עם תכשיטים מתוך אמונה ביכולת שלנו לרפא את עצמנו דרך הידיים.
<br /><br /><br />
בסדנה אלמד ואלווה אותך בתהליך יצירת התכשיטים, ואשתף איך תוכלי להמשיך ליצור פריטים חדשים גם בבית. אלמד אותך אילו חומרים כדאי לקנות ואיך לעשות זאת בצורה חסכונית. אתן לך את הידע והכלים הדרושים כדי שתוכלי להמשיך ליצור פריטים ייחודיים משלך. בסדנה נכין עגילים וכמו כן שרשרת או צמיד (תלוי בזמן), ותלמדי כמה טכניקות עבודה עם חומרים שונים, כולל חרוזים ומתכת.
<br /><br /><br />
הסדנה אינה דורשת ידע קודם ביצירת תכשיטים. כל החומרים יינתנו על ידי. את גם יכולה להכין הפתעה מיוחדת למישהו ולרכוש את סדנת התכשיטים ככרטיס מתנה.`;
    }
  }

  setWorkshopLng(lng) {
    const descriptionContainer = document.querySelector(
      '.workshop-description',
    );
    const containerParent = document.querySelector(
      '.workshop-description-container',
    );

    descriptionContainer.innerHTML = '';
    const markup = this.handleWorkshopLng(lng);
    descriptionContainer.insertAdjacentHTML('afterbegin', markup);

    // Set text alignment and direction
    if (lng === 'heb') {
      descriptionContainer.style.direction = 'rtl';
      descriptionContainer.style.textAlign = 'right';
      containerParent?.classList.add('rtl-layout');
    } else {
      descriptionContainer.style.direction = 'ltr';
      descriptionContainer.style.textAlign = 'left';
      containerParent?.classList.remove('rtl-layout');
    }

    this._categoriesTab = document.querySelector('.categories-tab');
    this._categoriesList = document.querySelector('.categories-list');

    this.setHeaderLng(lng);
    this.setCostsLng(lng);
  }

  setHeaderLng(lng) {
    const pageTitle = document.getElementById('page-title');
    if (lng === 'eng') {
      pageTitle.style.fontFamily = 'Raleway, sans-serif';
      pageTitle.textContent = 'MY JEWELRY WORKSHOP';
    }
    if (lng === 'heb') {
      pageTitle.style.fontFamily = 'Raleway, sans-serif';
      pageTitle.textContent = 'סדנאות התכשיטים שלי';
    }
  }

  handleCostsLng(lng) {
    const costsContainer = document.querySelector('.workshop-costs');
    // Use the same relative path pattern as all other images on the workshop page
    // All workshop images use ../imgs/... so this should work consistently
    const whatsappPath = '../imgs/svgs/whatsapp.svg';

    if (lng === 'eng') {
      return ` Workshop Costs: <br /><br />• One-on-one workshop - 450 NIS <br /><br />
        • 2 participants - 220 NIS per participant <br /><br />• 3 participants
        and more- 200 NIS per participant <br /><br />
        *Each workshop takes an hour and a half. For any questions please don't
        hesitate to contact me:
        <div class="contact-container">
          <div class="contact-block">
            <span>Whatsapp:</span>
            <a href="https://wa.me/972524484763" class="whatsapp-atr">
              <br /><br />
              &nbsp;&nbsp;<img
                src="${whatsappPath}"
                class="whatsapp-svg"
                alt=""
              />
            </a>
          </div>
          <div class="contact-block">
            <span> Tel.:</span>
            <p>+972-524484763</p>
          </div>
          <div class="contact-block contact-block-last">
            <span> Email:</span>
            <p>tamarkfir91@gmail.com</p>
          </div>
        </div>`;
    } else if (lng === 'heb') {
      costsContainer.style.direction = 'rtl';
      return ` מחירי הסדנאות: <br /><br />• סדנא אחת על אחת - 450 ש"ח <br /><br />
        • 2 משתתפות - 220 ש"ח לכל משתתפת <br /><br />• 3 משתתפות
        ומעלה- 200 ש"ח לכל משתתפת <br /><br />
        *כל סדנה נמשכת שעה וחצי. לכל שאלה, אל תהססי לפנות אלי:
        <div class="contact-container">
          <div class="contact-block">
            <span>וואטסאפ:</span>
            <a href="https://wa.me/972524484763" class="whatsapp-atr">
              <br /><br />
              &nbsp;&nbsp;<img
                src="${whatsappPath}"
                class="whatsapp-svg"
                alt=""
              />
            </a>
          </div>
          <div class="contact-block">
            <span> נייד:</span>
            <p>052-4484763</p>
          </div>
          <div class="contact-block contact-block-last">
            <span> דוא"ל:</span>
            <p>tamarkfir91@gmail.com</p>
          </div>
        </div>`;
    }
  }

  setCostsLng(lng) {
    const costsContainer = document.querySelector('.workshop-costs');
    if (!costsContainer) return;

    // Update text content only, don't replace HTML structure
    const titleEl = costsContainer.querySelector('.workshop-costs-title');
    const costItems = costsContainer.querySelectorAll('.workshop-cost-item');
    const noteEl = costsContainer.querySelector('.workshop-cost-note');
    const whatsappLabel = costsContainer.querySelector(
      '.contact-block .contact-label',
    );
    const telLabel = costsContainer.querySelectorAll(
      '.contact-block .contact-label',
    )[1];
    const emailLabel = costsContainer.querySelectorAll(
      '.contact-block .contact-label',
    )[2];
    const telValue = costsContainer.querySelectorAll('.contact-value')[0];
    const emailValue = costsContainer.querySelectorAll('.contact-value')[1];

    if (lng === 'eng') {
      costsContainer.style.direction = 'ltr';
      costsContainer.style.textAlign = 'left';
      if (titleEl) titleEl.textContent = 'Workshop Costs:';
      if (costItems[0])
        costItems[0].textContent = '• One-on-one workshop - 450 NIS';
      if (costItems[1])
        costItems[1].textContent = '• 2 participants - 220 NIS per participant';
      if (costItems[2])
        costItems[2].textContent =
          '• 3 participants and more- 200 NIS per participant';
      if (noteEl)
        noteEl.textContent =
          "*Each workshop takes an hour and a half. For any questions please don't hesitate to contact me:";
      if (whatsappLabel) whatsappLabel.textContent = 'Whatsapp:';
      if (telLabel) telLabel.textContent = ' Tel.:';
      if (emailLabel) emailLabel.textContent = ' Email:';
      if (telValue) telValue.textContent = '+972-524484763';
      if (emailValue) emailValue.textContent = 'tamarkfir91@gmail.com';
    } else if (lng === 'heb') {
      costsContainer.style.direction = 'rtl';
      costsContainer.style.textAlign = 'right';
      if (titleEl) titleEl.textContent = 'מחירי הסדנאות:';
      if (costItems[0])
        costItems[0].textContent = '• סדנא אחת על אחת - 450 ש"ח';
      if (costItems[1])
        costItems[1].textContent = '• 2 משתתפות - 220 ש"ח לכל משתתפת';
      if (costItems[2])
        costItems[2].textContent = '• 3 משתתפות ומעלה- 200 ש"ח לכל משתתפת';
      if (noteEl)
        noteEl.textContent =
          '*כל סדנה נמשכת שעה וחצי. לכל שאלה, אל תהססי לפנות אלי:';
      if (whatsappLabel) whatsappLabel.textContent = 'וואטסאפ:';
      if (telLabel) telLabel.textContent = ' נייד:';
      if (emailLabel) emailLabel.textContent = ' דוא"ל:';
      if (telValue) telValue.textContent = '052-4484763';
      if (emailValue) emailValue.textContent = 'tamarkfir91@gmail.com';
    }
  }

  // Override the placeholder from View.js
  setPageSpecificLanguage(lng, cartNum) {
    this.setWorkshopLng(lng);
    this.setCostsLng(lng); // Keep this here as it's workshop specific
  }

  // Workshop END
  ///////////////////////////////////////
}

export default new WorkshopView();
