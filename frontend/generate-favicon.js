/**
 * Favicon Generator Script
 *
 * This script converts the SVG favicon to ICO format.
 * Run with: node generate-favicon.js
 *
 * If you don't have the required packages, install them:
 * npm install sharp ico-endec --save-dev
 */

const fs = require('fs');
const path = require('path');

async function generateFavicon() {
  try {
    // Try using sharp (if available)
    const sharp = require('sharp');

    console.log('Generating favicon.ico from SVG...');

    const svgPath = path.join(__dirname, 'imgs', 'icons', 'favicon.svg');
    const icoPath = path.join(__dirname, 'favicon.ico');

    // Read SVG file
    const svgBuffer = fs.readFileSync(svgPath);

    // Convert SVG to multiple PNG sizes (ICO standard sizes)
    const sizes = [16, 32, 48];
    const pngBuffers = await Promise.all(
      sizes.map(size =>
        sharp(svgBuffer)
          .resize(size, size)
          .png()
          .toBuffer()
      )
    );

    // Try to use ico-endec if available
    try {
      const IcoEndec = require('ico-endec');
      const icoBuffer = IcoEndec.encode(pngBuffers);
      fs.writeFileSync(icoPath, icoBuffer);
      console.log('✓ favicon.ico created successfully at:', icoPath);
    } catch (err) {
      // If ico-endec is not available, just use the 32x32 PNG as .ico
      console.log('ico-endec not available, using 32x32 PNG as fallback...');
      fs.writeFileSync(icoPath, pngBuffers[1]); // 32x32 PNG
      console.log('✓ favicon.ico created (PNG format) at:', icoPath);
      console.log('Note: For proper ICO format, install: npm install ico-endec --save-dev');
    }

  } catch (error) {
    console.error('Error generating favicon:', error.message);
    console.log('\nManual conversion required:');
    console.log('1. Go to https://favicon.io/favicon-converter/');
    console.log('2. Upload: frontend/imgs/icons/favicon.svg');
    console.log('3. Download the generated favicon.ico');
    console.log('4. Save it to: frontend/favicon.ico');
    process.exit(1);
  }
}

generateFavicon();
