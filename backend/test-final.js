const fs = require('fs');

const text = fs.readFileSync('api-final.json', 'utf8');
const firstProductEnd = text.indexOf('},{"_id"');
const firstProductJson = text.substring(1, firstProductEnd + 1);
const p = JSON.parse(firstProductJson);

console.log('=== Task 1 Final Verification ===');
console.log('Product:', p.name);
console.log('✓ Has images array:', Array.isArray(p.images));
console.log('✓ Has mainImage:', !!p.mainImage);
console.log('✓ Has smallImages:', Array.isArray(p.smallImages));
console.log('✓ Images count:', p.images?.length);
console.log('✓ mainImage matches images[0]:', JSON.stringify(p.mainImage) === JSON.stringify(p.images?.[0]));

console.log('\n=== Structure Check ===');
console.log('mainImage keys:', Object.keys(p.mainImage || {}).sort());
console.log('images[0] keys:', Object.keys(p.images?.[0] || {}).sort());
