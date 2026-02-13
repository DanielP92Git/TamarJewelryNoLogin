/**
 * Migration: Add Bilingual Product Fields
 *
 * PURPOSE:
 *   Adds name_en, name_he, description_en, description_he fields to products.
 *   Populates English fields from existing name/description.
 *   Hebrew fields start empty (will be filled by translation in Phase 32).
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
 * BACKWARDS COMPATIBILITY:
 *   Legacy name and description fields are NOT removed by this migration.
 *   They remain required and functional throughout v1.5 milestone.
 *
 * SAFETY:
 *   - Idempotent: skips products already migrated (name_en exists)
 *   - Dry-run mode available for preview
 *   - Batched processing (1000 docs/batch) for memory efficiency
 *   - Full rollback capability via down() method
 */

module.exports = {
  async up(db) {
    const products = db.collection('products');
    const DRY_RUN = process.env.DRY_RUN === 'true';

    console.log(`\n${'='.repeat(60)}`);
    console.log('Migration: Add Bilingual Product Fields');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'LIVE'}`);
    console.log('='.repeat(60) + '\n');

    // 1. COUNT TOTAL PRODUCTS
    console.log('Step 1: Analyzing products...');
    const total = await products.countDocuments({});
    console.log(`  Total products: ${total}`);

    // 2. FIND PRODUCTS NEEDING MIGRATION
    // Idempotent check: skip if name_en already exists and is not empty
    const needMigration = await products.find({
      $or: [
        { name_en: { $exists: false } },
        { name_en: null },
        { name_en: '' }
      ]
    }).toArray();

    console.log(`  Products needing migration: ${needMigration.length}`);

    if (needMigration.length === 0) {
      console.log('  ✓ All products already migrated\n');
      console.log('='.repeat(60));
      console.log('Migration is idempotent — nothing to do');
      console.log('='.repeat(60) + '\n');
      return;
    }

    // 3. SHOW SAMPLE TRANSFORMATIONS
    console.log('\nStep 2: Sample transformations...');
    const sampleCount = Math.min(3, needMigration.length);
    for (let i = 0; i < sampleCount; i++) {
      const product = needMigration[i];
      console.log(`\n  Sample ${i + 1}: Product #${product.id} - ${product.name}`);
      console.log('  BEFORE:');
      console.log(`    name: "${product.name || ''}"`);
      console.log(`    description: "${(product.description || '').substring(0, 50)}${product.description?.length > 50 ? '...' : ''}"`);
      console.log('  AFTER:');
      console.log(`    name_en: "${product.name || ''}"`);
      console.log(`    name_he: ""`);
      console.log(`    description_en: "${(product.description || '').substring(0, 50)}${product.description?.length > 50 ? '...' : ''}"`);
      console.log(`    description_he: ""`);
    }
    console.log('');

    if (DRY_RUN) {
      console.log('='.repeat(60));
      console.log('DRY RUN COMPLETE - No changes made to database');
      console.log('='.repeat(60));
      console.log(`\nWould migrate ${needMigration.length} products`);
      console.log(`Run without DRY_RUN=true to apply changes`);
      console.log('');
      return;
    }

    // 4. BUILD BULK OPERATIONS
    console.log('Step 3: Migrating products...');
    const bulkOps = [];

    for (const product of needMigration) {
      bulkOps.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $set: {
              name_en: product.name || '',
              name_he: '',
              description_en: product.description || '',
              description_he: ''
            }
            // DO NOT $unset name or description - keep for backwards compatibility
          }
        }
      });
    }

    // 5. EXECUTE IN BATCHES
    let processed = 0;
    const BATCH_SIZE = 1000;

    for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
      const batch = bulkOps.slice(i, i + BATCH_SIZE);
      await products.bulkWrite(batch);
      processed += batch.length;
      console.log(`  Processed ${processed}/${bulkOps.length} products...`);
    }

    console.log('  ✓ Migration complete\n');

    // 6. VERIFICATION
    console.log('Step 4: Verification...');
    const migratedCount = await products.countDocuments({
      name_en: { $exists: true, $ne: null, $ne: '' }
    });
    console.log(`  Products with name_en: ${migratedCount}`);
    console.log(`  Total products: ${total}`);

    if (migratedCount !== total) {
      console.warn(`  ⚠️  Warning: Expected ${total} but found ${migratedCount} with name_en`);
    } else {
      console.log('  ✓ All products migrated successfully\n');
    }

    console.log('='.repeat(60));
    console.log('Migration complete');
    console.log('='.repeat(60) + '\n');
  },

  async down(db) {
    const products = db.collection('products');

    console.log(`\n${'='.repeat(60)}`);
    console.log('Rollback: Remove Bilingual Product Fields');
    console.log('='.repeat(60) + '\n');

    console.log('Step 1: Removing bilingual fields...');

    // Remove all four bilingual fields
    const result = await products.updateMany(
      {},
      {
        $unset: {
          name_en: '',
          name_he: '',
          description_en: '',
          description_he: ''
        }
      }
    );

    console.log(`  Removed bilingual fields from ${result.modifiedCount} products`);
    console.log('  ✓ Rollback complete\n');

    console.log('='.repeat(60));
    console.log('Rollback complete');
    console.log('='.repeat(60) + '\n');
  }
};
