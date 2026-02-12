// Sitemap route handler for dynamic XML sitemap generation
const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');
const Product = require('../models/Product');

/**
 * Serve dynamic XML sitemap with all public pages, categories, and products
 * Includes hreflang alternates, image entries for products, and lastmod dates
 */
async function serveSitemap(req, res) {
  try {
    const baseUrl = process.env.BASE_URL || 'https://tamarkfir.com';

    // Create sitemap stream with proper XML namespaces
    const stream = new SitemapStream({
      hostname: baseUrl,
      xmlns: {
        news: false,
        xhtml: true,   // Enable hreflang support
        image: true,   // Enable image sitemap extension
        video: false
      }
    });

    const links = [];

    // Static pages with priority and hreflang alternates
    const staticPages = [
      { path: '', priority: 1.0, changefreq: 'monthly' },      // Home
      { path: '/about', priority: 0.8, changefreq: 'monthly' },
      { path: '/contact', priority: 0.8, changefreq: 'monthly' },
      { path: '/workshop', priority: 0.8, changefreq: 'monthly' },
      { path: '/policies', priority: 0.7, changefreq: 'yearly' },
    ];

    // Add static pages (both languages)
    for (const page of staticPages) {
      const hreflangLinks = [
        { lang: 'en', url: `/en${page.path}` },
        { lang: 'he', url: `/he${page.path}` },
        { lang: 'x-default', url: `/en${page.path}` }
      ];

      // English version
      links.push({
        url: `/en${page.path}`,
        changefreq: page.changefreq,
        priority: page.priority,
        links: hreflangLinks
      });

      // Hebrew version
      links.push({
        url: `/he${page.path}`,
        changefreq: page.changefreq,
        priority: page.priority,
        links: hreflangLinks
      });
    }

    // Category pages
    const categories = [
      'necklaces',
      'crochet-necklaces',
      'hoops',
      'dangle',
      'bracelets',
      'unisex'
    ];

    for (const category of categories) {
      const hreflangLinks = [
        { lang: 'en', url: `/en/${category}` },
        { lang: 'he', url: `/he/${category}` },
        { lang: 'x-default', url: `/en/${category}` }
      ];

      // English version
      links.push({
        url: `/en/${category}`,
        changefreq: 'weekly',
        priority: 0.9,
        links: hreflangLinks
      });

      // Hebrew version
      links.push({
        url: `/he/${category}`,
        changefreq: 'weekly',
        priority: 0.9,
        links: hreflangLinks
      });
    }

    // Product pages - query available products
    const products = await Product.find({ available: true })
      .select('slug name images mainImage date')
      .lean();

    for (const product of products) {
      // Get product image URL (prefer images array, fallback to mainImage)
      const imageUrl = product.images?.[0]?.publicDesktop || product.mainImage?.publicDesktop;

      const hreflangLinks = [
        { lang: 'en', url: `/en/product/${product.slug}` },
        { lang: 'he', url: `/he/product/${product.slug}` },
        { lang: 'x-default', url: `/en/product/${product.slug}` }
      ];

      // Prepare image entry if available
      const img = imageUrl ? [{ url: imageUrl, caption: product.name }] : [];

      // Prepare lastmod from actual product.date (not current timestamp)
      const lastmod = product.date ? new Date(product.date).toISOString() : undefined;

      // English version
      links.push({
        url: `/en/product/${product.slug}`,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod,
        img,
        links: hreflangLinks
      });

      // Hebrew version
      links.push({
        url: `/he/product/${product.slug}`,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod,
        img,
        links: hreflangLinks
      });
    }

    // Generate sitemap XML
    const data = await streamToPromise(Readable.from(links).pipe(stream));

    // Set response headers
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache for CDN

    // Send XML
    res.send(data.toString());

  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).type('text/plain').send('Error generating sitemap');
  }
}

module.exports = { serveSitemap };
