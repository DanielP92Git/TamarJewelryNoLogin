const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { Product, Settings } = require('../models');
const { fetchUser, requireAdmin } = require('../middleware/auth');
const { adminRateLimiter } = require('./admin');
const exchangeRateService = require('../services/exchangeRateService');
const { DB_TO_URL_CATEGORY } = require('./ssrDynamic');
const { invalidateProduct, invalidateCategory } = require('../cache/invalidation');
const { agentLog } = require('../utils/agentLog');
const {
  isAbsoluteHttpUrl,
  toRelativeApiPath,
  toAbsoluteApiUrl,
} = require('../utils/urlHelpers');
const {
  uploadsDir,
  smallImagesDir,
  publicUploadsDir,
  publicSmallImagesDir,
  validateImageFilename,
  safeResolveUnder,
  normalizeProductForClient,
  processImage,
} = require('../utils/imageHelpers');

const isProd = process.env.NODE_ENV === 'production';

// =============================================
// File Upload Configuration (multer)
// =============================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'mainImage') {
      cb(null, uploadsDir);
    }
    if (file.fieldname === 'smallImages') {
      cb(null, smallImagesDir);
    }
  },
  filename: function (req, file, cb) {
    return cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const UPLOAD_ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/x-canon-cr2',
  'image/x-sony-arw',
]);

const UPLOAD_ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.cr2',
  '.arw',
]);

const UPLOAD_MAX_FILE_SIZE_BYTES =
  Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 50) * 1024 * 1024;
const UPLOAD_MAX_FILES = Number(process.env.UPLOAD_MAX_FILES || 11);

const fileFilter = (req, file, cb) => {
  const original = (file.originalname || '').toLowerCase();
  const ext = path.extname(original);

  if (!UPLOAD_ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error('File type not supported'), false);
  }

  const mime = (file.mimetype || '').toLowerCase();
  const isRawExt = ext === '.cr2' || ext === '.arw';

  if (UPLOAD_ALLOWED_IMAGE_MIME_TYPES.has(mime)) return cb(null, true);
  if (mime === 'application/octet-stream' && isRawExt) return cb(null, true);

  return cb(new Error('File type not supported'), false);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: UPLOAD_MAX_FILE_SIZE_BYTES,
    files: UPLOAD_MAX_FILES,
  },
});

// Valid product categories (DB values)
const VALID_CATEGORIES = [
  'necklaces', 'crochet-necklaces', 'hoop-earrings',
  'dangle-earrings', 'bracelets', 'unisex',
];

