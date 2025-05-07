require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const sharp = require('sharp');

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const baseUrl =
  process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

// Log PayPal configuration for debugging
console.log('PayPal Configuration:');
console.log('  API URL:', baseUrl);
console.log('  Client ID exists:', !!PAYPAL_CLIENT_ID);
console.log('  Client Secret exists:', !!PAYPAL_CLIENT_SECRET);

// =============================================
// Initial Setup & Configuration
// =============================================
const app = express();

// CORS Configuration
const allowedOrigins = [
  `${process.env.HOST}`,
  `${process.env.API_URL}`,
  `${process.env.ADMIN_URL}`,
  `${process.env.FULLHOST}`,
  'http://127.0.0.1:5500',
  'http://localhost:5500', // Added for local admin dashboard
];

console.log('Allowed origins:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    console.log('Request origin:', origin);
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      console.warn('Origin not allowed by CORS:', origin);
      // For development, allow all origins
      // callback(null, true);
      // In production, use this instead:
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'auth-token',
    'X-Requested-With',
  ],
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '50mb' }));

// CORS Headers Middleware - Enhanced for better cross-origin support
function headers(req, res, next) {
  // Allow requests from any origin during development
  res.header('Access-Control-Allow-Origin', '*');

  // Allow specific methods
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');

  // Allow more headers
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, auth-token'
  );

  // Allow credentials
  res.header('Access-Control-Allow-Credentials', 'true');

  // Preflight request handling
  if (req.method === 'OPTIONS') {
    console.log(
      'Received OPTIONS request from:',
      req.headers.origin || 'unknown'
    );
    return res.status(200).end();
  }

  next();
}

app.options('*', headers);
app.use(headers);

// =============================================
// Database Models
// =============================================
mongoose.connect(`${process.env.MONGO_URL}`);

const Users = mongoose.model('Users', {
  name: { type: String },
  email: {
    type: String,
    required: true,
    unique: true,
    match:
      /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/,
  },
  password: { type: String, required: true },
  cartData: { type: Object },
  Date: { type: Date, default: Date.now },
  userType: { type: String, default: 'user' },
});

const Product = mongoose.model('Product', {
  id: { type: Number, required: true },
  name: { type: String, required: true },
  // Legacy image field
  image: { type: String },
  // Main image with responsive versions
  mainImage: {
    desktop: { type: String },
    mobile: { type: String },
    desktopLocal: { type: String },
    mobileLocal: { type: String },
    publicDesktop: { type: String },
    publicMobile: { type: String },
  },
  // Small images array with responsive versions
  smallImages: [
    {
      desktop: { type: String },
      mobile: { type: String },
      desktopLocal: { type: String },
      mobileLocal: { type: String },
    },
  ],
  // Additional image URLs for better accessibility
  imageLocal: { type: String },
  publicImage: { type: String },
  directImageUrl: { type: String },
  // Product details
  category: { type: String, required: true },
  description: { type: String },
  quantity: { type: Number, default: 0 },
  ils_price: { type: Number },
  usd_price: { type: Number },
  date: { type: Date, default: Date.now },
  available: { type: Boolean, default: true },
  security_margin: { type: Number },
});

// =============================================
// Authentication Middleware
// =============================================
const authUser = async function (req, res, next) {
  try {
    let user = await Users.findOne({ email: req.body.email });
    if (user) {
      const userTypeCheck =
        user.userType === 'user' || user.userType === 'admin';
      if (userTypeCheck) {
        bcrypt.compare(req.body.password, user.password, (err, result) => {
          if (err || !result) {
            return res
              .status(401)
              .json({ success: false, errors: 'Auth Failed' });
          }
          console.log('Authenticated successfully');
          req.user = user;
          next();
        });
      } else {
        throw new Error('No access');
      }
    } else {
      res.status(404).json({
        errors:
          'No user found. Please check your email or password and try again',
      });
    }
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ errors: 'Auth User - Internal Server Error' });
  }
};

const fetchUser = async (req, res, next) => {
  const token = req.header('auth-token');
  if (!token) {
    res.status(401).send({ errors: 'Please authenticate using valid token' });
  } else {
    try {
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      req.user = decoded.user;
      next();
    } catch (err) {
      res
        .status(401)
        .send({ errors: 'Please authenticate using a valid token', err });
    }
  }
};

