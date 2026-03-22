import View from '../View.js';

class PoliciesView extends View {
  changeToHeb = function () {
    localStorage.setItem('language', 'heb');
    document.documentElement.lang = 'he';
    document.documentElement.dir = 'rtl';
    this.setPoliciesContent('heb');
    this.setLanguage('heb', 0);
    this.setFooterLng('heb');
    this._updateUrlLang('he');
  };

  changeToEng = function () {
    localStorage.setItem('language', 'eng');
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
    this.setPoliciesContent('eng');
    this.setLanguage('eng', 0);
    this.setFooterLng('eng');
    this._updateUrlLang('en');
  };

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

  setPoliciesContent(lng) {
    const main = document.querySelector('main');
    if (!main) return;
    main.innerHTML = this.getPoliciesMarkup(lng);

    this._categoriesTab = document.querySelector('.categories-tab');
    this._categoriesList = document.querySelector('.categories-list');
  }

  getPoliciesMarkup(lng) {
    if (lng === 'heb') {
      return `
    <h1>מדיניות עיבוד, משלוחים והחזרות</h1>
    <div class="first-row-container">
      <div class="columns-wrap">
        <div class="column-box">
          <h3>עיבוד הזמנות</h3>
          כל הזמנה תהיה מוכנה למשלוח תוך 1-3 ימי עסקים.
        </div>
        <div class="column-box">
          <h3>הזמנה מזורזת</h3>
          אם אתם זקוקים להזמנה להגיע במהירות, אנא בחרו באפשרות המשלוח המהיר.
            אם אתם צריכים לקבל את ההזמנה עד תאריך מסוים, אנא הודיעו לי בכתובת
            tamarkfir91@gmail.com ואעשה כמיטב יכולתי לענות על הצרכים שלכם.
        </div>
        <div class="column-box">
          <h3>אריזת מתנה</h3>
          כל הפריטים מוצגים באופן יפהפה בקופסה ממותגת מקסימה, ומגיעים עטופים כמתנה
            ומוכנים למסירה. אם תרצו להוסיף פתק, או יש לכם בקשה אחרת לגבי ההזמנה שלכם,
            אשמח לענות על הצרכים שלכם. פשוט הודיעו לי בהודעה לכתובת
            tamarkfir91@gmail.com
        </div>
      </div>
    </div>
    <div class="shipping-policy">
      <h2>משלוחים</h2>
      כל ההזמנות נשלחות באמצעות דואר ישראל. אם תרצו
        לזרז את ההזמנה שלכם, אנא בחרו באפשרות המשלוח המהיר בתהליך התשלום.
        <br /><br />
        <span class="underline-bold">משלוח סטנדרטי:</span>
        <br /><br />
        דואר ישראל / כשבוע.
        <br /><br />
        <span class="underline-bold">משלוח מהיר:</span>
        <br /><br />
        שירות שליח עד הבית / 24 שעות לרוב המיקומים.
    </div>
    <div class="return-policy">
      <h2>החזרות</h2>
      אני רוצה שתהנו מהתכשיטים שלכם! אם מכל סיבה שהיא תרצו להחזיר אותם,
        אני מציעה מדיניות החזרה פשוטה. פשוט שלחו אותם חזרה אלי, במצבם ובאריזתם
        המקוריים לכתובת הבאה תוך 14 יום מקבלתם, ואני אחזיר לכם את הכסף
        בשיטת התשלום המקורית שלכם לאחר קבלת החבילה. <br /><br />שליחת דוא"ל
        אלי בכתובת Tamarkfir91@gmail.com לגבי ההחזרה תתקבל בברכה, ועשויה
        לזרז את ההחזר הכספי שלכם. <br /><br />אנא שימו לב שעלויות המשלוח
        אינן ניתנות להחזר, ושעליכם לשלם עבור משלוח ההחזרה. אני ממליצה
        לשלוח את החבילה בדואר רשום כך שאוכל לעקוב אחר התקדמותה.
        <br /><br /><span class="underline-bold">כתובת להחזרה:</span>
        <br /><br />תמר כפיר<br />רחוב הצפירה 9, דירה 11<br />ירושלים 9310214<br />ישראל
        <br /><br />טלפון: 052-4484763 (אנא וודאו שאתם מוסיפים את מספר הטלפון
        שלנו על החבילה, כדי להבטיח שהיא תגיע אלינו.)
    </div>`;
    }

    // English (default)
    return `
    <h1>Processing, Shipping & Return Policies</h1>
    <div class="first-row-container">
      <div class="columns-wrap">
        <div class="column-box">
          <h3>Processing</h3>
          Every order will be ready to ship within 1-3 business days.
        </div>
        <div class="column-box">
          <h3>Rush Order</h3>
           If you need to receive it by a
            specific date, please let me know at tamarkfir91@gmail.com, and I
            will do my best to accommodate your needs.
        </div>
        <div class="column-box">
          <h3>Gift Wraps</h3>
          All items are beautifully presented in a lovely branded box, and are
            gifted wrapped and ready to give. If you would like to add a note,
            or have any other request regarding your order, I would be happy to
            accommodate your needs. Just let me know by sending me a note to
            tamarkfir91@gmail.com
        </div>
      </div>
    </div>
    <div class="shipping-policy">
      <h2>Shipping</h2>
      All orders are shipped via Israel Post.
        <span class="underline-bold">Standard Shipping:</span>
        <br /><br />
        Israel Post / about 1 week.
    </div>
    <div class="return-policy">
      <h2>Returns</h2>
      I want you to enjoy your jewelry! If, for any reason, you would like to
        return it, I offer a simple return policy. Just mail it back to me, in
        its original condition and package to the following address within 14
        days of receiving it, and I will refund you via your original payment
        method after receiving the package. <br /><br />Emailing me at
        Tamarkfir91@gmail.com about the return would be much appreciated, and
        may speed up your refund. <br /><br />Please note that shipping charges
        are non-refundable, and that you should pay for the return shipping. I
        recommend sending the package via registered mail so I can track its
        progress. <br /><br /><span class="underline-bold"
          >Return address:</span>
        <br /><br />Tamar Kfir<br />9 HaTsfira St., Apt 11<br />Jerusalem 9310214<br />Israel
        <br /><br />Phone: +972-52-4484763 (please make sure you add our phone
        number on your package, to ensure that it reaches us.)
    </div>`;
  }
}

export default new PoliciesView();
