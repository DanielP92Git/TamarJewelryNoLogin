/**
 * Image Data Audit Script
 *
 * Analyzes the current state of image fields in the products collection
 * to identify edge cases and data quality issues before migration.
 *
 * Usage: node backend/scripts/audit-image-data.js
 * Exit codes:
 *   0 - Safe to migrate (no corruption detected)
 *   1 - Data corruption found, fix before migration
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function auditImageData() {
  // Use same connection method as migrate-mongo
  const config = require('../migrate-mongo-config.js');
  const client = new MongoClient(config.mongodb.url, config.mongodb.options);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const products = db.collection('products');

    // Count total products
    const total = await products.countDocuments({});

    // Count field presence
    const hasMainImage = await products.countDocuments({ mainImage: { $exists: true } });
    const hasSmallImages = await products.countDocuments({ smallImages: { $exists: true } });
    const hasBoth = await products.countDocuments({
      mainImage: { $exists: true },
      smallImages: { $exists: true }
    });
    const hasNeither = await products.countDocuments({
      mainImage: { $exists: false },
      smallImages: { $exists: false }
    });

    // Count legacy fields
    const hasLegacyImage = await products.countDocuments({ image: { $exists: true } });
    const hasSmallImagesLocal = await products.countDocuments({ smallImagesLocal: { $exists: true } });

    // Check for data corruption
    const mainImageIsString = await products.countDocuments({
      mainImage: { $type: 'string' }
    });
    const smallImagesNotArray = await products.countDocuments({
      smallImages: { $exists: true, $not: { $type: 'array' } }
    });

    // Count products with empty/null values
    const emptyMainImage = await products.countDocuments({
      $or: [
        { 'mainImage.desktop': { $in: [null, ''] } },
        { 'mainImage.mobile': { $in: [null, ''] } }
      ]
    });
    const emptySmallImages = await products.countDocuments({
      $and: [
        { smallImages: { $exists: true } },
        { smallImages: { $size: 0 } }
      ]
    });

    // Print report
    console.log('\n=== IMAGE DATA AUDIT ===\n');
    console.log(`Total products: ${total}\n`);

    console.log('Field presence:');
    console.log(`  - Has mainImage: ${hasMainImage} (${((hasMainImage/total)*100).toFixed(1)}%)`);
    console.log(`  - Has smallImages: ${hasSmallImages} (${((hasSmallImages/total)*100).toFixed(1)}%)`);
    console.log(`  - Has both: ${hasBoth} (${((hasBoth/total)*100).toFixed(1)}%)`);
    console.log(`  - Has neither: ${hasNeither} (${((hasNeither/total)*100).toFixed(1)}%)`);
    console.log(`  - Has legacy image: ${hasLegacyImage} (${((hasLegacyImage/total)*100).toFixed(1)}%)`);
    console.log(`  - Has smallImagesLocal: ${hasSmallImagesLocal} (${((hasSmallImagesLocal/total)*100).toFixed(1)}%)\n`);

    console.log('Data quality:');
    console.log(`  - Empty mainImage URLs: ${emptyMainImage}`);
    console.log(`  - Empty smallImages arrays: ${emptySmallImages}\n`);

    // Check for corruption
    let corrupted = false;
    if (mainImageIsString > 0 || smallImagesNotArray > 0) {
      console.log('⚠️  DATA CORRUPTION DETECTED:\n');
      if (mainImageIsString > 0) {
        console.log(`  - ${mainImageIsString} products have mainImage as string (expected object)`);
      }
      if (smallImagesNotArray > 0) {
        console.log(`  - ${smallImagesNotArray} products have smallImages as non-array`);
      }
      console.log('\nFix corrupted data before migration!\n');
      corrupted = true;
    } else {
      console.log('✓ No data corruption detected\n');
    }

    // Sample products for manual review
    console.log('Sample products (first 3):\n');
    const sample = await products.find({}).limit(3).toArray();

    sample.forEach((p, i) => {
      console.log(`${i + 1}. Product #${p.id} - ${p.name}`);
      console.log(`   mainImage: ${p.mainImage ? `{${Object.keys(p.mainImage).join(', ')}}` : 'none'}`);
      console.log(`   smallImages: ${Array.isArray(p.smallImages) ? `array[${p.smallImages.length}]` : 'none'}`);

      // Show what the transformation would look like
      const images = mergeImageArraysPreview(p.mainImage, p.smallImages);
      console.log(`   → images (after migration): array[${images.length}]`);

      if (i < sample.length - 1) console.log('');
    });

    console.log('\n=== AUDIT COMPLETE ===\n');

    if (corrupted) {
      console.log('Status: ❌ BLOCKED - Fix corrupted data before migration');
      process.exit(1);
    } else {
      console.log('Status: ✓ Safe to migrate');
      process.exit(0);
    }

  } catch (error) {
    console.error('Audit failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

/**
 * Preview transformation logic (matches migration script)
 */
function mergeImageArraysPreview(mainImage, smallImages) {
  const images = [];

  // Handle mainImage (first in array = featured)
  if (mainImage && typeof mainImage === 'object' && Object.keys(mainImage).length > 0) {
    // Check if mainImage has actual content (not all null/empty)
    const hasContent = mainImage.desktop || mainImage.mobile ||
                      mainImage.publicDesktop || mainImage.publicMobile;

    if (hasContent) {
      images.push({
        desktop: mainImage.desktop || null,
        mobile: mainImage.mobile || null,
        desktopLocal: mainImage.desktopLocal || null,
        mobileLocal: mainImage.mobileLocal || null,
        publicDesktop: mainImage.publicDesktop || null,
        publicMobile: mainImage.publicMobile || null
      });
    }
  }

  // Handle smallImages (gallery)
  if (Array.isArray(smallImages) && smallImages.length > 0) {
    smallImages.forEach(img => {
      if (img && typeof img === 'object') {
        // Check if object has actual content
        const hasContent = img.desktop || img.mobile || img.publicDesktop || img.publicMobile;
        if (hasContent) {
          images.push({
            desktop: img.desktop || null,
            mobile: img.mobile || null,
            desktopLocal: img.desktopLocal || null,
            mobileLocal: img.mobileLocal || null,
            publicDesktop: img.publicDesktop || null,
            publicMobile: img.publicMobile || null
          });
        }
      } else if (typeof img === 'string' && img.trim()) {
        // Handle legacy string format
        images.push({
          desktop: img,
          mobile: img,
          desktopLocal: null,
          mobileLocal: null,
          publicDesktop: null,
          publicMobile: null
        });
      }
    });
  }

  return images;
}

// Run audit
auditImageData();
