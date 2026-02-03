const config = require('../migrate-mongo-config');
const { MongoClient } = require('mongodb');

(async () => {
  const url = config.mongodb.url;
  const client = await MongoClient.connect(url);
  const db = client.db();

  const total = await db.collection('products').countDocuments({});
  const withImages = await db.collection('products').countDocuments({images: {$exists: true}});
  const withEmptyImages = await db.collection('products').countDocuments({images: []});
  const withMainImage = await db.collection('products').countDocuments({mainImage: {$exists: true}});

  console.log('Total products:', total);
  console.log('With images array:', withImages);
  console.log('With empty images array:', withEmptyImages);
  console.log('With mainImage (old field):', withMainImage);

  // Sample product check
  const product = await db.collection('products').findOne({images: {$exists: true, $ne: []}});
  if (product) {
    console.log('\nSample product:', product.name);
    console.log('Images count:', product.images.length);
    console.log('First image keys:', product.images[0] ? Object.keys(product.images[0]).join(', ') : 'none');
    console.log('Has mainImage:', !!product.mainImage);
    console.log('Has smallImages:', !!product.smallImages);
  }

  await client.close();
})();
