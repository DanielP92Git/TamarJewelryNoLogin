import View from '../View.js';
class HomePageView extends View {
  // Modal window:
  // _modal = document.querySelector(".modal");
  // _overlay = document.querySelector(".overlay");
  // _modalReveal = document.querySelector(".modal-reveal");
  // _btnCloseThanks = document.querySelector('.close-thanks');

  addHomePageHandler = function (handler) {
    window.addEventListener('load', async () => {
      let lng = localStorage.getItem('language');
      if (!lng) {
        localStorage.setItem('language', 'eng');
        lng = 'eng';
      }

      handler(lng);

      // Initialize announcement bar
      this.initAnnouncementBar();

      // Initialize featured products
      await this.initFeaturedProducts(lng);

      // Initialize newsletter
      this.initNewsletter();

      // Initialize promo banner (conditional)
      await this.initPromoBanner(lng);

      // Initialize video section
      this.initVideoSection();

      // Initialize the base View's menu handlers
      // this.setupGlobalMenuHandler();

      // Add mobile/desktop handlers for categories tab
      const categoriesTab = document.querySelector('.categories-tab');
      if (categoriesTab) {
        this.addMobileHandler(categoriesTab);
        this.addRevealHandler(categoriesTab);
      }

      // Ensure the cart icon is visible on the home page
      setTimeout(() => {
        this.ensureCartIconVisibility();
      }, 300);
    });
  };

  /**
   * * --Announcement Bar--
   */

