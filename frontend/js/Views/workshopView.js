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

    // Get existing buttons (in .slider-nav below the image container)
    const sliderNav = document.querySelector('.slider-nav');
    const btnLeft = sliderNav?.querySelector('.slider-btn--left');
    const btnRight = sliderNav?.querySelector('.slider-btn--right');

    if (!btnLeft || !btnRight) {
      console.error('Slider buttons not found in the HTML');
      return;
    }

    // Buttons are now styled purely via CSS
    let curImg = 0;
    const maxImages = slideContainers.length;

    const goToImage = function (slide) {
      slideContainers.forEach((container, index) => {
        const offset = (index - slide) * 100;
        container.style.transform = `translateX(${offset}%)`;
      });
    };

    const nextSlide = function () {
      curImg = (curImg + 1) % maxImages;
      goToImage(curImg);
    };

    const prevSlide = function () {
      curImg = (curImg - 1 + maxImages) % maxImages;
      goToImage(curImg);
    };

    // Initial setup - ensure first image is visible and others are positioned correctly
    goToImage(0);

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

  changeToHeb = async () => {
    try {
      localStorage.setItem('language', 'heb');
      document.documentElement.lang = 'he';
      document.documentElement.dir = 'rtl';

      await this.setLanguage('heb', 0);

      this.setWorkshopLng('heb');
      this.setCostsLng('heb');

      this._updateUrlLang('he');
    } catch (error) {
      console.error('[WorkshopView] Error in changeToHeb:', error);
    }
  };

  changeToEng = async () => {
    try {
      localStorage.setItem('language', 'eng');
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';

      await this.setLanguage('eng', 0);

      this.setWorkshopLng('eng');
      this.setCostsLng('eng');

      this._updateUrlLang('en');
    } catch (error) {
      console.error('[WorkshopView] Error in changeToEng:', error);
    }
  };

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
      // containerParent?.classList.add('rtl-layout');
    } else {
      descriptionContainer.style.direction = 'ltr';
      descriptionContainer.style.textAlign = 'left';
      containerParent?.classList.remove('rtl-layout');
    }

    this._categoriesTab = document.querySelector('.categories-tab');
    this._categoriesList = document.querySelector('.categories-list');

    this.setHeaderLng(lng);
    this.setWorkshopCardsLng(lng);
    this.setCostsLng(lng);
  }

  /**
   * Localize the workshop cards. Copy is NOT duplicated here — the EJS renders
   * both languages into data-* attributes; we just swap the visible text,
   * direction, and the form button's prefilled workshop name on toggle.
   */
  setWorkshopCardsLng(lng) {
    const grid = document.querySelector('.workshop-cards');
    if (!grid) return;

    const isHeb = lng === 'heb';
    const formUrl = grid.dataset.formUrl || '';
    const formEntry = grid.dataset.formEntry || '';

    grid.querySelectorAll('.workshop-card').forEach((card) => {
      const title = isHeb ? card.dataset.titleHe : card.dataset.titleEn;
      const desc = isHeb ? card.dataset.descHe : card.dataset.descEn;
      const name = isHeb ? card.dataset.nameHe : card.dataset.nameEn;

      const titleEl = card.querySelector('.workshop-card-title');
      const descEl = card.querySelector('.workshop-card-desc');
      const btnEl = card.querySelector('.workshop-card-btn');

      if (titleEl && title != null) titleEl.textContent = title;
      if (descEl && desc != null) descEl.textContent = desc;
      if (btnEl) {
        btnEl.textContent = isHeb ? 'לפרטים נוספים' : 'More Details';
        if (formUrl && formEntry && name != null) {
          btnEl.href = `${formUrl}?usp=pp_url&${formEntry}=${encodeURIComponent(
            name,
          )}`;
        }
      }

      card.style.direction = isHeb ? 'rtl' : 'ltr';
      card.style.textAlign = isHeb ? 'right' : 'left';
    });
  }

  setHeaderLng(lng) {
    const pageTitle = document.getElementById('page-title');
    if (lng === 'eng') {
      pageTitle.style.fontFamily = 'var(--font-secondary)';
      pageTitle.textContent = 'MY JEWELRY WORKSHOP';
    }
    if (lng === 'heb') {
      pageTitle.style.fontFamily = 'var(--font-secondary)';
      pageTitle.textContent = 'סדנאות התכשיטים שלי';
    }
  }

  setCostsLng(lng) {
    const costsContainer = document.querySelector('.workshop-costs');
    if (!costsContainer) return;

    const noteEl = costsContainer.querySelector('.workshop-cost-note');
    const contactLabels = costsContainer.querySelectorAll('.contact-label');
    const contactValues = costsContainer.querySelectorAll('.contact-value');

    if (lng === 'eng') {
      if (noteEl) noteEl.textContent = "*Each workshop takes an hour and a half. For any questions please don't hesitate to contact me.";
      if (contactLabels[0]) contactLabels[0].textContent = 'Whatsapp:';
      if (contactLabels[1]) contactLabels[1].textContent = 'Tel.:';
      if (contactLabels[2]) contactLabels[2].textContent = 'Email:';
      if (contactValues[0]) contactValues[0].textContent = '+972-524484763';
      if (contactValues[1]) contactValues[1].textContent = '+972-524484763';
      if (contactValues[2]) contactValues[2].textContent = 'tamarkfir91@gmail.com';
    } else if (lng === 'heb') {
      if (noteEl) noteEl.textContent = '*כל סדנה נמשכת שעה וחצי. לכל שאלה, אל תהססי לפנות אלי.';
      if (contactLabels[0]) contactLabels[0].textContent = 'וואטסאפ:';
      if (contactLabels[1]) contactLabels[1].textContent = 'נייד:';
      if (contactLabels[2]) contactLabels[2].textContent = 'דוא"ל:';
      if (contactValues[0]) contactValues[0].textContent = '052-4484763';
      if (contactValues[1]) contactValues[1].textContent = '052-4484763';
      if (contactValues[2]) contactValues[2].textContent = 'tamarkfir91@gmail.com';
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
