require('dotenv').config();
const { connectDb } = require('../config/db');
const { Product, PromoBanner } = require('../models');

async function populateTestData() {
  try {
    console.log('🚀 Starting test data population...\n');

    // Connect to database
    await connectDb();
    console.log('✅ Connected to MongoDB\n');

    // 1. Mark first 8 products as featured
    console.log('📦 Setting up Featured Products...');
    const products = await Product.find({ available: true, quantity: { $gt: 0 } })
      .limit(8)
      .sort({ date: -1 });

    if (products.length === 0) {
      console.log('⚠️  No products found in database. Skipping featured products.');
    } else {
      let featuredCount = 0;
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        await Product.updateOne(
          { _id: product._id },
          {
            $set: {
              featured: true,
              featuredOrder: i + 1,
              bestseller: i < 3, // Mark first 3 as bestsellers
            },
          }
        );
        console.log(
          `   ✓ Product #${product.id}: "${product.name}" - Featured (${i < 3 ? 'BESTSELLER' : 'regular'})`
        );
        featuredCount++;
      }
      console.log(`\n✅ Marked ${featuredCount} products as featured\n`);
    }

    // 2. Create a sample Promo Banner (optional - commented out by default)
    console.log('🎯 Setting up Promo Banner (optional)...');

    // First, deactivate any existing banners
    await PromoBanner.updateMany({}, { $set: { active: false } });

    const promoBanner = {
      active: true, // Set to true to show the banner
      badgeEng: 'LIMITED EDITION',
      badgeHeb: 'מהדורה מוגבלת',
      titleEng: 'Spring Collection 2025',
      titleHeb: 'קולקציית אביב 2025',
      descriptionEng: 'Handcrafted pieces inspired by nature. Limited to 50 pieces.',
      descriptionHeb: 'תכשיטים בעבודת יד בהשראת הטבע. מוגבל ל-50 יחידות.',
      ctaEng: 'Shop Now',
      ctaHeb: 'קנו עכשיו',
      ctaLink: '/html/categories/necklaces.html',
      imageUrl: 'https://picsum.photos/seed/spring-collection/600/750',
      expiresAt: new Date('2025-12-31'), // Expires end of year
    };

    await PromoBanner.create(promoBanner);
    console.log('   ✓ Created promotional banner');
    console.log('   ℹ️  Banner is ACTIVE and will show on homepage');
    console.log('   ℹ️  Using placeholder image from picsum.photos');
    console.log('   ℹ️  To hide banner: Set active: false in database\n');
    console.log('✅ Promo banner created\n');

    console.log('═══════════════════════════════════════════');
    console.log('✨ Test Data Population Complete!');
    console.log('═══════════════════════════════════════════\n');

    console.log('📋 Summary:');
    console.log(`   • Featured Products: ${products.length} products marked as featured`);
    console.log(`   • Promo Banner: 1 banner created (ACTIVE)\n`);

    console.log('🎨 Next Steps:');
    console.log('   1. Refresh your homepage to see all new sections populated');
    console.log('   2. Update promo banner image with actual product photo');
    console.log('   3. Set promo banner active: false when not needed\n');

    console.log('💡 To replace images:');
    console.log('   • Promo: Update imageUrl in promobanners collection\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating test data:', error);
    process.exit(1);
  }
}

// Run the script
populateTestData();
