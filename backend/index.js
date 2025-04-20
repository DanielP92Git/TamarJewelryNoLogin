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

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const baseUrl = process.env.PAYPAL_BASE_URL;

// =============================================
// Initial Setup & Configuration
// =============================================
const app = express();

// CORS Configuration
const allowedOrigins = [
  `${process.env.HOST}`,
  `${process.env.API_URL}`,
  `${process.env.ADMIN_URL}`,
  'http://127.0.0.1:5500',
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
  name: { type: String, required: false },
  image: { type: String, required: false },
  imageLocal: { type: String, required: false },
  publicImage: { type: String, required: false },
  directImageUrl: { type: String, required: false },
  smallImages: { type: Array, required: false },
  smallImagesLocal: { type: Array, required: false },
  category: { type: String, required: true },
  description: { type: String, required: false },
  quantity: { type: Number, required: false },
  ils_price: { type: Number, required: false },
  usd_price: { type: Number, required: false },
  date: { type: Date, default: Date.now },
  available: { type: Boolean, default: true },
  security_margin: { type: Number, required: false },
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

const upload = multer({ storage: storage });

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
const stripe = require('stripe')(process.env.STRIPE_PUBLISH_KEY_TEST);

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
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error('MISSING_API_CREDENTIALS');
    }
    const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: 'grant_type=client_credentials',
    });
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Failed to generate Access Token:', error);
  }
};

