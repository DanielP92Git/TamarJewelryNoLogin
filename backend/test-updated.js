const fs = require('fs');

const text = fs.readFileSync('api-response-updated.json', 'utf8');
const firstProductEnd = text.indexOf('},{"_id"');
const firstProductJson = text.substring(1, firstProductEnd + 1);
const p = JSON.parse(firstProductJson);

console.log('Product name:', p.name);
console.log('\n=== mainImage ===');
console.log(JSON.stringify(p.mainImage, null, 2));
console.log('\n=== images[0] ===');
console.log(JSON.stringify(p.images?.[0], null, 2));

console.log('\n=== Final Verification ===');
console.log('✓ Has images array:', Array.isArray(p.images));
console.log('✓ Has mainImage:', !!p.mainImage);
console.log('✓ Has smallImages:', Array.isArray(p.smallImages));
console.log('✓ mainImage matches images[0]:', JSON.stringify(p.mainImage) === JSON.stringify(p.images?.[0]));
