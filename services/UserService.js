'use strict';

const { models } = require('../db');
const { httpError, publicUser } = require('./AuthService');

const { User } = models;

/**
 * User profile / account data management (backed by Sequelize).
 */

async function getProfile(userId) {
  const user = await User.findByPk(userId);
  if (!user) throw httpError(404, 'User not found');
  return publicUser(user);
}

async function updateProfile(userId, { name, email }) {
  if (name === undefined && email === undefined) {
    throw httpError(400, 'Nothing to update — provide name and/or email');
  }

  const user = await User.findByPk(userId);
  if (!user) throw httpError(404, 'User not found');

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  await user.save();

  return publicUser(user);
}

module.exports = {
  getProfile,
  updateProfile,
};
