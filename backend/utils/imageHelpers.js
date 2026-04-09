/**
 * Image processing, validation, and product normalization utilities.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { toAbsoluteApiUrl, toRelativeApiPath } = require('./urlHelpers');
const { uploadFileToSpaces } = require('./spaces');
const { agentLog } = require('./agentLog');

const isProd = process.env.NODE_ENV === 'production';

// Shared directory paths (relative to backend root)
const backendDir = path.join(__dirname, '..');
const uploadsDir = path.join(backendDir, 'uploads');
const smallImagesDir = path.join(backendDir, 'smallImages');
const publicUploadsDir = path.join(backendDir, 'public', 'uploads');
const publicSmallImagesDir = path.join(backendDir, 'public', 'smallImages');
const noImageSvgPath = path.join(backendDir, 'public', 'images', 'no-image.svg');

// =============================================
// Filesystem safety helpers
// =============================================
const ALLOWED_IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
]);

function validateImageFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return { ok: false, error: 'Missing filename' };
  }
  if (filename.length > 200) {
    return { ok: false, error: 'Filename too long' };
  }
  if (
    filename.includes('..') ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('\0')
  ) {
    return { ok: false, error: 'Invalid filename' };
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return { ok: false, error: 'Invalid filename' };
  }
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return { ok: false, error: 'Unsupported file extension' };
  }
  return { ok: true };
}

function safeResolveUnder(baseDir, filename) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedPath = path.resolve(baseDir, filename);
  const prefix = resolvedBase.endsWith(path.sep)
    ? resolvedBase
    : `${resolvedBase}${path.sep}`;
  if (!resolvedPath.startsWith(prefix)) return null;
  return resolvedPath;
}

// =============================================
// Product normalization helpers
// =============================================
function omitLocalImageFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  delete obj.imageLocal;
  delete obj.smallImagesLocal;

  if (obj.mainImage && typeof obj.mainImage === 'object') {
    delete obj.mainImage.desktopLocal;
    delete obj.mainImage.mobileLocal;
  }

  if (Array.isArray(obj.smallImages)) {
    obj.smallImages = obj.smallImages.map(si => {
      if (!si || typeof si !== 'object' || Array.isArray(si)) return si;
      const copy = { ...si };
      delete copy.desktopLocal;
      delete copy.mobileLocal;
      return copy;
    });
  }

  if (Array.isArray(obj.images)) {
    obj.images = obj.images.map(img => {
      if (!img || typeof img !== 'object' || Array.isArray(img)) return img;
      const copy = { ...img };
      delete copy.desktopLocal;
      delete copy.mobileLocal;
      return copy;
    });
  }

  return obj;
}

function normalizeProductForClient(productDoc) {
  const obj =
    productDoc && typeof productDoc.toObject === 'function'
      ? productDoc.toObject()
      : { ...(productDoc || {}) };

  const fallbackNoImage = () => toAbsoluteApiUrl('/images/no-image.svg');

  const localAssetExistsForUrl = urlValue => {
    if (isProd) return true;

    if (!urlValue || typeof urlValue !== 'string') return true;
    const rel = toRelativeApiPath(urlValue);
    if (!rel || typeof rel !== 'string' || !rel.startsWith('/')) return true;

    const filename = path.basename(rel);
    if (!filename) return true;

    if (rel.startsWith('/uploads/') || rel.startsWith('/public/uploads/')) {
      const fpPrivate = safeResolveUnder(uploadsDir, filename);
      const fpPublic = safeResolveUnder(publicUploadsDir, filename);
      const existsPrivate = fpPrivate ? fs.existsSync(fpPrivate) : false;
      const existsPublic = fpPublic ? fs.existsSync(fpPublic) : false;
      return existsPrivate || existsPublic;
    }
    if (
      rel.startsWith('/smallImages/') ||
      rel.startsWith('/public/smallImages/')
    ) {
      const fpPrivate = safeResolveUnder(smallImagesDir, filename);
      const fpPublic = safeResolveUnder(publicSmallImagesDir, filename);
      const existsPrivate = fpPrivate ? fs.existsSync(fpPrivate) : false;
      const existsPublic = fpPublic ? fs.existsSync(fpPublic) : false;
      return existsPrivate || existsPublic;
    }

    return true;
  };

  // Phase 7: Handle unified images array
  if (Array.isArray(obj.images) && obj.images.length > 0) {
    obj.images = obj.images.map(img => {
      if (!img || typeof img !== 'object') return img;
      const normalized = {};
      if (img.desktop) normalized.desktop = toAbsoluteApiUrl(img.desktop);
      if (img.mobile) normalized.mobile = toAbsoluteApiUrl(img.mobile);
      if (img.publicDesktop) normalized.publicDesktop = toAbsoluteApiUrl(img.publicDesktop);
      if (img.publicMobile) normalized.publicMobile = toAbsoluteApiUrl(img.publicMobile);
      return normalized;
    });

    try {
      obj.images = obj.images.map(img => {
        if (!img || typeof img !== 'object') return img;
        const checked = { ...img };
        if (checked.desktop && !localAssetExistsForUrl(img.desktop))
          checked.desktop = fallbackNoImage();
        if (checked.mobile && !localAssetExistsForUrl(img.mobile))
          checked.mobile = fallbackNoImage();
        if (checked.publicDesktop && !localAssetExistsForUrl(img.publicDesktop))
          checked.publicDesktop = fallbackNoImage();
        if (checked.publicMobile && !localAssetExistsForUrl(img.publicMobile))
          checked.publicMobile = fallbackNoImage();
        return checked;
      });
    } catch {
      // ignore
    }

    if (!obj.mainImage || typeof obj.mainImage !== 'object') {
      const firstImage = obj.images[0];
      obj.mainImage = {};
      if (firstImage.desktop !== undefined) obj.mainImage.desktop = firstImage.desktop;
      if (firstImage.mobile !== undefined) obj.mainImage.mobile = firstImage.mobile;
      if (firstImage.publicDesktop !== undefined) obj.mainImage.publicDesktop = firstImage.publicDesktop;
      if (firstImage.publicMobile !== undefined) obj.mainImage.publicMobile = firstImage.publicMobile;
    }

    if (!Array.isArray(obj.smallImages) || obj.smallImages.length === 0) {
      obj.smallImages = obj.images.slice(1).map(img => {
        const clean = {};
        if (img.desktop !== undefined) clean.desktop = img.desktop;
        if (img.mobile !== undefined) clean.mobile = img.mobile;
        if (img.publicDesktop !== undefined) clean.publicDesktop = img.publicDesktop;
        if (img.publicMobile !== undefined) clean.publicMobile = img.publicMobile;
        return clean;
      });
    }

    if (!obj.image) {
      obj.image = obj.images[0]?.desktop || fallbackNoImage();
    }
    if (!obj.publicImage) {
      obj.publicImage = obj.images[0]?.publicDesktop || fallbackNoImage();
    }
    if (!obj.directImageUrl) {
      obj.directImageUrl = obj.images[0]?.desktop || fallbackNoImage();
    }
  }

  // Normalize core image fields
  obj.image = toAbsoluteApiUrl(obj.image);
  obj.publicImage = toAbsoluteApiUrl(obj.publicImage);
  obj.directImageUrl = toAbsoluteApiUrl(obj.directImageUrl);

  // mainImage object (old field handling)
  if (obj.mainImage && typeof obj.mainImage === 'object') {
    obj.mainImage = { ...obj.mainImage };
    obj.mainImage.desktop = toAbsoluteApiUrl(obj.mainImage.desktop);
    obj.mainImage.mobile = toAbsoluteApiUrl(obj.mainImage.mobile);
    obj.mainImage.publicDesktop = toAbsoluteApiUrl(obj.mainImage.publicDesktop);
    obj.mainImage.publicMobile = toAbsoluteApiUrl(obj.mainImage.publicMobile);
    delete obj.mainImage.desktopLocal;
    delete obj.mainImage.mobileLocal;
  }

  // Legacy field local asset checks
  if (!Array.isArray(obj.images) || obj.images.length === 0) {
    try {
      if (!localAssetExistsForUrl(obj.image)) obj.image = fallbackNoImage();
      if (obj.mainImage && typeof obj.mainImage === 'object') {
        if (!localAssetExistsForUrl(obj.mainImage.desktop))
          obj.mainImage.desktop = fallbackNoImage();
        if (!localAssetExistsForUrl(obj.mainImage.mobile))
          obj.mainImage.mobile = fallbackNoImage();
        if (!localAssetExistsForUrl(obj.mainImage.publicDesktop))
          obj.mainImage.publicDesktop = fallbackNoImage();
        if (!localAssetExistsForUrl(obj.mainImage.publicMobile))
          obj.mainImage.publicMobile = fallbackNoImage();
      }
    } catch {
      // ignore
    }
  }

  // smallImages (old field handling)
  if (Array.isArray(obj.smallImages)) {
    obj.smallImages = obj.smallImages.map(si => {
      if (typeof si === 'string') return toAbsoluteApiUrl(si);
      if (si && typeof si === 'object' && !Array.isArray(si)) {
        const normalized = { ...si };
        normalized.desktop = toAbsoluteApiUrl(normalized.desktop);
        normalized.mobile = toAbsoluteApiUrl(normalized.mobile);
        delete normalized.desktopLocal;
        delete normalized.mobileLocal;
        return normalized;
      }
      return si;
    });
  }

  omitLocalImageFields(obj);

  // Bilingual field backward compatibility
  if (obj.name_en && !obj.name) {
    obj.name = obj.name_en;
  }
  if (obj.description_en && !obj.description) {
    obj.description = obj.description_en;
  }
  if (obj.name && !obj.name_en) {
    obj.name_en = obj.name;
  }
  if (obj.description && !obj.description_en) {
    obj.description_en = obj.description;
  }
  if (obj.name_he === undefined || obj.name_he === null) {
    obj.name_he = '';
  }
  if (obj.description_he === undefined || obj.description_he === null) {
    obj.description_he = '';
  }

  return obj;
}

// =============================================
// Image processing (Sharp + Spaces upload)
// =============================================
const processImage = async (inputPath, filename, isMainImage = true) => {
  const outputDir = isMainImage ? uploadsDir : smallImagesDir;
  const publicDir = isMainImage ? publicUploadsDir : publicSmallImagesDir;
  const results = {};

  try {
    const baseName = path.parse(filename).name;
    const lowerFilename = filename.toLowerCase();
    const isRAW =
      lowerFilename.endsWith('.cr2') || lowerFilename.endsWith('.arw');

    const desktopFilename = `${baseName}-desktop.webp`;
    const mobileFilename = `${baseName}-mobile.webp`;

    const desktopPath = path.join(outputDir, desktopFilename);
    const mobilePath = path.join(outputDir, mobileFilename);
    const publicDesktopPath = path.join(publicDir, desktopFilename);
    const publicMobilePath = path.join(publicDir, mobileFilename);

    const sharpOptions = {
      failOnError: false,
      raw: isRAW
        ? {
            width: 5000,
            height: 4000,
            channels: 3,
            density: 300,
          }
        : undefined,
    };

    const safeUnlink = async filePath => {
      if (!filePath) return;
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // ignore
      }
    };

    const processWithFallback = async (
      inputPath,
      options,
      outputPath,
      size
    ) => {
      try {
        await sharp(inputPath, options)
          .rotate()
          .resize({
            width: size,
            withoutEnlargement: true,
            fit: 'inside',
          })
          .webp({
            quality: 85,
            effort: 6,
            smartSubsample: true,
            nearLossless: true,
          })
          .toFile(outputPath);
      } catch (error) {
        console.warn(
          `First attempt failed for ${filename}, trying fallback method:`,
          error.message
        );

        try {
          if (isRAW) {
            const tiffPath = path.join(outputDir, `${baseName}-temp.tiff`);
            await sharp(inputPath, options)
              .rotate()
              .toFormat('tiff')
              .toFile(tiffPath);

            await sharp(tiffPath)
              .resize({
                width: size,
                withoutEnlargement: true,
                fit: 'inside',
              })
              .webp({
                quality: 85,
                effort: 6,
                smartSubsample: true,
                nearLossless: true,
              })
              .toFile(outputPath);

            await safeUnlink(tiffPath);
          } else {
            throw error;
          }
        } catch (fallbackError) {
          console.error(
            `Both attempts failed for ${filename}:`,
            fallbackError.message
          );
          throw fallbackError;
        }
      }
    };

    await processWithFallback(inputPath, sharpOptions, desktopPath, 1200);
    await processWithFallback(inputPath, sharpOptions, mobilePath, 600);

    await fs.promises.copyFile(desktopPath, publicDesktopPath);
    await fs.promises.copyFile(mobilePath, publicMobilePath);

    // Upload variants to Spaces
    const keyPrefix = isMainImage ? 'products/main' : 'products/small';
    const keyStamp = Date.now();
    const desktopKey = `${keyPrefix}/${keyStamp}-${desktopFilename}`;
    const mobileKey = `${keyPrefix}/${keyStamp}-${mobileFilename}`;

    const desktopSpacesUrl = await uploadFileToSpaces(
      desktopKey,
      desktopPath,
      'image/webp'
    );
    const mobileSpacesUrl = await uploadFileToSpaces(
      mobileKey,
      mobilePath,
      'image/webp'
    );

    agentLog(
      'B',
      'imageHelpers.js:processImage',
      'processed & copied image variants',
      {
        isMainImage,
        desktopFilename,
        mobileFilename,
        desktopExists: fs.existsSync(desktopPath),
        mobileExists: fs.existsSync(mobilePath),
        publicDesktopExists: fs.existsSync(publicDesktopPath),
        publicMobileExists: fs.existsSync(publicMobilePath),
        spacesEnabled: !!desktopSpacesUrl && !!mobileSpacesUrl,
      }
    );

    results.desktop = {
      filename: desktopFilename,
      path: desktopPath,
      publicPath: publicDesktopPath,
      spacesKey: desktopKey,
      spacesUrl: desktopSpacesUrl,
    };
    results.mobile = {
      filename: mobileFilename,
      path: mobilePath,
      publicPath: publicMobilePath,
      spacesKey: mobileKey,
      spacesUrl: mobileSpacesUrl,
    };

    await safeUnlink(inputPath);

    return results;
  } catch (error) {
    try {
      const baseName = path.parse(filename).name;
      const desktopFilename = `${baseName}-desktop.webp`;
      const mobileFilename = `${baseName}-mobile.webp`;
      await fs.promises
        .unlink(path.join(outputDir, desktopFilename))
        .catch(() => {});
      await fs.promises
        .unlink(path.join(outputDir, mobileFilename))
        .catch(() => {});
      await fs.promises
        .unlink(path.join(publicDir, desktopFilename))
        .catch(() => {});
      await fs.promises
        .unlink(path.join(publicDir, mobileFilename))
        .catch(() => {});
    } catch {
      // ignore
    }
    if (process.env.NODE_ENV !== 'production') {
      console.error(`Error processing image ${filename}:`, error);
    } else {
      console.error('Error processing image:', {
        filename,
        message: error?.message || null,
      });
    }
    throw error;
  }
};

module.exports = {
  uploadsDir,
  smallImagesDir,
  publicUploadsDir,
  publicSmallImagesDir,
  noImageSvgPath,
  ALLOWED_IMAGE_EXTENSIONS,
  validateImageFilename,
  safeResolveUnder,
  omitLocalImageFields,
  normalizeProductForClient,
  processImage,
};
