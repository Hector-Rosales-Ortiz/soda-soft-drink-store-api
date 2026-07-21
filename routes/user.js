'use strict';

const express = require('express');
const passport = require('passport');

const UserService = require('../services/UserService');

const router = express.Router();

router.use(passport.authenticate('jwt', { session: false }));

/** GET /api/users/me — the authenticated user's profile. */
router.get('/me', async (req, res, next) => {
  try {
    res.json(await UserService.getProfile(req.user.id));
  } catch (err) {
    next(err);
  }
});

/** PUT /api/users/me — update name / email. */
router.put('/me', async (req, res, next) => {
  try {
    res.json(await UserService.updateProfile(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
