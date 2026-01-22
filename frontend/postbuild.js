/**
 * Post-build script to copy favicon.ico to root of dist
 * This ensures browsers can find /favicon.ico even though Parcel hashes the filename
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const targetFavicon = path.join(distDir, 'favicon.ico');

// Find the hashed favicon.ico file
try {
  const files = fs.readdirSync(distDir);
  const faviconFiles = files.filter(f => f.startsWith('favicon.') && f.endsWith('.ico') && f !== 'favicon.ico');

  if (faviconFiles.length > 0) {
    const hashedFavicon = path.join(distDir, faviconFiles[0]);
    fs.copyFileSync(hashedFavicon, targetFavicon);
    console.log('✓ Copied', faviconFiles[0], '→ favicon.ico');
  } else {
    // Fallback: copy from source if build didn't include it
    const sourceFavicon = path.join(__dirname, 'favicon.ico');

    if (fs.existsSync(sourceFavicon)) {
      fs.copyFileSync(sourceFavicon, targetFavicon);
      console.log('✓ Copied source favicon.ico to dist');
    } else {
      console.warn('⚠ No favicon.ico found in build output or source');
    }
  }
} catch (error) {
  console.error('Error copying favicon:', error.message);
  process.exit(1);
}
