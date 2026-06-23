Workshop card images
=====================

Drop one square (1:1) .webp photo per workshop here. The Workshop page cards
reference these exact filenames (see backend/config/workshops.js → items[].image):

  necklaces.webp        - Necklaces workshop (שרשראות בעיצוב אישי)
  earrings.webp         - Earrings workshop (עגילים בסטייל שלך)
  metal-bending.webp    - Metal bending workshop (הקסם שבכיפוף מתכת)
  birthday-women.webp   - Women's birthday workshop (חוגגות בסטייל)
  birthday-girls.webp   - Girls' birthday workshop (חגיגת יצירה)
  intimate.webp         - Intimate workshop (זמן איכות בסדנה אינטימית)

Recommended: square crop, ~800x800px, WebP. Until a file is present the card
shows a neutral placeholder (a gold hairline) — the grid stays intact.

To change a filename, edit the matching `image` path in backend/config/workshops.js.
