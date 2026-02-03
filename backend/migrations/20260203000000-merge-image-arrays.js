/**
 * Migration: Merge mainImage and smallImages into unified images array
 *
 * PURPOSE:
 *   Consolidates fragmented image fields (mainImage + smallImages) into a single
 *   sortable images array. First element = featured/main image.
 *
 * USAGE:
 *   Dry-run (preview without changes):
 *     cd backend
 *     DRY_RUN=true npx migrate-mongo up
 *
 *   Apply migration:
 *     npx migrate-mongo up
 *
 *   Rollback:
 *     npx migrate-mongo down
 *
 * TARGET STRUCTURE:
 *   images: [
 *     { desktop, mobile, desktopLocal, mobileLocal, publicDesktop, publicMobile },
 *     ...additional gallery images
 *   ]
 *
 * BACKWARDS COMPATIBILITY:
 *   Old fields (mainImage, smallImages) are NOT removed by this migration.
 *   They remain for backwards compatibility during frontend transition.
 *   A future migration will clean them up after frontend is updated.
 *
 * SAFETY:
 *   - Pre-migration validation blocks on corrupted data
 *   - Dry-run mode available for preview
 *   - Batched processing (1000 docs/batch) for memory efficiency
 *   - Full rollback capability via down() method
 */

module.exports = {
  async up(db) {
    const products = db.collection('products');
    const DRY_RUN = process.env.DRY_RUN === 'true';

    console.log(`\n${'='.repeat(60)}`);
    console.log('Migration: Merge Image Arrays');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'LIVE'}`);
    console.log('='.repeat(60) + '\n');

    // 1. PRE-MIGRATION VALIDATION
    console.log('Step 1: Pre-migration validation...');

    const total = await products.countDocuments({});
    console.log(`  Total products: ${total}`);

    // Check for data corruption
    const mainImageIsString = await products.countDocuments({
      mainImage: { $type: 'string' }
    });
    const smallImagesNotArray = await products.countDocuments({
      smallImages: { $exists: true, $not: { $type: 'array' } }
    });

    if (mainImageIsString > 0 || smallImagesNotArray > 0) {
      throw new Error(
        `Migration blocked: Data corruption detected!\n` +
        `  - mainImage as string: ${mainImageIsString}\n` +
        `  - smallImages not array: ${smallImagesNotArray}\n` +
        `Run audit script first: node backend/scripts/audit-image-data.js`
      );
    }
    console.log('  ✓ No corruption detected\n');

    // 2. CATEGORIZED PROCESSING
    console.log('Step 2: Processing products...');

    // Find products that need migration (have either mainImage or smallImages)
    const cursor = products.find({
      $or: [
        { mainImage: { $exists: true } },
        { smallImages: { $exists: true } }
      ]
    });

    const bulkOps = [];
    let processedCount = 0;
    let samplesShown = 0;

    for await (const product of cursor) {
      const images = mergeImageArrays(product.mainImage, product.smallImages);

      // Show sample transformations in dry-run mode
      if (DRY_RUN && samplesShown < 3) {
        console.log(`\n  Sample ${samplesShown + 1}: Product #${product.id} - ${product.name}`);
        console.log('  BEFORE:');
        console.log(`    mainImage: ${product.mainImage ? `{${Object.keys(product.mainImage).join(', ')}}` : 'none'}`);
        console.log(`    smallImages: ${Array.isArray(product.smallImages) ? `array[${product.smallImages.length}]` : 'none'}`);
        console.log('  AFTER:');
        console.log(`    images: array[${images.length}]`);
        if (images.length > 0) {
          console.log(`      [0]: ${JSON.stringify(images[0])}`);
          if (images.length > 1) {
            console.log(`      [1..${images.length - 1}]: ${images.length - 1} gallery images`);
          }
        }
        samplesShown++;
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $set: { images }
            // DO NOT $unset mainImage or smallImages - keep for backwards compatibility
          }
        }
      });

      processedCount++;

      // Process in batches to avoid memory issues (only in live mode)
      if (!DRY_RUN && bulkOps.length >= 1000) {
        await products.bulkWrite(bulkOps);
        console.log(`  Processed ${processedCount} products...`);
        bulkOps.length = 0; // Clear array
      }
    }

    if (DRY_RUN) {
      console.log(`\n${'='.repeat(60)}`);
      console.log('DRY RUN COMPLETE - No changes made to database');
      console.log('='.repeat(60));
      console.log(`\nWould migrate ${processedCount} products`);
      console.log(`Run without DRY_RUN=true to apply changes`);
      console.log('');
      return;
    }

    // 3. BULK OPERATIONS (live mode)
    console.log(`  Total to process: ${processedCount}`);

    if (bulkOps.length > 0) {
      await products.bulkWrite(bulkOps);
      console.log('  ✓ Batch processing complete\n');
    }

    // 4. VERIFICATION LOGGING
    console.log('Step 3: Verification...');
    const migratedCount = await products.countDocuments({ images: { $exists: true } });
    console.log(`  Products with images array: ${migratedCount}`);

    if (migratedCount !== processedCount) {
      console.warn(`  ⚠️  Warning: Expected ${processedCount} but found ${migratedCount}`);
    } else {
      console.log('  ✓ Migration verified\n');
    }

    console.log('='.repeat(60));
    console.log('Migration complete');
    console.log('='.repeat(60) + '\n');
  },

  async down(db) {
    const products = db.collection('products');

    console.log(`\n${'='.repeat(60)}`);
    console.log('Rollback: Split images array back to mainImage + smallImages');
    console.log('='.repeat(60) + '\n');

    console.log('Step 1: Finding products to rollback...');
    const cursor = products.find({ images: { $exists: true } });
    const bulkOps = [];
    let processedCount = 0;

    for await (const product of cursor) {
      const update = {
        $unset: { images: '' }
      };

      // Restore original structure if images array exists
      if (Array.isArray(product.images) && product.images.length > 0) {
        update.$set = {
          mainImage: product.images[0] || null,
          smallImages: product.images.slice(1)
        };
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: product._id },
          update
        }
      });

      processedCount++;

      // Process in batches
      if (bulkOps.length >= 1000) {
        await products.bulkWrite(bulkOps);
        console.log(`  Rolled back ${processedCount} products...`);
        bulkOps.length = 0;
      }
    }

    // Process remaining batch
    if (bulkOps.length > 0) {
      await products.bulkWrite(bulkOps);
    }

    console.log(`\nRollback complete: ${processedCount} products reverted`);
    console.log('='.repeat(60) + '\n');
  }
};

/**
 * Helper: Merge mainImage and smallImages into unified array
 *
 * @param {Object} mainImage - Main image object with responsive URLs
 * @param {Array} smallImages - Array of gallery image objects
 * @returns {Array} Unified images array with consistent structure
 */
function mergeImageArrays(mainImage, smallImages) {
  const images = [];

  // Handle mainImage (first in array = featured)
  if (mainImage && typeof mainImage === 'object' && Object.keys(mainImage).length > 0) {
    // Check if mainImage has actual content (not all null/empty)
    const hasContent = mainImage.desktop || mainImage.mobile ||
                      mainImage.publicDesktop || mainImage.publicMobile;

    if (hasContent) {
      // Keep responsive format structure - preserve all 6 fields
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
            // smallImages may not have public URLs, fill if present
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
