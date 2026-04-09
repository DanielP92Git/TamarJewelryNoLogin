const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { Product, Settings } = require('../models');
const { fetchUser, requireAdmin } = require('../middleware/auth');
const { runExchangeRateUpdate } = require('../jobs/exchangeRateJob');
const { translateText, translateProductFields } = require('../services/translationService');
const { DB_TO_URL_CATEGORY } = require('./ssrDynamic');
const { invalidateBulkProducts } = require('../cache/invalidation');

const isProd = process.env.NODE_ENV === 'production';

const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15m
  limit: Number(process.env.RATE_LIMIT_ADMIN_MAX || 120),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
});

// =============================================
// Discount Management
// =============================================

// Public endpoint for frontend to fetch discount settings
router.get('/discount-settings', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json({
      success: true,
      global_discount_percentage: settings.global_discount_percentage,
      discount_active: settings.discount_active,
      discount_label: settings.discount_label,
    });
  } catch (error) {
    console.error('Error fetching discount settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch discount settings',
    });
  }
});

router.post(
  '/batch-update-discount',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      const discountPercentage = parseFloat(req.body.discountPercentage);

      if (
        isNaN(discountPercentage) ||
        discountPercentage < 0 ||
        discountPercentage > 100
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid discount percentage. Must be between 0 and 100',
        });
      }

      // Get or create settings
      const settings = await Settings.getSettings();
      settings.global_discount_percentage = discountPercentage;
      settings.discount_active = discountPercentage > 0;
      settings.updatedAt = new Date();
      await settings.save();

      // Fetch all products
      const products = await Product.find({});
      let updatedCount = 0;

      // Update each product
      for (const product of products) {
        // If original prices don't exist, save current prices as original
        if (!product.original_ils_price && product.ils_price) {
          product.original_ils_price = product.ils_price;
        }
        if (!product.original_usd_price && product.usd_price) {
          product.original_usd_price = product.usd_price;
        }

        // Calculate discounted prices
        if (product.original_ils_price) {
          product.ils_price = Math.round(
            product.original_ils_price * (1 - discountPercentage / 100)
          );
        }
        if (product.original_usd_price) {
          product.usd_price = Math.round(
            product.original_usd_price * (1 - discountPercentage / 100)
          ); // Round to whole number for USD
        }

        product.discount_percentage = discountPercentage;
        await product.save();
        updatedCount++;
      }

      if (!isProd) {
        console.log(
          `Batch update completed: ${updatedCount} products updated with ${discountPercentage}% discount`
        );
      }

      res.json({
        success: true,
        message: `Successfully updated ${updatedCount} products with ${discountPercentage}% discount`,
        updatedCount,
        discountPercentage,
      });
    } catch (error) {
      console.error('Error in batch update discount:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to batch update discount',
        error: isProd ? undefined : error.message,
      });
    }
  }
);

router.post(
  '/remove-discount',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      // Update settings
      const settings = await Settings.getSettings();
      settings.global_discount_percentage = 0;
      settings.discount_active = false;
      settings.updatedAt = new Date();
      await settings.save();

      // Fetch all products
      const products = await Product.find({});
      let updatedCount = 0;

      // Revert prices to original
      for (const product of products) {
        // Ensure original prices are set (for old products that might not have them)
        if (!product.original_ils_price && product.ils_price) {
          product.original_ils_price = product.ils_price;
        }
        if (!product.original_usd_price && product.usd_price) {
          product.original_usd_price = product.usd_price;
        }

        // Restore prices from original
        if (product.original_ils_price) {
          product.ils_price = product.original_ils_price;
        }
        if (product.original_usd_price) {
          product.usd_price = product.original_usd_price;
        }
        product.discount_percentage = 0;
        await product.save();
        updatedCount++;
      }

      if (!isProd) {
        console.log(
          `Discount removal completed: ${updatedCount} products reverted to original prices`
        );
      }

      res.json({
        success: true,
        message: `Successfully removed discount from ${updatedCount} products`,
        updatedCount,
      });
    } catch (error) {
      console.error('Error removing discount:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove discount',
        error: isProd ? undefined : error.message,
      });
    }
  }
);

// =============================================
// Exchange Rate
// =============================================