const createOrder = async cart => {
  console.log(
    'shopping cart information passed from the frontend createOrder() callback:',
    cart
  );
  let totalAmount = cart
    .reduce((total, item) => {
      let itemTotal =
        parseFloat(item.unit_amount.value) * parseInt(item.quantity);
      return total + itemTotal;
    }, 0)
    .toFixed(2);
  const currencyData = cart[0].unit_amount.currency_code;
  const accessToken = await generateAccessToken();
  const url = `${baseUrl}/v2/checkout/orders`;
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
        items: cart,
      },
    ],
    application_context: {
      return_url: `${process.env.API_URL}/complete-order`,
      cancel_url: `${process.env.HOST}/html/cart.html`,
      user_action: 'PAY_NOW',
      brand_name: 'Tamar Kfir Jewelry',
    },
  };
  console.log(payload.purchase_units[0].unit_amount);
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
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
    console.log('Complete request body:', req.body);

    if (!req.body.image) {
      console.warn(
        '⚠️ WARNING: No image URL received in request. Request fields:',
        Object.keys(req.body)
      );
      console.warn(
        'Make sure the frontend is sending the image URL from the upload response'
      );
    }

    const products = await Product.find({}).sort({ id: -1 }).limit(1);
    const nextId = products.length > 0 ? Number(products[0].id) + 1 : 1;

    const securityMargin = parseFloat(req.body.security_margin) || 5;
    const usdPrice = Number(req.body.oldPrice) || 0;
    const ilsPrice = Math.round(usdPrice * 3.7 * (1 + securityMargin / 100));

    const mainImageUrl = req.body.image || '';
    const mainImageLocal = req.body.imageLocal || '';
    const publicImageUrl = req.body.publicImage || mainImageUrl;
    const directImageUrl = req.body.directImageUrl || '';
    const smallImageUrls = Array.isArray(req.body.smallImages)
      ? req.body.smallImages
      : [];
    const smallImageLocals = Array.isArray(req.body.smallImagesLocal)
      ? req.body.smallImagesLocal
      : [];

    console.log('Image data to be saved:', {
      mainImage: {
        production: mainImageUrl,
        public: publicImageUrl,
        direct: directImageUrl,
        local: mainImageLocal,
      },
      smallImages: {
        production: smallImageUrls,
        local: smallImageLocals,
      },
      alternativeUrls: req.body.alternativeUrls,
    });

    const product = new Product({
      id: nextId,
      name: req.body.name,
      image: mainImageUrl,
      imageLocal: mainImageLocal,
      publicImage: publicImageUrl,
      directImageUrl: directImageUrl,
      smallImages: smallImageUrls,
      smallImagesLocal: smallImageLocals,
      category: req.body.category,
      quantity: Number(req.body.quantity) || 0,
      description: req.body.description,
      ils_price: ilsPrice,
      usd_price: usdPrice,
      security_margin: securityMargin,
    });

    console.log('Final product data before save:', {
      id: product.id,
      name: product.name,
      image: product.image,
      imageLocal: product.imageLocal,
      publicImage: product.publicImage,
      smallImages: product.smallImages,
      smallImagesLocal: product.smallImagesLocal,
      category: product.category,
      API_URL: process.env.API_URL,
    });

    await product.save();
    console.log('Product saved successfully with ID:', nextId);

    res.json({
      success: true,
      id: nextId,
      name: req.body.name,
      message: !req.body.image
        ? 'Warning: No image URL was provided'
        : undefined,
    });
  } catch (error) {
    console.error('Product creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post('/updateproduct', async (req, res) => {
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
      console.log('Upload request received');
      console.log('Files:', JSON.stringify(req.files, null, 2));

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

      console.log('Main image saved to:', mainImage.path);
      console.log('Main image details:', {
        filename: mainImage.filename,
        path: mainImage.path,
        mimetype: mainImage.mimetype,
        size: mainImage.size,
      });

      // Verify the file exists and is readable
      try {
        const stats = fs.statSync(mainImage.path);
        console.log('File stats:', {
          size: stats.size,
          permissions: stats.mode.toString(8),
          isReadable: (stats.mode & fs.constants.S_IRUSR) !== 0,
        });

        // Make sure file has correct permissions (readable by all)
        fs.chmodSync(mainImage.path, 0o644);
        console.log('Updated file permissions to 644');
      } catch (statError) {
        console.error('Error checking file stats:', statError);
        return res.status(500).json({
          error: 'Error processing uploaded file: ' + statError.message,
          success: false,
        });
      }

      // Get the hostname from the request or environment variables
      const requestHost = req.get('host');
      const protocol = req.protocol || 'https';

      // Define base URLs with more clarity
      const productionBaseUrl =
        process.env.API_URL || 'https://tamarkfir.com/api';
      const localBaseUrl = 'http://localhost:4000';
      const baseUrl =
        process.env.NODE_ENV === 'production'
          ? productionBaseUrl
          : localBaseUrl;

      console.log('URL Construction:', {
        requestHost,
        protocol,
        productionBaseUrl,
        localBaseUrl,
        baseUrl,
        env: {
          HOST: process.env.HOST,
          API_URL: process.env.API_URL,
          NODE_ENV: process.env.NODE_ENV,
        },
      });

      // Construct URLs
      const mainImageUrl = `${baseUrl}/uploads/${mainImage.filename}`;
      const mainImageLocalUrl = `${localBaseUrl}/uploads/${mainImage.filename}`;
      const publicMainImageUrl = `${baseUrl}/public/uploads/${mainImage.filename}`;
      const directImageUrl = `${baseUrl}/direct-image/${mainImage.filename}`;

      // Construct URLs for small images
      const smallImageUrls = smallImages.map(
        file => `${baseUrl}/smallImages/${file.filename}`
      );
      const smallImageLocalUrls = smallImages.map(
        file => `${localBaseUrl}/smallImages/${file.filename}`
      );

      // Log all URLs for debugging
      console.log('Image URLs:', {
        mainImageUrl,
        mainImageLocalUrl,
        publicMainImageUrl,
        directImageUrl,
        smallImageCount: smallImageUrls.length,
      });

      // Send response with all possible URL formats to make integration easier
      res.json({
        success: true,
        image: mainImageUrl,
        imageLocal: mainImageLocalUrl,
        publicImage: publicMainImageUrl,
        directImageUrl: directImageUrl,
        smallImages: smallImageUrls,
        smallImagesLocal: smallImageLocalUrls,

        // Also include older format keys for backward compatibility
        mainImageUrl: mainImageUrl,
        mainImageUrlLocal: mainImageLocalUrl,
        smallImagesUrl: smallImageUrls,
        smallImagesUrlLocal: smallImageLocalUrls,

        // Include file details for debugging
        fileDetails: {
          mainImage: {
            filename: mainImage.filename,
            size: mainImage.size,
            mimetype: mainImage.mimetype,
          },
          smallImages: smallImages.map(file => ({
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype,
          })),
        },
      });
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
      cancel_url: `${process.env.HOST}/html/cart.ejs`,
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
    const { jsonResponse, httpStatusCode } = await createOrder(cart);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error('Failed to create order:', error);
    res.status(500).json({ error: 'Failed to create order.' });
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