// =============================================
// Add Product
// =============================================
router.post(
  '/addproduct',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      // #region agent log
      agentLog('A', 'routes/products.js:/addproduct:entry', 'addproduct entry', {
        hasBody: !!req.body,
        contentType: req.headers['content-type'] || null,
        hasMainImage: !!req.body?.mainImage,
        mainImageDesktop: req.body?.mainImage?.desktop || null,
        smallImagesType: Array.isArray(req.body?.smallImages)
          ? 'array'
          : typeof req.body?.smallImages,
        category: req.body?.category || null,
        name: req.body?.name || null,
      });
      // #endregion

      // Input guards
      if (!req.body || typeof req.body !== 'object') {
        return res
          .status(400)
          .json({ success: false, error: 'Missing JSON body' });
      }
      if (!req.body.name || typeof req.body.name !== 'string') {
        return res
          .status(400)
          .json({ success: false, error: 'Missing product name' });
      }
      if (!req.body.category || typeof req.body.category !== 'string') {
        return res
          .status(400)
          .json({ success: false, error: 'Missing product category' });
      }
      if (!req.body.mainImage || typeof req.body.mainImage !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Missing mainImage data from upload.',
        });
      }

      // SKU validation
      const rawSku = req.body.sku;
      if (!rawSku || (typeof rawSku === 'string' && rawSku.trim() === '')) {
        return res.status(400).json({
          success: false,
          error: 'SKU is required for new products'
        });
      }

      const normalizedSku = String(rawSku).trim().toUpperCase();
      if (normalizedSku.length < 2 || normalizedSku.length > 7) {
        return res.status(400).json({
          success: false,
          error: 'SKU must be between 2 and 7 characters'
        });
      }
      if (!/^[A-Z0-9]+$/.test(normalizedSku)) {
        return res.status(400).json({
          success: false,
          error: 'SKU must contain only letters and numbers (A-Z, 0-9). No spaces or special characters allowed.'
        });
      }

      const products = await Product.find({}).sort({ id: -1 }).limit(1);
      const nextId = products.length > 0 ? Number(products[0].id) + 1 : 1;

      // Get ILS price as input (primary currency)
      const ilsPriceRaw = req.body.ils_price;
      const ilsPrice = Math.round(Number(ilsPriceRaw) || 0);

      if (ilsPrice <= 0) {
        console.error('ILS price validation failed:', ilsPrice);
        return res.status(400).json({
          success: false,
          error: 'ILS price is required and must be greater than 0',
        });
      }

      const exchangeRate = await exchangeRateService.getExchangeRate();
      const usdPrice = Math.round(ilsPrice / exchangeRate);

      const securityMargin = parseFloat(req.body.security_margin) || 0;

      const applyGlobalDiscountFlag =
        req.body.apply_global_discount === true ||
        req.body.apply_global_discount === 'true';

      const settings = await Settings.getSettings();
      const hasActiveGlobalDiscount =
        settings.discount_active &&
        settings.global_discount_percentage &&
        settings.global_discount_percentage > 0;

      let finalIlsPrice = ilsPrice;
      let finalUsdPrice = usdPrice;
      let originalIlsPrice = ilsPrice;
      let originalUsdPrice = usdPrice;
      let discountPercentage = 0;

      if (applyGlobalDiscountFlag && hasActiveGlobalDiscount) {
        discountPercentage = settings.global_discount_percentage;
        const ratio = 1 - discountPercentage / 100;

        originalIlsPrice = ilsPrice;
        originalUsdPrice = usdPrice;

        finalIlsPrice = Math.round(originalIlsPrice * ratio);
        finalUsdPrice = Math.round(originalUsdPrice * ratio);
      }

      // Get image URLs from the upload response
      const mainImageInput = req.body.mainImage || {};
      const smallImageInput = req.body.smallImages || [];

      const maybeRelative = value =>
        isAbsoluteHttpUrl(value) ? value : toRelativeApiPath(value);

      const mainImageUrls = {
        desktop: maybeRelative(mainImageInput.desktop),
        mobile: maybeRelative(mainImageInput.mobile),
        publicDesktop: maybeRelative(mainImageInput.publicDesktop),
        publicMobile: maybeRelative(mainImageInput.publicMobile),
      };

      const smallImageUrls = Array.isArray(smallImageInput)
        ? smallImageInput.filter(Boolean).map(img => {
            if (typeof img === 'string') return maybeRelative(img);
            if (img && typeof img === 'object' && !Array.isArray(img)) {
              const result = {
                desktop: maybeRelative(img.desktop),
                mobile: maybeRelative(img.mobile),
              };
              if (img.publicDesktop) result.publicDesktop = maybeRelative(img.publicDesktop);
              if (img.publicMobile) result.publicMobile = maybeRelative(img.publicMobile);
              return result;
            }
            return img;
          })
        : [];

      // #region agent log
      agentLog(
        'A',
        'routes/products.js:/addproduct',
        'computed image fields for product',
        {
          hasApiUrl: !!process.env.API_URL,
          mainImageInputDesktop: mainImageInput?.desktop,
          mainImageUrlsDesktop: mainImageUrls?.desktop,
          mainImageUrlsPublicDesktop: mainImageUrls?.publicDesktop,
          smallImagesCount: Array.isArray(smallImageUrls)
            ? smallImageUrls.length
            : null,
        }
      );
      // #endregion

      // Guard: don't store a product that references non-existent LOCAL upload files
      try {
        const desktopUrl = mainImageUrls?.desktop || null;
        const shouldValidateLocal =
          typeof desktopUrl === 'string' &&
          desktopUrl.startsWith('/') &&
          (desktopUrl.startsWith('/uploads/') ||
            desktopUrl.startsWith('/public/uploads/'));

        if (shouldValidateLocal) {
          const mainDesktopFn = path.basename(String(desktopUrl));
          const fp = safeResolveUnder(uploadsDir, mainDesktopFn);
          const exists =
            (fp ? fs.existsSync(fp) : false) ||
            (() => {
              const fpPublic = safeResolveUnder(
                publicUploadsDir,
                mainDesktopFn
              );
              return fpPublic ? fs.existsSync(fpPublic) : false;
            })();

          // #region agent log
          agentLog(
            'A',
            'routes/products.js:/addproduct:upload-file-check',
            'checked upload file exists',
            {
              mainDesktopUrl: desktopUrl,
              mainDesktopFilename: mainDesktopFn,
              resolvedOk: !!fp,
              exists,
            }
          );
          // #endregion

          if (!exists) {
            return res.status(400).json({
              success: false,
              error:
                'Uploaded main image file was not found on the server. Please retry the upload.',
            });
          }
        } else if (!desktopUrl) {
          return res.status(400).json({
            success: false,
            error: 'mainImage.desktop missing from upload response.',
          });
        }
      } catch (e) {
        console.error('[addproduct] upload file validation failed:', e);
        return res.status(500).json({
          success: false,
          error: 'Server failed while validating uploaded image files.',
        });
      }

      // Build unified images array (Phase 7)
      const isSpacesDesktop = isAbsoluteHttpUrl(mainImageUrls.desktop);
      const images = [];

      if (mainImageUrls && Object.keys(mainImageUrls).length > 0) {
        images.push(mainImageUrls);
      }

      if (Array.isArray(smallImageUrls) && smallImageUrls.length > 0) {
        images.push(...smallImageUrls);
      }

      const product = new Product({
        id: nextId,
        name: req.body.name,
        image: mainImageUrls.desktop || mainImageUrls.publicDesktop || '',
        publicImage: mainImageUrls.publicDesktop || '',
        mainImage: mainImageUrls,
        smallImages: smallImageUrls,
        images: images,
        directImageUrl: mainImageUrls.desktop
          ? isSpacesDesktop
            ? mainImageUrls.desktop
            : `/direct-image/${String(mainImageUrls.desktop).split('/').pop()}`
          : null,
        category: req.body.category,
        quantity: Math.max(0, Number(req.body.quantity) || 0),
        description: req.body.description || '',
        name_en: req.body.name_en || req.body.name || '',
        name_he: req.body.name_he || '',
        description_en: req.body.description_en || req.body.description || '',
        description_he: req.body.description_he || '',
        ils_price: finalIlsPrice,
        usd_price: finalUsdPrice,
        original_ils_price: originalIlsPrice,
        original_usd_price: originalUsdPrice,
        discount_percentage: discountPercentage,
        security_margin: securityMargin,
        sku: normalizedSku,
      });

      if (!isProd) {
        console.log('\n=== Product Data Before Save ===');
        console.log(
          JSON.stringify(
            {
              id: product.id,
              name: product.name,
              ils_price: product.ils_price,
              usd_price: product.usd_price,
              original_ils_price: product.original_ils_price,
              original_usd_price: product.original_usd_price,
              image: product.image,
              publicImage: product.publicImage,
              mainImage: product.mainImage,
              smallImages: product.smallImages,
              directImageUrl: product.directImageUrl,
              category: product.category,
            },
            null,
            2
          )
        );
      }

      await product.save();

      if (!isProd) {
        console.log('\n=== Product Saved Successfully ===');
      }

      // #region agent log
      agentLog('A', 'routes/products.js:/addproduct:save', 'product saved', {
        productId: nextId,
        imageStored: product?.image,
        publicImageStored: product?.publicImage,
        directImageUrlStored: product?.directImageUrl,
      });
      // #endregion

      // Invalidate cache
      const urlCategory = DB_TO_URL_CATEGORY[product.category];
      if (product.slug && urlCategory) {
        invalidateProduct(product.slug, urlCategory);
      } else if (urlCategory) {
        invalidateCategory(urlCategory);
      }

      res.json({
        success: true,
        id: nextId,
        name: req.body.name,
      });
    } catch (error) {
      if (error.code === 11000 && error.keyPattern?.sku) {
        const duplicateSku = error.keyValue?.sku;
        const existingProduct = await Product.findOne({ sku: duplicateSku }).select('name');
        return res.status(409).json({
          success: false,
          error: `SKU '${duplicateSku}' is already used by ${existingProduct?.name || 'another product'}. Please choose a different SKU.`
        });
      }

      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(e => e.message);
        return res.status(400).json({
          success: false,
          error: messages.join('. ')
        });
      }

      if (!isProd) {
        console.error('\n=== Product Creation Error ===');
        console.error(error);
      } else {
        console.error('Product creation failed:', {
          message: error?.message || null,
          code: error?.code || null,
        });
      }
      // #region agent log
      agentLog('A', 'routes/products.js:/addproduct:catch', 'addproduct error', {
        message: error?.message || null,
        name: error?.name || null,
      });
      // #endregion
      res.status(500).json({
        success: false,
        error: 'Failed to create product',
        ...(isProd ? {} : { message: error?.message }),
      });
    }
  }
);

