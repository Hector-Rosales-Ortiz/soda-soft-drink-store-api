'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const config = require('../config');
const { models } = require('../db');

const { User, Cart } = models;

/** Build an Error carrying an HTTP status for the central error handler. */
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** Shape a User model instance into the public API representation. */
function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    created_at: user.createdAt,
  };
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

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw httpError(409, 'An account with that email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ email, name, passwordHash });

  // Every user starts with an active cart.
  await Cart.findOrCreate({ where: { userId: user.id } });

  return { user: publicUser(user), token: signToken(user) };
}

/**
 * Verify credentials and issue a JWT.
 * @returns {{ user: object, token: string }}
 */
async function login({ email, password }) {
  if (!email || !password) {
    throw httpError(400, 'email and password are required');
  }

  // Use the withPassword scope so the hash is available for comparison.
  const user = await User.scope('withPassword').findOne({ where: { email } });
  if (!user) {
    throw httpError(401, 'Invalid email or password');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw httpError(401, 'Invalid email or password');
  }

  return { user: publicUser(user), token: signToken(user) };
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

module.exports = {
  register,
  login,
  httpError,
  publicUser,
};
