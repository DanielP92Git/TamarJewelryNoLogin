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

      return `A bit about me and my jewelry... <br />
          <br />
          Each piece is handmade in beautiful, historic Jerusalem and the
          mountains surrounding it; I draw inspiration from my city and from the
          many places I've traveled. My favorite technique - and the one I'm
          best known for - is crocheting with metallic threads. I combine colors
          to give each piece a new, unique look. <br /><br />My passion for art
          began at a very young age. By the time I was 12, I was already
          crafting my own jewelry and then slowly, slowly it grew to making
          jewelry for family and friends, and when I noticed that my mom's
          friends liked my jewelry, I started selling it to them. <br /><br />
          Since then, I've been constantly learning new methods and techniques.
          Making jewelry serves as a calming and creative activity in my life.
          As a young girl it helped me deal with my ticks. It was the only thing
          that could help me stop thinking and stop my twitching. Through art
          and jewelry designing I can truly express myself and feel the most ME.
          <br />This is also why I invite you to check out my jewelry workshops
          and explore your creativity! I have sold my jewelry to appreciative
          customers from all over the world. My goal is to make every customer
          feel special, and as beautiful as she really is!`;
    } else if (lng === 'heb') {
      descriptionContainer.style.direction = 'rtl';

      return `ברוכים הבאים! שמי תמר, אני אמנית ויוצרת ירושלמית. אני מקבלת המון השראה מירושלים ההיסטורית והיפה שבה אני גרה ומההרים שמקיפים עליה. אני שואבת השראה מהעיר שלי ומהמקומות הרבים שבהם טיילתי. הטכניקה האהובה עליי – והייחודית לי – היא סריגה עם חוטים דמויי מתכת, שבאמצעותם אני יוצרת שילובי צבעים ייחודיים שמעניקים לכל תכשיט מראה מיוחד ושונה.
האהבה שלי לעיצוב ולאמנות החלה בגיל צעיר מאוד. כשהייתי בת 12, כבר יצרתי תכשיטים לעצמי, ובהדרגה התחלתי לעצב עבור משפחתי וחבריי. כשהתחלתי לקבל תגובות נלהבות מחברות של אמא שלי, הבנתי שיש ביקוש לתכשיטים שלי והתחלתי למכור אותם.
במשך השנים המשכתי ללמוד ולהעמיק בשיטות חדשות, ועבורי, יצירת תכשיטים היא לא רק אומנות אלא גם דרך להירגע ולמצוא שלווה פנימית. כילדה, היא עזרה לי להתמודד עם הטיקים שלי, כשהעבודה עם הידיים גרמה לי להפסיק לחשוב יותר מדי והפחיתה את העוויתות. דרך התכשיטים אני מבטאת את עצמי בצורה הכי אותנטית שיש.
אני מזמינה אותך לקחת חלק בסדנאות התכשיטים שלי ולגלות את היצירתיות שבך. מכרתי את התכשיטים שלי ללקוחות מכל רחבי העולם, והשאיפה שלי היא שכל אחת תרגיש מיוחדת, ותראה כמה היא יפה באמת!`;
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
    this.setFooterLng('heb');
  };

  changeToEng = function () {
    localStorage.setItem('language', `eng`);
    this.setAboutDesc('eng');
    this.setLanguage('eng');
    this.setFooterLng('eng');
  };

  setAboutDesc(lng) {
    const description = document.querySelector('.aboutme-description');
    description.innerHTML = '';
    const markup = this.handleAboutMeLanguage(lng);
    description.insertAdjacentHTML('afterbegin', markup);
    this._categoriesList = document.querySelector('.categories-list');

    this.addMobileHandler()
    this.setHeaderLng(lng);
  }

  setHeaderLng(lng) {
    const pageTitle = document.getElementById('page-title');
  
    if (lng === 'eng') pageTitle.textContent = 'ABOUT ME';
    if (lng === 'heb') pageTitle.textContent = 'אודותי';
  }
}

export default new AboutView();
