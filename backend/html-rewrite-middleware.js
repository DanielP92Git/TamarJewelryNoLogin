/**
 * Express middleware to remove .html extensions from URLs
 * Use this if you're serving frontend files through your Express backend
 */

const path = require('path');
const fs = require('fs');

function htmlRewriteMiddleware(frontendPath) {
  return (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }

    // Skip static asset routes
    if (
      req.path.match(/\.(jpg|jpeg|png|gif|ico|css|js|svg|webp|woff|woff2|ttf|eot)$/i)
    ) {
      return next();
    }

    // If request has .html extension, redirect to clean URL
    if (req.path.endsWith('.html')) {
      const cleanPath = req.path.replace(/\.html$/, '');
      return res.redirect(301, cleanPath + (req.query ? '?' + req.url.split('?')[1] : ''));
    }

    // Try to serve the file with .html extension if it exists
    const htmlPath = path.join(frontendPath, req.path + '.html');
    const indexPath = path.join(frontendPath, req.path, 'index.html');
    const directPath = path.join(frontendPath, req.path);

    // Check if .html file exists
    if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
      return res.sendFile(htmlPath);
    }

    // Check if it's a directory with index.html
    if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
      return res.sendFile(indexPath);
    }

    // Check if it's a direct file
    if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
      return res.sendFile(directPath);
    }

    // For root path, try index.html
    if (req.path === '/' || req.path === '') {
      const rootIndex = path.join(frontendPath, 'index.html');
      if (fs.existsSync(rootIndex)) {
        return res.sendFile(rootIndex);
      }
    }

    next(); // Let other middleware handle it
  };
}

module.exports = htmlRewriteMiddleware;

