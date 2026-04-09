const express = require('express');
const router = express.Router();
const { Users } = require('../models');
const { fetchUser } = require('../middleware/auth');

router.post('/getcart', fetchUser, async (req, res) => {
  let userData = await Users.findOne({ _id: req.user.id });
  res.json(userData.cartData);
});

router.post('/addtocart', fetchUser, async (req, res) => {
  const itemId = Number(req.body.itemId);
  if (!Number.isInteger(itemId) || itemId < 0) {
    return res.status(400).json({ error: 'Invalid itemId' });
  }
  let userData = await Users.findOne({ _id: req.user.id });
  userData.cartData[itemId] += 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send('Added!');
});

router.post('/removefromcart', fetchUser, async (req, res) => {
  const itemId = Number(req.body.itemId);
  if (!Number.isInteger(itemId) || itemId < 0) {
    return res.status(400).json({ error: 'Invalid itemId' });
  }
  let userData = await Users.findOne({ _id: req.user.id });
  if (userData.cartData[itemId] > 0)
    userData.cartData[itemId] -= 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send('Removed!');
});

router.post('/removeAll', fetchUser, async (req, res) => {
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

module.exports = router;
