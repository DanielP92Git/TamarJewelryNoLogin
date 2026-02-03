const fs = require('fs');

const text = fs.readFileSync('api-response-full.json', 'utf8');
const firstProductEnd = text.indexOf('},{"_id"');
const firstProductJson = text.substring(1, firstProductEnd + 1);
const p = JSON.parse(firstProductJson);

console.log('=== mainImage ===');
console.log(JSON.stringify(p.mainImage, null, 2));

console.log('\n=== images[0] ===');
console.log(JSON.stringify(p.images?.[0], null, 2));

console.log('\n=== Difference ===');
console.log('mainImage has desktopLocal:', 'desktopLocal' in p.mainImage);
console.log('images[0] has desktopLocal:', p.images?.[0] && 'desktopLocal' in p.images[0]);