// =============================================
// File Upload Configuration
// =============================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'mainImage') {
      cb(null, './uploads');
    }
    if (file.fieldname === 'smallImages') {
      cb(null, './smallImages');
    }
  },
  filename: function (req, file, cb) {
    return cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

// Add file filter to accept CR2 files
const fileFilter = (req, file, cb) => {
  // Accept CR2 files and common image formats
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/cr2',
    'application/octet-stream',
  ];
  if (
    allowedTypes.includes(file.mimetype) ||
    file.originalname.toLowerCase().endsWith('.cr2')
  ) {
    cb(null, true);
  } else {
    cb(new Error('File type not supported'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
});

// =============================================
// Static File Serving
// =============================================
const uploadsDir = path.join(__dirname, 'uploads');
const smallImagesDir = path.join(__dirname, 'smallImages');
const publicUploadsDir = path.join(__dirname, '../public/uploads');
const publicSmallImagesDir = path.join(__dirname, '../public/smallImages');

// Ensure all directories exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

if (!fs.existsSync(smallImagesDir)) {
  fs.mkdirSync(smallImagesDir, { recursive: true });
  console.log('Created smallImages directory:', smallImagesDir);
}

if (!fs.existsSync(publicUploadsDir)) {
  fs.mkdirSync(publicUploadsDir, { recursive: true });
  console.log('Created public uploads directory:', publicUploadsDir);
}

if (!fs.existsSync(publicSmallImagesDir)) {
  fs.mkdirSync(publicSmallImagesDir, { recursive: true });
  console.log('Created public smallImages directory:', publicSmallImagesDir);
}

// Enhanced static file serving options with better CORS support
const staticOptions = {
  setHeaders: (res, path) => {
    // Allow requests from any origin
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Allow specific methods
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

    // Allow credentials
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Set long cache time for static assets
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    // Disable content security restrictions
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

    // Set content type header based on file extension
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    }
  },
  maxAge: 31536000, // 1 year in seconds
};

// Configure static file serving for all directories with custom middleware
app.use('/uploads', (req, res, next) => {
  console.log(`[Static] Accessing: ${req.path} from uploads dir`);
  express.static(uploadsDir, staticOptions)(req, res, next);
});

app.use('/api/uploads', (req, res, next) => {
  console.log(`[Static] Accessing: ${req.path} from api/uploads`);
  express.static(uploadsDir, staticOptions)(req, res, next);
});

app.use('/smallImages', express.static(smallImagesDir, staticOptions));
app.use('/api/smallImages', express.static(smallImagesDir, staticOptions));

// Add public directory routes
app.use('/public/uploads', express.static(publicUploadsDir, staticOptions));
app.use('/api/public/uploads', express.static(publicUploadsDir, staticOptions));
app.use(
  '/public/smallImages',
  express.static(publicSmallImagesDir, staticOptions)
);
app.use(
  '/api/public/smallImages',
  express.static(publicSmallImagesDir, staticOptions)
);

// Also serve from root path
app.use(
  '/images',
  express.static(path.join(__dirname, '../public/images'), staticOptions)
);
app.use(
  '/api/images',
  express.static(path.join(__dirname, '../public/images'), staticOptions)
);

// Direct file access route for debugging
app.get('/check-file/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);

  fs.access(filePath, fs.constants.F_OK, err => {
    if (err) {
      console.log(`File ${filename} does not exist in uploads directory`);
      res.status(404).send({
        exists: false,
        message: `File ${filename} not found`,
        searchPath: filePath,
      });
    } else {
      console.log(`File ${filename} exists in uploads directory`);
      res.send({
        exists: true,
        path: filePath,
        size: fs.statSync(filePath).size,
        url: `${process.env.API_URL}/uploads/${filename}`,
      });
    }
  });
});

// Direct image serving endpoint that bypasses static middleware
app.get('/direct-image/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, err => {
    if (err) {
      console.log(
        `Direct image access: File ${filename} not found at ${filePath}`
      );
      return res.status(404).send('Image not found');
    }

    console.log(`Direct image access: Serving ${filename} from ${filePath}`);

    // Set content type based on file extension
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filename.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filename.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
    }

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', err => {
      console.error(`Error streaming file ${filename}:`, err);
      res.status(500).send('Error reading file');
    });

    fileStream.pipe(res);
  });
});

// Add options handler for the direct image endpoint
app.options('/direct-image/:filename', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(204).end();
});

// =============================================
// Payment Processing Setup
// =============================================
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function handleCheckoutSession(session) {
  const productId = session.metadata.productId;
  if (productId) {
    const product = await Product.findOne({ id: productId });
    if (product) {
      product.quantity -= 1;
      await product.save();
      let newQuantity = product.quantity;
      console.log(
        `Product ${productId} quantity reduced. New quantity: ${newQuantity}`
      );
      if (newQuantity == 0) {
        const response = await fetch(`${process.env.API_URL}/removeproduct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: productId,
          }),
        });

        const data = await response.json();
        if (data.success) {
          console.log(`Product with id: ${data.id} is deleted from database`);
        }
      }
    }
  } else {
    console.error('Product not found');
  }
}

const generateAccessToken = async () => {
  try {
    console.log('========= PAYPAL AUTH DEBUG =========');
    console.log(
      'Client ID length:',
      PAYPAL_CLIENT_ID ? PAYPAL_CLIENT_ID.length : 'missing'
    );
    console.log(
      'Client Secret length:',
      PAYPAL_CLIENT_SECRET ? PAYPAL_CLIENT_SECRET.length : 'missing'
    );
    console.log('Base URL:', baseUrl);

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      console.error('Missing PayPal credentials:', {
        clientIdExists: !!PAYPAL_CLIENT_ID,
        clientSecretExists: !!PAYPAL_CLIENT_SECRET,
      });
      throw new Error('MISSING_API_CREDENTIALS');
    }

    // In Node.js, btoa is not available directly, so we use Buffer
    const auth = Buffer.from(
      `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
    ).toString('base64');
    console.log(
      'Auth token generated successfully. Making API request to PayPal...'
    );

    const tokenUrl = `${baseUrl}/v1/oauth2/token`;
    console.log('Token URL:', tokenUrl);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: 'grant_type=client_credentials',
    });

    console.log('PayPal token response status:', response.status);

    const responseText = await response.text();
    console.log('PayPal response body:', responseText);

    if (!response.ok) {
      throw new Error(
        `PayPal token request failed: ${response.status} ${responseText}`
      );
    }

    try {
      const data = JSON.parse(responseText);
      if (!data.access_token) {
        throw new Error('No access token received from PayPal');
      }

      console.log('PayPal access token obtained successfully');
      return data.access_token;
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError);
      throw new Error(`Failed to parse PayPal response: ${responseText}`);
    }
  } catch (error) {
    console.error('Failed to generate Access Token:', error);
    return null; // Return null instead of throwing to prevent crashing the entire request
  }
};