// =============================================
// Update Product (with file upload)
// =============================================
router.post(
  '/updateproduct/:id',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'smallImages', maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const productId = req.params.id;
      if (!isProd) {
        console.log(`Updating product ${productId}`);
        console.log('Form data:', req.body);
      }

      const product = await Product.findOne({ id: Number(productId) });
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      const {
        name,
        ils_price,
        description,
        category,
        quantity,
        security_margin,
        sku,
        name_en,
        name_he,
        description_en,
        description_he,
      } = req.body;

      product.name = name;

      const newIlsPrice = Math.round(Number(ils_price) || 0);

      if (newIlsPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ILS price is required and must be greater than 0',
        });
      }

      const exchangeRate = await exchangeRateService.getExchangeRate();
      const newUsdPrice = Math.round(newIlsPrice / exchangeRate);

      if (!product.original_usd_price || product.discount_percentage === 0) {
        product.original_usd_price = newUsdPrice;
      }
      if (!product.original_ils_price || product.discount_percentage === 0) {
        product.original_ils_price = newIlsPrice;
      }

      product.usd_price = newUsdPrice;
      product.ils_price = newIlsPrice;
      product.description = description || '';
      product.category = category;
      product.quantity = Math.max(0, Number(quantity) || 0);
      product.security_margin = Math.max(0, Number(security_margin) || 0);

      // Bilingual fields
      if (name_en !== undefined) product.name_en = name_en || '';
      if (name_he !== undefined) product.name_he = name_he || '';
      if (description_en !== undefined) product.description_en = description_en || '';
      if (description_he !== undefined) product.description_he = description_he || '';

      // Handle SKU update
      if (sku !== undefined) {
        const normalizedSku = sku ? String(sku).trim().toUpperCase() : null;

        if (normalizedSku) {
          if (normalizedSku.length < 2 || normalizedSku.length > 7) {
            return res.status(400).json({
              success: false,
              message: 'SKU must be between 2 and 7 characters'
            });
          }
          if (!/^[A-Z0-9]+$/.test(normalizedSku)) {
            return res.status(400).json({
              success: false,
              message: 'SKU must contain only letters and numbers (A-Z, 0-9)'
            });
          }
        }

        product.sku = normalizedSku;
      }

      // Handle file uploads
      let mainImageUpdated = false;
      let smallImagesUpdated = false;
      let mainImageError = null;
      let smallImagesError = null;

      let images = Array.isArray(product.images) ? [...product.images] : [];

      // Process main image if uploaded
      if (req.files && req.files.mainImage && req.files.mainImage.length > 0) {
        if (!isProd) console.log('Processing new main image');
        const mainImage = req.files.mainImage[0];

        try {
          const mainImageResults = await processImage(
            mainImage.path,
            mainImage.filename,
            true
          );

          const desktopUrl =
            mainImageResults?.desktop?.spacesUrl ||
            `/uploads/${mainImageResults.desktop.filename}`;
          const mobileUrl =
            mainImageResults?.mobile?.spacesUrl ||
            `/uploads/${mainImageResults.mobile.filename}`;

          const newMainImage = {
            desktop: desktopUrl,
            mobile: mobileUrl,
            publicDesktop:
              mainImageResults?.desktop?.spacesUrl ||
              `/public/uploads/${mainImageResults.desktop.filename}`,
            publicMobile:
              mainImageResults?.mobile?.spacesUrl ||
              `/public/uploads/${mainImageResults.mobile.filename}`,
          };

          product.mainImage = newMainImage;

          if (images.length > 0) {
            images[0] = newMainImage;
          } else {
            images.push(newMainImage);
          }

          product.image = desktopUrl;
          product.publicImage = product.mainImage.publicDesktop || desktopUrl;

          product.directImageUrl = isAbsoluteHttpUrl(desktopUrl)
            ? desktopUrl
            : `/direct-image/${mainImageResults.desktop.filename}`;

          product.imageLocal = undefined;
          if (product.mainImage) {
            product.mainImage.desktopLocal = undefined;
            product.mainImage.mobileLocal = undefined;
          }

          mainImageUpdated = true;
          if (!isProd) console.log('Main image updated');
        } catch (error) {
          console.error('Error processing main image:', error);
          mainImageError = error.message || 'Unknown error processing main image';
        }
      }

      // Process small images if uploaded
      if (
        req.files &&
        req.files.smallImages &&
        req.files.smallImages.length > 0
      ) {
        if (!isProd) console.log(
          `Processing ${req.files.smallImages.length} new small images`
        );

        try {
          const smallImagesResults = await Promise.all(
            req.files.smallImages.map(async image => {
              return await processImage(image.path, image.filename, false);
            })
          );

          const existingIsString =
            Array.isArray(product.smallImages) &&
            typeof product.smallImages[0] === 'string';

          const newSmallImages = existingIsString
            ? smallImagesResults.map(
                result =>
                  result?.desktop?.spacesUrl ||
                  `/smallImages/${result.desktop.filename}`
              )
            : smallImagesResults.map(result => ({
                desktop:
                  result?.desktop?.spacesUrl ||
                  `/smallImages/${result.desktop.filename}`,
                mobile:
                  result?.mobile?.spacesUrl ||
                  `/smallImages/${result.mobile.filename}`,
                publicDesktop:
                  result?.desktop?.spacesUrl ||
                  `/public/smallImages/${result.desktop.filename}`,
                publicMobile:
                  result?.mobile?.spacesUrl ||
                  `/public/smallImages/${result.mobile.filename}`,
              }));

          if (!product.smallImages) {
            product.smallImages = [];
          }

          product.smallImages = [...product.smallImages, ...newSmallImages];

          images = [...images, ...newSmallImages].filter(Boolean);

          smallImagesUpdated = true;
          if (!isProd) console.log('Small images updated');
        } catch (error) {
          console.error('Error processing small images:', error);
          smallImagesError = error.message || 'Unknown error processing gallery images';
        }
      }

      // Update images array (Phase 7)
      if (mainImageUpdated || smallImagesUpdated) {
        product.images = images;
      }

      // Handle image reordering
      const { imageOrder } = req.body;
      if (imageOrder) {
        try {
          const orderArray = typeof imageOrder === 'string' ? JSON.parse(imageOrder) : imageOrder;

          if (Array.isArray(orderArray) && orderArray.length > 0) {
            const currentImages = product.images || [];

            const imageMap = new Map();
            currentImages.forEach(img => {
              const key = img.desktop || img.publicDesktop || img.desktopLocal || '';
              if (key) imageMap.set(key, img);
            });

            const reorderedImages = [];
            orderArray.forEach(url => {
              const decodedUrl = decodeURIComponent(url);
              if (imageMap.has(decodedUrl)) {
                reorderedImages.push(imageMap.get(decodedUrl));
                imageMap.delete(decodedUrl);
              }
            });

            imageMap.forEach(img => reorderedImages.push(img));

            product.images = reorderedImages;

            if (reorderedImages.length > 0) {
              product.mainImage = reorderedImages[0];
            }
            if (reorderedImages.length > 1) {
              product.smallImages = reorderedImages.slice(1);
            }

            if (!isProd) console.log('[updateproduct] Reordered images:', {
              productId: product.id,
              newOrder: reorderedImages.map(img => img.desktop || img.publicDesktop).slice(0, 3)
            });
          }
        } catch (err) {
          console.error('[updateproduct] Error parsing imageOrder:', err);
        }
      }

      await product.save();
      if (!isProd) console.log('Product updated successfully');

      // Invalidate cache
      const urlCategory = DB_TO_URL_CATEGORY[product.category];
      if (product.slug && urlCategory) {
        invalidateProduct(product.slug, urlCategory);
      } else if (urlCategory) {
        invalidateCategory(urlCategory);
      }

      const warnings = [];
      if (mainImageError) warnings.push(`Main image: ${mainImageError}`);
      if (smallImagesError) warnings.push(`Gallery images: ${smallImagesError}`);

      res.json({
        success: true,
        message: warnings.length
          ? 'Product updated with warnings'
          : 'Product updated successfully',
        mainImageUpdated,
        smallImagesUpdated,
        ...(warnings.length && { warnings }),
      });
    } catch (error) {
      if (error.code === 11000 && error.keyPattern?.sku) {
        const duplicateSku = error.keyValue?.sku;
        const existingProduct = await Product.findOne({ sku: duplicateSku }).select('name');
        return res.status(409).json({
          success: false,
          message: `SKU '${duplicateSku}' is already used by ${existingProduct?.name || 'another product'}. Please choose a different SKU.`
        });
      }

      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(e => e.message);
        return res.status(400).json({
          success: false,
          message: messages.join('. ')
        });
      }

      console.error('Error updating product:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// =============================================
// Product Reordering
// =============================================
router.post(
  '/admin/products/reorder',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      const { category, productIds } = req.body;

      if (!category || typeof category !== 'string' || category.trim() === '') {
        return res.status(400).json({
          success: false,
          errors: 'Category is required and must be a non-empty string'
        });
      }

      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({
          success: false,
          errors: 'productIds must be a non-empty array'
        });
      }

      for (const productId of productIds) {
        if (!mongoose.Types.ObjectId.isValid(productId)) {
          return res.status(400).json({
            success: false,
            errors: `Invalid product ID format: ${productId}`
          });
        }
      }

      const uniqueIds = new Set(productIds);
      if (uniqueIds.size !== productIds.length) {
        return res.status(400).json({
          success: false,
          errors: 'Duplicate product IDs in request'
        });
      }

      const fetchedProducts = await Product.find({
        _id: { $in: productIds }
      }).select('_id category __v');

      if (fetchedProducts.length !== productIds.length) {
        const foundIds = new Set(fetchedProducts.map(p => p._id.toString()));
        const missingIds = productIds.filter(id => !foundIds.has(id));
        return res.status(400).json({
          success: false,
          errors: `Products not found: ${missingIds.join(', ')}`
        });
      }

      const categories = new Set(fetchedProducts.map(p => p.category));
      if (categories.size > 1) {
        return res.status(400).json({
          success: false,
          errors: `Cannot reorder: products from multiple categories (${Array.from(categories).join(', ')})`
        });
      }

      if (categories.size === 1 && !categories.has(category)) {
        return res.status(400).json({
          success: false,
          errors: `Products belong to category '${fetchedProducts[0].category}', not '${category}'`
        });
      }

      const totalInCategory = await Product.countDocuments({ category });
      if (productIds.length !== totalInCategory) {
        return res.status(400).json({
          success: false,
          errors: `Incomplete reorder: category '${category}' has ${totalInCategory} products but request includes ${productIds.length}`
        });
      }

      const versionMap = new Map(
        fetchedProducts.map(p => [p._id.toString(), p.__v])
      );

      const operations = productIds.map((productId, index) => ({
        updateOne: {
          filter: {
            _id: new mongoose.Types.ObjectId(productId),
            __v: versionMap.get(productId)
          },
          update: {
            $set: { displayOrder: (index + 1) * 10 },
            $inc: { __v: 1 }
          }
        }
      }));

      const result = await Product.bulkWrite(operations, { ordered: true });

      if (result.modifiedCount !== productIds.length) {
        return res.status(409).json({
          success: false,
          errors: 'Concurrency conflict detected. Another admin modified product order. Please refresh and try again.'
        });
      }

      const urlCategory = DB_TO_URL_CATEGORY[category];
      if (urlCategory) {
        invalidateCategory(urlCategory);
      }

      res.json({
        success: true,
        message: `Product order updated for category '${category}'`,
        reorderedCount: result.modifiedCount
      });

    } catch (error) {
      console.error('Error in reorder endpoint:', error);
      return res.status(500).json({
        success: false,
        errors: 'Internal server error while reordering products'
      });
    }
  }
);

