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

//
//* MAIN SETTINGS
// 
const allowedOrigins = [`${process.env.HOST}`, `${process.env.API_URL}`] ;
// const corsOptions = {
//   origin: (origin, callback) => {
//     if (allowedOrigins.includes(origin) || !origin) {
//       console.log("Allowed origin:", origin);
//       callback(null, true);
//     } else {
//       console.error("Blocked by CORS:", origin);
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
//   credentials: true,
//   optionsSuccessStatus: 200,
// };

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      console.log("ORIGIN: ", origin);
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
    required: true,
  },
  smallImages: {
    type: Array,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
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
  console.log("Fetch admin");
  res.sendFile((path.join(__dirname, "html/bambaYafa.html"))).status(200)
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
    smallImages: req.body.multiImages,
    category: req.body.category,
    description: req.body.description,
    new_price: req.body.newPrice,
    old_price: req.body.oldPrice,
  });

  console.log(product);
  await product.save();
  console.log("Saved");
  res.json({
    success: true,
    name: req.body.name,
  });
});

// Delete products from database
app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log("Removed");
  res.json({
    success: true,
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
        .then((result) => {
          console.log(result);
          res.status(201).json({
            message: "User Created!",
          });
        })
        .catch((err) => {
          console.log(err);
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

// Image Storage Engine

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "mainImage") {
      cb(null, "./uploads");
    } else {
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

const upload = multer({ storage: storage });

const multipleUpload = upload.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "smallImages", maxCount: 8 },
]);

// Creating Upload endpoint for one image:
app.use("/uploads", express.static("uploads"));
app.use("/smallImages", express.static("smallImages"));

app.post("/upload", multipleUpload, (req, res) => {
  try {
    let smallFiles = req.files.smallImages;
    let makeUrl = smallFiles.map((file) => {
      return `${process.env.API_URL}/smallImages/${file.filename}`;
    });
    console.log('Image added successfully');
    res.json({
      success: 1,
      file: req.files,
      mainImageUrl: `${process.env.API_URL}/uploads/${req.files.mainImage[0].filename}`,

      smallImagesUrl: makeUrl,
    });
  } catch (err) {
    console.error(err);
  }
});

// Creating payment endpoint

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);

app.post("/create-checkout-session", async (req, res) => {
  try {
    // const shippingRate = await stripe.shippingRates.retrieve('shr_1P5Tdw03Qr2omCV4v8GI30UM')

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",

      line_items: req.body.items.map((item) => {
        const myItem = {
          name: item.title,
          price: item.price * 100,
          quantity: item.amount,
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
              amount: 1000,
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
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.SERVER_PORT, (error) => {
  if (!error) {
    console.log("Server Running on Port " + process.env.SERVER_PORT);
  } else {
    console.log("Error : " + error);
  }
});
