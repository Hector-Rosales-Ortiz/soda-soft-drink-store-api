'use strict';

const express = require('express');
const passport = require('passport');

const OrderService = require('../services/OrderService');

const router = express.Router();

router.use(passport.authenticate('jwt', { session: false }));

/** POST /api/orders — checkout: turn the current cart into an order. */
router.post('/', async (req, res, next) => {
  try {
    res.status(201).json(await OrderService.createOrderFromCart(req.user.id));
  } catch (err) {
    next(err);
  }
});

/** GET /api/orders — list the current user's orders. */
router.get('/', async (req, res, next) => {
  try {
    res.json(await OrderService.listOrders(req.user.id));
  } catch (err) {
    next(err);
  }
});

/** GET /api/orders/:id — a single order with its items. */
router.get('/:id', async (req, res, next) => {
  try {
    res.json(await OrderService.getOrder(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
