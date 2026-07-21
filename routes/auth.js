'use strict';

const express = require('express');

const AuthService = require('../services/AuthService');

const router = express.Router();

/** POST /api/auth/register — create an account and return a JWT. */
router.post('/register', async (req, res, next) => {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/login — verify credentials and return a JWT. */
router.post('/login', async (req, res, next) => {
  try {
    const result = await AuthService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
