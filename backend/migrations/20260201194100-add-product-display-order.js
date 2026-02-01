module.exports = {
  async up(db) {
    const products = db.collection('products');

    // 1. Validate: Check all products have category field
    const noCategoryCount = await products.countDocuments({
      $or: [
        { category: { $exists: false } },
        { category: null },
        { category: '' }
      ]
    });
    if (noCategoryCount > 0) {
      throw new Error(
        `Migration blocked: ${noCategoryCount} products missing category field. ` +
        `Fix before running migration.`
      );
    }

    // 2. Get distinct categories
    const categories = await products.distinct('category');
    console.log(`Found ${categories.length} categories: ${categories.join(', ')}`);

    // 3. For each category, assign displayOrder based on createdAt (newest first)
    for (const category of categories) {
      const categoryProducts = await products
        .find({ category })
        .sort({ date: -1 })  // Newest first (using 'date' field from schema)
        .toArray();

      if (categoryProducts.length === 0) continue;

      const bulkOps = categoryProducts.map((product, index) => ({
        updateOne: {
          filter: { _id: product._id },
          update: { $set: { displayOrder: (index + 1) * 10 } }  // Gap-based: 10, 20, 30...
        }
      }));

      await products.bulkWrite(bulkOps);
      console.log(`  ${category}: ${categoryProducts.length} products assigned displayOrder`);
    }

    // 4. Create compound index (ESR rule: Equality, Sort, Range)
    await products.createIndex(
      { category: 1, displayOrder: 1, available: 1 },
      { name: 'category_displayOrder_available_idx' }
    );
    console.log('Created compound index: category_displayOrder_available_idx');

    // 5. Log total
    const totalWithOrder = await products.countDocuments({ displayOrder: { $exists: true } });
    console.log(`Migration complete: ${totalWithOrder} products now have displayOrder`);
  },

  async down(db) {
    const products = db.collection('products');

    // 1. Drop the compound index
    try {
      await products.dropIndex('category_displayOrder_available_idx');
      console.log('Dropped index: category_displayOrder_available_idx');
    } catch (err) {
      console.log('Index may not exist, continuing...');
    }

    // 2. Remove displayOrder field from all products
    const result = await products.updateMany(
      {},
      { $unset: { displayOrder: '' } }
    );
    console.log(`Rollback complete: removed displayOrder from ${result.modifiedCount} products`);
  }
};
