import View from '../View.js';
import whatsappIcon from '../../imgs/svgs/whatsapp.svg';

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

    const images = sliderContainer.querySelectorAll('.slide-image-img');
    if (!images || images.length === 0) return;

    // Get existing buttons
    const btnLeft = sliderContainer.querySelector('.slider-btn--left');
    const btnRight = sliderContainer.querySelector('.slider-btn--right');

    if (!btnLeft || !btnRight) {
      console.error('Slider buttons not found in the HTML');
      return;
    }

    // Make sure buttons are visible
    btnLeft.style.display = 'flex';
    btnRight.style.display = 'flex';

    let curImg = 0;
    const maxImages = images.length;
    let autoSlideTimeout;
    const autoSlideDelay = 4500;

    // Function to reset button styles (if they're somehow lost)
    const resetButtonStyles = () => {
      const commonStyles = {
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: '100',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        width: window.innerWidth >= 800 ? '50px' : '40px',
        height: window.innerWidth >= 800 ? '50px' : '40px',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: window.innerWidth >= 800 ? '3rem' : '2.5rem',
        fontWeight: 'bold',
        lineHeight: '0',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
        textAlign: 'center',
        padding: '0',
        margin: '0',
        verticalAlign: 'middle',
      };

      Object.assign(btnLeft.style, commonStyles, {
        left: window.innerWidth >= 800 ? '25px' : '10px',
        paddingBottom: window.innerWidth >= 800 ? '5px' : '4px',
      });

      Object.assign(btnRight.style, commonStyles, {
        right: window.innerWidth >= 800 ? '25px' : '10px',
        paddingBottom: window.innerWidth >= 800 ? '5px' : '4px',
      });
    };

    // Apply styles immediately
    resetButtonStyles();

    // Reapply styles after a short delay (in case they're overridden)
    setTimeout(resetButtonStyles, 100);

    const goToImage = function (slide) {
      images.forEach(img => {
        img.style.transform = `translateX(${-100 * slide}%)`;
      });
    };

    const restartAutoSlide = function () {
      clearTimeout(autoSlideTimeout);
      autoSlideTimeout = setTimeout(nextImage, autoSlideDelay);
    };

    const nextImage = function () {
      curImg = (curImg + 1) % maxImages;
      goToImage(curImg);
      restartAutoSlide();
    };

    const nextSlideManual = function () {
      curImg = (curImg + 1) % maxImages;
      goToImage(curImg);
      restartAutoSlide();
    };

    const prevSlide = function () {
      curImg = (curImg - 1 + maxImages) % maxImages;
      goToImage(curImg);
      restartAutoSlide();
    };

    // Initial setup
    goToImage(0);
    restartAutoSlide();

    // Ensure we clean up previous event listeners to avoid duplicates
    const newBtnLeft = btnLeft.cloneNode(true);
    const newBtnRight = btnRight.cloneNode(true);

    btnLeft.parentNode.replaceChild(newBtnLeft, btnLeft);
    btnRight.parentNode.replaceChild(newBtnRight, btnRight);

    // Add Event Listeners to the new buttons
    newBtnLeft.addEventListener('click', prevSlide);
    newBtnRight.addEventListener('click', nextSlideManual);
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
    console.log('[WorkshopView] changeToHeb called');
    try {
      // First store the language preference
      localStorage.setItem('language', 'heb');

      // Update all the workshop-specific content
      this.setFooterLng('heb');
      this.setWorkshopLng('heb');
      this.setCostsLng('heb');

      // Call the base View's setLanguage method to update the menu
      await this.setLanguage('heb', 0);

      console.log('[WorkshopView] Hebrew language change completed');
    } catch (error) {
      console.error('[WorkshopView] Error in changeToHeb:', error);
    }
  }

  async changeToEng() {
    console.log('[WorkshopView] changeToEng called');
    try {
      // First store the language preference
      localStorage.setItem('language', 'eng');

      // Update all the workshop-specific content
      this.setFooterLng('eng');
      this.setWorkshopLng('eng');
      this.setCostsLng('eng');

      // Call the base View's setLanguage method to update the menu
      await this.setLanguage('eng', 0);

      console.log('[WorkshopView] English language change completed');
    } catch (error) {
      console.error('[WorkshopView] Error in changeToEng:', error);
    }
  }

  handleWorkshopLng(lng) {
    const descriptionContainer = document.querySelector(
      '.workshop-description'
    );
    if (lng === 'eng') {
      descriptionContainer.style.direction = 'ltr';
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
      return `אני שמחה להזמין אותך לסדנת תכשיטים לנשים ולנערות. בסדנה הזו תכיני תכשיטים ייחודיים משלך. מגיל צעיר, עיצוב תכשיטים נתן לי מקום ליצירה, חופש ואהבה לעבודה עם הידיים וליצירת דברים חדשים. אני רוצה לחלוק את החוויה הזו עם כמה שיותר נשים ונערות, כדי שגם הן יוכלו ליצור בעצמן ולדעת שאין גבול ליצירתיות. אני עובדת עם תכשיטים מתוך אמונה ביכולת שלנו לרפא את עצמנו דרך הידיים.

בסדנה אלמד ואלווה אותך בתהליך יצירת התכשיטים, ואשתף איך תוכלי להמשיך ליצור פריטים חדשים גם בבית. אלמד אותך אילו חומרים כדאי לקנות ואיך לעשות זאת בצורה חסכונית. אתן לך את הידע והכלים הדרושים כדי שתוכלי להמשיך ליצור פריטים ייחודיים משלך. בסדנה נכין עגילים וכמו כן שרשרת או צמיד (תלוי בזמן), ותלמדי כמה טכניקות עבודה עם חומרים שונים, כולל חרוזים ומתכת.

הסדנה אינה דורשת ידע קודם ביצירת תכשיטים. כל החומרים יינתנו על ידי. את גם יכולה להכין הפתעה מיוחדת למישהו ולרכוש את סדנת התכשיטים ככרטיס מתנה.`;
    }
  }

  setWorkshopLng(lng) {
    const descriptionContainer = document.querySelector(
      '.workshop-description'
    );
    descriptionContainer.innerHTML = '';
    const markup = this.handleWorkshopLng(lng);
    descriptionContainer.insertAdjacentHTML('afterbegin', markup);

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
      pageTitle.style.fontFamily = `'Amatic SC', sans-serif`;
      pageTitle.textContent = 'סדנאות התכשיטים שלי';
    }
  }

  handleCostsLng(lng) {
    const costsContainer = document.querySelector('.workshop-costs');

    if (lng === 'eng') {
      return ` Workshop Costs: <br /><br />• One-on-one workshop - 250 NIS <br /><br />
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
                src=${whatsappIcon}
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
      return ` מחירי הסדנאות: <br /><br />• סדנא אחת על אחת - 250 ש"ח <br /><br />
        • 2 משתתפות - 220 ש"ח לכל משתתפת <br /><br />• 3 משתתפות
        ומעלה- 200 ש"ח לכל משתתפת <br /><br />
        *כל סדנה נמשכת שעה וחצי. לכל שאלה, אל תהססי לפנות אלי:
        <div class="contact-container">
          <div class="contact-block">
            <span>וואטסאפ:</span>
            <a href="https://wa.me/972524484763" class="whatsapp-atr">
              <br /><br />
              &nbsp;&nbsp;<img
                src=${whatsappIcon}
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
    costsContainer.innerHTML = '';
    const markup = this.handleCostsLng(lng);
    costsContainer.insertAdjacentHTML('afterbegin', markup);
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