const createOrder = async cart => {
  try {
    console.log(
      'shopping cart information passed from the frontend createOrder() callback:',
      cart
    );

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      throw new Error('Invalid cart data received');
    }

    let totalAmount = cart
      .reduce((total, item) => {
        let itemTotal =
          parseFloat(item.unit_amount.value) * parseInt(item.quantity);
        return total + itemTotal;
      }, 0)
      .toFixed(2);
    const currencyData = cart[0].unit_amount.currency_code;
    console.log('Attempting to get PayPal access token...');
    const accessToken = await generateAccessToken();

    console.log('Access token received:', accessToken ? 'Success' : 'Failed');

    if (!accessToken) {
      throw new Error('Failed to generate PayPal access token');
    }

    const url = `${baseUrl}/v2/checkout/orders`;
    console.log('PayPal API URL:', url);

    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currencyData,
            value: +totalAmount,
            breakdown: {
              item_total: {
                currency_code: currencyData,
                value: +totalAmount,
              },
            },
          },
          items: cart.map(item => ({
            name: item.name,
            unit_amount: {
              currency_code: item.unit_amount.currency_code,
              value: item.unit_amount.value,
            },
            quantity: item.quantity,
          })),
        },
      ],
      application_context: {
        return_url: `${process.env.API_URL}/complete-order`,
        cancel_url: `${process.env.HOST}/html/cart.html`,
        user_action: 'PAY_NOW',
        brand_name: 'Tamar Kfir Jewelry',
      },
    };

    console.log('PayPal order payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return handleResponse(response);
  } catch (error) {
    console.error('Error creating PayPal order:', error);
    throw error;
  }
};

const captureOrder = async orderID => {
  const accessToken = await generateAccessToken();
  const url = `${baseUrl}/v2/checkout/orders/${orderID}/capture`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return handleResponse(response);
};

async function handleResponse(response) {
  try {
    const jsonResponse = await response.json();
    return {
      jsonResponse,
      httpStatusCode: response.status,
    };
  } catch (error) {
    console.error(error);
    const errorMessage = await response.text();
    throw new Error(errorMessage);
  }
}

// =============================================
// API Endpoints
// =============================================

// Authentication Endpoints
app.post('/verify-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const user = await Users.findById(decoded.user.id);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

app.post('/login', authUser, async (req, res) => {
  try {
    const adminCheck = req.user.userType;
    const data = {
      user: {
        id: req.user._id.toString(),
        email: req.user.email,
        userType: req.user.userType,
      },
    };
    const token = jwt.sign(data, process.env.JWT_KEY);
    if (token) {
      console.log('Token created for user:', req.user.email);
      res.json({
        success: true,
        token,
        adminCheck,
        message: 'Login successful',
      });
    }
  } catch (err) {
    console.error('Login Error🔥 :', err);
    res.status(500).json({
      success: false,
      errors: 'Login - Internal Server Error',
      message: err.message,
    });
  }
});

app.post('/signup', async (req, res) => {
  let findUser = await Users.findOne({ email: req.body.email });
  if (findUser) {
    return res.status(400).json({
      success: false,
      errors: 'Existing user found with the same Email address',
    });
  }

  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }

  bcrypt.hash(req.body.password, 10, (err, hash) => {
    if (err) {
      return res.status(500).json({
        errors: err,
      });
    } else {
      const user = new Users({
        name: req.body.username,
        email: req.body.email,
        password: hash,
        cartData: cart,
      });
      user
        .save()
        .then(() => {
          res.status(201).json({
            message: 'User Created!',
          });
        })
        .catch(err => {
          res.status(500).json({
            errors: err,
          });
        });
    }
  });
});

