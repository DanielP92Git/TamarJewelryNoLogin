const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcrypt");
require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fs = require("fs");

//
//* MAIN SETTINGS
//
const allowedOrigins = [`${process.env.HOST}`, `${process.env.API_URL}`];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(cookieParser());

// Endpoint to handle Stripe webhook
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (request, response) => {
    const sig = request.headers["stripe-signature"];
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

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      // Fulfill the purchase
      handleCheckoutSession(session);
    }

    response.json({ received: true });
  }
);

async function handleCheckoutSession(session) {
  const productId = session.metadata.productId; // Extract the actual product ID from session or metadata
  if (productId) {
    const product = await Product.findOne({id: productId});
    if (product) {
      product.quantity -= 1;
      await product.save();
      let newQuantity = product.quantity
      console.log(
        `Product ${productId} quantity reduced. New quantity: ${newQuantity}`
      );
      if (newQuantity == 0) {
        const response = await fetch(`${process.env.API_URL}/removeproduct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: productId,
          })
        })

        const data = await response.json()
        if (data.success) {
          console.log(`Product with id: ${data.id} is deleted from database`);
        }
      }



    }
  } else {
    console.error("Product not found");
  }
}

app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: "50mb" }));

//
//* CORS
//

function headers(req, res, next) {
  res.header("Access-Control-Allow-Origin", `${process.env.HOST}`);
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, Content-Type, Authorization"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  next();
}

app.options("*", headers);

app.use(headers);

//
//* MONGODB
//

// Database Connection With MongoDB
mongoose.connect(`${process.env.MONGO_URL}`);

// Schema Creating User Model
const Users = mongoose.model("Users", {
  name: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match:
      /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/,
  },
  password: {
    type: String,
    required: true,
  },
  cartData: {
    type: Object,
  },
  Date: {
    type: Date,
    default: Date.now,
  },
  userType: {
    type: String,
    default: "user",
  },
});

// Schema for Creating Products
const Product = mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: false,
  },
  imageLocal: {
    type: String,
    required: false,
  },
  smallImages: {
    type: Array,
    required: false,
  },
  smallImagesLocal: {
    type: Array,
    required: false,
  },
  category: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  ils_price: {
    type: Number,
    required: true,
  },
  usd_price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
});

//
//* APIs
//

app.use(express.static(path.join(__dirname, "frontend")));

app.get("/", (req, res) => res.send("API endpoint is running"));

app.get("/admin", (req, res) => {

  res.sendFile(path.join(__dirname, "html/bambaYafa.html")).status(200);
});

// Add product to database
app.post("/addproduct", async (req, res) => {
  let products = await Product.find({});
  let id;

  if (products.length > 0) {
    let last_product_array = products.slice(-1);
    let last_product = last_product_array[0];
    id = last_product.id + 1;
  } else {
    id = 1;
  }

  const product = new Product({
    id: id,
    name: req.body.name,
    image: req.body.image,
    imageLocal: req.body.imageLocal,
    smallImages: req.body.multiImages,
    smallImagesLocal: req.body.multiImagesLocal,
    category: req.body.category,
    quantity: +req.body.quantity,
    description: req.body.description,
    ils_price: req.body.newPrice,
    usd_price: req.body.oldPrice,
  });


  await product.save();
  console.log("Saved");
  res.json({
    success: true,
    name: req.body.name,
  });
});

app.post("/updateproduct", async (req, res) => {
  const id = req.body.id;
  const updatedFields = {
    name: req.body.name,
    usd_price: req.body.oldPrice,
    ils_price: req.body.newPrice,
    description: req.body.description,
    quantity: req.body.quantity,
  };

  
  let product = await Product.findOne({ id: id });

  product.name = updatedFields.name;
  product.usd_price = updatedFields.usd_price;
  product.ils_price = updatedFields.ils_price;
  product.description = updatedFields.description;
  product.quantity = updatedFields.quantity;

  await product.save();

  res.json({
    success: true,
  });
});

// Delete products from database
app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log("Removed");
  res.json({
    success: true,
    id: req.body.id,
    name: req.body.name,
  });
});

// Get all products from database
app.get("/allproducts", async (req, res) => {
  let products = await Product.find({});
  console.log("All Products Fetched");
  res.send(products);
});

const authUser = async function (req, res, next) {
  try {
    let user = await Users.findOne({ email: req.body.email });
    if (user) {
      const userTypeCheck =
        user.userType === "user" || user.userType === "admin";

      if (userTypeCheck) {
        bcrypt.compare(req.body.password, user.password, (err, result) => {
          if (err || !result) {
            return res
              .status(401)
              .json({ success: false, errors: "Auth Failed" });
          }
          console.log("Authenticated successfuly");
          req.user = user;
          next();
        });
      } else {
        throw new Error("No access");
      }
    } else {
      res.status(404).json({
        errors:
          "No user found. Please check your email or password and try again",
      });
    }
  } catch (err) {
    console.error("Auth error:", err);
    res.status(500).json({ errors: "Auth User - Internal Server Error" });
  }
};

// Creating endpoint for login
app.post("/login", authUser, async (req, res) => {
  try {
    const adminCheck = req.user.userType;
    const data = {
      user: {
        id: req.user.id,
        email: req.user.email,
      },
    };
    const token = jwt.sign(data, process.env.JWT_KEY);
    if (token) {
      console.log("Token created for user");
      res.json({
        success: true,
        token,
        adminCheck,
      });
    }
  } catch (err) {
    console.error("Login Error🔥 :", err);
    res.status(500).json({ errors: "Login - Internal Server Error", err });
  }
});

// Creating Endpoint for Registering the User
app.post("/signup", async (req, res) => {
  let findUser = await Users.findOne({ email: req.body.email });
  if (findUser) {
    return res.status(400).json({
      success: false,
      errors: "Existing user found with the same Email address",
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
            message: "User Created!",
          });
        })
        .catch((err) => {

          res.status(500).json({
            errors: err,
          });
        });

      // const data = {
      //   user: {
      //     id: user.id,
      //   },
      // };

      // const token = jwt.sign(data, "secret_ecom");
      // res.json({ success: true, token });
    }
  });
});

// Creating middleware to fetch user
const fetchUser = async (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) {
    res.status(401).send({ errors: "Please authenticate using valid token" });
  } else {
    try {
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      req.user = decoded.user;
      next();
    } catch (err) {
      res
        .status(401)
        .send({ errors: "Please authenticate using a valid token", err });
    }
  }
};

// Creating endpoint to get cartdata
app.post("/getcart", fetchUser, async (req, res) => {
  console.log("GetCart");
  let userData = await Users.findOne({ _id: req.user.id });
  res.json(userData.cartData);
});

// Creating endpoint for adding products in cartdata

app.post("/addtocart", fetchUser, async (req, res) => {
  console.log("added", req.body.itemId);

  let userData = await Users.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemId] += 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Added!");
});

// Creating endpoint for removing products from cartdata

app.post("/removefromcart", fetchUser, async (req, res) => {
  console.log("removed", req.body.itemId);

  let userData = await Users.findOne({ _id: req.user.id });
  if (userData.cartData[req.body.itemId] > 0)
    userData.cartData[req.body.itemId] -= 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Removed!");
});

app.post("/removeAll", fetchUser, async (req, res) => {
  console.log("removed all");
  let userData = await Users.findOne({ _id: req.user.id });

  for (let i = 0; i < 300; i++) {
    userData.cartData[i] = 0;
  }

  // userData.cartData[req.body.itemId] = 0;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Removed All!");
});

app.post("/findProduct", async (req, res) => {

  let productData = await Product.findOne({ id: req.body.id });
  res.json({ productData });
});

// Image Storage Engine

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "mainImage") {
      cb(null, "./uploads");
    }
    if (file.fieldname === "smallImages") {
      cb(null, "./smallImages");
    }
  },
  filename: function (req, file, cb) {
    return cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const uploadA = multer({ storage: storage });

const multipleUpload = uploadA.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "smallImages", maxCount: 8 },
]);

// Creating Upload endpoint for one image:
app.use("/uploads", express.static("uploads"));
app.use("../../Online/backend/uploads", express.static("uploads"));

app.use("/smallImages", express.static("smallImages"));
app.use("../../Online/backend/smallImages", express.static("smallImages"));

const copyFile = (source, target, cb) => {
  const rd = fs.createReadStream(source);
  const wr = fs.createWriteStream(target);

  rd.on("error", cb);
  wr.on("error", cb);
  wr.on("close", () => cb(null));

  rd.pipe(wr);
};

app.post("/upload", multipleUpload, (req, res) => {
  try {
    const mainImage = req.files.mainImage[0].filename;
    const smallImages = req.files.smallImages;

    // Copy main image to another directory
    if (mainImage) {
      const sourcePath = path.join(__dirname, "./uploads", mainImage);
      const targetPath = path.join(
        __dirname,
        "../../Online/backend/uploads",
        mainImage
      );

      copyFile(sourcePath, targetPath, (err) => {
        if (err) {
          console.error("Error copying main image:", err);
        }
      });
    }

    // Copy small images to another directory
    smallImages.forEach((file) => {
      const sourcePath = path.join(__dirname, "./smallImages", file.filename);
      const targetPath = path.join(
        __dirname,
        "../../Online/backend/smallImages",
        file.filename
      );

      copyFile(sourcePath, targetPath, (err) => {
        if (err) {
          console.error("Error copying small image:", err);
        }
      });
    });

    let makeUrl = smallImages.map(({ filename }) => {
      return `https://tamarj-api.onrender.com/smallImages/${filename}`;
    });

    let localUrl = smallImages.map(({ filename }) => {
      return `http://localhost:4000/smallImages/${filename}`;
    });

    res.json({
      success: 1,
      file: req.files,

      mainImageUrl: `https://tamarj-api.onrender.com/uploads/${req.files.mainImage[0].filename}`,
      mainImageUrlLocal: `http://localhost:4000/uploads/${req.files.mainImage[0].filename}`,
      smallImagesUrl: makeUrl,
      smallImagesUrlLocal: localUrl,
    });
  } catch (err) {
    console.error(err);
  }
});

