# DigitalOcean Setup Guide - Removing .html Extensions

## Option 1: DigitalOcean App Platform (Recommended)

If you're using **DigitalOcean App Platform**:

1. **In the DigitalOcean Dashboard:**
   - Go to your App → Settings → Routes
   - Add a route for your frontend static site
   - The platform will automatically handle clean URLs

2. **Or use the app.yaml configuration:**
   - The `app.yaml` file has been created in the `frontend/` directory
   - Update it with your repository details
   - DigitalOcean will use this configuration

## Option 2: Nginx Configuration (If using Droplet/VPS)

If you're deploying on a **DigitalOcean Droplet** with Nginx:

1. **Copy the nginx.conf:**
   - The `nginx.conf` file has been created in `frontend/`
   - Copy it to your server's Nginx sites-available directory
   - Or add the rewrite rules to your existing Nginx config

2. **Update the root path:**
   - Change `/var/www/html` to your actual frontend directory path

3. **Test and reload:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Option 3: Express Middleware (If serving frontend through backend)

If your Express backend serves the frontend files:

1. **Add the middleware to backend/index.js:**
   ```javascript
   const htmlRewriteMiddleware = require('./html-rewrite-middleware');
   const frontendPath = path.join(__dirname, '../frontend');
   
   // Add before other routes
   app.use(htmlRewriteMiddleware(frontendPath));
   
   // Then serve static files
   app.use(express.static(frontendPath));
   ```

## Option 4: Apache .htaccess (If using Apache)

The `.htaccess` file has been created in `frontend/` directory.
- Works automatically if your server uses Apache
- No additional configuration needed

## Testing

After deployment, test these URLs:
- ✅ `/contact-me` should work
- ✅ `/html/about` should work  
- ✅ `/contact-me.html` should redirect to `/contact-me`
- ✅ All pages should load correctly

## Important Notes

- **Update internal links** (optional but recommended):
  - Change `href="/html/contact-me.html"` to `href="/html/contact-me"`
  - This prevents unnecessary redirects
  - The server will still work with `.html` links, but clean URLs are better

- **DigitalOcean App Platform** typically handles this automatically, but you may need to configure routes in the dashboard.