// =============================================
// Legacy Update Product (JSON body, no file upload)
// =============================================
router.post(
  '/updateproduct',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.body.id);
      if (!Number.isFinite(id)) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid product id' });
      }

      const ilsPrice = Math.round(Number(req.body.ils_price) || 0);

      if (ilsPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ILS price is required and must be greater than 0',
        });
      }

      const exchangeRate = await exchangeRateService.getExchangeRate();
      const usdPrice = Math.round(ilsPrice / exchangeRate);

      const updatedFields = {
        name: req.body.name,
        ils_price: ilsPrice,
        usd_price: usdPrice,
        security_margin: parseFloat(req.body.security_margin) || 0,
        description: req.body.description,
        quantity: Math.max(0, Number(req.body.quantity) || 0),
        category: req.body.category,
      };

      let product = await Product.findOne({ id });
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: 'Product not found' });
      }

      product.name = updatedFields.name;

      if (!product.original_usd_price || product.discount_percentage === 0) {
        product.original_usd_price = updatedFields.usd_price;
      }
      if (!product.original_ils_price || product.discount_percentage === 0) {
        product.original_ils_price = updatedFields.ils_price;
      }

      product.usd_price = updatedFields.usd_price;
      product.ils_price = updatedFields.ils_price;
      product.security_margin = updatedFields.security_margin;
      product.description = updatedFields.description;
      product.quantity = updatedFields.quantity;
      product.category = updatedFields.category;

      await product.save();

      res.json({
        success: true,
      });
    } catch (error) {
      console.error('Error in legacy updateproduct:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// =============================================
// Check SKU Duplicate
// =============================================
router.post(
  '/check-sku-duplicate',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      const { sku, excludeProductId } = req.body;

      const normalizedSku = String(sku).trim().toUpperCase();

      if (normalizedSku.length < 2 || normalizedSku.length > 7) {
        return res.json({ duplicate: false });
      }
      if (!/^[A-Z0-9]+$/.test(normalizedSku)) {
        return res.json({ duplicate: false });
      }

      const query = { sku: normalizedSku };

      if (excludeProductId) {
        query.id = { $ne: Number(excludeProductId) };
      }

      const existingProduct = await Product.findOne(query).select('id name');

      if (existingProduct) {
        return res.json({
          duplicate: true,
          conflictingProduct: {
            id: existingProduct.id,
            name: existingProduct.name
          }
        });
      }

      res.json({ duplicate: false });
    } catch (error) {
      console.error('Error checking SKU duplicate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check SKU'
      });
    }
  }
);

