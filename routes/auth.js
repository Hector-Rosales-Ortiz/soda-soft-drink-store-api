'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');

const AuthService = require('../services/AuthService');

const router = express.Router();

/** Rate-limit: max 10 auth attempts per 15 minutes per IP. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

/** POST /api/auth/register — create an account and return a JWT. */
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/login — verify credentials and return a JWT. */
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const result = await AuthService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