router.post(
  '/admin/update-exchange-rate',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      await runExchangeRateUpdate();
      res.json({
        success: true,
        message: 'Exchange rate and product prices updated successfully',
      });
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// =============================================
// Translation Management
// =============================================

// Single-field translation endpoint for admin forms
router.post(
  '/admin/translate',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      const { text, targetLang, sourceLang } = req.body;

      // Validate text
      if (!text || typeof text !== 'string' || text.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Text is required and must be a non-empty string',
        });
      }

      // Validate targetLang
      if (targetLang !== 'en' && targetLang !== 'he') {
        return res.status(400).json({
          success: false,
          error: 'Target language must be "en" or "he"',
        });
      }

      // Validate character limit
      if (text.length > 30000) {
        return res.status(400).json({
          success: false,
          error: 'Text exceeds maximum 30,000 character limit',
        });
      }

      // Warn on large text but proceed
      if (text.length > 5000 && !isProd) {
        console.warn(
          `Translation request with ${text.length} characters (target: ${targetLang})`
        );
      }

      // Call translation service
      const result = await translateText(text, targetLang, sourceLang);

      // Build success response
      const response = {
        success: true,
        translatedText: result.translatedText,
      };

      // Include detected source language if available
      if (result.detectedSourceLanguage) {
        response.detectedSourceLanguage = result.detectedSourceLanguage;
      }

      res.json(response);
    } catch (error) {
      console.error('Translation error:', error);
      res.status(500).json({
        success: false,
        error: 'Translation failed. Please try again or enter manually.',
      });
    }
  }
);

// Bulk translation with SSE progress streaming
router.get(
  '/admin/translate/bulk',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // SSE helper
      function sendEvent(event, data) {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }

      // Handle client disconnect (cancellation support)
      let cancelled = false;
      req.on('close', () => {
        cancelled = true;
        if (!isProd) console.log('Bulk translation cancelled by client');
      });

      // Query products needing translation
      const allProducts = await Product.find({}).lean();
      const products = allProducts.filter((p) => {
        const needsNameHe = p.name_en && !p.name_he;
        const needsNameEn = p.name_he && !p.name_en;
        const needsDescHe = p.description_en && !p.description_he;
        const needsDescEn = p.description_he && !p.description_en;
        return needsNameHe || needsNameEn || needsDescHe || needsDescEn;
      });

      const total = products.length;

      // Send initial count
      sendEvent('start', { total });

      // If no products need translation
      if (total === 0) {
        sendEvent('complete', {
          translated: 0,
          failed: 0,
          skipped: 0,
          failedProducts: [],
        });
        res.end();
        return;
      }

      // Process products
      let translated = 0;
      let failed = 0;
      let skipped = 0;
      const failedProducts = [];
      const translatedSlugs = [];
      const translatedCategories = [];
      let lastKeepalive = Date.now();

      for (let i = 0; i < products.length; i++) {
        // Check for cancellation
        if (cancelled) {
          if (!isProd) console.log('Breaking loop due to cancellation');
          break;
        }

        const product = products[i];
        const productName =
          product.name || product.name_en || product.name_he || 'Unknown';

        // Send progress event
        sendEvent('progress', {
          current: i + 1,
          total,
          productName,
          productId: product.id,
        });

        // Build fields object for translation
        const fields = {
          name_en: product.name_en || '',
          name_he: product.name_he || '',
          description_en: product.description_en || '',
          description_he: product.description_he || '',
        };

        try {
          // Translate product fields
          const translations = await translateProductFields(fields);

          // If translations returned, save to DB
          if (translations && Object.keys(translations).length > 0) {
            await Product.updateOne({ _id: product._id }, { $set: translations });

            sendEvent('success', {
              productId: product.id,
              productName,
              translations,
            });
            translated++;
            if (product.slug) translatedSlugs.push(product.slug);
            if (product.category) translatedCategories.push(product.category);
          } else {
            // All fields already filled
            skipped++;
          }
        } catch (error) {
          // Per-product error: log, track, continue
          console.error(
            `Translation failed for product ${product.id} (${productName}):`,
            error.message
          );
          failed++;
          failedProducts.push({
            id: product.id,
            name: productName,
            error: error.message,
          });
          sendEvent('error', {
            productId: product.id,
            productName,
            error: error.message,
          });
        }

        // Rate limiting delay (100ms between products)
        await new Promise((resolve) => setTimeout(resolve, 100));

        // SSE keepalive every 30 seconds
        const now = Date.now();
        if (now - lastKeepalive > 30000) {
          res.write(': keepalive\n\n');
          lastKeepalive = now;
        }
      }

      // Invalidate cache for all translated products
      if (translatedSlugs.length > 0) {
        const urlCategories = translatedCategories
          .map(cat => DB_TO_URL_CATEGORY[cat])
          .filter(Boolean);
        invalidateBulkProducts(translatedSlugs, urlCategories);
      }

      // Send completion event
      sendEvent('complete', {
        translated,
        failed,
        skipped,
        failedProducts,
      });

      res.end();
    } catch (error) {
      // Outer error handler
      console.error('Bulk translation error:', error);
      try {
        res.write(
          `event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`
        );
        res.end();
      } catch (writeError) {
        // If we can't write to response, just log
        console.error('Failed to send error event:', writeError);
      }
    }
  }
);

