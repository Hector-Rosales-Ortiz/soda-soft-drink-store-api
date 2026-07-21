'use strict';

const express = require('express');

const authRoutes = require('./auth');
const productRoutes = require('./product');
const cartRoutes = require('./cart');
const orderRoutes = require('./order');
const userRoutes = require('./user');

/**
 * Main router — mounts every feature router under /api (see loaders/express.js).
 */
const router = express.Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);

module.exports = router;
