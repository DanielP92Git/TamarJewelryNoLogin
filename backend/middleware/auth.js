const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const { Users } = require('../models');

function getTokenFromRequest(req) {
  const direct = req.header('auth-token');
  if (direct) return direct;
  const auth = req.header('authorization');
  if (auth && typeof auth === 'string') {
    const parts = auth.split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1];
  }
  return null;
}

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
          if (process.env.NODE_ENV !== 'production') {
            console.log('Authenticated successfully');
          }
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
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      errors: 'Please authenticate using valid token',
    });
  } else {
    try {
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      const userId = decoded?.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, errors: 'Invalid token' });
      }

      const user = await Users.findById(userId);
      if (!user) {
        return res
          .status(401)
          .json({ success: false, errors: 'User not found' });
      }

      // Only allow known user types
      if (user.userType !== 'user' && user.userType !== 'admin') {
        return res.status(403).json({ success: false, errors: 'Forbidden' });
      }

      req.user = {
        id: user._id.toString(),
        email: user.email,
        userType: user.userType,
      };
      req.userDoc = user;
      return next();
    } catch {
      return res.status(401).json({
        success: false,
        errors: 'Please authenticate using a valid token',
      });
    }
  }
};

function requireAdmin(req, res, next) {
  if (!req.userDoc || req.userDoc.userType !== 'admin') {
    return res
      .status(403)
      .json({ success: false, errors: 'Admin access required' });
  }
  return next();
}

module.exports = {
  getTokenFromRequest,
  authUser,
  fetchUser,
  requireAdmin,
};