// Product Management Endpoints
app.post('/addproduct', async (req, res) => {
  try {
    console.log('\n=== Product Creation Request Details ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const products = await Product.find({}).sort({ id: -1 }).limit(1);
    const nextId = products.length > 0 ? Number(products[0].id) + 1 : 1;

    const securityMargin = parseFloat(req.body.security_margin) || 5;
    const usdPrice = Number(req.body.oldPrice) || 0;
    const ilsPrice = Math.round(usdPrice * 3.7 * (1 + securityMargin / 100));

    // Get image URLs from the upload response
    const mainImageUrls = req.body.mainImage || {};
    const smallImageUrls = req.body.smallImages || [];

    console.log('\n=== Image Data Received ===');
    console.log('Main Image URLs:', JSON.stringify(mainImageUrls, null, 2));
    console.log('Small Image URLs:', JSON.stringify(smallImageUrls, null, 2));

    // Create the product with new image structure
    const product = new Product({
      id: nextId,
      name: req.body.name,
      // Legacy image field (using desktop version as default)
      image: mainImageUrls.desktop || mainImageUrls.publicDesktop || '',
      imageLocal: mainImageUrls.desktopLocal || '',
      publicImage: mainImageUrls.publicDesktop || '',
      // Store all image variations
      mainImage: mainImageUrls,
      // Store small images with all variations
      smallImages: smallImageUrls,
      // Also store the direct image URL for better accessibility
      directImageUrl: mainImageUrls.desktop
        ? `${process.env.API_URL}/direct-image/${mainImageUrls.desktop
            .split('/')
            .pop()}`
        : null,
      // Product details
      category: req.body.category,
      quantity: Number(req.body.quantity) || 0,
      description: req.body.description || '',
      ils_price: ilsPrice,
      usd_price: usdPrice,
      security_margin: securityMargin,
    });

    console.log('\n=== Product Data Before Save ===');
    console.log(
      JSON.stringify(
        {
          id: product.id,
          name: product.name,
          image: product.image,
          imageLocal: product.imageLocal,
          publicImage: product.publicImage,
          mainImage: product.mainImage,
          smallImages: product.smallImages,
          directImageUrl: product.directImageUrl,
          category: product.category,
        },
        null,
        2
      )
    );

    await product.save();
    console.log('\n=== Product Saved Successfully ===');
    console.log('Product ID:', nextId);

    res.json({
      success: true,
      id: nextId,
      name: req.body.name,
    });
  } catch (error) {
    console.error('\n=== Product Creation Error ===');
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Update the old updateproduct endpoint to handle formdata and file uploads
app.post(
  '/updateproduct/:id',
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'smallImages', maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const productId = req.params.id;
      console.log(`Updating product ${productId}`);
      console.log('Form data:', req.body);

      // Find the product
      const product = await Product.findOne({ id: Number(productId) });
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      // Extract form data
      const {
        name,
        usd_price,
        ils_price,
        description,
        category,
        quantity,
        security_margin,
      } = req.body;

      // Update basic product information
      product.name = name;
      product.usd_price = Number(usd_price) || 0;
      product.ils_price = Number(ils_price) || 0;
      product.description = description || '';
      product.category = category;
      product.quantity = Number(quantity) || 0;
      product.security_margin = Number(security_margin) || 5;

      // Handle file uploads if present
      let mainImageUpdated = false;
      let smallImagesUpdated = false;

      // Process main image if uploaded
      if (req.files && req.files.mainImage && req.files.mainImage.length > 0) {
        console.log('Processing new main image');
        const mainImage = req.files.mainImage[0];

        try {
          const mainImageResults = await processImage(
            mainImage.path,
            mainImage.filename,
            true
          );

          // Get the base URLs
          const productionBaseUrl =
            process.env.API_URL || 'https://tamarkfir.com/api';
          const localBaseUrl = 'http://localhost:4000';
          const baseUrl =
            process.env.NODE_ENV === 'production'
              ? productionBaseUrl
              : localBaseUrl;

          // Update main image URLs
          product.mainImage = {
            desktop: `${baseUrl}/uploads/${mainImageResults.desktop.filename}`,
            mobile: `${baseUrl}/uploads/${mainImageResults.mobile.filename}`,
            desktopLocal: `${localBaseUrl}/uploads/${mainImageResults.desktop.filename}`,
            mobileLocal: `${localBaseUrl}/uploads/${mainImageResults.mobile.filename}`,
            publicDesktop: `${baseUrl}/public/uploads/${mainImageResults.desktop.filename}`,
            publicMobile: `${baseUrl}/public/uploads/${mainImageResults.mobile.filename}`,
          };

          // Update legacy fields
          product.image = product.mainImage.desktop;
          product.imageLocal = product.mainImage.desktopLocal;
          product.publicImage = product.mainImage.publicDesktop;

          mainImageUpdated = true;
          console.log('Main image updated');
        } catch (error) {
          console.error('Error processing main image:', error);
          // Continue without updating image if processing fails
        }
      }

      // Process small images if uploaded
      if (
        req.files &&
        req.files.smallImages &&
        req.files.smallImages.length > 0
      ) {
        console.log(
          `Processing ${req.files.smallImages.length} new small images`
        );

        try {
          const smallImagesResults = await Promise.all(
            req.files.smallImages.map(async image => {
              return await processImage(image.path, image.filename, false);
            })
          );

          // Get the base URLs
          const productionBaseUrl =
            process.env.API_URL || 'https://tamarkfir.com/api';
          const localBaseUrl = 'http://localhost:4000';
          const baseUrl =
            process.env.NODE_ENV === 'production'
              ? productionBaseUrl
              : localBaseUrl;

          // Create small image URL objects
          const newSmallImages = smallImagesResults.map(result => ({
            desktop: `${baseUrl}/smallImages/${result.desktop.filename}`,
            mobile: `${baseUrl}/smallImages/${result.mobile.filename}`,
            desktopLocal: `${localBaseUrl}/smallImages/${result.desktop.filename}`,
            mobileLocal: `${localBaseUrl}/smallImages/${result.mobile.filename}`,
          }));

          // Append new small images to existing ones
          if (!product.smallImages) {
            product.smallImages = [];
          }

          product.smallImages = [...product.smallImages, ...newSmallImages];

          smallImagesUpdated = true;
          console.log('Small images updated');
        } catch (error) {
          console.error('Error processing small images:', error);
          // Continue without updating small images if processing fails
        }
      }

      // Save the updated product
      await product.save();
      console.log('Product updated successfully');

      res.json({
        success: true,
        message: 'Product updated successfully',
        mainImageUpdated,
        smallImagesUpdated,
      });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// Keep the old endpoint for backward compatibility
app.post('/updateproduct', async (req, res) => {
  try {
    const id = req.body.id;
    const securityMargin = parseFloat(req.body.security_margin) || 5;
    const exchangeRate = 3.7;

    const usdPrice = Number(req.body.oldPrice) || 0;
    const ilsPrice = Math.round(
      usdPrice * exchangeRate * (1 + securityMargin / 100)
    );

    const updatedFields = {
      name: req.body.name,
      ils_price: ilsPrice,
      usd_price: usdPrice,
      security_margin: securityMargin,
      description: req.body.description,
      quantity: req.body.quantity,
      category: req.body.category,
    };

    let product = await Product.findOne({ id: id });

    product.name = updatedFields.name;
    product.usd_price = updatedFields.usd_price;
    product.ils_price = updatedFields.ils_price;
    product.security_margin = updatedFields.security_margin;
    product.description = updatedFields.description;
    product.quantity = updatedFields.quantity;
    product.category = updatedFields.category;

    await product.save();

    res.json({
      success: true,
    });
  } catch (error) {
    console.error('Error in legacy updateproduct:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.post('/removeproduct', async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log('Removed');
  res.json({
    success: true,
    id: req.body.id,
    name: req.body.name,
  });
});

app.get('/allproducts', async (req, res) => {
  let products = await Product.find({});
  console.log('All Products Fetched');
  res.send(products);
});

app.post('/productsByCategory', async (req, res) => {
  const category = req.body.category;
  const page = req.body.page;
  const limit = 6;

  try {
    console.log('Fetching products for category:', category);
    const skip = (page - 1) * limit;

    let products = await Product.find({ category: category })
      .skip(skip)
      .limit(limit);

    if (!products || products.length === 0) {
      return res.json([]);
    }

    res.json(products);
  } catch (err) {
    console.error('Error fetching products by category:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/chunkProducts', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  let category = req.body.checkCategory;
  try {
    const products = await Product.find({ category: category })
      .skip(skip)
      .limit(limit);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products:', err });
  }
});

app.post('/getAllProductsByCategory', async (req, res) => {
  const category = req.body.category;

  try {
    console.log('Fetching all products for category:', category);

    // Get all products for the category without pagination
    const products = await Product.find({ category: category });
    const total = products.length;

    if (!products || products.length === 0) {
      return res.json({
        products: [],
        total: 0,
      });
    }

    res.json({
      products,
      total,
    });
  } catch (err) {
    console.error('Error fetching all products by category:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Cart Management Endpoints
app.post('/getcart', fetchUser, async (req, res) => {
  console.log('GetCart');
  let userData = await Users.findOne({ _id: req.user.id });
  res.json(userData.cartData);
});

app.post('/addtocart', fetchUser, async (req, res) => {
  console.log('added', req.body.itemId);
  let userData = await Users.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemId] += 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send('Added!');
});

app.post('/removefromcart', fetchUser, async (req, res) => {
  console.log('removed', req.body.itemId);
  let userData = await Users.findOne({ _id: req.user.id });
  if (userData.cartData[req.body.itemId] > 0)
    userData.cartData[req.body.itemId] -= 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send('Removed!');
});

app.post('/removeAll', fetchUser, async (req, res) => {
  console.log('removed all');
  let userData = await Users.findOne({ _id: req.user.id });
  for (let i = 0; i < 300; i++) {
    userData.cartData[i] = 0;
  }
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send('Removed All!');
});

// File Upload Endpoint
app.post(
  '/upload',
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'smallImages', maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      console.log('\n=== Upload Request Details ===');
      console.log('Files received:', JSON.stringify(req.files, null, 2));

      // Check if we received any files
      if (!req.files || Object.keys(req.files).length === 0) {
        console.error('No files were uploaded.');
        return res.status(400).json({
          error: 'No files were uploaded',
          success: false,
        });
      }

      const mainImage = req.files.mainImage ? req.files.mainImage[0] : null;
      const smallImages = req.files.smallImages || [];

      if (!mainImage) {
        console.error('No main image provided');
        return res.status(400).json({
          error: 'No main image provided',
          success: false,
        });
      }

      console.log('Processing main image:', mainImage.path);

      // Process main image
      const mainImageResults = await processImage(
        mainImage.path,
        mainImage.filename,
        true
      );
      console.log('Main image processing results:', mainImageResults);

      // Process small images
      const smallImagesResults = await Promise.all(
        smallImages.map(async image => {
          return await processImage(image.path, image.filename, false);
        })
      );
      console.log('Small images processing results:', smallImagesResults);

      // Get the base URLs
      const productionBaseUrl =
        process.env.API_URL || 'https://tamarkfir.com/api';
      const localBaseUrl = 'http://localhost:4000';
      const baseUrl =
        process.env.NODE_ENV === 'production'
          ? productionBaseUrl
          : localBaseUrl;
      console.log('Using base URL:', baseUrl);

      // Construct URLs for main image
      const mainImageUrls = {
        desktop: `${baseUrl}/uploads/${mainImageResults.desktop.filename}`,
        mobile: `${baseUrl}/uploads/${mainImageResults.mobile.filename}`,
        desktopLocal: `${localBaseUrl}/uploads/${mainImageResults.desktop.filename}`,
        mobileLocal: `${localBaseUrl}/uploads/${mainImageResults.mobile.filename}`,
        publicDesktop: `${baseUrl}/public/uploads/${mainImageResults.desktop.filename}`,
        publicMobile: `${baseUrl}/public/uploads/${mainImageResults.mobile.filename}`,
      };

      // Construct URLs for small images
      const smallImageUrlSets = smallImagesResults.map(result => ({
        desktop: `${baseUrl}/smallImages/${result.desktop.filename}`,
        mobile: `${baseUrl}/smallImages/${result.mobile.filename}`,
        desktopLocal: `${localBaseUrl}/smallImages/${result.desktop.filename}`,
        mobileLocal: `${localBaseUrl}/smallImages/${result.mobile.filename}`,
      }));

      console.log('\n=== Generated Image URLs ===');
      console.log('Main Image URLs:', mainImageUrls);
      console.log('Small Image URLs:', smallImageUrlSets);

      // Send response with all URL formats
      const response = {
        success: true,
        mainImage: mainImageUrls,
        smallImages: smallImageUrlSets,
        fileDetails: {
          mainImage: {
            desktop: mainImageResults.desktop,
            mobile: mainImageResults.mobile,
          },
          smallImages: smallImagesResults,
        },
      };

      console.log('\n=== Final Response ===');
      console.log(JSON.stringify(response, null, 2));

      res.json(response);
    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).json({
        error: 'Server error during upload: ' + error.message,
        success: false,
      });
    }
  }
);

// Payment Processing Endpoints
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (request, response) => {
    const sig = request.headers['stripe-signature'];
    const payload = request.body;
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        sig,
        `${process.env.WEBHOOK_SEC}`
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message);
      return response.sendStatus(400);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('2. From webhook:', session.metadata.productId);
      handleCheckoutSession(session);
    }

    response.json({ received: true });
  }
);

app.post('/create-checkout-session', async (req, res) => {
  try {
    const [getProductId] = req.body.items;
    const product = await Product.find({ id: getProductId.id });
    let [getProdQuant] = product;
    let reqCurrency = req.body.currency;

    if (!product) {
      throw new Error('Product not found');
    }

    if (getProdQuant.quantity == 0) {
      return res.status(400).send('Product is out of stock');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: req.body.items.map(item => {
        let inCents =
          reqCurrency == '$'
            ? item.price * 100
            : Number((item.price / `${process.env.USD_ILS_RATE}`).toFixed(0)) *
              100;

        const myItem = {
          name: item.title,
          price: inCents,
          quantity: item.amount,
          productId: item.id,
        };

        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: myItem.name,
            },
            unit_amount: myItem.price,
          },
          quantity: myItem.quantity,
        };
      }),
      shipping_address_collection: {
        allowed_countries: ['US', 'IL'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 1500,
              currency: 'usd',
            },
            display_name: 'Standard Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'week',
                value: 2,
              },
              maximum: {
                unit: 'week',
                value: 4,
              },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 2000,
              currency: 'usd',
            },
            display_name: 'Expedited Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 10,
              },
              maximum: {
                unit: 'business_day',
                value: 12,
              },
            },
          },
        },
      ],
      success_url: `${process.env.HOST}/index.html`,
      cancel_url: `${process.env.HOST}/html/cart.html`,
      metadata: {
        productId: getProductId.id.toString(),
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
});

