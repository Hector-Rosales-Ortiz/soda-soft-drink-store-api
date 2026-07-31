'use strict';

const express = require('express');
const passport = require('passport');

const CartService = require('../services/CartService');

const router = express.Router();

// Every cart operation is tied to the authenticated user.
router.use(passport.authenticate('jwt', { session: false }));

/** GET /api/cart — view the current user's cart. */
router.get('/', async (req, res, next) => {
  try {
    res.json(await CartService.getCart(req.user.id));
  } catch (err) {
    next(err);
  }
});

/** POST /api/cart/items — add a product to the cart. */
router.post('/items', async (req, res, next) => {
  try {
    res.status(201).json(await CartService.addItem(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
});

/** PUT /api/cart/items/:productId — set a line's quantity (0 removes it). */
router.put('/items/:productId', async (req, res, next) => {
  try {
    res.json(await CartService.updateItem(req.user.id, req.params.productId, req.body.quantity));
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/cart/items/:productId — remove a single line. */
router.delete('/items/:productId', async (req, res, next) => {
  try {
    res.json(await CartService.removeItem(req.user.id, req.params.productId));
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/cart — empty the cart. */
router.delete('/', async (req, res, next) => {
  try {
    res.json(await CartService.clear(req.user.id));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
