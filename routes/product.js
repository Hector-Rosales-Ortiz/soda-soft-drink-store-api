'use strict';

const express = require('express');
const passport = require('passport');

const ProductService = require('../services/ProductService');

const router = express.Router();
const requireAuth = passport.authenticate('jwt', { session: false });

/** GET /api/products — list / search soda drinks (public). */
router.get('/', async (req, res, next) => {
  try {
    res.json(await ProductService.list(req.query));
  } catch (err) {
    next(err);
  }
});

/** GET /api/products/:id — single drink details (public). */
router.get('/:id', async (req, res, next) => {
  try {
    res.json(await ProductService.getById(req.params.id));
  } catch (err) {
    next(err);
  }
});

/** POST /api/products — create a product (protected/admin). */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    res.status(201).json(await ProductService.create(req.body));
  } catch (err) {
    next(err);
  }
});

/** PUT /api/products/:id — update a product (protected/admin). */
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    res.json(await ProductService.update(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/products/:id — remove a product (protected/admin). */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await ProductService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