// =============================================
// Update Product SKU (inline editing)
// =============================================
router.patch(
  '/updateproduct/:id/sku',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      const productId = Number(req.params.id);
      const { sku } = req.body;

      const product = await Product.findOne({ id: productId });
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      let normalizedSku = null;
      if (sku) {
        normalizedSku = String(sku).trim().toUpperCase();

        if (normalizedSku.length < 2 || normalizedSku.length > 7) {
          return res.status(400).json({
            success: false,
            message: 'SKU must be 2-7 characters'
          });
        }
        if (!/^[A-Z0-9]+$/.test(normalizedSku)) {
          return res.status(400).json({
            success: false,
            message: 'SKU must contain only letters and numbers'
          });
        }

        const existingProduct = await Product.findOne({
          sku: normalizedSku,
          id: { $ne: productId }
        }).select('id name');

        if (existingProduct) {
          return res.status(400).json({
            success: false,
            message: `SKU already exists on product: ${existingProduct.name} (ID: ${existingProduct.id})`
          });
        }
      }

      product.sku = normalizedSku;
      await product.save();

      res.json({
        success: true,
        message: 'SKU updated successfully',
        sku: normalizedSku
      });
    } catch (error) {
      console.error('Error updating SKU:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update SKU'
      });
    }
  }
);

