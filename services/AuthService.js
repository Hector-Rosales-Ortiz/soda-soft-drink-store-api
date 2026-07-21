'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const config = require('../config');
const User = require('../models/user');
const Cart = require('../models/cart');

/** Build an Error carrying an HTTP status for the central error handler. */
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const SALT_ROUNDS = 10;

/**
 * Register a new account, hash the password, and give the user an empty cart.
 * @returns {{ user: object, token: string }}
 */
async function register({ email, name, password }) {
  if (!email || !password || !name) {
    throw httpError(400, 'name, email and password are required');
  }

  const existing = await User.findByEmailWithHash(email);
  if (existing) {
    throw httpError(409, 'An account with that email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ email, name, passwordHash });

  // Every user starts with an active cart.
  await Cart.findOrCreateByUserId(user.id);

  return { user, token: signToken(user) };
}

/**
 * Verify credentials and issue a JWT.
 * @returns {{ user: object, token: string }}
 */
async function login({ email, password }) {
  if (!email || !password) {
    throw httpError(400, 'email and password are required');
  }

  const record = await User.findByEmailWithHash(email);
  if (!record) {
    throw httpError(401, 'Invalid email or password');
  }

  const ok = await bcrypt.compare(password, record.password_hash);
  if (!ok) {
    throw httpError(401, 'Invalid email or password');
  }

  const user = {
    id: record.id,
    email: record.email,
    name: record.name,
    created_at: record.created_at,
  };
  return { user, token: signToken(user) };
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

module.exports = {
  register,
  login,
  httpError,
};
