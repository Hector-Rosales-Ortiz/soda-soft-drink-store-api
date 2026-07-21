'use strict';

const User = require('../models/user');
const { httpError } = require('./AuthService');

/**
 * User profile / account data management.
 */

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw httpError(404, 'User not found');
  return user;
}

async function updateProfile(userId, { name, email }) {
  if (name === undefined && email === undefined) {
    throw httpError(400, 'Nothing to update — provide name and/or email');
  }
  const updated = await User.updateById(userId, { name, email });
  if (!updated) throw httpError(404, 'User not found');
  return updated;
}

module.exports = {
  getProfile,
  updateProfile,
};
