const fs = require('fs');

const text = fs.readFileSync('api-response-full.json', 'utf8');
// Find first complete product
const firstProductEnd = text.indexOf('},{"_id"');
if (firstProductEnd === -1) {
  console.log('Could not parse, testing raw output');
  console.log('Has "images":', text.includes('"images":['));
  console.log('Has "mainImage":', text.includes('"mainImage":'));
  console.log('Has "smallImages":', text.includes('"smallImages":'));
} else {
  const firstProductJson = text.substring(1, firstProductEnd + 1);
  const p = JSON.parse(firstProductJson);
  
  console.log('Product name:', p.name);
  console.log('Has images array:', Array.isArray(p.images));
  console.log('Has mainImage:', !!p.mainImage);
  console.log('Has smallImages:', Array.isArray(p.smallImages));
  console.log('Images count:', p.images?.length || 0);
  console.log('mainImage matches images[0]:', JSON.stringify(p.mainImage) === JSON.stringify(p.images?.[0]));
  console.log('SmallImages count:', p.smallImages?.length || 0);
  
  console.log('\n=== Task 1 Verification ===');
  console.log('✓ API returns images array:', Array.isArray(p.images));
  console.log('✓ API returns mainImage:', !!p.mainImage);
  console.log('✓ API returns smallImages:', Array.isArray(p.smallImages));
  console.log('✓ mainImage derived from images[0]:', JSON.stringify(p.mainImage) === JSON.stringify(p.images?.[0]));
}