// =============================================
// Backup Status
// =============================================

router.get(
  '/admin/backup-status',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  (req, res) => {
    const { execFileSync } = require('child_process');
    const mongodumpPath = process.env.MONGODUMP_PATH || 'mongodump';
    const mongorestorePath = process.env.MONGORESTORE_PATH || 'mongorestore';

    let mongodumpVersion = null;
    let mongodumpFound = false;
    let mongodumpResolved = null;
    let mongodumpError = null;

    let mongorestoreVersion = null;
    let mongorestoreFound = false;
    let mongorestoreResolved = null;
    let mongorestoreError = null;

    // Check mongodump
    try {
      const versionOutput = execFileSync(mongodumpPath, ['--version'], { encoding: 'utf8', timeout: 5000 }).trim();
      mongodumpVersion = versionOutput.split('\n')[0];
      mongodumpFound = true;
      try {
        mongodumpResolved = execFileSync('which', [mongodumpPath], { encoding: 'utf8', timeout: 5000 }).trim();
      } catch {
        mongodumpResolved = mongodumpPath;
      }
    } catch (err) {
      mongodumpError = err.message;
    }

    // Check mongorestore
    try {
      const restoreOutput = execFileSync(mongorestorePath, ['--version'], { encoding: 'utf8', timeout: 5000 }).trim();
      mongorestoreVersion = restoreOutput.split('\n')[0];
      mongorestoreFound = true;
      try {
        mongorestoreResolved = execFileSync('which', [mongorestorePath], { encoding: 'utf8', timeout: 5000 }).trim();
      } catch {
        mongorestoreResolved = mongorestorePath;
      }
    } catch (err) {
      mongorestoreError = err.message;
    }

    res.json({
      mongodump: {
        found: mongodumpFound,
        path: mongodumpPath,
        resolvedPath: mongodumpResolved,
        version: mongodumpVersion,
        error: mongodumpError,
      },
      mongorestore: {
        found: mongorestoreFound,
        path: mongorestorePath,
        resolvedPath: mongorestoreResolved,
        version: mongorestoreVersion,
        error: mongorestoreError,
      },
      scheduling: {
        strategy: 'in-process node-cron',
        distributedLock: false,
        note: 'Single App Platform instance — no concurrent backup risk (D-01, D-02)',
      },
      envConfig: {
        BACKUP_BUCKET: process.env.BACKUP_BUCKET ? '[SET]' : '[NOT SET]',
        BACKUP_SPACES_KEY: process.env.BACKUP_SPACES_KEY ? '[SET]' : '[NOT SET]',
        BACKUP_SPACES_SECRET: process.env.BACKUP_SPACES_SECRET ? '[SET]' : '[NOT SET]',
        BACKUP_SPACES_ENDPOINT: process.env.BACKUP_SPACES_ENDPOINT || '[NOT SET]',
        BACKUP_SPACES_REGION: process.env.BACKUP_SPACES_REGION || '[NOT SET]',
        BACKUP_SPACES_PREFIX: process.env.BACKUP_SPACES_PREFIX || 'backups/',
        BACKUP_RETENTION_COUNT: process.env.BACKUP_RETENTION_COUNT || '14',
        MONGODUMP_PATH: process.env.MONGODUMP_PATH || '(default: mongodump)',
        MONGORESTORE_PATH: process.env.MONGORESTORE_PATH || '(default: mongorestore)',
      },
    });
  }
);

module.exports = { router, adminRateLimiter };
