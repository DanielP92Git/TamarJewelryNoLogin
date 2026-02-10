const slugify = require('slugify');

module.exports = {
  async up(db) {
    const products = db.collection('products');

    // 1. Ensure sparse unique index (idempotent: createIndex is a no-op if exists)
    await products.createIndex(
      { slug: 1 },
      { unique: true, sparse: true, name: 'product_slug_unique_idx' }
    );
    console.log('Ensured unique sparse index on slug field');

    // 2. Find products without slugs (idempotent: skips already-slugged products)
    const needSlugs = await products.find({
      $or: [
        { slug: { $exists: false } },
        { slug: null },
        { slug: '' }
      ]
    }).toArray();

    console.log(`Found ${needSlugs.length} products needing slugs`);

    if (needSlugs.length === 0) {
      console.log('All products already have slugs. Migration is idempotent — nothing to do.');
      return;
    }

    // 3. Load existing slugs to detect collisions
    const existingSlugs = new Set();
    const withSlugs = await products.find(
      { slug: { $exists: true, $ne: null, $ne: '' } },
      { projection: { slug: 1 } }
    ).toArray();
    for (const p of withSlugs) {
      existingSlugs.add(p.slug);
    }

    // 4. Generate slugs with counter-based collision handling
    let generated = 0;
    for (const product of needSlugs) {
      const name = product.name || `product-${product.id || product._id}`;
      const baseSlug = slugify(name, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g
      });

      let finalSlug = baseSlug;
      let counter = 1;

      // Check against both existing DB slugs and newly assigned slugs
      while (existingSlugs.has(finalSlug)) {
        counter++;
        finalSlug = `${baseSlug}-${counter}`;
      }

      // Mark as used
      existingSlugs.add(finalSlug);

      // Update product
      await products.updateOne(
        { _id: product._id },
        { $set: { slug: finalSlug } }
      );
      generated++;
    }

    console.log(`Migration complete: ${generated} products now have slugs`);

    // 5. Verify all products have slugs
    const remaining = await products.countDocuments({
      $or: [
        { slug: { $exists: false } },
        { slug: null },
        { slug: '' }
      ]
    });
    if (remaining > 0) {
      console.warn(`WARNING: ${remaining} products still without slugs`);
    }
  },

  async down(db) {
    const products = db.collection('products');

    // Drop index
    try {
      await products.dropIndex('product_slug_unique_idx');
      console.log('Dropped slug index');
    } catch (err) {
      console.log('Index may not exist, continuing...');
    }

    // Remove slug field from all products
    const result = await products.updateMany(
      {},
      { $unset: { slug: '' } }
    );
    console.log(`Rollback complete: removed slug from ${result.modifiedCount} products`);
  }
};
