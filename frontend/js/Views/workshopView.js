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
    const images = document.querySelectorAll('.slide-image-img');

    let curImg = 0;
    const maxImages = images.length;

    const goToImage = function (slide) {
      images.forEach(
        img => (img.style.transform = `translateX(${-100 * slide}%)`)
      );
      setTimeout(() => {
        nextImage();
      }, 4500);
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
    this.setFooterLng('heb');
    this.setWorkshopLng(`heb`);
    this.setCostsLng(`heb`);
  };

  changeToEng = function () {
    localStorage.setItem('language', `eng`);
    this.setFooterLng('eng');
    this.setWorkshopLng('eng');
    this.setCostsLng('eng');
  };

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

הסדנה אינה דורשת ידע קודם ביצירת תכשיטים. כל החומרים יינתנו על ידי. את גם יכולה להכין הפתעה מיוחדת למישהו ולרכוש את סדנת התכשיטים ככרטיס מתנה.`;
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

    this.setLanguage(lng);
    this.setHeaderLng(lng);
    this.setCostsLng(lng);
  }

  setHeaderLng(lng) {
    const pageTitle = document.getElementById('page-title');
    if (lng === 'eng') pageTitle.textContent = 'MY JEWELRY WORKSHOP';
    if (lng === 'heb') pageTitle.textContent = 'סדנאות התכשיטים שלי';
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
        *כל סדנה נמשכת שעה וחצי. לכל שאלה, אל תהססי לפנות אלי:
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

  // Workshop END
  ///////////////////////////////////////
}

export default new WorkshopView();