app.post('/orders', async (req, res) => {
  try {
    const { cart } = req.body;
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res
        .status(400)
        .json({ error: 'Invalid cart data. Cart must be a non-empty array.' });
    }

    console.log(
      'Creating PayPal order with cart:',
      JSON.stringify(cart, null, 2)
    );

    const result = await createOrder(cart);
    if (!result) {
      return res.status(500).json({
        error: 'Failed to create order. See server logs for details.',
      });
    }

    console.log('PayPal order creation successful:', result.httpStatusCode);
    res.status(result.httpStatusCode).json(result.jsonResponse);
  } catch (error) {
    console.error('Failed to create order:', error);
    res.status(500).json({
      error: 'Failed to create order.',
      message: error.message,
      details: error.stack,
    });
  }
});

app.post('/orders/:orderID/capture', async (req, res) => {
  try {
    const { orderID } = req.params;
    const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error('Failed to create order:', error);
    res.status(500).json({ error: 'Failed to capture order.' });
  }
});

app.post('/deleteproductimage', async (req, res) => {
  try {
    const { productId, imageType, imageUrl } = req.body;

    console.log(`Deleting image: ${imageType} from product ${productId}`);
    console.log(`Image URL: ${imageUrl}`);

    // Helper function to extract filename from URL
    const getFilename = url => {
      if (!url) return '';
      const parts = url.split('/');
      return parts[parts.length - 1];
    };

    // Get the filename from the URL
    const targetFilename = getFilename(imageUrl);
    console.log(`Target filename to delete: ${targetFilename}`);

    if (imageType === 'main') {
      console.log('Deleting main image');

      // For main image, we can directly update using MongoDB's update operators
      await Product.updateOne(
        { id: Number(productId) },
        {
          $set: {
            image: null,
            publicImage: null,
            imageLocal: null,
            'mainImage.desktop': null,
            'mainImage.mobile': null,
            'mainImage.publicDesktop': null,
            'mainImage.publicMobile': null,
            'mainImage.desktopLocal': null,
            'mainImage.mobileLocal': null,
          },
        }
      );

      console.log('Main image deleted via direct update');
    } else if (imageType === 'small') {
      console.log('Deleting small image');

      // First, fetch the product to examine the smallImages
      const product = await Product.findOne({ id: Number(productId) });

      if (!product) {
        console.error(`Product with ID ${productId} not found`);
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      console.log('Examining smallImages structure...');

      // We need to modify the MongoDB document directly
      // First, convert character by character URLs to strings for easier comparison
      const reconstructedUrls = [];

      if (Array.isArray(product.smallImages)) {
        // Attempt to reconstruct URLs from character-by-character objects
        for (let i = 0; i < product.smallImages.length; i++) {
          const img = product.smallImages[i];

          // If it's a Mongoose document with character properties
          if (img && typeof img === 'object') {
            // Check for numeric keys like 0, 1, 2, etc.
            const numericKeys = Object.keys(img)
              .filter(k => !isNaN(parseInt(k)))
              .sort((a, b) => parseInt(a) - parseInt(b));

            if (numericKeys.length > 20) {
              // It's likely a character-by-character array
              let url = '';
              numericKeys.forEach(key => {
                if (img[key]) url += img[key];
              });

              reconstructedUrls.push({
                index: i,
                url: url,
                type: 'character-by-character',
              });

              console.log(`Reconstructed URL at index ${i}: ${url}`);
            }
            // If it's a regular object with URL properties
            else if (img.desktop || img.mobile) {
              reconstructedUrls.push({
                index: i,
                url: img.desktop || img.mobile,
                type: 'object',
              });

              console.log(
                `Object URL at index ${i}: ${img.desktop || img.mobile}`
              );
            }
          }
          // If it's a plain string
          else if (typeof img === 'string') {
            reconstructedUrls.push({
              index: i,
              url: img,
              type: 'string',
            });

            console.log(`String URL at index ${i}: ${img}`);
          }
        }
      }

      // Now check if any of the reconstructed URLs match what we want to delete
      const matchingIndices = [];

      reconstructedUrls.forEach(item => {
        if (item.url === imageUrl || item.url.includes(targetFilename)) {
          console.log(`Found match at index ${item.index}: ${item.url}`);
          matchingIndices.push(item.index);
        }
      });

      if (matchingIndices.length > 0) {
        console.log(
          `Will remove images at indices: ${matchingIndices.join(', ')}`
        );

        // ------------------------------------------------------
        // APPROACH 1: Use MongoDB's $pull operator with a custom filter
        // This is more reliable for Mongoose subdocuments
        // ------------------------------------------------------
        if (matchingIndices.length === 1) {
          // If only one match, use direct index to remove it
          const indexToRemove = matchingIndices[0];

          console.log(
            `Using MongoDB pull by index to remove item at position ${indexToRemove}`
          );

          // Use MongoDB update to remove the specific element by position
          const updateResult = await Product.updateOne(
            { id: Number(productId) },
            { $unset: { [`smallImages.${indexToRemove}`]: 1 } }
          );

          // Then pull all null values to clean up the array
          const pullResult = await Product.updateOne(
            { id: Number(productId) },
            { $pull: { smallImages: null } }
          );

          console.log('MongoDB update result:', updateResult);
          console.log('MongoDB pull result:', pullResult);
        } else {
          // If multiple matches, we need a more complex approach
          // We'll create a new array without the matched indices
          const product = await Product.findOne({ id: Number(productId) });

          if (product && Array.isArray(product.smallImages)) {
            // Filter out the matched indices
            const newSmallImages = product.smallImages.filter(
              (_, index) => !matchingIndices.includes(index)
            );

            console.log(
              `Original length: ${product.smallImages.length}, New length: ${newSmallImages.length}`
            );

            // Replace the entire smallImages array
            const updateResult = await Product.updateOne(
              { id: Number(productId) },
              { $set: { smallImages: newSmallImages } }
            );

            console.log('MongoDB replace array result:', updateResult);
          }
        }
      } else {
        console.log('No matching small images found');
      }

      // Also handle legacy smallImagesLocal array if it exists
      if (product.smallImagesLocal && product.smallImagesLocal.length > 0) {
        console.log(
          `Found ${product.smallImagesLocal.length} items in smallImagesLocal array`
        );

        // Filter out URLs that match our target
        const newSmallImagesLocal = product.smallImagesLocal.filter(
          url =>
            typeof url !== 'string' ||
            (!url.includes(targetFilename) && url !== imageUrl)
        );

        if (newSmallImagesLocal.length !== product.smallImagesLocal.length) {
          console.log(
            `Removing ${
              product.smallImagesLocal.length - newSmallImagesLocal.length
            } items from smallImagesLocal`
          );

          // Update the smallImagesLocal array
          await Product.updateOne(
            { id: Number(productId) },
            { $set: { smallImagesLocal: newSmallImagesLocal } }
          );
        }
      }
    }

    console.log('Image deletion completed');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Fetch a single product by id
app.get('/getproduct/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ id: Number(req.params.id) });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================
// Server Initialization
// =============================================
app.listen(process.env.SERVER_PORT || 4000, error => {
  if (!error) {
    console.log('Server Running on Port ' + (process.env.SERVER_PORT || 4000));
    console.log('Environment Variables:');
    console.log('  API_URL:', process.env.API_URL);
    console.log('  HOST:', process.env.HOST);
    console.log('  NODE_ENV:', process.env.NODE_ENV);
  } else {
    console.log('Error : ' + error);
  }
});

// Image processing function
const processImage = async (inputPath, filename, isMainImage = true) => {
  const outputDir = isMainImage ? uploadsDir : smallImagesDir;
  const publicDir = isMainImage ? publicUploadsDir : publicSmallImagesDir;
  const results = {};

  try {
    const baseName = path.parse(filename).name;
    const isRAW = filename.toLowerCase().endsWith('.cr2');

    // Create WebP versions for both desktop and mobile
    const desktopFilename = `${baseName}-desktop.webp`;
    const mobileFilename = `${baseName}-mobile.webp`;

    const desktopPath = path.join(outputDir, desktopFilename);
    const mobilePath = path.join(outputDir, mobileFilename);
    const publicDesktopPath = path.join(publicDir, desktopFilename);
    const publicMobilePath = path.join(publicDir, mobileFilename);

    // Enhanced Sharp configuration for RAW files
    const sharpOptions = {
      failOnError: false,
      raw: isRAW
        ? {
            width: 5000,
            height: 4000,
            channels: 3,
            density: 300, // Add DPI setting for better quality
          }
        : undefined,
    };

    // Function to process image with fallback
    const processWithFallback = async (
      inputPath,
      options,
      outputPath,
      size
    ) => {
      try {
        // First attempt: Direct RAW processing
        await sharp(inputPath, options)
          .rotate() // Auto-rotate based on EXIF
          .resize({
            width: size,
            withoutEnlargement: true,
            fit: 'inside',
          })
          .webp({
            quality: 85,
            effort: 6, // Higher compression effort for better quality
            smartSubsample: true, // Enable smart subsampling
            nearLossless: true, // Use near-lossless compression
          })
          .toFile(outputPath);
      } catch (error) {
        console.warn(
          `First attempt failed for ${filename}, trying fallback method:`,
          error.message
        );

        try {
          // Second attempt: Convert to TIFF first for RAW files
          if (isRAW) {
            const tiffPath = path.join(outputDir, `${baseName}-temp.tiff`);
            await sharp(inputPath, options)
              .rotate()
              .toFormat('tiff')
              .toFile(tiffPath);

            // Then convert TIFF to WebP
            await sharp(tiffPath)
              .resize({
                width: size,
                withoutEnlargement: true,
                fit: 'inside',
              })
              .webp({
                quality: 85,
                effort: 6,
                smartSubsample: true,
                nearLossless: true,
              })
              .toFile(outputPath);

            // Clean up temporary TIFF file
            fs.unlink(tiffPath, err => {
              if (err)
                console.warn(
                  `Failed to delete temporary TIFF file: ${err.message}`
                );
            });
          } else {
            throw error; // Re-throw if not RAW file
          }
        } catch (fallbackError) {
          console.error(
            `Both attempts failed for ${filename}:`,
            fallbackError.message
          );
          throw fallbackError;
        }
      }
    };

    // Process desktop version
    await processWithFallback(inputPath, sharpOptions, desktopPath, 1200);

    // Process mobile version
    await processWithFallback(inputPath, sharpOptions, mobilePath, 600);

    // Copy to public directory if successful
    await fs.promises.copyFile(desktopPath, publicDesktopPath);
    await fs.promises.copyFile(mobilePath, publicMobilePath);

    // Return results
    results.desktop = {
      filename: desktopFilename,
      path: desktopPath,
      publicPath: publicDesktopPath,
    };
    results.mobile = {
      filename: mobileFilename,
      path: mobilePath,
      publicPath: publicMobilePath,
    };

    return results;
  } catch (error) {
    console.error(`Error processing image ${filename}:`, error);
    throw error;
  }
};
