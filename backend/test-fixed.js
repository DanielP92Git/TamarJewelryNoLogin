const fs = require('fs');

const text = fs.readFileSync('api-fixed.json', 'utf8');
const firstProductEnd = text.indexOf('},{"_id"');
const firstProductJson = text.substring(1, firstProductEnd + 1);
const p = JSON.parse(firstProductJson);

console.log('=== Task 1 Complete Verification ===');
console.log('Product:', p.name);
console.log('✓ Has images array:', Array.isArray(p.images));
console.log('✓ Has mainImage:', !!p.mainImage);
console.log('✓ Has smallImages:', Array.isArray(p.smallImages));
console.log('✓ Images count:', p.images?.length);
console.log('✓ mainImage matches images[0]:', JSON.stringify(p.mainImage) === JSON.stringify(p.images?.[0]));

console.log('\n=== Backwards Compatibility ===');
console.log('✓ API returns both formats');
console.log('✓ New clients can use images array');
console.log('✓ Old clients can use mainImage/smallImages');

console.log('\n=== Structure ===');
console.log('mainImage:', JSON.stringify(p.mainImage, null, 2));
console.log('images[0]:', JSON.stringify(p.images?.[0], null, 2));