// =============================================
// Remove Product
// =============================================
router.post(
  '/removeproduct',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    const id = Number(req.body.id);
    if (!Number.isFinite(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid product id' });
    }

    const deleted = await Product.findOneAndDelete({ id });
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: 'Product not found' });
    }

    const urlCategory = DB_TO_URL_CATEGORY[deleted.category];
    if (deleted.slug && urlCategory) {
      invalidateProduct(deleted.slug, urlCategory);
    } else if (urlCategory) {
      invalidateCategory(urlCategory);
    }

    if (!isProd) console.log('Removed');
    res.json({
      success: true,
      id,
      name: deleted.name,
    });
  }
);

// =============================================
// List Products
// =============================================
router.get('/allproducts', async (req, res) => {
  let products = await Product.find({}).sort({ category: 1, displayOrder: 1 }).lean();
  if (!isProd) console.log('All Products Fetched');
  res.send(products.map(normalizeProductForClient));
});

// Full raw export for data migration
router.get(
  '/export-products',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      const products = await Product.find({})
        .sort({ category: 1, displayOrder: 1 })
        .lean();
      const dateStr = new Date().toISOString().slice(0, 10);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=products-export-${dateStr}.json`
      );
      res.json(products);
    } catch (err) {
      console.error('Export error:', err);
      res.status(500).json({ success: false, error: 'Export failed' });
    }
  }
);

// Bulk import for data migration
router.post(
  '/import-products',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      const { products } = req.body;
      if (!Array.isArray(products) || products.length === 0) {
        return res
          .status(400)
          .json({ success: false, error: 'Expected a non-empty products array' });
      }
      if (products.length > 500) {
        return res
          .status(400)
          .json({ success: false, error: 'Maximum 500 products per import' });
      }

      const cleaned = products.map((p) => {
        const { __v, ...rest } = p;
        return rest;
      });

      const result = await Product.insertMany(cleaned, { ordered: false })
        .catch((err) => {
          if (err.insertedDocs) {
            return {
              partial: true,
              inserted: err.insertedDocs.length,
              errors: err.writeErrors?.map((e) => ({
                index: e.index,
                message: e.errmsg,
              })),
            };
          }
          throw err;
        });

      if (result.partial) {
        return res.status(207).json({
          success: false,
          inserted: result.inserted,
          failed: products.length - result.inserted,
          errors: result.errors,
        });
      }

      res.json({
        success: true,
        inserted: result.length,
        failed: 0,
      });
    } catch (err) {
      console.error('Import error:', err);
      res
        .status(500)
        .json({ success: false, error: 'Import failed: ' + err.message });
    }
  }
);

// =============================================
// Products by Category
// =============================================
router.post('/productsByCategory', async (req, res) => {
  const category = req.body.category;
  if (typeof category !== 'string' || !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  const page = parseInt(req.body.page) || 1;
  const limit = 6;

  try {
    if (!isProd) console.log('Fetching products for category:', category);
    const skip = (page - 1) * limit;

    let products = await Product.find({
      category: category,
      quantity: { $gt: 0 },
      available: { $ne: false },
    })
      .sort({ displayOrder: 1 })
      .lean()
      .skip(skip)
      .limit(limit);

    if (!products || products.length === 0) {
      return res.json([]);
    }

    res.json(products.map(normalizeProductForClient));
  } catch (err) {
    if (!isProd) console.error('Error fetching products by category:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/chunkProducts', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const category = req.body.checkCategory;
  if (typeof category !== 'string' || !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  try {
    const products = await Product.find({
      category: category,
      quantity: { $gt: 0 },
      available: { $ne: false },
    })
      .sort({ displayOrder: 1 })
      .lean()
      .skip(skip)
      .limit(limit);
    res.json(products.map(normalizeProductForClient));
  } catch (err) {
    if (!isProd) console.error('Error fetching chunkProducts:', err);
    res.status(500).json({
      error: 'Failed to fetch products',
      ...(isProd ? {} : { message: err?.message }),
    });
  }
});

router.post('/getAllProductsByCategory', async (req, res) => {
  const category = req.body.category;
  if (typeof category !== 'string' || !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  try {
    if (!isProd) console.log('Fetching all products for category:', category);

    const products = await Product.find({
      category: category,
      quantity: { $gt: 0 },
      available: { $ne: false },
    })
      .sort({ displayOrder: 1 })
      .lean();
    const total = products.length;

    if (!products || products.length === 0) {
      return res.json({
        products: [],
        total: 0,
      });
    }

    res.json({
      products: products.map(normalizeProductForClient),
      total,
    });
  } catch (err) {
    if (!isProd) console.error('Error fetching all products by category:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// =============================================
// File Upload Endpoint
// =============================================
router.post(
  '/upload',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  (req, res, next) => {
    try {
      req.setTimeout(120000);
      res.setTimeout(120000);
    } catch {
      // ignore
    }
    next();
  },
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'smallImages', maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      // #region agent log
      agentLog('B', 'routes/products.js:/upload:entry', 'upload received', {
        hasFiles: !!req.files,
        mainImageCount: Array.isArray(req.files?.mainImage)
          ? req.files.mainImage.length
          : 0,
        smallImagesCount: Array.isArray(req.files?.smallImages)
          ? req.files.smallImages.length
          : 0,
        mainImageFilename: req.files?.mainImage?.[0]?.filename || null,
      });
      // #endregion

      if (!req.files || Object.keys(req.files).length === 0) {
        console.error('No files were uploaded.');
        return res.status(400).json({
          error: 'No files were uploaded',
          success: false,
        });
      }

      const mainImage = req.files.mainImage ? req.files.mainImage[0] : null;
      const smallImages = req.files.smallImages || [];

      if (!mainImage) {
        console.error('No main image provided');
        return res.status(400).json({
          error: 'No main image provided',
          success: false,
        });
      }

      const mainImageResults = await processImage(
        mainImage.path,
        mainImage.filename,
        true
      );
      const smallImagesResults = await Promise.all(
        smallImages.map(async image => {
          return await processImage(image.path, image.filename, false);
        })
      );

      const mainImageUrls = {
        desktop:
          mainImageResults?.desktop?.spacesUrl ||
          `/uploads/${mainImageResults.desktop.filename}`,
        mobile:
          mainImageResults?.mobile?.spacesUrl ||
          `/uploads/${mainImageResults.mobile.filename}`,
        publicDesktop:
          mainImageResults?.desktop?.spacesUrl ||
          `/public/uploads/${mainImageResults.desktop.filename}`,
        publicMobile:
          mainImageResults?.mobile?.spacesUrl ||
          `/public/uploads/${mainImageResults.mobile.filename}`,
      };

      const smallImageUrlSets = smallImagesResults.map(result => ({
        desktop:
          result?.desktop?.spacesUrl ||
          `/smallImages/${result.desktop.filename}`,
        mobile:
          result?.mobile?.spacesUrl || `/smallImages/${result.mobile.filename}`,
        publicDesktop:
          result?.desktop?.spacesUrl ||
          `/public/smallImages/${result.desktop.filename}`,
        publicMobile:
          result?.mobile?.spacesUrl ||
          `/public/smallImages/${result.mobile.filename}`,
      }));

      const response = {
        success: true,
        mainImage: mainImageUrls,
        smallImages: smallImageUrlSets,
        fileDetails: {
          mainImage: {
            desktop: mainImageResults.desktop,
            mobile: mainImageResults.mobile,
          },
          smallImages: smallImagesResults,
        },
      };

      // #region agent log
      agentLog('B', 'routes/products.js:/upload:exit', 'upload response urls', {
        mainDesktopUrl: response?.mainImage?.desktop,
        mainPublicDesktopUrl: response?.mainImage?.publicDesktop,
        smallImagesCount: Array.isArray(response?.smallImages)
          ? response.smallImages.length
          : 0,
      });
      // #endregion

      // #region agent log
      agentLog(
        'B',
        'routes/products.js:/upload:before-send',
        'calling res.json',
        {
          responseSize: JSON.stringify(response).length,
          headersSent: res.headersSent,
          writableEnded: res.writableEnded,
        }
      );
      // #endregion

      res.on('error', err => {
        // #region agent log
        agentLog(
          'B',
          'routes/products.js:/upload:res-error',
          'response stream error',
          {
            error: err.message,
            stack: err.stack,
          }
        );
        // #endregion
      });

      const responseBody = JSON.stringify(response);
      if (res.headersSent) {
        res.write(responseBody);
        res.end();
      } else {
        res.json(response);
      }

      // #region agent log
      agentLog('B', 'routes/products.js:/upload:after-send', 'res.end called', {
        headersSent: res.headersSent,
        writableEnded: res.writableEnded,
      });
      // #endregion
    } catch (error) {
      if (!isProd) console.error('Upload error:', error);
      else {
        console.error('Upload error:', {
          message: error?.message || null,
          code: error?.code || null,
        });
      }
      return res.status(500).json({
        error: isProd
          ? 'Server error during upload'
          : 'Server error during upload: ' + error.message,
        success: false,
        ...(isProd ? {} : { message: error?.message }),
      });
    }
  }
);

// =============================================
// Delete Product Image
// =============================================
router.post(
  '/deleteproductimage',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      const { productId, imageType, imageUrl } = req.body || {};
      const id = Number(productId);

      if (!Number.isFinite(id)) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid productId' });
      }
      if (imageType !== 'main' && imageType !== 'small') {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid imageType' });
      }

      const product = await Product.findOne({ id });
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: 'Product not found' });
      }

      const extractFilename = url => {
        if (!url || typeof url !== 'string') return '';
        const rel = toRelativeApiPath(url);
        return rel ? path.basename(rel) : '';
      };

      const unlinkIfExists = async filePath => {
        try {
          await fs.promises.unlink(filePath);
        } catch {
          // ignore
        }
      };

      if (imageType === 'main') {
        const candidates = [
          product.image,
          product.publicImage,
          product.directImageUrl,
          product.mainImage?.desktop,
          product.mainImage?.mobile,
          product.mainImage?.publicDesktop,
          product.mainImage?.publicMobile,
        ]
          .map(extractFilename)
          .filter(Boolean);

        await Promise.all(
          candidates.flatMap(fn => [
            unlinkIfExists(path.join(uploadsDir, fn)),
            unlinkIfExists(path.join(publicUploadsDir, fn)),
          ])
        );

        product.image = null;
        product.publicImage = null;
        product.directImageUrl = null;
        product.imageLocal = null;

        if (product.mainImage) {
          product.mainImage.desktop = null;
          product.mainImage.mobile = null;
          product.mainImage.publicDesktop = null;
          product.mainImage.publicMobile = null;
          product.mainImage.desktopLocal = null;
          product.mainImage.mobileLocal = null;
        }

        await product.save();
        return res.json({
          success: true,
          message: 'Main image deleted successfully',
        });
      }

      // small image deletion
      const target = extractFilename(imageUrl);
      if (!target) {
        return res
          .status(400)
          .json({ success: false, message: 'Missing imageUrl' });
      }

      const validation = validateImageFilename(target);
      if (!validation.ok) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid imageUrl' });
      }

      const toBaseId = filename => {
        if (!filename || typeof filename !== 'string') return '';
        const withoutExt = filename.replace(/\.[a-z0-9]+$/i, '');
        return withoutExt.replace(/-(desktop|mobile)$/i, '');
      };

      const targetBaseId = toBaseId(target);
      const filenamesToDelete = new Set();
      const extractStringFromMalformed = maybeObj => {
        if (!maybeObj || typeof maybeObj !== 'object' || Array.isArray(maybeObj))
          return '';
        const keys = Object.keys(maybeObj).filter(k => /^\d+$/.test(k));
        if (keys.length === 0) return '';
        keys.sort((a, b) => Number(a) - Number(b));
        return keys.map(k => maybeObj[k]).join('');
      };

      if (Array.isArray(product.smallImages)) {
        product.smallImages = product.smallImages.filter(si => {
          if (typeof si === 'string') {
            const fn = extractFilename(si);
            if (fn && toBaseId(fn) === targetBaseId) {
              filenamesToDelete.add(fn);
              return false;
            }
            return true;
          }
          if (si && typeof si === 'object') {
            if (!si.desktop && !si.mobile) {
              const recovered = extractStringFromMalformed(si);
              const fnRecovered = extractFilename(recovered);
              if (fnRecovered && toBaseId(fnRecovered) === targetBaseId) {
                filenamesToDelete.add(fnRecovered);
                return false;
              }
              return true;
            }
            const fnD = extractFilename(si.desktop);
            const fnM = extractFilename(si.mobile);
            const matchD = fnD && toBaseId(fnD) === targetBaseId;
            const matchM = fnM && toBaseId(fnM) === targetBaseId;
            if (matchD || matchM) {
              if (matchD) filenamesToDelete.add(fnD);
              if (matchM) filenamesToDelete.add(fnM);
              return false;
            }
          }
          return true;
        });
      }

      if (Array.isArray(product.smallImagesLocal)) {
        product.smallImagesLocal = product.smallImagesLocal.filter(u => {
          const fn = extractFilename(u);
          if (fn && toBaseId(fn) === targetBaseId) {
            filenamesToDelete.add(fn);
            return false;
          }
          return true;
        });
      }

      // Phase 7: Also filter unified images array
      if (Array.isArray(product.images)) {
        product.images = product.images.filter(img => {
          if (!img || typeof img !== 'object') return true;

          const fnD = extractFilename(img.desktop);
          const fnM = extractFilename(img.mobile);
          const fnPD = extractFilename(img.publicDesktop);
          const fnPM = extractFilename(img.publicMobile);
          const fnDL = extractFilename(img.desktopLocal);
          const fnML = extractFilename(img.mobileLocal);

          const matchD = fnD && toBaseId(fnD) === targetBaseId;
          const matchM = fnM && toBaseId(fnM) === targetBaseId;
          const matchPD = fnPD && toBaseId(fnPD) === targetBaseId;
          const matchPM = fnPM && toBaseId(fnPM) === targetBaseId;
          const matchDL = fnDL && toBaseId(fnDL) === targetBaseId;
          const matchML = fnML && toBaseId(fnML) === targetBaseId;

          if (matchD || matchM || matchPD || matchPM || matchDL || matchML) {
            if (matchD) filenamesToDelete.add(fnD);
            if (matchM) filenamesToDelete.add(fnM);
            if (matchPD) filenamesToDelete.add(fnPD);
            if (matchPM) filenamesToDelete.add(fnPM);
            if (matchDL) filenamesToDelete.add(fnDL);
            if (matchML) filenamesToDelete.add(fnML);
            return false;
          }
          return true;
        });

        if (product.images.length > 0) {
          product.mainImage = product.images[0];
        } else {
          product.mainImage = null;
        }
        if (product.images.length > 1) {
          product.smallImages = product.images.slice(1);
        } else {
          product.smallImages = [];
        }
      }

      // Fallback for deeply malformed legacy data
      if (
        filenamesToDelete.size === 0 &&
        Array.isArray(product.smallImages) &&
        target
      ) {
        const serializedTarget = target;
        let foundInFallback = false;
        product.smallImages = product.smallImages.filter(si => {
          try {
            const raw = JSON.stringify(si);
            if (raw && raw.includes(serializedTarget)) {
              const m = raw.match(/smallImages-[0-9]+\.[a-z0-9]+/i);
              if (m && m[0]) filenamesToDelete.add(m[0]);
              foundInFallback = true;
              return false;
            }
          } catch {
            // ignore
          }
          return true;
        });
        if (foundInFallback && filenamesToDelete.size === 0) {
          filenamesToDelete.add(target);
        }
      }

      if (filenamesToDelete.size === 0) {
        return res.status(404).json({
          success: false,
          message: 'Image not found on product',
        });
      }

      await product.save();

      await Promise.all(
        [...filenamesToDelete].flatMap(fn => [
          unlinkIfExists(path.join(smallImagesDir, fn)),
          unlinkIfExists(path.join(publicSmallImagesDir, fn)),
        ])
      );

      return res.json({
        success: true,
        message: 'Small image deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete image',
        ...(isProd ? {} : { details: error?.message }),
      });
    }
  }
);

// =============================================
// Get Single Product
// =============================================
router.get('/getproduct/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ id: Number(req.params.id) });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: 'Product not found' });
    }
    res.json(normalizeProductForClient(product));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
