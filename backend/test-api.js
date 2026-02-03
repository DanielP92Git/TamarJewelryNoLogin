const fs = require('fs');

const data = JSON.parse(fs.readFileSync('api-response.json', 'utf8'));
const p = data[0];

console.log('Product name:', p.name);
console.log('Has images array:', Array.isArray(p.images));
console.log('Has mainImage:', !!p.mainImage);
console.log('Has smallImages:', Array.isArray(p.smallImages));
console.log('Images count:', p.images?.length || 0);
console.log('mainImage matches images[0]:', JSON.stringify(p.mainImage) === JSON.stringify(p.images?.[0]));
console.log('SmallImages count:', p.smallImages?.length || 0);

console.log('\n=== Verification Results ===');
console.log('✓ API returns images array:', Array.isArray(p.images));
console.log('✓ API returns mainImage:', !!p.mainImage);
console.log('✓ API returns smallImages:', Array.isArray(p.smallImages));
console.log('✓ mainImage derived from images[0]:', JSON.stringify(p.mainImage) === JSON.stringify(p.images?.[0]));
