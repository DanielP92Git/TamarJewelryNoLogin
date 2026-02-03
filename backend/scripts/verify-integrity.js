const config = require('../migrate-mongo-config');
const { MongoClient } = require('mongodb');

(async () => {
  const url = config.mongodb.url;
  const client = await MongoClient.connect(url);
  const db = client.db();

  console.log('=== POST-MIGRATION DATA INTEGRITY CHECK ===\n');

  // Count verification
  const total = await db.collection('products').countDocuments({});
  const withImages = await db.collection('products').countDocuments({images: {$exists: true, $ne: []}});
  const withEmptyImages = await db.collection('products').countDocuments({images: []});
  const withMainImage = await db.collection('products').countDocuments({mainImage: {$exists: true}});
  const withSmallImages = await db.collection('products').countDocuments({smallImages: {$exists: true}});

  console.log('COUNT VERIFICATION:');
  console.log(`  Total products: ${total}`);
  console.log(`  With images array (non-empty): ${withImages}`);
  console.log(`  With empty images array: ${withEmptyImages}`);
  console.log(`  With mainImage (old field): ${withMainImage}`);
  console.log(`  With smallImages (old field): ${withSmallImages}`);

  const totalWithImages = withImages + withEmptyImages;
  if (totalWithImages === total) {
    console.log(`  ✓ All products have images array`);
  } else {
    console.log(`  ✗ MISMATCH: ${totalWithImages} != ${total}`);
  }

  // Structure verification - check multiple products
  console.log('\nSTRUCTURE VERIFICATION (5 samples):');
  const samples = await db.collection('products').find({images: {$exists: true, $ne: []}}).limit(5).toArray();

  samples.forEach((product, i) => {
    console.log(`\n  Sample ${i + 1}: Product #${product.id} - ${product.name}`);
    console.log(`    Images count: ${product.images.length}`);
    if (product.images.length > 0) {
      const firstImage = product.images[0];
      const keys = Object.keys(firstImage);
      console.log(`    First image keys: ${keys.join(', ')}`);
      console.log(`    Has content: ${!!(firstImage.desktop || firstImage.mobile || firstImage.publicDesktop || firstImage.publicMobile)}`);
    }
    console.log(`    Has mainImage (old): ${!!product.mainImage}`);
    console.log(`    Has smallImages (old): ${!!product.smallImages}`);
  });

  // Edge case verification
  console.log('\n\nEDGE CASE VERIFICATION:');

  // Products that had only mainImage
  const hadOnlyMain = await db.collection('products').find({
    mainImage: {$exists: true},
    $or: [
      {smallImages: {$exists: false}},
      {smallImages: []},
      {smallImages: null}
    ]
  }).limit(1).toArray();

  if (hadOnlyMain.length > 0) {
    const p = hadOnlyMain[0];
    console.log(`\n  Product with only mainImage: ${p.name}`);
    console.log(`    Images array length: ${p.images.length}`);
    console.log(`    Expected: 1 (mainImage only)`);
  }

  // Products with no mainImage but have smallImages
  const noMainWithSmall = await db.collection('products').find({
    $or: [
      {mainImage: {$exists: false}},
      {mainImage: null},
      {mainImage: {}}
    ],
    smallImages: {$exists: true, $ne: [], $ne: null}
  }).limit(1).toArray();

  if (noMainWithSmall.length > 0) {
    const p = noMainWithSmall[0];
    console.log(`\n  Product with no mainImage but has smallImages: ${p.name}`);
    console.log(`    Images array length: ${p.images.length}`);
    console.log(`    SmallImages length: ${p.smallImages.length}`);
    console.log(`    First image in array has content: ${!!(p.images[0]?.desktop || p.images[0]?.mobile)}`);
  }

  console.log('\n\n=== INTEGRITY CHECK COMPLETE ===');
  console.log(`\nStatus: ${totalWithImages === total ? '✓ PASSED' : '✗ FAILED'}`);

  await client.close();
})();
