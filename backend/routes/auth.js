const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Users } = require('../models');
const { getTokenFromRequest, authUser } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15m
  limit: Number(process.env.RATE_LIMIT_AUTH_MAX || 20), // per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
});

router.post('/verify-token', async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userId = decoded?.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const user = await Users.findById(userId);

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

router.post(
  '/login',
  authRateLimiter,
  (req, res, next) => {
    if (
      !req.body ||
      typeof req.body.email !== 'string' ||
      typeof req.body.password !== 'string'
    ) {
      return res
        .status(400)
        .json({ success: false, errors: 'Invalid login payload' });
    }
    return next();
  },
  authUser,
  async (req, res) => {
    try {
      const adminCheck = req.user.userType;
      const data = {
        user: {
          id: req.user._id.toString(),
          email: req.user.email,
          userType: req.user.userType,
        },
      };
      const token = jwt.sign(data, process.env.JWT_KEY, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      });
      if (token) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Token created for user:', req.user.email);
        }
        res.json({
          success: true,
          token,
          adminCheck,
          message: 'Login successful',
        });
      }
    } catch (err) {
      console.error('Login Error:', err);
      res.status(500).json({
        success: false,
        errors: 'Login - Internal Server Error',
        message: err.message,
      });
    }
  }
);

router.post('/signup', authRateLimiter, async (req, res) => {
  // lightweight validation (keeps behavior predictable)
  if (
    !req.body ||
    typeof req.body.email !== 'string' ||
    typeof req.body.password !== 'string' ||
    typeof req.body.username !== 'string'
  ) {
    return res
      .status(400)
      .json({ success: false, errors: 'Invalid signup payload' });
  }

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

module.exports = router;
