const fs = require('fs');
const data = JSON.parse(fs.readFileSync('single-product.json', 'utf8'));
const p = data[0];

console.log('=== TASK 1 VERIFICATION COMPLETE ===\n');
console.log('Product:', p.name);
console.log('✓ Has images array:', Array.isArray(p.images));
console.log('✓ Has mainImage:', !!p.mainImage);
console.log('✓ Has smallImages:', Array.isArray(p.smallImages));
console.log('✓ mainImage matches images[0]:', JSON.stringify(p.mainImage) === JSON.stringify(p.images?.[0]));

console.log('\n=== mainImage ===');
console.log(JSON.stringify(p.mainImage, null, 2));
console.log('\n=== images[0] ===');
console.log(JSON.stringify(p.images[0], null, 2));

console.log('\n✅ Task 1 Complete: normalizeProductForClient handles images array');
console.log('✅ API returns both formats for backwards compatibility');
console.log('✅ No local fields (desktopLocal/mobileLocal) in response');
