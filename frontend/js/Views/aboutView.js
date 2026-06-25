import View from '../View.js';

class AboutView extends View {
  addAboutHandler(handler) {
    window.addEventListener('load', () => {
      let lng = localStorage.getItem('language');
      if (!lng) {
        localStorage.setItem('language', 'eng');
        lng = 'eng';
      }

      handler(lng);
    });
  }

  handleAboutMeLanguage(lng) {
    const descriptionContainer = document.querySelector('.aboutme-description');
    if (lng === 'eng') {
      descriptionContainer.style.direction = 'ltr';
      descriptionContainer.style.textAlign = 'left';

      return `
        <p class="aboutme-lead">A bit about me and my jewelry&hellip;</p>
        <p>
          Each piece is handmade in beautiful, historic Jerusalem and the
          mountains surrounding it; I draw inspiration from my city and from the
          many places I&rsquo;ve traveled. My favorite technique &mdash; and the one
          I&rsquo;m best known for &mdash; is crocheting with metallic threads. I combine
          colors to give each piece a new, unique look.
        </p>
        <p>
          My passion for art began at a very young age. By the time I was 12,
          I was already crafting my own jewelry and then slowly, slowly it grew
          to making jewelry for family and friends, and when I noticed that my
          mom&rsquo;s friends liked my jewelry, I started selling it to them.
        </p>
        <p>
          Since then, I&rsquo;ve been constantly learning new methods and techniques.
          Making jewelry serves as a calming and creative activity in my life.
          As a young girl it helped me deal with my ticks. It was the only thing
          that could help me stop thinking and stop my twitching. Through art
          and jewelry designing I can truly express myself and feel the most ME.
        </p>
        <p>
          This is also why I invite you to check out my jewelry workshops and
          explore your creativity! I have sold my jewelry to appreciative
          customers from all over the world. My goal is to make every customer
          feel special, and as beautiful as she really is!
        </p>`;
    } else if (lng === 'heb') {
      descriptionContainer.style.direction = 'rtl';
      descriptionContainer.style.textAlign = 'right';

      return `
        <p class="aboutme-lead">ברוכים הבאים!</p>
        <p>
          שמי תמר, אני אמנית ויוצרת ירושלמית. אני מקבלת המון השראה מירושלים
          ההיסטורית והיפה שבה אני גרה ומההרים שמקיפים עליה. אני שואבת השראה
          מהעיר שלי ומהמקומות הרבים שבהם טיילתי. הטכניקה האהובה עליי –
          והייחודית לי – היא סריגה עם חוטים דמויי מתכת, שבאמצעותם אני יוצרת
          שילובי צבעים ייחודיים שמעניקים לכל תכשיט מראה מיוחד ושונה.
        </p>
        <p>
          האהבה שלי לעיצוב ולאמנות החלה בגיל צעיר מאוד. כשהייתי בת 12, כבר
          יצרתי תכשיטים לעצמי, ובהדרגה התחלתי לעצב עבור משפחתי וחבריי.
          כשהתחלתי לקבל תגובות נלהבות מחברות של אמא שלי, הבנתי שיש ביקוש
          לתכשיטים שלי והתחלתי למכור אותם.
        </p>
        <p>
          במשך השנים המשכתי ללמוד ולהעמיק בשיטות חדשות, ועבורי, יצירת
          תכשיטים היא לא רק אומנות אלא גם דרך להירגע ולמצוא שלווה פנימית.
          כילדה, היא עזרה לי להתמודד עם הטיקים שלי, כשהעבודה עם הידיים גרמה
          לי להפסיק לחשוב יותר מדי והפחיתה את העוויתות. דרך התכשיטים אני
          מבטאת את עצמי בצורה הכי אותנטית שיש.
        </p>
        <p>
          אני מזמינה אותך לקחת חלק בסדנאות התכשיטים שלי ולגלות את היצירתיות
          שבך. מכרתי את התכשיטים שלי ללקוחות מכל רחבי העולם, והשאיפה שלי
          היא שכל אחת תרגיש מיוחדת, ותראה כמה היא יפה באמת!
        </p>`;
    }
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
    this.setAboutDesc(`heb`);
    this.setLanguage('heb');
  };

  changeToEng = function () {
    localStorage.setItem('language', `eng`);
    this.setAboutDesc('eng');
    this.setLanguage('eng');
  };

  setAboutDesc(lng) {
    const description = document.querySelector('.aboutme-description');
    description.innerHTML = '';
    const markup = this.handleAboutMeLanguage(lng);
    description.insertAdjacentHTML('afterbegin', markup);

    this._categoriesTab = document.querySelector('.categories-tab');
    this._categoriesList = document.querySelector('.categories-list');

    this.setHeaderLng(lng);
  }

  setHeaderLng(lng) {
    const pageTitle = document.getElementById('page-title');

    if (lng === 'eng') {
      pageTitle.style.fontFamily = 'var(--font-secondary)';
      pageTitle.style.textAlign = 'center';
      pageTitle.textContent = 'ABOUT ME';
    }
    if (lng === 'heb') {
      pageTitle.style.fontFamily = 'var(--font-secondary)';
      pageTitle.style.textAlign = 'center';
      pageTitle.textContent = 'אודותי';
    }
  }
}

export default new AboutView();