// Creating payment endpoint
const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY_TEST);

app.post("/create-checkout-session", async (req, res) => {
  // const shippingRate = await stripe.shippingRates.retrieve('shr_1P5Tdw03Qr2omCV4v8GI30UM')
  try {
    const [getProductId] = req.body.items;
    const product = await Product.find({ id: getProductId.id });
    let [getProdQuant] = product;

    if (!product) {
      throw new Error('Product not found')
      // return res.status(404).send("Product not found");
    }

    if (getProdQuant.quantity == 0) {
      return res.status(400).send("Product is out of stock");
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: req.body.items.map((item) => {
        let inCents = item.price * 100;

        const myItem = {
          name: item.title,
          price: inCents,
          quantity: item.amount,
          productId: item.id,
        };

        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: myItem.name,
            },
            unit_amount: myItem.price,
          },
          quantity: myItem.quantity,
        };
      }),

      shipping_address_collection: {
        allowed_countries: ["US", "IL"],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: 1500,
              currency: "usd",
            },
            display_name: "Standard Shipping",
            delivery_estimate: {
              minimum: {
                unit: "week",
                value: 2,
              },
              maximum: {
                unit: "week",
                value: 4,
              },
            },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: 2000,
              currency: "usd",
            },
            display_name: "Expedited Shipping",
            delivery_estimate: {
              minimum: {
                unit: "business_day",
                value: 10,
              },
              maximum: {
                unit: "business_day",
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
    res.status(500).json({ err });
  }
});

app.listen(process.env.SERVER_PORT, (error) => {
  if (!error) {
    console.log("Server Running on Port " + process.env.SERVER_PORT);
  } else {
    console.log("Error : " + error);
  }
});