  initAnnouncementBar() {
    const announcementBar = document.getElementById('announcementBar');
    const closeBtn = document.querySelector('.announcement-bar__close');

    if (!announcementBar) return;

    // Check if announcement was previously dismissed
    const isDismissed = localStorage.getItem('announcementDismissed');
    if (isDismissed) {
      announcementBar.classList.add('hidden');
    }

    // Add close button handler
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        announcementBar.classList.add('hidden');
        localStorage.setItem('announcementDismissed', 'true');
      });
    }
  }

  /**
   * * --Change Language--
   */

  handleHomeLanguage() {
    const hebLng = document.querySelector('.heb-lng');
    const engLng = document.querySelector('.eng-lng');

    if (hebLng && engLng) {
      hebLng.addEventListener('click', () => this.changeToHeb());
      engLng.addEventListener('click', () => this.changeToEng());
    }
  }

  changeToHeb() {
    localStorage.setItem('language', 'heb');
    // Call base class method first
    super.changeToHeb();
    // Then do homepage-specific updates
    this.setHomeLanguage('heb');
    this.setFooterLng('heb');
    // Ensure cart icon is visible after language change
    setTimeout(() => {
      this.ensureCartIconVisibility();
    }, 100);
  }

  changeToEng() {
    localStorage.setItem('language', 'eng');
    // Call base class method first
    super.changeToEng();
    // Then do homepage-specific updates
    this.setHomeLanguage('eng');
    this.setFooterLng('eng');
    // Ensure cart icon is visible after language change
    setTimeout(() => {
      this.ensureCartIconVisibility();
    }, 100);
  }

  // Override the ensureCartIconVisibility method to handle home page specific cart icon
  ensureCartIconVisibility() {
    // Additional home-page specific fixes
    if (window.matchMedia('(min-width: 800px)').matches) {
      // Select cart elements
      const cartLink = document.querySelector('.header-cart');
      const cartIcon = cartLink?.querySelector('.shoppingcart-svg');
      const cartContainer = cartLink?.querySelector('.cart-container');
      const cartNumber = cartLink?.querySelector('.cart-number-mobile');

      // Force visibility on SVG with !important inline styles
      if (cartIcon) {
        cartIcon.setAttribute(
          'style',
          `
          display: inline-block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 25px !important;
          height: 25px !important;
          fill: #000000 !important;
        `
        );
      }

      // Force visibility on cart link
      if (cartLink) {
        cartLink.setAttribute(
          'style',
          `
          display: inline-flex !important;
          visibility: visible !important;
        `
        );
      }

      // Force visibility on cart container
      if (cartContainer) {
        cartContainer.setAttribute(
          'style',
          `
          display: flex !important;
          visibility: visible !important;
        `
        );
      }

      // Force visibility on cart number
      if (cartNumber) {
        cartNumber.setAttribute(
          'style',
          `
          display: inline-flex !important;
          visibility: visible !important;
        `
        );
      }
    }
  }

  setHomeLanguage(lng) {
    // Page-specific language setup
    this.setCategoriesLng(lng);
    this.handleFooterMarkup(lng);
    this.setAnnouncementBarLng(lng);
    this.setValuePropsLng(lng);
    this.setVideoSectionLng(lng);
    this.setSocialProofLng(lng);
    this.setFeaturedProductsLng(lng);
    this.setPromoBannerLng(lng);
    this.setNewsletterLng(lng);
    this.setTrustFooterLng(lng);
    this.setSocialLinkLng(lng);
  }

  setAnnouncementBarLng(lng) {
    const announcementText = document.querySelector('.announcement-bar__text');
    if (!announcementText) return;

    if (lng === 'eng') {
      announcementText.textContent = 'Free Shipping on Orders Over $75';
    } else {
      announcementText.textContent = 'משלוח חינם בהזמנות מעל 250 ש״ח';
    }
  }

  setValuePropsLng(lng) {
    const titles = document.querySelectorAll('.value-prop__title');
    const subtitles = document.querySelectorAll('.value-prop__subtitle');

    titles.forEach(title => {
      const text = lng === 'eng' ? title.dataset.eng : title.dataset.heb;
      if (text) title.textContent = text;
    });

    subtitles.forEach(subtitle => {
      const text = lng === 'eng' ? subtitle.dataset.eng : subtitle.dataset.heb;
      if (text) subtitle.textContent = text;
    });
  }

  setSocialProofLng(lng) {
    const labels = document.querySelectorAll('.social-proof__label');

    labels.forEach(label => {
      const text = lng === 'eng' ? label.dataset.eng : label.dataset.heb;
      if (text) label.textContent = text;
    });
  }

  /**
   * * --Featured Products--
   */

  async initFeaturedProducts(lng) {
    try {
      const apiUrl = process.env.API_URL || '';
      const response = await fetch(`${apiUrl}/api/products/featured?limit=8`);

      if (!response.ok) {
        console.error('Failed to fetch featured products');
        return;
      }

      const products = await response.json();
      this.renderFeaturedProducts(products, lng);
    } catch (error) {
      console.error('Error loading featured products:', error);
    }
  }

  renderFeaturedProducts(products, lng) {
    const grid = document.getElementById('featuredProductsGrid');
    if (!grid) return;

    // Clear existing content
    grid.innerHTML = '';

    // Get currency from localStorage
    const currency = localStorage.getItem('currency') || 'USD';

    products.forEach(product => {
      const productCard = this.createFeaturedProductCard(product, lng, currency);
      grid.appendChild(productCard);
    });
  }

  createFeaturedProductCard(product, lng, currency) {
    const card = document.createElement('a');
    card.className = 'featured-product';
    card.href = `/html/product-details.html?id=${product.id}`;

    // Determine image URL (prefer mainImage.publicDesktop, fallback to image)
    const imageUrl = product.mainImage?.publicDesktop || product.publicImage || product.image || '/imgs/no-image.svg';

    // Determine price based on currency
    const price = currency === 'ILS'
      ? `₪${product.ils_price?.toFixed(2) || '0.00'}`
      : `$${product.usd_price?.toFixed(2) || '0.00'}`;

    // Category name translations
    const categoryNames = {
      'eng': {
        'necklaces': 'Necklaces',
        'crochet-necklaces': 'Crochet Necklaces',
        'hoop-earrings': 'Hoop Earrings',
        'dangle-earrings': 'Dangle Earrings',
        'bracelets': 'Bracelets',
        'unisex': 'Unisex Jewelry'
      },
      'heb': {
        'necklaces': 'שרשראות',
        'crochet-necklaces': 'שרשראות סרוגות',
        'hoop-earrings': 'עגילי חישוק',
        'dangle-earrings': 'עגילים תלויים',
        'bracelets': 'צמידים',
        'unisex': 'תכשיטי יוניסקס'
      }
    };

    const categoryName = categoryNames[lng]?.[product.category] || product.category;

    card.innerHTML = `
      <div class="featured-product__image-container">
        <img
          src="${imageUrl}"
          alt="${product.name}"
          class="featured-product__image"
          loading="lazy"
        />
        ${product.bestseller ? `<span class="featured-product__badge" data-eng="Bestseller" data-heb="הכי נמכר">${lng === 'eng' ? 'Bestseller' : 'הכי נמכר'}</span>` : ''}
        <div class="featured-product__overlay">
          <span class="featured-product__quick-view" data-eng="Quick View" data-heb="צפייה מהירה">${lng === 'eng' ? 'Quick View' : 'צפייה מהירה'}</span>
        </div>
      </div>
      <div class="featured-product__info">
        <span class="featured-product__category">${categoryName}</span>
        <h3 class="featured-product__name">${product.name}</h3>
        <span class="featured-product__price">${price}</span>
      </div>
    `;

    return card;
  }

  setFeaturedProductsLng(lng) {
    // Update section header
    const title = document.querySelector('.featured-products__title');
    const subtitle = document.querySelector('.featured-products__subtitle');
    const button = document.querySelector('.featured-products__button-text');

    if (title) {
      title.textContent = lng === 'eng' ? title.dataset.eng : title.dataset.heb;
    }
    if (subtitle) {
      subtitle.textContent = lng === 'eng' ? subtitle.dataset.eng : subtitle.dataset.heb;
    }
    if (button) {
      button.textContent = lng === 'eng' ? 'Shop All Jewelry' : 'לכל התכשיטים';
    }

    // Re-render products with new language
    const currency = localStorage.getItem('currency') || 'USD';
    this.initFeaturedProducts(lng);
  }

  /**
   * * --Newsletter--
   */

  initNewsletter() {
    const form = document.getElementById('newsletterForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleNewsletterSubmit();
    });

    // Set initial placeholder based on language
    const lng = localStorage.getItem('language') || 'eng';
    this.setNewsletterLng(lng);
  }

  async handleNewsletterSubmit() {
    const emailInput = document.getElementById('newsletterEmail');
    const errorElement = document.getElementById('newsletterError');
    const form = document.getElementById('newsletterForm');
    const successElement = document.getElementById('newsletterSuccess');
    const codeElement = document.getElementById('newsletterCode');

    const email = emailInput.value.trim();
    const lng = localStorage.getItem('language') || 'eng';

    // Clear previous error
    errorElement.textContent = '';

    // Basic email validation
    if (!email || !email.includes('@')) {
      errorElement.textContent = lng === 'eng'
        ? 'Please enter a valid email address'
        : 'אנא הזינו כתובת מייל תקינה';
      return;
    }

    try {
      const apiUrl = process.env.API_URL || '';
      const response = await fetch(`${apiUrl}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, language: lng }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Show success state
        form.classList.add('hide');
        successElement.classList.add('show');
        codeElement.textContent = data.discountCode;

        // Optional: Send welcome email via EmailJS (if configured)
        // This would require EmailJS setup and template
      } else {
        errorElement.textContent = data.error || (lng === 'eng'
          ? 'Something went wrong. Please try again.'
          : 'משהו השתבש. אנא נסו שוב.');
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      errorElement.textContent = lng === 'eng'
        ? 'Network error. Please check your connection and try again.'
        : 'שגיאת רשת. אנא בדקו את החיבור ונסו שוב.';
    }
  }

  setNewsletterLng(lng) {
    // Update all text elements
    const elementsToUpdate = [
      '.newsletter__badge',
      '.newsletter__title',
      '.newsletter__subtitle',
      '.newsletter__button-text',
      '.newsletter__success-title',
      '.newsletter__success-text',
      '.newsletter__success-subtext'
    ];

    elementsToUpdate.forEach(selector => {
      const element = document.querySelector(selector);
      if (element && element.dataset.eng && element.dataset.heb) {
        element.textContent = lng === 'eng' ? element.dataset.eng : element.dataset.heb;
      }
    });

    // Update input placeholder
    const input = document.getElementById('newsletterEmail');
    if (input) {
      input.placeholder = lng === 'eng'
        ? input.dataset.placeholderEng
        : input.dataset.placeholderHeb;
    }
  }

  /**
   * * --Trust Footer--
   */

  setTrustFooterLng(lng) {
    const label = document.querySelector('.trust-footer__label');
    const securityText = document.querySelector('.trust-footer__security-text');

    if (label) {
      label.textContent = lng === 'eng' ? label.dataset.eng : label.dataset.heb;
    }
    if (securityText) {
      securityText.textContent = lng === 'eng' ? securityText.dataset.eng : securityText.dataset.heb;
    }
  }

  /**
   * * --Promo Banner (Limited Edition)--
   */

  async initPromoBanner(lng) {
    try {
      const apiUrl = process.env.API_URL || '';
      const response = await fetch(`${apiUrl}/api/promo-banner`);

      if (!response.ok) {
        console.error('Failed to fetch promo banner');
        return;
      }

      const data = await response.json();

      if (data.banner) {
        this.renderPromoBanner(data.banner, lng);
      }
    } catch (error) {
      console.error('Error loading promo banner:', error);
    }
  }

  renderPromoBanner(banner, lng) {
    const section = document.getElementById('promoBanner');
    const badge = document.getElementById('promoBadge');
    const title = document.getElementById('promoTitle');
    const description = document.getElementById('promoDescription');
    const cta = document.getElementById('promoCta');
    const ctaText = cta?.querySelector('.promo-banner__cta-text');
    const imageContainer = document.getElementById('promoImage');

    if (!section) return;

    // Update text content based on language
    if (badge) badge.textContent = lng === 'eng' ? banner.badgeEng : banner.badgeHeb;
    if (title) {
      title.textContent = lng === 'eng' ? banner.titleEng : banner.titleHeb;
      title.dataset.eng = banner.titleEng;
      title.dataset.heb = banner.titleHeb;
    }
    if (description && (banner.descriptionEng || banner.descriptionHeb)) {
      description.textContent = lng === 'eng' ? banner.descriptionEng : banner.descriptionHeb;
      description.dataset.eng = banner.descriptionEng;
      description.dataset.heb = banner.descriptionHeb;
    }
    if (cta) cta.href = banner.ctaLink;
    if (ctaText) {
      ctaText.textContent = lng === 'eng' ? banner.ctaEng : banner.ctaHeb;
      ctaText.dataset.eng = banner.ctaEng;
      ctaText.dataset.heb = banner.ctaHeb;
    }

    // Add image if provided
    if (imageContainer && banner.imageUrl) {
      imageContainer.innerHTML = `<img src="${banner.imageUrl}" alt="${lng === 'eng' ? banner.titleEng : banner.titleHeb}" loading="lazy" />`;
    }

    // Show the banner
    section.style.display = 'block';
  }

  setPromoBannerLng(lng) {
    const title = document.getElementById('promoTitle');
    const description = document.getElementById('promoDescription');
    const ctaText = document.querySelector('.promo-banner__cta-text');

    if (title && title.dataset.eng && title.dataset.heb) {
      title.textContent = lng === 'eng' ? title.dataset.eng : title.dataset.heb;
    }
    if (description && description.dataset.eng && description.dataset.heb) {
      description.textContent = lng === 'eng' ? description.dataset.eng : description.dataset.heb;
    }
    if (ctaText && ctaText.dataset.eng && ctaText.dataset.heb) {
      ctaText.textContent = lng === 'eng' ? ctaText.dataset.eng : ctaText.dataset.heb;
    }
  }

  /**
   * * --Video Section--
   */

  initVideoSection() {
    const videoWrapper = document.querySelector('.craftsmanship-video-section__video-wrapper');
    const video = document.querySelector('.craftsmanship-video-section__video');
    const playButton = document.querySelector('.craftsmanship-video-section__play-button');

    if (!video || !videoWrapper || !playButton) return;

    // Handle play/pause toggle
    playButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (video.paused) {
        video.play();
        videoWrapper.classList.remove('is-paused');
      } else {
        video.pause();
        videoWrapper.classList.add('is-paused');
      }
    });

    // Update button state on video play/pause events
    video.addEventListener('play', () => {
      videoWrapper.classList.remove('is-paused');
    });

    video.addEventListener('pause', () => {
      videoWrapper.classList.add('is-paused');
    });

    // Handle video loading states
    video.addEventListener('loadstart', () => {
      videoWrapper.classList.add('is-loading');
    });

    video.addEventListener('canplay', () => {
      videoWrapper.classList.remove('is-loading');
    });

    // Ensure autoplay works (some browsers require user interaction)
    // The video has autoplay, muted, loop, and playsinline attributes in HTML
    // This ensures it starts playing when ready
    video.addEventListener('loadedmetadata', () => {
      video.play().catch(err => {
        console.log('Autoplay prevented:', err);
        videoWrapper.classList.add('is-paused');
      });
    });
  }

  setVideoSectionLng(lng) {
    const badge = document.querySelector('.craftsmanship-video-section__badge');
    const title = document.querySelector('.craftsmanship-video-section__title');
    const subtitle = document.querySelector('.craftsmanship-video-section__subtitle');

    if (badge) {
      badge.textContent = lng === 'eng' ? badge.dataset.eng : badge.dataset.heb;
    }
    if (title) {
      title.textContent = lng === 'eng' ? title.dataset.eng : title.dataset.heb;
    }
    if (subtitle) {
      subtitle.textContent = lng === 'eng' ? subtitle.dataset.eng : subtitle.dataset.heb;
    }
  }

  /**
   * * --Social Links--
   */

  setSocialLinkLng(lng) {
    const socialLinkText = document.querySelector('.social-link__text');

    if (socialLinkText) {
      socialLinkText.textContent = lng === 'eng' ? socialLinkText.dataset.eng : socialLinkText.dataset.heb;
    }
  }

  setCategoriesLng(lng) {
    const categoryName = document.querySelectorAll('.category-name');

    let necklacesCategory = document.querySelector('.category-name_necklaces');
    let crochetNecklacesCategory = document.querySelector(
      '.category-name_crochet-necklaces'
    );
    let hoopsCategory = document.querySelector('.category-name_hoops');
    let braceletsCategory = document.querySelector('.category-name_bracelets');
    let dangleCategory = document.querySelector('.category-name_dangle');
    let unisexCategory = document.querySelector('.category-name_unisex');

    if (lng === 'eng') {
      categoryName.forEach(name => {
        name.style.fontSize = '1.3rem';
      });
      if (necklacesCategory) necklacesCategory.textContent = 'Necklaces';
      if (crochetNecklacesCategory) crochetNecklacesCategory.textContent = 'Crochet Necklaces';
      if (hoopsCategory) hoopsCategory.textContent = 'Hoop Earrings';
      if (braceletsCategory) braceletsCategory.textContent = 'Bracelets';
      if (dangleCategory) dangleCategory.textContent = 'Dangle Earrings';
      if (unisexCategory) unisexCategory.textContent = 'Unisex Jewelry';
    } else {
      categoryName.forEach(name => {
        name.style.fontFamily = "'Rubik', sans-serif";
        name.style.fontSize = '1.3rem';
      });
      if (necklacesCategory) necklacesCategory.textContent = 'שרשראות';
      if (crochetNecklacesCategory) crochetNecklacesCategory.textContent = 'שרשראות סרוגות';
      if (hoopsCategory) hoopsCategory.textContent = 'עגילי חישוק';
      if (braceletsCategory) braceletsCategory.textContent = 'צמידים';
      if (dangleCategory) dangleCategory.textContent = 'עגילים תלויים';
      if (unisexCategory) unisexCategory.textContent = 'תכשיטי יוניסקס';
    }
  }

  // Image Slider (removed - slider container no longer exists)

  _imageSlider() {
    // Slider has been removed from homepage
    // This method is kept for compatibility but does nothing
    return;
  }

  // Image slider END
  // ````````````````````````````````````````````````````````````

  continueLogin() {
    const continueBtn = document.querySelector('.continue-button');
    continueBtn.addEventListener('click', e => {
      const userEmail = document.getElementById('email-input').value;
      const userPassword = document.getElementById('password-input').value;
      const data = {
        email: userEmail,
        password: userPassword,
      };
      this.loginHandler(data);
    });
  }

  // Override the placeholder from View.js
  setPageSpecificLanguage(lng, cartNum) {
    this.setHomeLanguage(lng);
    // Ensure cart icon is visible after setting language
    setTimeout(() => {
      this.ensureCartIconVisibility();
    }, 100);
  }
}

export default new HomePageView();
