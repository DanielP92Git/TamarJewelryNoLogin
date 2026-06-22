// Workshop offerings shown as cards on the Workshop page.
//
// Single source of truth consumed by the SSR template (views/pages/workshop.ejs).
// The frontend View twin (frontend/js/Views/workshopView.js) does NOT duplicate
// this copy — it reads the bilingual text straight off the `data-*` attributes
// the EJS renders, so EN/HE never drift out of sync.
//
// Each card's button opens ONE shared Google Form, prefilled with the workshop
// name so submissions record which workshop was clicked.

module.exports = {
  // Shared Google Form. Replace the placeholders below with the real values:
  //   baseUrl  — the form's /viewform URL
  //   entryId  — the prefill field id for the "Which workshop?" question
  //              (open the form → ⋮ → "Get pre-filled link", fill the field,
  //               and copy the `entry.XXXXXXXXX` token from the generated URL).
  // Until then the cards still work structurally and carry the prefill param.
  form: {
    baseUrl: 'https://docs.google.com/forms/d/e/REPLACE_FORM_ID/viewform',
    entryId: 'entry.REPLACE_FIELD_ID',
  },

  items: [
    {
      slug: 'necklaces',
      image: '/imgs/website-images/workshop/cards/necklaces.webp',
      name: {
        eng: 'Necklaces Workshop',
        heb: 'סדנת שרשראות',
      },
      title: {
        eng: 'Personally Designed Necklaces',
        heb: 'שרשראות בעיצוב אישי',
      },
      desc: {
        eng: "Come design the necklace you've always dreamed of! A fun, creative workshop where we make a unique necklace tailored to your style — in silver or gold, with endless gorgeous color combinations. We'll learn the spaced-link technique step by step, and everyone leaves with a stunning necklace made by her own hands. No prior experience needed!",
        heb: 'בואו לעצב את השרשרת שתמיד חלמתן עליה! סדנה יצירתית וכיפית שבה ניצור יחד שרשרת ייחודית שמותאמת בדיוק לסטייל שלכן בצבע כסף או זהב עם מלא אופציות של שילובי צבעים מהממים. נלמד טכניקת שרשרת רווחים שלב אחר שלב, וכל אחת תצא עם שרשרת מהממת מעשה ידיה. אין צורך בידע מוקדם!',
      },
    },
    {
      slug: 'earrings',
      image: '/imgs/website-images/workshop/cards/earrings.webp',
      name: {
        eng: 'Earrings Workshop',
        heb: 'סדנת עגילים',
      },
      title: {
        eng: 'Earrings in Your Style',
        heb: 'עגילים בסטייל שלך',
      },
      desc: {
        eng: "Love unique jewelry? Join a light, colorful and fun earring workshop! Together we'll create original earrings that upgrade your look and earn plenty of compliments. We'll learn all the secrets of working precisely with metal bending, pliers, wrapping and more to craft the perfect earring.",
        heb: 'אוהבות תכשיטים מיוחדים? הצטרפו לסדנת עגילים קלילה, צבעונית ומהנה! ניצור יחד עגילים מקוריים שישדרגו לכן את הלוק ויגרפו המון מחמאות. נלמד את כל הסודות לעבודה נכונה ומדויקת עם כיפופי מתכות, פלאיירים, ליפוף ועוד להכנת העגיל המושלם.',
      },
    },
    {
      slug: 'metal-bending',
      image: '/imgs/website-images/workshop/cards/metal-bending.webp',
      name: {
        eng: 'Metal Bending Workshop',
        heb: 'סדנת כיפוף מתכת',
      },
      title: {
        eng: 'The Magic of Metal Bending',
        heb: 'הקסם שבכיפוף מתכת',
      },
      desc: {
        eng: 'Come discover how easy and fun it is to sculpt with wire! A unique workshop where we turn a simple wire into a minimalist, two-dimensional work of art for the home. I will guide you step by step to create stunning figures and shapes of your choosing. No art background required — trust me!',
        heb: 'בואו לגלות כמה קל ומהנה לפסל בחוטי ברזל! סדנה ייחודית שבה נהפוך חוט פשוט ליצירת אמנות דו-מימדית ומינימליסטית לעיצוב הבית. אני אלווה אתכם צעד אחרי צעד ליצירת דמויות וצורות מרהיבות שאתם תבחרו. לא נדרש כל רקע באמנות. – תאמינו לי!',
      },
    },
    {
      slug: 'birthday-women',
      image: '/imgs/website-images/workshop/cards/birthday-women.webp',
      name: {
        eng: "Women's Birthday Workshop",
        heb: 'סדנת יום הולדת לנשים',
      },
      title: {
        eng: 'Celebrate in Style: Creating, Wine & Treats',
        heb: 'חוגגות בסטייל: יצירה, יין ונשנושים',
      },
      desc: {
        eng: "Looking for an original, stylish and fun way to celebrate with your closest friends? A festive, pampering birthday workshop combining quality crafting, good music, fine wine and a generous spread. We'll create in a relaxed, bonding atmosphere and everyone leaves with a stunning handmade piece and the perfect memento. (Additional 30 ₪ per participant for wine & refreshments.)",
        heb: 'מחפשת דרך מקורית, מעוצבת וכיפית לחגוג עם החברות הכי טובות? סדנת יום הולדת חגיגית ומפנקת שמשלבת יצירה איכותית, מוזיקה טובה, יין משובח וכיבוד עשיר. נשב יחד באווירה משחררת ומגבשת, נלמד טכניקות עיצוב ייחודיות וכל אחת תצא עם תכשיט או פריט מהמם מעשה ידיה ומזכרת מושלמת מהאירוע.',
      },
    },
    {
      slug: 'birthday-girls',
      image: '/imgs/website-images/workshop/cards/birthday-girls.webp',
      name: {
        eng: "Girls' Birthday Workshop",
        heb: 'סדנת יום הולדת לילדות',
      },
      title: {
        eng: 'A Magical, Unforgettable Creative Celebration!',
        heb: 'חגיגת יצירה קסומה ובלתי נשכחת!',
      },
      desc: {
        eng: 'Looking for a special, high-quality, stylish activity for the birthday? An experiential, colorful crafting workshop that girls simply adore! The girls enjoy quality time of empowering creation and patient step-by-step guidance, and in the end leave with huge pride and a gorgeous piece they made entirely themselves. A happy, bonding celebration — zero mess for parents and maximum smiles.',
        heb: 'מחפשים הפעלה מיוחדת, איכותית ומלאת סטייל ליום ההולדת? סדנת יצירה חווייתית וצבעונית שילדות פשוט מעריצות! הבנות ייהנו מזמן איכות של יצירה מעצימה, הדרכה סבלנית צעד אחר צעד, ובסוף יצאו בגאווה ענקית עם תכשיט או פריט מהמם שהן הכינו לגמרי בעצמן. חגיגה שמחה ומגבשת, אפס בלגן להורים ומקסימום חיוכים.',
      },
    },
    {
      slug: 'intimate',
      image: '/imgs/website-images/workshop/cards/intimate.webp',
      name: {
        eng: 'Intimate Workshop',
        heb: 'סדנאות אינטימיות',
      },
      title: {
        eng: 'Quality Time in an Intimate Workshop',
        heb: 'זמן איכות בסדנה אינטימית',
      },
      desc: {
        eng: "Want to disconnect from the routine for a moment that's all yours? Come to an intimate, quiet and creative workshop. Perfect for couple's quality time, mother-and-daughter, or good friends. You'll get close guidance and personal attention in a calm, pleasant atmosphere, entirely at your own pace.",
        heb: 'רוצים להתנתק קצת מהשגרה לזמן שהוא רק שלכם? בואו לסדנה אינטימית, שקטה ויצירתית. מושלם לזמן איכות זוגי, לאמא ובת או לחברות טובות. תקבלו הדרכה צמודה ויחס אישי באווירה רגועה ונעימה, לגמרי בקצב שלכם.',
      },
    },
  ],
};
