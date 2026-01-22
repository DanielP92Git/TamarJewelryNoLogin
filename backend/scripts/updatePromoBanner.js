require('dotenv').config();
const { connectDb } = require('../config/db');
const { PromoBanner } = require('../models');

async function updatePromoBanner() {
  try {
    console.log('🎯 Updating Promo Banner with real image...\n');

    await connectDb();
    console.log('✅ Connected to MongoDB\n');

    // Update the active banner with a real image
    const result = await PromoBanner.updateOne(
      { active: true },
      {
        $set: {
          imageUrl: '/imgs/Hero-imgs/_MG_6467.jpg', // Beautiful jewelry image
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log('   ✓ Updated promo banner image');
      console.log('   📸 Using: /imgs/Hero-imgs/_MG_6467.jpg\n');
      console.log('✅ Promo banner updated with real image!');
      console.log('\n🔄 Refresh your homepage to see the updated banner.\n');
    } else {
      console.log('⚠️  No active banner found to update.');
      console.log('   Run populateTestData.js first to create a banner.\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating promo banner:', error);
    process.exit(1);
  }
}

updatePromoBanner();
